/**
 * TheChat - Discord-style chat application
 * Complete rewrite with DMs, profiles, and proper server loading
 */

// ============================================
// State Management
// ============================================
let currentUser = null;
let currentView = 'dm'; // 'dm' or 'server'
let currentServerId = null;
let currentChannelId = null;
let currentDmUserId = null;
let messagesListener = null;
let serversListener = null;
let contextMenuMessageId = null;
let editingMessageId = null;
let viewingProfileUserId = null;

// Tenor API Key
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRUduvRY';

// ============================================
// Authentication Check & Initialization
// ============================================

window.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for Firebase to initialize
        await new Promise(resolve => {
            const checkAuth = setInterval(() => {
                if (window.gamesAuth && window.gamesAuth.initialized) {
                    clearInterval(checkAuth);
                    resolve();
                }
            }, 100);
        });

        // Check if user is authenticated
        window.gamesAuth.onAuthStateChanged(async (user) => {
            if (!user) {
                // Not authenticated - redirect to login
                window.location.href = '/unblocked/';
                return;
            }

            // User is authenticated
            currentUser = {
                uid: user.uid,
                username: user.displayName || user.email.split('@')[0],
                email: user.email
            };

            // Initialize app
            await initializeApp();
        });

    } catch (error) {
        console.error('Error checking authentication:', error);
        window.location.href = '/unblocked/';
    }
});

// ============================================
// App Initialization
// ============================================

async function initializeApp() {
    try {
        // Initialize user profile if doesn't exist
        await initializeUserProfile();

        // Update user display
        await updateUserDisplay();

        // Load servers
        await loadServers();

        // Load DM view by default
        await loadDMView();

        // Hide loading screen and show app
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');

        // Set up event listeners
        setupEventListeners();

        console.log('TheChat initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Failed to initialize chat. Please refresh the page.');
    }
}

// ============================================
// User Profile Management
// ============================================

async function initializeUserProfile() {
    const profileRef = firebase.database().ref(`users/${currentUser.uid}`);
    const snapshot = await profileRef.once('value');

    if (!snapshot.exists()) {
        // Create default profile
        await profileRef.set({
            username: currentUser.username,
            bio: '',
            status: 'online',
            avatarUrl: '',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            friends: {},
            blocked: {},
            friendRequests: {}
        });
    }

    // Load profile data
    const profile = snapshot.val() || await profileRef.once('value').then(s => s.val());
    currentUser = { ...currentUser, ...profile };
}

async function updateUserDisplay() {
    const avatarText = document.getElementById('user-avatar-text');
    const displayName = document.getElementById('user-display-name');
    const statusIndicator = document.getElementById('user-status-indicator');
    const customStatus = document.getElementById('user-custom-status');

    avatarText.textContent = currentUser.username.charAt(0).toUpperCase();
    displayName.textContent = currentUser.username;

    // Update status indicator
    statusIndicator.className = `absolute bottom-0 right-0 status-indicator status-${currentUser.status || 'online'}`;

    // Show bio or default text
    customStatus.textContent = currentUser.bio || 'Click to edit profile';
}

function showOwnProfile() {
    viewingProfileUserId = currentUser.uid;
    showUserProfile(currentUser.uid);
}

