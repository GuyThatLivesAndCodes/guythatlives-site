/**
 * Remote PC Control Client
 * Handles computer discovery, selection, and remote control
 */

class RemotePCClient {
    constructor() {
        // Screens
        this.selectionScreen = document.getElementById('selection-screen');
        this.controlScreen = document.getElementById('control-screen');

        // Selection UI
        this.computerList = document.getElementById('computer-list');
        this.refreshButton = document.getElementById('refresh-button');
        this.settingsButton = document.getElementById('settings-button');
        this.discoveryUrlDisplay = document.getElementById('discovery-url');
        this.errorMessage = document.getElementById('error-message');

        // Password Modal
        this.passwordModal = document.getElementById('password-modal');
        this.modalComputerName = document.getElementById('modal-computer-name');
        this.passwordInput = document.getElementById('password-input');
        this.submitPasswordButton = document.getElementById('submit-password-button');
        this.cancelButton = document.getElementById('cancel-button');

        // Control UI
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.statusBar = document.getElementById('status-bar');
        this.statusDot = document.getElementById('status-dot');
        this.statusText = document.getElementById('status-text');
        this.connectionInfo = document.getElementById('connection-info');
        this.canvas = document.getElementById('remote-display');
        this.ctx = this.canvas.getContext('2d');

        // Control Buttons
        this.disconnectButton = document.getElementById('disconnect-button');
        this.fullscreenButton = document.getElementById('fullscreen-button');
        this.lockMouseButton = document.getElementById('lock-mouse-button');

        // State
        this.discoveryUrl = localStorage.getItem('discoveryUrl') || 'http://localhost:8081';
        this.ignoredComputers = new Set(JSON.parse(localStorage.getItem('ignoredComputers') || '[]'));
        this.computers = [];
        this.selectedComputer = null;
        this.ws = null;
        this.isConnected = false;
        this.isMouseLocked = false;

        // Performance tracking
        this.frameCount = 0;
        this.lastFpsUpdate = Date.now();
        this.fps = 0;

        this.init();
    }

