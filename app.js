'use strict';

// ============================================================
// STATE
// ============================================================
// NOTE: Storage is handled by db.js (DB adapter).
// To switch from localStorage to Supabase, only db.js changes.
let S = {
  page: 'dashboard',
  projects: [],
  today: null,
  weeklyResets: [],
  northStar: '',
  lastReset: ''
};

function load() {
  try {
    const saved = DB.getState();
    if (saved) {
      S = Object.assign(S, saved);
    } else {
      S.projects = defaultProjects();
      save();
    }
  } catch(e) {
    S.projects = defaultProjects();
  }
  if (!S.today || S.today.date !== todayStr()) {
    S.today = freshToday();
  }
}

function save() {
  DB.setState(S);
}

// ============================================================
// UTILS
// ============================================================
function uid() { return 'p' + Date.now() + Math.floor(Math.random()*10000); }
function todayStr() { return new Date().toISOString().slice(0,10); }
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length===10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}
function fmtDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length===10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function freshToday() {
  return {date:todayStr(),energy:'',tasks:[{task:'',projectId:'',estTime:''},{task:'',projectId:'',estTime:''},{task:'',projectId:'',estTime:''}],oneThing:-1,overflow:['',''],endOfDay:{done:'',note:'',newItems:''}};
}

let toastTimer = null;
function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + (type||'info');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ el.className='toast'; }, 2600);
}

function stateBadge(s) {
  return '<span class="badge badge-' + s.toLowerCase() + '">' + s + '</span>';
}
function energyBadge(e) {
  if (!e) return '';
  return '<span class="badge badge-' + e.toLowerCase() + '">' + e + '</span>';
}
function typeBadge(t) {
  const map = {Creative:'creative',Technical:'technical',Business:'business','Life Admin':'life','Future Idea':'future'};
  const cls = map[t] || 'future';
  return '<span class="badge badge-' + cls + '">' + (t||'') + '</span>';
}

function getByState(st) { return S.projects.filter(p=>p.state===st); }
function getActive() { return S.projects.filter(p=>p.state==='Active'); }
function activeCount() { return getActive().length; }
function proj(id) { return S.projects.find(p=>p.id===id); }

function updateProj(id, data) {
  const i = S.projects.findIndex(p=>p.id===id);
  if (i>=0) {
    S.projects[i] = Object.assign({}, S.projects[i], data);
    if (data.state === 'Active' || data.nextAction !== undefined) {
      S.projects[i].lastWorked = todayStr();
    }
    save();
  }
}

function deleteProj(id) {
  S.projects = S.projects.filter(p=>p.id!==id);
  save();
}

function addProject(data) {
  const p = {
    id: uid(),
    name: data.name || 'Untitled Project',
    type: data.type || 'Technical',
    state: data.state || 'Inbox',
    definitionOfDone: data.definitionOfDone || '',
    deadline: data.deadline || '',
    energy: data.energy || 'Medium',
    nextAction: data.nextAction || '',
    context: data.context || '',
    backlog: data.backlog || [],
    progressLog: data.progressLog || [],
    blockers: data.blockers || '',
    pauseNote: data.pauseNote || null,
    aiLog: data.aiLog || [],
    waitingFor: data.waitingFor || '',
    waitingWho: data.waitingWho || '',
    checkInDate: data.checkInDate || '',
    created: todayStr(),
    lastWorked: todayStr()
  };
  S.projects.unshift(p);
  save();
  return p;
}

function moveToActive(id) {
  if (activeCount() >= 3) {
    toast('3 Active max — park or finish a project first', 'error');
    return false;
  }
  const p = proj(id);
  if (!p) return false;
  if (!p.definitionOfDone) {
    toast('Set a Definition of Done before activating', 'error');
    return false;
  }
  updateProj(id, {state:'Active', lastWorked:todayStr()});
  toast('"' + p.name + '" is now Active', 'success');
  return true;
}

// ============================================================
// NAVIGATION
// ============================================================
const NAV_ITEMS = [
  {id:'dashboard', label:'Dashboard', icon:'<path d="M3 3h7v7H3zM13 3h7v7H13zM3 13h7v7H3zM13 13h7v7H13z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>'},
  {id:'inbox', label:'Inbox', icon:'<rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M3 8l9-5 9 5" stroke="currentColor" stroke-width="1.5" fill="none"/>'},
  {id:'today', label:'Today', icon:'<circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="1.5"/>'},
  {id:'active', label:'Active', icon:'<polygon points="5,3 19,12 5,21" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>'},
  {id:'waitingparked', label:'Waiting/Parked', icon:'<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>'},
  {id:'reset', label:'Weekly Reset', icon:'<path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>'},
  {id:'done', label:'Done', icon:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/><polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'},
  {id:'import', label:'ChatGPT Import', icon:'<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 12h8M12 8l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'}
];

function go(page) {
  S.page = page;
  renderNav();
  renderPage();
}

function renderNav() {
  const inbox = getByState('Inbox').length;
  const active = activeCount();
  document.getElementById('sidebar').innerHTML =
    '<div class="sidebar-logo"><div class="logo-text">Project OS</div><div class="logo-sub">ADHD Edition v1</div></div>' +
    '<div class="nav-section">' +
    NAV_ITEMS.map(n => {
      const badge = n.id==='inbox' && inbox>0 ? '<span class="nav-badge">' + inbox + '</span>' : (n.id==='active' ? '<span class="nav-badge" style="background:' + (active>=3?'var(--red)':'var(--green)') + '">' + active + '/3</span>' : '');
      return '<button class="nav-item' + (S.page===n.id?' active':'') + '" data-nav="' + n.id + '"><svg viewBox="0 0 24 24" fill="none">' + n.icon + '</svg>' + n.label + badge + '</button>';
    }).join('') +
    '</div>' +
    '<div class="nav-footer"><div class="system-health">' + systemHealthRows() + '</div></div>';
}

function systemHealthRows() {
  const acts = getActive();
  const checks = [
    {ok: activeCount()<=3, text: activeCount()+'/3 active'},
    {ok: acts.every(p=>p.nextAction), text: 'NPAs set'},
    {ok: getByState('Inbox').length<10, text: 'Inbox clear'},
    {ok: !!S.northStar, text: 'North Star set'}
  ];
  return checks.map(c=>'<div class="health-row"><div class="health-dot ' + (c.ok?'ok':'warn') + '"></div>' + c.text + '</div>').join('');
}

function renderPage() {
  const pc = document.getElementById('page-content');
  pc.innerHTML = '<div class="page-fade" id="pinner"></div>';
  const inner = document.getElementById('pinner');
  const map = {dashboard:renderDashboard,inbox:renderInbox,today:renderToday,active:renderActive,waitingparked:renderWaitingParked,reset:renderReset,done:renderDone,import:renderImport};
  if (map[S.page]) inner.innerHTML = map[S.page]();
  else inner.innerHTML = '<p>Unknown page</p>';
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const acts = getActive();
  const inboxC = getByState('Inbox').length;
  const waitC = getByState('Waiting').length;
  const parkC = getByState('Parked').length;
  const doneC = getByState('Done').filter(p => p.lastWorked && p.lastWorked.slice(0,7)===todayStr().slice(0,7)).length;

  const noNPA = acts.filter(p=>!p.nextAction);
  let warnHtml = '';
  if (noNPA.length) {
    warnHtml = '<div class="warn-box">Warning: ' + noNPA.map(p=>'"'+p.name+'"').join(', ') + ' ' + (noNPA.length===1?'has':'have') + ' no Next Physical Action.</div>';
  }

  const projCards = acts.length===0 ?
    '<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-text">No active projects. Go to Active to add up to 3.</div></div>' :
    acts.map(p => {
      const npaHtml = p.nextAction
        ? '<div class="dash-npa">' + esc(p.nextAction) + '</div>'
        : '<div class="dash-npa no-npa">No next action set — tap to fix this</div>';
      return '<div class="dash-active-card" data-action="open-project" data-id="' + p.id + '">' +
        '<div class="flex-between"><div class="flex-row" style="gap:7px">' + typeBadge(p.type) + energyBadge(p.energy) + '</div><span class="meta-text">' + (p.lastWorked ? fmtDateShort(p.lastWorked) : '') + '</span></div>' +
        '<div class="proj-name">' + esc(p.name) + '</div>' +
        (p.definitionOfDone ? '<div class="proj-dod">Done when: ' + esc(p.definitionOfDone) + '</div>' : '') +
        npaHtml + '</div>';
    }).join('');

  const rules = [
    {ok: activeCount()<=3, text: activeCount()+'/3 Active'},
    {ok: acts.every(p=>p.nextAction), text: 'All NPAs set'},
    {ok: inboxC<10, text: 'Inbox processed'},
    {ok: !!S.lastReset, text: 'Weekly Reset: ' + (S.lastReset ? fmtDateShort(S.lastReset) : 'never')},
    {ok: !!S.northStar, text: 'North Star set'}
  ];
  const pillsHtml = rules.map(r=>'<span class="rule-pill ' + (r.ok?'ok':'bad') + '"><span class="pill-dot"></span>' + r.text + '</span>').join('');

  return '<div class="page-header"><div class="page-title">' + greeting() + '</div><div class="page-subtitle">' + new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}) + '</div></div>' +
    '<div class="north-star-area"><div class="north-star-label">This Week\'s North Star</div><input class="north-star-input" id="north-star-inp" placeholder="One goal that makes this week a win..." value="' + esc(S.northStar) + '"/></div>' +
    warnHtml +
    '<div class="grid-3" style="margin-bottom:22px">' +
      '<div class="quick-stat"><div class="qs-num blue">' + inboxC + '</div><div class="qs-label">In Inbox</div></div>' +
      '<div class="quick-stat"><div class="qs-num purple">' + (waitC+parkC) + '</div><div class="qs-label">Waiting/Parked</div></div>' +
      '<div class="quick-stat"><div class="qs-num green">' + doneC + '</div><div class="qs-label">Done This Month</div></div>' +
    '</div>' +
    '<div class="section-label">Active Projects (' + acts.length + '/3)</div>' +
    projCards +
    '<hr class="divider">' +
    '<div class="section-label">System Health</div>' +
    '<div style="margin-bottom:8px">' + pillsHtml + '</div>';
}

