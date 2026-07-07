// ============================================
// StoryForge AI — Home Page (ES Module)
// ============================================
import { DB } from '../api.js';
import { renderCard } from '../components.js';

export function refreshHome() {
  const stories = DB.getAll();
  
  // Update stats
  const statStories = document.getElementById('stat-stories');
  const statScenes = document.getElementById('stat-scenes');
  const statPrompts = document.getElementById('stat-prompts');
  const statChars = document.getElementById('stat-chars');
  
  if (statStories) statStories.textContent = stories.length;
  if (statScenes) statScenes.textContent = stories.reduce((a, s) => a + (s.sceneCount || 0), 0);
  if (statPrompts) statPrompts.textContent = stories.reduce((a, s) => a + (s.promptCount || 0), 0);
  if (statChars) statChars.textContent = stories.reduce((a, s) =>
    a + (s.characters || '').split('\n').filter(c => c.trim()).length, 0);
  
  // Render recent stories
  const recent = stories.slice(0, 4);
  const grid = document.getElementById('recent-stories');
  if (!grid) return;
  
  if (recent.length) {
    grid.innerHTML = recent.map(s => renderCard(s)).join('');
  } else {
    grid.innerHTML = `<div class="empty-state">
      <div class="icon">✦</div>
      <p>開始你的第一個故事吧</p>
      <button class="btn btn-primary" data-action="switchTab" data-tab="workshop">開始創作</button>
    </div>`;
  }
}
