// ══════════════════════════════════════════
//  HOME — Lógica da página principal
// ══════════════════════════════════════════

let heroMovies   = [];
let heroIndex    = 0;
let heroTimer    = null;
let searchDebounce = null;

// ── Init ────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;

  // Verifica se a chave TMDB está configurada
  const tmdbKey = localStorage.getItem('netflixo_tmdb_key');
  if (!tmdbKey || tmdbKey.length < 10) {
    showApiKeyBanner();
    return;
  }

  initUser();
  initNavbar();
  initSearch();
  initModalClose();

  await Promise.all([
    loadHero(),
    loadAllSections(),
  ]);
});

// ── Usuário ─────────────────────────────
function initUser() {
  const session = Auth.getSession();
  if (!session) return;

  const initials = session.name.slice(0, 2).toUpperCase();
  document.querySelectorAll('.avatar-initials').forEach(el => el.textContent = initials);
  document.querySelectorAll('.avatar-name').forEach(el => el.textContent = session.name);
  document.querySelectorAll('.avatar-role').forEach(el => el.textContent = session.role || 'Usuário');

  document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());
}

// ── Navbar scroll ───────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// ── Hero Banner ─────────────────────────
async function loadHero() {
  try {
    const data = await TMDB.trending('movie', 'week');
    heroMovies = data.results.slice(0, 5);
    renderHero(heroMovies[0]);
    renderHeroDots();
    startHeroTimer();
  } catch (e) {
    if (e.message === 'NO_API_KEY' || e.message === 'INVALID_API_KEY') {
      showApiKeyBanner();
    } else {
      console.error('Hero failed:', e);
      document.getElementById('heroTitle').textContent = 'Erro ao carregar';
    }
  }
}

function renderHero(movie) {
  if (!movie) return;
  const bg    = document.getElementById('heroBg');
  const title = document.getElementById('heroTitle');
  const over  = document.getElementById('heroOverview');
  const year  = document.getElementById('heroYear');
  const rat   = document.getElementById('heroRating');
  const play  = document.getElementById('heroPlay');
  const more  = document.getElementById('heroMore');

  if (bg)    bg.style.backgroundImage = `url('${TMDB.backdrop(movie.backdrop_path)}')`;
  if (title) title.textContent = movie.title || movie.name || 'Sem título';
  if (over)  over.textContent  = movie.overview || 'Sem descrição disponível.';
  if (year)  year.textContent  = TMDB.formatYear(movie.release_date || movie.first_air_date);
  if (rat)   rat.textContent   = TMDB.formatRating(movie.vote_average);

  if (play) {
    play.onclick = () => openPlayer(movie.id, 'movie', movie.title || movie.name, movie.backdrop_path);
  }
  if (more) {
    more.onclick = () => openModal(movie.id, 'movie');
  }
}

function renderHeroDots() {
  const wrap = document.getElementById('heroDots');
  if (!wrap) return;
  wrap.innerHTML = heroMovies.map((_, i) =>
    `<div class="hero-dot-item${i===0?' active':''}" data-i="${i}" onclick="goHero(${i})"></div>`
  ).join('');
}

function goHero(i) {
  heroIndex = i;
  renderHero(heroMovies[i]);
  document.querySelectorAll('.hero-dot-item').forEach((d, idx) =>
    d.classList.toggle('active', idx === i)
  );
  resetHeroTimer();
}

function startHeroTimer() {
  heroTimer = setInterval(() => {
    goHero((heroIndex + 1) % heroMovies.length);
  }, 6000);
}

function resetHeroTimer() {
  clearInterval(heroTimer);
  startHeroTimer();
}

