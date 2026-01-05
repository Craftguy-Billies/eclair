# Firebase Google Sign-In Setup Guide

## ⚠️ IMPORTANT: Get Your Firebase Web API Key First!

The login page needs your Firebase web API key. Here's how to get it:

### Step 1: Get API Key from Firebase Console

1. Go to: https://console.firebase.google.com/project/eclair-e2b3e/settings/general
2. Scroll down to **"Your apps"** section
3. Look for **"Web apps"** or click **"Add app"** → Select **Web** icon (`</>`)
4. Give it a nickname: "Eclair Web Test" (or anything)
5. Click **"Register app"**
6. You'll see a `firebaseConfig` object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",  // ← THIS ONE!
  authDomain: "eclair-e2b3e.firebaseapp.com",
  projectId: "eclair-e2b3e",
  storageBucket: "eclair-e2b3e.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxxx"
};
```

7. **Copy the entire `firebaseConfig` object**

### Step 2: Update `firebase-login.html`

Open `test-client/firebase-login.html` and replace this section (around line 180):

```javascript
// REPLACE THIS:
const firebaseConfig = {
    apiKey: "AIzaSyBXwfwxKxLzFZfvQ_3R7VvQxmZJXlFZE8k", // ← Old placeholder
    authDomain: "eclair-e2b3e.firebaseapp.com",
    projectId: "eclair-e2b3e",
    storageBucket: "eclair-e2b3e.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// WITH YOUR ACTUAL CONFIG FROM FIREBASE CONSOLE
```

---

## Step 3: Enable Google Sign-In Provider

1. Go to: https://console.firebase.google.com/project/eclair-e2b3e/authentication/providers
2. Click **"Add new provider"** or find **"Google"** in the list
3. Click on **"Google"** → Toggle **"Enable"**
4. Fill in:
   - **Project public-facing name**: "Eclair"
   - **Project support email**: Your email address
5. Click **"Save"**

✅ **Done!** Google sign-in is now enabled.

---

## Step 4: Test the Login

1. Open `test-client/firebase-login.html` in your browser
2. Click **"Sign in with Google"**
3. Select your Google account
4. After signing in, click **"Copy Firebase ID Token"**
5. Click **"Test Workspaces API"** to open the workspaces test client with your token already loaded!

---

## Understanding the Flow

### What Happens:

```
User clicks "Sign in with Google"
    ↓
Firebase shows Google account picker
    ↓
User selects account and grants permission
    ↓
Firebase returns authenticated user object
    ↓
Your app calls: user.getIdToken()
    ↓
Firebase generates a JWT token for that specific user
    ↓
Token contains: userId, email, expiry time (signed by Firebase)
    ↓
Your app sends token to backend in Authorization header
    ↓
Backend verifies token using service account JSON
    ↓
Backend extracts userId and returns only that user's data
```

### Who Can Sign In?

**ANYONE** with a Google account can sign in! This is **CLIENT-SIDE** authentication.

- ❌ No admin access needed
- ❌ Service account JSON stays on server only
- ✅ Users sign in directly from your app
- ✅ Each user gets their own workspace/notes
- ✅ Backend verifies tokens are genuine

---

## For Mobile Apps (React Native / Swift)

### React Native Setup:

```bash
npm install @react-native-firebase/app @react-native-firebase/auth @react-native-google-signin/google-signin
```

```javascript
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID', // From Firebase Console
});

// Sign in
async function signInWithGoogle() {
  const { idToken } = await GoogleSignin.signIn();
  const googleCredential = auth.GoogleAuthProvider.credential(idToken);
  await auth().signInWithCredential(googleCredential);
  
  // Get Firebase ID token
  const firebaseToken = await auth().currentUser.getIdToken();
  
  // Use this token for API calls
  fetch('https://eclair-b7zo.vercel.app/api/workspaces', {
    headers: {
      'Authorization': `Bearer ${firebaseToken}`
    }
  });
}
```

### Swift (iOS) Setup:

```swift
import Firebase
import GoogleSignIn

// Sign in
func signInWithGoogle() {
    guard let clientID = FirebaseApp.app()?.options.clientID else { return }
    let config = GIDConfiguration(clientID: clientID)
    GIDSignIn.sharedInstance.configuration = config
    
    GIDSignIn.sharedInstance.signIn(withPresenting: self) { result, error in
        guard let user = result?.user,
              let idToken = user.idToken?.tokenString else { return }
        
        let credential = GoogleAuthProvider.credential(
            withIDToken: idToken,
            accessToken: user.accessToken.tokenString
        )
        
        Auth.auth().signIn(with: credential) { authResult, error in
            // Get Firebase ID token
            Auth.auth().currentUser?.getIDToken { token, error in
                // Use this token for API calls
            }
        }
    }
}
```

---

## Security Notes

### Is This Secure?

✅ **YES!** Here's why:

1. **Firebase Web API Key is NOT a secret** - It's meant to be in your client code
2. **Security comes from Firebase Auth Rules** - Not the API key
3. **ID tokens are cryptographically signed** - Backend verifies with Firebase
4. **Tokens expire after 1 hour** - Must be refreshed
5. **Backend validates every request** - Uses service account JSON to verify

### What's Protected:

- Service Account JSON (backend only) ✅
- NVIDIA API Key (backend only) ✅
- Firebase Admin SDK (backend only) ✅

### What's Public:

- Firebase Web API Key (client code) ✅ Safe to expose
- Vercel API URL ✅ Rate limited
- Firebase Project ID ✅ Not sensitive

---

## Troubleshooting

### "Sign-in failed: auth/unauthorized-domain"
→ Add your domain to authorized domains in Firebase Console:
  https://console.firebase.google.com/project/eclair-e2b3e/authentication/settings

### "Error: No user signed in"
→ Make sure Google provider is enabled in Firebase Console

### "Invalid token" from backend
→ Check that FIREBASE_PROJECT_ID in .env matches "eclair-e2b3e"
→ Verify service account JSON is correct in .env

---

## Next Steps

1. ✅ Get Firebase config from Console
2. ✅ Update `firebase-login.html` with real API key
3. ✅ Enable Google sign-in in Firebase Console
4. ✅ Add `localhost` to authorized domains (if testing locally)
5. ✅ Open `firebase-login.html` and sign in!
6. ✅ Copy token and test workspaces API
