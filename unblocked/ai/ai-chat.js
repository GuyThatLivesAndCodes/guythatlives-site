/**
 * AI Chat Frontend - Cloudflare Workers AI
 * Session-based chat with file upload support
 */

// Configuration
// IMPORTANT: Deploy the Cloudflare Worker first, then update this URL
// See /workers/README.md for deployment instructions
const WORKER_URL = 'https://ai-chat-worker.zorbyteofficial.workers.dev'; // Update this after deploying worker
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// GitHub Pages Note: This site is static HTML/JS hosted on GitHub Pages
// The Cloudflare Worker handles all AI processing separately
// This keeps your GitHub repo clean and your API secure!

// State
let chatBranch = null; // Will be initialized in DOMContentLoaded
let attachedFiles = [];
let isGenerating = false;
let abortController = null;
let editingNodeId = null; // Track if we're editing a message

// DOM Elements
const messagesContainer = document.getElementById('messages-container');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const fileAttachmentsContainer = document.getElementById('file-attachments');
const clearChatBtn = document.getElementById('clear-chat-btn');
const modelSelect = document.getElementById('model-select');
const typingIndicator = document.getElementById('typing-indicator');
const streamingText = document.getElementById('streaming-text');
const welcomeMessage = document.getElementById('welcome-message');
const errorMessage = document.getElementById('error-message');
const branchTreeContent = document.getElementById('branch-tree-content');
const stopGenerationBtn = document.querySelector('.stop-generation-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize branching system
    chatBranch = new ChatBranch();

    // Configure marked.js for markdown parsing
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true,
            highlight: function(code, lang) {
                if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (err) {}
                }
                return code;
            }
        });
    }

    // Ensure typing indicator is at the very end
    if (typingIndicator && messagesContainer) {
        messagesContainer.appendChild(typingIndicator);
    }

    loadChatFromSession();
    setupEventListeners();
    autoResizeTextarea();
    updateBranchSelector();
});

// Setup event listeners
function setupEventListeners() {
    // Send message
    sendBtn.addEventListener('click', sendMessage);

    // Input events
    chatInput.addEventListener('input', () => {
        autoResizeTextarea();
        updateSendButton();
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        } else if (e.key === 'Escape' && editingNodeId) {
            e.preventDefault();
            cancelEdit();
        }
    });

    // File upload
    attachBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    // Clear chat
    clearChatBtn.addEventListener('click', async () => {
        const confirmed = await showConfirm(
            'Clear Chat History?',
            'This will permanently delete all messages from this session. This action cannot be undone.'
        );
        if (confirmed) {
            clearChat();
        }
    });

    // Model change
    modelSelect.addEventListener('change', () => {
        sessionStorage.setItem('selectedModel', modelSelect.value);
        updateModelInfo();
    });

    // Initial model info update
    updateModelInfo();

    // Stop generation button
    if (stopGenerationBtn) {
        stopGenerationBtn.addEventListener('click', stopGeneration);
    }
}

// Auto-resize textarea
function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
}

// Update send button state
function updateSendButton() {
    const hasText = chatInput.value.trim().length > 0;
    const hasFiles = attachedFiles.length > 0;
    sendBtn.disabled = !hasText && !hasFiles;
}

// Update model info display
function updateModelInfo() {
    const selectedOption = modelSelect.options[modelSelect.selectedIndex];
    const hasText = selectedOption.dataset.text === 'true';
    const hasVision = selectedOption.dataset.vision === 'true';

    const modelInfo = document.getElementById('model-info');
    let badgesHTML = '';

    if (hasText) {
        badgesHTML += '<span class="capability-badge text"><span class="icon-text"></span> Text Chat</span>';
    }

    if (hasVision) {
        badgesHTML += '<span class="capability-badge vision"><span class="icon-vision"></span> Image Reading</span>';
    }

    modelInfo.innerHTML = badgesHTML;
}

// Handle file selection
async function handleFileSelect(e) {
    const files = Array.from(e.target.files);

    for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
            showError(`File "${file.name}" is too large. Maximum size is 5MB.`);
            continue;
        }

        try {
            const fileData = await readFileAsBase64(file);

            attachedFiles.push({
                name: file.name,
                type: file.type,
                size: file.size,
                data: fileData
            });

            renderFileAttachment(file);
        } catch (error) {
            showError(`Failed to read file "${file.name}"`);
            console.error(error);
        }
    }

    updateSendButton();
    fileInput.value = '';
}

