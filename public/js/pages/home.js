// ═══ Home Page ═══
import { DB } from '../api.js';
import { animateCount, esc } from '../utils.js';

export function refreshHome() {
  const stories = DB.getAll();
  animateCount(document.getElementById('stat-stories'), stories.length);
  animateCount(document.getElementById('stat-scenes'), stories.reduce((a, s) => a + (s.sceneCount || 0), 0));
  animateCount(document.getElementById('stat-prompts'), stories.reduce((a, s) => a + (s.promptCount || 0), 0));
  
  const grid = document.getElementById('recent-stories');
  if (!grid) return;
  const recent = stories.slice(0, 4);
  grid.innerHTML = recent.length
    ? recent.map((s, i) => renderCard(s, i)).join('')
    : '<div class="empty" style="grid-column:1/-1"><div class="icon">✦</div><p>開始你的第一個故事吧</p><button class="btn btn-primary" data-action="switchTab" data-tab="workshop">開始創作</button></div>';
}

function renderCard(s, i = 0) {
  const hue = (7 * Math.abs(s.title?.charCodeAt(0) || 65)) % 360;
  const bg = `linear-gradient(135deg, hsl(${hue},50%,14%) 0%, hsl(${hue + 30},40%,10%) 100%)`;
  const icons = { scifi: '🚀', fantasy: '🗡️', romance: '💕', mystery: '🔍', horror: '👻', wuxia: '⚔️' };
  const icon = icons[s.genre] || '📖';
  return `<div class="card" data-action="viewStory" data-story-id="${s.id}" style="animation-delay:${i*.06}s">
    <div style="height:90px;background:${bg};border-radius:var(--radius);margin-bottom:.8rem;display:flex;align-items:center;justify-content:center;font-size:1.8rem;position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 70% 30%,hsla(${hue},60%,50%,.15),transparent 60%)"></div>
      <span style="position:relative;filter:drop-shadow(0 2px 8px rgba(0,0,0,.3))">${icon}</span>
    </div>
    <h3>${esc(s.title || '未命名')}</h3>
    <p>${esc(s.content?.substring(0, 80) || '')}...</p>
    <div class="card-meta"><span>${(s.wordCount || 0).toLocaleString()} 字</span><span class="tag" style="font-size:.65rem">${esc(s.genre || '')}</span></div>
  </div>`;
}
