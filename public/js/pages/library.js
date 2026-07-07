// ═══ Library ═══
import { DB } from '../api.js';
import { toast } from '../utils.js';

export function refreshLibrary() {
  const stories = DB.getAll();
  const grid = document.getElementById('library-grid');
  const empty = document.getElementById('library-empty');
  const count = document.getElementById('lib-count');
  if (count) count.textContent = `${stories.length} 篇`;
  if (!grid) return;
  if (!stories.length) { grid.innerHTML = ''; if (empty) empty.style.display = ''; return; }
  if (empty) empty.style.display = 'none';
  grid.innerHTML = stories.map((s, i) => {
    const bg = `hsl(${7 * Math.abs(s.title?.charCodeAt(0) || 65) % 360},45%,18%)`;
    return `<div class="card" data-action="viewStory" data-story-id="${s.id}" style="animation-delay:${i*.05}s">
      <div style="height:80px;background:${bg};border-radius:var(--radius);margin-bottom:.8rem;display:flex;align-items:center;justify-content:center;font-size:1.5rem">📖</div>
      <h3>${esc(s.title || '未命名')}</h3>
      <p>${esc(s.content?.substring(0, 80) || '')}...</p>
      <div class="card-meta"><span>${(s.wordCount || 0).toLocaleString()} 字</span><span>${esc(s.genre || '')}</span></div>
    </div>`;
  }).join('');
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
  state_editId = id;
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

import { state } from '../router.js';
let state_editId = null;

export function deleteStory(id) {
  if (!confirm('確定刪除？')) return;
  DB.delete(id); refreshLibrary(); toast('已刪除');
}

export function sendToPrompts(id) {
  document.getElementById('story-modal')?.classList.remove('active');
  switchTab('prompts');
  setTimeout(() => { document.getElementById('prompt-story-select').value = id; }, 100);
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
