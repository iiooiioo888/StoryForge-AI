// ═══ Router ═══
import { toast } from './utils.js';

export const state = { tab: 'home', editId: null, storyContent: '' };
const templateCache = {};

export async function loadTemplate(name) {
  if (templateCache[name]) return templateCache[name];
  try {
    const resp = await fetch(`/js/templates/${name}.html`);
    if (!resp.ok) throw new Error(`Template ${name} not found`);
    const html = await resp.text();
    templateCache[name] = html;
    return html;
  } catch (e) {
    console.error('Template load error:', e);
    return '';
  }
}

export async function switchTab(tab) {
  state.tab = tab;
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector('.nav-link[data-tab="' + tab + '"]')?.classList.add('active');
  const panel = document.getElementById('panel-' + tab);
  if (panel && !panel.dataset.loaded) {
    const html = await loadTemplate(tab);
    if (html) {
      panel.innerHTML = html;
      panel.dataset.loaded = 'true';
    }
  }
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  panel?.classList.add('active');
  document.getElementById('nav-links')?.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (tab === 'home') import('./pages/home.js').then(m => m.refreshHome());
  if (tab === 'library') import('./pages/library.js').then(m => m.refreshLibrary());
  if (tab === 'prompts') import('./pages/prompts.js').then(m => m.refreshPromptSel());
  if (tab === 'camera') import('./pages/camera.js').then(m => m.loadCamera());
  if (tab === 'credits') import('./pages/credits.js').then(m => m.refreshCredits());
}

export function toggleTheme() {
  document.documentElement.classList.toggle('light-mode');
  const isLight = document.documentElement.classList.contains('light-mode');
  localStorage.setItem('sf_theme', isLight ? 'light' : 'dark');
  toast(isLight ? '☀️ 淺色模式' : '🌙 深色模式', 'info');
}

export function loadTheme() {
  if (localStorage.getItem('sf_theme') === 'light') document.documentElement.classList.add('light-mode');
  initScrollEffect();
}

function initScrollEffect() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        nav.classList.toggle('scrolled', window.scrollY > 20);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}
