import twilio from 'twilio';

interface TransferSecurityRequest {
  amount: string;
  recipientName: string;
  userPhoneNumber: string;
  transferId: string;
  transferType: 'UK' | 'IBAN';
}

interface SecurityConfirmation {
  transferId: string;
  confirmed: boolean;
  timestamp: string;
  method: 'voice' | 'timeout';
}

class TransferSecurityService {
  private client: any;
  private twilioNumber: string;
  private pendingTransfers: Map<string, TransferSecurityRequest> = new Map();
  private confirmations: Map<string, SecurityConfirmation> = new Map();

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
    }
  }

  async initiateTransferSecurity(request: TransferSecurityRequest): Promise<{ success: boolean; callSid?: string; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Twilio not configured' };
    }

    // Store pending transfer
    this.pendingTransfers.set(request.transferId, request);

    try {
      // Create TwiML for voice call
      const twimlUrl = `${process.env.REPLIT_DOMAIN || 'http://localhost:5000'}/api/security/voice-response?transferId=${request.transferId}`;
      
      const call = await this.client.calls.create({
        from: this.twilioNumber,
        to: request.userPhoneNumber,
        url: twimlUrl,
        callerId: '+35314044000', // Bank of Ireland caller ID
        timeout: 30,
        record: false
      });

      console.log(`Security call initiated for transfer ${request.transferId}, Call SID: ${call.sid}`);
      
      // Set timeout for transfer cancellation if no response
      setTimeout(() => {
        if (!this.confirmations.has(request.transferId)) {
          this.cancelTransfer(request.transferId, 'timeout');
        }
      }, 60000); // 1 minute timeout

      return { success: true, callSid: call.sid };
    } catch (error) {
      console.error('Failed to initiate security call:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  generateVoiceResponse(transferId: string): string {
    const transfer = this.pendingTransfers.get(transferId);
    if (!transfer) {
      return `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">This transfer request has expired. Please try again.</Say>
          <Hangup/>
        </Response>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">This is Bank of Ireland. A payment of ${transfer.amount} euros is being made to ${transfer.recipientName}. If you wish to confirm this transfer, press 1. To cancel or report this transaction, press 2.</Say>
        <Gather action="/api/security/handle-response?transferId=${transferId}" timeout="10" numDigits="1" method="POST">
          <Say voice="alice">Press 1 to confirm, or 2 to cancel.</Say>
        </Gather>
        <Say voice="alice">No response received. This transfer will be cancelled for security.</Say>
        <Hangup/>
      </Response>`;
  }

  async handleUserResponse(transferId: string, digits: string): Promise<{ success: boolean; action: 'confirmed' | 'cancelled' }> {
    const transfer = this.pendingTransfers.get(transferId);
    if (!transfer) {
      return { success: false, action: 'cancelled' };
    }

    if (digits === '1') {
      // Confirm transfer
      this.confirmations.set(transferId, {
        transferId,
        confirmed: true,
        timestamp: new Date().toISOString(),
        method: 'voice'
      });

      // Process the actual transfer now that it's confirmed
      await this.processConfirmedTransfer(transfer);

      // Send confirmation SMS
      await this.sendConfirmationSMS(transfer);
      
      console.log(`Transfer ${transferId} confirmed and processed by user`);
      return { success: true, action: 'confirmed' };
    } else {
      // Cancel transfer
      this.cancelTransfer(transferId, 'user_cancelled');
      console.log(`Transfer ${transferId} cancelled by user`);
      return { success: true, action: 'cancelled' };
    }
  }

  private async processConfirmedTransfer(transfer: TransferSecurityRequest): Promise<void> {
    // Here we would integrate with the actual transfer processing logic
    // For now, we'll simulate the transfer processing
    console.log(`Processing confirmed transfer: ${transfer.transferId}`);
    
    // In a real implementation, this would:
    // 1. Debit the sender's account
    // 2. Process the international/UK transfer
    // 3. Update transaction records
    // 4. Send to payment networks (SWIFT, Faster Payments, etc.)
    
    // For this implementation, we'll mark it as processed
    // The actual balance updates happen in the frontend transfer logic
  }

  private async sendConfirmationSMS(transfer: TransferSecurityRequest): Promise<void> {
    if (!this.client) return;

    try {
      const message = `Your payment of €${transfer.amount} to ${transfer.recipientName} has been successfully confirmed.`;
      
      await this.client.messages.create({
        from: this.twilioNumber,
        to: transfer.userPhoneNumber,
        body: message
      });

      console.log(`Confirmation SMS sent for transfer ${transfer.transferId}`);
    } catch (error) {
      console.error('Failed to send confirmation SMS:', error);
    }
  }

  private cancelTransfer(transferId: string, reason: string): void {
    this.confirmations.set(transferId, {
      transferId,
      confirmed: false,
      timestamp: new Date().toISOString(),
      method: reason === 'timeout' ? 'timeout' : 'voice'
    });

    console.log(`Transfer ${transferId} cancelled due to: ${reason}`);
  }

  isTransferConfirmed(transferId: string): boolean {
    const confirmation = this.confirmations.get(transferId);
    return confirmation ? confirmation.confirmed : false;
  }

  getConfirmationStatus(transferId: string): SecurityConfirmation | null {
    return this.confirmations.get(transferId) || null;
  }

  cleanupCompletedTransfer(transferId: string): void {
    this.pendingTransfers.delete(transferId);
    // Keep confirmations for audit trail but clean up after 24 hours
    setTimeout(() => {
      this.confirmations.delete(transferId);
    }, 24 * 60 * 60 * 1000);
  }
}

export const transferSecurityService = new TransferSecurityService();
export type { TransferSecurityRequest, SecurityConfirmation };