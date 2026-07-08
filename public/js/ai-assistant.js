// ═══ AI Writing Assistant — Floating Toolbar + SSE Streaming ═══
import { currentUser } from './api.js';
import { toast } from './utils.js';

// ─── State ───
let toolbar = null;
let streaming = false;
let abortController = null;

// ─── Writing Modes ───
const MODES = {
  continue: {
    icon: '▶️', label: '續寫', color: '#6366f1',
    systemPrompt: '你是一位小說家，正在繼續撰寫一個未完成的故事。你需要保持風格一致、角色性格穩定，並自然地推進劇情。直接續寫，不要重複已有內容，不要加解釋。',
    buildPrompt: (text) => `請從以下內容直接續寫，保持風格一致：\n\n${text}`,
  },
  expand: {
    icon: '📖', label: '擴寫', color: '#8b5cf6',
    systemPrompt: '你是一位文學編輯。將用戶提供的段落擴展得更加豐富、生動，加入更多細節描寫、心理活動或環境氛圍，但保持原意不變。',
    buildPrompt: (text) => `請將以下段落擴寫，加入更多細節和描寫：\n\n${text}`,
  },
  shorten: {
    icon: '✂️', label: '縮寫', color: '#f59e0b',
    systemPrompt: '你是一位文學編輯。將用戶提供的段落精簡，保留核心意思和關鍵情節，去除冗餘描寫。',
    buildPrompt: (text) => `請將以下段落精簡縮寫，保留核心內容：\n\n${text}`,
  },
  rewrite: {
    icon: '🔄', label: '改寫', color: '#10b981',
    systemPrompt: '你是一位文學編輯。根據用戶要求，對故事進行改寫或潤色。保持核心意思，但改善文字品質、節奏和感染力。',
    buildPrompt: (text) => `請改寫以下段落，提升文學品質：\n\n${text}`,
  },
  translate_en: {
    icon: '🇬🇧', label: '英譯', color: '#3b82f6',
    systemPrompt: '你是一位專業的文學翻譯家。將故事翻譯成英文，同時保持文學品質和風格。翻譯要自然流暢，符合英文文學表達習慣。',
    buildPrompt: (text) => `請將以下中文內容翻譯成英文：\n\n${text}`,
  },
  translate_ja: {
    icon: '🇯🇵', label: '日譯', color: '#ef4444',
    systemPrompt: '你是一位專業的文學翻譯家。將故事翻譯成日文，同時保持文學品質和風格。',
    buildPrompt: (text) => `请将以下内容翻译成日文：\n\n${text}`,
  },
  tone_suspense: {
    icon: '😱', label: '懸疑化', color: '#6b7280',
    systemPrompt: '你是一位文學編輯。將用戶提供的段落改寫為懸疑風格，增加緊張感、暗示和伏筆。',
    buildPrompt: (text) => `請將以下段落改寫為懸疑風格：\n\n${text}`,
  },
  tone_poetic: {
    icon: '🌸', label: '詩意化', color: '#ec4899',
    systemPrompt: '你是一位文學編輯。將用戶提供的段落改寫為詩意、文學性更強的風格。',
    buildPrompt: (text) => `請將以下段落改寫為更具詩意的文學風格：\n\n${text}`,
  },
};

// ─── Initialize ───
export function initWritingAssistant() {
  createToolbar();

  // Listen for text selection
  document.addEventListener('mouseup', handleSelection);
  document.addEventListener('keyup', handleSelection);

  // Hide on click outside
  document.addEventListener('mousedown', (e) => {
    if (toolbar && !toolbar.contains(e.target)) {
      hideToolbar();
    }
  });
}

// ─── Create Floating Toolbar ───
function createToolbar() {
  toolbar = document.createElement('div');
  toolbar.id = 'ai-writing-toolbar';
  toolbar.className = 'ai-writing-toolbar';
  toolbar.innerHTML = `
    <div class="ai-toolbar-header">
      <span class="ai-toolbar-title">✨ AI 助手</span>
      <button class="ai-toolbar-close" data-action="hideToolbar">✕</button>
    </div>
    <div class="ai-toolbar-modes">
      ${Object.entries(MODES).map(([key, mode]) => `
        <button class="ai-mode-btn" data-mode="${key}" title="${mode.label}" style="--mode-color:${mode.color}">
          <span class="ai-mode-icon">${mode.icon}</span>
          <span class="ai-mode-label">${mode.label}</span>
        </button>
      `).join('')}
    </div>
    <div class="ai-toolbar-status" id="ai-toolbar-status" style="display:none">
      <div class="ai-streaming-indicator">
        <span class="ai-streaming-dot"></span>
        <span class="ai-streaming-text">AI 生成中...</span>
      </div>
      <button class="btn btn-ghost btn-sm" data-action="abortStreaming">停止</button>
    </div>
  `;
  document.body.appendChild(toolbar);

  // Mode button clicks
  toolbar.querySelectorAll('.ai-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAIMode(btn.dataset.mode));
  });

  // Close button
  toolbar.querySelector('.ai-toolbar-close').addEventListener('click', hideToolbar);
}

// ─── Handle Text Selection ───
function handleSelection(e) {
  if (streaming) return;
  if (toolbar?.contains(e.target)) return;

  const selection = window.getSelection();
  const text = selection?.toString().trim();

  if (text && text.length >= 5) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    showToolbar(rect);
  } else {
    // Don't hide immediately - let toolbar clicks register
    setTimeout(() => {
      if (!toolbar?.contains(document.activeElement)) {
        hideToolbar();
      }
    }, 200);
  }
}

