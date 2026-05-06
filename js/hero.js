// ══════════════════════════════════════════
//  HERO — Lógica do Banner Rotativo
// ══════════════════════════════════════════

let heroMovies   = [];
let heroIndex    = 0;
let heroTimer    = null;

async function loadHero() {
  try {
    const data = await TMDB.trending('movie', 'week');
    heroMovies = data.results.slice(0, 5);
    renderHero(heroMovies[0]);
    renderHeroDots();
    startHeroTimer();
  } catch (e) {
    if (e.message === 'NO_API_KEY' || e.message === 'INVALID_API_KEY') {
      showApiKeyBanner(e.message === 'INVALID_API_KEY');
    } else {
      console.error('Hero failed:', e);
      document.getElementById('heroTitle').textContent = 'Erro de Conexão';
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
  const listBtn = document.getElementById('heroList');
  if (listBtn) {
    listBtn.innerHTML = MyListManager.has(movie.id) ? '<span>✓</span> Na Lista' : '<span>+</span> Minha Lista';
    listBtn.onclick = () => MyListManager.toggle({id: movie.id, title: movie.title||movie.name, type: 'movie', poster_path: movie.poster_path, backdrop_path: movie.backdrop_path, vote_average: movie.vote_average, release_date: movie.release_date||movie.first_air_date}, listBtn);
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
