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
  goals: []
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
const today = new Date();
const todayStr = today.toISOString().split('T')[0];

function getMonthTxs(year, month) {
  return State.transactions.filter(t => {
    const d = new Date(t.date);
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
// AUTH
// ══════════════════════════════════════════════════════
function switchAuthTab(tab) {
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab !== 'login');
}

function loginWithGoogle() {
  showToast('🔧 Google Auth próximamente disponible', 3000);
}

function loginDemo() {
  State.user = { name: 'Usuario Demo', email: 'demo@fincontrol.app', avatar: 'D' };
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
  document.getElementById('avatarInitial').textContent = 'D';
  document.getElementById('userMenuName').textContent = State.user.name;
  document.getElementById('userMenuEmail').textContent = State.user.email;
  initApp();
}

function logout() {
  State.user = null;
  document.getElementById('appShell').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('userMenu').classList.add('hidden');
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
function initApp() {
  // Date in nav
  document.getElementById('navDate').textContent = today.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  // Load saved prefs
  const savedTheme = localStorage.getItem('fc-theme') || 'cyber';
  const savedMode  = localStorage.getItem('fc-mode') || 'dark';
  State.theme = savedTheme; State.mode = savedMode;
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.documentElement.setAttribute('data-mode', savedMode);
  document.getElementById('modeToggle').textContent = savedMode === 'dark' ? '🌙' : '☀️';

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
  const txs = getMonthTxs(State.calYear, State.calMonth);
  const { income, spent, balance } = calcTotals(txs);
  const pct = income > 0 ? Math.round(spent / income * 100) : 0;
  const barColor = pct > 85 ? '#f85149' : pct > 65 ? '#ffa657' : '#3fb950';

  // KPIs
  document.getElementById('kpiGrid').innerHTML = `
    <div class="card kpi-card">
      <div class="kpi-label">Ingresos del mes</div>
      <div class="kpi-value clr-success">${fmt(income)}</div>
      <div class="kpi-sub">${State.transactions.filter(t=>t.type==='ingreso'&&isThisMonth(t.date)).length} transacción(es)</div>
      <div class="kpi-bar"><div class="kpi-bar-fill" style="width:100%;background:#3fb950"></div></div>
    </div>
    <div class="card kpi-card">
      <div class="kpi-label">Gastos registrados</div>
      <div class="kpi-value clr-danger">${fmt(spent)}</div>
      <div class="kpi-sub">${pct}% del ingreso</div>
      <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${Math.min(pct,100)}%;background:${barColor}"></div></div>
    </div>
    <div class="card kpi-card">
      <div class="kpi-label">Saldo disponible</div>
      <div class="kpi-value ${balance < 0 ? 'clr-danger' : 'clr-accent'}">${fmt(balance)}</div>
      <div class="kpi-sub">${balance < 0 ? '⚠️ Déficit' : 'Margen libre'}</div>
      <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${Math.max(0,100-pct)}%;background:var(--clr-accent)"></div></div>
    </div>
    <div class="card kpi-card">
      <div class="kpi-label">Deuda total</div>
      <div class="kpi-value clr-danger">${fmt(State.debts.reduce((a,d)=>a+d.remaining,0))}</div>
      <div class="kpi-sub">${State.debts.length} deuda(s) activa(s)</div>
      <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${State.debts.length?'100':'0'}%;background:#f85149"></div></div>
    </div>
  `;

  // Alerts
  let alerts = '';
  if (balance < 0) alerts += `<div class="alert alert-danger">🚨 <strong>Déficit mensual:</strong> tus gastos superan tus ingresos en ${fmt(Math.abs(balance))}.</div>`;
  else if (balance < 50000 && income > 0) alerts += `<div class="alert alert-warn">⚡ <strong>Saldo ajustado:</strong> solo quedan ${fmt(balance)} para gastos variables.</div>`;
  if (State.debts.length) alerts += `<div class="alert alert-danger">💳 <strong>Deudas activas:</strong> ${fmt(State.debts.reduce((a,d)=>a+d.remaining,0))} pendientes.</div>`;
  if (!alerts) alerts = `<div class="alert alert-ok">✅ <strong>Todo en orden:</strong> no hay alertas críticas este mes.</div>`;
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
  const recent = [...State.transactions].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0, 8);
  renderTxRows('recentTxBody', recent);
}

function isThisMonth(dateStr) {
  const d = new Date(dateStr);
  return d.getFullYear() === State.calYear && d.getMonth() === State.calMonth;
}

function renderTxRows(tbodyId, txs) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!txs.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Sin transacciones</td></tr>'; return; }
  tbody.innerHTML = txs.map(t => {
    const c = getCat(t.cat);
    return `<tr>
      <td class="mono clr-muted" style="font-size:11px">${t.date}</td>
      <td>${t.desc}${t.notes ? `<br><span style="font-size:10px;color:var(--clr-muted)">${t.notes}</span>` : ''}</td>
      <td><span class="badge" style="background:${c.color}20;color:${c.color}">${c.label}</span></td>
      <td class="mono clr-muted" style="font-size:10px">${t.freq || ''}</td>
      <td><span class="badge" style="background:${t.type==='ingreso'?'rgba(63,185,80,0.15)':'rgba(248,81,73,0.15)'};color:${t.type==='ingreso'?'var(--clr-success)':'var(--clr-danger)'}">${t.type==='ingreso'?'💰 Ingreso':'💸 Gasto'}</span></td>
      <td class="mono fw7" style="color:${t.type==='ingreso'?'var(--clr-success)':'var(--clr-danger)'}">${t.type==='ingreso'?'+':'-'}${fmt(t.amount)}</td>
      <td><button class="btn btn-danger btn-xs" onclick="deleteTx(${t.id})">✕</button></td>
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
  if (monthF !== '' && monthF !== undefined && monthF !== null) txs = txs.filter(t => new Date(t.date).getMonth() === parseInt(monthF));
  txs.sort((a,b) => new Date(b.date) - new Date(a.date));

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
  monthTxs.forEach(t => { const d = new Date(t.date).getDate() - 1; byDay[d] += t.amount; });
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
function openTxModal(id) {
  document.getElementById('txDate').value = todayStr;
  populateCatSelects();
  document.getElementById('txOverlay').classList.remove('hidden');
  if (id) {/* edit mode — future */ }
}
function closeTxModal() { document.getElementById('txOverlay').classList.add('hidden'); }

function saveTx() {
  const type   = document.getElementById('txType').value;
  const date   = document.getElementById('txDate').value;
  const desc   = document.getElementById('txDesc').value.trim();
  const amount = parseFloat(document.getElementById('txAmount').value) || 0;
  const cat    = document.getElementById('txCat').value;
  const freq   = document.getElementById('txFreq').value;
  const notes  = document.getElementById('txNotes').value.trim();
  if (!desc || !amount || !date) { showToast('⚠️ Completá fecha, descripción y monto'); return; }
  State.transactions.push({ id: State.txIdCounter++, type, date, desc, amount, cat, freq, notes });
  ['txDesc','txAmount','txNotes'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  closeTxModal();
  showToast('✅ Transacción guardada');
  rerenderCurrentSection();
}

function deleteTx(id) {
  State.transactions = State.transactions.filter(t => t.id !== id);
  rerenderCurrentSection();
  showToast('🗑️ Eliminada');
}

// ══════════════════════════════════════════════════════
// PRESUPUESTO
// ══════════════════════════════════════════════════════
function renderBudget() {
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
  renderBudget();
}
function removeBudgetRow(type, id) {
  State.budget[type] = State.budget[type].filter(x => x.id !== id);
  renderBudget();
}
function updateBudgetName(type, id, val) {
  const item = State.budget[type].find(x => x.id === id);
  if (item) item.name = val;
}
function updateBudgetAmt(type, id, field, val) {
  const item = State.budget[type].find(x => x.id === id);
  if (item) { item[field] = val; renderBudgetSummary(); renderBudgetChart(); }
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
  renderGoals();
}
function removeGoal(id) { State.goals = State.goals.filter(g => g.id !== id); renderGoals(); }
function updateGoalSaved(id, val) { const g = State.goals.find(g => g.id === id); if(g) { g.saved = val; renderGoals(); } }
function saveBudgetFeedback(btn) { btn.textContent = '✅ Guardado'; setTimeout(() => btn.textContent = '💾 Guardar', 2000); showToast('💾 Presupuesto guardado'); }

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
    const diff = (new Date(e.date) - now) / (1000*60*60*24);
    return diff >= 0 && diff <= 30;
  }).sort((a,b) => new Date(a.date)-new Date(b.date)).slice(0, 6);
  const typeColors = { vencimiento: 'var(--clr-danger)', cobro: 'var(--clr-success)', recordatorio: 'var(--clr-accent2)', gasto: 'var(--clr-warn)' };
  document.getElementById('upcomingList').innerHTML = upcoming.map(e => `
    <div class="event-item">
      <div class="event-dot" style="background:${typeColors[e.type]}22;color:${typeColors[e.type]}">${new Date(e.date).getDate()}</div>
      <div class="event-info">
        <div class="event-name">${e.desc}</div>
        <div class="event-meta">${new Date(e.date).toLocaleDateString('es-AR')} ${e.amount > 0 ? '· '+fmt(e.amount) : ''}</div>
      </div>
      <button class="btn btn-danger btn-xs" onclick="deleteCalEvent(${e.id})">✕</button>
    </div>`).join('') || '<div class="empty-state">Sin eventos próximos</div>';
}

function renderMonthEvents() {
  const evs = State.calEvents.filter(e => { const d = new Date(e.date); return d.getFullYear()===State.calYear && d.getMonth()===State.calMonth; });
  const typeLabels = { vencimiento: 'Vencimiento', cobro: 'Cobro', recordatorio: 'Recordatorio', gasto: 'Gasto' };
  const typeColors = { vencimiento: 'var(--clr-danger)', cobro: 'var(--clr-success)', recordatorio: 'var(--clr-accent2)', gasto: 'var(--clr-warn)' };
  document.getElementById('monthEventsList').innerHTML = evs.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(e => `
    <div class="event-item">
      <span class="badge" style="background:${typeColors[e.type]}20;color:${typeColors[e.type]};min-width:80px;text-align:center">${typeLabels[e.type]}</span>
      <div class="event-info"><div class="event-name">${e.desc}</div><div class="event-meta">${e.amount>0?fmt(e.amount):''}</div></div>
      <button class="btn btn-danger btn-xs" onclick="deleteCalEvent(${e.id})">✕</button>
    </div>`).join('') || '<div class="empty-state">Sin eventos este mes</div>';
}

function prevMonth() { State.calMonth--; if(State.calMonth<0){State.calMonth=11;State.calYear--;} renderCalendar(); }
function nextMonth() { State.calMonth++; if(State.calMonth>11){State.calMonth=0;State.calYear++;} renderCalendar(); }
function showDayModal(date) { document.getElementById('calDate').value = date; openCalModal(); }

function openCalModal() { document.getElementById('calDate').value = document.getElementById('calDate').value || todayStr; document.getElementById('calOverlay').classList.remove('hidden'); }
function closeCalModal() { document.getElementById('calOverlay').classList.add('hidden'); }

function saveCalEvent() {
  const date = document.getElementById('calDate').value;
  const type = document.getElementById('calType').value;
  const desc = document.getElementById('calDesc').value.trim();
  const amount = parseFloat(document.getElementById('calAmount').value) || 0;
  if (!date || !desc) { showToast('⚠️ Completá fecha y descripción'); return; }
  State.calEvents.push({ id: State.calIdCounter++, date, type, desc, amount });
  ['calDesc','calAmount'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  closeCalModal();
  showToast('📅 Evento agregado');
  renderCalendar();
}
function deleteCalEvent(id) { State.calEvents = State.calEvents.filter(e => e.id !== id); renderCalendar(); }

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
          <div class="debt-detail">Venc: ${d.due||'—'} · ${d.cuotas} cuotas · ${d.interest}% interés/mes</div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteDebt(${d.id})">Eliminar</button>
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

function openDebtModal() { document.getElementById('debtDue').value = todayStr; document.getElementById('debtOverlay').classList.remove('hidden'); }
function closeDebtModal() { document.getElementById('debtOverlay').classList.add('hidden'); }

function saveDebt() {
  const name   = document.getElementById('debtName').value.trim();
  const amount = parseFloat(document.getElementById('debtAmount').value) || 0;
  const cuotas = parseInt(document.getElementById('debtCuotas').value) || 12;
  const interest = parseFloat(document.getElementById('debtInt').value) || 0;
  const due    = document.getElementById('debtDue').value;
  if (!name || !amount) { showToast('⚠️ Completá nombre y monto'); return; }
  State.debts.push({ id: State.debtIdCounter++, name, total: amount, remaining: amount, cuotas, interest, due, paid: 0 });
  closeDebtModal();
  showToast('💳 Deuda registrada');
  renderDebts();
}
function deleteDebt(id) { State.debts = State.debts.filter(d => d.id !== id); renderDebts(); showToast('🗑️ Deuda eliminada'); }
function payDebt(id) {
  const amt = parseFloat(document.getElementById('pay-'+id)?.value) || 0;
  if (!amt) return;
  const d = State.debts.find(x => x.id === id);
  if (d) { d.remaining = Math.max(0, d.remaining-amt); d.paid = (d.paid||0)+amt; }
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
// ANUAL
// ══════════════════════════════════════════════════════
function setYear(y) { State.anualYear = y; renderAnual(); }

function renderAnual() {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  // Build data from budget
  const fixedTotal   = State.budget.fixed.reduce((a,i) => a+i.amount, 0);
  const varTotal     = State.budget.variable.reduce((a,i) => a+i.amount, 0);
  const incomeTotal  = State.budget.income.reduce((a,i) => a+i.amount, 0);

  // Slight seasonal variation for visual interest
  const variation = [0.9,0.92,1,1.02,0.95,1.05,1.1,0.98,1,1.02,1.15,1.3];
  const income  = months.map((_,i) => Math.round(incomeTotal * variation[i]));
  const fixed   = months.map(() => fixedTotal);
  const variable= months.map((_,i) => Math.round(varTotal * variation[i]));
  const total   = months.map((_,i) => fixed[i]+variable[i]);
  const balance = months.map((_,i) => income[i]-total[i]);

  // Chart
  makeChart('chartAnual', {
    type: 'line',
    data: { labels: months, datasets: [
      { label: 'Ingresos', data: income, borderColor: '#3fb950', backgroundColor: 'rgba(63,185,80,0.08)', fill: true, tension: 0.3, borderWidth: 2, pointRadius: 3 },
      { label: 'Egresos',  data: total,  borderColor: '#f85149', backgroundColor: 'rgba(248,81,73,0.08)', fill: true, tension: 0.3, borderWidth: 2, pointRadius: 3 },
      { label: 'Saldo',    data: balance, borderColor: '#f0c040', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2, borderDash: [5,4], pointRadius: 2 }
    ]},
    options: { responsive: true, maintainAspectRatio: false, ...chartDefaults }
  });

  // Table
  const rows = [
    { label: '💰 Ingresos',    data: income,   cls: 'income-row' },
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

  const annualInc  = income.reduce((a,b)=>a+b,0);
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

// ══════════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════════
function exportData() {
  const data = JSON.stringify({ transactions: State.transactions, budget: State.budget, debts: State.debts, goals: State.goals, calEvents: State.calEvents }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'fincontrol-data.json'; a.click();
  URL.revokeObjectURL(url);
  showToast('📤 Datos exportados');
  document.getElementById('userMenu').classList.add('hidden');
}

// ══════════════════════════════════════════════════════
// STARTUP
// ══════════════════════════════════════════════════════
// Apply saved theme before load
(function() {
  const t = localStorage.getItem('fc-theme') || 'cyber';
  const m = localStorage.getItem('fc-mode') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.setAttribute('data-mode', m);
})();