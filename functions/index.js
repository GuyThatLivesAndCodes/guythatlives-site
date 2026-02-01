/**
 * Firebase Functions for GuyThatLives Site
 * Handles secure API calls to Claude API and Ome-Chat moderation
 */

const functions = require('firebase-functions');
const https = require('https');
const admin = require('firebase-admin');

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
