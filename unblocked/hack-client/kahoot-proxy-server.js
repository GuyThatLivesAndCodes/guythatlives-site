/**
 * Kahoot Proxy Server
 *
 * This is a simple proxy server that forwards requests to Kahoot's API
 * to bypass CORS restrictions. Use with cloudflared for remote access.
 *
 * IMPORTANT: This is for educational purposes only.
 * Using this may violate Kahoot's Terms of Service.
 *
 * Setup:
 * 1. npm install express axios cors
 * 2. node kahoot-proxy-server.js
 * 3. cloudflared tunnel --url http://localhost:8080
 * 4. Update kahoot-finder.js with your cloudflared URL
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

/**
 * Get quiz data by game PIN
 * GET /api/kahoot/:pin
 */
app.get('/api/kahoot/:pin', async (req, res) => {
    try {
        const { pin } = req.params;

        // Validate PIN format
        if (!/^\d{4,8}$/.test(pin)) {
            return res.status(400).json({
                error: 'Invalid PIN format',
                message: 'PIN must be 4-8 digits'
            });
        }

        console.log(`Fetching quiz data for PIN: ${pin}`);

        // Try multiple Kahoot endpoints
        const endpoints = [
            `https://create.kahoot.it/rest/kahoots/${pin}`,
            `https://kahoot.it/rest/kahoots/${pin}`,
            `https://play.kahoot.it/rest/kahoots/${pin}`
        ];

        let lastError = null;

        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(endpoint, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/json',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': 'https://kahoot.it/'
                    },
                    timeout: 10000
                });

                if (response.data) {
                    console.log(`✓ Successfully fetched quiz from ${endpoint}`);
                    return res.json(response.data);
                }
            } catch (error) {
                lastError = error;
                console.log(`✗ Failed to fetch from ${endpoint}: ${error.message}`);
                continue;
            }
        }

        // If all endpoints failed
        throw lastError || new Error('All endpoints failed');

    } catch (error) {
        console.error('Error fetching quiz:', error.message);

        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error || error.message;

        res.status(statusCode).json({
            error: 'Failed to fetch quiz data',
            message: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * Search for quizzes
 * GET /api/kahoot/search?query=...
 */
app.get('/api/kahoot/search', async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({
                error: 'Missing query parameter'
            });
        }

        console.log(`Searching for quizzes: ${query}`);

        const response = await axios.get(`https://create.kahoot.it/rest/kahoots/search`, {
            params: {
                query,
                limit: 20,
                cursor: 0
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        res.json(response.data);

    } catch (error) {
        console.error('Error searching quizzes:', error.message);

        res.status(error.response?.status || 500).json({
            error: 'Failed to search quizzes',
            message: error.message
        });
    }
});

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/**
 * Root endpoint
 * GET /
 */
app.get('/', (req, res) => {
    res.json({
        name: 'Kahoot Proxy Server',
        version: '1.0.0',
        endpoints: {
            quiz: '/api/kahoot/:pin',
            search: '/api/kahoot/search?query=...',
            health: '/health'
        },
        warning: 'This is for educational purposes only. Using this may violate Kahoot\'s Terms of Service.'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║   Kahoot Proxy Server                        ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log('');
    console.log('To expose with cloudflared:');
    console.log(`  cloudflared tunnel --url http://localhost:${PORT}`);
    console.log('');
    console.log('⚠️  For educational purposes only');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    process.exit(0);
});
