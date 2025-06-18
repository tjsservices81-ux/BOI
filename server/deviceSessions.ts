import { getAllApprovedIPs } from './ipControl';
import fs from 'fs';
import path from 'path';

interface DeviceSession {
  sessionId: string;
  deviceModel: string;
  ipAddress: string;
  loginTime: string;
  blocked: boolean;
  ipRevoked?: boolean;
  userAgent?: string;
  panicMode?: boolean;
  customerNumber?: string;
}

// In-memory storage for device sessions
let deviceSessions: DeviceSession[] = [];
let blockedDevices: Set<string> = new Set();
let devicePanicMode: Set<string> = new Set();
let customerPanicMode: Set<string> = new Set();

// Generate sample device sessions for demo
function initializeSampleSessions() {
  // Always initialize sample sessions for admin panel demonstration
  if (deviceSessions.length === 0) {
    const sampleSessions: DeviceSession[] = [
      {
        sessionId: 'sess_' + Math.random().toString(36).substring(2, 15),
        deviceModel: 'iPhone 15 Pro',
        ipAddress: '192.168.1.100',
        loginTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        blocked: false,
        ipRevoked: false,
        panicMode: false,
        customerNumber: 'BOI050171232',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
      },
      {
        sessionId: 'sess_' + Math.random().toString(36).substring(2, 15),
        deviceModel: 'Samsung Galaxy S24',
        ipAddress: '192.168.1.101',
        loginTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        blocked: false,
        ipRevoked: false,
        panicMode: false,
        customerNumber: '12345678',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S921B)'
      },
      {
        sessionId: 'sess_' + Math.random().toString(36).substring(2, 15),
        deviceModel: 'iPad Air',
        ipAddress: '192.168.1.102',
        loginTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        blocked: false,
        ipRevoked: false,
        panicMode: false,
        customerNumber: 'BOI911163841',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'
      }
    ];
    
    deviceSessions = sampleSessions;
  }
}

function isIPApproved(ip: string): boolean {
  const approvedIPs = getAllApprovedIPs();
  return approvedIPs.includes(ip);
}

export function getAllDeviceSessions(): DeviceSession[] {
  initializeSampleSessions();
  return deviceSessions.map(session => ({
    ...session,
    blocked: blockedDevices.has(session.sessionId),
    ipRevoked: !isIPApproved(session.ipAddress),
    panicMode: devicePanicMode.has(session.sessionId)
  }));
}

export function blockDevice(sessionId: string): boolean {
  const session = deviceSessions.find(s => s.sessionId === sessionId);
  if (session) {
    blockedDevices.add(sessionId);
    return true;
  }
  return false;
}

export function unblockDevice(sessionId: string): boolean {
  const session = deviceSessions.find(s => s.sessionId === sessionId);
  if (session) {
    blockedDevices.delete(sessionId);
    return true;
  }
  return false;
}

export function isDeviceBlocked(sessionId: string): boolean {
  return blockedDevices.has(sessionId);
}

export function addDeviceSession(session: Omit<DeviceSession, 'sessionId' | 'loginTime' | 'blocked' | 'ipRevoked'>): string {
  const sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
  const newSession: DeviceSession = {
    ...session,
    sessionId,
    loginTime: new Date().toISOString(),
    blocked: false,
    ipRevoked: false
  };
  
  deviceSessions.push(newSession);
  return sessionId;
}

export function removeDeviceSession(sessionId: string): boolean {
  const index = deviceSessions.findIndex(s => s.sessionId === sessionId);
  if (index !== -1) {
    deviceSessions.splice(index, 1);
    blockedDevices.delete(sessionId);
    devicePanicMode.delete(sessionId);
    return true;
  }
  return false;
}

export function activateDevicePanicMode(sessionId: string): boolean {
  const session = deviceSessions.find(s => s.sessionId === sessionId);
  if (session) {
    devicePanicMode.add(sessionId);
    if (session.customerNumber) {
      customerPanicMode.add(session.customerNumber);
    }
    console.log(`🚨 DEVICE PANIC MODE ACTIVATED: ${session.deviceModel} (${sessionId}) for customer ${session.customerNumber} at ${new Date().toISOString()}`);
    return true;
  }
  return false;
}

export function deactivateDevicePanicMode(sessionId: string): boolean {
  const session = deviceSessions.find(s => s.sessionId === sessionId);
  if (session) {
    devicePanicMode.delete(sessionId);
    if (session.customerNumber) {
      customerPanicMode.delete(session.customerNumber);
    }
    console.log(`✅ DEVICE PANIC MODE DEACTIVATED: ${session.deviceModel} (${sessionId}) for customer ${session.customerNumber} at ${new Date().toISOString()}`);
    return true;
  }
  return false;
}

export function isDeviceInPanicMode(sessionId: string): boolean {
  return devicePanicMode.has(sessionId);
}

export function isCustomerInPanicMode(customerNumber: string): boolean {
  return customerPanicMode.has(customerNumber);
}

