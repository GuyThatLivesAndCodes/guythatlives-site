# Deployment Guide for Remote Play

## ⚠️ IMPORTANT: Project Configuration

The **unblocked games** section uses the `guythatlives-unblocked` Firebase project.

The **Cloud Functions** are in the root `/functions/` folder and must be deployed to the correct project.

## 📋 Pre-Deployment Checklist

- [ ] You have a Hyperbeam API key
- [ ] You're in the project root directory (`H:\testape\guythatlives-site`)
- [ ] Firebase CLI is installed (`firebase --version`)

## 🚀 Deployment Steps

### 1. Switch to the Unblocked Project

```bash
# Navigate to project root
cd H:\testape\guythatlives-site

# Switch to the unblocked Firebase project
firebase use unblocked

# Verify you're on the right project
firebase projects:list
# Should show: guythatlives-unblocked (current)
```

### 2. Set Hyperbeam API Key

```bash
# Set the API key in Firebase config (SECURE!)
firebase functions:config:set hyperbeam.api_key="hb_YOUR_ACTUAL_KEY_HERE"

# Verify it was set
firebase functions:config:get
# Should show: { "hyperbeam": { "api_key": "hb_xxxxx..." } }
```

### 3. Deploy Cloud Functions

```bash
# Deploy ONLY the remote play functions to guythatlives-unblocked
firebase deploy --only functions:createRemoteSession,functions:endRemoteSession,functions:cleanupRemoteSessions

# This will NOT affect your other functions (analyzeTest, gchatLogin, etc.)
```

### 4. Update Firestore Security Rules (Optional)

If you want to add extra security for remote sessions:

```bash
# Edit firestore.rules and add the remoteSessions rules (see SETUP.md)
# Then deploy:
firebase deploy --only firestore:rules
```

### 5. Test the Deployment

1. Open: https://guythatlives.com/unblocked/remote/fortnite.html
2. Click "Start Playing"
3. Check browser console for errors
4. Check Firebase Console → Functions → Logs

## 📊 Verify Deployment

### Check Functions are Live

Firebase Console → Functions → Dashboard

You should see:
- ✅ `createRemoteSession`
- ✅ `endRemoteSession`
- ✅ `cleanupRemoteSessions`

### Check Firestore Collection

After first session:
Firebase Console → Firestore → `remoteSessions`

Should have documents with session data.

### Check Logs

Firebase Console → Functions → Logs

Look for:
- `createRemoteSession` invocations
- `cleanupRemoteSessions` scheduled runs

## 🔄 Re-deploying After Changes

If you modify the Cloud Functions code:

```bash
# Switch to unblocked project
firebase use unblocked

# Deploy updated functions
firebase deploy --only functions:createRemoteSession,functions:endRemoteSession,functions:cleanupRemoteSessions
```

## ⚠️ Common Mistakes

### ❌ Wrong: Deploying to the wrong project
```bash
firebase use default  # This is guythatlives-site
firebase deploy       # WRONG! Goes to wrong project
```

### ✅ Right: Always specify the project
```bash
firebase use unblocked  # Correct project
firebase deploy --only functions:createRemoteSession,functions:endRemoteSession,functions:cleanupRemoteSessions
```

## 🔍 Troubleshooting

### "Permission denied"
Make sure you're logged in to the Firebase account that owns `guythatlives-unblocked`:
```bash
firebase login
```

### "Function does not exist"
You might have deployed to the wrong project. Check:
```bash
firebase use
# Should show: Currently set project: guythatlives-unblocked
```

### "API key not configured"
Run:
```bash
firebase functions:config:get
```

If empty, set the key again:
```bash
firebase functions:config:set hyperbeam.api_key="hb_YOUR_KEY"
```

### Functions not updating
Force re-deploy:
```bash
firebase deploy --only functions:createRemoteSession --force
```

## 📝 Notes

- The `/functions/` folder contains functions for **ALL** Firebase projects
- When you run `firebase deploy`, it only deploys to the **currently selected project**
- Always verify with `firebase use` before deploying
- Each project has separate function configs (API keys, etc.)

---

**Quick Deploy Command (Copy-Paste)**

```bash
cd H:\testape\guythatlives-site && firebase use unblocked && firebase deploy --only functions:createRemoteSession,functions:endRemoteSession,functions:cleanupRemoteSessions
```
