# G-Chat Cloudflare Deployment Guide

This guide shows how to deploy G-Chat using **Cloudflare Workers** instead of Firebase Cloud Functions. This works with Firebase Spark (free) plan!

## Why Cloudflare?

- ✅ **100% Free** for G-Chat usage (100,000 requests/day free)
- ✅ **No Blaze plan needed** - works with Firebase Spark plan
- ✅ **Faster** - edge-deployed, lower latency
- ✅ **You already use it** - same setup as GuyAI

## Architecture

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Cloudflare Worker (Edge)   │  ← Password hashing, sessions
│  /api/gchat/*               │
└────────┬────────────────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌──────────────┐   ┌─────────────────┐
│ Workers KV   │   │ Firebase        │
│ (Sessions)   │   │ Firestore       │
│              │   │ (Servers/Msgs)  │
└──────────────┘   └─────────────────┘
```

## Step-by-Step Deployment

### Part 1: Deploy Cloudflare Worker

#### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

#### 2. Login to Cloudflare

```bash
wrangler login
```

This opens browser to authenticate with your Cloudflare account (same one you use for GuyAI).

#### 3. Navigate to worker directory

```bash
cd cloudflare-workers/gchat-auth
```

#### 4. Create KV Namespaces

Run these commands to create storage for accounts and sessions:

```bash
# Production namespaces
wrangler kv:namespace create "GCHAT_ACCOUNTS"
wrangler kv:namespace create "GCHAT_SESSIONS"

# Preview namespaces (for testing)
wrangler kv:namespace create "GCHAT_ACCOUNTS" --preview
wrangler kv:namespace create "GCHAT_SESSIONS" --preview
```

You'll get output like:
```
✨ Success! Created KV namespace GCHAT_ACCOUNTS
 Add the following to your wrangler.toml:
 { binding = "GCHAT_ACCOUNTS", id = "abc123..." }
```

Copy all 4 IDs (2 production, 2 preview).

#### 5. Update wrangler.toml

Edit `cloudflare-workers/gchat-auth/wrangler.toml`:

```toml
name = "gchat-auth"
main = "worker.js"
compatibility_date = "2024-01-01"

kv_namespaces = [
  { binding = "GCHAT_ACCOUNTS", id = "YOUR_PRODUCTION_ID_HERE", preview_id = "YOUR_PREVIEW_ID_HERE" },
  { binding = "GCHAT_SESSIONS", id = "YOUR_PRODUCTION_ID_HERE", preview_id = "YOUR_PREVIEW_ID_HERE" }
]

routes = [
  { pattern = "guythatlives.net/api/gchat/*", zone_name = "guythatlives.net" }
]
```

Replace the IDs with the ones from step 4.

#### 6. Install Dependencies

```bash
npm install
```

#### 7. Test Locally (Optional)

```bash
npm run dev
```

In another terminal, test with curl:

```bash
# Signup
curl -X POST http://localhost:8787/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123"}'

# Login
curl -X POST http://localhost:8787/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123"}'
```

You should see JSON responses with `sessionId`, `userId`, etc.

Press Ctrl+C to stop local server.

#### 8. Deploy to Cloudflare

```bash
npm run deploy
```

You'll see:
```
✨ Deployed successfully!
Worker URL: https://gchat-auth.YOUR_SUBDOMAIN.workers.dev
Custom domain: https://guythatlives.net/api/gchat/*
```

### Part 2: Deploy Firebase Rules

#### 9. Deploy Simplified Firestore Rules

Since we're not using Firebase Auth, we need simplified rules:

```bash
# From project root
cd ../..

# Copy simplified rules
cp firestore-gchat-simple.rules firestore.rules

# Deploy
firebase deploy --only firestore:rules
```

**OR** manually add the G-Chat rules to your existing `firestore.rules` (append to the file).

#### 10. Deploy Storage Rules (if not already done)

```bash
firebase deploy --only storage
```

### Part 3: Test the Integration

#### 11. Visit G-Chat

Open your browser to:
```
https://guythatlives.net/unblocked/g-chat/
```

#### 12. Create Test Account

1. Click "Sign up"
2. Enter:
   - Username: `testuser` (lowercase, alphanumeric)
   - Password: `TestPass123` (min 8 chars, uppercase, lowercase, number)
3. Click "Create Account"

You should see the main G-Chat interface!

#### 13. Verify in Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **Workers & Pages**
3. Click **gchat-auth**
4. Click **Metrics** tab
5. You should see 1 request (the signup)

#### 14. Verify in Firestore

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click your project
3. Go to **Firestore Database**
4. Navigate to `gchat/profiles/users/`
5. You should see your user profile

### Part 4: Make Yourself Admin

#### 15. Get Admin Access

To access the admin panel:

1. In Cloudflare Dashboard, go to **Workers & Pages** → **gchat-auth** → **KV**
2. Click **GCHAT_ACCOUNTS** namespace
3. Find key: `account:YOUR_USERNAME`
4. Click **Edit**
5. Find `"isAdmin": false` and change to `"isAdmin": true`
6. Click **Save**

OR use Wrangler CLI:

```bash
# Get current account data
wrangler kv:key get "account:YOUR_USERNAME" --namespace-id="YOUR_ACCOUNTS_NAMESPACE_ID"

# Edit the JSON to set isAdmin: true

# Put it back
wrangler kv:key put "account:YOUR_USERNAME" '{"username":"...","isAdmin":true,...}' --namespace-id="YOUR_ACCOUNTS_NAMESPACE_ID"
```

Refresh G-Chat page - you should see the 👑 Admin Panel button!

## Troubleshooting

### "Failed to fetch" error on signup/login

**Cause**: Worker not deployed or route not configured

**Fix**:
1. Run `npm run deploy` in `cloudflare-workers/gchat-auth/`
2. Check route in wrangler.toml matches your domain
3. Verify in Cloudflare Dashboard → Workers & Pages → gchat-auth → Routes

### "KV namespace not found"

**Cause**: Namespace IDs not updated in wrangler.toml

**Fix**:
1. Run `wrangler kv:namespace list`
2. Copy the IDs for GCHAT_ACCOUNTS and GCHAT_SESSIONS
3. Update wrangler.toml
4. Run `npm run deploy` again

### CORS errors

**Cause**: Worker not sending CORS headers (shouldn't happen, built-in)

**Fix**:
1. Check `worker.js` has `corsHeaders` in responses
2. Deploy again: `npm run deploy`

### "Permission denied" in Firestore

**Cause**: Rules not deployed or incorrect

**Fix**:
1. Deploy rules: `firebase deploy --only firestore:rules`
2. Check Firebase Console → Firestore → Rules tab
3. Verify `/gchat/` section exists with `allow read, write: if true;`

### Session expires immediately

**Cause**: KV expiration not set correctly

**Fix**:
1. Check `worker.js` has `{ expirationTtl: 7 * 24 * 60 * 60 }` in KV puts
2. Redeploy: `npm run deploy`

## Monitoring & Costs

### Check Usage

**Cloudflare:**
1. Dashboard → Workers & Pages → gchat-auth → Metrics
2. See requests, duration, errors

**Firebase:**
1. Console → Firestore Database → Usage tab
2. See reads, writes, deletes

### Free Tier Limits

**Cloudflare Workers:**
- 100,000 requests/day (plenty for G-Chat)
- 10ms CPU time per request
- KV: 100,000 reads/day, 1,000 writes/day

**Firebase Spark:**
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day
- 1GB storage

**For G-Chat with <100 active users: Both should stay free!**

## What's Stored Where

| Data Type | Storage Location | Why |
|-----------|------------------|-----|
| Password hashes | Cloudflare Workers KV | Security - never leaves edge |
| Sessions | Cloudflare Workers KV | Fast validation, auto-expire |
| User profiles | Firebase Firestore | Public data, real-time sync |
| Servers | Firebase Firestore | Real-time updates |
| Messages | Firebase Firestore | Real-time sync |
| Voice signaling | Firebase Firestore | WebRTC coordination |
| Avatars/Icons | Firebase Storage | File hosting |

## Next Steps

1. ✅ Deploy worker (steps 1-8)
2. ✅ Deploy Firebase rules (steps 9-10)
3. ✅ Test signup/login (steps 11-12)
4. ✅ Make yourself admin (step 15)
5. ✅ Create your first server!
6. ✅ Invite friends to join

## Security Notes

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ Sessions auto-expire after 7 days
- ✅ CORS headers prevent unauthorized access
- ✅ Rate limiting available (configure in Cloudflare)
- ⚠️ Firestore rules are permissive (we rely on client-side session checks)
  - This is OK for a small project but consider tightening for production

## Support

- Cloudflare Docs: https://developers.cloudflare.com/workers/
- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler/
- GuyAI setup (similar): `/unblocked/guyai/CLOUDFLARE_SETUP.md`

Enjoy G-Chat! 🎉
