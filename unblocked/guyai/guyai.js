/**
 * GuyAI - AI Chatbot Interface
 * Connects to Ollama API at oai1.guythatlives.net
 * Uses local storage for chat persistence
 */

// Configuration
const CONFIG = {
    OLLAMA_API_URL: 'http://oai1.guythatlives.net/api',
    MODEL: 'qwen3:4b',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    STORAGE_KEY: 'guyai_chats',
    CURRENT_CHAT_KEY: 'guyai_current_chat'
};

// System prompt to train the AI as "Guy"
const SYSTEM_PROMPT = `You are Guy, a friendly and helpful test AI assistant. You're experimental, enthusiastic, and love helping users. You communicate in a casual, approachable way while being informative. You're currently in testing phase and excited to help users with questions, creative tasks, and general conversation. Keep responses concise but helpful. You're part of the GuyThatLives website's unblocked games section.`;

// Global state
let currentChatId = null;
let isProcessing = false;

/**
 * Chat Storage Manager
 */
class ChatStorage {
    constructor() {
        this.chats = this.loadChats();
    }

    loadChats() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading chats:', error);
            return {};
        }
    }

    saveChats() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.chats));
        } catch (error) {
            console.error('Error saving chats:', error);
        }
    }

    createChat() {
        const chatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.chats[chatId] = {
            id: chatId,
            title: 'New Chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.saveChats();
        return chatId;
    }

    getChat(chatId) {
        return this.chats[chatId] || null;
    }

    getAllChats() {
        return Object.values(this.chats).sort((a, b) => b.updatedAt - a.updatedAt);
    }

    addMessage(chatId, message) {
        if (!this.chats[chatId]) return;

        this.chats[chatId].messages.push(message);
        this.chats[chatId].updatedAt = Date.now();

        // Update title from first user message
        if (message.role === 'user' && this.chats[chatId].title === 'New Chat') {
            this.chats[chatId].title = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
        }

        this.saveChats();
    }

    deleteChat(chatId) {
        delete this.chats[chatId];
        this.saveChats();
    }

    getCurrentChatId() {
        return localStorage.getItem(CONFIG.CURRENT_CHAT_KEY);
    }

    setCurrentChatId(chatId) {
        localStorage.setItem(CONFIG.CURRENT_CHAT_KEY, chatId);
    }
}

/**
 * Ollama API Client
 */
class OllamaClient {
    constructor(apiUrl, model) {
        this.apiUrl = apiUrl;
        this.model = model;
    }

    async chat(messages, onChunk = null) {
        const url = `${this.apiUrl}/chat`;

        // Prepare messages with system prompt
        const formattedMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages
        ];

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: formattedMessages,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);

                        if (data.message && data.message.content) {
                            fullResponse += data.message.content;

                            if (onChunk) {
                                onChunk(data.message.content);
                            }
                        }

                        if (data.done) {
                            return fullResponse;
                        }
                    } catch (parseError) {
                        console.warn('Error parsing chunk:', parseError);
                    }
                }
            }

            return fullResponse;

        } catch (error) {
            console.error('Error calling Ollama API:', error);
            throw error;
        }
    }

    async testConnection() {
        try {
            const response = await fetch(`${this.apiUrl}/tags`);
            if (!response.ok) {
                throw new Error('API not accessible');
            }
            const data = await response.json();
            return data.models && data.models.some(m => m.name === this.model);
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
}

/**
 * UI Manager
 */
class ChatUI {
    constructor() {
        this.chatArea = document.getElementById('chatArea');
        this.chatInput = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.welcomeMessage = document.getElementById('welcomeMessage');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.chatList = document.getElementById('chatList');
        this.chatListSidebar = document.getElementById('chatListSidebar');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');
    }

    showWelcome() {
        this.welcomeMessage.style.display = 'block';
    }

    hideWelcome() {
        this.welcomeMessage.style.display = 'none';
    }

    showTyping() {
        this.typingIndicator.classList.add('active');
        this.scrollToBottom();
    }

    hideTyping() {
        this.typingIndicator.classList.remove('active');
    }

    addMessage(role, content, isStreaming = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;

        const avatar = document.createElement('div');
        avatar.className = `message-avatar ${role}-avatar`;
        avatar.textContent = role === 'user' ? '👤' : '🤖';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const header = document.createElement('div');
        header.className = 'message-header';

        const sender = document.createElement('div');
        sender.className = 'message-sender';
        sender.textContent = role === 'user' ? 'You' : 'Guy';

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = this.formatTime(new Date());

        header.appendChild(sender);
        header.appendChild(time);

        const text = document.createElement('div');
        text.className = 'message-text';
        text.textContent = content;

        contentDiv.appendChild(header);
        contentDiv.appendChild(text);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);

        // Insert before typing indicator
        this.chatArea.insertBefore(messageDiv, this.typingIndicator);

        this.scrollToBottom();

        return text; // Return text element for streaming updates
    }

    updateMessage(textElement, content) {
        textElement.textContent = content;
        this.scrollToBottom();
    }

    clearChat() {
        const messages = this.chatArea.querySelectorAll('.chat-message');
        messages.forEach(msg => msg.remove());
        this.showWelcome();
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.chatArea.scrollTop = this.chatArea.scrollHeight;
        });
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    setInputEnabled(enabled) {
        this.chatInput.disabled = !enabled;
        this.sendBtn.disabled = !enabled;
    }

    updateChatList(chats, currentChatId) {
        this.chatList.innerHTML = '';

        if (chats.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.padding = '2rem 1rem';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.color = 'var(--text-muted)';
            emptyMsg.textContent = 'No chats yet';
            this.chatList.appendChild(emptyMsg);
            return;
        }

        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            if (chat.id === currentChatId) {
                chatItem.classList.add('active');
            }

            const title = document.createElement('div');
            title.className = 'chat-item-title';
            title.textContent = chat.title;

            const preview = document.createElement('div');
            preview.className = 'chat-item-preview';
            const lastMsg = chat.messages[chat.messages.length - 1];
            preview.textContent = lastMsg ? lastMsg.content.substring(0, 50) : 'No messages';

            const timeDiv = document.createElement('div');
            timeDiv.className = 'chat-item-time';
            timeDiv.textContent = this.formatChatTime(chat.updatedAt);

            chatItem.appendChild(title);
            chatItem.appendChild(preview);
            chatItem.appendChild(timeDiv);

            chatItem.addEventListener('click', () => {
                window.chatApp.switchChat(chat.id);
            });

            this.chatList.appendChild(chatItem);
        });
    }

    formatChatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        return date.toLocaleDateString();
    }

    openSidebar() {
        this.chatListSidebar.classList.add('open');
        this.sidebarOverlay.classList.add('active');
    }

    closeSidebar() {
        this.chatListSidebar.classList.remove('open');
        this.sidebarOverlay.classList.remove('active');
    }
}

