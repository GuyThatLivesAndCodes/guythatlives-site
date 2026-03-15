# Remote Play Setup Guide (SECURE VERSION)

This guide explains how to securely configure Hyperbeam for remote game streaming using Firebase Cloud Functions to keep your API key hidden.

## 🔒 Security Overview

**Your Hyperbeam API key is NEVER exposed to the client!**

Instead of putting the API key in your HTML/JavaScript:
- ✅ The API key is stored securely in Firebase Functions config
- ✅ All Hyperbeam API calls go through your Cloud Function
- ✅ Users can't steal or abuse your API key
- ✅ You have full control over session limits and usage

## 1. Get Your Hyperbeam API Key

1. Go to [Hyperbeam Dashboard](https://hyperbeam.com/dashboard)
2. Sign in or create an account
3. Navigate to **API Keys** section
4. Create a new API key
5. Copy the API key (e.g., `hb_xxxxxxxxxxxxxxxxxxxxx`)

## 2. Configure Firebase Functions (SECURE)

Set your Hyperbeam API key in Firebase Functions config:

```bash
# Navigate to your project root (where functions/ folder is)
cd H:\testape\guythatlives-site

# IMPORTANT: Make sure you're using the guythatlives-unblocked project
firebase use unblocked

# Set the API key securely
firebase functions:config:set hyperbeam.api_key="hb_YOUR_ACTUAL_KEY_HERE"
```

**Important:**
- Replace `hb_YOUR_ACTUAL_KEY_HERE` with your actual Hyperbeam API key
- The unblocked games section uses the `guythatlives-unblocked` Firebase project

## 3. Deploy the Cloud Functions

Deploy the new remote play functions to Firebase:

```bash
firebase deploy --only functions:createRemoteSession,functions:endRemoteSession,functions:cleanupRemoteSessions
```

This will deploy three functions:
- `createRemoteSession` - Creates Hyperbeam sessions securely
- `endRemoteSession` - Ends sessions and promotes queued users
- `cleanupRemoteSessions` - Automatically cleans up stale sessions every 5 minutes

## 4. Update Firestore Security Rules

Add rules to protect the `remoteSessions` collection. Open `firestore.rules` and add:

```javascript
// Remote Play sessions
match /remoteSessions/{sessionId} {
  // Anyone can read their own session
  allow read: if request.auth != null;

  // Only allow updates to lastHeartbeat field
  allow update: if request.auth != null
    && request.resource.data.keys().hasOnly(['lastHeartbeat']);

  // No direct writes (must use Cloud Functions)
  allow create, delete: if false;
}
```

Then deploy the rules:

```bash
firebase deploy --only firestore:rules
```

## 5. Test It Out

1. Open your site at `/unblocked/remote/fortnite.html`
2. Click "Start Playing"
3. The page will:
   - Call your Cloud Function (API key stays hidden)
   - Create a Hyperbeam session securely
   - Show queue if someone else is playing
   - Connect you to the stream

## 6. How It Works

```
User Browser
    ↓
    Calls: firebase.functions().httpsCallable('createRemoteSession')
    ↓
Firebase Cloud Function (YOUR_API_KEY is here, secure!)
    ↓
    Calls: Hyperbeam API with secure key
    ↓
Hyperbeam creates VM session
    ↓
Returns session URL (NOT the API key!)
    ↓
User Browser receives URL and connects
```

**Key Point:** The API key NEVER leaves your Firebase server!

## 7. Hyperbeam Pricing (as of 2026)

- **Free Tier**: Limited sessions per month (~50 hours)
- **Starter**: ~$99/month - Good for testing
- **Pro**: Custom pricing - For production use

Check latest pricing: https://hyperbeam.com/pricing

## 8. Advanced Configuration

### Auto-launch a URL

Edit `/functions/index.js`, find the `createRemoteSession` function, and update the request body:

```javascript
const requestBody = JSON.stringify({
    start_url: 'https://now.gg/play/epic-games/4804/fortnite', // Auto-launch this URL
    timeout: {
        absolute: 3600, // 1 hour max
        inactive: 300   // 5 min inactivity
    }
});
```

Then redeploy:
```bash
firebase deploy --only functions:createRemoteSession
```

### Adjust Concurrent Session Limit

In `/functions/index.js`, find:
```javascript
const MAX_CONCURRENT = 1; // Single concurrent session
```

Change `1` to any number (e.g., `5` for 5 concurrent users), then redeploy.

### Monitor Active Sessions

Check your Firebase Console:
- Go to **Firestore Database**
- Open `remoteSessions` collection
- See active/queued/ended sessions in real-time

## 9. Troubleshooting

### "Hyperbeam API key is not configured"
Run: `firebase functions:config:get` to verify the key is set.

### Sessions not ending
Check Firebase Console logs for the `cleanupRemoteSessions` function.

### API quota exceeded
Check your Hyperbeam dashboard for usage limits.

### Check your config
```bash
firebase functions:config:get
```

Should show:
```json
{
  "hyperbeam": {
    "api_key": "hb_xxxxx..."
  }
}
```

## 10. Legal & TOS Considerations

⚠️ **Important**:
- Hyperbeam provides streaming infrastructure legally
- You must still comply with Epic Games' Terms of Service
- Consider streaming browser-based alternatives or games with explicit cloud gaming licenses
- This setup is best for educational/personal use

## 11. Cost Optimization

To save on Hyperbeam costs:

1. **Shorter session timeouts** - In `functions/index.js`:
   ```javascript
   timeout: { absolute: 1800 } // 30 minutes instead of 1 hour
   ```

2. **Limit daily usage** - Add rate limiting in Cloud Functions

3. **Use NOW.gg** for Fortnite specifically (they handle TOS):
   ```javascript
   start_url: 'https://now.gg/play/epic-games/4804/fortnite'
   ```

## Support

- Hyperbeam Docs: https://docs.hyperbeam.com
- Firebase Functions: https://firebase.google.com/docs/functions
- Check browser console and Firebase Functions logs for errors
