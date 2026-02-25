# TheChat Troubleshooting Guide

## Common Issues & Solutions

### "Error initializing app" or "channelsList is null"

**Cause:** Browser is loading cached (old) version of app.js

**Solution:**
1. **Hard Refresh** - Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
2. **Clear Cache:**
   - Chrome: Press F12 → Network tab → Check "Disable cache"
   - Firefox: Press F12 → Network tab → Check "Disable Cache"
   - Then refresh the page
3. **Use Incognito/Private Mode** - This forces a fresh load

### "Permission Denied" Errors

**Cause:** Firebase security rules not deployed

**Solution:**
1. Go to Firebase Console
2. Select your project
3. Click **Realtime Database** → **Rules**
4. Copy contents of `database.rules.json`
5. Paste into rules editor
6. Click **Publish**

### Profile Not Saving

**Cause:** Database rules not allowing writes

**Solution:**
1. Verify you're logged in (check bottom left)
2. Check Firebase Console for errors
3. Ensure database rules are deployed (see above)
4. Try refreshing and editing again

### Servers Not Showing Up

**Cause:** User doesn't have servers linked to their profile

**Solution:**
1. Create a new server (+ button)
2. Or join an existing server (compass button)
3. Server should appear immediately in left sidebar
4. If not, hard refresh (Ctrl + Shift + R)

### DMs Not Working

**Cause:** Users need to be friends first

**Solution:**
1. Click on user's profile (from member list or message)
2. Click "Add Friend"
3. Once friends, you can start a DM
4. DM will appear in left sidebar under "Direct Messages"

### Status Not Updating

**Cause:** Database rules or profile not syncing

**Solution:**
1. Edit profile again
2. Select status from dropdown
3. Click Save
4. Hard refresh to see changes

### GIFs Not Loading

**Cause:** Invalid Tenor API key

**Solution:**
1. Get a free API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Tenor API
3. Open `app.js`
4. Find line: `const TENOR_API_KEY = '...'`
5. Replace with your key
6. Save and refresh

### Messages Not Sending

**Cause:** Not connected to server/DM or database rules issue

**Solution:**
1. Verify you're in a channel or DM (check header)
2. Check you have internet connection
3. Check Firebase Console for quota issues
4. Verify database rules are deployed

### Can't See Other Users

**Cause:** Privacy settings or not in same server

**Solution:**
1. Join the same server as other users
2. Check if user is blocked
3. Look in server member list (right sidebar)

### "Loading TheChat..." Stuck

**Cause:** Firebase not connecting or auth failing

**Solution:**
1. Check internet connection
2. Check browser console for errors (F12)
3. Verify Firebase is configured correctly
4. Try signing out and back in

## Browser-Specific Issues

### Chrome
- Clear site data: Settings → Privacy → Clear browsing data
- Check if cookies are enabled
- Try disabling extensions

### Firefox
- Clear cache: Options → Privacy → Clear Data
- Check Enhanced Tracking Protection settings
- Allow cookies for your site

### Safari
- Clear website data: Preferences → Privacy → Manage Website Data
- Check "Prevent cross-site tracking" setting
- Allow cookies

## Debug Steps

### Check Browser Console
1. Press F12
2. Click **Console** tab
3. Look for red error messages
4. Share errors if asking for help

### Check Network Tab
1. Press F12
2. Click **Network** tab
3. Refresh page
4. Look for failed requests (red)
5. Check if app.js loads correctly

### Verify Firebase Connection
1. Open browser console (F12)
2. Type: `firebase.database().ref('.info/connected').on('value', snap => console.log('Connected:', snap.val()))`
3. Should log `Connected: true`
4. If false, check Firebase configuration

## Still Having Issues?

### Before Asking for Help:
1. ✅ Hard refresh (Ctrl + Shift + R)
2. ✅ Check browser console for errors
3. ✅ Verify Firebase rules are deployed
4. ✅ Try incognito/private mode
5. ✅ Clear cache and cookies

### When Reporting Issues:
- Browser and version
- Error messages from console
- Steps to reproduce
- Screenshots if possible

## Performance Issues

### Chat Slow/Laggy

**Solutions:**
- Close unused tabs
- Check internet speed
- Clear browser cache
- Limit messages per channel (already set to 100)
- Check Firebase quotas in console

### High Firebase Costs

**Solutions:**
- Messages limited to 100 per channel
- Consider pagination for older messages
- Monitor usage in Firebase Console
- Optimize queries if needed

## Reset & Fresh Start

### Complete Reset

If nothing works, try this:
1. Sign out of TheChat
2. Clear all site data (browser settings)
3. Close and reopen browser
4. Go to `/unblocked/thechat/`
5. Sign in again
6. Everything should be fresh

---

**Most issues are solved with a hard refresh!** Press `Ctrl + Shift + R` 🔄
