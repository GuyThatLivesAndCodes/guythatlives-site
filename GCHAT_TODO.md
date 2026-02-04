# G-Chat Deployment Checklist

## Current Status: Ready to Deploy with Cloudflare Workers! ✅

All code is complete. Just need to deploy the Cloudflare Worker.

---

## Deployment Steps (5 minutes)

### [ ] Step 1: Install Wrangler CLI
```bash
npm install -g wrangler
```

### [ ] Step 2: Login to Cloudflare
```bash
wrangler login
```
(Uses same account as GuyAI)

### [ ] Step 3: Create KV Namespaces
```bash
cd cloudflare-workers/gchat-auth

wrangler kv:namespace create "GCHAT_ACCOUNTS"
wrangler kv:namespace create "GCHAT_SESSIONS"
wrangler kv:namespace create "GCHAT_ACCOUNTS" --preview
wrangler kv:namespace create "GCHAT_SESSIONS" --preview
```

Copy the 4 namespace IDs that are displayed.

### [ ] Step 4: Update wrangler.toml
Edit `cloudflare-workers/gchat-auth/wrangler.toml`:

Paste your namespace IDs:
```toml
kv_namespaces = [
  { binding = "GCHAT_ACCOUNTS", id = "PASTE_HERE", preview_id = "PASTE_HERE" },
  { binding = "GCHAT_SESSIONS", id = "PASTE_HERE", preview_id = "PASTE_HERE" }
]
```

### [ ] Step 5: Install Worker Dependencies
```bash
npm install
```

### [ ] Step 6: Deploy Worker
```bash
npm run deploy
```

Wait for "✨ Deployed successfully!"

### [ ] Step 7: Deploy Firebase Rules
```bash
cd ../..
firebase deploy --only firestore:rules,storage
```

### [ ] Step 8: Test!
Visit: `https://guythatlives.net/unblocked/g-chat/`

Click "Sign up" and create an account.

---

## Post-Deployment

### [ ] Make Yourself Admin

**Option A: Cloudflare Dashboard**
1. Go to Cloudflare Dashboard
2. Workers & Pages → gchat-auth → KV
3. Click GCHAT_ACCOUNTS namespace
4. Find key: `account:YOUR_USERNAME`
5. Edit → Change `"isAdmin": false` to `"isAdmin": true`
6. Save

**Option B: Wrangler CLI**
```bash
wrangler kv:key get "account:YOUR_USERNAME" --namespace-id="YOUR_ACCOUNTS_ID"
# Edit the JSON to set isAdmin: true
wrangler kv:key put "account:YOUR_USERNAME" '{"username":"...","isAdmin":true,...}' --namespace-id="YOUR_ACCOUNTS_ID"
```

### [ ] Create First Server
1. Refresh G-Chat
2. Click "+" button
3. Create a server
4. Invite friends!

---

## Files Reference

**Deployment Guides:**
- `unblocked/g-chat/DEPLOYMENT_SUMMARY.md` - Quick overview (this file)
- `unblocked/g-chat/CLOUDFLARE_DEPLOYMENT.md` - Full step-by-step guide
- `cloudflare-workers/gchat-auth/SETUP.md` - Worker-specific setup

**Code Files:**
- `cloudflare-workers/gchat-auth/worker.js` - Authentication logic (✅ complete)
- `unblocked/g-chat/auth-manager-cloudflare.js` - Client code (✅ complete)
- `unblocked/g-chat/index.html` - Main UI (✅ complete)

**All other G-Chat files are complete and ready!**

---

## Why This Approach?

Firebase Cloud Functions require Blaze (pay-as-you-go) plan. Cloudflare Workers are:
- ✅ **Free** (100,000 requests/day)
- ✅ **Faster** (edge-deployed)
- ✅ **Same security** (bcrypt password hashing)
- ✅ **You already use it** (GuyAI uses Cloudflare)

---

## Need Help?

1. Check `CLOUDFLARE_DEPLOYMENT.md` for detailed instructions
2. Look at GuyAI setup: `unblocked/guyai/CLOUDFLARE_SETUP.md` (similar pattern)
3. Check browser console (F12) for errors
4. Verify worker deployed: https://guythatlives.net/api/gchat/login

---

## Troubleshooting

**"Failed to fetch" on signup:**
- Worker not deployed → Run `npm run deploy`
- Route not configured → Check wrangler.toml

**"KV namespace not found":**
- IDs not updated → Update wrangler.toml with namespace IDs
- Namespaces not created → Run KV create commands again

**Permission denied in Firestore:**
- Rules not deployed → Run `firebase deploy --only firestore:rules`

---

Once deployed, G-Chat will be live at:
**https://guythatlives.net/unblocked/g-chat/**

Good luck! 🚀
