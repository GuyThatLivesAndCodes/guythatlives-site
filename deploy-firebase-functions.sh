#!/bin/bash

# Firebase Functions Deployment Script
# This script will deploy the Claude API function to Firebase

echo "🚀 Firebase Functions Deployment"
echo "================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Login to Firebase
echo "📝 Logging in to Firebase..."
firebase login

# Set the Claude API key
echo ""
echo "🔑 Setting up Claude API key..."
echo "Please enter your Claude API key:"
read -s API_KEY

if [ -z "$API_KEY" ]; then
    echo "❌ No API key provided. Using existing configuration."
else
    firebase functions:config:set claude.api_key="$API_KEY"
    echo "✅ API key configured!"
fi

# Install dependencies
echo ""
echo "📦 Installing function dependencies..."
cd functions
npm install
cd ..

# Deploy functions
echo ""
echo "🚀 Deploying functions to Firebase..."
firebase deploy --only functions

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your Claude API function is now live at:"
echo "https://us-central1-guythatlives-unblocked.cloudfunctions.net/analyzeTest"
echo ""
echo "The website will now use the secure Firebase Function for AI analysis."
echo "You can delete the config.local.js file as it's no longer needed."
