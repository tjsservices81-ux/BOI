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
  private otcStorage: Map<string, { code: string; expires: number; accountData: any }> = new Map();

  generateOTC(): string {
    // Generate a random 6-digit number
    return Math.floor(100000 + Math.random() * 900000).toString();
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

  getAllActiveOTCs(): Array<{ customerNumber: string; code: string; accountData: any; expiresAt: string; timeRemaining: string }> {
    const now = Date.now();
    const activeOTCs: Array<{ customerNumber: string; code: string; accountData: any; expiresAt: string; timeRemaining: string }> = [];
    
    // Clean up expired OTCs first
    this.otcStorage.forEach((data, customerNumber) => {
      if (now > data.expires) {
        this.otcStorage.delete(customerNumber);
      } else {
        const timeRemainingMs = data.expires - now;
        const minutes = Math.floor(timeRemainingMs / 60000);
        const seconds = Math.floor((timeRemainingMs % 60000) / 1000);
        
        activeOTCs.push({
          customerNumber,
          code: data.code,
          accountData: data.accountData,
          expiresAt: new Date(data.expires).toISOString(),
          timeRemaining: `${minutes}m ${seconds}s`
        });
      }
    });
    
    return activeOTCs;
  }

  async processNewAccount(accountData: OTCRequest['accountData']): Promise<string> {
    const otc = this.generateOTC();
    
    // Store OTC for validation
    this.storeOTC(accountData.customerNumber, otc, accountData);
    
    // Log the OTC - ONLY displayed in admin oversight panel (NO EMAIL)
    console.log(`\n====== OTC CODE GENERATED (ADMIN OVERSIGHT ONLY) ======`);
    console.log(`Customer: ${accountData.name}`);
    console.log(`Number: ${accountData.customerNumber}`);
    console.log(`Email: ${accountData.email}`);
    console.log(`Phone: ${accountData.phone}`);
    console.log(`OTC CODE: ${otc}`);
    console.log(`Expires: ${new Date(Date.now() + 10 * 60 * 1000).toISOString()}`);
    console.log(`View in Admin Oversight Panel at /admin-oversight (PIN: 270309200207)`);
    console.log(`=======================================================\n`);
    
    return otc;
  }
}

export const otcService = new OTCService();