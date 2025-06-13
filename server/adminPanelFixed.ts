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
    <html>
    <head>
      <title>BOI Banking Admin Dashboard</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: Arial, sans-serif; 
          background: #f5f5f5; 
          line-height: 1.6; 
        }
        .header { 
          background: #2c3e50; 
          color: white; 
          padding: 1rem; 
          text-align: center; 
        }
        .container { 
          max-width: 1200px; 
          margin: 2rem auto; 
          padding: 0 1rem; 
        }
        .section { 
          background: white; 
          margin-bottom: 2rem; 
          padding: 1.5rem; 
          border-radius: 8px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .section h2 { 
          color: #2c3e50; 
          margin-bottom: 1rem; 
          border-bottom: 2px solid #3498db; 
          padding-bottom: 0.5rem; 
        }
        .btn { 
          padding: 0.5rem 1rem; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer; 
          margin: 0.25rem; 
          font-size: 0.9rem; 
        }
        .btn-success { background: #27ae60; color: white; }
        .btn-danger { background: #e74c3c; color: white; }
        .btn-primary { background: #3498db; color: white; }
        .btn:hover { opacity: 0.8; }
        .ip-item, .pending-item { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 0.75rem; 
          border: 1px solid #ddd; 
          margin-bottom: 0.5rem; 
          border-radius: 4px; 
        }
        .ip-address { 
          font-weight: bold; 
          color: #2c3e50; 
        }
        .status { 
          padding: 0.25rem 0.75rem; 
          border-radius: 20px; 
          font-size: 0.8rem; 
          background: #27ae60; 
          color: white; 
        }
        .pending-actions { 
          display: flex; 
          gap: 0.5rem; 
        }
        .panic-section { 
          border: 3px solid #e74c3c; 
        }
        .panic-active { 
          background: #ffebee; 
          border-color: #c62828; 
        }
        .panic-status { 
          font-size: 1.2rem; 
          font-weight: bold; 
          padding: 1rem; 
          text-align: center; 
          border-radius: 4px; 
          margin-bottom: 1rem; 
        }
        .status-active { 
          background: #ffcdd2; 
          color: #c62828; 
        }
        .status-inactive { 
          background: #c8e6c9; 
          color: #2e7d32; 
        }
        .message { 
          padding: 0.75rem; 
          margin: 1rem 0; 
          border-radius: 4px; 
        }
        .message.success { 
          background: #d4edda; 
          color: #155724; 
          border: 1px solid #c3e6cb; 
        }
        .message.error { 
          background: #f8d7da; 
          color: #721c24; 
          border: 1px solid #f5c6cb; 
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