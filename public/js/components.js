// ═══ Shared Components ═══
import { esc } from './utils.js';

export function renderStoryCard(story, index = 0) {
  const hue = (7 * Math.abs(story.title?.charCodeAt(0) || 65)) % 360;
  const bg = `linear-gradient(135deg, hsl(${hue},50%,14%) 0%, hsl(${hue + 30},40%,10%) 100%)`;
  const icons = { scifi: '🚀', fantasy: '🗡️', romance: '💕', mystery: '🔍', horror: '👻', wuxia: '⚔️' };
  const icon = icons[story.genre] || '📖';
  return `<div class="card" data-action="viewStory" data-story-id="${story.id}" style="animation-delay:${index*.05}s">
    <div style="height:90px;background:${bg};border-radius:var(--radius);margin-bottom:.8rem;display:flex;align-items:center;justify-content:center;font-size:1.8rem;position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 70% 30%,hsla(${hue},60%,50%,.15),transparent 60%)"></div>
      <span style="position:relative;filter:drop-shadow(0 2px 8px rgba(0,0,0,.3))">${icon}</span>
    </div>
    <h3>${esc(story.title || '未命名')}</h3>
    <p>${esc(story.content?.substring(0, 80) || '')}...</p>
    <div class="card-meta"><span>${(story.wordCount || 0).toLocaleString()} 字</span><span class="tag" style="font-size:.65rem">${esc(story.genre || '')}</span></div>
  </div>`;
}

export function renderSkeleton(count = 3) {
  return Array(count).fill(0).map(() => 
    `<div class="card" style="pointer-events:none">
      <div class="skeleton" style="height:90px;margin-bottom:.8rem"></div>
      <div class="skeleton" style="height:16px;width:60%;margin-bottom:.5rem"></div>
      <div class="skeleton" style="height:12px;width:90%;margin-bottom:.5rem"></div>
      <div class="skeleton" style="height:12px;width:40%"></div>
    </div>`
  ).join('');
}

export function renderEmptyState(icon, message, action = null) {
  return `<div class="empty">
    <div class="icon">${icon}</div>
    <p>${message}</p>
    ${action ? `<button class="btn btn-primary" data-action="${action.action}" ${action.dataset ? Object.entries(action.dataset).map(([k,v]) => `data-${k}="${v}"`).join('') : ''}>${action.label}</button>` : ''}
  </div>`;
}