// ============================================================
// INBOX
// ============================================================
function renderInbox() {
  const items = getByState('Inbox');
  const listHtml = items.length===0 ?
    '<div class="empty-state"><div class="empty-icon">📥</div><div class="empty-text">Inbox is clear. Capture new ideas above.</div></div>' :
    items.map(p => {
      return '<div class="inbox-item">' +
        '<span class="inbox-date">' + (p.created ? fmtDateShort(p.created) : '') + '</span>' +
        '<span class="inbox-name" data-action="open-project" data-id="' + p.id + '">' + esc(p.name) + '</span>' +
        (p.type ? typeBadge(p.type) : '') +
        '<div class="inbox-actions">' +
          '<button class="btn btn-green btn-xs" data-action="inbox-activate" data-id="' + p.id + '">Active</button>' +
          '<button class="btn btn-secondary btn-xs" data-action="inbox-park" data-id="' + p.id + '">Park</button>' +
          '<button class="btn btn-ghost btn-xs" data-action="open-project" data-id="' + p.id + '">Edit</button>' +
          '<button class="btn btn-danger btn-xs" data-action="delete-project" data-id="' + p.id + '">Del</button>' +
        '</div>' +
      '</div>';
    }).join('');

  return '<div class="page-header"><div class="page-title">Inbox</div><div class="page-subtitle">Capture everything. Decide later.</div></div>' +
    '<div class="info-box">Rule: Drop ideas here immediately. Process during your Weekly Reset.</div>' +
    '<div class="inbox-input-area">' +
      '<input class="input" id="inbox-input" placeholder="New project or idea — press Enter to add..." />' +
      '<button class="btn btn-primary" data-action="add-inbox-btn">+ Add</button>' +
    '</div>' +
    '<div id="inbox-list">' + listHtml + '</div>';
}

// ============================================================
// TODAY
// ============================================================
function renderToday() {
  const t = S.today;
  const acts = getActive();
  const projOpts = '<option value="">No project</option>' + acts.map(p=>'<option value="' + p.id + '">' + esc(p.name) + '</option>').join('');
  const timeOpts = '<option value="">--</option><option>15 min</option><option>30 min</option><option>1 hr</option><option>2 hrs</option><option>3+ hrs</option>';
  const energies = ['Low','Medium','High','Variable'];
  const energyEmoji = {Low:'🌙',Medium:'⚡',High:'🔥',Variable:'🌊'};
  const energyColors = {Low:'low',Medium:'medium',High:'high',Variable:'variable'};

  const energyGrid = '<div class="energy-grid">' +
    energies.map(e => {
      const sel = t.energy===e ? ' selected-' + energyColors[e] : '';
      return '<div class="energy-tile' + sel + '" data-action="set-energy" data-energy="' + e + '"><div class="energy-emoji">' + energyEmoji[e] + '</div><div class="energy-label">' + e.toUpperCase() + '</div></div>';
    }).join('') + '</div>';

  const taskSlots = [0,1,2].map(i => {
    const task = t.tasks[i] || {task:'',projectId:'',estTime:''};
    const isOT = t.oneThing===i;
    const selProj = acts.find(p=>p.id===task.projectId);
    const selOpts = '<option value="">No project</option>' + acts.map(p=>'<option value="' + p.id + '"' + (p.id===task.projectId?' selected':'') + '>' + esc(p.name) + '</option>').join('');
    const selTime = '<option value="">--</option>' + ['15 min','30 min','1 hr','2 hrs','3+ hrs'].map(v=>'<option' + (task.estTime===v?' selected':'') + '>' + v + '</option>').join('');
    return '<div class="task-slot' + (isOT?' is-one-thing':'') + '">' +
      (isOT ? '<div class="one-thing-badge">ONE THING</div>' : '') +
      '<div class="flex-row" style="margin-bottom:10px">' +
        '<div class="task-num">' + (i+1) + '</div>' +
        '<input class="input" style="flex:1" placeholder="What are you doing?" data-action="task-input" data-idx="' + i + '" value="' + esc(task.task) + '"/>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
        '<select data-action="task-proj" data-idx="' + i + '" style="flex:1;min-width:120px">' + selOpts + '</select>' +
        '<select data-action="task-time" data-idx="' + i + '" style="width:90px">' + selTime + '</select>' +
        '<button class="btn btn-xs ' + (isOT?'btn-primary':'btn-secondary') + '" data-action="set-one-thing" data-idx="' + i + '">' + (isOT?'ONE THING':'Set as one thing') + '</button>' +
      '</div>' +
    '</div>';
  }).join('');

  const eod = t.endOfDay;
  return '<div class="page-header"><div class="page-title">Today</div><div class="page-subtitle">' + fmtDate(todayStr()) + '</div></div>' +
    '<div class="section-label">Energy Level</div>' + energyGrid +
    '<div class="section-label">Your 3 Tasks</div>' +
    '<div class="info-box" style="margin-bottom:12px">One per active project max. Pick three. One is non-negotiable.</div>' +
    taskSlots +
    '<hr class="divider">' +
    '<div class="section-label">Overflow (bonus — not expected)</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:22px">' +
      '<input class="input" placeholder="Bonus task if top 3 done..." data-action="overflow-0" value="' + esc(t.overflow[0]) + '"/>' +
      '<input class="input" placeholder="Bonus task if top 3 done..." data-action="overflow-1" value="' + esc(t.overflow[1]) + '"/>' +
    '</div>' +
    '<hr class="divider">' +
    '<div class="section-label">End of Day</div>' +
    '<div class="card" style="margin-bottom:12px">' +
      '<div class="input-group"><label class="input-label">Did I do my one thing?</label>' +
        '<div style="display:flex;gap:8px">' +
          ['Yes','Partial','No'].map(v=>'<button class="btn btn-sm ' + (eod.done===v?'btn-primary':'btn-secondary') + '" data-action="eod-done" data-val="' + v + '">' + v + '</button>').join('') +
        '</div>' +
      '</div>' +
      '<div class="input-group"><label class="input-label">Quick note (20 seconds)</label><textarea placeholder="What actually happened today?" data-action="eod-note" rows="2">' + esc(eod.note) + '</textarea></div>' +
    '</div>';
}

// ============================================================
// ACTIVE PROJECTS
// ============================================================
function renderActive() {
  const acts = getActive();
  const slots = [0,1,2].map(i => {
    const p = acts[i];
    if (!p) {
      return '<div class="proj-card empty" data-action="open-inbox-for-active">' +
        '<svg viewBox="0 0 24 24" fill="none" width="28" height="28"><circle cx="12" cy="12" r="10" stroke="var(--accent)" stroke-width="1.5"/><line x1="12" y1="8" x2="12" y2="16" stroke="var(--accent)" stroke-width="1.5"/><line x1="8" y1="12" x2="16" y2="12" stroke="var(--accent)" stroke-width="1.5"/></svg>' +
        '<div style="font-family:\'Syne\',sans-serif;font-weight:700;color:var(--t2)">Slot ' + (i+1) + ' — Open</div>' +
        '<div style="font-size:12px;color:var(--t3)">Move a project here from Inbox or Parked</div>' +
      '</div>';
    }
    const npaCls = p.nextAction ? '' : ' no-npa';
    const npaText = p.nextAction ? esc(p.nextAction) : 'No next action — click to add one now';
    return '<div class="proj-card" data-action="open-project" data-id="' + p.id + '">' +
      '<div class="proj-card-top"><div class="flex-row" style="gap:7px">' + typeBadge(p.type) + energyBadge(p.energy) + '</div>' +
        '<div class="flex-row" style="gap:6px">' +
          '<button class="btn btn-green btn-xs" data-action="mark-done" data-id="' + p.id + '" onclick="event.stopPropagation()">Done</button>' +
          '<button class="btn btn-secondary btn-xs" data-action="park-project" data-id="' + p.id + '" onclick="event.stopPropagation()">Park</button>' +
          '<button class="btn btn-secondary btn-xs" data-action="wait-project" data-id="' + p.id + '" onclick="event.stopPropagation()">Waiting</button>' +
        '</div>' +
      '</div>' +
      '<div class="proj-name">' + esc(p.name) + '</div>' +
      (p.definitionOfDone ? '<div class="proj-dod">Done when: ' + esc(p.definitionOfDone) + '</div>' : '<div class="proj-dod" style="color:var(--red)">No Definition of Done — click to set one</div>') +
      '<div class="proj-npa-label">Next Physical Action</div>' +
      '<div class="proj-npa' + npaCls + '">' + npaText + '</div>' +
      '<div class="proj-meta">' +
        (p.deadline ? '<span class="meta-text">Due: ' + fmtDateShort(p.deadline) + '</span>' : '') +
        '<span class="meta-text">Last: ' + (p.lastWorked ? fmtDateShort(p.lastWorked) : 'never') + '</span>' +
      '</div>' +
    '</div>';
  });

  return '<div class="page-header"><div class="page-title">Active Projects</div><div class="page-subtitle">3 slots maximum. Every slot needs a Next Physical Action.</div></div>' +
    (activeCount()===0 ? '<div class="info-box">No active projects. Activate from your Inbox or Parked projects.</div>' : '') +
    slots.join('') +
    '<hr class="divider">' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button class="btn btn-secondary" data-action="go-inbox"><svg viewBox="0 0 24 24" fill="none" width="14" height="14"><rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 8l9-5 9 5" stroke="currentColor" stroke-width="1.5"/></svg> Browse Inbox</button>' +
      '<button class="btn btn-secondary" data-action="go-waitingparked"><svg viewBox="0 0 24 24" fill="none" width="14" height="14"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg> Browse Parked</button>' +
    '</div>';
}

