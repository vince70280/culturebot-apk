// src/main.js
// CultureBot APK — Application principale

import { FACTS, CATEGORIES, getRandomFact } from './facts.js';

// ── Storage helpers ───────────────────────────────────────────
const STORAGE_KEY = 'culturebot_prefs';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    activeCats: Object.keys(CATEGORIES),
    intervalMin: 60,
    recentIds: [],
    streak: 0,
    totalSeen: 0,
    lastSeen: null,
    notifEnabled: false,
  };
}

function savePrefs(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

// ── State ─────────────────────────────────────────────────────
let prefs = loadPrefs();
let currentFact = null;
let currentView = 'home'; // 'home' | 'config' | 'stats'
let isFlipped = false;
let notifTimer = null;

// ── Notification helpers ──────────────────────────────────────
async function requestNotifPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function scheduleNotif() {
  if (notifTimer) clearTimeout(notifTimer);
  if (!prefs.notifEnabled) return;
  const ms = prefs.intervalMin * 60 * 1000;
  notifTimer = setTimeout(() => {
    const fact = getRandomFact(prefs.activeCats, prefs.recentIds);
    if (Notification.permission === 'granted') {
      new Notification('🧠 CultureBot', {
        body: fact.text,
        icon: '/icon.png',
        badge: '/icon.png',
      });
    }
    scheduleNotif(); // Replanifie
  }, ms);
}

// ── Fact logic ────────────────────────────────────────────────
function loadNewFact() {
  currentFact = getRandomFact(prefs.activeCats, prefs.recentIds);
  isFlipped = false;

  // Historique anti-doublons (max 30)
  prefs.recentIds = [currentFact.id, ...prefs.recentIds].slice(0, 30);
  prefs.totalSeen++;

  // Streak
  const today = new Date().toDateString();
  if (prefs.lastSeen !== today) {
    prefs.streak = (prefs.lastSeen === new Date(Date.now() - 86400000).toDateString())
      ? prefs.streak + 1 : 1;
    prefs.lastSeen = today;
  }

  savePrefs(prefs);
  render();
}

// ── Intervals config ──────────────────────────────────────────
const INTERVALS = [
  { label: '15 min',  value: 15,   emoji: '⚡' },
  { label: '30 min',  value: 30,   emoji: '🔥' },
  { label: '1 heure', value: 60,   emoji: '⏰' },
  { label: '2 heures',value: 120,  emoji: '🕐' },
  { label: '6 heures',value: 360,  emoji: '🌤' },
  { label: '12h',     value: 720,  emoji: '🌙' },
  { label: '1 jour',  value: 1440, emoji: '📅' },
];

// ── Render ────────────────────────────────────────────────────
function render() {
  const app = document.getElementById('app');
  app.innerHTML = buildLayout();
  attachEvents();
}

function buildLayout() {
  return `
    <div class="shell">
      ${buildStatusBar()}
      ${buildHeader()}
      <div class="body">
        ${currentView === 'home'   ? buildHome()   : ''}
        ${currentView === 'config' ? buildConfig() : ''}
        ${currentView === 'stats'  ? buildStats()  : ''}
      </div>
      ${buildNav()}
    </div>
    ${buildStyles()}
  `;
}

function buildStatusBar() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `<div class="status-bar"><span>${h}:${m}</span><span>📶 🔋</span></div>`;
}

function buildHeader() {
  const titles = { home: '🧠 CultureBot', config: '⚙️ Paramètres', stats: '📊 Statistiques' };
  return `
    <div class="header">
      <div class="header-title">${titles[currentView]}</div>
      <div class="header-sub">
        ${currentView === 'home' ? `<span class="streak">🔥 Série : ${prefs.streak} jour${prefs.streak > 1 ? 's' : ''}</span>` : ''}
      </div>
    </div>
  `;
}

