/**
 * One-Time Code (OTC) Service for WHERE Access Control
 * Handles generation, verification, and management of access codes
 */

interface OTCData {
  code: string;
  generatedAt: Date;
  expiresAt: Date;
  usageCount: number;
  maxUsage: number;
}

class OTCService {
  private currentOTC: OTCData | null = null;
  private readonly defaultExpiryHours = 24;
  private readonly maxUsageLimit = 100; // Prevent abuse

  constructor() {
    // Initialize with a default OTC on service start
    this.initializeDefaultOTC();
  }

  private async initializeDefaultOTC(): Promise<void> {
    await this.generateNewCode();
  }

  /**
   * Admin method to generate a new OTC code
   * @param customCode Optional custom code (must be 6-8 characters)
   * @param expiryHours Optional expiry time in hours (default: 24)
   * @returns The generated OTC code
   */
  async generateNewCode(customCode?: string, expiryHours?: number): Promise<string> {
    const expiry = expiryHours || this.defaultExpiryHours;
    
    let code: string;
    if (customCode && this.isValidCustomCode(customCode)) {
      code = customCode.toUpperCase();
    } else {
      code = this.generateRandomCode();
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (expiry * 60 * 60 * 1000));

    this.currentOTC = {
      code,
      generatedAt: now,
      expiresAt,
      usageCount: 0,
      maxUsage: this.maxUsageLimit
    };

    console.log(`🔑 NEW OTC GENERATED: ${code} (expires: ${expiresAt.toLocaleString()})`);
    
    // Hidden delivery method - console log for admin
    this.deliverOTCToAdmin(code, expiresAt);
    
    return code;
  }

  /**
   * Verify an OTC code
   * @param inputCode The code to verify
   * @returns True if valid and not expired
   */
  async verifyCode(inputCode: string): Promise<boolean> {
    if (!this.currentOTC) {
      console.log('❌ OTC VERIFICATION: No active code');
      return false;
    }

    const now = new Date();
    
    // Check if code has expired
    if (now > this.currentOTC.expiresAt) {
      console.log('❌ OTC VERIFICATION: Code expired');
      return false;
    }

    // Check usage limit
    if (this.currentOTC.usageCount >= this.currentOTC.maxUsage) {
      console.log('❌ OTC VERIFICATION: Usage limit exceeded');
      return false;
    }

    // Verify the code
    if (inputCode.toUpperCase() === this.currentOTC.code) {
      this.currentOTC.usageCount++;
      console.log(`✅ OTC VERIFICATION: Success (usage: ${this.currentOTC.usageCount}/${this.currentOTC.maxUsage})`);
      return true;
    }

    console.log(`❌ OTC VERIFICATION: Invalid code attempted: ${inputCode}`);
    return false;
  }

  /**
   * Get the current active OTC code (admin method)
   * @returns Current OTC code or null if none active
   */
  async getCurrentCode(): Promise<string | null> {
    if (!this.currentOTC) {
      return null;
    }

    const now = new Date();
    if (now > this.currentOTC.expiresAt) {
      console.log('⚠️ Current OTC has expired, generating new one');
      await this.generateNewCode();
    }

    return this.currentOTC?.code || null;
  }

  /**
   * Get expiration time of current OTC
   * @returns ISO string of expiration time
   */
  async getExpirationTime(): Promise<string | null> {
    return this.currentOTC?.expiresAt.toISOString() || null;
  }

  /**
   * Get OTC usage statistics (admin method)
   * @returns Usage statistics
   */
  async getUsageStats(): Promise<{
    code: string;
    usageCount: number;
    maxUsage: number;
    generatedAt: string;
    expiresAt: string;
    isExpired: boolean;
  } | null> {
    if (!this.currentOTC) {
      return null;
    }

    const now = new Date();
    return {
      code: this.currentOTC.code,
      usageCount: this.currentOTC.usageCount,
      maxUsage: this.currentOTC.maxUsage,
      generatedAt: this.currentOTC.generatedAt.toISOString(),
      expiresAt: this.currentOTC.expiresAt.toISOString(),
      isExpired: now > this.currentOTC.expiresAt
    };
  }