// ============================================================
// WAITING / PARKED
// ============================================================
function renderWaitingParked() {
  const waiting = getByState('Waiting');
  const parked = getByState('Parked');

  const waitHtml = waiting.length===0 ?
    '<div class="empty-state" style="padding:20px"><div class="empty-text">Nothing waiting on external input.</div></div>' :
    waiting.map(p => {
      return '<div class="wp-item" data-action="open-project" data-id="' + p.id + '">' +
        '<div style="padding-top:2px">' + stateBadge('Waiting') + '</div>' +
        '<div class="wp-item-body">' +
          '<div class="wp-item-name">' + esc(p.name) + '</div>' +
          '<div class="wp-item-detail">' + (p.waitingFor ? 'Waiting for: ' + esc(p.waitingFor) : 'No details') + (p.waitingWho ? ' &mdash; ' + esc(p.waitingWho) : '') + '</div>' +
          (p.checkInDate ? '<div class="wp-item-detail" style="color:var(--yellow)">Check in: ' + fmtDateShort(p.checkInDate) + '</div>' : '') +
        '</div>' +
        '<div class="wp-item-actions">' +
          '<button class="btn btn-green btn-xs" data-action="activate-from-wait" data-id="' + p.id + '" onclick="event.stopPropagation()">Activate</button>' +
          '<button class="btn btn-secondary btn-xs" data-action="park-project" data-id="' + p.id + '" onclick="event.stopPropagation()">Park</button>' +
        '</div>' +
      '</div>';
    }).join('');

  const parkHtml = parked.length===0 ?
    '<div class="empty-state" style="padding:20px"><div class="empty-text">No parked projects. Park a project from Active when you need to step away.</div></div>' :
    parked.map(p => {
      const rn = p.pauseNote;
      return '<div class="wp-item" data-action="open-project" data-id="' + p.id + '">' +
        '<div style="padding-top:2px">' + stateBadge('Parked') + '</div>' +
        '<div class="wp-item-body">' +
          '<div class="wp-item-name">' + esc(p.name) + '</div>' +
          '<div class="wp-item-detail">' + typeBadge(p.type) + ' ' + energyBadge(p.energy) + '</div>' +
          (rn ? '<div class="wp-item-detail" style="color:var(--t1);margin-top:5px">Resume: ' + esc(rn.resumeAction || 'See resume note') + '</div>' : '<div class="wp-item-detail" style="color:var(--red)">No resume note — add one</div>') +
          (rn && rn.date ? '<div class="wp-item-detail">Parked: ' + fmtDateShort(rn.date) + '</div>' : '') +
        '</div>' +
        '<div class="wp-item-actions">' +
          '<button class="btn btn-green btn-xs" data-action="inbox-activate" data-id="' + p.id + '" onclick="event.stopPropagation()">Activate</button>' +
          '<button class="btn btn-danger btn-xs" data-action="delete-project" data-id="' + p.id + '" onclick="event.stopPropagation()">Delete</button>' +
        '</div>' +
      '</div>';
    }).join('');

  return '<div class="page-header"><div class="page-title">Waiting / Parked</div><div class="page-subtitle">Waiting = blocked externally. Parked = you chose to pause.</div></div>' +
    '<div class="section-label">Waiting (' + waiting.length + ')</div>' + waitHtml +
    '<hr class="divider">' +
    '<div class="section-label">Parked (' + parked.length + ')</div>' + parkHtml;
}

// ============================================================
// WEEKLY RESET
// ============================================================
function renderReset() {
  const acts = getActive();
  const waiting = getByState('Waiting');
  const health = calcHealth();

  return '<div class="page-header"><div class="page-title">Weekly Reset</div><div class="page-subtitle">Set a 20-minute timer. This is a mechanical sweep, not a reflection session.</div></div>' +

    '<div style="display:flex;gap:12px;margin-bottom:22px">' +
      '<div class="health-score" style="flex:1"><div class="health-score-num" id="health-num">' + health + '</div><div class="health-score-label">/ 5 System Health</div></div>' +
      '<div style="flex:2;display:flex;flex-direction:column;gap:8px">' +
        '<div class="rule-pill ' + (activeCount()<=3?'ok':'bad') + '" style="display:flex"><span class="pill-dot"></span>' + activeCount() + '/3 Active</div>' +
        '<div class="rule-pill ' + (acts.every(p=>p.nextAction)?'ok':'bad') + '" style="display:flex"><span class="pill-dot"></span>All NPAs set</div>' +
        '<div class="rule-pill ' + (getByState('Inbox').length===0?'ok':'warn') + '" style="display:flex"><span class="pill-dot"></span>' + getByState('Inbox').length + ' in Inbox</div>' +
        '<div class="rule-pill ' + (!!S.northStar?'ok':'warn') + '" style="display:flex"><span class="pill-dot"></span>North Star ' + (S.northStar?'set':'missing') + '</div>' +
      '</div>' +
    '</div>' +

    step(1,'Close the Week','5 min',
      '<div class="input-group"><label class="input-label">Wins this week</label><textarea id="reset-wins" placeholder="List anything you completed or moved forward..." rows="2">' + getReset('wins') + '</textarea></div>' +
      '<div class="input-group"><label class="input-label">What got stuck?</label><textarea id="reset-stuck" placeholder="What didn\'t move? Any patterns?" rows="2">' + getReset('stuck') + '</textarea></div>' +
      '<div class="input-group"><label class="input-label">New Inbox captures</label><textarea id="reset-captures" placeholder="Anything new to capture before you forget?" rows="2">' + getReset('captures') + '</textarea></div>') +

    step(2,'Process Inbox','5 min',
      '<div class="info-box">Go through Inbox. For each item: Activate (if slot open), Park, or Delete. Nothing stays in Inbox forever.</div>' +
      '<button class="btn btn-secondary" data-action="go-inbox">Open Inbox (' + getByState('Inbox').length + ' items)</button>') +

    step(3,'Sweep Active Projects','3 min',
      (acts.length===0 ? '<div style="color:var(--t3);font-size:13px">No active projects.</div>' :
        acts.map(p =>
          '<div class="check-row">' +
            '<input type="checkbox" id="rc-' + p.id + '" ' + (p.nextAction?'checked':'') + '/>' +
            '<label class="check-label" for="rc-' + p.id + '"><strong>' + esc(p.name) + '</strong> — NPA: ' + (p.nextAction ? esc(p.nextAction) : '<span style="color:var(--red)">MISSING</span>') + '</label>' +
            '<button class="btn btn-ghost btn-xs" data-action="open-project" data-id="' + p.id + '" style="margin-left:auto">Edit</button>' +
          '</div>'
        ).join('') +
        '<button class="btn btn-secondary" style="margin-top:10px" data-action="go-active">Open Active Projects</button>')) +

    step(4,'Check Waiting','2 min',
      (waiting.length===0 ? '<div style="color:var(--t3);font-size:13px">Nothing waiting.</div>' :
        waiting.map(p =>
          '<div class="check-row">' +
            '<input type="checkbox"/>' +
            '<label class="check-label"><strong>' + esc(p.name) + '</strong> — ' + (p.waitingFor || 'No details') + '</label>' +
          '</div>'
        ).join(''))) +

    step(5,'Set North Star','2 min',
      '<div class="input-group"><label class="input-label">This Week\'s North Star</label><input class="input" id="reset-northstar" placeholder="One goal that makes next week a win..." value="' + esc(S.northStar) + '"/></div>' +
      '<button class="btn btn-primary" data-action="save-reset">Save Reset</button>');
}

function step(n, title, time, body) {
  return '<div class="reset-step">' +
    '<div class="step-header"><div class="step-num">' + n + '</div><div class="step-title">' + title + '</div><div class="step-time">' + time + '</div></div>' +
    '<div class="step-body">' + body + '</div>' +
  '</div>';
}

function getReset(key) {
  const last = S.weeklyResets[S.weeklyResets.length-1];
  return (last && last[key]) ? last[key] : '';
}

function calcHealth() {
  let score = 0;
  if (activeCount()<=3) score++;
  if (getActive().every(p=>p.nextAction)) score++;
  if (getByState('Inbox').length===0) score++;
  if (!!S.northStar) score++;
  if (S.lastReset) score++;
  return score;
}

// ============================================================
// CHATGPT IMPORT - STATE
// ============================================================
let importState = {
  step: 1,            // 1=input, 2=analyzing, 3=review, 4=done
  method: 'titles',   // 'titles' | 'json' | 'file'
  rawInput: '',
  parsed: [],         // [{title, source}]
  results: [],        // [{id, name, type, energy, isProject, dod, context, selected, source}]
  importedCount: 0,
  progress: 0,
  progressMax: 0
};

// ============================================================
// CHATGPT IMPORT - RENDER
// ============================================================
function renderImport() {
  const step = importState.step;

  const stepIndicator =
    '<div class="step-indicator" style="margin-bottom:22px">' +
      dot(1, step) + line(step>1) +
      dot(2, step) + line(step>2) +
      dot(3, step) + line(step>3) +
      dot(4, step) +
    '</div>';

  let body = '';
  if (step===1) body = renderImportStep1();
  else if (step===2) body = renderImportStep2();
  else if (step===3) body = renderImportStep3();
  else body = renderImportStep4();

  return '<div class="page-header">' +
    '<div class="page-title" style="display:flex;align-items:center;gap:10px">' +
      '<svg viewBox="0 0 41 41" width="28" height="28" fill="none"><path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.111-4.668 10.079 10.079 0 0 0-11.563 5.032 9.964 9.964 0 0 0-6.24 4.197 10.079 10.079 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.111 4.667 10.079 10.079 0 0 0 11.563-5.032 9.965 9.965 0 0 0 6.24-4.196 10.079 10.079 0 0 0-1.24-11.818zm-25.134 7.964a3.058 3.058 0 0 1-1.87-2.719v-8.541a3.058 3.058 0 0 1 1.573-2.685 3.057 3.057 0 0 1 3.115.124l6.774 3.959a3.058 3.058 0 0 1 0 5.295l-6.774 3.959a3.057 3.057 0 0 1-2.818.608z" fill="currentColor" opacity=".5"/></svg>' +
      'ChatGPT Import' +
    '</div>' +
    '<div class="page-subtitle">Pull your ChatGPT conversations into Project OS — AI auto-categorizes everything</div>' +
  '</div>' + stepIndicator + body;
}

function dot(n, current) {
  const cls = current>n ? 'done' : current===n ? 'current' : 'pending';
  const icon = current>n ? '&#10003;' : n;
  return '<div class="step-dot ' + cls + '">' + icon + '</div>';
}
function line(active) {
  return '<div class="step-line' + (active?' done':'') + '"></div>';
}

