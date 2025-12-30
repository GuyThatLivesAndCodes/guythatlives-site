/**
 * Remote PC Control Client
 * Handles WebSocket connection, pointer lock, and input forwarding
 */

class RemotePCClient {
    constructor() {
        // UI Elements
        this.authScreen = document.getElementById('auth-screen');
        this.controlScreen = document.getElementById('control-screen');
        this.authForm = document.getElementById('auth-form');
        this.errorMessage = document.getElementById('error-message');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.statusBar = document.getElementById('status-bar');
        this.statusDot = document.getElementById('status-dot');
        this.statusText = document.getElementById('status-text');
        this.connectionInfo = document.getElementById('connection-info');
        this.canvas = document.getElementById('remote-display');
        this.ctx = this.canvas.getContext('2d');

        // Buttons
        this.connectButton = document.getElementById('connect-button');
        this.disconnectButton = document.getElementById('disconnect-button');
        this.fullscreenButton = document.getElementById('fullscreen-button');
        this.lockMouseButton = document.getElementById('lock-mouse-button');

        // Connection state
        this.ws = null;
        this.isConnected = false;
        this.isMouseLocked = false;
        this.serverAddress = '';
        this.password = '';

        // Performance tracking
        this.frameCount = 0;
        this.lastFpsUpdate = Date.now();
        this.fps = 0;

        this.init();
    }

    init() {
        // Setup event listeners
        this.authForm.addEventListener('submit', (e) => this.handleAuth(e));
        this.disconnectButton.addEventListener('click', () => this.disconnect());
        this.fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
        this.lockMouseButton.addEventListener('click', () => this.toggleMouseLock());

        // Canvas sizing
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Pointer lock change events
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('pointerlockerror', () => this.onPointerLockError());

        // Mouse and keyboard events (only when connected and pointer locked)
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
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    async handleAuth(e) {
        e.preventDefault();

        const passwordInput = document.getElementById('password');
        const serverInput = document.getElementById('server-address');

        this.password = passwordInput.value.trim();
        this.serverAddress = serverInput.value.trim();

        if (!this.password) {
            this.showError('Password is required');
            return;
        }

        if (!this.serverAddress) {
            this.showError('Server address is required');
            return;
        }

        this.connectButton.disabled = true;
        this.connectButton.textContent = 'Connecting...';

        try {
            await this.connect();
        } catch (error) {
            this.showError(error.message);
            this.connectButton.disabled = false;
            this.connectButton.textContent = 'Connect to PC';
        }
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                // Create WebSocket connection
                this.ws = new WebSocket(this.serverAddress);

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
                        password: this.password
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
            // Check if it's a JSON message
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
                // Handle binary frame data
                this.renderBinaryFrame(data);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    onAuthSuccess() {
        console.log('Authentication successful');
        this.isConnected = true;

        // Hide auth screen, show control screen
        this.authScreen.style.display = 'none';
        this.controlScreen.classList.add('active');
        this.loadingOverlay.classList.add('hidden');

        // Update status
        this.updateStatus('connected', 'Connected');
        this.connectionInfo.innerHTML = `<span style="color: var(--success);">${this.serverAddress}</span>`;

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

        this.connectButton.disabled = false;
        this.connectButton.textContent = 'Connect to PC';

        if (this.authReject) {
            this.authReject(new Error(reason));
        }
    }

    renderFrame(frameData) {
        // Render base64 encoded image
        const img = new Image();
        img.onload = () => {
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            this.updateFps();
        };
        img.src = 'data:image/jpeg;base64,' + frameData;
    }

    async renderBinaryFrame(blob) {
        // Render binary image data
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
        // Could use this to adjust canvas size to match remote screen
    }

    updateFps() {
        this.frameCount++;
        const now = Date.now();
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;

            // Update connection info with FPS
            if (this.isConnected) {
                this.connectionInfo.innerHTML = `
                    <span style="color: var(--success);">${this.serverAddress}</span>
                    <span style="color: var(--text-dim); margin-left: 1rem;">${this.fps} FPS</span>
                `;
            }
        }
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
            button: e.button, // 0=left, 1=middle, 2=right
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

        // Don't prevent ESC key
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

        // Exit pointer lock if active
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Exit fullscreen if active
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }

        // Update UI
        this.updateStatus('disconnected', 'Disconnected');
        this.authScreen.style.display = 'flex';
        this.controlScreen.classList.remove('active');
        this.connectButton.disabled = false;
        this.connectButton.textContent = 'Connect to PC';

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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
