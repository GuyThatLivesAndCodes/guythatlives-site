/**
 * Firebase Functions for GuyThatLives Site
 * Handles secure API calls to Claude API and Ome-Chat moderation
 */

const functions = require('firebase-functions');
const https = require('https');
const http = require('http');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Analyze math test results using Claude API
 *
 * This function runs on the backend, keeping the API key secure.
 * To set up: Run `firebase functions:config:set claude.api_key="YOUR_API_KEY"`
 */
exports.analyzeTest = functions.https.onCall(async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to analyze test results.'
        );
    }

    // Get API key from environment
    const apiKey = functions.config().claude?.api_key;

    if (!apiKey) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Claude API key is not configured. Please contact the administrator.'
        );
    }

    // Validate input data
    if (!data.prompt) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing required parameter: prompt'
        );
    }

    const requestBody = JSON.stringify({
        model: 'claude-sonnet-4-5-20250429',
        max_tokens: 4000,
        messages: [{
            role: 'user',
            content: data.prompt
        }]
    });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody),
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);

                    if (res.statusCode === 200) {
                        resolve({
                            success: true,
                            analysis: parsed.content[0].text
                        });
                    } else {
                        console.error('Claude API error:', parsed);
                        reject(new functions.https.HttpsError(
                            'internal',
                            `Claude API error: ${parsed.error?.message || 'Unknown error'}`,
                            { status: res.statusCode }
                        ));
                    }
                } catch (error) {
                    console.error('Failed to parse Claude response:', error);
                    reject(new functions.https.HttpsError(
                        'internal',
                        'Failed to parse Claude API response'
                    ));
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request error:', error);
            reject(new functions.https.HttpsError(
                'internal',
                `Request failed: ${error.message}`
            ));
        });

        req.write(requestBody);
        req.end();
    });
});

/* ========= Ome-Chat Functions ========= */

/**
 * Server-side profanity check for Ome-Chat
 * Provides more comprehensive checking than client-side
 */
exports.omeChatCheckMessage = functions.https.onCall(async (data, context) => {
    const { text } = data;

    if (!text || typeof text !== 'string') {
        return { allowed: true };
    }

    // Comprehensive profanity list (server-side for security)
    const profanityList = [
        // Common profanity
        'fuck', 'fucking', 'fucked', 'fucker', 'fucks', 'fck', 'fuk', 'phuck',
        'shit', 'shitting', 'shitter', 'shitty', 'sh1t',
        'ass', 'asshole', 'assholes', 'a$$',
        'bitch', 'bitches', 'b1tch', 'biatch',
        'damn', 'dammit', 'goddamn',
        'dick', 'dicks', 'd1ck', 'dickhead',
        'cock', 'cocks', 'c0ck',
        'pussy', 'pussies',
        'cunt', 'cunts',
        'bastard', 'bastards',
        'whore', 'whores',
        'slut', 'sluts',
        // Slurs
        'nigger', 'nigga', 'n1gger', 'n1gga',
        'chink', 'spic', 'kike', 'gook', 'wetback', 'beaner',
        'fag', 'faggot', 'f4g', 'f4ggot',
        'dyke', 'tranny',
        'retard', 'retarded',
        // Sexual content
        'porn', 'porno', 'p0rn',
        'nude', 'nudes',
        'horny', 'h0rny',
        'blowjob', 'handjob',
        'cum', 'cumming',
        // Violence
        'rape', 'raped', 'rapist',
        'suicide', 'suicidal'
    ];

    const lowerText = text.toLowerCase();

    // Check for profanity
    for (const word of profanityList) {
        if (lowerText.includes(word)) {
            return { allowed: false, reason: 'profanity' };
        }
    }

    return { allowed: true };
});

/**
 * Cleanup stale Ome-Chat sessions
 * Runs every 5 minutes to remove abandoned sessions
 */
