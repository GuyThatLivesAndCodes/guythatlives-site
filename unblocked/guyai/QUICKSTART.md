# GuyAI Quick Start Guide

Get GuyAI running in 5 minutes!

## Step 1: Get Cloudflare Account ID (30 seconds)

1. Go to https://dash.cloudflare.com/
2. Click any website
3. Look in the right sidebar
4. Copy the **Account ID**
5. Paste it somewhere safe

## Step 2: Create API Token (2 minutes)

1. In Cloudflare, click your profile icon (top right)
2. Click **My Profile**
3. Go to **API Tokens** tab
4. Click **Create Token**
5. Select **"Edit Cloudflare Workers"** template
6. Click **Continue to Summary**
7. Click **Create Token**
8. **COPY THE TOKEN NOW** (you won't see it again!)
9. Paste it somewhere safe

## Step 3: Add Anthropic API Key to Gateway (2 minutes)

1. Go to https://console.anthropic.com/
2. Create an API key (if you don't have one)
3. Copy the key
4. Back in Cloudflare → **AI** → **AI Gateway**
5. Click your gateway: **unblocked-claude-gateway**
6. Add Anthropic API key
7. Save configuration

## Step 4: Deploy (30 seconds)

Run this command:
```bash
deploy-guyai.bat
```

Wait for deployment to complete.

## Step 5: Configure in Browser (30 seconds)

1. Visit https://guythatlives.net/unblocked/guyai/
2. Click the **⚙️** icon (top right)
3. Enter your credentials:
   - Account ID: [from step 1]
   - API Token: [from step 2]
   - Gateway ID: `unblocked-claude-gateway`
4. Click **Save Configuration**

## Step 6: Test! (10 seconds)

Type "Hello!" and hit Send.

You should get a response from Claude Haiku 4 in 1-2 seconds!

---

## Done! 🎉

Your secure, encrypted AI chat is now running!

## Need Help?

- **Detailed setup**: See `CLOUDFLARE_SETUP.md`
- **Configuration help**: See `CONFIG_TEMPLATE.md`
- **Troubleshooting**: See `README.md`
- **Full overview**: See `DEPLOYMENT_SUMMARY.md`

## Common Issues

**"Configure credentials"**
→ You skipped step 5. Click ⚙️ and enter your credentials.

**"401 Unauthorized"**
→ Your API token is wrong. Create a new one in step 2.

**"404 Not Found"**
→ Check the gateway ID. It should be: `unblocked-claude-gateway`

**Nothing happens when clicking Send**
→ Check browser console (F12). Make sure Anthropic key is in gateway.

## What You Just Built

✅ Secure AI chat with Claude Haiku 4
✅ End-to-end encryption (AES-256)
✅ Privacy-first (no server storage)
✅ Fast responses (~1-2 seconds)
✅ Costs ~$0.15/month for 100 chats
✅ No infrastructure to maintain

Enjoy! 🚀
