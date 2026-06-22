// main.js — CultureBot APK — Design Premium

import { FACTS, CATEGORIES, getRandomFact } from './facts.js';
import { LocalNotifications } from '@capacitor/local-notifications';

// ── Storage ───────────────────────────────────────────────────
const STORAGE_KEY = 'culturebot_v2';
function loadPrefs() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch (_) {}
  return { activeCats: Object.keys(CATEGORIES), intervalMin: 60, recentIds: [], streak: 0, totalSeen: 0, lastSeen: null, notifEnabled: false };
}
function savePrefs(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

// ── State ─────────────────────────────────────────────────────
let prefs       = loadPrefs();
let currentFact = null;
let currentView = 'home';
let isFlipped   = false;

// ── Notifications natives ─────────────────────────────────────
async function requestNotifPermission() {
  const p = await LocalNotifications.checkPermissions();
  if (p.display === 'granted') return true;
  const r = await LocalNotifications.requestPermissions();
  return r.display === 'granted';
}
async function scheduleNotif() {
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0)
    await LocalNotifications.cancel({ notifications: pending.notifications });
  if (!prefs.notifEnabled) return;
  const ms = prefs.intervalMin * 60 * 1000;
  const notifs = []; let recent = [...prefs.recentIds];
  for (let i = 0; i < 64; i++) {
    const f = getRandomFact(prefs.activeCats, recent);
    recent = [f.id, ...recent].slice(0, 30);
    notifs.push({ id: 1000 + i, title: '🧠 CultureBot', body: f.text,
      schedule: { at: new Date(Date.now() + ms * (i + 1)) },
      smallIcon: 'ic_stat_brain', iconColor: '#7C3AED',
      actionTypeId: 'OPEN_FACT', extra: { factId: f.id } });
  }
  await LocalNotifications.schedule({ notifications: notifs });
}
LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
  const factId = action.notification.extra?.factId;
  const fact = factId ? FACTS.find(f => f.id === factId) : null;
  currentFact = fact || getRandomFact(prefs.activeCats, prefs.recentIds);
  if (fact) { prefs.recentIds = [fact.id, ...prefs.recentIds].slice(0, 30); prefs.totalSeen++; savePrefs(prefs); }
  currentView = 'home'; isFlipped = false; render();
});

// ── Fact logic ────────────────────────────────────────────────
function loadNewFact() {
  currentFact = getRandomFact(prefs.activeCats, prefs.recentIds);
  isFlipped = false;
  prefs.recentIds = [currentFact.id, ...prefs.recentIds].slice(0, 30);
  prefs.totalSeen++;
  const today = new Date().toDateString();
  if (prefs.lastSeen !== today) {
    prefs.streak = prefs.lastSeen === new Date(Date.now()-86400000).toDateString() ? prefs.streak+1 : 1;
    prefs.lastSeen = today;
  }
  savePrefs(prefs); render();
}

const INTERVALS = [
  { label: '15 minutes', value: 15,   emoji: '⚡' },
  { label: '30 minutes', value: 30,   emoji: '🔥' },
  { label: '1 heure',    value: 60,   emoji: '⏰' },
  { label: '2 heures',   value: 120,  emoji: '🕐' },
  { label: '6 heures',   value: 360,  emoji: '🌤' },
  { label: '12 heures',  value: 720,  emoji: '🌙' },
  { label: '1 jour',     value: 1440, emoji: '📅' },
];

// ── Render ────────────────────────────────────────────────────
function render() {
  document.getElementById('app').innerHTML = buildStyles() + buildUI();
  attachEvents();
}

function buildUI() {
  return `
  <div class="shell">
    ${buildHeader()}
    <div class="body">
      ${currentView === 'home'   ? buildHome()   : ''}
      ${currentView === 'config' ? buildConfig() : ''}
      ${currentView === 'stats'  ? buildStats()  : ''}
    </div>
    ${buildNav()}
  </div>`;
}

