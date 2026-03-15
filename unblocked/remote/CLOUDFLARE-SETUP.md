# 🔥 Cloudflare Workers Setup Guide (100% FREE!)

This guide shows you how to set up Hyperbeam remote play using **Cloudflare Workers** - completely free and keeps your API key secure!

## 🎯 Why Cloudflare Workers?

- ✅ **100% FREE** - 100,000 requests/day on free tier
- ✅ **No credit card required**
- ✅ **API key stays secure** on Cloudflare's servers
- ✅ **Super fast** - edge computing worldwide
- ✅ **No Firebase Blaze plan needed**

---

## 📋 Step 1: Get Hyperbeam API Key (2 min)

1. Go to https://hyperbeam.com/dashboard
2. Sign up (free tier available)
3. Navigate to **API Keys** section
4. Click **Create API Key**
5. Copy the key (looks like `hb_xxxxxxxxxxxxxxxxxxxxx`)

---

## 🚀 Step 2: Create Cloudflare Worker (3 min)

### 2.1 Sign into Cloudflare

1. Go to https://dash.cloudflare.com/sign-up
2. Create account or sign in (no credit card needed!)

### 2.2 Create New Worker

1. Click **Workers & Pages** in the left sidebar
2. Click **Create Application**
3. Click **Create Worker**
4. Name it: `hyperbeam-proxy` (or whatever you want)
5. Click **Deploy**

### 2.3 Add Worker Code

1. After deployment, click **Edit Code**
2. Delete all existing code
3. Copy the code from `cloudflare-worker.js` in this folder
4. Paste it into the editor
5. Click **Save and Deploy**

---

## 🔒 Step 3: Add API Key Securely (1 min)

### 3.1 Add Environment Variable

1. In your worker page, click **Settings** tab
2. Scroll to **Environment Variables**
3. Click **Add variable**

**Variable details:**
- **Name**: `HYPERBEAM_API_KEY`
- **Value**: `hb_your_actual_key_here` (paste your Hyperbeam key)
- **Type**: Select **Encrypt** (keeps it secret!)

4. Click **Save**

### 3.2 Deploy Changes

1. Click **Deployments** tab
2. Your worker should auto-redeploy with the new variable

---

## 🌐 Step 4: Get Your Worker URL (30 sec)

Your worker URL will look like:

```
https://hyperbeam-proxy.YOUR-USERNAME.workers.dev
```

**Find it:**
1. Go to your worker in Cloudflare dashboard
2. Look at the top - you'll see the URL
3. Copy it!

Example: `https://hyperbeam-proxy.myusername.workers.dev`

---

## 📝 Step 5: Update fortnite.html (1 min)

1. Open `H:\testape\guythatlives-site\unblocked\remote\fortnite.html`

2. Find this line (around line 303):
   ```javascript
   const WORKER_URL = 'https://YOUR-WORKER-NAME.YOUR-USERNAME.workers.dev';
   ```

3. Replace with YOUR worker URL:
   ```javascript
   const WORKER_URL = 'https://hyperbeam-proxy.myusername.workers.dev';
   ```

4. Save the file

---

## ✅ Step 6: Test It! (30 sec)

1. Commit and push your changes to GitHub:
   ```bash
   cd H:\testape\guythatlives-site
   git add .
   git commit -m "Add Cloudflare Worker for remote play"
   git push
   ```

2. Wait for GitHub Pages to deploy (~1-2 minutes)

3. Open: `https://guythatlives.com/unblocked/remote/fortnite.html`

4. Click **Start Playing**

5. You should see a Hyperbeam session load! 🎉

---

## 🔍 Troubleshooting

### ❌ "Worker error: 500"

**Problem:** API key not configured

**Fix:**
1. Go to Cloudflare Dashboard → Workers
2. Click your worker → Settings → Variables
3. Check `HYPERBEAM_API_KEY` is set and encrypted
4. Redeploy worker

### ❌ CORS error in browser console

**Problem:** Worker CORS headers not configured

**Fix:**
Already configured in the worker code! If you see this, make sure you deployed the latest code.

### ❌ "Failed to fetch"

**Problem:** Wrong worker URL

