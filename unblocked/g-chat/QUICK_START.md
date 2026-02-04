# G-Chat Quick Start Guide

## For Users

### Creating an Account

1. Visit `/unblocked/g-chat/` on the site
2. Click "Sign up" on the login screen
3. Enter your desired username (3-20 characters, alphanumeric + underscore)
4. Choose a strong password (min 8 characters with uppercase, lowercase, and number)
5. Optionally add your email for password recovery (coming soon)
6. Click "Create Account"

### Logging In

1. Enter your username (case-insensitive)
2. Enter your password
3. Click "Login"
4. Your session will remain active for 7 days

### Creating Your First Server

1. After logging in, click the "+" button in the server list (left sidebar)
2. Enter a server name (e.g., "Gaming Community")
3. Add a description (optional)
4. Upload a server icon (optional, max 2MB)
5. Click "Create"
6. Your server will appear with default channels: #general and 🔊voice-1

### Sending Messages

1. Click on a server in the left sidebar
2. Click on a text channel (e.g., #general)
3. Type your message in the input box at the bottom
4. Press Enter or click "Send"
5. Messages appear instantly for all server members

### Joining Voice Chat

1. Click on a voice channel (🔊)
2. Click "Join Voice" button
3. Grant microphone permissions when prompted
4. Use the controls to:
   - 🎤 Mute/unmute yourself
   - 🔇 Deafen/undeafen (mute all audio)
5. Click "Disconnect" to leave the voice channel

### Requesting Featured Status

1. Open your server
2. Click the menu button (⋮) next to the server name
3. Select "Request Featured"
4. Write a message explaining why your server should be featured
5. Submit for admin review

---

## For Developers

### Local Testing

1. Clone the repository
2. Install dependencies:
   ```bash
   cd functions
   npm install
   ```

3. Start Firebase emulators (optional):
   ```bash
   firebase emulators:start
   ```

4. Open `unblocked/g-chat/index.html` in a browser
5. Create test accounts and experiment

### Deploying to Production

**Option 1: Use deployment script (Windows)**
```bash
cd unblocked/g-chat
deploy.bat
```

**Option 2: Use deployment script (Linux/Mac)**
```bash
cd unblocked/g-chat
chmod +x deploy.sh
./deploy.sh
```

**Option 3: Manual deployment**
```bash
# Deploy Cloud Functions
firebase deploy --only functions:gchatSignup,functions:gchatLogin,functions:gchatValidateSession,functions:gchatChangePassword,functions:gchatCleanupSessions,functions:gchatExpireFeatured

# Deploy Firestore Rules
firebase deploy --only firestore:rules

# Deploy Storage Rules
firebase deploy --only storage
```

### Making Yourself Admin

1. Create an account normally through the UI
2. Open Firebase Console → Firestore
3. Navigate to: `gchat/accounts/users/{your-username}`
4. Edit the document and set: `isAdmin: true`
5. Refresh the G-Chat page
6. You'll now see the "👑 Admin Panel" button

### Testing Checklist

- [ ] Create account with username/password
- [ ] Login and verify session persists
- [ ] Create a server with icon
- [ ] Send messages in #general
- [ ] Join voice channel (test with another user)
- [ ] Request featured status
- [ ] Login as admin and approve request
- [ ] Test logout

---

## For Admins

### Accessing Admin Panel

1. Ensure your account has `isAdmin: true` in Firestore
2. Click the crown icon (👑) in the bottom left
3. Admin dashboard opens

### Reviewing Featured Requests

1. Open Admin Panel
2. View list of pending requests
3. For each request:
   - Click "Preview Server" to inspect
   - Click "Approve" to feature the server
     - Choose "Permanent" or "Temporary"
     - If temporary, set expiration date
   - Click "Reject" to deny the request

### Moderating Content

1. Navigate to a server or channel
2. Admin actions available:
   - Delete messages
   - Delete channels
   - Delete entire servers
   - Ban users (set `bannedUntil` in accounts collection)

### Manual Database Operations

**Ban a user:**
1. Firestore Console → `gchat/accounts/users/{username}`
2. Set `bannedUntil: [future timestamp]`

**Feature a server manually:**
1. Firestore Console → `gchat/servers/list/{serverId}`
2. Set:
   - `featured: true`
   - `featuredType: "permanent"` or `"temporary"`
   - `featuredExpiration: [timestamp]` (if temporary)

**Clean up old sessions:**
```javascript
// Cloud Function gchatCleanupSessions runs daily automatically
// Or trigger manually in Firebase Console
```

---

## Troubleshooting

### "Invalid credentials" on login
- Check username spelling (case-insensitive)
- Verify password is correct
- Ensure account wasn't banned (check `bannedUntil` field)

### "Session expired" message
- Sessions last 7 days
- Login again to create new session
- Check browser localStorage is enabled

### Voice not connecting
- Grant microphone permissions in browser
- Check firewall isn't blocking WebRTC
- Maximum ~7 users per voice channel

### Can't upload avatar/icon
- File must be an image (PNG, JPG, etc.)
- Max 5MB for avatars
- Max 2MB for server icons

### Messages not appearing
- Check you're a member of the server
- Verify Firestore rules are deployed
- Check browser console for errors

---

## Security Best Practices

### For Users
- Use a strong, unique password
- Don't share your account with others
- Logout on shared computers
- Report inappropriate content to admins

### For Developers
- Never commit Firebase config to public repos
- Regularly update Cloud Function dependencies
- Monitor Cloud Function logs for errors
- Review Firestore security rules after changes

### For Admins
- Regularly review featured server queue
- Monitor for spam or inappropriate servers
- Set reasonable expiration dates for temporary featured
- Keep admin list minimal (principle of least privilege)

---

## Support

For issues or questions:
1. Check this Quick Start Guide
2. Read the full README.md
3. Review IMPLEMENTATION_SUMMARY.md for technical details
4. Check Firebase Console logs for errors
5. Contact the developer

---

## License

Part of the GuyThatLives educational platform. All rights reserved.

---

*Last updated: 2026-02-03*
