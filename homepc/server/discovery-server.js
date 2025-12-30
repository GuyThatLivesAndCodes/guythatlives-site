/**
 * Discovery Server
 * Central registry for all remote PC servers
 * Allows browsers to discover available computers
 */

const http = require('http');
const url = require('url');

const PORT = process.env.DISCOVERY_PORT || 8081;
const HEARTBEAT_TIMEOUT = 30000; // 30 seconds - if no heartbeat, mark as offline

// Store of registered computers
// { computerId: { name, address, lastSeen, metadata } }
const computers = new Map();

// Cleanup offline computers periodically
setInterval(() => {
    const now = Date.now();
    for (const [id, computer] of computers.entries()) {
        if (now - computer.lastSeen > HEARTBEAT_TIMEOUT) {
            console.log(`[${new Date().toISOString()}] Computer went offline: ${computer.name}`);
            computers.delete(id);
        }
    }
}, 10000); // Check every 10 seconds

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // GET /computers - List all available computers
    if (pathname === '/computers' && req.method === 'GET') {
        const computerList = Array.from(computers.values()).map(comp => ({
            id: comp.id,
            name: comp.name,
            address: comp.address,
            lastSeen: comp.lastSeen,
            metadata: comp.metadata
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            computers: computerList
        }));
        return;
    }

    // POST /register - Register a computer
    if (pathname === '/register' && req.method === 'POST') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { id, name, address, metadata } = data;

                if (!id || !name || !address) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Missing required fields: id, name, address'
                    }));
                    return;
                }

                const isNew = !computers.has(id);

                computers.set(id, {
                    id,
                    name,
                    address,
                    lastSeen: Date.now(),
                    metadata: metadata || {}
                });

                if (isNew) {
                    console.log(`[${new Date().toISOString()}] New computer registered: ${name} (${address})`);
                } else {
                    console.log(`[${new Date().toISOString()}] Heartbeat from: ${name}`);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: isNew ? 'Computer registered' : 'Heartbeat received'
                }));
            } catch (error) {
                console.error('Error processing registration:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Internal server error'
                }));
            }
        });
        return;
    }

    // POST /unregister - Unregister a computer
    if (pathname === '/unregister' && req.method === 'POST') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { id } = data;

                if (!id) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Missing required field: id'
                    }));
                    return;
                }

                const computer = computers.get(id);
                if (computer) {
                    computers.delete(id);
                    console.log(`[${new Date().toISOString()}] Computer unregistered: ${computer.name}`);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Computer unregistered'
                }));
            } catch (error) {
                console.error('Error processing unregistration:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Internal server error'
                }));
            }
        });
        return;
    }

    // Health check
    if (pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            status: 'healthy',
            computers: computers.size
        }));
        return;
    }

    // Web UI
    if (pathname === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Discovery Server</title>
                <style>
                    body {
                        font-family: monospace;
                        background: #0a0e27;
                        color: #64ffda;
                        padding: 2rem;
                    }
                    .container {
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    h1 { color: #64ffda; }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 2rem;
                    }
                    th, td {
                        padding: 0.75rem;
                        text-align: left;
                        border-bottom: 1px solid #233554;
                    }
                    th {
                        color: #64ffda;
                        background: #151932;
                    }
                    td {
                        color: #e1e5f2;
                    }
                    .status {
                        display: inline-block;
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        background: #51cf66;
                        margin-right: 0.5rem;
                    }
                    .info {
                        color: #8892b0;
                        margin: 1rem 0;
                    }
                </style>
                <script>
                    async function loadComputers() {
                        const response = await fetch('/computers');
                        const data = await response.json();
                        const tbody = document.getElementById('computers-list');

                        if (data.computers.length === 0) {
                            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #8892b0;">No computers registered</td></tr>';
                        } else {
                            tbody.innerHTML = data.computers.map(comp => \`
                                <tr>
                                    <td><span class="status"></span>\${comp.name}</td>
                                    <td>\${comp.address}</td>
                                    <td>\${new Date(comp.lastSeen).toLocaleString()}</td>
                                </tr>
                            \`).join('');
                        }
                    }

                    setInterval(loadComputers, 2000);
                    loadComputers();
                </script>
            </head>
            <body>
                <div class="container">
                    <h1>🔍 Discovery Server</h1>
                    <p class="info">Port: ${PORT}</p>
                    <p class="info">Registered Computers: <span id="count">${computers.size}</span></p>

                    <table>
                        <thead>
                            <tr>
                                <th>Computer Name</th>
                                <th>Address</th>
                                <th>Last Seen</th>
                            </tr>
                        </thead>
                        <tbody id="computers-list">
                        </tbody>
                    </table>
                </div>
            </body>
            </html>
        `);
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: false,
        error: 'Not found'
    }));
});

server.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════');
    console.log('🔍 Discovery Server');
    console.log('═══════════════════════════════════════════════');
    console.log(`Port: ${PORT}`);
    console.log(`Web UI: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/computers`);
    console.log('═══════════════════════════════════════════════\n');
});
