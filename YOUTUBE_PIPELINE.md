# YouTube Transcription Pipeline

## Recommended Approach: **Use YouTube's Built-in Captions API**

### Why Not yt-dlp + Whisper?

**Problems:**
- yt-dlp downloads entire video (100MB+ for 10min video)
- Audio conversion (mp4 → wav) takes time and disk space
- Whisper transcription is slow and expensive
- Total time: 30-60 seconds per video
- High compute cost on serverless (Vercel has 10s function timeout)

**Better Solution: YouTube Captions API**
- Instant (no download, no processing)
- Free (no AI cost)
- Already accurate (human-reviewed captions when available)
- ~1 second total time
- No disk space needed

## Implementation Options

### Option 1: YouTube Transcript API (Recommended)
Fast, free, gets existing captions directly from YouTube.

```javascript
// Install: npm install youtube-transcript
const { YoutubeTranscript } = require('youtube-transcript');

async function getYouTubeTranscript(videoUrl) {
  const videoId = extractVideoId(videoUrl);
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  
  // transcript = [{ text: "Hello", duration: 2.5, offset: 0 }, ...]
  const fullText = transcript.map(t => t.text).join(' ');
  return fullText;
}
```

**Pros:**
- Instant (< 1 second)
- Free
- Works for 80%+ of YouTube videos
- No compute needed

**Cons:**
- Only works if video has captions
- Auto-generated captions may have minor errors

### Option 2: AssemblyAI (If Captions Don't Exist)
Fallback when video has no captions. Cheaper and faster than NVIDIA Whisper.

```javascript
// Install: npm install assemblyai
const { AssemblyAI } = require('assemblyai');

async function transcribeYouTubeWithAssemblyAI(videoUrl) {
  const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
  
  // AssemblyAI can transcribe directly from YouTube URL
  const transcript = await client.transcripts.create({
    audio_url: videoUrl,
    language_code: 'en'
  });
  
  return transcript.text;
}
```

**Pricing:**
- $0.00025 per second (~$0.015 per 1-minute video)
- 10-minute video = $0.15

**Speed:**
- ~30% of video length (10min video = 3min processing)

### Option 3: NVIDIA Riva Whisper (Expensive, Slow)
Only if you need ultra-high accuracy or uncommon languages.

**Problems for Serverless:**
- Requires Python subprocess
- Needs audio file on disk
- Takes 10-30 seconds
- Vercel serverless timeout = 10s (will fail)
- Need dedicated server or long-running function

**Cost:**
- NVIDIA pricing unclear, likely per-minute

## Recommended Pipeline

```
YouTube URL
    ↓
Try YouTube Transcript API (< 1s, free)
    ↓ (if no captions)
Try AssemblyAI (30% video length, $0.015/min)
    ↓
AI Summarize with NVIDIA DeepSeek (2-3s, existing API)
    ↓
Return concise summary
```

## Implementation Plan

### 1. Install Package
```bash
npm install youtube-transcript
```

### 2. Create Route
```javascript
// routes/youtube-summary.js
const { YoutubeTranscript } = require('youtube-transcript');
const { OpenAI } = require('openai');

router.post('/summarize', async (req, res) => {
  const { videoUrl } = req.body;
  
  // Step 1: Get transcript (1 second)
  const videoId = extractVideoId(videoUrl);
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  const fullText = transcript.map(t => t.text).join(' ');
  
  // Step 2: Summarize with AI (2-3 seconds)
  const summary = await summarizeText(fullText);
  
  res.json({ summary, transcript: fullText });
});
```

### 3. Total Time
- Get captions: < 1 second
- AI summary: 2-3 seconds
- **Total: ~3-4 seconds** (vs 30-60s with yt-dlp + Whisper)

## Cost Comparison

| Method | Time | Cost (10min video) | Vercel Compatible |
|--------|------|-------------------|-------------------|
| YouTube API | 3-4s | $0 (AI only) | ✅ Yes |
| AssemblyAI | 3-4min | $0.15 | ✅ Yes |
| yt-dlp + NVIDIA Whisper | 30-60s | Unknown + bandwidth | ❌ Timeout |

## Conclusion

**Use YouTube Transcript API** for 95% of use cases:
- Instant
- Free
- Accurate
- No compute
- Serverless-friendly

Only use audio transcription (AssemblyAI) as fallback for videos without captions.

