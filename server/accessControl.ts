import { Request, Response, NextFunction } from 'express';

// Get real IP address
function getRealIP(req: Request): string {
  return req.ip || 
         req.connection.remoteAddress || 
         req.get('X-Forwarded-For')?.split(',')[0] || 
         req.get('X-Real-IP') || 
         '0.0.0.0';
}

// Access control middleware - DISABLED
export function accessControlMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientIP = getRealIP(req);
  console.log(`Access attempt from IP: ${clientIP} - APPROVED`);
  
  // Allow all access - whitelist disabled
  return next();
}

// Placeholder functions for admin panel compatibility
export function addAuthorizedIP(ip: string): void {
  console.log(`IP whitelist disabled - ${ip} would be added`);
}

export function addAuthorizedDevice(deviceFingerprint: string): void {
  console.log(`Device whitelist disabled - ${deviceFingerprint} would be added`);
}

export function removeAuthorization(ip?: string, device?: string): void {
  console.log(`Whitelist disabled - authorization removal skipped`);
}

export function listAuthorizations() {
  return {
    allowedIPs: ['WHITELIST_DISABLED'],
    allowedDevices: ['WHITELIST_DISABLED'],
    adminKeys: ['***HIDDEN***']
  };
}