// Read file as base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Render file attachment preview
function renderFileAttachment(file) {
    const attachmentEl = document.createElement('div');
    attachmentEl.className = 'file-attachment-item';
    attachmentEl.innerHTML = `
        <span>📄 ${file.name}</span>
        <button onclick="removeAttachment('${file.name}')">✕</button>
    `;

    fileAttachmentsContainer.appendChild(attachmentEl);
}

// Remove attachment
function removeAttachment(fileName) {
    attachedFiles = attachedFiles.filter(f => f.name !== fileName);

    // Remove from DOM
    const attachmentEls = fileAttachmentsContainer.querySelectorAll('.file-attachment-item');
    attachmentEls.forEach(el => {
        if (el.textContent.includes(fileName)) {
            el.remove();
        }
    });

    updateSendButton();
}

// Send message
async function sendMessage() {
    const text = chatInput.value.trim();

    if (!text && attachedFiles.length === 0) return;

    // Hide welcome message
    welcomeMessage.style.display = 'none';

    // Clear error
    hideError();

    // Create user message
    const userMessage = {
        role: 'user',
        content: text,
        attachments: [...attachedFiles],
        timestamp: Date.now()
    };

    // Add to branch tree
    let node;
    if (editingNodeId) {
        // Editing a message - create branch
        node = chatBranch.createBranch(editingNodeId, userMessage);
        if (!node) {
            showError('Failed to create branch. Please try again.');
            editingNodeId = null;
            sendBtn.innerHTML = '➤';
            sendBtn.classList.remove('editing');
            return;
        }
        // Clear editing state
        editingNodeId = null;
        sendBtn.innerHTML = '➤';
        sendBtn.classList.remove('editing');
        // Re-render all messages for the new branch
        renderCurrentBranch();
    } else {
        // Normal message
        node = chatBranch.addMessage(userMessage);
        if (!node) {
            showError('Failed to add message. Please try again.');
            return;
        }
        // Render just the new user message
        renderMessage(userMessage, node.id);
    }

    // Clear input
    chatInput.value = '';
    attachedFiles = [];
    fileAttachmentsContainer.innerHTML = '';
    autoResizeTextarea();
    updateSendButton();

    // Show typing indicator at bottom (AFTER user message)
    isGenerating = true;
    typingIndicator.classList.add('active');
    streamingText.innerHTML = '<span class="streaming-cursor"></span>';
    if (stopGenerationBtn) {
        stopGenerationBtn.style.display = 'flex';
    }

    // Move typing indicator to the end of messages container
    messagesContainer.appendChild(typingIndicator);
    scrollToBottom();

    try {
        // Prepare messages for API
        const apiMessages = prepareMessagesForAPI();

        // Get selected model
        const selectedModel = modelSelect.value;

        // Create abort controller for stop functionality
        abortController = new AbortController();

        // Call AI
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: apiMessages,
                model: selectedModel,
                temperature: 0.7,
                max_tokens: 2048
            }),
            signal: abortController.signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to get AI response');
        }

        // Simulate streaming effect for better UX
        await streamResponse(data.response);

        // Create AI message
        const aiMessage = {
            role: 'assistant',
            content: data.response,
            model: data.model,
            timestamp: Date.now()
        };

        // Add to branch tree
        const aiNode = chatBranch.addMessage(aiMessage);

        // Hide typing indicator
        isGenerating = false;
        typingIndicator.classList.remove('active');
        if (stopGenerationBtn) {
            stopGenerationBtn.style.display = 'none';
        }

        // Render AI message
        renderMessage(aiMessage, aiNode.id);

        // Update branch selector
        updateBranchSelector();

        // Save to session
        saveChatToSession();

    } catch (error) {
        if (error.name === 'AbortError') {
            // User stopped generation - keep partial response if any
            const partialText = streamingText.textContent || streamingText.innerText;
            if (partialText && partialText.trim()) {
                const partialMessage = {
                    role: 'assistant',
                    content: partialText.trim(),
                    model: modelSelect.value,
                    timestamp: Date.now(),
                    partial: true
                };
                const aiNode = chatBranch.addMessage(partialMessage);
                typingIndicator.classList.remove('active');
                if (aiNode) {
                    renderMessage(partialMessage, aiNode.id);
                    saveChatToSession();
                }
            } else {
                // No partial response, remove user message
                if (node) {
                    chatBranch.deleteBranch(node.id);
                    renderCurrentBranch();
                }
            }
        } else {
            console.error('Error sending message:', error);
            showError('Failed to get AI response. Please try again.');

            // Remove last user message from branch if failed
            if (node) {
                chatBranch.deleteBranch(node.id);
                renderCurrentBranch();
            }
        }
    } finally {
        // Hide typing indicator
        isGenerating = false;
        typingIndicator.classList.remove('active');
        streamingText.textContent = '';
        if (stopGenerationBtn) {
            stopGenerationBtn.style.display = 'none';
        }
        abortController = null;
        scrollToBottom();
    }
}

