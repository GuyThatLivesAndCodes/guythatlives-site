/**
 * OmeChatManager - Main orchestration for Ome-Chat
 * Singleton pattern coordinating all chat functionality
 */
class OmeChatManager {
    constructor() {
        // Firebase
        this.db = null;
        this.functions = null;

        // Session identifiers
        this.sessionId = null;
        this.anonymousId = null;

        // Current state
        this.currentRoomId = null;
        this.currentPartnerSessionId = null;
        this.currentPartnerAnonymousId = null;
        this.preferences = { video: true, audio: true, text: true };
        this.blockedSessions = new Set();

        // Initialization
        this.initialized = false;
        this.initPromise = null;

        // Sub-managers
        this.webrtc = null;
        this.signaling = null;
        this.matchingQueue = null;
        this.moderation = null;
        this.ui = null;

        // Firebase config (using guythatlives-unblocked project)
        this.firebaseConfig = {
            apiKey: "AIzaSyA6R63QS_Q5gmFI5GObnTsjfDegFSC6wVA",
            authDomain: "guythatlives-math.firebaseapp.com",
            projectId: "guythatlives-math",
            storageBucket: "guythatlives-math.firebasestorage.app",
            messagingSenderId: "668609251422",
            appId: "1:668609251422:web:b1013698b061b0423c0ccf"
        };
    }

