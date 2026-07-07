// ═══ Utilities ═══
export function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

export function toast(msg, type = 'success', ms = 3000) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${{success:'✓',error:'✕',info:'ℹ',warning:'⚠'}[type]||'•'}</span><span>${esc(msg)}</span>`;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; el.style.transition = 'all .3s'; }, ms - 300);
  setTimeout(() => el.remove(), ms);
}

export function copyText(text) {
  navigator.clipboard.writeText(text).then(() => toast('已複製', 'success')).catch(() => toast('複製失敗', 'error'));
}

export function animateCount(el, target) {
  if (!el) return;
  const start = performance.now();
  const from = parseInt(el.textContent) || 0;
  function update(now) {
    const p = Math.min((now - start) / 800, 1);
    el.textContent = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))).toLocaleString();
    if (p < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
