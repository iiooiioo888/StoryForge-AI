// ═══ Router ═══
import { toast } from './utils.js';

export const state = { tab: 'home', editId: null, storyContent: '' };

export function switchTab(tab) {
  state.tab = tab;
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector('.nav-link[data-tab="' + tab + '"]')?.classList.add('active');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + tab)?.classList.add('active');
  document.getElementById('nav-links')?.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Lazy load
  if (tab === 'home') import('./pages/home.js').then(m => m.refreshHome());
  if (tab === 'library') import('./pages/library.js').then(m => m.refreshLibrary());
  if (tab === 'prompts') import('./pages/prompts.js').then(m => m.refreshPromptSel());
  if (tab === 'camera') import('./pages/camera.js').then(m => m.loadCamera());
}

export function toggleTheme() {
  document.documentElement.classList.toggle('light-mode');
  const isLight = document.documentElement.classList.contains('light-mode');
  localStorage.setItem('sf_theme', isLight ? 'light' : 'dark');
  toast(isLight ? '☀️ 淺色模式' : '🌙 深色模式', 'info');
}

export function loadTheme() {
  if (localStorage.getItem('sf_theme') === 'light') document.documentElement.classList.add('light-mode');
}
