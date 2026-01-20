# CDN CORS Configuration Fix

## Problem
Games from `cdn.guythatlives.net` are failing to load due to CORS (Cross-Origin Resource Sharing) errors.

**Error:** `CORS Missing Allow Origin - Status 405`

## Root Cause
Your CDN server at `cdn.guythatlives.net` (GitHub repo: `guythatlives-unblocked-games-dns`) is not configured to allow cross-origin requests from `guythatlives.net`.

## Solution

### Option 1: Add _headers File (Recommended for GitHub Pages)

If your CDN is hosted on **Netlify** or supports `_headers` files:

1. Go to the `guythatlives-unblocked-games-dns` repository
2. Create a file named `_headers` in the root directory
3. Add this content:

```
# CORS headers for all game assets
/games/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: *
  Access-Control-Max-Age: 86400

# Alternative: restrict to your domain only
# Access-Control-Allow-Origin: https://guythatlives.net
```

### Option 2: Use Cloudflare Workers (if using Cloudflare)

If `cdn.guythatlives.net` is behind Cloudflare:

1. Go to Cloudflare Dashboard → Workers
2. Create a new Worker with this code:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    })
  }

  // Fetch the actual resource
  const response = await fetch(request)

  // Clone response and add CORS headers
  const newResponse = new Response(response.body, response)
  newResponse.headers.set('Access-Control-Allow-Origin', '*')
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS')
  newResponse.headers.set('Access-Control-Allow-Headers', '*')

  return newResponse
}
```

3. Add a route: `cdn.guythatlives.net/games/*`

### Option 3: Add .htaccess (if using Apache)

If your CDN runs on Apache, add this to `.htaccess`:

```apache
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header set Access-Control-Allow-Headers "*"
</IfModule>
```

### Option 4: nginx Configuration (if using nginx)

Add to your nginx config:

```nginx
location /games/ {
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' '*' always;

    if ($request_method = 'OPTIONS') {
        return 204;
    }
}
```

### Option 5: GitHub Actions + GitHub Pages

If using GitHub Pages for the CDN:

1. Create `.github/workflows/add-headers.yml`:

```yaml
name: Add CORS Headers
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Create _headers file
        run: |
          cat > _headers << 'EOF'
          /games/*
            Access-Control-Allow-Origin: *
            Access-Control-Allow-Methods: GET, HEAD, OPTIONS
            Access-Control-Allow-Headers: *
          EOF

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
```

## Verification

After applying the fix, test with:

```bash
curl -I -X OPTIONS https://cdn.guythatlives.net/games/fridaynightfunkin/Funkin.js
```

You should see:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
```

Or test in browser console:
```javascript
fetch('https://cdn.guythatlives.net/games/fridaynightfunkin/Funkin.js', {
  method: 'OPTIONS'
}).then(r => {
  console.log('CORS Headers:', r.headers.get('Access-Control-Allow-Origin'))
})
```

## Quick Test Without CDN Changes

If you can't modify the CDN immediately, you can temporarily proxy requests through your main site:

1. Create `/unblocked/cdn-proxy.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>CDN Proxy</title>
</head>
<body>
    <script>
    // This is a temporary workaround - NOT recommended for production
    // Proxies CDN requests through the main site

    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (typeof url === 'string' && url.includes('cdn.guythatlives.net')) {
            // Use a CORS proxy (temporary)
            url = 'https://corsproxy.io/?' + encodeURIComponent(url);
        }
        return originalFetch(url, options);
    };
    </script>
</body>
</html>
```

But this is NOT recommended - fix the CDN configuration instead.

## Next Steps

1. Identify which hosting platform your CDN uses
2. Apply the appropriate CORS fix from above
3. Wait 5-10 minutes for changes to propagate
4. Test the game loading again
5. Check browser console - CORS errors should be gone

## Additional Notes

- Setting `Access-Control-Allow-Origin: *` allows ANY website to load your games
- If you want to restrict to only your domain: `Access-Control-Allow-Origin: https://guythatlives.net`
- Don't forget to handle OPTIONS preflight requests (they MUST return 204 or 200, not 405)
- CORS headers must be present on BOTH the OPTIONS response AND the actual GET response
