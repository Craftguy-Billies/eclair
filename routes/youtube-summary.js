const express = require('express');
const { YoutubeTranscript } = require('youtube-transcript');
const { OpenAI } = require('openai');
const router = express.Router();

// Initialize OpenAI client for NVIDIA
const client = new OpenAI({
  baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY
});

// Function to remove <think></think> blocks
function removeThinkBlocks(text) {
  if (!text) return text;
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

// Extract video ID from various YouTube URL formats
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  throw new Error('Invalid YouTube URL format');
}

// POST /api/youtube-summary/summarize - Get YouTube video transcript and summarize
router.post('/summarize', async (req, res) => {
  try {
    const { videoUrl, summaryType = 'concise' } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ 
        error: 'Video URL is required',
        message: 'Please provide a YouTube video URL'
      });
    }

    // Step 1: Extract video ID
    let videoId;
    try {
      videoId = extractVideoId(videoUrl);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid YouTube URL',
        message: 'Please provide a valid YouTube video URL or video ID'
      });
    }

    // Step 2: Fetch transcript from YouTube
    let transcriptData;
    let fullTranscript;
    
    try {
      transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
      fullTranscript = transcriptData.map(item => item.text).join(' ');
      
      if (!fullTranscript || fullTranscript.trim().length < 10) {
        return res.status(404).json({ 
          error: 'No transcript available',
          message: 'This video does not have captions/subtitles available'
        });
      }
    } catch (error) {
      return res.status(404).json({ 
        error: 'Transcript not available',
        message: 'This video does not have captions/subtitles. The video might be private, deleted, or has disabled captions.',
        details: error.message
      });
    }

    // Step 3: Prepare summary prompt based on type
    let systemPrompt;
    let userPrompt;

    if (summaryType === 'detailed') {
      systemPrompt = 'You are a helpful assistant that creates detailed summaries of video transcripts. Break down the content into key sections with bullet points.';
      userPrompt = `Create a detailed summary of this YouTube video transcript. Include:\n1. Main topic/title\n2. Key points covered (bullet points)\n3. Important details or examples\n4. Conclusion\n\nTranscript:\n${fullTranscript}`;
    } else if (summaryType === 'bullet') {
      systemPrompt = 'You are a helpful assistant that creates concise bullet-point summaries.';
      userPrompt = `Summarize this YouTube video transcript as bullet points (5-8 points maximum):\n\n${fullTranscript}`;
    } else { // concise (default)
      systemPrompt = 'You are a helpful assistant that creates very concise summaries. Keep summaries to 2-3 sentences maximum.';
      userPrompt = `Summarize this YouTube video transcript in 2-3 sentences:\n\n${fullTranscript}`;
    }

    // Step 4: Generate summary using NVIDIA AI
    const completion = await client.chat.completions.create({
      model: process.env.NVIDIA_MODEL || 'deepseek/deepseek-r1-distill-qwen-14b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: summaryType === 'detailed' ? 1500 : (summaryType === 'bullet' ? 800 : 300),
      stream: false
    });

    const rawSummary = completion.choices[0]?.message?.content || 'No summary generated';
    const summary = removeThinkBlocks(rawSummary);

    // Step 5: Return response
    res.json({
      success: true,
      videoId,
      summary,
      summaryType,
      transcriptLength: fullTranscript.length,
      transcriptWordCount: fullTranscript.split(/\s+/).length,
      videoDuration: transcriptData[transcriptData.length - 1]?.offset || 0,
      fullTranscript: fullTranscript.substring(0, 1000) + (fullTranscript.length > 1000 ? '...' : '') // Return first 1000 chars
    });

  } catch (error) {
    console.error('YouTube summary error:', error);
    res.status(500).json({ 
      error: 'Failed to generate summary',
      message: error.message 
    });
  }
});

// GET /api/youtube-summary/transcript/:videoId - Get raw transcript only
router.get('/transcript/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId || videoId.length !== 11) {
      return res.status(400).json({ 
        error: 'Invalid video ID',
        message: 'Please provide a valid 11-character YouTube video ID'
      });
    }

    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
    const fullTranscript = transcriptData.map(item => item.text).join(' ');

    res.json({
      success: true,
      videoId,
      transcript: fullTranscript,
      wordCount: fullTranscript.split(/\s+/).length,
      duration: transcriptData[transcriptData.length - 1]?.offset || 0,
      segments: transcriptData.length
    });

  } catch (error) {
    console.error('Transcript fetch error:', error);
    res.status(404).json({ 
      error: 'Transcript not available',
      message: error.message 
    });
  }
});

module.exports = router;