// ── Header ────────────────────────────────────────────────────
function buildHeader() {
  const titles = {
    home:   `<span class="logo-dot"></span>CultureBot`,
    config: 'Paramètres',
    stats:  'Statistiques',
  };
  const right = {
    home:   `<div class="streak-pill">🔥 ${prefs.streak}j</div>`,
    config: '',
    stats:  '',
  };
  return `
    <header class="header">
      <div class="header-left">${titles[currentView]}</div>
      <div class="header-right">${right[currentView]}</div>
    </header>`;
}

// ── Home ──────────────────────────────────────────────────────
function buildHome() {
  if (!currentFact) return `
    <div class="welcome">
      <div class="welcome-orb">🧠</div>
      <h1 class="welcome-title">Cultivez votre<br>curiosité</h1>
      <p class="welcome-sub">Une anecdote fascinante vous attend.</p>
      <button class="cta" id="btn-first">Découvrir maintenant</button>
    </div>`;

  const cat = CATEGORIES[currentFact.cat];
  const pct = Math.min(100, Math.round((prefs.totalSeen / FACTS.length) * 100));

  return `
    <div class="home-wrap">
      <div class="cat-chip" style="--c:${cat.color}">${cat.emoji} ${cat.label}</div>

      <div class="card ${isFlipped ? 'flipped' : ''}" id="card">
        <div class="card-front">
          <div class="card-glow" style="background:radial-gradient(circle at 70% 30%, ${cat.color}22 0%, transparent 70%)"></div>
          <blockquote class="fact-text">${currentFact.text}</blockquote>
          <div class="card-tap">Appuyer pour retourner</div>
        </div>
        <div class="card-back">
          <div class="back-icon">${cat.emoji}</div>
          <div class="back-label">${cat.label}</div>
          <div class="back-num"># ${currentFact.id} sur ${FACTS.length}</div>
        </div>
      </div>

      <div class="actions">
        <button class="icon-btn" id="btn-share">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
        <button class="cta flex-cta" id="btn-next">Suivante →</button>
        <button class="icon-btn" id="btn-save">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>

      <div class="progress-wrap">
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%;background:${cat.color}"></div>
        </div>
        <div class="progress-label">${prefs.totalSeen} / ${FACTS.length} anecdotes découvertes</div>
      </div>
    </div>`;
}

// ── Config ────────────────────────────────────────────────────
function buildConfig() {
  const ivLabel = INTERVALS.find(i => i.value === prefs.intervalMin)?.label || '1 heure';
  return `
    <div class="scroll-wrap">

      <div class="card-section">
        <div class="section-head">Notifications</div>
        <div class="row-between">
          <div>
            <div class="row-title">Rappels automatiques</div>
            <div class="row-sub">Toutes les ${ivLabel}</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="toggle-notif" ${prefs.notifEnabled ? 'checked' : ''}>
            <span class="switch-track"></span>
          </label>
        </div>
      </div>

      <div class="card-section">
        <div class="section-head">Fréquence</div>
        <div class="iv-list">
          ${INTERVALS.map(iv => `
            <button class="iv-row ${prefs.intervalMin === iv.value ? 'iv-active' : ''}" data-val="${iv.value}">
              <span class="iv-icon">${iv.emoji}</span>
              <span class="iv-text">Toutes les ${iv.label}</span>
              ${prefs.intervalMin === iv.value ? '<span class="iv-badge">Actif</span>' : ''}
            </button>`).join('')}
        </div>
      </div>

      <div class="card-section">
        <div class="section-head">Catégories</div>
        <div class="cat-grid">
          ${Object.entries(CATEGORIES).map(([id, cat]) => {
            const on = prefs.activeCats.includes(id);
            return `<button class="cat-pill ${on ? 'cat-on' : ''}" data-cat="${id}" ${on ? `style="--c:${cat.color}"` : ''}>
              ${cat.emoji} ${cat.label}
            </button>`;
          }).join('')}
        </div>
      </div>

      <button class="ghost-btn" id="btn-reset">Réinitialiser l'historique</button>
    </div>`;
}

