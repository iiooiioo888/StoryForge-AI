// ═══ Prompts ═══
import { DB, api, currentUser } from '../api.js';
import { toast, esc } from '../utils.js';

export function refreshPromptSel() {
  const sel = document.getElementById('prompt-story-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">選擇故事...</option>' + DB.getAll().map(s =>
    `<option value="${s.id}">${esc(s.title || '未命名')}</option>`
  ).join('');
}

export async function generatePrompts() {
  const id = document.getElementById('prompt-story-select')?.value;
  if (!id) { toast('請選擇故事', 'warning'); return; }
  const story = DB.getById(id);
  if (!story) { toast('找不到故事', 'error'); return; }
  
  const platform = document.getElementById('prompt-platform')?.value || 'general';
  const result = document.getElementById('prompts-result');
  const empty = document.getElementById('prompts-empty');
  
  // Try LLM API
  if (currentUser) {
    try {
      const r = await api('/llm/generate-video-prompt', {
        method: 'POST',
        body: { description: story.content?.substring(0, 1000) || story.title, platform, style: 'cinematic', mood: 'dramatic' }
      });
      if (r.prompt) {
        renderPromptResult(r.prompt, story.title);
        if (empty) empty.style.display = 'none';
        toast('提示詞已生成');
        return;
      }
    } catch (e) {
      console.log('LLM failed, using local:', e.message);
    }
  }
  
  // Local fallback
  const scenes = (story.content || '').split(/[。！？]/).filter(s => s.trim().length > 10).slice(0, 5);
  const prompts = scenes.map((scene, i) => ({
    full_prompt: `Cinematic ${platform} shot. ${scene.trim()}. Professional lighting, 4K quality.`,
    scene_description: scene.trim().substring(0, 80),
    camera_movement: 'Slow push-in',
    shot_size: 'Medium shot',
  }));
  
  if (result) {
    result.innerHTML = prompts.map((p, i) => `
      <div class="prompt-block">
        <div class="prompt-type">場景 ${i + 1}</div>
        <div class="prompt-text">${esc(p.full_prompt)}</div>
        <button class="copy-btn" onclick="navigator.clipboard.writeText('${esc(p.full_prompt).replace(/'/g, "\\'")}')">COPY</button>
      </div>
    `).join('');
  }
  if (empty) empty.style.display = 'none';
  toast(`已生成 ${prompts.length} 個提示詞`);
}

function renderPromptResult(prompt, title) {
  const result = document.getElementById('prompts-result');
  if (!result) return;
  result.innerHTML = `
    <div class="section-title">《${esc(title)}》影片提示詞</div>
    <div class="prompt-block">
      <div class="prompt-type">Main Prompt</div>
      <div class="prompt-text">${esc(prompt.full_prompt || prompt.fullPrompt || '')}</div>
      <button class="copy-btn" onclick="navigator.clipboard.writeText('${esc(prompt.full_prompt || prompt.fullPrompt || '').replace(/'/g, "\\'")}')">COPY</button>
    </div>
    ${prompt.negative_prompt ? `<div class="prompt-block"><div class="prompt-type">Negative</div><div class="prompt-text" style="color:var(--text-dim)">${esc(prompt.negative_prompt)}</div></div>` : ''}
    ${prompt.camera_movement ? `<div style="font-size:.8rem;color:var(--text-muted);margin-top:.5rem">📷 ${esc(prompt.camera_movement)} · ${esc(prompt.shot_size || '')}</div>` : ''}
  `;
}

