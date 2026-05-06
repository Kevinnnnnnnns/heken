// ══════════════════════════════════════════
//  EXPLORE — Lógica da página de exploração
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  initUser();
  initNavbar();
  initSearch();
  initModalClose();

  const btn = document.getElementById('btnFilterSearch');
  btn?.addEventListener('click', performDiscover);

  // Carrega inicialmente
  performDiscover();
});

function initUser() {
  const session = Auth.getSession();
  if (!session) return;
  const initials = session.name.slice(0, 2).toUpperCase();
  document.querySelectorAll('.avatar-initials').forEach(el => el.textContent = initials);
  document.querySelectorAll('.avatar-name').forEach(el => el.textContent = session.name);
  document.querySelectorAll('.avatar-role').forEach(el => el.textContent = session.role || 'Usuário');
  document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());
}

function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

async function performDiscover() {
  const grid = document.getElementById('exploreGrid');
  if (!grid) return;

  const type = document.getElementById('filterType').value;
  const genre = document.getElementById('filterGenre').value;
  const year = document.getElementById('filterYear').value;
  const sort = document.getElementById('filterSort').value;

  const params = { sort_by: sort };
  if (genre) params.with_genres = genre;
  if (year) {
    if (year.endsWith('0')) {
      // Ex: 2020s -> 2020-01-01 to 2029-12-31
      const y = parseInt(year);
      if (type === 'movie') {
        params['primary_release_date.gte'] = `${y}-01-01`;
        params['primary_release_date.lte'] = `${y+9}-12-31`;
      } else {
        params['first_air_date.gte'] = `${y}-01-01`;
        params['first_air_date.lte'] = `${y+9}-12-31`;
      }
    } else {
      if (type === 'movie') params.primary_release_year = year;
      else params.first_air_date_year = year;
    }
  }

  if (sort === 'vote_average.desc') {
    params['vote_count.gte'] = 300; // Evita filmes com nota 10 mas apenas 1 voto
  }

  // Esqueletos
  grid.innerHTML = Array(15).fill(`<div class="skeleton-card skeleton"><div class="sk-img skeleton" style="aspect-ratio:2/3;"></div></div>`).join('');

  try {
    const data = await TMDB.discover(type, params);
    const items = data.results || [];
    
    if (items.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;">Nenhum título encontrado com estes filtros.</div>`;
      return;
    }

    grid.innerHTML = items.map(item => {
      const title = item.title || item.name || '';
      const img = TMDB.poster(item.poster_path, 'w342') || TMDB.backdrop(item.backdrop_path, 'w500');
      
      const imgHtml = img 
        ? `<img class="card-img" src="${img}" alt="${escHtml(title)}" loading="lazy">` 
        : `<div class="card-placeholder"><div class="ph-icon">🎬</div><div class="ph-title">${escHtml(title)}</div></div>`;
        
      return `<div class="movie-card" tabindex="0"
        onclick="openPlayer(${item.id},'${type}','${escAttr(title)}','${item.backdrop_path||''}')"
        onkeydown="if(event.key==='Enter')openPlayer(${item.id},'${type}','${escAttr(title)}','${item.backdrop_path||''}')"
        role="button" aria-label="Assistir ${title}" style="width:100%">
        <div class="card-img-wrap" style="aspect-ratio:2/3;">
          ${imgHtml}
        </div>
        <div class="card-hover-info">
          <div class="card-actions">
            <button class="card-btn card-btn-play" onclick="event.stopPropagation();openPlayer(${item.id},'${type}','${escAttr(title)}','${item.backdrop_path||''}')" title="Assistir">▶</button>
            <button class="card-btn card-btn-icon" onclick="event.stopPropagation();openModal(${item.id},'${type}')" title="Mais info">＋</button>
          </div>
          <div class="card-meta">
            <span class="card-match">${Math.floor(item.vote_average * 10)}% relevante</span>
            <span class="card-year">${TMDB.formatYear(item.release_date || item.first_air_date)}</span>
          </div>
          <div class="card-title-text">${title}</div>
          <div class="card-genres">
            <span class="card-genre">${type === 'tv' ? 'Série' : 'Filme'}</span>
            <span class="card-genre">⭐ ${TMDB.formatRating(item.vote_average)}</span>
          </div>
        </div>
      </div>`;
    }).join('');
    
  } catch (e) {
    console.error('Discover failed:', e);
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;">Erro ao buscar resultados.</div>`;
  }
}
