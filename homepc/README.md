# 🖥️ Remote PC Control

Control your home PC directly from your browser at `guythatlives.net/homepc`. Features full mouse and keyboard control with pointer lock for seamless remote desktop experience.

## ✨ Features

- **Full Mouse Control**: Direct mouse movements with pointer lock API
- **Keyboard Input**: Complete keyboard support including modifiers and special keys
- **Real-time Streaming**: Low-latency screen streaming via WebSocket
- **Password Authentication**: Secure access with password protection
- **Fullscreen Mode**: Immersive remote desktop experience
- **Connection Status**: Live FPS counter and connection monitoring

## 🚀 Quick Start

### 1. Server Setup (Run on your PC)

Navigate to the server directory:

```bash
cd homepc/server
```

Install dependencies:

```bash
npm install
```

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and set your password:

```env
PORT=8080
PASSWORD=your-secure-password-here
SCREEN_FPS=30
SCREEN_QUALITY=60
```

Start the server:

```bash
npm start
```

The server will display connection information:

```
═══════════════════════════════════════════════
🖥️  Remote PC Control Server
═══════════════════════════════════════════════
Port: 8080
Screen FPS: 30
Screen Quality: 60%
═══════════════════════════════════════════════

✅ Server listening on:
   Local:    ws://localhost:8080
   Network:  ws://[your-ip]:8080
```

### 2. Access from Browser

1. Go to `guythatlives.net/homepc`
2. Enter your password (set in `.env`)
3. Enter server address:
   - Local: `ws://localhost:8080`
   - Remote: `ws://YOUR_PC_IP:8080` (find your IP with `ipconfig` or `ifconfig`)
4. Click "Connect to PC"

### 3. Using the Remote Desktop

Once connected:

- **Click the canvas** to lock your mouse
- **Move mouse** to control your PC
- **Type normally** - all keyboard input is forwarded
- **Press ESC** to unlock mouse and show controls
- **Click "Fullscreen"** for immersive experience

## 🔧 Configuration

### Server Settings (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | WebSocket server port | `8080` |
| `PASSWORD` | Authentication password | `changeme` |
| `SCREEN_FPS` | Screen capture framerate | `30` |
| `SCREEN_QUALITY` | JPEG quality (1-100) | `60` |

### Performance Tuning

For better performance:
- **Lower FPS** (20-25): Better for slower connections
- **Higher FPS** (30-60): Better for local network/fast internet
- **Lower Quality** (40-50): Reduces bandwidth, slightly blurry
- **Higher Quality** (70-80): Better image, more bandwidth

## 🌐 Remote Access

To access your PC from outside your home network:

### Option 1: Port Forwarding

1. Forward port 8080 on your router to your PC's local IP
2. Find your public IP at [whatismyip.com](https://www.whatismyip.com)
3. Connect using `ws://YOUR_PUBLIC_IP:8080`

⚠️ **Security Warning**: Only use with a strong password

### Option 2: Tunneling (Recommended)

Use a service like ngrok for secure tunneling:

```bash
# Install ngrok
npm install -g ngrok

# Create tunnel
ngrok http 8080
```

Use the provided `https://` URL in the browser connection.

## 🛠️ Troubleshooting

### Server won't start

**Issue**: `Error: Cannot find module 'robotjs'`

**Solution**: RobotJS requires build tools:

- **Windows**: Install [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools)
  ```bash
  npm install -g windows-build-tools
  ```

- **macOS**: Install Xcode Command Line Tools
  ```bash
  xcode-select --install
  ```

- **Linux**: Install dependencies
  ```bash
  sudo apt-get install libxtst-dev libpng++-dev
  ```

### Connection fails

1. **Check firewall**: Allow port 8080
2. **Check server is running**: Should see "Server listening" message
3. **Try localhost first**: Use `ws://localhost:8080`
4. **Check password**: Make sure it matches `.env` file

### Mouse movements are jerky

- Increase `SCREEN_FPS` in `.env`
- Reduce `SCREEN_QUALITY` for lower bandwidth
- Check network connection quality

### Keyboard not working

- Make sure mouse is locked (click canvas)
- Check console for errors
- Some key combinations may be caught by browser (Ctrl+W, Alt+F4, etc.)

## 📦 Dependencies

### Frontend
- Native browser APIs (Pointer Lock, WebSocket, Canvas)

### Backend (Node.js)
- `ws` - WebSocket server
- `screenshot-desktop` - Screen capture
- `robotjs` - Mouse/keyboard control
- `dotenv` - Environment configuration

## 🔒 Security Notes

1. **Use strong passwords**: Never use default password
2. **Local network only**: Safest for home network use
3. **HTTPS/WSS**: Consider SSL for production
4. **Firewall rules**: Limit access to trusted IPs
5. **VPN recommended**: Use VPN instead of port forwarding

## 📝 Known Limitations

- **One client at a time**: Only one browser can control at once
- **No clipboard sync**: Copy/paste not supported (yet)
- **No file transfer**: Screen viewing and control only
- **Platform specific**: Server must run on desktop OS (Windows/Mac/Linux)

## 🎯 Future Enhancements

- [ ] WebRTC for peer-to-peer connection
- [ ] Clipboard synchronization
- [ ] File transfer support
- [ ] Multi-monitor support
- [ ] Session recording
- [ ] Mobile app support

## 📄 License

MIT License - Free to use and modify

## 🐛 Issues

Report issues at: [GitHub Issues](https://github.com/GuyThatLivesAndCodes/guythatlives-site/issues)