async function showUserProfile(userId) {
    viewingProfileUserId = userId;
    const profileRef = firebase.database().ref(`users/${userId}`);
    const snapshot = await profileRef.once('value');
    const profile = snapshot.val();

    if (!profile) {
        alert('User not found');
        return;
    }

    // Update profile modal
    document.getElementById('profile-avatar-text').textContent = profile.username.charAt(0).toUpperCase();
    document.getElementById('profile-username').textContent = profile.username;
    document.getElementById('profile-bio').textContent = profile.bio || 'No bio set';
    document.getElementById('profile-status-text').textContent = profile.status ? profile.status.charAt(0).toUpperCase() + profile.status.slice(1) : 'Online';

    const statusIndicator = document.getElementById('profile-status-indicator');
    statusIndicator.className = `absolute bottom-1 right-1 w-6 h-6 status-indicator status-${profile.status || 'online'}`;

    const actionsDiv = document.getElementById('profile-actions');
    const editBtn = document.getElementById('edit-profile-btn');

    if (userId === currentUser.uid) {
        // Own profile - show edit button
        actionsDiv.innerHTML = '';
        editBtn.classList.remove('hidden');
    } else {
        // Other user - show action buttons
        editBtn.classList.add('hidden');

        const isFriend = currentUser.friends && currentUser.friends[userId];
        const isBlocked = currentUser.blocked && currentUser.blocked[userId];
        const hasPendingRequest = currentUser.friendRequests && currentUser.friendRequests[userId];

        actionsDiv.innerHTML = `
            ${!isFriend && !hasPendingRequest ? `<button onclick="sendFriendRequest('${userId}')" class="w-full bg-discord-blurple hover:bg-opacity-80 text-white font-semibold py-2 px-4 rounded">Add Friend</button>` : ''}
            ${isFriend ? `<button onclick="removeFriend('${userId}')" class="w-full bg-discord-red hover:bg-opacity-80 text-white font-semibold py-2 px-4 rounded">Remove Friend</button>` : ''}
            ${hasPendingRequest ? `<div class="text-discord-lightgray text-sm text-center py-2">Friend request pending</div>` : ''}
            <button onclick="startDM('${userId}')" class="w-full bg-discord-gray hover:bg-discord-dark text-white font-semibold py-2 px-4 rounded">Send Message</button>
            ${!isBlocked ? `<button onclick="blockUser('${userId}')" class="w-full bg-discord-red hover:bg-opacity-80 text-white font-semibold py-2 px-4 rounded">Block User</button>` : ''}
            ${isBlocked ? `<button onclick="unblockUser('${userId}')" class="w-full bg-discord-gray hover:bg-discord-dark text-white font-semibold py-2 px-4 rounded">Unblock User</button>` : ''}
        `;
    }

    // Show modal
    document.getElementById('profile-modal').classList.remove('hidden');
    document.getElementById('profile-modal').classList.add('flex');
}

function closeProfileModal() {
    document.getElementById('profile-modal').classList.add('hidden');
    document.getElementById('profile-modal').classList.remove('flex');
    viewingProfileUserId = null;
}

function showEditProfileModal() {
    closeProfileModal();

    // Populate edit form
    document.getElementById('edit-username').value = currentUser.username || '';
    document.getElementById('edit-bio').value = currentUser.bio || '';
    document.getElementById('edit-status').value = currentUser.status || 'online';
    document.getElementById('edit-avatar').value = currentUser.avatarUrl || '';

    // Show modal
    document.getElementById('edit-profile-modal').classList.remove('hidden');
    document.getElementById('edit-profile-modal').classList.add('flex');
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').classList.add('hidden');
    document.getElementById('edit-profile-modal').classList.remove('flex');
}

async function saveProfile() {
    const username = document.getElementById('edit-username').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    const status = document.getElementById('edit-status').value;
    const avatarUrl = document.getElementById('edit-avatar').value.trim();

    if (!username) {
        alert('Username cannot be empty');
        return;
    }

    try {
        const updates = {
            username,
            bio,
            status,
            avatarUrl
        };

        await firebase.database().ref(`users/${currentUser.uid}`).update(updates);

        // Update current user
        currentUser = { ...currentUser, ...updates };
        await updateUserDisplay();

        closeEditProfileModal();
        alert('Profile updated successfully!');
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile: ' + error.message);
    }
}

// ============================================
// Friend System
// ============================================

async function sendFriendRequest(userId) {
    try {
        await firebase.database().ref(`users/${userId}/friendRequests/${currentUser.uid}`).set({
            username: currentUser.username,
            sentAt: firebase.database.ServerValue.TIMESTAMP
        });

        alert('Friend request sent!');
        closeProfileModal();
    } catch (error) {
        console.error('Error sending friend request:', error);
        alert('Failed to send friend request');
    }
}

async function removeFriend(userId) {
    if (!confirm('Remove this friend?')) return;

    try {
        await firebase.database().ref(`users/${currentUser.uid}/friends/${userId}`).remove();
        await firebase.database().ref(`users/${userId}/friends/${currentUser.uid}`).remove();

        alert('Friend removed');
        closeProfileModal();
    } catch (error) {
        console.error('Error removing friend:', error);
        alert('Failed to remove friend');
    }
}

