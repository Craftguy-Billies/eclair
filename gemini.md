# Gemini: Backend Architecture & Future Roadmap

This document serves as a comprehensive reference for the current backend implementation, architectural decisions, known limitations, and a roadmap for future enhancements. It is designed to be the "brain" of the project for future developers or AI assistants.

## 1. System Architecture

### Core Philosophy
The backend is designed as a **Stateless Serverless Proxy** that sits between the mobile clients (React Native/Swift) and powerful third-party services (NVIDIA AI, Firebase, Web). This ensures:
- **Security**: API keys and logic are hidden from clients.
- **Scalability**: Vercel handles traffic spikes automatically.
- **Cost Efficiency**: Pay-per-use model (Serverless + API credits).

### Tech Stack
- **Runtime**: Node.js 18+ (Vercel Serverless Functions)
- **Framework**: Express.js (handling routing and middleware)
- **Database**: Firebase Firestore (NoSQL, Real-time)
- **Auth**: Firebase Authentication (JWT)
- **AI Provider**: NVIDIA NIM (DeepSeek R1 model via OpenAI SDK)
- **Scraping**: Cheerio (Lightweight HTML parsing)

## 2. Implementation Details

### 🧠 AI Integration (`routes/ai.js`)
- **Provider**: NVIDIA NIM (DeepSeek R1).
- **Protocol**: OpenAI-compatible API.
- **Streaming**: Implemented using Server-Sent Events (SSE) logic. The server pipes chunks from NVIDIA directly to the client to minimize latency perception.
- **Sanitization**: Automatically removes `<think>` blocks from DeepSeek responses to keep the UI clean.

### 🕷️ Web Summarization (`routes/web-summary.js`)
- **Method**: Static HTML fetching (`axios`) + Parsing (`cheerio`).
- **Why not Puppeteer?**: Puppeteer requires Chromium, which is too heavy (>50MB) for standard Vercel Serverless Functions. Cheerio is lightweight and fast.
- **Logic**:
    1. Fetches URL.
    2. Heuristically extracts "main content" (removes navs, ads, scripts).
    3. Truncates to token limits.
    4. Sends to AI for summarization.

### 🗄️ Database & Auth (`routes/notes.js`)
- **Structure**:
    - `users/{userId}`: User profiles.
    - `notes/{noteId}`: Notes documents (linked to `userId`).
- **Security**: Uses `firebase-admin` to verify ID tokens sent by the client. This ensures users can only access their own data.
- **Search**: Currently implements a "client-side" search logic on the server (fetches user's notes -> filters in memory).

## 3. Critical Analysis & Known Limitations

### ⚠️ Serverless State Limitation (Rate Limiting)
- **Issue**: Vercel functions are ephemeral. They spin up, run, and die. Memory is not shared between instances.
- **Impact**: The `express-rate-limit` and our custom `usageTracker` store data in **memory**.
    - If Vercel spins up 10 instances to handle load, each instance has its own counter.
    - A user might get 10x the allowed quota if their requests hit different instances.
- **Verdict**: For an MVP/Prototype, this is acceptable "best-effort" security. For strict production enforcement, you must use an external store like **Redis (Vercel KV)**.

### ⚠️ Web Scraping Limitations
- **Issue**: We use `axios` (HTTP Client).
- **Impact**:
    - **Single Page Apps (SPAs)**: Sites built entirely with React/Vue that load content via JS will appear empty to our scraper.
    - **Bot Protection**: Sites like Cloudflare may block the request.
- **Verdict**: Works for ~70% of blogs/articles. Fails on complex sites (Twitter, Facebook, dynamic apps).

### ⚠️ Firestore Search
- **Issue**: Firestore does **not** support native full-text search (e.g., "find notes containing 'apple'").
- **Current Hack**: We fetch the user's notes and filter them in JavaScript.
- **Impact**: Fast for <1000 notes. Slow/Expensive for >10,000 notes (reads all documents).
- **Verdict**: Acceptable for v1.

## 4. Future Roadmap

### Phase 1: Robustness (Current)
- [x] Secure API Keys.
- [x] Basic Rate Limiting.
- [x] Streaming AI.

### Phase 2: Enhanced Capabilities (Next Steps)
1.  **Better Scraping**:
    - Integrate a **Headless Browser Service** (e.g., Browserless.io or a separate service on Fly.io running Puppeteer) to handle SPAs and JavaScript-heavy sites.
2.  **Advanced Search**:
    - Integrate **Algolia** or **Typesense** for true full-text search on notes.
    - Or, use **PostgreSQL (Supabase)** instead of Firestore if complex search/relations are a priority.
3.  **Stateful Rate Limiting**:
    - Connect **Vercel KV (Redis)** to `express-rate-limit` to enforce strict global quotas across all serverless instances.

### Phase 3: AI Agents
1.  **YouTube Summaries**:
    - Add `ytdl-core` (or similar) to fetch transcripts.
    - *Note*: YouTube aggressively blocks server-side downloaders. Using the official YouTube Data API (Transcripts) is the most stable path.
2.  **RAG (Retrieval Augmented Generation)**:
    - Store note embeddings in a Vector Database (Pinecone or Firestore Vector Search).
    - Allow AI to "chat with your notes".

## 5. Maintenance Guide

### Updating Dependencies
- Keep `openai` updated to support new models.
- Monitor `firebase-admin` for breaking changes.

### Debugging
- **Vercel Logs**: Check the "Runtime Logs" tab in Vercel dashboard for server errors.
- **Firebase Console**: Check "Usage" to monitor Firestore reads/writes.

### Environment Variables
- Always keep `FIREBASE_PRIVATE_KEY` formatted correctly (with `\n`).
- Rotate `ADMIN_API_KEY` periodically.

---
*Generated by Gemini 3 Pro - 2026-01-04*
