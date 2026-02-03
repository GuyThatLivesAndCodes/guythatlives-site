# GuyAI - Secure AI Chat

GuyAI is a secure, end-to-end encrypted AI chat interface powered by Claude Haiku 4 via Cloudflare AI Gateway.

## Features

- **End-to-End Encryption**: All chat messages are encrypted locally using AES-256-GCM before storage
- **Cloudflare AI Gateway**: Routes API calls securely through Cloudflare's infrastructure
- **Claude Haiku 4**: Fast, intelligent responses from Anthropic's latest model
- **Privacy First**: No server-side message storage, all data stays in your browser
- **Modern UI**: Clean, responsive interface with dark theme

## Setup Instructions

### 1. Find Your Cloudflare Credentials

#### Account ID
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click on any website/zone
3. Scroll down in the right sidebar - your **Account ID** is listed there
4. Or go to your account overview - the URL contains your account ID: `https://dash.cloudflare.com/[ACCOUNT_ID]`

#### API Token
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click on your profile icon (top right) → **My Profile**
3. Navigate to **API Tokens** tab
4. Click **Create Token**
5. Use the **"Edit Cloudflare Workers"** template or create a custom token with these permissions:
   - Account → AI Gateway → Read
   - Account → AI Gateway → Edit
6. **Important**: Copy the token immediately - you can't see it again!

#### Gateway ID
You mentioned your gateway is called: `unblocked-claude-gateway`

To verify:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **AI** in the left sidebar (or go to AI Gateway section)
3. You should see your gateway listed as **"unblocked-claude-gateway"**
4. Click on it to see details and confirm the ID

### 2. Configure Anthropic API Key in Cloudflare

Your Cloudflare AI Gateway needs access to Anthropic's API:

1. Go to your [Anthropic Console](https://console.anthropic.com/)
2. Create an API key if you don't have one
3. In Cloudflare Dashboard → AI Gateway → Your Gateway
4. Add your Anthropic API key to the gateway configuration
5. Ensure Claude Haiku 4 (`claude-haiku-4-20250514`) is enabled

### 3. Configure GuyAI

1. Visit `/unblocked/guyai/`
2. Click the **⚙️** (settings) icon in the top right
3. Enter your credentials:
   - **Cloudflare Account ID**: Your account ID from step 1
   - **Cloudflare API Token**: The token you created
   - **Gateway ID**: `unblocked-claude-gateway`
4. Click **Save Configuration**

## How It Works

```
User Browser
    ↓ (Encrypted message stored locally)
    ↓
    → Cloudflare AI Gateway
        ↓ (Secure HTTPS)
        ↓
        → Anthropic API (Claude Haiku 4)
            ↓
            ← AI Response
        ←
    ← Response displayed
    ↓ (Encrypted and stored locally)
Browser LocalStorage
```

### Security Features

1. **Local Encryption**:
   - Generates a unique AES-256 key per browser
   - Encrypts all chat history before storing in localStorage
   - Encryption key never leaves your device

2. **Cloudflare Gateway Benefits**:
   - Hides your Anthropic API key from the client
   - Provides analytics and monitoring
   - Rate limiting protection
   - Request caching for improved performance

3. **HTTPS Only**:
   - All communications use HTTPS
   - No mixed content issues
   - Secure transmission throughout

## API Gateway URL Format

The application constructs the gateway URL as:
```
https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/anthropic/v1/messages
```

Example:
```
https://gateway.ai.cloudflare.com/v1/abc123def456/unblocked-claude-gateway/anthropic/v1/messages
```

## Troubleshooting

### "Please configure your Cloudflare credentials first"
- Click the ⚙️ icon and enter your credentials
- Make sure all fields are filled in
- Credentials are saved in browser localStorage

### "Failed to get response: 401"
- Your API token is invalid or expired
- Create a new API token with correct permissions
- Make sure your Anthropic API key is configured in the Cloudflare Gateway

### "Failed to get response: 403"
- API token doesn't have the right permissions
- Ensure token has AI Gateway Read + Edit permissions
- Check that the gateway ID matches exactly

### "Failed to initialize encryption"
- Your browser doesn't support Web Crypto API (very rare)
- Try a modern browser (Chrome, Firefox, Safari, Edge)
- Make sure site is accessed via HTTPS

### Chat history not persisting
- Check browser localStorage isn't disabled
- Private/Incognito mode may clear data on close
- Check browser console for errors

## Cost Considerations

### Cloudflare AI Gateway
- **Free tier**: 10,000 requests/month
- **Paid**: $5/million requests after free tier
- Analytics and caching included

### Anthropic API (Claude Haiku 4)
- **Input**: ~$0.25 per million tokens
- **Output**: ~$1.25 per million tokens
- Extremely cost-effective for chat applications
- ~1,500 words ≈ 2,000 tokens

**Estimated Cost**: For typical use (100 conversations/month, ~500 words each):
- Tokens: ~150K tokens/month
- Cost: ~$0.15/month

## File Structure

```
/unblocked/guyai/
├── index.html          # Main chat interface
├── guyai.js           # Core application logic
└── README.md          # This file
```

## Browser Compatibility

- Chrome 60+
- Firefox 57+
- Safari 11.1+
- Edge 79+

All modern browsers support the required features (Web Crypto API, LocalStorage, ES6+).

## Privacy Notes

- All conversations are stored **locally** in your browser only
- Messages are **encrypted** before storage using AES-256-GCM
- Encryption key is **unique per browser** and never transmitted
- Cloudflare Gateway sees API requests but **doesn't store messages**
- Anthropic processes messages but **doesn't retain data** per their privacy policy
- No cookies, no tracking, no server-side storage
- Clear your browser data to completely remove all conversations

## Support

For issues or questions:
1. Check browser console (F12) for error messages
2. Verify Cloudflare Gateway is properly configured
3. Ensure Anthropic API key is valid and has credits
4. Test API access directly via Cloudflare dashboard

## Migration from Old Ollama Version

The old GuyAI used a local Ollama server. This version uses:
- Cloud-based Claude instead of local Ollama
- Cloudflare AI Gateway instead of Firebase proxy
- Modern encryption standards
- No server maintenance required
- Better response quality and speed

All old references have been updated to use the new Cloudflare-based architecture.
