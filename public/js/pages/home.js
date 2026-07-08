// ═══ Home Page ═══
import { DB } from '../api.js';
import { animateCount } from '../utils.js';
import { renderStoryCard, renderEmptyState } from '../components.js';

export function refreshHome() {
  const stories = DB.getAll();
  animateCount(document.getElementById('stat-stories'), stories.length);
  animateCount(document.getElementById('stat-scenes'), stories.reduce((a, s) => a + (s.sceneCount || 0), 0));
  animateCount(document.getElementById('stat-prompts'), stories.reduce((a, s) => a + (s.promptCount || 0), 0));

  const grid = document.getElementById('recent-stories');
  if (!grid) return;
  const recent = stories.slice(0, 4);
  grid.innerHTML = recent.length
    ? recent.map((s, i) => renderStoryCard(s, i)).join('')
    : renderEmptyState('✦', '開始你的第一個故事吧', { action: 'switchTab', label: '開始創作', dataset: { tab: 'workshop' } });
}
