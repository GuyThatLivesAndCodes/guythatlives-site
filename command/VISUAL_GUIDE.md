# Visual Guide - Terminal Interface

## 🎨 Interface Layout

### Main Terminal View
```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  Terminal Output Area (scrollable)                            ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ system@guythatlives:~$ Terminal Interface v1.0.0        │  ║
║  │ Type help for available commands                        │  ║
║  │                                                          │  ║
║  │ user@guythatlives:~$ open https://example.com          │  ║
║  │ Opening window win-1: https://example.com               │  ║
║  │                                                          │  ║
║  │ user@guythatlives:~$ list                               │  ║
║  │ ═════════════════════════════════════════════════════    │  ║
║  │   OPEN WINDOWS                                           │  ║
║  │ ═════════════════════════════════════════════════════    │  ║
║  │   win-1 - https://example.com                           │  ║
║  │ ═════════════════════════════════════════════════════    │  ║
║  │                                                          │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║  ─────────────────────────────────────────────────────────────║
║  user@guythatlives:~$ █                                       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

### Window with Console Inspector
```
╔══════════════════════════════════════════════════════════════════╗
║ 🌐 win-1 • example.com                           🟡 🔴          ║
╠══════════════════════════════════════════╦═══════════════════════╣
║                                          ║  CONSOLE      [Clear] ║
║                                          ║─────────────────────  ║
║                                          ║ [10:30:42] Page      ║
║           IFRAME CONTENT                 ║  loaded successfully ║
║           (Website renders here)         ║                      ║
║                                          ║ [10:30:45] Console   ║
║                                          ║  opened              ║
║                                          ║                      ║
║                                          ║                      ║
║                                          ║                      ║
║                                          ║                      ║
╚══════════════════════════════════════════╩═══════════════════════╝
                                          ↖️ (resize handle)
```

## 🎯 Visual Elements

### Color Palette
```
Background Colors:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  #0a0a0a     │  │  #1a1a1a     │  │  #151932     │
│  Primary BG  │  │  Secondary   │  │  Surface     │
└──────────────┘  └──────────────┘  └──────────────┘

Text Colors:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  #00ff00     │  │  #64ffda     │  │  #ffffff     │  │  #888888     │
│  Term Green  │  │  Accent Cyan │  │  White       │  │  Dim Text    │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘

Status Colors:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  #ff5555     │  │  #ffcc00     │  │  #00ff00     │
│  Error Red   │  │  Warning     │  │  Success     │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Typography
```
Font Family: JetBrains Mono (monospace)
Sizes:
  - Terminal Text: 14px
  - Window Title: 12px
  - Console: 11px
  - Console Timestamp: 10px

Weights:
  - Regular: 400
  - Medium: 500
  - Bold: 700
```

### Window Controls
```
Header Bar:
┌─────────────────────────────────────────────┐
│ 🌐 win-1 • example.com          🟡 🔴      │
└─────────────────────────────────────────────┘
    ↑            ↑                  ↑   ↑
  Icon      Window ID          Inspect Close
                               (Toggle (Close
                               Console) Window)
```

### Visual Effects
```
Text Glow:
  text-shadow: 0 0 5px rgba(0, 255, 0, 0.3);

Window Border (Active):
  border: 2px solid #64ffda;
  box-shadow: 0 0 30px rgba(100, 255, 218, 0.3);

Window Border (Inactive):
  border: 2px solid #00ff00;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
```

## 📐 Dimensions

### Terminal
- **Full Screen**: 100vh (viewport height)
- **Padding**: 20px around edges
- **Output Area**: Flexible height, scrollable
- **Input Line**: Fixed at bottom

### Windows
- **Minimum Size**: 400px × 300px
- **Default Start Position**: 100px from top-left
- **Cascade Offset**: 30px per window
- **Console Width**: 300px (when active)
- **Header Height**: ~40px
- **Border Thickness**: 2px

### Spacing
```
Component Spacing:
├─ Terminal Lines: 5px margin-bottom
├─ Command Groups: 0.8rem vertical margin
├─ Window Header: 10px × 15px padding
├─ Console Output: 10px padding
└─ Console Lines: 8px margin-bottom
```

## 🖱️ Interactive States

### Terminal Input
```
Default:
user@guythatlives:~$ █
↑                     ↑
Green with glow    Blinking cursor

Typing:
user@guythatlives:~$ open https://ex█
                                    ↑
                              Caret color: green
```

