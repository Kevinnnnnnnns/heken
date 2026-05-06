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
    id => `https://embed.warezcdn.com/filme/${id}`,       // Fonte 2 (Dublado BR)
    id => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`, // Fonte 3 (Multi)
    id => `https://vidsrc.xyz/embed/movie?tmdb=${id}`,    // Fonte 4 (Legendado Estável)
    id => `https://vidsrc.cc/v2/embed/movie/${id}`,       // Fonte 5 (Legendado 1080p)
  ],
  tv: [
    (id, s, e) => `https://embed.warezcdn.com/serie/${id}/${s}/${e}`,
    (id, s, e) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
    (id, s, e) => `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
    (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
  ],
};

const GENRE_IDS = { action: 28, comedy: 35, horror: 27, documentary: 99, animation: 16, drama: 18, scifi: 878, thriller: 53, romance: 10749, family: 10751 };
const GENRE_IDS_TV = { action: 10759, comedy: 35, documentary: 99, animation: 16, drama: 18, scifi: 10765, family: 10751, mystery: 9648 };
const _cache = new Map();

async function fetchTMDB(endpoint, params = {}) {
  const key = localStorage.getItem('heken_tmdb_key') || TMDB_KEY;
  if (!key) throw new Error('NO_API_KEY');

  const cacheKey = `heken_tmdb::${endpoint}::${JSON.stringify(params)}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  try {
    const sessionData = sessionStorage.getItem(cacheKey);
    if (sessionData) {
      const data = JSON.parse(sessionData);
      _cache.set(cacheKey, data);
      return data;
    }
  } catch (e) {}

  const qs  = new URLSearchParams({ api_key: key, language: LANG, ...params });
  const rawUrl = `${BASE_URL}${endpoint}?${qs}`;

  const proxyPromises = PROXIES.map(async (buildProxy) => {
    const url = buildProxy(rawUrl);
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (res.status === 401) throw new Error('INVALID_API_KEY');
    if (!res.ok) throw new Error(`Status ${res.status}`);

    const data = await res.json();
    if (data.success === false) throw new Error(data.status_message || 'API Error');

    return data;
  });

  try {
    const data = await Promise.any(proxyPromises);
    _cache.set(cacheKey, data);
    try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch (e) {}
    return data;
  } catch (err) {
    if (err instanceof AggregateError) {
      const hasInvalidKey = err.errors.some(e => e.message === 'INVALID_API_KEY');
      if (hasInvalidKey) throw new Error('INVALID_API_KEY');
    }
    throw new Error('FETCH_FAILED');
  }
}

const TMDB = {
  poster  : (path, size = 'w342')  => path ? IMG_PROXY(`${IMG_BASE}${size}${path}`) : null,
  backdrop: (path, size = 'w1280') => path ? IMG_PROXY(`${IMG_BASE}${size}${path}`) : null,
  
  trending: (type = 'movie') => fetchTMDB(`/trending/${type}/week`),
  popular : (type = 'movie') => fetchTMDB(`/${type}/popular`),
  topRated: (type = 'movie') => fetchTMDB(`/${type}/top_rated`),
  nowPlaying: () => fetchTMDB('/movie/now_playing'),
  byGenre: (id, type = 'movie') => fetchTMDB(`/discover/${type}`, { with_genres: id, sort_by: 'popularity.desc' }),
  discover: (type, params) => fetchTMDB(`/discover/${type}`, { sort_by: 'popularity.desc', ...params }),
  details: (id, type = 'movie') => fetchTMDB(`/${type}/${id}`, { append_to_response: 'credits,similar' }),
  search: (q) => fetchTMDB('/search/multi', { query: q, include_adult: false }),
  seasons: (id, n) => fetchTMDB(`/tv/${id}/season/${n}`),
  streamUrl: (id, type, s, e, idx) => {
    const list = STREAM_SOURCES[type] || STREAM_SOURCES.movie;
    const f = list[idx % list.length];
    return type === 'movie' ? f(id) : f(id, s, e);
  },
  streamSources: (type) => (STREAM_SOURCES[type] || STREAM_SOURCES.movie).length,
  streamSourceName: (idx) => {
    const names = ["Dublado 1 (BR)", "Dublado 2 (BR)", "Multi-Idioma", "Legendado", "Legendado 1080p"];
    return names[idx % names.length];
  },
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