// Prepare messages for API (convert current branch to API format)
function prepareMessagesForAPI() {
    const messages = chatBranch.getMessagesInBranch();
    return messages.map(msg => {
        let content = msg.content;

        // For vision models, include image attachments
        if (msg.attachments && msg.attachments.length > 0) {
            const imageAttachments = msg.attachments.filter(f => f.type.startsWith('image/'));
            if (imageAttachments.length > 0) {
                content += '\n\n[Attached images: ' + imageAttachments.map(f => f.name).join(', ') + ']';
                // Note: Full vision support requires additional API formatting
            }
        }

        return {
            role: msg.role,
            content: content
        };
    });
}

// Render message
function renderMessage(message, nodeId) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.role}`;
    messageEl.dataset.nodeId = nodeId;

    const avatar = message.role === 'user' ? '👤' : '🤖';

    let attachmentsHTML = '';
    if (message.attachments && message.attachments.length > 0) {
        attachmentsHTML = '<div class="message-attachments">';
        message.attachments.forEach(file => {
            if (file.type.startsWith('image/')) {
                attachmentsHTML += `<img src="${file.data}" alt="${escapeHtml(file.name)}" class="attachment-preview">`;
            } else {
                attachmentsHTML += `<div class="attachment-file">📄 ${escapeHtml(file.name)}</div>`;
            }
        });
        attachmentsHTML += '</div>';
    }

    // For AI messages, parse markdown. For user messages, escape HTML
    let contentHTML;
    if (message.role === 'assistant' && typeof marked !== 'undefined') {
        contentHTML = marked.parse(message.content);
    } else {
        contentHTML = escapeHtml(message.content).replace(/\n/g, '<br>');
    }

    // Message actions (edit for user, regenerate for assistant)
    let actionsHTML = '';
    if (message.role === 'user') {
        actionsHTML = `
            <div class="message-actions">
                <button class="message-action-btn" onclick="editMessage('${nodeId}')" title="Edit message">
                    ✏️ Edit
                </button>
            </div>
        `;
    } else if (message.role === 'assistant') {
        actionsHTML = `
            <div class="message-actions">
                <button class="message-action-btn" onclick="regenerateMessage('${nodeId}')" title="Regenerate response">
                    🔄 Regenerate
                </button>
            </div>
        `;
    }

    messageEl.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-text">${contentHTML}</div>
            ${attachmentsHTML}
            ${actionsHTML}
        </div>
    `;

    // Insert before typing indicator if it exists, otherwise append
    if (typingIndicator.parentNode === messagesContainer) {
        messagesContainer.insertBefore(messageEl, typingIndicator);
    } else {
        messagesContainer.appendChild(messageEl);
    }

    // Highlight code blocks if hljs is available
    if (typeof hljs !== 'undefined' && message.role === 'assistant') {
        messageEl.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }

    scrollToBottom();
}

