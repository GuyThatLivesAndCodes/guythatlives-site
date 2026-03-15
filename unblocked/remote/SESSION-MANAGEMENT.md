# 🛑 Session Management & Cleanup

## Problem: Stuck Sessions

When testing, sessions can get "stuck" if you:
- Close the browser without ending the session
- Refresh the page mid-session
- Have browser crashes
- Network disconnects

This uses up your Hyperbeam quota (2 concurrent on free tier).

---

## 🚨 Immediate Fix: Terminate Stuck Sessions

### Option 1: Use the Terminator Tool (Easiest)

1. **Open**: `terminate-sessions.html` (in this folder)
   - Or go to: `file:///H:/testape/guythatlives-site/unblocked/remote/terminate-sessions.html`

2. **Enter your Hyperbeam API key**

3. **Click "List Active Sessions"**

4. **Click "Terminate All Sessions"**

Done! Your quota is freed up.

### Option 2: Hyperbeam Dashboard

1. Go to https://hyperbeam.com/dashboard
2. Click **Sessions** or **Active VMs**
3. Click **Stop** on each session

### Option 3: Wait (Auto-Cleanup)

Sessions auto-expire after:
- 1 hour (absolute timeout)
- 5 minutes of inactivity

Just wait and they'll clean themselves up.

---

## ✅ Prevention: Auto-Cleanup (Now Implemented!)

I've added **3 layers of auto-cleanup** to prevent this in the future:

### 1. **Tab Close Detection**
When you close the tab, the session automatically ends.

```javascript
// In fortnite.html
window.addEventListener('beforeunload', () => {
    endSession(); // Terminates Hyperbeam session
});
```

### 2. **Tab Hidden Detection**
When you switch tabs or minimize the browser, session ends.

```javascript
document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentSessionId) {
        endSession(); // Free up quota
    }
});
```

### 3. **Worker Termination**
The Cloudflare Worker now actually calls Hyperbeam's DELETE API.

```javascript
// In cloudflare-worker.js
DELETE https://engine.hyperbeam.com/v0/vm/${sessionId}
```

---

## 📊 How Sessions Work

### Session Lifecycle

```
1. User clicks "Start Playing"
   ↓
2. Worker creates Hyperbeam VM
   Status: ACTIVE (uses 1 quota slot)
   ↓
3. User plays game
   ↓
4. User closes tab
   ↓
5. Browser calls endSession()
   ↓
6. Worker sends DELETE to Hyperbeam
   Status: TERMINATED (frees quota slot)
```

### If Something Goes Wrong

```
1. User closes tab (but cleanup fails)
   ↓
2. Session stays ACTIVE
   ↓
3. After 5 min inactivity OR 1 hour
   ↓
4. Hyperbeam auto-terminates
   Status: EXPIRED (frees quota slot)
```

---

## 🔍 Debugging Session Issues

### Check Current Sessions

**Method 1: Terminator Tool**
- Open `terminate-sessions.html`
- Enter API key
- Click "List Active Sessions"

**Method 2: Hyperbeam Dashboard**
- https://hyperbeam.com/dashboard
- View active sessions count

**Method 3: Browser Console**
When on fortnite.html, check:
```javascript
console.log('Current session ID:', currentSessionId);
```

### Common Issues

| Problem | Solution |
|---------|----------|
| "2/2 VMs active" | Use terminator tool to kill sessions |
| Session won't end | Check browser console for errors |
| Sessions leak constantly | Make sure Worker DELETE code is deployed |
| Tab close doesn't end session | Check network tab - is DELETE request sent? |

---

## 🎯 Best Practices

### During Development

1. **Use the terminator tool** - Keep it bookmarked
2. **Check quota before testing** - Don't start with 2/2 active
3. **Test cleanup** - Close tab and verify session ends
4. **Monitor dashboard** - Check Hyperbeam sessions regularly

### Before Deploying

- [ ] Test tab close → session ends
- [ ] Test browser refresh → old session ends
- [ ] Test switching tabs → session ends (optional behavior)
- [ ] Verify Worker DELETE is working

### In Production

- **Set shorter timeouts** to free quota faster:
  ```javascript
  // In cloudflare-worker.js
  timeout: {
    absolute: 1800, // 30 min instead of 1 hour
    inactive: 180   // 3 min instead of 5 min
  }
  ```

- **Add rate limiting** per user (localStorage):
  ```javascript
  // Only allow 1 session per user per 30 minutes
  const lastSession = localStorage.getItem('last_session');
  if (lastSession && Date.now() - lastSession < 1800000) {
    alert('Please wait 30 min before starting another session');
    return;
  }
  ```

---

## 🚀 Updated Deployment Checklist

After these changes, redeploy:

### 1. Update Cloudflare Worker

1. Go to Cloudflare Dashboard
2. Click your worker → **Quick Edit**
3. Copy updated code from `cloudflare-worker.js`
4. **Save and Deploy**

### 2. Deploy Frontend

```bash
cd H:\testape\guythatlives-site
git add .
git commit -m "Add session auto-cleanup"
git push
```

### 3. Test Cleanup

1. Open `/unblocked/remote/fortnite.html`
2. Start a session
3. Close the tab immediately
4. Check Hyperbeam dashboard - session should be GONE
5. ✅ If gone = cleanup works!

---

## 📈 Monitoring

### Daily Checks

- Check Hyperbeam dashboard for stale sessions
- Review Cloudflare Worker logs for DELETE errors

### Weekly Cleanup

Even with auto-cleanup, manually check:
```
1. Open terminate-sessions.html
2. List sessions
3. Terminate any that shouldn't be there
```

---

## 🛠️ Files Updated

- ✅ `fortnite.html` - Added visibility/unload listeners
- ✅ `cloudflare-worker.js` - Added DELETE endpoint
- ✅ `terminate-sessions.html` - New admin tool
- ✅ `SESSION-MANAGEMENT.md` - This guide

---

## ⚡ Quick Reference

**Terminate all sessions NOW:**
```
1. Open: terminate-sessions.html
2. Enter API key
3. Click "Terminate All Sessions"
```

**Check if cleanup is working:**
```
1. Start session
2. Close tab
3. Check dashboard (session should be gone in 1-2 sec)
```

**Prevent leaks:**
- Keep timeouts short (30 min absolute, 3 min inactive)
- Test tab close behavior regularly
- Monitor Hyperbeam dashboard weekly

---

🎉 **With these updates, stuck sessions should be rare!**