exports.omeChatCleanupSessions = functions.pubsub
    .schedule('every 5 minutes')
    .onRun(async (context) => {
        const db = admin.firestore();
        const fiveMinutesAgo = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 5 * 60 * 1000)
        );

        try {
            // Clean up stale sessions
            const staleSessions = await db.collection('omechat').doc('data')
                .collection('sessions')
                .where('lastActive', '<', fiveMinutesAgo)
                .get();

            const batch = db.batch();
            let deleteCount = 0;

            staleSessions.forEach((doc) => {
                batch.delete(doc.ref);
                deleteCount++;
            });

            // Clean up stale queue entries
            const staleQueue = await db.collection('omechat').doc('data')
                .collection('matchingQueue')
                .where('joinedAt', '<', fiveMinutesAgo)
                .get();

            staleQueue.forEach((doc) => {
                batch.delete(doc.ref);
                deleteCount++;
            });

            // Clean up old ended rooms (older than 1 hour)
            const oneHourAgo = admin.firestore.Timestamp.fromDate(
                new Date(Date.now() - 60 * 60 * 1000)
            );

            const oldRooms = await db.collection('omechat').doc('data')
                .collection('rooms')
                .where('status', '==', 'ended')
                .where('endedAt', '<', oneHourAgo)
                .limit(100) // Batch limit
                .get();

            oldRooms.forEach((doc) => {
                batch.delete(doc.ref);
                deleteCount++;
            });

            if (deleteCount > 0) {
                await batch.commit();
                console.log(`Ome-Chat cleanup: Removed ${deleteCount} stale documents`);
            }

            return null;
        } catch (error) {
            console.error('Ome-Chat cleanup error:', error);
            return null;
        }
    });

/**
 * Auto-ban users when they receive 3 reports in 30 minutes
 * Triggered when moderation document is updated
 */
exports.omeChatProcessReport = functions.firestore
    .document('omechat/data/moderation/{sessionId}')
    .onUpdate(async (change, context) => {
        const after = change.after.data();
        const before = change.before.data();

        // Check if report count increased
        if (after.reportCount > (before.reportCount || 0)) {
            // If 3+ reports and not already banned
            if (after.reportCount >= 3 && !after.banUntil) {
                console.log(`Auto-banning session ${context.params.sessionId} due to reports`);

                // Apply 15-minute ban
                await change.after.ref.update({
                    banUntil: admin.firestore.Timestamp.fromDate(
                        new Date(Date.now() + 15 * 60 * 1000)
                    ),
                    banReason: 'reports',
                    reports: [], // Reset reports after ban
                    reportCount: 0
                });
            }
        }

        return null;
    });

/* ========= GuyAI - Legacy Ollama Proxy (DEPRECATED) ========= */

/**
 * DEPRECATED: This function is no longer used by GuyAI.
 * GuyAI now uses Cloudflare AI Gateway for direct access to Claude API.
 *
 * This legacy proxy was used to route requests to a local Ollama server.
 * Keeping for backward compatibility but should be removed in future cleanup.
 *
 * New GuyAI architecture:
 * - Client-side encryption using Web Crypto API
 * - Cloudflare AI Gateway for secure API routing
 * - Direct integration with Anthropic's Claude Haiku 4
 */
exports.ollamaProxy = functions.https.onRequest(async (req, res) => {
    // Return deprecation notice
    res.status(410).json({
        error: 'This endpoint is deprecated',
        message: 'GuyAI now uses Cloudflare AI Gateway. Please update to the latest version at /unblocked/guyai/',
        migration: {
            oldEndpoint: 'Firebase Function Ollama Proxy',
            newArchitecture: 'Cloudflare AI Gateway → Anthropic Claude API',
            benefits: [
                'End-to-end encryption',
                'No server-side proxy needed',
                'Better performance and reliability',
                'Direct access to Claude Haiku 4'
            ]
        }
    });
});

/* ========= G-Chat Authentication Functions ========= */

/**
 * G-Chat Signup - Create new account with username/password
 * Password is hashed with bcrypt server-side
 */