// Scroll to bottom
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Stream response text with typing effect and markdown formatting
async function streamResponse(text) {
    const words = text.split(' ');
    let displayedText = '';

    for (let i = 0; i < words.length; i++) {
        displayedText += (i > 0 ? ' ' : '') + words[i];

        // Parse markdown in real-time
        if (typeof marked !== 'undefined') {
            streamingText.innerHTML = marked.parse(displayedText);

            // Highlight code blocks as they appear
            if (typeof hljs !== 'undefined') {
                streamingText.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }
        } else {
            streamingText.textContent = displayedText;
        }

        // Add cursor at the end
        const cursor = document.createElement('span');
        cursor.className = 'streaming-cursor';
        streamingText.appendChild(cursor);

        scrollToBottom();

        // Vary speed based on word length (faster for short words)
        const delay = words[i].length > 8 ? 40 : 20;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Show complete formatted text briefly before replacing with final message
    await new Promise(resolve => setTimeout(resolve, 200));
}

// Use suggested prompt
function useSuggestedPrompt(prompt) {
    chatInput.value = prompt;
    autoResizeTextarea();
    updateSendButton();
    chatInput.focus();
}

// Clear chat
function clearChat() {
    chatBranch = new ChatBranch();
    messagesContainer.innerHTML = `
        <div class="welcome-message" id="welcome-message">
            <h2>Welcome to AI Chat! 👋</h2>
            <p>Choose a model and start chatting. You can upload files, ask questions, or try one of these:</p>
            <div class="suggested-prompts">
                <div class="suggested-prompt" onclick="useSuggestedPrompt('Explain quantum computing in simple terms')">
                    <div class="suggested-prompt-title">💡 Explain Concepts</div>
                    <div class="suggested-prompt-text">Explain quantum computing in simple terms</div>
                </div>
                <div class="suggested-prompt" onclick="useSuggestedPrompt('Write a creative short story about time travel')">
                    <div class="suggested-prompt-title">✍️ Creative Writing</div>
                    <div class="suggested-prompt-text">Write a creative short story about time travel</div>
                </div>
                <div class="suggested-prompt" onclick="useSuggestedPrompt('Help me debug this JavaScript code')">
                    <div class="suggested-prompt-title">💻 Code Help</div>
                    <div class="suggested-prompt-text">Help me debug this JavaScript code</div>
                </div>
                <div class="suggested-prompt" onclick="useSuggestedPrompt('What are some healthy meal ideas for the week?')">
                    <div class="suggested-prompt-title">🍽️ General Help</div>
                    <div class="suggested-prompt-text">What are some healthy meal ideas for the week?</div>
                </div>
            </div>
        </div>
        <div class="typing-indicator" id="typing-indicator">
            <div class="typing-message">
                <div class="typing-avatar">🤖</div>
                <div class="typing-content">
                    <div class="typing-header">
                        <div class="typing-dots">
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                        </div>
                        <span>Generating response...</span>
                    </div>
                    <div class="streaming-text" id="streaming-text"></div>
                </div>
            </div>
        </div>
    `;
    if (branchTreeContent) {
        branchTreeContent.innerHTML = '';
    }
    sessionStorage.removeItem('chatBranchTree');
}

// Save chat to session storage
function saveChatToSession() {
    const treeData = chatBranch.exportTree();
    sessionStorage.setItem('chatBranchTree', JSON.stringify(treeData));
}

// Load chat from session storage
function loadChatFromSession() {
    const savedTree = sessionStorage.getItem('chatBranchTree');
    const savedModel = sessionStorage.getItem('selectedModel');

    if (savedModel) {
        modelSelect.value = savedModel;
    }

    if (savedTree) {
        try {
            const treeData = JSON.parse(savedTree);
            const success = chatBranch.importTree(treeData);

            if (success) {
                const messages = chatBranch.getMessagesInBranch();
                if (messages.length > 0) {
                    welcomeMessage.style.display = 'none';
                    renderCurrentBranch();
                    updateBranchSelector();
                }
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
            // Reset to clean state on load error
            chatBranch = new ChatBranch();
        }
    }
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('visible');

    setTimeout(() => {
        hideError();
    }, 5000);
}

// Hide error message
function hideError() {
    errorMessage.classList.remove('visible');
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Custom Confirmation Dialog
function showConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');

        titleEl.textContent = title;
        messageEl.textContent = message;

        modal.classList.add('active');

        function cleanup() {
            modal.classList.remove('active');
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            modal.removeEventListener('click', handleBackdrop);
        }

        function handleOk() {
            cleanup();
            resolve(true);
        }

        function handleCancel() {
            cleanup();
            resolve(false);
        }

        function handleBackdrop(e) {
            if (e.target === modal) {
                cleanup();
                resolve(false);
            }
        }

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        modal.addEventListener('click', handleBackdrop);

        // Focus OK button
        setTimeout(() => okBtn.focus(), 100);
    });
}

