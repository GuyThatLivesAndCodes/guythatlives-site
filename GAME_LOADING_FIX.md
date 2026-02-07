# Game Loading Fix - URL Constructor Error

## Problem

Most games in the unblocked games section are failing with this error:

```
Uncaught (in promise) TypeError: URL constructor: ./assets/e6d8cb7a6e40f0c51e146bb1366aaad2.svg is not a valid URL.
```

## Root Cause

When games are loaded using the `srcdoc` attribute in an iframe, **relative URLs** (like `./assets/file.svg`) cannot be resolved because there's no base URL context. The browser doesn't know where `./` should point to.

This happens in the game loading code at `/unblocked/game/index.html` where games are:
1. Fetched from the CDN
2. Modified to add storage isolation
3. Loaded via `iframe.srcdoc = html`

Without a proper `<base>` tag, the browser tries to resolve `./assets/file.svg` relative to `about:srcdoc`, which is invalid.

## Solution Applied

### 1. Improved Base Tag Injection

Updated the `injectBaseTag()` function in `/unblocked/game/index.html`:

- Ensures the base URL always ends with a trailing slash (`/`)
- Properly removes all existing base tags before injecting
- Handles edge cases where HTML might not have `<head>` or `<html>` tags

### 2. Better Base URL Extraction

Fixed base URL calculation in multiple places:

```javascript
let baseUrl = currentGame.gameUrl;
// If gameUrl points to index.html, get the directory
if (baseUrl.endsWith('/index.html')) {
    baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
} else if (!baseUrl.endsWith('/')) {
    // Ensure it ends with a slash
    baseUrl += '/';
}
```

This ensures that:
- `https://cdn.guythatlives.net/games/osumania/` → `https://cdn.guythatlives.net/games/osumania/`
- `https://cdn.guythatlives.net/games/osumania/index.html` → `https://cdn.guythatlives.net/games/osumania/`
- `https://cdn.guythatlives.net/games/osumania` → `https://cdn.guythatlives.net/games/osumania/`

### 3. Added Error Logging

Added console logging to help diagnose issues:

- Logs when fetching game HTML
- Logs the base URL being injected
- Logs when games load successfully
- Logs any errors during loading

### 4. Added Error Handlers

Added `onerror` handlers to iframe elements to catch loading failures early.

## CORS Status - Already Fixed ✓

Good news! Your Cloudflare CORS configuration is working perfectly:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: *
Access-Control-Max-Age: 86400
```

The issue was **NOT** a CORS problem - it was a relative URL resolution problem.

## Testing

### Test Your Games

1. Open your browser console (F12)
2. Navigate to any game that was failing
3. Look for these console messages:
   - `Fetching game from: [url]`
   - `Game HTML fetched, length: [number]`
   - `Injecting base tag with URL: [url]`
   - `Game loaded successfully via srcdoc`

### Use the Diagnostics Page

I've created a comprehensive diagnostics tool at:

**`/unblocked/game-diagnostics.html`**

This tool includes:

1. **CDN Connectivity Test** - Checks if CDN is accessible and has proper CORS
2. **Game URL Test** - Analyzes a specific game's HTML for issues
3. **Base Tag Resolution Test** - Tests if relative URLs resolve correctly
4. **Live Game Test** - Load games with different methods to compare
5. **Cloudflare Status Check** - Verify Cloudflare configuration

To use it:
1. Upload `game-diagnostics.html` to your site
2. Navigate to `https://guythatlives.net/unblocked/game-diagnostics.html`
3. Run the tests to verify everything is working

## Example Game URLs

Test with these games that were likely failing:

- `https://cdn.guythatlives.net/games/osumania/`
- `https://cdn.guythatlives.net/games/fridaynightfunkin/`
- Any game that uses `./assets/` paths

## What Changed

**Files Modified:**

1. `/unblocked/game/index.html`
   - Improved `injectBaseTag()` function
   - Better base URL extraction in 2 places
   - Added error logging
   - Added error handlers

**Files Created:**

1. `/unblocked/game-diagnostics.html`
   - Comprehensive diagnostic tool
   - Tests CDN, CORS, base tags, and live loading

## Deployment

To deploy these fixes:

```bash
git add unblocked/game/index.html unblocked/game-diagnostics.html GAME_LOADING_FIX.md
git commit -m "fix: Resolve URL constructor error in games by improving base tag injection"
git push
```

## If Games Still Fail

If some games still have issues:

1. Check the browser console for specific errors
2. Use the diagnostics page to test the specific game URL
3. Verify the game's HTML uses relative URLs (not absolute URLs)
4. Check if the game needs "direct loading" (add it to `DIRECT_LOAD_GAMES` array)

Some games that need pixel-level canvas access should be loaded directly without `srcdoc`:

```javascript
const DIRECT_LOAD_GAMES = [
    'fnaf1', 'fnaf2', 'fnaf3', 'fnaf4',
    'minecraft', 'eaglercraft',
    'slope', 'run3', 'geometrydash'
];
```

Add any problematic games to this list.

## Technical Details

### How Base Tag Works

The `<base>` tag sets the base URL for all relative URLs in a document:

```html
<head>
    <base href="https://cdn.guythatlives.net/games/osumania/">
</head>
```

With this tag:
- `./assets/image.svg` → `https://cdn.guythatlives.net/games/osumania/assets/image.svg`
- `script.js` → `https://cdn.guythatlives.net/games/osumania/script.js`
- `../other/file.js` → `https://cdn.guythatlives.net/games/other/file.js`

### Why srcdoc Needs Base Tag

When you use `iframe.srcdoc`, the browser creates a document with the URL `about:srcdoc`. This is not a valid HTTP URL, so relative URLs cannot be resolved:

- ❌ `about:srcdoc` + `./assets/file.svg` = Invalid URL
- ✓ `<base href="https://cdn.guythatlives.net/games/osumania/">` + `./assets/file.svg` = Valid URL

## Questions?

If you encounter any issues:

1. Check browser console for errors
2. Use the diagnostics page
3. Verify Cloudflare CORS is still active
4. Check if game HTML has been modified unexpectedly
