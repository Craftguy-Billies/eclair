# Setup Instructions for Note-Taking Backend

This guide will help you deploy your note-taking backend with AI integration to Vercel and set up Firebase for database functionality.

## 📋 Prerequisites

- Node.js 18+ installed locally
- Git installed
- GitHub account
- NVIDIA Developer account (for AI API access)

## 🔥 Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter project name (e.g., `note-taking-app`)
4. Choose whether to enable Google Analytics (optional)
5. Click **"Create project"**

### Step 2: Set up Firestore Database

1. In your Firebase project console, click **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll configure security rules later)
4. Select a location closest to your users
5. Click **"Done"**

### Step 3: Enable Authentication

1. In Firebase console, go to **"Authentication"**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable the authentication providers you want:
   - **Email/Password** (recommended for testing)
   - **Google** (optional)
   - **Anonymous** (optional for guest users)

### Step 4: Generate Service Account Key

1. Go to **"Project settings"** (gear icon)
2. Click **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Click **"Generate key"** - this downloads a JSON file
5. **IMPORTANT**: Keep this file secure and never commit it to version control

### Step 5: Configure Firestore Security Rules

1. Go to **"Firestore Database"**
2. Click **"Rules"** tab
3. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Notes collection - users can only access their own notes
    match /notes/{noteId} {
      allow read, write, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // User profiles (if needed later)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Click **"Publish"**

### Step 6: Get Firebase Configuration Values

From your Firebase project, collect these values (you'll need them for environment variables):

1. **Project ID**: Found in Project settings → General tab
2. **Client Email**: From the service account JSON file (`client_email` field)
3. **Private Key**: From the service account JSON file (`private_key` field)

## 🚀 Vercel Deployment Setup

### Step 1: Prepare Your Code

1. Make sure all files are created in your project directory
2. Initialize git repository (if not already done):
   ```bash
   cd "/Users/billiez/Downloads/backend - eclair"
   git init
   git add .
   git commit -m "Initial commit"
   ```

### Step 2: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it something like `note-taking-backend`
3. **Do not** initialize with README (your local repo already has files)
4. Push your local code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

### Step 3: Deploy to Vercel

1. Go to [Vercel](https://vercel.com) and sign in with GitHub
2. Click **"New Project"**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build` (leave default)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install` (leave default)

### Step 4: Configure Environment Variables in Vercel

1. In your Vercel project dashboard, go to **"Settings"**
2. Click **"Environment Variables"**
3. Add the following variables:

```bash
NODE_ENV=production
NVIDIA_API_KEY=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
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1

# 🔒 CORS SECURITY (replace with your actual domains - optional for development)
ALLOWED_ORIGINS=https://yourdomain.com,https://yourapp.vercel.app

# 🔒 ADMIN KEY (optional - only needed for monitoring endpoints)
ADMIN_API_KEY=your_secure_admin_key_for_monitoring_dashboard

# Firebase Configuration (you'll need to add these after Firebase setup)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Optional: Custom configurations
MAX_CONTENT_LENGTH=50000
AI_TIMEOUT=30000
CRAWL_TIMEOUT=10000
```

**Important Notes for Environment Variables:**
- Replace `your-firebase-project-id` with your actual Firebase project ID
- Replace `FIREBASE_CLIENT_EMAIL` with the value from your service account JSON
- For `FIREBASE_PRIVATE_KEY`, copy the entire private key from the JSON file, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- Make sure to wrap the private key in double quotes and include the `\n` characters

### Step 5: Deploy

1. Click **"Deploy"** in Vercel
2. Wait for deployment to complete
3. You'll get a URL like `https://your-project-name.vercel.app`

## 🧪 Testing Your Deployment

### Test Health Check

Visit your deployed URL to see if the server is running:
```
GET https://your-project-name.vercel.app/
```

You should see:
```json
{
  "status": "ok",
  "message": "Note-taking backend is running",
  "timestamp": "2026-01-03T..."
}
```

### Test AI Integration

Test the AI chat endpoint:
```bash
curl -X POST https://your-project-name.vercel.app/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?"}'
```

### Test Web Summarization

Test web content extraction:
```bash
curl -X POST https://your-project-name.vercel.app/api/web-summary/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## 📱 Client Integration Examples

### React Native Example

```javascript
// AI Chat - No API key required, NVIDIA key is secured on server
const chatWithAI = async (prompt) => {
  const response = await fetch('https://your-project-name.vercel.app/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt })
  });
  
  // Handle rate limiting (50 requests per 15 minutes)
  if (response.status === 429) {
    const error = await response.json();
    alert(`Rate limit: ${error.message}`);
    return;
  }
  
  // Handle streaming response
  const reader = response.body.getReader();
  // Process chunks...
};

// Web Summarization - No API key required
const summarizeWeb = async (url) => {
  const response = await fetch('https://your-project-name.vercel.app/api/web-summary/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url, summary_type: 'general' })
  });
  
  // Handle rate limiting (30 requests per 15 minutes)
  if (response.status === 429) {
    const error = await response.json();
    alert(`Rate limit: ${error.message}`);
    return;
  }
  
  // Handle streaming response
  const reader = response.body.getReader();
  // Process chunks...
};
```

### Swift Example

```swift
// AI Chat - Simple HTTP request, no API key needed
func chatWithAI(prompt: String) {
    let url = URL(string: "https://your-project-name.vercel.app/api/ai/chat")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = ["prompt": prompt]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        // Handle rate limiting
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 429 {
            // Show rate limit message to user
            return
        }
        // Handle response
    }.resume()
}
```

## 🔒 Firebase Authentication for Notes

To use the notes endpoints, your client needs to authenticate with Firebase:

### 1. Configure Firebase in Your Client App

Add Firebase SDK to your React Native or Swift app and configure authentication.

### 2. Get Authentication Token

```javascript
// React Native with Firebase
import auth from '@react-native-firebase/auth';

