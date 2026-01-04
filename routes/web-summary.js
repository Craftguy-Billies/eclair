const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
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

// Function to extract main content from HTML (similar to trafilatura)
function extractMainContent(html, url) {
  const $ = cheerio.load(html);
  
  // Remove unwanted elements
  $('script, style, nav, header, footer, aside, .advertisement, .ads, .sidebar, .navigation').remove();
  
  // Try to find main content containers
  let content = '';
  
  // Common main content selectors
  const mainSelectors = [
    'main',
    '[role="main"]',
    '.main-content',
    '.content',
    '.post-content',
    '.article-content',
    '.entry-content',
    'article',
    '.article-body'
  ];
  
  for (const selector of mainSelectors) {
    const element = $(selector);
    if (element.length > 0 && element.text().trim().length > content.length) {
      content = element.text().trim();
    }
  }
  
  // If no main content found, try to extract from paragraphs
  if (!content || content.length < 100) {
    const paragraphs = $('p').map((i, el) => $(el).text().trim()).get();
    content = paragraphs.join('\n\n');
  }
  
  // If still no good content, fall back to body text
  if (!content || content.length < 100) {
    content = $('body').text().trim();
  }
  
  // Clean up whitespace and normalize
  content = content.replace(/\s+/g, ' ').trim();
  
  return {
    content,
    title: $('title').text().trim() || url,
    url
  };
}

// Function to validate URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// POST /api/web-summary/extract - Extract content from URL
router.post('/extract', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required',
        message: 'Please provide a URL to extract content from'
      });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'Please provide a valid HTTP/HTTPS URL'
      });
    }

    // Set timeout for crawling
    const timeout = parseInt(process.env.CRAWL_TIMEOUT) || 10000;
    
    const response = await axios.get(url, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NoteBot/1.0; +https://your-domain.com/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive'
      }
    });

    const extracted = extractMainContent(response.data, url);
    
    if (!extracted.content || extracted.content.length < 50) {
      return res.status(400).json({
        error: 'No content found',
        message: 'Unable to extract meaningful content from the provided URL'
      });
    }

    res.json({
      success: true,
      data: extracted,
      stats: {
        contentLength: extracted.content.length,
        extractedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Content extraction error:', error);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        error: 'Request timeout',
        message: 'The website took too long to respond'
      });
    }
    
    if (error.response) {
      return res.status(error.response.status || 500).json({
        error: 'Failed to fetch content',
        message: `HTTP ${error.response.status}: ${error.response.statusText}`
      });
    }
    
    res.status(500).json({
      error: 'Content extraction failed',
      message: error.message || 'Unable to extract content from the URL'
    });
  }
});

// POST /api/web-summary/summarize - Extract and summarize web content
router.post('/summarize', async (req, res) => {
  try {
    const { url, summary_type = 'general' } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required',
        message: 'Please provide a URL to summarize'
      });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'Please provide a valid HTTP/HTTPS URL'
      });
    }

    // Set response headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial status
    res.write(`data: ${JSON.stringify({ status: 'extracting', message: 'Extracting content from URL...' })}\n\n`);

    // Extract content
    const timeout = parseInt(process.env.CRAWL_TIMEOUT) || 10000;
    
    const response = await axios.get(url, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NoteBot/1.0; +https://your-domain.com/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive'
      }
    });

    const extracted = extractMainContent(response.data, url);
    
    if (!extracted.content || extracted.content.length < 50) {
      res.write(`data: ${JSON.stringify({ error: 'No content found', message: 'Unable to extract meaningful content from URL' })}\n\n`);
      return res.end();
    }

    // Send extraction complete status
    res.write(`data: ${JSON.stringify({ status: 'summarizing', message: 'Generating AI summary...', title: extracted.title })}\n\n`);

    // Truncate content if too long
    const maxContentLength = parseInt(process.env.MAX_CONTENT_LENGTH) || 50000;
    const content = extracted.content.length > maxContentLength 
      ? extracted.content.substring(0, maxContentLength) + '...[content truncated]'
      : extracted.content;

    // Prepare AI prompt
    let promptTemplate = '';
    switch (summary_type) {
      case 'bullet_points':
        promptTemplate = `Summarize the following web content in clear bullet points. Include the main topics, key insights, and important details:\n\nTitle: ${extracted.title}\nURL: ${url}\n\nContent:\n`;
        break;
      case 'brief':
        promptTemplate = `Provide a brief, concise summary (2-3 sentences) of the following web content:\n\nTitle: ${extracted.title}\nURL: ${url}\n\nContent:\n`;
        break;
      case 'detailed':
        promptTemplate = `Provide a comprehensive, detailed summary of the following web content. Include main topics, key points, important details, and any conclusions:\n\nTitle: ${extracted.title}\nURL: ${url}\n\nContent:\n`;
        break;
      default:
        promptTemplate = `Summarize the following web content in a clear, organized manner:\n\nTitle: ${extracted.title}\nURL: ${url}\n\nContent:\n`;
    }

    const fullPrompt = promptTemplate + content;

    // Generate AI summary with streaming
    const completion = await client.chat.completions.create({
      model: "deepseek-ai/deepseek-r1-distill-qwen-14b",
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.3,
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
    const cleanedSummary = removeThinkBlocks(fullResponse);
    
    const finalData = {
      content: '',
      finished: true,
      fullResponse: cleanedSummary,
      metadata: {
        url: extracted.url,
        title: extracted.title,
        originalLength: extracted.content.length,
        summaryType: summary_type,
        truncated: extracted.content.length > maxContentLength,
        extractedAt: new Date().toISOString()
      }
    };

    res.write(`data: ${JSON.stringify(finalData)}\n\n`);
    res.end();

  } catch (error) {
    console.error('Web summarization error:', error);
    
    if (!res.headersSent) {
      if (error.code === 'ECONNABORTED') {
        return res.status(408).json({
          error: 'Request timeout',
          message: 'The website took too long to respond'
        });
      }
      
      if (error.response) {
        return res.status(error.response.status || 500).json({
          error: 'Failed to fetch content',
          message: `HTTP ${error.response.status}: ${error.response.statusText}`
        });
      }
      
      res.status(500).json({
        error: 'Web summarization failed',
        message: error.message || 'Failed to summarize web content'
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Web summarization failed', message: error.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;