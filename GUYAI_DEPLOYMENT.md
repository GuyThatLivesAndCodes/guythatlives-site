# GuyAI Deployment Guide

## Problem: Mixed Content Error

Your site uses HTTPS (`https://guythatlives.net`) but the Ollama server is HTTP (`http://oai1.guythatlives.net`). Browsers block HTTP requests from HTTPS pages for security reasons.

## Solution: Firebase Function Proxy

We've created a Firebase Cloud Function that acts as a secure proxy:

```
User (HTTPS) → Firebase Function (HTTPS) → Ollama API (HTTP) → Firebase Function → User
```

This allows secure HTTPS communication throughout while still accessing your HTTP Ollama server.

## Deployment Steps

### Option 1: Automated Deployment (Recommended)

1. **Run the deployment script:**
   ```bash
   deploy-guyai.bat
   ```

2. **Follow the prompts:**
   - The script will switch to the `guythatlives-unblocked` Firebase project
   - Install any missing dependencies
   - Deploy only the `ollamaProxy` function

3. **Wait for deployment to complete** (usually 1-2 minutes)

### Option 2: Manual Deployment

1. **Switch to the unblocked Firebase project:**
   ```bash
   firebase use unblocked
   ```

2. **Install function dependencies (if not already installed):**
   ```bash
   cd functions
   npm install
   cd ..
   ```

3. **Deploy the Ollama proxy function:**
   ```bash
   firebase deploy --only functions:ollamaProxy
   ```

4. **Wait for deployment to complete**

## Verification

After deployment, verify the function is working:

1. **Visit the Firebase Console:**
   - Go to https://console.firebase.google.com
   - Select `guythatlives-unblocked` project
   - Navigate to Functions section
   - Verify `ollamaProxy` function is deployed and healthy

2. **Test the chatbot:**
   - Navigate to https://guythatlives.net/unblocked/guyai/
   - Send a test message
   - You should see AI responses streaming in

3. **Check browser console:**
   - Press F12 to open developer tools
   - Look for any errors
   - Should see successful API calls to the Firebase Function

## Function Details

**Function Name:** `ollamaProxy`

**URL:** `https://us-central1-guythatlives-unblocked.cloudfunctions.net/ollamaProxy`

**Method:** POST

**Request Body:**
```json
{
  "model": "qwen3:4b",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "stream": true
}
```

**Features:**
- CORS enabled for cross-origin requests
- Streaming support for real-time responses
- Error handling and logging
- Proxies directly to Ollama API at `http://oai1.guythatlives.net/api/chat`

## Troubleshooting

### Function not deploying?

1. **Check Firebase CLI is installed:**
   ```bash
   firebase --version
   ```
   If not installed: `npm install -g firebase-tools`

2. **Ensure you're logged in:**
   ```bash
   firebase login
   ```

3. **Check you're on the right project:**
   ```bash
   firebase use
   ```
   Should show: `guythatlives-unblocked`

### Still getting CORS errors?

1. **Check the function URL in `guyai.js`:**
   - Should be: `https://us-central1-guythatlives-unblocked.cloudfunctions.net/ollamaProxy`

2. **Clear browser cache and reload**

3. **Check browser console for exact error message**

### Ollama server not responding?

1. **Verify Ollama is running:**
   ```bash
   curl http://oai1.guythatlives.net/api/tags
   ```

2. **Check the model is available:**
   - Should list `qwen3:4b` in the models array

3. **Check Firebase Function logs:**
   ```bash
   firebase functions:log
   ```

## Cost Considerations

Firebase Cloud Functions pricing:
- **Free tier:** 2M invocations/month, 400K GB-sec, 200K GHz-sec
- **Typical usage:** Each chat message = 1 invocation
- **Estimated cost:** Free for most usage levels

The proxy function is extremely lightweight and should stay within free tier limits for normal usage.

## Files Modified

1. **`functions/index.js`** - Added `ollamaProxy` function
2. **`unblocked/guyai/guyai.js`** - Updated to use Firebase Function URL
3. **`unblocked/index.html`** - Added GuyAI promotional banner

## Security Notes

- The proxy function has CORS enabled (`*`) for public access
- No authentication required (suitable for public chatbot)
- No user data is stored server-side (all local storage)
- Ollama API is accessed only from Firebase servers (not directly from clients)
- Rate limiting can be added if needed

## Next Steps After Deployment

1. **Test thoroughly** - Try various prompts and conversations
2. **Monitor usage** - Check Firebase Console for invocation counts
3. **Add rate limiting** (optional) - Prevent abuse if needed
4. **Consider caching** (optional) - Cache common responses to reduce Ollama load

## Support

If you encounter issues:

1. Check Firebase Functions logs: `firebase functions:log`
2. Check browser console for client-side errors
3. Verify Ollama server is accessible: `curl http://oai1.guythatlives.net/api/tags`
4. Test the function directly with curl:
   ```bash
   curl -X POST https://us-central1-guythatlives-unblocked.cloudfunctions.net/ollamaProxy \
     -H "Content-Type: application/json" \
     -d '{"model":"qwen3:4b","messages":[{"role":"user","content":"test"}],"stream":false}'
   ```
