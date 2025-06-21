import Database from "@replit/database";
const db = new Database();

async function checkAccessCode() {
  const code = 'BOI729889';
  console.log(`Checking access code: ${code}`);
  
  try {
    const data = await db.get(`access_code_${code}`);
    console.log('Raw data:', data);
    
    if (!data) {
      console.log('❌ Access code not found in database');
      return;
    }
    
    // Parse the data
    let codeInfo;
    try {
      if (typeof data === 'string') {
        codeInfo = JSON.parse(data);
      } else if (data && typeof data === 'object' && data.value) {
        codeInfo = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      } else {
        codeInfo = data;
      }
    } catch (parseError) {
      console.log('❌ Failed to parse code data:', parseError.message);
      return;
    }
    
    console.log('Parsed code info:', JSON.stringify(codeInfo, null, 2));
    
    // Check validity
    if (codeInfo.valid === false) {
      console.log('❌ Code is marked as invalid');
    } else {
      console.log('✅ Code appears valid');
    }
    
    // Check usage
    if (codeInfo.usage) {
      console.log(`iOS uses: ${codeInfo.usage.ios}/2`);
      console.log(`Non-iOS uses: ${codeInfo.usage.nonIos}/1`);
      console.log(`Total uses: ${codeInfo.usage.totalUses}`);
    }
    
    // Test verification endpoint
    console.log('\nTesting verification endpoint...');
    const response = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
      },
      body: JSON.stringify({ code: code })
    });
    
    const result = await response.json();
    console.log('Verification result:', result);
    
  } catch (error) {
    console.error('Error checking access code:', error);
  }
}

checkAccessCode();