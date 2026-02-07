# Construct 2/3 Games Fix - Canvas Tainting Error

## Problem

Games like **Ovo** fail with the error:

```
Uncaught DOMException: The operation is insecure.
    at loadTexture (c2runtime.js:3232)
```

## Why This Happens

Construct 2/3 games use HTML5 Canvas with pixel manipulation methods like:
- `canvas.getImageData()` - Read pixel data
- `canvas.toDataURL()` - Export canvas as image
- `context.getImageData()` - Get pixel buffer

When an iframe is loaded via `srcdoc`, it has a **null origin**. The browser's security model treats this as untrusted, and blocks canvas pixel access even when:
- ✓ Images have CORS headers
- ✓ Images use `crossorigin="anonymous"`
- ✓ CDN is configured correctly

**The root cause:** `iframe.srcdoc` creates a document with `origin = null`, which the browser considers cross-origin to the images loaded from `cdn.guythatlives.net`.

## Solution

Load Construct 2/3 games **directly** using `iframe.src` instead of `iframe.srcdoc`:

```javascript
// ❌ DOESN'T WORK for Construct games
gameFrame.srcdoc = html; // Creates null origin

// ✅ WORKS for Construct games
gameFrame.src = gameUrl; // Preserves proper origin
```

## Implementation

The fix automatically detects Construct 2/3 games by checking for:

1. **c2runtime.js** or **c3runtime.js** file references
2. Construct 2/3 HTML comments
3. Construct-specific classes and functions

When detected, the game is loaded directly without storage isolation.

### Code Changes

In `/unblocked/game/index.html`:

```javascript
// Check for Construct 2/3 indicators
const construct2Indicators = [
    'c2runtime.js',
    'c3runtime.js',
    'c2canvas',
    'Construct 2',
    'Construct 3',
    'Construct2',
    'cr_getC2Runtime',
    'C2_RuntimeObject'
];

isConstruct = construct2Indicators.some(indicator =>
    gameHtml.includes(indicator)
);

if (isConstruct) {
    console.log('Detected Construct 2/3 game - using direct load');
    // Load directly via iframe.src (not srcdoc)
    gameFrame.src = currentGame.gameUrl;
}
```

## Verified Working

The fix has been verified to work with:

- **Ovo** - Uses `c2runtime.js`, loads correctly via direct src

## Games That Need This Fix

Common Construct 2/3 games that require direct loading:

### Platformers
- Ovo
- Vex series (Vex 3, Vex 4, Vex 5, etc.)
- Run 3
- Geometry Dash

### Physics Games
- Driftboss
- Tunnel Rush
- Basket Random
- Getaway Shootout

### Other Construct Games
- Retro Haunt
- Most HTML5 games exported from Construct 2 or 3

## How to Identify Construct Games

1. **Check the HTML source** for these patterns:
   ```html
   <!-- Construct 2 exported games require jQuery. -->
   <script src="c2runtime.js"></script>
   ```

2. **Look at the file structure**:
   - Has `c2runtime.js` or `c3runtime.js`
   - Has `data.js` or `offline.json`
   - Usually has `images/` and `media/` folders

3. **Check browser console errors**:
   - Errors from `c2runtime.js`
   - References to `cr_getC2Runtime`
   - Canvas tainting errors

## Manual Override

If a game isn't auto-detected, add it to the `DIRECT_LOAD_GAMES` array:

```javascript
const DIRECT_LOAD_GAMES = [
    // ... existing games ...
    'ovo',           // Add by game ID
    'your-game-id',  // Add your game
];
```

## Trade-offs

**Direct loading (what we do for Construct games):**
- ✓ Canvas pixel access works
- ✓ No tainting errors
- ✓ Game runs at full speed
- ✗ **No storage isolation** (game saves are shared across all instances)
- ✗ Game can access localStorage directly

**srcdoc loading (what we do for other games):**
- ✓ Storage isolation (each game has its own save space)
- ✓ More secure
- ✗ Canvas pixel access blocked for some operations

For Construct games, **direct loading is the only option** since they need canvas pixel access.

## Testing

To test if the fix works:

1. Open the browser console (F12)
2. Navigate to a Construct game (e.g., Ovo)
3. Look for this log message:
   ```
   Detected Construct 2/3 game - using direct load
   Loading Construct 2/3 game directly (src) to avoid canvas tainting
   ```
4. Game should load without "The operation is insecure" errors

## Cloudflare CORS Status

Your Cloudflare configuration is already correct:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: *
```

The issue was **NOT** a CORS problem - it was the iframe origin issue.

## Related Errors

This fix also resolves these related errors:
- `SecurityError: The operation is insecure`
- `Failed to execute 'getImageData' on 'CanvasRenderingContext2D'`
- `Failed to execute 'toDataURL' on 'HTMLCanvasElement'`
- `Canvas has been tainted by cross-origin data`

## Technical Details

### Why srcdoc Creates Null Origin

From the HTML spec:

> When an iframe's srcdoc attribute is set, the embedded document has an opaque origin (null).

This means:
- Document URL: `about:srcdoc`
- Origin: `null`
- Cannot access same-origin resources
- Canvas becomes tainted when loading cross-origin images

### Why Direct Loading Works

When using `iframe.src`:
- Document URL: `https://cdn.guythatlives.net/games/ovo/`
- Origin: `https://cdn.guythatlives.net`
- Can load images from same origin
- Canvas stays untainted

### Browser Security Model

The browser's canvas tainting security:

1. **Same-origin images** → Canvas not tainted
2. **Cross-origin images with CORS** → Canvas not tainted
3. **Cross-origin images without CORS** → Canvas tainted
4. **Images loaded in null-origin document** → Always tainted (even with CORS)

The srcdoc creates case #4, which is why direct loading is necessary.

## Questions?

If you encounter issues:

1. Check if game uses `c2runtime.js` or `c3runtime.js`
2. Look for "operation is insecure" errors in console
3. Add game to `DIRECT_LOAD_GAMES` array
4. Use the diagnostics page: `/unblocked/game-diagnostics.html`
