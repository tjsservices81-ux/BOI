import { storage } from './storage';

interface UserSession {
  customerNumber: string;
  name: string;
  email: string;
  phone: string | null;
  isLoggedIn: boolean;
  lastLoginTime: string | null;
  deviceInfo: string;
  ipAddress: string;
  sessionStartTime: string | null;
}

// In-memory session tracking
let userSessions: Map<string, UserSession> = new Map();

export class SessionManager {
  // Initialize session for a user (login)
  static async loginUser(customerNumber: string, deviceInfo: string, ipAddress: string): Promise<void> {
    try {
      // Get user data from database
      const user = await storage.getUserByCustomerNumber(customerNumber);
      if (!user) {
        console.warn(`Session login failed: User ${customerNumber} not found`);
        return;
      }

      const session: UserSession = {
        customerNumber,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isLoggedIn: true,
        lastLoginTime: new Date().toISOString(),
        deviceInfo,
        ipAddress,
        sessionStartTime: new Date().toISOString()
      };

      userSessions.set(customerNumber, session);
      console.log(`✅ Session created for user ${customerNumber} (${user.name})`);
    } catch (error) {
      console.error('Session login error:', error);
    }
  }

  // End session for a user (logout)
  static async logoutUser(customerNumber: string): Promise<void> {
    const session = userSessions.get(customerNumber);
    if (session) {
      session.isLoggedIn = false;
      session.sessionStartTime = null;
      userSessions.set(customerNumber, session);
      console.log(`🔐 Session ended for user ${customerNumber} (${session.name})`);
    }
  }

  // Check if user is currently logged in
  static isUserLoggedIn(customerNumber: string): boolean {
    const session = userSessions.get(customerNumber);
    return session ? session.isLoggedIn : false;
  }

  // Get all user sessions for admin panel
  static async getAllUserSessions(): Promise<UserSession[]> {
    try {
      // Get all users from database
      const allUsers = await storage.getAllUsers();
      
      // Update sessions with latest user data
      for (const user of allUsers) {
        const existingSession = userSessions.get(user.customerNumber);
        
        if (existingSession) {
          // Update existing session with latest user data
          existingSession.name = user.name;
          existingSession.email = user.email;
          existingSession.phone = user.phone;
        } else {
          // Create session entry for users who haven't logged in yet
          const newSession: UserSession = {
            customerNumber: user.customerNumber,
            name: user.name,
            email: user.email,
            phone: user.phone,
            isLoggedIn: false,
            lastLoginTime: null,
            deviceInfo: 'Not logged in',
            ipAddress: 'N/A',
            sessionStartTime: null
          };
          userSessions.set(user.customerNumber, newSession);
        }
      }

      return Array.from(userSessions.values());
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  // Get session info for specific user
  static getUserSession(customerNumber: string): UserSession | null {
    return userSessions.get(customerNumber) || null;
  }

  // Force logout user (admin action)
  static async forceLogoutUser(customerNumber: string): Promise<boolean> {
    const session = userSessions.get(customerNumber);
    if (session && session.isLoggedIn) {
      await this.logoutUser(customerNumber);
      console.log(`👮 ADMIN FORCE LOGOUT: User ${customerNumber} (${session.name}) forcibly logged out`);
      return true;
    }
    return false;
  }

  // Get login statistics
  static getLoginStats(): { totalUsers: number; loggedIn: number; neverLoggedIn: number } {
    const sessions = Array.from(userSessions.values());
    const totalUsers = sessions.length;
    const loggedIn = sessions.filter(s => s.isLoggedIn).length;
    const neverLoggedIn = sessions.filter(s => !s.lastLoginTime).length;

    return { totalUsers, loggedIn, neverLoggedIn };
  }

  // Initialize sessions for existing users
  static async initializeSessions(): Promise<void> {
    try {
      await this.getAllUserSessions(); // This will populate sessions for all users
      console.log('Session manager initialized');
    } catch (error) {
      console.error('Session manager initialization error:', error);
    }
  }
}

// Export the session manager instance
export const sessionManager = SessionManager;