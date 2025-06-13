// Emergency panic mode for instant lockdown
let panicModeActive = false;
let panicModeActivatedAt: Date | null = null;
let panicModeReason = '';

export function activatePanicMode(reason: string = 'Emergency lockdown'): void {
  panicModeActive = true;
  panicModeActivatedAt = new Date();
  panicModeReason = reason;
  console.log(`🚨 PANIC MODE ACTIVATED: ${reason} at ${panicModeActivatedAt.toISOString()}`);
}

export function deactivatePanicMode(): void {
  panicModeActive = false;
  panicModeActivatedAt = null;
  panicModeReason = '';
  console.log('✅ Panic mode deactivated - normal operations resumed');
}

export function isPanicModeActive(): boolean {
  return panicModeActive;
}

export function getPanicModeStatus() {
  return {
    active: panicModeActive,
    activatedAt: panicModeActivatedAt,
    reason: panicModeReason
  };
}

// Middleware to block ALL access during panic mode
export function panicModeMiddleware(req: any, res: any, next: any) {
  if (panicModeActive && !req.path.startsWith('/admin/')) {
    return res.status(503).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Service Temporarily Unavailable</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #f5f5f5; 
          }
          .container { 
            max-width: 500px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 10px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
          }
          h1 { color: #e74c3c; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Service Temporarily Unavailable</h1>
          <p>We are currently performing essential maintenance.</p>
          <p>Please try again later.</p>
          <p><small>Error Code: 503</small></p>
        </div>
      </body>
      </html>
    `);
  }
  next();
}