// ═══ StoryForge AI — App Entry ═══
import { api, DB } from './api.js';
import { toast } from './utils.js';
import { checkAuth, updateAuthUI, showAuthModal, closeModal, showLoginForm, showRegisterForm, fillDemo, doLogin, doRegister } from './auth.js';
import { switchTab, toggleTheme, loadTheme, loadTemplate } from './router.js';
import { refreshHome } from './pages/home.js';
import { generateStory, saveStory, exportStory, aiAutoFill } from './pages/workshop.js';
import { refreshLibrary, viewStory, editStory, deleteStory, sendToPrompts } from './pages/library.js';
import { refreshPromptSel, generatePrompts } from './pages/prompts.js';
import { loadCamera, loadCameraTab } from './pages/camera.js';
import { showRechargeModal, doRecharge } from './pages/credits.js';

// ═══ Event Delegation ═══
const actions = {
  switchTab: (el) => switchTab(el.dataset.tab || 'home'),
  toggleTheme,
  showAuthModal, closeModal, showLoginForm, showRegisterForm,
  fillDemo: (el) => fillDemo(el.dataset.username, el.dataset.password),
  doLogin, doRegister,
  generateStory, saveStory, exportStory, aiAutoFill,
  viewStory: (el) => viewStory(el.dataset.storyId),
  editStory: (el) => { closeModal(); setTimeout(() => editStory(el.dataset.storyId), 100); },
  deleteStory: (el) => deleteStory(el.dataset.storyId),
  sendToPrompts: (el) => { closeModal(); setTimeout(() => sendToPrompts(el.dataset.storyId), 100); },
  generatePrompts,
  loadCameraTab: (el) => loadCameraTab(el.dataset.camTab),
  showRechargeModal, doRecharge,
  logout: () => { location.reload(); },
};

// Click delegation
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = actions[el.dataset.action];
  if (action) {
    e.preventDefault();
    try { action(el); } catch (err) { console.error('Action error:', err); toast('操作失敗', 'error'); }
  }
});

// Workshop tabs
document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-wtab]');
  if (!tab) return;
  document.querySelectorAll('.workshop-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.workshop-tab-content').forEach(c => c.classList.remove('active'));
  tab.classList.add('active');
  const content = document.getElementById('wtab-' + tab.dataset.wtab);
  if (content) content.classList.add('active');
});

// Search library
document.addEventListener('input', (e) => {
  if (e.target.id === 'search-input') {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#library-grid .card').forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  const tabs = ['home', 'workshop', 'library', 'prompts', 'camera', 'credits'];
  const num = parseInt(e.key);
  if (num >= 1 && num <= tabs.length) { e.preventDefault(); switchTab(tabs[num - 1]); }
  if (e.key === 'Escape') closeModal();
});

// Mobile nav toggle
document.addEventListener('click', (e) => {
  const brand = e.target.closest('.nav-brand');
  if (brand && window.innerWidth <= 768) {
    document.getElementById('nav-links')?.classList.toggle('open');
  }
});

// Close mobile nav on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-links') && !e.target.closest('.nav-brand')) {
    document.getElementById('nav-links')?.classList.remove('open');
  }
});

// Password toggle
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('.password-toggle');
  if (!toggle) return;
  const input = document.getElementById(toggle.dataset.target);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  toggle.textContent = isPassword ? '🙈' : '👁';
});

// Library view toggle
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.view-btn');
  if (!btn) return;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const grid = document.getElementById('library-grid');
  if (grid) {
    grid.classList.toggle('list-view', btn.dataset.view === 'list');
  }
});

// Library genre filter
document.addEventListener('change', (e) => {
  if (e.target.id === 'lib-filter-genre' || e.target.id === 'lib-sort') {
    import('./pages/library.js').then(m => m.refreshLibrary());
  }
});

// Camera search
document.addEventListener('input', (e) => {
  if (e.target.id === 'cam-search') {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#cam-grid .card').forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
    const empty = document.getElementById('cam-empty');
    const visible = document.querySelectorAll('#cam-grid .card:not([style*="display: none"])').length;
    if (empty) empty.style.display = visible === 0 ? '' : 'none';
  }
});

// ═══ Init ═══
async function init() {
  try {
    loadTheme();
    // Load modals template
    const modalsHtml = await loadTemplate('modals');
    if (modalsHtml) {
      const container = document.createElement('div');
      container.id = 'modals-container';
      container.innerHTML = modalsHtml;
      document.body.appendChild(container);
    }
    // Load home template (default active panel)
    const homeHtml = await loadTemplate('home');
    const homePanel = document.getElementById('panel-home');
    if (homePanel && homeHtml) {
      homePanel.innerHTML = homeHtml;
      homePanel.dataset.loaded = 'true';
    }
    await checkAuth();
    updateAuthUI();
    refreshHome();
    console.log('StoryForge AI initialized');
  } catch (err) {
    console.error('Init error:', err);
  }
}

init();