async function blockUser(userId) {
    if (!confirm('Block this user?')) return;

    try {
        await firebase.database().ref(`users/${currentUser.uid}/blocked/${userId}`).set(true);
        alert('User blocked');
        closeProfileModal();
    } catch (error) {
        console.error('Error blocking user:', error);
        alert('Failed to block user');
    }
}

async function unblockUser(userId) {
    try {
        await firebase.database().ref(`users/${currentUser.uid}/blocked/${userId}`).remove();
        alert('User unblocked');
        closeProfileModal();
    } catch (error) {
        console.error('Error unblocking user:', error);
        alert('Failed to unblock user');
    }
}

async function startDM(userId) {
    closeProfileModal();
    loadDMView();

    // Switch to DM with this user
    currentDmUserId = userId;
    await loadDMChat(userId);
}

// ============================================
// DM View
// ============================================

async function loadDMView() {
    currentView = 'dm';
    currentServerId = null;
    currentChannelId = null;

    // Update header
    document.getElementById('server-name').textContent = 'Direct Messages';
    document.getElementById('server-menu-btn').style.display = 'none';

    // Update sidebar icon
    document.getElementById('channel-icon').innerHTML = '<path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>';

    // Set active server icon
    document.querySelectorAll('.server-icon').forEach(btn => btn.classList.remove('active'));
    document.getElementById('dm-home-btn').classList.add('active');

    // Load DMs
    await loadDMList();

    // Hide members sidebar
    document.getElementById('members-sidebar').classList.add('hidden');
}

async function loadDMList() {
    const sidebar = document.getElementById('sidebar-content');

    // Show friends and DMs
    sidebar.innerHTML = `
        <div class="mb-3">
            <button onclick="showAllFriends()" class="w-full text-left px-2 py-2 rounded hover:bg-discord-dark text-white flex items-center dm-item">
                <svg class="w-5 h-5 mr-3 text-discord-green" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
                <span class="font-semibold">Friends</span>
            </button>
        </div>
        <div class="text-xs font-semibold text-discord-lightgray uppercase px-2 mb-2">Direct Messages</div>
        <div id="dm-list" class="space-y-1">
            <p class="text-discord-lightgray text-sm px-2 py-4 text-center">No direct messages yet</p>
        </div>
    `;

    // Load actual DMs
    loadRecentDMs();
}

async function loadRecentDMs() {
    // This would load recent DM conversations
    // For now, just a placeholder
    const dmList = document.getElementById('dm-list');

    if (currentUser.friends) {
        const friends = Object.keys(currentUser.friends);

        if (friends.length > 0) {
            const friendsHtml = await Promise.all(friends.slice(0, 10).map(async (friendId) => {
                const friendRef = await firebase.database().ref(`users/${friendId}`).once('value');
                const friend = friendRef.val();

                if (!friend) return '';

                return `
                    <button onclick="loadDMChat('${friendId}')" class="w-full text-left px-2 py-2 rounded hover:bg-discord-dark flex items-center dm-item" data-dm="${friendId}">
                        <div class="relative mr-3">
                            <div class="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center">
                                <span class="text-sm font-semibold">${friend.username.charAt(0).toUpperCase()}</span>
                            </div>
                            <div class="absolute bottom-0 right-0 status-indicator status-${friend.status || 'online'}"></div>
                        </div>
                        <span class="text-white">${friend.username}</span>
                    </button>
                `;
            }));

            dmList.innerHTML = friendsHtml.join('');
        }
    }
}

async function loadDMChat(userId) {
    currentDmUserId = userId;

    // Get user info
    const userRef = await firebase.database().ref(`users/${userId}`).once('value');
    const user = userRef.val();

    if (!user) {
        alert('User not found');
        return;
    }

    // Update channel name
    document.getElementById('channel-name').textContent = user.username;

    // Highlight active DM
    document.querySelectorAll('.dm-item').forEach(item => item.classList.remove('active'));
    const activeDm = document.querySelector(`[data-dm="${userId}"]`);
    if (activeDm) activeDm.classList.add('active');

    // Load messages
    loadDMMessages(userId);
}

