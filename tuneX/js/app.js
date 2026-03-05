
// ─── CONFIG ────────────────────────────────────────────────────────────────
// Auto-detect backend: same-origin when served by Flask locally, Render URL on GitHub Pages
// ── BACKEND HOST CONFIG ──────────────────────────────────────────────────────
// Set PRODUCTION_URL to your Render deployment URL.
// When opened via http (local dev / served by Flask), the app auto-detects
// the server origin, so you never need to change PRODUCTION_URL locally.
const PRODUCTION_URL = 'https://tunex-backend-phxe.onrender.com';

const BACKEND = (() => {
    // DISABLED FOR NOW
    // const {protocol, hostname, port} = window.location;
    // // Local dev: served over plain HTTP from Flask → same origin, no CORS issues
    // const isLocal = protocol === 'http:' && hostname !== 'localhost'
    //     ? !hostname.includes('github.io')   // LAN IP served by Flask
    //     : protocol === 'http:';              // localhost
    // if (isLocal) {
    //     return protocol + '//' + hostname + (port ? ':' + port : '');
    // }
    return PRODUCTION_URL;
})();

console.info('[TuneX] Backend →', BACKEND);

// ─── Device Detection ─────────────────────────────────────────────────────
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || (window.innerWidth <= 768 && window.innerHeight <= 1024)
        || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
};
const isPhone = () => window.innerWidth <= 640;
let IS_MOBILE = isMobileDevice();
let IS_PHONE = isPhone();

// ─── State ────────────────────────────────────────────────────────────────
let token = localStorage.getItem('tunex_token');
let currentUser = null;
let themes = [];
let currentTheme = localStorage.getItem('tunex_theme') || 'obsidian';

// Player state
let queue = [];
let queueIndex = -1;
let shuffle = false;
let shuffledOrder = [];
let repeat = 0; // 0=off 1=all 2=one
let isPlaying = false;
let isSeeking = false;
let duration = 0;
let volume = parseFloat(localStorage.getItem('tunex_vol') || '0.7');
let isMuted = false;
let currentTrack = null;
let likedIds = new Set();

// View state
let currentView = 'home';
let viewHistory = ['home'];
let viewHistoryIdx = 0;
let currentPlaylistId = null;
let playlists = [];

// Search
let searchTimer = null;
let searchQuery = '';

// Context menu
let ctxTrack = null;
let ctxPlaylistId = null;

const audio = document.getElementById('audio-el');
audio.volume = volume;

// ─── INIT ─────────────────────────────────────────────────────────────────
async function init() {
    // Register service worker early (needed for notifications even before login)
    registerServiceWorker();

    await loadThemes();
    applyTheme(currentTheme);
    await wakeServer();
    if (token) {
        try {
            const user = await api('/auth/me');
            currentUser = user;
            enterApp();
        } catch {
            token = null;
            localStorage.removeItem('tunex_token');
            showAuth();
        }
    } else {
        showAuth();
    }
}

// ─── WAKE SERVER ──────────────────────────────────────────────────────────
async function wakeServer() {
    _wakeScreenActive = true;
    const fill = document.getElementById('wakeProgress');
    let pct = 0;
    let shownNotifAsk = false;
    const interval = setInterval(() => {
        pct = Math.min(pct + 1.5, 92);
        fill.style.width = pct + '%';
        // After 8 seconds of waiting, show the notification opt-in
        if (pct > 12 && !shownNotifAsk) {
            shownNotifAsk = true;
            maybeShowNotifAsk();
        }
    }, 900);

    for (let i = 0; i < 15; i++) {
        try {
            const r = await fetch(`${BACKEND}/api/ping`, {signal: AbortSignal.timeout(8000)});
            if (r.ok) {
                clearInterval(interval);
                fill.style.width = '100%';
                document.getElementById('notif-ask').style.display = 'none';
                _wakeScreenActive = false;
                stopSwWakeWatch();
                // If page was in background (user left), fire the notification
                if (document.hidden) notifyServerReady();
                await sleep(300);
                return;
            }
        } catch {
        }
        await sleep(4000);
    }
    clearInterval(interval);
    _wakeScreenActive = false;
    stopSwWakeWatch();
    fill.style.width = '100%';
}

// ─── THEMES ───────────────────────────────────────────────────────────────
// Themes are embedded here for reliability (no extra fetch needed).
// To add more themes, also update themes.json and add here.
const THEMES_DATA = [
    {
        "id": "obsidian", "name": "Obsidian", "description": "Deep dark with emerald accents",
        "colors": {
            "bg-base": "#0a0a0a",
            "bg-surface": "#111111",
            "bg-elevated": "#1a1a1a",
            "bg-card": "#161616",
            "accent": "#1db954",
            "accent-hover": "#1ed760",
            "accent-muted": "#1db95430",
            "text-primary": "#ffffff",
            "text-secondary": "#b3b3b3",
            "text-muted": "#535353",
            "border": "#2a2a2a",
            "player-bg": "#121212",
            "sidebar-bg": "#000000",
            "gradient-hero": "linear-gradient(135deg, #1db95420 0%, #0a0a0a 100%)"
        },
        "fonts": {
            "display": "'Clash Display', 'DM Sans', sans-serif",
            "body": "'DM Sans', sans-serif",
            "mono": "'JetBrains Mono', monospace"
        }
    },
    {
        "id": "midnight-rose", "name": "Midnight Rose", "description": "Dark purple with rose gold",
        "colors": {
            "bg-base": "#080610",
            "bg-surface": "#0f0d1a",
            "bg-elevated": "#1a1628",
            "bg-card": "#13111f",
            "accent": "#e8a0bf",
            "accent-hover": "#f0b8d0",
            "accent-muted": "#e8a0bf25",
            "text-primary": "#f0eeff",
            "text-secondary": "#a09ab8",
            "text-muted": "#564e6e",
            "border": "#2a2440",
            "player-bg": "#0a0815",
            "sidebar-bg": "#06040f",
            "gradient-hero": "linear-gradient(135deg, #e8a0bf20 0%, #080610 100%)"
        },
        "fonts": {
            "display": "'Playfair Display', serif",
            "body": "'DM Sans', sans-serif",
            "mono": "'JetBrains Mono', monospace"
        }
    },
    {
        "id": "solar-flare", "name": "Solar Flare", "description": "Warm amber on deep charcoal",
        "colors": {
            "bg-base": "#0c0a06",
            "bg-surface": "#141108",
            "bg-elevated": "#1f1a0e",
            "bg-card": "#181410",
            "accent": "#f59e0b",
            "accent-hover": "#fbbf24",
            "accent-muted": "#f59e0b25",
            "text-primary": "#fef9ee",
            "text-secondary": "#c4a96a",
            "text-muted": "#6b5b35",
            "border": "#2e2516",
            "player-bg": "#0e0b06",
            "sidebar-bg": "#080600",
            "gradient-hero": "linear-gradient(135deg, #f59e0b20 0%, #0c0a06 100%)"
        },
        "fonts": {
            "display": "'Fraunces', serif",
            "body": "'DM Sans', sans-serif",
            "mono": "'JetBrains Mono', monospace"
        }
    },
    {
        "id": "arctic", "name": "Arctic", "description": "Clean white with ice blue",
        "colors": {
            "bg-base": "#f8fafc",
            "bg-surface": "#ffffff",
            "bg-elevated": "#f1f5f9",
            "bg-card": "#ffffff",
            "accent": "#0ea5e9",
            "accent-hover": "#0284c7",
            "accent-muted": "#0ea5e915",
            "text-primary": "#0f172a",
            "text-secondary": "#475569",
            "text-muted": "#94a3b8",
            "border": "#e2e8f0",
            "player-bg": "#ffffff",
            "sidebar-bg": "#f1f5f9",
            "gradient-hero": "linear-gradient(135deg, #0ea5e915 0%, #f8fafc 100%)"
        },
        "fonts": {
            "display": "'DM Sans', sans-serif",
            "body": "'DM Sans', sans-serif",
            "mono": "'JetBrains Mono', monospace"
        }
    },
    {
        "id": "neon-tokyo", "name": "Neon Tokyo", "description": "Cyberpunk purple and cyan",
        "colors": {
            "bg-base": "#05020f",
            "bg-surface": "#0a0518",
            "bg-elevated": "#110a22",
            "bg-card": "#0d071c",
            "accent": "#00f5d4",
            "accent-hover": "#00ffdf",
            "accent-muted": "#00f5d425",
            "text-primary": "#e8f4ff",
            "text-secondary": "#8b7fb8",
            "text-muted": "#4a3d6b",
            "border": "#1e1040",
            "player-bg": "#040110",
            "sidebar-bg": "#030010",
            "gradient-hero": "linear-gradient(135deg, #00f5d420 0%, #bf00ff10 100%)"
        },
        "fonts": {
            "display": "'Rajdhani', sans-serif",
            "body": "'DM Sans', sans-serif",
            "mono": "'JetBrains Mono', monospace"
        }
    },
    {
        "id": "forest", "name": "Forest", "description": "Deep green like a canopy at night",
        "colors": {
            "bg-base": "#030d06",
            "bg-surface": "#07140a",
            "bg-elevated": "#0f2014",
            "bg-card": "#0b1a0e",
            "accent": "#4ade80",
            "accent-hover": "#6ee7a0",
            "accent-muted": "#4ade8025",
            "text-primary": "#ecfdf5",
            "text-secondary": "#86b898",
            "text-muted": "#3d6b4d",
            "border": "#1a3320",
            "player-bg": "#040f07",
            "sidebar-bg": "#020a05",
            "gradient-hero": "linear-gradient(135deg, #4ade8020 0%, #030d06 100%)"
        },
        "fonts": {
            "display": "'Unbounded', sans-serif",
            "body": "'DM Sans', sans-serif",
            "mono": "'JetBrains Mono', monospace"
        }
    }
];

