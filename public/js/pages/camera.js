// ═══ Camera ═══
import { api } from '../api.js';
import { toast, copyText } from '../utils.js';

let data = { movements: [], lighting: [], styles: [], palettes: [] };
let activeTab = 'movements';

export async function loadCamera() {
  try {
    const [mov, light, styles, pal] = await Promise.all([
      api('/camera/movements'),
      api('/camera/lighting'),
      api('/camera/visual-styles'),
      api('/camera/color-palettes'),
    ]);
    data.movements = mov.movements || [];
    data.lighting = light.lighting || [];
    data.styles = styles.styles || [];
    data.palettes = pal.palettes || [];
    renderGrid('movements');
  } catch (e) { toast('載入失敗', 'error'); }
}

export function loadCameraTab(tab) {
  activeTab = tab;
  renderGrid(tab);
  // Update button states
  document.querySelectorAll('[data-cam-tab]').forEach(b => {
    b.className = b.dataset.camTab === tab ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
  });
}

function renderGrid(tab) {
  const grid = document.getElementById('cam-grid');
  if (!grid) return;
  const items = data[tab] || data.movements || [];
  
  grid.innerHTML = items.map(item => {
    const icon = item.icon || '🎥';
    const name = item.name_zh || item.name || '';
    const nameEn = item.name_en || '';
    const desc = item.description || '';
    const category = item.category || '';
    
    // Color palettes
    if (tab === 'color-palettes' && item.colors) {
      return `<div class="card" style="cursor:default">
        <div style="display:flex;gap:.3rem;margin-bottom:.8rem">${item.colors.map(c =>
          `<div style="width:32px;height:32px;border-radius:4px;background:${c};border:1px solid var(--border)"></div>`
        ).join('')}</div>
        <h3>${esc(name)}</h3>
        <p style="font-size:.8rem;color:var(--text-dim)">${esc(nameEn)}</p>
        <p style="font-size:.85rem;color:var(--text-muted);margin-top:.3rem">${esc(desc)}</p>
      </div>`;
    }
    
    return `<div class="card" style="cursor:default">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
        <span style="font-size:1.2rem">${icon}</span>
        <span class="tag">${esc(category)}</span>
      </div>
      <h3>${esc(name)}</h3>
      <p style="font-size:.78rem;color:var(--text-dim);font-family:var(--mono);margin-bottom:.3rem">${esc(nameEn)}</p>
      <p style="font-size:.85rem;color:var(--text-muted)">${esc(desc)}</p>
      ${item.english_prompt ? `<button class="copy-btn" onclick="navigator.clipboard.writeText('${esc(item.english_prompt).replace(/'/g, "\\'")}');this.textContent='✓';setTimeout(()=>this.textContent='COPY',1500)">COPY</button>` : ''}
    </div>`;
  }).join('');
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
