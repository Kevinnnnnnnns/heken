// ══════════════════════════════════════════
//  PLAYER — Lógica do player de vídeo
// ══════════════════════════════════════════

let currentId      = null;
let currentType    = 'movie';
let currentSource  = 0;
let currentSeason  = 1;
let currentEpisode = 1;
let totalSeasons   = 1;
let controlsTimeout = null;
let details        = null;

// ── Init ────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;

  const params = new URLSearchParams(window.location.search);
  currentId   = params.get('id');
  currentType = params.get('type') || 'movie';
  const title = params.get('title') || '';
  const backdrop = params.get('backdrop');

  if (!currentId) {
    window.location.href = 'home.html';
    return;
  }

  initUser();
  initControls();
  setHeaderTitle(title);

  // Carrega detalhes e inicia o player
  await loadDetails();
  loadPlayer();
});

// ── Usuário ─────────────────────────────
function initUser() {
  const session = Auth.getSession();
  if (!session) return;
  const initials = session.name.slice(0, 2).toUpperCase();
  document.querySelectorAll('.avatar-initials').forEach(el => el.textContent = initials);
}

// ── Header ──────────────────────────────
function setHeaderTitle(title) {
  const el = document.getElementById('playerMovieTitle');
  if (el) el.textContent = title;
}

// ── Detalhes do filme/série ──────────────
async function loadDetails() {
  try {
    details = await TMDB.details(currentId, currentType);

    const title    = details.title || details.name || 'Sem título';
    const rating   = TMDB.formatRating(details.vote_average);
    const year     = TMDB.formatYear(details.release_date || details.first_air_date);
    const overview = details.overview || '';
    const genres   = (details.genres || []).map(g => g.name).slice(0, 3).join(' · ');
    const runtime  = TMDB.formatRuntime(details.runtime || details.episode_run_time?.[0]);

    // Panel info
    setEl('panelTitle',    title);
    setEl('panelRating',   `⭐ ${rating}`);
    setEl('panelYear',     year);
    setEl('panelGenre',    genres);
    setEl('panelOverview', overview);
    setEl('playerMovieTitle', title);
    setEl('playerMovieSubtitle', `${year}${runtime ? ' · ' + runtime : ''}`);

    // Backdrop do panel
    const backdrop = details.backdrop_path;
    if (backdrop) {
      document.getElementById('playerBg')?.style.setProperty(
        'background-image', `url('${TMDB.backdrop(backdrop)}')`
      );
    }

    // TV: monta selects de temporada/episódio
    if (currentType === 'tv') {
      totalSeasons = details.number_of_seasons || 1;
      buildTvSelectors();
    } else {
      document.getElementById('tvSelectors')?.style.setProperty('display', 'none');
    }

    // Fontes de streaming
    buildSourceBtns();

  } catch(e) {
    console.error('Details failed:', e);
  }
}

// ── TV Selectors ─────────────────────────
function buildTvSelectors() {
  const wrap = document.getElementById('tvSelectors');
  if (!wrap) return;
  wrap.style.display = 'flex';

  const seasonSel = document.getElementById('seasonSelect');
  const epSel     = document.getElementById('episodeSelect');
  if (!seasonSel || !epSel) return;

  seasonSel.innerHTML = Array.from({ length: totalSeasons }, (_, i) =>
    `<option value="${i+1}">Temp. ${i+1}</option>`
  ).join('');

  seasonSel.addEventListener('change', async () => {
    currentSeason  = parseInt(seasonSel.value);
    currentEpisode = 1;
    await buildEpisodes();
    reloadFrame();
  });

  epSel.addEventListener('change', () => {
    currentEpisode = parseInt(epSel.value);
    reloadFrame();
  });

  buildEpisodes();
}

async function buildEpisodes() {
  const epSel = document.getElementById('episodeSelect');
  if (!epSel) return;
  try {
    const season = await TMDB.seasons(currentId, currentSeason);
    const eps    = season.episodes || [];
    epSel.innerHTML = eps.map(ep =>
      `<option value="${ep.episode_number}">Ep. ${ep.episode_number}: ${ep.name}</option>`
    ).join('');
    currentEpisode = 1;
    epSel.value    = '1';
  } catch {
    epSel.innerHTML = Array.from({ length: 20 }, (_, i) =>
      `<option value="${i+1}">Episódio ${i+1}</option>`
    ).join('');
  }
}

// ── Source buttons ───────────────────────
function buildSourceBtns() {
  const wrap = document.getElementById('sourceBtns');
  if (!wrap) return;
  const count = TMDB.streamSources(currentType);
  wrap.innerHTML = Array.from({ length: count }, (_, i) =>
    `<button class="source-btn${i===0?' active':''}" onclick="switchSource(${i})">Fonte ${i+1}</button>`
  ).join('');
}

function switchSource(i) {
  currentSource = i;
  document.querySelectorAll('.source-btn').forEach((b, idx) =>
    b.classList.toggle('active', idx === i)
  );
  reloadFrame();
}

// ── Player ──────────────────────────────
function loadPlayer() {
  const frame   = document.getElementById('movieFrame');
  const loading = document.getElementById('playerLoading');

  if (!frame) return;

  const url = TMDB.streamUrl(currentId, currentType, currentSeason, currentEpisode, currentSource);
  frame.src = url;

  // Mostra loading até o iframe carregar
  frame.addEventListener('load', () => {
    setTimeout(() => {
      loading?.classList.add('hidden');
    }, 1200);
  }, { once: true });

  // Timeout de segurança
  setTimeout(() => loading?.classList.add('hidden'), 8000);
}

function reloadFrame() {
  const frame   = document.getElementById('movieFrame');
  const loading = document.getElementById('playerLoading');
  if (!frame) return;

  loading?.classList.remove('hidden');
  const url = TMDB.streamUrl(currentId, currentType, currentSeason, currentEpisode, currentSource);
  frame.src = url;

  frame.addEventListener('load', () => {
    setTimeout(() => loading?.classList.add('hidden'), 1000);
  }, { once: true });

  setTimeout(() => loading?.classList.add('hidden'), 8000);
}

// ── Controls auto-hide ───────────────────
function initControls() {
  const page = document.getElementById('playerPage');
  if (!page) return;

  showControls();

  document.addEventListener('mousemove', showControls);
  document.addEventListener('click',     showControls);
  document.addEventListener('keydown', e => {
    showControls();
    if (e.key === 'Escape') goBack();
    if (e.key === 'F') toggleFullscreen();
  });

  // Back button
  document.getElementById('backBtn')?.addEventListener('click', goBack);
  document.getElementById('unavailableBack')?.addEventListener('click', goBack);
  document.getElementById('retryBtn')?.addEventListener('click', () => {
    currentSource = (currentSource + 1) % TMDB.streamSources(currentType);
    buildSourceBtns();
    reloadFrame();
  });
}

let hideTimer = null;
function showControls() {
  const page = document.getElementById('playerPage');
  page?.classList.remove('controls-hidden');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => page?.classList.add('controls-hidden'), 4000);
}

// ── Navigation ───────────────────────────
function goBack() {
  window.history.length > 1 ? window.history.back() : (window.location.href = 'home.html');
}

// ── Fullscreen ───────────────────────────
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

// ── Helpers ──────────────────────────────
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
