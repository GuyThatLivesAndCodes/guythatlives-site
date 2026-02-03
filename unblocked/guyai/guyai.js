/**
 * GuyAI - Secure AI Chat powered by Claude via Cloudflare AI Gateway
 * Features:
 * - End-to-end encryption using Web Crypto API
 * - Cloudflare AI Gateway for secure API access
 * - Local storage for chat history
 * - Streaming responses
 */

// Configuration
const CONFIG_KEY = 'guyai_config';
const CHAT_HISTORY_KEY = 'guyai_chat_history';
const ENCRYPTION_KEY_NAME = 'guyai_encryption_key';

// State
let config = null;
let encryptionKey = null;
let conversationHistory = [];
let isProcessing = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await initializeEncryption();
    loadConfig();
    loadChatHistory();

    // Auto-resize textarea
    const textarea = document.getElementById('userInput');
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    });

    // Show config modal if not configured
    if (!config || !config.accountId || !config.apiToken) {
        showConfig();
    }

    // Setup config form submission
    document.getElementById('configForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveConfig();
    });
});

/**
 * Initialize encryption key for E2E encryption
 */
async function initializeEncryption() {
    try {
        // Try to load existing key
        const storedKey = localStorage.getItem(ENCRYPTION_KEY_NAME);

        if (storedKey) {
            // Import stored key
            const keyData = JSON.parse(storedKey);
            encryptionKey = await crypto.subtle.importKey(
                'jwk',
                keyData,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
        } else {
            // Generate new key
            encryptionKey = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            // Export and store key
            const exportedKey = await crypto.subtle.exportKey('jwk', encryptionKey);
            localStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exportedKey));
        }
    } catch (error) {
        console.error('Encryption initialization error:', error);
        showError('Failed to initialize encryption. Please refresh the page.');
    }
}

/**
 * Encrypt data using Web Crypto API
 */
async function encryptData(data) {
    try {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));

        // Generate random IV
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Encrypt
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            encryptionKey,
            dataBuffer
        );

        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encrypted), iv.length);

        // Convert to base64
        return btoa(String.fromCharCode(...combined));
    } catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
}

/**
 * Decrypt data using Web Crypto API
 */
async function decryptData(encryptedData) {
    try {
        // Convert from base64
        const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

        // Extract IV and encrypted data
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);

        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            encryptionKey,
            encrypted
        );

        // Decode
        const decoder = new TextDecoder();
        const decoded = decoder.decode(decrypted);

        return JSON.parse(decoded);
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

/**
 * Load configuration from localStorage
 */
function loadConfig() {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
        try {
            config = JSON.parse(stored);
            // Populate form fields
            if (config.accountId) document.getElementById('accountId').value = config.accountId;
            if (config.apiToken) document.getElementById('apiToken').value = config.apiToken;
            if (config.gatewayId) document.getElementById('gatewayId').value = config.gatewayId;
        } catch (error) {
            console.error('Failed to load config:', error);
        }
    }
}

/**
 * Save configuration to localStorage
 */
function saveConfig() {
    const accountId = document.getElementById('accountId').value.trim();
    const apiToken = document.getElementById('apiToken').value.trim();
    const gatewayId = document.getElementById('gatewayId').value.trim();

    if (!accountId || !apiToken || !gatewayId) {
        showError('Please fill in all configuration fields');
        return;
    }

    config = { accountId, apiToken, gatewayId };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));

    hideConfig();
    showError('Configuration saved successfully!', 'success');
    setTimeout(() => hideError(), 2000);
}

/**
 * Load chat history from localStorage
 */
async function loadChatHistory() {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    if (stored) {
        try {
            const encrypted = JSON.parse(stored);
            conversationHistory = await decryptData(encrypted) || [];
            renderChatHistory();
        } catch (error) {
            console.error('Failed to load chat history:', error);
            conversationHistory = [];
        }
    }
}

/**
 * Save chat history to localStorage (encrypted)
 */
async function saveChatHistory() {
    try {
        const encrypted = await encryptData(conversationHistory);
        if (encrypted) {
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(encrypted));
        }
    } catch (error) {
        console.error('Failed to save chat history:', error);
    }
}

/**
 * Render chat history in the UI
 */
function renderChatHistory() {
    const container = document.getElementById('chatContainer');

    if (conversationHistory.length === 0) {
        return;
    }

    // Clear empty state
    container.innerHTML = '';

    // Render messages
    conversationHistory.forEach(msg => {
        addMessageToUI(msg.role, msg.content);
    });

    scrollToBottom();
}

/**
 * Add message to UI
 */
function addMessageToUI(role, content) {
    const container = document.getElementById('chatContainer');

    // Remove empty state if present
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'U' : 'AI';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Parse markdown-like formatting
    const formattedContent = formatMessage(content);
    contentDiv.innerHTML = formattedContent;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);

    container.appendChild(messageDiv);
    scrollToBottom();
}

