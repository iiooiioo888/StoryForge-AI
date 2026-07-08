// ═══ Library — Full-featured Story Management ═══
import { DB } from '../api.js';
import { toast, esc } from '../utils.js';
import { state, switchTab } from '../router.js';
import { renderStoryCard } from '../components.js';
import { applyGridLayout, applyCardOrder } from '../grid.js';

const GENRE_NAMES = {
  scifi: '科幻', fantasy: '奇幻', romance: '愛情', mystery: '懸疑',
  horror: '恐怖', wuxia: '武俠', cyberpunk: '賽博朋克', historical: '歷史',
};
const GENRE_ICONS = {
  scifi: '🚀', fantasy: '🗡️', romance: '💕', mystery: '🔍',
  horror: '👻', wuxia: '⚔️', cyberpunk: '🌃', historical: '📜',
};
const POV_NAMES = {
  'third-limited': '第三人稱有限', 'third-omniscient': '第三人稱全知',
  'first': '第一人稱', 'second': '第二人稱',
};
const TONE_NAMES = {
  literary: '文學性', suspense: '懸疑緊張', epic: '史詩磅礴',
  humorous: '幽默輕鬆', dark: '黑暗沉重', romantic: '浪漫細膩',
};

let selectMode = false;
let selectedIds = new Set();
let activeFilter = 'all';

