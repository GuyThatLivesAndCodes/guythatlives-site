# Firebase Authentication Setup Guide

This document provides instructions for setting up Firebase Authentication with Email/Password, Google, and Apple sign-in methods for the GuyThatLives Math Platform.

## Prerequisites

1. A Google account
2. Access to the [Firebase Console](https://console.firebase.google.com/)
3. The Firebase project: `guythatlives-math`

## Authentication Methods Setup

### 1. Email/Password Authentication

Email/Password authentication is the simplest method and should be enabled first.

**Steps:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`guythatlives-math`)
3. Navigate to **Authentication** > **Sign-in method**
4. Click on **Email/Password**
5. Enable the **Email/Password** toggle
6. Click **Save**

That's it! Email/Password authentication is now enabled.

### 2. Google Sign-In

Google Sign-In allows users to authenticate using their Google accounts.

**Steps:**

1. In the Firebase Console, go to **Authentication** > **Sign-in method**
2. Click on **Google**
3. Enable the **Google** toggle
4. Set the **Project support email** (use your email or the project's support email)
5. Click **Save**

**Add Authorized Domains:**

1. Still in **Authentication** > **Sign-in method**, scroll down to **Authorized domains**
2. Add your production domain (e.g., `guythatlives.net`, `math.guythatlives.net`)
3. For local development, `localhost` is automatically authorized

### 3. Apple Sign-In

Apple Sign-In is required for iOS apps and provides privacy-focused authentication.

**Important Note:** Apple Sign-In requires additional setup and an Apple Developer account.

**Steps:**

1. **Create an Apple Developer Account:**
   - Go to [Apple Developer](https://developer.apple.com/)
   - Enroll in the Apple Developer Program ($99/year)

2. **Create App ID and Service ID:**
   - Log in to [Apple Developer Portal](https://developer.apple.com/account/)
   - Go to **Certificates, Identifiers & Profiles** > **Identifiers**
   - Create a new **App ID**
   - Create a new **Services ID** (this will be your OAuth client ID)
   - Enable **Sign In with Apple** for both

3. **Configure Sign In with Apple:**
   - Edit your Services ID
   - Configure **Sign In with Apple**
   - Add your domains and return URLs:
     - Domain: `guythatlives-math.firebaseapp.com` (or your custom domain)
     - Return URL: `https://__/auth/handler` (Firebase auth handler)

4. **Create a Private Key:**
   - Go to **Keys** in Apple Developer Portal
   - Create a new key
   - Enable **Sign In with Apple**
   - Download the `.p8` private key file (save it securely!)
   - Note the **Key ID**

5. **Enable Apple Sign-In in Firebase:**
   - In Firebase Console, go to **Authentication** > **Sign-in method**
   - Click on **Apple**
   - Enable the toggle
   - Enter your **Services ID** (OAuth client ID)
   - Enter your **Apple Team ID** (found in Apple Developer Portal)
   - Upload your **Private Key** (.p8 file)
   - Enter your **Key ID**
   - Click **Save**

**Add Authorized Domains for Apple:**

1. Go to **Authentication** > **Sign-in method** > **Authorized domains**
2. Ensure your production domain is listed
3. Apple Sign-In will not work on `localhost` - you'll need to test on a deployed domain

## Firestore Database Setup

The app uses Firestore to store user progress data.

**Steps:**

1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Start in **Test mode** (for development) or **Production mode** (for production)
4. Choose your **Firestore location** (preferably close to your users)
5. Click **Enable**

**Security Rules (Important!):**

After creating the database, set up proper security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Allow users to read/write their own lesson progress
      match /lessons/{lessonId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Configuration

The Firebase configuration is already set in `/math/shared/firebase-auth.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyA6R63QS_Q5gmFI5GObnTsjfDegFSC6wVA",
  authDomain: "guythatlives-math.firebaseapp.com",
  projectId: "guythatlives-math",
  storageBucket: "guythatlives-math.firebasestorage.app",
  messagingSenderId: "668609251422",
  appId: "1:668609251422:web:b1013698b061b0423c0ccf",
  measurementId: "G-83LZH2QKBJ"
};
```

## Testing Authentication

1. **Local Testing:**
   - Run your development server
   - Open the application in a browser
   - Click the **Login** button
   - Test each authentication method:
     - Email/Password: Create an account and sign in
     - Google: Sign in with your Google account
     - Apple: (Requires deployed domain) Test on production

2. **Production Testing:**
   - Deploy your application
   - Verify all three authentication methods work
   - Test the "Save Progress from Browser" button in the profile settings

## How the System Works

### Authentication Flow

1. **User Signs In:**
   - User clicks "Login" button
   - Auth modal appears with three options: Email/Password, Google, Apple
   - User chooses a method and authenticates
   - Firebase handles the authentication
   - User is logged in and redirected

2. **Progress Tracking:**
   - When signed in, progress is automatically saved to Firebase during active lessons
   - Users can manually save all browser progress using the "Save Progress from Browser" button in profile settings
   - Progress is stored in Firestore under `/users/{userId}/lessons/{lessonId}`

3. **Sign Out:**
   - User clicks their profile and selects "Sign Out"
   - Firebase signs out the user
   - Local session is cleared

## Troubleshooting

### Email/Password Issues

- **"Email already in use":** The email is already registered. Use the sign-in form instead.
- **"Weak password":** Password must be at least 6 characters.

### Google Sign-In Issues

- **"Popup closed by user":** User closed the popup before completing authentication.
- **"Unauthorized domain":** Add your domain to Authorized domains in Firebase Console.

### Apple Sign-In Issues

- **"Configuration error":** Verify all Apple Developer Portal settings are correct.
- **"Unauthorized domain":** Ensure your domain is added in both Firebase and Apple Developer Portal.
- **"localhost not supported":** Apple Sign-In requires a deployed domain with HTTPS.

### Firestore Issues

- **"Permission denied":** Check Firestore security rules. Users can only access their own data.
- **"Network error":** Check internet connection and Firebase status.

## Security Best Practices

1. **Never commit Firebase API keys** to public repositories (though client-side API keys are safe to expose)
2. **Always use HTTPS** in production
3. **Implement proper Firestore security rules** (see above)
4. **Enable App Check** for additional security (optional but recommended)
5. **Monitor authentication activity** in Firebase Console
6. **Set up billing alerts** to avoid unexpected charges

## Support

For issues or questions:
- Check the [Firebase Documentation](https://firebase.google.com/docs)
- Review the [Firebase Console](https://console.firebase.google.com/)
- Contact: support@guythatlives.net

---

**Last Updated:** December 2024
**Firebase Project:** guythatlives-math
**Authentication Methods:** Email/Password ✅ | Google ✅ | Apple ✅
