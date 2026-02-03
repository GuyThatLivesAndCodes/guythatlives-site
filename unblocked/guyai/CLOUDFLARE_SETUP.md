# Cloudflare AI Gateway Setup for GuyAI

This guide walks you through setting up Cloudflare AI Gateway for GuyAI step-by-step.

## Prerequisites

- Cloudflare account (free tier works!)
- Anthropic API account with credits
- Your website deployed on Firebase Hosting

## Step-by-Step Setup

### 1. Get Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create Key**
5. Give it a name like "GuyAI Production"
6. **Copy the key immediately** - you won't see it again!
7. Add credits to your account if needed (as low as $5)

### 2. Set Up Cloudflare AI Gateway

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)

2. Click **AI** in the left sidebar
   - If you don't see it, look for **Workers & Pages** → **AI Gateway**

3. Click **Create Gateway** (or use existing one)

4. Configure gateway:
   - **Name**: `unblocked-claude-gateway` (you mentioned this name)
   - **Provider**: Select **Anthropic**
   - Click **Create Gateway**

5. Add Anthropic API key:
   - In your gateway settings, find **Provider Configuration**
   - Paste your Anthropic API key
   - Click **Save**

6. Enable models:
   - Make sure **Claude Haiku 4** is enabled
   - Model ID: `claude-haiku-4-20250514`

7. **Note your Gateway ID**: `unblocked-claude-gateway`

### 3. Get Cloudflare Account ID

**Method 1: From Dashboard**
1. In Cloudflare Dashboard, click any website/zone
2. Scroll down the right sidebar
3. Find **Account ID** - copy it
4. Format: `abc123def456789...` (32 characters)

**Method 2: From URL**
1. Look at your browser URL bar
2. URL format: `https://dash.cloudflare.com/[ACCOUNT_ID]/...`
3. The long string after `.com/` is your Account ID

### 4. Create Cloudflare API Token

1. In Cloudflare Dashboard, click your profile icon (top right)
2. Select **My Profile**
3. Click **API Tokens** tab
4. Click **Create Token**

5. Choose template or create custom:
   - **Option A**: Use "Edit Cloudflare Workers" template
   - **Option B**: Create custom token with these permissions:
     ```
     Account → AI Gateway → Read
     Account → AI Gateway → Edit
     ```

6. Configure token:
   - **Token name**: "GuyAI Gateway Access"
   - **Permissions**: AI Gateway Read + Edit
   - **Account Resources**: Include your specific account
   - **TTL**: Choose expiration (recommend 1 year)

7. Click **Continue to Summary**

8. Click **Create Token**

9. **CRITICAL**: Copy the token NOW
   - It looks like: `abc123def456789...` (long string)
   - You'll NEVER see this again!
   - Store it securely

### 5. Test Your Gateway

Before configuring GuyAI, test the gateway works:

```bash
curl -X POST \
  https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/unblocked-claude-gateway/anthropic/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-haiku-4-20250514",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Say hello!"}]
  }'
```

Replace:
- `YOUR_ACCOUNT_ID` with your actual Account ID
- `YOUR_API_TOKEN` with your actual API Token

Expected response:
```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [{"type": "text", "text": "Hello! ..."}],
  ...
}
```

If you get an error:
- **401**: API token is invalid
- **403**: Token lacks permissions
- **404**: Gateway ID is wrong
- **500**: Anthropic API key not configured in gateway

### 6. Configure GuyAI

Now that your gateway is ready:

1. Visit `https://guythatlives.net/unblocked/guyai/`

2. Click the **⚙️** (settings icon) in the top right

3. Enter your credentials:
   ```
   Cloudflare Account ID: [paste from step 3]
   Cloudflare API Token:  [paste from step 4]
   Gateway ID:            unblocked-claude-gateway
   ```

4. Click **Save Configuration**

5. Try sending a message!

### 7. Verify Everything Works

1. **Send a test message**:
   - Type "Hello, tell me a fun fact"
   - Click Send
   - You should get a response in 1-2 seconds

2. **Check encryption**:
   - Open DevTools (F12)
   - Go to Application → Local Storage → your domain
   - Find `guyai_chat_history`
   - Should be encrypted (unreadable text)