// ── Sections ────────────────────────────
const SECTIONS = [
  { id: 'row-trending-movie', label: '🔥 Em Alta Agora',          fetch: () => TMDB.trending('movie','week'),        type:'movie' },
  { id: 'row-trending-tv',   label: '📺 Séries em Alta',          fetch: () => TMDB.trending('tv','week'),           type:'tv'    },
  { id: 'row-nowplaying',    label: '🆕 Lançamentos no Cinema',   fetch: () => TMDB.nowPlaying(),                    type:'movie' },
  { id: 'row-action',        label: '💥 Ação & Aventura',         fetch: () => TMDB.byGenre(GENRE_IDS.action),       type:'movie' },
  { id: 'row-comedy',        label: '😂 Comédia',                 fetch: () => TMDB.byGenre(GENRE_IDS.comedy),       type:'movie' },
  { id: 'row-horror',        label: '👻 Terror',                  fetch: () => TMDB.byGenre(GENRE_IDS.horror),       type:'movie' },
  { id: 'row-scifi',         label: '🚀 Ficção Científica',       fetch: () => TMDB.byGenre(GENRE_IDS.scifi),        type:'movie' },
  { id: 'row-documentary',   label: '🎥 Documentários',           fetch: () => TMDB.byGenre(GENRE_IDS.documentary),  type:'movie' },
  { id: 'row-toprated',      label: '⭐ Melhores de Todos os Tempos', fetch: () => TMDB.topRated('movie'),           type:'movie' },
  { id: 'row-toprated-tv',   label: '🏆 Séries Mais Bem Avaliadas',  fetch: () => TMDB.topRated('tv'),              type:'tv'    },
  { id: 'row-animation',     label: '🎨 Animação',                fetch: () => TMDB.byGenre(GENRE_IDS.animation),   type:'movie' },
];

async function loadAllSections() {
  const container = document.getElementById('contentArea');
  if (!container) return;

  // Renderiza esqueletos
  container.innerHTML = SECTIONS.map(s => buildSectionSkeleton(s)).join('');

  // Carrega cada seção
  await Promise.all(SECTIONS.map(s => loadSection(s)));
}

function buildSectionSkeleton(section) {
  const skeletons = Array(7).fill(0).map(() =>
    `<div class="skeleton-card skeleton"><div class="sk-img skeleton" style="aspect-ratio:16/9;"></div></div>`
  ).join('');

  return `
    <section class="content-section" id="${section.id}">
      <div class="section-header">
        <h2 class="section-title">${section.label} <span class="arrow">›</span></h2>
        <span class="see-all">Ver tudo</span>
      </div>
      <div class="carousel-wrap">
        <button class="carousel-btn carousel-btn-prev" onclick="scrollCarousel('${section.id}',-1)">&#8249;</button>
        <div class="carousel" id="carousel-${section.id}">${skeletons}</div>
        <button class="carousel-btn carousel-btn-next" onclick="scrollCarousel('${section.id}',1)">&#8250;</button>
      </div>
    </section>`;
}

async function loadSection(section) {
  try {
    const data    = await section.fetch();
    const movies  = data.results || [];
    const carousel = document.getElementById(`carousel-${section.id}`);
    if (!carousel) return;
    carousel.innerHTML = movies.map((m, i) => buildCard(m, section.type, i)).join('');
  } catch (e) {
    if (e.message === 'NO_API_KEY' || e.message === 'INVALID_API_KEY') {
      // já tratado pelo hero
    } else {
      console.error(`Section ${section.id} failed:`, e);
    }
  }
}

// ── Movie Card ──────────────────────────
function buildCard(item, type, rank) {
  const title     = item.title || item.name || 'Sem título';
  const posterUrl = TMDB.poster(item.poster_path);
  const rating    = TMDB.formatRating(item.vote_average);
  const year      = TMDB.formatYear(item.release_date || item.first_air_date);
  const match     = Math.floor(item.vote_average * 10);

  const img = posterUrl
    ? `<img class="card-img" src="${posterUrl}" alt="${title}" loading="lazy" onerror="this.parentElement.innerHTML=cardPlaceholder('${escHtml(title)}')">`
    : cardPlaceholder(title);

  return `
    <div class="movie-card" tabindex="0"
      onclick="openPlayer(${item.id},'${type}','${escAttr(title)}','${item.backdrop_path||''}')"
      onkeydown="if(event.key==='Enter')openPlayer(${item.id},'${type}','${escAttr(title)}','${item.backdrop_path||''}')"
      role="button" aria-label="Assistir ${title}">
      <div class="card-img-wrap">
        ${img}
        ${rank < 10 ? `<div class="card-rank">${rank+1}</div>` : ''}
      </div>
      <div class="card-hover-info">
        <div class="card-actions">
          <button class="card-btn card-btn-play" onclick="event.stopPropagation();openPlayer(${item.id},'${type}','${escAttr(title)}','${item.backdrop_path||''}')" title="Assistir">▶</button>
          <button class="card-btn card-btn-icon" onclick="event.stopPropagation();openModal(${item.id},'${type}')" title="Mais info">＋</button>
          <button class="card-btn card-btn-chevron" onclick="event.stopPropagation();openModal(${item.id},'${type}')" title="Detalhes">⌄</button>
        </div>
        <div class="card-meta">
          <span class="card-match">${match}% relevante</span>
          <span class="card-year">${year}</span>
        </div>
        <div class="card-title-text">${title}</div>
        <div class="card-genres">
          <span class="card-genre">${type === 'tv' ? 'Série' : 'Filme'}</span>
          <span class="card-genre">⭐ ${rating}</span>
        </div>
      </div>
    </div>`;
}

