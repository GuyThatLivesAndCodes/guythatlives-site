# TheChat - Discord-Style Chat Application

A real-time chat application built with Firebase Realtime Database, featuring a Discord-inspired UI and seamless integration with your existing authentication system.

## 🎯 Features

### Core Functionality
- ✅ **Real-time Messaging** - Instant message delivery using Firebase Realtime Database
- ✅ **Server & Channel System** - Organize conversations like Discord
- ✅ **Message Editing & Deletion** - Full CRUD operations (only for message authors)
- ✅ **GIF Support** - Integrated Tenor API for GIF search and sharing
- ✅ **Media Rendering** - Automatic image/GIF preview in chat
- ✅ **User Authentication** - Seamless integration with existing auth system

### UI/UX Features
- 🎨 **Discord-Style UI** - Dark theme with familiar Discord color palette (#36393f)
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- ⚡ **Real-time Updates** - Messages appear instantly for all users
- 🔔 **Scroll Management** - Auto-scroll to new messages
- 👥 **Member List** - See who's in your server
- 🎭 **User Avatars** - Automatic avatar generation from usernames

### Security
- 🔒 **Authentication Required** - Auto-redirects unauthenticated users
- 🛡️ **Firebase Security Rules** - Comprehensive data access control
- ✅ **Message Author Verification** - Only authors can edit/delete their messages
- 🚫 **Server Access Control** - Only members can read/write server data

## 📁 File Structure

```
/unblocked/thechat/
├── index.html           # Main HTML structure
├── app.js              # Application logic
├── database.rules.json # Firebase security rules
└── README.md           # This file
```

## 🚀 Setup Instructions

### 1. Firebase Configuration

#### Enable Realtime Database
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Realtime Database**
4. Click **Create Database**
5. Choose location (preferably closest to your users)
6. Start in **locked mode** (we'll add rules next)

#### Deploy Security Rules
1. In Firebase Console, go to **Realtime Database** > **Rules**
2. Copy the contents of `database.rules.json`
3. Paste into the rules editor
4. Click **Publish**

**Important Security Rules:**
- ✅ Only authenticated users can read/write
- ✅ Only server members can access server data
- ✅ Only message authors can edit/delete their messages
- ✅ Only server owners can modify server structure
- ✅ Message content is validated (max 2000 characters)

### 2. Tenor API Setup (for GIFs)

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Tenor API**
4. Create credentials (API Key)
5. Copy your API key
6. In `app.js`, replace the `TENOR_API_KEY` constant:

```javascript
const TENOR_API_KEY = 'YOUR_API_KEY_HERE';
```

**Free tier limits:** 100,000 requests per day (more than enough for most use cases)

### 3. Authentication Integration

TheChat automatically integrates with your existing authentication system:

```javascript
// Uses the existing games-auth.js module
window.gamesAuth.onAuthStateChanged((user) => {
    if (!user) {
        // Redirect to login
        window.location.href = '/unblocked/';
    } else {
        // Initialize chat
        initializeApp();
    }
});
```

**User Data Used:**
- `user.uid` - Unique user identifier
- `user.displayName` - Display name in chat
- `user.email` - Fallback if no display name

### 4. Add to Navigation

Update your site's navigation to include TheChat:

```html
<a href="/unblocked/thechat/" class="nav-link">Chat</a>
```

## 🎮 Usage Guide

### For Users

#### Joining a Chat
1. Navigate to `/unblocked/thechat/`
2. If not logged in, you'll be redirected to the login page
3. After login, you'll see the Home Server with default channels

#### Sending Messages
- Type in the message box at the bottom
- Press `Enter` to send
- Use `Shift + Enter` for new lines
- Click the image icon to search for GIFs

#### Editing Messages
1. Hover over your message
2. Click the three-dot menu (⋮)
3. Select "Edit Message"
4. Modify and press `Enter`

#### Deleting Messages
1. Hover over your message
2. Click the three-dot menu (⋮)
3. Select "Delete Message"
4. Confirm deletion

#### Creating a Server
1. Click the **+** icon in the left sidebar
2. Enter a server name
3. Share the Server ID with friends
4. They can join using the **Join Server** button

#### Joining a Server
1. Click the compass icon in the left sidebar
2. Enter the Server ID
3. Click "Join Server"

### For Developers

#### Database Structure

```javascript
servers/
├── $serverId/
│   ├── name: "Server Name"
│   ├── ownerId: "user123"
│   ├── createdAt: 1234567890
│   ├── members/
│   │   ├── user123/
│   │   │   ├── username: "Alice"
│   │   │   ├── joinedAt: 1234567890
│   │   │   └── role: "owner"
│   │   └── user456/
│   │       ├── username: "Bob"
│   │       └── joinedAt: 1234567891
│   └── channels/
│       ├── general/
│       │   ├── name: "general"
│       │   ├── createdAt: 1234567890
│       │   └── messages/
│       │       └── $messageId/
│       │           ├── content: "Hello world!"
│       │           ├── author: "Alice"
│       │           ├── author_id: "user123"
│       │           ├── timestamp: 1234567891
│       │           └── edited: false
│       └── random/
│           └── ...
```

#### Adding Custom Channels

To add channels programmatically:

```javascript
const channelRef = firebase.database()
    .ref(`servers/${serverId}/channels/${channelName}`);

await channelRef.set({
    name: channelName,
    createdAt: firebase.database.ServerValue.TIMESTAMP
});
```

#### Listening to Messages

```javascript
const messagesRef = firebase.database()
    .ref(`servers/${serverId}/channels/${channelId}/messages`)
    .orderByChild('timestamp');

messagesRef.on('child_added', (snapshot) => {
    const message = snapshot.val();
    // Handle new message
});
```

## 🎨 Customization

### Changing Colors

Tailwind config in `index.html`:

```javascript
colors: {
    discord: {
        dark: '#36393f',      // Main background
        darker: '#2f3136',    // Sidebar background
        darkest: '#202225',   // Darkest elements
        blurple: '#5865f2',   // Primary accent
        green: '#3ba55d',     // Success/online
        red: '#ed4245',       // Error/delete
        gray: '#4e5058',      // Input background
        lightgray: '#b9bbbe', // Muted text
    }
}
```

### Adding Custom Features

#### Voice Channels
Would require WebRTC integration (not included in this version)

#### File Uploads
Would require Firebase Storage integration

#### Reactions/Emojis
Add emoji picker library and extend message schema

#### User Roles/Permissions
Extend the `members` object with role-based permissions

## 🔧 Troubleshooting

### "Permission Denied" Error
- **Cause:** Firebase security rules not deployed
- **Fix:** Copy `database.rules.json` to Firebase Console

### GIFs Not Loading
- **Cause:** Invalid Tenor API key
- **Fix:** Get a new API key from Google Cloud Console

### Messages Not Sending
- **Cause:** User not authenticated
- **Fix:** Verify authentication is working properly

### Auto-Redirect Not Working
- **Cause:** `games-auth.js` not loaded
- **Fix:** Ensure the auth module is in the correct path

## 📊 Performance Considerations

### Database Indexing

For optimal performance, add these indexes in Firebase Console:

```json
{
  "servers": {
    "$serverId": {
      "channels": {
        "$channelId": {
          "messages": {
            ".indexOn": ["timestamp"]
          }
        }
      }
    }
  }
}
```

### Message Limits

- Currently limited to last 100 messages per channel
- Adjust in `app.js`: `.limitToLast(100)`
- For production, implement pagination

### Cost Estimation

Firebase Realtime Database pricing (free tier):
- **Simultaneous connections:** 100
- **GB stored:** 1 GB
- **GB downloaded:** 10 GB/month

Typical usage for 100 active users:
- ~50,000 reads/day
- ~10,000 writes/day
- Well within free tier limits

## 🚀 Deployment

### GitHub Pages (Static Hosting)

Already configured for GitHub Pages. Just ensure:
1. Repository is public or has GitHub Pro
2. GitHub Pages is enabled in repository settings
3. Files are in the correct directory structure

### Custom Domain

Update all absolute paths if using a custom domain:
- Change `/unblocked/` to your base path
- Update authentication redirects

## 🔐 Security Best Practices

1. **Never expose Firebase config** - Already secured in your setup
2. **Validate all inputs** - Already handled by security rules
3. **Rate limiting** - Consider implementing for production
4. **Content moderation** - Add profanity filters if needed
5. **Report system** - Allow users to report messages

## 📝 License

This chat application is part of the GuyThatLives unblocked games site.

## 🤝 Contributing

To add features:
1. Test thoroughly with Firebase security rules
2. Maintain Discord-style UI consistency
3. Ensure mobile responsiveness
4. Document new features in this README

## 📞 Support

For issues or questions:
- Check Firebase Console for errors
- Review browser console for JavaScript errors
- Verify authentication is working
- Check security rules are properly deployed

---

**Built with ❤️ for the GuyThatLives community**
