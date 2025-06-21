import Database from '@replit/database';
const db = new Database();

async function debugAccessCode() {
  const code = 'vip367';
  const data = await db.get(`access_code_${code}`);
  console.log('Raw data for vip367:', JSON.stringify(data, null, 2));
  
  // Parse the data like the server does
  let codeInfo;
  try {
    if (typeof data === 'string') {
      codeInfo = JSON.parse(data);
    } else if (data && typeof data === 'object' && data.value) {
      codeInfo = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    } else {
      codeInfo = data;
    }
    console.log('Parsed data:', JSON.stringify(codeInfo, null, 2));
  } catch (e) {
    console.log('Parse error:', e.message);
  }
}

debugAccessCode().catch(console.error);