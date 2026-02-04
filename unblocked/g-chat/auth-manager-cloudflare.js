/**
 * G-Chat Authentication Manager (Cloudflare Workers Edition)
 * Handles authentication via Cloudflare Workers instead of Firebase Functions
 */

class AuthManager {
    constructor(app) {
        this.app = app;
        // Cloudflare Worker URL
        this.workerUrl = 'https://gchat-auth.zorbyteofficial.workers.dev';
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Toggle between login and signup
        document.getElementById('show-signup').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignup();
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin();
        });

        // Form submissions
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('signup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });
    }

    showLogin() {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('signup-form').classList.add('hidden');
    }

    showSignup() {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('signup-form').classList.remove('hidden');
    }

    async handleLogin() {
        const username = document.getElementById('login-username').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        errorEl.textContent = '';

        if (!username || !password) {
            errorEl.textContent = 'Please fill in all fields';
            return;
        }

        try {
            // Call Cloudflare Worker
            const response = await fetch(`${this.workerUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Login failed');
            }

            const { sessionId, userId, username: displayUsername, displayName, isAdmin } = result;

            // Store session in localStorage
            localStorage.setItem('gchat_session', JSON.stringify({
                sessionId,
                userId,
                username: displayUsername,
                displayName: displayName || displayUsername,
                isAdmin: isAdmin || false
            }));

            // Create profile in Firestore if it doesn't exist
            await this.createProfileIfNeeded(userId, displayUsername);

            // Notify app
            await this.app.onAuthSuccess({
                sessionId,
                userId,
                username: displayUsername,
                displayName: displayName || displayUsername,
                isAdmin: isAdmin || false
            });

        } catch (error) {
            console.error('Login error:', error);
            errorEl.textContent = error.message || 'Login failed. Please try again.';
        }
    }

    async handleSignup() {
        const username = document.getElementById('signup-username').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm').value;
        const errorEl = document.getElementById('signup-error');

        errorEl.textContent = '';

        // Validation
        if (!username || !password) {
            errorEl.textContent = 'Please fill in all required fields';
            return;
        }

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            errorEl.textContent = 'Username must be 3-20 characters (alphanumeric and underscore only)';
            return;
        }

        if (!/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/.test(password)) {
            errorEl.textContent = 'Password must be at least 8 characters with uppercase, lowercase, and number';
            return;
        }

        if (password !== confirmPassword) {
            errorEl.textContent = 'Passwords do not match';
            return;
        }

        try {
            // Call Cloudflare Worker
            const response = await fetch(`${this.workerUrl}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username.toLowerCase(),
                    displayName: username, // Keep case-preserved
                    password,
                    email: email || null
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Signup failed');
            }

            const { sessionId, userId, username: displayUsername, displayName, isAdmin } = result;

            // Store session in localStorage
            localStorage.setItem('gchat_session', JSON.stringify({
                sessionId,
                userId,
                username: displayUsername,
                displayName: displayName || displayUsername,
                isAdmin: isAdmin || false
            }));

            // Create profile in Firestore
            await this.app.db.collection('gchat').doc('profiles').collection('users').doc(userId).set({
                username: displayUsername,
                displayName: displayName || displayUsername,
                bio: '',
                status: 'online',
                statusMessage: '',
                avatarUrl: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Notify app
            await this.app.onAuthSuccess({
                sessionId,
                userId,
                username: displayUsername,
                displayName: displayName || displayUsername,
                isAdmin: isAdmin || false
            });

        } catch (error) {
            console.error('Signup error:', error);
            errorEl.textContent = error.message || 'Signup failed. Please try again.';
        }
    }

    async createProfileIfNeeded(userId, username) {
        try {
            const profileRef = this.app.db.collection('gchat').doc('profiles').collection('users').doc(userId);
            const profileDoc = await profileRef.get();

            if (!profileDoc.exists) {
                await profileRef.set({
                    username,
                    displayName: username,
                    bio: '',
                    status: 'online',
                    statusMessage: '',
                    avatarUrl: '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Update last seen
                await profileRef.update({
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'online'
                });
            }
        } catch (error) {
            console.error('Error creating profile:', error);
        }
    }

    async validateSession() {
        try {
            const sessionData = localStorage.getItem('gchat_session');
            if (!sessionData) {
                return null;
            }

            const session = JSON.parse(sessionData);

            // Call Cloudflare Worker to validate session
            const response = await fetch(`${this.workerUrl}/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sessionId: session.sessionId })
            });

            const result = await response.json();

            if (!result.valid) {
                localStorage.removeItem('gchat_session');
                return null;
            }

            // Update profile last seen
            await this.createProfileIfNeeded(session.userId, session.username);

            return session;

        } catch (error) {
            console.error('Session validation error:', error);
            localStorage.removeItem('gchat_session');
            return null;
        }
    }

    async logout() {
        try {
            // Clear localStorage (session is auto-deleted by Worker after 7 days)
            localStorage.removeItem('gchat_session');

            // Update profile status
            if (this.app.currentUser) {
                await this.app.db.collection('gchat').doc('profiles')
                    .collection('users').doc(this.app.currentUser.userId)
                    .update({
                        status: 'offline',
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                    });
            }

        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // Heartbeat to keep session alive
    startHeartbeat() {
        setInterval(async () => {
            try {
                const sessionData = localStorage.getItem('gchat_session');
                if (sessionData) {
                    const session = JSON.parse(sessionData);

                    // Validate session (also updates lastActive in Worker)
                    await fetch(`${this.workerUrl}/validate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ sessionId: session.sessionId })
                    });

                    // Update Firestore profile
                    if (this.app.currentUser) {
                        await this.app.db.collection('gchat').doc('profiles')
                            .collection('users').doc(this.app.currentUser.userId)
                            .update({
                                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                            });
                    }
                }
            } catch (error) {
                console.error('Heartbeat error:', error);
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    }
}