/**
 * Main Chat Application
 */
class ChatApp {
    constructor() {
        this.storage = new ChatStorage();
        this.client = new OllamaClient(CONFIG.OLLAMA_API_URL, CONFIG.MODEL);
        this.ui = new ChatUI();

        this.init();
    }

    async init() {
        // Check connection
        const connected = await this.client.testConnection();
        if (!connected) {
            console.warn('Could not connect to Ollama API. Some features may not work.');
        }

        // Load or create chat
        const savedChatId = this.storage.getCurrentChatId();
        if (savedChatId && this.storage.getChat(savedChatId)) {
            this.loadChat(savedChatId);
        } else {
            this.createNewChat();
        }

        this.setupEventListeners();
        this.updateChatList();
    }

    setupEventListeners() {
        // Send button
        this.ui.sendBtn.addEventListener('click', () => this.sendMessage());

        // Enter to send (Shift+Enter for newline)
        this.ui.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.ui.chatInput.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
        });

        // Suggested prompts
        document.querySelectorAll('.prompt-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                this.ui.chatInput.value = prompt;
                this.sendMessage();
            });
        });

        // New chat button
        document.getElementById('newChatBtn').addEventListener('click', () => {
            this.createNewChat();
        });

        // Chats button
        document.getElementById('chatsBtn').addEventListener('click', () => {
            this.ui.openSidebar();
        });

        // Close sidebar
        document.getElementById('closeSidebarBtn').addEventListener('click', () => {
            this.ui.closeSidebar();
        });

        this.ui.sidebarOverlay.addEventListener('click', () => {
            this.ui.closeSidebar();
        });
    }

    createNewChat() {
        currentChatId = this.storage.createChat();
        this.storage.setCurrentChatId(currentChatId);
        this.ui.clearChat();
        this.updateChatList();
    }

    loadChat(chatId) {
        currentChatId = chatId;
        this.storage.setCurrentChatId(chatId);

        const chat = this.storage.getChat(chatId);
        if (!chat) {
            this.createNewChat();
            return;
        }

        this.ui.clearChat();

        if (chat.messages.length === 0) {
            this.ui.showWelcome();
        } else {
            this.ui.hideWelcome();
            chat.messages.forEach(msg => {
                this.ui.addMessage(msg.role, msg.content);
            });
        }
    }

    switchChat(chatId) {
        this.loadChat(chatId);
        this.ui.closeSidebar();
        this.updateChatList();
    }

    updateChatList() {
        const chats = this.storage.getAllChats();
        this.ui.updateChatList(chats, currentChatId);
    }

    async sendMessage() {
        const message = this.ui.chatInput.value.trim();
        if (!message || isProcessing) return;

        // Hide welcome and clear input
        this.ui.hideWelcome();
        this.ui.chatInput.value = '';
        this.ui.chatInput.style.height = 'auto';
        this.ui.setInputEnabled(false);
        isProcessing = true;

        // Add user message to UI and storage
        this.ui.addMessage('user', message);
        this.storage.addMessage(currentChatId, {
            role: 'user',
            content: message,
            timestamp: Date.now()
        });

        // Show typing indicator
        this.ui.showTyping();

        try {
            // Get chat history
            const chat = this.storage.getChat(currentChatId);
            const messages = chat.messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Stream response
            let fullResponse = '';
            let responseElement = null;

            const response = await this.client.chat(messages, (chunk) => {
                this.ui.hideTyping();

                if (!responseElement) {
                    responseElement = this.ui.addMessage('assistant', chunk);
                } else {
                    fullResponse += chunk;
                    this.ui.updateMessage(responseElement, fullResponse);
                }
            });

            // Save assistant response
            this.storage.addMessage(currentChatId, {
                role: 'assistant',
                content: response,
                timestamp: Date.now()
            });

            this.updateChatList();

        } catch (error) {
            console.error('Error sending message:', error);
            this.ui.hideTyping();
            this.ui.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
        } finally {
            isProcessing = false;
            this.ui.setInputEnabled(true);
            this.ui.chatInput.focus();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});
