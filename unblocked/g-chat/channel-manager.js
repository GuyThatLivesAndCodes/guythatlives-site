/**
 * G-Chat Channel Manager
 * Handles channel management and messaging
 */

class ChannelManager {
    constructor(app) {
        this.app = app;
        this.channels = new Map();
        this.messageListeners = new Map();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Send message
        document.getElementById('send-message-btn').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Create channel
        document.getElementById('create-channel-btn')?.addEventListener('click', () => {
            this.showCreateChannelModal();
        });

        document.getElementById('cancel-channel-btn')?.addEventListener('click', () => {
            this.app.uiController.hideModal('create-channel-modal');
        });

        document.getElementById('create-channel-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createChannel();
        });
    }

    showCreateChannelModal() {
        if (!this.app.currentServer) {
            alert('Please select a server first');
            return;
        }
        this.app.uiController.showModal('create-channel-modal');
    }

    async createChannel() {
        const type = document.getElementById('channel-type').value;
        const name = document.getElementById('channel-name').value.trim().toLowerCase().replace(/\s+/g, '-');

        if (!name) {
            alert('Please enter a channel name');
            return;
        }

        try {
            const channelsRef = this.app.db.collection('gchat')
                .doc('servers')
                .collection('list')
                .doc(this.app.currentServer.id)
                .collection('channels');

            // Get current max position
            const snapshot = await channelsRef.get();
            const maxPosition = snapshot.docs.reduce((max, doc) => {
                const pos = doc.data().position || 0;
                return pos > max ? pos : max;
            }, 0);

            await channelsRef.add({
                name,
                type,
                position: maxPosition + 1,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Reload channels
            await this.loadChannels(this.app.currentServer.id);

            this.app.uiController.hideModal('create-channel-modal');

        } catch (error) {
            console.error('Error creating channel:', error);
            alert('Failed to create channel');
        }
    }

    async loadChannels(serverId) {
        try {
            const snapshot = await this.app.db.collection('gchat')
                .doc('servers')
                .collection('list')
                .doc(serverId)
                .collection('channels')
                .orderBy('position')
                .get();

            this.channels.clear();

            snapshot.forEach(doc => {
                this.channels.set(doc.id, { id: doc.id, ...doc.data() });
            });

            this.renderChannelList();

        } catch (error) {
            console.error('Error loading channels:', error);
        }
    }

    renderChannelList() {
        const container = document.getElementById('channel-list-container');
        container.innerHTML = '';

        const textChannels = [];
        const voiceChannels = [];

        this.channels.forEach(channel => {
            if (channel.type === 'text') {
                textChannels.push(channel);
            } else {
                voiceChannels.push(channel);
            }
        });

        // Render text channels
        if (textChannels.length > 0) {
            const textCategory = document.createElement('div');
            textCategory.className = 'channel-category';
            textCategory.innerHTML = '<div class="channel-category-header">TEXT CHANNELS</div>';

            textChannels.forEach(channel => {
                const channelItem = this.createChannelItem(channel, '#');
                textCategory.appendChild(channelItem);
            });

            container.appendChild(textCategory);
        }

        // Render voice channels
        if (voiceChannels.length > 0) {
            const voiceCategory = document.createElement('div');
            voiceCategory.className = 'channel-category';
            voiceCategory.innerHTML = '<div class="channel-category-header">VOICE CHANNELS</div>';

            voiceChannels.forEach(channel => {
                const channelItem = this.createChannelItem(channel, '🔊');
                voiceCategory.appendChild(channelItem);
            });

            container.appendChild(voiceCategory);
        }
    }

    createChannelItem(channel, icon) {
        const item = document.createElement('div');
        item.className = 'channel-item';
        if (channel.type === 'voice') {
            item.classList.add('voice-channel');
        }
        item.dataset.channelId = channel.id;

        item.innerHTML = `
            <span class="channel-icon">${icon}</span>
            <span>${channel.name}</span>
        `;

        item.addEventListener('click', () => {
            this.selectChannel(channel);
        });

        return item;
    }

    async selectChannel(channel) {
        if (channel.type === 'voice') {
            // Voice channels: join immediately, don't change main view
            await this.app.voiceManager.joinVoiceChannel(channel);
            return;
        }

        // Text channels: switch the main chat view
        this.app.currentChannel = channel;

        // Update UI - only highlight text channels
        document.querySelectorAll('.channel-item').forEach(el => {
            if (!el.classList.contains('voice-channel')) {
                el.classList.remove('active');
            }
        });
        document.querySelector(`[data-channel-id="${channel.id}"]`)?.classList.add('active');

        document.getElementById('current-channel-name').textContent = '#' + channel.name;

        // Enable message input
        document.getElementById('message-input').disabled = false;
        document.getElementById('send-message-btn').disabled = false;

        // Load messages
        await this.loadMessages(channel.id);
    }

    async loadMessages(channelId) {
        try {
            // Unsubscribe from previous listener
            if (this.messageListeners.has(channelId)) {
                this.messageListeners.get(channelId)();
            }

            const messagesRef = this.app.db.collection('gchat')
                .doc('servers')
                .collection('list')
                .doc(this.app.currentServer.id)
                .collection('channels')
                .doc(channelId)
                .collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(100);

            const unsubscribe = messagesRef.onSnapshot(snapshot => {
                const messages = [];
                snapshot.forEach(doc => {
                    messages.push({ id: doc.id, ...doc.data() });
                });

                // Reverse to show oldest first
                messages.reverse();
                this.renderMessages(messages);
            });

            this.messageListeners.set(channelId, unsubscribe);

        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        container.innerHTML = '';

        messages.forEach(msg => {
            const messageEl = document.createElement('div');
            messageEl.className = 'message';

            const timestamp = msg.timestamp?.toDate?.() || new Date();
            const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Create avatar element
            const avatarContainer = document.createElement('div');
            avatarContainer.className = 'message-avatar-container';

            if (msg.senderAvatar) {
                avatarContainer.innerHTML = `<img src="${msg.senderAvatar}" class="message-avatar" alt="">`;
            } else {
                const initials = msg.senderName.substring(0, 2).toUpperCase();
                const color = this.app.getColorFromString(msg.senderName);
                avatarContainer.innerHTML = `<div class="message-avatar avatar-initials" style="background-color: ${color}">${initials}</div>`;
            }

            const contentEl = document.createElement('div');
            contentEl.className = 'message-content';
            contentEl.innerHTML = `
                <div class="message-header">
                    <span class="message-author">${this.escapeHtml(msg.senderName)}</span>
                    <span class="message-timestamp">${timeStr}</span>
                </div>
                <div class="message-text">${this.escapeHtml(msg.content)}</div>
            `;

            messageEl.appendChild(avatarContainer);
            messageEl.appendChild(contentEl);
            container.appendChild(messageEl);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const content = input.value.trim();

        if (!content || !this.app.currentChannel || !this.app.currentServer) {
            return;
        }

        try {
            await this.app.db.collection('gchat')
                .doc('servers')
                .collection('list')
                .doc(this.app.currentServer.id)
                .collection('channels')
                .doc(this.app.currentChannel.id)
                .collection('messages')
                .add({
                    senderId: this.app.currentUser.userId,
                    senderName: this.app.currentUser.username,
                    senderAvatar: this.app.currentUser.profile?.avatarUrl || '',
                    content,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

            input.value = '';

        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
