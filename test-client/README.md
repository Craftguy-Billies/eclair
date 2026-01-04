# Eclair AI Test Client

A simple HTML/JavaScript client to test your Eclair backend API.

## 🚀 Your Backend URL
```
https://eclair-b7zo.vercel.app
```

## 📁 Files in this folder

- **index.html** - Simple web interface to test AI chat
- **test-node.js** - Node.js script to test API programmatically

## 🌐 How to Use the Web Client

1. **Open in browser:**
   ```bash
   open index.html
   ```
   Or just double-click `index.html`

2. **Type a message** in the text area

3. **Click "Send Message to AI"** to get a streaming response

4. **Watch the response** appear in real-time!

## 💻 How to Use the Node.js Script

1. **Make sure you have Node.js installed:**
   ```bash
   node --version
   ```

2. **Run the test script:**
   ```bash
   node test-node.js
   ```

3. **See the AI response** streamed to your terminal!

## ✨ Features

- ✅ No authentication required (API key secured on server)
- ✅ Real-time streaming responses
- ✅ Automatic `<think>` block removal
- ✅ Beautiful UI with status indicators
- ✅ Error handling and rate limit detection
- ✅ Works on any device with a browser

## 🧪 Test Messages to Try

```
"Tell me a fun fact about AI"
"Write a haiku about programming"
"Explain quantum computing in simple terms"
"What are the benefits of serverless architecture?"
"Create a short story about a robot learning to paint"
```

## 🔧 API Details

- **Endpoint:** `POST /api/ai/chat`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "prompt": "Your message here",
    "temperature": 0.7,
    "max_tokens": 2048
  }
  ```
- **Response:** Server-Sent Events (streaming)

## 📊 Rate Limits

- **AI Chat:** 50 requests per 15 minutes
- **General:** 100 requests per 15 minutes

If you hit the rate limit, wait 15 minutes and try again!

## 🐛 Troubleshooting

### "Could not connect to backend"
- Check that your Vercel deployment is still running
- Verify the URL is correct: `https://eclair-b7zo.vercel.app`

### "Rate limit exceeded"
- Wait 15 minutes before trying again
- Check the response headers for retry time

### CORS errors
- The backend is configured to accept requests from any origin during development
- If you get CORS errors, check your browser's console for details

## 📱 Next Steps

After testing here, you can integrate this into your mobile app:
1. Use the same API endpoint: `https://eclair-b7zo.vercel.app/api/ai/chat`
2. Follow the examples in `CLIENT_EXAMPLES.md` for React Native/Swift
3. No API keys needed in your mobile app - it's all secured on the server!

## 🎉 Enjoy Testing!

Your backend is live and ready to use. Feel free to modify the HTML client or Node.js script to test other endpoints like:
- `/api/ai/generate-note` - Generate notes
- `/api/web-summary/summarize` - Summarize web pages
- `/api/notes` - CRUD operations (requires Firebase auth)
