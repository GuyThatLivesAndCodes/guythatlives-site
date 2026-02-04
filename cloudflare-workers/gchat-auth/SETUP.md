# G-Chat Cloudflare Worker Setup

This replaces Firebase Cloud Functions with Cloudflare Workers - **completely free for up to 100,000 requests/day**!

## Why Cloudflare Workers?

- ✅ **Free tier**: 100,000 requests/day (way more than G-Chat needs)
- ✅ **Faster**: Edge-deployed, lower latency than Firebase Functions
- ✅ **No Blaze plan needed**: Works with Firebase Spark plan
- ✅ **KV Storage**: Free 100,000 reads/day, 1,000 writes/day
- ✅ **Already using Cloudflare**: You have it set up for GuyAI

## Setup Steps

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

This opens your browser to authenticate.

### 3. Create KV Namespaces

```bash
cd cloudflare-workers/gchat-auth

# Create production namespaces
wrangler kv:namespace create "GCHAT_ACCOUNTS"
wrangler kv:namespace create "GCHAT_SESSIONS"

# Create preview namespaces (for testing)
wrangler kv:namespace create "GCHAT_ACCOUNTS" --preview
wrangler kv:namespace create "GCHAT_SESSIONS" --preview
```

You'll get output like:
```
✨ Success! Created KV namespace GCHAT_ACCOUNTS
 Add the following to your wrangler.toml:
 { binding = "GCHAT_ACCOUNTS", id = "abc123..." }
```

### 4. Update wrangler.toml

Copy the IDs from step 3 into `wrangler.toml`:

```toml
kv_namespaces = [
  { binding = "GCHAT_ACCOUNTS", id = "PASTE_ID_HERE", preview_id = "PASTE_PREVIEW_ID_HERE" },
  { binding = "GCHAT_SESSIONS", id = "PASTE_ID_HERE", preview_id = "PASTE_PREVIEW_ID_HERE" }
]
```

Also update your domain:
```toml
routes = [
  { pattern = "guythatlives.net/api/gchat/*", zone_name = "guythatlives.net" }
]
```

### 5. Install Dependencies

```bash
npm install
```

### 6. Test Locally

```bash
npm run dev
```

Test with curl:
```bash
# Signup
curl -X POST http://localhost:8787/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123","email":"test@example.com"}'

# Login
curl -X POST http://localhost:8787/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123"}'
```

### 7. Deploy to Cloudflare

```bash
npm run deploy
```

Your worker will be available at:
```
https://guythatlives.net/api/gchat/signup
https://guythatlives.net/api/gchat/login
https://guythatlives.net/api/gchat/validate
https://guythatlives.net/api/gchat/change-password
```

## Update G-Chat Client

Now update `auth-manager.js` to use Cloudflare Workers instead of Firebase Functions:

### Option 1: Create new auth-manager-cloudflare.js

I'll create a modified version that calls the Cloudflare Worker endpoints.

### Option 2: Environment variable

Or add a config at the top of `auth-manager.js`:

```javascript
const USE_CLOUDFLARE = true;
const WORKER_URL = 'https://guythatlives.net/api/gchat';
```

Then modify the Cloud Function calls to HTTP fetch calls.

## Cost Comparison

| Service | Firebase Functions (Blaze) | Cloudflare Workers (Free) |
|---------|---------------------------|---------------------------|
| First 2M invocations | Free | Free (up to 100k/day) |
| Storage | Firestore (free tier) | KV (100k reads, 1k writes/day free) |
| Deployment | Requires Blaze plan | Free |
| Cold starts | ~1-2 seconds | <100ms (edge) |
| **Monthly cost for G-Chat** | **$0** (likely) | **$0** |

## Architecture

```
User Browser
    ↓
Cloudflare Worker (Edge)
    ↓ (stores sessions/accounts)
Workers KV Storage
    ↓ (stores profiles/servers/messages)
Firebase Firestore
```

- **Authentication**: Cloudflare Workers + KV
- **Data**: Firebase Firestore (works on Spark plan)
- **Files**: Firebase Storage

## Security

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ Sessions stored in Workers KV (auto-expire after 7 days)
- ✅ CORS headers for browser security
- ✅ Rate limiting available (Cloudflare WAF)

## Monitoring

View analytics in Cloudflare Dashboard:
1. Go to Workers & Pages
2. Click "gchat-auth"
3. See request counts, errors, latency

## Troubleshooting

### "Module not found: bcryptjs"
- Run `npm install` in `cloudflare-workers/gchat-auth/`

### "KV namespace not found"
- Make sure you created the namespaces in step 3
- Check IDs are correct in `wrangler.toml`

### "Route not working"
- Verify domain in Cloudflare
- Check route pattern matches your domain

### "CORS error"
- Worker includes CORS headers automatically
- Make sure client is using correct URL

## Next Steps

1. ✅ Deploy worker: `npm run deploy`
2. ✅ Update G-Chat client to use worker endpoints
3. ✅ Test signup/login flow
4. ✅ Deploy Firestore rules (still needed for data)

Let me know when the worker is deployed and I'll update the client code!
