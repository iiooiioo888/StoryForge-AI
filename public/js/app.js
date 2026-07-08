// ═══ StoryForge AI — App Entry (Unified Pipeline) ═══
import { api, DB } from './api.js';
import { toast } from './utils.js';
import { checkAuth, updateAuthUI, showAuthModal, closeModal, showLoginForm, showRegisterForm, fillDemo, doLogin, doRegister } from './auth.js';
import { switchTab, toggleTheme, loadTheme, loadTemplate } from './router.js';
import { refreshHome } from './pages/home.js';
import { generateStory, saveStory, exportStory, aiAutoFill } from './pages/workshop.js';
import {
  refreshLibrary, viewStory, editStory, saveEdit, deleteStory, sendToPrompts,
  duplicateStory, toggleFavorite, addTag, removeTag,
  exportSingleStory, exportAllStories, batchExport, importStories,
  toggleSelectMode, selectAll, deselectAll, batchDelete
} from './pages/library.js';
import { refreshPromptSel, generatePrompts } from './pages/prompts.js';
import { loadCamera, loadCameraTab } from './pages/camera.js';
import { showRechargeModal, doRecharge } from './pages/credits.js';
import { initGridControls, applyGridLayout, applyCardOrder } from './grid.js';
import {
  generateVideoStory, doExportJSON, doExportMD, doExportPlatform, doCopyAll, doSaveVideoStory
} from './pages/video-story.js';
import {
  initPipeline, startPipeline, endPipeline, jumpToStep,
  sendToVideoScript, generateVideoFromLibrary, quickGenerate
} from './pipeline.js';
import { initWritingAssistant, abortStreaming, streamToElement } from './ai-assistant.js';

// ═══ Event Delegation ═══
const actions = {
  // Navigation
  switchTab: (el) => switchTab(el.dataset.tab || 'home'),
  toggleTheme,

  // Auth
  showAuthModal, closeModal, showLoginForm, showRegisterForm,
  fillDemo: (el) => fillDemo(el.dataset.username, el.dataset.password),
  doLogin, doRegister,

  // Workshop
  generateStory, saveStory, exportStory, aiAutoFill,

  // Library
  viewStory: (el) => viewStory(el.dataset.storyId),
  editStory: (el) => { closeModal(); setTimeout(() => editStory(el.dataset.storyId), 100); },
  saveEdit: (el) => saveEdit(el.dataset.storyId),
  deleteStory: (el) => deleteStory(el.dataset.storyId),
  duplicateStory: (el) => { duplicateStory(el.dataset.storyId); },
  toggleFavorite: (el) => { toggleFavorite(el.dataset.storyId); },
  addTag: (el) => addTag(el.dataset.storyId),
  removeTag: (el) => removeTag(el.dataset.storyId, el.dataset.tag),
  sendToPrompts: (el) => { closeModal(); setTimeout(() => sendToPrompts(el.dataset.storyId), 100); },
  exportSingleStory: (el) => exportSingleStory(el.dataset.storyId),
  exportAllStories, batchExport, importStories,
  toggleSelectMode, selectAll, deselectAll, batchDelete,

  // Prompts
  generatePrompts,
  loadCameraTab: (el) => loadCameraTab(el.dataset.camTab),

  // Credits
  showRechargeModal, doRecharge,

  // Video Story
  generateVideoStory,
  exportScriptJSON: doExportJSON,
  exportScriptMD: doExportMD,
  exportScriptPlatform: doExportPlatform,
  copyAllPrompts: doCopyAll,
  saveVideoStory: doSaveVideoStory,

  // Pipeline
  startPipeline: () => startPipeline(),
  quickGenerate,
  endPipeline,
  jumpToStep: (el) => jumpToStep(el.dataset.step),

  // Cross-page: Workshop → Video Story
  sendToVideoScript: (el) => {
    closeModal();
    setTimeout(() => sendToVideoScript(el.dataset.storyId), 100);
  },

  // Cross-page: Library → Video Story
  generateVideoFromLibrary: (el) => {
    closeModal();
    setTimeout(() => generateVideoFromLibrary(el.dataset.storyId), 100);
  },

  // Cross-page: Workshop → Prompts (with pipeline)
  sendToPromptsWithPipeline: (el) => {
    closeModal();
    const storyId = el.dataset.storyId;
    import('./pipeline.js').then(m => m.advancePipeline('prompts', { storyId }));
    setTimeout(() => sendToPrompts(storyId), 100);
  },

  logout: () => { location.reload(); },
  abortStreaming,
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

// Library search (debounced)
let searchTimer;
document.addEventListener('input', (e) => {
  if (e.target.id === 'search-input') {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      import('./pages/library.js').then(m => m.refreshLibrary());
    }, 200);
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  const tabs = ['home', 'workshop', 'library', 'prompts', 'camera', 'credits', 'video-story'];
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

// Library genre filter & sort
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
    initGridControls();
    initPipeline();
    initWritingAssistant();
    refreshHome();
    console.log('StoryForge AI initialized');
  } catch (err) {
    console.error('Init error:', err);
  }
}

init();
