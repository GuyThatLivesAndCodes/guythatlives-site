# 🔥 Remote Play - Project Information

## 📦 Firebase Projects Overview

Your site uses **multiple Firebase projects**. Here's the breakdown:

```
H:\testape\guythatlives-site
│
├── .firebaserc (project aliases)
│   ├── default → guythatlives-site
│   ├── math → guythatlives-math
│   └── unblocked → guythatlives-unblocked ⭐ (THIS ONE!)
│
└── functions/
    └── index.js (All Cloud Functions for all projects)
```

### Project: `guythatlives-unblocked` ⭐

**Used by:** Unblocked Games section (`/unblocked/`)

**Firebase Config:**
```javascript
{
  apiKey: "AIzaSyDgwsYD-rah3Hxn0ApLZFj6E1Ro6Uz2clY",
  authDomain: "guythatlives-unblocked.firebaseapp.com",
  projectId: "guythatlives-unblocked",
  storageBucket: "guythatlives-unblocked.firebasestorage.app",
  messagingSenderId: "309436720074",
  appId: "1:309436720074:web:cfde766602392e2ff46533",
  measurementId: "G-FFSQ617L77"
}
```

**Cloud Functions Deployed:**
- Game-related functions
- **Remote Play functions** (NEW!)
  - `createRemoteSession`
  - `endRemoteSession`
  - `cleanupRemoteSessions`

### Project: `guythatlives-math`

**Used by:** Math platform (`/math/`)

**Cloud Functions:**
- `analyzeTest` - Claude API for math analysis
- Staff course builder functions
- etc.

## 🎯 Remote Play Architecture

### Where Things Live

```
Frontend:
/unblocked/remote/fortnite.html
  ↓
  Uses Firebase Project: guythatlives-unblocked
  ↓
  Calls Cloud Function: createRemoteSession
  ↓
Backend:
/functions/index.js
  ↓
  Deployed to: guythatlives-unblocked
  ↓
  Stores API key securely
  ↓
  Calls Hyperbeam API
```

### Data Storage

**Firestore Collection:** `remoteSessions` (in `guythatlives-unblocked`)

```javascript
{
  sessionId: "uuid",
  gameId: "fortnite",
  userId: "anon_xxx",
  status: "active",
  embedUrl: "https://...",
  adminToken: "...",
  lastHeartbeat: 1234567890
}
```

## ⚙️ Configuration Requirements

### Firebase Functions Config

Set in: **guythatlives-unblocked** project

```bash
firebase use unblocked
firebase functions:config:set hyperbeam.api_key="hb_YOUR_KEY"
```

This creates:
```json
{
  "hyperbeam": {
    "api_key": "hb_xxxxx..."
  }
}
```

**IMPORTANT:** Each Firebase project has its own separate config!

If you run:
```bash
firebase use math
firebase functions:config:get
```

You'll see **different** config (Claude API keys, etc.), NOT Hyperbeam key.

## 🚀 Deployment Workflow

### Step-by-Step

1. **Switch Project**
   ```bash
   firebase use unblocked
   ```

2. **Verify Project**
   ```bash
   firebase projects:list
   # Should show: Currently set alias: unblocked
   ```

3. **Set API Key** (only needed once)
   ```bash
   firebase functions:config:set hyperbeam.api_key="hb_YOUR_KEY"
   ```

4. **Deploy Functions**
   ```bash
   firebase deploy --only functions:createRemoteSession,functions:endRemoteSession,functions:cleanupRemoteSessions
   ```

5. **Test**
   - Open: `/unblocked/remote/fortnite.html`
   - Click "Start Playing"

## ⚠️ Common Gotchas

### ❌ Mistake: Deploying to wrong project

```bash
firebase use default  # OOPS! This is guythatlives-site
firebase deploy --only functions
# ^ Deploys to WRONG project!
```

**Result:** Functions won't work, API key not found.

### ✅ Solution: Always verify project first

```bash
firebase use  # Check current project
firebase use unblocked  # Switch if needed
firebase deploy --only functions:createRemoteSession,functions:endRemoteSession,functions:cleanupRemoteSessions
```

### ❌ Mistake: Setting config in wrong project

```bash
firebase use math  # Wrong project!
firebase functions:config:set hyperbeam.api_key="hb_xxx"
# ^ Set in guythatlives-math, not guythatlives-unblocked!
```

**Result:** Remote play won't find the API key.

### ✅ Solution: Always use `unblocked` project

```bash
firebase use unblocked
firebase functions:config:set hyperbeam.api_key="hb_xxx"
```

## 🔍 Verification Commands

### Check Current Project
```bash
firebase use
# Output: Currently set alias: unblocked
```

### Check Functions in Project
```bash
firebase use unblocked
firebase functions:list
# Should show: createRemoteSession, endRemoteSession, cleanupRemoteSessions
```

### Check Config
```bash
firebase use unblocked
firebase functions:config:get
# Should show hyperbeam.api_key
```

## 📝 File Locations

```
H:\testape\guythatlives-site\
│
├── .firebaserc ..................... Project aliases
├── functions/
│   └── index.js .................... All Cloud Functions (multi-project)
│
└── unblocked/
    ├── index.html .................. Main page (added Remote Play link)
    ├── shared/
    │   └── games-auth.js ........... Uses guythatlives-unblocked config
    │
    └── remote/
        ├── fortnite.html ........... Remote play page
        ├── SETUP.md ................ Detailed setup guide
        ├── QUICKSTART.md ........... 5-minute quick start
        ├── README.md ............... Architecture docs
        ├── deploy.md ............... Deployment guide
        └── PROJECT-INFO.md ......... This file!
```

## 🎓 Best Practices

1. **Always verify project before deploying**
   ```bash
   firebase use && firebase deploy
   ```

2. **Use specific function names when deploying**
   ```bash
   # Good - only deploys remote play functions
   firebase deploy --only functions:createRemoteSession,functions:endRemoteSession,functions:cleanupRemoteSessions

   # Bad - deploys ALL functions (slow, risky)
   firebase deploy --only functions
   ```

3. **Keep config organized**
   - `guythatlives-unblocked`: Hyperbeam API key
   - `guythatlives-math`: Claude API key
   - Never mix them up!

4. **Document which project each feature uses**
   - See comments in `functions/index.js`
   - Each function section notes which project it's for

## 📚 Related Docs

- **Quick Start**: `QUICKSTART.md` - Get running in 5 minutes
- **Setup Guide**: `SETUP.md` - Detailed configuration
- **Deployment**: `deploy.md` - Deployment best practices
- **Architecture**: `README.md` - How it all works

---

**Need help?** Check the troubleshooting section in `deploy.md`!
