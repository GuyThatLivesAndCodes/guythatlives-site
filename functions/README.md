# Firebase Functions Setup

This directory contains Firebase Cloud Functions that handle secure API calls to Claude AI for test analysis.

## Why Use Firebase Functions?

**The API key is kept secure on the backend** and never exposed in your frontend code. This prevents:
- GitHub from detecting and removing your API key (their secret scanning)
- Users from seeing your API key in browser dev tools
- Unauthorized use of your API key

## Setup Instructions

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Your Project (if not already done)

```bash
# From the root of your project
firebase init functions

# Select:
# - Use an existing project (guythatlives-unblocked)
# - JavaScript
# - No ESLint (optional)
# - Install dependencies now
```

### 4. Install Dependencies

```bash
cd functions
npm install
```

### 5. Configure Your Claude API Key

**IMPORTANT:** Run this command to securely store your API key:

```bash
firebase functions:config:set claude.api_key="YOUR_CLAUDE_API_KEY_HERE"
```

Replace `YOUR_CLAUDE_API_KEY_HERE` with your actual Claude API key from:
https://console.anthropic.com/settings/keys

**The key is stored in Firebase's secure environment and never appears in your code!**

### 6. Deploy the Functions

```bash
# From the functions directory or project root
firebase deploy --only functions
```

This will deploy the `analyzeTest` function to Firebase.

### 7. Verify Deployment

After deployment, you should see:

```
✔  functions[analyzeTest(us-central1)] Successful create operation.
Function URL: https://us-central1-guythatlives-unblocked.cloudfunctions.net/analyzeTest
```

## Testing

### Test Locally with Emulator

```bash
# From project root
firebase emulators:start --only functions

# Your function will run at:
# http://localhost:5001/guythatlives-unblocked/us-central1/analyzeTest
```

### Check Configuration

To verify your API key is set:

```bash
firebase functions:config:get
```

Should show:

```json
{
  "claude": {
    "api_key": "sk-ant-api03-..."
  }
}
```

## How It Works

1. **Frontend** (`api-handler.js`) calls `analyzeTest` Firebase Function
2. **Backend** (Firebase Function) retrieves the API key from secure environment
3. **Backend** makes request to Claude API with the secure key
4. **Backend** returns the analysis to the frontend
5. **Your API key never appears in the frontend code or GitHub!**

## Troubleshooting

### Error: "Claude API key is not configured"

Run: `firebase functions:config:set claude.api_key="YOUR_KEY"`

### Error: "User must be authenticated"

Make sure the user is logged in via Firebase Auth before calling the function.

### Function not found

1. Check deployment: `firebase functions:list`
2. Redeploy: `firebase deploy --only functions`

### Check Function Logs

```bash
firebase functions:log
```

## Cost Information

Firebase Functions free tier includes:
- 2 million invocations/month
- 400,000 GB-seconds/month
- 200,000 CPU-seconds/month

The `analyzeTest` function is lightweight and should stay well within free tier limits for normal usage.

## Security Notes

- ✅ API key is stored securely in Firebase environment
- ✅ Only authenticated users can call the function
- ✅ API key never appears in frontend code or GitHub
- ✅ CORS issues are avoided (backend-to-backend communication)
- ✅ Rate limiting can be added if needed

## Need Help?

- Firebase Functions docs: https://firebase.google.com/docs/functions
- Claude API docs: https://docs.anthropic.com/
- Firebase console: https://console.firebase.google.com/
