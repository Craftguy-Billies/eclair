// API Key authentication middleware for admin endpoints only
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['x-admin-key'] || req.query.apiKey;
  const validApiKey = process.env.ADMIN_API_KEY;
  
  // Only required for admin monitoring endpoints
  if (!validApiKey) {
    return res.status(500).json({
      error: 'Admin API key not configured',
      message: 'ADMIN_API_KEY environment variable required for monitoring endpoints'
    });
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      error: 'Invalid admin API key',
      message: 'Valid admin API key required for monitoring endpoints'
    });
  }
  
  next();
};

// Request monitoring middleware
const requestMonitor = (req, res, next) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Log expensive operations
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${clientIP}`);
  
  // Monitor response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Response: ${res.statusCode} - Duration: ${duration}ms`);
    originalSend.call(res, data);
  };
  
  next();
};

// Content validation middleware
const validateContent = (req, res, next) => {
  // Check for potentially harmful content
  const suspiciousPatterns = [
    /javascript:/i,
    /<script/i,
    /eval\(/i,
    /document\./i,
    /window\./i
  ];
  
  const content = JSON.stringify(req.body);
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      console.warn(`Suspicious content detected from ${req.ip}: ${content.substring(0, 100)}`);
      return res.status(400).json({
        error: 'Invalid content',
        message: 'Request contains potentially harmful content'
      });
    }
  }
  
  next();
};

// Usage quota tracking (simple in-memory - use Redis in production)
const usageTracker = {
  daily: new Map(),
  
  track(identifier, cost = 1) {
    const today = new Date().toDateString();
    const key = `${identifier}:${today}`;
    const current = this.daily.get(key) || 0;
    this.daily.set(key, current + cost);
    return current + cost;
  },
  
  getUsage(identifier) {
    const today = new Date().toDateString();
    const key = `${identifier}:${today}`;
    return this.daily.get(key) || 0;
  },
  
  checkLimit(identifier, limit) {
    return this.getUsage(identifier) < limit;
  },
  
  // Clean old entries (call this periodically)
  cleanup() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    const cutoff = yesterday.toDateString();
    
    for (const [key] of this.daily) {
      if (key.includes(cutoff)) {
        this.daily.delete(key);
      }
    }
  }
};

// Daily quota middleware for expensive operations
const dailyQuotaCheck = (limit) => (req, res, next) => {
  const identifier = req.ip; // In production, use authenticated user ID
  
  if (!usageTracker.checkLimit(identifier, limit)) {
    return res.status(429).json({
      error: 'Daily quota exceeded',
      message: `Daily limit of ${limit} requests exceeded`,
      usage: usageTracker.getUsage(identifier),
      resetTime: 'Tomorrow at midnight UTC'
    });
  }
  
  // Track this request
  const newUsage = usageTracker.track(identifier);
  
  // Add usage info to response headers
  res.set({
    'X-Daily-Usage': newUsage,
    'X-Daily-Limit': limit,
    'X-Daily-Remaining': Math.max(0, limit - newUsage)
  });
  
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  });
  next();
};

module.exports = {
  validateApiKey,
  requestMonitor,
  validateContent,
  dailyQuotaCheck,
  usageTracker,
  securityHeaders
};