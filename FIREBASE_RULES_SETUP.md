# Firebase Firestore Rules Setup

This file explains how to deploy the Firestore security rules for the GuyThatLives Math Platform.

## Current Rules File

The rules are defined in `firestore.rules` at the root of this repository.

## What the Rules Allow

### Users Collection (`/users/{userId}`)
- ✅ Users can **read and write** their own data (progress, ad preferences, etc.)
- ✅ Admin (guythatlives@protonmail.com) can **read all users** (for Host Manager Settings)
- ✅ Admin can **delete any user account**

### Schools Collection (`/schools/{schoolId}`)
- ✅ Authenticated users can **create and manage** schools
- ✅ Anyone can **read** schools (for browsing)

### Everything Else
- ❌ **Denied by default** (secure by default)

## How to Deploy Rules to Firebase

### Option 1: Firebase Console (Web UI)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **guythatlives-math**
3. Click **Firestore Database** in the left sidebar
4. Click the **Rules** tab
5. Copy the contents of `firestore.rules` from this repository
6. Paste into the Firebase Console editor
7. Click **Publish**

### Option 2: Firebase CLI (Command Line)

If you have Firebase CLI installed:

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (first time only)
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

## Testing the Rules

After deploying, you can test that the rules work correctly:

### Test User Access
1. Log in as a regular user
2. Go to Profile page
3. Try to change ad preferences (should work)
4. Check browser console - should NOT see permission errors

### Test Admin Access
1. Log in as guythatlives@protonmail.com
2. Go to Profile page
3. Scroll to "Host Manager Settings"
4. You should see a list of all users
5. Try viewing user details (should work)
6. Try deleting a test user (should work)

### Test Security
Try accessing another user's data:
```javascript
// In browser console (should fail)
firebase.firestore().collection('users').doc('some-other-user-id').get()
// Expected: Error: Missing or insufficient permissions
```

## Troubleshooting

### "Missing or insufficient permissions" Error

**Problem:** Users getting permission errors when saving preferences

**Solution:** Make sure you've deployed the new rules from `firestore.rules`

### Admin Can't See All Users

**Problem:** Admin panel shows "Error loading users"

**Solution:**
1. Verify you're logged in with guythatlives@protonmail.com
2. Check that the email is correctly set in Firebase Authentication
3. Rules use `request.auth.token.email` which requires the email to be verified

### Rules Not Updating

**Problem:** Changed rules but still getting old behavior

**Solution:**
1. Check the Firebase Console to confirm rules were published
2. Clear browser cache and reload
3. Check the timestamp in Firebase Console Rules tab

## Security Notes

- Rules are evaluated on the Firebase server (secure)
- Users can only access their own data (userId must match auth.uid)
- Admin access is restricted to specific email address
- Schools are publicly readable (intentional for browsing feature)
- Everything else is denied by default (principle of least privilege)

## Support

If you encounter issues with Firebase rules:
1. Check the Firebase Console **Rules Playground** to test specific operations
2. View **Usage** tab to see if rules are being evaluated
3. Check browser console for detailed error messages
4. Verify your Firebase project settings match the config in `firebase-auth.js`

---

**Last Updated:** 2025-12-13
**Firebase Project:** guythatlives-math
