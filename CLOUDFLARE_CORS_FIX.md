# Cloudflare CORS Fix for cdn.guythatlives.net

## Your Setup
- **CDN Domain:** cdn.guythatlives.net
- **Backend:** GitHub Pages (guythatlives-unblocked-games-dns repo)
- **Proxy:** Cloudflare DNS + Proxy

## Problem
Games failing to load due to CORS errors because:
1. GitHub Pages doesn't send CORS headers by default
2. Cloudflare is just proxying the requests without adding headers
3. Browsers block cross-origin requests from guythatlives.net → cdn.guythatlives.net

## Solution: Add Cloudflare Transform Rules

### Method 1: Transform Rules (Recommended - Free Plan)

**Step-by-step:**

1. **Go to Cloudflare Dashboard**
   - Login at https://dash.cloudflare.com
   - Select your domain (guythatlives.net or wherever cdn is managed)

2. **Navigate to Transform Rules**
   - In the left sidebar: Click **"Rules"** → **"Transform Rules"**
   - Click **"Modify Response Header"**
   - Click **"Create rule"**

3. **Create the CORS Rule**
   - **Rule name:** `CDN CORS Headers`

   - **When incoming requests match:**
     ```
     Field: Hostname
     Operator: equals
     Value: cdn.guythatlives.net
     ```

     AND

     ```
     Field: URI Path
     Operator: starts with
     Value: /games/
     ```

   - **Then:**
     - Click **"Set static"**
     - **Header name:** `Access-Control-Allow-Origin`
     - **Value:** `*`
     - Click **"Add"** to add another header

     - **Header name:** `Access-Control-Allow-Methods`
     - **Value:** `GET, HEAD, OPTIONS`
     - Click **"Add"** to add another header

     - **Header name:** `Access-Control-Allow-Headers`
     - **Value:** `*`
     - Click **"Add"** to add another header

     - **Header name:** `Access-Control-Max-Age`
     - **Value:** `86400`

4. **Click "Deploy"**

5. **Wait 1-2 minutes** for the rule to propagate

### Method 2: Cloudflare Workers (Alternative - More Control)

If Transform Rules don't work or you need more advanced logic:

1. **Go to Workers & Pages**
   - In Cloudflare Dashboard → **Workers & Pages**
   - Click **"Create Application"** → **"Create Worker"**

2. **Name your worker:** `cdn-cors-handler`

3. **Paste this code:**

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Only apply to cdn.guythatlives.net/games/*
  if (url.hostname !== 'cdn.guythatlives.net' || !url.pathname.startsWith('/games/')) {
    return fetch(request)
  }

  // Handle OPTIONS preflight request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    })
  }

  // Fetch the actual resource from GitHub Pages
  const response = await fetch(request)

  // Clone response and add CORS headers
  const newResponse = new Response(response.body, response)

  // Add CORS headers
  newResponse.headers.set('Access-Control-Allow-Origin', '*')
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS')
  newResponse.headers.set('Access-Control-Allow-Headers', '*')
  newResponse.headers.set('Access-Control-Max-Age', '86400')

  return newResponse
}
```

4. **Click "Save and Deploy"**

5. **Add Route:**
   - Go to **Workers & Pages** → Your worker → **Settings** → **Triggers**
   - Click **"Add route"**
   - **Route:** `cdn.guythatlives.net/games/*`
   - **Zone:** Select your zone
   - Click **"Add route"**

### Method 3: Page Rules (Older Method)

If you're on a legacy Cloudflare plan:

1. Go to **Rules** → **Page Rules**
2. Click **"Create Page Rule"**
3. **URL:** `cdn.guythatlives.net/games/*`
4. **Setting:** Cache Level → Cache Everything
5. **Add Setting:** Add Header
   - This may require a Business plan or higher

**Note:** Page Rules are less flexible for CORS. Use Transform Rules or Workers instead.

## Verification Steps

### Test 1: Check CORS Headers

Run this in your terminal:

```bash
curl -I -X OPTIONS https://cdn.guythatlives.net/games/fridaynightfunkin/Funkin.js
```

You should see:
```
HTTP/2 204
access-control-allow-origin: *
access-control-allow-methods: GET, HEAD, OPTIONS
access-control-allow-headers: *
access-control-max-age: 86400
```

### Test 2: Browser Console Test

Open https://guythatlives.net in your browser, open console (F12), run:

```javascript
fetch('https://cdn.guythatlives.net/games/fridaynightfunkin/Funkin.js')
  .then(r => {
    console.log('✅ CORS Success!');
    console.log('Headers:', {
      'Allow-Origin': r.headers.get('Access-Control-Allow-Origin'),
      'Allow-Methods': r.headers.get('Access-Control-Allow-Methods')
    });
  })
  .catch(e => console.error('❌ CORS Failed:', e));
```

Should print: `✅ CORS Success!`

### Test 3: Load Friday Night Funkin

Go to: https://guythatlives.net/unblocked/game/?id=fridaynightfunkin

Check browser console - CORS errors should be gone.

## Cloudflare DNS Configuration

Make sure your DNS is properly configured:

1. Go to **DNS** → **Records**
2. Find `cdn.guythatlives.net`
3. Ensure:
   - **Type:** `CNAME`
   - **Name:** `cdn`
   - **Target:** `guythatlives.github.io` (or your GitHub Pages URL)
   - **Proxy status:** ☁️ **Proxied** (orange cloud) ← IMPORTANT!

If it's "DNS only" (grey cloud), change it to "Proxied" (orange cloud). This enables Cloudflare's features including Transform Rules.

## Common Issues & Fixes

### Issue 1: "Rule not applying"
**Fix:** Wait 2-3 minutes for CDN cache to clear, then hard refresh (Ctrl+Shift+R)

### Issue 2: "Still getting 405 errors"
**Fix:** GitHub Pages might be rejecting OPTIONS. Use a Worker (Method 2) to intercept and respond to OPTIONS before it reaches GitHub.

### Issue 3: "Headers not showing up"
**Fix:** Make sure:
- Cloudflare proxy is enabled (orange cloud)
- Rule matches exact hostname (cdn.guythatlives.net)
- Rule is deployed and active

### Issue 4: "Worked then stopped"
**Fix:** Check if you hit Cloudflare's free plan limits. Transform Rules on free plan: 10 rules max.

## Recommended Approach

**For fastest fix:** Use **Transform Rules** (Method 1)
- ✅ Available on free plan
- ✅ No code needed
- ✅ Easy to configure
- ✅ Works immediately

**For most control:** Use **Workers** (Method 2)
- ✅ Handle OPTIONS preflight properly
- ✅ Custom logic possible
- ✅ Free plan: 100,000 requests/day
- ✅ Better for complex scenarios

## Security Note

Using `Access-Control-Allow-Origin: *` allows ANY website to load your games. If you want to restrict to only your domain:

Change `*` to:
```
https://guythatlives.net
```

Or allow both main domain and localhost for development:
```javascript
// In Worker:
const allowedOrigins = [
  'https://guythatlives.net',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const origin = request.headers.get('Origin');
const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

newResponse.headers.set('Access-Control-Allow-Origin', allowOrigin);
```

## After Applying Fix

1. Clear your browser cache (Ctrl+Shift+Delete)
2. Hard refresh the game page (Ctrl+Shift+R)
3. Check console - errors should be gone
4. Games should load successfully

## Questions?

If you need help:
1. Check which method you used
2. Screenshot the Cloudflare configuration
3. Share the browser console errors (if still occurring)
4. Verify DNS is proxied (orange cloud)
