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
        this.isRoomPublic = false;
        this.roomParticipants = [];

        // Room-close timer: fires after 5s of ≤1 person to end the room
        this.roomCloseTimeout = null;
        // Skip penalty: true while the 3s countdown is running (debounce guard)
        this.skipPenaltyActive = false;
        // Safe Mode: when true, WebRTC uses Cloudflare TURN instead of Google STUN
        this.safeMode = false;

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
                    // Transient — ICE restart will attempt recovery automatically.
                    // Just update the indicator; don't trigger partner-disconnected yet.
                    this.ui.updateConnectionStatus('connecting');
                    break;
                case 'failed':
                case 'closed':
                    // WebRTC layer is dead. Don't auto-skip here — the room-close
                    // timer will fire when the participant list actually shrinks,
                    // giving the connection a chance to recover or the partner to rejoin.
                    this.ui.updateConnectionStatus('disconnected');
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

            // Start listening for all rooms to show in sidebar
            this.startListeningForAllRooms();

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

            // Initialize WebRTC (pass safeMode to select STUN vs TURN)
            await this.webrtc.initialize(
                matchData.roomId,
                matchData.isInitiator,
                this.preferences,
                this.safeMode
            );

            // Setup signaling listeners
            this.signaling.listenForRoom(matchData.roomId);

            // Setup message listener
            this.signaling.listenForMessages(matchData.roomId, (message) => {
                this.handleIncomingMessage(message);
            });

            // Listen for participant changes — drives the room-close timer
            // so we detect when the partner leaves even in a 1-to-1 room.
            this.signaling.listenForParticipants(matchData.roomId, (participants, roomData) => {
                this.handleParticipantChange(participants, roomData);
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
                // Handle profanity with strike system
                const strikeResult = this.handleProfanityStrike(moderationResult.censored || '****');
                return { error: strikeResult.banned ? 'banned' : 'warning', strikeResult };
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
     * Handle a profanity strike - warn user or ban after 3 strikes
     * @param {string} censoredWord - The censored version of the bad word
     * @returns {{banned: boolean, strikeCount: number, remaining: number, banUntil?: Date}}
     */
    handleProfanityStrike(censoredWord) {
        const result = this.moderation.handleProfanityViolation();

        if (result.banned) {
            // User has been banned after 3 strikes
            this.ui.showToast(`Strike 3! You've been banned for 5 minutes.`, 'error');

            // Disconnect from current chat
            this.disconnect();

            // Show ban panel
            this.ui.showBanPanel(result.banUntil, 'profanity');
        } else {
            // Show warning toast
            this.ui.showToast(
                `Warning ${result.strikeCount}/3: "${censoredWord}" is not allowed. ${result.remaining} warning(s) left before ban.`,
                'warning'
            );
        }

        return result;
    }

    /**
     * Skip to find a new match — shows a forced 3-second penalty countdown first.
     * Debounced: calling skip() while a penalty is already running does nothing.
     */
    skip() {
        if (this.skipPenaltyActive) return;
        this.skipPenaltyActive = true;

        this.ui.showSkipPenalty(async () => {
            this.skipPenaltyActive = false;
            await this.disconnect();
            await this.startSearching();
        });
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
     * Toggle the current room's public visibility
     */
    async togglePublic() {
        if (!this.currentRoomId) return;

        this.isRoomPublic = !this.isRoomPublic;

        try {
            await this.signaling.setRoomPublic(this.currentRoomId, this.isRoomPublic);
            this.ui.updatePublicButton(this.isRoomPublic);
            this.ui.showToast(
                this.isRoomPublic
                    ? 'Room is now public — others can join while searching'
                    : 'Room is now private',
                'info'
            );
        } catch (error) {
            console.error('Error toggling public:', error);
            this.isRoomPublic = !this.isRoomPublic; // revert
            this.ui.showToast('Failed to update room visibility', 'error');
        }
    }

    /**
     * Start listening for all active rooms (called when entering the searching panel)
     */
    startListeningForAllRooms() {
        this.signaling.listenForAllRooms((rooms) => {
            this.ui.updateRoomsList(rooms);
        });
    }

    /**
     * Join a public room by ID
     * @param {string} roomId
     */
    async joinPublicRoom(roomId) {
        try {
            const joined = await this.signaling.joinRoom(roomId, this.sessionId);
            if (!joined) {
                this.ui.showToast('Could not join that room (full or no longer available)', 'error');
                return;
            }

            // Cancel any ongoing search
            if (this.matchingQueue.isQueued()) {
                await this.matchingQueue.leave();
            }

            this.currentRoomId = roomId;
            await this.updateSessionStatus('in-chat');

            // Initialize WebRTC — we are NOT the initiator (we joined an existing room)
            await this.webrtc.initialize(roomId, false, this.preferences, this.safeMode);
            this.signaling.listenForRoom(roomId);
            this.signaling.listenForMessages(roomId, (message) => {
                this.handleIncomingMessage(message);
            });

            // Listen for participant changes to connect to new peers
            this.signaling.listenForParticipants(roomId, (participants, roomData) => {
                this.handleParticipantChange(participants, roomData);
            });

            // Create offer to room creator (first participant)
            // Each joiner connects peer-to-peer with every existing participant
            this.roomParticipants = [];
            // Short delay to let listeners settle
            await new Promise(resolve => setTimeout(resolve, 300));

            // Get current participants and connect
            const roomDoc = await this.db.collection('omechat').doc('data')
                .collection('rooms').doc(roomId).get();
            if (roomDoc.exists) {
                const participants = roomDoc.data().participants;
                this.roomParticipants = [...participants];

                // Show chat with multi-user info
                this.ui.showChatPanel('Public Room');
                this.ui.updateParticipantsBar(participants, this.sessionId);
            }
        } catch (error) {
            console.error('Error joining public room:', error);
            this.ui.showToast('Failed to join room', 'error');
        }
    }

    /**
     * Handle participant list changes in a room.
     * Manages the room-close timer: if ≤1 person remains for 5 seconds, end the room.
     */
    handleParticipantChange(participants, roomData) {
        if (!this.currentRoomId) return;

        // Update UI
        this.ui.updateParticipantsBar(participants, this.sessionId);

        // Room was ended (by timer or another client)
        if (roomData && roomData.status === 'ended') {
            this.ui.addSystemMessage('This room has ended.');
            this.ui.showPartnerDisconnected();
            return;
        }

        this.roomParticipants = [...participants];

        // Room-close timer: start/cancel based on participant count
        if (participants.length <= 1) {
            // Only one (or zero) people left — start the 5s close timer if not already running
            if (!this.roomCloseTimeout) {
                console.log(`Room down to ${participants.length} — starting 5s close timer`);
                this.roomCloseTimeout = setTimeout(async () => {
                    this.roomCloseTimeout = null;
                    if (this.currentRoomId) {
                        console.log('Room close timer fired — ending room');
                        await this.signaling.endRoom(this.currentRoomId);
                    }
                }, 5000);
            }
        } else {
            // Multiple people — cancel any pending close timer
            if (this.roomCloseTimeout) {
                console.log('Room has multiple participants again — cancelling close timer');
                clearTimeout(this.roomCloseTimeout);
                this.roomCloseTimeout = null;
            }
        }
    }

    /**
     * Cancel searching for a match
     */
    async cancelSearch() {
        await this.matchingQueue.leave();
        await this.updateSessionStatus('idle');
    }

    /**
     * Disconnect from current chat — removes us from the room but doesn't end it.
     * The room-close timer (in handleParticipantChange) will end it if nobody else remains.
     */
    async disconnect() {
        console.log('Disconnecting...');

        const roomId = this.currentRoomId;

        // Cancel any pending room-close timer (we're leaving, not managing anymore)
        if (this.roomCloseTimeout) {
            clearTimeout(this.roomCloseTimeout);
            this.roomCloseTimeout = null;
        }

        // Clear state FIRST so the onConnectionStateChange callback
        // (fired synchronously by webrtc.close()) won't trigger anything.
        this.currentRoomId = null;
        this.currentPartnerSessionId = null;
        this.currentPartnerAnonymousId = null;
        this.isRoomPublic = false;
        this.roomParticipants = [];
        this.skipPenaltyActive = false;

        // Close WebRTC connection (may fire 'closed' state change synchronously)
        this.webrtc.close();

        // Remove ourselves from the room (room stays alive for others)
        if (roomId) {
            try {
                await this.signaling.removeParticipant(roomId, this.sessionId);
            } catch (e) {
                console.error('Error removing from room:', e);
            }
        }

        // Leave matching queue if in it
        if (this.matchingQueue.isQueued()) {
            await this.matchingQueue.leave();
        }

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

// Cleanup on page unload — fire-and-forget Firestore writes.
// These dispatch immediately even though we can't await them in beforeunload.
window.addEventListener('beforeunload', () => {
    const mgr = window.omeChatManager;
    if (!mgr.sessionId || !mgr.db) return;

    const base = mgr.db.collection('omechat').doc('data');

    // Delete our queue entry so we don't become a ghost match target
    base.collection('matchingQueue').doc(mgr.sessionId).delete();

    // Mark session as idle so the live session check in matchmaking skips us
    base.collection('sessions').doc(mgr.sessionId).update({ status: 'idle' });

    // Remove ourselves from any active room (don't end it — the room-close timer
    // on the remaining clients will end it after 5s if nobody else is there)
    if (mgr.currentRoomId) {
        base.collection('rooms').doc(mgr.currentRoomId).update({
            participants: firebase.firestore.FieldValue.arrayRemove(mgr.sessionId)
        });
    }
});

// Handle visibility change for mobile — only update last-active when idle/searching,
// never while in an active chat (setting 'idle' there would corrupt the session for
// the partner's live-session verification in the matching queue).
document.addEventListener('visibilitychange', () => {
    const mgr = window.omeChatManager;
    if (document.visibilityState === 'visible' && mgr.sessionId && mgr.db) {
        // Tab came back — refresh the lastActive timestamp so the session stays warm
        mgr.db.collection('omechat').doc('data')
            .collection('sessions').doc(mgr.sessionId)
            .update({ lastActive: firebase.firestore.FieldValue.serverTimestamp() })
            .catch(() => {});
    }
});