function renderImportStep1() {
  const m = importState.method;
  return '<div class="import-method-tabs">' +
    '<button class="imethod' + (m==='titles'?' active':'') + '" data-action="import-method" data-method="titles">Paste Titles</button>' +
    '<button class="imethod' + (m==='json'?' active':'') + '" data-action="import-method" data-method="json">ChatGPT JSON Export</button>' +
    '<button class="imethod' + (m==='file'?' active':'') + '" data-action="import-method" data-method="file">Upload File</button>' +
  '</div>' +

  (m==='titles' ?
    '<div class="info-box">Open ChatGPT, look at your left sidebar, and paste those conversation titles here. One per line. Paste as many as you have.</div>' +
    '<textarea id="import-raw" class="input" rows="12" style="font-family:\'DM Mono\',monospace;font-size:12px;line-height:1.7" placeholder="Paste your ChatGPT conversation titles here, one per line...\n\nExample:\nRust kernel memory allocator debugging\nEV battery BMS schematic review\nBusiness name ideas for 3D printing\nVacation packing list\nHow to use ffmpeg\nRobot arm servo control\n...">' + esc(importState.rawInput) + '</textarea>'
  : m==='json' ?
    '<div class="info-box">In ChatGPT: Settings &rarr; Data Controls &rarr; Export Data. You\'ll get an email with a ZIP. Open it, find <strong>conversations.json</strong>, and paste its contents below.</div>' +
    '<textarea id="import-raw" class="input" rows="12" style="font-family:\'DM Mono\',monospace;font-size:11px;line-height:1.5" placeholder=\'Paste the contents of conversations.json here...\n[{"title":"Your first convo",...},...]\'>' + esc(importState.rawInput) + '</textarea>'
  :
    '<div id="import-drop" class="import-dropzone">' +
    '<div class="import-dropzone-icon">&#128196;</div>' +
    '<div class="import-dropzone-text">Drop your <strong>conversations.json</strong> file here</div>' +
    '<div class="import-dropzone-sub">From ChatGPT Data Export ZIP &mdash; or click to browse</div>' +
    '<input type="file" id="import-file-inp" accept=".json,.txt" style="display:none"/>' +
    '</div>' +
    '<textarea id="import-raw" class="input" rows="6" style="font-family:\'DM Mono\',monospace;font-size:11px" placeholder="File contents will appear here after upload..." readonly>' + esc(importState.rawInput) + '</textarea>'
  ) +

  '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;flex-wrap:wrap;gap:10px">' +
    '<div style="font-size:12px;color:var(--t3)">Claude AI will classify each one as a project or a one-off, assign a type, and suggest a Definition of Done.</div>' +
    '<button class="btn btn-primary" data-action="import-analyze">Analyze with Claude AI &rarr;</button>' +
  '</div>';
}

function renderImportStep2() {
  const pct = importState.progressMax > 0 ? Math.round((importState.progress/importState.progressMax)*100) : 0;
  const found = importState.results.filter(r=>r.isProject).length;
  return '<div class="ai-analyzing">' +
    '<div class="ai-spinner"></div>' +
    '<div class="ai-analyzing-text">Claude is reading your ChatGPT history...</div>' +
    '<div class="ai-analyzing-sub">Reading conversation titles and first messages. Classifying as projects vs one-offs, assigning types, and drafting Definitions of Done and first actions.</div>' +
    '<div id="import-status-msg" style="font-size:12px;color:var(--green);font-family:\'DM Mono\',monospace;min-height:18px">' + (found ? 'Found ' + found + ' projects so far...' : '') + '</div>' +
    '<div style="width:300px">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:5px">' +
        '<span id="import-progress-count" style="font-size:11px;color:var(--t3);font-family:\'DM Mono\',monospace">' + importState.progress + ' / ' + importState.progressMax + ' processed</span>' +
        '<span id="import-progress-pct" style="font-size:11px;color:var(--accent);font-family:\'DM Mono\',monospace">' + pct + '%</span>' +
      '</div>' +
      '<div class="import-progress-bar"><div class="import-progress-fill" id="import-progress-fill" style="width:' + pct + '%"></div></div>' +
    '</div>' +
  '</div>';
}

function renderImportStep3() {
  const results = importState.results;
  const projects = results.filter(r=>r.isProject);
  const notProjects = results.filter(r=>!r.isProject);
  const selected = projects.filter(r=>r.selected);

  const typeMap = {Creative:'creative',Technical:'technical',Business:'business','Life Admin':'life','Future Idea':'future'};

  const projectCards = projects.map((r) => {
    const cls = typeMap[r.type] || 'future';
    const idx = results.indexOf(r);
    const hasFirstMsg = r.firstMessage && r.firstMessage.trim();
    const msgMeta = r.messageCount > 1 ? '<span style="font-size:10px;color:var(--t3);font-family:\'DM Mono\',monospace">' + r.messageCount + ' msgs</span>' : '';
    const dateMeta = r.date ? '<span style="font-size:10px;color:var(--t3);font-family:\'DM Mono\',monospace">' + fmtDateShort(r.date) + '</span>' : '';

    return '<div class="import-card' + (r.selected?' selected':' excluded') + '" id="icard-' + idx + '">' +
      '<div style="display:flex;align-items:flex-start;gap:10px">' +
        '<div class="import-card-check" data-action="import-toggle" data-idx="' + idx + '">' +
          (r.selected ? '<svg viewBox="0 0 24 24" width="12" height="12"><polyline points="20,6 9,17 4,12" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>' : '') +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<input class="import-card-name-input" value="' + esc(r.name) + '" data-action="import-name-edit" data-idx="' + idx + '"/>' +
          '<div class="import-card-meta">' +
            '<select class="type-select ' + cls + '" data-action="import-type" data-idx="' + idx + '">' +
              ['Creative','Technical','Business','Life Admin','Future Idea'].map(t=>'<option value="' + t + '"' + (r.type===t?' selected':'') + '>' + t + '</option>').join('') +
            '</select>' +
            '<span class="badge badge-' + (r.energy||'medium').toLowerCase() + '">' + (r.energy||'Medium') + '</span>' +
            msgMeta + dateMeta +
            (r.duplicate ? '<span class="not-project-pill" style="color:var(--yellow)">Already in OS</span>' : '') +
          '</div>' +
          (r.dod ? '<div class="import-card-dod">Done when: ' + esc(r.dod) + '</div>' : '') +
          (r.suggestedNPA ? '<div style="font-size:11px;color:var(--accent);margin-top:5px;font-family:\'DM Mono\',monospace;line-height:1.4">NPA: ' + esc(r.suggestedNPA) + '</div>' : '') +
          (hasFirstMsg ? '<div style="font-size:11px;color:var(--t3);margin-top:5px;line-height:1.4;background:var(--bg1);border-radius:6px;padding:6px 8px;border-left:2px solid var(--border2)">' + esc(r.firstMessage.slice(0,160)) + (r.firstMessage.length>160?'...':'') + '</div>' : '') +
          '<div class="source-line">ChatGPT title: ' + esc(r.source||'').slice(0,80) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  const skipSection = notProjects.length > 0 ?
    '<div style="margin-top:20px"><div class="section-label">Filtered Out — One-offs / Quick Questions (' + notProjects.length + ')</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:7px">' +
    notProjects.map(r=>'<span class="not-project-pill"><span style="font-size:9px">&#215;</span> ' + esc(r.name.slice(0,55)) + '</span>').join('') +
    '</div></div>' : '';

  return '<div class="review-toolbar">' +
    '<div class="review-count"><strong style="color:var(--green)">' + selected.length + '</strong> selected &middot; ' + projects.length + ' projects &middot; ' + notProjects.length + ' skipped</div>' +
    '<button class="btn btn-secondary btn-sm" data-action="import-select-all">Select All</button>' +
    '<button class="btn btn-secondary btn-sm" data-action="import-deselect-all">None</button>' +
    '<button class="btn btn-ghost btn-sm" data-action="import-back">&#8592; Back</button>' +
    '<button class="btn btn-primary" style="margin-left:auto" data-action="import-commit">Import ' + selected.length + ' to Inbox &rarr;</button>' +
  '</div>' +
  projectCards + skipSection;
}

function renderImportStep4() {
  const count = importState.importedCount;
  return '<div style="text-align:center;padding:48px 20px">' +
    '<div style="font-size:48px;margin-bottom:16px">&#127881;</div>' +
    '<div style="font-family:\'Syne\',sans-serif;font-weight:800;font-size:24px;margin-bottom:8px">' + count + ' projects imported</div>' +
    '<div style="font-size:14px;color:var(--t2);margin-bottom:28px">They\'re all in your Inbox. Process them during your next Weekly Reset.</div>' +
    '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
      '<button class="btn btn-primary" data-action="go-inbox">Go to Inbox &rarr;</button>' +
      '<button class="btn btn-secondary" data-action="import-reset">Import More</button>' +
    '</div>' +
  '</div>';
}

// ============================================================
// CHATGPT IMPORT - LOGIC
// ============================================================

// Extract the first user message from a conversation's mapping object
function extractFirstMessage(conv) {
  try {
    const mapping = conv.mapping || {};
    const nodes = Object.values(mapping);
    // find root: node with no parent or parent is null
    const sorted = nodes
      .filter(n => n.message && n.message.author && n.message.author.role === 'user')
      .filter(n => {
        const parts = n.message?.content?.parts;
        return parts && parts.length && typeof parts[0] === 'string' && parts[0].trim().length > 0;
      })
      .sort((a, b) => (a.message.create_time || 0) - (b.message.create_time || 0));
    if (sorted.length) {
      return sorted[0].message.content.parts[0].slice(0, 300).trim();
    }
  } catch(e) {}
  return '';
}

// Extract date from conversation (unix timestamp)
function extractDate(conv) {
  try {
    const ts = conv.create_time || conv.update_time;
    if (ts) return new Date(ts * 1000).toISOString().slice(0,10);
  } catch(e) {}
  return '';
}

// Count messages in a conversation
function countMessages(conv) {
  try {
    const mapping = conv.mapping || {};
    return Object.values(mapping).filter(n => n.message && n.message.content).length;
  } catch(e) {}
  return 0;
}

function parseInput() {
  const raw = importState.rawInput.trim();
  if (!raw) return [];

  // Try full ChatGPT JSON export format
  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      const data = JSON.parse(raw);
      const arr = Array.isArray(data) ? data : [data];
      const convos = arr.filter(c => c && c.title && c.title.trim() && c.title !== 'New chat');
      if (convos.length > 0) {
        return convos.map(c => ({
          title: c.title.trim(),
          source: c.title.trim(),
          firstMessage: extractFirstMessage(c),
          date: extractDate(c),
          messageCount: countMessages(c),
          convId: c.id || c.conversation_id || ''
        }));
      }
    } catch(e) {
      // Not valid JSON — fall through
    }
  }

  // Plain text, one title per line
  return raw.split('\n')
    .map(l => l.trim())
    .filter(l => l && l.length > 2 && !l.startsWith('#'))
    .map(t => ({ title: t, source: t, firstMessage: '', date: '', messageCount: 0, convId: '' }));
}

