# Unblocked Games Setup Guide

This guide will help you set up the Unblocked Games system for the first time.

## Prerequisites

- Firebase project already configured (guythatlives-math)
- Admin access with `zorbyteofficial@gmail.com`
- Firestore rules deployed

## Step 1: Deploy Firestore Rules

The Firestore rules have already been updated in `firestore.rules`. Deploy them:

```bash
firebase deploy --only firestore:rules
```

This will:
- Allow public read access to published games
- Restrict game modifications to admin only
- Allow users to track their own game history

## Step 2: Initialize Categories

The first time you access the editor, you'll need to create categories:

1. Sign in with `zorbyteofficial@gmail.com`
2. Go to `/unblocked/editor`
3. Click **"Manage Categories"**
4. Add categories (one per line), for example:
   ```
   Action
   Puzzle
   Strategy
   Arcade
   Sports
   Racing
   Adventure
   Multiplayer
   Casual
   Retro
   ```
5. Click **"Save Categories"**

## Step 3: Add Your First Game

### Option A: Use the Example Game

1. In the editor, click **"Add New Game"**
2. Fill in the details:
   - **Title**: Click Master
   - **Description**: A fun clicking game. How fast can you click?
   - **Game URL**: `/unblocked/games/example-game/`
   - **Thumbnail**: (leave blank or add your own)
   - **Categories**: Select "Casual" and "Arcade"
   - **Tags**: Add: `clicker`, `casual`, `fun`
   - **Published**: Check this box
   - **Featured**: Optionally check this for testing
3. Click **"Save Game"**

### Option B: Add Your Own Game

1. Upload your game files to `/unblocked/games/your-game-name/`
2. Make sure your game has an `index.html` file
3. Follow the same steps as Option A, using your game's URL

## Step 4: Test the System

1. Go to `/unblocked/` (main games page)
2. You should see your game in the appropriate sections
3. Click the game card to play it
4. Verify the game loads correctly in the player

## Step 5: Configure Authentication (Optional)

The system uses the existing Firebase auth from your math platform. If you want to enable additional auth providers:

1. Go to Firebase Console → Authentication → Sign-in method
2. Enable desired providers (Google is already enabled)
3. Update `games-auth.js` if needed

## Database Structure

After setup, your Firestore will have these collections:

### `/games/{gameId}`
Stores all game metadata. Example:
```javascript
{
  "title": "Click Master",
  "description": "A fun clicking game...",
  "gameUrl": "/unblocked/games/example-game/",
  "thumbnail": "",
  "categories": ["Casual", "Arcade"],
  "tags": ["clicker", "casual", "fun"],
  "published": true,
  "featured": false,
  "playCount": 0,
  "addedDate": Timestamp,
  "createdBy": "userId"
}
```

### `/gameMetadata/categories`
Stores the categories list:
```javascript
{
  "list": ["Action", "Puzzle", "Strategy", ...],
  "updatedDate": Timestamp,
  "updatedBy": "userId"
}
```

### `/users/{userId}/gamesPlayed/{gameId}`
Tracks user play history:
```javascript
{
  "gameId": "gameId",
  "lastPlayed": Timestamp,
  "playCount": 5
}
```

## Troubleshooting

### "Permission denied" errors

**Problem**: Can't read or write to Firestore

**Solution**:
1. Make sure Firestore rules are deployed: `firebase deploy --only firestore:rules`
2. Check that you're signed in with the admin email
3. Verify Firebase config in `games-auth.js` matches your project

### Games won't load

**Problem**: Game player shows error or blank screen

**Solution**:
1. Check the game URL is correct
2. Verify game files exist at that path
3. Check browser console for errors
4. Make sure game doesn't have X-Frame-Options restrictions

### Can't access editor

**Problem**: Access denied on `/unblocked/editor`

**Solution**:
1. Sign in with `zorbyteofficial@gmail.com`
2. Clear browser cache and cookies
3. Check browser console for auth errors

### Categories not loading

**Problem**: Category dropdown is empty

**Solution**:
1. Go to editor → Manage Categories
2. Add at least one category
3. Refresh the main page

## Initial Categories Recommendation

Here's a good starting set of categories:

- **Action** - Fast-paced, reflex-based games
- **Puzzle** - Brain teasers and logic games
- **Strategy** - Planning and tactical games
- **Arcade** - Classic arcade-style games
- **Sports** - Sports and athletics games
- **Racing** - Driving and racing games
- **Adventure** - Story-driven exploration games
- **Multiplayer** - Games you can play with others
- **Casual** - Easy-to-play, relaxing games
- **Retro** - Classic and nostalgic games
- **Educational** - Learning-focused games
- **Simulation** - Real-world simulation games

## Next Steps

After initial setup:

1. **Add more games** - Build your library
2. **Create thumbnails** - Add game screenshots (16:9 ratio)
3. **Write descriptions** - Help users find games they'll enjoy
4. **Tag games** - Make searching easier
5. **Feature the best** - Highlight quality games
6. **Monitor analytics** - See which games are popular

## Security Notes

- Only `zorbyteofficial@gmail.com` can access the editor
- All game modifications are logged with userId and timestamp
- Users can only modify their own game history
- Published/unpublished games are controlled at the database level

## Support

For issues or questions:
- Check the main README.md
- Review Firebase Console for errors
- Check browser developer console
- Contact zorbyteofficial@gmail.com

---

Happy gaming! 🎮
