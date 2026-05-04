// ══════════════════════════════════════════
//  API — Integração TMDB + fontes de streaming
// ══════════════════════════════════════════

// 🔑 Sua chave TMDB
const TMDB_KEY = 'bedff5adccb225c280f32e314a46cd3e';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/';
const LANG     = 'pt-BR';

// Proxy de Imagem
const IMG_PROXY = (url) => url ? `https://images.weserv.nl/?url=${encodeURIComponent(url)}&default=https://via.placeholder.com/500x750?text=Sem+Imagem` : null;

// Proxies CORS para JSON
const PROXIES = [
  url => url, 
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`
];

// 🎬 Lista de Fontes com Foco em Burlar Bloqueios
const STREAM_SOURCES = {
  movie: [
    id => `https://embed.su/embed/movie/${id}`,           // Fonte 1 (Muito estável)
    id => `https://vidsrc.pro/embed/movie/${id}`,         // Fonte 2 (Nova)
    id => `https://www.2embed.cc/embed/${id}`,           // Fonte 3 (Clássica)
    id => `https://autoembed.to/movie/tmdb/${id}`,       // Fonte 4 (Auto)
    id => `https://vidsrc.to/embed/movie/${id}`,         // Fonte 5 (Original)
  ],
  tv: [
    (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
    (id, s, e) => `https://vidsrc.pro/embed/tv/${id}/${s}/${e}`,
    (id, s, e) => `https://autoembed.to/tv/tmdb/${id}/${s}/${e}`,
  ],
};

const GENRE_IDS = { action: 28, comedy: 35, horror: 27, documentary: 99, animation: 16, drama: 18, scifi: 878, thriller: 53, romance: 10749, family: 10751 };

const _cache = new Map();

async function fetchTMDB(endpoint, params = {}) {
  const key = localStorage.getItem('netflixo_tmdb_key') || TMDB_KEY;
  if (!key) throw new Error('NO_API_KEY');

  const cacheKey = `${endpoint}::${JSON.stringify(params)}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const qs  = new URLSearchParams({ api_key: key, language: LANG, ...params });
  const rawUrl = `${BASE_URL}${endpoint}?${qs}`;

  let lastError;

  for (const buildProxy of PROXIES) {
    try {
      const url = buildProxy(rawUrl);
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

      if (res.status === 401) throw new Error('INVALID_API_KEY');
      if (!res.ok) { lastError = new Error(`Status ${res.status}`); continue; }

      const data = await res.json();
      if (data.success === false) { lastError = new Error(data.status_message || 'API Error'); continue; }

      _cache.set(cacheKey, data);
      return data;
    } catch (e) {
      if (e.message === 'INVALID_API_KEY') throw e;
      lastError = e;
    }
  }
  throw lastError || new Error('FETCH_FAILED');
}

const TMDB = {
  poster  : (path, size = 'w342')  => path ? IMG_PROXY(`${IMG_BASE}${size}${path}`) : null,
  backdrop: (path, size = 'w1280') => path ? IMG_PROXY(`${IMG_BASE}${size}${path}`) : null,
  
  trending: (type = 'movie') => fetchTMDB(`/trending/${type}/week`),
  popular : (type = 'movie') => fetchTMDB(`/${type}/popular`),
  topRated: (type = 'movie') => fetchTMDB(`/${type}/top_rated`),
  nowPlaying: () => fetchTMDB('/movie/now_playing'),
  byGenre: (id, type = 'movie') => fetchTMDB(`/discover/${type}`, { with_genres: id, sort_by: 'popularity.desc' }),
  details: (id, type = 'movie') => fetchTMDB(`/${type}/${id}`),
  search: (q) => fetchTMDB('/search/multi', { query: q, include_adult: false }),
  seasons: (id, n) => fetchTMDB(`/tv/${id}/season/${n}`),
  streamUrl: (id, type, s, e, idx) => {
    const list = STREAM_SOURCES[type] || STREAM_SOURCES.movie;
    const f = list[idx % list.length];
    return type === 'movie' ? f(id) : f(id, s, e);
  },
  streamSources: (type) => (STREAM_SOURCES[type] || STREAM_SOURCES.movie).length,
  formatRating: (v) => v ? v.toFixed(1) : '—',
  formatYear: (s) => s ? s.slice(0, 4) : '',
  formatRuntime: (m) => {
    if (!m) return '';
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
  },
  async getTrailer(id, type = 'movie') {
    try {
      const data = await fetchTMDB(`/${type}/${id}/videos`, { language: 'pt-BR,en-US' });
      const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || data.results[0];
      return trailer ? `https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0` : null;
    } catch (e) {
      console.warn('Falha ao buscar trailer:', e);
      return null;
    }
  }
};
