/**
 * Presence Tracker - Real-time visitor tracking system
 * Tracks online users, 24h visitors, and game-specific player counts
 * All anonymous - no authentication required
 */

class PresenceTracker {
    constructor() {
        this.db = null;
        this.sessionId = null;
        this.currentGame = null;
        this.heartbeatInterval = null;
        this.cleanupInterval = null;
        this.initialized = false;

        // Config
        this.HEARTBEAT_INTERVAL = 30000; // 30 seconds
        this.SESSION_TIMEOUT = 90000; // 90 seconds (3 missed heartbeats)
        this.CLEANUP_INTERVAL = 60000; // 1 minute
        this.HOURS_24 = 24 * 60 * 60 * 1000;

        // Stats cache
        this.statsCache = {
            onlineUsers: 0,
            users24h: 0,
            totalPlaying: 0,
            popularGames: [],
            lastUpdate: 0
        };
        this.STATS_CACHE_DURATION = 5000; // 5 seconds
    }

    /**
     * Initialize presence tracking
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Wait for Firebase
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase not loaded');
            }

            this.db = firebase.firestore();
            this.sessionId = this.generateSessionId();

            console.log('PresenceTracker initialized with session:', this.sessionId);

            // Start tracking this session
            await this.startSession();

            // Set up heartbeat
            this.startHeartbeat();

            // Set up cleanup (only for online stats)
            this.startCleanup();

            // Clean up on page unload
            window.addEventListener('beforeunload', () => this.endSession());

            // Handle visibility changes (tab switches)
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pauseHeartbeat();
                } else {
                    this.resumeHeartbeat();
                }
            });

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize PresenceTracker:', error);
        }
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Start a new session
     */
    async startSession() {
        const now = Date.now();

        try {
            // Add to online_sessions collection
            await this.db.collection('online_sessions').doc(this.sessionId).set({
                sessionId: this.sessionId,
                startTime: now,
                lastHeartbeat: now,
                currentGame: null,
                page: window.location.pathname
            });

            // Add to 24h_sessions collection (for 24h tracking)
            await this.db.collection('sessions_24h').doc(this.sessionId).set({
                sessionId: this.sessionId,
                timestamp: now
            });

            console.log('Session started:', this.sessionId);
        } catch (error) {
            console.error('Error starting session:', error);
        }
    }

    /**
     * Send heartbeat to keep session alive
     */
    async sendHeartbeat() {
        if (!this.sessionId) return;

        try {
            await this.db.collection('online_sessions').doc(this.sessionId).update({
                lastHeartbeat: Date.now(),
                currentGame: this.currentGame,
                page: window.location.pathname
            });
        } catch (error) {
            // If session doesn't exist, recreate it
            if (error.code === 'not-found') {
                await this.startSession();
            } else {
                console.error('Error sending heartbeat:', error);
            }
        }
    }

