# How to View Enhanced Bug Reports

## Quick Access

### Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** in the left sidebar
4. Click on the `bugReports` collection
5. Click on any document to view its details

### Using Firebase SDK in Browser Console

```javascript
// Get all bug reports
firebase.firestore().collection('bugReports')
    .orderBy('submittedAt', 'desc')
    .limit(10)
    .get()
    .then(snapshot => {
        snapshot.forEach(doc => {
            console.log(doc.id, doc.data());
        });
    });

// Get bug reports for a specific game
firebase.firestore().collection('bugReports')
    .where('gameId', '==', 'YoSR2G7ygxbG2J4l4LIS')
    .get()
    .then(snapshot => {
        snapshot.forEach(doc => {
            console.log(doc.id, doc.data());
        });
    });

// View screenshot from a report
firebase.firestore().collection('bugReports')
    .doc('REPORT_ID_HERE')
    .get()
    .then(doc => {
        if (doc.data().screenshot) {
            const img = document.createElement('img');
            img.src = doc.data().screenshot;
            img.style.maxWidth = '100%';
            img.style.border = '2px solid red';
            document.body.appendChild(img);
        }
    });
```

## Understanding the Data

### Example Report (Formatted)

```json
{
  "page": "/unblocked/game/",
  "description": "Game crashes when clicking start button",
  "submittedAt": "Timestamp(2026-02-07 20:30:45)",
  "resolved": false,

  "gameId": "YoSR2G7ygxbG2J4l4LIS",
  "gameTitle": "Five Nights at Freddy's",
  "gameUrl": "https://cdn.guythatlives.net/games/fnaf1/index.html",

  "environment": {
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
    },
    {
      "level": "warn",
      "message": "Game initialization failed",
      "timestamp": "2026-02-07T20:30:44.450Z"
    }
  ],

  "screenshot": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `page` | String | URL path where bug occurred |
| `description` | String | User's description of the bug |
| `submittedAt` | Timestamp | When the report was submitted |
| `resolved` | Boolean | Admin flag for tracking resolution |
| `gameId` | String/Null | Firestore game document ID |
| `gameTitle` | String/Null | Human-readable game name |
| `gameUrl` | String/Null | CDN URL of the game |
| `environment` | Object | User's browser/device information |
| `consoleLogs` | Array | Last 50 console messages |
| `screenshot` | String/Null | Base64-encoded JPEG image |

### Environment Object Breakdown

```javascript
{
  userAgent: "Mozilla/5.0..."    // Browser version and OS
  screenResolution: "1920x1080"  // Physical screen size
  viewportSize: "1366x768"       // Browser window size
  iframeSource: "https://..."    // Game URL or "[srcdoc]"
  timestamp: "2026-02-07..."     // ISO 8601 timestamp
  timezone: "America/New_York"   // User's timezone
  platform: "Win32"              // Operating system
  language: "en-US"              // Browser language
}
```

## Filtering Reports

### By Game
```javascript
// Reports for FNAF 1
db.collection('bugReports')
  .where('gameId', '==', 'YoSR2G7ygxbG2J4l4LIS')
  .get()
```

### By Date Range
```javascript
// Reports from last 7 days
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

db.collection('bugReports')
  .where('submittedAt', '>=', sevenDaysAgo)
  .orderBy('submittedAt', 'desc')
  .get()
```

### Unresolved Only
```javascript
// Only unresolved reports
db.collection('bugReports')
  .where('resolved', '==', false)
  .orderBy('submittedAt', 'desc')
  .get()
```

### With Screenshots
```javascript
// Reports that include screenshots
db.collection('bugReports')
  .where('screenshot', '!=', null)
  .get()
```

### By Browser
```javascript
// Chrome users only (requires client-side filtering)
db.collection('bugReports').get().then(snapshot => {
  const chromeReports = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.environment?.userAgent?.includes('Chrome')) {
      chromeReports.push({ id: doc.id, ...data });
    }
  });
  console.log('Chrome reports:', chromeReports);
});
```

## Analyzing Bug Patterns

### Find Most Reported Games
```javascript
const gameReports = {};

firebase.firestore().collection('bugReports')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      const gameTitle = doc.data().gameTitle || 'Unknown';
      gameReports[gameTitle] = (gameReports[gameTitle] || 0) + 1;
    });

    console.log('Bug reports by game:');
    Object.entries(gameReports)
      .sort((a, b) => b[1] - a[1])
      .forEach(([game, count]) => {
        console.log(`${game}: ${count} reports`);
      });
  });
```

### Find Common Error Messages
```javascript
const errorPatterns = {};

firebase.firestore().collection('bugReports')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      const logs = doc.data().consoleLogs || [];
      logs.forEach(log => {
        if (log.level === 'error') {
          const msg = log.message.substring(0, 50); // First 50 chars
          errorPatterns[msg] = (errorPatterns[msg] || 0) + 1;
        }
      });
    });

    console.log('Common errors:');
    Object.entries(errorPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([error, count]) => {
        console.log(`${count}x: ${error}`);
      });
  });
```

### Browser Compatibility Issues
```javascript
const browserBugs = {
  Chrome: 0,
  Firefox: 0,
  Safari: 0,
  Edge: 0,
  Other: 0
};

