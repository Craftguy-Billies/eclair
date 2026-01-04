const express = require('express');
const { OpenAI } = require('openai');
const router = express.Router();

// Initialize OpenAI client for NVIDIA
const client = new OpenAI({
  baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY
});

// Function to remove <think></think> blocks from AI response
function removeThinkBlocks(text) {
  if (!text) return text;
  // Remove <think>...</think> blocks including multiline content
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

// POST /api/ai/chat - General chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { prompt, temperature = 0.6, max_tokens = 4096 } = req.body;

    if (!prompt) {
      return res.status(400).json({ 
        error: 'Prompt is required',
        message: 'Please provide a prompt in the request body'
      });
    }

    // Set response headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const completion = await client.chat.completions.create({
      model: "deepseek-ai/deepseek-r1-distill-qwen-14b",
      messages: [{ role: "user", content: prompt }],
      temperature: parseFloat(temperature),
      top_p: 0.7,
      max_tokens: parseInt(max_tokens),
      stream: true
    });

    let fullResponse = '';

    for await (const chunk of completion) {
      if (chunk.choices[0]?.delta?.content) {
        const content = chunk.choices[0].delta.content;
        fullResponse += content;
        
        // Send chunk to client
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Remove think blocks from the full response and send final cleaned version
    const cleanedResponse = removeThinkBlocks(fullResponse);
    res.write(`data: ${JSON.stringify({ content: '', finished: true, fullResponse: cleanedResponse })}\n\n`);
    res.end();

  } catch (error) {
    console.error('AI Chat Error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'AI service error',
        message: error.message || 'Failed to generate response'
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'AI service error', message: error.message })}\n\n`);
      res.end();
    }
  }
});

// POST /api/ai/generate-note - Generate or expand notes
router.post('/generate-note', async (req, res) => {
  try {
    const { prompt, context = '', action = 'generate' } = req.body;

    if (!prompt) {
      return res.status(400).json({ 
        error: 'Prompt is required',
        message: 'Please provide a prompt for note generation'
      });
    }

    let systemPrompt = '';
    switch (action) {
      case 'expand':
        systemPrompt = 'You are a helpful assistant that expands and elaborates on ideas for note-taking. Provide detailed, well-structured content that builds upon the given prompt.';
        break;
      case 'summarize':
        systemPrompt = 'You are a helpful assistant that creates concise summaries for note-taking. Provide clear, bullet-pointed summaries of the given content.';
        break;
      default:
        systemPrompt = 'You are a helpful assistant for note-taking. Generate well-organized, informative notes based on the given prompt.';
    }

    const fullPrompt = context 
      ? `${systemPrompt}\n\nContext: ${context}\n\nTask: ${prompt}`
      : `${systemPrompt}\n\nTask: ${prompt}`;

    // Set response headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const completion = await client.chat.completions.create({
      model: "deepseek-ai/deepseek-r1-distill-qwen-14b",
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.7,
      top_p: 0.8,
      max_tokens: 2048,
      stream: true
    });

    let fullResponse = '';

    for await (const chunk of completion) {
      if (chunk.choices[0]?.delta?.content) {
        const content = chunk.choices[0].delta.content;
        fullResponse += content;
        
        // Send chunk to client
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Remove think blocks and send final response
    const cleanedResponse = removeThinkBlocks(fullResponse);
    res.write(`data: ${JSON.stringify({ content: '', finished: true, fullResponse: cleanedResponse })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Note Generation Error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Note generation failed',
        message: error.message || 'Failed to generate note content'
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Note generation failed', message: error.message })}\n\n`);
      res.end();
    }
  }
});

// POST /api/ai/summarize - Summarize provided text
router.post('/summarize', async (req, res) => {
  try {
    const { content, summary_type = 'general' } = req.body;

    if (!content) {
      return res.status(400).json({ 
        error: 'Content is required',
        message: 'Please provide content to summarize'
      });
    }

    // Truncate content if too long to avoid token limits
    const maxContentLength = parseInt(process.env.MAX_CONTENT_LENGTH) || 50000;
    const truncatedContent = content.length > maxContentLength 
      ? content.substring(0, maxContentLength) + '...[content truncated]'
      : content;

    let promptTemplate = '';
    switch (summary_type) {
      case 'bullet_points':
        promptTemplate = 'Summarize the following content in clear bullet points:\n\n';
        break;
      case 'brief':
        promptTemplate = 'Provide a brief, concise summary (2-3 sentences) of the following content:\n\n';
        break;
      default:
        promptTemplate = 'Provide a comprehensive summary of the following content:\n\n';
    }

    const fullPrompt = promptTemplate + truncatedContent;

    // Non-streaming response for summarization
    const completion = await client.chat.completions.create({
      model: "deepseek-ai/deepseek-r1-distill-qwen-14b",
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.3,
      top_p: 0.8,
      max_tokens: 1024,
      stream: false
    });

    let summary = completion.choices[0]?.message?.content || '';
    summary = removeThinkBlocks(summary);

    res.json({ 
      summary,
      original_length: content.length,
      summary_type,
      truncated: content.length > maxContentLength
    });

  } catch (error) {
    console.error('Summarization Error:', error);
    res.status(500).json({ 
      error: 'Summarization failed',
      message: error.message || 'Failed to summarize content'
    });
  }
});

module.exports = router;