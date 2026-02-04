/**
 * G-Chat Voice Manager
 * Handles WebRTC voice channels (adapted from Ome-Chat)
 */

class VoiceManager {
    constructor(app) {
        this.app = app;
        this.peerConnections = new Map();
        this.localStream = null;
        this.currentVoiceSession = null;
        this.isMuted = false;
        this.isDeafened = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('voice-disconnect-btn')?.addEventListener('click', () => {
            this.leaveVoiceChannel();
        });

        document.getElementById('mute-btn')?.addEventListener('click', () => {
            this.toggleMute();
        });

        document.getElementById('deafen-btn')?.addEventListener('click', () => {
            this.toggleDeafen();
        });
    }

    async joinVoiceChannel(channel) {
        if (!channel || channel.type !== 'voice') {
            return;
        }

        // Leave current voice if in one
        if (this.currentVoiceSession) {
            await this.leaveVoiceChannel();
        }

        this.currentVoiceChannel = channel;

        try {
            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });

            // Create or join voice session
            const sessionRef = this.app.db.collection('gchat')
                .doc('voice-sessions')
                .collection('active')
                .doc(`${this.app.currentServer.id}_${this.app.currentChannel.id}`);

            const sessionDoc = await sessionRef.get();

            if (sessionDoc.exists) {
                // Join existing session
                await this.joinExistingSession(sessionRef, sessionDoc.data());
            } else {
                // Create new session
                await this.createNewSession(sessionRef);
            }

            // Show voice panel
            const voicePanel = document.getElementById('voice-panel');
            voicePanel.classList.remove('hidden');
            document.getElementById('voice-channel-name').textContent = '🔊 ' + channel.name;

