import express from 'express';
import { getUserSessions, deleteUserSession, deleteAllUserSessions } from './deviceSessions';
import { SessionManager } from './sessionManager';

const router = express.Router();

// Extend session interface
declare module 'express-session' {
  interface SessionData {
    adminAuth?: boolean;
  }
}

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
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="default">
      <title>Bank of Ireland - Admin Access</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
          background: linear-gradient(135deg, #126987 0%, #0e5a75 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: white;
        }
        .login-container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 40px 30px;
          width: 100%;
          max-width: 400px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .logo {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 30px;
          color: white;
        }
        .form-group {
          margin-bottom: 20px;
          text-align: left;
        }
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }
        input {
          width: 100%;
          padding: 15px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 16px;
          backdrop-filter: blur(5px);
        }
        input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }
        input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.15);
        }
        .login-btn {
          width: 100%;
          padding: 15px;
          background: white;
          color: #126987;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .login-btn:hover {
          background: rgba(255, 255, 255, 0.9);
          transform: translateY(-1px);
        }
        .error {
          color: #ff6b6b;
          margin-top: 15px;
          font-size: 14px;
        }
        @media (max-width: 480px) {
          .login-container {
            padding: 30px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <div class="logo">Bank of Ireland Admin</div>
        <form method="POST" action="/admin/login">
          <div class="form-group">
            <label for="password">Admin Password</label>
            <input type="password" id="password" name="password" placeholder="Enter admin password" required>
          </div>
          <button type="submit" class="login-btn">Access Admin Panel</button>
          ${req.query.error ? '<div class="error">Invalid password. Please try again.</div>' : ''}
        </form>
      </div>
    </body>
    </html>
  `;
  res.send(loginPage);
});

// Admin login handler
router.post('/login', (req, res) => {
  const { password } = req.body;
  
  if (password === 'BOI_ADMIN_2025_SECURE') {
    (req.session as any).adminAuth = true;
    res.redirect('/admin/panel');
  } else {
    res.redirect('/admin/login?error=1');
  }
});

// Admin panel main page
router.get('/panel', adminAuth, async (req, res) => {
  try {
    // Get real user sessions from SessionManager
    const userSessions = await SessionManager.getAllUserSessions();
    
    const panelPage = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="default">
      <title>Bank of Ireland - Admin Panel</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
          background: #f8fafc;
          min-height: 100vh;
          color: #1a202c;
          line-height: 1.5;
        }
        .header {
          background: #126987;
          color: white;
          padding: 20px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }
        .header h1 {
          font-size: 24px;
          font-weight: 700;
        }
        .logout-btn {
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }
        .logout-btn:hover {
          background: rgba(255,255,255,0.3);
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          text-align: center;
        }
        .stat-number {
          font-size: 32px;
          font-weight: 700;
          color: #126987;
          margin-bottom: 5px;
        }
        .stat-label {
          color: #64748b;
          font-size: 14px;
        }
        .users-section {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .section-header {
          background: #f8fafc;
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
        }
        .section-title {
          font-size: 20px;
          font-weight: 600;
          color: #1a202c;
        }
        .user-list {
          max-height: 70vh;
          overflow-y: auto;
        }
        .user-item {
          padding: 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .user-item:last-child {
          border-bottom: none;
        }
        .user-item.not-logged-in {
          background: #fef7f7;
          border-left: 4px solid #dc2626;
        }
        .user-item.logged-in {
          background: #f0fdf4;
          border-left: 4px solid #16a34a;
        }
        .user-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }
        .user-info {
          flex: 1;
        }
        .user-name {
          font-size: 18px;
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 5px;
        }
        .user-email {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .user-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin-top: 10px;
        }
        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .detail-label {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .detail-value {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
        }
        .user-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .logout-user-btn {
          background: #fd7e14;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s;
          white-space: nowrap;
          min-width: 120px;
        }
        .logout-user-btn:hover {
          background: #e8590c;
        }
        .delete-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s;
          white-space: nowrap;
          min-width: 120px;
        }
        .delete-btn:hover {
          background: #dc2626;
        }
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal.show {
          display: flex;
        }
        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 400px;
          width: 100%;
          text-align: center;
        }
        .modal-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #1a202c;
        }
        .modal-text {
          color: #64748b;
          margin-bottom: 25px;
          line-height: 1.6;
        }
        .modal-actions {
          display: flex;
          gap: 15px;
          justify-content: center;
        }
        .modal-btn {
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .modal-btn.cancel {
          background: #f1f5f9;
          color: #64748b;
        }
        .modal-btn.cancel:hover {
          background: #e2e8f0;
        }
        .modal-btn.confirm {
          background: #ef4444;
          color: white;
        }
        .modal-btn.confirm:hover {
          background: #dc2626;
        }
        .success-message {
          background: #10b981;
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
          display: none;
        }
        .success-message.show {
          display: block;
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }
          .header h1 {
            font-size: 20px;
          }
          .container {
            padding: 15px;
          }
          .stats {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }
          .user-header {
            flex-direction: column;
            align-items: stretch;
          }
          .user-details {
            grid-template-columns: 1fr;
          }
          .modal-actions {
            flex-direction: column;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-content">
          <h1>Bank of Ireland Admin Panel</h1>
          <button class="logout-btn" onclick="logout()">Logout</button>
        </div>
      </div>
      
      <div class="container">
        <div id="successMessage" class="success-message">
          Account deleted successfully.
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-number">${userSessions.length}</div>
            <div class="stat-label">Total Accounts</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${userSessions.filter((s: any) => s.isLoggedIn).length}</div>
            <div class="stat-label">Logged In</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${userSessions.filter((s: any) => !s.isLoggedIn).length}</div>
            <div class="stat-label">Never Logged In</div>
          </div>
        </div>
        
        <div class="users-section">
          <div class="section-header">
            <div class="section-title">User Accounts</div>
          </div>
          
          <div class="user-list">
            ${userSessions.length === 0 ? `
              <div class="empty-state">
                <div class="empty-icon">👥</div>
                <div>No active user sessions found</div>
              </div>
            ` : userSessions.map((session: any) => `
              <div class="user-item ${session.isLoggedIn ? 'logged-in' : 'not-logged-in'}" id="user-${session.customerNumber}">
                <div class="user-header">
                  <div class="user-info">
                    <div class="user-name">${session.name || 'Unknown User'} ${session.isLoggedIn ? '🟢' : '🔴'}</div>
                    <div class="user-email">${session.email || 'No email provided'}</div>
                    
                    <div class="user-details">
                      <div class="detail-item">
                        <div class="detail-label">Customer Number</div>
                        <div class="detail-value">${session.customerNumber}</div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">Phone</div>
                        <div class="detail-value">${session.phone || 'Not provided'}</div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">Device Info</div>
                        <div class="detail-value">${session.deviceInfo || 'Not logged in'}</div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">IP Address</div>
                        <div class="detail-value">${session.ipAddress || 'Unknown'}</div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">Login Time</div>
                        <div class="detail-value">${session.loginTime ? new Date(session.loginTime).toLocaleString() : 'Unknown'}</div>
                      </div>
                    </div>
                  </div>
                  <div class="user-actions">
                    ${session.isLoggedIn ? `
                      <button class="logout-user-btn" onclick="logoutUser('${session.customerNumber}', '${session.name || 'Unknown User'}')">
                        Remote Logout
                      </button>
                    ` : ''}
                    <button class="delete-btn" onclick="confirmDelete('${session.customerNumber}', '${session.name || 'Unknown User'}')">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <div id="deleteModal" class="modal">
        <div class="modal-content">
          <div class="modal-title">Delete Account</div>
          <div class="modal-text" id="deleteText">
            Are you sure you want to delete this account? This will log the user out on all devices.
          </div>
          <div class="modal-actions">
            <button class="modal-btn cancel" onclick="closeModal()">Cancel</button>
            <button class="modal-btn confirm" onclick="deleteAccount()">Delete Account</button>
          </div>
        </div>
      </div>
      
      <script>
        let currentCustomerNumber = null;
        
        function confirmDelete(customerNumber, username) {
          currentCustomerNumber = customerNumber;
          document.getElementById('deleteText').textContent = 
            \`Are you sure you want to delete \${username}'s account? This will log the user out on all devices.\`;
          document.getElementById('deleteModal').classList.add('show');
        }
        
        function closeModal() {
          document.getElementById('deleteModal').classList.remove('show');
          currentCustomerNumber = null;
        }
        
        async function deleteAccount() {
          if (!currentCustomerNumber) return;
          
          try {
            const response = await fetch('/admin/delete-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ customerNumber: currentCustomerNumber })
            });
            
            const result = await response.json();
            if (response.ok) {
              // Clear all cached data for the deleted user from browser storage
              try {
                // Clear localStorage entries for this customer
                const allKeys = Object.keys(localStorage);
                for (const key of allKeys) {
                  if (key.includes(currentCustomerNumber)) {
                    localStorage.removeItem(key);
                  }
                }
                
                // Clear sessionStorage entries
                const sessionKeys = Object.keys(sessionStorage);
                for (const key of sessionKeys) {
                  if (key.includes(currentCustomerNumber)) {
                    sessionStorage.removeItem(key);
                  }
                }
                
                // Clear current user if it matches deleted user
                if (localStorage.getItem('currentUser') === currentCustomerNumber) {
                  localStorage.removeItem('currentUser');
                }
                
                if (localStorage.getItem('lastActiveUser') === currentCustomerNumber) {
                  localStorage.removeItem('lastActiveUser');
                }
                
                console.log(\`🧹 Admin cleanup: Removed all browser data for customer \${currentCustomerNumber}\`);
              } catch (cleanupError) {
                console.error('Error during frontend cleanup:', cleanupError);
              }
              
              // Show success message
              document.getElementById('successMessage').classList.add('show');
              setTimeout(() => {
                document.getElementById('successMessage').classList.remove('show');
              }, 3000);
              
              // Update stats and reload to reflect changes
              updateStats();
            } else {
              console.error('Error deleting user:', result);
            }
          } catch (error) {
            console.error('Error deleting user:', error);
          }
          
          closeModal();
        }
        
        function updateStats() {
          // Reload page to update stats
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
        
        function logout() {
          window.location.href = '/admin/logout';
        }
        
        // Close modal when clicking outside
        document.getElementById('deleteModal').addEventListener('click', function(e) {
          if (e.target === this) {
            closeModal();
          }
        });
      </script>
    </body>
    </html>`;
    
    res.send(panelPage);
  } catch (error) {
    console.error('Error loading admin panel:', error);
    res.status(500).send('<h1>Error loading admin panel</h1><p>Please check server logs.</p>');
  }
});

