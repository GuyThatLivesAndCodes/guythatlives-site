# Unblocked Games System

A modern, procedural unblocked games platform integrated into the GuyThatLives website.

## Overview

The Unblocked Games system provides:
- **User-friendly game browsing** with featured, most-played, and new games sections
- **Category-based filtering** for easy game discovery
- **User authentication** to track game history and progress
- **Admin panel** for managing games (restricted to zorbyteofficial@gmail.com)
- **Fully procedural** - no hardcoded games, everything managed through Firebase

## Structure

```
/unblocked/
├── index.html              # Main games hub page
├── game/
│   └── index.html          # Game player page (loads games via query param)
├── editor/
│   ├── index.html          # Admin editor interface
│   └── editor-script.js    # Editor functionality
├── shared/
│   ├── game-manager.js     # Game data management with Firebase
│   ├── games-auth.js       # Authentication system
│   └── games-styles.css    # Shared styles
├── games/
│   └── [game-folders]/     # Individual game files (HTML5 games)
└── README.md              # This file
```

## Features

### For Users
- **Browse Games**: Featured, most-played, newly added sections
- **Search**: Find games by title, description, or tags
- **Filter by Category**: Narrow down games by category
- **Play History**: Track recently played games (requires login)
- **Responsive Design**: Works on desktop and mobile

### For Admins (zorbyteofficial@gmail.com)
- **Add Games**: Create new game entries with metadata
- **Edit Games**: Update game details, categories, tags
- **Delete Games**: Remove games from the platform
- **Manage Categories**: Add/edit/remove game categories
- **View Statistics**: Total games, plays, featured games
- **Publish Control**: Draft/publish games

## How to Add a Game

### Step 1: Prepare the Game Files

1. Create a folder in `/unblocked/games/` for your game:
   ```
   /unblocked/games/my-awesome-game/
   ```

2. Add your game files (HTML, JS, CSS, assets):
   ```
   /unblocked/games/my-awesome-game/
   ├── index.html
   ├── game.js
   ├── style.css
   └── assets/
       ├── images/
       └── sounds/
   ```

3. **IMPORTANT**: Make sure your game's `index.html` is self-contained or uses relative paths.

### Step 2: Add Game to Firebase (via Admin Panel)

1. Sign in to the site with `zorbyteofficial@gmail.com`

2. Navigate to `/unblocked/editor`

3. Click **"Add New Game"**

4. Fill in the game details:
   - **Title**: Name of the game
   - **Description**: Brief description (shown on game card)
   - **Game URL**: Full URL to your game (e.g., `/unblocked/games/my-awesome-game/` or external URL)
   - **Thumbnail URL**: URL to game thumbnail image (optional)
   - **Categories**: Select relevant categories
   - **Tags**: Add searchable tags (press Enter after each tag)
   - **Published**: Check to make game visible to users
   - **Featured**: Check to show in featured section

5. Click **"Save Game"**

### Step 3: Test Your Game

1. Navigate to `/unblocked/`
2. Find your game in the appropriate section
3. Click to play and verify everything works

## Game Requirements

For games to work properly on the platform:

### HTML5 Games (Recommended)
- Self-contained HTML/JS/CSS games
- Use relative paths for assets
- No external dependencies that could be blocked
- Responsive design (works on different screen sizes)

### External Games
- Can link to externally hosted games
- Must allow embedding in an iframe
- Should not have X-Frame-Options restrictions

### Example Game HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Game</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #000;
            overflow: hidden;
        }

        canvas {
            border: 1px solid #fff;
        }
    </style>