            // Highlight voice channel in sidebar
            document.querySelectorAll('.voice-channel').forEach(el => el.classList.remove('voice-active'));
            document.querySelector(`[data-channel-id="${channel.id}"]`)?.classList.add('voice-active');

        } catch (error) {
            console.error('Error joining voice channel:', error);
            alert('Failed to access microphone. Please check permissions.');
        }
    }

    async createNewSession(sessionRef) {
        await sessionRef.set({
            serverId: this.app.currentServer.id,
            channelId: this.app.currentChannel.id,
            participants: [this.app.currentUser.userId],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        this.currentVoiceSession = sessionRef.id;

        // Listen for new participants
        this.listenForParticipants(sessionRef);
    }

    async joinExistingSession(sessionRef, sessionData) {
        // Add self to participants
        await sessionRef.update({
            participants: firebase.firestore.FieldValue.arrayUnion(this.app.currentUser.userId)
        });

        this.currentVoiceSession = sessionRef.id;

        // Connect to existing participants
        for (const participantId of sessionData.participants) {
            if (participantId !== this.app.currentUser.userId) {
                await this.createPeerConnection(participantId, true);
            }
        }

        // Listen for new participants
        this.listenForParticipants(sessionRef);
    }

    listenForParticipants(sessionRef) {
        this.participantListener = sessionRef.onSnapshot(async snapshot => {
            const data = snapshot.data();
            if (!data) return;

            // Update UI
            this.renderParticipants(data.participants);

            // Connect to new participants
            for (const participantId of data.participants) {
                if (participantId !== this.app.currentUser.userId &&
                    !this.peerConnections.has(participantId)) {
                    await this.createPeerConnection(participantId, false);
                }
            }
        });
    }

    async createPeerConnection(remoteUserId, isInitiator) {
        const config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        const pc = new RTCPeerConnection(config);

        // Add local stream
        this.localStream.getTracks().forEach(track => {
            pc.addTrack(track, this.localStream);
        });

        // Handle remote stream
        pc.ontrack = (event) => {
            this.handleRemoteStream(remoteUserId, event.streams[0]);
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal(remoteUserId, {
                    type: 'ice-candidate',
                    candidate: event.candidate
                });
            }
        };

        this.peerConnections.set(remoteUserId, pc);

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            this.sendSignal(remoteUserId, {
                type: 'offer',
                sdp: offer.sdp
            });
        }

        // Listen for signals from this peer
        this.listenForSignals(remoteUserId, pc);
    }

    async sendSignal(targetUserId, signal) {
        await this.app.db.collection('gchat')
            .doc('voice-sessions')
            .collection('active')
            .doc(this.currentVoiceSession)
            .collection('signaling')
            .add({
                from: this.app.currentUser.userId,
                to: targetUserId,
                signal,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
    }

    listenForSignals(remoteUserId, pc) {
        this.app.db.collection('gchat')
            .doc('voice-sessions')
            .collection('active')
            .doc(this.currentVoiceSession)
            .collection('signaling')
            .where('to', '==', this.app.currentUser.userId)
            .where('from', '==', remoteUserId)
            .onSnapshot(async snapshot => {
                for (const change of snapshot.docChanges()) {
                    if (change.type === 'added') {
                        const { signal } = change.doc.data();

                        if (signal.type === 'offer') {
                            await pc.setRemoteDescription(new RTCSessionDescription({
                                type: 'offer',
                                sdp: signal.sdp
                            }));

                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);

                            this.sendSignal(remoteUserId, {
                                type: 'answer',
                                sdp: answer.sdp
                            });

                        } else if (signal.type === 'answer') {
                            await pc.setRemoteDescription(new RTCSessionDescription({
                                type: 'answer',
                                sdp: signal.sdp
                            }));

                        } else if (signal.type === 'ice-candidate') {
                            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                        }

                        // Delete processed signal
                        await change.doc.ref.delete();
                    }
                }
            });
    }

    handleRemoteStream(userId, stream) {
        // Create audio element for remote stream
        const audio = document.createElement('audio');
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.id = `audio-${userId}`;

        if (this.isDeafened) {
            audio.muted = true;
        }

        document.body.appendChild(audio);
    }

    renderParticipants(participantIds) {
        const container = document.getElementById('voice-participants');
        container.innerHTML = '';

        participantIds.forEach(userId => {
            const participant = document.createElement('div');
            participant.className = 'voice-participant';

            // TODO: Fetch user profile for avatar and name
            participant.innerHTML = `
                <img src="" alt="User">
                <span>${userId === this.app.currentUser.userId ? 'You' : 'User'}</span>
            `;

            container.appendChild(participant);
        });
    }

    async leaveVoiceChannel() {
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Close all peer connections
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();

        // Remove from session
        if (this.currentVoiceSession) {
            const sessionRef = this.app.db.collection('gchat')
                .doc('voice-sessions')
                .collection('active')
                .doc(this.currentVoiceSession);

            await sessionRef.update({
                participants: firebase.firestore.FieldValue.arrayRemove(this.app.currentUser.userId)
            });

            // Unsubscribe from listener
            if (this.participantListener) {
                this.participantListener();
            }

            this.currentVoiceSession = null;
        }

        // Remove remote audio elements
        document.querySelectorAll('audio[id^="audio-"]').forEach(el => el.remove());

        // Hide voice panel
        document.getElementById('voice-panel').classList.add('hidden');

        // Remove voice-active class from all voice channels
        document.querySelectorAll('.voice-channel').forEach(el => el.classList.remove('voice-active'));

        this.currentVoiceChannel = null;
    }

    toggleMute() {
        this.isMuted = !this.isMuted;

        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !this.isMuted;
            });
        }

        const btn = document.getElementById('mute-btn');
        btn.textContent = this.isMuted ? '🎤❌' : '🎤';
    }

    toggleDeafen() {
        this.isDeafened = !this.isDeafened;

        // Mute all remote audio elements
        document.querySelectorAll('audio[id^="audio-"]').forEach(audio => {
            audio.muted = this.isDeafened;
        });

        // Also mute self when deafened
        if (this.isDeafened && !this.isMuted) {
            this.toggleMute();
        }

        const btn = document.getElementById('deafen-btn');
        btn.textContent = this.isDeafened ? '🔇❌' : '🔇';
    }
}