export async function getUserSessions() {
  // Initialize sample sessions if needed
  initializeSampleSessions();
  
  // Import storage to access user data
  const { storage } = await import('./storage');
  
  try {
    // Ensure storage is fully initialized before accessing data
    await storage.waitForInitialization();
    
    // Get all users from the storage system
    const allUsers = await storage.getAllUsers();
    
    console.log(`getUserSessions: Found ${allUsers.length} users in database`);
    
    // Create a map of all users with their session info (if any)
    const userSessionsMap = new Map();
    
    // Process each user and load their accounts
    for (const user of allUsers) {
      // Get user's banking accounts
      const userAccounts = await storage.getUserAccounts(user.customerNumber);
      
      userSessionsMap.set(user.customerNumber, {
        sessionId: `user_${user.id}`, // Use user ID as fallback session ID
        username: user.name || user.customerNumber,
        email: user.email || 'No email provided',
        dateOfBirth: user.dateOfBirth || 'Not provided',
        deviceInfo: 'Not logged in',
        ipAddress: 'N/A',
        loginTime: 'Never logged in',
        customerNumber: user.customerNumber,
        isLoggedIn: false,
        accounts: userAccounts || [] // Include accounts data
      });
    }
    
    // Then update with actual device session data for logged-in users
    deviceSessions.forEach(session => {
      if (session.customerNumber && userSessionsMap.has(session.customerNumber)) {
        const user = allUsers.find(u => u.customerNumber === session.customerNumber);
        const existingData = userSessionsMap.get(session.customerNumber);
        userSessionsMap.set(session.customerNumber, {
          sessionId: session.sessionId,
          username: user?.name || session.customerNumber || 'Unknown User',
          email: user?.email || 'No email provided',
          dateOfBirth: user?.dateOfBirth || 'Not provided',
          deviceInfo: session.deviceModel || 'Unknown Device',
          ipAddress: session.ipAddress || 'Unknown',
          loginTime: session.loginTime || new Date().toISOString(),
          customerNumber: session.customerNumber,
          isLoggedIn: true,
          accounts: existingData?.accounts || [] // Preserve accounts data
        });
      }
    });
    
    return Array.from(userSessionsMap.values());
  } catch (error) {
    console.error('Error accessing user data from storage:', error);
    // Fallback to device session data only
    return deviceSessions.map(session => ({
      sessionId: session.sessionId,
      username: session.customerNumber || 'Unknown User',
      email: 'No email provided',
      dateOfBirth: 'Not provided',
      deviceInfo: session.deviceModel || 'Unknown Device',
      ipAddress: session.ipAddress || 'Unknown',
      loginTime: session.loginTime || new Date().toISOString(),
      customerNumber: session.customerNumber,
      isLoggedIn: true,
      accounts: [] // Empty accounts array for fallback
    }));
  }
}

export async function deleteAllUserSessions(customerNumber: string): Promise<boolean> {
  try {
    // Import session manager
    const { invalidateAllUserSessions } = await import('./sessionManager');
    
    // Invalidate all active express sessions for this user
    const invalidatedSessions = invalidateAllUserSessions(customerNumber);
    
    // Remove ALL device sessions for this customer
    const customerSessions = deviceSessions.filter(s => s.customerNumber === customerNumber);
    customerSessions.forEach(s => {
      removeDeviceSession(s.sessionId);
      // Also remove from panic mode if active
      devicePanicMode.delete(s.sessionId);
    });
    
    // Remove customer from panic mode
    customerPanicMode.delete(customerNumber);
    
    console.log(`Invalidated ${invalidatedSessions.length} active sessions for customer: ${customerNumber}`);
    console.log(`Removed ${customerSessions.length} device sessions`);
    return true;
  } catch (error) {
    console.error('Error deleting all user sessions:', error);
    return false;
  }
}

export async function deleteUserSession(sessionId: string): Promise<boolean> {
  try {
    // Import storage and session manager
    const { storage } = await import('./storage');
    const { invalidateAllUserSessions } = await import('./sessionManager');
    
    let customerNumber: string | undefined;
    
    // Check if this is a real device session
    const session = deviceSessions.find(s => s.sessionId === sessionId);
    if (session && session.customerNumber) {
      customerNumber = session.customerNumber;
    } else if (sessionId.startsWith('user_')) {
      // Handle fallback user session IDs (user_123 format)
      const userId = parseInt(sessionId.replace('user_', ''));
      const user = await storage.getUserByCredentials('', ''); // We need to get user by ID
      const allUsers = await storage.getAllUsers();
      const targetUser = allUsers.find(u => u.id === userId);
      if (targetUser) {
        customerNumber = targetUser.customerNumber;
      }
    }
    
    if (customerNumber) {
      // Delete the complete user account from database
      const userDeleted = await storage.deleteUser(customerNumber);
      
      if (userDeleted) {
        // Invalidate all active express sessions for this user
        const invalidatedSessions = invalidateAllUserSessions(customerNumber);
        
        // Remove ALL device sessions for this customer
        const customerSessions = deviceSessions.filter(s => s.customerNumber === customerNumber);
        customerSessions.forEach(s => {
          removeDeviceSession(s.sessionId);
          // Also remove from panic mode if active
          devicePanicMode.delete(s.sessionId);
        });
        
        // Remove customer from panic mode
        customerPanicMode.delete(customerNumber);
        
        console.log(`Successfully deleted user account for customer: ${customerNumber}`);
        console.log(`Invalidated ${invalidatedSessions.length} active sessions`);
        console.log(`Removed ${customerSessions.length} device sessions`);
        return true;
      }
    }
  } catch (error) {
    console.error('Error deleting user account:', error);
  }
  return false;
}