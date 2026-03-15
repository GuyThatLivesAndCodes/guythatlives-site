# 🧪 Testing Guide - Hyperbeam Remote Play

## ✅ What We Fixed

The `addEventListener is not a function` error is now fixed! Here's what changed:

### 1. **Correct SDK Initialization**
```javascript
// OLD (Wrong)
const Hyperbeam = await import('...');
hyperbeamClient = await Hyperbeam.default(container, url);
hyperbeamClient.addEventListener('close', ...); // ❌ This doesn't exist!

// NEW (Correct)
const HyperbeamModule = await import('...');
const Hyperbeam = HyperbeamModule.default || HyperbeamModule;
hyperbeamClient = await Hyperbeam(container, url, options);
hyperbeamClient.destroy(); // ✅ Use .destroy() to clean up
```

### 2. **Proper Error Handling**
```javascript
try {
    hyperbeamClient = await Hyperbeam(container, embedUrl, options);
} catch (error) {
    // Handle SessionTerminatedError, TimedOutError, etc.
    if (error.name === 'SessionTerminatedError') {
        // Session already ended
    }
}
```

### 3. **Manual End Button**
Added a red "End Session" button in the top bar for testing cleanup.

---

## 🧪 Testing Checklist

### Test 1: Basic Session Start

1. ✅ Open `/unblocked/remote/fortnite.html`
2. ✅ Click "Start Playing"
3. ✅ Should see "Connecting..." then Hyperbeam VM loads
4. ✅ Status shows "Connected" (green dot)
5. ✅ Red "End Session" button appears

**Expected:** No console errors, Hyperbeam VM visible

---

### Test 2: Manual Session End

1. ✅ Start a session (Test 1)
2. ✅ Click red "End Session" button
3. ✅ Confirm the popup
4. ✅ Check browser console logs:
   ```
   Ending session... [session-id]
   Calling hyperbeamClient.destroy()...
   Hyperbeam client destroyed
   Terminating session via worker: [session-id]
   Session terminated successfully
   ```
5. ✅ Status shows "Session Ended"
6. ✅ "End Session" button disappears
7. ✅ "Start Playing" button is enabled again

**Expected:** Clean shutdown, no errors

---

### Test 3: Tab Close Cleanup

1. ✅ Start a session
2. ✅ **Close the tab** (or browser)
3. ✅ Wait 2-3 seconds
4. ✅ Open `terminate-sessions.html`
5. ✅ List active sessions

**Expected:** Session should be terminated (0 active sessions)

---

### Test 4: Tab Switch Cleanup

1. ✅ Start a session
2. ✅ **Switch to another tab** or minimize browser
3. ✅ Wait 2-3 seconds
4. ✅ Open `terminate-sessions.html` in new tab
5. ✅ List active sessions

**Expected:** Session should be terminated

---

### Test 5: Error Handling

1. ✅ Start a session
2. ✅ In Hyperbeam dashboard, manually terminate the session
3. ✅ Try to interact with the VM on your site

**Expected:** Should handle gracefully (may show error or reconnect)

---

### Test 6: Multiple Sessions (Quota Test)

1. ✅ Start session in Tab 1
2. ✅ Open new tab, start session in Tab 2
3. ✅ If you have 2/2 quota:
   - Should get error or queue message

**Expected:** Proper quota handling

---

## 🔍 Console Debugging

### Good Console Output

When starting a session:
```
Hyperbeam client initialized: {destroy: ƒ, tabs: {...}, ...}
```

When ending a session:
```
Ending session... abc-123-def
Calling hyperbeamClient.destroy()...
Hyperbeam client destroyed
Terminating session via worker: abc-123-def
Session terminated successfully
```

### Bad Console Output (Errors)

❌ `hyperbeamClient.addEventListener is not a function`
→ **Fixed!** Make sure you deployed the latest code.

❌ `Worker error: 405`
→ Check `WORKER_URL` has `https://` prefix

❌ `Failed to create session: Hyperbeam API error: 403`
→ API key invalid or quota exceeded