**Fix:**
1. Check your worker URL in Cloudflare dashboard
2. Update `WORKER_URL` in `fortnite.html`
3. Make sure URL includes `https://`

### ❌ Hyperbeam session won't load

**Problem:** Invalid API key or quota exceeded

**Fix:**
1. Check Hyperbeam dashboard: https://hyperbeam.com/dashboard
2. Verify API key is valid
3. Check you haven't exceeded free tier limits
4. Try creating a new API key

---

## 📊 How It Works

```
┌─────────────────────────┐
│   User's Browser        │
│   (fortnite.html)       │
└────────┬────────────────┘
         │
         │ POST request (NO API key!)
         │
         ▼
┌─────────────────────────────────────┐
│   Cloudflare Worker                 │
│   (hyperbeam-proxy)                 │
│                                     │
│   • API key stored here (SECURE!)  │
│   • Calls Hyperbeam API             │
└────────┬────────────────────────────┘
         │
         │ HTTPS with API key
         │
         ▼
┌─────────────────────────┐
│   Hyperbeam API         │
│   Creates VM session    │
└────────┬────────────────┘
         │
         │ Returns embedUrl + adminToken
         │
         ▼
┌─────────────────────────┐
│   User's Browser        │
│   Connects to stream    │
└─────────────────────────┘
```

**Key Point:** The API key **NEVER** reaches the user's browser!

---

## 🎛️ Advanced Configuration

### Auto-Launch a URL

Edit your worker code in Cloudflare dashboard:

```javascript
// In the createSession function, uncomment this line:
start_url: 'https://now.gg/play/epic-games/4804/fortnite',
```

Then **Save and Deploy**.

### Adjust Session Timeouts

In worker code, find:
```javascript
timeout: {
  absolute: 3600, // 1 hour (change this!)
  inactive: 300   // 5 minutes (change this!)
}
```

### Restrict to Your Domain Only

For production, change CORS in worker:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://guythatlives.com', // Only your site!
  // ... rest stays the same
};
```

---

## 💰 Costs & Limits

### Cloudflare Workers (Free Tier)
- ✅ 100,000 requests/day
- ✅ No credit card required
- ✅ No time limit

### Hyperbeam (Free Tier)
- ⚠️ ~50 hours/month
- ⚠️ Limited concurrent sessions
- 💵 Paid plans start at ~$99/month

**For most use cases, both stay FREE!**

---

## 📈 Monitoring

### View Worker Logs

1. Cloudflare Dashboard → Workers
2. Click your worker
3. Click **Logs** tab
4. See real-time requests and errors

### Check Usage

1. Workers dashboard → Analytics
2. See requests per day
3. Monitor if approaching 100k limit

---

## 🔄 Updating the Worker

If you need to change the code:

1. Go to Cloudflare Dashboard → Workers
2. Click your worker
3. Click **Quick Edit** or **Edit Code**
4. Make changes
5. Click **Save and Deploy**

Changes are live immediately!

---

## 🆚 Cloudflare vs Firebase

| Feature | Cloudflare Workers | Firebase Functions |
|---------|-------------------|-------------------|
| Free Tier | ✅ 100k req/day | ❌ Requires Blaze ($) |
| Credit Card | ❌ Not required | ✅ Required |
| Setup Time | ⚡ 5 minutes | 🕐 15 minutes |
| Performance | 🚀 Edge (faster) | ☁️ Cloud regions |
| API Key Security | 🔒 Secure | 🔒 Secure |

**Winner for free usage: Cloudflare Workers!**

---

## 📚 Related Files

- `cloudflare-worker.js` - Worker source code
- `fortnite.html` - Frontend page
- `README.md` - Project overview

---

## ✅ Quick Checklist

Before going live:

- [ ] Hyperbeam API key obtained
- [ ] Cloudflare Worker created
- [ ] API key added as encrypted environment variable
- [ ] Worker URL copied
- [ ] `fortnite.html` updated with worker URL
- [ ] Changes committed and pushed to GitHub
- [ ] Tested on live site

---

**Need help?** Check the troubleshooting section or Cloudflare Workers docs: https://developers.cloudflare.com/workers/

---

🎉 **You're done! Your API key is now 100% secure and you're not paying Firebase!**
