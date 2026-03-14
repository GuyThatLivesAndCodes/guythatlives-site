# 🚀 Quick Start for GitHub Pages

This is a **super simple** setup guide for your AI Chat on GitHub Pages!

## What You're Doing

Your site is on **GitHub Pages** (static files) → The **Cloudflare Worker** handles AI (separate, secure) → Everything works together! 🎉

## 5-Minute Setup

### 1. Install Wrangler (One Time)

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare (Free Account!)

```bash
wrangler login
```

This opens your browser - just click "Allow"

### 3. Deploy the Worker

```bash
cd workers
wrangler deploy
```

You'll see output like:
```
✨ Deployed ai-chat-worker
   https://ai-chat-worker.YOUR-NAME.workers.dev
```

**COPY THAT URL!** ⬆️

### 4. Update Your Site

Edit `/unblocked/ai/ai-chat.js` - Find line ~9 and update:

```javascript
const WORKER_URL = 'https://ai-chat-worker.YOUR-NAME.workers.dev';
```

Paste the URL you copied in step 3!

### 5. Push to GitHub

```bash
git add .
git commit -m "Add AI chat with Cloudflare Workers AI"
git push origin main
```

### 6. Test It!

Wait ~1 minute for GitHub Pages to update, then visit:
```
https://YOUR-USERNAME.github.io/YOUR-REPO/unblocked/ai/chat.html
```

Try chatting with the AI! 🤖

## That's It! 🎉

Your AI chat is now live and costs **$0/month** for:
- 10,000 AI requests per day (free forever)
- 5 optimized AI models (including vision!)
- File upload support
- Markdown formatting + syntax highlighting
- No login required

## Costs Breakdown

| Service | Cost | What You Get |
|---------|------|--------------|
| GitHub Pages | **FREE** | Static hosting, SSL, CDN |
| Cloudflare Worker | **FREE** | 100,000 requests/day |
| Workers AI | **FREE** | 10,000 neurons/day (~500 chats) |
| **TOTAL** | **$0/month** | Full AI chat system! |

## If You Need More

Only if you exceed 10,000 neurons/day:
- **Workers Paid**: $5/month → Unlimited AI requests
- Still way cheaper than OpenAI/Claude APIs!

## Troubleshooting

### "Failed to get AI response"
- Check browser console (F12)
- Make sure `WORKER_URL` in `ai-chat.js` matches your deployed worker
- Run `wrangler deployments list` to verify worker is live

### Worker not found
- Make sure you ran `wrangler deploy` in the `/workers` folder
- Check you're logged in: `wrangler whoami`

### Changes not showing
- GitHub Pages takes ~1 minute to update
- Hard refresh: Ctrl+Shift+R (Chrome) or Cmd+Shift+R (Mac)
- Check GitHub Actions tab to see deployment status

## Need Help?

- Check the full README.md in this folder
- Cloudflare Docs: https://developers.cloudflare.com/workers-ai/
- GitHub Pages: https://docs.github.com/pages

Enjoy your free AI chat! 🚀✨
