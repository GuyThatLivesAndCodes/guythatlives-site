/**
 * Remote PC Control Server
 * Runs on the home PC to accept remote connections and control
 */

const WebSocket = require('ws');
const screenshot = require('screenshot-desktop');
const robot = require('robotjs');
const http = require('http');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 8080;
const PASSWORD = process.env.PASSWORD || 'changeme';
const SCREEN_FPS = parseInt(process.env.SCREEN_FPS) || 30;
const SCREEN_QUALITY = parseInt(process.env.SCREEN_QUALITY) || 60;
const FRAME_INTERVAL = 1000 / SCREEN_FPS;

// Create HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Remote PC Server</title>
            <style>
                body {
                    font-family: monospace;
                    background: #0a0e27;
                    color: #64ffda;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                }
                .status {
                    text-align: center;
                    padding: 2rem;
                    border: 2px solid #64ffda;
                    border-radius: 12px;
                    background: #151932;
                }
                h1 { margin-top: 0; }
                .info { color: #8892b0; margin: 1rem 0; }
                .active { color: #51cf66; }
            </style>
        </head>
        <body>
            <div class="status">
                <h1>🖥️ Remote PC Server</h1>
                <p class="info">Server is running on port ${PORT}</p>
                <p class="info">Status: <span class="active">Active</span></p>
                <p class="info">Connect from: <code>ws://localhost:${PORT}</code></p>
                <p class="info">or <code>ws://[your-ip]:${PORT}</code></p>
            </div>
        </body>
        </html>
    `);
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

console.log('═══════════════════════════════════════════════');
console.log('🖥️  Remote PC Control Server');
console.log('═══════════════════════════════════════════════');
console.log(`Port: ${PORT}`);
console.log(`Screen FPS: ${SCREEN_FPS}`);
console.log(`Screen Quality: ${SCREEN_QUALITY}%`);
console.log('═══════════════════════════════════════════════');

// Store authenticated clients
const authenticatedClients = new Set();

// Screen streaming
let streamingClients = new Map();

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[${new Date().toISOString()}] New connection from ${clientIp}`);

    let isAuthenticated = false;
    let streamInterval = null;

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());

            // Handle authentication first
            if (!isAuthenticated && message.type !== 'auth') {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Authentication required'
                }));
                return;
            }

            switch (message.type) {
                case 'auth':
                    handleAuth(ws, message.password);
                    break;

                case 'mouse_move':
                    handleMouseMove(message);
                    break;

                case 'mouse_button':
                    handleMouseButton(message);
                    break;

                case 'mouse_wheel':
                    handleMouseWheel(message);
                    break;

                case 'keyboard':
                    handleKeyboard(message);
                    break;

                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });

    ws.on('close', () => {
        console.log(`[${new Date().toISOString()}] Client disconnected: ${clientIp}`);
        authenticatedClients.delete(ws);
        stopStreaming(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    function handleAuth(ws, password) {
        if (password === PASSWORD) {
            isAuthenticated = true;
            authenticatedClients.add(ws);

            ws.send(JSON.stringify({
                type: 'auth_success'
            }));

            console.log(`[${new Date().toISOString()}] Client authenticated: ${clientIp}`);

            // Send screen info
            const screenSize = robot.getScreenSize();
            ws.send(JSON.stringify({
                type: 'screen_info',
                data: {
                    width: screenSize.width,
                    height: screenSize.height
                }
            }));

            // Start streaming
            startStreaming(ws);
        } else {
            ws.send(JSON.stringify({
                type: 'auth_failed',
                reason: 'Invalid password'
            }));

            console.log(`[${new Date().toISOString()}] Authentication failed: ${clientIp}`);

            // Close connection after failed auth
            setTimeout(() => ws.close(), 1000);
        }
    }

    function startStreaming(ws) {
        if (streamingClients.has(ws)) return;

        console.log(`[${new Date().toISOString()}] Starting screen stream for ${clientIp}`);

        const interval = setInterval(async () => {
            if (ws.readyState !== WebSocket.OPEN) {
                stopStreaming(ws);
                return;
            }

            try {
                // Capture screenshot
                const imgBuffer = await screenshot({ format: 'jpg', quality: SCREEN_QUALITY });

                // Send as base64
                const base64 = imgBuffer.toString('base64');
                ws.send(JSON.stringify({
                    type: 'frame',
                    data: base64
                }));
            } catch (error) {
                console.error('Error capturing screen:', error);
            }
        }, FRAME_INTERVAL);

        streamingClients.set(ws, interval);
    }

    function stopStreaming(ws) {
        if (streamingClients.has(ws)) {
            clearInterval(streamingClients.get(ws));
            streamingClients.delete(ws);
            console.log(`[${new Date().toISOString()}] Stopped screen stream for ${clientIp}`);
        }
    }
});

// Input handlers
function handleMouseMove(message) {
    try {
        const mouse = robot.getMousePos();
        const newX = mouse.x + message.x;
        const newY = mouse.y + message.y;

        robot.moveMouse(newX, newY);
    } catch (error) {
        console.error('Error moving mouse:', error);
    }
}

function handleMouseButton(message) {
    try {
        const buttonMap = {
            0: 'left',
            1: 'middle',
            2: 'right'
        };

        const button = buttonMap[message.button] || 'left';
        const state = message.down ? 'down' : 'up';

        robot.mouseToggle(state, button);
    } catch (error) {
        console.error('Error handling mouse button:', error);
    }
}

function handleMouseWheel(message) {
    try {
        // RobotJS scroll direction (positive = up, negative = down)
        const scrollAmount = Math.round(-message.deltaY / 10);

        if (scrollAmount !== 0) {
            robot.scrollMouse(0, scrollAmount);
        }
    } catch (error) {
        console.error('Error handling mouse wheel:', error);
    }
}

function handleKeyboard(message) {
    try {
        const state = message.down ? 'down' : 'up';

        // Map browser keys to RobotJS keys
        let key = message.key;

        // Handle special keys
        const specialKeys = {
            'Control': 'control',
            'Shift': 'shift',
            'Alt': 'alt',
            'Meta': 'command',
            'Enter': 'enter',
            'Backspace': 'backspace',
            'Tab': 'tab',
            'Escape': 'escape',
            'Delete': 'delete',
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'Home': 'home',
            'End': 'end',
            'PageUp': 'pageup',
            'PageDown': 'pagedown',
            ' ': 'space'
        };

        if (specialKeys[key]) {
            key = specialKeys[key];
        }

        // Handle function keys
        if (key.startsWith('F') && key.length <= 3) {
            const fNum = parseInt(key.substring(1));
            if (fNum >= 1 && fNum <= 12) {
                key = 'f' + fNum;
            }
        }

        // Handle modifier keys
        const modifiers = [];
        if (message.ctrlKey) modifiers.push('control');
        if (message.shiftKey) modifiers.push('shift');
        if (message.altKey) modifiers.push('alt');
        if (message.metaKey) modifiers.push('command');

        // Only send single character keys or special keys
        if (key.length === 1 || specialKeys[message.key] || key.startsWith('f')) {
            robot.keyToggle(key, state, modifiers);
        }
    } catch (error) {
        console.error('Error handling keyboard:', error);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down server...');

    // Stop all streams
    streamingClients.forEach((interval) => clearInterval(interval));
    streamingClients.clear();

    // Close all connections
    wss.clients.forEach((client) => {
        client.close();
    });

    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`\n✅ Server listening on:`);
    console.log(`   Local:    ws://localhost:${PORT}`);
    console.log(`   Network:  ws://[your-ip]:${PORT}`);
    console.log('\n💡 Set PASSWORD in .env file for security');
    console.log('Press Ctrl+C to stop\n');
});
