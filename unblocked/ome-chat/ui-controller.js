/**
 * UIController - Handles all DOM manipulation and user interface state
 */
class UIController {
    constructor(chatManager) {
        this.chatManager = chatManager;
        this.panels = {
            setup: document.getElementById('setup-panel'),
            searching: document.getElementById('searching-panel'),
            chat: document.getElementById('chat-panel'),
            ban: document.getElementById('ban-panel'),
            error: document.getElementById('error-panel')
        };
        this.banTimerInterval = null;
        this.toastContainer = document.getElementById('toast-container');
    }

    /**
     * Initialize event listeners
     */
    init() {
        this.setupEventListeners();
        this.updateAnonymousId();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Start button
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.handleStartClick();
            });
        }

        // Cancel search button
        const cancelSearchBtn = document.getElementById('cancel-search-btn');
        if (cancelSearchBtn) {
            cancelSearchBtn.addEventListener('click', () => {
                this.chatManager.cancelSearch();
                this.showPanel('setup');
            });
        }

        // Skip button
        const skipBtn = document.getElementById('skip-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                this.chatManager.skip();
            });
        }

        // Block button
        const blockBtn = document.getElementById('block-btn');
        if (blockBtn) {
            blockBtn.addEventListener('click', () => {
                if (this.chatManager.currentPartnerSessionId) {
                    this.chatManager.blockUser(this.chatManager.currentPartnerSessionId);
                    this.showToast('User blocked for this session', 'warning');
                }
            });
        }

        // Report button
        const reportBtn = document.getElementById('report-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => {
                this.showReportModal();
            });
        }

        // Disconnect button
        const disconnectBtn = document.getElementById('disconnect-btn');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                this.chatManager.disconnect();
                this.showPanel('setup');
            });
        }

        // Send message button
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // Chat input - send on Enter
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Report modal buttons
        const closeReportModal = document.getElementById('close-report-modal');
        if (closeReportModal) {
            closeReportModal.addEventListener('click', () => {
                this.hideReportModal();
            });
        }

        const cancelReportBtn = document.getElementById('cancel-report-btn');
        if (cancelReportBtn) {
            cancelReportBtn.addEventListener('click', () => {
                this.hideReportModal();
            });
        }

        const submitReportBtn = document.getElementById('submit-report-btn');
        if (submitReportBtn) {
            submitReportBtn.addEventListener('click', () => {
                this.submitReport();
            });
        }

        // Modal backdrop click to close
        const modalBackdrop = document.querySelector('#report-modal .modal-backdrop');
        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', () => {
                this.hideReportModal();
            });
        }

        // Public toggle button
        const publicToggleBtn = document.getElementById('public-toggle-btn');
        if (publicToggleBtn) {
            publicToggleBtn.addEventListener('click', () => {
                this.chatManager.togglePublic();
            });
        }

        // Disclaimer accept button
        const disclaimerAcceptBtn = document.getElementById('disclaimer-accept-btn');
        if (disclaimerAcceptBtn) {
            disclaimerAcceptBtn.addEventListener('click', () => {
                this.dismissDisclaimer();
            });
        }

        // Retry button (error panel)
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.showPanel('setup');
            });
        }
    }

    /**
     * Handle start button click
     */
    handleStartClick() {
        // Get preferences
        const preferences = {
            video: document.getElementById('pref-video')?.checked || false,
            audio: document.getElementById('pref-audio')?.checked || false,
            text: document.getElementById('pref-text')?.checked || false
        };

        // Ensure at least one preference is selected
        if (!preferences.video && !preferences.audio && !preferences.text) {
            this.showToast('Please select at least one communication method', 'error');
            return;
        }

        // Update preferences and start searching
        this.chatManager.preferences = preferences;
        this.chatManager.startSearching();
    }

    /**
     * Send a chat message
     */
    sendMessage() {
        const input = document.getElementById('chat-input');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        // Try to send the message
        const result = this.chatManager.sendMessage(text);

        if (result && result.error) {
            if (result.error === 'invalid_chars') {
                this.showToast('Message contains invalid characters', 'error');
            } else if (result.error === 'banned') {
                // Ban panel will be shown by chat manager
                input.value = '';
            } else if (result.error === 'warning') {
                // Warning was shown by chat manager, clear the input
                input.value = '';
            }
        } else {
            // Clear input on success
            input.value = '';
        }
    }

    /**
     * Show a specific panel and hide others
     * @param {string} panelName
     */
    showPanel(panelName) {
        Object.keys(this.panels).forEach(name => {
            if (this.panels[name]) {
                this.panels[name].style.display = name === panelName ? 'block' : 'none';
            }
        });

        // Clear chat messages when going back to setup
        if (panelName === 'setup') {
            this.clearChatMessages();
        }
    }

    /**
     * Update the anonymous ID display
     */
    updateAnonymousId() {
        const idElement = document.getElementById('my-anonymous-id');
        if (idElement && this.chatManager.anonymousId) {
            idElement.textContent = this.chatManager.anonymousId;
        }
    }

    /**
     * Show the chat panel with partner info
     * @param {string} partnerAnonymousId
     */
    showChatPanel(partnerAnonymousId) {
        this.showPanel('chat');

        // Update partner ID display
        const partnerIdElement = document.getElementById('partner-id');
        if (partnerIdElement) {
            partnerIdElement.textContent = partnerAnonymousId;
        }

        // Add system message
        this.addSystemMessage(`Connected to ${partnerAnonymousId}`);

        // Update connection status
        this.updateConnectionStatus('connected');

        // Focus chat input
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.focus();
        }
    }

    /**
     * Update connection status indicator
     * @param {string} status - 'connected', 'connecting', 'disconnected'
     */
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        if (!statusElement) return;

        statusElement.className = 'connection-status ' + status;

        switch (status) {
            case 'connected':
                statusElement.textContent = 'Connected';
                break;
            case 'connecting':
                statusElement.textContent = 'Connecting...';
                break;
            case 'disconnected':
                statusElement.textContent = 'Disconnected';
                break;
        }
    }

    /**
     * Display a received message
     * @param {Object} message
     */
    displayMessage(message) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const isSent = message.senderId === this.chatManager.sessionId;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'message-sent' : 'message-received'}`;

        const senderSpan = document.createElement('span');
        senderSpan.className = 'message-sender';
        senderSpan.textContent = isSent ? 'You' : message.senderName;

        const textSpan = document.createElement('span');
        textSpan.className = 'message-text';
        textSpan.textContent = message.text;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        const time = message.timestamp instanceof Date
            ? message.timestamp
            : new Date();
        timeSpan.textContent = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.appendChild(senderSpan);
        messageDiv.appendChild(textSpan);
        messageDiv.appendChild(timeSpan);

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Add a system message to the chat
     * @param {string} text
     */
    addSystemMessage(text) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-system';
        messageDiv.textContent = text;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Clear all chat messages
     */
    clearChatMessages() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
    }

    /**
     * Show partner disconnected message
     */
    showPartnerDisconnected() {
        this.addSystemMessage('Partner has disconnected.');
        this.updateConnectionStatus('disconnected');

        // Auto-skip after delay
        setTimeout(() => {
            if (this.panels.chat.style.display !== 'none') {
                this.chatManager.skip();
            }
        }, 5000);
    }

    /**
     * Show the ban panel with countdown
     * @param {Date} banUntil
     * @param {string} reason
     */
    showBanPanel(banUntil, reason) {
        this.showPanel('ban');

        // Set reason text
        const reasonElement = document.getElementById('ban-reason');
        if (reasonElement) {
            if (reason === 'profanity') {
                reasonElement.textContent = 'You were banned for using inappropriate language.';
            } else if (reason === 'reports') {
                reasonElement.textContent = 'You were banned due to multiple user reports.';
            } else {
                reasonElement.textContent = 'You have been temporarily banned.';
            }
        }

        // Start countdown timer
        this.startBanTimer(banUntil);
    }

    /**
     * Start the ban countdown timer
     * @param {Date} banUntil
     */
    startBanTimer(banUntil) {
        const timerElement = document.getElementById('ban-timer');
        if (!timerElement) return;

        // Clear any existing timer
        if (this.banTimerInterval) {
            clearInterval(this.banTimerInterval);
        }

        const updateTimer = () => {
            const now = new Date();
            const remaining = banUntil - now;

            if (remaining <= 0) {
                timerElement.textContent = '0:00';
                clearInterval(this.banTimerInterval);
                this.banTimerInterval = null;

                // Show toast and go back to setup
                this.showToast('Your ban has expired. You can now chat again.', 'success');
                setTimeout(() => {
                    this.showPanel('setup');
                }, 1500);
                return;
            }

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };

        // Update immediately and then every second
        updateTimer();
        this.banTimerInterval = setInterval(updateTimer, 1000);
    }

    /**
     * Show the error panel
     * @param {string} message
     */
    showErrorPanel(message) {
        this.showPanel('error');

        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = message || 'An error occurred. Please try again.';
        }
    }

    /**
     * Show the report modal
     */
    showReportModal() {
        const modal = document.getElementById('report-modal');
        if (modal) {
            modal.classList.add('active');

            // Reset radio buttons
            const radios = modal.querySelectorAll('input[type="radio"]');
            radios.forEach(radio => radio.checked = false);
        }
    }

    /**
     * Hide the report modal
     */
    hideReportModal() {
        const modal = document.getElementById('report-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Submit a report
     */
    async submitReport() {
        const selectedReason = document.querySelector('input[name="report-reason"]:checked');

        if (!selectedReason) {
            this.showToast('Please select a reason for the report', 'error');
            return;
        }

        if (!this.chatManager.currentPartnerSessionId) {
            this.showToast('No user to report', 'error');
            this.hideReportModal();
            return;
        }

        try {
            await this.chatManager.reportUser(
                this.chatManager.currentPartnerSessionId,
                selectedReason.value
            );

            this.hideReportModal();
            this.showToast('Report submitted. Finding a new match...', 'success');
        } catch (error) {
            console.error('Error submitting report:', error);
            this.showToast('Failed to submit report', 'error');
        }
    }

    /**
     * Show a toast notification
     * @param {string} message
     * @param {string} type - 'success', 'error', 'warning', 'info'
     */
    showToast(message, type = 'info') {
        if (!this.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const iconSvg = this.getToastIcon(type);
        toast.innerHTML = `
            <div class="toast-icon">${iconSvg}</div>
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;

        this.toastContainer.appendChild(toast);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    }

    /**
     * Get the SVG icon for a toast type
     * @param {string} type
     * @returns {string}
     */
    getToastIcon(type) {
        switch (type) {
            case 'success':
                return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
            case 'error':
                return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
            case 'warning':
                return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
            default:
                return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text
     * @returns {string}
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Update the public toggle button text/style
     * @param {boolean} isPublic
     */
    updatePublicButton(isPublic) {
        const btn = document.getElementById('public-toggle-btn');
        const text = document.getElementById('public-btn-text');
        if (btn) {
            btn.classList.toggle('btn-public-active', isPublic);
        }
        if (text) {
            text.textContent = isPublic ? 'Make Private' : 'Make Public';
        }
    }

    /**
     * Render the list of public rooms in the searching sidebar
     * @param {Array} rooms
     */
    updatePublicRoomsList(rooms) {
        const grid = document.getElementById('public-rooms-grid');
        const countEl = document.getElementById('public-rooms-count');
        if (!grid) return;

        if (countEl) {
            countEl.textContent = rooms.length + ' active';
        }

        // Clear existing cards
        grid.innerHTML = '';

        if (rooms.length === 0) {
            grid.innerHTML = `
                <div class="no-public-rooms">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p>No public rooms available</p>
                    <span>When users make their calls public, they'll appear here</span>
                </div>`;
            return;
        }

        rooms.forEach((room) => {
            const card = document.createElement('div');
            card.className = 'public-room-card';

            const spotsLeft = 10 - room.participantCount;
            card.innerHTML = `
                <div class="room-card-header">
                    <svg class="room-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span class="room-card-count">${room.participantCount}/10</span>
                </div>
                <div class="room-card-spots">${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left</div>
                <button class="btn btn-join-room" data-room-id="${this.escapeHtml(room.roomId)}">Join Room</button>`;

            grid.appendChild(card);
        });

        // Attach join handlers
        grid.querySelectorAll('.btn-join-room').forEach((btn) => {
            btn.addEventListener('click', () => {
                const roomId = btn.getAttribute('data-room-id');
                this.chatManager.joinPublicRoom(roomId);
            });
        });
    }

    /**
     * Update the participants bar in a multi-user room
     * @param {string[]} participants - Array of session IDs
     * @param {string} mySessionId
     */
    updateParticipantsBar(participants, mySessionId) {
        const bar = document.getElementById('participants-bar');
        const countEl = document.getElementById('participant-count');
        const listEl = document.getElementById('participants-list');

        if (!bar || !listEl) return;

        // Show bar if more than 2 participants (or always for public rooms)
        bar.style.display = participants.length > 1 ? 'flex' : 'none';

        if (countEl) {
            countEl.textContent = participants.length + ' in room';
        }

        listEl.innerHTML = '';
        participants.forEach((id) => {
            const avatar = document.createElement('div');
            avatar.className = 'participant-avatar' + (id === mySessionId ? ' me' : '');
            avatar.title = id === mySessionId ? 'You' : id.substring(5, 17);
            // Use initials from the session ID hash for a simple colored avatar
            const hash = id.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0);
            const hue = Math.abs(hash) % 360;
            avatar.style.background = `hsl(${hue}, 60%, 45%)`;
            avatar.textContent = id === mySessionId ? 'You' : '👤';
            listEl.appendChild(avatar);
        });
    }

    /**
     * Dismiss the disclaimer modal
     */
    dismissDisclaimer() {
        const modal = document.getElementById('disclaimer-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Clean up UI state
     */
    cleanup() {
        if (this.banTimerInterval) {
            clearInterval(this.banTimerInterval);
            this.banTimerInterval = null;
        }

        this.clearChatMessages();
    }
}

// Dismiss disclaimer immediately on script load — no dependency on OmeChatManager init.
// The modal is visible via a hardcoded "active" class before any JS runs, so this listener
// must be attached as early as possible rather than waiting for UIController.init().
(function () {
    function attach() {
        const btn = document.getElementById('disclaimer-accept-btn');
        const modal = document.getElementById('disclaimer-modal');
        if (btn && modal) {
            btn.addEventListener('click', function () {
                modal.classList.remove('active');
            });
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
    } else {
        attach();
    }
})();

// Export for use in other modules
window.UIController = UIController;