**Avoid yt-dlp + Whisper** unless you have a dedicated server with no timeout limits.

## Rate Limiting & Multi-User Concerns

### YouTube Transcript API Limits

**Library behavior:**
- `youtube-transcript` is a scraper that fetches public YouTube caption data
- **No official API key required** (it scrapes YouTube's public endpoint)
- **No hard rate limits from YouTube** for reasonable usage
- However, YouTube **may block your server IP** if you abuse it (thousands of requests per minute)

**Estimated safe limits:**
- ~300-500 requests per hour from single IP
- YouTube uses dynamic rate limiting (behavior-based, not fixed quotas)
- If blocked: temporary (usually 1-6 hours), not permanent

### Your Current Rate Limit (40/15min)

**Is it enough for multiple users?**

Scenario analysis:
- 40 requests per 15 minutes = **160 requests per hour**
- If you have 10 users: each can make 16 requests/hour (reasonable)
- If you have 100 users: each gets 1.6 requests/hour (tight, but OK for note-taking app)

**Recommendation:**
- For < 50 concurrent users: **Current limit is fine**
- For 50-500 users: **Increase to 100-200 per 15min**
- For 500+ users: **Consider caching** (see below)

### Solutions for High Traffic

**Option 1: Increase Rate Limit**
```javascript
const youtubeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Increased from 40
  message: { error: 'YouTube summary quota exceeded' }
});
```

**Option 2: Per-User Rate Limiting (Better)**
```javascript
// Install: npm install rate-limit-redis
const RedisStore = require('rate-limit-redis');

const youtubeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Per user limit
  keyGenerator: (req) => {
    // Use Firebase user ID from token
    return req.user?.uid || req.ip;
  }
});
```
This gives **each user** their own quota instead of sharing globally.

**Option 3: Cache Popular Videos (Best for Scale)**
```javascript
// Store transcripts in Firebase for 24 hours
const transcriptCache = {};

async function getTranscriptWithCache(videoId) {
  // Check cache first
  const cached = await db.collection('transcript_cache')
    .doc(videoId)
    .get();
  
  if (cached.exists && Date.now() - cached.data().timestamp < 86400000) {
    return cached.data().transcript; // Use cached (no YouTube API call)
  }
  
  // Fetch from YouTube
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  
  // Cache it
  await db.collection('transcript_cache').doc(videoId).set({
    transcript,
    timestamp: Date.now()
  });
  
  return transcript;
}
```

**Benefits of caching:**
- Popular videos only fetched once per day
- Reduces YouTube API calls by 80-95%
- Faster response (no YouTube request)
- Protects against YouTube IP blocks

### Will YouTube Stop Your Service?

**Short answer: No, if you're reasonable.**

**What YouTube considers abuse:**
- ❌ 1000+ requests per minute (automated scraping)
- ❌ Downloading videos in bulk
- ❌ Bypassing age restrictions or private videos

**What's acceptable:**
- ✅ Fetching public captions at human-like rates (< 500/hour)
- ✅ Single-user note-taking app usage
- ✅ Educational or productivity tools

**If YouTube blocks you:**
- **Temporary** (1-6 hours typically)
- **IP-based** (use different server/IP to bypass)
- **Not account-based** (your YouTube account is safe)
- **No legal issues** (you're accessing public data)

### Recommended Configuration

**For < 100 users:**
```javascript
// Keep current setup
max: 40 per 15 minutes (160/hour total)
```

**For 100-1000 users:**
```javascript
// Increase global limit + add caching
max: 200 per 15 minutes
+ transcript caching (24 hours)
```

**For 1000+ users:**
```javascript
// Per-user limits + aggressive caching
max: 5 per user per 15 minutes
+ transcript caching (24 hours)
+ Redis for distributed rate limiting
```

### Summary Table

| Users | Strategy | YouTube API Calls | Block Risk |
|-------|----------|------------------|------------|
| < 50 | Current (40/15min) | ~160/hour | Very Low |
| 50-500 | Increase to 200/15min + cache | ~50-200/hour | Low |
| 500-5000 | Per-user limits + cache | ~50-300/hour | Very Low |
| 5000+ | Aggressive cache + CDN | ~100-500/hour | Low |

**Bottom line:** Your current setup is safe for small-to-medium usage. Add caching if you grow beyond 100 active users.