function buildHome() {
  if (!currentFact) {
    return `
      <div class="welcome">
        <div class="welcome-icon">🧠</div>
        <h2 class="welcome-title">Prêt à apprendre ?</h2>
        <p class="welcome-sub">Découvre une nouvelle anecdote fascinante chaque jour.</p>
        <button class="btn-main" id="btn-first">Commencer ✨</button>
      </div>
    `;
  }

  const cat = CATEGORIES[currentFact.cat];
  return `
    <div class="fact-container">
      <div class="cat-badge" style="color:${cat.color};border-color:${cat.color}22;background:${cat.color}11">
        ${cat.emoji} ${cat.label}
      </div>

      <div class="card ${isFlipped ? 'flipped' : ''}" id="card">
        <div class="card-front">
          <div class="card-glow" style="background:${cat.color}"></div>
          <div class="card-content">
            <div class="fact-text">${currentFact.text}</div>
          </div>
          <div class="card-hint">Appuie sur la carte pour la retourner ↩</div>
        </div>
        <div class="card-back">
          <div class="back-emoji">${cat.emoji}</div>
          <div class="back-cat">${cat.label}</div>
          <div class="back-num">Anecdote #${currentFact.id} / ${FACTS.length}</div>
        </div>
      </div>

      <div class="action-row">
        <button class="btn-action" id="btn-share" title="Partager">📤</button>
        <button class="btn-main" id="btn-next">Suivante →</button>
        <button class="btn-action" id="btn-fav" title="Favoris">⭐</button>
      </div>

      <div class="progress-bar">
        <div class="progress-fill" style="width:${Math.min(100, (prefs.totalSeen / FACTS.length) * 100)}%;background:${cat.color}"></div>
      </div>
      <div class="progress-label">${prefs.totalSeen} / ${FACTS.length} anecdotes vues</div>
    </div>
  `;
}

function buildConfig() {
  const ivLabel = INTERVALS.find(i => i.value === prefs.intervalMin)?.label || '1 heure';

  return `
    <div class="config-scroll">
      <section class="config-section">
        <div class="section-title">🔔 Notifications</div>
        <div class="notif-row">
          <div>
            <div class="notif-label">Rappels automatiques</div>
            <div class="notif-sub">Reçois une anecdote toutes les ${ivLabel}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="toggle-notif" ${prefs.notifEnabled ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </section>

      <section class="config-section">
        <div class="section-title">⏱ Fréquence</div>
        <div class="interval-list">
          ${INTERVALS.map(iv => `
            <button class="interval-btn ${prefs.intervalMin === iv.value ? 'active' : ''}"
                    data-val="${iv.value}">
              <span class="iv-emoji">${iv.emoji}</span>
              <span class="iv-label">Toutes les ${iv.label}</span>
              ${prefs.intervalMin === iv.value ? '<span class="iv-badge">Actif</span>' : ''}
            </button>
          `).join('')}
        </div>
      </section>

      <section class="config-section">
        <div class="section-title">📂 Catégories</div>
        <div class="cat-grid">
          ${Object.entries(CATEGORIES).map(([id, cat]) => `
            <button class="cat-btn ${prefs.activeCats.includes(id) ? 'cat-on' : ''}"
                    data-cat="${id}"
                    style="${prefs.activeCats.includes(id)
                      ? `border-color:${cat.color};color:${cat.color};background:${cat.color}15`
                      : ''}">
              ${cat.emoji} ${cat.label}
            </button>
          `).join('')}
        </div>
      </section>

      <button class="btn-main btn-reset" id="btn-reset-history">🔄 Réinitialiser l'historique</button>
    </div>
  `;
}