exports.gchatSignup = functions.https.onCall(async (data, context) => {
    const { username, displayName, password, email } = data;

    // Validation
    if (!username || !password) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Username and password are required'
        );
    }

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Username must be 3-20 characters (lowercase alphanumeric and underscore only)'
        );
    }

    if (password.length < 8) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Password must be at least 8 characters'
        );
    }

    const db = admin.firestore();

    try {
        // Check if username already exists
        const accountRef = db.collection('gchat').doc('accounts').collection('users').doc(username);
        const accountDoc = await accountRef.get();

        if (accountDoc.exists) {
            throw new functions.https.HttpsError(
                'already-exists',
                'Username is already taken'
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Generate userId
        const userId = uuidv4();

        // Create account document
        await accountRef.set({
            username,
            displayName: displayName || username,
            passwordHash,
            userId,
            email: email || null,
            isAdmin: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            bannedUntil: null
        });

        // Create profile document
        await db.collection('gchat').doc('profiles').collection('users').doc(userId).set({
            username,
            bio: '',
            status: 'online',
            statusMessage: '',
            avatarUrl: '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSeen: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create session
        const sessionId = uuidv4();
        const expiresAt = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        );

        await db.collection('gchat').doc('sessions').collection('active').doc(sessionId).set({
            userId,
            username,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt,
            lastActive: admin.firestore.FieldValue.serverTimestamp()
        });

        // Generate custom token
        const customToken = await admin.auth().createCustomToken(userId, {
            sessionId,
            username,
            isAdmin: false
        });

        return {
            customToken,
            sessionId,
            userId,
            username,
            isAdmin: false
        };

    } catch (error) {
        console.error('Signup error:', error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError(
            'internal',
            'Failed to create account'
        );
    }
});

/**
 * G-Chat Login - Validate credentials and create session
 */
exports.gchatLogin = functions.https.onCall(async (data, context) => {
    const { username, password } = data;

    if (!username || !password) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Username and password are required'
        );
    }

    const db = admin.firestore();

    try {
        // Get account
        const accountRef = db.collection('gchat').doc('accounts').collection('users').doc(username.toLowerCase());
        const accountDoc = await accountRef.get();

        if (!accountDoc.exists) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'Invalid credentials'
            );
        }

        const account = accountDoc.data();

        // Check if banned
        if (account.bannedUntil && account.bannedUntil.toDate() > new Date()) {
            throw new functions.https.HttpsError(
                'permission-denied',
                `Account banned until ${account.bannedUntil.toDate().toLocaleString()}`
            );
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, account.passwordHash);

        if (!passwordMatch) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'Invalid credentials'
            );
        }

        // Create session
        const sessionId = uuidv4();
        const expiresAt = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        );

        await db.collection('gchat').doc('sessions').collection('active').doc(sessionId).set({
            userId: account.userId,
            username: account.username,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt,
            lastActive: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update profile last seen
        await db.collection('gchat').doc('profiles').collection('users').doc(account.userId).update({
            lastSeen: admin.firestore.FieldValue.serverTimestamp(),
            status: 'online'
        });

        // Generate custom token
        const customToken = await admin.auth().createCustomToken(account.userId, {
            sessionId,
            username: account.username,
            isAdmin: account.isAdmin || false
        });

        return {
            customToken,
            sessionId,
            userId: account.userId,
            username: account.username,
            isAdmin: account.isAdmin || false
        };

    } catch (error) {
        console.error('Login error:', error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError(
            'internal',
            'Login failed'
        );
    }
});

/**
 * G-Chat Session Validation - Check if session is still valid
 */
