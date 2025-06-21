/**
 * Launch Screen OTC Service for WHERE Access Control
 * Separate from the existing account creation OTC service
 */

interface LaunchOTCData {
  code: string;
  generatedAt: Date;
  expiresAt: Date;
  usageCount: number;
  maxUsage: number;
}

class LaunchScreenOTCService {
  private currentOTC: LaunchOTCData | null = null;
  private readonly defaultExpiryHours = 24;
  private readonly maxUsageLimit = 100;

  constructor() {
    this.initializeDefaultOTC();
  }

  private async initializeDefaultOTC(): Promise<void> {
    await this.generateNewCode();
  }

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

    console.log(`🔑 NEW LAUNCH OTC GENERATED: ${code} (expires: ${expiresAt.toLocaleString()})`);
    this.deliverOTCToAdmin(code, expiresAt);
    
    return code;
  }

  async verifyCode(inputCode: string): Promise<boolean> {
    if (!this.currentOTC) {
      console.log('❌ LAUNCH OTC VERIFICATION: No active code');
      return false;
    }

    const now = new Date();
    
    if (now > this.currentOTC.expiresAt) {
      console.log('❌ LAUNCH OTC VERIFICATION: Code expired');
      return false;
    }

    if (this.currentOTC.usageCount >= this.currentOTC.maxUsage) {
      console.log('❌ LAUNCH OTC VERIFICATION: Usage limit exceeded');
      return false;
    }

    if (inputCode.toUpperCase() === this.currentOTC.code) {
      this.currentOTC.usageCount++;
      console.log(`✅ LAUNCH OTC VERIFICATION: Success (usage: ${this.currentOTC.usageCount}/${this.currentOTC.maxUsage})`);
      return true;
    }

    console.log(`❌ LAUNCH OTC VERIFICATION: Invalid code attempted: ${inputCode}`);
    return false;
  }

  async getCurrentCode(): Promise<string | null> {
    if (!this.currentOTC) {
      return null;
    }

    const now = new Date();
    if (now > this.currentOTC.expiresAt) {
      console.log('⚠️ Current launch OTC has expired, generating new one');
      await this.generateNewCode();
    }

    return this.currentOTC?.code || null;
  }

  async getExpirationTime(): Promise<string | null> {
    return this.currentOTC?.expiresAt.toISOString() || null;
  }

  private generateRandomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  private isValidCustomCode(code: string): boolean {
    const regex = /^[A-Z0-9]{6,8}$/i;
    return regex.test(code);
  }

  private deliverOTCToAdmin(code: string, expiresAt: Date): void {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🚀 LAUNCH SCREEN OTC DELIVERY');
    console.log('═══════════════════════════════════════');
    console.log(`📧 Access Code: ${code}`);
    console.log(`⏰ Valid Until: ${expiresAt.toLocaleString()}`);
    console.log(`🌐 App: WHERE`);
    console.log('═══════════════════════════════════════');
    console.log('');
  }

  /**
   * Legacy compatibility methods for existing account creation routes
   */
  async processNewAccount(accountData: any): Promise<string> {
    return await this.generateNewCode();
  }

  validateOTC(customerNumber: string, code: string): { isValid: boolean; accountData?: any } {
    return { isValid: false };
  }
}

export const launchScreenOtc = new LaunchScreenOTCService();