// ═══ Library ═══
import { DB } from '../api.js';
import { toast, esc } from '../utils.js';
import { state, switchTab } from '../router.js';
import { renderStoryCard } from '../components.js';

export function refreshLibrary() {
  let stories = DB.getAll();
  const grid = document.getElementById('library-grid');
  const empty = document.getElementById('library-empty');
  const count = document.getElementById('lib-count');

  // Apply genre filter
  const genreFilter = document.getElementById('lib-filter-genre')?.value;
  if (genreFilter) stories = stories.filter(s => s.genre === genreFilter);

  // Apply sort
  const sortBy = document.getElementById('lib-sort')?.value || 'newest';
  stories.sort((a, b) => {
    switch (sortBy) {
      case 'oldest': return (a.createdAt || 0) - (b.createdAt || 0);
      case 'title': return (a.title || '').localeCompare(b.title || '');
      case 'words': return (b.wordCount || 0) - (a.wordCount || 0);
      default: return (b.createdAt || 0) - (a.createdAt || 0); // newest
    }
  });

  if (count) count.textContent = `${stories.length} 篇`;
  if (!grid) return;
  if (!stories.length) { grid.innerHTML = ''; if (empty) empty.style.display = ''; return; }
  if (empty) empty.style.display = 'none';
  grid.innerHTML = stories.map((s, i) => renderStoryCard(s, i)).join('');
}

export function viewStory(id) {
  const story = DB.getById(id);
  if (!story) return;
  document.getElementById('modal-title').textContent = story.title || '未命名';
  document.getElementById('modal-body').innerHTML = `
    <div style="margin-bottom:1rem"><span class="tag">${esc(story.genre || '未分類')}</span></div>
    ${story.theme ? `<p style="color:var(--text-muted);margin-bottom:1rem">主題：${esc(story.theme)}</p>` : ''}
    <div style="line-height:1.9;max-height:50vh;overflow-y:auto;white-space:pre-wrap">${esc(story.content || '')}</div>
    <div style="margin-top:1.5rem;display:flex;gap:.5rem">
      <button class="btn btn-primary btn-sm" data-action="editStory" data-story-id="${id}">編輯</button>
      <button class="btn btn-secondary btn-sm" data-action="sendToPrompts" data-story-id="${id}">生成提示詞</button>
      <button class="btn btn-ghost btn-sm" data-action="deleteStory" data-story-id="${id}" style="margin-left:auto;color:var(--danger)">刪除</button>
    </div>`;
  document.getElementById('story-modal').classList.add('active');
}

export function editStory(id) {
  const story = DB.getById(id);
  if (!story) return;
  state.editId = id;
  document.getElementById('w-title').value = story.title || '';
  document.getElementById('w-genre').value = story.genre || '';
  document.getElementById('w-theme').value = story.theme || '';
  document.getElementById('w-setting').value = story.setting || '';
  document.getElementById('w-characters').value = story.characters || '';
  const output = document.getElementById('story-output');
  if (output) output.innerHTML = `<div style="line-height:1.9;white-space:pre-wrap">${esc(story.content || '')}</div>`;
  document.getElementById('story-modal').classList.remove('active');
  switchTab('workshop');
  toast('已載入故事');
}

export function deleteStory(id) {
  if (!confirm('確定刪除？')) return;
  DB.delete(id); refreshLibrary(); toast('已刪除');
}

export function sendToPrompts(id) {
  document.getElementById('story-modal')?.classList.remove('active');
  switchTab('prompts');
  setTimeout(() => { document.getElementById('prompt-story-select').value = id; }, 100);
}
