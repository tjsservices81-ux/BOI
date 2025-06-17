// Global session management for user account deletion and logout
import { Request } from 'express';

interface UserSession {
  sessionId: string;
  customerNumber: string;
  userId: number;
  loginTime: Date;
  lastActivity: Date;
}

// Track all active user sessions
const activeSessions = new Map<string, UserSession>();
const userSessionMap = new Map<string, Set<string>>(); // customerNumber -> Set of sessionIds

export function addUserSession(sessionId: string, customerNumber: string, userId: number): void {
  const session: UserSession = {
    sessionId,
    customerNumber,
    userId,
    loginTime: new Date(),
    lastActivity: new Date()
  };
  
  activeSessions.set(sessionId, session);
  
  // Add to user's session set
  if (!userSessionMap.has(customerNumber)) {
    userSessionMap.set(customerNumber, new Set());
  }
  userSessionMap.get(customerNumber)!.add(sessionId);
  
  console.log(`Session added for customer ${customerNumber}: ${sessionId}`);
}

export function removeUserSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    const customerNumber = session.customerNumber;
    activeSessions.delete(sessionId);
    
    // Remove from user's session set
    const userSessions = userSessionMap.get(customerNumber);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        userSessionMap.delete(customerNumber);
      }
    }
    
    console.log(`Session removed for customer ${customerNumber}: ${sessionId}`);
  }
}

export function updateSessionActivity(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.lastActivity = new Date();
  }
}

export function invalidateAllUserSessions(customerNumber: string): string[] {
  const userSessions = userSessionMap.get(customerNumber);
  const invalidatedSessions: string[] = [];
  
  if (userSessions) {
    Array.from(userSessions).forEach(sessionId => {
      activeSessions.delete(sessionId);
      invalidatedSessions.push(sessionId);
    });
    userSessionMap.delete(customerNumber);
    console.log(`Invalidated ${invalidatedSessions.length} sessions for customer ${customerNumber}`);
  }
  
  return invalidatedSessions;
}

export function isSessionValid(sessionId: string, customerNumber: string): boolean {
  const session = activeSessions.get(sessionId);
  return session !== undefined && session.customerNumber === customerNumber;
}

export function getUserActiveSessions(customerNumber: string): UserSession[] {
  const userSessions = userSessionMap.get(customerNumber);
  const sessions: UserSession[] = [];
  
  if (userSessions) {
    Array.from(userSessions).forEach(sessionId => {
      const session = activeSessions.get(sessionId);
      if (session) {
        sessions.push(session);
      }
    });
  }
  
  return sessions;
}

export function getAllActiveSessions(): UserSession[] {
  return Array.from(activeSessions.values());
}

// Express middleware to track session activity
export function sessionTrackingMiddleware(req: Request & { session?: any }, res: any, next: any): void {
  if (req.session && req.session.userId && req.sessionID) {
    updateSessionActivity(req.sessionID);
  }
  next();
}