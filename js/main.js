/* ═══════════════════════════════════════════════════════
   FINCONTROL — main.js
   Full app logic: state, charts, UI, themes, data
════════════════════════════════════════════════════════ */

'use strict';

// ══════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════
const State = {
  user: null,
  theme: 'cyber',
  mode: 'dark',
  currentSection: 'dashboard',
  dashPeriod: 'month', // 'month' | 'week' | 'year'
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  anualYear: 2026,
  txIdCounter: 1,
  calIdCounter: 1,
  debtIdCounter: 1,
  budgetIdCounter: 10,
  goalIdCounter: 1,

  transactions: [],
  calEvents: [],
  debts: [],
  budget: {
    income:   [],
    fixed:    [],
    variable: []
  },
  goals: [],
  savings: [],
  savingIdCounter: 1
};

// ══════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════
const CATS = [
  { id: 'vivienda',     label: '🏠 Vivienda',          color: '#58a6ff' },
  { id: 'servicios',   label: '💡 Servicios',          color: '#ffa657' },
  { id: 'transporte',  label: '🚌 Transporte',         color: '#3fb950' },
  { id: 'alimentacion',label: '🛒 Alimentación',       color: '#f0c040' },
  { id: 'salud',       label: '🏥 Salud',              color: '#bc8cff' },
  { id: 'educacion',   label: '📚 Educación',          color: '#79c0ff' },
  { id: 'hijos',       label: '👨‍👧‍👦 Hijos',             color: '#ffa198' },
  { id: 'ocio',        label: '🎬 Ocio',               color: '#d2a8ff' },
  { id: 'ropa',        label: '👕 Ropa',               color: '#56d364' },
  { id: 'mascotas',    label: '🐾 Mascotas',           color: '#e3b341' },
  { id: 'impuestos',   label: '🏛️ Impuestos',          color: '#f85149' },
  { id: 'ahorro',      label: '🐷 Ahorro',             color: '#3fb950' },
  { id: 'deuda',       label: '💳 Pago deuda',         color: '#f85149' },
  { id: 'otros',       label: '📦 Otros',              color: '#8b949e' },
];
const getCat = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];

// ══════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════
const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');


// Parsea fecha ISO (YYYY-MM-DD) como fecha LOCAL evitando desfase de zona horaria
function parseLocalDate(iso) {
  if (!iso) return new Date(NaN);
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
// Formatea fecha ISO (YYYY-MM-DD) a formato local DD/MM/YYYY
function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}


// Evalúa expresiones matemáticas en campos de monto (ej: "1000+500*2")
function evalAmount(val) {
  if (val === '' || val === null || val === undefined) return 0;
  const str = String(val).trim()
    .replace(/,/g, '.')   // coma decimal
    .replace(/[^0-9+\-*/().% ]/g, ''); // solo caracteres seguros
  if (!str) return 0;
  // Si es un número plano, retornarlo directo
  if (/^[\d.]+$/.test(str)) return parseFloat(str) || 0;
  try {
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + str + ')')();
    return isFinite(result) && result >= 0 ? Math.round(result * 100) / 100 : 0;
  } catch { return 0; }
}

// Inicializa un input de monto para aceptar expresiones matemáticas
function initMathInput(el) {
  if (!el || el.dataset.mathInited) return;
  el.dataset.mathInited = '1';
  el.setAttribute('type', 'text');
  el.setAttribute('inputmode', 'decimal');

  // Preview mientras escribe
  el.addEventListener('input', () => {
    const raw = el.value.trim();
    const hasMath = /[+\-*/()]/.test(raw) && raw.length > 1;
    let preview = el.parentElement.querySelector('.math-preview');
    if (hasMath) {
      const res = evalAmount(raw);
      if (!preview) {
        preview = document.createElement('span');
        preview.className = 'math-preview';
        el.parentElement.appendChild(preview);
      }
      preview.textContent = '= ' + fmt(res);
    } else if (preview) {
      preview.remove();
    }
  });

  // Al salir del campo, resolver la expresión
  el.addEventListener('blur', () => {
    const preview = el.parentElement.querySelector('.math-preview');
    if (preview) preview.remove();
    const raw = el.value.trim();
    if (/[+\-*/()]/.test(raw)) {
      const res = evalAmount(raw);
      el.value = res;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Enter también resuelve
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
  });
}

// Aplica initMathInput a todos los inputs con clase .math-input
function initAllMathInputs() {
  document.querySelectorAll('.math-input').forEach(initMathInput);
}


const today = new Date();
const todayStr = today.toISOString().split('T')[0];

function getMonthTxs(year, month) {
  return State.transactions.filter(t => {
    const d = parseLocalDate(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}
function calcTotals(txs) {
  const income = txs.filter(t => t.type === 'ingreso').reduce((a, t) => a + t.amount, 0);
  const spent  = txs.filter(t => t.type === 'gasto').reduce((a, t) => a + t.amount, 0);
  return { income, spent, balance: income - spent };
}

function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), duration);
}

function destroyChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (canvas && canvas._chartInst) { canvas._chartInst.destroy(); canvas._chartInst = null; }
}

function makeChart(canvasId, config) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const inst = new Chart(canvas, config);
  canvas._chartInst = inst;
  return inst;
}

