// ══════════════════════════════════════════
//  HOME — Lógica Principal (Seções e UI)
// ══════════════════════════════════════════

// ── Init ────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;

  // Verifica se a chave TMDB está configurada
  const tmdbKey = localStorage.getItem('heken_tmdb_key');
  if (!tmdbKey || tmdbKey.length < 10) {
    showApiKeyBanner();
    return;
  }

  initUser();
  initNavbar();
  
  if (typeof initSearch === 'function') initSearch();
  if (typeof initModalClose === 'function') initModalClose();

  await Promise.all([
    (typeof loadHero === 'function' ? loadHero() : Promise.resolve()),
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

  const myList = MyListManager.get();
  if (myList.length > 0 && !SECTIONS.find(s => s.id === 'row-mylist')) {
    SECTIONS.unshift({ id: 'row-mylist', label: '📌 Minha Lista', fetch: async () => ({results: MyListManager.get()}), type: 'mixed' });
  }

  const history = HistoryManager.get();
  if (history.length > 0 && !SECTIONS.find(s => s.id === 'row-history')) {
    SECTIONS.unshift({ id: 'row-history', label: '⏱️ Continue Assistindo', fetch: async () => ({results: HistoryManager.get()}), type: 'mixed' });
  }

  // Renderiza esqueletos vazios primeiro
  container.innerHTML = SECTIONS.map(s => buildSectionSkeleton(s)).join('');

  // Lazy loading observer para carregar os itens reais sob demanda
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sectionId = entry.target.id;
        const section = SECTIONS.find(s => s.id === sectionId);
        if (section && !section.loaded) {
          section.loaded = true;
          loadSection(section);
        }
        obs.unobserve(entry.target);
      }
    });
  }, { rootMargin: '300px' });

  // Começa a observar todas as seções recém renderizadas
  SECTIONS.forEach(s => {
    s.loaded = false;
    const el = document.getElementById(s.id);
    if (el) observer.observe(el);
  });
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
