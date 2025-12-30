# 🖥️ Remote PC Control

Control your home PC directly from your browser at `guythatlives.net/homepc`. Features full mouse and keyboard control with pointer lock for seamless remote desktop experience.

## ✨ Features

- **Computer Discovery**: Automatically find and select from multiple PCs
- **Full Mouse Control**: Direct mouse movements with pointer lock API
- **Keyboard Input**: Complete keyboard support including modifiers and special keys
- **Real-time Streaming**: Low-latency screen streaming via WebSocket
- **Password Authentication**: Secure access with password protection per computer
- **Fullscreen Mode**: Immersive remote desktop experience
- **Connection Status**: Live FPS counter and connection monitoring
- **Ignore List**: Temporarily hide computers you don't want to connect to

## 🚀 Quick Start

### Option A: With Discovery Server (Recommended - Multiple PCs)

This setup allows you to see all available computers in a nice UI and select which one to connect to.

#### 1. Start Discovery Server (Run once, anywhere)

The discovery server acts as a registry for all your PCs.

```bash
cd homepc/server
npm install
npm run discovery
```

The discovery server will start on port 8081. Keep this running.

#### 2. Start PC Server on Each Computer

On each PC you want to control:

```bash
cd homepc/server
npm install
cp .env.example .env
# Edit .env - set password and computer name
```

Edit your `.env` file:

```env
PORT=8080
PASSWORD=your-secure-password-here
COMPUTER_NAME=My Gaming PC
ENABLE_DISCOVERY=true
DISCOVERY_SERVER=http://localhost:8081
SCREEN_FPS=30
SCREEN_QUALITY=60
```

Start the server:

```bash
npm start
```

#### 3. Access from Browser

1. Go to `guythatlives.net/homepc`
2. You'll see a list of all available computers
3. Click "Connect" on the computer you want to control
4. Enter the password for that computer
5. Enjoy remote control!

You can click "Ignore" to hide computers temporarily (until page reload).

### Option B: Direct Connection (Single PC, No Discovery)

If you only have one PC or don't want to use the discovery server:

#### 1. Server Setup (Run on your PC)

```bash
cd homepc/server
npm install
cp .env.example .env
```

Edit `.env` and set `ENABLE_DISCOVERY=false`:

```env
PORT=8080
PASSWORD=your-secure-password-here
COMPUTER_NAME=My PC
ENABLE_DISCOVERY=false
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

#### 2. Access from Browser

1. Go to `guythatlives.net/homepc`
2. You'll see "No computers available" (since discovery is disabled)
3. Click the ⚙️ settings button and change the discovery URL to a fake address
4. Manually add your server by connecting directly (future feature)

**Note**: Without discovery, you'll need to manually manage connections. Discovery mode is recommended!

## 🎮 Using the Remote Desktop

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
| `COMPUTER_NAME` | Display name for this PC | hostname |
| `ENABLE_DISCOVERY` | Register with discovery server | `true` |
| `DISCOVERY_SERVER` | Discovery server URL | `http://localhost:8081` |
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

### No computers showing in list

1. **Check discovery server**: Make sure it's running (`npm run discovery`)
2. **Check PC server**: Should see "Registered with discovery server" message
3. **Check discovery URL**: Click ⚙️ in browser and verify the URL
4. **Check network**: Discovery server and PC should be accessible from browser
5. **Try refresh**: Click the 🔄 Refresh button

### Connection fails

1. **Check firewall**: Allow ports 8080 (PC server) and 8081 (discovery server)
2. **Check server is running**: Should see "Server listening" message
3. **Check password**: Make sure it matches the `.env` file for that PC
4. **Check network**: Make sure browser can reach the WebSocket address shown

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