async function loadThemes() {
    themes = THEMES_DATA;
    buildThemePicker();
    // Also try loading from themes.json for any user-added themes
    try {
        const r = await fetch('tuneX/themes.json');
        const data = await r.json();
        if (data.themes && data.themes.length > themes.length) {
            themes = data.themes;
            buildThemePicker();
        }
    } catch {
    } // fine, we have the embedded themes
}

function applyTheme(id) {
    currentTheme = id;
    localStorage.setItem('tunex_theme', id);
    const theme = themes.find(t => t.id === id);
    if (!theme) return;
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([k, v]) => root.style.setProperty(`--${k}`, v));
    root.style.setProperty('--font-display', theme.fonts.display);
    root.style.setProperty('--font-body', theme.fonts.body);
    document.querySelectorAll('.theme-option').forEach(el => {
        el.classList.toggle('active', el.dataset.id === id);
    });
}

function buildThemePicker() {
    const picker = document.getElementById('theme-picker');
    picker.innerHTML = `<div class="theme-picker-title">Themes</div>` +
        themes.map(t => `
      <div class="theme-option" data-id="${t.id}" onclick="applyTheme('${t.id}')">
        <div class="theme-swatch" style="background:${t.colors['bg-surface']};border:2px solid ${t.colors['accent']}"></div>
        <div class="theme-option-info">
          <div class="theme-option-name">${t.name}</div>
          <div class="theme-option-desc">${t.description}</div>
        </div>
      </div>`).join('');
}

function toggleThemePicker() {
    document.getElementById('theme-picker').classList.toggle('visible');
}