// ─── Refresh Library ───
export function refreshLibrary() {
  let stories = DB.getAll();
  const grid = document.getElementById('library-grid');
  const empty = document.getElementById('library-empty');
  const count = document.getElementById('lib-count');

  // Apply sub-filter (favorites / ai / manual)
  if (activeFilter === 'favorites') stories = stories.filter(s => s.favorite);
  else if (activeFilter === 'ai') stories = stories.filter(s => s.isAiGenerated);
  else if (activeFilter === 'manual') stories = stories.filter(s => !s.isAiGenerated);

  // Apply genre filter
  const genreFilter = document.getElementById('lib-filter-genre')?.value;
  if (genreFilter) stories = stories.filter(s => s.genre === genreFilter);

  // Apply search
  const q = (document.getElementById('search-input')?.value || '').toLowerCase();
  if (q) stories = stories.filter(s =>
    (s.title || '').toLowerCase().includes(q) ||
    (s.content || '').toLowerCase().includes(q) ||
    (s.tags || []).some(t => t.toLowerCase().includes(q)) ||
    (s.theme || '').toLowerCase().includes(q)
  );

  // Apply sort
  const sortBy = document.getElementById('lib-sort')?.value || 'newest';
  stories.sort((a, b) => {
    switch (sortBy) {
      case 'oldest': return (a.created_at || 0) > (b.created_at || 0) ? 1 : -1;
      case 'title': return (a.title || '').localeCompare(b.title || '');
      case 'words': return (b.wordCount || 0) - (a.wordCount || 0);
      default: return (a.created_at || 0) < (b.created_at || 0) ? 1 : -1;
    }
  });

  // Update stats
  updateStats();

  if (count) count.textContent = `${stories.length} 篇`;
  if (!grid) return;
  if (!stories.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = stories.map((s, i) => renderLibraryCard(s, i)).join('');

  // Apply grid layout and saved card order
  applyGridLayout();
  applyCardOrder();

  // Restore select state
  if (selectMode) {
    document.querySelectorAll('.card-select-check').forEach(cb => {
      cb.checked = selectedIds.has(cb.dataset.id);
      cb.closest('.card')?.classList.toggle('selected', cb.checked);
    });
    updateBatchBar();
  }
}

// ─── Enhanced Card Renderer ───
function renderLibraryCard(story, index = 0) {
  const hue = (7 * Math.abs(story.title?.charCodeAt(0) || 65)) % 360;
  const bg = `linear-gradient(135deg, hsl(${hue},50%,14%) 0%, hsl(${hue + 30},40%,10%) 100%)`;
  const icon = GENRE_ICONS[story.genre] || '📖';
  const isFav = story.favorite;
  const tagHtml = (story.tags || []).slice(0, 3).map(t =>
    `<span class="tag" style="font-size:.6rem;padding:.15rem .4rem">${esc(t)}</span>`
  ).join('');
  const selectCheck = selectMode
    ? `<input type="checkbox" class="card-select-check" data-id="${story.id}" ${selectedIds.has(story.id) ? 'checked' : ''}>`
    : '';

  return `<div class="card ${selectedIds.has(story.id) ? 'selected' : ''}" data-action="viewStory" data-story-id="${story.id}" style="animation-delay:${index * .04}s">
    ${selectCheck}
    <button class="card-fav-btn ${isFav ? 'active' : ''}" data-action="toggleFavorite" data-story-id="${story.id}" title="${isFav ? '取消收藏' : '收藏'}">
      ${isFav ? '⭐' : '☆'}
    </button>
    <div style="height:90px;background:${bg};border-radius:var(--radius);margin-bottom:.8rem;display:flex;align-items:center;justify-content:center;font-size:1.8rem;position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 70% 30%,hsla(${hue},60%,50%,.15),transparent 60%)"></div>
      <span style="position:relative;filter:drop-shadow(0 2px 8px rgba(0,0,0,.3))">${icon}</span>
      ${story.isAiGenerated ? '<span style="position:absolute;top:.4rem;right:.4rem;font-size:.65rem;background:rgba(0,0,0,.5);padding:.15rem .4rem;border-radius:4px">🤖</span>' : ''}
    </div>
    <h3>${esc(story.title || '未命名')}</h3>
    <p>${esc((story.content || '').substring(0, 80))}...</p>
    ${tagHtml ? `<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.4rem;position:relative">${tagHtml}</div>` : ''}
    <div class="card-meta">
      <span>${(story.wordCount || 0).toLocaleString()} 字</span>
      <span class="tag" style="font-size:.65rem">${esc(GENRE_NAMES[story.genre] || story.genre || '未分類')}</span>
    </div>
  </div>`;
}

// ─── Update Stats Banner ───
function updateStats() {
  const all = DB.getAll();
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('lib-stat-total', all.length);
  el('lib-stat-words', all.reduce((a, s) => a + (s.wordCount || 0), 0).toLocaleString());
  el('lib-stat-ai', all.filter(s => s.isAiGenerated).length);
  el('lib-stat-fav', all.filter(s => s.favorite).length);
}

// ─── View Story (Enhanced Detail Modal) ───
export function viewStory(id) {
  const story = DB.getById(id);
  if (!story) return;

  const genreName = GENRE_NAMES[story.genre] || story.genre || '未分類';
  const genreIcon = GENRE_ICONS[story.genre] || '📖';
  const created = story.created_at ? new Date(story.created_at).toLocaleString('zh-TW') : '未知';
  const tags = (story.tags || []);
  const tagHtml = tags.map(t => `<span class="tag">${esc(t)} <span class="remove" data-action="removeTag" data-story-id="${id}" data-tag="${esc(t)}">×</span></span>`).join(' ');

  document.getElementById('modal-title').textContent = story.title || '未命名';
  document.getElementById('modal-body').innerHTML = `
    <!-- Metadata Header -->
    <div class="story-detail-header">
      <div class="story-detail-meta">
        <span class="tag" style="font-size:.75rem">${genreIcon} ${esc(genreName)}</span>
        ${story.isAiGenerated ? '<span class="tag" style="font-size:.75rem;background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.2);color:var(--success)">🤖 AI</span>' : '<span class="tag" style="font-size:.75rem">✍️ 手動</span>'}
        ${story.favorite ? '<span class="tag" style="font-size:.75rem">⭐ 收藏</span>' : ''}
      </div>
      <div class="story-detail-stats">
        <span>📊 ${(story.wordCount || 0).toLocaleString()} 字</span>
        <span>🎬 ${story.sceneCount || 0} 場景</span>
        <span>📅 ${created}</span>
      </div>
    </div>

    <!-- Metadata Grid -->
    <div class="story-meta-grid">
      ${story.theme ? `<div class="meta-item"><span class="meta-label">主題</span><span class="meta-value">${esc(story.theme)}</span></div>` : ''}
      ${story.setting ? `<div class="meta-item"><span class="meta-label">世界觀</span><span class="meta-value">${esc(story.setting)}</span></div>` : ''}
      ${story.pov ? `<div class="meta-item"><span class="meta-label">視角</span><span class="meta-value">${esc(POV_NAMES[story.pov] || story.pov)}</span></div>` : ''}
      ${story.tone ? `<div class="meta-item"><span class="meta-label">語調</span><span class="meta-value">${esc(TONE_NAMES[story.tone] || story.tone)}</span></div>` : ''}
      ${story.structure ? `<div class="meta-item"><span class="meta-label">結構</span><span class="meta-value">${esc(story.structure)}</span></div>` : ''}
      ${story.era ? `<div class="meta-item"><span class="meta-label">時代</span><span class="meta-value">${esc(story.era)}</span></div>` : ''}
    </div>

    <!-- Tags -->
    <div class="story-tags-section">
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">
        <span style="font-size:.78rem;font-weight:600;color:var(--text-muted)">標籤</span>
        <input class="form-input" id="add-tag-input" placeholder="新增標籤..." style="flex:1;padding:.3rem .6rem;font-size:.78rem">
        <button class="btn btn-ghost btn-sm" data-action="addTag" data-story-id="${id}">+</button>
      </div>
      <div class="tags-container" id="story-tags">${tagHtml || '<span style="font-size:.78rem;color:var(--text-dim)">無標籤</span>'}</div>
    </div>

    <!-- Content -->
    <div class="story-content-section">
      <div style="font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.5rem">內容預覽</div>
      <div style="line-height:1.9;max-height:40vh;overflow-y:auto;white-space:pre-wrap;font-size:.9rem">${esc(story.content || '')}</div>
    </div>

    <!-- Actions -->
    <div class="story-detail-actions">
      <button class="btn btn-primary btn-sm" data-action="editStory" data-story-id="${id}">✏️ 編輯</button>
      <button class="btn btn-secondary btn-sm" data-action="sendToPrompts" data-story-id="${id}">🎬 生成提示詞</button>
      <button class="btn btn-ghost btn-sm" data-action="duplicateStory" data-story-id="${id}">📋 複製</button>
      <button class="btn btn-ghost btn-sm" data-action="exportSingleStory" data-story-id="${id}">📤 匯出</button>
      <button class="btn btn-ghost btn-sm" data-action="deleteStory" data-story-id="${id}" style="margin-left:auto;color:var(--danger)">🗑 刪除</button>
    </div>`;
  document.getElementById('story-modal').classList.add('active');
}

// ─── Edit Story (Full Edit Modal) ───
export function editStory(id) {
  const story = DB.getById(id);
  if (!story) return;

  document.getElementById('modal-title').textContent = '✏️ 編輯故事';
  document.getElementById('modal-body').innerHTML = `
    <div class="edit-form">
      <div class="form-group"><label class="form-label">標題</label><input class="form-input" id="edit-title" value="${esc(story.title || '')}"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">類型</label>
          <select class="form-select" id="edit-genre">
            ${Object.entries(GENRE_NAMES).map(([k, v]) => `<option value="${k}" ${story.genre === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="form-label">子類型</label><input class="form-input" id="edit-subgenre" value="${esc(story.subgenre || '')}"></div>
      </div>
      <div class="form-group"><label class="form-label">主題</label><input class="form-input" id="edit-theme" value="${esc(story.theme || '')}"></div>
      <div class="form-group"><label class="form-label">世界觀</label><textarea class="form-textarea" id="edit-setting" rows="2">${esc(story.setting || '')}</textarea></div>
      <div class="form-group"><label class="form-label">角色</label><textarea class="form-textarea" id="edit-characters" rows="3">${esc(story.characters || '')}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">視角</label>
          <select class="form-select" id="edit-pov">
            ${Object.entries(POV_NAMES).map(([k, v]) => `<option value="${k}" ${story.pov === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="form-label">語調</label>
          <select class="form-select" id="edit-tone">
            ${Object.entries(TONE_NAMES).map(([k, v]) => `<option value="${k}" ${story.tone === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select></div>
      </div>
      <div class="form-group"><label class="form-label">內容</label><textarea class="form-textarea" id="edit-content" rows="10" style="font-size:.88rem;line-height:1.8">${esc(story.content || '')}</textarea></div>
      <div style="display:flex;gap:.5rem;margin-top:1rem">
        <button class="btn btn-primary" data-action="saveEdit" data-story-id="${id}" style="flex:1">💾 保存</button>
        <button class="btn btn-ghost" data-action="closeModal" style="flex:1">取消</button>
      </div>
    </div>`;
  document.getElementById('story-modal').classList.add('active');
}

// ─── Save Edit ───
export function saveEdit(id) {
  const title = document.getElementById('edit-title')?.value;
  const genre = document.getElementById('edit-genre')?.value;
  const subgenre = document.getElementById('edit-subgenre')?.value;
  const theme = document.getElementById('edit-theme')?.value;
  const setting = document.getElementById('edit-setting')?.value;
  const characters = document.getElementById('edit-characters')?.value;
  const pov = document.getElementById('edit-pov')?.value;
  const tone = document.getElementById('edit-tone')?.value;
  const content = document.getElementById('edit-content')?.value;

  if (!title && !content) { toast('標題和內容不能都為空', 'warning'); return; }

  DB.update(id, {
    title, genre, subgenre, theme, setting, characters, pov, tone, content,
    wordCount: (content || '').length,
    updated_at: new Date().toISOString(),
  });

  closeModal();
  refreshLibrary();
  toast('已保存修改');
}

// ─── Delete Story ───
export function deleteStory(id) {
  const story = DB.getById(id);
  if (!story) return;
  showConfirm(
    '🗑 刪除故事',
    `確定要刪除「${story.title || '未命名'}」嗎？此操作無法復原。`,
    () => { DB.delete(id); refreshLibrary(); closeModal(); toast('已刪除'); }
  );
}

// ─── Duplicate Story ───
export function duplicateStory(id) {
  const story = DB.getById(id);
  if (!story) return;
  const newStory = { ...story };
  delete newStory.id;
  delete newStory.created_at;
  newStory.title = (story.title || '未命名') + ' (副本)';
  newStory.favorite = false;
  DB.add(newStory);
  refreshLibrary();
  closeModal();
  toast('已複製故事');
}

// ─── Toggle Favorite ───
export function toggleFavorite(id) {
  const story = DB.getById(id);
  if (!story) return;
  DB.update(id, { favorite: !story.favorite });
  refreshLibrary();
  toast(story.favorite ? '已取消收藏' : '⭐ 已收藏');
}

// ─── Tags ───
export function addTag(id) {
  const input = document.getElementById('add-tag-input');
  const tag = (input?.value || '').trim();
  if (!tag) return;
  const story = DB.getById(id);
  if (!story) return;
  const tags = story.tags || [];
  if (tags.includes(tag)) { toast('標籤已存在', 'warning'); return; }
  tags.push(tag);
  DB.update(id, { tags });
  input.value = '';
  viewStory(id); // re-render
  toast('已新增標籤');
}

export function removeTag(id, tag) {
  const story = DB.getById(id);
  if (!story) return;
  const tags = (story.tags || []).filter(t => t !== tag);
  DB.update(id, { tags });
  viewStory(id); // re-render
}

// ─── Export ───
export function exportSingleStory(id) {
  const story = DB.getById(id);
  if (!story) return;
  downloadJSON([story], `story-${story.title || 'export'}.json`);
  toast('已匯出');
}

export function exportAllStories() {
  const stories = DB.getAll();
  if (!stories.length) { toast('沒有故事可匯出', 'warning'); return; }
  downloadJSON(stories, `storyforge-backup-${new Date().toISOString().slice(0, 10)}.json`);
  toast(`已匯出 ${stories.length} 篇故事`);
}

export function batchExport() {
  const stories = DB.getAll().filter(s => selectedIds.has(s.id));
  if (!stories.length) { toast('請先選擇故事', 'warning'); return; }
  downloadJSON(stories, `storyforge-export-${stories.length}篇.json`);
  toast(`已匯出 ${stories.length} 篇故事`);
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Import ───
export function importStories() {
  document.getElementById('import-file-input')?.click();
}

export function handleImport(files) {
  if (!files?.length) return;
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(text);
          const stories = Array.isArray(data) ? data : [data];
          let imported = 0;
          stories.forEach(s => {
            if (s.content || s.title) {
              delete s.id;
              delete s.created_at;
              s.title = s.title || '匯入的故事';
              DB.add(s);
              imported++;
            }
          });
          refreshLibrary();
          toast(`已匯入 ${imported} 篇故事`);
        } else if (file.name.endsWith('.txt')) {
          DB.add({
            title: file.name.replace('.txt', ''),
            content: text,
            wordCount: text.length,
          });
          refreshLibrary();
          toast('已匯入 TXT 檔案');
        }
      } catch (err) {
        toast('匯入失敗：' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  });
}

// ─── Select Mode & Batch ───
export function toggleSelectMode() {
  selectMode = !selectMode;
  selectedIds.clear();
  const btn = document.getElementById('btn-select-mode');
  const bar = document.getElementById('batch-bar');
  if (btn) btn.classList.toggle('active', selectMode);
  if (bar) bar.style.display = selectMode ? '' : 'none';
  refreshLibrary();
}

export function selectAll() {
  DB.getAll().forEach(s => selectedIds.add(s.id));
  document.querySelectorAll('.card-select-check').forEach(cb => { cb.checked = true; cb.closest('.card')?.classList.add('selected'); });
  updateBatchBar();
}

export function deselectAll() {
  selectedIds.clear();
  document.querySelectorAll('.card-select-check').forEach(cb => { cb.checked = false; cb.closest('.card')?.classList.remove('selected'); });
  updateBatchBar();
}

export function batchDelete() {
  if (!selectedIds.size) { toast('請先選擇故事', 'warning'); return; }
  showConfirm(
    '🗑 批量刪除',
    `確定要刪除 ${selectedIds.size} 篇故事嗎？此操作無法復原。`,
    () => {
      selectedIds.forEach(id => DB.delete(id));
      selectedIds.clear();
      toggleSelectMode();
      refreshLibrary();
      toast('已批量刪除');
    }
  );
}

function updateBatchBar() {
  const count = document.getElementById('batch-count');
  if (count) count.textContent = `${selectedIds.size} 已選`;
}

// ─── Confirm Dialog Helper ───
function showConfirm(title, message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  const okBtn = document.getElementById('confirm-ok');
  if (!modal || !titleEl || !msgEl || !okBtn) {
    // Fallback to native confirm
    if (confirm(message)) onConfirm();
    return;
  }
  titleEl.textContent = title;
  msgEl.textContent = message;
  modal.classList.add('active');
  // Remove old listener, add new
  const newBtn = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newBtn, okBtn);
  newBtn.id = 'confirm-ok';
  newBtn.addEventListener('click', onConfirm, { once: true });
}

// ─── Load workshop story for editing ───
export function loadStoryToWorkshop(id) {
  const story = DB.getById(id);
  if (!story) return;
  state.editId = id;
  const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
  setVal('w-title', story.title);
  setVal('w-genre', story.genre);
  setVal('w-theme', story.theme);
  setVal('w-setting', story.setting);
  setVal('w-characters', story.characters);
  setVal('w-pov', story.pov);
  setVal('w-tone', story.tone);
  setVal('w-era', story.era);
  setVal('w-length', story.length);
  setVal('w-structure', story.structure);
  const output = document.getElementById('story-output');
  if (output) output.innerHTML = `<div style="line-height:1.9;white-space:pre-wrap">${esc(story.content || '')}</div>`;
  const wc = document.getElementById('w-word-count');
  if (wc) wc.textContent = `📊 ${(story.wordCount || 0).toLocaleString()} 字`;
}

// ─── sendToPrompts ───
export function sendToPrompts(id) {
  document.getElementById('story-modal')?.classList.remove('active');
  switchTab('prompts');
  setTimeout(() => { const sel = document.getElementById('prompt-story-select'); if (sel) sel.value = id; }, 100);
}

// ─── Event Listeners ───

// Card checkbox toggle (in select mode)
document.addEventListener('change', (e) => {
  if (e.target.classList.contains('card-select-check')) {
    const id = e.target.dataset.id;
    if (e.target.checked) selectedIds.add(id); else selectedIds.delete(id);
    e.target.closest('.card')?.classList.toggle('selected', e.target.checked);
    updateBatchBar();
  }
});

// Filter chips
document.addEventListener('click', (e) => {
  const chip = e.target.closest('.filter-chip');
  if (!chip) return;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  activeFilter = chip.dataset.filter;
  refreshLibrary();
});

// Import file handler
document.addEventListener('change', (e) => {
  if (e.target.id === 'import-file-input') {
    handleImport(e.target.files);
    e.target.value = ''; // reset
  }
});

// Add tag on Enter
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'add-tag-input' && e.key === 'Enter') {
    e.preventDefault();
    const storyId = e.target.closest('[data-story-id]')?.dataset.storyId ||
      document.querySelector('[data-action="addTag"]')?.dataset.storyId;
    if (storyId) addTag(storyId);
  }
});
