# Enhanced Bug Reporter - Upgrade Documentation

## Overview

The bug reporting system has been significantly upgraded to provide comprehensive diagnostic data for debugging game issues. This document outlines the new features, implementation details, and Firestore schema changes.

## New Features

### 1. Game Metadata Capture

**Problem Solved:** Previously, bug reports only showed the page path (`/unblocked/game/`), making it impossible to identify which game was experiencing issues.

**Implementation:**
- Extracts game ID from URL query parameter (`?game=YoSR2G7ygxbG2J4l4LIS`)
- Fetches full game metadata (title, gameUrl) from `gameManager` if available
- Gracefully handles cases where game data is unavailable
- Displays game name in the bug report UI for user confirmation

**Code Location:** `bug-reporter.js:44-76`

```javascript
function getGameId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('game');
}

async function getGameMetadata() {
    const gameId = getGameId();
    if (!gameId) return { gameId: null, gameTitle: null, gameUrl: null };

    if (window.gameManager && typeof window.gameManager.getGame === 'function') {
        const gameData = await window.gameManager.getGame(gameId);
        return {
            gameId: gameId,
            gameTitle: gameData.title || null,
            gameUrl: gameData.gameUrl || null
        };
    }

    return { gameId: gameId, gameTitle: null, gameUrl: null };
}
```

### 2. Screenshot Capture (Optional)

**Problem Solved:** Visual bugs are hard to describe in text. Screenshots provide immediate context.

**Implementation:**
- User-consent checkbox: "Capture screenshot (helps us debug faster)"
- Dynamically loads `html2canvas` library (1.4.1) from CDN only when needed
- Captures the game frame wrapper (including iframe content where possible)
- Compresses to JPEG format with adaptive quality (starts at 0.4, reduces to 0.1 if needed)
- Maximum size: 250KB (Firebase-friendly, no Cloud Storage required)
- Stores as Base64 string directly in Firestore document

**Code Location:** `bug-reporter.js:103-159`

**Usage:**
```javascript
// Screenshot is only captured if checkbox is checked
if (screenshotCheckbox.checked) {
    screenshot = await captureScreenshot();
}
```

**Compression Strategy:**
- Scale: 0.5x (reduces resolution by half)
- Max dimensions: 1280x720
- Format: JPEG
- Quality: Adaptive (0.4 → 0.1 if needed to stay under 250KB)

### 3. Environment Context

**Problem Solved:** Browser and device differences cause different issues. Need to know the user's environment.

**Implementation:**
- Automatically captures comprehensive environment data:
  - User-Agent (browser version, OS)
  - Screen resolution (e.g., "1920x1080")
  - Viewport size (e.g., "1366x768")
  - iframe source (src URL or "[srcdoc] ..." if using srcdoc)
  - Timestamp (ISO 8601 format)
  - Timezone (e.g., "America/New_York")
  - Platform (e.g., "Win32", "MacIntel")
  - Language (e.g., "en-US")

**Code Location:** `bug-reporter.js:78-101`

**Example Output:**
```javascript
{
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    screenResolution: "1920x1080",
    viewportSize: "1366x768",
    iframeSource: "https://cdn.guythatlives.net/games/fnaf1/index.html",
    timestamp: "2026-02-07T20:30:45.123Z",
    timezone: "America/New_York",
    platform: "Win32",
    language: "en-US"
}
```

### 4. Enhanced UI

**New UI Elements:**
- Game name display (when available): `Game: FNAF 1`
- Screenshot checkbox with descriptive label
- Updated hint text explaining all captured data
- Visual feedback during screenshot capture: "Capturing screenshot..."

**Modal Width:** Increased from 480px to 520px to accommodate new elements

## Firestore Schema

### Updated Bug Report Document Structure