// Delete user endpoint
router.post('/delete-user', adminAuth, async (req, res) => {
  const { customerNumber } = req.body;
  
  if (!customerNumber) {
    return res.status(400).json({ error: 'Customer number required' });
  }
  
  try {
    // Import required modules
    const { storage } = await import('./storage');
    const { invalidateAllUserSessions } = await import('./sessionManager');
    
    // First, verify user exists
    const user = await storage.getUserByCustomerNumber(customerNumber);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete user from database (this includes all accounts, transactions, payees, etc.)
    const userDeleted = await storage.deleteUser(customerNumber);
    
    if (userDeleted) {
      // Invalidate all active express sessions for this user
      const invalidatedSessions = invalidateAllUserSessions(customerNumber);
      
      // Remove all device sessions for this customer
      await deleteAllUserSessions(customerNumber);
      
      console.log(`Admin successfully deleted user account: ${customerNumber}`);
      console.log(`Database deletion: ${userDeleted ? 'SUCCESS' : 'FAILED'}`);
      console.log(`Invalidated ${invalidatedSessions.length} active sessions`);
      
      res.json({ 
        success: true, 
        message: 'User account permanently deleted and logged out from all devices',
        details: {
          userDeleted: true,
          sessionsInvalidated: invalidatedSessions.length
        }
      });
    } else {
      console.error(`Failed to delete user from database: ${customerNumber}`);
      res.status(500).json({ error: 'Failed to delete user from database' });
    }
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// Admin logout
router.get('/logout', (req, res) => {
  (req.session as any).adminAuth = false;
  res.redirect('/admin/login');
});

export default router;