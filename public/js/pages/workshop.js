// ═══ Workshop ═══
import { DB, api, currentUser } from '../api.js';
import { toast, esc } from '../utils.js';
import { state, switchTab } from '../router.js';
import { generate, generateOutline, generateCharCards, generateScenes, SUB_GENRES, GENRE_NAMES, POV_NAMES, STRUCTURE_NAMES } from '../engine/story-engine.js';
import { streamToElement } from '../ai-assistant.js';

export async function generateStory() {
  const title = document.getElementById('w-title')?.value;
  const genre = document.getElementById('w-genre')?.value || 'scifi';
  const theme = document.getElementById('w-theme')?.value;
  const setting = document.getElementById('w-setting')?.value;
  const characters = document.getElementById('w-characters')?.value;
  const pov = document.getElementById('w-pov')?.value || 'third-limited';
  const tone = document.getElementById('w-tone')?.value;
  const era = document.getElementById('w-era')?.value || 'present';
  const length = document.getElementById('w-length')?.value || 'medium';
  const structure = document.getElementById('w-structure')?.value || 'three-act';

  if (!title && !theme) { toast('請至少填寫標題或主題', 'warning'); return; }

  const btn = document.getElementById('btn-generate');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 生成中...'; }

  try {
    // Try LLM API with SSE streaming first
    if (currentUser) {
      // Prepare output area for streaming
      const outputEl = document.getElementById('story-output');
      if (outputEl) {
        outputEl.innerHTML = '<div style="line-height:1.9;font-size:.95rem;white-space:pre-wrap" id="story-stream-target"></div>';
      }
      const streamTarget = document.getElementById('story-stream-target');

      const genreName = GENRE_NAMES[genre] || genre;
      const systemPrompt = `你是一位才華橫溢的小說家。請根據以下設定撰寫完整故事。直接輸出故事正文，不要加任何解釋或標記。\n\n故事類型：${genreName}\n語調：${tone || '文學性'}\n視角：${pov || '第三人稱有限'}\n結構：${structure || '三幕式'}`;
      const userPrompt = `標題：${title || '未命名'}\n主題：${theme || '自由發揮'}\n世界觀：${setting || '默認世界'}\n角色：${characters || '主角'}\n\n請撰寫一個完整的故事。`;

      const content = await streamToElement(streamTarget, systemPrompt, userPrompt, {
        appendMode: false,
        onComplete: (text) => {
          state.storyContent = text;
          const wc = document.getElementById('w-word-count');
          if (wc) wc.textContent = `📊 ${text.length} 字 · ${text.split(/[\n。！？]/).filter(s => s.trim()).length} 段`;
        },
      });

      if (content) {
        const outline = generateOutline(genre,
          (characters || '').split('\n')[0]?.split('-')[0]?.trim() || '旅者',
          (characters || '').split('\n')[1]?.split('-')[0]?.trim() || '旅者',
          setting || '那座被遺忘的城市'
        );
        const charCards = generateCharCards(characters);

        const story = DB.add({
          title: title || 'AI 生成故事', content, genre, theme, setting, characters, pov, tone, era, length, structure,
          outline, charCards,
          wordCount: content.length,
          sceneCount: (content.match(/第.*場景/g) || []).length || 3,
          isAiGenerated: true,
        });
        state.editId = story.id;
        state.storyContent = content;
        renderOutline(outline);
        renderCharacters(charCards);
        renderScenesFromContent(content);
        toast('故事生成完成！（串流模式）', 'success');
        return;
      }

      // Fallback: non-streaming API
      const result = await api('/llm/generate-full-story', {
        method: 'POST',
        body: { title, genre, theme, setting, characters, pov, tone, era, length, structure }
      });

      if (result.story) {
        const content = result.story.content || result.story.raw || JSON.stringify(result.story);
        const outline = result.story.outline || null;
        const chars = result.story.characters || [];

        const story = DB.add({
          title: title || 'AI 生成故事',
          content,
          genre, theme, setting, characters, pov, tone, era, length, structure,
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
        renderScenesFromContent(content);
        toast('故事生成完成！ (' + (result.model || 'AI') + ')', 'success');
        if (result.credits !== undefined) toast('剩餘積分: ' + result.credits, 'info');
        return;
      }
    }

    // Fallback: StoryEngine local generation
    const content = generate({ title, genre, theme, setting, characters, pov, tone, era, length, structure });
    const charCards = generateCharCards(characters);
    const outline = generateOutline(genre,
      (characters || '').split('\n')[0]?.split('-')[0]?.trim() || '旅者',
      (characters || '').split('\n')[1]?.split('-')[0]?.trim() || '旅者',
      setting || '那座被遺忘的城市'
    );

    const story = DB.add({
      title: title || '我的故事', content, genre, theme, setting, characters, pov, tone, era, length, structure,
      outline, charCards,
      wordCount: content.length,
      sceneCount: (content.match(/·\s*·\s*·/g) || []).length + 1 || 3,
    });
    state.editId = story.id;
    state.storyContent = content;
    renderStory(content);
    renderOutline(outline);
    renderCharacters(charCards);
    renderScenesFromContent(content);
    toast('故事已生成（本地引擎）', 'success');

  } catch (e) {
    toast('生成失敗: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✦ AI 生成故事'; }
  }
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
  // Update word count display
  const wc = document.getElementById('w-word-count');
  if (wc) wc.textContent = `📊 ${content.length} 字 · ${content.split(/[\n。！？]/).filter(s => s.trim()).length} 段`;
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
    const actNames = { act1: '第一幕：建置', act2: '第二幕：對抗', act3: '第三幕：解決' };
    el.innerHTML = Object.entries(outline).map(([k, v]) =>
      '<div style="margin-bottom:1.2rem">' +
      '<strong style="color:var(--accent)">' + esc(actNames[k] || k) + '</strong>' +
      '<ul style="margin-top:.4rem;padding-left:1.2rem;color:var(--text-muted);line-height:1.8">' +
      (Array.isArray(v) ? v.map(p => '<li>' + esc(p) + '</li>').join('') : '<li>' + esc(typeof v === 'string' ? v : JSON.stringify(v)) + '</li>') +
      '</ul></div>'
    ).join('');
  }
}

function renderCharacters(chars) {
  const el = document.getElementById('characters-content');
  if (!el || !chars?.length) return;
  el.innerHTML = chars.map(c =>
    '<div class="card" style="margin-bottom:.8rem;cursor:default">' +
    '<div style="display:flex;align-items:center;gap:.8rem;margin-bottom:.5rem">' +
    '<div style="width:2.2rem;height:2.2rem;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">' + esc((c.name || '?').charAt(0)) + '</div>' +
    '<div><h3 style="margin:0">' + esc(c.name || '角色') + '</h3>' +
    (c.role ? '<span style="font-size:.75rem;color:var(--text-dim)">' + esc(c.role) + '</span>' : '') +
    '</div></div>' +
    (c.description ? '<p style="margin:.3rem 0">' + esc(c.description) + '</p>' : '') +
    (c.archetype ? '<p style="font-size:.8rem;color:var(--text-dim)">原型: ' + esc(c.archetype) + '</p>' : '') +
    (c.background ? '<p style="font-size:.8rem;color:var(--text-dim)">背景: ' + esc(c.background) + '</p>' : '') +
    (c.motivation ? '<p style="font-size:.8rem;color:var(--text-dim)">動機: ' + esc(c.motivation) + '</p>' : '') +
    (c.flaw ? '<p style="font-size:.8rem;color:var(--text-dim)">缺陷: ' + esc(c.flaw) + '</p>' : '') +
    (c.personality ? '<p style="font-size:.8rem;color:var(--text-dim)">性格: ' + esc(c.personality) + '</p>' : '') +
    (c.backstory ? '<p style="font-size:.8rem;color:var(--text-dim)">背景: ' + esc(c.backstory) + '</p>' : '') +
    (c.traits ? '<p style="font-size:.8rem;color:var(--text-dim)">特質: ' + esc(c.traits) + '</p>' : '') +
    '</div>'
  ).join('');
}

function renderScenesFromContent(content) {
  const el = document.getElementById('scenes-content');
  if (!el) return;
  // Split content into scenes by common scene markers
  const sceneMarkers = content.split(/(?:第[一二三四五六七八九十\d]+[章幕場景]|·\s*·\s*·|---|\n\n\n)/g)
    .filter(s => s.trim().length > 20);
  if (sceneMarkers.length <= 1) {
    // Fallback: split by paragraphs
    const paragraphs = content.split(/\n\n+/).filter(s => s.trim().length > 20);
    if (paragraphs.length <= 1) {
      el.innerHTML = '<div class="empty"><div class="icon">🎬</div><p>內容較短，無法自動拆分場景</p></div>';
      return;
    }
    el.innerHTML = paragraphs.slice(0, 8).map((p, i) =>
      '<div class="card" style="margin-bottom:.8rem;padding:1rem;cursor:default">' +
      '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">' +
      '<span class="tag" style="background:var(--accent);color:#fff;font-size:.65rem">場景 ' + (i + 1) + '</span>' +
      '</div>' +
      '<p style="line-height:1.8;font-size:.9rem;white-space:pre-wrap">' + esc(p.trim().substring(0, 200)) + (p.length > 200 ? '...' : '') + '</p>' +
      '</div>'
    ).join('');
    return;
  }
  el.innerHTML = sceneMarkers.map((s, i) =>
    '<div class="card" style="margin-bottom:.8rem;padding:1rem;cursor:default">' +
    '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">' +
    '<span class="tag" style="background:var(--accent);color:#fff;font-size:.65rem">場景 ' + (i + 1) + '</span>' +
    '</div>' +
    '<p style="line-height:1.8;font-size:.9rem;white-space:pre-wrap">' + esc(s.trim().substring(0, 300)) + (s.length > 300 ? '...' : '') + '</p>' +
    '</div>'
  ).join('');
}

export function renderScenes() {
  const el = document.getElementById('scenes-content');
  if (!el) return;
  const genre = document.getElementById('w-genre')?.value || 'scifi';
  const characters = document.getElementById('w-characters')?.value || '';
  const setting = document.getElementById('w-setting')?.value || '';
  const era = document.getElementById('w-era')?.value || 'present';
  const length = document.getElementById('w-length')?.value || 'medium';
  const tone = document.getElementById('w-tone')?.value || '';

  const scenes = generateScenes({ genre, characters, setting, era, length, tone });
  el.innerHTML = scenes.map(s =>
    '<div class="card" style="margin-bottom:.8rem;padding:1rem">' +
    '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">' +
    '<span class="badge" style="background:var(--accent);color:#fff;font-size:.7rem;padding:.15rem .5rem;border-radius:4px">' + esc(s.title) + '</span>' +
    '<span style="font-size:.7rem;color:var(--text-dim)">場景 ' + s.id + '</span>' +
    '</div>' +
    '<p style="line-height:1.8;font-size:.9rem;white-space:pre-wrap">' + esc(s.text) + '</p>' +
    '</div>'
  ).join('');
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

// ─── Sub-genre dropdown ───
const genreEl = document.getElementById('w-genre');
if (genreEl) {
  genreEl.addEventListener('change', () => {
    const sub = document.getElementById('w-subgenre');
    if (!sub) return;
    const opts = SUB_GENRES[genreEl.value] || [];
    sub.innerHTML = '<option value="">選擇...</option>' +
      opts.map(o => `<option value="${o}">${o}</option>`).join('');
  });
}