  /**
   * Admin method to extend OTC expiry
   * @param additionalHours Hours to add to current expiry
   * @returns New expiration time
   */
  async extendExpiry(additionalHours: number): Promise<string | null> {
    if (!this.currentOTC) {
      return null;
    }

    const extensionMs = additionalHours * 60 * 60 * 1000;
    this.currentOTC.expiresAt = new Date(this.currentOTC.expiresAt.getTime() + extensionMs);
    
    console.log(`⏰ OTC EXPIRY EXTENDED: ${this.currentOTC.code} now expires at ${this.currentOTC.expiresAt.toLocaleString()}`);
    
    return this.currentOTC.expiresAt.toISOString();
  }

  /**
   * Generate a random 6-character alphanumeric code
   * @returns Random OTC code
   */
  private generateRandomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, I, 1)
    let result = '';
    
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Validate custom code format
   * @param code Custom code to validate
   * @returns True if valid format
   */
  private isValidCustomCode(code: string): boolean {
    // Must be 6-8 characters, alphanumeric only
    const regex = /^[A-Z0-9]{6,8}$/i;
    return regex.test(code);
  }

  /**
   * Hidden delivery method for admin OTC access
   * Currently logs to console, can be replaced with webhook/email
   * @param code The OTC code
   * @param expiresAt Expiration time
   */
  private deliverOTCToAdmin(code: string, expiresAt: Date): void {
    // Console delivery (hidden method for admin)
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🔐 ADMIN OTC DELIVERY NOTIFICATION');
    console.log('═══════════════════════════════════════');
    console.log(`📧 Access Code: ${code}`);
    console.log(`⏰ Valid Until: ${expiresAt.toLocaleString()}`);
    console.log(`🌐 App: WHERE Mobile Banking`);
    console.log('═══════════════════════════════════════');
    console.log('');

    // Future webhook integration point
    this.sendOTCWebhook(code, expiresAt).catch(err => {
      console.log('Webhook delivery failed, using console fallback:', err.message);
    });
  }

  /**
   * Webhook delivery method (placeholder for future integration)
   * Replace the URL with your actual webhook endpoint
   * @param code OTC code
   * @param expiresAt Expiration time
   */
  private async sendOTCWebhook(code: string, expiresAt: Date): Promise<void> {
    // Replace this with your webhook URL
    const webhookUrl = process.env.OTC_WEBHOOK_URL || 'https://your-webhook-endpoint.com/otc-delivery';
    
    if (webhookUrl === 'https://your-webhook-endpoint.com/otc-delivery') {
      // Skip webhook if not configured
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OTC_WEBHOOK_TOKEN || 'your-webhook-token'}`
        },
        body: JSON.stringify({
          type: 'otc_delivery',
          otc: code,
          expiresAt: expiresAt.toISOString(),
          generatedAt: new Date().toISOString(),
          app: 'BOI Mobile Banking',
          environment: process.env.NODE_ENV || 'development'
        })
      });

      if (response.ok) {
        console.log('✅ OTC delivered via webhook successfully');
      } else {
        throw new Error(`Webhook returned ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Webhook delivery failed:', error);
      // Webhook failures are non-critical, console delivery is the fallback
    }
  }

  /**
   * Admin method to reset usage count
   * @returns New usage count (0)
   */
  async resetUsageCount(): Promise<number> {
    if (this.currentOTC) {
      this.currentOTC.usageCount = 0;
      console.log(`🔄 OTC USAGE RESET: ${this.currentOTC.code} usage count reset to 0`);
    }
    return 0;
  }

  /**
   * Admin method to invalidate current OTC immediately
   * @returns True if invalidated
   */
  async invalidateCurrentOTC(): Promise<boolean> {
    if (this.currentOTC) {
      const oldCode = this.currentOTC.code;
      this.currentOTC = null;
      console.log(`🚫 OTC INVALIDATED: ${oldCode} has been manually invalidated`);
      return true;
    }
    return false;
  }

  /**
   * Legacy account creation methods (for existing routes compatibility)
   */
  async processNewAccount(accountData: any): Promise<string> {
    // This is for the existing account creation system
    return await this.generateNewCode();
  }

  validateOTC(customerNumber: string, code: string): { isValid: boolean; accountData?: any } {
    // This is for the existing account creation validation
    // Return false for now since this conflicts with launch screen OTC
    return { isValid: false };
  }
}

// Export singleton instance
export const launchOtcService = new OTCService();