function buildStats() {
  const catCounts = {};
  Object.keys(CATEGORIES).forEach(c => { catCounts[c] = 0; });
  // (On pourrait persister le détail, ici on affiche le global)
  const pct = Math.min(100, Math.round((prefs.totalSeen / FACTS.length) * 100));

  return `
    <div class="stats-scroll">
      <div class="stat-card big">
        <div class="stat-num">${prefs.totalSeen}</div>
        <div class="stat-label">Anecdotes découvertes</div>
      </div>
      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-num">${prefs.streak}</div>
          <div class="stat-label">🔥 Jours de suite</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${pct}%</div>
          <div class="stat-label">📚 Complété</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="section-title" style="margin-bottom:14px">Progression</div>
        <div class="big-progress">
          <div class="big-fill" style="width:${pct}%"></div>
        </div>
        <div style="text-align:center;margin-top:8px;font-size:13px;color:rgba(255,255,255,0.5)">
          ${prefs.totalSeen} / ${FACTS.length} anecdotes
        </div>
      </div>

      <div class="stat-card">
        <div class="section-title" style="margin-bottom:14px">Catégories actives</div>
        ${prefs.activeCats.map(id => {
          const cat = CATEGORIES[id];
          return `
            <div class="cat-stat-row">
              <span style="color:${cat.color}">${cat.emoji} ${cat.label}</span>
              <span style="color:rgba(255,255,255,0.4);font-size:13px">
                ${FACTS.filter(f => f.cat === id).length} anecdotes
              </span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function buildNav() {
  const tabs = [
    { id: 'home',   icon: '🏠', label: 'Accueil' },
    { id: 'config', icon: '⚙️', label: 'Réglages' },
    { id: 'stats',  icon: '📊', label: 'Stats' },
  ];
  return `
    <nav class="bottom-nav">
      ${tabs.map(t => `
        <button class="nav-btn ${currentView === t.id ? 'nav-active' : ''}" data-view="${t.id}">
          <span class="nav-icon">${t.icon}</span>
          <span class="nav-label">${t.label}</span>
        </button>
      `).join('')}
    </nav>
  `;
}

// ── Events ────────────────────────────────────────────────────
function attachEvents() {
  // Nav
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.dataset.view;
      render();
    });
  });

  // Home
  document.getElementById('btn-first')?.addEventListener('click', loadNewFact);
  document.getElementById('btn-next')?.addEventListener('click', loadNewFact);
  document.getElementById('card')?.addEventListener('click', () => {
    isFlipped = !isFlipped;
    document.getElementById('card')?.classList.toggle('flipped', isFlipped);
  });
  document.getElementById('btn-share')?.addEventListener('click', () => {
    if (navigator.share && currentFact) {
      navigator.share({ title: 'CultureBot', text: currentFact.text });
    } else if (currentFact) {
      navigator.clipboard?.writeText(currentFact.text);
      showToast('📋 Copié dans le presse-papier !');
    }
  });
  document.getElementById('btn-fav')?.addEventListener('click', () => {
    showToast('⭐ Mis en favori !');
  });

  // Config — toggle notif
  document.getElementById('toggle-notif')?.addEventListener('change', async (e) => {
    if (e.target.checked) {
      const ok = await requestNotifPermission();
      if (!ok) {
        e.target.checked = false;
        showToast('⚠️ Autorise les notifications dans les réglages');
        return;
      }
    }
    prefs.notifEnabled = e.target.checked;
    savePrefs(prefs);
    scheduleNotif();
    showToast(prefs.notifEnabled ? '🔔 Notifications activées !' : '🔕 Notifications désactivées');
  });

  // Config — intervals
  document.querySelectorAll('[data-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      prefs.intervalMin = parseInt(btn.dataset.val, 10);
      savePrefs(prefs);
      scheduleNotif();
      render();
    });
  });

  // Config — categories
  document.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.cat;
      const isOn = prefs.activeCats.includes(id);
      if (isOn && prefs.activeCats.length === 1) {
        showToast('⚠️ Au moins une catégorie requise !');
        return;
      }
      prefs.activeCats = isOn
        ? prefs.activeCats.filter(c => c !== id)
        : [...prefs.activeCats, id];
      savePrefs(prefs);
      render();
    });
  });

  // Config — reset
  document.getElementById('btn-reset-history')?.addEventListener('click', () => {
    prefs.recentIds = [];
    savePrefs(prefs);
    showToast('✅ Historique réinitialisé !');
  });
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