---

## 📊 Monitoring Sessions

### Check Active Sessions

**Method 1: Terminator Tool**
```
1. Open terminate-sessions.html
2. Enter API key
3. Click "List Active Sessions"
```

**Method 2: Hyperbeam Dashboard**
```
1. Go to https://hyperbeam.com/dashboard
2. Check active VMs count
```

### Clean Up Stuck Sessions

If sessions are stuck:
```
1. Use terminate-sessions.html
2. Click "Terminate All Sessions"
3. Verify count goes to 0
```

---

## 🎯 Common Issues & Fixes

### Issue: "addEventListener is not a function"

**Fix:** Deploy latest `fortnite.html` code (already fixed!)

### Issue: Session won't terminate

**Checklist:**
- [ ] Is Cloudflare Worker updated with DELETE code?
- [ ] Check browser console - are DELETE requests being sent?
- [ ] Try manual termination via dashboard

**Quick Fix:**
```
1. Open terminate-sessions.html
2. Kill all sessions manually
3. Test again
```

### Issue: Hyperbeam VM shows but is black screen

**Possible causes:**
- Session already terminated
- Network issues
- Invalid embedUrl

**Fix:**
- End session and try again
- Check Hyperbeam dashboard for errors

### Issue: Worker 405 error

**Fix:**
```javascript
// In fortnite.html, make sure URL has https://
const WORKER_URL = 'https://hyperbeam-proxy.zorbyteofficial.workers.dev';
//                  ^^^^^^^^ Must have this!
```

---

## ✅ Deployment Checklist

Before going live:

### 1. Update Cloudflare Worker
- [ ] Copy latest code from `cloudflare-worker.js`
- [ ] Paste into Cloudflare dashboard
- [ ] Save and Deploy
- [ ] Verify `HYPERBEAM_API_KEY` env var is set

### 2. Deploy Frontend
```bash
cd H:\testape\guythatlives-site
git add .
git commit -m "Fix Hyperbeam SDK integration"
git push
```

### 3. Test All Scenarios
- [ ] Test 1: Basic session start ✅
- [ ] Test 2: Manual end button ✅
- [ ] Test 3: Tab close cleanup ✅
- [ ] Test 4: Tab switch cleanup ✅
- [ ] Test 5: Error handling ✅
- [ ] Test 6: Quota limits ✅

### 4. Monitor First Hour
- Check Cloudflare Worker logs for errors
- Check Hyperbeam dashboard for stuck sessions
- Watch browser console for client errors

---

## 📚 API Reference

### Hyperbeam Client API

```javascript
// Initialize
const hb = await Hyperbeam(container, embedUrl, {
    adminToken: token,
    delegateKeyboard: true,
    videoPaused: false
});

// Destroy (cleanup)
hb.destroy();

// Tab API (optional)
hb.tabs.create({ active: true });
hb.tabs.onCreated.addListener((tab) => {
    console.log('New tab:', tab.id);
});
```

### Worker API

```javascript
// Create session
POST https://your-worker.workers.dev
Body: { gameId: "fortnite", action: "create" }

// End session
POST https://your-worker.workers.dev
Body: { sessionId: "abc-123", action: "end" }
```

---

## 📖 Documentation Sources

- [Hyperbeam Examples](https://docs.hyperbeam.com/client-sdk/javascript/examples)
- [@hyperbeam/web on npm](https://www.npmjs.com/package/@hyperbeam/web)
- [Hyperbeam GitHub Docs](https://github.com/hyperbeam/docs)

---

## 🎉 You're Ready!

All the `addEventListener` errors are fixed. The SDK now uses the correct Hyperbeam API:

✅ `await Hyperbeam(container, embedUrl, options)` - Correct initialization
✅ `hyperbeamClient.destroy()` - Proper cleanup
✅ Manual "End Session" button - Easy testing
✅ Auto-cleanup on tab close - No stuck sessions

**Test it now and let me know how it goes!** 🚀
