// Admin Oversight — server-rendered, self-contained dashboard.
//
// Rendered as plain HTML/CSS/vanilla-JS (this page is intentionally NOT part of
// the React app, so it stays dependency-free and standalone). The client script
// uses string concatenation rather than template literals so nothing needs to
// be escaped inside this server-side template literal.
//
// Data + actions use the existing endpoints:
//   GET    /api/customers                     (list, incl. soft-deleted + accounts)
//   GET    /api/admin/invite/active           (active invite links)
//   GET    /api/admin/active-otcs             (one-time codes)
//   POST   /api/admin/customers/create-with-link
//   PATCH  /api/customers/:n/admin            (alias / phone / replacement)
//   DELETE /api/customers/:n                  (soft delete)
//   POST   /api/customers/:n/restore
//   DELETE /api/customers/:n/permanent
//   DELETE /api/admin/customers/erase-all-deleted
//   POST   /api/admin/logout

export function renderAdminLoginPage(hasError: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0">
<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<title>Admin Login</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;background:#f6f7f9;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;color:#0f172a}
.box{background:#fff;border:1px solid #eceef1;border-radius:20px;padding:36px 32px;max-width:380px;width:100%;box-shadow:0 10px 40px rgba(15,23,42,0.08)}
.mark{width:44px;height:44px;border-radius:12px;background:#126987;display:flex;align-items:center;justify-content:center;margin-bottom:18px}
.mark svg{width:22px;height:22px;stroke:#fff}
h1{font-size:22px;font-weight:700;margin-bottom:6px;letter-spacing:-0.02em}
p{color:#64748b;font-size:14px;margin-bottom:24px}
label{display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:8px}
input{width:100%;padding:13px 14px;border:1px solid #e2e8f0;border-radius:11px;font-size:15px;font-family:inherit;transition:border-color .15s,box-shadow .15s;background:#fff}
input:focus{outline:none;border-color:#126987;box-shadow:0 0 0 3px rgba(18,105,135,0.12)}
button{width:100%;margin-top:18px;background:#126987;color:#fff;border:none;padding:14px;border-radius:11px;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s;font-family:inherit}
button:hover{background:#0d4e63}
.err{background:#fee2e2;color:#b91c1c;padding:12px 14px;border-radius:10px;margin-bottom:18px;font-size:13px;font-weight:500}
</style>
</head>
<body>
<div class="box">
<div class="mark"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4v5c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V7z"/></svg></div>
<h1>Admin Oversight</h1>
<p>Enter your password to continue</p>
${hasError ? '<div class="err">Invalid password. Please try again.</div>' : ''}
<form action="/api/admin/login" method="POST">
<label>Password</label>
<input type="password" name="pin" autocomplete="off" required autofocus>
<button type="submit">Sign in</button>
</form>
</div>
</body>
</html>`;
}

export function renderAdminDashboardPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<title>Admin Oversight</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
--bg:#f6f7f9;--card:#fff;--line:#eceef1;--line2:#e2e8f0;
--ink:#0f172a;--sub:#64748b;--mut:#94a3b8;
--teal:#126987;--teal-d:#0d4e63;--teal-bg:rgba(18,105,135,.08);
--green:#16a34a;--green-bg:#dcfce7;--red:#dc2626;--red-bg:#fee2e2;
--amber:#b45309;--amber-bg:#fef3c7;--violet:#7c3aed;--violet-bg:#ede9fe;
--sh:0 1px 3px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.04);
}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;padding-bottom:60px}
svg{display:block}
.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}

/* top bar */
.topbar{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.85);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:flex;align-items:center;gap:10px;min-width:0}
.brand-mark{width:34px;height:34px;border-radius:10px;background:var(--teal);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.brand-mark svg{width:18px;height:18px;stroke:#fff}
.brand h1{font-size:16px;font-weight:700;letter-spacing:-0.02em;white-space:nowrap}
.top-actions{display:flex;gap:8px;flex-shrink:0}
.btn{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line2);background:#fff;color:var(--ink);padding:9px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap}
.btn:hover{background:#f8fafc;border-color:#cbd5e1}
.btn svg{width:15px;height:15px;stroke:currentColor;stroke-width:2;fill:none}
.btn:disabled{opacity:.55;cursor:default}
.btn-primary{background:var(--teal);border-color:var(--teal);color:#fff}
.btn-primary:hover{background:var(--teal-d);border-color:var(--teal-d)}
.btn-danger{background:var(--red);border-color:var(--red);color:#fff}
.btn-danger:hover{background:#b91c1c;border-color:#b91c1c}
.btn-ghost-danger{color:var(--red);border-color:#fecaca;background:#fff}
.btn-ghost-danger:hover{background:var(--red-bg)}
.icon-only{padding:9px}

.wrap{max-width:960px;margin:0 auto;padding:20px}

/* summary cards */
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:22px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;box-shadow:var(--sh);animation:fadeUp .25s ease}
.stat-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.stat-label{font-size:12px;color:var(--sub);font-weight:600}
.stat-ic{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center}
.stat-ic svg{width:16px;height:16px;stroke-width:2;fill:none}
.stat-value{font-size:28px;font-weight:750;letter-spacing:-0.03em;line-height:1}
.ic-teal{background:var(--teal-bg);color:var(--teal)}.ic-teal svg{stroke:var(--teal)}
.ic-green{background:var(--green-bg);color:var(--green)}.ic-green svg{stroke:var(--green)}
.ic-red{background:var(--red-bg);color:var(--red)}.ic-red svg{stroke:var(--red)}
.ic-amber{background:var(--amber-bg);color:var(--amber)}.ic-amber svg{stroke:var(--amber)}

/* tabs */
.tabs{position:sticky;top:63px;z-index:40;display:flex;gap:4px;background:var(--bg);padding:6px 0 14px;margin-bottom:2px;overflow-x:auto}
.tab{border:none;background:transparent;color:var(--sub);padding:9px 15px;border-radius:10px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .15s;display:inline-flex;align-items:center;gap:7px}
.tab:hover{color:var(--ink);background:#eef1f4}
.tab.active{background:var(--teal);color:#fff}
.tab .pill{background:rgba(255,255,255,.25);padding:1px 7px;border-radius:20px;font-size:11px;font-weight:700}
.tab:not(.active) .pill{background:#e2e8f0;color:var(--sub)}

/* toolbar */
.toolbar{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.search{flex:1;min-width:180px;position:relative}
.search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;stroke:var(--mut);stroke-width:2;fill:none}
.search input{width:100%;padding:11px 12px 11px 36px;border:1px solid var(--line2);border-radius:11px;font-size:14px;font-family:inherit;background:#fff}
.search input:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px rgba(18,105,135,.1)}
select.sel{padding:11px 12px;border:1px solid var(--line2);border-radius:11px;font-size:13.5px;font-family:inherit;background:#fff;color:var(--ink);cursor:pointer}
select.sel:focus{outline:none;border-color:var(--teal)}

.panel{display:none}
.panel.active{display:block;animation:fadeUp .2s ease}

/* customer rows */
.list{display:flex;flex-direction:column;gap:10px}
.row{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--sh);overflow:hidden;transition:border-color .15s,box-shadow .15s}
.row:hover{border-color:#dde3ea;box-shadow:0 4px 14px rgba(15,23,42,.06)}
.row-head{display:flex;align-items:center;gap:13px;padding:14px 16px;cursor:pointer}
.avatar{width:40px;height:40px;border-radius:12px;background:var(--teal-bg);color:var(--teal);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0}
.row-main{flex:1;min-width:0}
.row-name{font-weight:650;font-size:15px;display:flex;align-items:center;gap:8px;letter-spacing:-0.01em}
.row-sub{font-size:12.5px;color:var(--sub);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
.row-created{font-size:12px;color:var(--mut);text-align:right}
.chev{width:18px;height:18px;stroke:var(--mut);stroke-width:2;fill:none;transition:transform .2s}
.row.open .chev{transform:rotate(180deg)}
.dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px var(--green-bg);flex-shrink:0}

.badge{padding:3px 9px;border-radius:20px;font-size:11px;font-weight:650;letter-spacing:.01em}
.b-active{background:var(--green-bg);color:var(--green)}
.b-deleted{background:var(--red-bg);color:var(--red)}
.b-dev{background:var(--violet-bg);color:var(--violet)}
.b-flag{background:var(--amber-bg);color:var(--amber)}
.b-off{background:#f1f5f9;color:var(--sub)}

.details{max-height:0;overflow:hidden;transition:max-height .28s ease}
.row.open .details{max-height:1400px}
.details-in{padding:4px 16px 18px;border-top:1px solid var(--line)}
.sec-h{font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.05em;margin:16px 0 9px}
.kv{display:flex;justify-content:space-between;gap:14px;padding:7px 0;font-size:13.5px;border-bottom:1px solid #f4f6f8}
.kv:last-child{border-bottom:none}
.kv .k{color:var(--sub)}.kv .v{font-weight:550;text-align:right;word-break:break-word}
.mono{font-family:'SF Mono',ui-monospace,Menlo,monospace;font-size:12.5px}
.acct{background:#f8fafc;border:1px solid var(--line);border-radius:12px;padding:13px 14px;margin-top:9px}
.acct-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
.acct-name{font-weight:650;font-size:13.5px}
.acct-bal{font-weight:750;font-size:16px;color:var(--teal);letter-spacing:-0.01em}
.click{display:flex;justify-content:space-between;padding:7px 11px;background:#f0fdf4;border-radius:9px;font-size:12.5px;margin-bottom:6px;color:#15803d;font-weight:550}
.click.none{background:#f8fafc;color:var(--mut)}

.field{margin-bottom:10px}
.field label{display:block;font-size:12px;color:var(--sub);font-weight:600;margin-bottom:6px}
.field-row{display:flex;gap:8px}
.field input,.field select{flex:1;padding:10px 12px;border:1px solid var(--line2);border-radius:10px;font-size:13.5px;font-family:inherit;background:#fff;min-width:0}
.field input:focus,.field select:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px rgba(18,105,135,.1)}
.save{background:var(--teal);color:#fff;border:none;padding:0 16px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap}
.save:hover{background:var(--teal-d)}
.save:disabled{opacity:.6}
.actions-row{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}

/* links + deleted cards */
.link-card,.del-card{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--sh);padding:15px 16px;display:flex;align-items:center;gap:13px;animation:fadeUp .2s ease}
.link-card .avatar{background:var(--teal-bg)}
.grow{flex:1;min-width:0}
.link-url{font-family:'SF Mono',ui-monospace,monospace;font-size:12px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}
.exp{font-size:12px;color:var(--mut);margin-top:3px}

/* danger zone */
.danger{background:linear-gradient(180deg,#fff,#fff5f5);border:1px solid #fecaca;border-radius:16px;padding:16px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.danger-t{font-weight:700;font-size:14px;color:#b91c1c;display:flex;align-items:center;gap:8px}
.danger-t svg{width:17px;height:17px;stroke:#dc2626;stroke-width:2;fill:none}
.danger-s{font-size:12.5px;color:#9f1239;margin-top:3px}

/* timeline */
.timeline{position:relative;padding-left:8px}
.tl-item{position:relative;padding:0 0 4px 26px;margin-bottom:14px}
.tl-item:before{content:'';position:absolute;left:5px;top:20px;bottom:-14px;width:2px;background:var(--line)}
.tl-item:last-child:before{display:none}
.tl-dot{position:absolute;left:0;top:3px;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px var(--line)}
.tl-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:11px 14px;box-shadow:var(--sh)}
.tl-title{font-size:13.5px;font-weight:600}
.tl-meta{font-size:12px;color:var(--mut);margin-top:2px}

/* empty + skeleton */
.empty{text-align:center;padding:56px 20px;color:var(--mut)}
.empty svg{width:40px;height:40px;stroke:#cbd5e1;stroke-width:1.5;fill:none;margin:0 auto 14px}
.empty h3{font-size:15px;font-weight:650;color:var(--sub);margin-bottom:5px}
.empty p{font-size:13px}
.sk{background:linear-gradient(90deg,#eef1f4 25%,#f6f8fa 50%,#eef1f4 75%);background-size:800px 100%;animation:shimmer 1.4s infinite;border-radius:8px}
.sk-row{height:70px;border-radius:16px;margin-bottom:10px}
.sk-card{height:92px;border-radius:16px}

/* toasts */
.toast-wrap{position:fixed;right:18px;bottom:18px;z-index:200;display:flex;flex-direction:column;gap:10px;max-width:calc(100vw - 36px)}
.toast{background:#0f172a;color:#fff;padding:13px 16px;border-radius:12px;font-size:13.5px;font-weight:550;box-shadow:0 10px 30px rgba(0,0,0,.2);display:flex;align-items:center;gap:10px;animation:fadeUp .2s ease}
.toast svg{width:17px;height:17px;stroke-width:2.4;fill:none;flex-shrink:0}
.toast.ok{background:#065f46}.toast.ok svg{stroke:#6ee7b7}
.toast.err{background:#991b1b}.toast.err svg{stroke:#fca5a5}

/* modal */
.overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(2px);z-index:150;display:none;align-items:center;justify-content:center;padding:20px}
.overlay.open{display:flex;animation:fadeUp .15s ease}
.modal{background:#fff;border-radius:18px;width:100%;max-width:400px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.25)}
.modal h2{font-size:18px;font-weight:700;margin-bottom:6px;letter-spacing:-0.02em}
.modal .sub{font-size:13.5px;color:var(--sub);margin-bottom:18px;line-height:1.5}
.modal .field{margin-bottom:14px}
.modal .field input,.modal .field select{width:100%}
.modal-danger-ic{width:44px;height:44px;border-radius:12px;background:var(--red-bg);display:flex;align-items:center;justify-content:center;margin-bottom:14px}
.modal-danger-ic svg{width:22px;height:22px;stroke:var(--red);stroke-width:2;fill:none}
.modal-actions{display:flex;gap:10px;margin-top:6px}
.modal-actions .btn{flex:1;justify-content:center;padding:12px}
.type-input{width:100%;padding:12px 14px;border:1px solid var(--line2);border-radius:11px;font-size:15px;font-family:inherit;letter-spacing:.05em;margin-bottom:16px}
.type-input:focus{outline:none;border-color:var(--red);box-shadow:0 0 0 3px rgba(220,38,38,.12)}

@media(max-width:560px){
.wrap{padding:14px}
.row-sub{max-width:150px}
.row-created{display:none}
.stat-value{font-size:24px}
.top-actions .label{display:none}
.top-actions .btn{padding:9px}
}
</style>
</head>
<body>
<div class="topbar">
<div class="brand">
<div class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4v5c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V7z"/></svg></div>
<h1>Admin Oversight</h1>
</div>
<div class="top-actions">
<button class="btn btn-primary" onclick="openNewPerson()"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span class="label">New person</span></button>
<button class="btn icon-only" id="refreshBtn" onclick="refresh(false)" title="Refresh"><svg viewBox="0 0 24 24" id="refreshIco"><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg></button>
<button class="btn icon-only" onclick="logout()" title="Logout"><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg></button>
</div>
</div>

<div class="wrap">
<div class="cards" id="cards"></div>

<div class="tabs">
<button class="tab active" data-tab="customers" onclick="setTab('customers')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="7" r="3"/><path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2"/><circle cx="18" cy="8" r="2"/></svg>Customers <span class="pill" id="pillCust">0</span></button>
<button class="tab" data-tab="links" onclick="setTab('links')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg>Links <span class="pill" id="pillLinks">0</span></button>
<button class="tab" data-tab="deleted" onclick="setTab('deleted')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>Deleted <span class="pill" id="pillDel">0</span></button>
<button class="tab" data-tab="activity" onclick="setTab('activity')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/></svg>Activity</button>
</div>

<div class="panel active" id="panel-customers">
<div class="toolbar">
<div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg><input id="searchInput" placeholder="Search name, alias or number..." oninput="onSearch(this.value)" autocomplete="off"></div>
<select class="sel" id="statusSel" onchange="onStatus(this.value)"><option value="all">All statuses</option><option value="online">Online now</option><option value="today">Active today</option><option value="developer">Developer</option><option value="flagged">Flagged</option></select>
<select class="sel" id="sortSel" onchange="onSort(this.value)"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option><option value="active">Most active</option></select>
</div>
<div id="customersList"></div>
</div>

<div class="panel" id="panel-links"><div id="linksList"></div></div>

<div class="panel" id="panel-deleted"><div id="deletedTop"></div><div id="deletedList"></div></div>

<div class="panel" id="panel-activity"><div id="activityList"></div></div>
</div>

<div class="toast-wrap" id="toasts"></div>

<div class="overlay" id="npOverlay">
<div class="modal">
<h2>New person</h2>
<p class="sub">Creates the account (balance starts at 0.00 — set it later) and a one-person login link.</p>
<div class="field"><label>Profile name (shown in the app)</label><input id="npName" placeholder="e.g. Jane Doe" autocomplete="off"></div>
<div class="field"><label>Admin alias / notes (private)</label><input id="npAlias" placeholder="e.g. Sarah – front desk" autocomplete="off"></div>
<div class="field"><label>App replacement level (0–5)</label><select id="npRep"><option>0</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></div>
<div id="npResult"></div>
<div class="modal-actions">
<button class="btn" onclick="closeNewPerson()">Close</button>
<button class="btn btn-primary" id="npCreate" onclick="createNewPerson()">Create &amp; generate link</button>
</div>
</div>
</div>

<div class="overlay" id="confirmOverlay">
<div class="modal">
<div class="modal-danger-ic"><svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg></div>
<h2 id="cfTitle">Are you sure?</h2>
<p class="sub" id="cfSub"></p>
<div id="cfType"></div>
<div class="modal-actions">
<button class="btn" id="cfCancel" onclick="closeConfirm()">Cancel</button>
<button class="btn btn-danger" id="cfOk">Confirm</button>
</div>
</div>
</div>

<script>
var S={customers:[],links:[],loaded:false,tab:'customers',search:'',status:'all',sort:'newest',expanded:{},busy:{},hash:'',polling:true};

function esc(t){var m={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};return String(t==null?'':t).replace(/[&<>"']/g,function(c){return m[c]})}
function q(id){return document.getElementById(id)}
function initials(n){n=(n||'?').trim();var p=n.split(/\\s+/);return((p[0]||'?')[0]+(p[1]?p[1][0]:'')).toUpperCase()}
function money(c){var cur=(c.currency==='GBP')?'£':'€';var b=(c.accounts&&c.accounts[0])?c.accounts[0].balance:null;return b==null?'':cur+Number(b).toLocaleString('en-IE',{minimumFractionDigits:2,maximumFractionDigits:2})}
function isOnline(c){if(!c.profileClickHistory||!c.profileClickHistory.length)return false;return(Date.now()-new Date(c.profileClickHistory[0]).getTime())<300000}
function isDev(c){var kw=['test','developer','demo','dev','sample'];var s=((c.name||'')+' '+(c.adminAlias||'')).toLowerCase();return kw.some(function(k){return s.indexOf(k)>=0})}
function isToday(c){if(!c.profileClickHistory||!c.profileClickHistory.length)return false;var t=new Date();t.setHours(0,0,0,0);return c.profileClickHistory.some(function(x){return new Date(x)>=t})}
function acount(c){return(c.profileClickHistory&&c.profileClickHistory.length)||0}
function fdate(d){if(!d)return'—';var x=new Date(d);if(isNaN(x))return'—';return x.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
function ftime(ts){var d=new Date(ts),diff=Date.now()-d.getTime();if(diff<60000)return'Just now';if(diff<3600000)return Math.floor(diff/60000)+'m ago';if(diff<86400000)return Math.floor(diff/3600000)+'h ago';return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
function active(c){return c.filter(function(x){return !x.isDeleted})}
function deleted(c){return c.filter(function(x){return x.isDeleted})}

/* ---- toasts ---- */
function toast(msg,type){var w=q('toasts');var t=document.createElement('div');t.className='toast'+(type==='ok'?' ok':type==='err'?' err':'');var ic=type==='ok'?'<path d="M20 6L9 17l-5-5"/>':type==='err'?'<path d="M18 6L6 18M6 6l12 12"/>':'<circle cx="12" cy="12" r="9"/>';t.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">'+ic+'</svg><span>'+esc(msg)+'</span>';w.appendChild(t);setTimeout(function(){t.style.opacity='0';t.style.transform='translateY(6px)';t.style.transition='all .3s';setTimeout(function(){t.remove()},300)},3200)}

/* ---- data ---- */
function anyModalOpen(){return q('npOverlay').classList.contains('open')||q('confirmOverlay').classList.contains('open')}
async function loadData(silent){
try{
var cr=await fetch('/api/customers');var cs=await cr.json();
var lr=await fetch('/api/admin/invite/active');var ls=await lr.json();
S.customers=Array.isArray(cs)?cs:[];
S.links=(ls&&ls.links)?ls.links:[];
S.loaded=true;
var h=JSON.stringify(S.customers.map(function(c){return[c.customerNumber,c.isDeleted,c.adminAlias,c.appReplacement,c.name,c.email,(c.profileClickHistory||[])[0]]}))+'|'+S.links.length;
if(silent&&h===S.hash)return false;
S.hash=h;return true;
}catch(e){if(!silent){toast('Could not load data','err')}return false}
}

/* ---- render ---- */
function renderStats(){
var a=active(S.customers),d=deleted(S.customers);
var online=a.filter(isOnline).length,flag=S.customers.filter(function(c){return c.notificationViolationFlagged}).length;
var cards=[
['Total customers',a.length,'ic-teal','<circle cx="9" cy="7" r="3"/><path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2"/><circle cx="18" cy="8" r="2"/>'],
['Active sessions',online,'ic-green','<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'],
['Active links',S.links.length,'ic-teal','<path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>'],
['Deleted',d.length,'ic-red','<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'],
['Flagged',flag,'ic-amber','<path d="M4 21V4M4 4h13l-2 4 2 4H4"/>']
];
q('cards').innerHTML=cards.map(function(c){return '<div class="stat"><div class="stat-top"><span class="stat-label">'+c[0]+'</span><span class="stat-ic '+c[2]+'"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">'+c[3]+'</svg></span></div><div class="stat-value">'+c[1]+'</div></div>'}).join('');
q('pillCust').textContent=a.length;q('pillLinks').textContent=S.links.length;q('pillDel').textContent=d.length;
}

function filterSort(list){
var out=list.slice();
if(S.status==='online')out=out.filter(isOnline);
else if(S.status==='today')out=out.filter(isToday);
else if(S.status==='developer')out=out.filter(isDev);
else if(S.status==='flagged')out=out.filter(function(c){return c.notificationViolationFlagged});
var qy=S.search.toLowerCase().trim();
if(qy)out=out.filter(function(c){return(c.name||'').toLowerCase().indexOf(qy)>=0||(c.adminAlias||'').toLowerCase().indexOf(qy)>=0||(c.customerNumber||'').indexOf(qy)>=0||(c.email||'').toLowerCase().indexOf(qy)>=0});
if(S.sort==='newest')out.sort(function(a,b){return new Date(b.createdAt||b.joinDate||0)-new Date(a.createdAt||a.joinDate||0)});
else if(S.sort==='oldest')out.sort(function(a,b){return new Date(a.createdAt||a.joinDate||0)-new Date(b.createdAt||b.joinDate||0)});
else if(S.sort==='name')out.sort(function(a,b){return(a.name||'').localeCompare(b.name||'')});
else if(S.sort==='active')out.sort(function(a,b){return acount(b)-acount(a)});
return out;
}

function emptyState(icon,title,sub){return '<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">'+icon+'</svg><h3>'+esc(title)+'</h3><p>'+esc(sub)+'</p></div>'}
function skeletons(n,cls){var h='';for(var i=0;i<n;i++)h+='<div class="sk '+cls+'"></div>';return h}

function custRow(c){
var on=isOnline(c),open=!!S.expanded[c.customerNumber];
var badges='';
if(on)badges+='<span class="badge b-active">Online</span>';
if(isDev(c))badges+='<span class="badge b-dev">Dev</span>';
if(c.notificationViolationFlagged)badges+='<span class="badge b-flag">Flagged</span>';
var accts=(c.accounts&&c.accounts.length)?c.accounts.map(function(a){var cur=(c.currency==='GBP')?'£':'€';return '<div class="acct"><div class="acct-top"><span class="acct-name">'+esc(a.displayName||'Account')+'</span><span class="acct-bal">'+cur+Number(a.balance||0).toLocaleString('en-IE',{minimumFractionDigits:2,maximumFractionDigits:2})+'</span></div><div class="kv"><span class="k">Account</span><span class="v mono">'+esc(a.accountNumber||'—')+'</span></div><div class="kv"><span class="k">IBAN</span><span class="v mono">'+esc(a.iban||'—')+'</span></div></div>'}).join(''):'<div class="click none"><span>No account created yet</span></div>';
var clicks=(c.profileClickHistory&&c.profileClickHistory.length)?c.profileClickHistory.slice(0,3).map(function(ts,i){return '<div class="click"><span>'+(i===0?'Most recent':i===1?'2nd visit':'3rd visit')+'</span><span>'+ftime(ts)+'</span></div>'}).join(''):'<div class="click none"><span>No activity recorded</span><span>—</span></div>';
var id=esc(c.customerNumber);
return '<div class="row'+(open?' open':'')+'" data-cn="'+id+'">'
+'<div class="row-head" onclick="toggle(\\''+id+'\\')">'
+(on?'<div class="dot"></div>':'')+'<div class="avatar">'+esc(initials(c.name))+'</div>'
+'<div class="row-main"><div class="row-name">'+esc(c.name||'Unnamed')+badges+'</div><div class="row-sub">'+esc(c.adminAlias?('"'+c.adminAlias+'"  ·  '):'')+esc(c.email||c.customerNumber)+'</div></div>'
+'<div class="row-right"><div class="row-created">'+fdate(c.createdAt||c.joinDate)+'</div><svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div></div>'
+'<div class="details"><div class="details-in">'
+'<div class="sec-h">Contact</div>'
+'<div class="kv"><span class="k">Email</span><span class="v">'+esc(c.email||'—')+'</span></div>'
+'<div class="kv"><span class="k">Phone</span><span class="v">'+esc(c.phone||'—')+'</span></div>'
+'<div class="kv"><span class="k">Customer no.</span><span class="v mono">'+id+'</span></div>'
+'<div class="kv"><span class="k">Joined</span><span class="v">'+fdate(c.joinDate)+'</span></div>'
+'<div class="sec-h">Accounts</div>'+accts
+'<div class="sec-h">Recent activity</div>'+clicks
+'<div class="kv"><span class="k">Total profile views</span><span class="v">'+acount(c)+'</span></div>'
+'<div class="sec-h">Admin</div>'
+'<div class="field"><label>Alias / notes</label><div class="field-row"><input id="al-'+id+'" value="'+esc(c.adminAlias||'')+'" placeholder="Internal note"><button class="save" onclick="saveAdmin(\\''+id+'\\')">Save</button></div></div>'
+'<div class="field"><label>Admin phone</label><div class="field-row"><input id="ph-'+id+'" value="'+esc(c.adminPhone||'')+'" placeholder="Phone"><button class="save" onclick="saveAdmin(\\''+id+'\\')">Save</button></div></div>'
+'<div class="field"><label>App replacement level (0–5)</label><div class="field-row"><select id="rp-'+id+'">'+[0,1,2,3,4,5].map(function(n){return '<option value="'+n+'"'+((c.appReplacement||0)===n?' selected':'')+'>'+n+'</option>'}).join('')+'</select><button class="save" onclick="saveAdmin(\\''+id+'\\')">Save</button></div></div>'
+'<div class="actions-row"><button class="btn btn-ghost-danger" onclick="askDelete(\\''+id+'\\')"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>Delete customer</button></div>'
+'</div></div></div>';
}

function renderCustomers(){
var el=q('customersList');
if(!S.loaded){el.innerHTML=skeletons(4,'sk-row');return}
var list=filterSort(active(S.customers));
if(!list.length){el.innerHTML=emptyState('<circle cx="9" cy="7" r="3"/><path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2"/>',(S.search||S.status!=='all')?'No matches':'No customers yet',(S.search||S.status!=='all')?'Try a different search or filter.':'Use “New person” to add your first customer.');return}
el.innerHTML='<div class="list">'+list.map(custRow).join('')+'</div>';
}

function renderLinks(){
var el=q('linksList');
if(!S.loaded){el.innerHTML=skeletons(3,'sk-card');return}
if(!S.links.length){el.innerHTML=emptyState('<path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>','No active links','Generate one from “New person”. Links vanish here once used or expired.');return}
el.innerHTML=S.links.map(function(l){return '<div class="link-card"><div class="avatar">'+esc(initials(l.name))+'</div><div class="grow"><div class="row-name">'+esc(l.name||l.customerNumber)+'</div><div class="link-url">'+esc(l.link)+'</div><div class="exp">Expires '+fdate(l.expiresAt)+' · works once</div></div><button class="btn" onclick="copyText(\\''+esc(l.link)+'\\',this)"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>Copy</button></div>'}).join('');
}

function renderDeleted(){
var top=q('deletedTop'),el=q('deletedList');
if(!S.loaded){top.innerHTML='';el.innerHTML=skeletons(3,'sk-card');return}
var list=deleted(S.customers).sort(function(a,b){return new Date(b.deletedAt||0)-new Date(a.deletedAt||0)});
if(!list.length){top.innerHTML='';el.innerHTML=emptyState('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>','Nothing deleted','Soft-deleted customers show up here to restore or erase.');return}
top.innerHTML='<div class="danger"><div><div class="danger-t"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>Danger zone</div><div class="danger-s">Permanently erase every deleted customer. This cannot be undone.</div></div><button class="btn btn-danger" onclick="askDeleteAll('+list.length+')"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>Delete all ('+list.length+')</button></div>';
el.innerHTML=list.map(function(c){var id=esc(c.customerNumber);return '<div class="del-card"><div class="avatar" style="background:var(--red-bg);color:var(--red)">'+esc(initials(c.name))+'</div><div class="grow"><div class="row-name">'+esc(c.name||'Unnamed')+'</div><div class="row-sub">'+esc(c.email||id)+'</div><div class="exp">Deleted '+fdate(c.deletedAt)+(c.deleteReason?(' · '+esc(c.deleteReason)):'')+'</div></div><button class="btn" onclick="restore(\\''+id+'\\')"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.7 3L3 8"/><path d="M3 3v5h5"/></svg>Restore</button><button class="btn btn-ghost-danger" onclick="askErase(\\''+id+'\\')"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>Erase</button></div>'}).join('');
}

function renderActivity(){
var el=q('activityList');
if(!S.loaded){el.innerHTML=skeletons(4,'sk-card');return}
var ev=[];
S.customers.forEach(function(c){
if(c.createdAt)ev.push({t:new Date(c.createdAt).getTime(),color:'#16a34a',title:'Customer created',meta:(c.name||c.customerNumber)+' · '+fdate(c.createdAt)});
if(c.isDeleted&&c.deletedAt)ev.push({t:new Date(c.deletedAt).getTime(),color:'#dc2626',title:'Customer deleted',meta:(c.name||c.customerNumber)+(c.deleteReason?(' · '+c.deleteReason):'')+' · '+fdate(c.deletedAt)});
});
S.links.forEach(function(l){if(l.createdAt)ev.push({t:new Date(l.createdAt).getTime(),color:'#126987',title:'Login link generated',meta:(l.name||l.customerNumber)+' · '+fdate(l.createdAt)})});
ev.sort(function(a,b){return b.t-a.t});ev=ev.slice(0,40);
if(!ev.length){el.innerHTML=emptyState('<path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/>','No activity yet','Actions like creating or deleting customers appear here.');return}
el.innerHTML='<div class="timeline">'+ev.map(function(e){return '<div class="tl-item"><span class="tl-dot" style="background:'+e.color+'"></span><div class="tl-card"><div class="tl-title">'+esc(e.title)+'</div><div class="tl-meta">'+esc(e.meta)+'</div></div></div>'}).join('')+'</div>';
}

function renderTab(){
if(S.tab==='customers')renderCustomers();
else if(S.tab==='links')renderLinks();
else if(S.tab==='deleted')renderDeleted();
else if(S.tab==='activity')renderActivity();
}
function renderAll(){renderStats();renderTab()}

/* ---- interactions ---- */
function setTab(t){S.tab=t;var tabs=document.querySelectorAll('.tab');tabs.forEach(function(b){b.classList.toggle('active',b.getAttribute('data-tab')===t)});var ps=document.querySelectorAll('.panel');ps.forEach(function(p){p.classList.toggle('active',p.id==='panel-'+t)});renderTab()}
function toggle(cn){S.expanded[cn]=!S.expanded[cn];var row=document.querySelector('.row[data-cn="'+cn+'"]');if(row)row.classList.toggle('open',!!S.expanded[cn])}
function onSearch(v){S.search=v;renderCustomers()}
function onStatus(v){S.status=v;renderCustomers()}
function onSort(v){S.sort=v;renderCustomers()}

async function refresh(silent){
var ico=q('refreshIco');if(!silent&&ico)ico.classList.add('spin');
var changed=await loadData(silent);
if(!silent&&ico)setTimeout(function(){ico.classList.remove('spin')},400);
if(changed||!silent)renderAll();
}

async function saveAdmin(cn){
if(S.busy['sv'+cn])return;S.busy['sv'+cn]=true;
var al=q('al-'+cn),ph=q('ph-'+cn),rp=q('rp-'+cn);
try{
var r=await fetch('/api/customers/'+encodeURIComponent(cn)+'/admin',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({adminAlias:al.value,adminPhone:ph.value,appReplacement:parseInt(rp.value)})});
if(r.ok){S.customers=S.customers.map(function(c){return c.customerNumber===cn?Object.assign({},c,{adminAlias:al.value,adminPhone:ph.value,appReplacement:parseInt(rp.value)}):c});S.hash='';toast('Saved','ok')}
else{var d=await r.json();toast(d.message||'Save failed','err')}
}catch(e){toast('Save failed','err')}
S.busy['sv'+cn]=false;
}

function copyText(txt,btn){
var done=function(){if(btn){var o=btn.innerHTML;btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Copied';setTimeout(function(){btn.innerHTML=o},1500)}toast('Link copied','ok')};
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(done).catch(function(){toast('Copy failed — long-press the link','err')})}
else{try{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();done()}catch(e){toast('Copy failed','err')}}
}

/* ---- confirm modal ---- */
var cfAction=null;
function openConfirm(title,sub,okLabel,typeWord,fn){
q('cfTitle').textContent=title;q('cfSub').textContent=sub;q('cfOk').textContent=okLabel;cfAction=fn;
if(typeWord){q('cfType').innerHTML='<input class="type-input" id="cfInput" placeholder="Type '+typeWord+' to confirm" autocomplete="off">';q('cfOk').disabled=true;setTimeout(function(){var inp=q('cfInput');inp.oninput=function(){q('cfOk').disabled=inp.value.trim().toUpperCase()!==typeWord};inp.focus()},50)}
else{q('cfType').innerHTML='';q('cfOk').disabled=false}
q('confirmOverlay').classList.add('open');
}
function closeConfirm(){q('confirmOverlay').classList.remove('open');cfAction=null}
q('cfOk').onclick=function(){if(cfAction){var f=cfAction;cfAction=null;q('confirmOverlay').classList.remove('open');f()}};

function nameOf(cn){var c=S.customers.filter(function(x){return x.customerNumber===cn})[0];return(c&&c.name)?c.name:'this customer'}
function askDelete(cn){openConfirm('Delete '+nameOf(cn)+'?','They will be logged out and moved to the Deleted tab. You can restore them later.','Delete',null,function(){doDelete(cn)})}
async function doDelete(cn){
try{var r=await fetch('/api/customers/'+encodeURIComponent(cn),{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:'Deleted by admin'})});var d=await r.json();
if(r.ok){toast('Moved to Deleted','ok');S.expanded[cn]=false;await refresh(false)}else{toast(d.message||'Delete failed','err')}}catch(e){toast('Delete failed','err')}
}
async function restore(cn){
try{var r=await fetch('/api/customers/'+encodeURIComponent(cn)+'/restore',{method:'POST'});var d=await r.json();if(r.ok){toast('Customer restored','ok');await refresh(false)}else{toast(d.message||'Restore failed','err')}}catch(e){toast('Restore failed','err')}
}
function askErase(cn){openConfirm('Permanently erase '+nameOf(cn)+'?','This deletes all their data for good. It cannot be undone.','Erase forever','DELETE',function(){eraseDo(cn)})}
async function eraseDo(cn){
try{var r=await fetch('/api/customers/'+encodeURIComponent(cn)+'/permanent',{method:'DELETE'});var d=await r.json();if(r.ok){toast('Permanently erased','ok');await refresh(false)}else{toast(d.message||'Erase failed','err')}}catch(e){toast('Erase failed','err')}
}
function askDeleteAll(n){openConfirm('Erase all '+n+' deleted customer(s)?','This permanently deletes everyone in the Deleted tab. It cannot be undone.','Erase all','DELETE',function(){eraseAllDo()})}
async function eraseAllDo(){
toast('Erasing…','info');
try{var r=await fetch('/api/admin/customers/erase-all-deleted',{method:'DELETE'});var d=await r.json();
if(r.ok){var msg='Erased '+(d.erased||0)+' customer(s)';if(d.failed&&d.failed.length)msg+=' · '+d.failed.length+' failed';toast(msg,d.failed&&d.failed.length?'err':'ok');await refresh(false)}
else{toast(d.message||'Bulk erase failed','err')}}catch(e){toast('Bulk erase failed','err')}
}

/* ---- new person ---- */
function openNewPerson(){q('npName').value='';q('npAlias').value='';q('npRep').value='0';q('npResult').innerHTML='';q('npCreate').disabled=false;q('npCreate').textContent='Create & generate link';q('npOverlay').classList.add('open');setTimeout(function(){q('npName').focus()},50)}
function closeNewPerson(){q('npOverlay').classList.remove('open')}
async function createNewPerson(){
var name=q('npName').value.trim();if(!name){toast('Enter a profile name','err');return}
var btn=q('npCreate');if(btn.disabled)return;btn.disabled=true;btn.textContent='Creating…';
try{
var r=await fetch('/api/admin/customers/create-with-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,adminAlias:q('npAlias').value,appReplacement:parseInt(q('npRep').value)})});
var d=await r.json();
if(r.ok&&d.link){
q('npResult').innerHTML='<div class="acct" style="margin-bottom:6px"><div style="font-size:12.5px;color:var(--green);font-weight:600;margin-bottom:8px">✓ Created '+esc(d.name)+' ('+esc(d.customerNumber)+')</div><div class="link-url" style="white-space:normal;word-break:break-all;color:var(--ink);margin-bottom:10px">'+esc(d.link)+'</div><button class="btn btn-primary" style="width:100%;justify-content:center" onclick="copyText(\\''+esc(d.link)+'\\',this)"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>Copy link</button><div class="exp" style="margin-top:8px">Send to one person · works once · expires '+fdate(d.expiresAt)+'</div></div>';
btn.textContent='Done — create another';btn.disabled=false;
toast('Customer created','ok');await refresh(true);renderStats();
}else{toast(d.message||'Could not create','err');btn.disabled=false;btn.textContent='Create & generate link'}
}catch(e){toast('Could not create','err');btn.disabled=false;btn.textContent='Create & generate link'}
}

async function logout(){try{await fetch('/api/admin/logout',{method:'POST'})}catch(e){}window.location.href='/admin-oversight'}

/* ---- init + gentle background refresh (no flicker: only re-renders on change) ---- */
renderAll();
refresh(false);
setInterval(function(){
if(!S.polling||anyModalOpen())return;
if(document.activeElement&&(document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='SELECT'))return;
refresh(true);
},20000);
document.addEventListener('visibilitychange',function(){S.polling=!document.hidden;if(!document.hidden)refresh(true)});
</script>
</body>
</html>`;
}
