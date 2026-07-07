// ============================================
// StoryForge AI — Library (ES Module)
// ============================================
import { DB } from '../api.js';
import { esc, toast } from '../utils.js';
import { renderCard } from '../components.js';

let currentFilter = 'all';

export function refreshLibrary() {
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  const stories = DB.getAll().filter(s => {
    const matchFilter = currentFilter === 'all' || s.genre === currentFilter;
    const matchSearch = !search || s.title?.toLowerCase().includes(search) || s.content?.toLowerCase().includes(search);
    return matchFilter && matchSearch;
  });
  
  const grid = document.getElementById('library-grid');
  const empty = document.getElementById('library-empty');
  if (!grid) return;
  
  if (!stories.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  
  if (empty) empty.style.display = 'none';
  grid.innerHTML = stories.map(s => renderCard(s)).join('');
}

export function viewStory(id) {
  const story = DB.getById(id);
  if (!story) return;
  
  document.getElementById('modal-title').textContent = story.title || '未命名故事';
  
  const content = `
    <div style="margin-bottom:1rem">
      <span class="genre-tag" style="display:inline-block">${story.genre || '未分類'}</span>
      ${story.subgenre ? `<span class="mini-tag" style="margin-left:.5rem">${story.subgenre}</span>` : ''}
    </div>
    ${story.theme ? `<p style="font-size:.88rem;color:var(--text-muted);margin-bottom:.5rem">主題：${esc(story.theme)}</p>` : ''}
    <div class="story-output" style="max-height:50vh;overflow-y:auto">${(story.content || '').replace(/\n/g, '<br>')}</div>
    <div class="btn-group" style="margin-top:1.5rem">
      <button class="btn btn-primary" data-action="editFromModal" data-story-id="${id}">編輯</button>
      <button class="btn btn-secondary" data-action="promptFromModal" data-story-id="${id}">生成提示詞</button>
    </div>
  `;
  
  document.getElementById('modal-body').innerHTML = content;
  document.getElementById('story-modal').classList.add('active');
}

export function closeModal() {
  document.getElementById('story-modal')?.classList.remove('active');
}

export function editStory(id) {
  const story = DB.getById(id);
  if (!story) return;
  
  // Set workshop fields
  document.getElementById('w-title').value = story.title || '';
  document.getElementById('w-genre').value = story.genre || '';
  document.getElementById('w-theme').value = story.theme || '';
  document.getElementById('w-setting').value = story.setting || '';
  document.getElementById('w-characters').value = story.characters || '';
  document.getElementById('w-tone').value = story.tone || 'literary';
  document.getElementById('w-pov').value = story.pov || 'third-limited';
  
  // Show edit area
  const output = document.getElementById('story-output');
  const editArea = document.getElementById('story-edit-area');
  if (output) output.style.display = 'none';
  if (editArea) {
    editArea.style.display = 'block';
    editArea.value = story.content || '';
  }
  
  // Switch to workshop
  const { switchTab } = require_router();
  switchTab('workshop');
  toast('已載入故事', 'success');
}

function require_router() {
  // Lazy import to avoid circular deps
  return { switchTab: (tab) => document.querySelector(`[data-tab="${tab}"]`)?.click() };
}

export function deleteStory(id) {
  if (!confirm('確定要刪除？')) return;
  DB.delete(id);
  refreshLibrary();
  toast('已刪除', 'success');
}

export function toggleEdit() {
  const output = document.getElementById('story-output');
  const editArea = document.getElementById('story-edit-area');
  if (!output || !editArea) return;
  
  if (editArea.style.display === 'none') {
    editArea.style.display = 'block';
    output.style.display = 'none';
  } else {
    editArea.style.display = 'none';
    output.style.display = 'block';
    output.innerHTML = editArea.value.replace(/\n/g, '<br>');
  }
}

export function exportStory() {
  const content = document.getElementById('story-edit-area')?.value || document.getElementById('story-output')?.textContent || '';
  if (!content) return toast('沒有可匯出的故事', 'error');
  
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  a.download = `${document.getElementById('w-title')?.value || 'story'}.txt`;
  a.click();
  toast('已匯出', 'success');
}
