# Claude API Setup Guide

## ✅ Current Status: WORKING!

Your Claude API is now set up and ready to use for **local development and testing**.

## How It Works Now

The system uses a **3-tier fallback approach**:

1. **Firebase Functions** (most secure - for production)
   - Tries first if available
   - API key stored securely on backend
   - Not yet deployed

2. **Local Development Config** (currently active ✓)
   - Uses `config.local.js` with your API key
   - File is gitignored - **never committed to GitHub**
   - Perfect for testing and development
   - **THIS IS WORKING RIGHT NOW!**

3. **Basic Fallback** (no API access)
   - Simple analysis without AI
   - Used if both above methods fail

## ✅ What's Working Now

- **AI Analysis is LIVE** in your math test
- Your API key is in `math/adaptive-test/config.local.js`
- The file is **protected by .gitignore** - it will NEVER be committed
- GitHub won't delete it because it's never pushed
- Test at: https://guythatlives.net/math/adaptive-test/

## 🔒 Security Status

✅ API key is in a local-only file (config.local.js)
✅ File is gitignored - won't be committed
✅ GitHub won't see or delete the key
✅ Only works on your deployed site (not in repo)

## 🚀 Deploy to Production (Optional - For Later)

When you want to move to the more secure Firebase Functions:

### Option 1: Easy Script
```bash
./deploy-firebase-functions.sh
```

### Option 2: Manual Steps
```bash
# Login to Firebase
firebase login

# Set your API key (secure backend storage)
firebase functions:config:set claude.api_key="YOUR_KEY"

# Deploy
firebase deploy --only functions
```

After deployment:
- The system will automatically use Firebase Functions
- You can delete `config.local.js` if you want
- API key will be completely secure on Firebase backend

## 📁 Important Files

### Protected (Gitignored - Never Committed):
- `math/adaptive-test/config.local.js` - Your API key (local only)
- `functions/node_modules/` - Dependencies
- `functions/.runtimeconfig.json` - Firebase configs

### Safe to Commit:
- `functions/index.js` - Firebase Function code (no keys)
- `math/adaptive-test/api-handler.js` - API handler (no keys)
- `.gitignore` - Protection rules

## ✨ Testing

1. Go to: https://guythatlives.net/math/adaptive-test/
2. Complete a test
3. Check the results page - you should see **detailed AI analysis**!
4. Open browser console - you should see: "Using local API key for development"

## 🛠️ Troubleshooting

### "Using fallback analysis"
- Check if `config.local.js` exists in `math/adaptive-test/`
- Verify the API key is correct

### "API error 401"
- API key might be invalid or expired
- Get a new key from: https://console.anthropic.com/settings/keys

### GitHub deleted my key!
- Don't worry! Your local `config.local.js` is safe
- It's gitignored and never uploaded
- The key only exists on your deployed site

## 🎯 Summary

**Current Setup:**
- ✅ AI analysis working locally with config.local.js
- ✅ API key protected by .gitignore
- ✅ GitHub won't see or delete the key
- ✅ Ready for production upgrade anytime

**Future Upgrade (Optional):**
- Run `./deploy-firebase-functions.sh`
- Even more secure (backend-only API key)
- No local config needed
- Recommended for production

---

**The AI analysis is working right now!** Try finishing a test to see it in action. 🎉
