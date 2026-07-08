// ═══ Auth ═══
import { api, setUser } from './api.js';
import { toast } from './utils.js';

export async function checkAuth() {
  try {
    const d = await api('/auth/me');
    setUser(d.user);
  } catch { setUser(null); }
}

export function updateAuthUI() {
  import('./api.js').then(({ currentUser }) => {
    const btn = document.getElementById('auth-btn');
    if (!btn) return;
    if (currentUser) {
      btn.textContent = currentUser.display_name || currentUser.username;
      btn.dataset.action = 'logout';
    } else {
      btn.textContent = '登入';
      btn.dataset.action = 'showAuthModal';
    }
  });
}

export function showAuthModal() { document.getElementById('auth-modal')?.classList.add('active'); }
export function closeModal() { document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active')); }
export function showLoginForm() { document.getElementById('login-form').style.display = ''; document.getElementById('register-form').style.display = 'none'; }
export function showRegisterForm() { document.getElementById('login-form').style.display = 'none'; document.getElementById('register-form').style.display = ''; }
export function fillDemo(u, p) { document.getElementById('auth-username').value = u; document.getElementById('auth-password').value = p; }

export async function doLogin() {
  const u = document.getElementById('auth-username').value;
  const p = document.getElementById('auth-password').value;
  const err = document.getElementById('auth-error');
  if (!u || !p) { err.textContent = '請填寫所有欄位'; err.style.display = 'block'; return; }
  try {
    const d = await api('/auth/login', { method: 'POST', body: { username: u, password: p } });
    setUser(d.user); closeModal(); updateAuthUI(); toast('登入成功！');
  } catch (e) { err.textContent = e.message; err.style.display = ''; }
}

export async function doRegister() {
  const u = document.getElementById('reg-username').value;
  const e = document.getElementById('reg-email').value;
  const p = document.getElementById('reg-password').value;
  const err = document.getElementById('reg-error');
  if (!u || !e || !p) { err.textContent = '請填寫所有欄位'; err.style.display = 'block'; return; }
  try {
    const d = await api('/auth/register', { method: 'POST', body: { username: u, email: e, password: p, display_name: u } });
    setUser(d.user); closeModal(); updateAuthUI(); toast('註冊成功！');
  } catch (ex) { err.textContent = ex.message; err.style.display = ''; }
}
