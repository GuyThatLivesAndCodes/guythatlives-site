// Firebase Configuration (REPLACE WITH YOUR OWN CREDENTIALS)
// Get your config from: https://console.firebase.google.com/
const firebaseConfig = {

  apiKey: "AIzaSyA6R63QS_Q5gmFI5GObnTsjfDegFSC6wVA",

  authDomain: "guythatlives-math.firebaseapp.com",

  projectId: "guythatlives-math",

  storageBucket: "guythatlives-math.firebasestorage.app",

  messagingSenderId: "668609251422",

  appId: "1:668609251422:web:b1013698b061b0423c0ccf",

  measurementId: "G-83LZH2QKBJ"

};


// Instructions for setup:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (or use existing)
// 3. Enable Google Authentication in Authentication > Sign-in method
// 4. Enable Firestore Database
// 5. Copy your config from Project Settings > General > Your apps
// 6. Replace the config above with your actual values
// 7. Add your domain to Authorized domains in Authentication settings

class FirebaseAuthSystem {
    constructor() {
        this.user = null;
        this.isLoggedIn = false;
        this.db = null;
        this.auth = null;
        this.unsubscribe = null;
        this.authModal = null;
        this.init();
    }

    async init() {
        try {
            // Check if Firebase is configured
            if (firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
                console.warn('Firebase not configured. Using guest mode.');
                this.showConfigWarning();
                return;
            }

            // Initialize Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            this.auth = firebase.auth();
            this.db = firebase.firestore();

            // Listen for auth state changes
            this.unsubscribe = this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    await this.handleUserLogin(user);
                } else {
                    this.handleUserLogout();
                }
            });

            // Inject auth modal UI
            this.injectAuthModal();

        } catch (error) {
            console.error('Firebase initialization error:', error);
            this.showConfigWarning();
        }
    }

    async handleUserLogin(firebaseUser) {
        this.user = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
        };
        this.isLoggedIn = true;

        // Update UI
        this.updateUIForLoggedInUser();

        // Notify progress tracker of login (but don't auto-sync)
        if (window.progressTracker) {
            window.progressTracker.onUserLogin(this.user);
        }
    }

    handleUserLogout() {
        this.user = null;
        this.isLoggedIn = false;
        this.updateUIForLoggedOutUser();
    }

    // Email/Password Sign Up
    async signUpWithEmail(email, password) {
        try {
            await this.auth.createUserWithEmailAndPassword(email, password);
            this.closeAuthModal();
            this.showSuccess('Account created successfully!');
        } catch (error) {
            console.error('Email sign-up error:', error);
            throw this.handleAuthError(error);
        }
    }

    // Email/Password Sign In
    async signInWithEmail(email, password) {
        try {
            await this.auth.signInWithEmailAndPassword(email, password);
            this.closeAuthModal();
            this.showSuccess('Welcome back!');
        } catch (error) {
            console.error('Email sign-in error:', error);
            throw this.handleAuthError(error);
        }
    }

    // Google Sign In
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await this.auth.signInWithPopup(provider);
            this.closeAuthModal();
            this.showSuccess('Signed in with Google!');
        } catch (error) {
            console.error('Google sign-in error:', error);
            throw this.handleAuthError(error);
        }
    }

    // Apple Sign In
    async signInWithApple() {
        try {
            const provider = new firebase.auth.OAuthProvider('apple.com');
            await this.auth.signInWithPopup(provider);
            this.closeAuthModal();
            this.showSuccess('Signed in with Apple!');
        } catch (error) {
            console.error('Apple sign-in error:', error);
            throw this.handleAuthError(error);
        }
    }

    // Sign Out
    async signOut() {
        try {
            await this.auth.signOut();
            this.showSuccess('Signed out successfully');
        } catch (error) {
            console.error('Sign-out error:', error);
        }
    }

    // Handle authentication errors
    handleAuthError(error) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                return 'Email already in use';
            case 'auth/invalid-email':
                return 'Invalid email address';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters';
            case 'auth/user-not-found':
                return 'No account found with this email';
            case 'auth/wrong-password':
                return 'Incorrect password';
            case 'auth/popup-closed-by-user':
                return 'Sign-in cancelled';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection';
            default:
                return error.message || 'Authentication failed';
        }
    }

    // Inject authentication modal UI
    injectAuthModal() {
        const modalHTML = `
            <div id="authModal" class="auth-modal" style="display: none;">
                <div class="auth-modal-content">
                    <button class="auth-modal-close" onclick="authSystem.closeAuthModal()">&times;</button>

                    <div class="auth-modal-header">
                        <div class="auth-modal-icon">🔐</div>
                        <h2 class="auth-modal-title" id="authModalTitle">Welcome</h2>
                        <p class="auth-modal-subtitle">Choose a sign-in method</p>
                    </div>

                    <!-- Social Sign-In Buttons -->
                    <div id="socialSignIn" class="social-sign-in">
                        <button class="social-btn google-btn" onclick="authSystem.handleGoogleSignIn()">
                            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>
                            Continue with Google
                        </button>
                        <button class="social-btn apple-btn" onclick="authSystem.handleAppleSignIn()">
                            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="currentColor" d="M14.94 13.61c-.34.75-.74 1.45-1.21 2.1-.65.88-1.18 1.48-1.59 1.82-.63.58-1.31.88-2.04.9-.52 0-1.15-.15-1.88-.45-.74-.3-1.41-.45-2.03-.45-.65 0-1.35.15-2.1.45-.76.3-1.37.46-1.84.48-.7.04-1.4-.27-2.08-.92-.44-.38-1-.99-1.68-1.84-.72-1-1.32-2.17-1.78-3.5-.5-1.44-.75-2.84-.75-4.2 0-1.55.34-2.9 1.01-4.02A5.91 5.91 0 0 1 4.1 2.14c.54-.03 1.25.17 2.13.58.88.41 1.44.62 1.68.62.18 0 .79-.24 1.82-.73.97-.46 1.79-.65 2.46-.57 1.82.15 3.19.88 4.1 2.2-1.63.99-2.44 2.37-2.42 4.15.01 1.39.52 2.54 1.51 3.47.45.43.95.76 1.51 1 -.12.35-.25.69-.39 1.02zM12.24 0c0 1.09-.4 2.1-1.19 3.04-.95 1.11-2.1 1.75-3.35 1.65a3.37 3.37 0 0 1-.03-.45c0-1.05.45-2.17 1.26-3.09.4-.46.91-.85 1.53-1.16A5.45 5.45 0 0 1 12.21 0c.01.15.03.3.03.45z"/></svg>
                            Continue with Apple
                        </button>
                        <div class="divider">
                            <span>or</span>
                        </div>
                    </div>

                    <!-- Email/Password Form -->
                    <form id="emailAuthForm" class="email-auth-form">
                        <div id="authError" class="auth-error" style="display: none;"></div>

                        <div class="auth-form-group">
                            <label for="authEmail" class="auth-label">Email</label>
                            <input type="email" id="authEmail" class="auth-input" placeholder="your@email.com" required>
                        </div>

                        <div class="auth-form-group">
                            <label for="authPassword" class="auth-label">Password</label>
                            <input type="password" id="authPassword" class="auth-input" placeholder="••••••••" required>
                        </div>

                        <div id="confirmPasswordGroup" class="auth-form-group" style="display: none;">
                            <label for="authPasswordConfirm" class="auth-label">Confirm Password</label>
                            <input type="password" id="authPasswordConfirm" class="auth-input" placeholder="••••••••">
                        </div>

                        <button type="submit" class="auth-btn auth-btn-primary" id="emailAuthBtn">
                            Sign In
                        </button>

                        <div class="auth-form-footer">
                            <a href="#" class="auth-link" id="toggleAuthMode" onclick="authSystem.toggleAuthMode(); return false;">
                                Create account
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const div = document.createElement('div');
        div.innerHTML = modalHTML;
        document.body.appendChild(div);

        this.authModal = document.getElementById('authModal');

        // Setup form submission
        document.getElementById('emailAuthForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailAuth();
        });
    }

    // Show authentication modal
    showAuthModal() {
        this.authModal.style.display = 'flex';
        setTimeout(() => this.authModal.classList.add('show'), 10);
        document.getElementById('authEmail')?.focus();
    }

    // Close authentication modal
    closeAuthModal() {
        this.authModal?.classList.remove('show');
        setTimeout(() => {
            if (this.authModal) this.authModal.style.display = 'none';
        }, 300);
        this.clearAuthErrors();
    }

    // Toggle between sign in and sign up modes
    toggleAuthMode() {
        const title = document.getElementById('authModalTitle');
        const confirmGroup = document.getElementById('confirmPasswordGroup');
        const submitBtn = document.getElementById('emailAuthBtn');
        const toggleLink = document.getElementById('toggleAuthMode');

        if (confirmGroup.style.display === 'none') {
            // Switch to sign up mode
            title.textContent = 'Create Account';
            confirmGroup.style.display = 'block';
            submitBtn.textContent = 'Sign Up';
            toggleLink.textContent = 'Already have an account?';
        } else {
            // Switch to sign in mode
            title.textContent = 'Welcome Back';
            confirmGroup.style.display = 'none';
            submitBtn.textContent = 'Sign In';
            toggleLink.textContent = 'Create account';
        }
        this.clearAuthErrors();
    }

    // Handle email/password authentication
    async handleEmailAuth() {
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value;
        const confirmPassword = document.getElementById('authPasswordConfirm').value;
        const isSignUp = document.getElementById('confirmPasswordGroup').style.display !== 'none';

        this.clearAuthErrors();

        try {
            if (isSignUp) {
                // Validate passwords match
                if (password !== confirmPassword) {
                    this.showAuthError('Passwords do not match');
                    return;
                }
                if (password.length < 6) {
                    this.showAuthError('Password must be at least 6 characters');
                    return;
                }
                await this.signUpWithEmail(email, password);
            } else {
                await this.signInWithEmail(email, password);
            }
        } catch (error) {
            this.showAuthError(error);
        }
    }

    // Handle Google sign in
    async handleGoogleSignIn() {
        try {
            await this.signInWithGoogle();
        } catch (error) {
            this.showAuthError(error);
        }
    }

    // Handle Apple sign in
    async handleAppleSignIn() {
        try {
            await this.signInWithApple();
        } catch (error) {
            this.showAuthError(error);
        }
    }

    // Show auth error
    showAuthError(message) {
        const errorDiv = document.getElementById('authError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    // Clear auth errors
    clearAuthErrors() {
        const errorDiv = document.getElementById('authError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
    }

    updateUIForLoggedInUser() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            // Extract first name or use email username
            const displayName = this.user.displayName || this.user.email.split('@')[0];
            const firstName = displayName.split(' ')[0];

            loginBtn.innerHTML = `
                <img src="${this.user.photoURL}" alt="Profile" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 0.5rem;">
                <span>${firstName}</span>
            `;
            loginBtn.onclick = () => this.showUserMenu();
        }

        // Show "logged in" indicator if progress tracker exists
        if (window.progressTracker) {
            window.progressTracker.onUserLogin(this.user);
        }
    }

    updateUIForLoggedOutUser() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = `<span>🔐</span> Login`;
            loginBtn.onclick = () => this.showAuthModal();
        }

        if (window.progressTracker) {
            window.progressTracker.onUserLogout();
        }
    }

    showUserMenu() {
        // Create dropdown menu
        const existing = document.getElementById('userDropdown');
        if (existing) {
            existing.remove();
            return;
        }

        const dropdown = document.createElement('div');
        dropdown.id = 'userDropdown';
        dropdown.className = 'user-dropdown';
        dropdown.innerHTML = `
            <a href="/math/profile/" class="dropdown-item">
                <span>👤</span> Profile & Progress
            </a>
            <a href="#" class="dropdown-item" onclick="authSystem.signOut(); return false;">
                <span>🚪</span> Sign Out
            </a>
        `;

        const loginBtn = document.getElementById('loginBtn');
        loginBtn.parentElement.style.position = 'relative';
        loginBtn.parentElement.appendChild(dropdown);

        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== loginBtn) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 100);
    }

    showConfigWarning() {
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 85, 85, 0.1);
            border: 1px solid rgba(255, 85, 85, 0.3);
            color: #ff5555;
            padding: 1rem;
            border-radius: 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            max-width: 300px;
            z-index: 10000;
        `;
        warning.innerHTML = `
            <strong>⚠️ Firebase Not Configured</strong><br>
            Running in guest mode. Progress saved locally.<br>
            <small>See firebase-auth.js for setup instructions.</small>
        `;
        document.body.appendChild(warning);
        setTimeout(() => warning.remove(), 5000);
    }

    showError(message) {
        alert(message); // TODO: Replace with nice toast
    }

    showSuccess(message) {
        alert(message); // TODO: Replace with nice toast
    }

    // Compatibility methods for existing auth system
    isUserLoggedIn() {
        return this.isLoggedIn;
    }

    getCurrentUser() {
        return this.user;
    }

    // Mask email for privacy (e.g., "john@example.com" -> "j***@example.com")
    maskEmail(email) {
        if (!email) return '';
        const [username, domain] = email.split('@');
        if (username.length <= 2) {
            return `${username[0]}***@${domain}`;
        }
        return `${username[0]}${'*'.repeat(username.length - 1)}@${domain}`;
    }
}

// Global instance - initialize after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.authSystem = new FirebaseAuthSystem();
    });
} else {
    // DOM already loaded
    window.authSystem = new FirebaseAuthSystem();
}
