# Quick Start Guide

## Getting Started

1. **Open the terminal**:
   - Navigate to `/command/index.html` in your browser
   - Or visit: `https://yourdomain.com/command/`

2. **Try these commands**:
   ```bash
   help                          # Show all commands
   open https://example.com      # Open a window
   list                          # See open windows
   inspect win-1                 # Toggle console
   focus win-1                   # Bring window to front
   close win-1                   # Close window
   clear                         # Clear terminal
   ```

## Quick Examples

### Example 1: Open and Inspect a Page
```bash
open https://github.com
inspect win-1
```

### Example 2: Multiple Windows
```bash
open https://google.com
open https://stackoverflow.com
open https://developer.mozilla.org
list
focus win-2
```

### Example 3: Window Management
```bash
# Open a window
open https://example.com

# Enable console
inspect win-1

# Move it around by dragging the header
# Resize from bottom-right corner

# Close when done
close win-1
```

## Tips

- **Command History**: Press ↑/↓ to navigate through previous commands
- **Tab Completion**: Press Tab to auto-complete command names
- **Window Focus**: Click any window to bring it to front
- **Console Logs**: The console shows page load events and errors (when CORS allows)

## Testing Locally

If running locally:
```bash
# Simple HTTP server (Python 3)
python -m http.server 8000

# Or with Node.js
npx http-server

# Then visit: http://localhost:8000/command/
```

## Customization

Edit these files to customize:
- `terminal.css` - Colors, fonts, styling
- `terminal.js` - Commands, behavior
- `index.html` - Structure

### Color Themes

The CSS uses CSS variables. To change the theme, modify in `terminal.css`:
```css
:root {
    --bg-primary: #0a0a0a;        /* Main background */
    --terminal-green: #00ff00;     /* Primary text color */
    --accent: #64ffda;             /* Highlights */
}
```

### Common Theme Presets

**Amber Theme**:
```css
--terminal-green: #ffb000;
--accent: #ffd700;
```

**Blue Theme**:
```css
--terminal-green: #00bfff;
--accent: #87ceeb;
```

**Matrix Theme**:
```css
--terminal-green: #00ff41;
--accent: #008f11;
```

## Troubleshooting

### Issue: "Cannot access iframe console"
**Solution**: This is normal for cross-origin iframes due to CORS security. The console will still log basic events.

### Issue: Page won't load in iframe
**Solution**: Some sites (Google, Facebook, etc.) block iframe embedding via X-Frame-Options. Try a different URL.

### Issue: Window controls not working
**Solution**: Make sure interact.js CDN is loaded. Check browser console for errors.

### Issue: Terminal input not focusing
**Solution**: Click anywhere outside a window to refocus the terminal input.

## Advanced Usage

### Adding Custom Commands

Edit `terminal.js` and add a new case in the `executeCommand` method:

```javascript
case 'mycommand':
    if (arg) {
        this.printLine(`You said: ${arg}`, 'terminal-success');
    } else {
        this.printLine('Usage: mycommand <text>', 'terminal-error');
    }
    break;
```

### Capturing Window Events

Add event listeners in the `createWindow` method:

```javascript
iframe.addEventListener('load', () => {
    // Your custom logic here
    this.logToConsole(windowId, 'info', 'Custom event captured');
});
```

## Support

For issues or questions:
- Check the main README.md
- Review browser console for errors
- Ensure all files are in the `/command/` directory

Enjoy your new terminal interface! 🚀
