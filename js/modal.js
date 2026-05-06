// ══════════════════════════════════════════
//  MODAL — Lógica de Detalhes
// ══════════════════════════════════════════

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
    const listBtn = overlay.querySelector('.modal-list-btn');

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
    if (listBtn) {
      listBtn.innerHTML = MyListManager.has(id) ? '✓ Na Lista' : '+ Minha Lista';
      listBtn.onclick = () => {
        MyListManager.toggle({id, title, type, poster_path: details.poster_path, backdrop_path: details.backdrop_path, vote_average: details.vote_average, release_date: details.release_date||details.first_air_date}, listBtn);
        // Refresh My List section if we are on home
        const myListContainer = document.getElementById('carousel-row-mylist');
        if (myListContainer) {
           const s = SECTIONS.find(s => s.id === 'row-mylist');
           if (s) loadSection(s);
        }
      };
    }

    // Cast
    const castContainer = overlay.querySelector('.modal-cast-list');
    if (castContainer && details.credits && details.credits.cast) {
      const castHTML = details.credits.cast.slice(0, 10).map(actor => `
        <div style="flex-shrink:0;text-align:center;width:80px;">
          <div style="width:70px;height:70px;border-radius:50%;background:#333;margin:0 auto 8px;overflow:hidden;">
            ${actor.profile_path ? `<img src="${TMDB.poster(actor.profile_path, 'w185')}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">?</div>'}
          </div>
          <div style="font-size:0.75rem;color:#ddd;line-height:1.2;">${actor.name}</div>
          <div style="font-size:0.65rem;color:#888;line-height:1.2;margin-top:2px;">${actor.character}</div>
        </div>
      `).join('');
      castContainer.innerHTML = castHTML || '<div style="color:#666;font-size:0.9rem;">Elenco indisponível.</div>';
    }

    // Similar
    const similarContainer = overlay.querySelector('.modal-similar-list');
    if (similarContainer && details.similar && details.similar.results) {
      const similarHTML = details.similar.results.slice(0, 6).map(sim => {
        const simTitle = escAttr(sim.title || sim.name || '');
        const simImg = TMDB.poster(sim.poster_path, 'w342');
        return `
          <div style="cursor:pointer;border-radius:6px;overflow:hidden;position:relative;background:#222;aspect-ratio:2/3;" onclick="closeModal(); setTimeout(()=>openModal(${sim.id}, '${type}'), 300)">
            ${simImg ? `<img src="${simImg}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="padding:10px;text-align:center;font-size:0.8rem;color:#888;height:100%;display:flex;align-items:center;">${escHtml(simTitle)}</div>`}
          </div>
        `;
      }).join('');
      similarContainer.innerHTML = similarHTML || '<div style="color:#666;font-size:0.9rem;">Nenhuma recomendação encontrada.</div>';
    }
  } catch(e) {
    console.error('Modal failed:', e);
  }
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay?.classList.remove('open');
  document.body.style.overflow = '';
}
