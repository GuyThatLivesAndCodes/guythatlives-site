#!/bin/bash

# G-Chat Deployment Script
# Deploys Cloud Functions, Firestore Rules, and Storage Rules

echo "🚀 Deploying G-Chat..."

# Install dependencies if needed
echo "📦 Checking Cloud Function dependencies..."
cd ../../functions
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi
cd ../unblocked/g-chat

# Deploy Cloud Functions
echo "☁️  Deploying Cloud Functions..."
firebase deploy --only functions:gchatSignup,functions:gchatLogin,functions:gchatValidateSession,functions:gchatChangePassword,functions:gchatCleanupSessions,functions:gchatExpireFeatured

# Deploy Firestore Rules
echo "🔒 Deploying Firestore Rules..."
firebase deploy --only firestore:rules

# Deploy Storage Rules
echo "📁 Deploying Storage Rules..."
firebase deploy --only storage

echo "✅ G-Chat deployment complete!"
echo ""
echo "Next steps:"
echo "1. Visit /unblocked/g-chat/ on your site"
echo "2. Create an account with username and password"
echo "3. To make yourself admin, set isAdmin: true in /gchat/accounts/users/{username}"
