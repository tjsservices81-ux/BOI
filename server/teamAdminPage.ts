// Team Admin — a separate, deliberately simple oversight page for the two
// secondary admins, kept apart from the main /admin-oversight panel.
//
// Scope is intentionally tiny so the other admins can work freely without
// being able to touch real customers:
//   • It only ever shows "team" accounts — customers whose name is
//     "admincustomer" (see isTeamCustomerName). Real customers are invisible
//     here and cannot be listed, edited or deleted from this page.
//   • At most TEAM_CUSTOMER_LIMIT (2) team accounts can exist at once. Once
//     both slots are full, a new one is refused until one is deleted — they can
//     delete and re-create as often as they like.
//   • The one-time code (OTC) for a team account is surfaced right here, so an
//     account registered in the app under the name "admincustomer" delivers its
//     code to this page instead of needing the main admin.
//
// Rendered as standalone HTML/CSS/vanilla-JS (not part of the React app). The
// client script uses string concatenation rather than template literals so
// nothing needs escaping inside this server-side template literal.

/** How many team accounts may exist at the same time. */
export const TEAM_CUSTOMER_LIMIT = 2;

/** The customer name that marks an account as belonging to the team page. */
export const TEAM_CUSTOMER_NAME = 'admincustomer';

/**
 * True when a customer name marks it as a team-page account. Tolerant of
 * spacing/casing so "Admin Customer", "AdminCustomer" and "admincustomer" all
 * count — the admins type this by hand.
 */
export function isTeamCustomerName(name?: string | null): boolean {
  if (!name) return false;
  return name.replace(/[\s._-]/g, '').toLowerCase() === TEAM_CUSTOMER_NAME;
}

/** PIN for this page. Set TEAM_ADMIN_PIN to override the default. */
export function getTeamAdminPin(): string {
  return process.env.TEAM_ADMIN_PIN || 'TeamAdmin321!';
}

