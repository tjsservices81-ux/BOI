import { Request, Response, NextFunction } from 'express';

// Rate limiting for brute force protection
const rateLimitStore = new Map<string, { count: number; lastAttempt: number }>();

export function rateLimitMiddleware(maxAttempts: number = 10, windowMs: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '0.0.0.0';
    const now = Date.now();
    
    const record = rateLimitStore.get(clientIP);
    
    if (record) {
      // Reset count if window has passed
      if (now - record.lastAttempt > windowMs) {
        record.count = 1;
        record.lastAttempt = now;
      } else {
        record.count++;
        record.lastAttempt = now;
        
        if (record.count > maxAttempts) {
          return res.status(429).json({
            error: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((windowMs - (now - record.lastAttempt)) / 1000)
          });
        }
      }
    } else {
      rateLimitStore.set(clientIP, { count: 1, lastAttempt: now });
    }
    
    next();
  };
}

// Security headers middleware
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent content type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'no-referrer');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; " +
    "connect-src 'self'; " +
    "font-src 'self'; " +
    "frame-ancestors 'none';"
  );
  
  // HSTS (HTTP Strict Transport Security)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Remove server signature
  res.removeHeader('X-Powered-By');
  
  next();
}

// Geo-blocking middleware (example for high-risk countries)
const blockedCountries = ['CN', 'RU', 'KP']; // Add country codes as needed

export function geoBlockingMiddleware(req: Request, res: Response, next: NextFunction) {
  // This would typically use a GeoIP service
  // For now, we'll skip this check but structure is ready
  next();
}

// Session security
export function sessionSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.session) {
    // Check for session hijacking
    const userAgent = req.get('User-Agent') || '';
    const storedUA = req.session.userAgent;
    
    if (storedUA && storedUA !== userAgent) {
      // Log security violation but don't destroy session - users stay logged in permanently
      console.log('⚠️ User agent change detected but session preserved for permanent login');
      // Don't destroy session - just update the stored user agent
      req.session.userAgent = userAgent;
    }
    
    // Store user agent on first login
    if (!storedUA) {
      req.session.userAgent = userAgent;
    }
  }
  
  next();
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now - record.lastAttempt > windowMs) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes