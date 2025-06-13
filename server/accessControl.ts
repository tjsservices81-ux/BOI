import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Authorized access list - only these can access your app
const AUTHORIZED_ACCESS = {
  // Add specific IPs you want to allow
  allowedIPs: new Set<string>([
    '127.0.0.1', // localhost for development
    '72.136.118.136', // Your primary IP
    '72.136.119.203', // Your current IP
    // Add your IP addresses here
  ]),
  
  // Device fingerprints you've approved
  allowedDevices: new Set<string>([
    // Device fingerprints will be added when you approve them
  ]),
  
  // Master admin keys for emergency access
  adminKeys: new Set<string>([
    'BOI_ADMIN_2025_SECURE', // Change this to your secret key
  ])
};

// Generate device fingerprint from request headers
function generateDeviceFingerprint(req: Request): string {
  const userAgent = req.get('User-Agent') || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  const acceptEncoding = req.get('Accept-Encoding') || '';
  const connection = req.get('Connection') || '';
  
  const fingerprint = userAgent + acceptLanguage + acceptEncoding + connection;
  return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 16);
}

// Get real IP address
function getRealIP(req: Request): string {
  return req.ip || 
         req.connection.remoteAddress || 
         req.get('X-Forwarded-For')?.split(',')[0] || 
         req.get('X-Real-IP') || 
         '0.0.0.0';
}

// Access control middleware
export function accessControlMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip access control for static assets and API health checks
  if (req.path.includes('.') || req.path === '/api/health') {
    return next();
  }

  const clientIP = getRealIP(req);
  const deviceFingerprint = generateDeviceFingerprint(req);
  const adminKey = req.get('X-Admin-Key');

  console.log(`Access attempt from IP: ${clientIP}, Device: ${deviceFingerprint}`);

  // Check admin key first
  if (adminKey && AUTHORIZED_ACCESS.adminKeys.has(adminKey)) {
    console.log(`Admin access granted for key: ${adminKey}`);
    return next();
  }

  // Check if IP is authorized
  const ipAuthorized = AUTHORIZED_ACCESS.allowedIPs.has(clientIP);
  
  // Check if device is authorized
  const deviceAuthorized = AUTHORIZED_ACCESS.allowedDevices.has(deviceFingerprint);

  // Allow access if either IP or device is authorized
  if (ipAuthorized || deviceAuthorized) {
    console.log(`Access granted - IP: ${ipAuthorized}, Device: ${deviceAuthorized}`);
    return next();
  }

  // Log unauthorized access attempt
  console.log(`UNAUTHORIZED ACCESS BLOCKED - IP: ${clientIP}, Device: ${deviceFingerprint}`);
  
  // Return access denied page
  res.status(403).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Access Denied</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px; 
          background: #f5f5f5; 
        }
        .container { 
          background: white; 
          padding: 30px; 
          border-radius: 10px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
          max-width: 400px; 
          margin: 0 auto; 
        }
        .logo { 
          color: #0000ff; 
          font-size: 24px; 
          font-weight: bold; 
          margin-bottom: 20px; 
        }
        .message { 
          color: #333; 
          font-size: 16px; 
          margin-bottom: 20px; 
        }
        .details { 
          background: #f8f8f8; 
          padding: 15px; 
          border-radius: 5px; 
          font-family: monospace; 
          font-size: 12px; 
          color: #666; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🏦 Bank of Ireland</div>
        <div class="message">
          <h2>Access Denied</h2>
          <p>This application requires authorization.</p>
          <p>Contact the administrator to request access.</p>
        </div>
        <div class="details">
          Device ID: ${deviceFingerprint}<br>
          Request Time: ${new Date().toISOString()}
        </div>
      </div>
    </body>
    </html>
  `);
}

// Function to add authorized IP
export function addAuthorizedIP(ip: string): void {
  AUTHORIZED_ACCESS.allowedIPs.add(ip);
  console.log(`Added authorized IP: ${ip}`);
}

// Function to add authorized device
export function addAuthorizedDevice(deviceFingerprint: string): void {
  AUTHORIZED_ACCESS.allowedDevices.add(deviceFingerprint);
  console.log(`Added authorized device: ${deviceFingerprint}`);
}

// Function to remove authorization
export function removeAuthorization(ip?: string, device?: string): void {
  if (ip) {
    AUTHORIZED_ACCESS.allowedIPs.delete(ip);
    console.log(`Removed authorized IP: ${ip}`);
  }
  if (device) {
    AUTHORIZED_ACCESS.allowedDevices.delete(device);
    console.log(`Removed authorized device: ${device}`);
  }
}

// Function to list current authorizations
export function listAuthorizations() {
  return {
    allowedIPs: Array.from(AUTHORIZED_ACCESS.allowedIPs),
    allowedDevices: Array.from(AUTHORIZED_ACCESS.allowedDevices),
    adminKeys: Array.from(AUTHORIZED_ACCESS.adminKeys).map(() => '***HIDDEN***')
  };
}