    /**
     * Start heartbeat interval
     */
    startHeartbeat() {
        if (this.heartbeatInterval) return;

        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, this.HEARTBEAT_INTERVAL);
    }

    /**
     * Pause heartbeat (when tab is hidden)
     */
    pauseHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Resume heartbeat (when tab is visible again)
     */
    resumeHeartbeat() {
        this.sendHeartbeat(); // Send immediately
        this.startHeartbeat();
    }

    /**
     * End session (cleanup)
     */
    async endSession() {
        if (!this.sessionId) return;

        try {
            // Remove from online sessions
            await this.db.collection('online_sessions').doc(this.sessionId).delete();

            // Stop intervals
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
            }

            console.log('Session ended:', this.sessionId);
        } catch (error) {
            console.error('Error ending session:', error);
        }
    }

    /**
     * Clean up stale sessions
     */
    async cleanupStaleSessions() {
        const now = Date.now();
        const staleThreshold = now - this.SESSION_TIMEOUT;

        try {
            // Clean up online sessions
            const staleSessions = await this.db.collection('online_sessions')
                .where('lastHeartbeat', '<', staleThreshold)
                .limit(50)
                .get();

            const batch = this.db.batch();
            staleSessions.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            if (!staleSessions.empty) {
                await batch.commit();
                console.log(`Cleaned up ${staleSessions.size} stale sessions`);
            }

            // Clean up 24h sessions (older than 24 hours)
            const old24hThreshold = now - this.HOURS_24;
            const old24hSessions = await this.db.collection('sessions_24h')
                .where('timestamp', '<', old24hThreshold)
                .limit(100)
                .get();

            if (!old24hSessions.empty) {
                const batch24h = this.db.batch();
                old24hSessions.docs.forEach(doc => {
                    batch24h.delete(doc.ref);
                });
                await batch24h.commit();
                console.log(`Cleaned up ${old24hSessions.size} old 24h sessions`);
            }
        } catch (error) {
            console.error('Error cleaning up sessions:', error);
        }
    }

    /**
     * Start cleanup interval
     */
    startCleanup() {
        if (this.cleanupInterval) return;

        // Run cleanup every minute
        this.cleanupInterval = setInterval(() => {
            this.cleanupStaleSessions();
        }, this.CLEANUP_INTERVAL);

        // Run cleanup immediately
        this.cleanupStaleSessions();
    }

    /**
     * Track that user is playing a specific game
     */
    async trackGamePlay(gameId) {
        this.currentGame = gameId;

        if (!this.sessionId) return;

        try {
            // Update current session
            await this.db.collection('online_sessions').doc(this.sessionId).update({
                currentGame: gameId,
                lastHeartbeat: Date.now()
            });
        } catch (error) {
            console.error('Error tracking game play:', error);
        }
    }

    /**
     * Stop tracking game play
     */
    async stopTrackingGame() {
        this.currentGame = null;

        if (!this.sessionId) return;

        try {
            await this.db.collection('online_sessions').doc(this.sessionId).update({
                currentGame: null,
                lastHeartbeat: Date.now()
            });
        } catch (error) {
            console.error('Error stopping game tracking:', error);
        }
    }

    /**
     * Get current statistics
     */
    async getStats() {
        // Return cached stats if valid
        const now = Date.now();
        if (this.statsCache.lastUpdate &&
            (now - this.statsCache.lastUpdate) < this.STATS_CACHE_DURATION) {
            return { ...this.statsCache };
        }

        try {
            // Get online users count
            const onlineSessions = await this.db.collection('online_sessions').get();
            const onlineUsers = onlineSessions.size;

            // Get 24h users count
            const sessions24h = await this.db.collection('sessions_24h').get();
            const users24h = sessions24h.size;

            // Count users playing games
            let totalPlaying = 0;
            const gamePlayCounts = {};

            onlineSessions.docs.forEach(doc => {
                const data = doc.data();
                if (data.currentGame) {
                    totalPlaying++;
                    gamePlayCounts[data.currentGame] = (gamePlayCounts[data.currentGame] || 0) + 1;
                }
            });

            // Get popular games (sorted by current players)
            const popularGames = Object.entries(gamePlayCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([gameId, count]) => ({ gameId, playerCount: count }));

            // Update cache
            this.statsCache = {
                onlineUsers,
                users24h,
                totalPlaying,
                popularGames,
                lastUpdate: now
            };

            return { ...this.statsCache };
        } catch (error) {
            console.error('Error getting stats:', error);
            return this.statsCache; // Return cached data on error
        }
    }

    /**
     * Get player count for a specific game
     */
    async getGamePlayerCount(gameId) {
        try {
            const sessions = await this.db.collection('online_sessions')
                .where('currentGame', '==', gameId)
                .get();

            return sessions.size;
        } catch (error) {
            console.error('Error getting game player count:', error);
            return 0;
        }
    }

    /**
     * Listen to real-time stats updates
     */
    subscribeToStats(callback) {
        if (!this.db) {
            console.error('Database not initialized');
            return () => {};
        }

        // Subscribe to online sessions changes
        const unsubscribe = this.db.collection('online_sessions')
            .onSnapshot(async () => {
                // Invalidate cache and get fresh stats
                this.statsCache.lastUpdate = 0;
                const stats = await this.getStats();
                callback(stats);
            }, error => {
                console.error('Error subscribing to stats:', error);
            });

        return unsubscribe;
    }
}

// Create global instance
window.presenceTracker = new PresenceTracker();
