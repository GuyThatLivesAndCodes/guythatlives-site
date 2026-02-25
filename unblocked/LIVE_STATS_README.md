# Live Statistics System 📊

A comprehensive real-time visitor tracking and analytics system for the unblocked games section of guythatlives.net.

## ✨ Features

### 📈 Main Dashboard (Homepage)
- **Online Users**: See how many people are currently browsing
- **24-Hour Visitors**: Track unique visitors in the last day
- **Active Players**: Count of users currently playing games
- **Hot Games**: Real-time ranking of most-played games with player counts

### 🎮 Game Pages
- **Live Player Count**: Shows how many people are playing each specific game
- **Floating Stats Widget**: Compact, draggable widget showing live stats
- **Real-time Updates**: Stats refresh automatically every 15-30 seconds

### 🔒 Privacy-First
- **100% Anonymous**: No personal data collected
- **No Login Required**: Tracks sessions, not users
- **Auto-Expiring**: All data automatically deleted after 24 hours
- **No Cookies**: Session-based tracking only

## 🚀 What's Been Implemented

### New Files Created

1. **`shared/presence-tracker.js`**
   - Core tracking engine
   - Manages user sessions and heartbeats
   - Tracks game-specific player counts
   - Automatic cleanup of stale sessions

2. **`shared/stats-dashboard.js`**
   - Main stats dashboard component
   - Animated counters
   - Popular games list with thumbnails
   - Real-time subscription updates

3. **`shared/stats-widget.js`**
   - Floating stats widget for game pages
   - Draggable and minimizable
   - Persistent state (remembers if minimized)
   - Compact design

### Modified Files

1. **`unblocked/index.html`**
   - Added stats dashboard section
   - Integrated tracker initialization
   - Loads new JS modules

2. **`unblocked/game/index.html`**
   - Added live player count display
   - Tracks game-specific plays
   - Shows floating stats widget
   - Integrated presence tracking

3. **`shared/games-styles.css`**
   - Added comprehensive styling for dashboard
   - Styled popular games list
   - Added stats widget styles
   - Responsive design for all screen sizes

## 📱 User Experience

### Homepage Experience
When users visit `/unblocked/`, they'll see:
```
┌─────────────────────────────────────┐
│         🟢 Live Stats               │
├─────────────────────────────────────┤
│  👥 Online Now:        42           │
│  📅 Last 24 Hours:     1,234        │
│  🎮 Playing Now:       28           │
├─────────────────────────────────────┤
│  🔥 Hot Right Now                   │
│  1. [Thumbnail] Slope      (12 👥) │
│  2. [Thumbnail] Minecraft  (8 👥)  │
│  3. [Thumbnail] Run 3      (5 👥)  │
└─────────────────────────────────────┘
```

### Game Page Experience
When playing a game, users see:
- **In the header**: "🟢 15 playing now" next to play count
- **Bottom-left corner**: Floating widget showing all stats
  - Can be minimized to just show "🟢 Live"
  - Can be dragged anywhere on screen
  - Updates every 15 seconds

## 🛠️ Technical Details

### How It Works

1. **Session Creation**
   - When user visits the site, a unique session ID is generated
   - Session is stored in `online_sessions` collection
   - Also logged in `sessions_24h` for 24-hour tracking

2. **Heartbeat System**
   - Every 30 seconds, session sends a "heartbeat" to Firebase
   - Updates `lastHeartbeat` timestamp
   - If playing a game, includes `currentGame` field

3. **Session Expiry**
   - Sessions without heartbeat for 90+ seconds are considered offline
   - Cleanup runs every 60 seconds to remove stale sessions
   - 24-hour sessions auto-delete after 24 hours

4. **Statistics Calculation**
   - **Online Users**: Count of active sessions (heartbeat < 90s ago)
   - **24h Visitors**: Count of all sessions in `sessions_24h`
   - **Playing Now**: Count of sessions with `currentGame` set
   - **Popular Games**: Games ranked by current player count

### Firebase Collections

```
online_sessions/
├── session_1234_abc
│   ├── sessionId: "session_1234_abc"
│   ├── startTime: 1709587200000
│   ├── lastHeartbeat: 1709587230000
│   ├── currentGame: "slope" (or null)
│   └── page: "/unblocked/"

sessions_24h/
├── session_1234_abc
│   ├── sessionId: "session_1234_abc"
│   └── timestamp: 1709587200000
```