// ── Stats ─────────────────────────────────────────────────────
function buildStats() {
  const pct = Math.min(100, Math.round((prefs.totalSeen / FACTS.length) * 100));
  return `
    <div class="scroll-wrap">
      <div class="stats-hero">
        <div class="stats-hero-num">${prefs.totalSeen}</div>
        <div class="stats-hero-label">Anecdotes découvertes</div>
      </div>
      <div class="stat-row-grid">
        <div class="stat-mini">
          <div class="stat-mini-num">${prefs.streak}</div>
          <div class="stat-mini-label">🔥 Jours de suite</div>
        </div>
        <div class="stat-mini">
          <div class="stat-mini-num">${pct}%</div>
          <div class="stat-mini-label">📚 Complété</div>
        </div>
      </div>
      <div class="card-section">
        <div class="section-head">Progression globale</div>
        <div class="big-track"><div class="big-fill" style="width:${pct}%"></div></div>
        <div class="progress-label" style="margin-top:8px">${prefs.totalSeen} / ${FACTS.length}</div>
      </div>
      <div class="card-section">
        <div class="section-head">Catégories actives</div>
        ${prefs.activeCats.map(id => {
          const cat = CATEGORIES[id];
          const count = FACTS.filter(f => f.cat === id).length;
          return `<div class="cat-stat">
            <span style="color:${cat.color}">${cat.emoji} ${cat.label}</span>
            <span class="cat-stat-count">${count} anecdotes</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ── Nav ───────────────────────────────────────────────────────
function buildNav() {
  const tabs = [
    { id: 'home',   svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`, label: 'Accueil' },
    { id: 'config', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`, label: 'Réglages' },
    { id: 'stats',  svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`, label: 'Stats' },
  ];
  return `
    <nav class="nav">
      ${tabs.map(t => `
        <button class="nav-btn ${currentView === t.id ? 'nav-on' : ''}" data-view="${t.id}">
          <span class="nav-svg">${t.svg}</span>
          <span class="nav-lbl">${t.label}</span>
        </button>`).join('')}
    </nav>`;
}

// ── Events ────────────────────────────────────────────────────
function attachEvents() {
  document.querySelectorAll('[data-view]').forEach(b =>
    b.addEventListener('click', () => { currentView = b.dataset.view; render(); }));

  document.getElementById('btn-first')?.addEventListener('click', loadNewFact);
  document.getElementById('btn-next')?.addEventListener('click', loadNewFact);
  document.getElementById('card')?.addEventListener('click', () => {
    isFlipped = !isFlipped;
    document.getElementById('card').classList.toggle('flipped', isFlipped);
  });
  document.getElementById('btn-share')?.addEventListener('click', () => {
    if (navigator.share && currentFact) navigator.share({ title: 'CultureBot', text: currentFact.text });
    else { navigator.clipboard?.writeText(currentFact?.text || ''); toast('Copié !'); }
  });
  document.getElementById('btn-save')?.addEventListener('click', () => toast('Sauvegardé ⭐'));

  document.getElementById('toggle-notif')?.addEventListener('change', async e => {
    if (e.target.checked) {
      const ok = await requestNotifPermission();
      if (!ok) { e.target.checked = false; toast('Autorise les notifications dans les réglages'); return; }
    }
    prefs.notifEnabled = e.target.checked;
    savePrefs(prefs);
    await scheduleNotif().catch(console.error);
    toast(prefs.notifEnabled ? 'Notifications activées 🔔' : 'Notifications désactivées');
  });

  document.querySelectorAll('[data-val]').forEach(b =>
    b.addEventListener('click', async () => {
      prefs.intervalMin = parseInt(b.dataset.val, 10);
      savePrefs(prefs);
      await scheduleNotif().catch(console.error);
      render();
    }));

  document.querySelectorAll('[data-cat]').forEach(b =>
    b.addEventListener('click', async () => {
      const id = b.dataset.cat;
      const on = prefs.activeCats.includes(id);
      if (on && prefs.activeCats.length === 1) { toast('Au moins une catégorie requise'); return; }
      prefs.activeCats = on ? prefs.activeCats.filter(c => c !== id) : [...prefs.activeCats, id];
      savePrefs(prefs);
      await scheduleNotif().catch(console.error);
      render();
    }));

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    prefs.recentIds = []; savePrefs(prefs); toast('Historique réinitialisé');
  });
}

function toast(msg) {
  document.querySelector('.toast')?.remove();
  const el = Object.assign(document.createElement('div'), { className: 'toast', textContent: msg });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// ── Styles ────────────────────────────────────────────────────
function buildStyles() {
  return `<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');

    :root {
      --bg:      #09090f;
      --bg2:     #111118;
      --surface: rgba(255,255,255,0.045);
      --border:  rgba(255,255,255,0.07);
      --text:    #f1f1f5;
      --muted:   rgba(255,255,255,0.38);
      --accent:  #7C3AED;
      --accent2: #a78bfa;
      --radius:  20px;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body { height: 100%; background: var(--bg); overflow: hidden; }
    #app { height: 100%; }

    .shell {
      height: 100vh;
      display: flex; flex-direction: column;
      background: var(--bg); color: var(--text);
      font-family: 'Inter', sans-serif; overflow: hidden;
      /* Respect de la safe area native Android (Capacitor gère ça) */
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
    }

    /* ── Header (sans barre de statut) ── */
    .header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px 16px;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .header-left {
      font-family: 'Playfair Display', serif;
      font-size: 22px; font-weight: 700; color: var(--text);
      display: flex; align-items: center; gap: 8px;
    }
    .logo-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--accent2); box-shadow: 0 0 10px var(--accent);
    }
    .streak-pill {
      background: rgba(124,58,237,0.15);
      border: 1px solid rgba(124,58,237,0.3);
      color: var(--accent2);
      font-size: 12px; font-weight: 600;
      padding: 4px 12px; border-radius: 20px;
    }

    /* ── Body ── */
    .body { flex: 1; overflow: hidden; min-height: 0; }

    /* ── Welcome ── */
    .welcome {
      height: 100%; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 32px 28px; text-align: center; gap: 20px;
    }
    .welcome-orb {
      font-size: 64px;
      filter: drop-shadow(0 0 24px rgba(124,58,237,0.5));
      animation: float 4s ease-in-out infinite;
    }
    .welcome-title {
      font-family: 'Playfair Display', serif;
      font-size: 34px; line-height: 1.25; color: var(--text);
    }
    .welcome-sub { font-size: 15px; color: var(--muted); line-height: 1.6; }

    /* ── Home ── */
    .home-wrap {
      height: 100%; display: flex; flex-direction: column;
      padding: 20px 20px 16px; gap: 14px; overflow: hidden;
    }
    .cat-chip {
      display: inline-flex; align-items: center; gap: 6px;
      background: color-mix(in srgb, var(--c, var(--accent)) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--c, var(--accent)) 30%, transparent);
      color: var(--c, var(--accent2));
      font-size: 12px; font-weight: 600; letter-spacing: 0.3px;
      padding: 5px 14px; border-radius: 20px; align-self: flex-start;
    }

    /* ── Card ── */
    .card {
      flex: 1; position: relative; cursor: pointer;
      transform-style: preserve-3d;
      transition: transform 0.55s cubic-bezier(0.4,0,0.2,1);
      max-height: 360px; min-height: 0;
    }
    .card.flipped { transform: rotateY(180deg); }
    .card-front, .card-back {
      position: absolute; inset: 0;
      backface-visibility: hidden; -webkit-backface-visibility: hidden;
      border-radius: var(--radius); border: 1px solid var(--border);
      background: var(--bg2); overflow: hidden;
    }
    .card-glow { position: absolute; inset: 0; pointer-events: none; }
    .card-front { display: flex; flex-direction: column; }
    .fact-text {
      flex: 1;
      font-family: 'Playfair Display', serif;
      font-size: 17px; line-height: 1.75; color: var(--text);
      padding: 28px 26px;
      position: relative; z-index: 1;
      display: flex; align-items: center;
      font-style: italic;
    }
    .card-tap {
      padding: 12px 24px; font-size: 11px; color: var(--muted);
      text-align: center; letter-spacing: 0.5px; text-transform: uppercase;
      border-top: 1px solid var(--border);
    }
    .card-back {
      transform: rotateY(180deg);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 12px;
    }
    .back-icon { font-size: 52px; filter: drop-shadow(0 0 20px rgba(124,58,237,0.4)); }
    .back-label { font-family: 'Playfair Display', serif; font-size: 22px; color: var(--text); }
    .back-num { font-size: 13px; color: var(--muted); }

    /* ── Actions ── */
    .actions { display: flex; align-items: center; gap: 12px; }
    .cta {
      background: var(--accent); border: none; border-radius: 14px;
      color: #fff; font-family: 'Inter', sans-serif;
      font-size: 15px; font-weight: 600;
      padding: 14px 28px; cursor: pointer;
      box-shadow: 0 4px 20px rgba(124,58,237,0.35);
      transition: opacity 0.15s, transform 0.15s;
    }
    .cta:active { opacity: 0.85; transform: scale(0.97); }
    .flex-cta { flex: 1; }
    .icon-btn {
      width: 50px; height: 50px; border-radius: 14px;
      background: var(--surface); border: 1px solid var(--border);
      color: var(--muted); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s, color 0.2s; flex-shrink: 0;
    }
    .icon-btn svg { width: 20px; height: 20px; display: block; }
    .icon-btn:active { background: rgba(255,255,255,0.08); color: var(--text); }

    /* ── Progress ── */
    .progress-wrap { display: flex; flex-direction: column; gap: 6px; }
    .progress-track { height: 3px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 3px; transition: width 0.7s ease; }
    .progress-label { font-size: 11px; color: var(--muted); text-align: center; }

    /* ── Scroll wrap ── */
    .scroll-wrap {
      height: 100%; overflow-y: auto;
      padding: 20px; display: flex; flex-direction: column; gap: 14px;
    }
    .scroll-wrap::-webkit-scrollbar { width: 0; }

    /* ── Card section ── */
    .card-section {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 20px;
    }
    .section-head {
      font-size: 11px; font-weight: 700; letter-spacing: 1.4px;
      text-transform: uppercase; color: var(--accent2); margin-bottom: 16px;
    }
    .row-between { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .row-title { font-size: 15px; font-weight: 500; }
    .row-sub { font-size: 12px; color: var(--muted); margin-top: 3px; }

    /* ── Toggle ── */
    .switch { position: relative; width: 50px; height: 28px; flex-shrink: 0; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .switch-track {
      position: absolute; inset: 0;
      background: rgba(255,255,255,0.1); border-radius: 28px;
      cursor: pointer; transition: background 0.3s;
    }
    .switch-track::before {
      content: ''; position: absolute;
      width: 22px; height: 22px; left: 3px; top: 3px;
      background: #fff; border-radius: 50%;
      transition: transform 0.3s; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .switch input:checked + .switch-track { background: var(--accent); }
    .switch input:checked + .switch-track::before { transform: translateX(22px); }

    /* ── Interval list ── */
    .iv-list { display: flex; flex-direction: column; gap: 6px; }
    .iv-row {
      display: flex; align-items: center; gap: 12px;
      background: rgba(255,255,255,0.025); border: 1px solid var(--border);
      border-radius: 12px; padding: 11px 14px;
      color: var(--muted); cursor: pointer;
      font-family: 'Inter', sans-serif; font-size: 14px;
      transition: all 0.2s; text-align: left;
    }
    .iv-row.iv-active {
      background: rgba(124,58,237,0.1);
      border-color: rgba(124,58,237,0.4); color: var(--text);
    }
    .iv-icon { font-size: 17px; }
    .iv-text { flex: 1; }
    .iv-badge {
      background: var(--accent); color: #fff;
      font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
      padding: 2px 9px; border-radius: 20px;
    }

    /* ── Category grid ── */
    .cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .cat-pill {
      padding: 10px 8px; border-radius: 12px;
      background: rgba(255,255,255,0.025); border: 1px solid var(--border);
      color: var(--muted); cursor: pointer;
      font-family: 'Inter', sans-serif; font-size: 13px; transition: all 0.2s;
    }
    .cat-pill.cat-on {
      background: color-mix(in srgb, var(--c, var(--accent)) 12%, transparent);
      border-color: color-mix(in srgb, var(--c, var(--accent)) 40%, transparent);
      color: var(--c, var(--accent2)); font-weight: 600;
    }

    /* Ghost btn */
    .ghost-btn {
      background: none; border: 1px solid var(--border);
      border-radius: var(--radius); padding: 14px;
      color: var(--muted); font-family: 'Inter', sans-serif;
      font-size: 14px; cursor: pointer; width: 100%;
      transition: border-color 0.2s, color 0.2s;
    }
    .ghost-btn:active { border-color: rgba(255,255,255,0.2); color: var(--text); }

    /* ── Stats ── */
    .stats-hero {
      background: linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.05));
      border: 1px solid rgba(124,58,237,0.2);
      border-radius: var(--radius); padding: 28px; text-align: center;
    }
    .stats-hero-num {
      font-family: 'Playfair Display', serif;
      font-size: 64px; font-weight: 700; color: var(--accent2); line-height: 1;
    }
    .stats-hero-label { font-size: 14px; color: var(--muted); margin-top: 8px; }
    .stat-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .stat-mini {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 18px; text-align: center;
    }
    .stat-mini-num { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 700; color: var(--text); }
    .stat-mini-label { font-size: 12px; color: var(--muted); margin-top: 4px; }
    .big-track { height: 8px; background: var(--border); border-radius: 8px; overflow: hidden; }
    .big-fill {
      height: 100%; border-radius: 8px;
      background: linear-gradient(90deg, var(--accent), var(--accent2));
      transition: width 0.8s ease;
    }
    .cat-stat {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px;
    }
    .cat-stat:last-child { border-bottom: none; }
    .cat-stat-count { font-size: 12px; color: var(--muted); }

    /* ── Nav ── */
    .nav {
      display: flex; background: var(--bg2);
      border-top: 1px solid var(--border);
      padding: 10px 0 20px; flex-shrink: 0;
    }
    .nav-btn {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; gap: 4px;
      background: none; border: none; cursor: pointer;
      padding: 6px 4px; color: var(--muted); transition: color 0.2s;
    }
    .nav-btn.nav-on { color: var(--accent2); }
    .nav-svg svg { width: 22px; height: 22px; display: block; }
    .nav-lbl { font-size: 10px; font-family: 'Inter', sans-serif; letter-spacing: 0.3px; }

    /* ── Toast ── */
    .toast {
      position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
      background: rgba(20,20,30,0.95); backdrop-filter: blur(16px);
      border: 1px solid var(--border); color: var(--text);
      font-size: 13px; font-family: 'Inter', sans-serif;
      padding: 10px 20px; border-radius: 20px; white-space: nowrap;
      z-index: 999;
      animation: tin 0.25s ease, tout 0.3s ease 2.3s forwards;
    }

    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes tin  { from{opacity:0;transform:translateX(-50%) translateY(8px)} }
    @keyframes tout { to  {opacity:0;transform:translateX(-50%) translateY(8px)} }
  </style>`;
}

// ── Init ──────────────────────────────────────────────────────
render();
scheduleNotif().catch(console.error);
