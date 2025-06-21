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

  private async deliverOTCToAdmin(code: string, expiresAt: Date): Promise<void> {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🚀 LAUNCH SCREEN OTC DELIVERY');
    console.log('═══════════════════════════════════════');
    console.log(`📧 Access Code: ${code}`);
    console.log(`⏰ Valid Until: ${expiresAt.toLocaleString()}`);
    console.log(`🌐 App: WHERE`);
    console.log('═══════════════════════════════════════');
    console.log('');

    // Send email to admin
    await this.sendOTCviaEmail(code, expiresAt);
  }

  async sendEmailToAdmin(code: string, expiresAt: Date): Promise<void> {
    await this.sendOTCviaEmail(code, expiresAt);
  }

  private async sendOTCviaEmail(code: string, expiresAt: Date): Promise<void> {
    try {
      // Import nodemailer dynamically
      const nodemailer = await import('nodemailer');
      
      // Admin email - using the same email as the app login system
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
      
      if (adminEmail === 'admin@example.com') {
        console.log('⚠️ Admin email not configured, skipping email delivery');
        return;
      }

      // Create transporter using existing email configuration
      const transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Email content matching the app's login style
      const emailHTML = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #126987; color: white; padding: 30px; text-align: center; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">WHERE Access Code</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your one-time access code is ready</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 8px; margin-top: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="font-size: 36px; font-weight: bold; color: #126987; letter-spacing: 8px; font-family: monospace; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 2px dashed #126987;">
                ${code}
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 10px 0;">Access Details:</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Valid Until:</strong> ${expiresAt.toLocaleString()}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Application:</strong> WHERE</p>
              <p style="margin: 5px 0; color: #666;"><strong>Purpose:</strong> First-time access verification</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
              <p style="margin: 0; color: #1976d2; font-size: 14px;">
                <strong>Instructions:</strong> Enter this code on the WHERE access screen to gain entry to the application. This code will only work once and expires at the time shown above.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>This is an automated message from WHERE application access control system.</p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmail,
        subject: `WHERE Access Code: ${code}`,
        html: emailHTML,
        text: `WHERE Access Code: ${code}\n\nValid until: ${expiresAt.toLocaleString()}\n\nEnter this code on the WHERE access screen to gain entry to the application.`
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ OTC email sent successfully to ${adminEmail} (ID: ${result.messageId})`);
      
    } catch (error: any) {
      console.log(`❌ Failed to send OTC email: ${error.message || error}`);
      // Email failure is non-critical, console delivery is the fallback
    }
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