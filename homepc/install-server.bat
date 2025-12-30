@echo off
REM Remote PC Control Server - Easy Installer
REM Downloads and sets up the server automatically

echo ================================================
echo   Remote PC Control Server - Easy Setup
echo ================================================
echo.

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

REM Create .env if it doesn't exist
if not exist ".env" (
    echo Creating configuration file...
    copy .env.example .env >nul
    echo.
    echo IMPORTANT: You need to edit the .env file!
    echo.
    echo Please set:
    echo   - PASSWORD: Your secure password
    echo   - COMPUTER_NAME: A friendly name for this PC
    echo.
    echo The .env file is located at:
    echo   %cd%\.env
    echo.

    set /p OPEN_ENV="Would you like to open .env now? (Y/N): "
    if /i "%OPEN_ENV%"=="Y" (
        notepad .env
    )
) else (
    echo Configuration file (.env) already exists.
)

echo.
echo ================================================
echo   Quick Start Guide
echo ================================================
echo.
echo 1. Edit .env file and set your PASSWORD and COMPUTER_NAME
echo.
echo 2. Start the discovery server (in a separate window):
echo    npm run discovery
echo.
echo 3. Start this PC's server:
echo    npm start
echo.
echo 4. Go to https://guythatlives.net/homepc in your browser
echo.
echo Full documentation:
echo https://github.com/GuyThatLivesAndCodes/guythatlives-site/tree/claude/remote-pc-web-control-YblmU/homepc
echo.
echo ================================================
echo.

set /p START_NOW="Would you like to start the server now? (Y/N): "
if /i "%START_NOW%"=="Y" (
    echo.
    echo Starting server...
    echo Press Ctrl+C to stop the server
    echo.
    npm start
)

echo.
echo Installation script finished!
echo You can run 'npm start' anytime to start the server.
echo.
pause
