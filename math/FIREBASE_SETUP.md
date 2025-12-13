# Firebase Authentication Setup Guide

This guide will help you configure Firebase Authentication and Firestore for the GuyThatLives Network Math Platform.

## Features Implemented

✅ Google OAuth Authentication
✅ Firestore database for user progress
✅ Automatic guest progress migration on first login
✅ Real-time progress sync across devices
✅ Global login button on all pages
✅ User dropdown with profile link
✅ Shared particle system (50% reduced spawn rate)
✅ Skills/achievements page with visual badges
✅ Profile page showing all completed lessons

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or use an existing project
3. Enter a project name (e.g., "guythatlives-math")
4. Follow the setup wizard (you can disable Google Analytics if you don't need it)

## Step 2: Enable Google Authentication

1. In your Firebase project, go to **Authentication** in the left sidebar
2. Click on the **Sign-in method** tab
3. Click on **Google** in the providers list
4. Toggle the **Enable** switch
5. Enter your project support email
6. Click **Save**

## Step 3: Enable Firestore Database

1. In your Firebase project, go to **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **Start in production mode** (recommended) or **test mode**
4. Select a Cloud Firestore location (choose one closest to your users)
5. Click **Enable**

### Firestore Security Rules (Recommended)

Add these security rules to protect user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 4: Register Web App

1. In your Firebase project overview, click the **Web** icon `</>`
2. Enter an app nickname (e.g., "Math Platform Web")
3. Check **Also set up Firebase Hosting** if you want to use Firebase Hosting (optional)
4. Click **Register app**
5. Copy the Firebase configuration object

## Step 5: Update Firebase Configuration

1. Open `/math/shared/firebase-auth.js`
2. Find the `firebaseConfig` object at the top of the file
3. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

## Step 6: Add Authorized Domains

1. In Firebase Console, go to **Authentication** > **Settings** > **Authorized domains**
2. Add your domains:
   - `localhost` (for local development)
   - `guythatlives.net` (your production domain)
   - Any other domains where your app will run

## Step 7: Test the Authentication

1. Open your math platform in a browser
2. Click the **Sign in with Google** button
3. Complete the Google sign-in flow
4. You should see your profile picture and name in the header
5. Click on your profile to see the dropdown menu
6. Visit `/math/profile/` to see your progress

## Database Structure

The Firestore database is automatically structured as follows:

```
users/
  {userId}/
    lessons/
      {lessonId}/
        - score: number
        - streak: number
        - questionCount: number
        - correctAnswers: number
        - incorrectAnswers: number
        - timeSpent: number
        - lastAttempt: timestamp
        - completed: boolean
```

## Files Modified/Created

### Created Files:
- `/math/shared/firebase-auth.js` - Firebase authentication system
- `/math/shared/particles.js` - Shared particle effect system
- `/math/shared/global-header.js` - Global header component
- `/math/FIREBASE_SETUP.md` - This setup guide

### Modified Files:
- `/math/shared/progress-tracker.js` - Added Firebase sync methods
- `/math/shared/auth-ui.css` - Added dropdown styles
- `/math/profile/index.html` - Added Firebase integration and skills section
- `/math/index.html` - Added Firebase SDK scripts
- `/math/algebra/linear-equations/lesson1/index.html` - Example lesson with Firebase

## Troubleshooting

### "Firebase not configured" warning appears
- Make sure you've replaced the placeholder config in `firebase-auth.js`
- Check that all Firebase SDKs are loading correctly (check browser console)

### "Auth domain not authorized" error
- Add your domain to Authorized domains in Firebase Console
- Clear your browser cache and try again

### Progress not syncing
- Check browser console for Firebase errors
- Verify Firestore security rules allow access
- Make sure you're logged in with a Google account

### Guest progress migration doesn't work
- This is expected to only work once when you first log in
- Guest progress is stored in localStorage with keys starting with `progress_` or `lesson_`

## Additional Features to Consider

### Email/Password Authentication
Add email/password authentication in Firebase Console > Authentication > Sign-in method

### Password Reset
Implement password reset flow using Firebase Auth

### Profile Pictures from Google
Already implemented! Google profile pictures are automatically displayed

### Email Verification
Consider adding email verification for additional security

### Multi-device Sync
Already implemented! Progress syncs automatically across all devices

## Support

For Firebase issues:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)

For platform-specific issues:
- Check `/math/shared/firebase-auth.js` for inline comments
- Review browser console for error messages
- Verify all scripts are loading in the correct order