3. **Monitor in Cloudflare**:
   - Go to AI Gateway dashboard
   - Click your gateway
   - View analytics - should show request count

4. **Check Anthropic usage**:
   - Go to Anthropic Console
   - Check usage dashboard
   - Should see token consumption

## Security Checklist

- [ ] API token has ONLY AI Gateway permissions (not global)
- [ ] API token is NOT committed to git
- [ ] Anthropic API key is stored in Cloudflare only (not in code)
- [ ] Tested encryption in browser localStorage
- [ ] Verified HTTPS-only access
- [ ] Confirmed no server-side logging of messages

## Cloudflare AI Gateway Features

Your setup includes:

### Analytics
- Request counts and trends
- Latency metrics
- Error rates
- Token usage

### Caching
- Cloudflare can cache identical requests
- Saves API costs
- Faster responses for common queries

### Rate Limiting
- Built-in protection against abuse
- Configurable limits per user/IP
- Automatic throttling

### Cost Control
- Set monthly spending limits
- Get alerts at thresholds
- Prevent runaway costs

## Monitoring & Maintenance

### Daily
- Check if chat is working (quick test)

### Weekly
- Review Cloudflare Analytics
- Check Anthropic token usage
- Monitor any error spikes

### Monthly
- Review Anthropic bill (~$0.15 for typical use)
- Check Cloudflare Gateway usage (should be free)
- Rotate API tokens (optional, for security)

## Troubleshooting

### API Token Issues

**Problem**: "401 Unauthorized"
- **Cause**: Invalid API token
- **Fix**: Create new token with AI Gateway permissions

**Problem**: "403 Forbidden"
- **Cause**: Token lacks permissions
- **Fix**: Token needs AI Gateway Read + Edit

### Gateway Configuration Issues

**Problem**: "404 Not Found"
- **Cause**: Gateway ID is wrong
- **Fix**: Verify in Cloudflare → AI → AI Gateway

**Problem**: "500 Internal Server Error"
- **Cause**: Anthropic API key not configured
- **Fix**: Add API key to gateway settings

### Browser Issues

**Problem**: Configuration won't save
- **Fix**: Check browser console, allow localStorage

**Problem**: Encryption error
- **Fix**: Use modern browser, ensure HTTPS

**Problem**: Chat history disappeared
- **Cause**: Cleared browser data or incognito mode
- **Fix**: Expected behavior - data is local only

## Cost Estimates

### Light Use (10 conversations/month)
- Cloudflare: $0 (free tier)
- Anthropic: ~$0.02
- **Total: $0.02/month**

### Medium Use (100 conversations/month)
- Cloudflare: $0 (free tier)
- Anthropic: ~$0.15
- **Total: $0.15/month**

### Heavy Use (1000 conversations/month)
- Cloudflare: $0 (free tier)
- Anthropic: ~$1.50
- **Total: $1.50/month**

Extremely affordable compared to running infrastructure!

## Advanced Configuration

### Custom Rate Limits
1. Go to your gateway in Cloudflare
2. Navigate to Settings
3. Configure rate limiting rules
4. Example: 100 requests per user per hour

### Caching Strategy
1. Enable caching in gateway settings
2. Set cache TTL (e.g., 1 hour for similar questions)
3. Reduces costs for repeated queries

### Analytics Webhooks
1. Set up webhook endpoints
2. Get real-time notifications
3. Track usage patterns

## Need Help?

1. **Cloudflare Support**:
   - [AI Gateway Documentation](https://developers.cloudflare.com/ai-gateway/)
   - Community Forums
   - Email support (paid plans)

2. **Anthropic Support**:
   - [API Documentation](https://docs.anthropic.com/)
   - support@anthropic.com
   - Status page: status.anthropic.com

3. **GuyAI Issues**:
   - Check browser console (F12)
   - Review `/unblocked/guyai/README.md`
   - Test with curl command above

## Congratulations!

You've successfully set up:
- ✅ Cloudflare AI Gateway
- ✅ Anthropic Claude Haiku 4 integration
- ✅ End-to-end encrypted chat interface
- ✅ Privacy-focused architecture
- ✅ Cost-effective solution

Your users can now chat securely with Claude!
