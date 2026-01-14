/*
  AUTH + PER-USER STORAGE
  - Users stored in localStorage under key "HB_USERS"
  - Current user email under "HB_CURRENT_USER"
  - Habits stored under "HABIT_DATA_V2_<email>"
*/

const USERS_KEY = 'HB_USERS';
const CURRENT_USER_KEY = 'HB_CURRENT_USER';

function loadUsers(){
  try{
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }catch(e){return [];}
}
function saveUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function setCurrentUser(email){
  if(email){ localStorage.setItem(CURRENT_USER_KEY, email); }
  else { localStorage.removeItem(CURRENT_USER_KEY); }
}
function getCurrentUserEmail(){
  return localStorage.getItem(CURRENT_USER_KEY);
}

// Simple auth helpers
function findUserByEmail(email){
  return loadUsers().find(u => u.email === email);
}
function createUser(name,email,password){
  const users = loadUsers();
  if(users.some(u => u.email === email)) return false;
  users.push({name,email,password});
  saveUsers(users);
  return true;
}
function validateLogin(email,password){
  const u = findUserByEmail(email);
  if(!u) return {ok:false, reason:'No account with that email'};
  if(u.password !== password) return {ok:false, reason:'Incorrect password'};
  return {ok:true, user:u};
}

/* ---------- TOAST & UTILS ---------- */
const el = id => document.getElementById(id);
const toastEl = el('toast');
let toastTimer = null;
function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toastEl.classList.remove('show'), 2500);
}