</head>
<body>
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    <script src="game.js"></script>
</body>
</html>
```

## Firebase Data Structure

### Games Collection (`/games/{gameId}`)

```javascript
{
  "title": "Game Title",
  "description": "Game description",
  "gameUrl": "/unblocked/games/game-folder/",
  "thumbnail": "/unblocked/games/game-folder/thumbnail.jpg",
  "categories": ["Action", "Arcade"],
  "tags": ["multiplayer", "retro", "fun"],
  "published": true,
  "featured": false,
  "playCount": 0,
  "addedDate": Timestamp,
  "lastPlayed": Timestamp,
  "createdBy": "userId",
  "updatedBy": "userId",
  "updatedDate": Timestamp
}
```

### Game Metadata Collection (`/gameMetadata/categories`)

```javascript
{
  "list": [
    "Action",
    "Puzzle",
    "Strategy",
    "Arcade",
    "Sports",
    "Racing"
  ],
  "updatedDate": Timestamp,
  "updatedBy": "userId"
}
```

### User Game History (`/users/{userId}/gamesPlayed/{gameId}`)

```javascript
{
  "gameId": "gameId",
  "lastPlayed": Timestamp,
  "playCount": 5
}
```

## URL Patterns

- **Main Hub**: `/unblocked/`
- **Game Player**: `/unblocked/game/?game={gameId}`
- **Admin Editor**: `/unblocked/editor`

## Authentication

### User Sign-In Methods
- **Email/Password** (primary)
- **Google OAuth** (secondary)

### Admin Access
Only `zorbyteofficial@gmail.com` can:
- Access the editor interface
- Add/edit/delete games
- Manage categories
- View all games (including unpublished)

## Security Rules

The Firestore security rules ensure:
- Anyone can read published games
- Only admins can modify games
- Users can only modify their own game history
- Categories are readable by all, writable by admin only

## Best Practices

### Game Organization
- Use descriptive folder names (e.g., `snake-game`, not `game1`)
- Keep game files organized within their folder
- Use relative paths for all assets

### Game Metadata
- Write clear, concise descriptions
- Add relevant tags for searchability
- Choose appropriate categories
- Use high-quality thumbnails (16:9 ratio recommended)

### Publishing
- Test games thoroughly before publishing
- Start with `published: false` to test privately
- Only feature your best games
- Monitor play counts to see what's popular

## Troubleshooting

### Game Won't Load
- Check that the `gameUrl` is correct
- Verify the game files exist at that path
- Check browser console for errors
- Ensure game doesn't have iframe restrictions

### Can't Access Editor
- Make sure you're signed in with `zorbyteofficial@gmail.com`
- Check browser console for auth errors
- Try signing out and back in

### Game Not Appearing
- Verify `published` is set to `true`
- Check that game has at least one category
- Clear browser cache and reload

### Firebase Errors
- Check Firestore rules are deployed
- Verify Firebase config is correct
- Check browser console for specific error messages

## API Reference

### GameManager Methods

```javascript
// Get all published games
await gameManager.getAllGames()

// Get a specific game
await gameManager.getGame(gameId)

// Get featured games
await gameManager.getFeaturedGames(limit)

// Get most played games
await gameManager.getMostPlayedGames(limit)

// Get new games
await gameManager.getNewGames(limit)

// Get games by category
await gameManager.getGamesByCategory(category, limit)

// Search games
await gameManager.searchGames(query)

// Increment play count
await gameManager.incrementPlayCount(gameId)

// Track user play (requires user to be logged in)
await gameManager.trackUserPlay(gameId, userId)

// Get user's recent games
await gameManager.getUserRecentGames(userId, limit)
```

### Admin-Only Methods

```javascript
// Add a new game
await gameManager.addGame(gameData, userId)

// Update a game
await gameManager.updateGame(gameId, gameData, userId)

// Delete a game
await gameManager.deleteGame(gameId, userId)

// Get all games (including unpublished)
await gameManager.getAllGamesAdmin(userId)

// Update categories
await gameManager.updateCategories(categories, userId)

// Check if user is admin
gameManager.isAdmin(userId)
```

## Future Enhancements

Potential features to add:
- User ratings and reviews
- High score leaderboards
- Game achievements
- Favorites/bookmarking
- Social sharing
- Game recommendations
- Comments and discussions
- Mobile app wrapper
- Offline play support
- Game analytics dashboard

## Support

For issues or questions:
- Check this README
- Review browser console for errors
- Contact zorbyteofficial@gmail.com

---

Built with ❤️ for GuyThatLives.net
