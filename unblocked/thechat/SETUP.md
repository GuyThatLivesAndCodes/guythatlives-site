# TheChat - Quick Setup Guide

## 🚀 5-Minute Setup

### Step 1: Enable Firebase Realtime Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (same one used for authentication)
3. Click **Realtime Database** in the left sidebar
4. Click **Create Database**
5. Select location (choose closest to your users)
6. Start in **locked mode** (we'll add rules next)

### Step 2: Deploy Security Rules

1. In Firebase Console, go to **Realtime Database** > **Rules** tab
2. Open the file `database.rules.json` in this directory
3. Copy the entire contents
4. Paste into the Firebase rules editor
5. Click **Publish**

You should see something like:
```json
{
  "rules": {
    "servers": {
      ...
    }
  }
}
```

### Step 3: Get Tenor API Key (for GIFs)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Click **APIs & Services** > **Library**
4. Search for "Tenor API"
5. Click **Enable**
6. Go to **Credentials** > **Create Credentials** > **API Key**
7. Copy your API key
8. Open `app.js` and find this line:
   ```javascript
   const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRUduvRY';
   ```
9. Replace it with your key:
   ```javascript
   const TENOR_API_KEY = 'YOUR_API_KEY_HERE';
   ```

### Step 4: Test It Out!

1. Make sure you're logged into your site
2. Navigate to: `https://yourdomain.com/unblocked/thechat/`
3. You should see the chat interface!
4. Try sending a message in the #general channel

## ✅ Verification Checklist

- [ ] Firebase Realtime Database is enabled
- [ ] Security rules are deployed (check Firebase Console)
- [ ] Tenor API key is added to `app.js`
- [ ] User is authenticated before accessing chat
- [ ] Messages can be sent and received
- [ ] GIF picker works (search for "hello")
- [ ] Can edit own messages (hover and click menu)
- [ ] Can delete own messages

## 🔧 Troubleshooting

### "Permission Denied" when sending messages
**Solution:** Make sure you deployed the security rules from `database.rules.json`

### Redirected to login page immediately
**Solution:** This is correct! TheChat requires authentication. Make sure you're logged in first.

### GIFs don't load
**Solution:**
1. Check that you have a valid Tenor API key
2. Verify the key is correctly pasted in `app.js`
3. Check browser console for errors

### Messages not appearing
**Solution:**
1. Check Firebase Console > Realtime Database
2. Look for data under `servers/home/channels/general/messages/`
3. If empty, try sending a test message
4. Check browser console for errors

## 📊 Monitoring

### View Data in Firebase Console

1. Go to Firebase Console > Realtime Database
2. Click on **Data** tab
3. You'll see structure like:
   ```
   servers
   └── home
       └── channels
           └── general
               └── messages
                   └── (message IDs)
   ```

### Check Usage

1. Go to Firebase Console > Realtime Database
2. Click on **Usage** tab
3. Monitor:
   - Simultaneous connections
   - GB stored
   - GB downloaded

## 🎯 Next Steps

### Optional Enhancements

1. **Custom Server Icons**
   - Add icon URLs to server data
   - Display in left sidebar

2. **User Presence**
   - Track online/offline status
   - Show in member list

3. **Typing Indicators**
   - Show "User is typing..." in channel

4. **Notifications**
   - Browser notifications for new messages
   - Sound effects

5. **Message Reactions**
   - Add emoji reactions to messages
   - Track who reacted

### Production Recommendations

1. **Rate Limiting**
   - Add message rate limits (e.g., max 10 messages per minute)
   - Prevent spam

2. **Content Moderation**
   - Add profanity filter
   - Report system for inappropriate content

3. **Backup**
   - Set up automated backups in Firebase
   - Export data regularly

4. **Analytics**
   - Track active users
   - Monitor message volume
   - Popular channels

## 🆘 Support

If you encounter issues:

1. **Check Browser Console** - Press F12 and look for errors
2. **Check Firebase Console** - Look for quota warnings or errors
3. **Verify Authentication** - Make sure your auth system is working
4. **Test Security Rules** - Use Firebase Rules Playground

## 🎉 You're Done!

Your Discord-style chat is now live! Users can:
- Send real-time messages
- Share GIFs
- Create and join servers
- Edit and delete their messages
- See who's online

Enjoy TheChat! 💬
