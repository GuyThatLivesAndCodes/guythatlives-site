/**
 * G-Chat Server Manager
 * Handles server CRUD operations and membership
 */

class ServerManager {
    constructor(app) {
        this.app = app;
        this.servers = new Map();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Create server button
        document.getElementById('create-server-btn').addEventListener('click', () => {
            this.showCreateServerModal();
        });

        // Create server form
        document.getElementById('create-server-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateServer();
        });

        document.getElementById('cancel-server-btn').addEventListener('click', () => {
            this.hideCreateServerModal();
        });
    }

    async loadUserServers() {
        try {
            const userId = this.app.currentUser.userId;

            // Query servers where user is a member
            const snapshot = await this.app.db.collection('gchat')
                .doc('servers')
                .collection('list')
                .where('members', 'array-contains', userId)
                .get();

            this.servers.clear();

            snapshot.forEach(doc => {
                this.servers.set(doc.id, { id: doc.id, ...doc.data() });
            });

            this.renderServerList();

        } catch (error) {
            console.error('Error loading servers:', error);
        }
    }

    renderServerList() {
        const container = document.getElementById('server-list-container');
        container.innerHTML = '';

        this.servers.forEach((server, serverId) => {
            const serverIcon = document.createElement('button');
            serverIcon.className = 'server-icon';
            serverIcon.dataset.serverId = serverId;
            serverIcon.title = server.name;

            if (server.iconUrl) {
                const img = document.createElement('img');
                img.src = server.iconUrl;
                img.alt = server.name;
                serverIcon.appendChild(img);
            } else {
                // Use first letter of server name
                serverIcon.textContent = server.name.charAt(0).toUpperCase();
            }

            serverIcon.addEventListener('click', () => {
                this.selectServer(serverId);
            });

            container.appendChild(serverIcon);
        });
    }

    async selectServer(serverId) {
        const server = this.servers.get(serverId);
        if (!server) return;

        this.app.currentServer = server;

        // Update UI
        document.querySelectorAll('.server-icon').forEach(el => {
            el.classList.remove('active');
        });
        document.querySelector(`[data-server-id="${serverId}"]`)?.classList.add('active');

        document.getElementById('current-server-name').textContent = server.name;

        // Load channels for this server
        await this.app.channelManager.loadChannels(serverId);
    }

    showCreateServerModal() {
        document.getElementById('create-server-modal').classList.add('active');
    }

    hideCreateServerModal() {
        document.getElementById('create-server-modal').classList.remove('active');
        document.getElementById('create-server-form').reset();
    }

    async handleCreateServer() {
        const name = document.getElementById('server-name').value.trim();
        const description = document.getElementById('server-description').value.trim();
        const iconFile = document.getElementById('server-icon').files[0];

        if (!name) {
            alert('Please enter a server name');
            return;
        }

        try {
            let iconUrl = null;

            // Upload icon if provided
            if (iconFile) {
                iconUrl = await this.uploadServerIcon(iconFile);
            }

            // Create server document
            const serverRef = await this.app.db.collection('gchat')
                .doc('servers')
                .collection('list')
                .add({
                    name,
                    description,
                    iconUrl,
                    ownerId: this.app.currentUser.userId,
                    members: [this.app.currentUser.userId],
                    featured: false,
                    featuredExpiration: null,
                    featuredType: null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Create default channels
            const channelsRef = serverRef.collection('channels');

            await channelsRef.add({
                name: 'general',
                type: 'text',
                position: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await channelsRef.add({
                name: 'voice-1',
                type: 'voice',
                position: 1,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Reload servers
            await this.loadUserServers();

            this.hideCreateServerModal();

        } catch (error) {
            console.error('Error creating server:', error);
            alert('Failed to create server. Please try again.');
        }
    }

    async uploadServerIcon(file) {
        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            throw new Error('Icon must be less than 2MB');
        }

        const timestamp = Date.now();
        const filename = `${this.app.currentUser.userId}_${timestamp}`;
        const storageRef = this.app.storage.ref(`gchat/server-icons/${filename}`);

        await storageRef.put(file);
        const url = await storageRef.getDownloadURL();

        return url;
    }
}
