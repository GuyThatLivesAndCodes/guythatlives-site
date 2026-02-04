# G-Chat - Community Platform

A Discord-inspired community platform with servers, channels, voice chat, and persistent accounts.

## Features

- **Standalone Authentication**: Custom username/password system (independent from main site Firebase Auth)
- **Servers & Channels**: Create servers with text and voice channels
- **Real-time Messaging**: Firestore-powered instant messaging
- **Voice Chat**: WebRTC voice channels with mesh topology (up to ~7 users)
- **Featured Servers**: Admin-approved featured server system
- **Multi-server Membership**: Join and participate in multiple servers

## Architecture

### Authentication Flow

G-Chat uses a **standalone authentication system** that is completely separate from the main website's Firebase Auth.

1. **Signup**: Users create a username/password account
   - Cloud Function `gchatSignup()` hashes password with bcrypt
   - Creates account at `/gchat/accounts/users/{username}`
   - Creates profile at `/gchat/profiles/users/{userId}`
   - Generates session with 7-day expiration
   - Returns custom Firebase token for Firestore access

2. **Login**: Users authenticate with username/password
   - Cloud Function `gchatLogin()` validates credentials
   - Generates new session
   - Returns custom Firebase token

3. **Session Management**: Sessions stored in localStorage + Firestore
   - 7-day automatic expiration
   - Heartbeat every 5 minutes (updates `lastActive`)
   - Custom tokens include `sessionId` claim for security rules

### Database Structure

```
/gchat/
  ├─ accounts/users/{username}          # Password hashes (server-only)
  ├─ sessions/active/{sessionId}        # Active login sessions
  ├─ profiles/users/{userId}            # Public user profiles
  ├─ servers/list/{serverId}            # Servers
  │  └─ channels/{channelId}            # Text/voice channels
  │     └─ messages/{messageId}         # Messages (if text)
  ├─ featured-requests/pending/{id}     # Featured server requests
  └─ voice-sessions/active/{sessionId}  # Active voice channels
     └─ signaling/{signalId}            # WebRTC signaling
```

### Security

- **Password Hashing**: bcrypt with 10 rounds (server-side only)
- **Custom Tokens**: Firebase Admin SDK generates tokens with session claims
- **Firestore Rules**: Session-based validation using custom token claims
- **Storage Rules**: User-scoped avatar uploads (5MB max), server icons (2MB max)

## Cloud Functions

### Authentication
- `gchatSignup(username, password, email?)` - Create new account
- `gchatLogin(username, password)` - Authenticate user
- `gchatValidateSession(sessionId)` - Check session validity
- `gchatChangePassword(sessionId, oldPassword, newPassword)` - Update password

### Scheduled Tasks
- `gchatCleanupSessions()` - Daily cleanup of expired sessions
- `gchatExpireFeatured()` - Daily expiration of temporary featured servers

## File Structure

```
/unblocked/g-chat/
├─ index.html              # Main UI (Discord-style 4-column layout)
├─ styles.css              # G-Chat specific styles
├─ app.js                  # Main orchestrator
├─ auth-manager.js         # Authentication logic
├─ server-manager.js       # Server CRUD operations
├─ channel-manager.js      # Channel management & messaging
├─ voice-manager.js        # WebRTC voice channels
├─ ui-controller.js        # UI state management
├─ featured-manager.js     # Featured server requests
└─ admin-dashboard.js      # Admin review interface
```

## Setup

1. **Install Dependencies**:
   ```bash
   cd functions
   npm install
   ```

2. **Deploy Cloud Functions**:
   ```bash
   firebase deploy --only functions
   ```

3. **Deploy Firestore Rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Deploy Storage Rules**:
   ```bash
   firebase deploy --only storage
   ```

5. **Access G-Chat**:
   Navigate to `/unblocked/g-chat/` on your deployed site

## Admin Setup

To make a user an admin:

1. User creates account normally
2. In Firestore Console, navigate to:
   `/gchat/accounts/users/{username}`
3. Set `isAdmin: true`
4. User will see Admin Panel on next login

## Usage

### Creating a Server

1. Click "+" button in server list
2. Enter server name, description, and optional icon
3. Server created with default channels (#general, 🔊voice-1)

### Joining Voice

1. Click on a voice channel
2. Click "Join Voice" button
3. Grant microphone permissions
4. Use mute/deafen controls as needed

### Requesting Featured Status

1. Navigate to your server
2. Click server menu (⋮)
3. Select "Request Featured"
4. Admins will review and approve/reject

## Technical Details

### WebRTC Implementation

- **Topology**: Mesh (peer-to-peer connections between all participants)
- **Limit**: ~7 users per channel (mesh topology constraint)
- **Signaling**: Firestore real-time listeners for offer/answer/ICE exchange
- **STUN Servers**: Google STUN servers for NAT traversal

### Performance

- **Message Latency**: <500ms (Firestore write + listener trigger)
- **Voice Connection**: <3 seconds (ICE gathering + offer/answer)
- **Session Validation**: <200ms (Cloud Function execution)

## Differences from Main Site Auth

| Feature | Main Site (Firebase Auth) | G-Chat (Standalone) |
|---------|---------------------------|---------------------|
| Login Method | Email/Password, Google, Apple | Username/Password only |
| Account Storage | Firebase Auth backend | `/gchat/accounts/` collection |
| Password Hashing | Firebase Auth (automatic) | bcrypt via Cloud Function |
| Session Management | Firebase Auth tokens | Custom tokens + Firestore sessions |
| Admin System | Email-based whitelist | `isAdmin` flag in account doc |

## Known Limitations

- Voice channels limited to ~7 concurrent users (mesh topology)
- Message history loads last 100 messages (pagination planned)
- Avatar uploads max 5MB
- Server icons max 2MB

## Future Enhancements

- Password recovery via email
- Direct messages between users
- Server roles and permissions
- Message reactions and embeds
- Screen sharing in voice channels
- User blocking and reporting

## License

Part of GuyThatLives educational platform.