async function loadDMMessages(userId) {
    // Remove existing listener
    if (messagesListener) {
        messagesListener.off();
    }

    // Clear messages
    const container = document.getElementById('messages-container');
    container.innerHTML = `
        <div class="text-center text-discord-lightgray py-8">
            <div class="text-4xl mb-2">💬</div>
            <h3 class="text-xl font-bold mb-2">Start chatting!</h3>
            <p class="text-sm">This is the beginning of your DM history.</p>
        </div>
    `;

    // Create DM room ID (consistent ordering)
    const roomId = [currentUser.uid, userId].sort().join('_');

    // Set up real-time listener
    const messagesRef = firebase.database().ref(`dms/${roomId}/messages`);
    messagesListener = messagesRef.orderByChild('timestamp').limitToLast(100);

    messagesListener.on('child_added', (snapshot) => {
        const message = snapshot.val();
        message.id = snapshot.key;
        addMessageToUI(message);
    });

    messagesListener.on('child_changed', (snapshot) => {
        const message = snapshot.val();
        message.id = snapshot.key;
        updateMessageInUI(message);
    });

    messagesListener.on('child_removed', (snapshot) => {
        removeMessageFromUI(snapshot.key);
    });
}

function showAllFriends() {
    alert('Friends list coming soon!');
}

// ============================================
// Server Management
// ============================================

async function loadServers() {
    // Listen for servers
    if (serversListener) {
        serversListener.off();
    }

    const serverList = document.getElementById('server-list');

    // Get user's servers
    const userServersRef = firebase.database().ref(`users/${currentUser.uid}/servers`);

    serversListener = userServersRef.on('value', async (snapshot) => {
        const servers = snapshot.val() || {};
        const serverIds = Object.keys(servers);

        if (serverIds.length === 0) {
            serverList.innerHTML = '';
            return;
        }

        // Load server details
        const serverElements = await Promise.all(serverIds.map(async (serverId) => {
            const serverRef = await firebase.database().ref(`servers/${serverId}`).once('value');
            const server = serverRef.val();

            if (!server) return '';

            const icon = server.icon || server.name.substring(0, 2).toUpperCase();

            return `
                <button
                    class="server-icon w-12 h-12 bg-discord-dark rounded-full flex items-center justify-center transition-all duration-200 tooltip"
                    data-tooltip="${escapeHtml(server.name)}"
                    data-server-id="${serverId}"
                    onclick="loadServer('${serverId}')"
                >
                    <span class="text-sm font-bold">${icon}</span>
                </button>
            `;
        }));

        serverList.innerHTML = serverElements.join('');
    });
}

async function loadServer(serverId) {
    currentView = 'server';
    currentServerId = serverId;
    currentDmUserId = null;

    // Get server data
    const serverRef = await firebase.database().ref(`servers/${serverId}`).once('value');
    const server = serverRef.val();

    if (!server) {
        alert('Server not found');
        return;
    }

    // Update header
    document.getElementById('server-name').textContent = server.name;
    document.getElementById('server-menu-btn').style.display = 'block';

    // Update channel icon
    document.getElementById('channel-icon').innerHTML = '<path fill-rule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z" clip-rule="evenodd"/>';

    // Set active server icon
    document.querySelectorAll('.server-icon').forEach(btn => btn.classList.remove('active'));
    const activeServer = document.querySelector(`[data-server-id="${serverId}"]`);
    if (activeServer) activeServer.classList.add('active');

    // Load channels
    await loadChannels(serverId);

    // Show members sidebar
    document.getElementById('members-sidebar').classList.remove('hidden');
    document.getElementById('members-sidebar').classList.add('flex');

    // Load members
    loadServerMembers(serverId);
}

async function loadChannels(serverId) {
    const sidebar = document.getElementById('sidebar-content');

    const serverRef = await firebase.database().ref(`servers/${serverId}/channels`).once('value');
    const channels = serverRef.val() || { general: { name: 'general' } };

    const channelList = Object.keys(channels).map(channelId => {
        const channel = channels[channelId];
        return `
            <button
                onclick="switchChannel('${channelId}')"
                class="w-full text-left px-2 py-1.5 rounded hover:bg-discord-dark text-discord-lightgray hover:text-white flex items-center channel-btn"
                data-channel="${channelId}"
            >
                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z" clip-rule="evenodd"/>
                </svg>
                <span>${channel.name}</span>
            </button>
        `;
    }).join('');

    sidebar.innerHTML = `
        <div class="mb-2">
            <div class="flex items-center px-2 py-1 text-xs font-semibold text-discord-lightgray uppercase">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
                Text Channels
            </div>
            <div class="space-y-0.5">
                ${channelList}
            </div>
        </div>
    `;

    // Load first channel
    switchChannel(Object.keys(channels)[0]);
}

