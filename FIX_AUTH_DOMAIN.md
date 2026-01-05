# Fix Firebase "auth/unauthorized-domain" Error

## The Problem
Firebase is blocking your login because it doesn't recognize the domain you're accessing the page from.

## The Solution (5 minutes)

### Step 1: Go to Firebase Console
Open this URL:
**https://console.firebase.google.com/project/eclair-e2b3e/authentication/settings**

### Step 2: Add Authorized Domains

Scroll down to **"Authorized domains"** section.

You'll see existing domains like:
- `localhost`
- `eclair-e2b3e.firebaseapp.com`

### Step 3: Click "Add domain" and add these:

**If you opened the HTML file directly (file:// protocol):**
- Unfortunately, Firebase doesn't support `file://` protocol for security reasons

**Solutions:**

#### Option A: Use Local Server (Recommended - 30 seconds)

Run this in your terminal:

```bash
cd "/Users/billiez/Downloads/backend - eclair/test-client"
python3 -m http.server 8080
```

Then open: **http://localhost:8080/index-complete.html**

No need to add domain - `localhost` is already authorized!

#### Option B: Use Live Server Extension (VS Code)

1. Install "Live Server" extension in VS Code
2. Right-click `index-complete.html` → "Open with Live Server"
3. Opens at `http://127.0.0.1:5500/index-complete.html`
4. Add `127.0.0.1` to authorized domains in Firebase Console

#### Option C: Deploy to GitHub Pages (For sharing)

```bash
# In your repo
git checkout -b gh-pages
git push origin gh-pages
```

Then in GitHub repo settings → Pages → Enable
Your site will be at: `https://craftguy-billies.github.io/eclair/test-client/index-complete.html`

Add `craftguy-billies.github.io` to authorized domains in Firebase Console.

---

## Quick Fix: Use Local Server Now

```bash
cd "/Users/billiez/Downloads/backend - eclair/test-client"
python3 -m http.server 8080
```

Then open: **http://localhost:8080/index-complete.html**

This will work immediately! ✅
