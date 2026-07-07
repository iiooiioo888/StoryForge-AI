// ═══ StoryForge AI — App Entry ═══
import { api, DB } from './api.js';
import { toast } from './utils.js';
import { checkAuth, updateAuthUI, showAuthModal, closeModal, showLoginForm, showRegisterForm, fillDemo, doLogin, doRegister } from './auth.js';
import { switchTab, toggleTheme, loadTheme } from './router.js';
import { refreshHome } from './pages/home.js';
import { generateStory, saveStory, exportStory, aiAutoFill } from './pages/workshop.js';
import { refreshLibrary, viewStory, editStory, deleteStory, sendToPrompts } from './pages/library.js';
import { refreshPromptSel, generatePrompts } from './pages/prompts.js';
import { loadCamera, loadCameraTab } from './pages/camera.js';

// ═══ Event Delegation ═══
const actions = {
  switchTab: (el) => switchTab(el.dataset.tab || 'home'),
  toggleTheme,
  showAuthModal, closeModal, showLoginForm, showRegisterForm,
  fillDemo: (el) => fillDemo(el.dataset.username, el.dataset.password),
  doLogin, doRegister,
  generateStory, saveStory, exportStory, aiAutoFill,
  refreshLibrary,
  viewStory: (el) => viewStory(el.dataset.storyId),
  editStory: (el) => { closeModal(); setTimeout(() => editStory(el.dataset.storyId), 100); },
  deleteStory: (el) => deleteStory(el.dataset.storyId),
  sendToPrompts: (el) => { closeModal(); setTimeout(() => sendToPrompts(el.dataset.storyId), 100); },
  generatePrompts,
  loadCameraTab: (el) => loadCameraTab(el.dataset.camTab),
  logout: () => { location.reload(); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = actions[el.dataset.action];
  if (action) { e.preventDefault(); action(el); }
});

// Workshop tabs
document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-wtab]');
  if (!tab) return;
  document.querySelectorAll('.workshop-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.workshop-tab-content').forEach(c => c.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById(`wtab-${tab.dataset.wtab}`)?.classList.add('active');
});

// Search library
document.addEventListener('input', (e) => {
  if (e.target.id === 'search-input') {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#library-grid .card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  const tabs = ['home', 'workshop', 'library', 'prompts', 'camera'];
  const num = parseInt(e.key);
  if (num >= 1 && num <= tabs.length) { e.preventDefault(); switchTab(tabs[num - 1]); }
  if (e.key === 'Escape') closeModal();
});

// ═══ Init ═══
async function init() {
  loadTheme();
  await checkAuth();
  updateAuthUI();
  refreshHome();
}

init();
