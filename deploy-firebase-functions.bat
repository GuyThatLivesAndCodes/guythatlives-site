@echo off
REM Firebase Functions Deployment Script for Windows
REM This script will deploy the Claude API function to Firebase

echo ========================================
echo Firebase Functions Deployment (Windows)
echo ========================================
echo.

REM Check if Firebase CLI is installed
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Firebase CLI not found. Installing...
    npm install -g firebase-tools
)

REM Login to Firebase
echo Logging in to Firebase...
firebase login

REM Set the Claude API key
echo.
echo Setting up Claude API key...
set /p API_KEY="Enter your Claude API key (or press Enter to skip): "

if not "%API_KEY%"=="" (
    firebase functions:config:set claude.api_key="%API_KEY%"
    echo API key configured!
) else (
    echo Skipping API key configuration - using existing configuration
)

REM Install dependencies
echo.
echo Installing function dependencies...
cd functions
call npm install
cd ..

REM Deploy functions
echo.
echo Deploying functions to Firebase...
firebase deploy --only functions

echo.
echo ========================================
echo Deployment complete!
echo ========================================
echo.
echo Your Claude API function is now live.
echo The website will now use the secure Firebase Function for AI analysis.
echo You can delete the config.local.js file as it's no longer needed.
echo.
pause
