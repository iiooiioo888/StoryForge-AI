// ═══ Video Story Generator — Auto Video Script System ═══
import { DB, api, currentUser } from '../api.js';
import { toast, esc } from '../utils.js';
import { splitScenes, genScene, VIDEO_STYLE_OPTIONS, PLATFORM_OPTIONS } from '../engine/prompt-engine.js';
import { exportAsJSON, exportAsMarkdown, exportAsPlatformScript, copyAllPromptsToClipboard } from '../script-exporter.js';

const GENRE_NAMES = {
  scifi: '科幻', fantasy: '奇幻', romance: '愛情', mystery: '懸疑',
  horror: '恐怖', wuxia: '武俠', cyberpunk: '賽博朋克', historical: '歷史',
};
const STYLE_NAMES = {
  cinematic: '電影感', documentary: '紀錄片', anime: '動漫風',
  noir: '黑色電影', 'music-video': 'MV風格', commercial: '廣告質感',
};

let currentStory = null;

// ─── Generate Video Story ───
export async function generateVideoStory() {
  const topic = document.getElementById('vs-topic')?.value?.trim();
  if (!topic) { toast('請輸入影片主題', 'warning'); return; }

  const genre = document.getElementById('vs-genre')?.value || 'scifi';
  const sceneCount = parseInt(document.getElementById('vs-scene-count')?.value) || 6;
  const style = document.getElementById('vs-style')?.value || 'cinematic';
  const platform = document.getElementById('vs-platform')?.value || 'sora';
  const character = document.getElementById('vs-character')?.value?.trim() || '主角';

  const btn = document.getElementById('btn-vs-generate');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 生成中...'; }

  try {
    let storyData;

    // Try LLM API first
    if (currentUser) {
      try {
        const r = await api('/llm/generate-video-story', {
          method: 'POST',
          body: { topic, genre, sceneCount, style, platform, character }
        });
        if (r.story) {
          storyData = r.story;
        }
      } catch (e) {
        console.log('LLM API unavailable, using local engine:', e.message);
      }
    }

    // Local fallback: generate from topic
    if (!storyData) {
      storyData = generateLocalVideoStory(topic, genre, sceneCount, style, platform, character);
    }

    currentStory = storyData;
    renderVideoStory(storyData);

    document.getElementById('vs-result').style.display = '';
    document.getElementById('vs-empty').style.display = 'none';
    toast('影片故事已生成！');

  } catch (e) {
    toast('生成失敗：' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✦ 自動生成影片故事'; }
  }
}

// ─── Local Story Generation ───
function generateLocalVideoStory(topic, genre, sceneCount, style, platform, character) {
  // Generate narrative arc based on scene count
  const arcs = generateNarrativeArc(topic, genre, sceneCount, character);

  // Generate scenes with prompts
  const scenes = arcs.map((arc, i) => {
    const scene = genScene(
      arc.narration, i + 1, sceneCount, genre, 'literary', character, style, platform
    );
    return {
      ...scene,
      title: arc.title,
      narration: arc.narration,
      sceneDescription: arc.description,
      emotionalBeat: arc.emotion,
      timeOfDay: arc.timeOfDay,
      soundDesign: arc.sound,
    };
  });

  const totalDuration = scenes.reduce((acc, s) => {
    const match = s.duration.match(/(\d+)-?(\d+)?/);
    return acc + (match ? (parseInt(match[1]) + (parseInt(match[2]) || parseInt(match[1]))) / 2 : 8);
  }, 0);

  return {
    title: generateTitle(topic, genre),
    topic,
    genre,
    style,
    platform,
    character,
    sceneCount: scenes.length,
    totalDuration: `~${Math.round(totalDuration)}s`,
    synopsis: generateSynopsis(topic, genre, character),
    scenes,
    metadata: {
      generatedAt: new Date().toISOString(),
      engine: currentUser ? 'LLM' : 'Local',
      version: '1.0',
    }
  };
}

function generateTitle(topic, genre) {
  const prefix = { scifi: '《星際', fantasy: '《傳說', romance: '《緣起', mystery: '《暗影', horror: '《驚魂', wuxia: '《劍影', cyberpunk: '《霓虹', historical: '《古韻' };
  const suffix = { scifi: '之旅》', fantasy: '之戰》', romance: '之約》', mystery: '之謎》', horror: '之夜》', wuxia: '之歌》', cyberpunk: '之城》', historical: '之夢》' };
  const keywords = topic.replace(/[，。！？、]/g, ' ').split(/\s+/).filter(w => w.length >= 2).slice(0, 2).join('');
  return `${prefix[genre] || '《'}${keywords}${suffix[genre] || '》'}`;
}

function generateSynopsis(topic, genre, character) {
  return `一部${GENRE_NAMES[genre] || ''}風格的短片。${topic}。主角「${character}」將在這段旅程中經歷成長與蛻變。`;
}

function generateNarrativeArc(topic, genre, count, character) {
  // Three-act structure distributed across scenes
  const act1End = Math.max(1, Math.floor(count * 0.25));
  const act2End = Math.max(act1End + 1, Math.floor(count * 0.75));

  const keywords = topic.replace(/[，。！？、]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
  const k1 = keywords[0] || '起點';
  const k2 = keywords[1] || '旅程';
  const k3 = keywords[2] || '真相';

  const emotions = {
    act1: ['平靜', '期待', '好奇', '不安'],
    act2a: ['緊張', '掙扎', '困惑', '衝突'],
    act2b: ['危機', '覺醒', '決心', '轉折'],
    act3: ['高潮', '釋然', '感悟', '希望'],
  };

  const arcs = [];
  for (let i = 0; i < count; i++) {
    let act, title, description, narration, emotion, timeOfDay, sound;

    if (i <= act1End) {
      act = 1;
      title = `序幕：${k1}`;
      description = `建立世界觀，介紹${character}的日常與困境`;
      narration = `在一個${genre === 'scifi' ? '霓虹閃爍的未來城市' : genre === 'fantasy' ? '古老神秘的幻想世界' : '充滿故事的世界'}中，${character}即將踏上一段改變命運的旅程。${k1}的出現，打破了所有的平靜。`;
      emotion = emotions.act1[i % emotions.act1.length];
      timeOfDay = i === 0 ? 'dawn' : 'day';
      sound = '環境音為主，輕柔背景音樂';
    } else if (i <= act2End) {
      act = 2;
      const subAct = i <= (act1End + act2End) / 2 ? 'a' : 'b';
      title = subAct === 'a' ? `發展：${k2}` : `轉折：${k3}`;
      description = subAct === 'a' ? `衝突升級，${character}面臨挑戰` : `關鍵轉折，真相逐漸浮現`;
      narration = subAct === 'a'
        ? `${character}深入${k2}的核心，發現事情遠比想像中複雜。每一步都充滿未知，每一次選擇都至關重要。`
        : `當${k3}的真相揭開，${character}必須做出最艱難的決定。過去的信念開始動搖，新的道路在黑暗中浮現。`;
      emotion = subAct === 'a' ? emotions.act2a[(i - act1End - 1) % emotions.act2a.length] : emotions.act2b[(i - Math.floor((act1End + act2End) / 2) - 1) % emotions.act2b.length];
      timeOfDay = subAct === 'a' ? 'afternoon' : 'dusk';
      sound = subAct === 'a' ? '緊張弦樂，節奏加快' : '沉重鼓點，情感爆發';
    } else {
      act = 3;
      title = i === count - 1 ? '結局：新生' : '高潮：抉擇';
      description = i === count - 1 ? `故事收束，${character}獲得成長` : `最終對決，命運的關鍵時刻`;
      narration = i === count - 1
        ? `一切塵埃落定。${character}回望來時的路，那些曾經的痛苦與掙扎，都化作了前行的力量。新的故事，才剛剛開始。`
        : `這是最後的機會。${character}匯聚所有的勇氣與智慧，面對最終的考驗。整個世界的命運，繫於此舉。`;
      emotion = emotions.act3[(i - act2End - 1) % emotions.act3.length];
      timeOfDay = i === count - 1 ? 'golden_hour' : 'night';
      sound = i === count - 1 ? '舒緩鋼琴，漸入希望' : '史詩管弦樂，最高潮';
    }

    arcs.push({ title, description, narration, emotion, timeOfDay, sound, act });
  }

  return arcs;
}

// ─── Render Video Story ───
function renderVideoStory(story) {
  // Header
  document.getElementById('vs-result-title').textContent = story.title;
  document.getElementById('vs-result-meta').textContent =
    `${GENRE_NAMES[story.genre] || story.genre} · ${STYLE_NAMES[story.style] || story.style} · ${story.scenes.length} 場景 · ${story.totalDuration} · ${PLATFORM_OPTIONS.find(p => p.value === story.platform)?.label || story.platform}`;

  // Storyboard
  const board = document.getElementById('vs-storyboard');
  board.innerHTML = story.scenes.map((s, i) => `
    <div class="vs-scene-card" data-scene="${i}">
      <div class="vs-scene-num">${i + 1}</div>
      <div class="vs-scene-thumb" style="background:linear-gradient(135deg,hsl(${i * 40},50%,14%),hsl(${i * 40 + 30},40%,10%))">
        <span style="font-size:1.5rem">${getEmotionIcon(s.emotionalBeat)}</span>
      </div>
      <div class="vs-scene-info">
        <div class="vs-scene-title">${esc(s.title)}</div>
        <div class="vs-scene-desc">${esc(s.sceneDescription)}</div>
        <div class="vs-scene-tags">
          <span class="tag" style="font-size:.6rem">${esc(s.camera)}</span>
          <span class="tag" style="font-size:.6rem">${esc(s.duration)}</span>
          <span class="tag" style="font-size:.6rem">${esc(s.emotionalBeat)}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Timeline tab
  renderTimeline(story);

  // Narration tab
  renderNarration(story);

  // Prompts tab
  renderPromptsList(story);

  // Full script tab
  renderFullScript(story);
}

function getEmotionIcon(emotion) {
  const map = { '平靜': '😌', '期待': '✨', '好奇': '🤔', '不安': '😰', '緊張': '😬', '掙扎': '😤', '困惑': '😵', '衝突': '⚡', '危機': '🔥', '覺醒': '💡', '決心': '💪', '轉折': '🔄', '高潮': '🌟', '釋然': '😮‍💨', '感悟': '🧠', '希望': '🌅' };
  return map[emotion] || '🎬';
}

function renderTimeline(story) {
  const el = document.getElementById('vtab-timeline');
  if (!el) return;
  el.innerHTML = `
    <div class="vs-timeline">
      ${story.scenes.map((s, i) => `
        <div class="vs-timeline-item ${i === 0 ? 'first' : ''} ${i === story.scenes.length - 1 ? 'last' : ''}">
          <div class="vs-timeline-dot">${i + 1}</div>
          <div class="vs-timeline-content">
            <div class="vs-timeline-title">${esc(s.title)}</div>
            <div class="vs-timeline-time">⏱ ${esc(s.duration)} · ${esc(s.timeOfDay)}</div>
            <div class="vs-timeline-emotion">${getEmotionIcon(s.emotionalBeat)} ${esc(s.emotionalBeat)}</div>
            <div class="vs-timeline-camera">📷 ${esc(s.camera)}</div>
            <div class="vs-timeline-lens">🔭 ${esc(s.lens)}</div>
            <div class="vs-timeline-sound">🔊 ${esc(s.soundDesign)}</div>
          </div>
        </div>
      `).join('')}
    </div>`;
}

function renderNarration(story) {
  const el = document.getElementById('vtab-narration');
  if (!el) return;
  el.innerHTML = story.scenes.map((s, i) => `
    <div class="vs-narration-block">
      <div class="vs-narration-header">
        <span class="vs-narration-num">場景 ${i + 1}</span>
        <span class="vs-narration-title">${esc(s.title)}</span>
        <button class="copy-btn" onclick="navigator.clipboard.writeText(this.closest('.vs-narration-block').querySelector('.vs-narration-text').textContent)">COPY</button>
      </div>
      <div class="vs-narration-text">${esc(s.narration)}</div>
    </div>
  `).join('');
}

function renderPromptsList(story) {
  const el = document.getElementById('vtab-prompts');
  if (!el) return;
  el.innerHTML = story.scenes.map((s, i) => `
    <div class="prompt-block">
      <div class="prompt-type">場景 ${i + 1} — ${esc(s.title)} (${esc(story.platform)})</div>
      <div class="prompt-text">${esc(s.mainPrompt)}</div>
      <button class="copy-btn" onclick="navigator.clipboard.writeText(this.closest('.prompt-block').querySelector('.prompt-text').textContent);this.textContent='✓';setTimeout(()=>this.textContent='COPY',1500)">COPY</button>
    </div>
    <div class="prompt-block" style="margin-bottom:1.2rem">
      <div class="prompt-type" style="color:var(--danger)">NEGATIVE</div>
      <div class="prompt-text" style="color:var(--text-dim)">${esc(s.negPrompt)}</div>
    </div>
  `).join('');
}

function renderFullScript(story) {
  const el = document.getElementById('vtab-script');
  if (!el) return;
  const script = generateFullScriptText(story);
  el.innerHTML = `
    <div class="vs-full-script">
      <div class="vs-script-actions">
        <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('vs-script-text').textContent);toast('已複製')">📋 複製全文</button>
      </div>
      <pre id="vs-script-text" class="vs-script-pre">${esc(script)}</pre>
    </div>`;
}

function generateFullScriptText(story) {
  let script = `═══════════════════════════════════════\n`;
  script += `  ${story.title}\n`;
  script += `  ${GENRE_NAMES[story.genre]} · ${STYLE_NAMES[story.style]} · ${story.platform.toUpperCase()}\n`;
  script += `═══════════════════════════════════════\n\n`;
  script += `【概要】\n${story.synopsis}\n\n`;
  script += `【主角】\n${story.character}\n`;
  script += `【總時長】${story.totalDuration}\n`;
  script += `【場景數】${story.scenes.length}\n\n`;
  script += `───────────────────────────────────────\n\n`;

  story.scenes.forEach((s, i) => {
    script += `▌ 場景 ${i + 1}：${s.title}\n`;
    script += `  情緒：${s.emotionalBeat} · 時間：${s.timeOfDay} · 時長：${s.duration}\n\n`;
    script += `  【旁白】\n  ${s.narration}\n\n`;
    script += `  【場景描述】\n  ${s.sceneDescription}\n\n`;
    script += `  【鏡頭】${s.camera}\n`;
    script += `  【鏡頭】${s.lens}\n`;
    script += `  【燈光】${s.lighting}\n`;
    script += `  【調色】${s.colorGrade}\n`;
    script += `  【音效】${s.soundDesign}\n\n`;
    script += `  【${story.platform.toUpperCase()} 提示詞】\n  ${s.mainPrompt}\n\n`;
    script += `  【Negative Prompt】\n  ${s.negPrompt}\n\n`;
    script += `───────────────────────────────────────\n\n`;
  });

  return script;
}

// ─── Export Actions ───
export function doExportJSON() {
  if (!currentStory) { toast('請先生成故事', 'warning'); return; }
  exportAsJSON(currentStory);
  toast('已匯出 JSON');
}

export function doExportMD() {
  if (!currentStory) { toast('請先生成故事', 'warning'); return; }
  exportAsMarkdown(currentStory);
  toast('已匯出 Markdown');
}

export function doExportPlatform() {
  if (!currentStory) { toast('請先生成故事', 'warning'); return; }
  exportAsPlatformScript(currentStory);
  toast('已匯出平台腳本');
}

export function doCopyAll() {
  if (!currentStory) { toast('請先生成故事', 'warning'); return; }
  copyAllPromptsToClipboard(currentStory);
  toast('已複製全部提示詞');
}

export function doSaveVideoStory() {
  if (!currentStory) { toast('請先生成故事', 'warning'); return; }
  DB.add({
    title: currentStory.title,
    content: generateFullScriptText(currentStory),
    genre: currentStory.genre,
    theme: currentStory.topic,
    isAiGenerated: true,
    wordCount: JSON.stringify(currentStory).length,
    sceneCount: currentStory.scenes.length,
    videoStory: currentStory,
    tags: ['影片腳本', currentStory.platform, currentStory.style],
  });
  toast('已保存到故事庫');
}

// ─── Tab Switching ───
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.vs-script-tab');
  if (!tab) return;
  document.querySelectorAll('.vs-script-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.vs-tab-content').forEach(c => c.classList.remove('active'));
  tab.classList.add('active');
  const content = document.getElementById('vtab-' + tab.dataset.vtab);
  if (content) content.classList.add('active');
});
