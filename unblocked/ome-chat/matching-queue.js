/**
 * MatchingQueue - Handles user matching logic
 * Manages joining/leaving the queue and finding compatible matches
 */
class MatchingQueue {
    constructor(db, sessionId) {
        this.db = db;
        this.sessionId = sessionId;
        this.matchCallback = null;
        this.queueListener = null;
        this.matchStatusListener = null;
        this.isInQueue = false;
        this.currentRoomId = null;
    }

    /**
     * Get reference to the matching queue collection
     */
    getQueueRef() {
        return this.db.collection('omechat').doc('data').collection('matchingQueue');
    }

    /**
     * Get reference to sessions collection
     */
    getSessionsRef() {
        return this.db.collection('omechat').doc('data').collection('sessions');
    }

    /**
     * Get reference to rooms collection
     */
    getRoomsRef() {
        return this.db.collection('omechat').doc('data').collection('rooms');
    }

    /**
     * Join the matching queue with preferences
     * @param {Object} preferences - { video: boolean, audio: boolean, text: boolean }
     * @param {string} anonymousId - The user's anonymous display ID
     * @param {string[]} blockedSessions - Array of blocked session IDs
     */
    async join(preferences, anonymousId, blockedSessions = []) {
        if (this.isInQueue) {
            console.log('Already in queue');
            return;
        }

        try {
            // Add to queue
            await this.getQueueRef().doc(this.sessionId).set({
                sessionId: this.sessionId,
                anonymousId: anonymousId,
                preferences: preferences,
                blockedSessions: blockedSessions,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'waiting'
            });

            this.isInQueue = true;
            console.log('Joined matching queue');

            // Start listening for matches
            this.startMatchmaking(preferences, blockedSessions);
        } catch (error) {
            console.error('Error joining queue:', error);
            throw error;
        }
    }

    /**
     * Start the matchmaking process
     * @param {Object} myPreferences
     * @param {string[]} blockedSessions
     */
    startMatchmaking(myPreferences, blockedSessions) {
        // Listen for other users in the queue
        this.queueListener = this.getQueueRef()
            .where('status', '==', 'waiting')
            .orderBy('joinedAt', 'asc')
            .onSnapshot(async (snapshot) => {
                // Don't process if we're not in queue anymore
                if (!this.isInQueue) return;

                const waitingUsers = [];

                snapshot.forEach((doc) => {
                    const data = doc.data();

                    // Skip self
                    if (data.sessionId === this.sessionId) return;

                    // Skip blocked users
                    if (blockedSessions.includes(data.sessionId)) return;

                    // Skip if they blocked us
                    if (data.blockedSessions && data.blockedSessions.includes(this.sessionId)) return;

                    waitingUsers.push(data);
                });

                console.log(`Found ${waitingUsers.length} waiting users`);

                // Try to find a compatible match (async — verifies each candidate is live)
                if (waitingUsers.length > 0) {
                    const match = await this.findCompatibleMatch(waitingUsers, myPreferences);
                    if (match) {
                        await this.createMatch(match);
                    }
                }
            }, (error) => {
                console.error('Error in queue listener:', error);
            });

        // Also listen for being matched by someone else
        this.listenForMatchStatus();
    }

    /**
     * Listen for our queue status being changed to 'matched'
     */
    listenForMatchStatus() {
        this.matchStatusListener = this.getQueueRef().doc(this.sessionId)
            .onSnapshot(async (doc) => {
                if (!doc.exists) return;

                const data = doc.data();

                // We were matched by someone else
                if (data.status === 'matched' && data.roomId && data.roomId !== this.currentRoomId) {
                    console.log('We were matched by another user');
                    this.currentRoomId = data.roomId;
                    this.isInQueue = false;

                    // Stop the queue listener
                    if (this.queueListener) {
                        this.queueListener();
                        this.queueListener = null;
                    }

                    // Get partner info
                    const roomDoc = await this.getRoomsRef().doc(data.roomId).get();
                    if (roomDoc.exists) {
                        const roomData = roomDoc.data();
                        const partnerId = roomData.participants.find(p => p !== this.sessionId);

                        // Get partner's anonymous ID
                        const partnerDoc = await this.getSessionsRef().doc(partnerId).get();
                        const partnerAnonymousId = partnerDoc.exists
                            ? partnerDoc.data().anonymousId
                            : 'Unknown';

                        // Notify callback - we are NOT the initiator
                        if (this.matchCallback) {
                            this.matchCallback({
                                roomId: data.roomId,
                                partnerSessionId: partnerId,
                                partnerAnonymousId: partnerAnonymousId,
                                isInitiator: false
                            });
                        }
                    }
                }
            }, (error) => {
                console.error('Error in match status listener:', error);
            });
    }