// Render current branch (all messages)
function renderCurrentBranch() {
    // Clear messages (keep welcome and typing indicator)
    const messagesToRemove = messagesContainer.querySelectorAll('.message');
    messagesToRemove.forEach(msg => msg.remove());

    // Get current branch messages
    const messages = chatBranch.getMessagesInBranch();

    // Render each message
    const path = chatBranch.currentBranchPath;
    let nodeIndex = 1; // Skip root

    messages.forEach((msg, i) => {
        const nodeId = path[nodeIndex];
        renderMessage(msg, nodeId);
        nodeIndex++;
    });

    updateBranchSelector();
}

// Edit message
function editMessage(nodeId) {
    const node = chatBranch.findNode(nodeId);
    if (!node || !node.message) return;

    // Set editing state
    editingNodeId = node.parent ? node.parent.id : null;

    // Fill input with message content
    chatInput.value = node.message.content;
    autoResizeTextarea();
    updateSendButton();
    chatInput.focus();

    // Change send button to show it's editing
    sendBtn.innerHTML = '↻ Send Edit';
    sendBtn.classList.add('editing');
}

// Cancel edit
function cancelEdit() {
    editingNodeId = null;
    sendBtn.innerHTML = '➤';
    sendBtn.classList.remove('editing');
    chatInput.value = '';
    autoResizeTextarea();
    updateSendButton();
}

// Regenerate message
async function regenerateMessage(nodeId) {
    const node = chatBranch.findNode(nodeId);
    if (!node || !node.parent) return;

    // Get the user message that prompted this response
    const userNode = node.parent;
    if (!userNode || !userNode.message || userNode.message.role !== 'user') return;

    // Create a new branch from the user message
    const userMessage = userNode.message;
    const newNode = chatBranch.createBranch(userNode.id, {
        ...userMessage,
        regenerated: true,
        regenerationOf: nodeId
    });

    if (!newNode) {
        showError('Failed to create branch for regeneration.');
        return;
    }

    // Re-render the branch
    renderCurrentBranch();

    // Show typing indicator
    isGenerating = true;
    typingIndicator.classList.add('active');
    streamingText.innerHTML = '<span class="streaming-cursor"></span>';
    if (stopGenerationBtn) {
        stopGenerationBtn.style.display = 'flex';
    }
    messagesContainer.appendChild(typingIndicator);
    scrollToBottom();

    try {
        // Prepare messages for API
        const apiMessages = prepareMessagesForAPI();

        // Get selected model
        const selectedModel = modelSelect.value;

        // Create abort controller
        abortController = new AbortController();

        // Call AI
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: apiMessages,
                model: selectedModel,
                temperature: 0.7,
                max_tokens: 2048
            }),
            signal: abortController.signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to get AI response');
        }

        // Simulate streaming
        await streamResponse(data.response);

        // Create AI message
        const aiMessage = {
            role: 'assistant',
            content: data.response,
            model: data.model,
            timestamp: Date.now(),
            regenerated: true
        };

        // Add to branch
        const aiNode = chatBranch.addMessage(aiMessage);

        // Hide typing indicator
        isGenerating = false;
        typingIndicator.classList.remove('active');
        if (stopGenerationBtn) {
            stopGenerationBtn.style.display = 'none';
        }

        // Render AI message
        renderMessage(aiMessage, aiNode.id);

        // Update branch selector
        updateBranchSelector();

        // Save
        saveChatToSession();

    } catch (error) {
        if (error.name === 'AbortError') {
            const partialText = streamingText.textContent || streamingText.innerText;
            if (partialText && partialText.trim()) {
                const partialMessage = {
                    role: 'assistant',
                    content: partialText.trim(),
                    model: modelSelect.value,
                    timestamp: Date.now(),
                    partial: true,
                    regenerated: true
                };
                const aiNode = chatBranch.addMessage(partialMessage);
                typingIndicator.classList.remove('active');
                if (aiNode) {
                    renderMessage(partialMessage, aiNode.id);
                    saveChatToSession();
                }
            } else {
                if (newNode) {
                    chatBranch.deleteBranch(newNode.id);
                    renderCurrentBranch();
                }
            }
        } else {
            console.error('Error regenerating:', error);
            showError('Failed to regenerate response. Please try again.');
            if (newNode) {
                chatBranch.deleteBranch(newNode.id);
                renderCurrentBranch();
            }
        }
    } finally {
        isGenerating = false;
        typingIndicator.classList.remove('active');
        streamingText.textContent = '';
        if (stopGenerationBtn) {
            stopGenerationBtn.style.display = 'none';
        }
        abortController = null;
        scrollToBottom();
    }
}