```javascript
{
    // ── Existing Fields (Backward Compatible) ──
    page: string,                    // e.g., "/unblocked/game/"
    description: string,             // User's bug description (max 2000 chars)
    consoleLogs: array,              // Last 50 console messages
    submittedAt: timestamp,          // Server timestamp
    resolved: boolean,               // Admin flag

    // ── NEW: Game Metadata ──
    gameId: string | null,           // Firestore game document ID
    gameTitle: string | null,        // Human-readable game name
    gameUrl: string | null,          // CDN URL of the game

    // ── NEW: Environment Context ──
    environment: {
        userAgent: string,           // Full browser user agent
        screenResolution: string,    // e.g., "1920x1080"
        viewportSize: string,        // e.g., "1366x768"
        iframeSource: string | null, // Game iframe src or "[srcdoc]"
        timestamp: string,           // ISO 8601 timestamp
        timezone: string,            // IANA timezone
        platform: string,            // Navigator platform
        language: string             // Browser language
    },

    // ── NEW: Optional Screenshot ──
    screenshot: string | null        // Base64 JPEG image (max ~250KB)
}
```

### Example Document

```json
{
    "page": "/unblocked/game/",
    "description": "The game freezes after clicking the start button",
    "submittedAt": "2026-02-07T20:30:45.000Z",
    "resolved": false,

    "gameId": "YoSR2G7ygxbG2J4l4LIS",
    "gameTitle": "Five Nights at Freddy's",
    "gameUrl": "https://cdn.guythatlives.net/games/fnaf1/index.html",

    "environment": {
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "screenResolution": "1920x1080",
        "viewportSize": "1366x768",
        "iframeSource": "https://cdn.guythatlives.net/games/fnaf1/index.html",
        "timestamp": "2026-02-07T20:30:45.123Z",
        "timezone": "America/New_York",
        "platform": "Win32",
        "language": "en-US"
    },

    "consoleLogs": [
        {
            "level": "error",
            "message": "Uncaught TypeError: Cannot read property 'start' of undefined",
            "timestamp": "2026-02-07T20:30:44.500Z"
        }
    ],

    "screenshot": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..." // Base64 string
}
```

## Firestore Security Rules

**No changes required!** The existing security rules already allow:
- Anyone can create bug reports (`.create`)
- Only admins can read/update bug reports

```javascript
match /bugReports/{reportId} {
    // Allow anyone to create bug reports
    allow create: if true;

    // Only admins can read/update/delete
    allow read, update, delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

The new fields are simply additional data in the document—no schema validation needed since Firestore is schema-less.

## Dependencies

### Runtime Dependencies
- **Firebase SDK**: Already loaded (app, auth, firestore)
- **html2canvas**: Loaded dynamically from CDN (1.4.1) only when screenshot is requested

### CDN URLs
```html
<!-- Dynamically loaded when screenshot checkbox is checked -->
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
```

## Testing Checklist

### Basic Functionality
- [ ] Bug reporter FAB button appears in bottom-left corner
- [ ] Modal opens when clicking "Report Bug" button
- [ ] Page path is displayed correctly
- [ ] Console logs are captured (check browser console)
- [ ] Can submit report without screenshot

### Game Metadata
- [ ] On game page with `?game=XXX`, game name appears in modal
- [ ] Game name shows game title (not ID) when available
- [ ] Game metadata section hidden on non-game pages
- [ ] Game ID is included in submitted report

### Screenshot Capture
- [ ] Screenshot checkbox is visible and functional
- [ ] html2canvas loads when screenshot is requested
- [ ] Status shows "Capturing screenshot..." during capture
- [ ] Screenshot is included in report (check Firestore)
- [ ] Screenshot size is under 250KB (check console log)

### Environment Context
- [ ] Environment data is captured automatically
- [ ] User-Agent is correct
- [ ] Screen resolution matches actual screen
- [ ] Viewport size matches browser window
- [ ] iframe source is captured (or "[srcdoc]" indicator)

### Error Handling
- [ ] Empty description shows error message
- [ ] Failed screenshot doesn't block submission
- [ ] Network errors show user-friendly message
- [ ] Submit button is re-enabled after errors

## Migration Notes

### Backward Compatibility
✅ **Fully backward compatible!** Old bug reports without new fields will still work. The code handles missing game metadata gracefully:

```javascript
// All new fields are nullable
gameId: gameMetadata.gameId,              // null if not available
gameTitle: gameMetadata.gameTitle,        // null if not available
gameUrl: gameMetadata.gameUrl,            // null if not available
screenshot: screenshot                     // null if not captured
```

### Viewing Old Reports
When viewing bug reports in Firebase Console or admin dashboard:
- Old reports: Missing `gameId`, `gameTitle`, `gameUrl`, `environment`, `screenshot` fields
- New reports: Include all fields (screenshot may be null if not captured)

### Admin Dashboard Updates (Future)
To take advantage of new data in your admin dashboard:

```javascript
// Display game information
if (report.gameId) {
    console.log(`Game: ${report.gameTitle} (${report.gameId})`);
    console.log(`Game URL: ${report.gameUrl}`);
}