// ── Styles ────────────────────────────────────────────────────
function buildStyles() {
  return `<style>
    :root {
      --bg: #050a14;
      --surface: rgba(255,255,255,0.04);
      --border: rgba(255,255,255,0.08);
      --text: #f0f4ff;
      --muted: rgba(255,255,255,0.45);
      --accent: #2979ff;
      --font-head: 'Syne', sans-serif;
      --font-body: 'DM Sans', sans-serif;
    }

    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

    .shell {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-body);
      overflow: hidden;
    }

    /* Status bar */
    .status-bar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 20px; font-size: 12px; color: var(--muted);
      background: #080f1e;
    }

    /* Header */
    .header {
      padding: 12px 20px 10px;
      background: #080f1e;
      border-bottom: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center;
    }
    .header-title {
      font-family: var(--font-head);
      font-weight: 800; font-size: 20px;
    }
    .streak {
      font-size: 13px; color: #ff9800;
      background: rgba(255,152,0,0.1);
      padding: 3px 10px; border-radius: 20px;
      border: 1px solid rgba(255,152,0,0.2);
    }

    /* Body */
    .body { flex: 1; overflow: hidden; position: relative; }

    /* ── HOME ─── */
    .welcome {
      height: 100%; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 24px; text-align: center; gap: 16px;
    }
    .welcome-icon { font-size: 72px; animation: pulse 3s infinite; }
    .welcome-title { font-family: var(--font-head); font-size: 28px; font-weight: 800; }
    .welcome-sub { color: var(--muted); font-size: 15px; line-height: 1.5; }

    .fact-container {
      height: 100%; display: flex; flex-direction: column;
      align-items: center; padding: 16px 20px; gap: 14px;
      overflow: hidden;
    }

    .cat-badge {
      font-size: 13px; font-weight: 600;
      padding: 4px 14px; border-radius: 20px; border: 1px solid;
      letter-spacing: 0.5px;
    }

    /* Card flip */
    .card {
      width: 100%; flex: 1;
      position: relative; cursor: pointer;
      perspective: 1000px;
      transform-style: preserve-3d;
      transition: transform 0.55s cubic-bezier(0.4,0,0.2,1);
      max-height: 340px;
    }
    .card.flipped { transform: rotateY(180deg); }

    .card-front, .card-back {
      position: absolute; inset: 0;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      border-radius: 24px;
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .card-front {
      background: linear-gradient(160deg, #0d1a2e 0%, #080f1e 100%);
      display: flex; flex-direction: column;
    }
    .card-glow {
      position: absolute; top: -60px; right: -60px;
      width: 200px; height: 200px;
      border-radius: 50%; opacity: 0.08;
      filter: blur(40px);
    }
    .card-content {
      flex: 1; display: flex; align-items: center;
      padding: 28px 24px; position: relative; z-index: 1;
    }
    .fact-text {
      font-family: var(--font-body);
      font-size: 16px; line-height: 1.65;
      font-weight: 400; color: var(--text);
    }
    .card-hint {
      padding: 10px 20px;
      font-size: 11px; color: rgba(255,255,255,0.25);
      text-align: center; position: relative; z-index: 1;
    }

    .card-back {
      background: linear-gradient(160deg, #0d1a2e 0%, #080f1e 100%);
      transform: rotateY(180deg);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 10px;
    }
    .back-emoji { font-size: 52px; }
    .back-cat { font-family: var(--font-head); font-size: 22px; font-weight: 700; }
    .back-num { font-size: 13px; color: var(--muted); }

    /* Actions */
    .action-row {
      display: flex; align-items: center; gap: 12px; width: 100%;
    }
    .btn-main {
      flex: 1; padding: 14px;
      background: linear-gradient(135deg, var(--accent), #1565c0);
      border: none; border-radius: 16px;
      color: #fff; font-family: var(--font-head);
      font-size: 15px; font-weight: 700;
      cursor: pointer;
      box-shadow: 0 6px 24px rgba(41,121,255,0.3);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .btn-main:active { transform: scale(0.97); box-shadow: none; }

    .btn-action {
      width: 50px; height: 50px; border-radius: 16px;
      background: var(--surface); border: 1px solid var(--border);
      font-size: 20px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: white; transition: background 0.2s;
    }
    .btn-action:active { background: rgba(255,255,255,0.1); }

    /* Progress */
    .progress-bar {
      width: 100%; height: 4px; background: var(--border);
      border-radius: 4px; overflow: hidden;
    }
    .progress-fill { height: 100%; border-radius: 4px; transition: width 0.6s; }
    .progress-label { font-size: 11px; color: var(--muted); }

    /* ── CONFIG ─── */
    .config-scroll {
      height: 100%; overflow-y: auto;
      padding: 16px 20px; display: flex;
      flex-direction: column; gap: 16px;
    }
    .config-section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px; padding: 18px;
    }
    .section-title {
      font-family: var(--font-head);
      font-size: 13px; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase;
      color: var(--accent); margin-bottom: 14px;
    }

    .notif-row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
    }
    .notif-label { font-size: 15px; font-weight: 500; }
    .notif-sub { font-size: 12px; color: var(--muted); margin-top: 3px; }

    /* Toggle switch */
    .toggle { position: relative; width: 48px; height: 26px; flex-shrink: 0; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider {
      position: absolute; inset: 0;
      background: rgba(255,255,255,0.1); border-radius: 26px;
      transition: background 0.3s; cursor: pointer;
    }
    .toggle-slider::before {
      content: ''; position: absolute;
      width: 20px; height: 20px; left: 3px; top: 3px;
      background: white; border-radius: 50%;
      transition: transform 0.3s;
    }
    .toggle input:checked + .toggle-slider { background: var(--accent); }
    .toggle input:checked + .toggle-slider::before { transform: translateX(22px); }

    .interval-list { display: flex; flex-direction: column; gap: 8px; }
    .interval-btn {
      display: flex; align-items: center; gap: 12px;
      background: rgba(255,255,255,0.03);
      border: 1.5px solid var(--border);
      border-radius: 14px; padding: 11px 14px;
      color: var(--text); cursor: pointer;
      font-family: var(--font-body); font-size: 14px;
      transition: all 0.2s;
    }
    .interval-btn.active {
      background: rgba(41,121,255,0.12);
      border-color: var(--accent);
    }
    .iv-emoji { font-size: 18px; }
    .iv-label { flex: 1; text-align: left; }
    .iv-badge {
      background: var(--accent); border-radius: 20px;
      padding: 2px 10px; font-size: 11px; font-weight: 700;
    }

    .cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .cat-btn {
      padding: 11px 8px; border-radius: 14px;
      background: rgba(255,255,255,0.03);
      border: 1.5px solid var(--border);
      color: var(--muted); cursor: pointer;
      font-family: var(--font-body); font-size: 13px;
      transition: all 0.2s;
    }
    .cat-btn.cat-on { font-weight: 600; }

    .btn-reset {
      background: rgba(255,255,255,0.06);
      box-shadow: none; color: var(--muted);
      font-size: 14px;
    }

    /* ── STATS ─── */
    .stats-scroll {
      height: 100%; overflow-y: auto;
      padding: 16px 20px; display: flex;
      flex-direction: column; gap: 14px;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px; padding: 20px;
    }
    .stat-card.big { text-align: center; }
    .stat-num {
      font-family: var(--font-head);
      font-size: 48px; font-weight: 800;
      color: var(--accent);
    }
    .stat-label { font-size: 14px; color: var(--muted); margin-top: 4px; }
    .stat-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .stat-row .stat-num { font-size: 36px; }

    .big-progress {
      height: 10px; background: var(--border);
      border-radius: 10px; overflow: hidden;
    }
    .big-fill {
      height: 100%; border-radius: 10px;
      background: linear-gradient(90deg, var(--accent), #00e5ff);
      transition: width 0.8s;
    }
    .cat-stat-row {
      display: flex; justify-content: space-between;
      padding: 9px 0; border-bottom: 1px solid var(--border);
      font-size: 14px;
    }
    .cat-stat-row:last-child { border-bottom: none; }

    /* ── NAV ─── */
    .bottom-nav {
      display: flex; background: #080f1e;
      border-top: 1px solid var(--border);
      padding: 6px 0 14px;
    }
    .nav-btn {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; gap: 3px;
      background: none; border: none; cursor: pointer;
      padding: 6px 4px; color: var(--muted);
      transition: color 0.2s;
    }
    .nav-btn.nav-active { color: var(--accent); }
    .nav-icon { font-size: 20px; }
    .nav-label { font-size: 10px; font-family: var(--font-body); }

    /* Toast */
    .toast {
      position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
      background: rgba(30,40,60,0.95);
      border: 1px solid var(--border);
      color: var(--text); font-size: 13px;
      padding: 10px 20px; border-radius: 20px;
      z-index: 999; white-space: nowrap;
      animation: toastIn 0.3s ease, toastOut 0.4s ease 2.4s forwards;
      backdrop-filter: blur(12px);
    }

    @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
    @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
    @keyframes toastOut { to{opacity:0;transform:translateX(-50%) translateY(10px)} }
  </style>`;
}

// ── Init ──────────────────────────────────────────────────────
render();
scheduleNotif();
