// Admin oversight dashboard — server-rendered HTML.
// Extracted verbatim from routes.ts to keep that file smaller. The markup is
// unchanged; all customer data is still fetched client-side via /api/customers.

export function renderAdminLoginPage(hasError: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0">
<title>Admin Login</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.login-box{background:linear-gradient(135deg,#fff 0%,#f8f9fa 100%);border-radius:20px;padding:40px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.5)}
.login-box h1{color:#1e3c72;font-size:28px;margin-bottom:10px;font-weight:800;letter-spacing:-0.5px}
.login-box p{color:#6c757d;font-size:15px;margin-bottom:28px;font-weight:500}
.form-group{margin-bottom:20px}
.form-group label{display:block;color:#495057;font-size:13px;font-weight:700;margin-bottom:8px}
.form-group input{width:100%;padding:14px 16px;border:2px solid #e9ecef;border-radius:10px;font-size:16px;font-family:inherit;letter-spacing:normal;transition:all 0.3s ease;background:#fff}
.form-group input:focus{outline:none;border-color:#2a5298;box-shadow:0 0 0 4px rgba(42,82,152,0.1)}
.btn-login{width:100%;background:linear-gradient(135deg,#1e3c72 0%,#2a5298 100%);color:#fff;border:none;padding:16px;border-radius:12px;font-size:17px;font-weight:700;cursor:pointer;transition:all 0.3s ease;box-shadow:0 4px 15px rgba(30,60,114,0.3)}
.btn-login:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(30,60,114,0.4)}
.btn-login:active{transform:translateY(0)}
.error{background:linear-gradient(135deg,#f8d7da 0%,#f5c6cb 100%);color:#721c24;padding:14px 16px;border-radius:10px;margin-bottom:20px;font-size:14px;display:none;font-weight:600;box-shadow:0 2px 8px rgba(114,28,36,0.15)}
.error.show{display:block}
</style>
</head>
<body>
<div class="login-box">
<h1>Admin Login</h1>
<p>Enter password to access oversight</p>
${hasError ? '<div class="error show">Invalid password. Please try again.</div>' : ''}
<form action="/api/admin/login" method="POST">
<div class="form-group">
<label>Password</label>
<input type="password" name="pin" autocomplete="off" required autofocus>
</div>
<button type="submit" class="btn-login">Login</button>
</form>
</div>
</body>
</html>`;
}

export function renderAdminDashboardPage(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<title>Admin Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a14;overflow:hidden;width:100vw;height:100vh;display:flex;flex-direction:column;color:#fff}
.hdr{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:16px 20px;flex-shrink:0;z-index:100;box-shadow:0 2px 20px rgba(0,0,0,0.4)}
.hdr-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.hdr h1{font-size:22px;font-weight:700;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hdr-actions{display:flex;gap:8px}
.btn-new{background:linear-gradient(135deg,#28a745,#20c997)!important;color:#fff!important;border-color:transparent!important}
.np-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:none;align-items:center;justify-content:center;z-index:2000;padding:20px}
.np-overlay.open{display:flex}
.np-modal{background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(102,126,234,0.3);border-radius:16px;padding:20px;width:100%;max-width:380px}
.np-modal h2{font-size:17px;font-weight:700;margin-bottom:4px}
.np-sub{font-size:12px;color:#8b8ba5;margin-bottom:16px}
.np-field{margin-bottom:12px}
.np-field label{display:block;font-size:11px;color:#8b8ba5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.np-field input,.np-field select{width:100%;padding:11px 14px;border:1px solid rgba(102,126,234,0.3);border-radius:8px;background:rgba(15,15,25,0.8);color:#fff;font-size:14px;font-family:inherit}
.np-actions{display:flex;gap:8px;margin-top:16px}
.np-actions button{flex:1;padding:12px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;border:none}
.np-cancel{background:rgba(255,255,255,0.1);color:#c8c8dc}
.np-create{background:linear-gradient(135deg,#28a745,#20c997);color:#fff}
.np-create:disabled{opacity:0.6}
.btn{background:rgba(102,126,234,0.15);color:#667eea;border:1px solid rgba(102,126,234,0.4);padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn:hover{background:#667eea;color:#fff}
.stats{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;padding:0 20px 16px}
.stat-card{background:rgba(102,126,234,0.08);border:1px solid rgba(102,126,234,0.2);border-radius:12px;padding:12px 8px;text-align:center}
.stat-val{font-size:22px;font-weight:800;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.stat-lbl{font-size:10px;color:#8b8ba5;text-transform:uppercase;font-weight:600;letter-spacing:0.3px;margin-top:2px}
.controls{background:rgba(20,20,35,0.9);padding:10px 20px;display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;border-bottom:1px solid rgba(255,255,255,0.05)}
.ctrl-btn{background:rgba(102,126,234,0.1);color:#8b8ba5;border:1px solid rgba(102,126,234,0.2);padding:8px 12px;border-radius:6px;font-size:11px;white-space:nowrap;cursor:pointer;transition:all 0.2s;font-weight:600}
.ctrl-btn.active{background:#667eea;color:#fff;border-color:#667eea}
.ctrl-btn:hover{background:rgba(102,126,234,0.3);color:#fff}
.ctrl-group{display:flex;align-items:center;gap:6px;flex-shrink:0}
.ctrl-label{font-size:9px;color:#6b6b85;text-transform:uppercase;font-weight:800;letter-spacing:0.6px;padding-right:2px;white-space:nowrap}
.ctrl-divider{width:1px;height:22px;background:rgba(255,255,255,0.12);flex-shrink:0;margin:0 2px}
.ctrl-btn.danger.active{background:#dc3545;color:#fff;border-color:#dc3545}
.hint-bar{padding:9px 20px;background:rgba(102,126,234,0.06);border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;color:#8b8ba5;display:flex;align-items:center;gap:8px;line-height:1.4}
.hint-bar b{color:#a9b4ff;font-weight:700}
.hint-bar.warn{background:rgba(220,53,69,0.08)}
.hint-bar.warn b{color:#ff8a95}
.srch{padding:12px 20px;background:rgba(20,20,35,0.9);border-bottom:1px solid rgba(255,255,255,0.05)}
.srch input{width:100%;padding:12px 16px;border:1px solid rgba(102,126,234,0.25);border-radius:10px;font-size:14px;background:rgba(102,126,234,0.05);color:#fff;transition:all 0.2s}
.srch input::placeholder{color:#6b6b85}
.srch input:focus{outline:none;border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,0.15)}
.otc-sec{padding:12px 20px;background:rgba(20,20,35,0.6);border-bottom:1px solid rgba(255,255,255,0.05)}
.otc-hdr{background:rgba(255,193,7,0.08);border:1px solid rgba(255,193,7,0.25);border-radius:10px;padding:12px;margin-bottom:10px}
.otc-hdr h2{font-size:14px;color:#ffc107;margin-bottom:2px;font-weight:700}
.otc-hdr p{font-size:11px;color:#8b8ba5}
.otc-itm{background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.25);border-radius:10px;padding:12px;margin-bottom:8px;border-left:3px solid #ffc107}
.otc-code{font-size:20px;font-weight:800;color:#ffc107;font-family:'SF Mono',Monaco,monospace;letter-spacing:2px;margin:6px 0}
.otc-info{font-size:11px;color:#ffc107;font-weight:600}
.otc-timer{font-size:11px;color:#ff6b6b;font-weight:600;margin-top:4px}
.otc-empty{background:rgba(102,126,234,0.05);border:1px dashed rgba(102,126,234,0.2);border-radius:10px;padding:16px;text-align:center;color:#6b6b85;font-size:12px}
.lst{padding:12px 20px 100px;flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
.cust-card{background:linear-gradient(135deg,rgba(26,26,46,0.95) 0%,rgba(22,33,62,0.95) 100%);border:1px solid rgba(102,126,234,0.15);border-radius:14px;margin-bottom:12px;overflow:hidden;transition:all 0.2s}
.cust-card:hover{border-color:rgba(102,126,234,0.4);box-shadow:0 4px 24px rgba(102,126,234,0.15)}
.cust-header{padding:16px;cursor:pointer;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.cust-info{flex:1;min-width:0}
.cust-name{font-weight:700;font-size:16px;color:#fff;margin-bottom:2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cust-alias{font-size:14px;color:#a78bfa;font-weight:600;margin-top:4px;padding:4px 0}
.cust-phone{font-size:13px;color:#20c997;font-weight:600;margin-top:2px;font-family:'SF Mono',Monaco,monospace}
.cust-number{font-size:12px;color:#6b6b85;font-family:'SF Mono',Monaco,monospace;margin-top:4px}
.cust-badges{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.badge{padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px}
.badge-active{background:rgba(40,167,69,0.15);color:#28a745;border:1px solid rgba(40,167,69,0.3)}
.badge-deleted{background:rgba(220,53,69,0.15);color:#dc3545;border:1px solid rgba(220,53,69,0.3)}
.badge-flagged{background:rgba(220,53,69,0.2);color:#ff6b6b;border:1px solid rgba(220,53,69,0.4)}
.badge-dev{background:rgba(102,126,234,0.15);color:#667eea;border:1px solid rgba(102,126,234,0.3)}
.online-dot{width:10px;height:10px;background:#28a745;border-radius:50%;animation:pulse 2s infinite;box-shadow:0 0 8px rgba(40,167,69,0.6)}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(0.85)}}
.expand-icon{color:#667eea;font-size:14px;transition:transform 0.3s;padding:8px;background:rgba(102,126,234,0.1);border-radius:8px}
.expand-icon.open{transform:rotate(180deg)}
.cust-details{max-height:0;overflow:hidden;transition:max-height 0.3s ease-out;background:rgba(10,10,20,0.6)}
.cust-details.open{max-height:1200px;overflow-y:auto}
.details-inner{padding:16px;border-top:1px solid rgba(102,126,234,0.1)}
.detail-section{margin-bottom:16px}
.detail-section:last-child{margin-bottom:0}
.section-title{font-size:11px;color:#667eea;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;display:flex;align-items:center;gap:6px}
.detail-row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(102,126,234,0.05);border-radius:8px;margin-bottom:6px}
.detail-row:last-child{margin-bottom:0}
.detail-label{font-size:12px;color:#8b8ba5;font-weight:500}
.detail-value{font-size:12px;color:#fff;font-weight:600;text-align:right;max-width:55%;word-break:break-all}
.account-card{background:rgba(102,126,234,0.08);border:1px solid rgba(102,126,234,0.2);border-radius:10px;padding:14px;margin-top:10px}
.account-title{font-size:13px;font-weight:700;color:#667eea;margin-bottom:10px;display:flex;align-items:center;gap:6px}
.account-balance{font-size:18px;font-weight:800;color:#28a745;margin-bottom:8px}
.admin-field{background:rgba(102,126,234,0.08);border:1px solid rgba(102,126,234,0.2);border-radius:10px;padding:14px;margin-top:12px}
.admin-field-label{font-size:11px;color:#8b8ba5;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px}
.admin-field-row{display:flex;gap:8px;align-items:center}
.admin-input{flex:1;padding:10px 14px;border:1px solid rgba(102,126,234,0.3);border-radius:8px;font-size:14px;background:rgba(15,15,25,0.8);color:#fff;transition:all 0.2s;font-family:inherit}
.admin-input:focus{outline:none;border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,0.15)}
.admin-input::placeholder{color:#6b6b85}
.admin-select{padding:10px 14px;border:1px solid rgba(102,126,234,0.3);border-radius:8px;font-size:13px;background:rgba(15,15,25,0.8);color:#fff;cursor:pointer;min-width:70px}
.admin-select:focus{outline:none;border-color:#667eea}
.save-btn{background:linear-gradient(135deg,#28a745,#20c997);color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s}
.save-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(40,167,69,0.3)}
.action-btns{display:flex;gap:8px;margin-top:14px}
.link-btn{width:100%;background:rgba(102,126,234,0.15);color:#a9b4ff;border:1px solid rgba(102,126,234,0.4);padding:11px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s}
.link-btn:hover{background:#667eea;color:#fff}
.link-result{margin-top:10px;background:rgba(102,126,234,0.06);border:1px solid rgba(102,126,234,0.2);border-radius:8px;padding:10px}
.link-url{width:100%;background:rgba(15,15,25,0.8);border:1px solid rgba(102,126,234,0.3);border-radius:6px;color:#fff;font-size:11px;padding:8px;font-family:'SF Mono',Monaco,monospace;margin-bottom:8px}
.copy-btn{background:#667eea;color:#fff;border:none;padding:7px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer}
.copy-btn:hover{background:#5568d3}
.link-exp{font-size:10px;color:#8b8ba5;margin-top:8px;line-height:1.4}
.delete-btn{flex:1;background:rgba(220,53,69,0.15);color:#dc3545;border:1px solid rgba(220,53,69,0.3);padding:12px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s}
.delete-btn:hover{background:#dc3545;color:#fff}
.restore-btn{flex:1;background:rgba(40,167,69,0.15);color:#28a745;border:1px solid rgba(40,167,69,0.3);padding:12px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s}
.restore-btn:hover{background:#28a745;color:#fff}
.no-accounts{background:rgba(220,53,69,0.08);border:1px dashed rgba(220,53,69,0.3);border-radius:10px;padding:16px;text-align:center;color:#dc3545;font-size:12px;margin-top:10px}
.emp{background:rgba(26,26,46,0.5);border:1px dashed rgba(102,126,234,0.2);border-radius:12px;padding:40px 20px;text-align:center;color:#6b6b85;font-size:14px}
.pause-indicator{position:fixed;top:10px;right:10px;background:rgba(255,193,7,0.9);color:#000;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700;z-index:9999;display:none}
.otc-floating{position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-top:1px solid rgba(255,193,7,0.3);z-index:1000;box-shadow:0 -4px 20px rgba(0,0,0,0.4)}
.otc-toggle{display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 20px;cursor:pointer;transition:all 0.2s}
.otc-toggle:hover{background:rgba(255,193,7,0.1)}
.otc-badge{background:#ffc107;color:#000;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:700;min-width:20px;text-align:center}
.otc-badge.empty{background:rgba(102,126,234,0.3);color:#8b8ba5}
.otc-arrow{color:#ffc107;font-size:12px;transition:transform 0.3s}
.otc-arrow.down{transform:rotate(180deg)}
.otc-content{max-height:0;overflow:hidden;transition:max-height 0.3s ease-out;padding:0 20px}
.otc-content.open{max-height:300px;overflow-y:auto;padding:0 20px 16px}
.otc-itm{background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.25);border-radius:10px;padding:12px;margin-bottom:8px;border-left:3px solid #ffc107}
.otc-code{font-size:20px;font-weight:800;color:#ffc107;font-family:'SF Mono',Monaco,monospace;letter-spacing:2px;margin:6px 0}
.otc-info{font-size:11px;color:#ffc107;font-weight:600}
.otc-timer{font-size:11px;color:#ff6b6b;font-weight:600;margin-top:4px}
.otc-empty{background:rgba(102,126,234,0.05);border:1px dashed rgba(102,126,234,0.2);border-radius:10px;padding:16px;text-align:center;color:#6b6b85;font-size:12px}
</style>
</head>
<body>
<div class="pause-indicator" id="pauseInd">⏸ Auto-refresh paused</div>
<div class="hdr">
<div class="hdr-top">
<h1>Admin Dashboard</h1>
<div class="hdr-actions">
<button class="btn btn-new" onclick="openNewPerson()">+ New person</button>
<button class="btn" onclick="manualRefresh()">↻ Refresh</button>
<button class="btn" onclick="logout()">Logout</button>
</div>
</div>
<div class="stats">
<div class="stat-card">
<div class="stat-val" id="statTotal">0</div>
<div class="stat-lbl">Total</div>
</div>
<div class="stat-card">
<div class="stat-val" id="statActive">0</div>
<div class="stat-lbl">Online</div>
</div>
<div class="stat-card">
<div class="stat-val" id="statDev">0</div>
<div class="stat-lbl">Dev</div>
</div>
<div class="stat-card">
<div class="stat-val" id="statReal">0</div>
<div class="stat-lbl">Real</div>
</div>
<div class="stat-card" style="background:rgba(220,53,69,0.1);border-color:rgba(220,53,69,0.3)">
<div class="stat-val" id="statFlagged" style="color:#dc3545">0</div>
<div class="stat-lbl" style="color:#dc3545">Flagged</div>
</div>
<div class="stat-card" style="background:rgba(40,167,69,0.1);border-color:rgba(40,167,69,0.3)">
<div class="stat-val" id="statToday" style="color:#28a745">0</div>
<div class="stat-lbl" style="color:#28a745">Today</div>
</div>
</div>
</div>
<div class="controls">
<div class="ctrl-group">
<span class="ctrl-label">Show</span>
<button class="ctrl-btn active" onclick="setFilter('active',this)">Active</button>
<button class="ctrl-btn" onclick="setFilter('today',this)">Today</button>
<button class="ctrl-btn" onclick="setFilter('developer',this)">Developer</button>
<button class="ctrl-btn" onclick="setFilter('flagged',this)">Flagged</button>
<button class="ctrl-btn danger" onclick="setFilter('deleted',this)">Deleted</button>
</div>
<span class="ctrl-divider"></span>
<div class="ctrl-group">
<span class="ctrl-label">Sort by</span>
<button class="ctrl-btn active" onclick="setSort('number',this)">Number</button>
<button class="ctrl-btn" onclick="setSort('name',this)">Name</button>
<button class="ctrl-btn" onclick="setSort('date',this)">Date</button>
<button class="ctrl-btn" onclick="setSort('activity',this)">Most Active</button>
</div>
<span class="ctrl-divider"></span>
<div class="ctrl-group">
<button class="ctrl-btn" onclick="exportData()">⬇ Export CSV</button>
</div>
</div>
<div class="hint-bar" id="hintBar"></div>
<div class="srch">
<input type="text" id="srch" placeholder="Search by name, alias, or customer number..." oninput="flt()" onfocus="pauseRefresh()" onblur="resumeRefresh()">
</div>
<div class="lst" id="l"><div class="emp">Loading customers...</div></div>
<div class="np-overlay" id="npOverlay">
<div class="np-modal">
<h2>New person</h2>
<p class="np-sub">Creates the account (starts at 0.00 — set the balance later) and a one-person login link.</p>
<div class="np-field"><label>Profile name (shown in the app)</label><input id="npName" placeholder="e.g. Jane Doe" autocomplete="off"></div>
<div class="np-field"><label>Admin alias / notes (private)</label><input id="npAlias" placeholder="e.g. Sarah – front desk" autocomplete="off"></div>
<div class="np-field"><label>App Replacement Level (0-5)</label><select id="npRep"><option>0</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></div>
<div id="npResult" class="link-result" style="display:none"></div>
<div class="np-actions">
<button class="np-cancel" onclick="closeNewPerson()">Close</button>
<button class="np-create" id="npCreateBtn" onclick="createNewPerson()">Create &amp; Generate Link</button>
</div>
</div>
</div>
<div class="otc-floating" id="otcPanel">
<div class="otc-toggle" onclick="toggleOtcPanel()">
<span id="otcBadge" class="otc-badge">0</span>
<span>OTC Codes</span>
<span id="otcArrow" class="otc-arrow">▲</span>
</div>
<div class="otc-content" id="otcContent">
<div id="otc-list"><div class="otc-empty">No active codes</div></div>
</div>
</div>
<script>
let openCards=new Set();
let allCust=[];
let refreshPaused=false;
let currentFilter='active';
let currentSort='number';
function escapeHtml(t){const m={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};return String(t).replace(/[&<>"']/g,c=>m[c])}
function pauseRefresh(){refreshPaused=true;document.getElementById('pauseInd').style.display='block'}
function resumeRefresh(){setTimeout(()=>{refreshPaused=false;document.getElementById('pauseInd').style.display='none'},500)}
function manualRefresh(){ld();loadOTC()}
let otcPanelOpen=false;
function toggleOtcPanel(){
otcPanelOpen=!otcPanelOpen;
const content=document.getElementById('otcContent');
const arrow=document.getElementById('otcArrow');
if(otcPanelOpen){content.classList.add('open');arrow.classList.add('down')}
else{content.classList.remove('open');arrow.classList.remove('down')}
}
function toggleCard(id){
const det=document.getElementById('det-'+id);
const icon=document.getElementById('icon-'+id);
if(openCards.has(id)){det.classList.remove('open');icon.classList.remove('open');openCards.delete(id)}
else{det.classList.add('open');icon.classList.add('open');openCards.add(id)}
}
async function loadOTC(){
try{
const r=await fetch('/api/admin/active-otcs');
const d=await r.json();
const badge=document.getElementById('otcBadge');
if(!d.otcs||!d.otcs.length){
document.getElementById('otc-list').innerHTML='<div class="otc-empty">No active codes</div>';
badge.textContent='0';badge.classList.add('empty');
return;
}
badge.textContent=d.otcs.length;badge.classList.remove('empty');
let h='';
d.otcs.forEach(otc=>{
h+=\`<div class="otc-itm">
<div class="otc-info">\${escapeHtml(otc.accountData.name)} - \${escapeHtml(otc.customerNumber)}</div>
<div class="otc-code">\${escapeHtml(otc.code)}</div>
<div class="otc-timer">Expires: \${escapeHtml(otc.timeRemaining)}</div>
</div>\`;
});
document.getElementById('otc-list').innerHTML=h;
}catch(e){document.getElementById('otc-list').innerHTML='<div class="otc-empty">Error loading codes</div>'}
}
function isDeveloper(c){
const kw=['test','developer','demo','dev','sample'];
const nm=(c.name||'').toLowerCase();
const al=(c.adminAlias||'').toLowerCase();
return kw.some(k=>nm.includes(k)||al.includes(k));
}
function isOnline(c){
if(!c.profileClickHistory||!Array.isArray(c.profileClickHistory)||!c.profileClickHistory.length)return false;
return(new Date()-new Date(c.profileClickHistory[0]))<300000;
}
function isActiveToday(c){
if(!c.profileClickHistory||!Array.isArray(c.profileClickHistory)||!c.profileClickHistory.length)return false;
const today=new Date();today.setHours(0,0,0,0);
return c.profileClickHistory.some(ts=>new Date(ts)>=today);
}
function getActivityCount(c){
return(c.profileClickHistory&&Array.isArray(c.profileClickHistory))?c.profileClickHistory.length:0;
}
function formatClickTime(ts){
const d=new Date(ts);
const now=new Date();
const diff=now-d;
if(diff<60000)return'Just now';
if(diff<3600000)return Math.floor(diff/60000)+'m ago';
if(diff<86400000)return Math.floor(diff/3600000)+'h ago';
return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
}
function updateStats(){
const total=allCust.filter(c=>!c.isDeleted).length;
const online=allCust.filter(c=>!c.isDeleted&&isOnline(c)).length;
const dev=allCust.filter(c=>!c.isDeleted&&isDeveloper(c)).length;
const real=total-dev;
const flagged=allCust.filter(c=>c.notificationViolationFlagged).length;
const today=allCust.filter(c=>!c.isDeleted&&isActiveToday(c)).length;
document.getElementById('statTotal').textContent=total;
document.getElementById('statActive').textContent=online;
document.getElementById('statDev').textContent=dev;
document.getElementById('statReal').textContent=real;
document.getElementById('statFlagged').textContent=flagged;
document.getElementById('statToday').textContent=today;
}
function setFilter(type,btn){
currentFilter=type;
document.querySelectorAll('.ctrl-btn').forEach(b=>{
if(['Active','Today','Developer','Flagged','Deleted'].some(t=>b.textContent===t))b.classList.remove('active');
});
if(btn)btn.classList.add('active');
applyFiltersAndSort();
}
function setSort(type,btn){
currentSort=type;
document.querySelectorAll('.ctrl-btn').forEach(b=>{
if(['Name','Number','Date','Most Active'].some(t=>b.textContent===t))b.classList.remove('active');
});
if(btn)btn.classList.add('active');
applyFiltersAndSort();
}
function flt(){applyFiltersAndSort()}
function updateHint(count){
const bar=document.getElementById('hintBar');
if(!bar)return;
const n=(typeof count==='number')?count:0;
let cls='hint-bar',msg='';
if(currentFilter==='deleted'){
cls='hint-bar warn';
msg='<b>Step 2 of delete.</b> Showing '+n+' deleted customer(s). Open a card to <b>♻️ Restore</b> them or <b>🔥 Permanent Delete</b> (cannot be undone).';
}else if(currentFilter==='flagged'){
msg='Showing '+n+' customer(s) flagged for a notification violation.';
}else if(currentFilter==='developer'){
msg='Showing '+n+' test/demo account(s) — name or alias contains dev, test, demo or sample.';
}else if(currentFilter==='today'){
msg='Showing '+n+' customer(s) active since midnight today.';
}else{
msg='Showing '+n+' active customer(s). Open a card and tap <b>🗑️ Delete</b> to move someone to the <b>Deleted</b> tab (reversible), then erase them there.';
}
bar.className=cls;
bar.innerHTML=msg;
}
function applyFiltersAndSort(){
let filtered=allCust;
if(currentFilter==='active')filtered=filtered.filter(c=>!c.isDeleted);
else if(currentFilter==='today')filtered=filtered.filter(c=>!c.isDeleted&&isActiveToday(c));
else if(currentFilter==='developer')filtered=filtered.filter(c=>!c.isDeleted&&isDeveloper(c));
else if(currentFilter==='flagged')filtered=filtered.filter(c=>c.notificationViolationFlagged);
else if(currentFilter==='deleted')filtered=filtered.filter(c=>c.isDeleted);
const q=document.getElementById('srch').value.toLowerCase();
if(q)filtered=filtered.filter(c=>(c.adminAlias||'').toLowerCase().includes(q)||c.name.toLowerCase().includes(q)||c.customerNumber.includes(q));
if(currentSort==='name')filtered.sort((a,b)=>a.name.localeCompare(b.name));
else if(currentSort==='number')filtered.sort((a,b)=>parseInt(a.customerNumber)-parseInt(b.customerNumber));
else if(currentSort==='date')filtered.sort((a,b)=>new Date(b.joinDate||0)-new Date(a.joinDate||0));
else if(currentSort==='activity')filtered.sort((a,b)=>getActivityCount(b)-getActivityCount(a));
updateHint(filtered.length);
render(filtered);
}
function render(data){
if(!data.length){document.getElementById('l').innerHTML='<div class="emp">No customers found</div>';return}
let h='';
data.forEach((c,i)=>{
const id='c'+i;
const isOpen=openCards.has(id);
const online=isOnline(c);
const dev=isDeveloper(c);
h+=\`<div class="cust-card">
<div class="cust-header" onclick="toggleCard('\${id}')">
<div class="cust-info">
<div class="cust-name">
\${online?'<span class="online-dot"></span>':''}
\${escapeHtml(c.name)}
</div>
\${c.adminAlias?'<div class="cust-alias">"'+escapeHtml(c.adminAlias)+'"</div>':''}
\${c.adminPhone?'<div class="cust-phone">'+escapeHtml(c.adminPhone)+'</div>':''}
<div class="cust-number">\${escapeHtml(c.customerNumber)}</div>
<div class="cust-badges">
\${c.isDeleted?'<span class="badge badge-deleted">Deleted</span>':'<span class="badge badge-active">Active</span>'}
\${dev?'<span class="badge badge-dev">Developer</span>':''}
\${c.notificationViolationFlagged?'<span class="badge badge-flagged">Flagged</span>':''}
</div>
</div>
<span class="expand-icon \${isOpen?'open':''}" id="icon-\${id}">▼</span>
</div>
<div class="cust-details \${isOpen?'open':''}" id="det-\${id}">
<div class="details-inner">
<div class="detail-section">
<div class="section-title">👤 Customer Details</div>
<div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">\${escapeHtml(c.email)}</span></div>
<div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">\${escapeHtml(c.phone||'N/A')}</span></div>
<div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">\${escapeHtml(c.address||'N/A')}</span></div>
<div class="detail-row"><span class="detail-label">Date of Birth</span><span class="detail-value">\${escapeHtml(c.dateOfBirth||'N/A')}</span></div>
<div class="detail-row"><span class="detail-label">Joined</span><span class="detail-value">\${escapeHtml(c.joinDate||'N/A')}</span></div>
<div class="detail-row"><span class="detail-label">Currency</span><span class="detail-value">\${escapeHtml(c.currency)}</span></div>
</div>
\${c.accounts&&c.accounts.length>0?c.accounts.map(acc=>\`
<div class="account-card">
<div class="account-title">💳 \${escapeHtml(acc.displayName||'Current Account')}</div>
<div class="account-balance">\${c.currency==='GBP'?'£':'€'}\${escapeHtml(acc.balance||'0.00')}</div>
<div class="detail-row"><span class="detail-label">Account</span><span class="detail-value" style="font-family:monospace">\${escapeHtml(acc.accountNumber||'N/A')}</span></div>
<div class="detail-row"><span class="detail-label">Sort Code</span><span class="detail-value" style="font-family:monospace">\${escapeHtml(acc.sortCode||'N/A')}</span></div>
<div class="detail-row"><span class="detail-label">BIC</span><span class="detail-value" style="font-family:monospace">\${escapeHtml(acc.bic||'N/A')}</span></div>
<div class="detail-row"><span class="detail-label">IBAN</span><span class="detail-value" style="font-family:monospace;font-size:10px">\${escapeHtml(acc.iban||'N/A')}</span></div>
</div>
\`).join(''):'<div class="no-accounts">No bank account created yet</div>'}
\${c.notificationViolationFlagged?\`
<div class="detail-section" style="margin-top:14px">
<div class="section-title" style="color:#dc3545">⚠️ Notification Violation</div>
<div class="detail-row" style="background:rgba(220,53,69,0.1);border:1px solid rgba(220,53,69,0.2)">
<span class="detail-label" style="color:#dc3545">Attempted login without notifications</span>
<span class="detail-value" style="color:#dc3545">\${c.notificationViolationAt?new Date(c.notificationViolationAt).toLocaleString('en-GB'):''}</span>
</div>
</div>
\`:''}
<div class="detail-section" style="margin-top:14px">
<div class="section-title">📊 Activity (Last 3 Profile Views)</div>
\${c.profileClickHistory&&c.profileClickHistory.length>0?c.profileClickHistory.slice(0,3).map((ts,idx)=>\`
<div class="detail-row" style="background:rgba(40,167,69,0.08);border:1px solid rgba(40,167,69,0.2)">
<span class="detail-label" style="color:#28a745">\${idx===0?'Most Recent':idx===1?'2nd Visit':'3rd Visit'}</span>
<span class="detail-value" style="color:#28a745">\${formatClickTime(ts)}</span>
</div>
\`).join(''):\`
<div class="detail-row" style="background:rgba(102,126,234,0.05);border:1px dashed rgba(102,126,234,0.2)">
<span class="detail-label" style="color:#6b6b85">No activity recorded</span>
<span class="detail-value" style="color:#6b6b85">-</span>
</div>
\`}
<div class="detail-row"><span class="detail-label">Total Profile Views</span><span class="detail-value" style="font-weight:700;color:#667eea">\${getActivityCount(c)}</span></div>
</div>
<div class="admin-field">
<div class="admin-field-label">Admin Alias / Notes</div>
<div class="admin-field-row">
<input type="text" class="admin-input" id="alias-\${id}" value="\${escapeHtml(c.adminAlias||'')}" placeholder="Add internal name or notes..." onfocus="pauseRefresh()" onblur="resumeRefresh()">
<button class="save-btn" onclick="saveAdmin('\${escapeHtml(c.customerNumber)}','\${id}')">Save</button>
</div>
</div>
<div class="admin-field">
<div class="admin-field-label">Admin Phone Number</div>
<div class="admin-field-row">
<input type="text" class="admin-input" id="phone-\${id}" value="\${escapeHtml(c.adminPhone||'')}" placeholder="Enter phone number..." onfocus="pauseRefresh()" onblur="resumeRefresh()">
<button class="save-btn" onclick="saveAdmin('\${escapeHtml(c.customerNumber)}','\${id}')">Save</button>
</div>
</div>
<div class="admin-field">
<div class="admin-field-label">App Replacement Level (0-5)</div>
<div class="admin-field-row">
<select class="admin-select" id="rep-\${id}" onfocus="pauseRefresh()" onblur="resumeRefresh()">
<option value="0" \${(c.appReplacement||0)===0?'selected':''}>0</option>
<option value="1" \${c.appReplacement===1?'selected':''}>1</option>
<option value="2" \${c.appReplacement===2?'selected':''}>2</option>
<option value="3" \${c.appReplacement===3?'selected':''}>3</option>
<option value="4" \${c.appReplacement===4?'selected':''}>4</option>
<option value="5" \${c.appReplacement===5?'selected':''}>5</option>
</select>
<button class="save-btn" onclick="saveAdmin('\${escapeHtml(c.customerNumber)}','\${id}')">Save</button>
</div>
</div>
<div class="action-btns">
\${c.isDeleted?\`
<button class="restore-btn" onclick="restoreCustomer('\${escapeHtml(c.customerNumber)}','\${escapeHtml(c.name)}')">♻️ Restore</button>
<button class="delete-btn" onclick="eraseCustomer('\${escapeHtml(c.customerNumber)}','\${escapeHtml(c.name)}')">🔥 Permanent Delete</button>
\`:\`
<button class="delete-btn" onclick="deleteCustomer('\${escapeHtml(c.customerNumber)}','\${escapeHtml(c.name)}')">🗑️ Delete Customer</button>
\`}
</div>
</div>
</div>
</div>\`;
});
document.getElementById('l').innerHTML=h;
}
async function ld(){
if(refreshPaused)return;
try{
const r=await fetch('/api/customers');
const d=await r.json();
allCust=d.sort((a,b)=>parseInt(a.customerNumber)-parseInt(b.customerNumber));
updateStats();
applyFiltersAndSort();
}catch(e){console.error('Load error:',e)}
}
async function deleteCustomer(n,nm){
if(!confirm('Delete '+nm+'?\\n\\nCustomer: '+n+'\\n\\nThis will log them out immediately.'))return;
const reason=prompt('Reason (optional):','Deleted by admin');
try{
const r=await fetch('/api/customers/'+encodeURIComponent(n),{
method:'DELETE',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({reason:reason||'Deleted by admin'})
});
const d=await r.json();
if(r.ok){alert('"'+nm+'" moved to the Deleted tab.\\n\\nThey are logged out now. To permanently erase them, open the "Deleted" tab and use 🔥 Permanent Delete.');ld()}
else{alert('Could not delete "'+nm+'": '+(d.message||'unknown error'))}
}catch(e){alert('Error: '+e.message)}
}
async function eraseCustomer(n,nm){
if(!confirm('PERMANENTLY DELETE '+nm+'?\\n\\nThis erases all their data and cannot be undone.'))return;
if(!confirm('Final confirmation — erase all data for '+nm+'?'))return;
try{
const r=await fetch('/api/customers/'+encodeURIComponent(n)+'/permanent',{method:'DELETE'});
const d=await r.json();
if(r.ok){alert('"'+nm+'" was permanently erased.');ld()}
else if(r.status===400){alert('"'+nm+'" must be in the Deleted tab first.\\n\\nUse 🗑️ Delete Customer on them, then come back to the Deleted tab to permanently erase.')}
else{alert('Could not permanently erase "'+nm+'": '+(d.message||'unknown error'))}
}catch(e){alert('Error: '+e.message)}
}
async function restoreCustomer(n,nm){
if(!confirm('Restore '+nm+'?'))return;
try{
const r=await fetch('/api/customers/'+encodeURIComponent(n)+'/restore',{method:'POST'});
const d=await r.json();
if(r.ok){alert('Restored: '+nm);ld()}
else{alert('Failed: '+d.message)}
}catch(e){alert('Error: '+e.message)}
}
async function saveAdmin(n,id){
try{
const alias=document.getElementById('alias-'+id).value;
const phone=document.getElementById('phone-'+id).value;
const rep=parseInt(document.getElementById('rep-'+id).value);
const r=await fetch('/api/customers/'+encodeURIComponent(n)+'/admin',{
method:'PATCH',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({adminAlias:alias,adminPhone:phone,appReplacement:rep})
});
if(r.ok){
alert('Saved!');
allCust=allCust.map(c=>c.customerNumber===n?{...c,adminAlias:alias,adminPhone:phone,appReplacement:rep}:c);
applyFiltersAndSort();
}else{const d=await r.json();alert('Failed: '+d.message)}
}catch(e){alert('Error saving')}
}
function openNewPerson(){
document.getElementById('npName').value='';
document.getElementById('npAlias').value='';
document.getElementById('npRep').value='0';
const r=document.getElementById('npResult');r.style.display='none';r.innerHTML='';
document.getElementById('npOverlay').classList.add('open');
pauseRefresh();
}
function closeNewPerson(){document.getElementById('npOverlay').classList.remove('open');resumeRefresh()}
async function createNewPerson(){
const name=document.getElementById('npName').value.trim();
if(!name){alert('Enter a profile name');return}
const alias=document.getElementById('npAlias').value;
const rep=parseInt(document.getElementById('npRep').value);
const btn=document.getElementById('npCreateBtn');
btn.disabled=true;btn.textContent='Creating…';
try{
const r=await fetch('/api/admin/customers/create-with-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,adminAlias:alias,appReplacement:rep})});
const d=await r.json();
if(r.ok&&d.link){
const box=document.getElementById('npResult');
box.style.display='block';
box.innerHTML='<div class="link-exp" style="margin-top:0;margin-bottom:8px;color:#28a745;font-size:12px">✓ Created '+escapeHtml(d.name)+' ('+escapeHtml(d.customerNumber)+')</div><input class="link-url" readonly value="'+escapeHtml(d.link)+'"><button class="copy-btn" onclick="copyLink(this)">Copy link</button><div class="link-exp">Send to one person. Works once, on the first phone that opens it, and expires '+new Date(d.expiresAt).toLocaleString('en-GB')+'.</div>';
ld();
}else{alert('Could not create: '+(d.message||'error'))}
}catch(e){alert('Error creating person')}
btn.disabled=false;btn.textContent='Create & Generate Link';
}
function copyLink(btn){
const el=btn.previousElementSibling;
if(!el)return;
el.select();el.setSelectionRange(0,99999);
const done=()=>{btn.textContent='Copied!';setTimeout(()=>{btn.textContent='Copy link'},1500)};
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(el.value).then(done).catch(()=>{try{document.execCommand('copy');done()}catch(e){alert('Long-press the link to copy')}})}
else{try{document.execCommand('copy');done()}catch(e){alert('Long-press the link to copy')}}
}
function exportData(){
let filtered=allCust;
if(currentFilter==='active')filtered=allCust.filter(c=>!c.isDeleted);
else if(currentFilter==='today')filtered=allCust.filter(c=>!c.isDeleted&&isActiveToday(c));
else if(currentFilter==='developer')filtered=allCust.filter(c=>!c.isDeleted&&isDeveloper(c));
else if(currentFilter==='flagged')filtered=allCust.filter(c=>c.notificationViolationFlagged);
else if(currentFilter==='deleted')filtered=allCust.filter(c=>c.isDeleted);
const csv=['Customer Number,Name,Alias,Email,Phone,Currency,Join Date,Developer,Online'];
filtered.forEach(c=>{
const online=isOnline(c);
csv.push(\`\${c.customerNumber},"\${escapeHtml(c.name)}","\${escapeHtml(c.adminAlias||'')}","\${escapeHtml(c.email)}","\${escapeHtml(c.phone||'')}","\${c.currency}","\${c.joinDate||''}",\${isDeveloper(c)?'Yes':'No'},\${online?'Yes':'No'}\`);
});
const blob=new Blob([csv.join('\\n')],{type:'text/csv'});
const url=URL.createObjectURL(blob);
const a=document.createElement('a');
a.href=url;
a.download='customers_'+currentFilter+'_'+new Date().toISOString().split('T')[0]+'.csv';
a.click();
URL.revokeObjectURL(url);
}
async function logout(){
try{await fetch('/api/admin/logout',{method:'POST'});window.location.href='/admin-oversight'}catch(e){alert('Error')}
}
ld();
setInterval(()=>{if(!refreshPaused)loadOTC()},5000);
setInterval(()=>{if(!refreshPaused)ld()},5000);
</script>
</body>
</html>`;
}
