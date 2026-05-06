// ══════════════════════════════════════════
//  AUTH — Autenticação via Firebase
// ══════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyAy2kndP6mf7Hl7hJSZSsl8hMTXflOBqlw",
  authDomain: "heken-streaming.firebaseapp.com",
  projectId: "heken-streaming",
  storageBucket: "heken-streaming.firebasestorage.app",
  messagingSenderId: "305095360184",
  appId: "1:305095360184:web:f6218a3b69f60b6de47e4d"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const fbAuth = firebase.auth();
const fbDb = firebase.firestore();

const AUTH_KEY = 'heken_session';

const Auth = {
  /** Registra nova conta */
  async register(email, password) {
    try {
      const cred = await fbAuth.createUserWithEmailAndPassword(email, password);
      const session = { 
        uid: cred.user.uid, 
        name: email.split('@')[0], 
        email: email, 
        role: 'Membro' 
      };
      
      // Cria doc no firestore
      await fbDb.collection('users').doc(cred.user.uid).set({
        ...session,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      return { ok: true, user: session };
    } catch (e) {
      let msg = 'Erro ao criar conta.';
      if (e.code === 'auth/email-already-in-use') msg = 'Este e-mail já está em uso.';
      if (e.code === 'auth/weak-password') msg = 'A senha deve ter pelo menos 6 caracteres.';
      return { ok: false, error: msg };
    }
  },

  /** Tenta logar */
  async login(email, password) {
    try {
      const cred = await fbAuth.signInWithEmailAndPassword(email, password);
      
      // Busca dados do user
      const docSnap = await fbDb.collection('users').doc(cred.user.uid).get();
      const userData = docSnap.exists ? docSnap.data() : { name: email.split('@')[0], email, role: 'Membro' };
      
      const session = { uid: cred.user.uid, ...userData };
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      
      // Sincroniza dados do Firestore para o LocalStorage ao logar
      await this.syncFromCloud(cred.user.uid);
      
      return { ok: true, user: session };
    } catch (e) {
      return { ok: false, error: 'E-mail ou senha incorretos.' };
    }
  },

  async logout() {
    await fbAuth.signOut();
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem('heken_mylist');
    localStorage.removeItem('heken_history');
    window.location.href = 'index.html';
  },

  getSession() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  requireAuth() {
    if (!this.getSession()) {
      window.location.href = 'index.html';
      return false;
    }
    // Opcional: checar estado real no firebase background
    return true;
  },

  redirectIfAuth() {
    if (this.getSession()) {
      window.location.href = 'home.html';
    }
  },

  // ─── Sincronização Nuvem ───
  
  async syncFromCloud(uid) {
    try {
      const docRef = fbDb.collection('user_data').doc(uid);
      const snap = await docRef.get();
      if (snap.exists) {
        const data = snap.data();
        if (data.myList) localStorage.setItem('heken_mylist', JSON.stringify(data.myList));
        if (data.history) localStorage.setItem('heken_history', JSON.stringify(data.history));
      }
    } catch (e) {
      console.warn("Erro ao puxar dados da nuvem", e);
    }
  },
  
  async syncToCloud() {
    const session = this.getSession();
    if (!session || !session.uid) return;
    
    try {
      const myList = JSON.parse(localStorage.getItem('heken_mylist') || '[]');
      const history = JSON.parse(localStorage.getItem('heken_history') || '[]');
      
      await fbDb.collection('user_data').doc(session.uid).set({
        myList,
        history,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("Erro ao enviar dados para a nuvem", e);
    }
  }
};

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
