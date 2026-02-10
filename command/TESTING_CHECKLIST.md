# Testing Checklist - Terminal Interface

Use this checklist to verify all features work correctly.

## 🚀 Initial Setup

- [ ] Open `/command/index.html` in a web browser
- [ ] Verify terminal loads with correct styling (black background, green text)
- [ ] Verify JetBrains Mono font loads correctly
- [ ] Verify welcome message displays
- [ ] Verify input field is focused and accepts typing

## ⌨️ Command Testing

### Basic Commands

#### `help` Command
- [ ] Type `help` and press Enter
- [ ] Verify all commands are listed
- [ ] Verify formatting is correct with borders
- [ ] Verify examples are shown

#### `clear` Command
- [ ] Type several commands to populate history
- [ ] Type `clear` and press Enter
- [ ] Verify all previous output is cleared
- [ ] Verify only "Terminal cleared" message remains

#### `about` Command
- [ ] Type `about` and press Enter
- [ ] Verify version number displays (v1.0.0)
- [ ] Verify features list appears

### Window Management Commands

#### `open` Command
- [ ] Type `open https://example.com` and press Enter
- [ ] Verify window appears with ID "win-1"
- [ ] Verify success message in terminal
- [ ] Verify loading spinner shows initially
- [ ] Verify iframe loads after spinner disappears
- [ ] Test without https: `open google.com`
- [ ] Verify URL is auto-corrected to https://
- [ ] Test invalid URL: `open not-a-valid-url`
- [ ] Verify error message displays

#### `list` Command
- [ ] Open 2-3 windows
- [ ] Type `list` and press Enter
- [ ] Verify all windows are shown with IDs
- [ ] Verify URLs are displayed
- [ ] Test with no windows open
- [ ] Verify "No windows open" message

#### `inspect` Command
- [ ] Open a window: `open https://example.com`
- [ ] Type `inspect win-1` and press Enter
- [ ] Verify console panel appears on right side
- [ ] Verify "Console enabled" message in terminal
- [ ] Type `inspect win-1` again
- [ ] Verify console panel closes
- [ ] Test with invalid ID: `inspect win-999`
- [ ] Verify error message

#### `focus` Command
- [ ] Open multiple windows
- [ ] Click on background window to verify it's not focused
- [ ] Type `focus <window-id>` and press Enter
- [ ] Verify window comes to front
- [ ] Verify border changes to cyan/active color
- [ ] Test with invalid ID: `focus win-999`
- [ ] Verify error message

#### `close` Command
- [ ] Open a window
- [ ] Type `close win-1` and press Enter
- [ ] Verify window disappears
- [ ] Verify success message in terminal
- [ ] Test with invalid ID: `close win-999`
- [ ] Verify error message

## 🖱️ Window Interaction Testing

### Dragging
- [ ] Open a window
- [ ] Click and hold window header
- [ ] Drag window to different position
- [ ] Verify window moves smoothly
- [ ] Try dragging by iframe area
- [ ] Verify window does NOT move (only header works)
- [ ] Drag window near edges
- [ ] Verify window stays within viewport bounds

### Resizing
- [ ] Open a window
- [ ] Hover over bottom-right corner
- [ ] Verify cursor changes to resize cursor
- [ ] Click and drag to resize
- [ ] Verify window resizes smoothly
- [ ] Try to make window very small
- [ ] Verify minimum size is enforced (400×300)
- [ ] Resize with console panel open
- [ ] Verify both panels resize correctly

### Window Focus
- [ ] Open 3 windows
- [ ] Click on each window
- [ ] Verify clicked window comes to front
- [ ] Verify border color changes to cyan when active
- [ ] Verify other windows have green border

### Window Controls

#### Yellow Button (Inspect)
- [ ] Click yellow button on window header
- [ ] Verify console panel opens
- [ ] Click yellow button again
- [ ] Verify console panel closes

#### Red Button (Close)
- [ ] Click red button on window header
- [ ] Verify window closes immediately
- [ ] Verify no error in browser console

### Console Panel
- [ ] Open window with console enabled
- [ ] Verify "Console" header shows
- [ ] Verify "Clear" button is present
- [ ] Verify page load message appears with timestamp
- [ ] Click "Clear" button
- [ ] Verify console output clears
- [ ] Verify new "Console cleared" message appears
- [ ] Scroll through console output
- [ ] Verify scrollbar appears and works

## ⌨️ Keyboard Features

### Command History
- [ ] Type `help` and press Enter
- [ ] Type `list` and press Enter
- [ ] Type `clear` and press Enter
- [ ] Press ↑ (up arrow) key
- [ ] Verify "clear" appears in input
- [ ] Press ↑ again
- [ ] Verify "list" appears in input
- [ ] Press ↑ again
- [ ] Verify "help" appears in input
- [ ] Press ↓ (down arrow) key
- [ ] Verify navigation goes forward through history
- [ ] Press ↓ until at end
- [ ] Verify input becomes empty

### Tab Completion
- [ ] Type `op` and press Tab
- [ ] Verify completes to `open `
- [ ] Clear input, type `cl` and press Tab
- [ ] Verify completes to `clear `
- [ ] Type `h` and press Tab
- [ ] Verify shows "Available: help" (partial match)

### Enter Key
- [ ] Type a command and press Enter
- [ ] Verify command executes
- [ ] Verify input clears automatically

## 🌐 URL Testing

### Valid URLs
- [ ] Test HTTPS: `open https://example.com`
- [ ] Test HTTP: `open http://example.com`
- [ ] Test without protocol: `open example.com`
- [ ] Test subdomain: `open subdomain.example.com`
- [ ] Test with path: `open example.com/page`
- [ ] Test with query: `open example.com?q=test`

