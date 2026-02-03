# GuyAI Configuration Template

Use this as a reference when configuring GuyAI.

## Required Credentials

### 1. Cloudflare Account ID
```
Location: Cloudflare Dashboard → Any Zone → Sidebar
Format:   32-character hexadecimal string
Example:  abc123def456789012345678901234567890

Your Account ID:
┌─────────────────────────────────────────┐
│                                         │
│   [Enter your Account ID here]          │
│                                         │
└─────────────────────────────────────────┘
```

### 2. Cloudflare API Token
```
Location: My Profile → API Tokens → Create Token
Template: "Edit Cloudflare Workers" or custom
Required Permissions:
  - Account → AI Gateway → Read
  - Account → AI Gateway → Edit

⚠️ IMPORTANT: Copy this immediately - you won't see it again!

Your API Token:
┌─────────────────────────────────────────┐
│                                         │
│   [Enter your API Token here]           │
│                                         │
└─────────────────────────────────────────┘
```

### 3. Gateway ID
```
Location: Cloudflare Dashboard → AI → AI Gateway
Default:  unblocked-claude-gateway

Your Gateway ID:
┌─────────────────────────────────────────┐
│                                         │
│   unblocked-claude-gateway              │
│                                         │
└─────────────────────────────────────────┘
```

## Gateway Configuration

### Anthropic API Key Setup
```
1. Go to: https://console.anthropic.com/
2. Navigate to: API Keys
3. Create new key: "GuyAI Production"
4. Copy key: sk-ant-...
5. Add to Cloudflare AI Gateway → Provider Configuration
6. Save configuration

Your Anthropic API Key:
┌─────────────────────────────────────────┐
│                                         │
│   sk-ant-[your key here]                │
│                                         │
└─────────────────────────────────────────┘
```

## Gateway URL Format

The complete gateway URL will be:
```
https://gateway.ai.cloudflare.com/v1/{ACCOUNT_ID}/{GATEWAY_ID}/anthropic/v1/messages

Example:
https://gateway.ai.cloudflare.com/v1/abc123def456/unblocked-claude-gateway/anthropic/v1/messages
```

## Model Configuration

```
Model ID: claude-haiku-4-20250514
Provider: Anthropic
Version:  2023-06-01 (API version)

Ensure this model is enabled in your Cloudflare AI Gateway settings.
```

## Quick Test Command

Replace the placeholders and test your gateway:

```bash
curl -X POST \
  https://gateway.ai.cloudflare.com/v1/{YOUR_ACCOUNT_ID}/unblocked-claude-gateway/anthropic/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_API_TOKEN}" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-haiku-4-20250514",
    "max_tokens": 100,
    "messages": [
      {"role": "user", "content": "Say hello in one sentence!"}
    ]
  }'
```

Expected successful response:
```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! How can I help you today?"
    }
  ],
  "model": "claude-haiku-4-20250514",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 10,
    "output_tokens": 12
  }
}
```

## Browser Configuration

When you visit `/unblocked/guyai/` for the first time:

1. Click the **⚙️** (settings) icon
2. Enter the three values:
   ```
   Cloudflare Account ID: [from section 1 above]
   Cloudflare API Token:  [from section 2 above]
   Gateway ID:            unblocked-claude-gateway
   ```
3. Click **Save Configuration**
4. Configuration is saved to browser localStorage
5. Start chatting!

## Security Notes

⚠️ **API Token Security**

The API token is powerful. Keep it secure:
- ✅ Only share with trusted users
- ✅ Use minimum required permissions
- ✅ Set expiration date (recommend 1 year)
- ✅ Rotate regularly
- ❌ Never commit to git
- ❌ Never share publicly
- ❌ Never use in public repositories

## For Production Use

### Option A: Client-Side Configuration (Current)
Users enter credentials in their browser.

**Pros:**
- Simple to deploy
- No backend needed
- Works immediately

**Cons:**
- Users can see/copy API tokens
- Not suitable for untrusted users
- Tokens could be stolen

### Option B: Server-Side Proxy (Recommended)
Create a backend service that holds credentials.

**Pros:**
- Users never see API tokens
- Secure for public use
- Better rate limiting control
- Usage monitoring

**Cons:**
- Requires backend deployment
- Slightly more complex

Let me know if you want Option B implemented!

## Environment Variables (For Option B)

If implementing server-side proxy, use environment variables:

```bash
# .env file (never commit this!)
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_GATEWAY_ID=unblocked-claude-gateway
```

## Checklist

Before deploying to production:

- [ ] Cloudflare Account ID obtained
- [ ] API Token created with correct permissions
- [ ] Gateway ID verified in Cloudflare dashboard
- [ ] Anthropic API key added to gateway
- [ ] Claude Haiku 4 enabled in gateway
- [ ] Test curl command successful
- [ ] Credentials documented (keep secure!)
- [ ] Decided on client-side vs server-side config
- [ ] Deployment script tested
- [ ] Browser configuration tested

## Quick Reference URLs

| Service | URL |
|---------|-----|
| Cloudflare Dashboard | https://dash.cloudflare.com/ |
| API Tokens | https://dash.cloudflare.com/profile/api-tokens |
| AI Gateway | https://dash.cloudflare.com/ → AI → AI Gateway |
| Anthropic Console | https://console.anthropic.com/ |
| Anthropic API Keys | https://console.anthropic.com/settings/keys |
| GuyAI Interface | https://guythatlives.net/unblocked/guyai/ |

## Support

If you get stuck:
1. Check `CLOUDFLARE_SETUP.md` for detailed walkthrough
2. Test with curl command above
3. Check browser console (F12) for errors
4. Verify all three credentials are correct
5. Ensure Anthropic API key is in gateway settings

## Cost Calculator

Estimate your monthly costs:

```
Conversations per month:  _______
Average length (words):   _______
Tokens per conversation:  _______ × 1.5 (estimate)

Total tokens/month: _______ (conversations × tokens × 2 for input+output)

Cloudflare cost: $0 (under 10K requests)
Anthropic cost:  tokens/month × $0.000000625 (Haiku pricing)

Estimated total: $_______/month
```

Most users will spend less than $0.50/month!

---

**Ready?** Fill in your credentials above and follow `CLOUDFLARE_SETUP.md`! 🚀
