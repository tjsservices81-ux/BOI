import express from 'express';
import { activatePanicMode, deactivatePanicMode, isPanicModeActive } from './panicMode';
import { getAllApprovedIPs, revokeIP, approveIP } from './ipControl';
import { getPendingAttempts, removeAttempt } from './accessMonitor';

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
    <html>
    <head>
      <title>BOI Banking Admin Access</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0; 
          padding: 0; 
          min-height: 100vh; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
        }
        .login-container { 
          background: white; 
          padding: 2rem; 
          border-radius: 10px; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.2); 
          width: 400px; 
        }
        h1 { 
          color: #333; 
          text-align: center; 
          margin-bottom: 2rem; 
        }
        .form-group { 
          margin-bottom: 1rem; 
        }
        label { 
          display: block; 
          margin-bottom: 0.5rem; 
          color: #555; 
        }
        input { 
          width: 100%; 
          padding: 0.75rem; 
          border: 1px solid #ddd; 
          border-radius: 5px; 
          box-sizing: border-box; 
        }
        button { 
          width: 100%; 
          padding: 0.75rem; 
          background: #007bff; 
          color: white; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer; 
          font-size: 1rem; 
        }
        button:hover { 
          background: #0056b3; 
        }
        .error { 
          color: red; 
          text-align: center; 
          margin-top: 1rem; 
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h1>🏦 BOI Admin Panel</h1>
        <form onsubmit="login(event)">
          <div class="form-group">
            <label for="adminKey">Admin Key:</label>
            <input type="password" id="adminKey" required>
          </div>
          <button type="submit">Access Admin Panel</button>
        </form>
        <div id="error" class="error"></div>
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
                    '<button class="btn btn-danger" onclick="revokeIP(\\'+ ip + '\\')">Revoke</button>' +
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
                      '<button class="btn btn-success" onclick="approveAttempt(\\'+ attempt.id + '\\', \\'+ attempt.ip + '\\')">Approve</button>' +
                      '<button class="btn btn-danger" onclick="denyAttempt(\\'+ attempt.id + '\\', \\'+ attempt.ip + '\\')">Deny</button>' +
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
        
        // Auto-refresh every 5 seconds
        setInterval(function() {
          loadPendingRequests();
          loadPanicModeStatus();
        }, 5000);
        
        // Load data on page load
        loadApprovedIPs();
        loadPendingRequests();
        loadPanicModeStatus();
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

export default router;