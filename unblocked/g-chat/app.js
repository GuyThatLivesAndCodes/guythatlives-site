/**
 * G-Chat Main Application
 * Orchestrates authentication, server management, and UI
 */

class GChatApp {
    constructor() {
        this.authManager = null;
        this.serverManager = null;
        this.channelManager = null;
        this.voiceManager = null;
        this.uiController = null;
        this.featuredManager = null;
        this.adminDashboard = null;

        this.currentUser = null;
        this.currentServer = null;
        this.currentChannel = null;
    }

    async init() {
        console.log('Initializing G-Chat...');

        // Initialize Firebase
        this.initFirebase();

        // Initialize managers
        this.authManager = new AuthManager(this);
        this.uiController = new UIController(this);

        // Check for existing session
        const session = await this.authManager.validateSession();

        if (session) {
            await this.onAuthSuccess(session);
        } else {
            this.showAuthScreen();
        }
    }

    initFirebase() {
        // Initialize Firebase with guythatlives-math project
        const firebaseConfig = {
            apiKey: "AIzaSyA6R63QS_Q5gmFI5GObnTsjfDegFSC6wVA",
            authDomain: "guythatlives-math.firebaseapp.com",
            projectId: "guythatlives-math",
            storageBucket: "guythatlives-math.firebasestorage.app",
            messagingSenderId: "668609251422",
            appId: "1:668609251422:web:b1013698b061b0423c0ccf"
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.storage = firebase.storage();
        this.functions = firebase.functions();

        console.log('Firebase initialized for G-Chat');
    }

    async onAuthSuccess(session) {
        console.log('Authentication successful:', session.username);
        this.currentUser = session;

        // Initialize remaining managers
        this.serverManager = new ServerManager(this);
        this.channelManager = new ChannelManager(this);
        this.voiceManager = new VoiceManager(this);
        this.featuredManager = new FeaturedManager(this);

        // Check if user is admin
        if (session.isAdmin) {
            this.adminDashboard = new AdminDashboard(this);
            document.getElementById('admin-panel-btn').style.display = 'block';
        }

        // Load user profile
        await this.loadUserProfile();

        // Show main app
        this.showMainApp();

        // Load servers
        await this.serverManager.loadUserServers();
    }

    async loadUserProfile() {
        try {
            const profileDoc = await this.db.collection('gchat')
                .doc('profiles')
                .collection('users')
                .doc(this.currentUser.userId)
                .get();

            if (profileDoc.exists) {
                const profile = profileDoc.data();
                this.currentUser.profile = profile;

                // Update UI
                const displayName = this.currentUser.displayName || this.currentUser.username;
                document.getElementById('user-display-name').textContent = displayName;
                document.getElementById('user-status').textContent = profile.status || 'online';

                // Set avatar
                this.setAvatar(document.getElementById('user-avatar'), profile.avatarUrl, displayName);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    // Generate avatar with random color and initials
    setAvatar(imgElement, avatarUrl, displayName) {
        if (avatarUrl) {
            imgElement.src = avatarUrl;
            imgElement.style.display = 'block';
            const initialsEl = imgElement.nextElementSibling;
            if (initialsEl && initialsEl.classList.contains('avatar-initials')) {
                initialsEl.style.display = 'none';
            }
        } else {
            // Hide img, show initials
            imgElement.style.display = 'none';

            // Create or update initials element
            let initialsEl = imgElement.nextElementSibling;
            if (!initialsEl || !initialsEl.classList.contains('avatar-initials')) {
                initialsEl = document.createElement('div');
                initialsEl.className = 'avatar-initials';
                imgElement.parentNode.insertBefore(initialsEl, imgElement.nextSibling);
            }

            // Get initials (first 2 letters of username)
            const initials = displayName.substring(0, 2).toUpperCase();
            initialsEl.textContent = initials;

            // Generate consistent color from username
            const color = this.getColorFromString(displayName);
            initialsEl.style.backgroundColor = color;
            initialsEl.style.display = 'flex';
        }
    }

    // Generate consistent color from string (for avatars)
    getColorFromString(str) {
        const colors = [
            '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
            '#00bcd4', '#009688', '#4caf50', '#ff9800', '#ff5722',
            '#795548', '#607d8b'
        ];

        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colors[Math.abs(hash) % colors.length];
    }

    showAuthScreen() {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    }

    async logout() {
        await this.authManager.logout();
        this.currentUser = null;
        this.currentServer = null;
        this.currentChannel = null;
        this.showAuthScreen();
    }
}

// Initialize app when DOM is ready
let gchatApp;

document.addEventListener('DOMContentLoaded', () => {
    gchatApp = new GChatApp();
    gchatApp.init();
});
