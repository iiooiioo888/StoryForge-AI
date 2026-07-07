// ═══ Workshop ═══
import { DB, api, currentUser } from '../api.js';
import { toast } from '../utils.js';
import { state, switchTab } from '../router.js';

export async function generateStory() {
  const title = document.getElementById('w-title')?.value;
  const genre = document.getElementById('w-genre')?.value;
  const theme = document.getElementById('w-theme')?.value;
  const setting = document.getElementById('w-setting')?.value;
  const characters = document.getElementById('w-characters')?.value;
  const pov = document.getElementById('w-pov')?.value;
  const tone = document.getElementById('w-tone')?.value;
  
  if (!title && !theme) { toast('請至少填寫標題或主題', 'warning'); return; }
  
  const btn = document.getElementById('btn-generate');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 生成中...'; }
  
  try {
    // Try LLM API first
    if (currentUser) {
      const result = await api('/llm/generate-full-story', {
        method: 'POST',
        body: { title, genre, theme, setting, characters, pov, tone }
      });
      
      if (result.story) {
        const content = result.story.content || result.story.raw || JSON.stringify(result.story);
        const outline = result.story.outline || null;
        const chars = result.story.characters || [];
        
        // Save to DB
        const story = DB.add({
          title: title || 'AI 生成故事',
          content,
          genre, theme, setting, characters, pov, tone,
          outline, charCards: chars,
          wordCount: content.length,
          sceneCount: (content.match(/第.*場景/g) || []).length || 3,
          isAiGenerated: true,
        });
        
        state.editId = story.id;
        state.storyContent = content;
        renderStory(content);
        renderOutline(outline);
        renderCharacters(chars);
        toast('故事生成完成！ (' + (result.model || 'AI') + ')', 'success');
        if (result.credits !== undefined) toast('剩餘積分: ' + result.credits, 'info');
        return;
      }
    }
    
    // Fallback: local generation
    const content = localGenerate(title, genre, theme, setting, characters, pov, tone);
    const story = DB.add({
      title: title || '我的故事', content, genre, theme, setting, characters, pov, tone,
      wordCount: content.length, sceneCount: 3,
    });
    state.editId = story.id;
    state.storyContent = content;
    renderStory(content);
    toast('故事已生成（本地模式）', 'success');
    
  } catch (e) {
    toast('生成失敗: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✦ AI 生成故事'; }
  }
}

function localGenerate(title, genre, theme, setting, chars, pov, tone) {
  const charList = (chars || '').split('\n').filter(c => c.trim());
  const c1 = charList[0]?.split('-')[0]?.trim() || '主角';
  const c2 = charList[1]?.split('-')[0]?.trim() || '';
  
  return '《' + (title || '未命名故事') + '》\n\n' +
    '在' + (setting || '一個神秘的地方') + '，' + c1 + '踏上了冒險的旅程。\n\n' +
    (c2 ? c2 + '的出現改變了一切。\n\n' : '') +
    '圍繞著「' + (theme || '成長與冒險') + '」的核心，' + c1 + '將面對前所未有的挑戰...\n\n' +
    '第一章：開始\n\n' +
    (setting || '這個世界') + '充滿了未知。' + c1 + '站在命運的十字路口...\n\n' +
    '第二章：轉折\n\n' +
    '一切都在那一刻改變了。' + c1 + '發現了一個隱藏已久的真相...\n\n' +
    '第三章：高潮\n\n' +
    '最終的對決即將來臨。' + c1 + '必須做出選擇...\n\n' +
    '（故事未完）';
}

function renderStory(content) {
  const el = document.getElementById('story-output');
  if (el) {
    const div = document.createElement('div');
    div.style.cssText = 'line-height:1.9;font-size:.95rem;white-space:pre-wrap';
    div.textContent = content;
    el.innerHTML = '';
    el.appendChild(div);
  }
}

function renderOutline(outline) {
  const el = document.getElementById('outline-content');
  if (!el || !outline) return;
  if (typeof outline === 'string') {
    const div = document.createElement('div');
    div.style.cssText = 'line-height:1.8';
    div.textContent = outline;
    el.innerHTML = '';
    el.appendChild(div);
  } else {
    el.innerHTML = Object.entries(outline).map(([k, v]) =>
      '<div style="margin-bottom:1rem"><strong style="color:var(--accent)">' + esc(k) + '</strong><div style="color:var(--text-muted);margin-top:.3rem">' + esc(typeof v === 'string' ? v : JSON.stringify(v)) + '</div></div>'
    ).join('');
  }
}

function renderCharacters(chars) {
  const el = document.getElementById('characters-content');
  if (!el || !chars?.length) return;
  el.innerHTML = chars.map(c =>
    '<div class="card" style="margin-bottom:.8rem;cursor:default">' +
    '<h3>' + esc(c.name || '角色') + '</h3>' +
    '<p style="margin:.3rem 0">' + esc(c.description || '') + '</p>' +
    (c.personality ? '<p style="font-size:.8rem;color:var(--text-dim)">性格: ' + esc(c.personality) + '</p>' : '') +
    (c.backstory ? '<p style="font-size:.8rem;color:var(--text-dim)">背景: ' + esc(c.backstory) + '</p>' : '') +
    '</div>'
  ).join('');
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function saveStory() {
  const title = document.getElementById('w-title')?.value || '未命名';
  const content = state.storyContent || document.getElementById('story-output')?.textContent || '';
  if (!content) { toast('沒有內容可保存', 'warning'); return; }
  if (state.editId) {
    DB.update(state.editId, { title, content });
  } else {
    const story = DB.add({ title, content, genre: document.getElementById('w-genre')?.value });
    state.editId = story.id;
  }
  toast('已保存');
}

export function exportStory() {
  const content = state.storyContent || document.getElementById('story-output')?.textContent || '';
  if (!content) { toast('沒有內容可匯出', 'warning'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  a.download = (document.getElementById('w-title')?.value || 'story') + '.txt';
  a.click();
  toast('已匯出');
}

export async function aiAutoFill() {
  const btn = document.getElementById('btn-ai-autofill');
  if (!currentUser) { toast('請先登入', 'warning'); return; }
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 生成中...'; }
  try {
    const result = await api('/llm/generate-all-fields', { method: 'POST', body: {} });
    if (result.fields) {
      const f = result.fields;
      if (f.title) document.getElementById('w-title').value = f.title;
      if (f.genre) document.getElementById('w-genre').value = f.genre;
      if (f.theme) document.getElementById('w-theme').value = f.theme;
      if (f.setting) document.getElementById('w-setting').value = f.setting;
      if (f.characters) document.getElementById('w-characters').value = f.characters;
      if (f.pov) document.getElementById('w-pov').value = f.pov;
      if (f.tone) document.getElementById('w-tone').value = f.tone;
      toast('AI 已自動填入所有欄位');
    }
  } catch (e) { toast('AI 生成失敗: ' + e.message, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '✦ AI 全權生成'; } }
}