exports.gchatValidateSession = functions.https.onCall(async (data, context) => {
    const { sessionId } = data;

    if (!sessionId) {
        return { valid: false };
    }

    const db = admin.firestore();

    try {
        const sessionRef = db.collection('gchat').doc('sessions').collection('active').doc(sessionId);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            return { valid: false };
        }

        const session = sessionDoc.data();

        // Check expiration
        if (session.expiresAt.toDate() < new Date()) {
            await sessionRef.delete();
            return { valid: false };
        }

        // Update heartbeat
        await sessionRef.update({
            lastActive: admin.firestore.FieldValue.serverTimestamp()
        });

        // Generate new custom token
        const customToken = await admin.auth().createCustomToken(session.userId, {
            sessionId,
            username: session.username,
            isAdmin: false // TODO: Fetch from account if needed
        });

        return {
            valid: true,
            customToken
        };

    } catch (error) {
        console.error('Session validation error:', error);
        return { valid: false };
    }
});

/**
 * G-Chat Change Password
 */
exports.gchatChangePassword = functions.https.onCall(async (data, context) => {
    const { sessionId, oldPassword, newPassword } = data;

    if (!sessionId || !oldPassword || !newPassword) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'All fields are required'
        );
    }

    if (newPassword.length < 8) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'New password must be at least 8 characters'
        );
    }

    const db = admin.firestore();

    try {
        // Validate session
        const sessionDoc = await db.collection('gchat').doc('sessions').collection('active').doc(sessionId).get();

        if (!sessionDoc.exists) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'Invalid session'
            );
        }

        const session = sessionDoc.data();

        // Get account
        const accountsSnapshot = await db.collection('gchat').doc('accounts').collection('users')
            .where('userId', '==', session.userId)
            .limit(1)
            .get();

        if (accountsSnapshot.empty) {
            throw new functions.https.HttpsError(
                'not-found',
                'Account not found'
            );
        }

        const accountDoc = accountsSnapshot.docs[0];
        const account = accountDoc.data();

        // Verify old password
        const passwordMatch = await bcrypt.compare(oldPassword, account.passwordHash);

        if (!passwordMatch) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'Current password is incorrect'
            );
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await accountDoc.ref.update({
            passwordHash: newPasswordHash
        });

        return { success: true };

    } catch (error) {
        console.error('Change password error:', error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError(
            'internal',
            'Failed to change password'
        );
    }
});

/**
 * G-Chat Cleanup Expired Sessions
 * Runs daily to clean up expired sessions
 */
exports.gchatCleanupSessions = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
        const db = admin.firestore();
        const now = admin.firestore.Timestamp.now();

        try {
            const expiredSessions = await db.collection('gchat')
                .doc('sessions')
                .collection('active')
                .where('expiresAt', '<', now)
                .get();

            const batch = db.batch();
            let deleteCount = 0;

            expiredSessions.forEach((doc) => {
                batch.delete(doc.ref);
                deleteCount++;
            });

            if (deleteCount > 0) {
                await batch.commit();
                console.log(`G-Chat cleanup: Removed ${deleteCount} expired sessions`);
            }

            return null;
        } catch (error) {
            console.error('G-Chat session cleanup error:', error);
            return null;
        }
    });

/**
 * G-Chat Expire Featured Servers
 * Runs daily to expire temporary featured servers
 */
exports.gchatExpireFeatured = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
        const db = admin.firestore();
        const now = admin.firestore.Timestamp.now();

        try {
            const expiredServers = await db.collection('gchat')
                .doc('servers')
                .collection('list')
                .where('featured', '==', true)
                .where('featuredType', '==', 'temporary')
                .where('featuredExpiration', '<', now)
                .get();

            const batch = db.batch();
            let updateCount = 0;

            expiredServers.forEach((doc) => {
                batch.update(doc.ref, {
                    featured: false,
                    featuredType: null,
                    featuredExpiration: null
                });
                updateCount++;
            });

            if (updateCount > 0) {
                await batch.commit();
                console.log(`G-Chat: Expired ${updateCount} temporary featured servers`);
            }

            return null;
        } catch (error) {
            console.error('G-Chat featured expiration error:', error);
            return null;
        }
    });