const getAuthToken = async () => {
  const user = auth().currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
};
```

### 3. Use Token in API Calls

```javascript
const saveNote = async (noteData) => {
  const token = await getAuthToken();
  
  const response = await fetch('https://your-project-name.vercel.app/api/notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(noteData)
  });
  
  return response.json();
};
```

## 📊 Available API Endpoints

### AI Endpoints
- `POST /api/ai/chat` - General AI chat
- `POST /api/ai/generate-note` - Generate/expand notes  
- `POST /api/ai/summarize` - Summarize text content

### Web Summary Endpoints
- `POST /api/web-summary/extract` - Extract content from URL
- `POST /api/web-summary/summarize` - Extract and summarize web content

### Notes Endpoints (Requires Authentication)
- `GET /api/notes` - Get user's notes
- `GET /api/notes/:id` - Get specific note
- `POST /api/notes` - Create new note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `GET /api/notes/search/query` - Search notes

## 🛠️ Troubleshooting

### Common Issues

1. **Vercel Build Fails**
   - Check that all dependencies are in `package.json`
   - Ensure Node.js version is 18+

2. **Firebase Connection Issues**
   - Verify environment variables are set correctly
   - Check that private key is properly formatted with `\n` characters
   - Ensure service account has proper permissions

3. **AI API Timeout**
   - Increase `maxDuration` in `vercel.json` if needed (up to 30s on Hobby plan)
   - Consider upgrading to Vercel Pro for longer timeouts

4. **CORS Issues**
   - The server is configured to accept all origins in development
   - For production, configure CORS to only allow your client domains

### Environment Variables Template

Create a `.env.example` file for reference:
```bash
NODE_ENV=production
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_service_account_email
FIREBASE_PRIVATE_KEY="your_firebase_private_key_with_newlines"
MAX_CONTENT_LENGTH=50000
AI_TIMEOUT=30000
CRAWL_TIMEOUT=10000
```

## 🎉 Next Steps

After successful deployment:

1. **Test all endpoints** with your React Native/Swift app (no extra API keys needed)
2. **Set CORS origins** in production: Add your domains to `ALLOWED_ORIGINS`
3. **Set up monitoring** in Vercel dashboard
4. **Configure custom domain** if needed
5. **Set up database backups** in Firebase
6. **Add error tracking** (like Sentry)
7. **Set up CI/CD** for automated deployments

**Optional Advanced Setup:**
- Review `SECURITY.md` for detailed security documentation
- Set `ADMIN_API_KEY` for monitoring dashboard access
- Configure additional rate limiting if needed

## 🔒 Security Features

**Your API includes essential security without being overly restrictive:**
- ✅ **NVIDIA API Key Protection**: Secured in Vercel environment variables (not exposed)
- ✅ **Rate Limiting**: Reasonable limits (100 general, 50 AI, 30 web requests per 15min)
- ✅ **Content Validation**: Blocks malicious JavaScript/XSS attempts
- ✅ **Request Size Limits**: 1MB maximum payload
- ✅ **CORS Protection**: Configure allowed domains in production
- ✅ **Firebase Auth**: Secure notes access with user authentication
- ✅ **Admin Monitoring**: Optional admin dashboard with separate API key

**For Production:**
1. Set `ALLOWED_ORIGINS` to your actual domains
2. Optionally set `ADMIN_API_KEY` for monitoring dashboard access
3. Your mobile apps can access AI/web endpoints directly (no extra API keys needed)

**Read `SECURITY.md` for detailed security documentation.**

## 📞 Need Help?

If you encounter any issues during setup:

1. Check Vercel deployment logs in the dashboard
2. Verify all environment variables are set correctly
3. Test Firebase connection with a simple read/write operation
4. Ensure NVIDIA API key is valid and has sufficient credits

The backend is now ready to handle your note-taking app with AI integration!