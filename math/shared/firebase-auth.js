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

        // Check for guest progress migration
        await this.checkGuestProgressMigration();

        // Update UI
        this.updateUIForLoggedInUser();

        // Sync progress from Firestore
        if (window.progressTracker) {
            await window.progressTracker.syncFromFirebase();
        }
    }

    handleUserLogout() {
        this.user = null;
        this.isLoggedIn = false;
        this.updateUIForLoggedOutUser();
    }

    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await this.auth.signInWithPopup(provider);
            // onAuthStateChanged will handle the rest
        } catch (error) {
            console.error('Google sign-in error:', error);
            this.showError('Failed to sign in with Google');
        }
    }

    async signOut() {
        try {
            await this.auth.signOut();
        } catch (error) {
            console.error('Sign-out error:', error);
        }
    }

    async checkGuestProgressMigration() {
        // Check if there's guest progress in localStorage
        const guestProgress = this.getGuestProgress();

        if (guestProgress && Object.keys(guestProgress).length > 0) {
            const shouldMigrate = confirm(
                'We found progress from before you logged in. Would you like to save it to your account?'
            );

            if (shouldMigrate) {
                await this.migrateGuestProgress(guestProgress);
                this.clearGuestProgress();
                this.showSuccess('Your progress has been saved to your account!');
            }
        }
    }

    getGuestProgress() {
        // Collect all progress data from localStorage
        const progress = {};
        for (let key in localStorage) {
            if (key.startsWith('progress_') || key.startsWith('lesson_') || key === 'guythatlives_math_progress') {
                progress[key] = localStorage.getItem(key);
            }
        }
        return progress;
    }

    async migrateGuestProgress(guestProgress) {
        try {
            const userDoc = this.db.collection('users').doc(this.user.uid);

            // Merge with existing data
            await userDoc.set({
                guestProgressMigrated: true,
                migratedAt: firebase.firestore.FieldValue.serverTimestamp(),
                progress: guestProgress
            }, { merge: true });

        } catch (error) {
            console.error('Migration error:', error);
        }
    }

    clearGuestProgress() {
        for (let key in localStorage) {
            if (key.startsWith('progress_') || key.startsWith('lesson_')) {
                localStorage.removeItem(key);
            }
        }
    }

    updateUIForLoggedInUser() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = `
                <img src="${this.user.photoURL}" alt="Profile" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 0.5rem;">
                <span>${this.user.displayName?.split(' ')[0] || 'Profile'}</span>
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
            loginBtn.innerHTML = `<span>🔐</span> Sign in with Google`;
            loginBtn.onclick = () => this.signInWithGoogle();
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
}

// Global instance
window.authSystem = new FirebaseAuthSystem();