firebase.firestore().collection('bugReports')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      const ua = doc.data().environment?.userAgent || '';
      if (ua.includes('Chrome') && !ua.includes('Edge')) browserBugs.Chrome++;
      else if (ua.includes('Firefox')) browserBugs.Firefox++;
      else if (ua.includes('Safari') && !ua.includes('Chrome')) browserBugs.Safari++;
      else if (ua.includes('Edge')) browserBugs.Edge++;
      else browserBugs.Other++;
    });

    console.log('Bug reports by browser:', browserBugs);
  });
```

## Marking Reports as Resolved

```javascript
// Mark a single report as resolved
firebase.firestore().collection('bugReports')
  .doc('REPORT_ID_HERE')
  .update({ resolved: true })
  .then(() => console.log('Report marked as resolved'));

// Mark all reports for a specific game as resolved
firebase.firestore().collection('bugReports')
  .where('gameId', '==', 'YoSR2G7ygxbG2J4l4LIS')
  .get()
  .then(snapshot => {
    const batch = firebase.firestore().batch();
    snapshot.forEach(doc => {
      batch.update(doc.ref, { resolved: true });
    });
    return batch.commit();
  })
  .then(() => console.log('All reports resolved'));
```

## Exporting Data

### Export to JSON
```javascript
firebase.firestore().collection('bugReports')
  .get()
  .then(snapshot => {
    const reports = [];
    snapshot.forEach(doc => {
      reports.push({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate().toISOString()
      });
    });

    // Download as JSON file
    const blob = new Blob([JSON.stringify(reports, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bug-reports-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  });
```

### Export to CSV (without screenshots)
```javascript
firebase.firestore().collection('bugReports')
  .get()
  .then(snapshot => {
    let csv = 'ID,Date,Page,Game,Description,Resolved,UserAgent\n';

    snapshot.forEach(doc => {
      const data = doc.data();
      const date = data.submittedAt?.toDate().toISOString() || 'N/A';
      const game = data.gameTitle || 'N/A';
      const desc = (data.description || '').replace(/"/g, '""');
      const ua = (data.environment?.userAgent || 'N/A').replace(/"/g, '""');

      csv += `"${doc.id}","${date}","${data.page}","${game}","${desc}","${data.resolved}","${ua}"\n`;
    });

    // Download as CSV file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bug-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  });
```

## Creating a Simple Admin Page

Here's a minimal HTML page to view bug reports:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Bug Reports Admin</title>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
    <style>
        body { font-family: system-ui; padding: 2rem; background: #1a1a1a; color: #fff; }
        .report { background: #2a2a2a; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; }
        .report h3 { margin: 0 0 0.5rem 0; color: #60a5fa; }
        .report .meta { font-size: 0.875rem; color: #9ca3af; margin-bottom: 0.5rem; }
        .report .desc { margin: 0.5rem 0; }
        .report .logs { background: #1a1a1a; padding: 0.5rem; border-radius: 4px; font-family: monospace; font-size: 0.8rem; max-height: 200px; overflow-y: auto; }
        .report img { max-width: 100%; margin-top: 0.5rem; border: 2px solid #60a5fa; border-radius: 4px; }
        .error { color: #ef4444; }
    </style>
</head>
<body>
    <h1>Bug Reports</h1>
    <div id="reports"></div>

    <script>
        // Initialize Firebase (use your config)
        firebase.initializeApp({
            apiKey: "YOUR_API_KEY",
            authDomain: "YOUR_PROJECT.firebaseapp.com",
            projectId: "YOUR_PROJECT_ID"
        });

        const db = firebase.firestore();

        db.collection('bugReports')
            .orderBy('submittedAt', 'desc')
            .limit(50)
            .get()
            .then(snapshot => {
                const container = document.getElementById('reports');

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const date = data.submittedAt?.toDate().toLocaleString() || 'N/A';

                    const reportDiv = document.createElement('div');
                    reportDiv.className = 'report';

                    let html = `
                        <h3>${data.gameTitle || 'Unknown Game'}</h3>
                        <div class="meta">
                            ${date} | ${data.page} | ${data.environment?.userAgent || 'N/A'}
                        </div>
                        <div class="desc"><strong>Description:</strong> ${data.description}</div>
                    `;

                    if (data.consoleLogs?.length) {
                        html += '<div class="logs">';
                        data.consoleLogs.forEach(log => {
                            const className = log.level === 'error' ? 'error' : '';
                            html += `<div class="${className}">[${log.level}] ${log.message}</div>`;
                        });
                        html += '</div>';
                    }

                    if (data.screenshot) {
                        html += `<img src="${data.screenshot}" alt="Screenshot">`;
                    }

                    reportDiv.innerHTML = html;
                    container.appendChild(reportDiv);
                });
            });
    </script>
</body>
</html>
```

## Troubleshooting

### "Permission Denied" Error
**Solution:** Make sure you're authenticated as an admin. Check Firestore security rules.

### Screenshots Not Loading
**Cause:** Base64 string too large or malformed
**Solution:**
```javascript
// Validate screenshot
if (data.screenshot && data.screenshot.startsWith('data:image/')) {
    img.src = data.screenshot;
} else {
    console.log('Invalid screenshot data');
}
```

### Missing Game Data
**Cause:** Old reports or non-game pages
**Solution:** Always check if field exists:
```javascript
const gameTitle = data.gameTitle || 'No game data';
```

---

**Quick Tips:**
- Use Firebase Console for quick viewing
- Use browser console for complex queries
- Create a custom admin page for regular monitoring
- Export data regularly for analysis
- Filter by `resolved: false` to focus on active issues
