# Authentication Guide for Eclair Backend

## Overview

Your backend has **two authentication models** depending on which endpoints you use:

---

## 1. AI & Web Summary Endpoints - **NO AUTH REQUIRED** ✅

### Endpoints:
- `POST /api/ai/chat` - Chat with AI
- `POST /api/ai/generate-note` - Generate notes with AI
- `POST /api/ai/summarize` - Summarize text
- `POST /api/web-summary/extract` - Extract web content
- `POST /api/web-summary/summarize` - Summarize web pages

### Authentication:
**NONE** - Anyone can call these endpoints.

### Example:
```javascript
// No authentication needed!
fetch('https://eclair-b7zo.vercel.app/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Hello AI!',
    temperature: 0.7
  })
});
```

### Protection:
- **Rate limiting**: 50 AI requests per 15 minutes per IP
- **NVIDIA API key**: Secured on server-side (never exposed to clients)
- **Content validation**: XSS/injection prevention

### Risk:
⚠️ **Yes, anyone can consume your NVIDIA API quota**. This is by design for easy testing. For production, you have options:

**Option A: Add Client API Key** (Simple)
```javascript
// In your app, add a secret key
headers: {
  'X-API-Key': 'your-secret-client-key'
}

// In server.js, add middleware to check it
if (req.headers['x-api-key'] !== process.env.CLIENT_API_KEY) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

**Option B: Use Firebase Auth** (Recommended)
- Require Firebase JWT tokens for AI endpoints
- Each user must be logged in to use AI features
- Better for tracking usage per user

---

## 2. Notes Endpoints - **FIREBASE AUTH REQUIRED** 🔒

### Endpoints:
- `GET /api/notes` - Get all user notes
- `POST /api/notes` - Create a note
- `PUT /api/notes/:id` - Update a note
- `DELETE /api/notes/:id` - Delete a note
- `GET /api/notes/search` - Search notes

### Authentication:
**REQUIRED** - Must include Firebase ID token in `Authorization` header.

### How to Get Firebase Token:
```javascript
// In your app, after user signs in with Firebase Auth
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;
const idToken = await user.getIdToken();
```

### Example Request:
```javascript
const idToken = await firebase.auth().currentUser.getIdToken();

fetch('https://eclair-b7zo.vercel.app/api/notes', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  }
});
```

### What Happens:
1. Client sends Firebase ID token
2. Backend verifies token with Firebase Admin SDK
3. Extracts `userId` from token
4. Only returns/modifies that user's notes

### Security:
✅ **Users can only access their own notes**
✅ **Token verified by Firebase (cryptographically secure)**
✅ **No way to fake another user's token**

---

## 3. Monitoring Endpoints - **ADMIN API KEY REQUIRED** 🔐

### Endpoints:
- `GET /api/monitoring/usage` - View API usage stats

### Authentication:
**REQUIRED** - Must include admin API key in `X-API-Key` header.

### Example:
```javascript
fetch('https://eclair-b7zo.vercel.app/api/monitoring/usage', {
  headers: {
    'X-API-Key': 'your-admin-secret-key'
  }
});
```

### Setup:
Set `ADMIN_API_KEY` in Vercel environment variables:
```bash
# In Vercel dashboard or CLI
vercel env add ADMIN_API_KEY
# Enter: some-secure-random-string-12345
```

---

## Summary Table

| Endpoint | Auth Required | Header | Who Can Access |
|----------|---------------|--------|----------------|
| `/api/ai/*` | ❌ No | None | Anyone (rate limited) |
| `/api/web-summary/*` | ❌ No | None | Anyone (rate limited) |
| `/api/notes/*` | ✅ Yes | `Authorization: Bearer <firebase-token>` | Only authenticated Firebase users |
| `/api/monitoring/*` | ✅ Yes | `X-API-Key: <admin-key>` | Only admins with secret key |

---

## Recommendations

### For MVP/Testing (Current Setup):
✅ **Keep AI endpoints open** - Easy testing, rate limits provide basic protection

### For Production:
1. **Add client API key** to AI endpoints (prevents random abuse)
2. **Set `ALLOWED_ORIGINS`** in Vercel to specific domains only
3. **Set `ADMIN_API_KEY`** for monitoring endpoints
4. **Consider Firebase Auth for AI endpoints** for per-user quotas
5. **Upgrade rate limiting** to Redis (currently in-memory, resets on deploy)

---

## Firebase Setup for Your App

To use the Notes API, your mobile app needs Firebase SDK:

### React Native:
```bash
npm install @react-native-firebase/app @react-native-firebase/auth
```

```javascript
import auth from '@react-native-firebase/auth';

// Sign in user
await auth().signInWithEmailAndPassword(email, password);

// Get token for API calls
const token = await auth().currentUser.getIdToken();
```

### Swift (iOS):
```swift
import Firebase

// Sign in user
Auth.auth().signIn(withEmail: email, password: password) { result, error in
    // Get token for API calls
    result?.user.getIDToken { token, error in
        // Use token in Authorization header
    }
}
```

### Firebase Project:
- **Project ID**: `eclair-e2b3e`
- Your app needs to connect to this Firebase project
- Download `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) from Firebase Console

---

## Testing Without Auth

For quick testing without setting up Firebase Auth:

**AI Endpoints**: ✅ Work immediately (as shown in test-client)
**Notes Endpoints**: ❌ Will return 401 Unauthorized without Firebase token

If you want to test Notes endpoints, you need to:
1. Create a Firebase Auth user in Firebase Console
2. Get an ID token from that user
3. Include it in the `Authorization` header
