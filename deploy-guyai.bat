@echo off
REM GuyAI Ollama Proxy Deployment Script
REM Deploys the Ollama proxy function to Firebase (unblocked project)

echo ========================================
echo GuyAI Ollama Proxy Deployment
echo ========================================
echo.

REM Switch to unblocked project
echo Switching to guythatlives-unblocked project...
firebase use unblocked

REM Install dependencies if needed
echo.
echo Checking function dependencies...
cd functions
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)
cd ..

REM Deploy only the ollamaProxy function
echo.
echo Deploying ollamaProxy function...
firebase deploy --only functions:ollamaProxy

echo.
echo ========================================
echo Deployment complete!
echo ========================================
echo.
echo The GuyAI chatbot should now work properly at:
echo https://guythatlives.net/unblocked/guyai/
echo.
echo The Firebase Function URL is:
echo https://us-central1-guythatlives-unblocked.cloudfunctions.net/ollamaProxy
echo.
pause