function updateProgressUI() {
  const pct = importState.progressMax > 0
    ? Math.round((importState.progress / importState.progressMax) * 100) : 0;
  const fill = document.getElementById('import-progress-fill');
  if (fill) fill.style.width = pct + '%';
  const countEl = document.getElementById('import-progress-count');
  if (countEl) countEl.textContent = importState.progress + ' / ' + importState.progressMax + ' processed';
  const pctEl = document.getElementById('import-progress-pct');
  if (pctEl) pctEl.textContent = pct + '%';
  const statusEl = document.getElementById('import-status-msg');
  if (statusEl) {
    const found = importState.results.filter(r => r.isProject).length;
    statusEl.textContent = 'Found ' + found + ' projects so far...';
  }
}

async function runAnalysis() {
  const parsed = parseInput();
  if (!parsed.length) {
    toast('Nothing to analyze — paste some content first', 'error');
    importState.step = 1;
    renderPage();
    return;
  }

  // Deduplicate by title
  const seen = new Set();
  const unique = parsed.filter(p => {
    const k = p.title.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  importState.parsed = unique;
  importState.step = 2;
  importState.progress = 0;
  importState.progressMax = unique.length;
  importState.results = [];
  renderPage();

  const existingNames = S.projects.map(p => p.name.toLowerCase());

  // Batch size: 15 when we have first messages (more tokens), 25 for titles only
  const hasMessages = unique.some(p => p.firstMessage);
  const BATCH = hasMessages ? 15 : 25;
  const allResults = [];

  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const batchResults = await analyzeBatch(batch, existingNames);
    allResults.push(...batchResults);
    importState.progress = Math.min(i + BATCH, unique.length);
    importState.results = allResults; // live update so UI can show running count
    updateProgressUI();
    // Small yield to let UI paint
    await new Promise(r => setTimeout(r, 50));
  }

  importState.results = allResults.map(r => ({ ...r, selected: r.isProject && !r.duplicate }));
  importState.step = 3;
  renderPage();
}

async function analyzeBatch(items, existingNames) {
  const hasMessages = items.some(i => i.firstMessage);

  // Build rich input for Claude — title + first message when available
  const inputData = items.map((i, idx) => {
    const entry = { idx, title: i.title };
    if (i.firstMessage) entry.firstMessage = i.firstMessage;
    if (i.messageCount > 1) entry.messageCount = i.messageCount;
    return entry;
  });

  const prompt = `You are a project management AI helping organize a maker/engineer's ChatGPT conversation history into projects.

The user builds: custom OS kernels in Rust, EVs, bipedal robots, vinyl decal business, ADHD productivity tools, 3D printing, hardware electronics.

Here are the conversations to classify:
${JSON.stringify(inputData, null, 1)}

For EACH entry (by idx), return a JSON array where each object has:
- "idx": same number as input (required for matching)
- "title": the original title
- "isProject": true if this represents ongoing work with a goal and output; false if it's a quick question, lookup, or one-off that took <10 min
- "name": clean project name — noun phrase, no "How to" / "Help with" / "Can you" filler. Max 60 chars.
- "type": exactly one of: "Creative" | "Technical" | "Business" | "Life Admin" | "Future Idea"
- "energy": exactly one of: "Low" | "Medium" | "High"
- "dod": 1-sentence Definition of Done if isProject=true, else ""
- "context": 1-2 sentences describing what the project is about if isProject=true, else ""
- "suggestedNPA": a specific next physical action to start this project (verb + where + output), if isProject=true, else ""

Type guidance:
- Technical: software, code, hardware, OS, kernel, EV, motors, electronics, robotics, PCB, firmware, AI/ML
- Business: ecommerce, sales, pricing, eBay, Instagram, marketing, customers, shipping, branding
- Creative: design, writing, art, music, video, UI/UX, 3D modeling, graphic design
- Life Admin: health, finance, home, travel, legal, personal org, subscriptions
- Future Idea: research, "what if", speculative, early exploration with no clear output yet

isProject=false for: single factual questions, error messages someone just wanted fixed, quick conversions, "what does X mean", anything clearly resolved in one reply.
isProject=true if: the conversation has 3+ messages, OR involves building/designing/planning something, OR the first message describes a goal/system/project.

Return ONLY a valid JSON array. No markdown fences, no explanation, no preamble.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);
    const text = (data.content || []).map(c => c.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed2 = JSON.parse(clean);

    // Map back by idx — fallback by position if idx missing
    return parsed2.map((r, pos) => {
      const srcIdx = (r.idx !== undefined) ? r.idx : pos;
      const src = items[srcIdx] || items[pos] || items[0];
      return {
        id: uid(),
        title: r.title || src.title,
        isProject: !!r.isProject,
        name: r.name || src.title,
        type: r.type || 'Technical',
        energy: r.energy || 'Medium',
        dod: r.dod || '',
        context: r.context || '',
        suggestedNPA: r.suggestedNPA || '',
        source: src.title,
        firstMessage: src.firstMessage || '',
        date: src.date || '',
        messageCount: src.messageCount || 0,
        duplicate: existingNames.includes((r.name || src.title).toLowerCase())
      };
    });
  } catch(err) {
    console.warn('Batch analysis error:', err);
    // Graceful fallback — treat all as projects so user can decide
    return items.map(i => ({
      id: uid(), title: i.title, isProject: true, name: i.title,
      type: 'Technical', energy: 'Medium', dod: '', context: '',
      suggestedNPA: '', source: i.title,
      firstMessage: i.firstMessage || '', date: i.date || '',
      messageCount: i.messageCount || 0,
      duplicate: existingNames.includes(i.title.toLowerCase())
    }));
  }
}

function commitImport() {
  const toImport = importState.results.filter(r=>r.selected && r.isProject);
  toImport.forEach(r=>{
    addProject({
      name: r.name || r.title,
      type: r.type || 'Technical',
      state: 'Inbox',
      energy: r.energy || 'Medium',
      definitionOfDone: r.dod || '',
      context: r.context || ('Imported from ChatGPT: "' + r.source + '"'),
      nextAction: r.suggestedNPA || '',
      backlog: [],
      progressLog: r.date ? [{date: r.date, note: 'Imported from ChatGPT (original conversation: "' + r.source + '")'}] : []
    });
  });
  importState.importedCount = toImport.length;
  importState.step = 4;
  renderPage();
  renderNav();
  toast(toImport.length + ' projects added to Inbox', 'success');
}

// ============================================================
// DONE
// ============================================================
function renderDone() {
  const done = getByState('Done');
  const thisMonth = done.filter(p => p.lastWorked && p.lastWorked.slice(0,7)===todayStr().slice(0,7)).length;
  const thisYear = done.filter(p => p.lastWorked && p.lastWorked.slice(0,4)===todayStr().slice(0,4)).length;

  const listHtml = done.length===0 ?
    '<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-text">No completed projects yet. Finish something and move it to Done.</div></div>' :
    done.map(p =>
      '<div class="done-item">' +
        '<div class="done-check"><svg viewBox="0 0 24 24" fill="none" width="13" height="13"><polyline points="20,6 9,17 4,12" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<div style="flex:1;min-width:0">' +
          '<div class="done-name">' + esc(p.name) + '</div>' +
          (p.definitionOfDone ? '<div style="font-size:11px;color:var(--t3)">' + esc(p.definitionOfDone) + '</div>' : '') +
        '</div>' +
        typeBadge(p.type) +
        '<span class="done-date">' + (p.lastWorked ? fmtDateShort(p.lastWorked) : '') + '</span>' +
        '<button class="btn btn-ghost btn-xs" data-action="open-project" data-id="' + p.id + '">View</button>' +
      '</div>'
    ).join('');

  return '<div class="page-header"><div class="page-title">Done</div><div class="page-subtitle">Everything you finished. Evidence you complete things.</div></div>' +
    '<div class="done-stats">' +
      '<div class="stat-card"><div class="stat-num">' + done.length + '</div><div class="stat-label">All Time</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + thisMonth + '</div><div class="stat-label">This Month</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + thisYear + '</div><div class="stat-label">This Year</div></div>' +
    '</div>' +
    listHtml;
}

// ============================================================
// PROJECT MODAL
// ============================================================
let modalPid = null;
let modalTab = 'overview';

function openProject(pid) {
  modalPid = pid;
  modalTab = 'overview';
  renderModal();
  document.getElementById('modal-overlay').classList.add('open');
}

function openNewProject(defaultState) {
  const p = addProject({name:'New Project',state:defaultState||'Inbox'});
  openProject(p.id);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  modalPid = null;
  renderNav();
  renderPage();
}

function renderModal() {
  const p = proj(modalPid);
  if (!p) return;
  const tabs = ['overview','actions','log','ai'];
  const tabLabels = {overview:'Overview',actions:'Actions',log:'Progress',ai:'AI Log'};

  const tabHtml = tabs.map(t =>
    '<button class="modal-tab' + (modalTab===t?' active':'') + '" data-action="modal-tab" data-tab="' + t + '">' + tabLabels[t] + '</button>'
  ).join('');

  const stateOpts = ['Inbox','Active','Waiting','Parked','Done'].map(s=>'<option value="' + s + '"' + (p.state===s?' selected':'') + '>' + s + '</option>').join('');
  const typeOpts = ['Creative','Technical','Business','Life Admin','Future Idea'].map(t=>'<option value="' + t + '"' + (p.type===t?' selected':'') + '>' + t + '</option>').join('');
  const energyOpts = ['Low','Medium','High'].map(e=>'<option value="' + e + '"' + (p.energy===e?' selected':'') + '>' + e + '</option>').join('');

  let bodyHtml = '';
  if (modalTab==='overview') {
    bodyHtml =
      '<div class="input-row">' +
        '<div class="input-group"><label class="input-label">State</label><select id="m-state">' + stateOpts + '</select></div>' +
        '<div class="input-group"><label class="input-label">Type</label><select id="m-type">' + typeOpts + '</select></div>' +
      '</div>' +
      '<div class="input-group"><label class="input-label">Definition of Done — What does finished look like?</label><input class="input" id="m-dod" placeholder="One sentence. What does finished look like?" value="' + esc(p.definitionOfDone) + '"/></div>' +
      '<div class="input-row">' +
        '<div class="input-group"><label class="input-label">Deadline</label><input class="input" id="m-deadline" type="date" value="' + (p.deadline||'') + '"/></div>' +
        '<div class="input-group"><label class="input-label">Energy Needed</label><select id="m-energy">' + energyOpts + '</select></div>' +
      '</div>' +
      '<div class="input-group"><label class="input-label">Context — Why does this matter to you?</label><textarea id="m-context" rows="3" placeholder="2-3 sentences about why this project exists...">' + esc(p.context) + '</textarea></div>' +
      '<div class="input-group"><label class="input-label">Blockers / Friction</label><textarea id="m-blockers" rows="2" placeholder="What is making this hard?">' + esc(p.blockers) + '</textarea></div>' +
      (p.state==='Waiting' ?
        '<hr class="divider">' +
        '<div class="section-label">Waiting Info</div>' +
        '<div class="input-group"><label class="input-label">Waiting for what?</label><input class="input" id="m-wfor" value="' + esc(p.waitingFor) + '" placeholder="What needs to happen before you can proceed?"/></div>' +
        '<div class="input-row">' +
          '<div class="input-group"><label class="input-label">Who or what?</label><input class="input" id="m-wwho" value="' + esc(p.waitingWho) + '" placeholder="Name or system"/></div>' +
          '<div class="input-group"><label class="input-label">Check-in date</label><input class="input" id="m-checkin" type="date" value="' + (p.checkInDate||'') + '"/></div>' +
        '</div>' : '');
  } else if (modalTab==='actions') {
    const backlog = p.backlog || [];
    bodyHtml =
      '<div class="input-group"><label class="input-label" style="color:var(--accent)">Next Physical Action — specific, startable right now</label>' +
        '<textarea id="m-npa" rows="3" placeholder="Verb + location + output. Example: Open VS Code and write the hero section HTML">' + esc(p.nextAction) + '</textarea>' +
      '</div>' +
      '<hr class="divider">' +
      '<div class="section-label">Backlog (unordered)</div>' +
      '<div id="backlog-list">' +
        backlog.map((item, i) =>
          '<div class="flex-row" style="margin-bottom:7px">' +
            '<input class="input" value="' + esc(item) + '" data-action="backlog-edit" data-idx="' + i + '" style="flex:1"/>' +
            '<button class="btn btn-danger btn-xs" data-action="backlog-remove" data-idx="' + i + '">Remove</button>' +
          '</div>'
        ).join('') +
      '</div>' +
      '<div class="flex-row" style="margin-top:10px">' +
        '<input class="input" id="backlog-new" placeholder="Add backlog item..." style="flex:1"/>' +
        '<button class="btn btn-secondary" data-action="backlog-add">+ Add</button>' +
      '</div>';
  } else if (modalTab==='log') {
    const log = p.progressLog || [];
    const pn = p.pauseNote || {};
    bodyHtml =
      '<div class="section-label">Progress Log</div>' +
      '<div class="flex-row" style="margin-bottom:12px">' +
        '<input class="input" id="log-entry-inp" placeholder="What happened? Quick note..." style="flex:1"/>' +
        '<button class="btn btn-secondary" data-action="add-log-entry">+ Log</button>' +
      '</div>' +
      (log.length===0 ? '<div style="color:var(--t3);font-size:13px;margin-bottom:14px">No log entries yet.</div>' :
        '<div style="margin-bottom:14px">' + log.slice().reverse().map(e =>
          '<div class="log-entry">' +
            '<div class="log-dot"></div>' +
            '<span class="log-entry-date">' + fmtDateShort(e.date) + '</span>' +
            '<span class="log-entry-text">' + esc(e.note) + '</span>' +
          '</div>'
        ).join('') + '</div>') +
      '<hr class="divider">' +
      '<div class="section-label">Pause / Resume Note</div>' +
      '<div class="info-box" style="margin-bottom:12px">Required before moving to Parked. Future-you will thank you.</div>' +
      '<div class="input-group"><label class="input-label">Why paused</label><input class="input" id="m-p-why" value="' + esc(pn.why||'') + '" placeholder="One sentence"/></div>' +
      '<div class="input-group"><label class="input-label">State of work when paused</label><textarea id="m-p-state" rows="2" placeholder="Where exactly did you leave off?">' + esc(pn.stateWhenPaused||'') + '</textarea></div>' +
      '<div class="input-group"><label class="input-label">To resume, start here</label><textarea id="m-p-resume" rows="2" placeholder="The exact next step to pick this up...">' + esc(pn.resumeAction||'') + '</textarea></div>' +
      '<div class="input-group"><label class="input-label">Files / links needed</label><input class="input" id="m-p-files" value="' + esc(pn.files||'') + '" placeholder="List key files, links, tools..."/></div>';
  } else if (modalTab==='ai') {
    const aiLog = p.aiLog || [];
    bodyHtml =
      '<div class="flex-between" style="margin-bottom:14px"><div class="section-label" style="margin-bottom:0">AI Collaboration Log</div><button class="btn btn-secondary btn-sm" data-action="add-ai-session">+ New Session</button></div>' +
      '<div class="info-box">Log every Claude and ChatGPT session here. This keeps continuity when switching tools.</div>' +
      (aiLog.length===0 ? '<div class="empty-state" style="padding:20px"><div class="empty-text">No AI sessions logged yet. Start one above.</div></div>' :
        aiLog.slice().reverse().map((s, ri) => {
          const i = aiLog.length - 1 - ri;
          return '<div class="ai-session">' +
            '<div class="ai-session-header">' +
              '<div style="display:flex;align-items:center;gap:8px"><span class="badge badge-' + (s.tool==='Claude'?'parked':'active') + '">' + (s.tool||'Both') + '</span>' +
              '<span class="ai-session-date">' + fmtDate(s.date) + '</span></div>' +
              '<button class="btn btn-danger btn-xs" data-action="delete-ai-session" data-idx="' + i + '">Remove</button>' +
            '</div>' +
            (s.asked ? '<div class="ai-field"><div class="ai-field-label" style="color:var(--t3)">What I asked</div><div class="ai-content" style="color:var(--t2)">' + esc(s.asked) + '</div></div>' : '') +
            '<div class="ai-field"><div class="ai-field-label claude">Claude says</div><div class="ai-content">' + esc(s.claudeSays||'') + '</div></div>' +
            '<div class="ai-field"><div class="ai-field-label chatgpt">ChatGPT says</div><div class="ai-content">' + esc(s.chatgptSays||'') + '</div></div>' +
            '<div class="ai-field"><div class="ai-field-label mine">My final decision</div><div class="ai-content">' + esc(s.myDecision||'') + '</div></div>' +
          '</div>';
        }).join(''));
  }

  document.getElementById('modal-box').innerHTML =
    '<div class="modal-header">' +
      '<input class="modal-name-input" id="m-name" value="' + esc(p.name) + '" placeholder="Project name..."/>' +
      '<div class="flex-row" style="gap:8px;flex-wrap:wrap">' + stateBadge(p.state) + typeBadge(p.type) + energyBadge(p.energy) + '</div>' +
    '</div>' +
    '<div class="modal-tabs">' + tabHtml + '</div>' +
    '<div class="modal-body">' + bodyHtml + '</div>' +
    '<div class="modal-footer">' +
      '<button class="btn btn-danger btn-sm" data-action="delete-project" data-id="' + p.id + '">Delete Project</button>' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-ghost btn-sm" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-primary" data-action="save-modal">Save Changes</button>' +
      '</div>' +
    '</div>';
}

function saveModal() {
  const p = proj(modalPid);
  if (!p) return;
  const updates = {};
  const get = id => { const el = document.getElementById(id); return el ? el.value.trim() : null; };

  if (modalTab==='overview') {
    const nameEl = document.getElementById('m-name');
    if (nameEl) updates.name = nameEl.value.trim() || p.name;
    const stateEl = document.getElementById('m-state');
    if (stateEl) {
      const ns = stateEl.value;
      if (ns==='Active' && p.state!=='Active') {
        if (activeCount()>=3) { toast('3 Active max — park or finish first','error'); return; }
        if (!p.definitionOfDone && !(get('m-dod'))) { toast('Set a Definition of Done first','error'); return; }
      }
      updates.state = ns;
    }
    const typeEl = document.getElementById('m-type'); if (typeEl) updates.type = typeEl.value;
    const energyEl = document.getElementById('m-energy'); if (energyEl) updates.energy = energyEl.value;
    const dod = get('m-dod'); if (dod!==null) updates.definitionOfDone = dod;
    const dl = get('m-deadline'); if (dl!==null) updates.deadline = dl;
    const ctx = document.getElementById('m-context'); if (ctx) updates.context = ctx.value.trim();
    const blk = document.getElementById('m-blockers'); if (blk) updates.blockers = blk.value.trim();
    const wfor = get('m-wfor'); if (wfor!==null) updates.waitingFor = wfor;
    const wwho = get('m-wwho'); if (wwho!==null) updates.waitingWho = wwho;
    const ci = get('m-checkin'); if (ci!==null) updates.checkInDate = ci;
  } else if (modalTab==='actions') {
    const npaEl = document.getElementById('m-npa'); if (npaEl) updates.nextAction = npaEl.value.trim();
    const backlogEls = document.querySelectorAll('[data-action="backlog-edit"]');
    const backlog = [];
    backlogEls.forEach(el => { if (el.value.trim()) backlog.push(el.value.trim()); });
    updates.backlog = backlog;
  } else if (modalTab==='log') {
    const pn = Object.assign({}, p.pauseNote||{});
    const why = document.getElementById('m-p-why'); if(why) pn.why = why.value.trim();
    const ps = document.getElementById('m-p-state'); if(ps) pn.stateWhenPaused = ps.value.trim();
    const pr = document.getElementById('m-p-resume'); if(pr) pn.resumeAction = pr.value.trim();
    const pf = document.getElementById('m-p-files'); if(pf) pn.files = pf.value.trim();
    pn.date = pn.date || todayStr();
    updates.pauseNote = pn;
  }

  const nameEl2 = document.getElementById('m-name');
  if (nameEl2 && !updates.name) updates.name = nameEl2.value.trim() || p.name;

  updateProj(modalPid, updates);
  toast('Saved', 'success');
  renderModal();
  renderNav();
}

// ============================================================
// NEW AI SESSION FORM
// ============================================================
function openAISessionForm() {
  const p = proj(modalPid);
  if (!p) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.style.zIndex = '200';
  overlay.innerHTML =
    '<div class="modal-box" style="max-width:580px">' +
      '<div class="modal-header"><div style="font-family:\'Syne\',sans-serif;font-weight:700;font-size:18px">New AI Session</div>' +
        '<div class="flex-row" style="margin-top:8px;gap:8px">' +
          '<label class="input-label" style="margin:0">Tool:</label>' +
          '<select id="ai-tool" style="width:130px;padding:5px 8px;border-radius:7px;background:var(--bg1);border:1px solid var(--border2);color:var(--t1);font-family:\'DM Sans\',sans-serif">' +
            '<option>Claude</option><option>ChatGPT</option><option>Both</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="input-group"><label class="input-label">What I asked / Session goal</label><textarea id="ai-asked" rows="2" placeholder="What were you trying to figure out or build?"></textarea></div>' +
        '<div class="ai-field"><div class="ai-field-label claude">Claude says</div><textarea id="ai-claude" rows="3" class="input" placeholder="Key output or recommendation from Claude..."></textarea></div>' +
        '<div class="ai-field" style="margin-top:12px"><div class="ai-field-label chatgpt">ChatGPT says</div><textarea id="ai-chatgpt" rows="3" class="input" placeholder="Key output from ChatGPT (leave blank if not used)..."></textarea></div>' +
        '<div class="ai-field" style="margin-top:12px"><div class="ai-field-label mine">My final decision</div><textarea id="ai-decision" rows="2" class="input" placeholder="What you actually chose to do..."></textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button id="ai-cancel" class="btn btn-ghost">Cancel</button>' +
        '<button id="ai-save" class="btn btn-primary">Save Session</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  overlay.querySelector('#ai-cancel').onclick = () => { document.body.removeChild(overlay); };
  overlay.querySelector('#ai-save').onclick = () => {
    const session = {
      id: uid(),
      date: todayStr(),
      tool: overlay.querySelector('#ai-tool').value,
      asked: overlay.querySelector('#ai-asked').value.trim(),
      claudeSays: overlay.querySelector('#ai-claude').value.trim(),
      chatgptSays: overlay.querySelector('#ai-chatgpt').value.trim(),
      myDecision: overlay.querySelector('#ai-decision').value.trim()
    };
    const logs = (p.aiLog||[]).concat([session]);
    updateProj(modalPid, {aiLog:logs});
    document.body.removeChild(overlay);
    toast('AI session saved', 'success');
    renderModal();
  };
}

// ============================================================
// ESCAPE HELPER
// ============================================================
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// EVENTS
// ============================================================
document.body.addEventListener('click', function(e) {
  const t = e.target;

  // Nav
  const navEl = t.closest('[data-nav]');
  if (navEl) { go(navEl.dataset.nav); return; }

  // Action buttons
  const btn = t.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action==='import-reset') { importState={step:1,method:'titles',rawInput:'',parsed:[],results:[],importedCount:0,progress:0,progressMax:0}; renderPage(); return; }
  if (action==='import-method') { importState.method=btn.dataset.method; importState.rawInput=''; renderPage(); return; }
  if (action==='import-back') { importState.step=1; renderPage(); return; }

  if (action==='import-analyze') {
    const raw = document.getElementById('import-raw');
    importState.rawInput = raw ? raw.value : '';
    if (!importState.rawInput.trim()) { toast('Paste something first','error'); return; }
    runAnalysis();
    return;
  }

  if (action==='import-toggle') {
    const idx = parseInt(btn.dataset.idx);
    importState.results[idx].selected = !importState.results[idx].selected;
    renderPage(); return;
  }

  if (action==='import-select-all') {
    importState.results.forEach(r=>{ if(r.isProject) r.selected=true; });
    renderPage(); return;
  }
  if (action==='import-deselect-all') {
    importState.results.forEach(r=>{ r.selected=false; });
    renderPage(); return;
  }

  if (action==='import-type') {
    const idx = parseInt(btn.dataset.idx);
    importState.results[idx].type = btn.value;
    renderPage(); return;
  }

  if (action==='import-commit') { commitImport(); return; }

  if (action==='close-modal') { closeModal(); return; }
  if (action==='open-project') { openProject(id); return; }
  if (action==='modal-tab') { saveModal(); modalTab = btn.dataset.tab; renderModal(); return; }
  if (action==='save-modal') { saveModal(); closeModal(); return; }

  if (action==='add-inbox-btn') {
    const inp = document.getElementById('inbox-input');
    const val = inp ? inp.value.trim() : '';
    if (!val) { toast('Type something first','error'); return; }
    addProject({name:val,state:'Inbox'});
    inp.value='';
    toast('Added to Inbox','success');
    renderPage(); renderNav(); return;
  }

  if (action==='inbox-activate') {
    const p2 = proj(id);
    if (!p2) return;
    if (!p2.definitionOfDone) {
      toast('Open the project and set a Definition of Done first','error');
      openProject(id); return;
    }
    if (!moveToActive(id)) return;
    renderPage(); renderNav(); return;
  }

  if (action==='activate-from-wait') {
    if (!moveToActive(id)) return;
    renderPage(); renderNav(); return;
  }

  if (action==='inbox-park') {
    updateProj(id, {state:'Parked'});
    toast('Parked','info');
    renderPage(); renderNav(); return;
  }

  if (action==='park-project') {
    const p3 = proj(id);
    if (!p3) return;
    if (!p3.pauseNote || !p3.pauseNote.resumeAction) {
      toast('Add a Resume Note before parking','error');
      openProject(id);
      setTimeout(()=>{ modalTab='log'; renderModal(); },50);
      return;
    }
    updateProj(id, {state:'Parked'});
    toast('"' + p3.name + '" parked','info');
    renderPage(); renderNav(); return;
  }

  if (action==='wait-project') {
    updateProj(id, {state:'Waiting'});
    toast('Moved to Waiting','info');
    renderPage(); renderNav(); return;
  }

  if (action==='mark-done') {
    const p4 = proj(id);
    if (!p4) return;
    updateProj(id, {state:'Done', lastWorked:todayStr()});
    toast('"' + p4.name + '" — Done!','success');
    renderPage(); renderNav(); return;
  }

  if (action==='delete-project') {
    if (!confirm('Delete "' + (proj(id)||{name:'this project'}).name + '"? This cannot be undone.')) return;
    deleteProj(id);
    if (document.getElementById('modal-overlay').classList.contains('open')) closeModal();
    else { renderPage(); renderNav(); }
    toast('Deleted','info'); return;
  }

  if (action==='open-inbox-for-active') { go('inbox'); return; }
  if (action==='go-inbox') { if(document.getElementById('modal-overlay').classList.contains('open')) closeModal(); go('inbox'); return; }
  if (action==='go-active') { if(document.getElementById('modal-overlay').classList.contains('open')) closeModal(); go('active'); return; }
  if (action==='go-waitingparked') { go('waitingparked'); return; }

  if (action==='set-energy') {
    S.today.energy = btn.dataset.energy;
    save();
    renderPage(); return;
  }

  if (action==='set-one-thing') {
    const idx = parseInt(btn.dataset.idx);
    S.today.oneThing = S.today.oneThing===idx ? -1 : idx;
    save();
    renderPage(); return;
  }

  if (action==='eod-done') {
    S.today.endOfDay.done = btn.dataset.val;
    save();
    renderPage(); return;
  }

  if (action==='backlog-remove') {
    const p5 = proj(modalPid);
    if (!p5) return;
    const bl = (p5.backlog||[]).filter((_,i)=>String(i)!==btn.dataset.idx);
    updateProj(modalPid,{backlog:bl});
    renderModal(); return;
  }

  if (action==='backlog-add') {
    const inp = document.getElementById('backlog-new');
    if (!inp || !inp.value.trim()) return;
    const p6 = proj(modalPid);
    if (!p6) return;
    updateProj(modalPid,{backlog:(p6.backlog||[]).concat([inp.value.trim()])});
    renderModal(); return;
  }

  if (action==='add-log-entry') {
    const inp = document.getElementById('log-entry-inp');
    if (!inp || !inp.value.trim()) return;
    const p7 = proj(modalPid);
    if (!p7) return;
    const logs = (p7.progressLog||[]).concat([{date:todayStr(),note:inp.value.trim()}]);
    updateProj(modalPid,{progressLog:logs});
    renderModal(); return;
  }

  if (action==='add-ai-session') { openAISessionForm(); return; }

  if (action==='delete-ai-session') {
    const p8 = proj(modalPid);
    if (!p8) return;
    const idx = parseInt(btn.dataset.idx);
    const logs = (p8.aiLog||[]).filter((_,i)=>i!==idx);
    updateProj(modalPid,{aiLog:logs});
    renderModal(); return;
  }

  if (action==='save-reset') {
    const ns = document.getElementById('reset-northstar');
    if (ns) S.northStar = ns.value.trim();
    const entry = {
      date: todayStr(),
      wins: (document.getElementById('reset-wins')||{}).value||'',
      stuck: (document.getElementById('reset-stuck')||{}).value||'',
      captures: (document.getElementById('reset-captures')||{}).value||''
    };
    S.weeklyResets.push(entry);
    S.lastReset = todayStr();
    save();
    toast('Weekly Reset saved — great work','success');
    renderPage(); renderNav(); return;
  }
});

// Handle input events for live fields
document.body.addEventListener('input', function(e) {
  const t = e.target;
  const action = t.dataset.action;

  if (action==='import-name-edit') {
    const idx = parseInt(t.dataset.idx);
    if (importState.results[idx]) importState.results[idx].name = t.value;
    return;
  }
  if (t.id==='north-star-inp') { S.northStar=t.value; save(); renderNav(); return; }
  if (action==='task-input') {
    const idx = parseInt(t.dataset.idx);
    S.today.tasks[idx].task = t.value;
    save(); return;
  }
  if (action==='overflow-0') { S.today.overflow[0]=t.value; save(); return; }
  if (action==='overflow-1') { S.today.overflow[1]=t.value; save(); return; }
  if (action==='eod-note') { S.today.endOfDay.note=t.value; save(); return; }
  if (action==='backlog-edit') {
    const p = proj(modalPid);
    if (!p) return;
    const idx = parseInt(t.dataset.idx);
    const bl = [...(p.backlog||[])];
    bl[idx] = t.value;
    updateProj(modalPid,{backlog:bl}); return;
  }
});

document.body.addEventListener('change', function(e) {
  const t = e.target;
  const action = t.dataset.action;
  if (action==='task-proj') {
    const idx = parseInt(t.dataset.idx);
    S.today.tasks[idx].projectId = t.value;
    save(); return;
  }
  if (action==='task-time') {
    const idx = parseInt(t.dataset.idx);
    S.today.tasks[idx].estTime = t.value;
    save(); return;
  }
});

// File drag/drop for import
document.body.addEventListener('dragover', function(e) {
  if (S.page!=='import') return;
  e.preventDefault();
  const dz = document.getElementById('import-drop');
  if (dz) dz.classList.add('drag-over');
});
document.body.addEventListener('dragleave', function(e) {
  const dz = document.getElementById('import-drop');
  if (dz) dz.classList.remove('drag-over');
});
document.body.addEventListener('drop', function(e) {
  if (S.page!=='import') return;
  e.preventDefault();
  const dz = document.getElementById('import-drop');
  if (dz) dz.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) readImportFile(file);
});
document.body.addEventListener('click', function(e2) {
  if (e2.target && e2.target.id==='import-drop') {
    const fi = document.getElementById('import-file-inp');
    if (fi) fi.click();
  }
});
document.body.addEventListener('change', function(e) {
  if (e.target && e.target.id==='import-file-inp') {
    const file = e.target.files[0];
    if (file) readImportFile(file);
  }
  const t2 = e.target;
  const action2 = t2.dataset ? t2.dataset.action : '';
  if (action2==='import-type') {
    const idx = parseInt(t2.dataset.idx);
    if (importState.results[idx]) {
      importState.results[idx].type = t2.value;
      const card = document.getElementById('icard-' + idx);
      if (card) {
        const sel = card.querySelector('.type-select');
        if (sel) {
          const typeMap = {Creative:'creative',Technical:'technical',Business:'business','Life Admin':'life','Future Idea':'future'};
          sel.className = 'type-select ' + (typeMap[t2.value]||'future');
        }
      }
    }
    return;
  }
});
function readImportFile(file) {
  const reader = new FileReader();
  reader.onload = function(ev) {
    importState.rawInput = ev.target.result;
    const ta = document.getElementById('import-raw');
    if (ta) ta.value = importState.rawInput;
    toast('File loaded: ' + file.name, 'success');
  };
  reader.readAsText(file);
}

// Keyboard: Enter to add inbox item
document.body.addEventListener('keydown', function(e) {
  if (e.key==='Enter' && document.getElementById('inbox-input') && document.activeElement===document.getElementById('inbox-input')) {
    document.querySelector('[data-action="add-inbox-btn"]').click();
  }
  if (e.key==='Escape') {
    if (document.getElementById('modal-overlay').classList.contains('open')) closeModal();
  }
});

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target===this) closeModal();
});

// ============================================================
// DEFAULT DATA
// ============================================================
function defaultProjects() {
  return [
    {
      id: uid(), name: 'RubixOS v0.20 - Ring 3 Stability', type: 'Technical', state: 'Active',
      definitionOfDone: 'All 20 syscalls execute cleanly from ring-3 user processes with no kernel panic',
      deadline: '', energy: 'High',
      nextAction: 'Open src/process.rs and trace the SYSCALL handler path to find the broken ring-3 transition',
      context: 'x86_64 Rust kernel built from scratch. v0.20 milestone includes 44 source files, window manager, pipes, and a dock. Ring-3 process stability is the current blocker.',
      backlog: ['Review x86_64 crate =0.15.2 pin for potential upgrade','Add syscall 21 - file stat','Test pipe IPC under load'],
      progressLog: [{date:todayStr(),note:'v0.20 compiles clean. Window manager and dock functional. Ring-3 process transitions need stability fix.'}],
      blockers: 'SYSCALL/SYSRET handler has edge case causing kernel panic on certain user process exit paths',
      pauseNote: null, aiLog: [], waitingFor: '', waitingWho: '', checkInDate: '',
      created: todayStr(), lastWorked: todayStr()
    },
    {
      id: uid(), name: 'Tri-Image Website v34', type: 'Business', state: 'Active',
      definitionOfDone: 'v34 live on Cloudflare Pages at tri-image.com with all pages working and DNS fully propagated',
      deadline: '', energy: 'Medium',
      nextAction: 'Check Cloudflare DNS propagation status for tri-image.com and update any remaining A records',
      context: 'Business website for Tri-Image vinyl decals, 3D printing, and sublimation. Migrating from Netlify to Cloudflare Pages. Shopify integration planned.',
      backlog: ['Wire Shopify Buy Button to cart','Test Order Tracking page','Final review of Oracal 651 color swatch chart','Add Application Tips page meta tags'],
      progressLog: [{date:todayStr(),note:'Custom Orders page with 3-panel medium switcher complete. DNS migration from Netlify in progress.'}],
      blockers: 'DNS propagation may take up to 48hrs. Shopify Buy Button not yet configured.',
      pauseNote: null, aiLog: [], waitingFor: '', waitingWho: '', checkInDate: '',
      created: todayStr(), lastWorked: todayStr()
    },
    {
      id: uid(), name: 'On Day v2.2 - New Features', type: 'Technical', state: 'Inbox',
      definitionOfDone: 'v2.2 ships with at minimum 2 new ADHD-utility features and zero regressions from v2.1',
      deadline: '', energy: 'Medium',
      nextAction: 'List the top 3 v2.2 feature candidates and pick one to prototype first',
      context: 'ADHD-focused daily routine tracker. Single-file HTML, localStorage, no frameworks. v2.1 has 7 ON/OFF presets, 24-hr planner, rich-text notepad, and hidden mini-games.',
      backlog: ['Habit streak visual on calendar','Quick-capture floating button','Dark mode schedule view improvement'],
      progressLog: [], blockers: '', pauseNote: null, aiLog: [], waitingFor: '', waitingWho: '', checkInDate: '',
      created: todayStr(), lastWorked: todayStr()
    },
    {
      id: uid(), name: 'Eclipse EV-3 - Custom BMS Build', type: 'Technical', state: 'Parked',
      definitionOfDone: 'STM32-based BMS with LTC6811 cell monitoring, Coulomb counting, passive balancing, and CAN telemetry is functional on bench',
      deadline: '', energy: 'High',
      nextAction: 'Resume from hardware schematic - pick up at passive balancing resistor sizing for 96S LiFePO4 pack',
      context: '2006 Mitsubishi Eclipse GT EV conversion. Tesla Model 3 LRD + Cascadia PM100DX + 96S2P LiFePO4 EVE LF105 cells. BMS is custom STM32 build for deep learning.',
      backlog: ['Source LTC6811 evaluation board','Define CAN telemetry message structure','Model contactor sequencing logic'],
      progressLog: [{date:todayStr(),note:'ICE removed. Motor + inverter foundation planned. Parked to focus on active projects.'}],
      blockers: '',
      pauseNote: {
        date: todayStr(), why: 'Focusing on software projects this month',
        stateWhenPaused: 'Hardware planning phase - motor and inverter sourced, BMS schematic started',
        resumeAction: 'Open BMS schematic and continue passive balancing resistor sizing for 96S pack',
        files: 'Eclipse EV-3 BMS schematic v0.3, EVE LF105 datasheet', energy: 'High'
      },
      aiLog: [], waitingFor: '', waitingWho: '', checkInDate: '',
      created: todayStr(), lastWorked: todayStr()
    },
    {
      id: uid(), name: 'Bipedal Robot - Arm Control System', type: 'Technical', state: 'Inbox',
      definitionOfDone: 'Both arms have smooth, continuous motion using ESP32 + NEMA17 + TMC2209 with pre-loaded gaits at 1000Hz',
      deadline: '', energy: 'High',
      nextAction: 'Define the 3-layer nervous system architecture: ESP32 spinal cord, Orange Pi cerebellum, Claude API cortex',
      context: 'Autonomous bipedal humanoid. ESP32 + NEMA17 + TMC2209 foundation working. Orange Pi 5 Plus 32GB selected as robot brain (RK3588, dual M.2, dual 2.5G Ethernet).',
      backlog: ['Wire first arm test rig','Define gait interpolation protocol between ESP32 and Orange Pi','Test Claude API latency for real-time reasoning loop'],
      progressLog: [], blockers: 'Physical movement must be fluid and independent of AI reasoning latency', pauseNote: null, aiLog: [], waitingFor: '', waitingWho: '', checkInDate: '',
      created: todayStr(), lastWorked: todayStr()
    },
    {
      id: uid(), name: 'Card Pro - CardOS 2.0 Prototype', type: 'Creative', state: 'Parked',
      definitionOfDone: 'Interactive HTML prototype demonstrates all CardOS 2.0 core interactions on the 168x168mm form factor',
      deadline: '', energy: 'Medium',
      nextAction: 'Open CardOS 2.0 HTML prototype and resume from the app launcher animation',
      context: 'Conceptual square-screen mobile computer (168x168x6.8mm, 7.5" QD-OLED, no cellular). CardOS 2.0 OS prototyped as interactive HTML. Multiple iterations completed.',
      backlog: [], progressLog: [], blockers: '',
      pauseNote: {
        date: todayStr(), why: 'Parked to focus on active technical builds',
        stateWhenPaused: 'App launcher UI complete, working on system settings drawer',
        resumeAction: 'Open CardOS 2.0 HTML file and resume system settings drawer animation',
        files: 'cardos-2.html', energy: 'Medium'
      },
      aiLog: [], waitingFor: '', waitingWho: '', checkInDate: '',
      created: todayStr(), lastWorked: todayStr()
    }
  ];
}

// ============================================================
// INIT
// ============================================================

// ── JSON Export ──────────────────────────────────────────────
function exportData() {
  const json = DB.exportJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0,10);
  a.href     = url;
  a.download = 'project-os-backup-' + date + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup downloaded', 'success');
}

// ── JSON Import ──────────────────────────────────────────────
function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const result = DB.importJSON(e.target.result);
    if (result.ok) {
      load();                   // reload state from DB
      renderNav();
      renderPage();
      toast('Imported ' + result.count + ' projects', 'success');
    } else {
      toast('Import failed: ' + result.error, 'error');
    }
  };
  reader.readAsText(file);
}

// ── PWA Install prompt ───────────────────────────────────────
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // Show the install button if it exists
  const btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'flex';
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'none';
  toast('App installed!', 'success');
});

function triggerInstall() {
  if (!deferredInstallPrompt) {
    toast('Open in Chrome/Edge and use browser menu to install', 'info');
    return;
  }
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(() => {
    deferredInstallPrompt = null;
  });
}

// ── Wire export/import/install buttons via event delegation ──
document.body.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'export-data') { exportData(); return; }
  if (action === 'import-data-btn') {
    document.getElementById('import-file-hidden').click();
    return;
  }
  if (action === 'install-app') { triggerInstall(); return; }
}, true); // capture phase so this fires before the main handler

// ── Service Worker registration ──────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('SW registered'))
      .catch(err => console.warn('SW failed:', err));
  });
}

// ── Boot ─────────────────────────────────────────────────────
load();
renderNav();
renderPage();

