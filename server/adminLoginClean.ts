import express from 'express';

const router = express.Router();

// Admin authentication middleware
function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const isAuthenticated = req.session && req.session.adminAuth === true;
  if (!isAuthenticated) {
    return res.redirect('/admin/login');
  }
  next();
}

// Admin login page
router.get('/login', (req, res) => {
  const loginPage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no">
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="default">
      <meta name="format-detection" content="telephone=no">
      <title>Bank of Ireland - Admin Access</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html {
          -webkit-text-size-adjust: 100%;
          font-size: 16px;
          height: 100%;
        }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
          background: #0050AA;
          margin: 0; 
          padding: 0; 
          min-height: 100vh; 
          position: relative;
          -webkit-user-select: none;
          user-select: none;
          touch-action: manipulation;
          overflow-x: hidden;
        }
        
        .ios-safe-area {
          min-height: 100vh;
          min-height: 100dvh;
          padding-top: env(safe-area-inset-top, 0px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          padding-left: env(safe-area-inset-left, 0px);
          padding-right: env(safe-area-inset-right, 0px);
          display: flex;
          flex-direction: column;
        }
        
        .header-section {
          background: #0050AA;
          padding: 2rem 1.5rem 1rem 1.5rem;
          text-align: center;
          flex-shrink: 0;
        }
        
        .boi-logo {
          width: 120px;
          height: 40px;
          background: white;
          border-radius: 4px;
          margin: 0 auto 1.5rem auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          color: #0050AA;
          letter-spacing: 1px;
        }
        
        .header-title {
          color: white;
          font-size: 1.5rem;
          font-weight: 300;
          margin-bottom: 0.5rem;
          letter-spacing: -0.5px;
        }
        
        .header-subtitle {
          color: rgba(255,255,255,0.8);
          font-size: 0.9rem;
          font-weight: 400;
        }
        
        .content-section {
          flex: 1;
          background: #f8f9fa;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding: 2rem 1.5rem;
          margin-top: 1rem;
          position: relative;
        }
        
        .login-form {
          max-width: 400px;
          margin: 0 auto;
        }
        
        .form-title {
          color: #1a1a1a;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          text-align: center;
        }
        
        .form-subtitle {
          color: #666;
          font-size: 0.9rem;
          text-align: center;
          margin-bottom: 2rem;
          line-height: 1.4;
        }
        
        .input-group {
          margin-bottom: 1.5rem;
        }
        
        .input-label {
          display: block;
          color: #333;
          font-size: 0.9rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        
        .input-field {
          width: 100%;
          padding: 1rem;
          border: 2px solid #e1e5e9;
          border-radius: 12px;
          font-size: 1rem;
          background: white;
          transition: all 0.2s ease;
          -webkit-appearance: none;
          appearance: none;
        }
        
        .input-field:focus {
          outline: none;
          border-color: #0050AA;
          box-shadow: 0 0 0 3px rgba(0,80,170,0.1);
        }
        
        .login-button {
          width: 100%;
          background: #0050AA;
          color: white;
          border: none;
          padding: 1rem;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 1rem;
          -webkit-appearance: none;
          appearance: none;
        }
        
        .login-button:hover {
          background: #004494;
        }
        
        .login-button:active {
          transform: scale(0.98);
          background: #003d7a;
        }
        
        .error-message {
          background: #fee;
          color: #c53030;
          padding: 1rem;
          border-radius: 12px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          text-align: center;
          border: 1px solid #fecaca;
          display: none;
        }
        
        .security-notice {
          background: rgba(0,80,170,0.05);
          border: 1px solid rgba(0,80,170,0.1);
          border-radius: 12px;
          padding: 1rem;
          margin-top: 2rem;
          text-align: center;
        }
        
        .security-notice-icon {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        
        .security-notice-text {
          color: #666;
          font-size: 0.85rem;
          line-height: 1.4;
        }
        
        /* iOS specific optimizations */
        @media screen and (max-width: 480px) {
          .header-section {
            padding: 1.5rem 1rem 0.75rem 1rem;
          }
          
          .boi-logo {
            width: 100px;
            height: 34px;
            font-size: 12px;
            margin-bottom: 1rem;
          }
          
          .header-title {
            font-size: 1.3rem;
          }
          
          .header-subtitle {
            font-size: 0.85rem;
          }
          
          .content-section {
            padding: 1.5rem 1rem;
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
          }
          
          .form-title {
            font-size: 1.1rem;
          }
          
          .form-subtitle {
            font-size: 0.85rem;
            margin-bottom: 1.5rem;
          }
          
          .input-field {
            padding: 0.875rem;
            font-size: 16px; /* Prevents zoom on iOS */
          }
          
          .login-button {
            padding: 0.875rem;
            font-size: 1rem;
          }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .content-section {
            background: #1a1a1a;
          }
          
          .form-title {
            color: white;
          }
          
          .form-subtitle {
            color: #999;
          }
          
          .input-label {
            color: #ccc;
          }
          
          .input-field {
            background: #2a2a2a;
            border-color: #444;
            color: white;
          }
          
          .input-field:focus {
            border-color: #0050AA;
            background: #333;
          }
          
          .security-notice {
            background: rgba(0,80,170,0.1);
            border-color: rgba(0,80,170,0.2);
          }
          
          .security-notice-text {
            color: #999;
          }
        }
      </style>
    </head>
    <body>
      <div class="ios-safe-area">
        <div class="header-section">
          <div class="boi-logo">BANK OF IRELAND</div>
          <h1 class="header-title">Admin Access</h1>
          <p class="header-subtitle">Secure Banking Administration</p>
        </div>
        
        <div class="content-section">
          <div class="login-form">
            <h2 class="form-title">Sign In</h2>
            <p class="form-subtitle">Enter your admin credentials to access the banking administration panel</p>
            
            <div id="error" class="error-message"></div>
            
            <form onsubmit="login(event)">
              <div class="input-group">
                <label for="adminKey" class="input-label">Admin Access Key</label>
                <input 
                  type="password" 
                  id="adminKey" 
                  class="input-field"
                  placeholder="Enter your secure access key" 
                  required 
                  autocomplete="current-password"
                />
              </div>
              
              <button type="submit" class="login-button">Access Admin Panel</button>
            </form>
            
            <div class="security-notice">
              <div class="security-notice-icon">🔒</div>
              <p class="security-notice-text">
                This is a secure area restricted to authorized Bank of Ireland administrators only. 
                All access attempts are monitored and logged.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        function login(event) {
          event.preventDefault();
          
          const adminKey = document.getElementById('adminKey').value;
          const errorDiv = document.getElementById('error');
          
          if (!adminKey) {
            showError('Please enter your admin access key');
            return;
          }
          
          // Validate admin key
          if (adminKey === 'BOI_ADMIN_2025_SECURE') {
            // Store authentication and redirect
            sessionStorage.setItem('adminAuth', 'true');
            window.location.href = '/admin/dashboard';
          } else {
            showError('Invalid access key. Please check your credentials and try again.');
            // Clear the input for security
            document.getElementById('adminKey').value = '';
          }
        }
        
        function showError(message) {
          const errorDiv = document.getElementById('error');
          errorDiv.textContent = message;
          errorDiv.style.display = 'block';
          
          // Auto-hide error after 5 seconds
          setTimeout(() => {
            errorDiv.style.display = 'none';
          }, 5000);
          
          // Add shake animation to form
          const form = document.querySelector('.login-form');
          form.style.animation = 'shake 0.5s ease-in-out';
          setTimeout(() => {
            form.style.animation = '';
          }, 500);
        }
        
        // Add shake animation
        const style = document.createElement('style');
        style.textContent = \`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
        \`;
        document.head.appendChild(style);
        
        // Focus the input field on load
        window.addEventListener('load', () => {
          document.getElementById('adminKey').focus();
        });
        
        // Prevent zoom on double tap for iOS
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
          const now = (new Date()).getTime();
          if (now - lastTouchEnd <= 300) {
            event.preventDefault();
          }
          lastTouchEnd = now;
        }, false);
      </script>
    </body>
    </html>
  `;
  
  res.send(loginPage);
});

export default router;