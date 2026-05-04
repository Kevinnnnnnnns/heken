// ══════════════════════════════════════════
//  API — Integração TMDB + fontes de streaming
// ══════════════════════════════════════════

// ──────────────────────────────────────────
// 🔑  CONFIGURE SUA CHAVE TMDB AQUI
//  1. Acesse: https://www.themoviedb.org/settings/api
//  2. Crie uma conta gratuita e gere sua API Key (v3 auth)
//  3. Cole o valor abaixo substituindo o placeholder
// ──────────────────────────────────────────
const TMDB_KEY = localStorage.getItem('netflixo_tmdb_key') || '';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/';
const LANG     = 'pt-BR';

// Fontes de streaming (em ordem de prioridade)
const STREAM_SOURCES = {
  movie: [
    id => `https://vidsrc.to/embed/movie/${id}`,
    id => `https://vidsrc.xyz/embed/movie?tmdb=${id}`,
    id => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    id => `https://www.2embed.cc/embed/${id}`,
  ],
  tv: [
    (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
    (id, s, e) => `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
    (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  ],
};

// IDs de gêneros TMDB
const GENRE_IDS = {
  action:      28,
  comedy:      35,
  horror:      27,
  documentary: 99,
  animation:   16,
  drama:       18,
  scifi:       878,
  thriller:    53,
  romance:     10749,
  family:      10751,
};

/** Cache em memória */
const _cache = new Map();

/** Verifica se a chave está configurada */
function hasApiKey() {
  return TMDB_KEY && TMDB_KEY.length > 10;
}

/** Faz requisição TMDB */
async function fetchTMDB(endpoint, params = {}) {
  const key = localStorage.getItem('netflixo_tmdb_key') || TMDB_KEY;

  if (!key || key.length < 10) {
    throw new Error('NO_API_KEY');
  }

  const cacheKey = `${endpoint}::${JSON.stringify(params)}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const qs  = new URLSearchParams({ api_key: key, language: LANG, ...params });
  const url = `${BASE_URL}${endpoint}?${qs}`;

  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), 10000);

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);

    if (res.status === 401) throw new Error('INVALID_API_KEY');
    if (!res.ok) throw new Error(`HTTP_${res.status}`);

    const data = await res.json();
    _cache.set(cacheKey, data);
    return data;
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

const TMDB = {
  // ── Imagens ────────────────────────────
  poster  (path, size = 'w342')  { return path ? `${IMG_BASE}${size}${path}` : null; },
  backdrop(path, size = 'w1280') { return path ? `${IMG_BASE}${size}${path}` : null; },
  original(path)                 { return path ? `${IMG_BASE}original${path}` : null; },

  // ── Conteúdo ───────────────────────────
  trending   : (type = 'movie', time = 'week') => fetchTMDB(`/trending/${type}/${time}`),
  popular    : (type = 'movie')  => fetchTMDB(`/${type}/popular`),
  topRated   : (type = 'movie')  => fetchTMDB(`/${type}/top_rated`),
  nowPlaying : ()                => fetchTMDB('/movie/now_playing'),
  upcoming   : ()                => fetchTMDB('/movie/upcoming'),

  byGenre(genreId, type = 'movie', page = 1) {
    return fetchTMDB(`/discover/${type}`, {
      with_genres: genreId,
      sort_by: 'popularity.desc',
      page,
    });
  },

  details(id, type = 'movie') {
    return fetchTMDB(`/${type}/${id}`);
  },

  videos(id, type = 'movie') {
    return fetchTMDB(`/${type}/${id}/videos`, { language: 'pt-BR,en-US' });
  },

  search(query, page = 1) {
    return fetchTMDB('/search/multi', { query, page, include_adult: false });
  },

  seasons(tvId, seasonNum) {
    return fetchTMDB(`/tv/${tvId}/season/${seasonNum}`);
  },

  // ── Streaming ──────────────────────────
  streamUrl(id, type = 'movie', season = 1, episode = 1, sourceIndex = 0) {
    const sources = STREAM_SOURCES[type] || STREAM_SOURCES.movie;
    const fn = sources[sourceIndex % sources.length];
    return type === 'movie' ? fn(id) : fn(id, season, episode);
  },

  streamSources(type = 'movie') {
    return (STREAM_SOURCES[type] || STREAM_SOURCES.movie).length;
  },

  // ── Formatadores ───────────────────────
  formatRating(vote)    { return vote ? vote.toFixed(1) : '—'; },
  formatYear(dateStr)   { return dateStr ? dateStr.slice(0, 4) : ''; },
  formatRuntime(minutes) {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  },
};
