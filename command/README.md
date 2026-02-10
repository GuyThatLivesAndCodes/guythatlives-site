# Terminal Interface

A web-based terminal emulator with window management capabilities, built for the GuyThatLives Network.

## Features

- **Full Terminal UI**: Dark-themed, monospaced console interface with JetBrains Mono font
- **Command Parser**: JavaScript-based command listener with history and tab completion
- **Window Management**: Draggable, resizable windows using interact.js
- **Console Inspector**: Simulated browser console for each window
- **Hacker Aesthetic**: Green/white text on black background with terminal glow effects

## Available Commands

### `open <url>`
Opens a URL in a draggable window with an iframe.

**Examples:**
```bash
open https://example.com
open google.com
```

### `inspect <window-id>`
Toggles the console panel for a specific window.

**Example:**
```bash
inspect win-1
```

### `list`
Shows all currently open windows with their IDs and URLs.

### `close <window-id>`
Closes a specific window.

**Example:**
```bash
close win-1
```

### `focus <window-id>`
Brings a window to the front and makes it active.

**Example:**
```bash
focus win-1
```

### `clear`
Clears the terminal output history.

### `help`
Displays all available commands with usage examples.

### `about`
Shows information about the terminal interface.

## Keyboard Shortcuts

- **↑/↓ Arrow Keys**: Navigate command history
- **Tab**: Auto-complete commands
- **Enter**: Execute command

## Window Features

### Draggable Windows
- Click and drag the window header to move windows
- Windows can be positioned anywhere on the screen
- Cascade effect for multiple windows (automatic offset)

### Resizable Windows
- Drag from the bottom-right corner to resize
- Minimum size: 400x300 pixels
- Maintains aspect ratio and bounds

### Console Panel
- Toggle with `inspect <id>` command or yellow button
- Shows page load events and errors
- Timestamps for each log entry
- Attempts to capture iframe console.log (when CORS allows)
- Clear button to reset console output

### Window Controls
- **Yellow Button**: Toggle console inspector
- **Red Button**: Close window

## Technical Details

### Technologies Used
- **HTML5/CSS3**: Structure and styling
- **Vanilla JavaScript**: Core functionality
- **interact.js**: Drag and resize capabilities
- **JetBrains Mono**: Terminal font

### Security Considerations
- Many sites block iframing via `X-Frame-Options` header
- Cross-origin iframes cannot access console logs (CORS restriction)
- Console provides simulated interface with basic logging

### File Structure
```
/command/
├── index.html      # Main terminal interface
├── terminal.css    # Styling (hacker aesthetic)
├── terminal.js     # Command parser and window manager
└── README.md       # Documentation
```

## Styling

The interface uses a "hacker aesthetic" with:
- **Background**: Pure black (#0a0a0a)
- **Primary Text**: Terminal green (#00ff00)
- **Secondary Text**: White (#ffffff)
- **Accent**: Cyan (#64ffda)
- **Font**: JetBrains Mono (monospaced)
- **Effects**: Subtle glow on text and window borders

## Usage

1. Navigate to `/command/` in your browser
2. Type commands in the input field at the bottom
3. Use `help` to see all available commands
4. Open windows with `open <url>`
5. Drag windows by their header
6. Resize from bottom-right corner
7. Toggle console with inspect button or command

## Examples

### Open Multiple Windows
```bash
open https://github.com
open https://stackoverflow.com
open https://developer.mozilla.org
list
```

### Manage Windows
```bash
inspect win-1
focus win-2
close win-1
```

### Navigation
```bash
# Use ↑/↓ to recall previous commands
# Use Tab to auto-complete command names
```

## Known Limitations

1. **CORS Restrictions**: Cannot capture console logs from cross-origin iframes
2. **X-Frame-Options**: Some sites prevent iframe embedding
3. **Mobile Support**: Best experienced on desktop (responsive layout available)
4. **Console Simulation**: The console is a simulated environment, not a real devtools console

## Future Enhancements

- [ ] Save window layouts
- [ ] Themes (green/amber/blue terminal colors)
- [ ] More commands (screenshot, bookmark, etc.)
- [ ] Better cross-origin console capture
- [ ] Multi-monitor support
- [ ] Workspace management

## License

Part of the GuyThatLives Network project.
