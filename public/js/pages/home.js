// ============================================
// StoryForge AI — Home Page (ES Module)
// ============================================
import { DB } from '../api.js';
import { renderCard } from '../components.js';
import { formatNum } from '../utils.js';

export function refreshHome() {
  const stories = DB.getAll();
  
  // Animate stats with counter animation
  animateCounter('stat-stories', stories.length);
  animateCounter('stat-scenes', stories.reduce((a, s) => a + (s.sceneCount || 0), 0));
  animateCounter('stat-prompts', stories.reduce((a, s) => a + (s.promptCount || 0), 0));
  animateCounter('stat-chars', stories.reduce((a, s) =>
    a + (s.characters || '').split('\n').filter(c => c.trim()).length, 0));
  
  // Render recent stories with stagger
  const recent = stories.slice(0, 4);
  const grid = document.getElementById('recent-stories');
  if (!grid) return;
  
  if (recent.length) {
    grid.innerHTML = recent.map((s, i) => {
      const card = renderCard(s);
      return card.replace('class="card story-card"', `class="card story-card" style="animation-delay:${i * 0.08}s"`);
    }).join('');
  } else {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="icon" style="font-size:3rem;animation:float 3s ease-in-out infinite">✦</div>
        <p style="font-size:1.1rem;margin:1rem 0">開始你的第一個故事吧</p>
        <p style="color:var(--text-dim);font-size:.85rem;margin-bottom:1.5rem">AI 幫你將靈感轉化為專業故事與影片提示詞</p>
        <button class="btn btn-primary" data-action="switchTab" data-tab="workshop" style="padding:.8rem 2rem">
          ✦ 開始創作
        </button>
      </div>
    `;
  }
}

// Animate counter from 0 to target
function animateCounter(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  const duration = 800;
  const start = performance.now();
  const initial = parseInt(el.textContent) || 0;
  
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(initial + (target - initial) * eased);
    el.textContent = current.toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}
