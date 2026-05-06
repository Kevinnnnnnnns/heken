// ══════════════════════════════════════════
//  UTILS — Funções auxiliares globais
// ══════════════════════════════════════════

const MyListManager = {
  get() { return JSON.parse(localStorage.getItem('heken_mylist') || '[]'); },
  add(item) {
    const list = this.get();
    if (!list.find(i => i.id === item.id)) {
      list.push(item);
      localStorage.setItem('heken_mylist', JSON.stringify(list));
      showToast('Adicionado à Minha Lista');
    }
  },
  remove(id) {
    const list = this.get().filter(i => i.id !== id);
    localStorage.setItem('heken_mylist', JSON.stringify(list));
    showToast('Removido da Minha Lista');
  },
  has(id) { return !!this.get().find(i => i.id === id); },
  toggle(item, btn) {
    if (this.has(item.id)) { this.remove(item.id); btn.innerHTML = '<span>+</span> Minha Lista'; }
    else { this.add(item); btn.innerHTML = '<span>✓</span> Na Lista'; }
  }
};

const HistoryManager = {
  get() { return JSON.parse(localStorage.getItem('heken_history') || '[]'); },
  add(item) {
    let list = this.get();
    // Remover se já existir para colocar no topo
    list = list.filter(i => i.id !== item.id);
    list.unshift(item); // Adiciona no início
    // Limitar histórico para 20 itens
    if (list.length > 20) list.pop();
    localStorage.setItem('heken_history', JSON.stringify(list));
  }
};

function escHtml(str)  { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(str)  { return String(str).replace(/'/g,"\\'"); }

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 300); }, 3000);
}

function showApiKeyBanner(isInvalid = false) {
  const hero = document.getElementById('hero');
  const content = document.getElementById('contentArea');
  if (hero) hero.style.display = 'none';
  if (content) content.innerHTML = '';

  const title = isInvalid ? 'Chave API Inválida ❌' : 'Configuração Necessária 🔑';
  const desc = isInvalid 
    ? 'A chave TMDB que você inseriu não foi reconhecida ou está desativada. Verifique se copiou corretamente.' 
    : 'Para carregar os filmes e séries, você precisa de uma chave TMDB gratuita.';

  const banner = document.createElement('div');
  banner.id = 'apiBanner';
  banner.style.cssText = 'min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 24px;';
  banner.innerHTML = `
    <div style="font-size:3rem;margin-bottom:20px">${isInvalid ? '🚫' : '🔑'}</div>
    <h2 style="font-size:1.8rem;font-weight:800;margin-bottom:12px">${title}</h2>
    <p style="color:var(--text-secondary);font-size:1rem;max-width:480px;line-height:1.7;margin-bottom:32px">${desc}</p>
    <button onclick="window.location.href='setup.html'" style="padding: 16px 36px; background: var(--red); color: white; font-size: 1rem; font-weight: 700; border-radius: 8px; border: none; cursor: pointer; transition: all 0.25s;">
      🎬 ${isInvalid ? 'Corrigir Chave' : 'Configurar agora'}
    </button>
  `;
  if (!document.getElementById('apiBanner')) {
    document.body.appendChild(banner);
  }
}

function openPlayer(id, type, title, backdrop) {
  const params = new URLSearchParams({ id, type, title: title||'', backdrop: backdrop||'' });
  window.location.href = `player.html?${params}`;
}
