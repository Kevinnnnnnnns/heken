// ══════════════════════════════════════════
//  AUTH — Sistema de autenticação
// ══════════════════════════════════════════

const USERS = [
  { username: 'kevin',  password: '1234',      name: 'Kevin',  role: 'Master Dev', color: '#e50914' },
  { username: 'admin',  password: 'heken',  name: 'Admin',  role: 'Admin',      color: '#0066cc' },
];

const AUTH_KEY = 'heken_session';

const Auth = {
  /** Tenta logar com username+password. Retorna { ok, user, error } */
  login(username, password) {
    const user = USERS.find(
      u => u.username.toLowerCase() === username.toLowerCase()
        && u.password === password
    );
    if (!user) return { ok: false, error: 'Usuário ou senha incorretos.' };
    const session = { ...user, loggedAt: Date.now() };
    delete session.password;
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    return { ok: true, user: session };
  },

  logout() {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = 'index.html';
  },

  /** Retorna sessão atual ou null */
  getSession() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  /** Redireciona para login se não estiver autenticado */
  requireAuth() {
    if (!this.getSession()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  /** Redireciona para home se já estiver autenticado */
  redirectIfAuth() {
    if (this.getSession()) {
      window.location.href = 'home.html';
    }
  },
};

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
