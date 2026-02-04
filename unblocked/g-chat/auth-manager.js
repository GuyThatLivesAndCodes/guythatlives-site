/**
 * G-Chat Authentication Manager
 * Handles standalone username/password authentication with Cloud Functions
 */

class AuthManager {
    constructor(app) {
        this.app = app;
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
            // Call Cloud Function for login
            const gchatLogin = this.app.functions.httpsCallable('gchatLogin');
            const result = await gchatLogin({ username, password });

            const { customToken, sessionId, userId, username: displayUsername, isAdmin } = result.data;

            // Sign in with custom token
            await this.app.auth.signInWithCustomToken(customToken);

            // Store session in localStorage
            localStorage.setItem('gchat_session', JSON.stringify({
                sessionId,
                userId,
                username: displayUsername,
                isAdmin: isAdmin || false
            }));

            // Notify app
            await this.app.onAuthSuccess({
                sessionId,
                userId,
                username: displayUsername,
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
            // Call Cloud Function for signup
            const gchatSignup = this.app.functions.httpsCallable('gchatSignup');
            const result = await gchatSignup({
                username: username.toLowerCase(),
                displayName: username, // Keep case-preserved
                password,
                email: email || null
            });

            const { customToken, sessionId, userId, username: displayUsername, isAdmin } = result.data;

            // Sign in with custom token
            await this.app.auth.signInWithCustomToken(customToken);

            // Store session in localStorage
            localStorage.setItem('gchat_session', JSON.stringify({
                sessionId,
                userId,
                username: displayUsername,
                isAdmin: isAdmin || false
            }));

            // Notify app
            await this.app.onAuthSuccess({
                sessionId,
                userId,
                username: displayUsername,
                isAdmin: isAdmin || false
            });

        } catch (error) {
            console.error('Signup error:', error);
            errorEl.textContent = error.message || 'Signup failed. Please try again.';
        }
    }

    async validateSession() {
        try {
            const sessionData = localStorage.getItem('gchat_session');
            if (!sessionData) {
                return null;
            }

            const session = JSON.parse(sessionData);

            // Call Cloud Function to validate session
            const gchatValidateSession = this.app.functions.httpsCallable('gchatValidateSession');
            const result = await gchatValidateSession({ sessionId: session.sessionId });

            if (!result.data.valid) {
                localStorage.removeItem('gchat_session');
                return null;
            }

            // Refresh custom token
            await this.app.auth.signInWithCustomToken(result.data.customToken);

            return session;

        } catch (error) {
            console.error('Session validation error:', error);
            localStorage.removeItem('gchat_session');
            return null;
        }
    }

    async logout() {
        try {
            const sessionData = localStorage.getItem('gchat_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);

                // Delete session from Firestore
                await this.app.db.collection('gchat')
                    .doc('sessions')
                    .collection('active')
                    .doc(session.sessionId)
                    .delete();
            }

            // Sign out from Firebase Auth
            await this.app.auth.signOut();

            // Clear localStorage
            localStorage.removeItem('gchat_session');

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

                    await this.app.db.collection('gchat')
                        .doc('sessions')
                        .collection('active')
                        .doc(session.sessionId)
                        .update({
                            lastActive: firebase.firestore.FieldValue.serverTimestamp()
                        });
                }
            } catch (error) {
                console.error('Heartbeat error:', error);
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    }
}
