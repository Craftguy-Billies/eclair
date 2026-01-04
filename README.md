# Note-Taking Backend with AI Integration

A powerful backend service for a note-taking application with AI-powered features including content generation, web summarization, and intelligent note assistance.

## 🚀 Features

- **AI Chat Integration**: Powered by NVIDIA NIM API with DeepSeek model
- **Web Content Summarization**: Extract and summarize content from any URL
- **Note Management**: Full CRUD operations with Firebase Firestore
- **Real-time Streaming**: Server-sent events for AI responses
- **User Authentication**: Firebase Auth integration
- **Serverless Deployment**: Optimized for Vercel

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Database**: Firebase Firestore
- **AI Provider**: NVIDIA NIM API (DeepSeek R1)
- **Web Scraping**: Cheerio + Axios
- **Authentication**: Firebase Auth
- **Deployment**: Vercel
- **Environment**: Serverless Functions

## 📁 Project Structure

```
backend - eclair/
├── server.js              # Main Express application
├── package.json           # Dependencies and scripts
├── vercel.json           # Vercel deployment configuration
├── .env                  # Environment variables
├── routes/
│   ├── ai.js            # AI chat and generation endpoints
│   ├── web-summary.js   # Web scraping and summarization
│   └── notes.js         # Notes CRUD operations
├── config/
│   └── firebase.js      # Firebase configuration and auth
├── SETUP.md             # Detailed setup instructions
└── README.md           # This file
```

## 🔗 API Endpoints

### AI Services
- `POST /api/ai/chat` - General AI conversation
- `POST /api/ai/generate-note` - Generate or expand note content
- `POST /api/ai/summarize` - Summarize provided text

### Web Summarization
- `POST /api/web-summary/extract` - Extract content from URL
- `POST /api/web-summary/summarize` - Extract and summarize web content (streaming)

### Notes Management (Authenticated)
- `GET /api/notes` - List user's notes
- `GET /api/notes/:id` - Get specific note
- `POST /api/notes` - Create new note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `GET /api/notes/search/query` - Search notes by content/tags

### Health Check
- `GET /` - Server status
- `GET /health` - Health check with uptime

## 🔧 Environment Variables

```bash
NODE_ENV=production
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key
MAX_CONTENT_LENGTH=50000
AI_TIMEOUT=30000
CRAWL_TIMEOUT=10000
```

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Copy `.env` and fill in your credentials
   - Follow `SETUP.md` for detailed Firebase/Vercel setup

3. **Run Locally**
   ```bash
   npm run dev
   ```

4. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

## 📱 Client Integration

### Example: React Native
```javascript
const response = await fetch('your-api-url/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Hello AI!' })
});
```

### Example: Swift
```swift
let url = URL(string: "your-api-url/api/web-summary/summarize")!
// ... standard URLSession implementation
```

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Authentication**: Firebase JWT token validation
- **Input Validation**: Request body validation and sanitization
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet.js**: Security headers protection

## 📊 Performance

- **Streaming Responses**: Real-time AI generation
- **Serverless Architecture**: Automatic scaling
- **Content Caching**: Efficient web content processing
- **Database Optimization**: Indexed Firestore queries

## 🛡️ Data Privacy

- **User Isolation**: Each user can only access their own notes
- **Secure Authentication**: Firebase Auth with token validation
- **Environment Security**: API keys stored securely in Vercel
- **No Data Logging**: User content is not logged or stored beyond necessary processing

## 📈 Monitoring & Analytics

- Built-in Vercel analytics
- Request/response logging
- Error tracking and reporting
- Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For setup help, see `SETUP.md` or create an issue in the repository.

---

**Ready to deploy?** Follow the complete setup guide in `SETUP.md`!