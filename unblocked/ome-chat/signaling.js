/**
 * SignalingManager - Firebase Firestore-based WebRTC signaling
 * Handles SDP offers/answers and ICE candidate exchange
 */
class SignalingManager {
    constructor(db, sessionId) {
        this.db = db;
        this.sessionId = sessionId;
        this.unsubscribers = [];
        this.signalingCallback = null;
        this.messageCallback = null;
        this.currentRoomId = null;

        // Track last-seen timestamps so we don't re-fire stale offer/answer
        this.lastOfferTimestamp = null;
        this.lastAnswerTimestamp = null;

        // Public room listener
        this.publicRoomsCallback = null;
    }

    /**
     * Get a reference to a room document
     * @param {string} roomId
     * @returns {firebase.firestore.DocumentReference}
     */
    getRoomRef(roomId) {
        return this.db.collection('omechat').doc('data').collection('rooms').doc(roomId);
    }

    /**
     * Send a WebRTC offer to the room
     * @param {string} roomId
     * @param {RTCSessionDescriptionInit} offer
     */
    async sendOffer(roomId, offer) {
        try {
            await this.getRoomRef(roomId).update({
                offer: {
                    type: offer.type,
                    sdp: offer.sdp
                },
                offerTimestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Offer sent to room:', roomId);
        } catch (error) {
            console.error('Error sending offer:', error);
            throw error;
        }
    }

    /**
     * Send a WebRTC answer to the room
     * @param {string} roomId
     * @param {RTCSessionDescriptionInit} answer
     */
    async sendAnswer(roomId, answer) {
        try {
            await this.getRoomRef(roomId).update({
                answer: {
                    type: answer.type,
                    sdp: answer.sdp
                },
                answerTimestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Answer sent to room:', roomId);
        } catch (error) {
            console.error('Error sending answer:', error);
            throw error;
        }
    }

    /**
     * Send an ICE candidate to the room
     * @param {string} roomId
     * @param {RTCIceCandidate} candidate
     */
    async sendCandidate(roomId, candidate) {
        try {
            await this.getRoomRef(roomId).collection('candidates').add({
                candidate: candidate.candidate,
                sdpMid: candidate.sdpMid,
                sdpMLineIndex: candidate.sdpMLineIndex,
                fromSession: this.sessionId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error sending ICE candidate:', error);
        }
    }

    /**
     * Listen for signaling messages in a room
     * @param {string} roomId
     */
    listenForRoom(roomId) {
        this.currentRoomId = roomId;
        this.lastOfferTimestamp = null;
        this.lastAnswerTimestamp = null;

        // Listen for offer/answer updates on the room document
        const roomUnsub = this.getRoomRef(roomId).onSnapshot((doc) => {
            if (!doc.exists) return;

            const data = doc.data();

            // Only fire offer callback if the offerTimestamp is newer than what we last saw.
            // This prevents re-firing on every unrelated snapshot update.
            if (data.offer && data.offerTimestamp && this.signalingCallback) {
                const ts = data.offerTimestamp.toMillis();
                if (this.lastOfferTimestamp === null || ts > this.lastOfferTimestamp) {
                    this.lastOfferTimestamp = ts;
                    this.signalingCallback({
                        type: 'offer',
                        offer: data.offer
                    });
                }
            }

            // Same dedup logic for answer
            if (data.answer && data.answerTimestamp && this.signalingCallback) {
                const ts = data.answerTimestamp.toMillis();
                if (this.lastAnswerTimestamp === null || ts > this.lastAnswerTimestamp) {
                    this.lastAnswerTimestamp = ts;
                    this.signalingCallback({
                        type: 'answer',
                        answer: data.answer
                    });
                }
            }

            // Handle room status changes
            if (data.status === 'ended') {
                this.signalingCallback({
                    type: 'room_ended'
                });
            }
        }, (error) => {
            console.error('Error listening to room:', error);
        });

        // Listen for ICE candidates from the other peer
        const candidatesUnsub = this.getRoomRef(roomId)
            .collection('candidates')
            .where('fromSession', '!=', this.sessionId)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added' && this.signalingCallback) {
                        const data = change.doc.data();
                        this.signalingCallback({
                            type: 'candidate',
                            candidate: {
                                candidate: data.candidate,
                                sdpMid: data.sdpMid,
                                sdpMLineIndex: data.sdpMLineIndex
                            }
                        });
                    }
                });
            }, (error) => {
                console.error('Error listening to candidates:', error);
            });

        this.unsubscribers.push(roomUnsub, candidatesUnsub);
    }

    /**
     * Send a text message to the room
     * @param {string} roomId
     * @param {Object} message
     */
    async sendMessage(roomId, message) {
        try {
            await this.getRoomRef(roomId).collection('messages').add({
                ...message,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    /**
     * Listen for text messages in a room
     * @param {string} roomId
     * @param {Function} callback
     */
    listenForMessages(roomId, callback) {
        this.messageCallback = callback;

        const unsub = this.getRoomRef(roomId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        callback({
                            ...data,
                            id: change.doc.id,
                            timestamp: data.timestamp?.toDate() || new Date()
                        });
                    }
                });
            }, (error) => {
                console.error('Error listening to messages:', error);
            });

        this.unsubscribers.push(unsub);
    }

    /**
     * Set the callback for signaling messages
     * @param {Function} callback
     */
    onSignalingMessage(callback) {
        this.signalingCallback = callback;
    }

    /**
     * Remove a participant from a room without ending it.
     * The room stays alive for other participants; the client-side
     * room-close timer will end it after 5s if only ≤1 person remains.
     * @param {string} roomId
     * @param {string} sessionId
     */
    async removeParticipant(roomId, sessionId) {
        try {
            await this.getRoomRef(roomId).update({
                participants: firebase.firestore.FieldValue.arrayRemove(sessionId)
            });
        } catch (error) {
            console.error('Error removing participant:', error);
        }
    }

    /**
     * End a room (called by the room-close timer when the room has been empty long enough)
     * @param {string} roomId
     */
    async endRoom(roomId) {
        try {
            await this.getRoomRef(roomId).update({
                status: 'ended',
                endedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error ending room:', error);
        }
    }

    /**
     * Create a new room document
     * @param {string} roomId
     * @param {string[]} participants
     */
    async createRoom(roomId, participants) {
        try {
            await this.getRoomRef(roomId).set({
                participants: participants,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active',
                createdBy: this.sessionId
            });
            console.log('Room created:', roomId);
            return true;
        } catch (error) {
            console.error('Error creating room:', error);
            return false;
        }
    }

    /**
     * Check if a room exists and is active
     * @param {string} roomId
     * @returns {Promise<boolean>}
     */
    async isRoomActive(roomId) {
        try {
            const doc = await this.getRoomRef(roomId).get();
            return doc.exists && doc.data().status === 'active';
        } catch (error) {
            console.error('Error checking room status:', error);
            return false;
        }
    }

    /**
     * Mark a room as public or private
     * @param {string} roomId
     * @param {boolean} isPublic
     */
    async setRoomPublic(roomId, isPublic) {
        try {
            await this.getRoomRef(roomId).update({
                isPublic: isPublic
            });
            console.log(`Room ${roomId} set to ${isPublic ? 'public' : 'private'}`);
        } catch (error) {
            console.error('Error updating room visibility:', error);
            throw error;
        }
    }

    /**
     * Listen for all active rooms (public and private).
     * The UI decides which are joinable based on isPublic.
     * @param {Function} callback - receives array of room data
     */
    listenForAllRooms(callback) {
        this.publicRoomsCallback = callback;

        const unsub = this.db.collection('omechat').doc('data').collection('rooms')
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                const rooms = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    if (!data.participants) return;

                    // Opportunistic cleanup: end any active room that has been
                    // abandoned (0 participants).  These are ghosts left behind
                    // when both users' tabs closed before the client-side timer
                    // could fire.  Deleting them here is idempotent — multiple
                    // clients racing to end the same room is harmless.
                    if (data.participants.length === 0) {
                        console.log(`Cleaning up ghost room ${doc.id} (0 participants)`);
                        this.endRoom(doc.id);
                        return; // don't include it in the list
                    }

                    // Safety net: end rooms that have been active for >30 min
                    // with ≤2 participants.  These are rooms where both users
                    // crashed and nobody was watching to run
                    // validateRoomParticipants.  The next visitor who loads the
                    // searching panel will clean them up.  Idempotent — multiple
                    // clients racing to end the same room is harmless.
                    if (data.participants.length <= 2 && data.createdAt) {
                        const ageMs = Date.now() - data.createdAt.toMillis();
                        if (ageMs > 30 * 60 * 1000) { // 30 minutes
                            console.log(`Cleaning up stale room ${doc.id} (${data.participants.length} participants, ${Math.round(ageMs / 60000)} min old)`);
                            this.endRoom(doc.id);
                            return; // don't include it in the list
                        }
                    }

                    rooms.push({
                        roomId: doc.id,
                        participants: data.participants,
                        createdBy: data.createdBy,
                        createdAt: data.createdAt,
                        participantCount: data.participants.length,
                        isPublic: data.isPublic === true
                    });
                });
                if (this.publicRoomsCallback) {
                    this.publicRoomsCallback(rooms);
                }
            }, (error) => {
                console.error('Error listening to rooms:', error);
            });

