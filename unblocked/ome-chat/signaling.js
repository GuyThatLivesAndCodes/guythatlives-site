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

        // Listen for offer/answer updates on the room document
        const roomUnsub = this.getRoomRef(roomId).onSnapshot((doc) => {
            if (!doc.exists) return;

            const data = doc.data();

            // Handle offer (for non-initiators)
            if (data.offer && this.signalingCallback) {
                this.signalingCallback({
                    type: 'offer',
                    offer: data.offer
                });
            }

            // Handle answer (for initiators)
            if (data.answer && this.signalingCallback) {
                this.signalingCallback({
                    type: 'answer',
                    answer: data.answer
                });
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
     * Leave the current room
     * @param {string} roomId
     */
    async leaveRoom(roomId) {
        try {
            // Update room status to ended
            await this.getRoomRef(roomId).update({
                status: 'ended',
                endedAt: firebase.firestore.FieldValue.serverTimestamp(),
                endedBy: this.sessionId
            });
        } catch (error) {
            console.error('Error leaving room:', error);
        }

        // Unsubscribe from all listeners
        this.cleanup();
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
    }
}

// Export for use in other modules
window.SignalingManager = SignalingManager;
