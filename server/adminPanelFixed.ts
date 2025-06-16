import express from 'express';
import { activatePanicMode, deactivatePanicMode, isPanicModeActive } from './panicMode';
import { getAllApprovedIPs, revokeIP, approveIP } from './ipControl';
import { getPendingAttempts, removeAttempt } from './accessMonitor';
import { getAllDeviceSessions, blockDevice, unblockDevice, isDeviceBlocked, activateDevicePanicMode, deactivateDevicePanicMode } from './deviceSessions';
import { getAllUserDeviceSessions, forceLogoutUser } from './deviceExclusiveAuth';
import { storage } from './storage';

const router = express.Router();

function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const adminKey = req.header('X-Admin-Key');
  if (adminKey !== 'BOI_ADMIN_2025_SECURE') {
    return res.status(401).json({ error: 'Unauthorized' });
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
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
      <meta name="format-detection" content="telephone=no">
      <title>BOI Banking Admin Access</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
          font-size: 16px;
          overflow-x: hidden;
        }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0; 
          padding: 0; 
          min-height: 100vh; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          overflow-x: hidden;
          position: relative;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          touch-action: manipulation;
        }
        body::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1" fill="rgba(255,255,255,0.05)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          opacity: 0.3;
        }
        .login-container { 
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          padding: 3rem; 
          border-radius: 20px; 
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          width: 450px;
          max-width: 90vw;
          border: 1px solid rgba(255,255,255,0.2);
          position: relative;
          z-index: 1;
          animation: slideIn 0.6s ease-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .login-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          border-radius: 20px;
          pointer-events: none;
        }
        h1 { 
          color: #1e3c72; 
          text-align: center; 
          margin-bottom: 2.5rem; 
          font-size: 2.2rem;
          font-weight: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }
        .bank-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #1e3c72, #2a5298);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
        }
        .form-group { 
          margin-bottom: 1.5rem; 
          position: relative;
        }
        label { 
          display: block; 
          margin-bottom: 0.75rem; 
          color: #1e3c72; 
          font-weight: 500;
          font-size: 0.95rem;
        }
        input { 
          width: 100%; 
          padding: 1rem 1.25rem; 
          border: 2px solid rgba(30,60,114,0.2); 
          border-radius: 12px; 
          box-sizing: border-box;
          font-size: 1rem;
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102,126,234,0.2);
          background: white;
          transform: translateY(-1px);
        }
        button { 
          width: 100%; 
          padding: 1rem; 
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white; 
          border: none; 
          border-radius: 12px; 
          cursor: pointer; 
          font-size: 1.1rem; 
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(102,126,234,0.3);
          position: relative;
          overflow: hidden;
        }
        button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s;
        }
        button:hover::before {
          left: 100%;
        }
        button:hover { 
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(102,126,234,0.4);
        }
        button:active {
          transform: translateY(0);
        }
        .error { 
          color: #d32f2f; 
          text-align: center; 
          margin-top: 1.5rem; 
          padding: 1rem;
          background: rgba(211,47,47,0.1);
          border-radius: 8px;
          border: 1px solid rgba(211,47,47,0.2);
          font-weight: 500;
        }
        .security-notice {
          background: rgba(102,126,234,0.1);
          border: 1px solid rgba(102,126,234,0.2);
          border-radius: 12px;
          padding: 1rem;
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.9rem;
          color: #1e3c72;
        }
        .security-notice strong {
          color: #667eea;
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
          .login-container {
            padding: 2rem;
            margin: 1rem;
          }
          h1 {
            font-size: 1.8rem;
          }
        }
        
        /* Prevent zoom and scroll issues */
        @media screen and (max-width: 768px) {
          body {
            -webkit-text-size-adjust: none;
            -ms-text-size-adjust: none;
            text-size-adjust: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h1>
          <div class="bank-icon">🏦</div>
          BOI Admin Panel
        </h1>
        <form onsubmit="login(event)">
          <div class="form-group">
            <label for="adminKey">Admin Access Key:</label>
            <input type="password" id="adminKey" placeholder="Enter your admin access key" required>
          </div>
          <button type="submit">Access Admin Panel</button>
        </form>
        <div id="error" class="error"></div>
        <div class="security-notice">
          <strong>Secure Access:</strong> This admin panel is protected with enterprise-level security. All access attempts are monitored and logged.
        </div>
      </div>

      <script>
        function login(event) {
          event.preventDefault();
          const adminKey = document.getElementById('adminKey').value;
          
          if (adminKey === 'BOI_ADMIN_2025_SECURE') {
            sessionStorage.setItem('adminAuth', 'true');
            window.location.href = '/admin/dashboard';
          } else {
            document.getElementById('error').innerText = 'Invalid admin key';
          }
        }
      </script>
    </body>
    </html>
  `;
  
  res.send(loginPage);
});

// Admin dashboard
router.get('/dashboard', (req, res) => {
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
        html {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
          font-size: 16px;
          overflow-x: hidden;
        }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          line-height: 1.6; 
          overflow-x: hidden;
          min-height: 100vh;
          position: relative;
          zoom: 1;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          touch-action: manipulation;
        }
        .header { 
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          color: white; 
          padding: 2rem 0; 
          text-align: center; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          position: relative;
          overflow: hidden;
        }
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1" fill="rgba(255,255,255,0.05)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          opacity: 0.3;
        }
        .header h1 {
          font-size: 2.5rem;
          font-weight: 300;
          margin-bottom: 0.5rem;
          position: relative;
          z-index: 1;
        }
        .header p {
          font-size: 1.1rem;
          opacity: 0.9;
          position: relative;
          z-index: 1;
        }
        .container { 
          max-width: 1400px; 
          margin: -1rem auto 2rem auto; 
          padding: 0 2rem; 
          position: relative;
          z-index: 2;
        }
        .section { 
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          margin-bottom: 2rem; 
          padding: 2rem; 
          border-radius: 16px; 
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          transition: all 0.3s ease;
        }
        .section:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        }
        .section h2 { 
          color: #1e3c72; 
          margin-bottom: 1.5rem; 
          font-size: 1.5rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .section h2::before {
          content: '';
          width: 4px;
          height: 24px;
          background: linear-gradient(135deg, #3498db, #667eea);
          border-radius: 2px;
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
          position: relative;
          overflow: hidden;
        }
        .btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s;
        }
        .btn:hover::before {
          left: 100%;
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
        .btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        .ip-item, .pending-item { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 1.25rem; 
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(255,255,255,0.3); 
          margin-bottom: 1rem; 
          border-radius: 12px; 
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }
        .ip-item:hover, .pending-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.9);
        }
        .ip-address { 
          font-weight: 600; 
          color: #1e3c72; 
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          font-size: 1.1rem;
          padding: 0.5rem 1rem;
          background: rgba(30,60,114,0.1);
          border-radius: 8px;
          border: 1px solid rgba(30,60,114,0.2);
        }
        .timestamp {
          color: #666;
          font-size: 0.9rem;
          font-style: italic;
        }
        .status { 
          padding: 0.5rem 1rem; 
          border-radius: 25px; 
          font-size: 0.85rem; 
          font-weight: 600;
          background: linear-gradient(135deg, #27ae60, #2ecc71); 
          color: white; 
          box-shadow: 0 2px 8px rgba(39,174,96,0.3);
        }
        .pending-actions { 
          display: flex; 
          gap: 0.75rem; 
        }
        .panic-section { 
          border: 3px solid #e74c3c; 
          position: relative;
          overflow: hidden;
        }
        .panic-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(231,76,60,0.05) 10px,
            rgba(231,76,60,0.05) 20px
          );
          pointer-events: none;
        }
        .panic-active { 
          background: linear-gradient(135deg, #ffebee, #ffcdd2); 
          border-color: #c62828; 
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(198,40,40,0.4);
          }
          50% { 
            box-shadow: 0 0 0 20px rgba(198,40,40,0);
          }
        }
        .panic-status { 
          font-size: 1.4rem; 
          font-weight: 700; 
          padding: 1.5rem; 
          text-align: center; 
          border-radius: 12px; 
          margin-bottom: 1.5rem; 
          position: relative;
          z-index: 1;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .status-active { 
          background: linear-gradient(135deg, #ff5722, #d32f2f); 
          color: white; 
          box-shadow: 0 8px 32px rgba(255,87,34,0.4);
          animation: blink 1.5s ease-in-out infinite;
        }
        .status-inactive { 
          background: linear-gradient(135deg, #4caf50, #2e7d32); 
          color: white; 
          box-shadow: 0 8px 32px rgba(76,175,80,0.3);
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          75% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        .message { 
          padding: 1rem 1.5rem; 
          margin: 1.5rem 0; 
          border-radius: 12px; 
          font-weight: 500;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .message.success { 
          background: linear-gradient(135deg, #d4edda, #c3e6cb); 
          color: #155724; 
          border: 1px solid #c3e6cb; 
          border-left: 4px solid #28a745;
        }
        .message.error { 
          background: linear-gradient(135deg, #f8d7da, #f5c6cb); 
          color: #721c24; 
          border: 1px solid #f5c6cb; 
          border-left: 4px solid #dc3545;
        }
        
        /* Input styling */
        input[type="text"] {
          padding: 0.75rem 1rem;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          font-size: 1rem;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        }
        input[type="text"]:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102,126,234,0.2);
          background: white;
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
          .container {
            padding: 0 1rem;
          }
          .section {
            padding: 1.5rem;
          }
          .ip-item, .pending-item {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          .pending-actions {
            justify-content: center;
          }
        }
        
        /* Device session styling */
        .device-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: rgba(255,255,255,0.9);
          border-radius: 8px;
          margin-bottom: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-left: 4px solid #667eea;
          transition: all 0.3s ease;
        }
        .device-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .device-item.blocked {
          border-left-color: #d32f2f;
          background: rgba(255,235,238,0.9);
        }
        .device-info {
          flex: 1;
        }
        .device-name {
          font-weight: 600;
          color: #1e3c72;
          margin-bottom: 0.25rem;
          font-size: 1.1rem;
        }
        .device-details {
          color: #666;
          font-size: 0.9rem;
          line-height: 1.4;
        }
        .device-status {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .status-active {
          background: #e8f5e8;
          color: #2e7d32;
        }
        .status-blocked {
          background: #ffebee;
          color: #d32f2f;
        }
        .btn-block {
          background: linear-gradient(135deg, #ff5722, #d32f2f);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        .btn-block:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255,87,34,0.3);
        }
        .btn-block:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .btn-unblock {
          background: linear-gradient(135deg, #4caf50, #2e7d32);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        .btn-unblock:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(76,175,80,0.3);
        }
        
        /* Prevent zoom and scroll issues */
        @media screen and (max-width: 768px) {
          body {
            -webkit-text-size-adjust: none;
            -ms-text-size-adjust: none;
            text-size-adjust: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏦 BOI Banking Security Admin Panel</h1>
        <p>Real-time Access Control & Emergency Management</p>
      </div>

      <div class="container">
        <div id="message"></div>

        <!-- Panic Mode Section -->
        <div class="section panic-section" id="panicSection">
          <h2>🚨 Emergency Panic Mode</h2>
          <div id="panicStatus" class="panic-status"></div>
          <div style="text-align: center;">
            <button id="activateBtn" class="btn btn-danger" onclick="activatePanicMode()">
              🚨 ACTIVATE PANIC MODE
            </button>
            <button id="deactivateBtn" class="btn btn-success" onclick="deactivatePanicMode()">
              ✅ DEACTIVATE PANIC MODE
            </button>
          </div>
        </div>

        <!-- Pending Access Requests -->
        <div class="section">
          <h2>⏳ Pending Access Requests</h2>
          <div id="pendingRequests"></div>
        </div>

        <!-- Approved IPs -->
        <div class="section">
          <h2>✅ Approved IP Addresses</h2>
          <div id="approvedIPs"></div>
        </div>

        <!-- IP Management -->
        <div class="section">
          <h2>🔍 IP Address Management</h2>
          <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
            <input type="text" id="ipInput" placeholder="Enter IP address" style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            <button class="btn btn-primary" onclick="checkIPStatus()">Check IP Status</button>
          </div>
        </div>

        <!-- Device & Session Monitor -->
        <div class="section">
          <h2>📱 Device & Session Monitor</h2>
          <div id="deviceSessions"></div>
        </div>

        <!-- User Accounts -->
        <div class="section">
          <h2>👥 User Accounts</h2>
          <div id="userAccounts"></div>
        </div>
      </div>

      <script>
        const ADMIN_KEY = 'BOI_ADMIN_2025_SECURE';

        // Check authentication
        if (!sessionStorage.getItem('adminAuth')) {
          window.location.href = '/admin/login';
        }

        function showMessage(text, type) {
          const messageDiv = document.getElementById('message');
          messageDiv.innerHTML = '<div class="message ' + type + '">' + text + '</div>';
          setTimeout(() => {
            messageDiv.innerHTML = '';
          }, 5000);
        }

        async function checkIPStatus() {
          const ip = document.getElementById('ipInput').value.trim();
          if (!ip) {
            showMessage('Please enter an IP address', 'error');
            return;
          }

          try {
            const response = await fetch('/admin/check-ip', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY
              },
              body: JSON.stringify({ ip: ip })
            });
            
            const result = await response.json();
            
            if (response.ok) {
              const status = result.approved ? 'APPROVED' : 'BLOCKED';
              const type = result.approved ? 'success' : 'error';
              showMessage('IP ' + ip + ' is ' + status, type);
            } else {
              showMessage(result.error || 'Failed to check IP', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }

        async function loadApprovedIPs() {
          try {
            const response = await fetch('/admin/approved-ips', {
              headers: {
                'X-Admin-Key': ADMIN_KEY
              }
            });
            
            const result = await response.json();
            
            if (response.ok) {
              const ipList = document.getElementById('approvedIPs');
              ipList.innerHTML = '';
              
              result.approvedIPs.forEach(function(ip) {
                const li = document.createElement('div');
                li.className = 'ip-item';
                li.innerHTML = 
                  '<div>' +
                    '<span class="ip-address">' + ip + '</span>' +
                  '</div>' +
                  '<div>' +
                    '<span class="status">APPROVED</span>' +
                    '<button class="btn btn-danger" onclick="revokeIP(&quot;' + ip + '&quot;)">Revoke</button>' +
                  '</div>';
                ipList.appendChild(li);
              });
              
              if (result.approvedIPs.length === 0) {
                ipList.innerHTML = '<div class="ip-item">No approved IPs found</div>';
              }
            } else {
              showMessage(result.error || 'Failed to load approved IPs', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        async function loadPendingRequests() {
          try {
            const response = await fetch('/admin/pending-attempts', {
              headers: {
                'X-Admin-Key': ADMIN_KEY
              }
            });
            
            const result = await response.json();
            
            if (response.ok) {
              const pendingDiv = document.getElementById('pendingRequests');
              
              if (result.pendingAttempts.length === 0) {
                pendingDiv.innerHTML = '<p style="color: #666;">No pending access requests</p>';
              } else {
                let html = '';
                result.pendingAttempts.forEach(function(attempt) {
                  html += '<div class="pending-item">' +
                    '<span class="ip-address">' + attempt.ip + '</span>' +
                    '<span class="timestamp">' + new Date(attempt.timestamp).toLocaleString() + '</span>' +
                    '<div class="pending-actions">' +
                      '<button class="btn btn-success" onclick="approveAttempt(&quot;' + attempt.id + '&quot;, &quot;' + attempt.ip + '&quot;)">Approve</button>' +
                      '<button class="btn btn-danger" onclick="denyAttempt(&quot;' + attempt.id + '&quot;, &quot;' + attempt.ip + '&quot;)">Deny</button>' +
                    '</div>' +
                  '</div>';
                });
                pendingDiv.innerHTML = html;
              }
            } else {
              showMessage(result.error || 'Failed to load pending requests', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        async function approveAttempt(attemptId, ip) {
          try {
            const response = await fetch('/admin/approve-attempt', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY
              },
              body: JSON.stringify({ attemptId: attemptId })
            });
            
            const result = await response.json();
            
            if (response.ok) {
              showMessage('Access approved for ' + ip, 'success');
              loadPendingRequests();
              loadApprovedIPs();
            } else {
              showMessage(result.error || 'Failed to approve access', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        async function denyAttempt(attemptId, ip) {
          try {
            const response = await fetch('/admin/deny-attempt', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY
              },
              body: JSON.stringify({ attemptId: attemptId })
            });
            
            const result = await response.json();
            
            if (response.ok) {
              showMessage('Access denied for ' + ip, 'success');
              loadPendingRequests();
            } else {
              showMessage(result.error || 'Failed to deny access', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        async function loadPanicModeStatus() {
          try {
            const response = await fetch('/admin/panic-status', {
              headers: {
                'X-Admin-Key': ADMIN_KEY
              }
            });
            
            const result = await response.json();
            
            if (response.ok) {
              const statusDiv = document.getElementById('panicStatus');
              const panicSection = document.getElementById('panicSection');
              const activateBtn = document.getElementById('activateBtn');
              const deactivateBtn = document.getElementById('deactivateBtn');
              
              if (result.active) {
                statusDiv.innerHTML = '🚨 PANIC MODE ACTIVE - All access blocked';
                statusDiv.className = 'panic-status status-active';
                panicSection.classList.add('panic-active');
                activateBtn.style.display = 'none';
                deactivateBtn.style.display = 'inline-block';
              } else {
                statusDiv.innerHTML = '✅ Normal Operations';
                statusDiv.className = 'panic-status status-inactive';
                panicSection.classList.remove('panic-active');
                activateBtn.style.display = 'inline-block';
                deactivateBtn.style.display = 'none';
              }
            } else {
              showMessage('Failed to load panic mode status', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        async function activatePanicMode() {
          if (!confirm('Are you sure you want to activate PANIC MODE? This will block ALL access to the banking application.')) {
            return;
          }
          
          try {
            const response = await fetch('/admin/panic-activate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY
              },
              body: JSON.stringify({ reason: 'Admin activated emergency lockdown' })
            });
            
            const result = await response.json();
            
            if (response.ok) {
              showMessage('PANIC MODE ACTIVATED - All access blocked', 'error');
              loadPanicModeStatus();
            } else {
              showMessage(result.error || 'Failed to activate panic mode', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        async function deactivatePanicMode() {
          if (!confirm('Are you sure you want to deactivate PANIC MODE and resume normal operations?')) {
            return;
          }
          
          try {
            const response = await fetch('/admin/panic-deactivate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY
              }
            });
            
            const result = await response.json();
            
            if (response.ok) {
              showMessage('Panic mode deactivated - Normal operations resumed', 'success');
              loadPanicModeStatus();
            } else {
              showMessage(result.error || 'Failed to deactivate panic mode', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }

        async function revokeIP(ip) {
          if (!confirm('Are you sure you want to revoke access for IP: ' + ip + '?')) {
            return;
          }
          
          try {
            const response = await fetch('/admin/revoke-ip', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY
              },
              body: JSON.stringify({ ip: ip })
            });
            
            const result = await response.json();
            
            if (response.ok) {
              showMessage('Access revoked for ' + ip, 'success');
              loadApprovedIPs();
            } else {
              showMessage(result.error || 'Failed to revoke IP', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        // Device session management functions
        async function loadDeviceSessions() {
          try {
            const response = await fetch('/admin/device-sessions', {
              headers: {
                'X-Admin-Key': ADMIN_KEY
              }
            });
            
            const usersResponse = await fetch('/admin/user-accounts', {
              headers: {
                'X-Admin-Key': ADMIN_KEY
              }
            });
            
            const deviceResult = await response.json();
            const usersResult = await usersResponse.json();
            
            if (response.ok && usersResponse.ok) {
              const deviceList = document.getElementById('deviceSessions');
              deviceList.innerHTML = '';
              
              if (deviceResult.sessions.length === 0) {
                deviceList.innerHTML = '<div class="device-item">No active device sessions</div>';
              } else {
                // Create a map of customer numbers to user data
                const userMap = {};
                usersResult.accounts.forEach(function(user) {
                  userMap[user.customerNumber] = user;
                });
                
                // Group sessions by customer number
                const groupedSessions = {};
                deviceResult.sessions.forEach(function(session) {
                  if (!groupedSessions[session.customerNumber]) {
                    groupedSessions[session.customerNumber] = [];
                  }
                  groupedSessions[session.customerNumber].push(session);
                });
                
                // Display grouped sessions
                Object.keys(groupedSessions).forEach(function(customerNumber) {
                  const user = userMap[customerNumber] || { fullName: 'Unknown User', email: 'No email' };
                  const sessions = groupedSessions[customerNumber];
                  
                  const accountDiv = document.createElement('div');
                  accountDiv.className = 'device-item';
                  accountDiv.style.background = 'rgba(240, 248, 255, 0.9)';
                  accountDiv.style.borderLeft = '4px solid #3498db';
                  accountDiv.style.marginBottom = '1.5rem';
                  
                  let sessionsHtml = '';
                  sessions.forEach(function(session) {
                    const isDeviceBlocked = session.blocked;
                    const isIPRevoked = session.ipRevoked;
                    const overallStatus = isDeviceBlocked || isIPRevoked ? 'BLOCKED' : 'ACTIVE';
                    
                    sessionsHtml += 
                      '<div style="margin-left: 2rem; padding: 1rem; background: rgba(255,255,255,0.8); border-radius: 8px; margin-bottom: 0.5rem; border-left: 3px solid ' + (overallStatus === 'BLOCKED' ? '#e74c3c' : '#27ae60') + ';">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                          '<div>' +
                            '<strong style="color: #2c3e50;">📱 ' + session.deviceModel + '</strong><br>' +
                            '<span style="color: #7f8c8d; font-size: 0.9rem;">🌐 IP: ' + session.ipAddress + '</span>' +
                          '</div>' +
                          '<div style="text-align: right;">' +
                            '<span class="status-badge ' + (overallStatus === 'BLOCKED' ? 'status-blocked' : 'status-active') + '">' + overallStatus + '</span><br>' +
                            '<div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">' +
                              '<button class="' + (isDeviceBlocked ? 'btn-unblock' : 'btn-block') + '" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;" onclick="' + 
                                (isDeviceBlocked ? 'unblockDevice' : 'blockDevice') + '(&quot;' + session.sessionId + '&quot;, &quot;' + session.deviceModel + '&quot;)">' +
                                (isDeviceBlocked ? 'Unblock' : 'Block') +
                              '</button>' +
                              '<button class="' + (isIPRevoked ? 'btn-unblock' : 'btn-block') + '" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;" onclick="' + 
                                (isIPRevoked ? 'approveIP' : 'revokeIP') + '(&quot;' + session.ipAddress + '&quot;)">' +
                                (isIPRevoked ? 'Approve IP' : 'Revoke IP') +
                              '</button>' +
                            '</div>' +
                          '</div>' +
                        '</div>' +
                      '</div>';
                  });
                  
                  accountDiv.innerHTML = 
                    '<div style="margin-bottom: 1rem;">' +
                      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">' +
                        '<strong style="color: #1e3c72; font-size: 1.1rem;">👤 ' + user.fullName + '</strong>' +
                        '<span style="color: #7f8c8d; font-size: 0.9rem;">' + customerNumber + '</span>' +
                      '</div>' +
                      '<div style="color: #7f8c8d; font-size: 0.9rem; margin-bottom: 1rem;">📧 ' + user.email + '</div>' +
                    '</div>' +
                    sessionsHtml;
                  
                  deviceList.appendChild(accountDiv);
                });
              }
            } else {
              showMessage((deviceResult.error || usersResult.error) || 'Failed to load device sessions', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        async function blockDevice(sessionId, deviceModel) {
          if (!confirm('Are you sure you want to block device: ' + deviceModel + '?')) {
            return;
          }
          
          try {
            const response = await fetch('/admin/block-device', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY
              },
              body: JSON.stringify({ sessionId: sessionId })
            });
            
            const result = await response.json();
            
            if (response.ok) {
              showMessage('Device blocked successfully', 'success');
              loadDeviceSessions();
            } else {
              showMessage(result.error || 'Failed to block device', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        async function unblockDevice(sessionId, deviceModel) {
          if (!confirm('Are you sure you want to unblock device: ' + deviceModel + '?')) {
            return;
          }
          
          try {
            const response = await fetch('/admin/unblock-device', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY
              },
              body: JSON.stringify({ sessionId: sessionId })
            });
            
            const result = await response.json();
            
            if (response.ok) {
              showMessage('Device unblocked successfully', 'success');
              loadDeviceSessions();
            } else {
              showMessage(result.error || 'Failed to unblock device', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        async function approveIP(ipAddress) {
          if (!confirm('Are you sure you want to approve IP: ' + ipAddress + '?')) {
            return;
          }
          
          try {
            const response = await fetch('/admin/approve-ip', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY
              },
              body: JSON.stringify({ ip: ipAddress })
            });
            
            const result = await response.json();
            
            if (response.ok) {
              showMessage('IP approved successfully', 'success');
              loadDeviceSessions();
            } else {
              showMessage(result.error || 'Failed to approve IP', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        async function revokeIP(ipAddress) {
          if (!confirm('Are you sure you want to revoke IP: ' + ipAddress + '?')) {
            return;
          }
          
          try {
            const response = await fetch('/admin/revoke-ip', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY
              },
              body: JSON.stringify({ ip: ipAddress })
            });
            
            const result = await response.json();
            
            if (response.ok) {
              showMessage('IP revoked successfully', 'success');
              loadDeviceSessions();
            } else {
              showMessage(result.error || 'Failed to revoke IP', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        async function loadUserAccounts() {
          try {
            const response = await fetch('/admin/user-accounts', {
              headers: {
                'X-Admin-Key': ADMIN_KEY
              }
            });
            
            const result = await response.json();
            
            if (response.ok) {
              const accountsList = document.getElementById('userAccounts');
              accountsList.innerHTML = '';
              
              if (result.accounts && result.accounts.length > 0) {
                result.accounts.forEach(function(account) {
                  const accountDiv = document.createElement('div');
                  accountDiv.className = 'ip-item';
                  accountDiv.innerHTML = 
                    '<div style="display: flex; flex-direction: column; gap: 0.5rem;">' +
                      '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                        '<strong>' + (account.fullName || 'Unknown User') + '</strong>' +
                        '<span style="font-size: 0.9rem; color: #666;">ID: ' + account.id + '</span>' +
                      '</div>' +
                      '<div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: #555;">' +
                        '<span>📧 ' + (account.email || 'No email') + '</span>' +
                        '<span>🔢 ' + (account.customerNumber || 'No customer number') + '</span>' +
                      '</div>' +
                      '<div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #777;">' +
                        '<span>📅 Created: ' + (account.accountCreationDate ? new Date(account.accountCreationDate).toLocaleDateString() : 'Unknown') + '</span>' +
                        '<span>👤 ' + (account.joinDate || 'Member since unknown') + '</span>' +
                      '</div>' +
                    '</div>';
                  accountsList.appendChild(accountDiv);
                });
              } else {
                accountsList.innerHTML = '<div class="ip-item">No user accounts found</div>';
              }
            } else {
              showMessage(result.error || 'Failed to load user accounts', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }

        // Auto-refresh every 5 seconds
        setInterval(function() {
          loadPendingRequests();
          loadPanicModeStatus();
          loadDeviceSessions();
          loadUserAccounts();
        }, 5000);
        
        // Load data on page load
        loadApprovedIPs();
        loadPendingRequests();
        loadPanicModeStatus();
        loadDeviceSessions();
        loadUserAccounts();
      </script>
    </body>
    </html>
  `;
  
  res.send(adminPanel);
});

