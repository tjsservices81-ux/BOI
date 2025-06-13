import express from 'express';
import { approveIP, revokeIP, listApprovedIPs, isIPApproved } from './ipControl';

const router = express.Router();

// Admin authentication middleware
function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const adminKey = req.headers['x-admin-key'] as string;
  const correctKey = 'BOI_ADMIN_2025_SECURE'; // Change this to your secret admin key
  
  if (!adminKey || adminKey !== correctKey) {
    return res.status(401).json({ error: 'Unauthorized admin access' });
  }
  
  next();
}

// Get all approved IPs
router.get('/approved-ips', adminAuth, (req, res) => {
  const approvedIPs = listApprovedIPs();
  res.json({ approvedIPs });
});

// Add IP to whitelist
router.post('/approve-ip', adminAuth, (req, res) => {
  const { ip } = req.body;
  
  if (!ip) {
    return res.status(400).json({ error: 'IP address required' });
  }
  
  const success = approveIP(ip);
  res.json({ success, message: `IP ${ip} has been approved` });
});

// Remove IP from whitelist
router.delete('/revoke-ip', adminAuth, (req, res) => {
  const { ip } = req.body;
  
  if (!ip) {
    return res.status(400).json({ error: 'IP address required' });
  }
  
  const success = revokeIP(ip);
  res.json({ success, message: success ? `IP ${ip} has been revoked` : `IP ${ip} was not in whitelist` });
});

// Check if IP is approved
router.get('/check-ip/:ip', adminAuth, (req, res) => {
  const { ip } = req.params;
  const approved = isIPApproved(ip);
  res.json({ ip, approved });
});

