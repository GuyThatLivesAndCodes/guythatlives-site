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

        // Connection recovery
        this.iceRestartAttempts = 0;
        this.maxIceRestartAttempts = 3;
        this.reconnectTimeout = null;
        this.disconnectGraceTimeout = null;

        // Multi-peer support for public rooms: sessionId -> { pc, remoteStream }
        this.peers = new Map();
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
        // Try video+audio first, then fall back through progressively less demanding options.
        // A denied permission must never stop the connection — text-only is always valid.
        const attempts = [];
        if (preferences.video && preferences.audio) {
            attempts.push(
                { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } },
                { video: true, audio: true },
                { video: false, audio: true },
                { video: true, audio: false }
            );
        } else if (preferences.video) {
            attempts.push(
                { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false },
                { video: true, audio: false }
            );
        } else if (preferences.audio) {
            attempts.push(
                { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false },
                { audio: true, video: false }
            );
        }

        for (const constraints of attempts) {
            try {
                this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('Got local media stream with constraints:', JSON.stringify(constraints));

                if (this.onLocalStream) {
                    this.onLocalStream(this.localStream);
                }

                const localVideo = document.getElementById('local-video');
                if (localVideo) {
                    localVideo.srcObject = this.localStream;
                }
                return; // success — stop trying
            } catch (error) {
                console.warn('Media attempt failed:', error.name, '— trying next fallback');
            }
        }

        // All attempts failed — proceed with no tracks (text-only chat still works)
        console.warn('All media attempts failed. Continuing as text-only.');
        this.localStream = new MediaStream();
        if (this.onError) {
            this.onError('media', 'Camera/microphone access denied. Continuing as text-only.');
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

        // Log ICE state for debugging only — do NOT drive the UI from here.
        // onconnectionstatechange (below) is the single source of truth for UI state.
        // ICE states like 'checking'/'completed'/'disconnected' are internal details
        // that would cause confusing flicker if surfaced to the user.
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        };

        // Handle connection state changes — single source of truth for UI
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log('Connection state:', state);

            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(state);
            }

            if (state === 'connected') {
                // Connection succeeded — reset all recovery state
                this.iceRestartAttempts = 0;
                if (this.reconnectTimeout) {
                    clearTimeout(this.reconnectTimeout);
                    this.reconnectTimeout = null;
                }
                // Cancel any pending disconnection grace timer
                if (this.disconnectGraceTimeout) {
                    clearTimeout(this.disconnectGraceTimeout);
                    this.disconnectGraceTimeout = null;
                }
            }

            if (state === 'failed') {
                // Hard failure — restart ICE immediately
                console.warn('Connection failed, attempting ICE restart...');
                this.restartIce();
            }

            if (state === 'disconnected') {
                // Transient blip — the spec says this can self-heal.
                // Give it 5 seconds before escalating to a full ICE restart.
                // If 'connected' fires before the timer, it gets cancelled above.
                console.warn('Connection disconnected — starting 5s grace period before ICE restart');
                if (this.disconnectGraceTimeout) {
                    clearTimeout(this.disconnectGraceTimeout);
                }
                this.disconnectGraceTimeout = setTimeout(() => {
                    this.disconnectGraceTimeout = null;
                    if (this.peerConnection && this.peerConnection.connectionState !== 'connected') {
                        console.warn('Grace period expired, connection still not recovered — attempting ICE restart');
                        this.restartIce();
                    }
                }, 5000);
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
                    // Non-initiator processes offers.  hasProcessedOffer is reset
                    // by restartIce() recovery so a fresh ICE-restart offer goes through.
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
                    } else if (!this.isInitiator && this.hasProcessedOffer) {
                        // A second offer arrived — this is an ICE restart from the initiator.
                        // Process it to recover the connection.
                        console.log('Received ICE-restart offer, reprocessing...');
                        this.pendingCandidates = [];

                        await this.peerConnection.setRemoteDescription(
                            new RTCSessionDescription(message.offer)
                        );

                        await this.processPendingCandidates();

                        const answer = await this.peerConnection.createAnswer();
                        await this.peerConnection.setLocalDescription(answer);
                        await this.signaling.sendAnswer(this.roomId, answer);
                        console.log('ICE-restart answer sent');
                    }
                    break;

                case 'answer':
                    // Initiator processes answers. hasProcessedAnswer is reset
                    // by restartIce() so the answer to an ICE-restart offer goes through.
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
     * Attempt to restart ICE in case of connection failure.
     * Works bilaterally: the initiator sends a new offer, the non-initiator
     * waits for it (the signaling layer's timestamp dedup will let the new offer through).
     * Gives up after maxIceRestartAttempts and fires a 'failed' state.
     */
    async restartIce() {
        if (!this.peerConnection) return;

        this.iceRestartAttempts++;
        if (this.iceRestartAttempts > this.maxIceRestartAttempts) {
            console.error('ICE restart attempts exhausted — connection failed.');
            if (this.onConnectionStateChange) {
                this.onConnectionStateChange('failed');
            }
            return;
        }

        console.log(`ICE restart attempt ${this.iceRestartAttempts}/${this.maxIceRestartAttempts}`);

        if (this.isInitiator) {
            // Initiator: create a fresh offer with iceRestart and reset the answer flag
            // so the incoming answer will be processed.
            try {
                this.hasProcessedAnswer = false;
                const offer = await this.peerConnection.createOffer({ iceRestart: true });
                await this.peerConnection.setLocalDescription(offer);
                await this.signaling.sendOffer(this.roomId, offer);
                console.log('ICE restart offer sent');
            } catch (error) {
                console.error('Error sending ICE restart offer:', error);
            }
        }
        // Non-initiator does nothing here — it will receive the new offer via
        // the signaling listener (timestamp dedup allows it through) and the
        // hasProcessedOffer flag is reset below when a new offer arrives.

        // Safety timeout: if we haven't reconnected in 8 seconds, try again
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
            if (this.peerConnection &&
                this.peerConnection.connectionState !== 'connected') {
                console.warn('Reconnect timeout — retrying ICE restart');
                this.restartIce();
            }
        }, 8000);
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
     * Connect to a peer in a multi-user public room.
     * Each remote peer gets their own RTCPeerConnection to us.
     * @param {string} peerId - The remote peer's session ID
     * @param {boolean} isInitiatorToPeer - true if we should send the offer to this peer
     * @param {string} roomId
     */
    async connectToPeer(peerId, isInitiatorToPeer, roomId) {
        if (this.peers.has(peerId)) {
            console.log(`Already connected to peer ${peerId}`);
            return;
        }

        console.log(`Connecting to peer ${peerId} (initiator: ${isInitiatorToPeer})`);

        const pc = new RTCPeerConnection(this.configuration);
        const peerData = { pc, remoteStream: null, isInitiator: isInitiatorToPeer };
        this.peers.set(peerId, peerData);

        // Add our local tracks to the new peer connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        // ICE candidates — store in a peer-specific subcollection path
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await this.signaling.sendCandidate(roomId + '_peer_' + peerId, event.candidate);
            }
        };

        pc.ontrack = (event) => {
            if (!peerData.remoteStream) {
                peerData.remoteStream = new MediaStream();
            }
            peerData.remoteStream.addTrack(event.track);

            // Render this peer's video
            this.renderPeerVideo(peerId, peerData.remoteStream);
        };

        pc.onconnectionstatechange = () => {
            console.log(`Peer ${peerId} connection state: ${pc.connectionState}`);
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                this.removePeerVideo(peerId);
                this.peers.delete(peerId);
            }
        };

        // Listen for this peer's signaling on the peer-specific channel
        this.signaling.listenForRoom(roomId + '_peer_' + peerId);
        this.signaling.onSignalingMessage(async (message) => {
            await this.handlePeerSignaling(peerId, pc, message);
        });

        if (isInitiatorToPeer) {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);
            await this.signaling.sendOffer(roomId + '_peer_' + peerId, offer);
        }
    }

    /**
     * Handle signaling for a specific peer in a multi-user room
     */
    async handlePeerSignaling(peerId, pc, message) {
        const peerData = this.peers.get(peerId);
        if (!peerData) return;

        try {
            if (message.type === 'offer' && !peerData.isInitiator) {
                await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await this.signaling.sendAnswer(this.roomId + '_peer_' + peerId, answer);
            } else if (message.type === 'answer' && peerData.isInitiator) {
                await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
            } else if (message.type === 'candidate') {
                await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
        } catch (error) {
            console.error(`Error handling peer ${peerId} signaling:`, error);
        }
    }

    /**
     * Render a peer's video stream into the multi-video grid
     */
    renderPeerVideo(peerId, stream) {
        const grid = document.getElementById('remote-videos-grid');
        if (!grid) return;

        let wrapper = document.getElementById('remote-video-wrapper-' + peerId);
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'remote-video-wrapper';
            wrapper.id = 'remote-video-wrapper-' + peerId;

            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.id = 'remote-video-' + peerId;

            const label = document.createElement('div');
            label.className = 'remote-user-label';
            label.innerHTML = `<span>${peerId.substring(0, 12)}...</span>`;

            wrapper.appendChild(video);
            wrapper.appendChild(label);
            grid.appendChild(wrapper);
        }

        const video = document.getElementById('remote-video-' + peerId);
        if (video) video.srcObject = stream;
    }

    /**
     * Remove a peer's video element from the grid
     */
    removePeerVideo(peerId) {
        const wrapper = document.getElementById('remote-video-wrapper-' + peerId);
        if (wrapper) wrapper.remove();
    }

    /**
     * Disconnect from a specific peer
     */
    disconnectPeer(peerId) {
        const peerData = this.peers.get(peerId);
        if (peerData) {
            peerData.pc.close();
            this.removePeerVideo(peerId);
            this.peers.delete(peerId);
        }
    }

    /**
     * Close the peer connection and clean up
     */
    close() {
        console.log('Closing WebRTC connection');

        // Clear reconnect timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        // Clear disconnection grace timeout
        if (this.disconnectGraceTimeout) {
            clearTimeout(this.disconnectGraceTimeout);
            this.disconnectGraceTimeout = null;
        }

        // Stop all local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
                console.log(`Stopped ${track.kind} track`);
            });
            this.localStream = null;
        }

        // Close all multi-peer connections
        this.peers.forEach((peerData, peerId) => {
            peerData.pc.close();
            this.removePeerVideo(peerId);
        });
        this.peers.clear();

        // Close primary peer connection
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
        this.iceRestartAttempts = 0;

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
