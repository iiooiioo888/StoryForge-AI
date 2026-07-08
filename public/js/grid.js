// ═══ Grid Manager — Advanced Grid Layout System ═══
import { toast } from './utils.js';

// ─── Grid State ───
const GRID_KEY = 'sf_grid_prefs';
const prefs = loadPrefs();

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(GRID_KEY)) || {};
  } catch { return {}; }
}

function savePrefs() {
  localStorage.setItem(GRID_KEY, JSON.stringify(prefs));
}

// ─── Card Sizes ───
const CARD_SIZES = {
  small: { minW: 200, ratio: 'compact' },
  medium: { minW: 280, ratio: 'normal' },
  large: { minW: 360, ratio: 'wide' },
};

// ─── Initialize Grid Controls ───
export function initGridControls() {
  // Size buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-grid-size]');
    if (!btn) return;
    prefs.size = btn.dataset.gridSize;
    savePrefs();
    applyGridLayout();
    updateGridButtons();
    toast(`卡片：${{ small: '小', medium: '中', large: '大' }[prefs.size] || '中'}`, 'info');
  });

  // Column buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-grid-cols]');
    if (!btn) return;
    prefs.cols = btn.dataset.gridCols;
    savePrefs();
    applyGridLayout();
    updateGridButtons();
    toast(`欄數：${prefs.cols === 'auto' ? '自適應' : prefs.cols + ' 欄'}`, 'info');
  });

  // Layout toggle (grid / masonry)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-grid-layout]');
    if (!btn) return;
    prefs.layout = btn.dataset.gridLayout;
    savePrefs();
    applyGridLayout();
    updateGridButtons();
    toast(`佈局：${{ grid: '網格', masonry: '瀑布流' }[prefs.layout] || '網格'}`, 'info');
  });

  // Drag and drop
  initDragDrop();

  // Apply saved preferences
  applyGridLayout();
  updateGridButtons();
}

// ─── Apply Grid Layout ───
export function applyGridLayout() {
  const grids = document.querySelectorAll('.grid');
  grids.forEach(grid => {
    // Size class
    grid.classList.remove('grid-small', 'grid-medium', 'grid-large');
    grid.classList.add(`grid-${prefs.size || 'medium'}`);

    // Layout class
    grid.classList.remove('grid-masonry');
    if (prefs.layout === 'masonry') grid.classList.add('grid-masonry');

    // Columns
    const cols = prefs.cols || 'auto';
    if (cols === 'auto') {
      grid.style.removeProperty('grid-template-columns');
    } else {
      const minW = CARD_SIZES[prefs.size || 'medium'].minW;
      grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    }

    // Enable drag on library grid only
    if (grid.id === 'library-grid') {
      grid.setAttribute('data-draggable', 'true');
    }
  });
}

// ─── Update Button States ───
function updateGridButtons() {
  // Size buttons
  document.querySelectorAll('[data-grid-size]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.gridSize === (prefs.size || 'medium'));
  });
  // Column buttons
  document.querySelectorAll('[data-grid-cols]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.gridCols === (prefs.cols || 'auto'));
  });
  // Layout buttons
  document.querySelectorAll('[data-grid-layout]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.gridLayout === (prefs.layout || 'grid'));
  });
}

// ─── Drag & Drop ───
function initDragDrop() {
  let dragEl = null;
  let dragGhost = null;
  let placeholder = null;
  let startX, startY;
  let isDragging = false;

  document.addEventListener('mousedown', (e) => {
    const grid = e.target.closest('.grid[data-draggable="true"]');
    if (!grid) return;
    const card = e.target.closest('.card');
    if (!card) return;
    // Don't drag if clicking buttons/inputs
    if (e.target.closest('button, input, select, textarea, .card-fav-btn, .card-select-check')) return;

    dragEl = card;
    startX = e.clientX;
    startY = e.clientY;
    isDragging = false;

    const onMouseMove = (e2) => {
      const dx = e2.clientX - startX;
      const dy = e2.clientY - startY;

      if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        isDragging = true;
        startDrag(card, e2);
      }

      if (isDragging && dragGhost) {
        dragGhost.style.left = (e2.clientX - dragGhost.offsetWidth / 2) + 'px';
        dragGhost.style.top = (e2.clientY - dragGhost.offsetHeight / 2) + 'px';
        updateDropTarget(e2, grid);
      }
    };

    const onMouseUp = (e2) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      if (isDragging) {
        endDrag(grid);
      }
      dragEl = null;
      isDragging = false;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function startDrag(card, e) {
    card.classList.add('dragging');

    // Create ghost
    dragGhost = card.cloneNode(true);
    dragGhost.classList.add('drag-ghost-card');
    dragGhost.style.width = card.offsetWidth + 'px';
    document.body.appendChild(dragGhost);

    // Create placeholder
    placeholder = document.createElement('div');
    placeholder.className = 'drag-placeholder';
    placeholder.style.height = card.offsetHeight + 'px';
    card.parentNode.insertBefore(placeholder, card);

    // Hide original
    card.style.display = 'none';
  }

  function updateDropTarget(e, grid) {
    const cards = [...grid.querySelectorAll('.card:not(.dragging):not(.drag-ghost-card)')];
    let closest = null;
    let closestDist = Infinity;

    cards.forEach(c => {
      const rect = c.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = c;
      }
    });

    if (closest && placeholder) {
      const rect = closest.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        closest.parentNode.insertBefore(placeholder, closest);
      } else {
        closest.parentNode.insertBefore(placeholder, closest.nextSibling);
      }
    }
  }

  function endDrag(grid) {
    if (dragEl) {
      dragEl.classList.remove('dragging');
      dragEl.style.display = '';
      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(dragEl, placeholder);
      }
    }

    // Save new order
    saveCardOrder(grid);

    // Cleanup
    if (dragGhost) { dragGhost.remove(); dragGhost = null; }
    if (placeholder) { placeholder.remove(); placeholder = null; }
  }

  function saveCardOrder(grid) {
    if (grid.id !== 'library-grid') return;
    const cards = grid.querySelectorAll('[data-story-id]');
    const order = [...cards].map(c => c.dataset.storyId);
    prefs.cardOrder = order;
    savePrefs();
  }
}

// ─── Apply Saved Card Order ───
export function applyCardOrder() {
  const grid = document.getElementById('library-grid');
  if (!grid || !prefs.cardOrder?.length) return;

  const cardMap = {};
  grid.querySelectorAll('[data-story-id]').forEach(c => {
    cardMap[c.dataset.storyId] = c;
  });

  // Reorder: put cards in saved order, then append any new ones at end
  const fragment = document.createDocumentFragment();
  const placed = new Set();

  prefs.cardOrder.forEach(id => {
    if (cardMap[id]) {
      fragment.appendChild(cardMap[id]);
      placed.add(id);
    }
  });

  // Append remaining cards not in saved order
  Object.entries(cardMap).forEach(([id, card]) => {
    if (!placed.has(id)) fragment.appendChild(card);
  });

  grid.appendChild(fragment);
}

// ─── Get Current Prefs (for external use) ───
export function getGridPrefs() {
  return { ...prefs };
}

// ─── Export for init ───
export { CARD_SIZES };
