// ============================================
// StoryForge AI — Shared UI Components (ES Module)
// ============================================
import { esc } from '../utils.js';

// Tag Input
let tagElements = [];
export function handleTagInput(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(',', '');
    if (val && !tagElements.includes(val)) { tagElements.push(val); renderTags(); }
    e.target.value = '';
  }
}
export function removeTag(i) { tagElements.splice(i, 1); renderTags(); }
export function renderTags() {
  const wrap = document.getElementById('tag-list');
  if (!wrap) return;
  wrap.innerHTML = tagElements.map((t, i) =>
    `<span class="tag">${esc(t)} <span class="remove" data-action="removeTag" data-index="${i}">×</span></span>`
  ).join('');
}
export function getTags() { return tagElements; }
export function setTags(t) { tagElements = t; }

// Story Card
export function renderCard(story) {
  const bg = `hsl(${7 * Math.abs(story.title?.charCodeAt(0) || 65) % 360},45%,18%)`;
  const cc = (story.characters || '').split('\n').filter(c => c.trim()).length;
  const subg = story.subgenre ? `<span class="mini-tag">${esc(story.subgenre)}</span>` : '';
  const tags = (story.elements || []).slice(0, 3).map(e => `<span class="mini-tag">${esc(e)}</span>`).join('');
  const icon = (story.genre || '').includes('科幻') ? '🚀' :
               (story.genre || '').includes('奇幻') ? '⚔️' :
               (story.genre || '').includes('愛情') ? '💕' : '📖';
  
  return `<div class="card story-card" data-action="viewStory" data-story-id="${story.id}">
    <div class="story-cover" style="background:${bg};height:120px;border-radius:var(--radius);margin-bottom:1rem;display:flex;align-items:center;justify-content:center;font-size:2rem">
      ${icon}
    </div>
    <h3>${esc(story.title || '未命名')}</h3>
    <p class="card-desc">${esc(story.summary || story.content?.substring(0, 100) || '')}</p>
    <div class="card-tags">${subg}${tags}</div>
    <div class="card-meta">
      <span>${(story.wordCount || 0).toLocaleString()} 字</span>
      <span>${cc} 角色</span>
    </div>
  </div>`;
}

// Skeleton Loading
export function showSkeleton(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = '<div class="skeleton skeleton-card"></div>'.repeat(3);
}
export function setBtnLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) { btn.classList.add('loading'); btn.disabled = true; }
  else { btn.classList.remove('loading'); btn.disabled = false; }
}

// Section Toggle / Stepper
export function toggleSection(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

let currentStep = 0;
export function updateStepper() {
  document.querySelectorAll('.stepper-step').forEach((step, i) => {
    step.classList.remove('active', 'done');
    if (i < currentStep) step.classList.add('done');
    else if (i === currentStep) step.classList.add('active');
  });
}
export function setStep(n) { currentStep = n; updateStepper(); }