const chartDefaults = {
  plugins: { legend: { labels: { color: '#7d8590', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#7d8590', font: { size: 10 } }, grid: { color: 'rgba(128,128,128,0.08)' } },
    y: { ticks: { color: '#7d8590', font: { size: 10 }, callback: v => '$' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(128,128,128,0.08)' } }
  }
};

// ══════════════════════════════════════════════════════
// THEME & MODE
// ══════════════════════════════════════════════════════
function setTheme(theme) {
  State.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-option').forEach(el => el.classList.toggle('active', el.dataset.theme === theme));
  localStorage.setItem('fc-theme', theme);
  // refresh charts to pick up new colors
  rerenderCurrentSection();
}

function setMode(mode) {
  State.mode = mode;
  document.documentElement.setAttribute('data-mode', mode);
  document.getElementById('modeDark')?.classList.toggle('active', mode === 'dark');
  document.getElementById('modeLight')?.classList.toggle('active', mode === 'light');
  document.getElementById('modeToggle').textContent = mode === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('fc-mode', mode);
  rerenderCurrentSection();
}

function toggleMode() {
  setMode(State.mode === 'dark' ? 'light' : 'dark');
}

function openThemePanel() {
  document.getElementById('themePanel').classList.remove('hidden');
  document.getElementById('themeOverlay').classList.remove('hidden');
  // sync UI
  document.querySelectorAll('.theme-option').forEach(el => el.classList.toggle('active', el.dataset.theme === State.theme));
  document.getElementById('modeDark')?.classList.toggle('active', State.mode === 'dark');
  document.getElementById('modeLight')?.classList.toggle('active', State.mode === 'light');
}
function closeThemePanel() {
  document.getElementById('themePanel').classList.add('hidden');
  document.getElementById('themeOverlay').classList.add('hidden');
}


// ══════════════════════════════════════════════════════
// SUPABASE CONFIG — leído desde js/config.js (gitignored)
// ══════════════════════════════════════════════════════
const SUPABASE_URL  = (window.APP_CONFIG || {}).supabaseUrl    || 'TU_SUPABASE_URL';
const SUPABASE_KEY  = (window.APP_CONFIG || {}).supabaseKey    || '';
let sb = null;

function initSupabase() {
  if (typeof window.supabase === 'undefined') return null;
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return sb;
}

// ══════════════════════════════════════════════════════
// PERSISTENCE — Supabase (nube) + localStorage (offline)
// ══════════════════════════════════════════════════════
function getStateData() {
  return {
    transactions:    State.transactions,
    calEvents:       State.calEvents,
    debts:           State.debts,
    budget:          State.budget,
    goals:           State.goals,
    txIdCounter:     State.txIdCounter,
    calIdCounter:    State.calIdCounter,
    debtIdCounter:   State.debtIdCounter,
    budgetIdCounter: State.budgetIdCounter,
    goalIdCounter:   State.goalIdCounter,
    savings:         State.savings,
    savingIdCounter: State.savingIdCounter,
  };
}

function applyStateData(data) {
  if (!data) return;
  if (data.transactions)    State.transactions    = data.transactions;
  if (data.calEvents)       State.calEvents       = data.calEvents;
  if (data.debts)           State.debts           = data.debts;
  if (data.budget)          State.budget          = data.budget;
  if (data.goals)           State.goals           = data.goals;
  if (data.txIdCounter)     State.txIdCounter     = data.txIdCounter;
  if (data.calIdCounter)    State.calIdCounter    = data.calIdCounter;
  if (data.debtIdCounter)   State.debtIdCounter   = data.debtIdCounter;
  if (data.budgetIdCounter) State.budgetIdCounter = data.budgetIdCounter;
  if (data.goalIdCounter)   State.goalIdCounter   = data.goalIdCounter;
  if (data.savings)         State.savings         = data.savings;
  if (data.savingIdCounter) State.savingIdCounter = data.savingIdCounter;
}

// ── Obtiene el UUID de Supabase del usuario actual ──────────────────────────
// Primero usa el id que el onAuthStateChange ya nos pasó (sin round-trip),
// y sólo llama a getUser() como fallback.
async function getSupabaseUid() {
  // Camino rápido: el uid ya fue guardado en State.user al hacer login
  if (State.user?.supabaseId) return State.user.supabaseId;
  if (!sb) return null;
  try {
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) return null;
    // Guardarlo para futuros llamados
    if (State.user) State.user.supabaseId = user.id;
    return user.id;
  } catch { return null; }
}

async function saveState() {
  if (!State.user || State.user.provider === 'demo') return;
  const data = getStateData();

  // 1. localStorage SIEMPRE — garantiza persistencia offline ─────────────────
  try {
    localStorage.setItem('fc-data-' + State.user.email, JSON.stringify(data));
  } catch (e) { console.warn('[FC] localStorage error:', e); }

  // 2. Supabase — sólo si tenemos un uid válido ─────────────────────────────
  if (!sb) return;
  const uid = await getSupabaseUid();
  if (!uid) return; // usuario local sin sesión Supabase → localStorage fue suficiente

  try {
    const { error } = await sb
      .from('user_data')
      .upsert({ id: uid, data, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) {
      console.error('[FC] saveState error:', error.message, error.details);
      showSyncStatus('error');
    } else {
      showSyncStatus('ok');
    }
  } catch (e) { console.error('[FC] saveState excepción:', e); }
}

async function loadState() {
  if (!State.user || State.user.provider === 'demo') return;

  // 1. Supabase (fuente de verdad en la nube) ───────────────────────────────
  if (sb) {
    const uid = await getSupabaseUid();
    if (uid) {
      try {
        const { data: row, error } = await sb
          .from('user_data')
          .select('data')
          .eq('id', uid)
          .single();

        if (!error && row?.data) {
          applyStateData(row.data);
          console.debug('[FC] Datos cargados desde Supabase ✓');
          return;
        }
        if (error && error.code !== 'PGRST116') { // PGRST116 = fila no encontrada (primera vez)
          console.warn('[FC] loadState Supabase error:', error.message);
        }
      } catch (e) { console.warn('[FC] loadState excepción:', e); }
    }
  }

  // 2. localStorage (fallback offline) ─────────────────────────────────────
  try {
    const raw = localStorage.getItem('fc-data-' + State.user.email);
    if (raw) {
      applyStateData(JSON.parse(raw));
      console.debug('[FC] Datos cargados desde localStorage ✓');
    }
  } catch { /* datos corruptos — empieza en blanco */ }
}

// Indicador visual de sync en el nav (pequeño dot)
function showSyncStatus(status) {
  let dot = document.getElementById('syncDot');
  if (!dot) {
    dot = document.createElement('span');
    dot.id = 'syncDot';
    dot.title = '';
    dot.style.cssText = 'width:7px;height:7px;border-radius:50%;display:inline-block;margin-left:6px;flex-shrink:0;transition:background 0.4s';
    const dateEl = document.getElementById('navDate');
    if (dateEl) dateEl.after(dot);
  }
  if (status === 'ok') {
    dot.style.background = 'var(--clr-success)';
    dot.title = 'Datos guardados en la nube ✓';
  } else {
    dot.style.background = 'var(--clr-warn)';
    dot.title = 'Guardado solo en local (error de conexión)';
  }
}

// ══════════════════════════════════════════════════════
// AUTH CONFIG — leído desde js/config.js (gitignored)
// ══════════════════════════════════════════════════════
const GOOGLE_CLIENT_ID = (window.APP_CONFIG || {}).googleClientId || '';

// ══════════════════════════════════════════════════════
// AUTH — GOOGLE (vía Supabase OAuth)
// ══════════════════════════════════════════════════════
function initGoogleAuth() {
  // Con Supabase, el botón de Google usa supabase.auth.signInWithOAuth
  // No necesita Google Identity Services SDK
  renderGoogleButtons();
}

function renderGoogleButtons() {
  const svgLogo = `<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.826.957 4.038l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/></svg>`;
  const makeBtn = (text, fn) => `<button class="btn-google" onclick="${fn}()" style="width:100%">${svgLogo} ${text}</button>`;
  const loginEl    = document.getElementById('googleBtnLogin');
  const registerEl = document.getElementById('googleBtnRegister');
  if (loginEl)    loginEl.innerHTML    = makeBtn('Continuar con Google', 'loginWithGoogle');
  if (registerEl) registerEl.innerHTML = makeBtn('Registrarse con Google', 'loginWithGoogle');
}

async function loginWithGoogle() {
  if (!sb) {
    showAuthError('loginError', '⚠️ No se pudo conectar con Supabase. Revisá tu conexión.');
    return;
  }
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
  if (error) showAuthError('loginError', '⚠️ ' + error.message);
}

// ══════════════════════════════════════════════════════
// AUTH — EMAIL / CONTRASEÑA (Supabase)
// ══════════════════════════════════════════════════════
async function registerWithEmail() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('regPass').value;

  if (!name)                return showAuthError('registerError', '⚠️ Ingresá tu nombre.');
  if (!email.includes('@')) return showAuthError('registerError', '⚠️ Email inválido.');
  if (pass.length < 6)      return showAuthError('registerError', '⚠️ Mínimo 6 caracteres.');

  // Sin Supabase: fallback a localStorage
  if (!sb || SUPABASE_URL === 'TU_SUPABASE_URL') {
    const users = JSON.parse(localStorage.getItem('fc-users') || '{}');
    if (users[email]) return showAuthError('registerError', '⚠️ Ya existe una cuenta con ese email.');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    users[email] = { name, email, hash, createdAt: new Date().toISOString() };
    localStorage.setItem('fc-users', JSON.stringify(users));
    clearAuthErrors();
    showToast('✅ Cuenta creada. ¡Bienvenido/a!');
    return enterApp({ name, email, avatar: name.charAt(0).toUpperCase(), provider: 'local' });
  }

  const { data, error } = await sb.auth.signUp({
    email, password: pass,
    options: { data: { name } }
  });
  if (error) return showAuthError('registerError', '⚠️ ' + error.message);
  if (data.user && !data.session) {
    showAuthError('registerError', '📧 Revisá tu email para confirmar la cuenta.');
    return;
  }
  clearAuthErrors();
  showToast('✅ Cuenta creada. ¡Bienvenido/a!');
}

async function loginWithEmail() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('loginPass').value;
  if (!email || !pass) return showAuthError('loginError', '⚠️ Completá email y contraseña.');

  // Sin Supabase: fallback a localStorage
  if (!sb || SUPABASE_URL === 'TU_SUPABASE_URL') {
    const users = JSON.parse(localStorage.getItem('fc-users') || '{}');
    if (!users[email]) return showAuthError('loginError', '⚠️ No existe cuenta con ese email.');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    if (users[email].hash !== hash) return showAuthError('loginError', '⚠️ Contraseña incorrecta.');
    clearAuthErrors();
    return enterApp({ name: users[email].name, email, avatar: users[email].name.charAt(0).toUpperCase(), provider: 'local' });
  }

  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) return showAuthError('loginError', '⚠️ ' + error.message);
  clearAuthErrors();
}

// ══════════════════════════════════════════════════════
// AUTH — HELPERS
// ══════════════════════════════════════════════════════
function showAuthError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearAuthErrors() {
  ['loginError','registerError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

function enterApp(user) {
  // Evitar re-inicializar si ya estamos logueados con el mismo usuario
  // (puede ocurrir si onAuthStateChange dispara múltiples veces)
  if (State.user && State.user.email === user.email && State.user.supabaseId) return;

  State.user = user;
  if (user.provider !== 'demo') {
    // Guardar sesión sin el supabaseId (dato interno, no necesario persistir)
    const { supabaseId: _, ...sessionData } = user;
    localStorage.setItem('fc-session', JSON.stringify(sessionData));
  }

  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');

  // Avatar — foto si viene de Google, inicial si es local
  const avatarImg     = document.getElementById('avatarImg');
  const avatarInitial = document.getElementById('avatarInitial');
  if (user.picture) {
    avatarImg.src = user.picture;
    avatarImg.classList.remove('hidden');
    avatarInitial.classList.add('hidden');
  } else {
    avatarInitial.textContent = user.avatar || user.name.charAt(0).toUpperCase();
    avatarInitial.classList.remove('hidden');
    avatarImg.classList.add('hidden');
  }

  document.getElementById('userMenuName').textContent  = user.name;
  document.getElementById('userMenuEmail').textContent = user.email;
  initApp();
}

function switchAuthTab(tab) {
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab !== 'login');
  clearAuthErrors();
}

function loginDemo() {
  enterApp({ name: 'Usuario Demo', email: 'demo@fincontrol.app', avatar: 'D', provider: 'demo' });
}

async function logout() {
  if (sb) await sb.auth.signOut();
  State.user = null;
  localStorage.removeItem('fc-session');
  // Reset state
  State.transactions = []; State.calEvents = []; State.debts = [];
  State.budget = { income: [], fixed: [], variable: [] }; State.goals = [];
  document.getElementById('appShell').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('userMenu').classList.add('hidden');
  clearAuthErrors();
}

function toggleUserMenu() {
  document.getElementById('userMenu').classList.toggle('hidden');
}
// Close user menu on outside click
document.addEventListener('click', e => {
  const avatar = document.querySelector('.nav-avatar');
  if (avatar && !avatar.contains(e.target)) {
    document.getElementById('userMenu')?.classList.add('hidden');
  }
});

// ══════════════════════════════════════════════════════
// APP INIT
// ══════════════════════════════════════════════════════
async function initApp() {
  // Date in nav
  document.getElementById('navDate').textContent = today.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  // Load saved prefs
  const savedTheme = localStorage.getItem('fc-theme') || 'windows';
  const savedMode  = localStorage.getItem('fc-mode') || 'dark';
  State.theme = savedTheme; State.mode = savedMode;
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.documentElement.setAttribute('data-mode', savedMode);
  document.getElementById('modeToggle').textContent = savedMode === 'dark' ? '🌙' : '☀️';

  // Restore saved user data — esperar antes de renderizar
  await loadState();

  // Populate selects
  populateCatSelects();
  populateMonthFilter();

  // Render initial section
  showSection('dashboard');
}

// ══════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════
function showSection(id, tabEl) {
  document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const sec = document.getElementById('sec-' + id);
  if (sec) sec.classList.add('active');
  if (tabEl) tabEl.classList.add('active');
  else {
    const t = document.querySelector(`.nav-tab[data-section="${id}"]`);
    if (t) t.classList.add('active');
  }
  State.currentSection = id;
  renderSection(id);
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.add('hidden');
}

function rerenderCurrentSection() {
  renderSection(State.currentSection);
}

function renderSection(id) {
  switch (id) {
    case 'dashboard':   renderDashboard(); break;
    case 'gastos':      renderGastos(); break;
    case 'presupuesto': renderBudget(); break;
    case 'calendario':  renderCalendar(); break;
    case 'deudas':      renderDebts(); break;
    case 'ahorro':      renderSavings(); break;
    case 'anual':       renderAnual(); break;
  }
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  const open = sb.classList.toggle('open');
  ov.classList.toggle('hidden', !open);
}

// ══════════════════════════════════════════════════════
// POPULATE SELECTS
// ══════════════════════════════════════════════════════
function populateCatSelects() {
  ['txCat', 'fCat'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const hasAll = sel.options.length > 0 && sel.options[0].value === '';
    if (!hasAll && id === 'fCat') sel.insertAdjacentHTML('beforeend', '<option value="">Todas</option>');
    CATS.forEach(c => {
      if (![...sel.options].find(o => o.value === c.id)) {
        sel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.label}</option>`);
      }
    });
  });
}

function populateMonthFilter() {
  const sel = document.getElementById('fMonth');
  if (!sel || sel.options.length > 1) return;
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  months.forEach((m, i) => sel.insertAdjacentHTML('beforeend', `<option value="${i}">${m} 2026</option>`));
}

// ══════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════
function renderDashboard() {
  const txs = getDashTxs();
  const { income, spent, balance } = calcTotals(txs);
  const pct = income > 0 ? Math.round(spent / income * 100) : 0;
  const barColor = pct > 85 ? '#f85149' : pct > 65 ? '#ffa657' : '#3fb950';

  // KPIs
  const totalSaved      = (State.savings || []).reduce((a, s) => a + (s.saved || 0), 0);
  const totalSavingGoal = (State.savings || []).reduce((a, s) => a + (s.goal  || 0), 0);
  const savingPct       = totalSavingGoal > 0 ? Math.min(100, Math.round(totalSaved / totalSavingGoal * 100)) : 0;
  const nSavings        = (State.savings || []).length;

  function kpiCard(label, valueHtml, sub, barW, barBg, click) {
    return '<div class="card kpi-card"' + (click ? ' style="cursor:pointer" onclick="' + click + '"' : '') + '>' +
      '<div class="kpi-label">' + label + '</div>' +
      '<div class="kpi-value ' + valueHtml.cls + '">' + valueHtml.val + '</div>' +
      '<div class="kpi-sub">' + sub + '</div>' +
      '<div class="kpi-bar"><div class="kpi-bar-fill" style="width:' + barW + '%;background:' + barBg + '"></div></div>' +
      '</div>';
  }

  const totalDebt = State.debts.reduce((a,d) => a + d.remaining, 0);
  document.getElementById('kpiGrid').innerHTML =
    kpiCard('Ingresos del mes',    {cls:'clr-success', val: fmt(income)},  txs.filter(t=>t.type==='ingreso').length + ' transacción(es)', 100, '#3fb950') +
    kpiCard('Gastos registrados',  {cls:'clr-danger',  val: fmt(spent)},   pct + '% del ingreso', Math.min(pct,100), barColor) +
    kpiCard('Saldo disponible',    {cls: balance<0?'clr-danger':'clr-accent', val: fmt(balance)}, balance<0?'⚠️ Déficit':'Margen libre', Math.max(0,100-pct), 'var(--clr-accent)') +
    kpiCard('Ahorro total 🐷',     {cls:'clr-success', val: fmt(totalSaved)}, nSavings + ' alcancía(s) · ' + savingPct + '% de metas', savingPct, 'var(--clr-success)', "showSection('ahorro')") +
    kpiCard('Deuda total',         {cls:'clr-danger',  val: fmt(totalDebt)},  State.debts.length + ' deuda(s) activa(s)', State.debts.length?100:0, '#f85149');

  // Alerts
  let alerts = '';
  if (balance < 0) alerts += `<div class="alert alert-danger">🚨 <strong>Déficit mensual:</strong> tus gastos superan tus ingresos en ${fmt(Math.abs(balance))}.</div>`;
  else if (balance < 50000 && income > 0) alerts += `<div class="alert alert-warn">⚡ <strong>Saldo ajustado:</strong> solo quedan ${fmt(balance)} para gastos variables.</div>`;
  if (State.debts.length) alerts += '<div class="alert alert-danger">💳 <strong>Deudas activas:</strong> ' + fmt(State.debts.reduce((a,d)=>a+d.remaining,0)) + ' pendientes.</div>';
  if ((State.savings||[]).length > 0) {
    const overdue = (State.savings||[]).filter(s => s.dueDate && new Date(s.dueDate+'T00:00:00') < new Date() && s.saved < s.goal);
    if (overdue.length)
      alerts += '<div class="alert alert-danger">⏰ <strong>Alcancías vencidas:</strong> ' + overdue.map(s=>s.name).join(', ') + ' sin alcanzar la meta.</div>';
    else
      alerts += '<div class="alert alert-ok">🐷 <strong>Ahorro:</strong> ' + fmt(totalSaved) + ' ahorrados &middot; ' + savingPct + '% de metas. <span style="cursor:pointer;color:var(--clr-accent)" onclick="showSection(&quot;ahorro&quot;)">Ver &rarr;</span></div>';
  }
  if (!alerts) alerts = '<div class="alert alert-ok">✅ <strong>Todo en orden:</strong> no hay alertas críticas este mes.</div>';
  document.getElementById('dashAlerts').innerHTML = alerts;

  // Pie chart
  const gastos = txs.filter(t => t.type === 'gasto');
  const byCat = {};
  gastos.forEach(t => { byCat[t.cat] = (byCat[t.cat] || 0) + t.amount; });
  if (Object.keys(byCat).length) {
    makeChart('chartPie', {
      type: 'doughnut',
      data: {
        labels: Object.keys(byCat).map(id => getCat(id).label),
        datasets: [{ data: Object.values(byCat), backgroundColor: Object.keys(byCat).map(id => getCat(id).color), borderWidth: 2, borderColor: 'transparent' }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#7d8590', font: { size: 10 }, boxWidth: 10 } } } }
    });
  } else {
    destroyChart('chartPie');
    const c = document.getElementById('chartPie');
    if(c) { const ctx = c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); }
  }

  // Bar chart (6 months)
  const months6 = []; const inc6 = []; const exp6 = [];
  for (let i = 5; i >= 0; i--) {
    let m = State.calMonth - i; let y = State.calYear;
    if (m < 0) { m += 12; y--; }
    months6.push(new Date(y,m,1).toLocaleDateString('es-AR',{month:'short'}));
    const t = getMonthTxs(y, m);
    const tot = calcTotals(t);
    inc6.push(tot.income); exp6.push(tot.spent);
  }
  makeChart('chartBar', {
    type: 'bar',
    data: { labels: months6, datasets: [
      { label: 'Ingresos', data: inc6, backgroundColor: 'rgba(63,185,80,0.5)', borderColor: '#3fb950', borderWidth: 1, borderRadius: 4 },
      { label: 'Gastos',   data: exp6, backgroundColor: 'rgba(248,81,73,0.45)', borderColor: '#f85149', borderWidth: 1, borderRadius: 4 }
    ]},
    options: { responsive: true, maintainAspectRatio: false, ...chartDefaults }
  });

  // 50/30/20
  const needs = income * 0.5; const wants = income * 0.3; const savings = income * 0.2;
  document.getElementById('ruleGrid').innerHTML = `
    <div class="rule-block">
      <div class="rule-pct" style="color:var(--clr-accent2)">50%</div>
      <div class="rule-label">Necesidades</div>
      <div class="rule-amount">Ideal: ${fmt(needs)}</div>
      <div class="rule-actual" style="color:${spent>needs?'var(--clr-danger)':'var(--clr-success)'}">Actual: ${fmt(spent)} ${spent>needs?'⚠️':'✅'}</div>
    </div>
    <div class="rule-block">
      <div class="rule-pct" style="color:var(--clr-purple)">30%</div>
      <div class="rule-label">Deseos</div>
      <div class="rule-amount">Ideal: ${fmt(wants)}</div>
      <div class="rule-actual clr-muted">Ocio, salidas, extras</div>
    </div>
    <div class="rule-block">
      <div class="rule-pct" style="color:var(--clr-success)">20%</div>
      <div class="rule-label">Ahorro / Deuda</div>
      <div class="rule-amount">Ideal: ${fmt(savings)}</div>
      <div class="rule-actual clr-muted">Emergencias, inversión</div>
    </div>
  `;

  // Recent transactions
  const recent = [...State.transactions].sort((a,b) => parseLocalDate(b.date)-parseLocalDate(a.date)).slice(0, 8);
  renderTxRows('recentTxBody', recent);
}

function isThisMonth(dateStr) {
  const d = parseLocalDate(dateStr);
  return d.getFullYear() === State.calYear && d.getMonth() === State.calMonth;
}

function renderTxRows(tbodyId, txs) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!txs.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Sin transacciones</td></tr>'; return; }
  tbody.innerHTML = txs.map(t => {
    const c = getCat(t.cat);
    return `<tr>
      <td class="mono clr-muted" style="font-size:11px">${fmtDate(t.date)}</td>
      <td>${t.desc}${t.notes ? `<br><span style="font-size:10px;color:var(--clr-muted)">${t.notes}</span>` : ''}</td>
      <td><span class="badge" style="background:${c.color}20;color:${c.color}">${c.label}</span></td>
      <td class="mono clr-muted" style="font-size:10px">${t.freq || ''}</td>
      <td><span class="badge" style="background:${t.type==='ingreso'?'rgba(63,185,80,0.15)':'rgba(248,81,73,0.15)'};color:${t.type==='ingreso'?'var(--clr-success)':'var(--clr-danger)'}">${t.type==='ingreso'?'💰 Ingreso':'💸 Gasto'}</span></td>
      <td class="mono fw7" style="color:${t.type==='ingreso'?'var(--clr-success)':'var(--clr-danger)'}">${t.type==='ingreso'?'+':'-'}${fmt(t.amount)}</td>
      <td style="display:flex;gap:4px;justify-content:flex-end">
        <button class="btn btn-xs" style="background:rgba(88,166,255,0.15);color:var(--clr-accent);border:1px solid rgba(88,166,255,0.3)" onclick="openTxModal(${t.id})" title="Editar">✎</button>
        <button class="btn btn-danger btn-xs" onclick="deleteTx(${t.id})" title="Eliminar">✕</button>
      </td>
    </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════
// GASTOS
// ══════════════════════════════════════════════════════
function renderGastos() {
  populateCatSelects();
  const catF   = document.getElementById('fCat')?.value || '';
  const typeF  = document.getElementById('fType')?.value || '';
  const monthF = document.getElementById('fMonth')?.value;
  let txs = [...State.transactions];
  if (catF)            txs = txs.filter(t => t.cat === catF);
  if (typeF)           txs = txs.filter(t => t.type === typeF);
  if (monthF !== '' && monthF !== undefined && monthF !== null) txs = txs.filter(t => parseLocalDate(t.date).getMonth() === parseInt(monthF));
  txs.sort((a,b) => parseLocalDate(b.date) - parseLocalDate(a.date));

  const empty = document.getElementById('gastosEmpty');
  empty?.classList.toggle('hidden', txs.length > 0);
  renderTxRows('gastosBody', txs);

  // Category bars
  const monthTxs = getMonthTxs(State.calYear, State.calMonth).filter(t => t.type === 'gasto');
  const total = monthTxs.reduce((a,t) => a+t.amount, 0);
  const byCat = {};
  monthTxs.forEach(t => { byCat[t.cat] = (byCat[t.cat]||0)+t.amount; });
  const sorted = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
  document.getElementById('catBars').innerHTML = sorted.length
    ? sorted.map(([id, amt]) => {
        const pct = total > 0 ? Math.round(amt/total*100) : 0;
        const c = getCat(id);
        return `<div class="progress-row">
          <div class="progress-header">
            <span style="font-size:12px">${c.label}</span>
            <span class="mono" style="font-size:11px">${fmt(amt)} <span class="clr-muted">(${pct}%)</span></span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${c.color}"></div></div>
        </div>`;
      }).join('')
    : '<div class="empty-state">Sin gastos registrados este mes</div>';

  // Daily chart
  const daysInMonth = new Date(State.calYear, State.calMonth+1, 0).getDate();
  const byDay = Array(daysInMonth).fill(0);
  monthTxs.forEach(t => { const d = parseLocalDate(t.date).getDate() - 1; byDay[d] += t.amount; });
  makeChart('chartDaily', {
    type: 'bar',
    data: { labels: Array.from({length:daysInMonth},(_,i)=>i+1), datasets: [{ data: byDay, backgroundColor: 'rgba(240,192,64,0.5)', borderColor: '#f0c040', borderWidth: 1, borderRadius: 3 }]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#7d8590', font: { size: 9 }}, grid: { display: false }}, y: { ticks: { color: '#7d8590', font: { size: 9 }, callback: v => fmt(v) }, grid: { color: 'rgba(128,128,128,0.08)' }}}}
  });
}

function clearFilters() {
  ['fCat','fType','fMonth'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  renderGastos();
}

// ══════════════════════════════════════════════════════
// TRANSACTIONS
// ══════════════════════════════════════════════════════
function openTxModal(editId) {
  populateCatSelects();
  const overlay = document.getElementById('txOverlay');
  const title   = document.getElementById('txModalTitle');
  const editInput = document.getElementById('txEditId');
  if (editId) {
    const t = State.transactions.find(tx => tx.id === editId);
    if (!t) return;
    editInput.value = editId;
    title.textContent = 'Editar Transacción';
    document.getElementById('txType').value   = t.type;
    document.getElementById('txDate').value   = t.date;
    document.getElementById('txDesc').value   = t.desc;
    document.getElementById('txAmount').value = t.amount;
    document.getElementById('txCat').value    = t.cat;
    document.getElementById('txFreq').value   = t.freq || 'único';
    document.getElementById('txNotes').value  = t.notes || '';
  } else {
    editInput.value = '';
    title.textContent = 'Nueva Transacción';
    document.getElementById('txDate').value = todayStr;
    ['txDesc','txAmount','txNotes'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  }
  overlay.classList.remove('hidden');
}
function closeTxModal() {
  document.getElementById('txOverlay').classList.add('hidden');
  document.getElementById('txEditId').value = '';
}

function saveTx() {
  const type   = document.getElementById('txType').value;
  const date   = document.getElementById('txDate').value;
  const desc   = document.getElementById('txDesc').value.trim();
  const amount = evalAmount(document.getElementById('txAmount').value);
  const cat    = document.getElementById('txCat').value;
  const freq   = document.getElementById('txFreq').value;
  const notes  = document.getElementById('txNotes').value.trim();
  const editId = parseInt(document.getElementById('txEditId').value) || 0;
  if (!desc || !amount || !date) { showToast('⚠️ Completá fecha, descripción y monto'); return; }
  if (editId) {
    const idx = State.transactions.findIndex(t => t.id === editId);
    if (idx !== -1) State.transactions[idx] = { id: editId, type, date, desc, amount, cat, freq, notes };
    showToast('✏️ Transacción actualizada');
  } else {
    State.transactions.push({ id: State.txIdCounter++, type, date, desc, amount, cat, freq, notes });
    showToast('✅ Transacción guardada');
  }
  closeTxModal();
  saveState();
  rerenderCurrentSection();
}

function deleteTx(id) {
  State.transactions = State.transactions.filter(t => t.id !== id);
  saveState();
  rerenderCurrentSection();
  showToast('🗑️ Eliminada');
}

// ══════════════════════════════════════════════════════
// PRESUPUESTO
// ══════════════════════════════════════════════════════
function renderBudget() {
  setTimeout(initAllMathInputs, 0);
  renderBudgetSection('income', 'budgetIncome');
  renderBudgetSection('fixed', 'budgetFixed');
  renderBudgetSection('variable', 'budgetVariable');
  renderBudgetSummary();
  renderGoals();
  renderBudgetChart();
}

function renderBudgetSection(type, containerId) {
  const items = State.budget[type];
  document.getElementById(containerId).innerHTML = items.map(item => `
    <div class="budget-row">
      <input class="budget-row-name" value="${item.name}" onchange="updateBudgetName('${type}',${item.id},this.value)" placeholder="Nombre...">
      <span class="budget-row-label">Pres.</span>
      <input class="budget-input" type="number" value="${item.amount}" onchange="updateBudgetAmt('${type}',${item.id},'amount',+this.value)" min="0">
      <span class="budget-row-label">Real</span>
      <input class="budget-input" type="number" value="${item.actual}" onchange="updateBudgetAmt('${type}',${item.id},'actual',+this.value)" min="0">
      <button class="btn btn-danger btn-xs" onclick="removeBudgetRow('${type}',${item.id})">✕</button>
    </div>
  `).join('') || '<div class="empty-state" style="padding:14px">Sin ítems. Agregá uno.</div>';
}

function addBudgetRow(type) {
  const maxId = Math.max(0, ...State.budget[type].map(x => x.id));
  State.budget[type].push({ id: maxId+1, name: 'Nuevo ítem', amount: 0, actual: 0 });
  saveState();
  renderBudget();
}
function removeBudgetRow(type, id) {
  State.budget[type] = State.budget[type].filter(x => x.id !== id);
  saveState();
  renderBudget();
}
function updateBudgetName(type, id, val) {
  const item = State.budget[type].find(x => x.id === id);
  if (item) { item.name = val; saveState(); }
}
function updateBudgetAmt(type, id, field, val) {
  const item = State.budget[type].find(x => x.id === id);
  if (item) { item[field] = val; saveState(); renderBudgetSummary(); renderBudgetChart(); }
}

function renderBudgetSummary() {
  const totalInc  = State.budget.income.reduce((a,i) => a+i.amount, 0);
  const totalIncR = State.budget.income.reduce((a,i) => a+i.actual, 0);
  const totalFix  = State.budget.fixed.reduce((a,i) => a+i.amount, 0);
  const totalFixR = State.budget.fixed.reduce((a,i) => a+i.actual, 0);
  const totalVar  = State.budget.variable.reduce((a,i) => a+i.amount, 0);
  const totalVarR = State.budget.variable.reduce((a,i) => a+i.actual, 0);
  const balP = totalInc - totalFix - totalVar;
  const balR = totalIncR - totalFixR - totalVarR;

  document.getElementById('budgetSummary').innerHTML = `
    <div class="summary-row">
      <span class="summary-label">Ingresos</span>
      <span class="mono" style="color:var(--clr-success)">${fmt(totalIncR)} <span class="clr-muted">/ ${fmt(totalInc)}</span></span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Gastos Fijos</span>
      <span class="mono" style="color:var(--clr-danger)">${fmt(totalFixR)} <span class="clr-muted">/ ${fmt(totalFix)}</span></span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Variables</span>
      <span class="mono" style="color:var(--clr-warn)">${fmt(totalVarR)} <span class="clr-muted">/ ${fmt(totalVar)}</span></span>
    </div>
    <div class="summary-row">
      <span class="summary-label" style="color:var(--clr-text);font-weight:700">Saldo</span>
      <span class="mono fw7" style="color:${balR<0?'var(--clr-danger)':'var(--clr-accent)'}">${fmt(balR)} <span class="clr-muted">/ ${fmt(balP)}</span></span>
    </div>
    ${balR < 0 ? `<div class="alert alert-danger mt8">⚠️ Déficit real: ${fmt(Math.abs(balR))}</div>` : ''}
  `;
}

function renderBudgetChart() {
  const all = [...State.budget.fixed, ...State.budget.variable];
  if (!all.length) { destroyChart('chartBudget'); return; }
  makeChart('chartBudget', {
    type: 'bar',
    data: { labels: all.map(i => i.name), datasets: [
      { label: 'Presupuestado', data: all.map(i => i.amount), backgroundColor: 'rgba(88,166,255,0.4)', borderColor: '#58a6ff', borderWidth: 1, borderRadius: 4 },
      { label: 'Real', data: all.map(i => i.actual), backgroundColor: 'rgba(240,192,64,0.4)', borderColor: '#f0c040', borderWidth: 1, borderRadius: 4 },
    ]},
    options: { responsive: true, maintainAspectRatio: false, ...chartDefaults }
  });
}

function renderGoals() {
  document.getElementById('savingsGoals').innerHTML = State.goals.map(g => {
    const pct = g.target > 0 ? Math.min(100, Math.round(g.saved/g.target*100)) : 0;
    return `<div class="goal-item">
      <div class="goal-header">
        <span class="goal-name">${g.name}</span>
        <button class="btn btn-danger btn-xs" onclick="removeGoal(${g.id})">✕</button>
      </div>
      <div class="goal-amounts">
        <span class="clr-success">${fmt(g.saved)}</span>
        <span class="clr-muted">Meta: ${fmt(g.target)}</span>
        <span class="clr-accent">${pct}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:var(--clr-success)"></div></div>
      <input type="range" class="goal-slider" min="0" max="${g.target}" value="${g.saved}" oninput="updateGoalSaved(${g.id},+this.value)">
    </div>`;
  }).join('') || '<div class="empty-state">Sin objetivos definidos</div>';
}

function addGoal() {
  const name = prompt('Nombre del objetivo:');
  if (!name) return;
  const target = parseFloat(prompt('Meta ($):') || '0');
  State.goals.push({ id: State.goalIdCounter++, name, target, saved: 0 });
  saveState();
  renderGoals();
}
function removeGoal(id) { State.goals = State.goals.filter(g => g.id !== id); saveState(); renderGoals(); }
function updateGoalSaved(id, val) { const g = State.goals.find(g => g.id === id); if(g) { g.saved = val; saveState(); renderGoals(); } }
function saveBudgetFeedback(btn) { saveState(); btn.textContent = '✅ Guardado'; setTimeout(() => btn.textContent = '💾 Guardar', 2000); showToast('💾 Presupuesto guardado'); }

// ══════════════════════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════════════════════
function renderCalendar() {
  const d = new Date(State.calYear, State.calMonth, 1);
  document.getElementById('calTitle').textContent = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  const firstDay = d.getDay();
  const daysInMonth = new Date(State.calYear, State.calMonth+1, 0).getDate();
  const prevDays = new Date(State.calYear, State.calMonth, 0).getDate();
  const typeColors = { vencimiento: '#f85149', cobro: '#3fb950', recordatorio: '#58a6ff', gasto: '#f0c040' };
  let html = '';
  for (let i = firstDay-1; i >= 0; i--)
    html += `<div class="cal-day other-month"><div class="cal-day-num">${prevDays-i}</div></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${State.calYear}-${String(State.calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = today.getFullYear()===State.calYear && today.getMonth()===State.calMonth && today.getDate()===day;
    const evs = State.calEvents.filter(e => e.date === ds);
    html += `<div class="cal-day${isToday?' today':''}" onclick="showDayModal('${ds}')">
      <div class="cal-day-num">${day}</div>
      ${evs.map(e => `<div class="cal-event" style="background:${typeColors[e.type]}22;color:${typeColors[e.type]}">${e.desc}</div>`).join('')}
    </div>`;
  }
  const rem = (firstDay + daysInMonth) % 7;
  if (rem) for (let i = 1; i <= 7-rem; i++) html += `<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
  document.getElementById('calGrid').innerHTML = html;
  renderUpcoming();
  renderMonthEvents();
}

function renderUpcoming() {
  const now = new Date();
  const upcoming = State.calEvents.filter(e => {
    const diff = (parseLocalDate(e.date) - now) / (1000*60*60*24);
    return diff >= 0 && diff <= 30;
  }).sort((a,b) => parseLocalDate(a.date)-parseLocalDate(b.date)).slice(0, 6);
  const typeColors = { vencimiento: 'var(--clr-danger)', cobro: 'var(--clr-success)', recordatorio: 'var(--clr-accent2)', gasto: 'var(--clr-warn)' };
  document.getElementById('upcomingList').innerHTML = upcoming.map(e => `
    <div class="event-item">
      <div class="event-dot" style="background:${typeColors[e.type]}22;color:${typeColors[e.type]}">${parseLocalDate(e.date).getDate()}</div>
      <div class="event-info">
        <div class="event-name">${e.desc}</div>
        <div class="event-meta">${fmtDate(e.date)} ${e.amount > 0 ? '· '+fmt(e.amount) : ''}</div>
      </div>
      <button class="btn btn-danger btn-xs" onclick="deleteCalEvent(${e.id})">✕</button>
    </div>`).join('') || '<div class="empty-state">Sin eventos próximos</div>';
}

function renderMonthEvents() {
  const evs = State.calEvents.filter(e => { const d = parseLocalDate(e.date); return d.getFullYear()===State.calYear && d.getMonth()===State.calMonth; });
  const typeLabels = { vencimiento: 'Vencimiento', cobro: 'Cobro', recordatorio: 'Recordatorio', gasto: 'Gasto' };
  const typeColors = { vencimiento: 'var(--clr-danger)', cobro: 'var(--clr-success)', recordatorio: 'var(--clr-accent2)', gasto: 'var(--clr-warn)' };
  document.getElementById('monthEventsList').innerHTML = evs.sort((a,b)=>parseLocalDate(a.date)-parseLocalDate(b.date)).map(e => `
    <div class="event-item">
      <span class="badge" style="background:${typeColors[e.type]}20;color:${typeColors[e.type]};min-width:80px;text-align:center">${typeLabels[e.type]}</span>
      <div class="event-info"><div class="event-name">${e.desc}</div><div class="event-meta">${e.amount>0?fmt(e.amount):''}</div></div>
      <button class="btn btn-danger btn-xs" onclick="deleteCalEvent(${e.id})">✕</button>
    </div>`).join('') || '<div class="empty-state">Sin eventos este mes</div>';
}

function prevMonth() { State.calMonth--; if(State.calMonth<0){State.calMonth=11;State.calYear--;} renderCalendar(); }
function nextMonth() { State.calMonth++; if(State.calMonth>11){State.calMonth=0;State.calYear++;} renderCalendar(); }
function showDayModal(date) { document.getElementById('calDate').value = date; openCalModal(); }

function openCalModal() { document.getElementById('calDate').value = document.getElementById('calDate').value || todayStr; document.getElementById('calOverlay').classList.remove('hidden'); setTimeout(initAllMathInputs, 0); }
function closeCalModal() { document.getElementById('calOverlay').classList.add('hidden'); }

function saveCalEvent() {
  const date = document.getElementById('calDate').value;
  const type = document.getElementById('calType').value;
  const desc = document.getElementById('calDesc').value.trim();
  const amount = evalAmount(document.getElementById('calAmount').value);
  if (!date || !desc) { showToast('⚠️ Completá fecha y descripción'); return; }
  State.calEvents.push({ id: State.calIdCounter++, date, type, desc, amount });
  ['calDesc','calAmount'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  closeCalModal();
  saveState();
  showToast('📅 Evento agregado');
  renderCalendar();
}
function deleteCalEvent(id) { State.calEvents = State.calEvents.filter(e => e.id !== id); saveState(); renderCalendar(); }

// ══════════════════════════════════════════════════════
// DEUDAS
// ══════════════════════════════════════════════════════
function renderDebts() {
  const total = State.debts.reduce((a,d) => a+d.remaining, 0);
  const avgCuota = State.debts.length ? State.debts.reduce((a,d) => { const r=d.interest/100; const c=r>0?d.remaining*(r*Math.pow(1+r,d.cuotas))/(Math.pow(1+r,d.cuotas)-1):d.remaining/d.cuotas; return a+c; }, 0) : 0;
  document.getElementById('totalDebtVal').textContent = fmt(total);
  document.getElementById('totalCuotaVal').textContent = fmt(avgCuota);
  document.getElementById('totalDebtSub').textContent = `${State.debts.length} deuda(s) activa(s)`;

  document.getElementById('debtList').innerHTML = State.debts.map(d => {
    const paidPct = d.total > 0 ? Math.round((d.total-d.remaining)/d.total*100) : 0;
    const r = d.interest/100;
    const cuota = r > 0 ? d.remaining*(r*Math.pow(1+r,d.cuotas))/(Math.pow(1+r,d.cuotas)-1) : d.remaining/d.cuotas;
    return `<div class="debt-card">
      <div class="debt-header">
        <div>
          <div class="debt-name">${d.name}</div>
          <div class="debt-amount">${fmt(d.remaining)}</div>
          <div class="debt-detail">Venc: ${fmtDate(d.due)} · ${d.cuotas} cuotas · ${d.interest}% interés/mes</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" style="background:rgba(88,166,255,0.15);color:var(--clr-accent);border:1px solid rgba(88,166,255,0.3)" onclick="openDebtModal(${d.id})" title="Editar">✎ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deleteDebt(${d.id})">Eliminar</button>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px">
        <span class="clr-muted mono">Cuota sugerida:</span>
        <span class="mono fw7" style="color:var(--clr-warn)">${fmt(cuota)}/mes</span>
      </div>
      <div class="progress-bar" style="height:6px"><div class="progress-fill" style="width:${paidPct}%;background:var(--clr-success)"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--clr-muted);margin-top:3px;font-family:var(--font-mono)">
        <span>Pagado: ${fmt(d.total-d.remaining)}</span>
        <span>${paidPct}%</span>
        <span>Pendiente: ${fmt(d.remaining)}</span>
      </div>
      <div class="debt-pay-row">
        <input type="number" id="pay-${d.id}" placeholder="Registrar pago ($)" min="0">
        <button class="btn btn-success btn-sm" onclick="payDebt(${d.id})">Pagar</button>
      </div>
    </div>`;
  }).join('') || '<div class="card" style="text-align:center;color:var(--clr-muted);padding:40px">🎉 Sin deudas registradas</div>';

  calcPayment();
}

function openDebtModal(editId) {
  const title  = document.getElementById('debtModalTitle');
  const editInput = document.getElementById('debtEditId');
  if (editId) {
    const d = State.debts.find(x => x.id === editId);
    if (!d) return;
    editInput.value = editId;
    title.textContent = 'Editar Deuda';
    document.getElementById('debtName').value   = d.name;
    document.getElementById('debtAmount').value = d.total;
    document.getElementById('debtCuotas').value = d.cuotas;
    document.getElementById('debtInt').value    = d.interest;
    document.getElementById('debtDue').value    = d.due || todayStr;
  } else {
    editInput.value = '';
    title.textContent = 'Agregar Deuda';
    document.getElementById('debtName').value   = '';
    document.getElementById('debtAmount').value = '';
    document.getElementById('debtCuotas').value = 12;
    document.getElementById('debtInt').value    = 0;
    document.getElementById('debtDue').value    = todayStr;
  }
  document.getElementById('debtOverlay').classList.remove('hidden');
  setTimeout(initAllMathInputs, 0);
}
function closeDebtModal() { document.getElementById('debtOverlay').classList.add('hidden'); document.getElementById('debtEditId').value = ''; }

function saveDebt() {
  const name     = document.getElementById('debtName').value.trim();
  const amount   = evalAmount(document.getElementById('debtAmount').value);
  const cuotas   = parseInt(document.getElementById('debtCuotas').value) || 12;
  const interest = parseFloat(document.getElementById('debtInt').value) || 0;
  const due      = document.getElementById('debtDue').value;
  const editId   = parseInt(document.getElementById('debtEditId').value) || 0;
  if (!name || !amount) { showToast('⚠️ Completá nombre y monto'); return; }
  if (editId) {
    const idx = State.debts.findIndex(d => d.id === editId);
    if (idx !== -1) {
      const d = State.debts[idx];
      // Recalcular remaining proporcionalmente si cambia el total
      const ratio = amount > 0 ? d.remaining / d.total : 0;
      State.debts[idx] = { ...d, name, total: amount, remaining: Math.round(amount * ratio), cuotas, interest, due };
    }
    showToast('✏️ Deuda actualizada');
  } else {
    State.debts.push({ id: State.debtIdCounter++, name, total: amount, remaining: amount, cuotas, interest, due, paid: 0 });
    showToast('💳 Deuda registrada');
  }
  closeDebtModal();
  saveState();
  renderDebts();
}
function deleteDebt(id) { State.debts = State.debts.filter(d => d.id !== id); saveState(); renderDebts(); showToast('🗑️ Deuda eliminada'); }
function payDebt(id) {
  const amt = parseFloat(document.getElementById('pay-'+id)?.value) || 0;
  if (!amt) return;
  const d = State.debts.find(x => x.id === id);
  if (!d) return;
  d.remaining = Math.max(0, d.remaining - amt);
  d.paid = (d.paid || 0) + amt;
  // Registrar el pago como transacción de gasto para que impacte en saldo y gastos
  State.transactions.push({
    id:     State.txIdCounter++,
    type:   'gasto',
    date:   todayStr,
    desc:   `Pago deuda: ${d.name}`,
    amount: amt,
    cat:    'deuda',
    freq:   'único',
    notes:  'Generado automáticamente desde Gestión de Deudas'
  });
  saveState();
  renderDebts();
  showToast(`✅ Pago de ${fmt(amt)} registrado`);
}
function calcPayment() {
  const debt   = parseFloat(document.getElementById('calcDebt')?.value) || 0;
  const cuotas = parseInt(document.getElementById('calcCuotas')?.value) || 1;
  const interest = parseFloat(document.getElementById('calcInt')?.value) || 0;
  let cuota;
  if (interest === 0) { cuota = debt / cuotas; }
  else { const r = interest/100; cuota = debt*(r*Math.pow(1+r,cuotas))/(Math.pow(1+r,cuotas)-1); }
  const totalPago = cuota * cuotas;
  const el = document.getElementById('calcResult');
  if (el) el.innerHTML = `
    <div class="calc-item"><div class="calc-item-label">CUOTA MENSUAL</div><div class="calc-item-value" style="color:var(--clr-warn)">${fmt(cuota)}</div></div>
    <div class="calc-item"><div class="calc-item-label">TOTAL A PAGAR</div><div class="calc-item-value" style="color:var(--clr-danger)">${fmt(totalPago)}</div></div>
    <div class="calc-item"><div class="calc-item-label">INTERÉS TOTAL</div><div class="calc-item-value" style="color:var(--clr-accent)">${fmt(totalPago-debt)}</div></div>
  `;
}

// ══════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════
// AHORRO — ALCANCÍAS
// ══════════════════════════════════════════════════════
function renderSavings() {
  const savings = State.savings;
  const totalSaved = savings.reduce((a, s) => a + s.saved, 0);
  const totalGoal  = savings.reduce((a, s) => a + s.goal, 0);
  const globalPct  = totalGoal > 0 ? Math.round(totalSaved / totalGoal * 100) : 0;

  const el = id => document.getElementById(id);
  if (el('savingTotalSaved')) el('savingTotalSaved').textContent = fmt(totalSaved);
  if (el('savingTotalGoal'))  el('savingTotalGoal').textContent  = fmt(totalGoal);
  if (el('savingTotalPct'))   el('savingTotalPct').textContent   = globalPct + '%';
  if (el('savingTotalSub'))   el('savingTotalSub').textContent   = savings.length + ' alcancía(s) activa(s)';

  const list = el('savingList');
  if (!list) return;

  if (!savings.length) {
    list.innerHTML = '<div class="card" style="text-align:center;color:var(--clr-muted);padding:48px;font-family:var(--font-mono)">🐷 Sin alcancías. Creá una para empezar.</div>';
    return;
  }

  list.innerHTML = savings.map(s => {
    const pct        = s.goal > 0 ? Math.min(100, Math.round(s.saved / s.goal * 100)) : 0;
    const remaining  = Math.max(0, s.goal - s.saved);
    const now        = new Date();
    const dueDate    = s.dueDate ? new Date(s.dueDate + 'T00:00:00') : null;
    const daysLeft   = dueDate ? Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)) : null;
    const isOverdue  = daysLeft !== null && daysLeft < 0;
    const isNear     = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
    const barColor   = pct >= 100 ? 'var(--clr-success)' : pct >= 60 ? 'var(--clr-accent)' : pct >= 30 ? 'var(--clr-warn)' : 'var(--clr-danger)';
    const monthsLeft = daysLeft !== null && daysLeft > 0 ? Math.max(1, Math.ceil(daysLeft / 30)) : null;
    const monthlyNeeded = (monthsLeft && remaining > 0) ? fmt(Math.ceil(remaining / monthsLeft)) : null;
    const lastDeposits  = (s.deposits || []).slice(-3).reverse();

    // Build due date badge
    let dueBadge = '';
    if (dueDate) {
      const dateStr = dueDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
      const daysStr = daysLeft !== null && !isOverdue ? ' (' + daysLeft + 'd)' : '';
      const icon    = isOverdue ? '⚠️ Venció' : '📅';
      const cls     = isOverdue ? 'overdue' : isNear ? 'near' : '';
      dueBadge = '<div class="saving-due ' + cls + '">' + icon + ' ' + dateStr + '<span class="saving-days">' + daysStr + '</span></div>';
    }

    // Build deposits html
    let depositsHtml = '';
    if (lastDeposits.length) {
      const rows = lastDeposits.map(d =>
        '<div class="saving-deposit-row">' +
          '<span class="mono clr-muted" style="font-size:10px">' + d.date + '</span>' +
          '<span>' + (d.note || '—') + '</span>' +
          '<span class="clr-success mono">+' + fmt(d.amount) + '</span>' +
        '</div>'
      ).join('');
      depositsHtml = '<div class="saving-deposits"><div class="saving-deposits-title">Últimos movimientos</div>' + rows + '</div>';
    }

    const completeTag = pct >= 100 ? '<span class="saving-complete">🎉 ¡Meta alcanzada!</span>' : '';
    const monthlyTag  = monthlyNeeded ? '<span>Ahorro mensual sugerido: <strong>' + monthlyNeeded + '</strong></span>' : '';

    return '<div class="saving-card">' +
        '<div class="saving-header">' +
          '<div class="saving-header-left">' +
            '<div class="saving-name">' + s.name + '</div>' +
            (s.notes ? '<div class="saving-note">' + s.notes + '</div>' : '') +
          '</div>' +
          '<div class="saving-header-right">' + dueBadge + '</div>' +
        '</div>' +
        '<div class="saving-amounts">' +
          '<div>' +
            '<div class="saving-amount-label">AHORRADO</div>' +
            '<div class="saving-amount-value clr-success">' + fmt(s.saved) + '</div>' +
          '</div>' +
          '<div class="saving-pct-badge" style="background:' + barColor + '20;color:' + barColor + '">' + pct + '%</div>' +
          '<div style="text-align:right">' +
            '<div class="saving-amount-label">META</div>' +
            '<div class="saving-amount-value clr-accent">' + fmt(s.goal) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="saving-progress-bar"><div class="saving-progress-fill" style="width:' + pct + '%;background:' + barColor + '"></div></div>' +
        '<div class="saving-meta-row">' +
          '<span>Faltan: <strong>' + fmt(remaining) + '</strong></span>' +
          monthlyTag + completeTag +
        '</div>' +
        depositsHtml +
        '<div class="saving-actions">' +
          '<button class="btn btn-success btn-sm" onclick="openSavingDepositModal(' + s.id + ')">💰 Agregar ingreso</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="openSavingModal(' + s.id + ')">✏️ Modificar</button>' +
          '<button class="btn btn-danger btn-sm" onclick="deleteSaving(' + s.id + ')">🗑️ Eliminar</button>' +
        '</div>' +
      '</div>';
  }).join('');
}

// ── Modal crear / editar alcancía ─────────────────────────────────────────
function openSavingModal(id) {
  document.getElementById('savingEditId').value  = '';
  document.getElementById('savingName').value    = '';
  document.getElementById('savingGoal').value    = '';
  document.getElementById('savingDate').value    = '';
  document.getElementById('savingInitial').value = '0';
  document.getElementById('savingNotes').value   = '';
  document.getElementById('savingModalTitle').textContent = 'Nueva Alcancía';

  if (id) {
    const s = State.savings.find(x => x.id === id);
    if (s) {
      document.getElementById('savingEditId').value  = s.id;
      document.getElementById('savingName').value    = s.name;
      document.getElementById('savingGoal').value    = s.goal;
      document.getElementById('savingDate').value    = s.dueDate || '';
      document.getElementById('savingNotes').value   = s.notes || '';
      document.getElementById('savingModalTitle').textContent = 'Modificar Alcancía';
    }
  }
  document.getElementById('savingOverlay').classList.remove('hidden');
}

function closeSavingModal() {
  document.getElementById('savingOverlay').classList.add('hidden');
}

function saveSaving() {
  const editId  = document.getElementById('savingEditId').value;
  const name    = document.getElementById('savingName').value.trim();
  const goal    = parseFloat(document.getElementById('savingGoal').value) || 0;
  const dueDate = document.getElementById('savingDate').value;
  const notes   = document.getElementById('savingNotes').value.trim();
  const initial = parseFloat(document.getElementById('savingInitial').value) || 0;

  if (!name)     { showToast('⚠️ Ingresá un nombre'); return; }
  if (goal <= 0) { showToast('⚠️ Ingresá una meta mayor a 0'); return; }

  if (editId) {
    const s = State.savings.find(x => x.id === parseInt(editId));
    if (s) { s.name = name; s.goal = goal; s.dueDate = dueDate; s.notes = notes; }
    showToast('✅ Alcancía actualizada');
  } else {
    const todayStr = new Date().toISOString().split('T')[0];
    const deposits = initial > 0 ? [{ date: todayStr, amount: initial, note: 'Monto inicial' }] : [];
    State.savings.push({
      id:        State.savingIdCounter++,
      name, goal, dueDate, notes,
      saved:     initial,
      deposits,
      createdAt: todayStr,
    });
    showToast('🐷 Alcancía creada');
  }

  closeSavingModal();
  saveState();
  renderSavings();
}

function deleteSaving(id) {
  if (!confirm('¿Eliminar esta alcancía? Se perderán todos los datos.')) return;
  State.savings = State.savings.filter(s => s.id !== id);
  saveState();
  renderSavings();
  showToast('🗑️ Alcancía eliminada');
}

// ── Modal agregar ingreso ─────────────────────────────────────────────────
function openSavingDepositModal(id) {
  const s = State.savings.find(x => x.id === id);
  if (!s) return;
  document.getElementById('savingDepositId').value   = id;
  document.getElementById('savingDepositTitle').textContent = '💰 Agregar a: ' + s.name;
  document.getElementById('savingDepositAmt').value  = '';
  document.getElementById('savingDepositDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('savingDepositNote').value = '';
  document.getElementById('savingDepositOverlay').classList.remove('hidden');
}

function closeSavingDepositModal() {
  document.getElementById('savingDepositOverlay').classList.add('hidden');
}

function saveSavingDeposit() {
  const id   = parseInt(document.getElementById('savingDepositId').value);
  const amt  = parseFloat(document.getElementById('savingDepositAmt').value) || 0;
  const date = document.getElementById('savingDepositDate').value;
  const note = document.getElementById('savingDepositNote').value.trim();

  if (amt <= 0) { showToast('⚠️ Ingresá un monto mayor a 0'); return; }
  if (!date)    { showToast('⚠️ Seleccioná una fecha'); return; }

  const s = State.savings.find(x => x.id === id);
  if (!s) return;

  s.saved += amt;
  if (!s.deposits) s.deposits = [];
  s.deposits.push({ date, amount: amt, note });

  closeSavingDepositModal();
  saveState();
  renderSavings();
  showToast('+' + fmt(amt) + ' agregados a "' + s.name + '"');
}

// ANUAL
// ══════════════════════════════════════════════════════
function setYear(y) { State.anualYear = y; renderAnual(); }

function renderAnual() {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const yr = State.anualYear;

  // Build monthly data from real transactions
  const income   = months.map((_, m) => {
    const txs = State.transactions.filter(t => {
      const d = parseLocalDate(t.date);
      return d.getFullYear() === yr && d.getMonth() === m && t.type === 'ingreso';
    });
    return txs.reduce((a, t) => a + t.amount, 0);
  });
  const expenses = months.map((_, m) => {
    const txs = State.transactions.filter(t => {
      const d = parseLocalDate(t.date);
      return d.getFullYear() === yr && d.getMonth() === m && t.type === 'gasto';
    });
    return txs.reduce((a, t) => a + t.amount, 0);
  });

  // For months with no real data, use budget as projection baseline
  const budgetIncome  = State.budget.income.reduce((a,i) => a+i.amount, 0);
  const budgetFixed   = State.budget.fixed.reduce((a,i) => a+i.amount, 0);
  const budgetVar     = State.budget.variable.reduce((a,i) => a+i.amount, 0);
  const budgetExpense = budgetFixed + budgetVar;
  const variation     = [0.9,0.92,1,1.02,0.95,1.05,1.1,0.98,1,1.02,1.15,1.3];
  const currentMonth  = new Date().getMonth();
  const currentYear   = new Date().getFullYear();

  const incomeF  = months.map((_, m) => {
    // Use real data for past/current months of current year; budget projection for future
    if (yr < currentYear || (yr === currentYear && m <= currentMonth)) {
      return income[m] || (budgetIncome > 0 ? Math.round(budgetIncome * variation[m]) : 0);
    }
    return budgetIncome > 0 ? Math.round(budgetIncome * variation[m]) : 0;
  });
  const expenseF = months.map((_, m) => {
    if (yr < currentYear || (yr === currentYear && m <= currentMonth)) {
      return expenses[m] || (budgetExpense > 0 ? Math.round(budgetExpense * variation[m]) : 0);
    }
    return budgetExpense > 0 ? Math.round(budgetExpense * variation[m]) : 0;
  });

  const fixed    = months.map((_, m) => {
    if (yr < currentYear || (yr === currentYear && m <= currentMonth)) return expenses[m];
    return budgetFixed;
  });
  const variable = months.map((_, m) => {
    if (yr < currentYear || (yr === currentYear && m <= currentMonth)) return 0;
    return budgetVar > 0 ? Math.round(budgetVar * variation[m]) : 0;
  });
  const total   = expenseF;
  const balance = months.map((_,i) => incomeF[i] - total[i]);

  // Chart
  makeChart('chartAnual', {
    type: 'line',
    data: { labels: months, datasets: [
      { label: 'Ingresos', data: incomeF, borderColor: '#3fb950', backgroundColor: 'rgba(63,185,80,0.08)', fill: true, tension: 0.3, borderWidth: 2, pointRadius: 3 },
      { label: 'Egresos',  data: total,  borderColor: '#f85149', backgroundColor: 'rgba(248,81,73,0.08)', fill: true, tension: 0.3, borderWidth: 2, pointRadius: 3 },
      { label: 'Saldo',    data: balance, borderColor: '#f0c040', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2, borderDash: [5,4], pointRadius: 2 }
    ]},
    options: { responsive: true, maintainAspectRatio: false, ...chartDefaults }
  });

  // Table
  const rows = [
    { label: '💰 Ingresos',    data: incomeF,  cls: 'income-row' },
    { label: '🔒 Fijos',       data: fixed,    cls: 'expense-row' },
    { label: '📊 Variables',   data: variable, cls: 'expense-row' },
    { label: '📦 Total Egr.',  data: total,    cls: 'expense-row' },
    { label: '✅ Saldo',       data: balance,  cls: 'total-row' },
  ];
  document.getElementById('anualTable').innerHTML = `
    <thead><tr><th>Categoría</th>${months.map(m=>`<th>${m}</th>`).join('')}<th>TOTAL</th></tr></thead>
    <tbody>${rows.map(r=>`<tr class="${r.cls}">
      <td>${r.label}</td>
      ${r.data.map(v=>`<td>${fmt(v)}</td>`).join('')}
      <td>${fmt(r.data.reduce((a,b)=>a+b,0))}</td>
    </tr>`).join('')}</tbody>
  `;

  const annualInc  = incomeF.reduce((a,b)=>a+b,0);
  const annualExp  = total.reduce((a,b)=>a+b,0);
  const annualBal  = balance.reduce((a,b)=>a+b,0);
  document.getElementById('anualIncome').textContent  = fmt(annualInc);
  document.getElementById('anualExpense').textContent = fmt(annualExp);
  document.getElementById('anualBalance').textContent = fmt(annualBal);
}

// ══════════════════════════════════════════════════════
// CHIPS
// ══════════════════════════════════════════════════════
function setChipActive(el, group) {
  el.closest('.chip-group').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function setDashPeriod(el, period) {
  setChipActive(el, 'dash');
  State.dashPeriod = period;
  renderDashboard();
}

function getDashTxs() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  if (State.dashPeriod === 'month') {
    return State.transactions.filter(t => {
      const dt = parseLocalDate(t.date);
      return dt.getFullYear() === y && dt.getMonth() === m;
    });
  }
  if (State.dashPeriod === 'week') {
    const weekStart = new Date(y, m, d - now.getDay());
    return State.transactions.filter(t => parseLocalDate(t.date) >= weekStart);
  }
  if (State.dashPeriod === 'year') {
    return State.transactions.filter(t => parseLocalDate(t.date).getFullYear() === y);
  }
  return [];
}


// ══════════════════════════════════════════════════════
// CALCULATOR
// ══════════════════════════════════════════════════════
const Calc = { display: '0', expression: '', operator: null, operand: null, waitNext: false };

function calcUpdateUI() {
  const d = document.getElementById('calcDisplay');
  const e = document.getElementById('calcExpression');
  if (d) d.textContent = Calc.display;
  if (e) e.textContent = Calc.expression || ' ';
}

function calcAction(key) {
  if (key === 'clear') {
    Object.assign(Calc, { display: '0', expression: '', operator: null, operand: null, waitNext: false });
  } else if (key === 'sign') {
    Calc.display = String(parseFloat(Calc.display) * -1);
  } else if (key === 'percent') {
    Calc.display = String(parseFloat(Calc.display) / 100);
  } else if (['+', '-', '×', '÷'].includes(key)) {
    Calc.operand   = parseFloat(Calc.display);
    Calc.operator  = key;
    Calc.expression = Calc.display + ' ' + key;
    Calc.waitNext  = true;
  } else if (key === '=') {
    if (Calc.operator && Calc.operand !== null) {
      const b = parseFloat(Calc.display);
      let result;
      switch(Calc.operator) {
        case '+': result = Calc.operand + b; break;
        case '-': result = Calc.operand - b; break;
        case '×': result = Calc.operand * b; break;
        case '÷': result = b !== 0 ? Calc.operand / b : 'Error'; break;
      }
      Calc.expression = Calc.expression + ' ' + Calc.display + ' =';
      Calc.display    = typeof result === 'number'
        ? (Number.isInteger(result) ? String(result) : parseFloat(result.toFixed(10)).toString())
        : result;
      Calc.operator  = null;
      Calc.operand   = null;
      Calc.waitNext  = true;
    }
  } else if (key === '.') {
    if (Calc.waitNext) { Calc.display = '0.'; Calc.waitNext = false; return calcUpdateUI(); }
    if (!Calc.display.includes('.')) Calc.display += '.';
  } else {
    // digit
    if (Calc.waitNext) { Calc.display = key; Calc.waitNext = false; }
    else Calc.display = Calc.display === '0' ? key : Calc.display + key;
  }
  calcUpdateUI();
}

function calcCopyResult() {
  navigator.clipboard?.writeText(Calc.display).then(() => showToast('📋 ' + Calc.display + ' copiado'));
}

function toggleCalc() {
  const panel = document.getElementById('calcPanel');
  const isHidden = panel.classList.toggle('hidden');
  // Focus the panel so keyboard events are captured, or remove listener
  if (!isHidden) {
    panel.setAttribute('tabindex', '-1');
    panel.focus();
  }
}

// Keyboard support for calculator
document.addEventListener('keydown', function(e) {
  const panel = document.getElementById('calcPanel');
  if (!panel || panel.classList.contains('hidden')) return;
  // Don't intercept if user is typing in an input/textarea elsewhere
  if (document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && document.activeElement.closest('#calcPanel') === null) return;

  const keyMap = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    'Numpad0': '0', 'Numpad1': '1', 'Numpad2': '2', 'Numpad3': '3', 'Numpad4': '4',
    'Numpad5': '5', 'Numpad6': '6', 'Numpad7': '7', 'Numpad8': '8', 'Numpad9': '9',
    'NumpadAdd': '+', 'NumpadSubtract': '-', 'NumpadMultiply': '×', 'NumpadDivide': '÷',
    'NumpadDecimal': '.', 'NumpadEnter': '=',
    '+': '+', '-': '-', '*': '×', '/': '÷', '.': '.', ',': '.',
    'Enter': '=', '=': '=',
    'Backspace': 'backspace',
    'Escape': 'clear', 'Delete': 'clear',
    '%': 'percent',
  };

  const action = keyMap[e.code] || keyMap[e.key];
  if (!action) return;

  e.preventDefault();

  if (action === 'backspace') {
    Calc.display = Calc.display.length > 1 ? Calc.display.slice(0, -1) : '0';
    calcUpdateUI();
  } else {
    calcAction(action);
  }

  // Brief visual flash on the corresponding button
  const btnMap = { '×': '×', '÷': '÷', '+': '+', '-': '−', '=': '=' };
  const label = btnMap[action] || action;
  document.querySelectorAll('#calcPanel .calc-btn').forEach(btn => {
    if (btn.textContent.trim() === String(label)) {
      btn.style.filter = 'brightness(1.5)';
      setTimeout(() => btn.style.filter = '', 120);
    }
  });
});


// ══════════════════════════════════════════════════════
// ADS — Google AdSense
// ══════════════════════════════════════════════════════
function initAds() {
  try {
    // Push cada slot para que AdSense los renderice
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch(e) { /* AdSense no disponible */ }
}

// ══════════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════════
function exportData() {
  const data = JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions:    State.transactions,
    budget:          State.budget,
    debts:           State.debts,
    goals:           State.goals,
    calEvents:       State.calEvents,
    txIdCounter:     State.txIdCounter,
    calIdCounter:    State.calIdCounter,
    debtIdCounter:   State.debtIdCounter,
    budgetIdCounter: State.budgetIdCounter,
    goalIdCounter:   State.goalIdCounter,
  }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'fincontrol-data.json'; a.click();
  URL.revokeObjectURL(url);
  showToast('📤 Datos exportados');
  document.getElementById('userMenu').classList.add('hidden');
}

function importData() {
  document.getElementById('userMenu').classList.add('hidden');
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validación mínima
      if (!data || typeof data !== 'object') throw new Error('Archivo inválido');
      const hasData = data.transactions || data.budget || data.debts || data.goals || data.calEvents;
      if (!hasData) throw new Error('El archivo no contiene datos de FinControl');

      const confirmed = confirm(
        `¿Importar datos de "${file.name}"?\n\nEsto REEMPLAZARÁ todos tus datos actuales. Esta acción no se puede deshacer.`
      );
      if (!confirmed) return;

      applyStateData(data);

      // Restaurar contadores si vienen en el archivo, si no recalcular
      if (!data.txIdCounter && data.transactions?.length)
        State.txIdCounter = Math.max(...data.transactions.map(t => t.id || 0)) + 1;
      if (!data.calIdCounter && data.calEvents?.length)
        State.calIdCounter = Math.max(...data.calEvents.map(e => e.id || 0)) + 1;
      if (!data.debtIdCounter && data.debts?.length)
        State.debtIdCounter = Math.max(...data.debts.map(d => d.id || 0)) + 1;

      await saveState();
      rerenderCurrentSection();
      showToast('📥 Datos importados correctamente');
    } catch (err) {
      showToast('❌ Error al importar: ' + err.message);
    }
  };
  input.click();
}

// ══════════════════════════════════════════════════════
// STARTUP
// ══════════════════════════════════════════════════════
// Apply saved theme before load
(function() {
  const t = localStorage.getItem('fc-theme') || 'windows';
  const m = localStorage.getItem('fc-mode')  || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.setAttribute('data-mode', m);
})();

// Startup: init Supabase, listen for auth state changes
window.addEventListener('load', async () => {
  initSupabase();
  renderGoogleButtons();
  initAds();

  if (sb && SUPABASE_URL !== 'TU_SUPABASE_URL') {
    // Escuchar cambios de sesión de Supabase (login, logout, OAuth redirect)
    sb.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const u = session.user;
        const name = u.user_metadata?.name || u.email.split('@')[0];
        // Pasamos supabaseId directamente desde el objeto session
        // → evita la race condition de llamar getUser() justo después del login
        enterApp({
          name,
          email:      u.email,
          picture:    u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
          avatar:     name.charAt(0).toUpperCase(),
          provider:   u.app_metadata?.provider || 'supabase',
          supabaseId: u.id,   // ← clave del fix: uid disponible SIN llamar getUser()
        });
      } else if (event === 'SIGNED_OUT') {
        // ya manejado en logout()
      }
    });

    // Verificar si ya hay sesión activa (ej: recarga de página con cookie válida)
    // IMPORTANTE: llamar enterApp() directamente en vez de esperar onAuthStateChange,
    // que puede no disparar a tiempo en recargas de página.
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      const u = session.user;
      const name = u.user_metadata?.name || u.email.split('@')[0];
      enterApp({
        name,
        email:      u.email,
        picture:    u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
        avatar:     name.charAt(0).toUpperCase(),
        provider:   u.app_metadata?.provider || 'supabase',
        supabaseId: u.id,
      });
      return;
    }
  }

  // Fallback: restaurar sesión de localStorage (usuarios locales o sin Supabase)
  const saved = localStorage.getItem('fc-session');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      if (user && user.provider !== 'demo') { enterApp(user); return; }
    } catch { /* ignorar */ }
  }
});