        this.unsubscribers.push(unsub);
    }

    /**
     * Add a participant to an existing room (for joining public rooms)
     * @param {string} roomId
     * @param {string} sessionId
     * @returns {boolean} success
     */
    async joinRoom(roomId, sessionId) {
        try {
            const roomRef = this.getRoomRef(roomId);
            const doc = await roomRef.get();

            if (!doc.exists) return false;

            const data = doc.data();
            if (data.status !== 'active') return false;
            if (data.isPublic !== true) return false; // safety guard — UI hides Join for private rooms
            if (data.participants.includes(sessionId)) return false;
            if (data.participants.length >= 10) return false;

            await roomRef.update({
                participants: firebase.firestore.FieldValue.arrayUnion(sessionId)
            });

            console.log(`Joined room: ${roomId}`);
            return true;
        } catch (error) {
            console.error('Error joining room:', error);
            return false;
        }
    }


    /**
     * Listen for participant changes in a room (for multi-user rooms)
     * @param {string} roomId
     * @param {Function} callback
     */
    listenForParticipants(roomId, callback) {
        const unsub = this.getRoomRef(roomId).onSnapshot((doc) => {
            if (!doc.exists) return;
            const data = doc.data();
            callback(data.participants || [], data);
        });
        this.unsubscribers.push(unsub);
    }

    /**
     * Clean up all listeners
     */
    cleanup() {
        this.unsubscribers.forEach(unsub => {
            if (typeof unsub === 'function') {
                unsub();
            }
        });
        this.unsubscribers = [];
        this.currentRoomId = null;
        this.signalingCallback = null;
        this.messageCallback = null;
        this.lastOfferTimestamp = null;
        this.lastAnswerTimestamp = null;
        this.publicRoomsCallback = null;
    }
}

// Export for use in other modules
window.SignalingManager = SignalingManager;
