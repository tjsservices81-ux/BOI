// Permanent Authentication System - Users stay logged in forever
import { db } from './db';
import { permanentTokens, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import type { User, PermanentToken } from '@shared/schema';

// Generate cryptographically secure permanent token
function generatePermanentToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

// Create permanent authentication token for user
export async function createPermanentToken(userId: number, deviceId?: string, deviceInfo?: any): Promise<string> {
  const token = generatePermanentToken();
  
  await db.insert(permanentTokens).values({
    userId,
    token,
    deviceId,
    deviceInfo,
    createdAt: new Date(),
    lastUsed: new Date(),
    isActive: true
  });
  
  console.log(`Created permanent token for user ${userId}`);
  return token;
}

// Validate permanent token and return user data
export async function validatePermanentToken(token: string): Promise<User | null> {
  try {
    const result = await db
      .select({
        user: users,
        tokenData: permanentTokens
      })
      .from(permanentTokens)
      .innerJoin(users, eq(permanentTokens.userId, users.id))
      .where(
        and(
          eq(permanentTokens.token, token),
          eq(permanentTokens.isActive, true),
          eq(users.isDisabled, false)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    // Update last used timestamp
    await db
      .update(permanentTokens)
      .set({ lastUsed: new Date() })
      .where(eq(permanentTokens.token, token));

    console.log(`Token validated for user ${result[0].user.customerNumber}`);
    return result[0].user;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

// Get all permanent tokens for a user
export async function getUserPermanentTokens(userId: number): Promise<PermanentToken[]> {
  return await db
    .select()
    .from(permanentTokens)
    .where(
      and(
        eq(permanentTokens.userId, userId),
        eq(permanentTokens.isActive, true)
      )
    );
}

// Revoke permanent token (admin only)
export async function revokePermanentToken(token: string): Promise<boolean> {
  try {
    await db
      .update(permanentTokens)
      .set({ isActive: false })
      .where(eq(permanentTokens.token, token));
    
    console.log(`Permanent token revoked: ${token}`);
    return true;
  } catch (error) {
    console.error('Error revoking token:', error);
    return false;
  }
}

// Revoke all tokens for a user (admin only - for account deletion)
export async function revokeAllUserTokens(userId: number): Promise<number> {
  try {
    const tokens = await db
      .select()
      .from(permanentTokens)
      .where(eq(permanentTokens.userId, userId));
    
    await db
      .update(permanentTokens)
      .set({ isActive: false })
      .where(eq(permanentTokens.userId, userId));
    
    console.log(`All tokens revoked for user ${userId}`);
    return tokens.length;
  } catch (error) {
    console.error('Error revoking all user tokens:', error);
    return 0;
  }
}

// Clean up old inactive tokens (optional maintenance)
export async function cleanupInactiveTokens(): Promise<number> {
  try {
    const inactiveTokens = await db
      .select()
      .from(permanentTokens)
      .where(eq(permanentTokens.isActive, false));
    
    await db
      .delete(permanentTokens)
      .where(eq(permanentTokens.isActive, false));
    
    console.log(`Cleaned up inactive tokens`);
    return inactiveTokens.length;
  } catch (error) {
    console.error('Error cleaning up tokens:', error);
    return 0;
  }
}

// Middleware for permanent authentication
export async function permanentAuthMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.cookies?.permanentToken || 
                req.session?.permanentToken;

  if (!token) {
    return res.status(401).json({ message: 'No authentication token provided' });
  }

  const user = await validatePermanentToken(token);
  if (!user) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.user = user;
  req.permanentToken = token;
  next();
}

// Check if user has permanent token
export async function hasPermanentToken(userId: number): Promise<boolean> {
  const tokens = await getUserPermanentTokens(userId);
  return tokens.length > 0;
}