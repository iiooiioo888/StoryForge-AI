// ============================================
// StoryForge AI — Video Prompts (ES Module)
// ============================================
import { DB } from '../api.js';
import { esc, toast, copyTxt } from '../utils.js';

let currentScenes = [];

export function refreshPromptSel() {
  const select = document.getElementById('prompt-story-select');
  if (!select) return;
  select.innerHTML = '<option value="">選擇一個故事...</option>' +
    DB.getAll().map(s => `<option value="${s.id}">${esc(s.title || '未命名')}</option>`).join('');
}

export function onPromptStoryChange() {
  const result = document.getElementById('prompts-result');
  const empty = document.getElementById('prompts-empty');
  if (result) result.innerHTML = '';
  if (empty) empty.style.display = 'block';
}

export function sendToPrompts() {
  const content = document.getElementById('story-edit-area')?.value || document.getElementById('story-output')?.textContent;
  if (!content) return toast('請先生成故事', 'error');
  document.querySelector('[data-tab="prompts"]')?.click();
}

export function storyToPrompts(id) {
  document.querySelector('[data-tab="prompts"]')?.click();
  setTimeout(() => {
    const select = document.getElementById('prompt-story-select');
    if (select) select.value = id;
  }, 100);
}

export async function generatePrompts() {
  const storyId = document.getElementById('prompt-story-select')?.value;
  if (!storyId) return toast('請先選擇故事', 'error');
  
  const story = DB.getById(storyId);
  if (!story) return toast('找不到故事', 'error');
  
  const style = document.getElementById('prompt-video-style')?.value || 'cinematic';
  const platform = document.getElementById('prompt-platform')?.value || 'sora';
  const loading = document.getElementById('prompt-loading');
  const btn = document.getElementById('btn-gen-prompts');
  
  if (loading) loading.classList.add('active');
  if (btn) btn.disabled = true;
  
  // Generate scenes from story content
  await new Promise(r => setTimeout(r, 1000));
  
  const content = (story.content || '').replace(/《[^》]+》\n*/g, '').trim();
  const scenes = content.split(/[。！？]/).filter(s => s.trim().length > 10).slice(0, 6);
  
  currentScenes = scenes.map((scene, i) => ({
    id: i + 1,
    title: `場景 ${i + 1}`,
    summary: scene.trim().substring(0, 80),
    mainPrompt: `Cinematic ${style} shot. ${scene.trim()}. ${platform} compatible. 4K resolution.`,
    camera: 'Medium shot — Slow push-in',
    lens: '50mm prime',
    lighting: 'Cinematic lighting',
    fps: '24fps',
    duration: '8s',
    aspect: '16:9',
  }));
  
  renderPrompts(story.title);
  const empty = document.getElementById('prompts-empty');
  if (empty) empty.style.display = 'none';
  if (loading) loading.classList.remove('active');
  if (btn) btn.disabled = false;
  toast(`已為 ${currentScenes.length} 個場景生成影片提示詞`, 'success');
}

function renderPrompts(title) {
  const result = document.getElementById('prompts-result');
  if (!result || !currentScenes.length) return;
  
  let html = `<div class="section-title" style="margin-bottom:1.5rem">
    《${esc(title || '未命名')}》共 ${currentScenes.length} 個場景
  </div>`;
  
  currentScenes.forEach((scene, i) => {
    html += `
      <div class="prompt-section" id="ps-${i}">
        <div class="prompt-section-header">
          <h3>場景 ${scene.id}</h3>
          <span style="font-family:var(--mono);font-size:.6rem;color:var(--text-dim)">${scene.duration} | ${scene.fps}</span>
        </div>
        <div class="prompt-section-body">
          <p style="font-size:.88rem;color:var(--text-muted);margin-bottom:1rem">${esc(scene.summary)}</p>
          <div class="prompt-block">
            <div class="prompt-type">Main Prompt</div>
            <div class="prompt-text">${esc(scene.mainPrompt)}</div>
            <button class="copy-btn" data-action="copyPrompt" data-text="${esc(scene.mainPrompt)}">COPY</button>
          </div>
          <div class="tech-grid">
            <div class="tech-item"><div class="tech-key">鏡頭</div><div class="tech-val">${esc(scene.camera)}</div></div>
            <div class="tech-item"><div class="tech-key">鏡片</div><div class="tech-val">${esc(scene.lens)}</div></div>
            <div class="tech-item"><div class="tech-key">影格率</div><div class="tech-val">${esc(scene.fps)}</div></div>
            <div class="tech-item"><div class="tech-key">時長</div><div class="tech-val">${esc(scene.duration)}</div></div>
          </div>
        </div>
      </div>`;
  });
  
  result.innerHTML = html;
}

export function scrollToScene(index) {
  const el = document.getElementById(`ps-${index}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function exportAllPrompts() {
  if (!currentScenes.length) return toast('沒有可匯出的提示詞', 'error');
  
  let md = '# StoryForge AI — 影片提示詞\n\n';
  currentScenes.forEach(s => {
    md += `## 場景 ${s.id}\n\n${s.mainPrompt}\n\n---\n\n`;
  });
  
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
  a.download = 'prompts.md';
  a.click();
  toast('已匯出', 'success');
}
