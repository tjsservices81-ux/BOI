// ULTIMATE LOGIN PERSISTENCE SYSTEM
// Ensures users NEVER get logged out unless manually deleted by admin

import { db } from './db';
import { permanentUserSessions, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import type { PermanentUserSession, User } from '@shared/schema';

interface DeviceInfo {
  deviceModel?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class PermanentAuthManager {
  
  // Create permanent session that NEVER expires
  async createPermanentSession(
    userId: number,
    customerNumber: string,
    deviceInfo: DeviceInfo
  ): Promise<string> {
    const sessionToken = crypto.randomBytes(64).toString('hex');
    const deviceFingerprint = PermanentAuthManager.generateDeviceFingerprint(deviceInfo);

    // Remove any existing session for this user (one device per user)
    await db.delete(permanentUserSessions)
      .where(eq(permanentUserSessions.userId, userId));

    // Create new permanent session with NO expiry
    await db.insert(permanentUserSessions).values({
      userId,
      customerNumber,
      sessionToken,
      deviceFingerprint,
      deviceModel: deviceInfo.deviceModel || 'Unknown Device',
      ipAddress: deviceInfo.ipAddress || 'Unknown IP',
      userAgent: deviceInfo.userAgent || 'Unknown Agent',
      isActive: true
    });

    console.log(`🔒 PERMANENT SESSION CREATED: User ${userId} locked to device forever`);
    return sessionToken;
  }

  // Get session from request cookies
  async getSession(req: any): Promise<{ userId: number; isValid: boolean } | null> {
    const sessionToken = req.cookies.permanentSession;
    if (!sessionToken) {
      return null;
    }

    const user = await PermanentAuthManager.validatePermanentSession(sessionToken);
    if (user) {
      return { userId: user.id, isValid: true };
    }
    
    return null;
  }

  // Validate permanent session - NO expiry checks
  static async validatePermanentSession(sessionToken: string): Promise<User | null> {
    try {
      console.log(`🔍 VALIDATING PERMANENT SESSION: ${sessionToken.substring(0, 20)}...`);
      
      const sessionResult = await db
        .select({
          session: permanentUserSessions,
          user: users
        })
        .from(permanentUserSessions)
        .innerJoin(users, eq(permanentUserSessions.userId, users.id))
        .where(
          and(
            eq(permanentUserSessions.sessionToken, sessionToken),
            eq(permanentUserSessions.isActive, true)
            // Removed isDisabled check - users stay logged in unless manually deleted
          )
        )
        .limit(1);

      console.log(`🔍 SESSION QUERY RESULT: Found ${sessionResult.length} matching sessions`);

      if (sessionResult.length === 0) {
        console.log('❌ NO MATCHING SESSION FOUND');
        return null;
      }

      // Update last activity - session NEVER expires
      await db.update(permanentUserSessions)
        .set({ lastActivity: new Date() })
        .where(eq(permanentUserSessions.sessionToken, sessionToken));

      console.log(`✅ PERMANENT SESSION VALIDATED: User ${sessionResult[0].user.id} authenticated`);
      return sessionResult[0].user;
    } catch (error) {
      console.error('Error validating permanent session:', error);
      return null;
    }
  }

  // Get user by session token
  static async getUserBySessionToken(sessionToken: string): Promise<User | null> {
    return this.validatePermanentSession(sessionToken);
  }

  // Revoke session - ONLY for admin deletion
  async revokePermanentSession(userId: number): Promise<boolean> {
    try {
      await db.update(permanentUserSessions)
        .set({ isActive: false })
        .where(eq(permanentUserSessions.userId, userId));

      console.log(`🗑️ ADMIN DELETION: Permanent session revoked for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error revoking permanent session:', error);
      return false;
    }
  }

  // Get all active permanent sessions (for admin panel)
  static async getAllActiveSessions(): Promise<(PermanentUserSession & { user: User })[]> {
    try {
      const sessions = await db
        .select({
          session: permanentUserSessions,
          user: users
        })
        .from(permanentUserSessions)
        .innerJoin(users, eq(permanentUserSessions.userId, users.id))
        .where(eq(permanentUserSessions.isActive, true));

      return sessions.map(s => ({ ...s.session, user: s.user }));
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  }

  // Generate device fingerprint
  private static generateDeviceFingerprint(deviceInfo: DeviceInfo): string {
    const fingerprint = [
      deviceInfo.deviceModel || 'unknown',
      deviceInfo.userAgent || 'unknown',
      deviceInfo.ipAddress || 'unknown'
    ].join('|');
    
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
  }

  // Check if user has active session
  static async hasActiveSession(userId: number): Promise<boolean> {
    try {
      const result = await db
        .select({ id: permanentUserSessions.id })
        .from(permanentUserSessions)
        .where(
          and(
            eq(permanentUserSessions.userId, userId),
            eq(permanentUserSessions.isActive, true)
          )
        )
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error('Error checking active session:', error);
      return false;
    }
  }

  // Get session info for user
  static async getSessionInfo(userId: number): Promise<PermanentUserSession | null> {
    try {
      const result = await db
        .select()
        .from(permanentUserSessions)
        .where(
          and(
            eq(permanentUserSessions.userId, userId),
            eq(permanentUserSessions.isActive, true)
          )
        )
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error getting session info:', error);
      return null;
    }
  }
}