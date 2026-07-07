// ============================================
// StoryForge AI — Main Entry Point (ES Module)
// ============================================

// ── Imports ──
import { currentUser, api, DB, SUB_GENRES } from './api.js';
import { esc, formatNum, timeAgo, copyTxt, toast, showLoading, showError, initScrollReveal } from './utils.js';
import {
  checkAuth, updateAuthUI, showAuthModal, closeAuthModal,
  showLoginForm, showRegisterForm, fillDemo, doLogin, doRegister
} from './auth.js';
import {
  handleTagInput, removeTag, renderTags, renderCard,
  showSkeleton, setBtnLoading, toggleSection, updateStepper
} from './components.js';
import {
  switchTab, toggleTheme, loadTheme, toggleMobileNav,
  addCommonTag, toggleReadingMode, toggleFullscreenPreview,
  initKeyboardShortcuts, state
} from './router.js';
import { refreshHome } from './pages/home.js';
import {
  StoryEngine, generateStory, renderOutline, renderCharCards,
  renderSceneBreakdown, saveStory, aiAutoFill,
  generateStoryLocal, loadServerStories
} from './pages/workshop.js';
import {
  refreshLibrary, viewStory, closeModal, editStory,
  deleteStory, toggleEdit, exportStory
} from './pages/library.js';
import {
  refreshPromptSel, onPromptStoryChange, sendToPrompts,
  storyToPrompts, generatePrompts, renderPrompts,
  scrollToScene, exportAllPrompts
} from './pages/prompts.js';
import {
  loadCamera, switchCamTab, renderCameraGrid,
  showComposeModal, doCompose
} from './pages/camera.js';
import { loadDashboard, updateProfile } from './pages/dashboard.js';

// ── Handler Registry ──
const handlers = {
  // Navigation
  switchTab:         (el) => switchTab(el.dataset.tab || 'home'),
  toggleMobileNav,
  toggleTheme,
  
  // Auth
  showAuthModal,
  closeAuthModal,
  showLoginForm,
  showRegisterForm,
  doLogin,
  doRegister,
  fillDemo:          (el) => fillDemo(el.dataset.username, el.dataset.password),
  
  // Workshop
  aiAutoFill,
  generateStory,
  saveStory,
  
  // Library
  closeModal,
  toggleEdit,
  exportStory,
  viewStory:         (el) => { const id = el.dataset.storyId; if (id) viewStory(id); },
  removeTag:         (el) => { const i = parseInt(el.dataset.index); if (!isNaN(i)) removeTag(i); },
  editFromModal:     (el) => { closeModal(); setTimeout(() => editStory(el.dataset.storyId), 100); },
  promptFromModal:   (el) => { closeModal(); setTimeout(() => storyToPrompts(el.dataset.storyId), 100); },
  
  // Prompts
  sendToPrompts,
  generatePrompts,
  
  // Camera
  showComposeModal,
  doCompose,
  switchCamTab:      (el) => switchCamTab(el.dataset.camTab, el),
  
  // Components
  toggleSection:     (el) => toggleSection(el.dataset.section),
  addCommonTag:      (el) => addCommonTag(el),
  
  // Reading / Preview
  toggleReadingMode,
  toggleFullscreenPreview,
  
  // Focus input
  focusInput:        (el) => {
    const target = document.getElementById(el.dataset.target);
    if (target) target.focus();
  },
  
  // Copy prompt (dynamic content)
  copyPrompt:        (el) => {
    const text = el.dataset.text || el.closest('.prompt-block')?.querySelector('.prompt-text')?.textContent || '';
    if (text) copyTxt(el, text);
  },
  
  // Delete story
  deleteStory:       (el) => {
    const id = el.dataset.storyId;
    if (id && confirm('確定要刪除這個故事嗎？')) deleteStory(id);
  },
};

// ── Central Event Delegation ──
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  
  const action = target.dataset.action;
  const handler = handlers[action];
  
  if (handler) {
    e.preventDefault();
    handler(target);
  } else {
    console.warn(`Unknown action: ${action}`);
  }
});

// ── Tag Input Delegation ──
document.addEventListener('keydown', (e) => {
  if (e.target.matches('#elements-input')) {
    handleTagInput(e);
  }
});

// ── Workshop Tab Switching ──
document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-wtab]');
  if (!tab) return;
  const tabId = tab.dataset.wtab;
  document.querySelectorAll('.workshop-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.workshop-tab-content').forEach(c => c.classList.remove('active'));
  tab.classList.add('active');
  const content = document.getElementById(`wtab-${tabId}`);
  if (content) content.classList.add('active');
});

// ── Filter Tags (Library) ──
document.addEventListener('click', (e) => {
  const tag = e.target.closest('.filter-tag');
  if (!tag) return;
  document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
  tag.classList.add('active');
  const filter = tag.dataset.filter;
  const cards = document.querySelectorAll('#library-grid .story-card');
  cards.forEach(card => {
    if (filter === 'all' || card.dataset.genre === filter) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
});

// ── Keyboard Shortcuts Panel ──
function showShortcutsPanel() {
  const shortcuts = [
    ['Ctrl+K', '搜尋'],
    ['Ctrl+S', '保存故事'],
    ['Ctrl+Enter', 'AI 生成'],
    ['Esc', '關閉 Modal'],
    ['1-6', '切換頁面'],
    ['?', '顯示快捷鍵'],
  ];
  
  let html = '<div style="display:grid;gap:.8rem">';
  shortcuts.forEach(([key, desc]) => {
    html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--border)">
      <span style="font-family:var(--mono);font-size:.75rem;background:var(--surface-3);padding:.2rem .6rem;border-radius:4px;border:1px solid var(--border-light)">${key}</span>
      <span style="font-size:.85rem;color:var(--text-muted)">${desc}</span>
    </div>`;
  });
  html += '</div>';
  
  document.getElementById('modal-title').textContent = '鍵盤快捷鍵';
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('story-modal').classList.add('active');
}

// ── Initialize ──
async function initApp() {
  loadTheme();
  await checkAuth();
  await loadServerStories();
  initKeyboardShortcuts();
  initScrollReveal();
  
  // Footer reveal
  const footer = document.querySelector('.site-footer');
  if (footer) {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { footer.classList.add('visible'); io.unobserve(footer); }
    }, { threshold: 0.1 });
    io.observe(footer);
  }
  
  // Load home page
  refreshHome();
  
  // Add keyboard shortcut for '?'
  document.addEventListener('keydown', (e) => {
    if (e.key === '?' && !e.target.matches('input, textarea, select')) {
      e.preventDefault();
      showShortcutsPanel();
    }
  });
}

// Start
initApp();
