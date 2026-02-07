# Hack-Client Setup Guide

## Quick Start

The Hack-Client is now live at `/unblocked/hack-client/` with the following features:

1. **Kahoot Answer Finder** (Active)
2. **4 placeholder slots** for future tools

## What's Been Set Up

### Frontend Files
- `index.html` - Main Hack-Client page with tool cards and modal interface
- `style.css` - Custom styles with purple/gradient theme
- `kahoot-finder.js` - Answer finder logic with TOS warning system
- `README.md` - Documentation for users and developers

### Backend Files (Optional)
- `kahoot-proxy-server.js` - Node.js proxy server for Kahoot API
- `package.json` - Dependencies for the proxy server
- `.gitignore` - Ignore patterns for Node.js

### Integration
- Added "🔓 Hack-Client" link to main navigation in `/unblocked/index.html`
- Added featured banner on games homepage with beta badge and warning

## How to Use (3 Options)

### Option 1: Demo Mode (No Setup Required)
The tool works out of the box in demo mode:
- Shows sample questions and answers
- Good for testing the UI
- No real Kahoot data

### Option 2: Cloudflared Proxy (Recommended)
For actual Kahoot data, set up a proxy server:

1. **Navigate to the hack-client directory:**
   ```bash
   cd unblocked/hack-client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the proxy server:**
   ```bash
   npm start
   ```

   You should see:
   ```
   ╔═══════════════════════════════════════════════╗
   ║   Kahoot Proxy Server                        ║
   ╚═══════════════════════════════════════════════╝

   Server running on port 8080
   Local: http://localhost:8080
   ```

4. **Install Cloudflared:**
   - Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation
   - Or install via package manager:
     - Windows: `winget install --id Cloudflare.cloudflared`
     - macOS: `brew install cloudflared`
     - Linux: `wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64`

5. **Start Cloudflared tunnel:**
   ```bash
   cloudflared tunnel --url http://localhost:8080
   ```

6. **Copy the tunnel URL:**
   You'll see something like:
   ```
   Your quick tunnel is: https://example-abc-123.trycloudflare.com
   ```

7. **Update kahoot-finder.js:**
   Open `kahoot-finder.js` and update line 69:
   ```javascript
   const cloudflaredUrl = 'https://your-tunnel-url.trycloudflare.com';
   ```

8. **Test it:**
   - Visit `/unblocked/hack-client/`
   - Click "Launch Tool" on Kahoot Answer Finder
   - Accept TOS
   - Enter a real Kahoot PIN
   - See actual quiz data!

### Option 3: Deploy to a VPS/Server
For permanent access, deploy the proxy server to:
- **Heroku**: Free tier available
- **Railway**: Easy deployment
- **Vercel**: Serverless functions
- **Your own VPS**: DigitalOcean, AWS, etc.

Update the `cloudflaredUrl` variable to your deployed endpoint.

## Features Explained

### TOS Warning System
Every tool requires users to:
1. Read the Terms of Service warning
2. Acknowledge potential TOS violations
3. Accept responsibility before using

This ensures users are informed about the risks.

### Multiple Connection Methods
The Kahoot finder tries methods in order:
1. **Cloudflared proxy** (your home server)
2. **Direct Kahoot API** (usually blocked by CORS)
3. **Public CORS proxy** (unreliable fallback)
4. **Demo mode** (always works)

### Clean UI/UX
- Modern card-based design
- Responsive layout
- Status messages for user feedback
- Animated results display
- Color-coded correct answers (green)

## File Structure

```
/unblocked/hack-client/
├── index.html                 # Main page
├── style.css                  # Styles
├── kahoot-finder.js           # Frontend logic
├── kahoot-proxy-server.js     # Backend proxy (optional)
├── package.json               # Node.js dependencies
├── .gitignore                 # Git ignore patterns
├── README.md                  # User documentation
└── SETUP.md                   # This file
```

## Adding New Tools

To add a new tool (you have 4 placeholder slots):

1. **Update index.html:**
   Replace a "Coming Soon" card with your new tool:
   ```html
   <div class="tool-card" id="your-tool">
       <div class="tool-header">
           <div class="tool-icon">🎯</div>
           <div class="tool-info">
               <h2>Your Tool Name</h2>
               <span class="status-badge active">Active</span>
           </div>
       </div>
       <p class="tool-description">Description here</p>
       <button class="tool-button" onclick="openYourTool()">
           Launch Tool →
       </button>
   </div>
   ```

2. **Create modal interface:**
   Add a modal section similar to `kahoot-modal`

3. **Add JavaScript logic:**
   Either extend `kahoot-finder.js` or create a new JS file

4. **Add styles:**
   Extend `style.css` with tool-specific styles

5. **Test thoroughly:**
   Test TOS warning, input validation, error handling

## Security Considerations

### What's Safe
- Reading publicly available quiz data
- Educational demonstrations
- Learning about APIs and web technologies

### What's Not Safe
- Cheating on actual quizzes
- Automated spam/abuse
- Violating platform TOS maliciously

### Best Practices
- Always show TOS warnings
- Never auto-execute without user consent
- Implement rate limiting on backend
- Log usage for abuse detection
- Respect robots.txt and API terms

## Troubleshooting

### "Cloudflared endpoint not available"
- Make sure proxy server is running (`npm start`)
- Check cloudflared tunnel is active
- Verify URL in kahoot-finder.js matches tunnel URL

### "CORS policy blocked"
- This is normal for direct API calls
- Use cloudflared proxy instead
- Check browser console for details

### Only seeing demo data
- All connection methods failed
- Check network connectivity
- Verify proxy server logs
- Try a different Kahoot PIN

### Proxy server crashes
- Check Node.js version (need 14+)
- Run `npm install` again
- Check port 8080 isn't already in use
- Look at error logs

## Production Checklist

Before going live:

- [ ] Test TOS warning displays correctly
- [ ] Verify all connection methods work
- [ ] Test error handling with invalid PINs
- [ ] Check mobile responsiveness
- [ ] Verify navigation links work
- [ ] Test demo mode fallback
- [ ] Review security warnings
- [ ] Add analytics (optional)
- [ ] Set up monitoring (optional)
- [ ] Document for users

## Next Steps

1. **Test the frontend:**
   - Visit `/unblocked/hack-client/`
   - Click through the UI
   - Test demo mode

2. **Set up backend (optional):**
   - Follow Option 2 above
   - Get real Kahoot data working

3. **Plan future tools:**
   - What other educational tools?
   - Quizlet finder?
   - Form auto-filler?
   - Cookie inspector?

4. **Monitor usage:**
   - Track which tools are popular
   - Gather user feedback
   - Fix bugs as they appear

## Legal Disclaimer

This tool suite is provided for educational purposes only. Users are responsible for their own actions. Always respect terms of service and use tools ethically. The creators are not liable for misuse.

## Support

For issues or questions:
- Check the README.md
- Review browser console logs
- Check proxy server logs
- Test with demo mode first

## Credits

Built with:
- Express.js (backend)
- Vanilla JavaScript (frontend)
- Cloudflared (tunneling)
- CSS Grid/Flexbox (layout)

---

**Remember:** With great power comes great responsibility. Use these tools to learn, not to cheat! 🎓