    /**
     * Find a compatible match from waiting users.
     * Verifies the candidate's session document exists and is still searching
     * before returning them — this filters out ghost entries left by closed tabs.
     * @param {Array} waitingUsers
     * @param {Object} myPreferences
     * @returns {Promise<Object|null>}
     */
    async findCompatibleMatch(waitingUsers, myPreferences) {
        for (const user of waitingUsers) {
            // Check if at least one preference matches
            const hasCommonPreference =
                (myPreferences.video && user.preferences.video) ||
                (myPreferences.audio && user.preferences.audio) ||
                (myPreferences.text && user.preferences.text);

            if (!hasCommonPreference) continue;

            // Verify the partner's session is alive via heartbeat freshness.
            // Heartbeat is the authoritative liveness signal — a session whose
            // heartbeat is older than HEARTBEAT_TIMEOUT is dead regardless of its
            // status field.  Status is checked second to catch the normal case
            // where a live session was already matched by someone else.
            try {
                const sessionDoc = await this.getSessionsRef().doc(user.sessionId).get();
                if (!sessionDoc.exists) {
                    console.log(`Skipping ${user.anonymousId} — session doc missing (ghost entry)`);
                    await this.getQueueRef().doc(user.sessionId).delete().catch(() => {});
                    continue;
                }
                const sessionData = sessionDoc.data();

                // Heartbeat check (primary liveness signal)
                if (!sessionData.heartbeat) {
                    console.log(`Skipping ${user.anonymousId} — no heartbeat (ghost entry)`);
                    await this.getQueueRef().doc(user.sessionId).delete().catch(() => {});
                    continue;
                }
                const heartbeatAge = Date.now() - sessionData.heartbeat.toMillis();
                if (heartbeatAge > window.HEARTBEAT_TIMEOUT) {
                    console.log(`Skipping ${user.anonymousId} — heartbeat stale (${heartbeatAge}ms)`);
                    await this.getQueueRef().doc(user.sessionId).delete().catch(() => {});
                    continue;
                }

                // Status check (secondary — catches "already matched" on a live session)
                if (sessionData.status !== 'searching') {
                    console.log(`Skipping ${user.anonymousId} — session status is "${sessionData.status}", not searching`);
                    continue;
                }
            } catch (error) {
                console.warn(`Could not verify session for ${user.anonymousId}:`, error);
                continue;
            }

            console.log(`Found compatible match: ${user.anonymousId}`);
            return user;
        }

        return null;
    }

