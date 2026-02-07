# Hack-Client - Kahoot Answer Finder

## Overview

The Hack-Client is an educational tool suite that demonstrates web technologies and API interactions. The first tool is a Kahoot Answer Finder that retrieves quiz questions and answers.

## Features

- **TOS Warning System**: Users must acknowledge TOS implications before using tools
- **Multiple Connection Methods**: Supports cloudflared proxy or direct API calls
- **Demo Mode**: Falls back to demo data when APIs are unavailable
- **Clean UI**: Modern, responsive interface with proper error handling

## Setup

### Option 1: Using Cloudflared (Recommended)

If you want to use a local proxy server to bypass CORS restrictions:

1. Install cloudflared on your home PC
2. Create a simple Node.js/Python server that proxies Kahoot API requests
3. Use cloudflared to expose the local server

Example Node.js server (`kahoot-proxy-server.js`):

```javascript
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/kahoot/:pin', async (req, res) => {
    try {
        const { pin } = req.params;

        // Try to fetch quiz data from Kahoot
        const response = await axios.get(`https://create.kahoot.it/rest/kahoots/${pin}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch quiz data',
            message: error.message
        });
    }
});

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Kahoot proxy server running on http://localhost:${PORT}`);
});
```

4. Run cloudflared tunnel:
```bash
cloudflared tunnel --url http://localhost:8080
```

5. Update `kahoot-finder.js` line 69 with your cloudflared URL:
```javascript
const cloudflaredUrl = 'https://your-tunnel-url.trycloudflare.com';
```

### Option 2: Using Demo Mode

If you don't set up a backend, the tool will automatically fall back to demo mode, which displays sample questions and answers. This is useful for testing the UI.

### Option 3: Alternative CORS Proxies

The code includes a fallback to public CORS proxies, but these may be unreliable. For production use, always use your own proxy server.

## File Structure

```
/hack-client/
├── index.html          # Main page with tool cards and modal
├── style.css           # Hack-Client specific styles
├── kahoot-finder.js    # Answer finder logic
└── README.md           # This file
```

## How It Works

1. User clicks "Launch Tool" on the Kahoot Answer Finder card
2. Modal opens with TOS warning
3. User must accept TOS to proceed
4. User enters a Kahoot game PIN
5. System tries multiple methods to fetch quiz data:
   - Cloudflared proxy (primary)
   - Direct Kahoot API (may fail due to CORS)
   - Public CORS proxy (backup)
   - Demo mode (fallback)
6. Results are displayed with questions and correct answers highlighted

## API Response Format

Expected Kahoot API response structure:

```json
{
    "title": "Quiz Title",
    "creator_username": "Creator Name",
    "questions": [
        {
            "question": "Question text?",
            "choices": [
                {
                    "answer": "Choice 1",
                    "correct": false
                },
                {
                    "answer": "Choice 2",
                    "correct": true
                }
            ]
        }
    ]
}
```

## Security & Legal Notes

- This tool is for **educational purposes only**
- Using this tool may violate Kahoot's Terms of Service
- Users are warned before using the tool
- The tool demonstrates API interactions and web technologies
- Always obtain permission before using on actual quizzes
- This is intended for learning about web security and API design

## Future Tools (Placeholders)

The interface includes 4 placeholder cards for future educational tools. Some ideas:

1. **Quizlet Answer Finder**: Similar to Kahoot but for Quizlet
2. **Form Auto-Filler**: Demonstrates form manipulation
3. **Cookie Inspector**: Educational cookie analysis tool
4. **Network Monitor**: Shows how to monitor network requests

## Customization

### Changing Cloudflared URL

Edit `kahoot-finder.js` line 69:
```javascript
const cloudflaredUrl = 'YOUR_URL_HERE';
```

### Adding More Questions to Demo Mode

Edit the `showDemoResults()` function in `kahoot-finder.js` to add more sample questions.

### Styling

All styles are in `style.css`. The theme uses CSS variables from the main games stylesheet for consistency.

## Troubleshooting

**Error: "NetworkError when attempting to fetch resource"**
- This is normal! It happens when trying direct Kahoot API calls (blocked by CORS)
- The tool will automatically fall back to demo mode
- To get real data, set up the cloudflared proxy (see above)

**Error: "Cloudflared endpoint not available"**
- Make sure your proxy server is running (`npm start`)
- Check that cloudflared tunnel is active
- Verify the URL in `kahoot-finder.js` line 67 matches your tunnel URL

**Error: "CORS policy blocked"**
- This is expected for direct API calls from browsers
- Kahoot blocks cross-origin requests for security
- Use the cloudflared proxy method instead

**Only seeing demo data**
- This means all API methods failed (normal without proxy setup)
- Check your cloudflared setup if you want real data
- Verify network connectivity
- Make sure proxy server is accessible

## Contributing

To add new tools:

1. Create a new function in `kahoot-finder.js` (or create a new JS file)
2. Add a tool card in `index.html`
3. Create the modal interface
4. Implement the TOS warning system
5. Add appropriate styling in `style.css`

## License

Educational use only. Use responsibly and ethically.