    /**
     * Initialize the chat system
     */
    async initialize() {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            console.log('Initializing Ome-Chat...');

            try {
                // Check WebRTC support
                if (!WebRTCHandler.isSupported()) {
                    throw new Error('WebRTC is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Edge.');
                }

                // Initialize Firebase
                if (!firebase.apps.length) {
                    firebase.initializeApp(this.firebaseConfig);
                }
                this.db = firebase.firestore();
                this.functions = firebase.functions();

                // Generate session ID and anonymous ID
                this.sessionId = this.generateSessionId();
                this.anonymousId = this.generateAnonymousId();

                console.log(`Session: ${this.sessionId}`);
                console.log(`Anonymous ID: ${this.anonymousId}`);

                // Initialize sub-managers
                this.moderation = new ModerationManager(this.db, this.sessionId);
                this.signaling = new SignalingManager(this.db, this.sessionId);
                this.webrtc = new WebRTCHandler(this.signaling);
                this.matchingQueue = new MatchingQueue(this.db, this.sessionId);

                // Initialize UI controller
                this.ui = new UIController(this);
                this.ui.init();
                this.ui.updateAnonymousId();

                // Setup WebRTC callbacks
                this.setupWebRTCCallbacks();

                // Check if banned
                const banStatus = await this.moderation.checkBanStatus();
                if (banStatus.banned) {
                    console.log('User is banned until:', banStatus.banUntil);
                    this.ui.showBanPanel(banStatus.banUntil, banStatus.reason);
                } else {
                    // Create session document
                    await this.createSession();
                    this.ui.showPanel('setup');
                }

                this.initialized = true;
                console.log('Ome-Chat initialized successfully');
            } catch (error) {
                console.error('Initialization error:', error);
                this.ui?.showErrorPanel(error.message);
            }
        })();

        return this.initPromise;
    }

    /**
     * Generate a unique session ID
     */
    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate an anonymous display ID
     */
    generateAnonymousId() {
        // Use only unambiguous characters (no 0/O, 1/I/l confusion)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return 'User-' + id;
    }

    /**
     * Create a session document in Firestore
     */
    async createSession() {
        try {
            await this.db.collection('omechat').doc('data')
                .collection('sessions').doc(this.sessionId).set({
                    anonymousId: this.anonymousId,
                    preferences: this.preferences,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'idle',
                    blockedSessions: []
                });
            console.log('Session created');
        } catch (error) {
            console.error('Error creating session:', error);
        }
    }

    /**
     * Setup WebRTC event callbacks
     */
    setupWebRTCCallbacks() {
        this.webrtc.onConnectionStateChange = (state) => {
            console.log('WebRTC state:', state);

            switch (state) {
                case 'connected':
                    this.ui.updateConnectionStatus('connected');
                    break;
                case 'connecting':
                case 'new':
                    this.ui.updateConnectionStatus('connecting');
                    break;
                case 'disconnected':
                case 'failed':
                case 'closed':
                    this.ui.updateConnectionStatus('disconnected');
                    if (this.currentRoomId) {
                        this.ui.showPartnerDisconnected();
                    }
                    break;
            }
        };

        this.webrtc.onError = (type, message) => {
            console.error(`WebRTC error (${type}):`, message);
            if (type === 'media') {
                this.ui.showToast('Camera/microphone access denied. You can still use text chat.', 'warning');
            }
        };
    }

    /**
     * Start searching for a match
     */
    async startSearching() {
        try {
            // Check ban status first
            const banStatus = await this.moderation.checkBanStatus();
            if (banStatus.banned) {
                this.ui.showBanPanel(banStatus.banUntil, banStatus.reason);
                return;
            }

            // Update session status
            await this.updateSessionStatus('searching');

            // Show searching panel
            this.ui.showPanel('searching');

            // Setup match callback
            this.matchingQueue.onMatch(async (matchData) => {
                await this.handleMatch(matchData);
            });

            // Join the queue
            await this.matchingQueue.join(
                this.preferences,
                this.anonymousId,
                Array.from(this.blockedSessions)
            );

        } catch (error) {
            console.error('Error starting search:', error);
            this.ui.showErrorPanel('Failed to start searching. Please try again.');
        }
    }

    /**
     * Handle a match being found
     * @param {Object} matchData
     */
    async handleMatch(matchData) {
        console.log('Match found:', matchData);

        this.currentRoomId = matchData.roomId;
        this.currentPartnerSessionId = matchData.partnerSessionId;
        this.currentPartnerAnonymousId = matchData.partnerAnonymousId;

        try {
            // Update session status
            await this.updateSessionStatus('in-chat');

            // Initialize WebRTC
            await this.webrtc.initialize(
                matchData.roomId,
                matchData.isInitiator,
                this.preferences
            );

            // Setup signaling listeners
            this.signaling.listenForRoom(matchData.roomId);

            // Setup message listener
            this.signaling.listenForMessages(matchData.roomId, (message) => {
                this.handleIncomingMessage(message);
            });

            // Create offer if we're the initiator
            if (matchData.isInitiator) {
                // Small delay to ensure both peers are ready
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.webrtc.createOffer();
            }

            // Show chat panel
            this.ui.showChatPanel(matchData.partnerAnonymousId);

        } catch (error) {
            console.error('Error handling match:', error);
            this.ui.showErrorPanel('Failed to connect. Please try again.');
        }
    }

    /**
     * Handle an incoming chat message
     * @param {Object} message
     */
    handleIncomingMessage(message) {
        // Don't display our own messages (we add them locally)
        if (message.senderId === this.sessionId) return;

        this.ui.displayMessage(message);
    }

    /**
     * Send a chat message
     * @param {string} text
     * @returns {Object|null} Error object if failed
     */
    sendMessage(text) {
        if (!text || !this.currentRoomId) return null;

        // Check moderation
        const moderationResult = this.moderation.checkMessage(text);

        if (!moderationResult.allowed) {
            if (moderationResult.reason === 'profanity') {
                // Apply 5-minute ban
                this.applyProfanityBan();
                return { error: 'banned' };
            }

            if (moderationResult.reason === 'invalid_chars') {
                return { error: 'invalid_chars' };
            }

            return { error: moderationResult.reason };
        }

        // Send message
        const message = {
            senderId: this.sessionId,
            senderName: this.anonymousId,
            text: text
        };

        this.signaling.sendMessage(this.currentRoomId, message);

        // Display locally (with timestamp)
        this.ui.displayMessage({
            ...message,
            timestamp: new Date()
        });

        return null;
    }

    /**
     * Apply a profanity ban
     */
    async applyProfanityBan() {
        try {
            await this.moderation.applyBan('profanity', 5);
            const banUntil = new Date(Date.now() + 5 * 60 * 1000);

            // Disconnect from current chat
            await this.disconnect();

            // Show ban panel
            this.ui.showBanPanel(banUntil, 'profanity');
        } catch (error) {
            console.error('Error applying ban:', error);
        }
    }

    /**
     * Skip to find a new match
     */
    async skip() {
        await this.disconnect();
        await this.startSearching();
    }

    /**
     * Block a user for this session
     * @param {string} partnerSessionId
     */
    async blockUser(partnerSessionId) {
        this.blockedSessions.add(partnerSessionId);

        // Update session with blocked list
        try {
            await this.db.collection('omechat').doc('data')
                .collection('sessions').doc(this.sessionId).update({
                    blockedSessions: firebase.firestore.FieldValue.arrayUnion(partnerSessionId)
                });
        } catch (error) {
            console.error('Error updating blocked list:', error);
        }

        // Skip to find new match
        await this.skip();
    }

    /**
     * Report a user
     * @param {string} partnerSessionId
     * @param {string} reason
     */
    async reportUser(partnerSessionId, reason) {
        try {
            await this.moderation.submitReport(partnerSessionId, reason);
        } catch (error) {
            console.error('Error submitting report:', error);
        }

        // Skip to find new match
        await this.skip();
    }

    /**
     * Cancel searching for a match
     */
    async cancelSearch() {
        await this.matchingQueue.leave();
        await this.updateSessionStatus('idle');
    }

    /**
     * Disconnect from current chat
     */
    async disconnect() {
        console.log('Disconnecting...');

        // Leave room via signaling
        if (this.currentRoomId) {
            await this.signaling.leaveRoom(this.currentRoomId);
        }

        // Close WebRTC connection
        this.webrtc.close();

        // Leave matching queue if in it
        if (this.matchingQueue.isQueued()) {
            await this.matchingQueue.leave();
        }

        // Clear state
        this.currentRoomId = null;
        this.currentPartnerSessionId = null;
        this.currentPartnerAnonymousId = null;

        // Update session status
        await this.updateSessionStatus('idle');

        // Clean up signaling listeners
        this.signaling.cleanup();
    }

    /**
     * Update session status in Firestore
     * @param {string} status
     */
    async updateSessionStatus(status) {
        try {
            await this.db.collection('omechat').doc('data')
                .collection('sessions').doc(this.sessionId).update({
                    status: status,
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (error) {
            console.error('Error updating session status:', error);
        }
    }

    /**
     * Clean up on page unload
     */
    async cleanup() {
        console.log('Cleaning up Ome-Chat...');

        try {
            // Disconnect from any active chat
            await this.disconnect();

            // Delete session
            await this.db.collection('omechat').doc('data')
                .collection('sessions').doc(this.sessionId).delete();

            // Clean up UI
            this.ui?.cleanup();
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

// Create global instance
window.omeChatManager = new OmeChatManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.omeChatManager.initialize();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Use sendBeacon for reliable cleanup on page unload
    if (window.omeChatManager.sessionId && window.omeChatManager.db) {
        // Synchronous cleanup attempt
        window.omeChatManager.cleanup().catch(console.error);
    }
});

// Also handle visibility change for mobile
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && window.omeChatManager.currentRoomId) {
        // Update last active timestamp
        window.omeChatManager.updateSessionStatus('idle').catch(console.error);
    }
});
