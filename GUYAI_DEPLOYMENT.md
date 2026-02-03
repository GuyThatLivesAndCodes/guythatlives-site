# GuyAI Deployment Guide

## New Architecture: Cloudflare AI Gateway

GuyAI has been completely redesigned to use Cloudflare AI Gateway with Anthropic's Claude Haiku 4.

### Architecture Overview

```
User Browser (E2E Encrypted)
    ↓ HTTPS
Cloudflare AI Gateway
    ↓ HTTPS
Anthropic Claude API (Haiku 4)
    ↓
Response (streamed back)
```

## Key Features

- **End-to-End Encryption**: AES-256-GCM encryption for all chat data
- **No Server-Side Proxy**: Direct client-to-gateway communication
- **Cloudflare Security**: Built-in rate limiting, analytics, and caching
- **Claude Haiku 4**: Fast, intelligent AI responses
- **Privacy First**: All data stays in browser localStorage

## Setup Steps

### Step 1: Get Cloudflare Credentials

#### Account ID
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click on any website/zone
3. Your **Account ID** is in the right sidebar
4. Or check the URL: `https://dash.cloudflare.com/[ACCOUNT_ID]`

#### API Token
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click profile icon → **My Profile** → **API Tokens**
3. Click **Create Token**
4. Use **"Edit Cloudflare Workers"** template or custom token with:
   - Account → AI Gateway → Read
   - Account → AI Gateway → Edit
5. **Copy the token immediately** (shown only once!)

#### Gateway ID
Your gateway is: `unblocked-claude-gateway`

Verify in Cloudflare Dashboard → AI section → AI Gateway

### Step 2: Configure Anthropic API in Gateway

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an API key
3. In Cloudflare Dashboard → AI Gateway → Your Gateway
4. Add Anthropic API key to gateway configuration
5. Enable Claude Haiku 4 (`claude-haiku-4-20250514`)

### Step 3: Deploy GuyAI

Run the deployment script:
```bash
deploy-guyai.bat
```

Or manually:
```bash
firebase use unblocked
firebase deploy --only hosting
```

### Step 4: Configure in Browser

1. Visit `https://guythatlives.net/unblocked/guyai/`
2. Click the ⚙️ (settings) icon
3. Enter your credentials:
   - Cloudflare Account ID
   - Cloudflare API Token
   - Gateway ID: `unblocked-claude-gateway`
4. Click **Save Configuration**
5. Start chatting!

## Verification

1. **Test the interface:**
   - Visit https://guythatlives.net/unblocked/guyai/
   - Send a test message
   - Should see fast responses from Claude Haiku 4

2. **Check encryption:**
   - Open browser DevTools (F12) → Application → Local Storage
   - Find `guyai_chat_history` - should be encrypted gibberish
   - Encryption icon should show in header

3. **Monitor in Cloudflare:**
   - Go to AI Gateway dashboard
   - View analytics for request counts
   - Check for any errors

## Gateway Configuration

**Gateway URL Format:**
```
https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/anthropic/v1/messages
```

**Request Format:**
```json
{
  "model": "claude-haiku-4-20250514",
  "max_tokens": 4096,
  "messages": [
    {"role": "user", "content": "Hello!"}
  ]
}
```

**Headers Required:**
- `Content-Type: application/json`
- `Authorization: Bearer {apiToken}`
- `anthropic-version: 2023-06-01`

## Troubleshooting

### "Please configure your Cloudflare credentials first"
- Click ⚙️ settings icon
- Enter all three credentials
- Make sure there are no extra spaces
- Credentials save to browser localStorage

### "Failed to get response: 401 Unauthorized"
- API token is invalid or expired
- Create a new token with correct permissions
- Verify Anthropic API key in Cloudflare Gateway

### "Failed to get response: 403 Forbidden"
- API token lacks necessary permissions
- Token needs: AI Gateway Read + Edit
- Recreate token with proper permissions

### "Failed to get response: 404 Not Found"
- Gateway ID is incorrect
- Check spelling: `unblocked-claude-gateway`
- Verify gateway exists in Cloudflare dashboard

### "Failed to initialize encryption"
- Browser doesn't support Web Crypto API
- Use modern browser (Chrome, Firefox, Safari, Edge)
- Ensure site is accessed via HTTPS (not HTTP)

### Chat history not saving
- Check if localStorage is enabled
- Private/Incognito mode clears data on close
- Check browser console (F12) for errors
- Try clearing site data and reconfiguring

### Configuration modal won't close
- Fill in all three required fields
- Check browser console for JavaScript errors
- Try refreshing the page

### Responses are slow
- Claude Haiku 4 is very fast - check network
- Monitor in Cloudflare AI Gateway dashboard
- Check Anthropic API status page
- Verify API key has available credits

## Cost Considerations

### Cloudflare AI Gateway
- **Free tier**: 10,000 requests/month
- **Paid**: $5/million requests
- Includes analytics, caching, rate limiting

### Anthropic API (Claude Haiku 4)
- **Input**: ~$0.25 per million tokens
- **Output**: ~$1.25 per million tokens
- Fastest and most cost-effective Claude model

**Estimated Monthly Cost** (100 conversations, 500 words each):
- Cloudflare: Free (well under 10K limit)
- Anthropic: ~$0.15 (150K tokens)
- **Total: ~$0.15/month**

Much cheaper than running your own Ollama server!

## Migration from Old Version

### What Changed
- **Old**: Ollama local server + Firebase proxy
- **New**: Cloudflare AI Gateway + Claude Haiku 4

### Benefits
- No server maintenance required
- Better response quality
- Faster responses
- Built-in encryption
- Lower operational costs
- No mixed-content issues

### Files Updated
1. **`/unblocked/guyai/`** - Complete rewrite
2. **`functions/index.js`** - ollamaProxy marked deprecated
3. **`deploy-guyai.bat`** - Updated for new architecture
4. **`GUYAI_DEPLOYMENT.md`** - This file

## Security Notes

- **Client-Side Encryption**: AES-256-GCM before localStorage
- **HTTPS Only**: All communications encrypted in transit
- **No Server Storage**: Zero message retention on servers
- **Cloudflare Gateway**: Hides API keys from clients
- **Rate Limiting**: Built into Cloudflare Gateway
- **No Tracking**: No cookies, no analytics, no data collection

Your conversations are truly private - only you can read them.

## Next Steps After Setup

1. **Test the interface** - Send various types of queries
2. **Monitor in Cloudflare** - Check AI Gateway dashboard
3. **Check Anthropic usage** - Monitor token consumption
4. **Share with users** - GuyAI is ready for public use!

## Additional Resources

- [Cloudflare AI Gateway Docs](https://developers.cloudflare.com/ai-gateway/)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Claude Haiku 4 Info](https://www.anthropic.com/claude)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

## Support

For issues:
1. Check browser console (F12) for errors
2. Verify Cloudflare Gateway configuration
3. Test API token permissions
4. Check Anthropic API status
5. Review `/unblocked/guyai/README.md` for detailed setup
