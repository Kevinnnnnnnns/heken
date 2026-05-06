// ══════════════════════════════════════════
//  SEARCH — Lógica de Busca
// ══════════════════════════════════════════

let searchDebounce = null;

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
    const hero = document.getElementById('hero');
    if (hero) hero.style.setProperty('display','');
  });

  input?.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    const q = input.value.trim();
    if (!q) {
      results.classList.remove('visible');
      if (contentArea) contentArea.style.display = '';
      const hero = document.getElementById('hero');
      if (hero) hero.style.setProperty('display','');
      return;
    }
    searchDebounce = setTimeout(() => doSearch(q), 400);
  });
}

async function doSearch(query) {
  const results     = document.getElementById('searchResults');
  const contentArea = document.getElementById('contentArea');
  const hero        = document.getElementById('hero');

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
