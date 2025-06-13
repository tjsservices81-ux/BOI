import { EventEmitter } from 'events';

// Interface for access attempts
interface AccessAttempt {
  id: string;
  ip: string;
  timestamp: Date;
  userAgent: string;
  location?: string;
  status: 'pending' | 'approved' | 'denied';
  requestCount: number;
}

// Store for tracking access attempts
const accessAttempts = new Map<string, AccessAttempt>();
const accessMonitor = new EventEmitter();

// Generate unique ID for access attempts
function generateAttemptId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Log an access attempt
export function logAccessAttempt(ip: string, userAgent: string, approved: boolean): void {
  const existingAttempt = Array.from(accessAttempts.values())
    .find(attempt => attempt.ip === ip && attempt.status === 'pending');

  if (existingAttempt) {
    // Update existing attempt
    existingAttempt.requestCount++;
    existingAttempt.timestamp = new Date();
    accessMonitor.emit('attemptUpdated', existingAttempt);
  } else if (!approved) {
    // Create new attempt for blocked IP
    const attempt: AccessAttempt = {
      id: generateAttemptId(),
      ip,
      timestamp: new Date(),
      userAgent,
      status: 'pending',
      requestCount: 1
    };
    
    accessAttempts.set(attempt.id, attempt);
    accessMonitor.emit('newAttempt', attempt);
    
    console.log(`🔒 NEW ACCESS REQUEST: ${ip} - Awaiting admin approval`);
  }
}

// Approve an IP address
export function approveAccessAttempt(attemptId: string): AccessAttempt | null {
  const attempt = accessAttempts.get(attemptId);
  if (attempt) {
    attempt.status = 'approved';
    accessMonitor.emit('attemptApproved', attempt);
    console.log(`✅ ACCESS APPROVED: ${attempt.ip} by admin`);
    return attempt;
  }
  return null;
}

// Deny an IP address
export function denyAccessAttempt(attemptId: string): AccessAttempt | null {
  const attempt = accessAttempts.get(attemptId);
  if (attempt) {
    attempt.status = 'denied';
    accessMonitor.emit('attemptDenied', attempt);
    console.log(`❌ ACCESS DENIED: ${attempt.ip} by admin`);
    return attempt;
  }
  return null;
}

// Get all pending access attempts
export function getPendingAttempts(): AccessAttempt[] {
  return Array.from(accessAttempts.values())
    .filter(attempt => attempt.status === 'pending')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// Remove an access attempt
export function removeAttempt(attemptId: string): boolean {
  return accessAttempts.delete(attemptId);
}

// Get all access attempts
export function getAllAttempts(): AccessAttempt[] {
  return Array.from(accessAttempts.values())
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// Remove old attempts (cleanup)
export function cleanupOldAttempts(): void {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  Array.from(accessAttempts.entries()).forEach(([id, attempt]) => {
    if (attempt.timestamp < oneDayAgo && attempt.status !== 'pending') {
      accessAttempts.delete(id);
    }
  });
}

// Setup cleanup interval
setInterval(cleanupOldAttempts, 60 * 60 * 1000); // Run every hour

// Export event emitter for real-time updates
export { accessMonitor };