// ─── AUTH ─────────────────────────────────────────────────────────────────
function showAuth() {
    document.getElementById('wake-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach((el, i) => el.classList.toggle('active', (i === 0) === (tab === 'login')));
    document.getElementById('auth-login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('auth-register-form').style.display = tab === 'register' ? 'block' : 'none';
}

async function doLogin() {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;
    const err = document.getElementById('login-error');
    err.style.display = 'none';
    try {
        const data = await apiAnon('/auth/login', 'POST', {username: user, password: pass});
        token = data.token;
        localStorage.setItem('tunex_token', token);
        currentUser = data.user;
        document.getElementById('auth-screen').style.display = 'none';
        enterApp();
    } catch (e) {
        err.textContent = e.message || 'Login failed';
        err.style.display = 'block';
    }
}

async function doRegister() {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value;
    const pass2 = document.getElementById('reg-pass2').value;
    const err = document.getElementById('reg-error');
    err.style.display = 'none';
    if (pass !== pass2) {
        err.textContent = 'Passwords do not match';
        err.style.display = 'block';
        return;
    }
    try {
        await apiAnon('/auth/register', 'POST', {username: user, password: pass});
        const data = await apiAnon('/auth/login', 'POST', {username: user, password: pass});
        token = data.token;
        localStorage.setItem('tunex_token', token);
        currentUser = data.user;
        document.getElementById('auth-screen').style.display = 'none';
        enterApp();
    } catch (e) {
        err.textContent = e.message || 'Registration failed';
        err.style.display = 'block';
    }
}

async function doLogout() {
    try {
        await api('/auth/logout', 'POST');
    } catch {
    }
    token = null;
    currentUser = null;
    localStorage.removeItem('tunex_token');
    location.reload();
}

// ─── APP ENTRY ────────────────────────────────────────────────────────────
async function enterApp() {
    document.getElementById('wake-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'grid';

    document.getElementById('user-name').textContent = currentUser.username;
    document.getElementById('user-avatar').textContent = currentUser.username[0].toUpperCase();

    await Promise.all([loadPlaylists(), loadLikedIds()]);
    loadHomeView();

    // Ping server every 5 minutes to keep it alive on free tier
    setInterval(() => {
        fetch(`${BACKEND}/api/ping`, {headers: {'Authorization': `Bearer ${token}`}}).catch(() => {
        });
    }, 5 * 60 * 1000);
}

async function loadPlaylists() {
    try {
        playlists = await api('/playlists');
        renderSidebarPlaylists();
    } catch {
    }
}

async function loadLikedIds() {
    try {
        const liked = await api('/library/liked');
        likedIds = new Set(liked.map(t => t.id));
    } catch {
    }
}

function renderSidebarPlaylists() {
    const el = document.getElementById('sidebar-playlists');
    el.innerHTML = playlists.map(pl => `
    <div class="playlist-item" onclick="openPlaylist('${pl.id}')" id="sidebar-pl-${pl.id}">
      <div class="playlist-thumb">
        ${pl.tracks && pl.tracks[0] && pl.tracks[0].thumbnail
        ? `<img src="${pl.tracks[0].thumbnail}" alt=""/>`
        : '♫'}
      </div>
      <div class="playlist-info">
        <div class="playlist-name">${escHtml(pl.name)}</div>
        <div class="playlist-meta">Playlist · ${(pl.tracks || []).length} songs</div>
      </div>
    </div>`).join('');
}

// ─── VIEWS / NAVIGATION ───────────────────────────────────────────────────
function navigate(view, extra) {
    if (view === currentView && !extra) return;
    viewHistory = viewHistory.slice(0, viewHistoryIdx + 1);
    viewHistory.push({view, extra});
    viewHistoryIdx = viewHistory.length - 1;
    showView(view, extra);
    updateNavArrows();
}

function showView(view, extra) {
    currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));

    if (view === 'home') loadHomeView();
    else if (view === 'search') focusSearch();
    else if (view === 'liked') loadLikedView();
    else if (view === 'recent') loadRecentView();
    else if (view === 'playlist' && extra) loadPlaylistView(extra);
}

function historyBack() {
    if (viewHistoryIdx > 0) {
        viewHistoryIdx--;
        const v = viewHistory[viewHistoryIdx];
        showView(v.view, v.extra);
        updateNavArrows();
    }
}

function historyFwd() {
    if (viewHistoryIdx < viewHistory.length - 1) {
        viewHistoryIdx++;
        const v = viewHistory[viewHistoryIdx];
        showView(v.view, v.extra);
        updateNavArrows();
    }
}

function updateNavArrows() {
    document.getElementById('nav-back').disabled = viewHistoryIdx <= 0;
    document.getElementById('nav-fwd').disabled = viewHistoryIdx >= viewHistory.length - 1;
}

// ─── HOME ─────────────────────────────────────────────────────────────────
async function loadHomeView() {
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    document.getElementById('home-greeting').textContent = greet;

    // Quick play from playlists + liked
    const qpEl = document.getElementById('quick-play');
    const qpItems = [
        {id: 'liked', name: 'Liked Songs', icon: '♥', onclick: "navigate('liked')"},
        ...playlists.slice(0, 5).map(pl => ({
            id: pl.id, name: pl.name, thumb: pl.tracks?.[0]?.thumbnail,
            onclick: `openPlaylist('${pl.id}')`
        }))
    ];
    qpEl.innerHTML = qpItems.map(it => `
    <div class="quick-play-item" onclick="${it.onclick}">
      ${it.thumb ? `<img class="quick-thumb" src="${it.thumb}" alt=""/>` : `<div class="quick-thumb-placeholder">${it.icon || '♫'}</div>`}
      <span class="quick-title">${escHtml(it.name)}</span>
      <button class="qp-play" onclick="event.stopPropagation();${it.onclick.replace('navigate', 'navigate').replace('openPlaylist', 'openAndPlay')}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </button>
    </div>`).join('');

    // Recommendations (cached so revisiting Home is instant)
    const recsEl = document.getElementById('recs-grid');
    if (!window._recsCache) {
        recsEl.innerHTML = skeletonCards(8);
        try {
            window._recsCache = await api('/recommendations');
        } catch {
            recsEl.innerHTML = '<div style="color:var(--text-muted);padding:16px;">Could not load recommendations</div>';
        }
    }
    if (window._recsCache) {
        recsEl.innerHTML = window._recsCache.map((t, i) => trackCard(t, () => playTrack(t, window._recsCache, i))).join('');
    }

    // Recent
    try {
        const recent = await api('/library/recent');
        if (recent.length > 0) {
            document.getElementById('recent-section').style.display = 'block';
            document.getElementById('recent-grid').innerHTML = recent.slice(0, 6).map((t, i) => trackCard(t, () => playTrack(t, recent, i))).join('');
        }
    } catch {
    }
}

function openAndPlay(id) {
    if (id === 'liked') {
        navigate('liked');
        setTimeout(playLiked, 300);
    } else {
        navigate('playlist', id);
        setTimeout(playCurrentPlaylist, 300);
    }
}

// ─── SEARCH ───────────────────────────────────────────────────────────────
function focusSearch() {
    setTimeout(() => document.getElementById('search-input').focus(), 100);
}

function onSearchInput(val) {
    document.getElementById('search-clear').style.display = val ? 'flex' : 'none';
    clearTimeout(searchTimer);
    if (!val.trim()) {
        showSearchIdle();
        return;
    }
    searchTimer = setTimeout(() => doSearch(), 400);
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-clear').style.display = 'none';
    showSearchIdle();
}

function showSearchIdle() {
    document.getElementById('search-idle').style.display = 'flex';
    document.getElementById('search-results-container').style.display = 'none';
}

async function doSearch() {
    const q = document.getElementById('search-input').value.trim();
    if (!q) return;
    searchQuery = q;
    if (currentView !== 'search') navigate('search');
    document.getElementById('search-idle').style.display = 'none';
    document.getElementById('search-results-container').style.display = 'block';
    document.getElementById('search-track-list').innerHTML = `<div class="loading-spinner"><svg class="spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></div>`;
    try {
        const res = await api(`/search?q=${encodeURIComponent(q)}&limit=20`);
        renderSearchTracks(res.songs || []);
        renderSearchAlbums(res.albums || []);
    } catch (e) {
        document.getElementById('search-track-list').innerHTML = `<div style="padding:24px;color:var(--text-muted);">Search failed. Try again.</div>`;
    }
}

function renderSearchTracks(tracks) {
    const el = document.getElementById('search-track-list');
    if (!tracks.length) {
        el.innerHTML = '<div style="padding:16px;color:var(--text-muted);">No results</div>';
        return;
    }
    el.innerHTML = tracks.map((t, i) => trackRow(t, i + 1, tracks)).join('');
}

function renderSearchAlbums(albums) {
    const el = document.getElementById('search-album-grid');
    el.innerHTML = albums.map((a, i) => trackCard(a, () => {
    })).join('');
}

function switchSearchTab(tab) {
    document.querySelectorAll('.search-tab').forEach((el, i) => el.classList.toggle('active', (i === 0) === (tab === 'songs')));
    document.getElementById('search-results-songs').style.display = tab === 'songs' ? 'block' : 'none';
    document.getElementById('search-results-albums').style.display = tab === 'albums' ? 'block' : 'none';
}

// ─── LIKED SONGS ──────────────────────────────────────────────────────────
async function loadLikedView() {
    try {
        const liked = await api('/library/liked');
        likedIds = new Set(liked.map(t => t.id));
        document.getElementById('liked-meta').textContent = `${liked.length} song${liked.length !== 1 ? 's' : ''}`;
        document.getElementById('liked-track-list').innerHTML = liked.map((t, i) => trackRow(t, i + 1, liked, null, true)).join('');
    } catch {
    }
}

async function playLiked() {
    const liked = await api('/library/liked');
    if (!liked.length) return toast('No liked songs yet');
    setQueue(liked, 0);
    loadAndPlay(liked[0]);
}

async function shuffleLiked() {
    const liked = await api('/library/liked');
    if (!liked.length) return toast('No liked songs yet');
    shuffle = true;
    document.getElementById('shuffle-btn').classList.add('active');
    const idx = Math.floor(Math.random() * liked.length);
    setQueue(liked, idx, true);
    loadAndPlay(liked[idx]);
}

// ─── RECENT ───────────────────────────────────────────────────────────────
async function loadRecentView() {
    try {
        const recent = await api('/library/recent');
        document.getElementById('recent-track-list').innerHTML = recent.map((t, i) => trackRow(t, i + 1, recent)).join('');
    } catch {
    }
}

// ─── PLAYLIST VIEW ────────────────────────────────────────────────────────
async function openPlaylist(id) {
    currentPlaylistId = id;
    navigate('playlist', id);
}

async function loadPlaylistView(id) {
    const pl = playlists.find(p => p.id === id) || await api(`/playlists/${id}`);
    if (!pl) return;
    currentPlaylistId = id;
    document.getElementById('pl-view-name').textContent = pl.name;
    document.getElementById('pl-view-desc').textContent = pl.description || '';
    document.getElementById('pl-view-meta').textContent = `${(pl.tracks || []).length} songs`;
    const art = document.getElementById('pl-view-art');
    const firstThumb = pl.tracks?.[0]?.thumbnail;
    if (firstThumb) art.innerHTML = `<img src="${firstThumb}" alt=""/>`;
    else art.textContent = '♫';
    document.getElementById('pl-edit-btn').style.display = pl.owner === currentUser?.username ? 'flex' : 'none';
    document.getElementById('playlist-track-list').innerHTML = (pl.tracks || []).map((t, i) => trackRow(t, i + 1, pl.tracks, id)).join('');
    document.querySelectorAll('#sidebar-playlists .playlist-item').forEach(el => {
        el.classList.toggle('active', el.id === `sidebar-pl-${id}`);
    });
}

async function playCurrentPlaylist() {
    const pl = playlists.find(p => p.id === currentPlaylistId) || await api(`/playlists/${currentPlaylistId}`);
    if (!pl?.tracks?.length) return toast('Playlist is empty');
    setQueue(pl.tracks, 0);
    loadAndPlay(pl.tracks[0]);
}

async function shuffleCurrentPlaylist() {
    const pl = playlists.find(p => p.id === currentPlaylistId) || await api(`/playlists/${currentPlaylistId}`);
    if (!pl?.tracks?.length) return toast('Playlist is empty');
    shuffle = true;
    document.getElementById('shuffle-btn').classList.add('active');
    const idx = Math.floor(Math.random() * pl.tracks.length);
    setQueue(pl.tracks, idx, true);
    loadAndPlay(pl.tracks[idx]);
}

async function editCurrentPlaylist() {
    const pl = playlists.find(p => p.id === currentPlaylistId);
    if (!pl) return;
    openModal('Edit Playlist', `
    <div class="modal-field"><label>Name</label><input id="edit-pl-name" value="${escHtml(pl.name)}"/></div>
    <div class="modal-field"><label>Description</label><textarea id="edit-pl-desc" rows="3">${escHtml(pl.description || '')}</textarea></div>`,
        [
            {label: 'Cancel', onclick: 'closeModal()'},
            {
                label: 'Save', primary: true, onclick: async () => {
                    const name = document.getElementById('edit-pl-name').value.trim();
                    if (!name) return;
                    const updated = await api(`/playlists/${currentPlaylistId}`, 'PUT', {
                        name, description: document.getElementById('edit-pl-desc').value.trim()
                    });
                    const idx = playlists.findIndex(p => p.id === currentPlaylistId);
                    if (idx >= 0) playlists[idx] = updated;
                    closeModal();
                    renderSidebarPlaylists();
                    loadPlaylistView(currentPlaylistId);
                    toast('Playlist updated');
                }
            }
        ]
    );
}

// ─── TRACK ROW / CARD RENDERERS ───────────────────────────────────────────
function trackRow(track, num, playlist, playlistId = null, isLiked = false) {
    const liked = likedIds.has(track.id);
    return `<div class="track-row" id="trow-${track.id}" ondblclick="playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')}, null, -1)" oncontextmenu="openContextMenu(event, ${JSON.stringify(track).replace(/"/g, '&quot;')}, '${playlistId || ''}')">
    <div>
      <span class="track-num">${num}</span>
      <button class="track-play-btn" onclick="playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')}, ${playlist ? JSON.stringify(playlist).replace(/"/g, '&quot;') : 'null'}, ${num - 1})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </button>
    </div>
    <div class="track-info">
      ${track.thumbnail ? `<img class="track-img" src="${track.thumbnail}" alt="" loading="lazy"/>` : `<div class="track-img-placeholder">♫</div>`}
      <div><div class="track-title">${escHtml(track.title || 'Unknown')}</div></div>
    </div>
    <div class="track-artist">${escHtml(track.artist || 'Unknown')}</div>
    <div class="track-duration">${fmtDur(track.duration)}</div>
    <div class="track-actions">
      <button class="track-action-btn ${liked ? 'liked' : ''}" onclick="toggleLike(event, ${JSON.stringify(track).replace(/"/g, '&quot;')})" title="${liked ? 'Unlike' : 'Like'}">
        <svg width="14" height="14" viewBox="0 0 24 24" ${liked ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2"'}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    </div>
  </div>`;
}

function trackCard(track, onClickFn) {
    const fnStr = `playTrackById('${track.id}','${escHtml(track.title || '')}','${escHtml(track.artist || '')}','${track.thumbnail || ''}',${track.duration || 0})`;
    return `<div class="track-card" oncontextmenu="openContextMenu(event,${JSON.stringify(track).replace(/"/g, '&quot;')},'')">
    <div class="card-thumb-wrap">
      ${track.thumbnail ? `<img class="card-thumb" src="${track.thumbnail}" alt="" loading="lazy"/>` : `<div class="card-thumb-placeholder">♫</div>`}
      <button class="card-play" onclick="${fnStr}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </button>
    </div>
    <div class="card-title">${escHtml(track.title || 'Unknown')}</div>
    <div class="card-sub">${escHtml(track.artist || '')}</div>
  </div>`;
}

function skeletonCards(n) {
    return Array(n).fill(0).map(() => `
    <div class="track-card"><div class="skeleton" style="aspect-ratio:1;border-radius:6px;margin-bottom:10px"></div>
    <div class="skeleton" style="height:14px;width:80%;margin-bottom:6px"></div>
    <div class="skeleton" style="height:12px;width:60%"></div></div>`).join('');
}

// ─── PLAYER ───────────────────────────────────────────────────────────────
function setQueue(tracks, idx, shuffled = false) {
    queue = [...tracks];
    queueIndex = idx;
    if (shuffle || shuffled) {
        shuffledOrder = shuffleArray([...Array(queue.length).keys()]);
        const pos = shuffledOrder.indexOf(idx);
        if (pos > 0) {
            const t = shuffledOrder[0];
            shuffledOrder[0] = idx;
            shuffledOrder[pos] = t;
        }
    }
    renderQueuePanel();
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getEffectiveQueue() {
    if (shuffle && shuffledOrder.length === queue.length) return shuffledOrder.map(i => queue[i]);
    return queue;
}

function playTrackById(id, title, artist, thumbnail, dur) {
    const track = {id, title, artist, thumbnail, duration: dur};
    setQueue([track], 0);
    loadAndPlay(track);
}

function playTrack(track, playlist, idx) {
    if (playlist) setQueue(playlist, Math.max(idx, 0));
    else setQueue([track], 0);
    loadAndPlay(track);
}

// Track any in-progress load so we can abort it if user skips quickly
let _loadAbort = null;

async function loadAndPlay(track) {
    // Cancel any previous pending load
    if (_loadAbort) {
        _loadAbort();
        _loadAbort = null;
    }

    currentTrack = track;
    updatePlayerUI(track);
    updateMediaSession(track);

    const ppBtn = document.getElementById('play-pause-btn');
    const SPINNER = `<svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
    const ICONS = (playing) => `<svg id="play-icon"  width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="${playing ? 'display:none' : ''}"><polygon points="5 3 19 12 5 21 5 3"/></svg><svg id="pause-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="${playing ? '' : 'display:none'}"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

    ppBtn.innerHTML = SPINNER;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    // Fetch stream URL and track info
    let streamData;
    try {
        const resp = await fetch(`${BACKEND}/api/stream/${track.id}?token=${encodeURIComponent(token)}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        streamData = await resp.json();
        if (streamData.error) throw new Error(streamData.error);
    } catch (e) {
        ppBtn.innerHTML = ICONS(false);
        isPlaying = false;
        updatePlayPauseIcon();
        toast('Could not load audio — check your connection');
        console.warn('[TuneX] fetch stream error:', e.message);
        return;
    }

    // Update track info if available
    if (streamData.track) {
        track = {...track, ...streamData.track};
    }

    audio.src = streamData.stream_url;
    audio.volume = isMuted ? 0 : volume;

    // Optimistic play: start immediately with 3s timeout instead of waiting
    // This gives instant feedback to user while buffering in background
    const result = await new Promise(resolve => {
        let done = false;
        const finish = (v) => {
            if (done) return;
            done = true;
            cleanup();
            resolve(v);
        };
        const cleanup = () => {
            audio.removeEventListener('canplay', onOk);
            audio.removeEventListener('error', onErr);
            clearTimeout(tid);
        };
        const onOk = () => finish('ok');
        const onErr = () => finish('error:' + (audio.error?.message || 'unknown'));
        // Reduced timeout from 10s to 3s - try to play ASAP
        const tid = setTimeout(() => finish('timeout'), 3000);
        _loadAbort = () => finish('aborted');
        audio.addEventListener('canplay', onOk, {once: true});
        audio.addEventListener('error', onErr, {once: true});
    });

    if (result === 'aborted') return; // user started a different track

    // Attempt play even on timeout - buffer in background
    if (result.startsWith('error')) {
        ppBtn.innerHTML = ICONS(false);
        isPlaying = false;
        updatePlayPauseIcon();
        toast('⚠ Connection issue — retrying...');
        console.warn('[TuneX] loadAndPlay error:', result);
        // Still attempt to play - may work despite error
    }

    // Optimistic play - start immediately
    try {
        await audio.play();
        isPlaying = true;
    } catch (e) {
        console.warn('[TuneX] play() rejected:', e.name, e.message);
        isPlaying = false;
    }

    ppBtn.innerHTML = ICONS(isPlaying);
    updatePlayPauseIcon();

    // Fire-and-forget: log to recently played
    api('/library/recent', 'POST', {
        track: {
            id: track.id, title: track.title, artist: track.artist,
            thumbnail: track.thumbnail, duration: track.duration
        }
    }).catch(() => {
    });

    // Highlight active rows
    document.querySelectorAll('.track-row').forEach(r => r.classList.remove('playing'));
    document.getElementById(`trow-${track.id}`)?.classList.add('playing');
    highlightQueueCurrent();
}

function updatePlayerUI(track) {
    document.getElementById('player-title').textContent = track.title || 'Unknown';
    document.getElementById('player-artist').textContent = track.artist || '—';
    const artEl = document.getElementById('player-art');
    if (track.thumbnail) {
        artEl.outerHTML = `<img id="player-art" class="player-art" src="${track.thumbnail}" alt=""/>`;
    } else {
        if (artEl.tagName === 'IMG') {
            const div = document.createElement('div');
            div.id = 'player-art';
            div.className = 'player-art-placeholder';
            div.textContent = '♫';
            artEl.replaceWith(div);
        }
    }
    // Like button state
    const likeBtn = document.getElementById('player-like-btn');
    const liked = likedIds.has(track.id);
    likeBtn.classList.toggle('active', liked);
    likeBtn.innerHTML = liked
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}

function togglePlay() {
    if (!currentTrack) return;
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
    } else {
        audio.play();
        isPlaying = true;
    }
    updatePlayPauseIcon();
}

function updatePlayPauseIcon() {
    const pi = document.getElementById('play-icon'), pa = document.getElementById('pause-icon');
    if (pi && pa) {
        pi.style.display = isPlaying ? 'none' : 'block';
        pa.style.display = isPlaying ? 'block' : 'none';
    }
}

// ─── Next Track Prefetching ────────────────────────────────────────────────
function prefetchNextTrack() {
    /**Prefetch the next track in queue to enable seamless playback transition*/
    if (queue.length === 0 || queueIndex < 0) return;

    let nextIdx = queueIndex + 1;

    // Handle wrapping based on repeat mode
    if (nextIdx >= queue.length) {
        if (repeat !== 1) return; // Don't prefetch if repeat is off and at end
        nextIdx = 0;
    }

    // Get actual track index (accounting for shuffle)
    const actualIdx = shuffle ? shuffledOrder[nextIdx] : nextIdx;
    if (actualIdx < 0 || actualIdx >= queue.length) return;

    const nextTrack = queue[actualIdx];
    if (!nextTrack || !nextTrack.id) return;

    // Prefetch by making async request - don't wait for response
    fetch(`${BACKEND}/api/stream/${nextTrack.id}?token=${encodeURIComponent(token)}`)
        .catch(() => {
        }); // Silent fail - prefetch is optional
}

function playNext() {
    const q = getEffectiveQueue();
    const curIdx = queue.indexOf(currentTrack) >= 0 ? queue.indexOf(currentTrack) : shuffledOrder?.indexOf(queueIndex);
    let nextIdx = queueIndex + 1;
    if (nextIdx >= queue.length) {
        if (repeat === 1) nextIdx = 0;
        else {
            isPlaying = false;
            updatePlayPauseIcon();
            return;
        }
    }
    queueIndex = nextIdx;
    loadAndPlay(queue[shuffle ? shuffledOrder[nextIdx] : nextIdx]);
}

function playPrev() {
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }
    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
        if (repeat === 1) prevIdx = queue.length - 1; else {
            audio.currentTime = 0;
            return;
        }
    }
    queueIndex = prevIdx;
    loadAndPlay(queue[shuffle ? shuffledOrder[prevIdx] : prevIdx]);
}

function toggleShuffle() {
    shuffle = !shuffle;
    document.getElementById('shuffle-btn').classList.toggle('active', shuffle);
    if (shuffle) {
        shuffledOrder = shuffleArray([...Array(queue.length).keys()]);
    }
    toast(shuffle ? 'Shuffle on' : 'Shuffle off');
}

function cycleRepeat() {
    repeat = (repeat + 1) % 3;
    const btn = document.getElementById('repeat-btn');
    btn.classList.toggle('active', repeat > 0);
    if (repeat === 2) {
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
    } else {
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
    }
    toast(['Repeat off', 'Repeat all', 'Repeat one'][repeat]);
}

// Progress bar
audio.addEventListener('timeupdate', () => {
    if (isSeeking) return;
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-thumb').style.left = pct + '%';
    document.getElementById('time-current').textContent = fmtTime(audio.currentTime);
    document.getElementById('time-total').textContent = fmtTime(audio.duration || 0);
    duration = audio.duration || 0;

    // Prefetch next track when current is 90% done or 30s before end
    const timeRemaining = (audio.duration || 0) - audio.currentTime;
    if ((pct >= 90 || timeRemaining <= 30) && timeRemaining > 0) {
        prefetchNextTrack();
    }
});

audio.addEventListener('ended', () => {
    if (repeat === 2) {
        audio.currentTime = 0;
        audio.play();
    } else playNext();
});

audio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayPauseIcon();
    // Prefetch next track when this one starts playing
    prefetchNextTrack();
});
audio.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayPauseIcon();
});

function startSeek(e) {
    isSeeking = true;
    doSeek(e);

    // Handle both mouse and touch events
    const isTouchEvent = e.type.startsWith('touch');
    const moveEvent = isTouchEvent ? 'touchmove' : 'mousemove';
    const endEvent = isTouchEvent ? 'touchend' : 'mouseup';

    const onMove = (ev) => {
        doSeek(ev);
    };
    const onUp = () => {
        isSeeking = false;
        document.removeEventListener(moveEvent, onMove);
        document.removeEventListener(endEvent, onUp);
    };

    document.addEventListener(moveEvent, onMove, {passive: false});
    document.addEventListener(endEvent, onUp, {once: true});
}

function doSeek(e) {
    const bar = document.getElementById('progress-bar');
    const rect = bar.getBoundingClientRect();

    // Get X coordinate - support both mouse and touch
    let x;
    if (e.type.startsWith('touch')) {
        const touch = e.touches[0] || e.changedTouches[0];
        x = touch.clientX;
    } else {
        x = e.clientX;
    }

    const pct = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    document.getElementById('progress-fill').style.width = (pct * 100) + '%';
    document.getElementById('progress-thumb').style.left = (pct * 100) + '%';
    document.getElementById('time-current').textContent = fmtTime(pct * (duration || 0));
    if (audio.duration) audio.currentTime = pct * audio.duration;
}

// Volume
function startVolumeSeek(e) {
    doVolume(e);

    // Handle both mouse and touch events
    const isTouchEvent = e.type.startsWith('touch');
    const moveEvent = isTouchEvent ? 'touchmove' : 'mousemove';
    const endEvent = isTouchEvent ? 'touchend' : 'mouseup';

    const onMove = (ev) => {
        doVolume(ev);
    };
    const onUp = () => {
        document.removeEventListener(moveEvent, onMove);
        document.removeEventListener(endEvent, onUp);
    };

    document.addEventListener(moveEvent, onMove, {passive: false});
    document.addEventListener(endEvent, onUp, {once: true});
}

function doVolume(e) {
    const bar = document.getElementById('volume-bar');
    const rect = bar.getBoundingClientRect();

    // Get X coordinate - support both mouse and touch
    let x;
    if (e.type.startsWith('touch')) {
        const touch = e.touches[0] || e.changedTouches[0];
        x = touch.clientX;
    } else {
        x = e.clientX;
    }

    const pct = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    setVolumeUI(pct);
}

function setVolumeUI(v) {
    volume = v;
    localStorage.setItem('tunex_vol', v);
    audio.volume = isMuted ? 0 : v;
    document.getElementById('volume-fill').style.width = (v * 100) + '%';
}

function toggleMute() {
    isMuted = !isMuted;
    audio.volume = isMuted ? 0 : volume;
    document.getElementById('mute-btn').classList.toggle('active', isMuted);
}

// ─── LIKE / UNLIKE ────────────────────────────────────────────────────────
async function toggleLike(event, track) {
    event?.stopPropagation();
    const isLiked = likedIds.has(track.id);
    try {
        if (isLiked) {
            await api(`/library/liked/${track.id}`, 'DELETE');
            likedIds.delete(track.id);
            toast('Removed from liked songs');
        } else {
            await api('/library/liked', 'POST', {track});
            likedIds.add(track.id);
            toast('Added to liked songs');
        }
        if (currentTrack?.id === track.id) updatePlayerUI(currentTrack);
        if (currentView === 'liked') loadLikedView();
        // Refresh track row hearts
        const row = document.getElementById(`trow-${track.id}`);
        if (row) row.querySelectorAll('.track-action-btn').forEach(b => {
            const nowLiked = likedIds.has(track.id);
            b.classList.toggle('liked', nowLiked);
            b.innerHTML = nowLiked
                ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
                : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
        });
    } catch (e) {
        toast('Error updating liked songs');
    }
}

async function toggleLikeCurrent() {
    if (currentTrack) await toggleLike(null, currentTrack);
}

// ─── CREATE PLAYLIST ─────────────────────────────────────────────────────
function openCreatePlaylist() {
    openModal('Create Playlist', `
    <div class="modal-field"><label>Name</label><input id="new-pl-name" placeholder="My Playlist" autofocus/></div>
    <div class="modal-field"><label>Description (optional)</label><textarea id="new-pl-desc" rows="3" placeholder="Add an optional description"></textarea></div>`,
        [
            {label: 'Cancel', onclick: 'closeModal()'},
            {
                label: 'Create', primary: true, onclick: async () => {
                    const name = document.getElementById('new-pl-name').value.trim();
                    if (!name) return;
                    const pl = await api('/playlists', 'POST', {
                        name,
                        description: document.getElementById('new-pl-desc').value.trim()
                    });
                    playlists.unshift(pl);
                    renderSidebarPlaylists();
                    closeModal();
                    openPlaylist(pl.id);
                    toast('Playlist created');
                }
            }
        ]
    );
}

// ─── CONTEXT MENU ─────────────────────────────────────────────────────────
function openContextMenu(e, track, playlistId) {
    e.preventDefault();
    ctxTrack = track;
    ctxPlaylistId = playlistId;
    const menu = document.getElementById('context-menu');
    const liked = likedIds.has(track.id);
    document.getElementById('ctx-like').innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" ${liked ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2"'}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    ${liked ? 'Remove from liked' : 'Save to liked songs'}`;
    document.getElementById('ctx-remove').style.display = playlistId ? 'flex' : 'none';
    menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
    menu.classList.add('visible');
}

function ctxPlay() {
    closeContextMenu();
    playTrack(ctxTrack, null, 0);
}

function ctxAddToQueue() {
    closeContextMenu();
    queue.push(ctxTrack);
    renderQueuePanel();
    toast('Added to queue');
}

function ctxToggleLike() {
    closeContextMenu();
    toggleLike(null, ctxTrack);
}

function ctxAddToPlaylist() {
    closeContextMenu();
    const body = `<div style="display:flex;flex-direction:column;gap:4px;">
    ${playlists.map(pl => `<div class="ctx-item" style="padding:8px;cursor:pointer;border-radius:6px;" onmouseenter="this.style.background='var(--bg-elevated)'" onmouseleave="this.style.background=''" onclick="addToPlaylistModal('${pl.id}');closeModal()">${escHtml(pl.name)}</div>`).join('')}
    ${!playlists.length ? '<div style="color:var(--text-muted);padding:8px;">No playlists yet</div>' : ''}
  </div>`;
    openModal('Add to Playlist', body, [{label: 'Cancel', onclick: 'closeModal()'}]);
}

async function addToPlaylistModal(plId) {
    try {
        await api(`/playlists/${plId}/tracks`, 'POST', {track: ctxTrack});
        await loadPlaylists();
        toast('Added to playlist');
    } catch {
        toast('Error adding to playlist');
    }
}

async function ctxRemove() {
    closeContextMenu();
    if (!ctxPlaylistId || !ctxTrack) return;
    await api(`/playlists/${ctxPlaylistId}/tracks/${ctxTrack.id}`, 'DELETE');
    await loadPlaylists();
    loadPlaylistView(ctxPlaylistId);
    toast('Removed from playlist');
}

function closeContextMenu() {
    document.getElementById('context-menu').classList.remove('visible');
}

// ─── QUEUE PANEL ──────────────────────────────────────────────────────────
function toggleQueuePanel() {
    document.getElementById('queue-panel').classList.toggle('open');
}

let _rqpTimer = null;

function renderQueuePanel() {
    // Debounce so rapid queue changes (shuffle, bulk add) only paint once
    clearTimeout(_rqpTimer);
    _rqpTimer = setTimeout(_doRenderQueuePanel, 60);
}

function _doRenderQueuePanel() {
    const list = document.getElementById('queue-list');
    const eff = getEffectiveQueue();
    list.innerHTML = eff.map((t, i) => `
    <div class="queue-item ${t.id === currentTrack?.id ? 'current' : ''}" onclick="queueIndex=${queue.indexOf(t)};loadAndPlay(queue[queueIndex])">
      ${t.thumbnail ? `<img class="queue-item-thumb" src="${t.thumbnail}" alt="" loading="lazy"/>` : `<div class="queue-item-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--bg-elevated);color:var(--text-muted)">♫</div>`}
      <div class="queue-item-info">
        <div class="queue-item-title">${escHtml(t.title || 'Unknown')}</div>
        <div class="queue-item-artist">${escHtml(t.artist || '')}</div>
      </div>
    </div>`).join('');
}

function highlightQueueCurrent() {
    document.querySelectorAll('.queue-item').forEach((el, i) => {
        el.classList.toggle('current', getEffectiveQueue()[i]?.id === currentTrack?.id);
    });
}

// ─── MODAL ────────────────────────────────────────────────────────────────
function openModal(title, body, actions) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-actions').innerHTML = actions.map(a =>
        `<button class="modal-btn ${a.primary ? 'primary' : ''}" onclick="${typeof a.onclick === 'string' ? a.onclick : '(' + a.onclick.toString() + ')()'}">${a.label}</button>`
    ).join('');
    // Re-bind async onclick functions
    document.getElementById('modal-actions').querySelectorAll('button').forEach((btn, i) => {
        if (typeof actions[i].onclick === 'function') btn.onclick = actions[i].onclick;
    });
    document.getElementById('modal-overlay').classList.add('visible');
}

function closeModal(e) {
    if (!e || e.target === document.getElementById('modal-overlay')) document.getElementById('modal-overlay').classList.remove('visible');
}

// ─── USER MENU ────────────────────────────────────────────────────────────
function toggleUserMenu() {
    document.getElementById('user-context-menu').classList.toggle('visible');
    event.stopPropagation();
}

function openSettings() {
    closeContextMenu();
    openModal('Settings', `
    <div style="display:flex;flex-direction:column;gap:20px;">
      <div>
        <div style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:10px;">Import</div>
        <div class="modal-field"><label>YouTube Playlist URL</label><input id="yt-import-url" placeholder="https://youtube.com/playlist?list=..."/></div>
        <button class="modal-btn primary" style="margin-top:8px;width:100%" onclick="doImport()">Import Playlist</button>
      </div>
      <div style="height:1px;background:var(--border)"></div>
      <div>
        <div style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:10px;">🛡️ IP Management (Admin)</div>
        <div class="modal-field"><label>Admin Password</label><input type="password" id="admin-pw" placeholder="Admin password"/></div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
          <button class="modal-btn" onclick="adminLoadStatus()" style="flex:1">View Status</button>
          <button class="modal-btn" onclick="adminGetMyIp()" style="flex:1">My IP</button>
        </div>
        <div id="admin-status-box" style="display:none;margin-top:10px;background:var(--bg-base);border-radius:var(--radius);padding:12px;font-size:0.8rem;font-family:var(--font-mono);white-space:pre-wrap;word-break:break-all;max-height:140px;overflow-y:auto;color:var(--text-secondary)"></div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <input id="admin-ip-input" placeholder="IP address e.g. 1.2.3.4" style="flex:1;background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;color:var(--text-primary);font-family:var(--font-body);font-size:0.85rem;outline:none"/>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
          <button class="modal-btn" style="flex:1;background:#ff6b6b22;border-color:#ff6b6b;color:#ff6b6b" onclick="adminBanIp()">Ban IP</button>
          <button class="modal-btn" style="flex:1" onclick="adminUnbanIp()">Unban IP</button>
          <button class="modal-btn" style="flex:1" onclick="adminWhitelistAdd()">Whitelist</button>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <button class="modal-btn" style="flex:1;background:#f59e0b22;border-color:#f59e0b;color:#f59e0b" onclick="adminSetWhitelistMode(true)">🔒 Whitelist-only mode ON</button>
          <button class="modal-btn" style="flex:1" onclick="adminSetWhitelistMode(false)">🔓 OFF</button>
        </div>
        <div id="admin-msg" style="margin-top:8px;font-size:0.8rem;color:var(--accent);display:none"></div>
      </div>
    </div>`,
        [{label: 'Close', onclick: 'closeModal()'}]
    );
}

async function doImport() {
    const url = document.getElementById('yt-import-url')?.value.trim();
    if (!url) return;
    toast('Importing playlist…');
    try {
        const data = await api('/import/playlist', 'POST', {url});
        const pl = await api('/playlists', 'POST', {name: data.name, description: 'Imported from YouTube'});
        for (const t of data.tracks) {
            await api(`/playlists/${pl.id}/tracks`, 'POST', {track: t});
        }
        await loadPlaylists();
        closeModal();
        openPlaylist(pl.id);
        toast(`Imported "${data.name}" (${data.tracks.length} tracks)`);
    } catch (e) {
        toast('Import failed: ' + (e.message || 'error'));
    }
}

function _adminPw() {
    return document.getElementById('admin-pw')?.value || '';
}

function _adminIp() {
    return document.getElementById('admin-ip-input')?.value.trim() || '';
}

function _adminMsg(msg, color = 'var(--accent)') {
    const el = document.getElementById('admin-msg');
    if (el) {
        el.textContent = msg;
        el.style.color = color;
        el.style.display = 'block';
    }
}

function _adminShowStatus(data) {
    const el = document.getElementById('admin-status-box');
    if (el) {
        el.style.display = 'block';
        el.textContent = JSON.stringify(data, null, 2);
    }
}

async function adminLoadStatus() {
    try {
        const r = await fetch(`${BACKEND}/api/admin/status`, {headers: {'X-Admin-Password': _adminPw()}});
        const data = await r.json();
        if (!r.ok) {
            _adminMsg(data.error || 'Forbidden', '#ff6b6b');
            return;
        }
        _adminShowStatus(data);
    } catch (e) {
        _adminMsg('Error: ' + e.message, '#ff6b6b');
    }
}

async function adminGetMyIp() {
    try {
        // Backend queries ipify.org, so we always get the real public IP
        // (not a LAN address like 192.168.x.x)
        const r = await fetch(`${BACKEND}/api/admin/myip`);
        const data = await r.json();
        document.getElementById('admin-ip-input').value = data.ip;
        _adminMsg(`✓ Public IP: ${data.ip}`);
    } catch (e) {
        _adminMsg('Error: ' + e.message, '#ff6b6b');
    }
}

async function adminBanIp() {
    const ip = _adminIp();
    if (!ip) {
        _adminMsg('Enter an IP first', '#ff6b6b');
        return;
    }
    try {
        const r = await fetch(`${BACKEND}/api/admin/ban`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-Admin-Password': _adminPw()},
            body: JSON.stringify({ip})
        });
        const data = await r.json();
        if (!r.ok) {
            _adminMsg(data.error || 'Forbidden', '#ff6b6b');
            return;
        }
        _adminMsg(`✓ Banned ${ip}`);
        _adminShowStatus(data);
    } catch (e) {
        _adminMsg('Error: ' + e.message, '#ff6b6b');
    }
}

async function adminUnbanIp() {
    const ip = _adminIp();
    if (!ip) {
        _adminMsg('Enter an IP first', '#ff6b6b');
        return;
    }
    try {
        const r = await fetch(`${BACKEND}/api/admin/unban`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-Admin-Password': _adminPw()},
            body: JSON.stringify({ip})
        });
        const data = await r.json();
        if (!r.ok) {
            _adminMsg(data.error || 'Forbidden', '#ff6b6b');
            return;
        }
        _adminMsg(`✓ Unbanned ${ip}`);
        _adminShowStatus(data);
    } catch (e) {
        _adminMsg('Error: ' + e.message, '#ff6b6b');
    }
}

