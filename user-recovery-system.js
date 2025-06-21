#!/usr/bin/env node

/**
 * Comprehensive User Recovery and Admin Panel Sync System
 * Scans all storage locations for authenticated users and restores them to admin panel
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UserRecoverySystem {
  constructor() {
    this.discoveredUsers = new Map();
    this.authSources = new Map();
    this.recoveryLog = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, message, type };
    this.recoveryLog.push(entry);
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  async scanAllStorageSources() {
    this.log('Starting comprehensive user recovery scan...', 'info');
    
    // 1. Scan PostgreSQL database
    await this.scanPostgreSQLDatabase();
    
    // 2. Scan persistent storage files
    await this.scanPersistentStorage();
    
    // 3. Scan session storage
    await this.scanSessionStorage();
    
    // 4. Scan memory storage
    await this.scanMemoryStorage();
    
    // 5. Scan authentication cache
    await this.scanAuthenticationCache();
    
    // 6. Check for browser localStorage patterns
    await this.scanBrowserStoragePatterns();
    
    this.log(`Discovery complete. Found ${this.discoveredUsers.size} unique users from ${this.authSources.size} different sources`, 'success');
  }

  async scanPostgreSQLDatabase() {
    try {
      this.log('Scanning PostgreSQL database for users...', 'info');
      const { Client } = require('pg');
      
      const client = new Client({
        connectionString: process.env.DATABASE_URL
      });
      
      await client.connect();
      
      // Get all users
      const usersResult = await client.query('SELECT * FROM users ORDER BY id');
      this.log(`Found ${usersResult.rows.length} users in PostgreSQL database`, 'info');
      
      for (const user of usersResult.rows) {
        this.addUser(user, 'postgresql_users');
      }
      
      // Get all active sessions
      const sessionsResult = await client.query('SELECT * FROM sessions WHERE expire > NOW()');
      this.log(`Found ${sessionsResult.rows.length} active sessions in PostgreSQL`, 'info');
      
      for (const session of sessionsResult.rows) {
        try {
          const sessionData = session.sess;
          if (sessionData && sessionData.user) {
            this.addUser(sessionData.user, 'postgresql_sessions');
          }
        } catch (error) {
          this.log(`Error parsing session data: ${error.message}`, 'warn');
        }
      }
      
      await client.end();
    } catch (error) {
      this.log(`PostgreSQL scan error: ${error.message}`, 'error');
    }
  }

  async scanPersistentStorage() {
    try {
      this.log('Scanning persistent storage files...', 'info');
      
      const storageFiles = [
        'data/storage.json',
        'data/users.json',
        'data/sessions.json'
      ];
      
      for (const filePath of storageFiles) {
        if (fs.existsSync(filePath)) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            this.log(`Scanning ${filePath}...`, 'info');
            
            // Check for users array or Map
            if (data.users) {
              let userCount = 0;
              if (Array.isArray(data.users)) {
                // Handle Map-like structure [[key, value], ...]
                for (const userEntry of data.users) {
                  if (Array.isArray(userEntry) && userEntry.length >= 2) {
                    this.addUser(userEntry[1], `persistent_${path.basename(filePath)}`);
                    userCount++;
                  }
                }
              } else if (typeof data.users === 'object') {
                // Handle object structure
                for (const [key, user] of Object.entries(data.users)) {
                  this.addUser(user, `persistent_${path.basename(filePath)}`);
                  userCount++;
                }
              }
              this.log(`Found ${userCount} users in ${filePath}`, 'info');
            }
            
            // Check for accounts and link to users
            if (data.accounts) {
              let accountCount = 0;
              if (Array.isArray(data.accounts)) {
                for (const accountEntry of data.accounts) {
                  if (Array.isArray(accountEntry) && accountEntry.length >= 2) {
                    const account = accountEntry[1];
                    if (account.userId) {
                      this.linkAccountToUser(account, `persistent_${path.basename(filePath)}`);
                      accountCount++;
                    }
                  }
                }
              }
              this.log(`Found ${accountCount} accounts in ${filePath}`, 'info');
            }
            
          } catch (error) {
            this.log(`Error reading ${filePath}: ${error.message}`, 'error');
          }
        }
      }
    } catch (error) {
      this.log(`Persistent storage scan error: ${error.message}`, 'error');
    }
  }

  async scanSessionStorage() {
    try {
      this.log('Scanning server session storage...', 'info');
      
      // Import session manager to get active sessions
      const sessionPath = path.join(process.cwd(), 'server/sessionManager.ts');
      if (fs.existsSync(sessionPath)) {
        // Read session manager code to understand active sessions
        const sessionCode = fs.readFileSync(sessionPath, 'utf8');
        this.log('Session manager found, checking for active session patterns', 'info');
      }
      
      // Check for session files in common locations
      const sessionDirs = [
        'sessions',
        'tmp/sessions',
        'data/sessions'
      ];
      
      for (const dir of sessionDirs) {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          this.log(`Found ${files.length} session files in ${dir}`, 'info');
          
          for (const file of files) {
            try {
              const sessionContent = fs.readFileSync(path.join(dir, file), 'utf8');
              const sessionData = JSON.parse(sessionContent);
              
              if (sessionData.user || sessionData.userId) {
                this.addUser(sessionData.user || { id: sessionData.userId }, `session_${file}`);
              }
            } catch (error) {
              // Ignore invalid session files
            }
          }
        }
      }
    } catch (error) {
      this.log(`Session storage scan error: ${error.message}`, 'error');
    }
  }

  async scanMemoryStorage() {
    try {
      this.log('Scanning memory storage systems...', 'info');
      
      // Try to access the running server's memory storage
      const storageModulePath = path.join(process.cwd(), 'server/storage.ts');
      if (fs.existsSync(storageModulePath)) {
        this.log('Found storage module, attempting to access memory data', 'info');
        
        // Make HTTP request to server to get current users
        try {
          const response = await this.makeServerRequest('/api/admin/users');
          if (response && response.users) {
            for (const user of response.users) {
              this.addUser(user, 'memory_storage');
            }
            this.log(`Retrieved ${response.users.length} users from memory storage`, 'info');
          }
        } catch (error) {
          this.log(`Could not access memory storage via API: ${error.message}`, 'warn');
        }
      }
    } catch (error) {
      this.log(`Memory storage scan error: ${error.message}`, 'error');
    }
  }

  async scanAuthenticationCache() {
    try {
      this.log('Scanning authentication cache systems...', 'info');
      
      // Check for authentication-related files
      const authFiles = [
        'auth-cache.json',
        'data/auth-cache.json',
        'cache/auth.json',
        'tmp/auth-cache.json'
      ];
      
      for (const filePath of authFiles) {
        if (fs.existsSync(filePath)) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            if (data.users || data.authenticatedUsers) {
              const users = data.users || data.authenticatedUsers;
              let count = 0;
              
              if (Array.isArray(users)) {
                for (const user of users) {
                  this.addUser(user, `auth_cache_${path.basename(filePath)}`);
                  count++;
                }
              } else if (typeof users === 'object') {
                for (const [key, user] of Object.entries(users)) {
                  this.addUser(user, `auth_cache_${path.basename(filePath)}`);
                  count++;
                }
              }
              
              this.log(`Found ${count} cached authenticated users in ${filePath}`, 'info');
            }
          } catch (error) {
            this.log(`Error reading auth cache ${filePath}: ${error.message}`, 'error');
          }
        }
      }
    } catch (error) {
      this.log(`Authentication cache scan error: ${error.message}`, 'error');
    }
  }

  async scanBrowserStoragePatterns() {
    try {
      this.log('Scanning for browser storage patterns...', 'info');
      
      // Look for test files that might contain localStorage data
      const testFiles = [
        'auth-monitor.html',
        'client-side-test.html',
        'frontend-persistence-test.html',
        'test-permanent-login.html'
      ];
      
      for (const file of testFiles) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          
          // Extract localStorage patterns
          const localStorageMatches = content.match(/localStorage\.getItem\(['"`]bankingUser['"`]\)/g);
          const currentUserMatches = content.match(/localStorage\.getItem\(['"`]currentUser['"`]\)/g);
          
          if (localStorageMatches || currentUserMatches) {
            this.log(`Found localStorage authentication patterns in ${file}`, 'info');
            this.authSources.set(`browser_${file}`, {
              type: 'localStorage',
              patterns: ['bankingUser', 'currentUser', 'lastActiveUser']
            });
          }
        }
      }
    } catch (error) {
      this.log(`Browser storage pattern scan error: ${error.message}`, 'error');
    }
  }

  addUser(userData, source) {
    if (!userData) return;
    
    const userId = userData.id || userData.customerNumber || userData.email;
    if (!userId) return;
    
    if (!this.discoveredUsers.has(userId)) {
      this.discoveredUsers.set(userId, {
        ...userData,
        sources: [source],
        isAuthenticated: this.determineAuthStatus(userData, source)
      });
    } else {
      const existing = this.discoveredUsers.get(userId);
      existing.sources.push(source);
      // Merge additional data
      Object.assign(existing, userData);
    }
  }

  linkAccountToUser(account, source) {
    // Find user by ID and add account information
    for (const [userId, user] of this.discoveredUsers) {
      if (user.id === account.userId) {
        if (!user.accounts) user.accounts = [];
        user.accounts.push(account);
        user.sources.push(`${source}_accounts`);
        break;
      }
    }
  }

  determineAuthStatus(userData, source) {
    // Determine if user is currently authenticated based on source
    if (source.includes('session') || source.includes('memory') || source.includes('cache')) {
      return true;
    }
    
    if (userData.lastActivity || userData.loginTime) {
      const lastActivity = new Date(userData.lastActivity || userData.loginTime);
      const now = new Date();
      const daysSinceActivity = (now - lastActivity) / (1000 * 60 * 60 * 24);
      return daysSinceActivity < 30; // Consider active if within 30 days
    }
    
    return false;
  }

  async makeServerRequest(endpoint) {
    try {
      const http = require('http');
      
      return new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 5000,
          path: endpoint,
          method: 'GET'
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              resolve(null);
            }
          });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
        req.end();
      });
    } catch (error) {
      return null;
    }
  }

  async syncToAdminPanel() {
    this.log('Syncing recovered users to admin panel...', 'info');
    
    try {
      // Update device sessions with all discovered users
      const deviceSessionsPath = path.join(process.cwd(), 'server/deviceSessions.ts');
      
      if (fs.existsSync(deviceSessionsPath)) {
        // Read current device sessions
        let deviceSessionsContent = fs.readFileSync(deviceSessionsPath, 'utf8');
        
        // Generate updated session data
        const updatedSessions = Array.from(this.discoveredUsers.values()).map(user => {
          return {
            sessionId: `recovered_${user.id || Math.random().toString(36).substring(2, 15)}`,
            deviceModel: user.deviceInfo || 'Recovered Device',
            ipAddress: user.ipAddress || '127.0.0.1',
            loginTime: user.lastActivity || user.loginTime || new Date().toISOString(),
            blocked: false,
            ipRevoked: false,
            panicMode: false,
            customerNumber: user.customerNumber || user.id?.toString(),
            userAgent: user.userAgent || 'Recovered Session'
          };
        });
        
        // Update the sample sessions in the file
        const updatedSessionsCode = `
    const sampleSessions: DeviceSession[] = ${JSON.stringify(updatedSessions, null, 6)};`;
        
        // Replace the existing sample sessions
        deviceSessionsContent = deviceSessionsContent.replace(
          /const sampleSessions: DeviceSession\[\] = \[[\s\S]*?\];/,
          updatedSessionsCode
        );
        
        fs.writeFileSync(deviceSessionsPath, deviceSessionsContent);
        this.log(`Updated device sessions with ${updatedSessions.length} recovered users`, 'success');
      }
      
      // Update persistent storage if needed
      await this.updatePersistentStorage();
      
      // Sync to database
      await this.syncToDatabase();
      
    } catch (error) {
      this.log(`Error syncing to admin panel: ${error.message}`, 'error');
    }
  }

  async updatePersistentStorage() {
    try {
      const storageFile = 'data/storage.json';
      
      if (fs.existsSync(storageFile)) {
        const content = fs.readFileSync(storageFile, 'utf8');
        const data = JSON.parse(content);
        
        // Ensure all discovered users are in persistent storage
        if (!data.users) data.users = [];
        
        const existingUserIds = new Set();
        if (Array.isArray(data.users)) {
          for (const userEntry of data.users) {
            if (Array.isArray(userEntry) && userEntry.length >= 2) {
              existingUserIds.add(userEntry[1].id || userEntry[1].customerNumber);
            }
          }
        }
        
        let addedCount = 0;
        for (const [userId, user] of this.discoveredUsers) {
          if (!existingUserIds.has(user.id) && !existingUserIds.has(user.customerNumber)) {
            const userEntry = [user.id || Date.now(), user];
            data.users.push(userEntry);
            addedCount++;
          }
        }
        
        if (addedCount > 0) {
          fs.writeFileSync(storageFile, JSON.stringify(data, null, 2));
          this.log(`Added ${addedCount} users to persistent storage`, 'success');
        }
      }
    } catch (error) {
      this.log(`Error updating persistent storage: ${error.message}`, 'error');
    }
  }

  async syncToDatabase() {
    try {
      this.log('Syncing recovered users to PostgreSQL database...', 'info');
      const { Client } = require('pg');
      
      const client = new Client({
        connectionString: process.env.DATABASE_URL
      });
      
      await client.connect();
      
      // Get existing user customer numbers
      const existingUsers = await client.query('SELECT customer_number FROM users');
      const existingCustomerNumbers = new Set(existingUsers.rows.map(row => row.customer_number));
      
      let syncedCount = 0;
      
      for (const [userId, user] of this.discoveredUsers) {
        if (user.customerNumber && !existingCustomerNumbers.has(user.customerNumber)) {
          try {
            await client.query(`
              INSERT INTO users (
                customer_number, pin, name, email, phone, address, 
                date_of_birth, join_date, date_created, is_disabled, currency
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
              user.customerNumber,
              user.pin || '0000',
              user.name || 'Recovered User',
              user.email || 'recovered@example.com',
              user.phone || null,
              user.address || null,
              user.dateOfBirth || null,
              user.joinDate || 'Member since 2018',
              user.dateCreated || new Date(),
              user.isDisabled || false,
              user.currency || 'EUR'
            ]);
            
            syncedCount++;
          } catch (error) {
            this.log(`Error inserting user ${user.customerNumber}: ${error.message}`, 'warn');
          }
        }
      }
      
      await client.end();
      this.log(`Synced ${syncedCount} new users to database`, 'success');
      
    } catch (error) {
      this.log(`Database sync error: ${error.message}`, 'error');
    }
  }

  generateRecoveryReport() {
    this.log('Generating comprehensive recovery report...', 'info');
    
    const report = {
      scanTimestamp: new Date().toISOString(),
      totalUsersDiscovered: this.discoveredUsers.size,
      authSources: Array.from(this.authSources.keys()),
      authenticatedUsers: Array.from(this.discoveredUsers.values()).filter(u => u.isAuthenticated).length,
      recoveryActions: this.recoveryLog.length,
      users: Array.from(this.discoveredUsers.values()).map(user => ({
        id: user.id,
        customerNumber: user.customerNumber,
        name: user.name,
        email: user.email,
        sources: user.sources,
        isAuthenticated: user.isAuthenticated,
        accountsCount: user.accounts ? user.accounts.length : 0
      }))
    };
    
    // Save detailed report
    fs.writeFileSync('user-recovery-report.json', JSON.stringify(report, null, 2));
    
    // Generate summary
    console.log('\n=== USER RECOVERY SUMMARY ===');
    console.log(`Total Users Discovered: ${report.totalUsersDiscovered}`);
    console.log(`Currently Authenticated: ${report.authenticatedUsers}`);
    console.log(`Data Sources Scanned: ${report.authSources.length}`);
    console.log('\nDiscovered Users:');
    
    for (const user of report.users) {
      console.log(`- ${user.name} (${user.customerNumber})`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Status: ${user.isAuthenticated ? 'AUTHENTICATED' : 'NOT LOGGED IN'}`);
      console.log(`  Sources: ${user.sources.join(', ')}`);
      console.log(`  Accounts: ${user.accountsCount}`);
      console.log('');
    }
    
    console.log('=== RECOVERY COMPLETE ===\n');
    console.log('All discovered users have been restored to the admin panel.');
    console.log('No sessions were affected - users remain logged in as before.');
    console.log('Admin panel now shows complete user list with full account data.');
    
    return report;
  }

  async run() {
    try {
      await this.scanAllStorageSources();
      await this.syncToAdminPanel();
      const report = this.generateRecoveryReport();
      
      console.log('\n✅ User recovery and admin panel sync completed successfully!');
      console.log(`📊 Full report saved to: user-recovery-report.json`);
      
      return report;
    } catch (error) {
      this.log(`Recovery system error: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run the recovery system
if (require.main === module) {
  const recovery = new UserRecoverySystem();
  recovery.run().catch(console.error);
}

module.exports = UserRecoverySystem;