    init() {
        // Set discovery URL
        this.discoveryUrlDisplay.textContent = this.discoveryUrl;

        // Setup event listeners
        this.refreshButton.addEventListener('click', () => this.loadComputers());
        this.settingsButton.addEventListener('click', () => this.showSettings());
        this.cancelButton.addEventListener('click', () => this.hidePasswordModal());
        this.submitPasswordButton.addEventListener('click', () => this.submitPassword());
        this.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitPassword();
        });

        // Control buttons
        this.disconnectButton.addEventListener('click', () => this.disconnect());
        this.fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
        this.lockMouseButton.addEventListener('click', () => this.toggleMouseLock());

        // Canvas setup
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Pointer lock events
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('pointerlockerror', () => this.onPointerLockError());

        // Mouse and keyboard events
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseButton(e, true));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseButton(e, false));
        this.canvas.addEventListener('wheel', (e) => this.handleMouseWheel(e));
        this.canvas.addEventListener('click', () => {
            if (this.isConnected && !this.isMouseLocked) {
                this.requestMouseLock();
            }
        });

        document.addEventListener('keydown', (e) => this.handleKeyboard(e, true));
        document.addEventListener('keyup', (e) => this.handleKeyboard(e, false));

        // ESC to show status bar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isConnected) {
                this.statusBar.classList.remove('hidden');
            }
        });

        // Load computers on startup
        this.loadComputers();
    }

    async loadComputers() {
        this.refreshButton.classList.add('loading');
        this.refreshButton.textContent = '🔄 Loading...';

        try {
            const response = await fetch(`${this.discoveryUrl}/computers`);
            const data = await response.json();

            if (data.success) {
                this.computers = data.computers;
                this.renderComputerList();
            } else {
                this.showError('Failed to load computers');
            }
        } catch (error) {
            console.error('Error loading computers:', error);
            this.showError(`Discovery server unavailable at ${this.discoveryUrl}`);
            this.renderEmptyState();
        } finally {
            this.refreshButton.classList.remove('loading');
            this.refreshButton.textContent = '🔄 Refresh';
        }
    }

    renderComputerList() {
        if (this.computers.length === 0) {
            this.renderEmptyState();
            return;
        }

        // Sort: non-ignored first, then ignored at bottom
        const sorted = [...this.computers].sort((a, b) => {
            const aIgnored = this.ignoredComputers.has(a.id);
            const bIgnored = this.ignoredComputers.has(b.id);
            if (aIgnored === bIgnored) return 0;
            return aIgnored ? 1 : -1;
        });

        this.computerList.innerHTML = sorted.map(computer => {
            const isIgnored = this.ignoredComputers.has(computer.id);
            return `
                <div class="computer-item ${isIgnored ? 'ignored' : ''}" data-id="${computer.id}">
                    <div class="computer-info">
                        <div class="computer-name">
                            <span class="status-indicator"></span>
                            ${computer.name}
                        </div>
                        <div class="computer-address">${computer.address}</div>
                        ${computer.metadata ? `
                            <div class="computer-metadata">
                                ${computer.metadata.platform || ''} • ${computer.metadata.hostname || ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="computer-actions">
                        <button class="connect-button" data-action="connect">Connect</button>
                        <button class="ignore-button" data-action="ignore">
                            ${isIgnored ? 'Unignore' : 'Ignore'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners
        document.querySelectorAll('[data-action="connect"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.computer-item').dataset.id;
                this.selectComputer(id);
            });
        });

        document.querySelectorAll('[data-action="ignore"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.computer-item').dataset.id;
                this.toggleIgnore(id);
            });
        });
    }

    renderEmptyState() {
        this.computerList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💤</div>
                <h3>No computers available</h3>
                <p>Start a server and click Refresh to see it here</p>
            </div>
        `;
    }

    selectComputer(id) {
        this.selectedComputer = this.computers.find(c => c.id === id);
        if (this.selectedComputer) {
            this.showPasswordModal(this.selectedComputer);
        }
    }

    toggleIgnore(id) {
        if (this.ignoredComputers.has(id)) {
            this.ignoredComputers.delete(id);
        } else {
            this.ignoredComputers.add(id);
        }

        // Save to localStorage
        localStorage.setItem('ignoredComputers', JSON.stringify([...this.ignoredComputers]));

        // Re-render list
        this.renderComputerList();
    }

    showPasswordModal(computer) {
        this.modalComputerName.textContent = computer.name;
        this.passwordInput.value = '';
        this.passwordModal.classList.add('show');
        this.passwordInput.focus();
    }

    hidePasswordModal() {
        this.passwordModal.classList.remove('show');
        this.selectedComputer = null;
    }

    async submitPassword() {
        const password = this.passwordInput.value;
        if (!password) {
            alert('Please enter a password');
            return;
        }

        this.hidePasswordModal();

        try {
            await this.connect(this.selectedComputer, password);
        } catch (error) {
            this.showError(error.message);
            this.selectedComputer = null;
        }
    }

    showSettings() {
        const newUrl = prompt('Enter Discovery Server URL:', this.discoveryUrl);
        if (newUrl && newUrl !== this.discoveryUrl) {
            this.discoveryUrl = newUrl;
            localStorage.setItem('discoveryUrl', newUrl);
            this.discoveryUrlDisplay.textContent = newUrl;
            this.loadComputers();
        }
    }

    async connect(computer, password) {
        return new Promise((resolve, reject) => {
            try {
                // Show control screen
                this.selectionScreen.style.display = 'none';
                this.controlScreen.classList.add('active');
                this.loadingOverlay.classList.remove('hidden');

                // Create WebSocket connection
                this.ws = new WebSocket(computer.address);

                // Connection timeout
                const timeout = setTimeout(() => {
                    if (!this.isConnected) {
                        this.ws.close();
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);

                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    console.log('WebSocket connected');

                    // Send authentication
                    this.send({
                        type: 'auth',
                        password: password
                    });
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error('WebSocket error:', error);
                    reject(new Error('Failed to connect to server'));
                };

                this.ws.onclose = () => {
                    console.log('WebSocket disconnected');
                    this.handleDisconnect();
                };

                // Store resolve for when auth succeeds
                this.authResolve = resolve;
                this.authReject = reject;

            } catch (error) {
                reject(error);
            }
        });
    }

    handleMessage(data) {
        try {
            if (typeof data === 'string') {
                const message = JSON.parse(data);

                switch (message.type) {
                    case 'auth_success':
                        this.onAuthSuccess();
                        break;

                    case 'auth_failed':
                        this.onAuthFailed(message.reason || 'Invalid password');
                        break;

                    case 'frame':
                        this.renderFrame(message.data);
                        break;

                    case 'screen_info':
                        this.updateScreenInfo(message.data);
                        break;

                    case 'error':
                        console.error('Server error:', message.message);
                        this.showError(message.message);
                        break;

                    default:
                        console.warn('Unknown message type:', message.type);
                }
            } else if (data instanceof Blob) {
                this.renderBinaryFrame(data);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    onAuthSuccess() {
        console.log('Authentication successful');
        this.isConnected = true;

        this.loadingOverlay.classList.add('hidden');
        this.updateStatus('connected', `Connected to ${this.selectedComputer.name}`);
        this.connectionInfo.innerHTML = `<span style="color: var(--success);">${this.selectedComputer.address}</span>`;

        // Auto-hide status bar after 3 seconds
        setTimeout(() => {
            this.statusBar.classList.add('hidden');
        }, 3000);

        if (this.authResolve) {
            this.authResolve();
        }
    }

    onAuthFailed(reason) {
        console.error('Authentication failed:', reason);
        this.showError(reason);
        this.ws.close();

        // Return to selection screen
        this.selectionScreen.style.display = 'flex';
        this.controlScreen.classList.remove('active');

        if (this.authReject) {
            this.authReject(new Error(reason));
        }
    }

    renderFrame(frameData) {
        const img = new Image();
        img.onload = () => {
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            this.updateFps();
        };
        img.src = 'data:image/jpeg;base64,' + frameData;
    }

    async renderBinaryFrame(blob) {
        const img = new Image();
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            URL.revokeObjectURL(url);
            this.updateFps();
        };

        img.src = url;
    }

    updateScreenInfo(info) {
        console.log('Screen info:', info);
    }

    updateFps() {
        this.frameCount++;
        const now = Date.now();
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;

            if (this.isConnected && this.selectedComputer) {
                this.connectionInfo.innerHTML = `
                    <span style="color: var(--success);">${this.selectedComputer.name}</span>
                    <span style="color: var(--text-dim); margin-left: 1rem;">${this.fps} FPS</span>
                `;
            }
        }
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    handleMouseMove(e) {
        if (!this.isConnected || !this.isMouseLocked) return;

        this.send({
            type: 'mouse_move',
            x: e.movementX,
            y: e.movementY
        });
    }

    handleMouseButton(e, isDown) {
        if (!this.isConnected || !this.isMouseLocked) return;

        e.preventDefault();

        this.send({
            type: 'mouse_button',
            button: e.button,
            down: isDown
        });
    }

    handleMouseWheel(e) {
        if (!this.isConnected || !this.isMouseLocked) return;

        e.preventDefault();

        this.send({
            type: 'mouse_wheel',
            deltaX: e.deltaX,
            deltaY: e.deltaY
        });
    }

    handleKeyboard(e, isDown) {
        if (!this.isConnected || !this.isMouseLocked) return;

        if (e.key !== 'Escape') {
            e.preventDefault();
        }

        this.send({
            type: 'keyboard',
            key: e.key,
            code: e.code,
            keyCode: e.keyCode,
            down: isDown,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            metaKey: e.metaKey
        });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.controlScreen.requestFullscreen();
            this.fullscreenButton.textContent = 'Exit Fullscreen';
        } else {
            document.exitFullscreen();
            this.fullscreenButton.textContent = 'Fullscreen';
        }
    }

    toggleMouseLock() {
        if (this.isMouseLocked) {
            document.exitPointerLock();
        } else {
            this.requestMouseLock();
        }
    }

    requestMouseLock() {
        if (!this.isConnected) return;
        this.canvas.requestPointerLock();
    }

    onPointerLockChange() {
        this.isMouseLocked = document.pointerLockElement === this.canvas;

        if (this.isMouseLocked) {
            this.lockMouseButton.textContent = 'Unlock Mouse';
            this.statusBar.classList.add('hidden');
        } else {
            this.lockMouseButton.textContent = 'Lock Mouse';
            this.statusBar.classList.remove('hidden');
        }
    }

    onPointerLockError() {
        console.error('Pointer lock failed');
        this.showError('Failed to lock mouse pointer');
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        this.handleDisconnect();
    }

    handleDisconnect() {
        this.isConnected = false;
        this.isMouseLocked = false;

        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        if (document.fullscreenElement) {
            document.exitFullscreen();
        }

        this.updateStatus('disconnected', 'Disconnected');
        this.selectionScreen.style.display = 'flex';
        this.controlScreen.classList.remove('active');
        this.selectedComputer = null;

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Reload computers
        this.loadComputers();
    }

    updateStatus(status, text) {
        this.statusText.textContent = text;

        if (status === 'connected') {
            this.statusDot.classList.add('connected');
        } else {
            this.statusDot.classList.remove('connected');
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.add('show');

        setTimeout(() => {
            this.errorMessage.classList.remove('show');
        }, 5000);
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
}

// Initialize client when page loads
const client = new RemotePCClient();