function switchChannel(channelId) {
    currentChannelId = channelId;
    document.getElementById('channel-name').textContent = channelId;
    document.getElementById('message-input').placeholder = `Message #${channelId}`;

    // Update channel highlighting
    document.querySelectorAll('.channel-btn').forEach(btn => {
        btn.classList.remove('bg-discord-dark', 'text-white');
        btn.classList.add('text-discord-lightgray');
    });

    const activeBtn = document.querySelector(`[data-channel="${channelId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('bg-discord-dark', 'text-white');
        activeBtn.classList.remove('text-discord-lightgray');
    }

    // Load messages
    loadServerMessages();
}

async function loadServerMessages() {
    // Remove existing listener
    if (messagesListener) {
        messagesListener.off();
    }

    // Clear messages
    const container = document.getElementById('messages-container');
    container.innerHTML = `
        <div class="text-center text-discord-lightgray py-8">
            <div class="text-4xl mb-2">💬</div>
            <h3 class="text-xl font-bold mb-2">Welcome to #${currentChannelId}!</h3>
            <p class="text-sm">This is the beginning of the #${currentChannelId} channel.</p>
        </div>
    `;

    // Set up real-time listener
    const messagesRef = firebase.database().ref(`servers/${currentServerId}/channels/${currentChannelId}/messages`);
    messagesListener = messagesRef.orderByChild('timestamp').limitToLast(100);

    messagesListener.on('child_added', (snapshot) => {
        const message = snapshot.val();
        message.id = snapshot.key;
        addMessageToUI(message);
    });

    messagesListener.on('child_changed', (snapshot) => {
        const message = snapshot.val();
        message.id = snapshot.key;
        updateMessageInUI(message);
    });

    messagesListener.on('child_removed', (snapshot) => {
        removeMessageFromUI(snapshot.key);
    });
}

async function loadServerMembers(serverId) {
    const membersList = document.getElementById('members-list');

    const membersRef = await firebase.database().ref(`servers/${serverId}/members`).once('value');
    const members = membersRef.val() || {};

    const memberElements = await Promise.all(Object.keys(members).map(async (memberId) => {
        const userRef = await firebase.database().ref(`users/${memberId}`).once('value');
        const user = userRef.val();

        if (!user) return '';

        return `
            <div class="flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-discord-dark cursor-pointer" onclick="showUserProfile('${memberId}')">
                <div class="relative flex-shrink-0">
                    <div class="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center">
                        <span class="text-xs font-semibold">${user.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div class="absolute bottom-0 right-0 status-indicator status-${user.status || 'online'}"></div>
                </div>
                <span class="text-sm text-white">${user.username}</span>
            </div>
        `;
    }));

    membersList.innerHTML = memberElements.join('');
}

// ============================================
// Server Modals
// ============================================

function showJoinServerModal() {
    document.getElementById('join-server-modal').classList.remove('hidden');
    document.getElementById('join-server-modal').classList.add('flex');
    document.getElementById('join-server-input').focus();
}

function closeJoinServerModal() {
    document.getElementById('join-server-modal').classList.add('hidden');
    document.getElementById('join-server-modal').classList.remove('flex');
    document.getElementById('join-server-input').value = '';
}

function showCreateServerModal() {
    document.getElementById('create-server-modal').classList.remove('hidden');
    document.getElementById('create-server-modal').classList.add('flex');
    document.getElementById('create-server-name').focus();
}

function closeCreateServerModal() {
    document.getElementById('create-server-modal').classList.add('hidden');
    document.getElementById('create-server-modal').classList.remove('flex');
    document.getElementById('create-server-name').value = '';
    document.getElementById('create-server-icon').value = '';
}

async function joinServer() {
    const serverId = document.getElementById('join-server-input').value.trim();

    if (!serverId) {
        alert('Please enter a server ID');
        return;
    }

    try {
        // Check if server exists
        const serverRef = firebase.database().ref(`servers/${serverId}`);
        const snapshot = await serverRef.once('value');

        if (!snapshot.exists()) {
            alert('Server not found. Please check the ID and try again.');
            return;
        }

        // Add user to server members
        await serverRef.child(`members/${currentUser.uid}`).set({
            username: currentUser.username,
            joinedAt: firebase.database.ServerValue.TIMESTAMP
        });

        // Add server to user's server list
        await firebase.database().ref(`users/${currentUser.uid}/servers/${serverId}`).set(true);

        alert('Successfully joined server!');
        closeJoinServerModal();

        // Load the server
        await loadServer(serverId);
    } catch (error) {
        console.error('Error joining server:', error);
        alert('Failed to join server: ' + error.message);
    }
}

async function createServer() {
    const serverName = document.getElementById('create-server-name').value.trim();
    const serverIcon = document.getElementById('create-server-icon').value.trim();

    if (!serverName) {
        alert('Please enter a server name');
        return;
    }

    try {
        // Create new server
        const serverRef = firebase.database().ref('servers').push();
        const serverId = serverRef.key;

        await serverRef.set({
            name: serverName,
            icon: serverIcon || serverName.substring(0, 2).toUpperCase(),
            ownerId: currentUser.uid,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            members: {
                [currentUser.uid]: {
                    username: currentUser.username,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP,
                    role: 'owner'
                }
            },
            channels: {
                general: {
                    name: 'general',
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                }
            }
        });

        // Add server to user's server list
        await firebase.database().ref(`users/${currentUser.uid}/servers/${serverId}`).set(true);

        alert(`Server created! Server ID: ${serverId}\nShare this ID with others to let them join.`);
        closeCreateServerModal();

        // Load the new server
        await loadServer(serverId);
    } catch (error) {
        console.error('Error creating server:', error);
        alert('Failed to create server: ' + error.message);
    }
}

function showServerMenu() {
    if (currentServerId) {
        alert(`Server ID: ${currentServerId}\nShare this ID with friends to let them join!`);
    }
}

function showSettings() {
    showOwnProfile();
}

// ============================================
// Message Management
// ============================================

function addMessageToUI(message) {
    const container = document.getElementById('messages-container');

    // Remove welcome message if it exists
    const welcomeMsg = container.querySelector('.text-center');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = createMessageElement(message);
    container.appendChild(messageDiv);

    // Scroll to bottom
    scrollToBottom();
}

function createMessageElement(message) {
    const div = document.createElement('div');
    div.id = `message-${message.id}`;
    div.className = 'flex items-start space-x-3 message-appear hover:bg-discord-darker hover:bg-opacity-30 px-2 py-1 rounded group';

    const timestamp = new Date(message.timestamp);
    const timeString = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const isCurrentUser = message.author_id === currentUser.uid;
    const contextMenuBtn = isCurrentUser ? `
        <button onclick="showMessageContextMenu(event, '${message.id}')" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-discord-gray rounded">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
            </svg>
        </button>
    ` : '';

    // Check if message content is a URL (image/gif)
    let contentHTML;
    if (message.content.match(/^https?:\/\/.+\.(gif|jpg|jpeg|png|webp)(\?.*)?$/i)) {
        contentHTML = `<img src="${escapeHtml(message.content)}" class="max-w-md rounded mt-2" alt="Image" />`;
    } else {
        contentHTML = `<p class="text-white break-words">${escapeHtml(message.content)}</p>`;
    }

    if (message.edited) {
        contentHTML += `<span class="text-xs text-discord-lightgray ml-1">(edited)</span>`;
    }

    div.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center flex-shrink-0 cursor-pointer" onclick="showUserProfile('${message.author_id}')">
            <span class="text-sm font-semibold">${message.author.charAt(0).toUpperCase()}</span>
        </div>
        <div class="flex-1 min-w-0">
            <div class="flex items-baseline space-x-2">
                <span class="font-semibold text-white cursor-pointer hover:underline" onclick="showUserProfile('${message.author_id}')">${escapeHtml(message.author)}</span>
                <span class="text-xs text-discord-lightgray">${timeString}</span>
                ${contextMenuBtn}
            </div>
            ${contentHTML}
        </div>
    `;

    return div;
}

function updateMessageInUI(message) {
    const existingDiv = document.getElementById(`message-${message.id}`);
    if (existingDiv) {
        const newDiv = createMessageElement(message);
        existingDiv.replaceWith(newDiv);
    }
}

function removeMessageFromUI(messageId) {
    const div = document.getElementById(`message-${messageId}`);
    if (div) {
        div.remove();
    }
}

function scrollToBottom() {
    const container = document.getElementById('messages-container');
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

// ============================================
// Sending Messages
// ============================================

function handleMessageInput(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();

    if (!content) return;

    if (editingMessageId) {
        // Update existing message
        await updateMessage(editingMessageId, content);
        editingMessageId = null;
        input.placeholder = currentView === 'dm' ? 'Message' : `Message #${currentChannelId}`;
    } else {
        // Send new message
        try {
            let messagesRef;

            if (currentView === 'dm') {
                // DM message
                const roomId = [currentUser.uid, currentDmUserId].sort().join('_');
                messagesRef = firebase.database().ref(`dms/${roomId}/messages`);
            } else {
                // Server message
                messagesRef = firebase.database().ref(`servers/${currentServerId}/channels/${currentChannelId}/messages`);
            }

            await messagesRef.push({
                content: content,
                author: currentUser.username,
                author_id: currentUser.uid,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                edited: false
            });

            input.value = '';
            input.style.height = 'auto';
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message: ' + error.message);
        }
    }
}

// ============================================
// Message Context Menu
// ============================================

function showMessageContextMenu(event, messageId) {
    event.preventDefault();
    event.stopPropagation();

    contextMenuMessageId = messageId;
    const menu = document.getElementById('message-context-menu');

    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';
    menu.classList.remove('hidden');

    setTimeout(() => {
        document.addEventListener('click', closeContextMenu);
    }, 0);
}

function closeContextMenu() {
    const menu = document.getElementById('message-context-menu');
    menu.classList.add('hidden');
    document.removeEventListener('click', closeContextMenu);
}

async function editMessage() {
    closeContextMenu();

    if (!contextMenuMessageId) return;

    try {
        let messageRef;
        if (currentView === 'dm') {
            const roomId = [currentUser.uid, currentDmUserId].sort().join('_');
            messageRef = firebase.database().ref(`dms/${roomId}/messages/${contextMenuMessageId}`);
        } else {
            messageRef = firebase.database().ref(`servers/${currentServerId}/channels/${currentChannelId}/messages/${contextMenuMessageId}`);
        }

        const snapshot = await messageRef.once('value');
        const message = snapshot.val();

        if (message && message.author_id === currentUser.uid) {
            editingMessageId = contextMenuMessageId;
            const input = document.getElementById('message-input');
            input.value = message.content;
            input.placeholder = 'Editing message - Press Enter to save';
            input.focus();
        }
    } catch (error) {
        console.error('Error loading message for edit:', error);
    }
}

async function updateMessage(messageId, newContent) {
    try {
        let messageRef;
        if (currentView === 'dm') {
            const roomId = [currentUser.uid, currentDmUserId].sort().join('_');
            messageRef = firebase.database().ref(`dms/${roomId}/messages/${messageId}`);
        } else {
            messageRef = firebase.database().ref(`servers/${currentServerId}/channels/${currentChannelId}/messages/${messageId}`);
        }

        await messageRef.update({
            content: newContent,
            edited: true,
            editedAt: firebase.database.ServerValue.TIMESTAMP
        });

        document.getElementById('message-input').value = '';
    } catch (error) {
        console.error('Error updating message:', error);
        alert('Failed to update message: ' + error.message);
    }
}

async function deleteMessage() {
    closeContextMenu();

    if (!contextMenuMessageId) return;
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
        let messageRef;
        if (currentView === 'dm') {
            const roomId = [currentUser.uid, currentDmUserId].sort().join('_');
            messageRef = firebase.database().ref(`dms/${roomId}/messages/${contextMenuMessageId}`);
        } else {
            messageRef = firebase.database().ref(`servers/${currentServerId}/channels/${currentChannelId}/messages/${contextMenuMessageId}`);
        }

        await messageRef.remove();
    } catch (error) {
        console.error('Error deleting message:', error);
        alert('Failed to delete message: ' + error.message);
    }
}

// ============================================
// GIF Picker
// ============================================

function showGifPicker() {
    document.getElementById('gif-modal').classList.remove('hidden');
    document.getElementById('gif-modal').classList.add('flex');
    document.getElementById('gif-search-input').focus();
}

function closeGifPicker() {
    document.getElementById('gif-modal').classList.add('hidden');
    document.getElementById('gif-modal').classList.remove('flex');
    document.getElementById('gif-search-input').value = '';
    document.getElementById('gif-results').innerHTML = '<p class="text-discord-lightgray col-span-full text-center">Search for GIFs above</p>';
}

let searchTimeout;
function searchGifs(event) {
    clearTimeout(searchTimeout);

    const query = event.target.value.trim();

    if (!query) {
        document.getElementById('gif-results').innerHTML = '<p class="text-discord-lightgray col-span-full text-center">Search for GIFs above</p>';
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(
                `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20`
            );
            const data = await response.json();

            displayGifs(data.results);
        } catch (error) {
            console.error('Error fetching GIFs:', error);
            document.getElementById('gif-results').innerHTML = '<p class="text-discord-lightgray col-span-full text-center">Error loading GIFs</p>';
        }
    }, 500);
}

