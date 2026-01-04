#!/usr/bin/env node

/**
 * Security Configuration Generator
 * Run this script to generate secure API keys and configuration
 */

const crypto = require('crypto');

function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generateEnvTemplate() {
  const clientApiKey = generateSecureKey(32);
  const adminApiKey = generateSecureKey(32);
  
  console.log('\n🔐 Generated Security Configuration\n');
  console.log('Copy these values to your environment variables:\n');
  
  console.log('# Client API Key (for AI/Web Summary endpoints)');
  console.log(`CLIENT_API_KEY=${clientApiKey}\n`);
  
  console.log('# Admin API Key (for monitoring endpoints)');
  console.log(`ADMIN_API_KEY=${adminApiKey}\n`);
  
  console.log('# Production CORS Origins (update with your actual domains)');
  console.log('ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com\n');
  
  console.log('⚠️  IMPORTANT SECURITY NOTES:');
  console.log('1. Keep these keys SECRET - never commit them to version control');
  console.log('2. Use different keys for development and production');
  console.log('3. Rotate keys regularly (every 90 days recommended)');
  console.log('4. Set up monitoring alerts for unusual usage patterns');
  console.log('5. Configure ALLOWED_ORIGINS to only include your actual domains');
  
  return { clientApiKey, adminApiKey };
}

if (require.main === module) {
  generateEnvTemplate();
}

module.exports = { generateSecureKey, generateEnvTemplate };