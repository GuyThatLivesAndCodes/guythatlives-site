# Remote Play System

A secure cloud gaming solution integrated with Hyperbeam, allowing users to stream games directly in their browser.

## 🎮 Features

- **Secure API Key Storage**: Hyperbeam API key stored in Firebase Functions (never exposed to clients)
- **Queue System**: Limits concurrent sessions (default: 1 user at a time)
- **Auto-Promotion**: Queued users automatically connect when a slot opens
- **Session Management**: Automatic cleanup of stale sessions every 5 minutes
- **Heartbeat System**: Keeps active sessions alive and detects disconnections

## 📁 Files

- `fortnite.html` - Remote play page for Fortnite
- `SETUP.md` - Detailed setup instructions
- `README.md` - This file

## 🔒 Security Architecture

```
┌─────────────────┐
│  User Browser   │
│                 │
│ • No API key    │
│ • Calls Cloud   │
│   Functions     │
└────────┬────────┘
         │
         │ firebase.functions().httpsCallable('createRemoteSession')
         │
         ▼
┌─────────────────────────────────┐
│  Firebase Cloud Function        │
│                                 │
│ • API key stored here (SECURE!) │
│ • Creates Hyperbeam session     │
│ • Manages queue                 │
│ • Enforces limits               │
└────────┬────────────────────────┘
         │
         │ HTTPS to Hyperbeam API
         │
         ▼
┌─────────────────┐
│  Hyperbeam API  │
│                 │
│ • Creates VM    │
│ • Returns URL   │
└────────┬────────┘
         │
         │ Returns embedUrl + adminToken (NOT the API key!)
         │
         ▼
┌─────────────────┐
│  User Browser   │
│                 │
│ • Connects to   │
│   VM stream     │
└─────────────────┘
```

## 🚀 Quick Start

1. **Get Hyperbeam API key** from https://hyperbeam.com/dashboard

2. **Set it securely in Firebase**:
   ```bash
   firebase functions:config:set hyperbeam.api_key="hb_YOUR_KEY"
   ```

3. **Deploy Cloud Functions**:
   ```bash
   firebase deploy --only functions:createRemoteSession,functions:endRemoteSession,functions:cleanupRemoteSessions
   ```

4. **Test it**:
   - Navigate to `/unblocked/remote/fortnite.html`
   - Click "Start Playing"

## 📊 Firestore Collections

### `remoteSessions`

Tracks all remote play sessions:

```javascript
{
  sessionId: "uuid",
  gameId: "fortnite",
  userId: "user_id_or_anon",
  status: "active" | "queued" | "ended" | "timeout",
  hyperbeamSessionId: "hyperbeam_id",
  embedUrl: "https://...",
  adminToken: "...",
  createdAt: timestamp,
  lastHeartbeat: number,
  userAgent: "Mozilla/5.0 ...",
  // If queued:
  queuedAt: timestamp,
  // If ended:
  endedAt: timestamp
}
```

## 🔧 Configuration

### Change Concurrent Limit

In `/functions/index.js`:
```javascript
const MAX_CONCURRENT = 1; // Change to 5, 10, etc.
```

### Auto-Launch URL

In `/functions/index.js`, update `createRemoteSession`:
```javascript
const requestBody = JSON.stringify({
    start_url: 'https://now.gg/play/epic-games/4804/fortnite',
    timeout: {
        absolute: 3600, // 1 hour
        inactive: 300   // 5 minutes
    }
});
```

### Session Timeouts

- **Absolute**: Max session length (default: 1 hour)
- **Inactive**: Auto-end if no input (default: 5 minutes)
- **Heartbeat**: Keep-alive interval (default: 30 seconds)
- **Stale Cleanup**: Sessions with no heartbeat for 2 minutes are cleaned up

## 📈 Monitoring

### Active Sessions

Firebase Console → Firestore → `remoteSessions`:
- Filter by `status == 'active'` to see current players
- Filter by `status == 'queued'` to see waiting users

### Function Logs

Firebase Console → Functions → Logs:
- View `createRemoteSession` calls
- Monitor `cleanupRemoteSessions` runs
- Check for errors

### Costs

Hyperbeam Dashboard → Usage:
- Track minutes used
- Monitor API calls
- Check quota remaining

## ⚠️ Important Notes

1. **API Key Security**: Never commit API keys to Git. Always use Firebase config.
2. **TOS Compliance**: Ensure you have rights to stream the games you offer.
3. **Cost Management**: Monitor usage to avoid unexpected bills.
4. **Rate Limiting**: Consider adding daily/hourly limits per user.

## 🛠️ Troubleshooting

### "Hyperbeam API key is not configured"
```bash
firebase functions:config:get
# Should show: { "hyperbeam": { "api_key": "hb_..." } }
```

### Sessions not ending
Check Firebase Functions logs for `cleanupRemoteSessions` errors.

### Queue not working
Verify Firestore security rules allow reading `remoteSessions`.

### High costs
- Reduce session timeout
- Lower concurrent limit
- Add rate limiting

## 📝 Adding More Games

1. Add new link in `index.html`:
   ```html
   <a href="/unblocked/remote/minecraft.html" class="game-list-item">Minecraft</a>
   ```

2. Copy `fortnite.html` to `minecraft.html`

3. Change `GAME_ID`:
   ```javascript
   const GAME_ID = 'minecraft';
   ```

4. Update title and text references

That's it! The Cloud Functions work with any `gameId`.

## 📚 Further Reading

- [Hyperbeam Docs](https://docs.hyperbeam.com)
- [Firebase Functions](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
