import Database from "@replit/database";
const db = new Database();

async function checkLoggedInCodes() {
  console.log('🔍 CHECKING ACTIVE ACCESS CODES\n');
  
  try {
    // Known active codes based on recent activity
    const knownCodes = [
      'BOI729889', 'BOI573007', 'BOI199038', 'BOI968736',
      'BOI234567', 'BOI789012', 'BOI345678', 'BOI901234'
    ];
    
    const accessCodes = [];
    const activeSessions = [];
    
    // Check each known code
    for (const code of knownCodes) {
      try {
        const codeData = await db.get(`access_code_${code}`);
        if (codeData) {
          let parsedData;
          try {
            parsedData = typeof codeData === 'string' ? JSON.parse(codeData) : codeData;
          } catch {
            parsedData = codeData;
          }
          
          accessCodes.push({
            code,
            data: parsedData
          });
        }
      } catch (error) {
        // Code doesn't exist, skip
      }
    }
    
    // Check for any session data
    for (let i = 0; i < 10; i++) {
      try {
        const sessionData = await db.get(`session_${i}`);
        if (sessionData) {
          let parsedSession;
          try {
            parsedSession = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
          } catch {
            parsedSession = sessionData;
          }
          
          if (parsedSession && parsedSession.accessCode) {
            activeSessions.push({
              sessionId: i,
              accessCode: parsedSession.accessCode,
              lastActivity: parsedSession.lastActivity || 'Unknown',
              device: parsedSession.device || 'Unknown'
            });
          }
        }
      } catch (error) {
        // Session doesn't exist, continue
      }
    }
    
    console.log('📋 ALL ACCESS CODES IN DATABASE');
    console.log('='.repeat(40));
    
    if (accessCodes.length === 0) {
      console.log('⭕ No access codes found in database');
    } else {
      accessCodes.forEach(({ code, data }) => {
        const status = data.revoked || data.permanentlyBlocked ? '🚫 REVOKED' : 
                     data.valid === false ? '❌ INVALID' :
                     (data.usageCount && (data.usageCount.ios >= 999 || data.usageCount.android >= 999 || data.usageCount.other >= 999)) ? '🚫 REVOKED' :
                     '✅ ACTIVE';
        
        const usage = data.usageCount ? 
          `iOS:${data.usageCount.ios || 0}, Android:${data.usageCount.android || 0}, Other:${data.usageCount.other || 0}` :
          'No usage data';
        
        console.log(`${status} ${code} | Usage: ${usage}`);
      });
    }
    
    console.log('\n🔐 CURRENTLY LOGGED IN SESSIONS');
    console.log('='.repeat(40));
    
    if (activeSessions.length === 0) {
      console.log('⭕ No active sessions found');
    } else {
      activeSessions.forEach(session => {
        const timeAgo = session.lastActivity !== 'Unknown' ? 
          new Date(session.lastActivity).toLocaleString() : 'Unknown';
        
        console.log(`🟢 ${session.accessCode} | Device: ${session.device} | Last: ${timeAgo}`);
      });
    }
    
    // Also check current server heartbeats by making a request
    try {
      const response = await fetch('http://localhost:5000/api/auth/status');
      if (response.ok) {
        const statusData = await response.json();
        console.log('\n📡 SERVER STATUS');
        console.log('='.repeat(20));
        console.log(`Active connections: ${statusData.activeConnections || 'Unknown'}`);
        if (statusData.sessions) {
          console.log('Live sessions:', statusData.sessions);
        }
      }
    } catch (error) {
      console.log('\n⚠️ Could not fetch server status');
    }
    
    console.log('\n📊 SUMMARY');
    console.log('='.repeat(20));
    console.log(`Total codes in database: ${accessCodes.length}`);
    console.log(`Active sessions: ${activeSessions.length}`);
    console.log(`Revoked codes: ${accessCodes.filter(c => c.data.revoked).length}`);
    
    return {
      totalCodes: accessCodes.length,
      activeSessions: activeSessions.length,
      codes: accessCodes.map(c => c.code),
      loggedInCodes: activeSessions.map(s => s.accessCode)
    };
    
  } catch (error) {
    console.log(`❌ Error checking codes: ${error.message}`);
    return { error: error.message };
  }
}

checkLoggedInCodes().catch(console.error);