### Restricted URLs (Should show in iframe but may be blocked)
- [ ] Test Google: `open google.com`
- [ ] Verify X-Frame-Options blocks it (expected)
- [ ] Test GitHub: `open github.com`
- [ ] Test Wikipedia: `open wikipedia.org` (should work)

## 🎨 Visual Testing

### Colors
- [ ] Verify background is pure black
- [ ] Verify terminal text is green
- [ ] Verify prompt is cyan
- [ ] Verify error messages are red
- [ ] Verify success messages are green
- [ ] Verify window borders glow on focus

### Fonts
- [ ] Verify all text uses monospace font
- [ ] Verify JetBrains Mono loads (check Network tab)
- [ ] Verify text is readable at all sizes

### Effects
- [ ] Verify text has subtle glow effect
- [ ] Verify window borders have glow effect
- [ ] Verify active window border is brighter
- [ ] Verify loading spinner rotates smoothly

### Scrollbars
- [ ] Populate terminal with many commands
- [ ] Verify terminal output scrollbar appears
- [ ] Verify scrollbar matches theme (green)
- [ ] Open window and enable console
- [ ] Add many console logs
- [ ] Verify console scrollbar appears and matches theme

## 📱 Responsive Testing

### Desktop (> 768px)
- [ ] Test on large monitor (1920×1080+)
- [ ] Verify layout looks correct
- [ ] Verify windows can be positioned anywhere
- [ ] Verify console panel is sidebar

### Tablet (768px)
- [ ] Resize browser to 768px width
- [ ] Verify terminal still works
- [ ] Verify windows adjust size
- [ ] Verify console becomes bottom panel

### Mobile (< 768px)
- [ ] Test on mobile device or resize browser
- [ ] Verify terminal works (may be limited)
- [ ] Verify windows minimum size respected
- [ ] Verify console layout changes to vertical

## 🐛 Edge Cases

### Empty Input
- [ ] Press Enter with empty input
- [ ] Verify nothing happens (no error)

### Unknown Command
- [ ] Type `asdfgh` and press Enter
- [ ] Verify "Command not found" error
- [ ] Verify help hint appears

### Missing Arguments
- [ ] Type `open` (no URL) and press Enter
- [ ] Verify error message with usage example
- [ ] Type `inspect` (no ID) and press Enter
- [ ] Verify error message
- [ ] Type `close` (no ID) and press Enter
- [ ] Verify error message

### Multiple Windows
- [ ] Open 10+ windows
- [ ] Verify cascade positioning works
- [ ] Verify all windows are accessible
- [ ] Close all windows one by one
- [ ] Verify no errors

### Rapid Commands
- [ ] Type and execute commands rapidly
- [ ] Verify all commands execute
- [ ] Verify no race conditions

### Long URLs
- [ ] Open window with very long URL
- [ ] Verify URL is truncated in title
- [ ] Verify full URL shown in list command

## 🔍 Console Logging

### Page Load Events
- [ ] Open a window
- [ ] Enable console
- [ ] Verify "Page loaded successfully" message
- [ ] Verify timestamp is correct

### Cross-Origin Detection
- [ ] Open cross-origin site (google.com)
- [ ] Enable console
- [ ] Verify CORS warning message appears

### Console Clear
- [ ] Add multiple console messages
- [ ] Click "Clear" button
- [ ] Verify all messages removed
- [ ] Verify "Console cleared" message appears

## 🧹 Cleanup Testing

### Window Closure
- [ ] Open multiple windows
- [ ] Close via red button
- [ ] Close via close command
- [ ] Verify windows are removed from DOM
- [ ] Verify no memory leaks (check Task Manager)

### Terminal Clear
- [ ] Generate lots of terminal output
- [ ] Run `clear` command
- [ ] Verify DOM nodes are removed
- [ ] Check browser memory usage

## ✅ Browser Compatibility

### Chrome/Edge
- [ ] Test on Chrome or Edge
- [ ] Verify all features work
- [ ] Check console for errors

### Firefox
- [ ] Test on Firefox
- [ ] Verify all features work
- [ ] Check console for errors

### Safari (if available)
- [ ] Test on Safari
- [ ] Verify all features work
- [ ] Check console for errors

## 📊 Performance Testing

### Multiple Windows
- [ ] Open 5 windows simultaneously
- [ ] Verify performance is acceptable
- [ ] Drag windows around
- [ ] Verify smooth animation

### Large Console Output
- [ ] Generate 100+ console messages
- [ ] Verify scrolling is smooth
- [ ] Verify no lag in terminal input

### Long Session
- [ ] Use terminal for 5+ minutes
- [ ] Execute many commands
- [ ] Open/close many windows
- [ ] Verify no performance degradation

## 🎯 Final Verification

- [ ] All core features working
- [ ] No console errors
- [ ] Styling matches hacker aesthetic
- [ ] All documentation files present
- [ ] Demo page works correctly
- [ ] README is accurate
- [ ] No broken links
- [ ] Code is clean and commented

---

## 📝 Test Results Template

```
Date: ___________
Browser: ___________
Version: ___________
OS: ___________

Tests Passed: _____ / _____
Tests Failed: _____ / _____

Issues Found:
1.
2.
3.

Notes:


Tester Signature: ___________
```

## 🔧 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Interact.js not loading | Check CDN connection |
| Font not displaying | Check Google Fonts CDN |
| Windows won't drag | Check interact.js loaded |
| Console not working | Check browser console for errors |
| Styles not applying | Clear browser cache |
| Windows outside viewport | Refresh page |

---

**Testing Complete**: Once all checkboxes are marked, the terminal interface is fully verified and ready for production use! ✅