### Performance Optimization

- **Caching**: Stats cached for 5 seconds to reduce reads
- **Real-time Subscriptions**: Dashboard uses Firestore real-time listeners
- **Batch Operations**: Cleanup processes sessions in batches of 50
- **Indexed Queries**: All queries use proper indexes for speed

### Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🎨 Customization Options

### Change Dashboard Position
Edit in `index.html`:
```javascript
await window.statsDashboard.initialize('stats-dashboard');
```

### Change Widget Position
Edit in `game/index.html`:
```javascript
window.statsWidget.initialize('bottom-left'); // Options: bottom-left, bottom-right, top-left, top-right
```

### Adjust Update Intervals
In `presence-tracker.js`:
```javascript
this.HEARTBEAT_INTERVAL = 30000; // 30 seconds
this.SESSION_TIMEOUT = 90000;    // 90 seconds
```

In `stats-dashboard.js`:
```javascript
this.UPDATE_INTERVAL = 10000; // 10 seconds
```

### Customize Colors
In `games-styles.css`:
```css
.pulse-dot {
    background: #22c55e; /* Change to your color */
}
```

## 🔧 Firebase Setup Required

### 1. Update Firestore Rules
Add these rules to your Firebase console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Online sessions
    match /online_sessions/{sessionId} {
      allow create, update, delete: if true;
      allow read: if true;
    }

    // 24h sessions
    match /sessions_24h/{sessionId} {
      allow create, delete: if true;
      allow read: if true;
    }
  }
}
```

### 2. Add Indexes (Optional but Recommended)
In Firebase Console > Firestore > Indexes, add:
- Collection: `online_sessions`
  - Fields: `lastHeartbeat` (Ascending), `currentGame` (Ascending)

- Collection: `sessions_24h`
  - Fields: `timestamp` (Ascending)

### 3. Set Up Cloud Function (Optional)
For server-side cleanup, see `PRESENCE_TRACKING_SETUP.md`

## 📊 Expected Firebase Usage

### Free Tier Limits
- Reads: 50,000/day
- Writes: 20,000/day
- Deletes: 20,000/day

### Estimated Usage (1000 concurrent users)
- **Writes**: ~2,000/minute (heartbeats)
- **Reads**: ~12/minute (with caching)
- **Deletes**: ~100/hour (cleanup)

**Daily totals**:
- Writes: ~2.88M (over limit, need to optimize or upgrade)
- Reads: ~17K (well under limit)
- Deletes: ~2.4K (well under limit)

**Recommendation**: For 1000+ users, consider:
- Increasing heartbeat interval to 60s
- Using Firebase Blaze plan (pay-as-you-go)
- Implementing server-side aggregation

## 🐛 Troubleshooting

### Stats not updating
- Check browser console for errors
- Verify Firebase configuration is correct
- Ensure Firestore rules are set up
- Check if heartbeats are being sent (Network tab)

### Widget not appearing
- Verify `stats-widget.js` is loaded
- Check for JavaScript errors
- Ensure presence tracker initialized

### High Firebase costs
- Increase cache duration
- Increase heartbeat interval
- Reduce update frequency
- Implement server-side aggregation

## 🚀 Future Enhancements

Ideas for expansion:
- Geographic stats (country/region breakdown)
- Peak hours visualization
- Game rating/reviews integrated with popularity
- Social features ("23 of your friends played this")
- Weekly/monthly trends
- Leaderboards based on play time
- Achievement system
- Personalized recommendations

## 📄 Related Documentation

- [PRESENCE_TRACKING_SETUP.md](./PRESENCE_TRACKING_SETUP.md) - Detailed technical setup
- Firebase documentation: https://firebase.google.com/docs/firestore

## 💡 Tips

1. **Test with multiple tabs**: Open the site in multiple browser tabs to see stats update
2. **Mobile testing**: Widget is responsive and works great on mobile
3. **Privacy**: All tracking is session-based and anonymous
4. **Performance**: Dashboard updates are throttled to prevent excessive reads

## 🎉 Enjoy!

Your users can now see real-time activity and discover popular games! The system runs completely automatically once set up.
