/**
 * Games Auth System - Authentication for unblocked games section
 * Uses Firebase Auth with email/password as primary method
 */

class GamesAuthSystem {
    constructor() {
        this.currentUser = null;
        this.authStateCallbacks = [];
        this.initialized = false;

        // Auto-initialize
        this.init();
    }

    /**
     * Initialize Firebase Auth
     */
    async init() {
        if (this.initialized) return;

        try {
            // Firebase config for games section
            const firebaseConfig = {
                apiKey: "AIzaSyCnOr_R8K6r5ggB5lqgC5c2j3cYwfPg59Q",
                authDomain: "guythatlives-math.firebaseapp.com",
                projectId: "guythatlives-math",
                storageBucket: "guythatlives-math.firebasestorage.app",
                messagingSenderId: "621048909859",
                appId: "1:621048909859:web:4d0e59e1c2cf8c94e3a4ed"
            };

            // Initialize Firebase if not already initialized
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            // Listen for auth state changes
            firebase.auth().onAuthStateChanged((user) => {
                this.currentUser = user;
                this.updateUI();
                this.notifyAuthStateChanged(user);
            });

            this.initialized = true;
            console.log('GamesAuthSystem initialized');
        } catch (error) {
            console.error('Failed to initialize auth:', error);
        }
    }

    /**
     * Register auth state change callback
     */
    onAuthStateChanged(callback) {
        this.authStateCallbacks.push(callback);
        // Immediately call with current state
        if (this.currentUser !== null) {
            callback(this.currentUser);
        }
    }