// ─── Show/Hide Toolbar ───
function showToolbar(rect) {
  if (!toolbar) return;
  const x = Math.min(rect.left + window.scrollX, window.innerWidth - 340);
  const y = rect.top + window.scrollY - toolbar.offsetHeight - 10;

  toolbar.style.left = Math.max(10, x) + 'px';
  toolbar.style.top = Math.max(10, y) + 'px';
  toolbar.classList.add('visible');

  // Show status, hide modes
  toolbar.querySelector('.ai-toolbar-modes').style.display = '';
  toolbar.querySelector('#ai-toolbar-status').style.display = 'none';
}

function hideToolbar() {
  if (toolbar) toolbar.classList.remove('visible');
}

// ─── Handle AI Mode ───
async function handleAIMode(mode) {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();
  if (!selectedText) { toast('請先選取文字', 'warning'); return; }
  if (!currentUser) { toast('請先登入以使用 AI 功能', 'warning'); return; }

  const modeConfig = MODES[mode];
  if (!modeConfig) return;

  // Find the target textarea/contenteditable
  const activeEl = document.activeElement;
  const isTextarea = activeEl?.tagName === 'TEXTAREA';
  const isContentEditable = activeEl?.contentEditable === 'true';
  const isStoryOutput = activeEl?.id === 'story-output' || activeEl?.closest('#story-output');

  if (!isTextarea && !isContentEditable && !isStoryOutput) {
    toast('請先點擊文字輸入區域', 'warning');
    return;
  }

  // Show streaming state
  setStreamingState(true);

  try {
    const result = await streamAI(modeConfig.systemPrompt, modeConfig.buildPrompt(selectedText));

    if (result) {
      // Replace selected text with AI result
      if (isTextarea) {
        const start = activeEl.selectionStart;
        const end = activeEl.selectionEnd;
        const before = activeEl.value.substring(0, start);
        const after = activeEl.value.substring(end);
        activeEl.value = before + result + after;
        activeEl.selectionStart = activeEl.selectionEnd = start + result.length;
        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (isContentEditable || isStoryOutput) {
        // For contentEditable or story output
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(result));
      }
      toast(`${modeConfig.label}完成`);
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      toast('AI 生成失敗：' + e.message, 'error');
    }
  } finally {
    setStreamingState(false);
    hideToolbar();
  }
}

// ─── SSE Streaming ───
async function streamAI(systemPrompt, userPrompt) {
  abortController = new AbortController();

  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/llm/stream', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 2048,
      temperature: 0.7,
    }),
    signal: abortController.signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '請求失敗');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            fullText += parsed.content;
            updateStreamingProgress(fullText);
          }
          if (parsed.error) throw new Error(parsed.error);
        } catch (e) {
          // Skip malformed JSON
        }
      }
    }
  }

  return fullText;
}

// ─── Streaming UI ───
function setStreamingState(active) {
  streaming = active;
  if (!toolbar) return;

  toolbar.querySelector('.ai-toolbar-modes').style.display = active ? 'none' : '';
  toolbar.querySelector('#ai-toolbar-status').style.display = active ? '' : 'none';

  if (!active) {
    const progressEl = toolbar.querySelector('.ai-streaming-text');
    if (progressEl) progressEl.textContent = 'AI 生成中...';
  }
}

function updateStreamingProgress(text) {
  const progressEl = toolbar.querySelector('.ai-streaming-text');
  if (progressEl) {
    const preview = text.length > 30 ? text.slice(-30) + '...' : text;
    progressEl.textContent = `生成中 ${text.length} 字`;
  }
}

// ─── Abort ───
export function abortStreaming() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

// ─── Get Auth Token ───
function getAuthToken() {
  // Try to get from cookie
  const cookies = document.cookie.split(';');
  for (const c of cookies) {
    const [key, val] = c.trim().split('=');
    if (key === 'token' || key === 'sf_token') return val;
  }
  return null;
}

// ─── Public: Stream to any element ───
export async function streamToElement(element, systemPrompt, userPrompt, options = {}) {
  if (!currentUser) { toast('請先登入', 'warning'); return null; }
  if (streaming) { toast('AI 正在生成中，請稍候', 'warning'); return null; }

  streaming = true;
  abortController = new AbortController();

  const { onChunk, onComplete, onError, appendMode = false } = options;

  try {
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/llm/stream', {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt: userPrompt, systemPrompt, maxTokens: 4096, temperature: 0.7 }),
      signal: abortController.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || '請求失敗');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullText += parsed.content;
              if (element) {
                if (appendMode) {
                  element.textContent += parsed.content;
                } else {
                  element.textContent = fullText;
                }
              }
              if (onChunk) onChunk(parsed.content, fullText);
            }
            if (parsed.error) throw new Error(parsed.error);
          } catch (e) { /* skip */ }
        }
      }
    }

    if (onComplete) onComplete(fullText);
    return fullText;

  } catch (e) {
    if (e.name !== 'AbortError') {
      if (onError) onError(e);
      else toast('AI 生成失敗：' + e.message, 'error');
    }
    return null;
  } finally {
    streaming = false;
    abortController = null;
  }
}

export { MODES, streaming };