function cardPlaceholder(title) {
  return `<div class="card-placeholder">
    <div class="ph-icon">🎬</div>
    <div class="ph-title">${escHtml(title)}</div>
  </div>`;
}

// ── Carousel scroll ──────────────────────
function scrollCarousel(sectionId, dir) {
  const c = document.getElementById(`carousel-${sectionId}`);
  if (c) c.scrollBy({ left: dir * c.clientWidth * 0.8, behavior: 'smooth' });
}

// ── Search ──────────────────────────────
function initSearch() {
  const toggleBtn   = document.getElementById('searchToggle');
  const closeBtn    = document.getElementById('searchClose');
  const searchBar   = document.getElementById('searchBar');
  const input       = document.getElementById('searchInput');
  const results     = document.getElementById('searchResults');
  const contentArea = document.getElementById('contentArea');

  toggleBtn?.addEventListener('click', () => {
    searchBar.classList.add('open');
    input.focus();
  });

  closeBtn?.addEventListener('click', () => {
    searchBar.classList.remove('open');
    input.value = '';
    results.classList.remove('visible');
    if (contentArea) contentArea.style.display = '';
    heroEl()?.style.setProperty('display','');
  });

  input?.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    const q = input.value.trim();
    if (!q) {
      results.classList.remove('visible');
      if (contentArea) contentArea.style.display = '';
      heroEl()?.style.setProperty('display','');
      return;
    }
    searchDebounce = setTimeout(() => doSearch(q), 400);
  });
}

function heroEl() { return document.getElementById('hero'); }

