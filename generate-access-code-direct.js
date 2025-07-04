// Direct access code generation without API call
import Database from "@replit/database";

const db = new Database();

async function generateAccessCodeDirect() {
  try {
    // Generate BOI + 6 random digits
    const randomDigits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const accessCode = `BOI${randomDigits}`;
    
    // Store access code in database with device-specific limits
    await db.set(`access_code_${accessCode}`, {
      code: accessCode,
      valid: true,
      createdAt: new Date().toISOString(),
      issuedBy: 'Direct Generation',
      usageCount: {
        ios: 0,
        android: 0,
        other: 0
      },
      totalUsage: 0,
      usesRemaining: 1, // Will be dynamically calculated per device
      revokedAt: null
    });
    
    console.log('\n✅ NEW ACCESS CODE CREATED:');
    console.log(`Code: ${accessCode}`);
    console.log(`Device Limits: iOS/Android: 2 uses, Other: 1 use`);
    console.log(`Created: ${new Date().toLocaleString()}`);
    console.log(`Status: Active`);
    console.log(`Access URL: https://your-domain.replit.app/?access=${accessCode}\n`);
    
    return accessCode;
    
  } catch (error) {
    console.error('❌ Error generating access code:', error.message);
    return null;
  }
}

// Run the function
generateAccessCodeDirect();