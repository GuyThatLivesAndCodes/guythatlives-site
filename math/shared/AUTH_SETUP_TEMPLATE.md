# Standard Authentication Setup Template

This document provides the standard setup for adding Firebase authentication to any HTML page in the GuyThatLives Network.

## Required Files

All authentication-related files are located in `/math/shared/`:
- `firebase-auth.js` - Core Firebase authentication system
- `auth-ui.css` - Authentication UI styles
- `global-header.js` - (Optional) Auto-injects login button

## Quick Setup for Any Page

### 1. Add to `<head>` section:

```html
<!-- Fonts (if not already included) -->
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Crimson+Pro:wght@400;500;600&display=swap" rel="stylesheet">

<!-- Auth UI Styles -->
<link rel="stylesheet" href="../shared/auth-ui.css">
```

### 2. Add before closing `</body>` tag:

```html
<!-- Firebase SDKs -->
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore-compat.js"></script>

<!-- Firebase Auth System -->
<script src="../shared/firebase-auth.js"></script>
```

### 3. Add Login Button to Header:

```html
<header>
    <a href="/math" class="logo">Your Logo</a>
    <!-- Your navigation here -->
    <button id="loginBtn" class="login-btn" onclick="authSystem.showAuthModal()">
        <span>🔐</span> Login
    </button>
</header>
```

## Authentication Features

The Firebase authentication system provides:

✅ **Email/Password Authentication**
- Sign up with email and password
- Sign in with existing account
- Password validation

✅ **Google Sign-In**
- One-click Google authentication
- Automatic profile sync

✅ **Apple Sign-In**
- One-click Apple authentication
- Privacy-focused login

✅ **User State Management**
- Automatic login state detection
- User profile display
- Logout functionality

✅ **Progress Sync**
- Automatic Firestore integration
- User progress tracking
- Cross-device sync

## API Reference

The `authSystem` object is globally available after firebase-auth.js loads.

### Methods:

```javascript
// Show authentication modal
authSystem.showAuthModal()

// Close authentication modal
authSystem.closeAuthModal()

// Check if user is logged in
authSystem.isUserLoggedIn() // returns boolean

// Get current user
authSystem.getCurrentUser() // returns user object or null

// Sign in with Google
authSystem.signInWithGoogle()

// Sign in with Apple
authSystem.signInWithApple()

// Sign out
authSystem.signOut()

// Show user menu
authSystem.showUserMenu()
```

### User Object Properties:

```javascript
const user = authSystem.getCurrentUser();
// user.displayName - User's display name
// user.email - User's email
// user.photoURL - User's profile photo URL
// user.uid - Unique user ID
```

## CSS Variables

The authentication UI uses these CSS variables (customize in your page styles):

```css
:root {
    --primary: #0a0e27;      /* Background color */
    --accent: #64ffda;       /* Accent color */
    --secondary: #1a1f3a;    /* Secondary background */
    --text: #e1e5f2;         /* Text color */
    --text-dim: #8892b0;     /* Dimmed text */
    --surface: #151932;      /* Surface/card color */
    --border: #233554;       /* Border color */
}
```

## Complete Example Page

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Page • GuyThatLives Network</title>

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Crimson+Pro:wght@400;500;600&display=swap" rel="stylesheet">

    <!-- Auth UI Styles -->
    <link rel="stylesheet" href="../shared/auth-ui.css">

    <style>
        :root {
            --primary: #0a0e27;
            --accent: #64ffda;
            --secondary: #1a1f3a;
            --text: #e1e5f2;
            --text-dim: #8892b0;
            --surface: #151932;
            --border: #233554;
        }

        body {
            font-family: 'Crimson Pro', serif;
            background: var(--primary);
            color: var(--text);
        }
    </style>
</head>
<body>
    <header>
        <a href="/math" class="logo">guythatlives.net</a>
        <nav>
            <!-- Your navigation -->
        </nav>
        <button id="loginBtn" class="login-btn" onclick="authSystem.showAuthModal()">
            <span>🔐</span> Login
        </button>
    </header>

    <main>
        <!-- Your content here -->
    </main>

    <!-- Firebase SDKs -->
    <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore-compat.js"></script>

    <!-- Firebase Auth System -->
    <script src="../shared/firebase-auth.js"></script>

    <script>
        // Your page-specific JavaScript here

        // Example: Check if user is logged in
        setTimeout(() => {
            if (authSystem.isUserLoggedIn()) {
                console.log('User is logged in:', authSystem.getCurrentUser());
            } else {
                console.log('User is not logged in');
            }
        }, 1000);
    </script>
</body>
</html>
```

## Path Adjustments

**Important:** Adjust the relative paths based on your file location:

- **Root level** (`/index.html`): Use `math/shared/firebase-auth.js`
- **Math level** (`/math/index.html`): Use `shared/firebase-auth.js`
- **Algebra level** (`/math/algebra/index.html`): Use `../shared/firebase-auth.js`
- **Lesson level** (`/math/algebra/linear-equations/index.html`): Use `../../shared/firebase-auth.js`

## Firebase Configuration

The Firebase configuration is already set up in `firebase-auth.js`. No additional configuration needed!

Project: `guythatlives-math`
- Authentication: Email/Password, Google, Apple
- Database: Firestore (for progress tracking)
- Hosting: Firebase Hosting

## Migration Guide

If migrating from old `auth.js` system:

1. ❌ Remove: `<script src="../shared/auth.js"></script>`
2. ✅ Add: Firebase SDKs (3 scripts)
3. ✅ Add: `<script src="../shared/firebase-auth.js"></script>`
4. 🔄 Update: Change `authSystem.showLoginModal()` → `authSystem.showAuthModal()`

## Future Additions

This setup is designed to be extensible. Future features can include:

- Progress tracking integration
- User settings/preferences
- Achievement system
- Social features
- Notification system
- Premium/subscription features

All these features will work with the same base authentication setup!

---

**Last Updated:** 2025-12-13
**Maintained by:** GuyThatLives Development Team
