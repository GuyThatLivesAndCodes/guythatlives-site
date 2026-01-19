# Windows Deployment Guide for Firebase Functions

## What Went Wrong

You accidentally initialized Firebase in the wrong directory (`C:\Users\brist\Downloads\d`) instead of using the pre-configured functions in `guythatlives-site-main`. This created TypeScript functions instead of the JavaScript functions I already set up.

## Quick Fix - Deploy from the Correct Directory

### Step 1: Navigate to the Correct Directory
```cmd
cd C:\Users\brist\Downloads\guythatlives-site-main
```

### Step 2: Check Your Firebase Project
```cmd
firebase use
```

If it shows the wrong project or gives an error, set it to the correct one:
```cmd
firebase use guythatlives-math
```

If you need to add the project:
```cmd
firebase projects:list
firebase use --add guythatlives-math
```

### Step 3: Make Sure You're Logged In
```cmd
firebase login
```

### Step 4: Your API Key is Already Set!
You already ran this command successfully:
```cmd
firebase functions:config:set claude.api_key="YOUR_API_KEY_HERE"
```
✅ This is stored in Firebase's backend - you don't need to do this again!

### Step 5: Install Function Dependencies
```cmd
cd functions
npm install
cd ..
```

### Step 6: Deploy!
```cmd
firebase deploy --only functions
```

## Alternative: Use the Batch Script

Double-click `deploy-firebase-functions.bat` or run:
```cmd
deploy-firebase-functions.bat
```

This will guide you through the whole process.

## Important Notes

### Your Functions Directory Structure Should Be:
```
guythatlives-site-main/
├── functions/
│   ├── index.js          ← JavaScript (correct)
│   ├── package.json      ← Already configured
│   ├── .gitignore
│   └── README.md
├── firebase.json          ← Points to functions folder
└── deploy-firebase-functions.bat
```

### NOT This (what firebase init created):
```
d/
└── functions/
    └── src/
        └── index.ts      ← TypeScript (wrong)
```

## If You Still Have Issues

### Error: "Functions predeploy error"
The functions in the `d` directory have TypeScript linting errors. **Don't use that directory!** Use `guythatlives-site-main` instead.

### Error: "No project active"
Run:
```cmd
firebase use guythatlives-math
```

### Check Your Configuration
```cmd
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

## After Successful Deployment

You'll see:
```
✔  functions[analyzeTest(us-central1)] Successful create operation.
Function URL: https://us-central1-guythatlives-math.cloudfunctions.net/analyzeTest
```

Then:
1. ✅ The AI analysis will automatically use the secure Firebase Function
2. ✅ You can delete `math/adaptive-test/config.local.js` (no longer needed)
3. ✅ Your API key is 100% secure on Firebase backend

## Testing

After deployment, test at: https://guythatlives.net/math/adaptive-test/

In the browser console, you should see:
```
Using Firebase Functions for analysis
```
Instead of:
```
Using local API key for development
```

## Summary

1. **Don't use the `d` directory** - it has the wrong setup
2. **Use `guythatlives-site-main` directory** - it has the correct JavaScript functions
3. **Your API key is already configured** in Firebase
4. **Just run:** `firebase deploy --only functions` from the correct directory

---

Need help? The working code is in `guythatlives-site-main/functions/index.js` (JavaScript, not TypeScript).
