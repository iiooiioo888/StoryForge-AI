// ============================================
// StoryForge AI — Main Entry Point (ES Module)
// ============================================

// ── Imports ──
import { currentUser, api, DB, SUB_GENRES } from './api.js';
import { esc, formatNum, timeAgo, copyTxt, toast } from './utils.js';
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
  editFromModal:     (el) => { closeModal(); editStory(el.dataset.storyId); },
  promptFromModal:   (el) => { closeModal(); storyToPrompts(el.dataset.storyId); },
  
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

// ── Initialize ──
async function initApp() {
  loadTheme();
  await checkAuth();
  await loadServerStories();
  initKeyboardShortcuts();
  
  // Scroll reveal observer
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal, .reveal-scale, .reveal-left, .reveal-right').forEach(el => io.observe(el));
  
  // Load home page
  refreshHome();
}

// Start
initApp();