// Stop generation
function stopGeneration() {
    if (isGenerating && abortController) {
        abortController.abort();
    }
}

// Update branch selector UI (now renders tree)
function updateBranchSelector() {
    if (!branchTreeContent) {
        console.warn('Branch tree content element not found');
        return;
    }

    if (!chatBranch) {
        console.warn('Chat branch not initialized');
        return;
    }

    // Render the entire tree structure
    branchTreeContent.innerHTML = '';

    const messages = chatBranch.getMessagesInBranch();
    console.log('Updating branch tree, messages:', messages.length);

    if (messages.length === 0) {
        branchTreeContent.innerHTML = `
            <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
                Start a conversation to see the branch tree
            </div>
        `;
        return;
    }

    console.log('Rendering tree, root children:', chatBranch.tree.children.length);
    renderBranchTree(chatBranch.tree, branchTreeContent, 0);
    console.log('Tree rendered, content HTML length:', branchTreeContent.innerHTML.length);
}

// Render branch tree recursively
function renderBranchTree(node, container, depth = 0) {
    // Skip root node with no message - render children directly
    if (!node.message && node.id === 'root') {
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                renderBranchTree(child, container, 0);
            });
        }
        return;
    }

    // Must have a message to render
    const message = node.message;
    if (!message) return;

    const nodeEl = document.createElement('div');
    nodeEl.className = 'branch-node';

    const isCurrent = chatBranch.currentNode && chatBranch.currentNode.id === node.id;

    // Create preview text
    let preview = message.content.substring(0, 30);
    if (message.content.length > 30) preview += '...';

    const roleClass = message.role === 'user' ? 'user' : 'assistant';
    const roleIcon = message.role === 'user' ? '👤' : '🤖';

    nodeEl.innerHTML = `
        <div class="branch-node-content ${isCurrent ? 'active' : ''}" data-node-id="${node.id}">
            <div class="branch-message-preview ${roleClass}">
                ${roleIcon} ${escapeHtml(preview)}
            </div>
            ${node.children && node.children.length > 1 ? `<div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 0.25rem;">🔀 ${node.children.length} branches</div>` : ''}
        </div>
    `;

    // Click to switch to this branch
    const contentEl = nodeEl.querySelector('.branch-node-content');
    contentEl.addEventListener('click', () => {
        switchBranch(node.id);
    });

    container.appendChild(nodeEl);

    // Render children
    if (node.children && node.children.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'branch-children';

        node.children.forEach(child => {
            renderBranchTree(child, childrenContainer, depth + 1);
        });

        container.appendChild(childrenContainer);
    }
}

// Switch branch
function switchBranch(branchId) {
    chatBranch.switchToBranch(branchId);
    renderCurrentBranch();
}

// Delete branch
async function deleteBranch(branchId) {
    const confirmed = await showConfirm(
        'Delete Branch?',
        'This will permanently delete this conversation branch. This action cannot be undone.'
    );

    if (confirmed) {
        chatBranch.deleteBranch(branchId);
        renderCurrentBranch();
        saveChatToSession();
    }
}

// Make functions global
window.useSuggestedPrompt = useSuggestedPrompt;
window.removeAttachment = removeAttachment;
window.showConfirm = showConfirm;
window.editMessage = editMessage;
window.cancelEdit = cancelEdit;
window.regenerateMessage = regenerateMessage;
window.switchBranch = switchBranch;
window.deleteBranch = deleteBranch;