function displayGifs(gifs) {
    const container = document.getElementById('gif-results');

    if (!gifs || gifs.length === 0) {
        container.innerHTML = '<p class="text-discord-lightgray col-span-full text-center">No GIFs found</p>';
        return;
    }

    container.innerHTML = gifs.map(gif => `
        <div class="gif-item" onclick="selectGif('${gif.media_formats.gif.url}')">
            <img src="${gif.media_formats.tinygif.url}" alt="${gif.content_description}" class="w-full h-full object-cover" />
        </div>
    `).join('');
}

async function selectGif(gifUrl) {
    closeGifPicker();

    try {
        let messagesRef;

        if (currentView === 'dm') {
            const roomId = [currentUser.uid, currentDmUserId].sort().join('_');
            messagesRef = firebase.database().ref(`dms/${roomId}/messages`);
        } else {
            messagesRef = firebase.database().ref(`servers/${currentServerId}/channels/${currentChannelId}/messages`);
        }

        await messagesRef.push({
            content: gifUrl,
            author: currentUser.username,
            author_id: currentUser.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            edited: false
        });
    } catch (error) {
        console.error('Error sending GIF:', error);
        alert('Failed to send GIF: ' + error.message);
    }
}

// ============================================
// Utility Functions
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupEventListeners() {
    // Auto-resize message input
    const messageInput = document.getElementById('message-input');
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 128) + 'px';
    });

    // Close modals on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeJoinServerModal();
            closeCreateServerModal();
            closeGifPicker();
            closeContextMenu();
            closeProfileModal();
            closeEditProfileModal();
        }
    });
}

