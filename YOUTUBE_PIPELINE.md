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