    /**
     * Notify all callbacks of auth state change
     */
    notifyAuthStateChanged(user) {
        this.authStateCallbacks.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Error in auth state callback:', error);
            }
        });
    }

    /**
     * Sign up with email and password
     */
    async signUp(email, password, displayName) {
        try {
            const userCredential = await firebase.auth()
                .createUserWithEmailAndPassword(email, password);

            // Update display name if provided
            if (displayName) {
                await userCredential.user.updateProfile({
                    displayName: displayName
                });
            }

            // Create user document in Firestore
            await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
                email: email,
                displayName: displayName || email.split('@')[0],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });

            return userCredential.user;
        } catch (error) {
            console.error('Sign up error:', error);
            throw this.formatAuthError(error);
        }
    }

    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
        try {
            const userCredential = await firebase.auth()
                .signInWithEmailAndPassword(email, password);

            // Update last login
            await firebase.firestore().collection('users').doc(userCredential.user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });

            return userCredential.user;
        } catch (error) {
            console.error('Sign in error:', error);
            throw this.formatAuthError(error);
        }
    }

    /**
     * Sign in with Google (optional secondary method)
     */
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const userCredential = await firebase.auth().signInWithPopup(provider);

            // Create or update user document
            await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
                email: userCredential.user.email,
                displayName: userCredential.user.displayName,
                photoURL: userCredential.user.photoURL,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return userCredential.user;
        } catch (error) {
            console.error('Google sign in error:', error);
            throw this.formatAuthError(error);
        }
    }

    /**
     * Sign out
     */
    async signOut() {
        try {
            await firebase.auth().signOut();
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    /**
     * Send password reset email
     */
    async resetPassword(email) {
        try {
            await firebase.auth().sendPasswordResetEmail(email);
        } catch (error) {
            console.error('Password reset error:', error);
            throw this.formatAuthError(error);
        }
    }

    /**
     * Format Firebase auth errors to user-friendly messages
     */
    formatAuthError(error) {
        const errorMessages = {
            'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/operation-not-allowed': 'This sign-in method is not enabled.',
            'auth/weak-password': 'Password should be at least 6 characters long.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
        };

        const message = errorMessages[error.code] || error.message || 'An error occurred. Please try again.';
        return new Error(message);
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }

    /**
     * Check if current user is admin
     */
    isAdmin() {
        return this.currentUser && this.currentUser.email === 'zorbyteofficial@gmail.com';
    }

    /**
     * Update UI elements based on auth state
     */
    updateUI() {
        const authButtons = document.querySelectorAll('.auth-button');
        const userInfo = document.querySelectorAll('.user-info');
        const adminElements = document.querySelectorAll('.admin-only');

        if (this.currentUser) {
            // User is logged in
            authButtons.forEach(btn => {
                if (btn.dataset.action === 'sign-in' || btn.dataset.action === 'sign-up') {
                    btn.style.display = 'none';
                } else if (btn.dataset.action === 'sign-out') {
                    btn.style.display = '';
                }
            });

            userInfo.forEach(el => {
                el.style.display = '';
                const nameEl = el.querySelector('.user-name');
                if (nameEl) {
                    nameEl.textContent = this.currentUser.displayName || this.currentUser.email;
                }
                const emailEl = el.querySelector('.user-email');
                if (emailEl) {
                    emailEl.textContent = this.currentUser.email;
                }
            });

            // Show admin elements if user is admin
            if (this.isAdmin()) {
                adminElements.forEach(el => el.style.display = '');
            } else {
                adminElements.forEach(el => el.style.display = 'none');
            }
        } else {
            // User is logged out
            authButtons.forEach(btn => {
                if (btn.dataset.action === 'sign-in' || btn.dataset.action === 'sign-up') {
                    btn.style.display = '';
                } else if (btn.dataset.action === 'sign-out') {
                    btn.style.display = 'none';
                }
            });

            userInfo.forEach(el => el.style.display = 'none');
            adminElements.forEach(el => el.style.display = 'none');
        }
    }

    /**
     * Show auth modal (to be implemented in UI)
     */
    showAuthModal(mode = 'sign-in') {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.dataset.mode = mode;

            // Update modal title
            const title = modal.querySelector('.modal-title');
            if (title) {
                title.textContent = mode === 'sign-in' ? 'Sign In' : 'Sign Up';
            }

            // Show/hide relevant forms
            const signInForm = modal.querySelector('#sign-in-form');
            const signUpForm = modal.querySelector('#sign-up-form');

            if (signInForm && signUpForm) {
                if (mode === 'sign-in') {
                    signInForm.style.display = 'block';
                    signUpForm.style.display = 'none';
                } else {
                    signInForm.style.display = 'none';
                    signUpForm.style.display = 'block';
                }
            }
        }
    }

    /**
     * Hide auth modal
     */
    hideAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Create global instance
window.gamesAuth = new GamesAuthSystem();

// Auto-setup auth UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Setup sign out buttons
    document.querySelectorAll('[data-action="sign-out"]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await window.gamesAuth.signOut();
            } catch (error) {
                alert('Error signing out: ' + error.message);
            }
        });
    });

    // Setup sign in/up modal triggers
    document.querySelectorAll('[data-action="sign-in"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.gamesAuth.showAuthModal('sign-in');
        });
    });

    document.querySelectorAll('[data-action="sign-up"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.gamesAuth.showAuthModal('sign-up');
        });
    });

    // Setup modal close buttons
    const modal = document.getElementById('auth-modal');
    if (modal) {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                window.gamesAuth.hideAuthModal();
            });
        }

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                window.gamesAuth.hideAuthModal();
            }
        });
    }

    // Setup sign in form
    const signInForm = document.getElementById('sign-in-form');
    if (signInForm) {
        signInForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = signInForm.querySelector('[name="email"]').value;
            const password = signInForm.querySelector('[name="password"]').value;
            const errorEl = signInForm.querySelector('.error-message');
            const submitBtn = signInForm.querySelector('[type="submit"]');

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Signing in...';
                errorEl.textContent = '';
                errorEl.style.display = 'none';

                await window.gamesAuth.signIn(email, password);
                window.gamesAuth.hideAuthModal();
                signInForm.reset();
            } catch (error) {
                errorEl.textContent = error.message;
                errorEl.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        });
    }

    // Setup sign up form
    const signUpForm = document.getElementById('sign-up-form');
    if (signUpForm) {
        signUpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = signUpForm.querySelector('[name="email"]').value;
            const password = signUpForm.querySelector('[name="password"]').value;
            const displayName = signUpForm.querySelector('[name="displayName"]').value;
            const errorEl = signUpForm.querySelector('.error-message');
            const submitBtn = signUpForm.querySelector('[type="submit"]');

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating account...';
                errorEl.textContent = '';
                errorEl.style.display = 'none';

                await window.gamesAuth.signUp(email, password, displayName);
                window.gamesAuth.hideAuthModal();
                signUpForm.reset();
            } catch (error) {
                errorEl.textContent = error.message;
                errorEl.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign Up';
            }
        });
    }

    // Setup Google sign in button
    const googleSignInBtn = document.getElementById('google-sign-in');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await window.gamesAuth.signInWithGoogle();
                window.gamesAuth.hideAuthModal();
            } catch (error) {
                alert('Error signing in with Google: ' + error.message);
            }
        });
    }

    // Setup password reset
    const resetPasswordBtn = document.getElementById('reset-password-btn');
    if (resetPasswordBtn) {
        resetPasswordBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt('Enter your email address:');
            if (email) {
                try {
                    await window.gamesAuth.resetPassword(email);
                    alert('Password reset email sent! Check your inbox.');
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            }
        });
    }
});
