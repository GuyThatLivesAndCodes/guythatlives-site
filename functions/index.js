/**
 * Firebase Functions for GuyThatLives Site
 * Handles secure API calls to Claude API
 */

const functions = require('firebase-functions');
const https = require('https');

/**
 * Analyze math test results using Claude API
 *
 * This function runs on the backend, keeping the API key secure.
 * To set up: Run `firebase functions:config:set claude.api_key="YOUR_API_KEY"`
 */
exports.analyzeTest = functions.https.onCall(async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to analyze test results.'
        );
    }

    // Get API key from environment
    const apiKey = functions.config().claude?.api_key;

    if (!apiKey) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Claude API key is not configured. Please contact the administrator.'
        );
    }

    // Validate input data
    if (!data.prompt) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing required parameter: prompt'
        );
    }

    const requestBody = JSON.stringify({
        model: 'claude-sonnet-4-5-20250429',
        max_tokens: 4000,
        messages: [{
            role: 'user',
            content: data.prompt
        }]
    });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody),
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);

                    if (res.statusCode === 200) {
                        resolve({
                            success: true,
                            analysis: parsed.content[0].text
                        });
                    } else {
                        console.error('Claude API error:', parsed);
                        reject(new functions.https.HttpsError(
                            'internal',
                            `Claude API error: ${parsed.error?.message || 'Unknown error'}`,
                            { status: res.statusCode }
                        ));
                    }
                } catch (error) {
                    console.error('Failed to parse Claude response:', error);
                    reject(new functions.https.HttpsError(
                        'internal',
                        'Failed to parse Claude API response'
                    ));
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request error:', error);
            reject(new functions.https.HttpsError(
                'internal',
                `Request failed: ${error.message}`
            ));
        });

        req.write(requestBody);
        req.end();
    });
});
