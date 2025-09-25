import nodemailer from 'nodemailer';

export interface OTCRequest {
  accountData: {
    customerNumber: string;
    name: string;
    email: string;
    phone: string;
  };
  otc: string;
}

class OTCService {
  private transporter: nodemailer.Transporter | null = null;
  private otcStorage: Map<string, { code: string; expires: number; accountData: any }> = new Map();

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Use environment variables for email configuration
      const emailConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465', // Use secure for port 465
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        },
        connectionTimeout: 30000, // 30 seconds
        greetingTimeout: 30000,
        socketTimeout: 30000,
        pool: true, // Use connection pooling
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 20000, // Rate limiting
        rateLimit: 5,
        debug: process.env.NODE_ENV === 'development'
      };

      // Only initialize if SMTP credentials are provided
      if (emailConfig.host && emailConfig.auth.user && emailConfig.auth.pass) {
        this.transporter = nodemailer.createTransport(emailConfig);
        
        // Verify connection asynchronously  
        this.transporter?.verify((error, success) => {
          if (error) {
            console.error('❌ SMTP connection verification failed:', error.message);
          } else {
            console.log('✅ SMTP server connection verified and ready');
          }
        });
        
        console.log('📧 Email transporter initialized successfully');
        console.log(`📧 SMTP Host: ${emailConfig.host}:${emailConfig.port}`);
        console.log(`📧 SMTP User: ${emailConfig.auth.user}`);
        console.log(`📧 Admin Email: ${process.env.ADMIN_EMAIL || 'bankofireland2007@gmail.com'}`);
      } else {
        console.error('❌ SMTP credentials missing - email service unavailable');
        console.error('Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
        console.error(`Available: HOST=${!!process.env.SMTP_HOST}, USER=${!!process.env.SMTP_USER}, PASS=${!!process.env.SMTP_PASS}`);
      }
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }

  generateOTC(): string {
    // Generate a random 6-digit number
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOTCToUser(accountData: OTCRequest['accountData'], otc: string): Promise<boolean> {
    if (!this.transporter) {
      console.log('SMTP not configured. OTC would be sent to user:', {
        email: accountData.email,
        customerNumber: accountData.customerNumber,
        otc: otc
      });
      return false;
    }

    try {
      // Validate user email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(accountData.email)) {
        console.error('Invalid user email format:', accountData.email);
        return false;
      }
      
      const mailOptions = {
        from: `"Bank of Ireland" <${process.env.SMTP_USER}>`,
        to: accountData.email,
        subject: 'Bank of Ireland - Account Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #126987;">Account Verification Required</h2>
            <p>Hello ${accountData.name},</p>
            <p>Thank you for creating your Bank of Ireland account. To complete the account setup process, please use the verification code below:</p>
            
            <div style="background-color: #e8f5e8; padding: 30px; border-radius: 8px; border-left: 4px solid #28a745; text-align: center; margin: 20px 0;">
              <h3 style="color: #155724; margin-top: 0;">Your Verification Code</h3>
              <p style="font-size: 32px; font-weight: bold; color: #155724; letter-spacing: 4px; margin: 20px 0;">${otc}</p>
              <p style="color: #155724; font-size: 14px;">Enter this code in the verification screen to activate your account</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #126987; margin-top: 0;">Account Details:</h4>
              <p><strong>Customer Number:</strong> ${accountData.customerNumber}</p>
              <p><strong>Name:</strong> ${accountData.name}</p>
              <p><strong>Email:</strong> ${accountData.email}</p>
            </div>
            
            <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
              This verification code will expire in 10 minutes. If you didn't request this account, please ignore this email.
            </p>
            <p style="color: #6c757d; font-size: 12px;">
              This email was automatically generated by the Bank of Ireland account creation system.
            </p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`OTC email sent successfully to user: ${accountData.email}`);
      return true;
    } catch (error) {
      console.error('Failed to send OTC email to user:', error);
      return false;
    }
  }

  async sendOTCToAdmin(accountData: OTCRequest['accountData'], otc: string): Promise<boolean> {
    // Always try to reinitialize transporter if it doesn't exist
    if (!this.transporter) {
      console.log('🔄 No SMTP transporter - attempting to reinitialize');
      this.initializeTransporter();
      if (!this.transporter) {
        console.error('❌ CRITICAL: Email system completely unavailable');
        return false;
      }
    }

    const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'bankofireland2007@gmail.com';
    console.log('🔄 ATTEMPTING TO SEND ADMIN OTC EMAIL:', adminEmail);
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      console.error('❌ Invalid admin email format:', adminEmail);
      return false;
    }

    // Retry mechanism with exponential backoff
    const maxRetries = 5;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      attempt++;
      console.log(`📧 Email attempt ${attempt}/${maxRetries} to ${adminEmail}`);
      
      try {
        const mailOptions = {
          from: `"Bank of Ireland Admin" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          replyTo: process.env.SMTP_USER,
          priority: 'high' as const,
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'high'
          },
          subject: `🚨 URGENT: Admin OTC Required - ${otc} - ${accountData.customerNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #126987; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px;">Bank of Ireland</h2>
              <p style="margin: 5px 0 0 0; font-size: 16px;">New Account Registration</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-top: none;">
              <h3 style="color: #dc3545; margin-top: 0;">Admin Approval Required</h3>
              <p style="margin-bottom: 20px;">A new customer has registered for a Bank of Ireland account and requires admin verification to complete the process.</p>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #856404; margin-top: 0;">Verification Code</h4>
                <p style="font-size: 32px; font-weight: bold; color: #856404; letter-spacing: 4px; margin: 10px 0; text-align: center;">${otc}</p>
                <p style="color: #856404; font-size: 14px; text-align: center; margin-bottom: 0;">Provide this code to the customer to complete registration</p>
              </div>
              
              <div style="background-color: white; border: 1px solid #dee2e6; padding: 25px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #126987; margin-top: 0; border-bottom: 2px solid #126987; padding-bottom: 10px;">Customer Details</h4>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #495057; width: 30%;">Full Name:</td>
                    <td style="padding: 8px 0; color: #212529;">${accountData.name}</td>
                  </tr>
                  <tr style="background-color: #f8f9fa;">
                    <td style="padding: 8px 0; font-weight: bold; color: #495057;">Customer Number:</td>
                    <td style="padding: 8px 0; color: #212529; font-family: monospace;">${accountData.customerNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #495057;">Email Address:</td>
                    <td style="padding: 8px 0; color: #212529;">${accountData.email}</td>
                  </tr>
                  <tr style="background-color: #f8f9fa;">
                    <td style="padding: 8px 0; font-weight: bold; color: #495057;">Phone Number:</td>
                    <td style="padding: 8px 0; color: #212529;">${accountData.phone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #495057;">Registration Time:</td>
                    <td style="padding: 8px 0; color: #212529;">${new Date().toLocaleString('en-IE', { 
                      timeZone: 'Europe/Dublin',
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #0c5460; margin-top: 0;">Next Steps</h4>
                <ol style="color: #0c5460; margin: 0; padding-left: 20px;">
                  <li>Review the customer details above</li>
                  <li>Verify the customer's identity if required</li>
                  <li>Provide the verification code <strong>${otc}</strong> to the customer</li>
                  <li>Customer will enter the code to complete account creation</li>
                </ol>
              </div>
              
              <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #721c24; margin: 0; font-size: 14px;">
                  <strong>Security Notice:</strong> This verification code expires in 10 minutes. Do not share this code with unauthorized personnel.
                </p>
              </div>
            </div>
            
            <div style="background-color: #126987; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 14px;">Bank of Ireland - Admin Portal</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8;">This is an automated notification</p>
            </div>
          </div>
        `
      };

        
        const info = await this.transporter.sendMail(mailOptions);
        
        // Success logging
        console.log(`✅ SUCCESS: Admin OTC email sent successfully to ${adminEmail}`);
        console.log(`📧 Subject: 🚨 URGENT: Admin OTC Required - ${otc}`);
        console.log(`🔑 OTC Code: ${otc}`);
        console.log(`👤 Customer: ${accountData.name} (${accountData.customerNumber})`);
        console.log(`📞 Contact: ${accountData.email} | ${accountData.phone}`);
        console.log(`⏰ Time: ${new Date().toLocaleString('en-IE', { 
          timeZone: 'Europe/Dublin',
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}`);
        console.log('✅ ADMIN EMAIL DELIVERY CONFIRMED - MESSAGE ID:', info.messageId);
        return true;
        
      } catch (error: any) {
        console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error?.message || error);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
          console.log(`⏱️  Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Try to reinitialize transporter on failure
          console.log('🔄 Reinitializing email transporter for retry...');
          this.initializeTransporter();
        } else {
          console.error('🚨 CRITICAL: All email delivery attempts failed!');
          console.error('🚨 Admin will NOT receive OTC code via email!');
          console.error(`🚨 MANUAL OTC CODE: ${otc} for ${accountData.customerNumber}`);
          console.error('SMTP Error Details:', {
            message: error?.message || 'Unknown error',
            code: error?.code || 'No code',
            command: error?.command || 'No command',
            stack: error?.stack
          });
        }
      }
    }
    
    return false;
  }

  storeOTC(customerNumber: string, code: string, accountData: any): void {
    const expires = Date.now() + (10 * 60 * 1000); // 10 minutes expiry
    this.otcStorage.set(customerNumber, { code, expires, accountData });
    
    // Clean up expired OTCs
    setTimeout(() => {
      this.otcStorage.delete(customerNumber);
    }, 10 * 60 * 1000);
  }

  validateOTC(customerNumber: string, code: string): { isValid: boolean; accountData?: any } {
    const stored = this.otcStorage.get(customerNumber);
    
    if (!stored) {
      return { isValid: false };
    }
    
    if (Date.now() > stored.expires) {
      this.otcStorage.delete(customerNumber);
      return { isValid: false };
    }
    
    if (stored.code !== code) {
      return { isValid: false };
    }
    
    // Remove OTC after successful validation
    this.otcStorage.delete(customerNumber);
    return { isValid: true, accountData: stored.accountData };
  }

  async processNewAccount(accountData: OTCRequest['accountData']): Promise<string> {
    const otc = this.generateOTC();
    
    // Store OTC for validation
    this.storeOTC(accountData.customerNumber, otc, accountData);
    
    // Always log the OTC prominently for admin access
    console.log(`\n====== ADMIN OTC NOTIFICATION ======`);
    console.log(`NEW ACCOUNT CREATED`);
    console.log(`Customer: ${accountData.name}`);
    console.log(`Number: ${accountData.customerNumber}`);
    console.log(`Email: ${accountData.email}`);
    console.log(`Phone: ${accountData.phone}`);
    console.log(`OTC CODE: ${otc}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`====================================\n`);
    
    // Send OTC to admin email only
    const adminEmailSent = await this.sendOTCToAdmin(accountData, otc);
    
    if (adminEmailSent) {
      console.log(`OTC email sent successfully to admin with verification code`);
    } else {
      console.log(`OTC email to admin failed - code is logged above for access`);
    }
    
    return otc;
  }
}

export const otcService = new OTCService();