async function doSearch(query) {
  const results     = document.getElementById('searchResults');
  const contentArea = document.getElementById('contentArea');
  const hero        = heroEl();

  results.classList.add('visible');
  if (contentArea) contentArea.style.display = 'none';
  if (hero) hero.style.display = 'none';

  const titleEl = document.getElementById('searchResultsTitle');
  const grid    = document.getElementById('searchGrid');

  if (titleEl) titleEl.innerHTML = `Resultados para <strong>"${escHtml(query)}"</strong>`;
  if (grid) grid.innerHTML = Array(12).fill(`<div class="skeleton-card skeleton"><div class="sk-img skeleton" style="aspect-ratio:2/3;height:220px;"></div></div>`).join('');

  try {
    const data = await TMDB.search(query);
    const items = data.results.filter(i => i.media_type !== 'person' && (i.poster_path || i.backdrop_path));

    if (!items.length) {
      grid.innerHTML = `<div style="color:var(--text-muted);grid-column:1/-1;padding:40px 0;text-align:center;font-size:1rem;">
        Nenhum resultado encontrado para "<strong style="color:white">${escHtml(query)}</strong>"
      </div>`;
      return;
    }

    grid.innerHTML = items.map(item => {
      const type  = item.media_type === 'tv' ? 'tv' : 'movie';
      const title = item.title || item.name || '';
      const img   = TMDB.poster(item.poster_path, 'w342') || TMDB.backdrop(item.backdrop_path, 'w500');

      return `<div class="movie-card" onclick="openPlayer(${item.id},'${type}','${escAttr(title)}','${item.backdrop_path||''}')"
        style="width:100%" role="button" tabindex="0">
        <div class="card-img-wrap" style="aspect-ratio:2/3;height:220px;">
          ${img ? `<img class="card-img" src="${img}" alt="${escHtml(title)}" loading="lazy" style="object-position:top">` : cardPlaceholder(title)}
        </div>
        <div class="card-hover-info">
          <div class="card-actions">
            <button class="card-btn card-btn-play" onclick="event.stopPropagation();openPlayer(${item.id},'${type}','${escAttr(title)}','${item.backdrop_path||''}')">▶</button>
          </div>
          <div class="card-title-text">${escHtml(title)}</div>
          <div class="card-genres"><span class="card-genre">${type==='tv'?'Série':'Filme'}</span><span class="card-genre">⭐ ${TMDB.formatRating(item.vote_average)}</span></div>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    console.error('Search failed:', e);
    grid.innerHTML = `<div style="color:var(--text-muted);grid-column:1/-1;padding:40px 0;text-align:center">Erro ao buscar. Tente novamente.</div>`;
  }
}

// ── Player nav ──────────────────────────
function openPlayer(id, type, title, backdrop) {
  const params = new URLSearchParams({ id, type, title: title||'', backdrop: backdrop||'' });
  window.location.href = `player.html?${params}`;
}

// ── Modal ───────────────────────────────
function initModalClose() {
  const overlay = document.getElementById('modalOverlay');
  overlay?.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

async function openModal(id, type) {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Reset
  overlay.querySelector('.modal-title')?.replaceChildren();
  overlay.querySelector('.modal-overview')?.replaceChildren();

  try {
    const [details] = await Promise.all([TMDB.details(id, type)]);
    const title    = details.title || details.name || '';
    const overview = details.overview || 'Sem descrição disponível.';
    const year     = TMDB.formatYear(details.release_date || details.first_air_date);
    const rating   = TMDB.formatRating(details.vote_average);
    const runtime  = TMDB.formatRuntime(details.runtime || (details.episode_run_time?.[0]));
    const genres   = (details.genres || []).map(g => g.name);
    const backdrop = TMDB.backdrop(details.backdrop_path, 'w1280');

    const heroImg  = overlay.querySelector('.modal-hero-img');
    if (heroImg && backdrop) heroImg.src = backdrop;

    const t = overlay.querySelector('.modal-title');
    const o = overlay.querySelector('.modal-overview');
    const m = overlay.querySelector('.modal-meta');
    const g = overlay.querySelector('.modal-tags');
    const playBtn = overlay.querySelector('.modal-play-btn');
    const moreBtn = overlay.querySelector('.modal-more-btn');

    if (t) t.textContent  = title;
    if (o) o.textContent  = overview;
    if (m) m.innerHTML    = `
      <span class="modal-rating">⭐ ${rating}</span>
      <span class="modal-year">${year}</span>
      ${runtime ? `<span class="modal-runtime">${runtime}</span>` : ''}
      <span style="color:var(--text-muted);font-size:.8rem">${type==='tv'?'Série':'Filme'}</span>
    `;
    if (g) g.innerHTML    = genres.map(gn => `<span class="modal-tag">${gn}</span>`).join('');
    if (playBtn) playBtn.onclick = () => { closeModal(); openPlayer(id, type, title, details.backdrop_path); };
    if (moreBtn) moreBtn.onclick = () => { closeModal(); openPlayer(id, type, title, details.backdrop_path); };
  } catch(e) {
    console.error('Modal failed:', e);
  }
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay?.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Helpers ──────────────────────────────
function escHtml(str)  { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(str)  { return String(str).replace(/'/g,"\\'"); }

function showApiKeyBanner() {
  // Esconde hero e content
  const hero = heroEl();
  const content = document.getElementById('contentArea');
  if (hero) hero.style.display = 'none';
  if (content) content.innerHTML = '';

  // Cria banner
  const banner = document.createElement('div');
  banner.style.cssText = `
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 40px 24px;
  `;
  banner.innerHTML = `
    <div style="font-size:3rem;margin-bottom:20px">🔑</div>
    <h2 style="font-size:1.8rem;font-weight:800;margin-bottom:12px">Configure sua API Key</h2>
    <p style="color:var(--text-secondary);font-size:1rem;max-width:480px;line-height:1.7;margin-bottom:32px">
      Para carregar os filmes e séries, você precisa de uma chave TMDB gratuita.
      É rápido, leva menos de 2 minutos!
    </p>
    <button onclick="window.location.href='setup.html'" style="
      padding: 16px 36px;
      background: var(--red);
      color: white;
      font-size: 1rem;
      font-weight: 700;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.25s;
    " onmouseover="this.style.background='#f40612'" onmouseout="this.style.background='var(--red)'">
      🎬 Configurar agora
    </button>
    <p style="margin-top:16px;color:var(--text-muted);font-size:0.82rem">
      Já tem a chave? Acesse <a href="setup.html" style="color:var(--red)">setup.html</a> para inserir.
    </p>
  `;
  document.body.appendChild(banner);
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 300); }, 3000);
}
