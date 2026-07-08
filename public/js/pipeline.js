// ═══ Pipeline Manager — Unified Creation Flow ═══
// Connects: Workshop → Video Story → Prompts → Camera → Library → Export

import { DB } from './api.js';
import { toast } from './utils.js';
import { switchTab, state } from './router.js';

// ─── Pipeline State ───
const PIPE_KEY = '***';
let pipeline = loadPipeline();

function loadPipeline() {
  try {
    return JSON.parse(localStorage.getItem(PIPE_KEY)) || { active: false, step: 0, data: {} };
  } catch { return { active: false, step: 0, data: {} }; }
}

function savePipeline() {
  localStorage.setItem(PIPE_KEY, JSON.stringify(pipeline));
}

// ─── Pipeline Steps ───
export const STEPS = [
  { id: 'workshop', label: '故事創作', icon: '✍️', tab: 'workshop' },
  { id: 'video-story', label: '影片腳本', icon: '🎬', tab: 'video-story' },
  { id: 'prompts', label: '提示詞', icon: '📝', tab: 'prompts' },
  { id: 'camera', label: '鏡頭調整', icon: '🎥', tab: 'camera' },
  { id: 'library', label: '保存管理', icon: '📚', tab: 'library' },
];

// ─── Start Pipeline ───
export function startPipeline(topic = '', genre = 'scifi') {
  pipeline = {
    active: true,
    step: 0,
    data: { topic, genre, storyId: null, videoStory: null, prompts: [] },
    startedAt: new Date().toISOString(),
  };
  savePipeline();
  renderPipelineBar();
  switchTab('workshop');
  toast('🎬 創作流水線已啟動！從故事開始吧');
}

// ─── Advance Pipeline ───
export function advancePipeline(stepId, data = {}) {
  if (!pipeline.active) return;

  const stepIndex = STEPS.findIndex(s => s.id === stepId);
  if (stepIndex >= 0) pipeline.step = stepIndex;

  Object.assign(pipeline.data, data);
  savePipeline();
  renderPipelineBar();
}

// ─── Jump to Step ───
export function jumpToStep(stepId) {
  const step = STEPS.find(s => s.id === stepId);
  if (!step) return;
  if (!pipeline.active) startPipeline();
  pipeline.step = STEPS.indexOf(step);
  savePipeline();
  renderPipelineBar();
  switchTab(step.tab);
}

// ─── End Pipeline ───
export function endPipeline() {
  pipeline = { active: false, step: 0, data: {} };
  savePipeline();
  renderPipelineBar();
  toast('流水線已完成');
}

// ─── Get Pipeline Data ───
export function getPipelineData() {
  return { ...pipeline };
}

// ─── Cross-Page Actions ───

// Workshop → Video Story: send story content to video story generator
export function sendToVideoScript(storyId) {
  const story = storyId ? DB.getById(storyId) : null;
  if (story) {
    advancePipeline('video-story', { storyId: story.id, topic: story.title, genre: story.genre });
    // Pre-fill video story form
    setTimeout(() => {
      const topicEl = document.getElementById('vs-topic');
      const genreEl = document.getElementById('vs-genre');
      const charEl = document.getElementById('vs-character');
      if (topicEl) topicEl.value = story.content?.substring(0, 500) || story.title || '';
      if (genreEl) genreEl.value = story.genre || 'scifi';
      if (charEl && story.characters) {
        const firstChar = story.characters.split('\n')[0]?.split('-')[0]?.trim();
        if (firstChar) charEl.value = firstChar;
      }
    }, 200);
  }
  switchTab('video-story');
}

// Video Story → Prompts: send generated prompts to prompts page
export function sendStoryPromptsToPromptsPage(prompts) {
  advancePipeline('prompts', { prompts });
  switchTab('prompts');
  // Auto-populate prompts result area
  setTimeout(() => {
    const result = document.getElementById('prompts-result');
    const empty = document.getElementById('prompts-empty');
    if (result && prompts?.length) {
      result.innerHTML = prompts.map((p, i) => `
        <div class="prompt-block">
          <div class="prompt-type">場景 ${i + 1}</div>
          <div class="prompt-text">${p.prompt || p}</div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText(this.closest('.prompt-block').querySelector('.prompt-text').textContent);this.textContent='✓';setTimeout(()=>this.textContent='COPY',1500)">COPY</button>
        </div>
      `).join('');
      if (empty) empty.style.display = 'none';
    }
  }, 200);
}

// Library → Video Story: generate video script from library story
export function generateVideoFromLibrary(storyId) {
  const story = DB.getById(storyId);
  if (!story) return;
  sendToVideoScript(storyId);
}

// Video Story → Library: save and link
export function saveAndLinkToLibrary(videoStoryData) {
  const story = DB.add({
    title: videoStoryData.title,
    content: generateSimpleScript(videoStoryData),
    genre: videoStoryData.genre,
    theme: videoStoryData.topic,
    isAiGenerated: true,
    wordCount: JSON.stringify(videoStoryData).length,
    sceneCount: videoStoryData.scenes.length,
    videoStory: videoStoryData,
    tags: ['影片腳本', videoStoryData.platform, videoStoryData.style],
    pipelineStep: pipeline.step,
  });
  advancePipeline('library', { storyId: story.id });
  return story;
}

function generateSimpleScript(story) {
  return story.scenes.map((s, i) =>
    `【場景 ${i + 1}：${s.title}】\n${s.narration}\n\n鏡頭：${s.camera}\n燈光：${s.lighting}\n\nPrompt:\n${s.mainPrompt}`
  ).join('\n\n════════════════\n\n');
}

// ─── Pipeline Bar Renderer ───
export function renderPipelineBar() {
  let bar = document.getElementById('pipeline-bar');

  if (!pipeline.active) {
    if (bar) bar.style.display = 'none';
    return;
  }

  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'pipeline-bar';
    document.querySelector('.main')?.prepend(bar);
  }

  bar.style.display = '';
  bar.className = 'pipeline-bar';

  bar.innerHTML = `
    <div class="pipeline-inner">
      <div class="pipeline-steps">
        ${STEPS.map((s, i) => `
          <button class="pipeline-step ${i === pipeline.step ? 'active' : ''} ${i < pipeline.step ? 'completed' : ''}" data-action="jumpToStep" data-step="${s.id}">
            <span class="pipeline-step-icon">${i < pipeline.step ? '✓' : s.icon}</span>
            <span class="pipeline-step-label">${s.label}</span>
          </button>
          ${i < STEPS.length - 1 ? '<span class="pipeline-arrow">→</span>' : ''}
        `).join('')}
      </div>
      <button class="btn btn-ghost btn-sm" data-action="endPipeline" title="結束流水線">✕</button>
    </div>`;
}

// ─── Quick Generate (One-click full pipeline) ───
export async function quickGenerate() {
  const topic = prompt('請輸入影片主題：');
  if (!topic) return;
  startPipeline(topic, 'scifi');
  // Auto-advance to video story
  setTimeout(() => {
    switchTab('video-story');
    const topicEl = document.getElementById('vs-topic');
    if (topicEl) topicEl.value = topic;
    advancePipeline('video-story', { topic });
  }, 300);
}

// ─── Initialize ───
export function initPipeline() {
  // Restore pipeline bar if active
  if (pipeline.active) {
    renderPipelineBar();
  }

  // Pipeline step click handler
  document.addEventListener('click', (e) => {
    const step = e.target.closest('[data-action="jumpToStep"]');
    if (step) jumpToStep(step.dataset.step);
  });
}
