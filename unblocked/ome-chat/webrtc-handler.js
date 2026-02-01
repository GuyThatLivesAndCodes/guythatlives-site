/**
 * WebRTCHandler - Manages WebRTC peer connections for video/audio chat
 * Uses STUN servers for NAT traversal
 */
class WebRTCHandler {
    constructor(signaling) {
        this.signaling = signaling;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.roomId = null;
        this.isInitiator = false;

        // STUN servers for NAT traversal (free Google servers)
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10
        };

        // Event callbacks
        this.onRemoteStream = null;
        this.onConnectionStateChange = null;
        this.onLocalStream = null;
        this.onError = null;

        // Track whether offer/answer has been processed
        this.hasProcessedOffer = false;
        this.hasProcessedAnswer = false;
        this.pendingCandidates = [];
    }

    /**
     * Initialize WebRTC for a room
     * @param {string} roomId
     * @param {boolean} isInitiator
     * @param {Object} preferences - { video: boolean, audio: boolean }
     */
    async initialize(roomId, isInitiator, preferences = { video: true, audio: true }) {
        this.roomId = roomId;
        this.isInitiator = isInitiator;
        this.hasProcessedOffer = false;
        this.hasProcessedAnswer = false;
        this.pendingCandidates = [];

        console.log(`Initializing WebRTC - Room: ${roomId}, Initiator: ${isInitiator}`);

        // Create peer connection
        this.peerConnection = new RTCPeerConnection(this.configuration);

        // Setup event handlers
        this.setupPeerConnectionHandlers();

        // Get local media if video or audio is enabled
        if (preferences.video || preferences.audio) {
            await this.getLocalMedia(preferences);
        }

        // Add local tracks to peer connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        // Listen for signaling messages
        this.signaling.onSignalingMessage(this.handleSignalingMessage.bind(this));
    }

    /**
     * Get local media (camera and/or microphone)
     * @param {Object} preferences
     */
    async getLocalMedia(preferences) {
        const constraints = {
            video: preferences.video ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            } : false,
            audio: preferences.audio ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } : false
        };

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Got local media stream');

            // Notify UI
            if (this.onLocalStream) {
                this.onLocalStream(this.localStream);
            }

            // Display in local video element
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }
        } catch (error) {
            console.error('Failed to get local media:', error);

            // Try again with just audio if video failed
            if (preferences.video && preferences.audio) {
                console.log('Retrying with audio only...');
                try {
                    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    if (this.onLocalStream) {
                        this.onLocalStream(this.localStream);
                    }
                } catch (audioError) {
                    console.error('Failed to get audio:', audioError);
                    // Create empty stream as fallback
                    this.localStream = new MediaStream();
                }
            } else {
                // Create empty stream as fallback for text-only
                this.localStream = new MediaStream();
            }

            if (this.onError) {
                this.onError('media', error.message);
            }
        }
    }

    /**
     * Setup event handlers for the peer connection
     */
    setupPeerConnectionHandlers() {
        // Handle ICE candidates
        this.peerConnection.onicecandidate = async (event) => {
            if (event.candidate) {
                console.log('New ICE candidate:', event.candidate.candidate.substring(0, 50) + '...');
                await this.signaling.sendCandidate(this.roomId, event.candidate);
            }
        };

        // Handle ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection.iceConnectionState;
            console.log('ICE connection state:', state);

            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(state);
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log('Connection state:', state);

            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(state);
            }

            if (state === 'failed') {
                console.error('Connection failed, attempting ICE restart...');
                this.restartIce();
            }
        };

        // Handle remote tracks
        this.peerConnection.ontrack = (event) => {
            console.log('Received remote track:', event.track.kind);

            if (!this.remoteStream) {
                this.remoteStream = new MediaStream();
            }

            this.remoteStream.addTrack(event.track);

            // Display in remote video element
            const remoteVideo = document.getElementById('remote-video');
            if (remoteVideo) {
                remoteVideo.srcObject = this.remoteStream;
            }

            // Hide placeholder
            const placeholder = document.getElementById('remote-video-placeholder');
            if (placeholder) {
                placeholder.classList.add('hidden');
            }

            if (this.onRemoteStream) {
                this.onRemoteStream(this.remoteStream);
            }
        };

        // Handle negotiation needed
        this.peerConnection.onnegotiationneeded = async () => {
            console.log('Negotiation needed');
            if (this.isInitiator && this.peerConnection.signalingState === 'stable') {
                await this.createOffer();
            }
        };

        // Handle signaling state changes
        this.peerConnection.onsignalingstatechange = () => {
            console.log('Signaling state:', this.peerConnection.signalingState);
        };
    }

    /**
     * Create and send an offer (for initiator)
     */
    async createOffer() {
        try {
            console.log('Creating offer...');
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });

            await this.peerConnection.setLocalDescription(offer);
            console.log('Local description set (offer)');

            await this.signaling.sendOffer(this.roomId, offer);
            console.log('Offer sent');
        } catch (error) {
            console.error('Error creating offer:', error);
            if (this.onError) {
                this.onError('offer', error.message);
            }
        }
    }

    /**
     * Handle incoming signaling messages
     * @param {Object} message
     */
    async handleSignalingMessage(message) {
        if (!this.peerConnection) return;

        try {
            switch (message.type) {
                case 'offer':
                    // Only process offer if we're not the initiator
                    if (!this.isInitiator && !this.hasProcessedOffer) {
                        console.log('Received offer, creating answer...');
                        this.hasProcessedOffer = true;

                        await this.peerConnection.setRemoteDescription(
                            new RTCSessionDescription(message.offer)
                        );
                        console.log('Remote description set (offer)');

                        // Process any pending candidates
                        await this.processPendingCandidates();

                        const answer = await this.peerConnection.createAnswer();
                        await this.peerConnection.setLocalDescription(answer);
                        console.log('Local description set (answer)');

                        await this.signaling.sendAnswer(this.roomId, answer);
                        console.log('Answer sent');
                    }
                    break;

                case 'answer':
                    // Only process answer if we're the initiator
                    if (this.isInitiator && !this.hasProcessedAnswer) {
                        console.log('Received answer');
                        this.hasProcessedAnswer = true;

                        await this.peerConnection.setRemoteDescription(
                            new RTCSessionDescription(message.answer)
                        );
                        console.log('Remote description set (answer)');

                        // Process any pending candidates
                        await this.processPendingCandidates();
                    }
                    break;

                case 'candidate':
                    // If remote description is set, add candidate immediately
                    // Otherwise, queue it for later
                    if (this.peerConnection.remoteDescription) {
                        await this.peerConnection.addIceCandidate(
                            new RTCIceCandidate(message.candidate)
                        );
                    } else {
                        this.pendingCandidates.push(message.candidate);
                    }
                    break;

                case 'room_ended':
                    console.log('Room ended by peer');
                    if (this.onConnectionStateChange) {
                        this.onConnectionStateChange('disconnected');
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling signaling message:', error);
            if (this.onError) {
                this.onError('signaling', error.message);
            }
        }
    }

    /**
     * Process any ICE candidates that arrived before remote description was set
     */
    async processPendingCandidates() {
        console.log(`Processing ${this.pendingCandidates.length} pending candidates`);

        for (const candidate of this.pendingCandidates) {
            try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('Error adding pending candidate:', error);
            }
        }

        this.pendingCandidates = [];
    }

    /**
     * Attempt to restart ICE in case of connection failure
     */
    async restartIce() {
        if (!this.peerConnection || !this.isInitiator) return;

        try {
            const offer = await this.peerConnection.createOffer({ iceRestart: true });
            await this.peerConnection.setLocalDescription(offer);
            await this.signaling.sendOffer(this.roomId, offer);
            console.log('ICE restart initiated');
        } catch (error) {
            console.error('Error restarting ICE:', error);
        }
    }

    /**
     * Toggle local video on/off
     * @returns {boolean} New state
     */
    toggleVideo() {
        if (!this.localStream) return false;

        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            return videoTrack.enabled;
        }
        return false;
    }

    /**
     * Toggle local audio on/off
     * @returns {boolean} New state
     */
    toggleAudio() {
        if (!this.localStream) return false;

        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            return audioTrack.enabled;
        }
        return false;
    }

    /**
     * Get current video/audio state
     * @returns {Object}
     */
    getMediaState() {
        if (!this.localStream) {
            return { video: false, audio: false };
        }

        const videoTrack = this.localStream.getVideoTracks()[0];
        const audioTrack = this.localStream.getAudioTracks()[0];

        return {
            video: videoTrack ? videoTrack.enabled : false,
            audio: audioTrack ? audioTrack.enabled : false
        };
    }

    /**
     * Close the peer connection and clean up
     */
    close() {
        console.log('Closing WebRTC connection');

        // Stop all local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
                console.log(`Stopped ${track.kind} track`);
            });
            this.localStream = null;
        }

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Clear remote stream
        this.remoteStream = null;
        this.roomId = null;
        this.isInitiator = false;
        this.hasProcessedOffer = false;
        this.hasProcessedAnswer = false;
        this.pendingCandidates = [];

        // Clear video elements
        const localVideo = document.getElementById('local-video');
        const remoteVideo = document.getElementById('remote-video');
        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;

        // Show placeholder
        const placeholder = document.getElementById('remote-video-placeholder');
        if (placeholder) {
            placeholder.classList.remove('hidden');
        }
    }

    /**
     * Check if WebRTC is supported in the browser
     * @returns {boolean}
     */
    static isSupported() {
        return !!(
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia &&
            window.RTCPeerConnection
        );
    }
}

// Export for use in other modules
window.WebRTCHandler = WebRTCHandler;
