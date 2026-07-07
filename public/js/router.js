// ============================================
// StoryForge AI — Router & Navigation (ES Module)
// ============================================
import { toast } from './utils.js';

// ── State ──
export const state = {
  currentTab: 'home',
  currentEditId: null,
  currentStoryContent: '',
};

// ── Tab Navigation ──
export function switchTab(tab) {
  const prev = state.currentTab;
  state.currentTab = tab;
  
  // Update nav active state
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-link[data-tab="${tab}"]`);
  if (activeLink) activeLink.classList.add('active');
  
  // Transition panels
  document.querySelectorAll('.panel').forEach(p => {
    if (p.id === `panel-${tab}`) {
      p.classList.add('active');
      // Add stagger animation to children
      p.querySelectorAll('.story-card, .prompt-section, .stat').forEach((el, i) => {
        el.style.animationDelay = `${i * 0.05}s`;
      });
    } else {
      p.classList.remove('active');
    }
  });
  
  // Lazy-load page content
  if (tab === 'home') import('./pages/home.js').then(m => m.refreshHome());
  if (tab === 'library') import('./pages/library.js').then(m => m.refreshLibrary());
  if (tab === 'prompts') import('./pages/prompts.js').then(m => m.refreshPromptSel());
  if (tab === 'camera') import('./pages/camera.js').then(m => m.loadCamera());
  
  // Close mobile nav
  document.getElementById('nav-links')?.classList.remove('open');
  const hamburger = document.getElementById('nav-hamburger');
  if (hamburger) hamburger.classList.remove('active');
  
  // Smooth scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Theme ──
export function toggleTheme() {
  document.documentElement.classList.toggle('light-mode');
  const isLight = document.documentElement.classList.contains('light-mode');
  localStorage.setItem('storyforge_theme', isLight ? 'light' : 'dark');
  toast(isLight ? '🌙 已切換至淺色模式' : '☀️ 已切換至深色模式', 'info');
}

export function loadTheme() {
  if (localStorage.getItem('storyforge_theme') === 'light') {
    document.documentElement.classList.add('light-mode');
  }
}

// ── Mobile Nav ──
export function toggleMobileNav() {
  document.getElementById('nav-links')?.classList.toggle('open');
  document.getElementById('nav-hamburger')?.classList.toggle('active');
}

// ── Common Tags ──
export function addCommonTag(btn) {
  const val = btn.textContent.trim();
  if (!val) return;
  btn.classList.toggle('used');
  const input = document.getElementById('elements-input');
  if (input && !input.value.includes(val)) {
    input.value = input.value ? input.value + ',' + val : val;
    input.dispatchEvent(new Event('input'));
  }
}

// ── Reading Mode ──
export function toggleReadingMode() {
  const ws = document.querySelector('.workshop-layout');
  if (ws) ws.classList.toggle('reading-mode');
  toast(ws?.classList.contains('reading-mode') ? '📖 閱讀模式' : '📝 編輯模式', 'info');
}

export function toggleFullscreenPreview() {
  const content = document.querySelector('.story-output');
  if (!content || !content.textContent.trim()) {
    toast('請先生成故事', 'warning');
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'fullscreen-preview';
  overlay.innerHTML = `
    <button class="fullscreen-close" onclick="this.parentElement.remove()">✕ 關閉預覽</button>
    <div class="story-output" style="max-width:720px;margin:0 auto;padding:2rem;line-height:2.2;font-size:1.1rem">
      ${content.innerHTML}
    </div>
  `;
  document.body.appendChild(overlay);
}

// ── Keyboard Shortcuts ──
export function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    
    // Number keys for tab switching
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const tabs = ['home', 'workshop', 'library', 'prompts', 'camera'];
      const num = parseInt(e.key);
      if (num >= 1 && num <= tabs.length) {
        e.preventDefault();
        switchTab(tabs[num - 1]);
        return;
      }
    }
    
    // Ctrl+S: Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      const saveBtn = document.querySelector('[data-action="saveStory"]');
      if (saveBtn) saveBtn.click();
    }
    
    // Ctrl+Enter: Generate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const genBtn = document.querySelector('[data-action="generateStory"]');
      if (genBtn) genBtn.click();
    }
    
    // Escape: Close modals
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
  });
}