### Window States
```
Inactive Window:
╔══════════════════════════╗
║ 🌐 win-1 • url    🟡 🔴 ║  ← Green border
╠══════════════════════════╣
║                          ║
║      Content...          ║
║                          ║
╚══════════════════════════╝

Active Window:
╔══════════════════════════╗
║ 🌐 win-1 • url    🟡 🔴 ║  ← Cyan border (brighter)
╠══════════════════════════╣
║                          ║
║      Content...          ║
║                          ║
╚══════════════════════════╝
```

### Button Hover States
```
Console Button (Yellow):
  Normal: 🟡
  Hover:  🟡 (70% opacity)

Close Button (Red):
  Normal: 🔴
  Hover:  🔴 (70% opacity)

Console Clear:
  Normal: [Clear] (border: green, bg: transparent)
  Hover:  [Clear] (bg: green, text: black)
```

## 📱 Responsive Breakpoints

### Desktop (> 768px)
```
┌──────────────────────────────────────────┐
│                                          │
│  Full terminal with floating windows     │
│  Console panel: 300px sidebar            │
│  Windows: Side-by-side layout           │
│                                          │
└──────────────────────────────────────────┘
```

### Mobile (≤ 768px)
```
┌────────────────┐
│                │
│  Terminal      │
│  Padding: 10px │
│                │
│  Windows:      │
│  Min: 300x200  │
│                │
│  Console:      │
│  Full width    │
│  Below iframe  │
│  Max: 200px    │
│                │
└────────────────┘
```

## 🎬 Animations

### Loading Spinner
```
  ⟳  Rotating circle
  ↓
Speed: 1s per rotation
Border: 2px, top color changes
```

### Window Transitions
- **Drag**: Smooth translate transform
- **Resize**: Instant dimension update
- **Focus**: Border color change (0.3s)
- **Hover**: Button opacity (0.2s)

### Terminal Effects
```
Cursor Blink:
  0-50%:  █ (visible)
  51-100%: _ (invisible)
  Speed: 1s per cycle

Glow Pulse:
  0%:   Small glow
  50%:  Large glow
  100%: Small glow
  Speed: 2s per cycle
```

## 🖼️ Example Layouts

### Single Window Centered
```
        ╔════════════════════╗
        ║ 🌐 win-1    🟡 🔴 ║
        ╠════════════════════╣
        ║                    ║
        ║   Example.com      ║
        ║                    ║
        ╚════════════════════╝
```

### Multiple Windows Cascaded
```
╔══════════════╗
║ win-1  🟡 🔴 ║
╠══════════════╣  ╔══════════════╗
║              ║  ║ win-2  🟡 🔴 ║
║   GitHub     ║  ╠══════════════╣  ╔══════════════╗
║              ║  ║              ║  ║ win-3  🟡 🔴 ║
╚══════════════╝  ║  Stack...    ║  ╠══════════════╣
                  ║              ║  ║              ║
                  ╚══════════════╝  ║   MDN...     ║
                                    ║              ║
                                    ╚══════════════╝
```

### Window with Console
```
╔═══════════════════════════════════════════╗
║ 🌐 win-1 • developer.mozilla.org  🟡 🔴  ║
╠════════════════════════╦══════════════════╣
║                        ║ CONSOLE  [Clear] ║
║                        ║──────────────────║
║    MDN Web Docs        ║ [10:30:45]      ║
║                        ║ Page loaded     ║
║    Documentation       ║                 ║
║    for Web APIs        ║ [10:30:46]      ║
║                        ║ Console opened  ║
║    [Search...]         ║                 ║
║                        ║ [10:31:12]      ║
║                        ║ User action...  ║
╚════════════════════════╩══════════════════╝
```

## 🎨 Theme Variations

The interface supports easy theme customization by changing CSS variables:

### Default (Matrix Green)
- Primary: `#00ff00` (bright green)
- Background: `#0a0a0a` (pure black)

### Amber Terminal
- Primary: `#ffb000` (amber)
- Background: `#1a1100` (dark amber tint)

### Cyan Hacker
- Primary: `#00bfff` (deep sky blue)
- Background: `#001a1a` (dark cyan tint)

### Retro IBM
- Primary: `#00aa00` (classic green)
- Background: `#000000` (pure black)

---

**Visual Design Philosophy**:
Clean, functional, authentic terminal aesthetic with modern interactive capabilities. The interface prioritizes readability, clear visual hierarchy, and smooth interactions while maintaining a hacker/developer aesthetic.