    /**
     * Create a match with another user
     * @param {Object} partner
     */
    async createMatch(partner) {
        // Generate unique room ID
        const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        try {
            // Use transaction to ensure atomic match creation
            await this.db.runTransaction(async (transaction) => {
                // Get fresh data for both users AND the partner's session doc.
                // Reading the session inside the transaction closes the TOCTOU gap:
                // findCompatibleMatch verified liveness *before* we got here, but a
                // ghost's beforeunload cleanup could have landed in that window.
                const myDocRef = this.getQueueRef().doc(this.sessionId);
                const partnerDocRef = this.getQueueRef().doc(partner.sessionId);
                const partnerSessionRef = this.getSessionsRef().doc(partner.sessionId);

                const [myDoc, partnerDoc, partnerSession] = await Promise.all([
                    transaction.get(myDocRef),
                    transaction.get(partnerDocRef),
                    transaction.get(partnerSessionRef)
                ]);

                // Check both users are still waiting
                if (!myDoc.exists || !partnerDoc.exists) {
                    throw new Error('One or both users left the queue');
                }

                const myData = myDoc.data();
                const partnerData = partnerDoc.data();

                if (myData.status !== 'waiting' || partnerData.status !== 'waiting') {
                    throw new Error('One or both users are no longer waiting');
                }

                // Re-verify partner session is alive and still searching.
                // This closes the TOCTOU gap between findCompatibleMatch and here.
                if (!partnerSession.exists) {
                    throw new Error('Partner session no longer exists');
                }
                const partnerSessionData = partnerSession.data();
                if (partnerSessionData.status !== 'searching') {
                    console.log(`Transaction aborted — partner ${partner.anonymousId} status is "${partnerSessionData.status}"`);
                    throw new Error('Partner session is no longer searching');
                }
                // Heartbeat freshness re-check inside the transaction.
                // A ghost that passed findCompatibleMatch's check could have gone
                // stale in the window between that read and this transaction.
                if (!partnerSessionData.heartbeat) {
                    console.log(`Transaction aborted — partner ${partner.anonymousId} has no heartbeat`);
                    throw new Error('Partner session has no heartbeat');
                }
                const partnerHeartbeatAge = Date.now() - partnerSessionData.heartbeat.toMillis();
                if (partnerHeartbeatAge > window.HEARTBEAT_TIMEOUT) {
                    console.log(`Transaction aborted — partner ${partner.anonymousId} heartbeat stale (${partnerHeartbeatAge}ms)`);
                    throw new Error('Partner session heartbeat is stale');
                }

                // Create room (explicitly private — users can toggle public later)
                const roomRef = this.getRoomsRef().doc(roomId);
                transaction.set(roomRef, {
                    participants: [this.sessionId, partner.sessionId],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'active',
                    createdBy: this.sessionId,
                    isPublic: false
                });

                // Update both users' queue status
                transaction.update(myDocRef, {
                    status: 'matched',
                    roomId: roomId,
                    matchedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                transaction.update(partnerDocRef, {
                    status: 'matched',
                    roomId: roomId,
                    matchedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            console.log(`Match created! Room: ${roomId}`);

            // Update local state
            this.currentRoomId = roomId;
            this.isInQueue = false;

            // Stop the queue listener
            if (this.queueListener) {
                this.queueListener();
                this.queueListener = null;
            }

            // Notify callback - we ARE the initiator
            if (this.matchCallback) {
                this.matchCallback({
                    roomId: roomId,
                    partnerSessionId: partner.sessionId,
                    partnerAnonymousId: partner.anonymousId,
                    isInitiator: true
                });
            }
        } catch (error) {
            // Transaction failed, likely race condition - another match was made
            console.log('Match creation failed (likely race condition):', error.message);
            // Continue waiting in queue
        }
    }

    /**
     * Set the callback for when a match is found
     * @param {Function} callback
     */
    onMatch(callback) {
        this.matchCallback = callback;
    }

    /**
     * Leave the matching queue
     */
    async leave() {
        console.log('Leaving matching queue');

        // Stop listeners
        if (this.queueListener) {
            this.queueListener();
            this.queueListener = null;
        }

        if (this.matchStatusListener) {
            this.matchStatusListener();
            this.matchStatusListener = null;
        }

        // Remove from queue
        try {
            await this.getQueueRef().doc(this.sessionId).delete();
        } catch (error) {
            console.error('Error leaving queue:', error);
        }

        this.isInQueue = false;
        this.currentRoomId = null;
    }

    /**
     * Check if currently in the queue
     * @returns {boolean}
     */
    isQueued() {
        return this.isInQueue;
    }

    /**
     * Get current room ID if matched
     * @returns {string|null}
     */
    getRoomId() {
        return this.currentRoomId;
    }

    /**
     * Clean up all listeners and state
     */
    cleanup() {
        if (this.queueListener) {
            this.queueListener();
            this.queueListener = null;
        }

        if (this.matchStatusListener) {
            this.matchStatusListener();
            this.matchStatusListener = null;
        }

        this.isInQueue = false;
        this.currentRoomId = null;
        this.matchCallback = null;
    }
}

// Export for use in other modules
window.MatchingQueue = MatchingQueue;
