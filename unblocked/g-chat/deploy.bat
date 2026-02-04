@echo off
REM G-Chat Deployment Script for Windows
REM Deploys Cloud Functions, Firestore Rules, and Storage Rules

echo 🚀 Deploying G-Chat...

REM Install dependencies if needed
echo 📦 Checking Cloud Function dependencies...
cd ..\..\functions
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)
cd ..\unblocked\g-chat

REM Deploy Cloud Functions
echo ☁️  Deploying Cloud Functions...
call firebase deploy --only functions:gchatSignup,functions:gchatLogin,functions:gchatValidateSession,functions:gchatChangePassword,functions:gchatCleanupSessions,functions:gchatExpireFeatured

REM Deploy Firestore Rules
echo 🔒 Deploying Firestore Rules...
call firebase deploy --only firestore:rules

REM Deploy Storage Rules
echo 📁 Deploying Storage Rules...
call firebase deploy --only storage

echo ✅ G-Chat deployment complete!
echo.
echo Next steps:
echo 1. Visit /unblocked/g-chat/ on your site
echo 2. Create an account with username and password
echo 3. To make yourself admin, set isAdmin: true in /gchat/accounts/users/{username}

pause