export function renderTeamAdminLoginPage(hasError: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0">
<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<title>Team Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;background:#f6f7f9;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;color:#0f172a}
.box{background:#fff;border:1px solid #eceef1;border-radius:20px;padding:36px 32px;max-width:380px;width:100%;box-shadow:0 10px 40px rgba(15,23,42,0.08)}
.mark{width:44px;height:44px;border-radius:12px;background:#7c3aed;display:flex;align-items:center;justify-content:center;margin-bottom:18px}
.mark svg{width:22px;height:22px;stroke:#fff;stroke-width:2;fill:none}
h1{font-size:22px;font-weight:700;margin-bottom:6px;letter-spacing:-0.02em}
p{color:#64748b;font-size:14px;margin-bottom:24px}
label{display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:8px}
input{width:100%;padding:13px 14px;border:1px solid #e2e8f0;border-radius:11px;font-size:15px;font-family:inherit;background:#fff}
input:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,0.12)}
button{width:100%;margin-top:18px;background:#7c3aed;color:#fff;border:none;padding:14px;border-radius:11px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}
button:hover{background:#6d28d9}
.err{background:#fee2e2;color:#b91c1c;padding:12px 14px;border-radius:10px;margin-bottom:18px;font-size:13px;font-weight:500}
</style>
</head>
<body>
<div class="box">
  <div class="mark">
    <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  </div>
  <h1>Team Admin</h1>
  <p>Sign in to manage your team accounts.</p>
  ${hasError ? '<div class="err">Incorrect PIN. Please try again.</div>' : ''}
  <form method="POST" action="/api/team-admin/login">
    <label for="pin">PIN</label>
    <input type="password" id="pin" name="pin" required autofocus autocomplete="current-password">
    <button type="submit">Sign in</button>
  </form>
</div>
</body>
</html>`;
}

export function renderTeamAdminDashboardPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<title>Team Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
--bg:#f6f7f9;--card:#fff;--line:#eceef1;--line2:#e2e8f0;
--ink:#0f172a;--sub:#64748b;--mut:#94a3b8;
--brand:#7c3aed;--brand-d:#6d28d9;--brand-bg:rgba(124,58,237,.08);
--green:#16a34a;--green-bg:#dcfce7;--red:#dc2626;--red-bg:#fee2e2;
--amber:#b45309;--amber-bg:#fef3c7;
--sh:0 1px 3px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.04);
}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;padding-bottom:60px}
svg{display:block}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.topbar{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.9);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:flex;align-items:center;gap:10px;min-width:0}
.brand-mark{width:34px;height:34px;border-radius:10px;background:var(--brand);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.brand-mark svg{width:18px;height:18px;stroke:#fff;stroke-width:2;fill:none}
.brand h1{font-size:16px;font-weight:700;letter-spacing:-0.02em;white-space:nowrap}
.top-actions{display:flex;gap:8px;flex-shrink:0}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--line2);background:#fff;color:var(--ink);padding:9px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap}
.btn:hover{background:#f8fafc}
.btn:disabled{opacity:.5;cursor:default}
.btn-primary{background:var(--brand);border-color:var(--brand);color:#fff}
.btn-primary:hover{background:var(--brand-d)}
.btn-danger{background:var(--red);border-color:var(--red);color:#fff}
.btn-danger:hover{background:#b91c1c}
.wrap{max-width:760px;margin:0 auto;padding:18px}
.slots{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:15px 17px;box-shadow:var(--sh);margin-bottom:16px;flex-wrap:wrap}
.slots-t{font-size:14px;font-weight:650}
.slots-s{font-size:12.5px;color:var(--sub);margin-top:3px}
.pips{display:flex;gap:6px}
.pip{width:26px;height:8px;border-radius:20px;background:#e2e8f0}
.pip.on{background:var(--brand)}
.list{display:flex;flex-direction:column;gap:12px}
.acct{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--sh);padding:16px 17px;animation:fadeUp .2s ease}
.acct-head{display:flex;align-items:flex-start;gap:12px}
.avatar{width:40px;height:40px;border-radius:12px;background:var(--brand-bg);color:var(--brand);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0}
.acct-main{flex:1;min-width:0}
.acct-name{font-weight:650;font-size:15px;letter-spacing:-0.01em;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.acct-sub{font-size:12.5px;color:var(--sub);margin-top:3px}
.badge{padding:3px 9px;border-radius:20px;font-size:11px;font-weight:650}
.b-active{background:var(--green-bg);color:var(--green)}
.b-wait{background:var(--amber-bg);color:var(--amber)}
.mono{font-family:'SF Mono',ui-monospace,Menlo,monospace}
.otc{margin-top:14px;border-radius:12px;padding:13px 15px;background:#f8fafc;border:1px solid var(--line)}
.otc.live{background:var(--green-bg);border-color:#bbf7d0}
.otc-l{font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.05em}
.otc.live .otc-l{color:#15803d}
.otc-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:7px;flex-wrap:wrap}
.otc-code{font-family:'SF Mono',ui-monospace,Menlo,monospace;font-size:30px;font-weight:750;letter-spacing:.09em;color:#15803d;line-height:1}
.otc-none{font-size:13.5px;color:var(--sub)}
.otc-exp{font-size:12px;color:#15803d;font-weight:600;margin-top:5px}
.actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
.empty{text-align:center;padding:46px 20px;color:var(--mut);background:var(--card);border:1px dashed var(--line2);border-radius:16px}
.empty-t{font-weight:650;color:var(--sub);margin-bottom:5px;font-size:14.5px}
.empty-s{font-size:13px}
.note{font-size:12.5px;color:var(--sub);background:var(--amber-bg);border:1px solid #fde68a;color:#92400e;border-radius:12px;padding:12px 14px;margin-bottom:16px;line-height:1.55}
.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:22px;background:#0f172a;color:#fff;padding:12px 18px;border-radius:11px;font-size:13.5px;font-weight:550;z-index:99;box-shadow:0 8px 24px rgba(15,23,42,.25);max-width:90vw;text-align:center}
.toast.err{background:var(--red)}
.modal{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:20px;z-index:90}
.modal-box{background:#fff;border-radius:18px;max-width:400px;width:100%;overflow:hidden;box-shadow:0 20px 50px rgba(15,23,42,.3)}
.modal-head{background:var(--brand);padding:16px 20px;display:flex;align-items:center;justify-content:space-between}
.modal-head h2{color:#fff;font-size:17px;font-weight:700}
.modal-x{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.18);border:none;color:#fff;font-size:16px;cursor:pointer;line-height:1}
.modal-body{padding:20px}
.modal-body p{font-size:13.5px;color:var(--sub);margin-bottom:14px;line-height:1.55}
.field label{display:block;font-size:12px;color:var(--sub);font-weight:600;margin-bottom:6px}
.field input{width:100%;padding:11px 13px;border:1px solid var(--line2);border-radius:10px;font-size:14px;font-family:inherit}
.field input:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px rgba(124,58,237,.1)}
.modal-actions{display:flex;gap:9px;margin-top:18px}
.modal-actions .btn{flex:1}
.skel{height:112px;border-radius:16px;background:linear-gradient(90deg,#eef1f4 25%,#f6f8fa 50%,#eef1f4 75%);background-size:400px 100%;animation:sh 1.3s infinite}
@keyframes sh{0%{background-position:-400px 0}100%{background-position:400px 0}}
</style>
</head>
<body>
<div class="topbar">
  <div class="brand">
    <div class="brand-mark">
      <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    </div>
    <h1>Team Admin</h1>
  </div>
  <div class="top-actions">
    <button class="btn" onclick="load()">Refresh</button>
    <button class="btn" onclick="logout()">Logout</button>
  </div>
</div>

<div class="wrap">
  <div class="note">
    Accounts here are created with the customer name <strong>admincustomer</strong>. Any account registered in the app under that name shows up on this page with its login code. Real customers never appear here.
  </div>

  <div class="slots">
    <div>
      <div class="slots-t" id="slotsTitle">Loading…</div>
      <div class="slots-s">You can delete an account and make a new one any time.</div>
    </div>
    <div style="display:flex;align-items:center;gap:12px">
      <div class="pips" id="pips"></div>
      <button class="btn btn-primary" id="newBtn" onclick="openNew()">+ New account</button>
    </div>
  </div>

  <div class="list" id="list"><div class="skel"></div><div class="skel"></div></div>
</div>

<div id="modalHost"></div>
<div id="toastHost"></div>

<script>
var LIMIT = ${TEAM_CUSTOMER_LIMIT};
var state = { customers: [] };

function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function toast(msg, isErr){
  var host = document.getElementById('toastHost');
  host.innerHTML = '<div class="toast' + (isErr ? ' err' : '') + '">' + esc(msg) + '</div>';
  setTimeout(function(){ host.innerHTML = ''; }, 3200);
}

function initials(name, alias){
  var s = (alias || name || '?').trim();
  var parts = s.split(/\\s+/);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.substring(0,2).toUpperCase();
}

function load(){
  fetch('/api/team-admin/data', { cache: 'no-store' })
    .then(function(r){ return r.json(); })
    .then(function(d){
      state.customers = (d && d.customers) || [];
      render();
    })
    .catch(function(){
      document.getElementById('list').innerHTML =
        '<div class="empty"><div class="empty-t">Could not load</div>' +
        '<div class="empty-s">Check your connection and tap Refresh.</div></div>';
    });
}

function render(){
  var used = state.customers.length;
  document.getElementById('slotsTitle').textContent = used + ' of ' + LIMIT + ' accounts used';

  var pips = '';
  for (var p = 0; p < LIMIT; p++){
    pips += '<div class="pip' + (p < used ? ' on' : '') + '"></div>';
  }
  document.getElementById('pips').innerHTML = pips;

  var btn = document.getElementById('newBtn');
  btn.disabled = used >= LIMIT;
  btn.textContent = used >= LIMIT ? 'Both slots full' : '+ New account';

  var list = document.getElementById('list');
  if (used === 0){
    list.innerHTML = '<div class="empty"><div class="empty-t">No accounts yet</div>' +
      '<div class="empty-s">Tap “+ New account” to create one. You get ' + LIMIT + ' at a time.</div></div>';
    return;
  }

  var html = '';
  for (var i = 0; i < state.customers.length; i++){
    var c = state.customers[i];
    var otcHtml;
    if (c.otc){
      otcHtml = '<div class="otc live"><div class="otc-l">Login code</div>' +
        '<div class="otc-row"><div class="otc-code">' + esc(c.otc.code) + '</div>' +
        '<button class="btn" onclick="copy(\\'' + esc(c.otc.code) + '\\')">Copy</button></div>' +
        '<div class="otc-exp">Expires in ' + esc(c.otc.timeRemaining) + '</div></div>';
    } else {
      otcHtml = '<div class="otc"><div class="otc-l">Login code</div>' +
        '<div class="otc-row"><div class="otc-none">No active code right now.</div>' +
        '<button class="btn" onclick="genOtc(\\'' + esc(c.customerNumber) + '\\')">Generate code</button></div></div>';
    }

    // A pending row is a code from the 5-tap signup: the account doesn't exist
    // yet, so there's nothing to delete and no created date to show.
    var badge = c.pending
      ? '<span class="badge b-wait">WAITING FOR CODE</span>'
      : '<span class="badge b-active">ACTIVE</span>';

    var meta = c.pending
      ? '<div class="acct-sub">Not signed in yet — enter this code in the app to finish.</div>'
      : '<div class="acct-sub">Created ' + esc(c.created) + '</div>';

    var actions = c.pending
      ? ''
      : '<div class="actions">' +
        '<button class="btn btn-danger" onclick="confirmDelete(\\'' + esc(c.customerNumber) + '\\')">Delete account</button>' +
        '</div>';

    html += '<div class="acct"><div class="acct-head">' +
      '<div class="avatar">' + esc(initials(c.name, c.adminAlias)) + '</div>' +
      '<div class="acct-main"><div class="acct-name">' +
      esc(c.adminAlias || (c.pending ? 'New account' : 'Account ' + (i + 1))) +
      badge + '</div>' +
      '<div class="acct-sub mono">' + esc(c.customerNumber) + '</div>' +
      meta +
      '</div></div>' +
      otcHtml + actions + '</div>';
  }
  list.innerHTML = html;
}

function copy(text){
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){ toast('Copied'); },
      function(){ toast('Could not copy', true); });
  } else {
    var t = document.createElement('textarea');
    t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); toast('Copied'); } catch(e){ toast('Could not copy', true); }
    document.body.removeChild(t);
  }
}

function closeModal(){ document.getElementById('modalHost').innerHTML = ''; }

function openNew(){
  document.getElementById('modalHost').innerHTML =
    '<div class="modal" onclick="if(event.target===this)closeModal()"><div class="modal-box">' +
    '<div class="modal-head"><h2>New account</h2>' +
    '<button class="modal-x" onclick="closeModal()">&times;</button></div>' +
    '<div class="modal-body">' +
    '<p>Creates an account named <strong>admincustomer</strong> with a login code. The label is just so you can tell your two accounts apart.</p>' +
    '<div class="field"><label>Label (optional)</label>' +
    '<input id="newLabel" placeholder="e.g. Test phone" autocomplete="off"></div>' +
    '<div class="modal-actions">' +
    '<button class="btn" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" id="createBtn" onclick="doCreate()">Create</button>' +
    '</div></div></div></div>';
}

function doCreate(){
  var btn = document.getElementById('createBtn');
  btn.disabled = true; btn.textContent = 'Creating…';
  var label = (document.getElementById('newLabel') || {}).value || '';
  fetch('/api/team-admin/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: label })
  }).then(function(r){ return r.json(); }).then(function(d){
    if (d && d.success){
      closeModal();
      toast('Account created');
      load();
    } else {
      btn.disabled = false; btn.textContent = 'Create';
      toast((d && d.message) || 'Could not create the account', true);
    }
  }).catch(function(){
    btn.disabled = false; btn.textContent = 'Create';
    toast('Could not create the account', true);
  });
}

function confirmDelete(num){
  document.getElementById('modalHost').innerHTML =
    '<div class="modal" onclick="if(event.target===this)closeModal()"><div class="modal-box">' +
    '<div class="modal-head"><h2>Delete account</h2>' +
    '<button class="modal-x" onclick="closeModal()">&times;</button></div>' +
    '<div class="modal-body">' +
    '<p>This permanently deletes <strong>' + esc(num) + '</strong> and frees the slot so you can make a new one. This cannot be undone.</p>' +
    '<div class="modal-actions">' +
    '<button class="btn" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-danger" id="delBtn" onclick="doDelete(\\'' + esc(num) + '\\')">Delete</button>' +
    '</div></div></div></div>';
}

function doDelete(num){
  var btn = document.getElementById('delBtn');
  btn.disabled = true; btn.textContent = 'Deleting…';
  fetch('/api/team-admin/customers/' + encodeURIComponent(num), { method: 'DELETE' })
    .then(function(r){ return r.json(); }).then(function(d){
      if (d && d.success){
        closeModal(); toast('Account deleted'); load();
      } else {
        btn.disabled = false; btn.textContent = 'Delete';
        toast((d && d.message) || 'Could not delete', true);
      }
    }).catch(function(){
      btn.disabled = false; btn.textContent = 'Delete';
      toast('Could not delete', true);
    });
}

function genOtc(num){
  fetch('/api/team-admin/customers/' + encodeURIComponent(num) + '/otc', { method: 'POST' })
    .then(function(r){ return r.json(); }).then(function(d){
      if (d && d.success){ toast('Code generated'); load(); }
      else toast((d && d.message) || 'Could not generate a code', true);
    }).catch(function(){ toast('Could not generate a code', true); });
}

function logout(){
  fetch('/api/team-admin/logout', { method: 'POST' }).then(function(){
    window.location.href = '/team-admin';
  }).catch(function(){ window.location.href = '/team-admin'; });
}

load();
// Keep the code countdown fresh without fighting an open dialog.
setInterval(function(){
  if (!document.getElementById('modalHost').innerHTML) load();
}, 10000);
</script>
</body>
</html>`;
}