async function adminWhitelistAdd() {
    const ip = _adminIp();
    if (!ip) {
        _adminMsg('Enter an IP first', '#ff6b6b');
        return;
    }
    try {
        const r = await fetch(`${BACKEND}/api/admin/whitelist/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-Admin-Password': _adminPw()},
            body: JSON.stringify({ip})
        });
        const data = await r.json();
        if (!r.ok) {
            _adminMsg(data.error || 'Forbidden', '#ff6b6b');
            return;
        }
        _adminMsg(`✓ Whitelisted ${ip}`);
        _adminShowStatus(data);
    } catch (e) {
        _adminMsg('Error: ' + e.message, '#ff6b6b');
    }
}

async function adminSetWhitelistMode(enabled) {
    try {
        const r = await fetch(`${BACKEND}/api/admin/whitelist-mode`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-Admin-Password': _adminPw()},
            body: JSON.stringify({enabled})
        });
        const data = await r.json();
        if (!r.ok) {
            _adminMsg(data.error || 'Forbidden', '#ff6b6b');
            return;
        }
        _adminMsg(`✓ Whitelist-only mode: ${enabled ? 'ON 🔒' : 'OFF 🔓'}`);
    } catch (e) {
        _adminMsg('Error: ' + e.message, '#ff6b6b');
    }
}

// ─── TOAST ────────────────────────────────────────────────────────────────
function toast(msg, dur = 2500) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => {
        el.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => el.remove(), 300);
    }, dur);
}

// ─── API ──────────────────────────────────────────────────────────────────
async function api(path, method = 'GET', body = null) {
    const opts = {method, headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'}};
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`${BACKEND}/api${path}`, opts);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Request failed');
    return data;
}

async function apiAnon(path, method = 'GET', body = null) {
    const opts = {method, headers: {'Content-Type': 'application/json'}};
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`${BACKEND}/api${path}`, opts);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Request failed');
    return data;
}

// ─── UTILS ────────────────────────────────────────────────────────────────
function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function fmtDur(s) {
    if (!s) return '—';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function escHtml(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ─── GLOBAL EVENTS ────────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
    if (!e.target.closest('#context-menu')) closeContextMenu();
    if (!e.target.closest('#theme-picker') && !e.target.closest('#theme-btn')) document.getElementById('theme-picker').classList.remove('visible');
    if (!e.target.closest('#user-context-menu') && !e.target.closest('#user-menu-btn')) document.getElementById('user-context-menu').classList.remove('visible');
});

document.getElementById('main-content').addEventListener('scroll', (e) => {
    document.getElementById('main-topbar').classList.toggle('scrolled', e.target.scrollTop > 10);
});

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
    }
    if (e.code === 'ArrowRight' && e.altKey) playNext();
    if (e.code === 'ArrowLeft' && e.altKey) playPrev();
});

// When user leaves the page while waiting for the server to wake,
// hand off polling to the Service Worker so they get notified in background
let _wakeScreenActive = false;
document.addEventListener('visibilitychange', () => {
    if (_wakeScreenActive) {
        if (document.hidden) {
            // Page went to background during wake — start SW background ping
            if (Notification.permission === 'granted') {
                startSwWakeWatch();
            }
        } else {
            // Page came back — stop SW polling, main thread has it
            stopSwWakeWatch();
        }
    }
});

// ─── MEDIA SESSION (lock screen / notification controls) ──────────────────
// This is the standard Web API that powers Android/iOS lock screen controls,
// Bluetooth headphone buttons, CarPlay, and the system media overlay.
function updateMediaSession(track) {
    if (!('mediaSession' in navigator)) return;

    // Set now-playing metadata — shows in Android shade, iOS lock screen, etc.
    const artwork = [];
    if (track.thumbnail) {
        artwork.push({src: track.thumbnail, sizes: '512x512', type: 'image/jpeg'});
        artwork.push({src: track.thumbnail, sizes: '256x256', type: 'image/jpeg'});
    }
    navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Unknown',
        artist: track.artist || 'TuneX',
        album: 'TuneX',
        artwork,
    });

    // Wire up hardware/OS buttons → our player functions
    navigator.mediaSession.setActionHandler('play', () => {
        audio.play();
        isPlaying = true;
        updatePlayPauseIcon();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
        audio.pause();
        isPlaying = false;
        updatePlayPauseIcon();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    navigator.mediaSession.setActionHandler('seekto', (d) => {
        if (audio.duration) audio.currentTime = d.seekTime;
    });
    navigator.mediaSession.setActionHandler('seekbackward', (d) => {
        audio.currentTime = Math.max(0, audio.currentTime - (d.seekOffset || 10));
    });
    navigator.mediaSession.setActionHandler('seekforward', (d) => {
        audio.currentTime = Math.min(audio.duration, audio.currentTime + (d.seekOffset || 10));
    });

    navigator.mediaSession.playbackState = 'playing';
}

function syncMediaSessionPosition() {
    if (!('mediaSession' in navigator) || !audio.duration) return;
    try {
        navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: audio.currentTime,
        });
    } catch {
    }
}

// Update position every 5s so the lock-screen seek bar stays accurate
setInterval(syncMediaSessionPosition, 5000);
audio.addEventListener('play', () => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});
audio.addEventListener('pause', () => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
});

// ─── PUSH NOTIFICATIONS (server wake-up ping) ─────────────────────────────
// We use the Notifications API (no server push needed) — a SW polls /api/ping
// and fires a local notification once the server responds.
let notifWatcherActive = false;
let notifAskedBefore = !!localStorage.getItem('tunex_notif_asked');

function maybeShowNotifAsk() {
    // Only show if: not asked before, permission not already granted/denied,
    // AND the browser supports notifications
    if (notifAskedBefore) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
    setTimeout(() => {
        document.getElementById('notif-ask').style.display = 'block';
    }, 800); // small delay so it appears after progress bar
}

async function askNotifPermission() {
    localStorage.setItem('tunex_notif_asked', '1');
    notifAskedBefore = true;
    document.getElementById('notif-ask').style.display = 'none';
    try {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
            localStorage.setItem('tunex_notif_enabled', '1');
            toast('Notifications enabled');
            // Register service worker for background pinging
            registerServiceWorker();
        } else {
            toast('Notification permission denied');
        }
    } catch (e) {
        console.warn('Notification permission error:', e);
    }
}

function dismissNotifAsk() {
    localStorage.setItem('tunex_notif_asked', '1');
    notifAskedBefore = true;
    document.getElementById('notif-ask').style.display = 'none';
}

async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
        const reg = await navigator.serviceWorker.register('tuneX/service worker/sw.js');
        console.log('TuneX SW registered');
        // Listen for SERVER_READY message from SW (when tab was in background)
        navigator.serviceWorker.addEventListener('message', (e) => {
            if (e.data?.type === 'SERVER_READY') {
                toast('Server is ready!');
            }
        });
        return reg;
    } catch (e) {
        console.warn('SW registration failed:', e);
    }
}

// Tell SW to start background polling (called when page goes to background during wake)
async function startSwWakeWatch() {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    if (reg.active) {
        reg.active.postMessage({type: 'START_WAKE_WATCH', backendUrl: BACKEND, token: token || ''});
    }
}

function stopSwWakeWatch() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
        if (reg.active) reg.active.postMessage({type: 'STOP_WAKE_WATCH'});
    });
}

// Fire a local notification when server wakes up (called from wakeServer)
function notifyServerReady() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!localStorage.getItem('tunex_notif_enabled')) return;
    try {
        new Notification('TuneX is ready!', {
            body: 'The server is online — tap to start listening.',
            icon: 'tuneX/icons/icon-192.png',
            badge: 'tuneX/icons/icon-512.png',
            tag: 'tunex-ready',
            renotify: false,
        });
    } catch (e) {
        console.warn('Notification failed:', e);
    }
}

// ─── START ────────────────────────────────────────────────────────────────
init();
