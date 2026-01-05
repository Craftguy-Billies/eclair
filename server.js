const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import route modules
const aiRoutes = require('./routes/ai');
const webSummaryRoutes = require('./routes/web-summary');
const youtubeSummaryRoutes = require('./routes/youtube-summary');
const notesRoutes = require('./routes/notes');
const workspacesRoutes = require('./routes/workspaces');
const monitoringRoutes = require('./routes/monitoring');

// Import security middleware
const { 
  validateApiKey, 
  requestMonitor, 
  validateContent, 
  dailyQuotaCheck,
  securityHeaders 
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers

// Configure CORS properly
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or direct file:// access)
    if (!origin) return callback(null, true);
    
    // In production, check against allowed origins
    if (process.env.NODE_ENV === 'production' && process.env.ALLOWED_ORIGINS) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // In development or if no ALLOWED_ORIGINS set, allow all
      callback(null, true);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};
app.use(cors(corsOptions));

// Strict request size limits
app.use(express.json({ 
  limit: '1mb', // Reduced from 10mb
  strict: true
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '1mb' 
}));
app.use(express.urlencoded({ extended: true }));

// Rate limiting - Reasonable limits for different endpoint types
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // General endpoints - back to original
  message: { error: 'Too many requests', message: 'Please try again later', retryAfter: 900 },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // AI endpoints - reasonable limit
  message: { error: 'AI quota exceeded', message: 'AI requests limited to 50 per 15 minutes', retryAfter: 900 },
  standardHeaders: true,
  legacyHeaders: false,
});

const webSummaryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Web scraping endpoints
  message: { error: 'Web summary quota exceeded', message: 'Limited to 30 web summaries per 15 minutes', retryAfter: 900 },
  standardHeaders: true,
  legacyHeaders: false,
});

const youtubeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40, // YouTube transcription endpoints
  message: { error: 'YouTube summary quota exceeded', message: 'Limited to 40 YouTube summaries per 15 minutes', retryAfter: 900 },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/', generalLimiter);
app.use('/api/ai', aiLimiter);
app.use('/api/web-summary', webSummaryLimiter);
app.use('/api/youtube-summary', youtubeLimiter);

// Security middleware
app.use(securityHeaders);
app.use(requestMonitor);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Note-taking backend is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes with essential security
app.use('/api/ai', validateContent, aiRoutes); // NVIDIA key secured in environment
app.use('/api/web-summary', validateContent, webSummaryRoutes); // No extra auth needed
app.use('/api/youtube-summary', validateContent, youtubeSummaryRoutes); // No extra auth needed
app.use('/api/notes', validateContent, notesRoutes); // Firebase auth handles this
app.use('/api/workspaces', validateContent, workspacesRoutes); // Firebase auth handles this
app.use('/api/monitoring', validateApiKey, monitoringRoutes); // Admin only

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;