// API Routes
router.get('/approved-ips', adminAuth, async (req, res) => {
  try {
    const approvedIPs = getAllApprovedIPs();
    res.json({ approvedIPs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get approved IPs' });
  }
});

router.get('/pending-attempts', adminAuth, async (req, res) => {
  try {
    const pendingAttempts = getPendingAttempts();
    res.json({ pendingAttempts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pending attempts' });
  }
});

router.post('/approve-attempt', adminAuth, async (req, res) => {
  try {
    const { attemptId } = req.body;
    const attempt = getPendingAttempts().find(a => a.id === attemptId);
    
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    
    approveIP(attempt.ip);
    removeAttempt(attemptId);
    console.log(`✅ ACCESS APPROVED: ${attempt.ip} by admin`);
    
    res.json({ message: `Access approved for ${attempt.ip}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve attempt' });
  }
});

router.post('/deny-attempt', adminAuth, async (req, res) => {
  try {
    const { attemptId } = req.body;
    const attempt = getPendingAttempts().find(a => a.id === attemptId);
    
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    
    removeAttempt(attemptId);
    console.log(`❌ ACCESS DENIED: ${attempt.ip} by admin`);
    
    res.json({ message: `Access denied for ${attempt.ip}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deny attempt' });
  }
});

router.get('/panic-status', adminAuth, async (req, res) => {
  try {
    const active = isPanicModeActive();
    res.json({ active });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get panic mode status' });
  }
});

router.post('/panic-activate', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    activatePanicMode(reason || 'Admin activated emergency lockdown');
    res.json({ success: true, message: 'Panic mode activated - all access blocked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate panic mode' });
  }
});

router.post('/panic-deactivate', adminAuth, async (req, res) => {
  try {
    deactivatePanicMode();
    res.json({ success: true, message: 'Panic mode deactivated - normal operations resumed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate panic mode' });
  }
});

router.post('/check-ip', adminAuth, async (req, res) => {
  try {
    const { ip } = req.body;
    const approvedIPs = getAllApprovedIPs();
    const approved = approvedIPs.includes(ip);
    res.json({ approved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check IP status' });
  }
});

router.post('/revoke-ip', adminAuth, async (req, res) => {
  try {
    const { ip } = req.body;
    revokeIP(ip);
    console.log(`🚫 IP REVOKED: ${ip} by admin`);
    res.json({ message: `Access revoked for ${ip}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke IP' });
  }
});

router.post('/approve-ip', adminAuth, async (req, res) => {
  try {
    const { ip } = req.body;
    approveIP(ip);
    console.log(`✅ IP APPROVED: ${ip} by admin`);
    res.json({ message: `Access approved for ${ip}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve IP' });
  }
});

// User accounts management endpoint
router.get('/user-accounts', adminAuth, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    const userAccounts = users.map((user: any) => ({
      id: user.id,
      fullName: user.name,
      email: user.email,
      customerNumber: user.customerNumber,
      accountCreationDate: user.dateCreated,
      joinDate: user.joinDate,
      lastLoginTime: null // Will be populated from device sessions if available
    }));
    
    res.json({ accounts: userAccounts });
  } catch (error) {
    console.error('User accounts error:', error);
    res.status(500).json({ error: 'Failed to get user accounts' });
  }
});

// Device session management endpoints
router.get('/device-sessions', adminAuth, async (req, res) => {
  try {
    const sessions = getAllDeviceSessions();
    res.json({ sessions });
  } catch (error) {
    console.error('Device sessions error:', error);
    res.status(500).json({ error: 'Failed to get device sessions: ' + (error as Error).message });
  }
});

router.post('/block-device', adminAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const blocked = blockDevice(sessionId);
    
    if (blocked) {
      console.log(`🚫 DEVICE BLOCKED: Session ${sessionId} by admin`);
      res.json({ message: 'Device blocked successfully' });
    } else {
      res.status(404).json({ error: 'Device session not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to block device' });
  }
});

router.post('/unblock-device', adminAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const unblocked = unblockDevice(sessionId);
    
    if (unblocked) {
      console.log(`✅ DEVICE UNBLOCKED: Session ${sessionId} by admin`);
      res.json({ message: 'Device unblocked successfully' });
    } else {
      res.status(404).json({ error: 'Device session not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock device' });
  }
});

router.post('/device-panic-activate', adminAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const activated = activateDevicePanicMode(sessionId);
    
    if (activated) {
      res.json({ success: true, message: 'Device panic mode activated' });
    } else {
      res.status(404).json({ error: 'Device session not found' });
    }
  } catch (error) {
    console.error('Activate device panic mode error:', error);
    res.status(500).json({ error: 'Failed to activate device panic mode: ' + (error as Error).message });
  }
});

router.post('/device-panic-deactivate', adminAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const deactivated = deactivateDevicePanicMode(sessionId);
    
    if (deactivated) {
      res.json({ success: true, message: 'Device panic mode deactivated' });
    } else {
      res.status(404).json({ error: 'Device session not found' });
    }
  } catch (error) {
    console.error('Deactivate device panic mode error:', error);
    res.status(500).json({ error: 'Failed to deactivate device panic mode: ' + (error as Error).message });
  }
});

export default router;