// Admin login page
router.get('/login', (req, res) => {
  const loginPage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BOI Admin Login</title>
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
        
        .login-container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 400px;
          width: 100%;
        }
        
        .logo {
          width: 80px;
          height: 80px;
          background: #0000ff;
          border-radius: 20px;
          margin: 0 auto 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 32px;
          font-weight: bold;
        }
        
        h1 {
          color: #333;
          font-size: 28px;
          margin-bottom: 10px;
        }
        
        p {
          color: #666;
          font-size: 16px;
          margin-bottom: 30px;
        }
        
        .form-group {
          margin-bottom: 25px;
          text-align: left;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #555;
        }
        
        .form-group input {
          width: 100%;
          padding: 15px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 16px;
          transition: border-color 0.3s;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: #0000ff;
        }
        
        .btn {
          background: #0000ff;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          width: 100%;
        }
        
        .btn:hover {
          background: #0000cc;
          transform: translateY(-2px);
        }
        
        .error {
          color: #e74c3c;
          background: #ffebee;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 20px;
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <div class="logo">🏦</div>
        <h1>Admin Access</h1>
        <p>Enter your admin key to manage access control</p>
        
        <div id="error" class="error"></div>
        
        <form onsubmit="login(event)">
          <div class="form-group">
            <label for="adminKey">Admin Key</label>
            <input type="password" id="adminKey" placeholder="Enter admin key" required />
          </div>
          <button type="submit" class="btn">Access Admin Panel</button>
        </form>
      </div>
      
      <script>
        function login(event) {
          event.preventDefault();
          
          const adminKey = document.getElementById('adminKey').value;
          const errorDiv = document.getElementById('error');
          
          if (!adminKey) {
            showError('Please enter the admin key');
            return;
          }
          
          // Store the admin key and redirect to panel
          localStorage.setItem('adminKey', adminKey);
          window.location.href = '/admin/panel?key=' + encodeURIComponent(adminKey);
        }
        
        function showError(message) {
          const errorDiv = document.getElementById('error');
          errorDiv.textContent = message;
          errorDiv.style.display = 'block';
          
          setTimeout(() => {
            errorDiv.style.display = 'none';
          }, 5000);
        }
      </script>
    </body>
    </html>
  `;
  
  res.send(loginPage);
});

// Admin panel HTML
router.get('/panel', (req, res) => {
  const adminKey = req.query.key || req.headers['x-admin-key'];
  const correctKey = 'BOI_ADMIN_2025_SECURE';
  
  if (!adminKey || adminKey !== correctKey) {
    return res.redirect('/admin/login');
  }
  const adminPanel = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BOI Admin Panel - Access Control</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        }
        
        body {
          background: #f5f6fa;
          min-height: 100vh;
          padding: 20px;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .header {
          background: linear-gradient(135deg, #0000ff 0%, #126987 100%);
          color: white;
          padding: 30px;
          border-radius: 15px;
          margin-bottom: 30px;
          text-align: center;
        }
        
        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
        }
        
        .header p {
          opacity: 0.9;
          font-size: 16px;
        }
        
        .card {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          margin-bottom: 25px;
        }
        
        .card h2 {
          color: #333;
          font-size: 20px;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #f0f0f0;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #555;
        }
        
        .form-group input {
          width: 100%;
          padding: 12px 15px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.3s;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: #0000ff;
        }
        
        .btn {
          background: #0000ff;
          color: white;
          border: none;
          padding: 12px 25px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          margin-right: 10px;
        }
        
        .btn:hover {
          background: #0000cc;
          transform: translateY(-2px);
        }
        
        .btn-danger {
          background: #e74c3c;
        }
        
        .btn-danger:hover {
          background: #c0392b;
        }
        
        .ip-list {
          list-style: none;
        }
        
        .ip-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 10px;
          border-left: 4px solid #0000ff;
        }
        
        .ip-address {
          font-family: monospace;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        
        .status {
          padding: 5px 10px;
          border-radius: 5px;
          font-size: 12px;
          font-weight: 600;
          background: #27ae60;
          color: white;
        }
        
        .message {
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: none;
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
        
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
        }
        
        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏦 Bank of Ireland - Admin Panel</h1>
          <p>Manage IP Access Control for your banking application</p>
        </div>
        
        <div id="message" class="message"></div>
        
        <div class="grid">
          <div class="card">
            <h2>Add Approved IP</h2>
            <div class="form-group">
              <label for="newIP">IP Address</label>
              <input type="text" id="newIP" placeholder="192.168.1.100" />
            </div>
            <button class="btn" onclick="approveIP()">Approve IP</button>
          </div>
          
          <div class="card">
            <h2>Check IP Status</h2>
            <div class="form-group">
              <label for="checkIP">IP Address</label>
              <input type="text" id="checkIP" placeholder="192.168.1.100" />
            </div>
            <button class="btn" onclick="checkIP()">Check Status</button>
          </div>
        </div>
        
        <div class="card">
          <h2>Approved IP Addresses</h2>
          <ul id="ipList" class="ip-list">
            <!-- IP list will be loaded here -->
          </ul>
          <button class="btn" onclick="loadApprovedIPs()">Refresh List</button>
        </div>
      </div>
      
      <script>
        const ADMIN_KEY = '${req.headers['x-admin-key']}';
        
        function showMessage(text, type) {
          const message = document.getElementById('message');
          message.textContent = text;
          message.className = 'message ' + type;
          message.style.display = 'block';
          
          setTimeout(() => {
            message.style.display = 'none';
          }, 5000);
        }
        
        async function approveIP() {
          const ip = document.getElementById('newIP').value.trim();
          if (!ip) {
            showMessage('Please enter an IP address', 'error');
            return;
          }
          
          try {
            const response = await fetch('/admin/approve-ip', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY
              },
              body: JSON.stringify({ ip })
            });
            
            const result = await response.json();
            
            if (response.ok) {
              showMessage(result.message, 'success');
              document.getElementById('newIP').value = '';
              loadApprovedIPs();
            } else {
              showMessage(result.error || 'Failed to approve IP', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        async function revokeIP(ip) {
          if (!confirm('Are you sure you want to revoke access for ' + ip + '?')) {
            return;
          }
          
          try {
            const response = await fetch('/admin/revoke-ip', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY
              },
              body: JSON.stringify({ ip })
            });
            
            const result = await response.json();
            
            if (response.ok) {
              showMessage(result.message, 'success');
              loadApprovedIPs();
            } else {
              showMessage(result.error || 'Failed to revoke IP', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        async function checkIP() {
          const ip = document.getElementById('checkIP').value.trim();
          if (!ip) {
            showMessage('Please enter an IP address', 'error');
            return;
          }
          
          try {
            const response = await fetch('/admin/check-ip/' + encodeURIComponent(ip), {
              headers: {
                'X-Admin-Key': ADMIN_KEY
              }
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
              const ipList = document.getElementById('ipList');
              ipList.innerHTML = '';
              
              result.approvedIPs.forEach(ip => {
                const li = document.createElement('li');
                li.className = 'ip-item';
                li.innerHTML = 
                  '<div>' +
                    '<span class="ip-address">' + ip + '</span>' +
                  '</div>' +
                  '<div>' +
                    '<span class="status">APPROVED</span>' +
                    '<button class="btn btn-danger" onclick="revokeIP(\'' + ip + ')">Revoke</button>' +
                  '</div>';
                ipList.appendChild(li);
              });
              
              if (result.approvedIPs.length === 0) {
                ipList.innerHTML = '<li class="ip-item">No approved IPs found</li>';
              }
            } else {
              showMessage(result.error || 'Failed to load approved IPs', 'error');
            }
          } catch (error) {
            showMessage('Network error: ' + error.message, 'error');
          }
        }
        
        // Load approved IPs on page load
        loadApprovedIPs();
      </script>
    </body>
    </html>
  `;
  
  res.send(adminPanel);
});

export default router;