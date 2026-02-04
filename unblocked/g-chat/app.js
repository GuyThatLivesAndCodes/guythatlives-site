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
                .collection(this.currentUser.userId)
                .doc('profile')
                .get();

            if (profileDoc.exists) {
                const profile = profileDoc.data();
                this.currentUser.profile = profile;

                // Update UI
                document.getElementById('user-display-name').textContent = this.currentUser.username;
                document.getElementById('user-status').textContent = profile.status || 'Online';

                if (profile.avatarUrl) {
                    document.getElementById('user-avatar').src = profile.avatarUrl;
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
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
