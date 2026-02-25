# Presence Tracking System Setup

This document describes the real-time visitor tracking system for the unblocked games section.

## Features

1. **Real-time Online Users**: Tracks how many users are currently on the site
2. **24-Hour Visitors**: Counts unique visitors in the last 24 hours
3. **Game-Specific Tracking**: Shows which games are being played right now
4. **Popular Games Dashboard**: Displays trending games based on current players
5. **Anonymous Tracking**: No login required - all tracking is session-based

## Architecture

### Client-Side Components

- **presence-tracker.js**: Core tracking system
  - Manages user sessions
  - Sends heartbeats every 30 seconds
  - Tracks current game being played
  - Handles cleanup of stale sessions

- **stats-dashboard.js**: Visual dashboard component
  - Displays live statistics
  - Shows popular games in real-time
  - Animated counters for smooth updates

### Firebase Collections

#### `online_sessions`
Tracks currently active sessions (users online now)

```javascript
{
  sessionId: string,           // Unique session identifier
  startTime: timestamp,        // When session started
  lastHeartbeat: timestamp,    // Last activity timestamp
  currentGame: string | null,  // Game ID if playing a game
  page: string                 // Current page path
}
```

**TTL**: Sessions expire after 90 seconds of no heartbeat

#### `sessions_24h`
Tracks all sessions in the last 24 hours

```javascript
{
  sessionId: string,    // Unique session identifier
  timestamp: timestamp  // Session start time
}
```

**TTL**: Documents automatically deleted after 24 hours

## Firebase Security Rules

Add these rules to your Firebase Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Online sessions - anyone can create/update their own session
    match /online_sessions/{sessionId} {
      allow create: if request.auth == null || request.auth != null;
      allow update: if request.resource.data.sessionId == resource.data.sessionId;
      allow delete: if request.auth == null || request.auth != null;
      allow read: if true; // Allow reading for stats
    }

    // 24h sessions - anyone can create, read for stats
    match /sessions_24h/{sessionId} {
      allow create: if request.auth == null || request.auth != null;
      allow delete: if request.auth == null || request.auth != null;
      allow read: if true; // Allow reading for stats
    }
  }
}
```

## Automatic Cleanup

The system includes multiple cleanup mechanisms:

1. **Client-side cleanup**: Each client cleans up stale sessions every 60 seconds
2. **Session expiration**: Sessions are considered stale after 90 seconds of no heartbeat
3. **24h cleanup**: Removes sessions older than 24 hours

For production, consider adding a Firebase Cloud Function for server-side cleanup:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Run every hour
exports.cleanupStaleSessions = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = Date.now();

    // Clean up online sessions (older than 90 seconds)
    const staleThreshold = now - 90000;
    const staleSessions = await db.collection('online_sessions')
      .where('lastHeartbeat', '<', staleThreshold)
      .limit(500)
      .get();

    const batch = db.batch();
    staleSessions.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // Clean up 24h sessions (older than 24 hours)
    const old24hThreshold = now - (24 * 60 * 60 * 1000);
    const old24hSessions = await db.collection('sessions_24h')
      .where('timestamp', '<', old24hThreshold)
      .limit(500)
      .get();

    const batch24h = db.batch();
    old24hSessions.docs.forEach(doc => batch24h.delete(doc.ref));
    await batch24h.commit();

    console.log(`Cleaned up ${staleSessions.size} stale sessions and ${old24hSessions.size} old 24h sessions`);
  });
```

## Integration

### Main Index Page

```javascript
// Initialize stats dashboard
await window.statsDashboard.initialize('stats-dashboard');
```

### Game Pages

```javascript
// Track game play
await window.presenceTracker.initialize();
await window.presenceTracker.trackGamePlay(gameId);
```

## Performance Considerations

- **Caching**: Stats are cached for 5 seconds to reduce database reads
- **Real-time subscriptions**: Dashboard subscribes to session changes for instant updates
- **Batched cleanup**: Stale sessions are cleaned up in batches of 50
- **Efficient queries**: Uses indexed queries with limits

## Cost Estimation

With proper caching and cleanup:
- ~2 writes per user per minute (heartbeats)
- ~1 read per 5 seconds for stats dashboard
- ~10 reads per game page load

For 1000 concurrent users:
- ~2000 writes/minute
- ~12 reads/minute (cached)
- Well within Firebase free tier limits

## Privacy & Analytics

- **No PII collected**: Only anonymous session IDs
- **No cookies required**: All tracking is session-based
- **Temporary data**: All data expires automatically
- **No cross-site tracking**: Scoped to your domain only

## Future Enhancements

Potential improvements:
1. **Geographic stats**: Show where players are from (region-level)
2. **Time-based analytics**: Peak hours, daily trends
3. **Game recommendations**: Suggest games based on what's popular
4. **Achievements**: "You're one of X people playing this game"
5. **Historical data**: Track trends over time