// Display environment details
if (report.environment) {
    console.log(`Browser: ${report.environment.userAgent}`);
    console.log(`Resolution: ${report.environment.screenResolution}`);
    console.log(`Viewport: ${report.environment.viewportSize}`);
}

// Display screenshot
if (report.screenshot) {
    const img = document.createElement('img');
    img.src = report.screenshot;
    img.style.maxWidth = '100%';
    document.getElementById('screenshot-container').appendChild(img);
}
```

## Performance Considerations

### Load Time Impact
- **Initial page load**: No impact (script is lightweight ~15KB)
- **Opening modal**: Minimal (~50ms to fetch game metadata)
- **Screenshot capture**: 1-3 seconds depending on complexity

### Firestore Document Size
- **Without screenshot**: ~5-10KB per report
- **With screenshot**: ~200-250KB per report (compressed JPEG)
- **Free tier limit**: 1GB storage (can store ~4,000-5,000 reports with screenshots)

### Network Usage
- **html2canvas**: ~200KB (loaded once per session, cached)
- **Report submission**: 5-250KB depending on screenshot inclusion

## Debugging

### Console Logging
The enhanced bug reporter logs helpful information:

```javascript
// When screenshot is captured
"Screenshot captured: 234KB at quality 0.3"

// When game metadata is loaded
"GameManager initialized"

// When html2canvas is loaded
"html2canvas loaded"

// If screenshot fails
"Screenshot capture failed: [error details]"
```

### Common Issues

**Issue: Screenshot is black or empty**
- **Cause**: iframe with `srcdoc` or cross-origin content
- **Solution**: This is a browser security limitation. Screenshot will still capture the wrapper/UI.

**Issue: Screenshot too large**
- **Cause**: Complex game graphics or high resolution
- **Solution**: Quality is automatically reduced. If still over 250KB, it's included anyway (Firestore max doc size is 1MB).

**Issue: Game metadata not appearing**
- **Cause**: gameManager not loaded or game ID not in URL
- **Solution**: Check that `game-manager.js` is loaded before `bug-reporter.js` and URL contains `?game=` parameter.

## Future Enhancements

Potential improvements for future versions:

1. **Admin Dashboard**
   - View bug reports in a custom dashboard
   - Filter by game, date, resolved status
   - Display screenshots in lightbox
   - Mark reports as resolved

2. **Screenshot Improvements**
   - Capture game iframe content (requires CORS-friendly games)
   - Annotate screenshots (draw arrows, add notes)
   - Multiple screenshots per report

3. **Additional Context**
   - Browser extension/blocker detection
   - Network speed/latency
   - Last N user actions (click tracking)
   - Performance metrics (FPS, memory usage)

4. **User Notifications**
   - Email when bug is resolved
   - In-app notification system
   - Bug report history for logged-in users

## Support

For questions or issues with the enhanced bug reporter:
1. Check console logs for error messages
2. Verify Firebase SDK is loaded
3. Ensure `game-manager.js` loads before `bug-reporter.js`
4. Test in multiple browsers (Chrome, Firefox, Safari)

---

**Last Updated:** 2026-02-07
**Version:** 2.0.0
**Author:** Enhanced by Claude Code
