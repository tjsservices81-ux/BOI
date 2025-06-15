import { Request, Response, NextFunction } from 'express';
import { logAccessAttempt } from './accessMonitor';

// Whitelist of approved IP addresses - only these can access your app
const APPROVED_IPS = new Set<string>([
  '127.0.0.1',     // localhost for development
  '::1',           // localhost IPv6
  '0.0.0.0',       // development fallback
  '72.136.118.136', // User's approved IP address
  // Add your specific IP addresses here when you want to approve them
]);

// Get the real client IP address
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIP = req.headers['x-real-ip'] as string;
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return req.connection.remoteAddress || req.socket.remoteAddress || '0.0.0.0';
}

// Middleware to block unauthorized IP addresses
export function ipWhitelistMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip IP check for static assets and admin routes
  if (req.path.includes('.css') || 
      req.path.includes('.js') || 
      req.path.includes('.png') || 
      req.path.includes('.jpg') || 
      req.path.includes('.ico') ||
      req.path.includes('.svg') ||
      req.path.includes('.woff') ||
      req.path.startsWith('/admin/')) {
    return next();
  }

  const clientIP = getClientIP(req);
  const isAuthorized = APPROVED_IPS.has(clientIP);
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  console.log(`Access attempt from IP: ${clientIP} - ${isAuthorized ? 'APPROVED' : 'BLOCKED'}`);
  
  // Log the access attempt for monitoring
  logAccessAttempt(clientIP, userAgent, isAuthorized);
  
  if (!isAuthorized) {
    // Log the blocked attempt
    console.log(`BLOCKED: Unauthorized access attempt from IP: ${clientIP}`);
    
    // Return access denied page
    res.status(403).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Restricted</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          }
          
          body {
            background: linear-gradient(135deg, #0000ff 0%, #126987 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          
          .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
            width: 100%;
          }
          
          .logo {
            width: 60px;
            height: 60px;
            background: #0000ff;
            border-radius: 15px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
          }
          
          h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 15px;
          }
          
          p {
            color: #666;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 25px;
          }
          
          .request-info {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            font-family: monospace;
            font-size: 12px;
            color: #495057;
            border-left: 4px solid #0000ff;
          }
          
          .contact-info {
            margin-top: 25px;
            padding: 20px;
            background: #e7f3ff;
            border-radius: 10px;
            font-size: 14px;
            color: #0066cc;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🏦</div>
          <h1>Access Restricted</h1>
          <p>This banking application is restricted to authorized users only. Your access request has been logged for security purposes.</p>
          
          <div class="request-info">
            Request ID: ${Date.now()}<br>
            Timestamp: ${new Date().toISOString()}<br>
            Source: ${clientIP}
          </div>
          
          <div class="contact-info">
            <strong>Need Access?</strong><br>
            Contact the application administrator to request authorization for your device and location.
          </div>
        </div>
      </body>
      </html>
    `);
    return;
  }
  
  // IP is approved, continue to next middleware
  next();
}

// Function to add an IP to the whitelist
export function approveIP(ip: string): boolean {
  APPROVED_IPS.add(ip);
  console.log(`✓ IP ${ip} has been approved for access`);
  return true;
}

// Function to remove an IP from the whitelist
export function revokeIP(ip: string): boolean {
  const removed = APPROVED_IPS.delete(ip);
  if (removed) {
    console.log(`✗ IP ${ip} access has been revoked`);
  }
  return removed;
}

// Function to list all approved IPs
export function listApprovedIPs(): string[] {
  return Array.from(APPROVED_IPS);
}

// Function to get all approved IPs (alias for admin panel)
export function getAllApprovedIPs(): string[] {
  return Array.from(APPROVED_IPS);
}

// Function to check if an IP is approved
export function isIPApproved(ip: string): boolean {
  return APPROVED_IPS.has(ip);
}