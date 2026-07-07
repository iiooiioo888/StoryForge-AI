// ============================================
// StoryForge AI — Camera Language (ES Module)
// ============================================
import { api } from '../api.js';
import { esc, toast, copyTxt } from '../utils.js';

// Camera tab switching
export function switchCamTab(tab, btn) {
  document.querySelectorAll('.cam-tab-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.cam-tab-btn').forEach(b => {
    b.classList.remove('btn-primary');
    b.classList.add('btn-ghost');
  });
  const panel = document.getElementById(`cam-tab-${tab}`);
  if (panel) panel.style.display = 'block';
  if (btn) {
    btn.classList.remove('btn-ghost');
    btn.classList.add('btn-primary');
  }
}

// Camera data
let cameraData = { movements: [], shotSizes: [], angles: [], transitions: [], lighting: [], visualStyles: [], colorPalettes: [] };
let activeTab = 'movements';

// Load all camera data
export async function loadCamera() {
  try {
    const [mov, sizes, angles, trans, light, styles, palettes] = await Promise.all([
      api('/camera/movements'),
      api('/camera/shot-sizes'),
      api('/camera/angles'),
      api('/camera/transitions'),
      api('/camera/lighting'),
      api('/camera/visual-styles'),
      api('/camera/color-palettes'),
    ]);
    cameraData.movements = mov.movements || [];
    cameraData.shotSizes = sizes.sizes || [];
    cameraData.angles = angles.angles || [];
    cameraData.transitions = trans.transitions || [];
    cameraData.lighting = light.lighting || [];
    cameraData.visualStyles = styles.styles || [];
    cameraData.colorPalettes = palettes.palettes || [];
    renderCameraGrid('movements');
  } catch (e) {
    toast('載入鏡頭語言失敗', 'error');
  }
}

// Render grid for any tab
export function renderCameraGrid(tab) {
  activeTab = tab || activeTab;
  const grid = document.getElementById('cam-grid');
  if (!grid) return;

  let items = [];
  let title = '';

  switch (activeTab) {
    case 'movements':
      items = cameraData.movements;
      title = `${items.length} 種運鏡方式`;
      break;
    case 'lighting':
      items = cameraData.lighting;
      title = `${items.length} 種燈光預設`;
      break;
    case 'visual-styles':
      items = cameraData.visualStyles;
      title = `${items.length} 種視覺風格`;
      break;
    case 'color-palettes':
      items = cameraData.colorPalettes;
      title = `${items.length} 種調色板`;
      break;
  }

  const countEl = document.getElementById('cam-count');
  if (countEl) countEl.textContent = title;

  grid.innerHTML = items.map(item => {
    const icon = item.icon || '🎥';
    const name = item.name_zh || item.name || '';
    const nameEn = item.name_en || '';
    const desc = item.description || '';
    const category = item.category || '';
    const useCase = item.use_case || '';
    const prompt = item.english_prompt || '';

    // For color palettes, show color swatches
    if (activeTab === 'color-palettes' && item.colors) {
      const swatches = item.colors.map(c =>
        `<span style="display:inline-block;width:24px;height:24px;border-radius:4px;background:${c};border:1px solid var(--border)"></span>`
      ).join(' ');
      return `<div class="story-card">
        <div class="card-top"><span class="genre-tag">${icon}</span><span class="card-badge">${category}</span></div>
        <h3>${esc(name)}</h3>
        <p style="font-size:.8rem;color:var(--text-dim);margin-bottom:.5rem">${esc(nameEn)}</p>
        <div style="margin:.8rem 0">${swatches}</div>
        <p class="card-desc">${esc(desc)}</p>
        <div class="card-meta"><span>${esc(useCase)}</span></div>
      </div>`;
    }

    return `<div class="story-card">
      <div class="card-top"><span class="genre-tag">${icon}</span><span class="card-badge">${category}</span></div>
      <h3>${esc(name)}</h3>
      <p style="font-size:.8rem;color:var(--text-dim);font-family:var(--mono);margin-bottom:.5rem">${esc(nameEn)}</p>
      <p class="card-desc">${esc(desc)}</p>
      <div class="card-meta">
        <span>${esc(useCase)}</span>
        ${prompt ? `<button class="icon-btn" data-action="copyPrompt" data-text="${esc(prompt)}" title="複製提示詞">📋</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

// Compose modal
export function showComposeModal() {
  document.getElementById('modal-title').textContent = '鏡頭語言組合器';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-row">
      <div class="form-group"><label class="form-label">景別</label>
        <select class="form-select" id="compose-shot">
          <option value="">--</option>
          <option value="extreme close-up">大特寫</option>
          <option value="close-up">特寫</option>
          <option value="medium shot">中景</option>
          <option value="long shot">遠景</option>
          <option value="extreme wide shot">大遠景</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">角度</label>
        <select class="form-select" id="compose-angle">
          <option value="">--</option>
          <option value="eye level">平視</option>
          <option value="low angle">仰拍</option>
          <option value="high angle">俯拍</option>
          <option value="dutch angle">荷蘭角</option>
          <option value="bird's eye view">鳥瞰</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">運鏡</label>
        <select class="form-select" id="compose-move">
          <option value="">--</option>
          <option value="slow dolly in">推鏡</option>
          <option value="tracking shot">跟蹤</option>
          <option value="arc shot orbiting">弧形環繞</option>
          <option value="crane shot">升降</option>
          <option value="handheld">手持</option>
          <option value="one continuous take">一鏡到底</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">燈光</label>
        <select class="form-select" id="compose-light">
          <option value="">--</option>
          <option value="golden hour">黃金時刻</option>
          <option value="dramatic side lighting">戲劇側光</option>
          <option value="neon glow">霓虹燈光</option>
          <option value="moonlight">月光</option>
          <option value="backlighting">逆光</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">場景描述</label>
      <textarea class="form-textarea" id="compose-scene" placeholder="描述場景..."></textarea>
    </div>
    <button class="btn btn-primary btn-block" data-action="doCompose">組合生成</button>
    <div id="compose-result" style="margin-top:1.5rem"></div>
  `;
  document.getElementById('story-modal').classList.add('active');
}

export function doCompose() {
  const shot = document.getElementById('compose-shot')?.value || '';
  const angle = document.getElementById('compose-angle')?.value || '';
  const move = document.getElementById('compose-move')?.value || '';
  const light = document.getElementById('compose-light')?.value || '';
  const scene = document.getElementById('compose-scene')?.value || '';

  const prompt = [scene, shot, angle, move].filter(Boolean).join('. ') +
    (light ? `. Lighting: ${light}.` : '') +
    ' Style: cinematic. Mood: dramatic.';

  document.getElementById('compose-result').innerHTML = `
    <div class="prompt-block">
      <div class="prompt-type">Composed Prompt · 組合提示詞</div>
      <div class="prompt-text">${esc(prompt)}</div>
      <button class="copy-btn" data-action="copyPrompt" data-text="${esc(prompt)}">COPY</button>
    </div>
  `;
}
