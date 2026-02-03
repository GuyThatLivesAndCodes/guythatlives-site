@echo off
REM GuyAI Deployment Script
REM Note: GuyAI now uses Cloudflare AI Gateway instead of Firebase Functions

echo ========================================
echo GuyAI Deployment Information
echo ========================================
echo.
echo GuyAI has been updated to use Cloudflare AI Gateway!
echo.
echo New Architecture:
echo   - Client-side end-to-end encryption
echo   - Cloudflare AI Gateway for API routing
echo   - Direct integration with Claude Haiku 4
echo   - No server-side proxy needed
echo.
echo ========================================
echo Setup Instructions
echo ========================================
echo.
echo 1. Get your Cloudflare credentials:
echo    - Account ID: dash.cloudflare.com (see sidebar)
echo    - API Token: Create in My Profile - API Tokens
echo    - Gateway ID: unblocked-claude-gateway
echo.
echo 2. Configure Anthropic API in Cloudflare Gateway:
echo    - Go to AI Gateway in Cloudflare Dashboard
echo    - Add your Anthropic API key
echo    - Enable Claude Haiku 4 model
echo.
echo 3. Configure GuyAI in browser:
echo    - Visit https://guythatlives.net/unblocked/guyai/
echo    - Click the settings icon
echo    - Enter your Cloudflare credentials
echo.
echo See /unblocked/guyai/README.md for detailed instructions
echo.
echo ========================================
echo Deploying Static Files Only
echo ========================================
echo.

REM Switch to unblocked project
echo Switching to guythatlives-unblocked project...
firebase use unblocked

REM Deploy hosting only (no functions needed)
echo.
echo Deploying GuyAI files to Firebase Hosting...
firebase deploy --only hosting

echo.
echo ========================================
echo Deployment complete!
echo ========================================
echo.
echo GuyAI is now available at:
echo https://guythatlives.net/unblocked/guyai/
echo.
echo Remember to configure your Cloudflare credentials!
echo See README.md for setup instructions.
echo.
pause
