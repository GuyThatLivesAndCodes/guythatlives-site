/**
 * TheChat - Discord-style chat application
 * Integrates with existing authentication system
 */

// ============================================
// State Management
// ============================================
let currentUser = null;
let currentServer = null;
let currentChannel = 'general';
let messagesListener = null;
let contextMenuMessageId = null;
let editingMessageId = null;

// Tenor API Key (get free key at https://developers.google.com/tenor/guides/quickstart)
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRUduvRY'; // Replace with your key

// ============================================
// Authentication Check & Initialization
// ============================================

// Check authentication on page load
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
        // Redirect to home on error
        window.location.href = '/unblocked/';
    }
});

// ============================================
// App Initialization
// ============================================

async function initializeApp() {
    try {
        // Update user display
        updateUserDisplay();

        // Load default server (home server)
        await loadHomeServer();

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
// User Display
// ============================================

function updateUserDisplay() {
    const avatarText = document.getElementById('user-avatar-text');
    const displayName = document.getElementById('user-display-name');

    if (currentUser) {
        avatarText.textContent = currentUser.username.charAt(0).toUpperCase();
        displayName.textContent = currentUser.username;
    }
}

// ============================================
// Server Management
// ============================================

async function loadHomeServer() {
    currentServer = 'home';
    currentChannel = 'general';

    document.getElementById('server-name').textContent = 'Home Server';

    // Load default channels
    const channelsList = document.getElementById('channels-list');
    channelsList.innerHTML = `
        <button onclick="switchChannel('general')" class="w-full text-left px-2 py-1.5 rounded hover:bg-discord-dark text-discord-lightgray hover:text-white flex items-center channel-btn" data-channel="general">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z" clip-rule="evenodd"/>
            </svg>
            <span>general</span>
        </button>
        <button onclick="switchChannel('random')" class="w-full text-left px-2 py-1.5 rounded hover:bg-discord-dark text-discord-lightgray hover:text-white flex items-center channel-btn" data-channel="random">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z" clip-rule="evenodd"/>
            </svg>
            <span>random</span>
        </button>
        <button onclick="switchChannel('gaming')" class="w-full text-left px-2 py-1.5 rounded hover:bg-discord-dark text-discord-lightgray hover:text-white flex items-center channel-btn" data-channel="gaming">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z" clip-rule="evenodd"/>
            </svg>
            <span>gaming</span>
        </button>
    `;

    // Highlight general channel
    switchChannel('general');
}

function switchChannel(channelName) {
    currentChannel = channelName;
    document.getElementById('channel-name').textContent = channelName;
    document.getElementById('message-input').placeholder = `Message #${channelName}`;

    // Update channel highlighting
    document.querySelectorAll('.channel-btn').forEach(btn => {
        btn.classList.remove('bg-discord-dark', 'text-white');
        btn.classList.add('text-discord-lightgray');
    });

    const activeBtn = document.querySelector(`[data-channel="${channelName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('bg-discord-dark', 'text-white');
        activeBtn.classList.remove('text-discord-lightgray');
    }

    // Load messages for this channel
    loadMessages();

    // Load members
    loadMembers();
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
    document.getElementById('create-server-input').focus();
}

function closeCreateServerModal() {
    document.getElementById('create-server-modal').classList.add('hidden');
    document.getElementById('create-server-modal').classList.remove('flex');
    document.getElementById('create-server-input').value = '';
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

        alert('Successfully joined server!');
        closeJoinServerModal();

        // Reload server list
        loadServerList();
    } catch (error) {
        console.error('Error joining server:', error);
        alert('Failed to join server: ' + error.message);
    }
}

async function createServer() {
    const serverName = document.getElementById('create-server-input').value.trim();

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

        alert(`Server created! Server ID: ${serverId}\nShare this ID with others to let them join.`);
        closeCreateServerModal();

        // Load the new server
        currentServer = serverId;
        loadServerList();
    } catch (error) {
        console.error('Error creating server:', error);
        alert('Failed to create server: ' + error.message);
    }
}

async function loadServerList() {
    // This would load servers the user is a member of
    // For now, just showing home server
    console.log('Loading server list...');
}

function showServerMenu() {
    alert(`Server ID: ${currentServer}\nShare this ID with friends to let them join!`);
}

// ============================================
// Message Management
// ============================================

async function loadMessages() {
    // Remove existing listener
    if (messagesListener) {
        messagesListener.off();
    }

    // Clear messages
    const container = document.getElementById('messages-container');
    container.innerHTML = `
        <div class="text-center text-discord-lightgray py-8">
            <div class="text-4xl mb-2">💬</div>
            <h3 class="text-xl font-bold mb-2">Welcome to #${currentChannel}!</h3>
            <p class="text-sm">This is the beginning of the #${currentChannel} channel.</p>
        </div>
    `;

    // Set up real-time listener
    const messagesRef = firebase.database().ref(`servers/${currentServer}/channels/${currentChannel}/messages`);

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
        contentHTML = `
            <img src="${escapeHtml(message.content)}" class="max-w-md rounded mt-2" alt="Image" />
        `;
    } else {
        contentHTML = `<p class="text-white break-words">${escapeHtml(message.content)}</p>`;
    }

    if (message.edited) {
        contentHTML += `<span class="text-xs text-discord-lightgray ml-1">(edited)</span>`;
    }

    div.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center flex-shrink-0">
            <span class="text-sm font-semibold">${message.author.charAt(0).toUpperCase()}</span>
        </div>
        <div class="flex-1 min-w-0">
            <div class="flex items-baseline space-x-2">
                <span class="font-semibold text-white">${escapeHtml(message.author)}</span>
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
        input.placeholder = `Message #${currentChannel}`;
    } else {
        // Send new message
        try {
            const messagesRef = firebase.database().ref(`servers/${currentServer}/channels/${currentChannel}/messages`);

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

    // Close menu when clicking outside
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
        const messageRef = firebase.database().ref(`servers/${currentServer}/channels/${currentChannel}/messages/${contextMenuMessageId}`);
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
        const messageRef = firebase.database().ref(`servers/${currentServer}/channels/${currentChannel}/messages/${messageId}`);

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
        const messageRef = firebase.database().ref(`servers/${currentServer}/channels/${currentChannel}/messages/${contextMenuMessageId}`);
        await messageRef.remove();
    } catch (error) {
        console.error('Error deleting message:', error);
        alert('Failed to delete message: ' + error.message);
    }
}

// ============================================
// GIF Picker (Tenor API)
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
        const messagesRef = firebase.database().ref(`servers/${currentServer}/channels/${currentChannel}/messages`);

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
// Members List
// ============================================

async function loadMembers() {
    const membersList = document.getElementById('members-list');

    // For home server, show online users
    membersList.innerHTML = `
        <div class="flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-discord-dark cursor-pointer">
            <div class="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center relative">
                <span class="text-xs font-semibold">${currentUser.username.charAt(0).toUpperCase()}</span>
                <div class="absolute bottom-0 right-0 w-3 h-3 bg-discord-green rounded-full border-2 border-discord-darker"></div>
            </div>
            <span class="text-sm text-white">${currentUser.username}</span>
        </div>
    `;
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
        }
    });
}

function signOut() {
    if (confirm('Are you sure you want to sign out?')) {
        window.gamesAuth.signOut();
        window.location.href = '/unblocked/';
    }
}

// ============================================
// Export functions for inline onclick handlers
// ============================================

window.loadHomeServer = loadHomeServer;
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
window.signOut = signOut;
