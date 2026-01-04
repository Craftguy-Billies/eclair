const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Additional monitoring endpoint for admins
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Very restrictive for admin endpoints
  message: { error: 'Admin access rate limited', retryAfter: 900 }
});

// Simple monitoring endpoint (protect this in production with admin auth)
router.get('/stats', adminLimiter, (req, res) => {
  const { usageTracker } = require('../middleware/security');
  
  // Only show stats if admin API key is provided
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Admin access required' });
  }
  
  const stats = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    activeConnections: process.listeners('connection').length,
    dailyUsage: Object.fromEntries(usageTracker.daily),
    environment: process.env.NODE_ENV
  };
  
  res.json(stats);
});

// Health check with security validation
router.get('/security', (req, res) => {
  const checks = {
    corsConfigured: !!process.env.ALLOWED_ORIGINS,
    apiKeyConfigured: !!process.env.CLIENT_API_KEY,
    rateLimitingActive: true,
    httpsOnly: req.secure || req.headers['x-forwarded-proto'] === 'https',
    securityHeaders: !!req.headers['x-content-type-options']
  };
  
  const allPassed = Object.values(checks).every(Boolean);
  
  res.json({
    status: allPassed ? 'secure' : 'warning',
    checks,
    recommendations: allPassed ? [] : [
      !checks.corsConfigured && 'Configure ALLOWED_ORIGINS environment variable',
      !checks.apiKeyConfigured && 'Set CLIENT_API_KEY for API protection',
      !checks.httpsOnly && 'Enable HTTPS in production'
    ].filter(Boolean)
  });
});

module.exports = router;