// ============================================
// Export functions for inline onclick handlers
// ============================================

window.loadDMView = loadDMView;
window.loadServer = loadServer;
window.switchChannel = switchChannel;
window.showJoinServerModal = showJoinServerModal;
window.closeJoinServerModal = closeJoinServerModal;
window.showCreateServerModal = showCreateServerModal;
window.closeCreateServerModal = closeCreateServerModal;
window.joinServer = joinServer;
window.createServer = createServer;
window.showServerMenu = showServerMenu;
window.sendMessage = sendMessage;
window.handleMessageInput = handleMessageInput;
window.showMessageContextMenu = showMessageContextMenu;
window.closeContextMenu = closeContextMenu;
window.editMessage = editMessage;
window.deleteMessage = deleteMessage;
window.showGifPicker = showGifPicker;
window.closeGifPicker = closeGifPicker;
window.searchGifs = searchGifs;
window.selectGif = selectGif;
window.showOwnProfile = showOwnProfile;
window.showUserProfile = showUserProfile;
window.closeProfileModal = closeProfileModal;
window.showEditProfileModal = showEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.saveProfile = saveProfile;
window.sendFriendRequest = sendFriendRequest;
window.removeFriend = removeFriend;
window.blockUser = blockUser;
window.unblockUser = unblockUser;
window.startDM = startDM;
window.showAllFriends = showAllFriends;
window.loadDMChat = loadDMChat;
window.showSettings = showSettings;
