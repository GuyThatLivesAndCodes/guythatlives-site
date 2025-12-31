@echo off
setlocal enabledelayedexpansion
REM Remote PC Control Server - Easy Installer
REM Downloads and sets up the server automatically

echo ================================================
echo   Remote PC Control Server - Easy Setup
echo ================================================
echo.

REM Check if running in System32 - if so, switch to user directory
if /i "%cd%"=="%SystemRoot%\System32" (
    echo WARNING: Running from System32 directory!
    echo Switching to your Documents folder...
    cd /d "%USERPROFILE%\Documents"
    echo Now in: %cd%
    echo.
)

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo Download the LTS version and run the installer.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found:
node --version
echo.

REM Create server directory
echo Creating server directory...
if not exist "remote-pc-server" mkdir remote-pc-server
cd remote-pc-server

echo.
echo Downloading server files...
echo.

REM Download files from GitHub raw URLs
set BASE_URL=https://raw.githubusercontent.com/GuyThatLivesAndCodes/guythatlives-site/claude/remote-pc-web-control-YblmU/homepc/server

echo [1/5] Downloading server.js...
powershell -Command "Invoke-WebRequest -Uri '%BASE_URL%/server.js' -OutFile 'server.js'"

echo [2/5] Downloading discovery-server.js...
powershell -Command "Invoke-WebRequest -Uri '%BASE_URL%/discovery-server.js' -OutFile 'discovery-server.js'"

echo [3/5] Downloading package.json...
powershell -Command "Invoke-WebRequest -Uri '%BASE_URL%/package.json' -OutFile 'package.json'"

echo [4/5] Downloading .env.example...
powershell -Command "Invoke-WebRequest -Uri '%BASE_URL%/.env.example' -OutFile '.env.example'"

echo [5/5] Downloading .gitignore...
powershell -Command "Invoke-WebRequest -Uri '%BASE_URL%/.gitignore' -OutFile '.gitignore'"

echo.
echo Files downloaded successfully!
echo.

REM Install dependencies
echo Installing dependencies (this may take a few minutes)...
echo.
call npm install

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies.
    echo.
    echo If you see an error about 'robotjs', you may need to install build tools:
    echo   npm install -g windows-build-tools
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo   Installation Complete!
echo ================================================
echo.

REM Interactive Configuration
echo ================================================
echo   Configuration Setup
echo ================================================
echo.

REM Password Setup
:PASSWORD_SETUP
echo [STEP 1/4] Password Configuration
echo.
echo Enter a password for remote access
echo (or type "generate" to auto-generate a secure password)
echo.
set /p USER_PASSWORD="Password: "

if /i "%USER_PASSWORD%"=="generate" (
    REM Generate random password
    set "CHARS=ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    set "PASSWORD="
    for /L %%i in (1,1,16) do (
        set /a "rand=!random! %% 56"
        for %%j in (!rand!) do set "PASSWORD=!PASSWORD!!CHARS:~%%j,1!"
    )
    echo.
    echo Generated Password: !PASSWORD!
    echo.
    echo IMPORTANT: Copy this password now! You'll need it to connect.
    echo.
    pause
) else if "%USER_PASSWORD%"=="" (
    echo ERROR: Password cannot be empty!
    echo.
    goto PASSWORD_SETUP
) else (
    set "PASSWORD=%USER_PASSWORD%"
)

echo.
echo [STEP 2/4] Computer Name
echo.
echo Enter a friendly name for this PC (default: %COMPUTERNAME%)
set /p COMPUTER_NAME="Computer Name: "
if "%COMPUTER_NAME%"=="" set "COMPUTER_NAME=%COMPUTERNAME%"

echo.
echo [STEP 3/4] Screen Capture Settings
echo.
echo Screen FPS (frames per second, default: 30)
echo   Lower (20-25) = Better for slow connections
echo   Higher (30-60) = Smoother, needs fast connection
set /p SCREEN_FPS="Screen FPS: "
if "%SCREEN_FPS%"=="" set "SCREEN_FPS=30"

echo.
echo Screen Quality (1-100, default: 60)
echo   Lower (40-50) = Lower bandwidth, slightly blurry
echo   Higher (70-80) = Better quality, more bandwidth
set /p SCREEN_QUALITY="Screen Quality: "
if "%SCREEN_QUALITY%"=="" set "SCREEN_QUALITY=60"

echo.
echo [STEP 4/4] Writing configuration...

REM Create .env file
(
echo # Server Configuration
echo PORT=8080
echo PASSWORD=%PASSWORD%
echo COMPUTER_NAME=%COMPUTER_NAME%
echo.
echo # Discovery Server
echo DISCOVERY_SERVER=http://localhost:8081
echo ENABLE_DISCOVERY=true
echo.
echo # Remote Access
echo PUBLIC_URL=
echo.
echo # Screen capture settings
echo SCREEN_FPS=%SCREEN_FPS%
echo SCREEN_QUALITY=%SCREEN_QUALITY%
echo.
echo # Security
echo ALLOWED_ORIGINS=http://localhost:3000,https://guythatlives.net
) > .env

echo.
echo ✓ Configuration saved!
echo.

echo ================================================
echo   Configuration Summary
echo ================================================
echo.
echo Computer Name: %COMPUTER_NAME%
echo Password: %PASSWORD%
echo Screen FPS: %SCREEN_FPS%
echo Screen Quality: %SCREEN_QUALITY%
echo.
echo Configuration file: %cd%\.env
echo.

echo ================================================
echo   Start Servers
echo ================================================
echo.

set /p START_NOW="Would you like to start the servers now? (Y/N): "
if /i "!START_NOW!"=="Y" (
    echo.
    echo Downloading frontend files...
    call download-frontend.bat

    echo.
    echo Starting servers...
    echo.

    REM Start discovery server in new window
    echo [1/2] Starting Discovery Server...
    start "Discovery Server" cmd /k "cd /d "!cd!" && npm run discovery"
    timeout /t 2 /nobreak >nul

    echo [2/2] Starting PC Server...
    start "PC Server" cmd /k "cd /d "!cd!" && npm start"
    timeout /t 2 /nobreak >nul

    echo.
    echo ================================================
    echo   All Servers Started!
    echo ================================================
    echo.
    echo Two windows have opened:
    echo   - Discovery Server (port 8081)
    echo   - PC Server (port 8080)
    echo.
    echo To connect:
    echo.
    echo LOCAL ACCESS:
    echo   1. Open: http://localhost:8080
    echo   2. Password: !PASSWORD!
    echo.
    echo REMOTE ACCESS (from another device on your network):
    echo   1. Find your IP with: ipconfig
    echo   2. Open: http://YOUR_IP:8080
    echo   3. Password: !PASSWORD!
    echo.
    echo REMOTE ACCESS (from outside your network):
    echo   1. Port forward 8080 and 8081 on your router
    echo   2. Find your public IP: https://whatismyip.com
    echo   3. Open: http://YOUR_PUBLIC_IP:8080
    echo   4. Password: !PASSWORD!
    echo.
    echo Keep both windows open while using remote control!
    echo.
) else (
    echo.
    echo ================================================
    echo   Manual Start Instructions
    echo ================================================
    echo.
    echo To start servers later:
    echo.
    echo 1. Download frontend files:
    echo    download-frontend.bat
    echo.
    echo 2. Start Discovery Server (in one window):
    echo    npm run discovery
    echo.
    echo 3. Start PC Server (in another window):
    echo    npm start
    echo.
    echo 4. Access at: http://localhost:8080
    echo    Password: !PASSWORD!
    echo.
)

echo Installation and setup complete!
echo.
pause
