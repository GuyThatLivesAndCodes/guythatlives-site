# Cloudflare Workers AI - Deployment Guide

This guide will help you deploy the AI Chat Worker to enable AI functionality on your GitHub Pages site.

## ⚡ Architecture

**GitHub Pages (Static)** → **Cloudflare Worker (AI Processing)** → **Workers AI**

Your site runs on GitHub Pages (static HTML/CSS/JS), while the Cloudflare Worker handles all AI requests securely. This keeps your GitHub repo clean and your setup simple!

## Prerequisites

1. **Cloudflare Account** - Sign up at https://cloudflare.com (FREE!)
2. **Wrangler CLI** - Install with `npm install -g wrangler`
3. **Node.js** - Version 16 or higher
4. **GitHub Pages site** - Already running! ✅

## Step 1: Install Wrangler

```bash
npm install -g wrangler
```

## Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate.

## Step 3: Deploy the Worker

Navigate to the workers directory and deploy:

```bash
cd workers
wrangler deploy
```

After deployment, you'll get a URL like:
```
https://ai-chat-worker.YOUR-SUBDOMAIN.workers.dev
```

## Step 4: Update Frontend Configuration

Edit `/unblocked/ai/ai-chat.js` and update the `WORKER_URL` (around line 9):

```javascript
const WORKER_URL = 'https://ai-chat-worker.YOUR-SUBDOMAIN.workers.dev';
```

Replace `YOUR-SUBDOMAIN` with your actual Cloudflare subdomain from Step 3.

## Step 5: Commit and Push to GitHub

```bash
git add unblocked/ai/ai-chat.js
git commit -m "Update AI worker URL"
git push origin main
```

GitHub Pages will automatically update your site!

## Step 6: Test the AI Chat

1. Wait ~1 minute for GitHub Pages to update
2. Open your site: `https://YOUR-USERNAME.github.io/YOUR-REPO/unblocked/ai/chat.html`
3. Select a model from the dropdown
4. Send a test message
5. You should get an AI response! 🎉

If it doesn't work, check:
- Browser console (F12) for errors
- Worker URL is correct in `ai-chat.js`
- Worker is deployed: `wrangler deployments list`

## Pricing & Free Tier

### Free Tier (No Credit Card Required!)
- **10,000 Neurons per day** - Enough for hundreds of chat messages
- **100,000 AI Gateway logs per month**
- **No expiration** - Free forever!

### What are Neurons?
Neurons are Cloudflare's unit of measurement for AI requests. Different models consume different amounts:
- Simple requests: ~10 neurons
- Complex requests: ~50 neurons
- With the free tier (10,000/day), you can handle **200-1000 chat messages per day**

### If You Need More
**Workers Paid Plan**: $5/month
- Unlimited neurons (pay per use)
- Higher rate limits
- Priority support

## Available Models

Your AI chat includes 5 optimized models (under 40B for best performance):

### ⭐ Recommended (Pre-selected)
1. **Llama 4 Scout 17B** 📝 - Latest from Meta, best overall (DEFAULT)
2. **Mistral Small 3.1 24B** 📝 - Excellent for general tasks
3. **GPT-OSS 20B** 📝 - OpenAI-compatible, fast

### 🔥 Other Great Models
4. **Gemma 3 12B** 📝 - Google's efficient model
5. **Llama 3.2 11B Vision** 📝🖼️ - Text chat + image understanding!

**Legend:**
- 📝 = Text chat support
- 🖼️ = Image reading support

## Features

✅ **Session-based chat** - No login required
✅ **File upload support** - Images, PDFs, text files (vision models)
✅ **5 AI models** - Optimized for speed (all under 40B)
✅ **No API key exposure** - Secure through Workers
✅ **Mobile responsive** - Works on all devices
✅ **Auto-saves chat** - Persists during session
✅ **Markdown support** - Full formatting + syntax highlighting
✅ **Image understanding** - Llama 3.2 Vision reads images

## Troubleshooting

### "Worker not found" error
- Make sure you deployed the worker: `wrangler deploy`
- Check that the URL in `ai-chat.js` matches your worker URL

### "AI request failed" error
- Verify your Cloudflare account has Workers AI enabled
- Check the browser console for detailed errors
- Make sure you're within the free tier limits (10k/day)

### Rate limiting
If you exceed 10,000 neurons/day:
- Wait until the next day (resets at midnight UTC)
- Or upgrade to the Workers Paid plan ($5/month)

## GitHub Pages + Custom Domain (Optional)

If you're using a custom domain with GitHub Pages (like `guythatlives.net`):

### Option 1: Keep Worker on workers.dev (Recommended)
Just use the worker URL as-is. It works perfectly with custom domains!

### Option 2: Use Custom Domain for Worker
If your custom domain is on Cloudflare:

1. Add a route in `wrangler.toml`:
```toml
routes = [
  { pattern = "guythatlives.net/api/ai-chat", zone_name = "guythatlives.net" }
]
```

2. Update the `WORKER_URL` in `ai-chat.js`:
```javascript
const WORKER_URL = 'https://guythatlives.net/api/ai-chat';
```

3. Redeploy:
```bash
wrangler deploy
```

4. Push to GitHub:
```bash
git add unblocked/ai/ai-chat.js
git commit -m "Use custom domain for AI worker"
git push origin main
```

## GitHub Pages Benefits

✅ **Static hosting** - No server costs
✅ **Auto-deploy** - Push to GitHub = instant updates
✅ **Free SSL** - GitHub provides HTTPS
✅ **CDN built-in** - Fast global delivery
✅ **Worker handles AI** - Keep repo clean & lightweight

## Security Notes

✅ **API keys are safe** - Never exposed in your GitHub repo
✅ **Worker is separate** - Not in your static site code
✅ **CORS enabled** - Only your domain can call it
✅ **Rate limiting** - Built-in Cloudflare protection
✅ **No data logging** - Session-based, not stored
✅ **GitHub repo stays clean** - No secrets in version control

## Support

- **Cloudflare Docs**: https://developers.cloudflare.com/workers-ai/
- **Community**: https://community.cloudflare.com/
- **Status**: https://www.cloudflarestatus.com/

Enjoy your AI chat! 🚀