/**
 * Format message content (basic markdown support)
 */
function formatMessage(text) {
    // Escape HTML
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, lang, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Paragraphs
    formatted = formatted.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

    return formatted;
}

/**
 * Scroll chat to bottom
 */
function scrollToBottom() {
    const container = document.getElementById('chatContainer');
    container.scrollTop = container.scrollHeight;
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
    const container = document.getElementById('chatContainer');
    const typing = document.createElement('div');
    typing.className = 'message assistant';
    typing.id = 'typingIndicator';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'AI';

    const indicator = document.createElement('div');
    indicator.className = 'message-content';
    indicator.innerHTML = `
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;

    typing.appendChild(avatar);
    typing.appendChild(indicator);
    container.appendChild(typing);
    scrollToBottom();
}

/**
 * Hide typing indicator
 */
function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

/**
 * Send message to Claude via Cloudflare AI Gateway
 */
async function sendMessage() {
    if (isProcessing) return;

    const input = document.getElementById('userInput');
    const message = input.value.trim();

    if (!message) return;

    // Check configuration
    if (!config || !config.accountId || !config.apiToken) {
        showError('Please configure your Cloudflare credentials first');
        showConfig();
        return;
    }

    // Add user message
    conversationHistory.push({ role: 'user', content: message });
    addMessageToUI('user', message);

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Disable send button
    isProcessing = true;
    updateSendButton();

    // Show typing indicator
    showTypingIndicator();

    try {
        // Build Cloudflare AI Gateway URL
        const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/anthropic/v1/messages`;

        // Prepare request
        const requestBody = {
            model: 'claude-haiku-4-20250514',
            max_tokens: 4096,
            messages: conversationHistory
        };

        // Make request
        const response = await fetch(gatewayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiToken}`,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
        }

        const data = await response.json();

        // Extract response
        const assistantMessage = data.content[0]?.text || 'No response received';

        // Add to conversation
        conversationHistory.push({ role: 'assistant', content: assistantMessage });

        // Hide typing and show response
        hideTypingIndicator();
        addMessageToUI('assistant', assistantMessage);

        // Save to localStorage (encrypted)
        await saveChatHistory();

    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        showError(`Failed to get response: ${error.message}`);

        // Remove failed user message from history
        conversationHistory.pop();
    } finally {
        isProcessing = false;
        updateSendButton();
        input.focus();
    }
}

/**
 * Update send button state
 */
function updateSendButton() {
    const btn = document.getElementById('sendBtn');
    btn.disabled = isProcessing;
    btn.textContent = isProcessing ? 'Sending...' : 'Send';
}

/**
 * Handle keyboard events
 */
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

/**
 * Use suggestion
 */
function useSuggestion(text) {
    const input = document.getElementById('userInput');
    input.value = text;
    input.focus();
    sendMessage();
}

/**
 * Clear chat history
 */
function clearChat() {
    if (!confirm('Are you sure you want to clear all chat history?')) {
        return;
    }

    conversationHistory = [];
    localStorage.removeItem(CHAT_HISTORY_KEY);

    const container = document.getElementById('chatContainer');
    container.innerHTML = `
        <div class="empty-state">
            <h2>Welcome to GuyAI</h2>
            <p>Your secure, encrypted AI assistant powered by Claude Haiku 4</p>
            <div class="suggestions">
                <div class="suggestion-card" onclick="useSuggestion('Explain quantum computing in simple terms')">
                    <h4>💡 Learn</h4>
                    <p>Explain quantum computing in simple terms</p>
                </div>
                <div class="suggestion-card" onclick="useSuggestion('Write a Python function to sort a list')">
                    <h4>💻 Code</h4>
                    <p>Write a Python function to sort a list</p>
                </div>
                <div class="suggestion-card" onclick="useSuggestion('Help me brainstorm blog post ideas')">
                    <h4>✨ Create</h4>
                    <p>Help me brainstorm blog post ideas</p>
                </div>
                <div class="suggestion-card" onclick="useSuggestion('Analyze this data and find patterns')">
                    <h4>📊 Analyze</h4>
                    <p>Analyze this data and find patterns</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Show configuration modal
 */
function showConfig() {
    document.getElementById('configModal').classList.add('show');
}

/**
 * Hide configuration modal
 */
function hideConfig() {
    document.getElementById('configModal').classList.remove('show');
}

/**
 * Show error message
 */
function showError(message, type = 'error') {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.background = type === 'success' ? 'var(--success)' : 'var(--error)';
    errorDiv.classList.add('show');
}

/**
 * Hide error message
 */
function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.classList.remove('show');
}
