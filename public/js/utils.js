// ============================================
// StoryForge AI — Utility Functions (ES Module)
// ============================================

export function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function formatNum(n) {
  if (!n) return '0';
  if (n >= 10000) return (n / 10000).toFixed(1) + '萬';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '剛才';
  if (mins < 60) return mins + '分鐘前';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + '小時前';
  const days = Math.floor(hrs / 24);
  return days + '天前';
}

export function copyTxt(btn, txt) {
  navigator.clipboard.writeText(txt).then(() => {
    btn.textContent = '✓ 已複製';
    btn.style.color = 'var(--success)';
    btn.style.borderColor = 'var(--success)';
    setTimeout(() => {
      btn.textContent = 'COPY';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 2000);
  }).catch(() => toast('複製失敗', 'error'));
}

// ═══ Toast Notifications ═══
export function toast(msg, type = 'success', duration = 3200) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-icon">${icons[type] || '•'}</span>
    <span>${esc(msg)}</span>
    <div class="toast-progress" style="width:100%;animation:toast-progress ${duration}ms linear forwards"></div>
  `;
  c.appendChild(el);
  
  // Auto dismiss
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(40px)';
    el.style.transition = 'all .3s ease';
  }, duration - 300);
  setTimeout(() => el.remove(), duration);
}

// ═══ Loading States ═══
export function showLoading(containerId, type = 'skeleton') {
  const el = document.getElementById(containerId);
  if (!el) return;
  
  if (type === 'skeleton') {
    el.innerHTML = `
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text medium"></div>
      <div class="skeleton skeleton-text short"></div>
      <div style="height:16px"></div>
      <div class="skeleton skeleton-card" style="height:200px"></div>
    `;
  } else if (type === 'spinner') {
    el.innerHTML = '<div style="display:flex;justify-content:center;padding:3rem"><div class="loading-spinner"></div></div>';
  }
}

export function hideLoading(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '';
}

export function showError(containerId, message) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="empty-state" style="padding:2rem">
      <div class="icon" style="animation:none">⚠️</div>
      <p>${esc(message)}</p>
      <button class="btn btn-secondary btn-sm" onclick="location.reload()">重試</button>
    </div>
  `;
}

export function showEmpty(containerId, message = '還沒有內容') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="empty-state">
      <div class="icon">✦</div>
      <p>${message}</p>
    </div>
  `;
}

// ═══ Scroll Reveal ═══
export function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  
  document.querySelectorAll('.reveal, .site-footer').forEach(el => observer.observe(el));
}

// ═══ Ripple Effect ═══
document.addEventListener('mousedown', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  btn.style.setProperty('--ripple-x', ((e.clientX - rect.left) / rect.width * 100) + '%');
  btn.style.setProperty('--ripple-y', ((e.clientY - rect.top) / rect.height * 100) + '%');
});
