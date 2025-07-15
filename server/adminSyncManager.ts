import { type User } from "@shared/schema";
import { EventEmitter } from 'events';

// In-memory admin panel sync manager
class AdminSyncManager extends EventEmitter {
  private verifiedUsers: Map<string, any> = new Map();
  private loginSessions: Map<string, any> = new Map();
  private verificationEvents: Map<string, any> = new Map();
  private stats = {
    totalUsers: 0,
    verifiedToday: 0,
    activeLogins: 0,
    lastUpdate: new Date()
  };

  // Add user to admin panel tracking
  async addUserToAdminPanel(user: User, source: 'registration' | 'login' | 'verification') {
    const userData = {
      id: user.id,
      customerNumber: user.customerNumber,
      name: user.name,
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      source,
      addedAt: new Date().toISOString(),
      verificationStatus: 'pending',
      loginStatus: 'registered',
      lastActivity: new Date().toISOString()
    };

    this.verifiedUsers.set(user.customerNumber, userData);
    this.updateStats();
    this.emit('userAdded', userData);
    
    console.log(`📊 ADMIN SYNC: Added ${user.name} (${user.customerNumber}) from ${source}`);
    return userData;
  }

  // Update user login status
  async updateUserLoginStatus(user: User, sessionInfo: any) {
    const existing = this.verifiedUsers.get(user.customerNumber);
    if (existing) {
      existing.loginStatus = 'active';
      existing.lastActivity = new Date().toISOString();
      existing.deviceModel = sessionInfo.deviceModel;
      existing.ipAddress = sessionInfo.ipAddress;
      existing.sessionId = sessionInfo.sessionId;
      existing.loginTime = sessionInfo.loginTime;
    } else {
      // Add user if not already tracked
      await this.addUserToAdminPanel(user, 'login');
    }

    this.loginSessions.set(user.customerNumber, sessionInfo);
    this.updateStats();
    this.emit('userLoginUpdated', { user, sessionInfo });
    
    console.log(`📊 ADMIN SYNC: Updated login status for ${user.name}`);
  }

  // Update user verification status
  async updateUserVerificationStatus(user: User, verificationInfo: any) {
    const existing = this.verifiedUsers.get(user.customerNumber);
    if (existing) {
      existing.verificationStatus = 'verified';
      existing.verificationType = verificationInfo.verificationType;
      existing.verificationTime = verificationInfo.verificationTime;
      existing.lastActivity = new Date().toISOString();
    } else {
      // Add user if not already tracked
      await this.addUserToAdminPanel(user, 'verification');
    }

    this.verificationEvents.set(user.customerNumber, verificationInfo);
    this.updateStats();
    this.emit('userVerificationUpdated', { user, verificationInfo });
    
    console.log(`📊 ADMIN SYNC: Updated verification status for ${user.name}`);
  }

  // Remove user from admin panel
  async removeUserFromAdminPanel(customerNumber: string) {
    const userData = this.verifiedUsers.get(customerNumber);
    if (userData) {
      this.verifiedUsers.delete(customerNumber);
      this.loginSessions.delete(customerNumber);
      this.verificationEvents.delete(customerNumber);
      this.updateStats();
      this.emit('userRemoved', userData);
      
      console.log(`📊 ADMIN SYNC: Removed ${userData.name} (${customerNumber})`);
      return true;
    }
    return false;
  }

  // Get all verified users for admin panel
  getAllVerifiedUsers(): any[] {
    return Array.from(this.verifiedUsers.values()).sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  // Get admin panel stats
  getAdminStats() {
    return {
      ...this.stats,
      lastUpdate: new Date().toISOString()
    };
  }

  // Search users
  searchUsers(query: string): any[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.verifiedUsers.values()).filter(user => 
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      user.customerNumber.toLowerCase().includes(searchTerm)
    );
  }

  // Update internal stats
  private updateStats() {
    const now = new Date();
    const today = now.toDateString();
    
    this.stats.totalUsers = this.verifiedUsers.size;
    this.stats.verifiedToday = Array.from(this.verifiedUsers.values())
      .filter(user => new Date(user.addedAt).toDateString() === today).length;
    this.stats.activeLogins = Array.from(this.verifiedUsers.values())
      .filter(user => user.loginStatus === 'active').length;
    this.stats.lastUpdate = now;
  }
}

// Export singleton instance
export const adminSyncManager = new AdminSyncManager();

// Export functions for import in routes.ts
export async function addUserToAdminPanel(user: User, source: 'registration' | 'login' | 'verification') {
  return adminSyncManager.addUserToAdminPanel(user, source);
}

export async function updateUserLoginStatus(user: User, sessionInfo: any) {
  return adminSyncManager.updateUserLoginStatus(user, sessionInfo);
}

export async function updateUserVerificationStatus(user: User, verificationInfo: any) {
  return adminSyncManager.updateUserVerificationStatus(user, verificationInfo);
}

export async function removeUserFromAdminPanel(customerNumber: string) {
  return adminSyncManager.removeUserFromAdminPanel(customerNumber);
}

export function getAllVerifiedUsers() {
  return adminSyncManager.getAllVerifiedUsers();
}

export function getAdminStats() {
  return adminSyncManager.getAdminStats();
}

export function searchUsers(query: string) {
  return adminSyncManager.searchUsers(query);
}