const todayISO = () => new Date().toISOString().slice(0,10);
const pad = n => String(n).padStart(2,'0');
const formatDate = iso => {
  if(!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
};
const formatTime = t => t ? t : '';
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* ---------- NOTIFICATION SOUND ---------- */
const ping = el('ping');
function playSound(){
  try { ping.currentTime = 0; ping.play().catch(()=>{}); } catch(e){}
}

/* ---------- BANNERS ---------- */
const BANNERS = {
  fitness: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect rx="10" width="100%" height="100%" fill="#ffe3d9"/><g transform="translate(20,20)"><circle cx="60" cy="40" r="30" fill="#ffd66b" /><rect x="90" y="20" width="80" height="40" rx="10" fill="#ff9ad5"/><text x="12" y="120" fill="#042" font-size="16" font-weight="700">Get moving</text></g></svg>`,
  reading: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect rx="10" width="100%" height="100%" fill="#fff7d6"/><g transform="translate(18,18)"><rect x="16" y="18" width="90" height="60" rx="6" fill="#fff1c9"/><path d="M120 30 h90 v50 h-90z" fill="#ffd66b"/><text x="12" y="120" fill="#042" font-size="16" font-weight="700">Read a chapter</text></g></svg>`,
  water: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect rx="10" width="100%" height="100%" fill="#e9fbff"/><g transform="translate(14,18)"><path d="M80 10c20 20 40 60 0 100c-40-40-20-80 0-100z" fill="#7ce7e3"/><text x="12" y="130" fill="#042" font-size="16" font-weight="700">Hydrate</text></g></svg>`,
  sleep: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect rx="10" width="100%" height="100%" fill="#fff4e8"/><g transform="translate(14,18)"><path d="M120 40 a40 40 0 1 0 -80 0 40 40 0 1 0 80 0" fill="#ffd66b"/><text x="12" y="130" fill="#042" font-size="16" font-weight="700">Better sleep</text></g></svg>`,
  custom: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect rx="10" width="100%" height="100%" fill="#f0f0ff"/><g transform="translate(14,18)"><circle cx="60" cy="50" r="28" fill="#e6e6f2"/><text x="12" y="130" fill="#042" font-size="16" font-weight="700">Custom</text></g></svg>`
};

/* ---------- STATE PER USER ---------- */
let state = {habits:[]};
let STORAGE_KEY = 'HABIT_DATA_V2';

function loadState(){
  const email = getCurrentUserEmail();
  STORAGE_KEY = 'HABIT_DATA_V2_' + (email || 'guest');
  try{
    state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"habits":[]}');
    state.habits = state.habits || [];
  }catch(e){
    state = {habits:[]};
  }
}
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateStats();
}

/* ---------- UI REFERENCES (APP) ---------- */
const cardsWrap = el('cards');
const upcomingEl = el('upcoming');
const statsEl = el('stats');
const todayLabel = el('todayLabel');
const nowClock = el('nowClock');
const formArea = el('formArea');
const openForm = el('openForm');
const saveBtn = el('saveBtn');
const cancelBtn = el('cancelBtn');
const exportBtn = el('exportBtn');
const clearBtn = el('clearBtn');
const searchInput = el('search');
const logoutBtn = el('logoutBtn');
const welcomeText = el('welcomeText');

/* ---------- RENDERING ---------- */
function render(){
  const q = searchInput.value.trim().toLowerCase();
  const list = state.habits.filter(h=> !q || h.title.toLowerCase().includes(q));
  let html = '';
  for(const h of list){
    const banner = BANNERS[h.type] || BANNERS.custom;
    const doneCount = (h.history && Object.values(h.history).filter(Boolean).length) || 0;
    const pct = Math.min(100, Math.round((doneCount / Math.max(1,h.goalDays || 7)) * 100));
    html += `
      <article class="card" data-id="${h.id}">
        <div class="card-banner">
          <div class="art" aria-hidden="true">${banner}</div>
          <div style="flex:1;display:flex;gap:8px;align-items:flex-start">
            <div style="display:flex;flex-direction:column;gap:6px">
              <div class="title">${escapeHtml(h.title)}</div>
              <div class="meta">${h.date ? formatDate(h.date) : ''} ${h.time ? ' • ' + h.time : ''}</div>
            </div>
            <button class="big-action" data-action="toggle">${h.toggledToday ? '✓ Done' : 'Mark'}</button>
          </div>
        </div>
        <div class="progress-wrap">
          <div class="progress-bg"><div class="progress" style="width:${pct}%"></div></div>
        </div>
        <div style="padding:8px 14px 14px;display:flex;justify-content:space-between;align-items:center">
          <div class="small-muted">streak: ${h.streak || 0} • done: ${doneCount}</div>
          <div style="display:flex;gap:8px">
            <button class="btn" data-action="edit">Edit</button>
            <button class="btn" data-action="delete" style="background:transparent;border:1px solid rgba(255,255,255,0.04);color:var(--muted)">Del</button>
          </div>
        </div>
      </article>
    `;
  }
  cardsWrap.innerHTML = html;
  renderUpcoming();
  updateStats();
}

cardsWrap.addEventListener('click', (ev)=>{
  const card = ev.target.closest('.card');
  if(!card) return;
  const id = card.dataset.id;
  const action = ev.target.dataset.action;
  if(action === 'toggle'){
    toggleHabitToday(id);
  } else if(action === 'edit'){
    openEdit(id);
  } else if(action === 'delete'){
    if(confirm('Delete habit?')) { deleteHabit(id); }
  }
});

function renderUpcoming(){
  upcomingEl.innerHTML = '';
  const upcoming = state.habits
    .filter(h => h.date && h.time)
    .map(h => {
      const when = new Date(h.date + 'T' + (h.time || '00:00'));
      return { id: h.id, title: h.title, when };
    })
    .sort((a,b)=> a.when - b.when)
    .slice(0,12);

  if(upcoming.length === 0){
    upcomingEl.innerHTML = `<div class="small-muted">No scheduled reminders</div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  for(const u of upcoming){
    const r = document.createElement('div');
    r.className = 'rem-item';
    const left = document.createElement('div');
    left.innerHTML = `<div style="font-weight:700">${escapeHtml(u.title)}</div><div class="small-muted">${u.when.toLocaleDateString()}</div>`;
    const right = document.createElement('div');
    right.innerHTML = `<div class="rem-time">${pad(u.when.getHours())}:${pad(u.when.getMinutes())}</div>`;
    r.appendChild(left); r.appendChild(right);
    frag.appendChild(r);
  }
  upcomingEl.appendChild(frag);
}

function updateStats(){
  statsEl.textContent = `${state.habits.length} habits • ${state.habits.filter(h=>h.date && h.time).length} upcoming`;
  const now = new Date();
  todayLabel.textContent = now.toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' });
  nowClock.textContent = now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

/* ---------- CRUD ---------- */
function addHabit({title,type,date,time}){
  const id = 'h_'+Math.random().toString(36).slice(2,9);
  state.habits.push({ id, title, type, date, time, createdAt: new Date().toISOString(), history:{}, streak:0, lastNotifiedOn:null });
  save();
  render();
  toast('Habit added');
}

function openEdit(id){
  const h = state.habits.find(x=>x.id===id); if(!h) return;
  formArea.style.display = 'block';
  el('hTitle').value = h.title;
  el('hType').value = h.type;
  el('hDate').value = h.date || '';
  el('hTime').value = h.time || '';
  saveBtn.dataset.edit = id;
  window.scrollTo({top:0,behavior:'smooth'});
}

function deleteHabit(id){
  state.habits = state.habits.filter(x=>x.id!==id);
  save(); render(); toast('Deleted');
}

function toggleHabitToday(id){
  const h = state.habits.find(x=>x.id===id); if(!h) return;
  const iso = todayISO();
  h.history = h.history || {};
  if(h.history[iso]) {
    delete h.history[iso];
    h.toggledToday = false;
    toast('Unchecked');
  } else {
    h.history[iso] = true;
    h.toggledToday = true;
    h.streak = computeStreak(h);
    playSound();
    if("Notification" in window && Notification.permission === "granted"){
      new Notification('Habit completed 🎉', { body: h.title });
    }
    toast('Nice! Habit checked');
  }
  save(); render();
}

function computeStreak(h){
  const days = Object.keys(h.history || {}).filter(k=>h.history[k]).sort();
  let current = 0;
  let cursor = new Date();
  while(true){
    const iso = cursor.toISOString().slice(0,10);
    if(h.history && h.history[iso]){ current++; cursor.setDate(cursor.getDate()-1); }
    else break;
  }
  return current;
}

/* ---------- FORM HANDLERS ---------- */
openForm.addEventListener('click', ()=>{
  formArea.style.display = formArea.style.display === 'block' ? 'none' : 'block';
  if("Notification" in window && Notification.permission === "default"){
    Notification.requestPermission().catch(()=>{});
  }
});

cancelBtn.addEventListener('click', ()=>{ formArea.style.display='none'; delete saveBtn.dataset.edit; });

saveBtn.addEventListener('click', ()=>{
  const title = el('hTitle').value.trim();
  const type = el('hType').value;
  const date = el('hDate').value || null;
  const time = el('hTime').value || null;
  if(!title){ toast('Please enter a title'); return; }
  const editing = saveBtn.dataset.edit;
  if(editing){
    const h = state.habits.find(x=>x.id===editing);
    if(h){ h.title = title; h.type = type; h.date = date; h.time = time; }
    delete saveBtn.dataset.edit;
    toast('Updated');
  } else {
    addHabit({title,type,date,time});
  }
  el('hTitle').value=''; el('hDate').value=''; el('hTime').value='';
  formArea.style.display = 'none';
  save(); render();
});

/* ---------- EXPORT / CLEAR ---------- */
exportBtn.addEventListener('click', ()=>{
  const dataStr = "data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(state,null,2));
  const a = document.createElement('a'); a.href = dataStr; a.download = 'habit_export_' + todayISO() + '.json'; a.click();
});
clearBtn.addEventListener('click', ()=>{
  if(!confirm('Clear all habits?')) return;
  state.habits = [];
  save(); render();
});

/* ---------- SEARCH ---------- */
searchInput.addEventListener('input', ()=> render());

/* ---------- REMINDERS ---------- */
function checkReminders(){
  const now = new Date();
  const nowIsoDate = now.toISOString().slice(0,10);
  const hhmm = pad(now.getHours())+':'+pad(now.getMinutes());
  for(const h of state.habits){
    if(!h.date || !h.time) continue;
    if(h.date === nowIsoDate && h.time === hhmm && h.lastNotifiedOn !== nowIsoDate){
      playSound();
      if("Notification" in window && Notification.permission === "granted"){
        new Notification('Reminder: ' + h.title, { body: `Scheduled at ${h.time} on ${formatDate(h.date)}` });
      }
      toast(`Reminder: ${h.title} — ${h.time}`);
      h.lastNotifiedOn = nowIsoDate;
      save();
    }
  }
}
setInterval(checkReminders, 15000);
setInterval(()=> updateStats(), 1000);

/* ---------- AUTH UI LOGIC ---------- */
const authView = el('authView');
const appView = el('appView');
const tabLogin = el('tabLogin');
const tabSignup = el('tabSignup');
const loginForm = el('loginForm');
const signupForm = el('signupForm');
const loginBtn = el('loginBtn');
const signupBtn = el('signupBtn');
const loginEmail = el('loginEmail');
const loginPassword = el('loginPassword');
const signupName = el('signupName');
const signupEmail = el('signupEmail');
const signupPassword = el('signupPassword');
const loginError = el('loginError');
const signupError = el('signupError');

tabLogin.addEventListener('click', ()=>{
  tabLogin.classList.add('active');
  tabSignup.classList.remove('active');
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');
  loginError.textContent='';
});
tabSignup.addEventListener('click', ()=>{
  tabSignup.classList.add('active');
  tabLogin.classList.remove('active');
  signupForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  signupError.textContent='';
});

signupBtn.addEventListener('click', ()=>{
  const name = signupName.value.trim();
  const email = signupEmail.value.trim().toLowerCase();
  const pass = signupPassword.value;
  if(!name || !email || !pass){
    signupError.textContent = 'Please fill in all fields';
    return;
  }
  if(!email.includes('@')){
    signupError.textContent = 'Enter a valid email';
    return;
  }
  const ok = createUser(name,email,pass);
  if(!ok){
    signupError.textContent = 'An account with that email already exists';
    return;
  }
  signupError.textContent = '';
  toast('Account created. You can log in now.');
  tabLogin.click();
  loginEmail.value = email;
});

loginBtn.addEventListener('click', ()=>{
  const email = loginEmail.value.trim().toLowerCase();
  const pass = loginPassword.value;
  if(!email || !pass){
    loginError.textContent = 'Enter email and password';
    return;
  }
  const res = validateLogin(email,pass);
  if(!res.ok){
    loginError.textContent = res.reason;
    return;
  }
  loginError.textContent = '';
  setCurrentUser(email);
  startAppForUser(res.user);
});

logoutBtn.addEventListener('click', ()=>{
  setCurrentUser(null);
  appView.classList.add('hidden');
  authView.classList.remove('hidden');
  toast('Logged out');
});

/* ---------- START APP FOR LOGGED USER ---------- */
function startAppForUser(user){
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  welcomeText.textContent = `Hi ${user.name}, your illustrated habits and reminders are ready.`;
  loadState();
  if(state.habits.length === 0){
    state.habits.push({
      id: 'sample1', title: 'Morning run', type:'fitness',
      date: todayISO(),
      time: (() => { const d = new Date(); d.setMinutes(d.getMinutes() + 1); return pad(d.getHours()) + ':' + pad(d.getMinutes()); })(),
      createdAt: new Date().toISOString(), history:{}, streak:0, lastNotifiedOn:null
    });
    state.habits.push({
      id: 'sample2', title: 'Read 20 pages', type:'reading',
      date: null, time: null, createdAt: new Date().toISOString(), history:{}, streak:0, lastNotifiedOn:null
    });
    save();
  }
  render();
}

/* ---------- AUTO LOGIN IF SESSION EXISTS ---------- */
(function init(){
  const email = getCurrentUserEmail();
  if(email){
    const u = findUserByEmail(email);
    if(u){
      startAppForUser(u);
    }
  }
})();

/* Unlock audio on first click */
document.addEventListener('click', function unlockAudio(){
  playSound();
  document.removeEventListener('click', unlockAudio);
});