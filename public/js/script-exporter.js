// ═══ Script Exporter — Multi-format Video Script Export ═══

const PLATFORM_LABELS = {
  sora: 'Sora', runway: 'Runway Gen-3', kling: 'Kling',
  pika: 'Pika', veo: 'Veo', generic: '通用',
};

const GENRE_NAMES = {
  scifi: '科幻', fantasy: '奇幻', romance: '愛情', mystery: '懸疑',
  horror: '恐怖', wuxia: '武俠', cyberpunk: '賽博朋克', historical: '歷史',
};

// ─── Export as JSON (structured data) ───
export function exportAsJSON(story) {
  const output = {
    version: '1.0',
    title: story.title,
    genre: story.genre,
    style: story.style,
    platform: story.platform,
    character: story.character,
    synopsis: story.synopsis,
    totalDuration: story.totalDuration,
    sceneCount: story.scenes.length,
    scenes: story.scenes.map((s, i) => ({
      id: i + 1,
      title: s.title,
      narration: s.narration,
      description: s.sceneDescription,
      emotion: s.emotionalBeat,
      timeOfDay: s.timeOfDay,
      duration: s.duration,
      camera: { type: s.camera, lens: s.lens },
      lighting: s.lighting,
      colorGrade: s.colorGrade,
      soundDesign: s.soundDesign,
      visuals: s.visuals,
      prompt: {
        positive: s.mainPrompt,
        negative: s.negPrompt,
      },
    })),
    metadata: story.metadata,
  };

  downloadFile(
    JSON.stringify(output, null, 2),
    `${sanitizeFilename(story.title)}.json`,
    'application/json'
  );
}

// ─── Export as Markdown ───
export function exportAsMarkdown(story) {
  let md = `# ${story.title}\n\n`;
  md += `> ${GENRE_NAMES[story.genre] || story.genre} · ${story.style} · ${PLATFORM_LABELS[story.platform] || story.platform}\n\n`;
  md += `## 概要\n\n${story.synopsis}\n\n`;
  md += `## 資訊\n\n`;
  md += `| 項目 | 值 |\n|------|----|\n`;
  md += `| 主角 | ${story.character} |\n`;
  md += `| 場景數 | ${story.scenes.length} |\n`;
  md += `| 總時長 | ${story.totalDuration} |\n`;
  md += `| 目標平台 | ${PLATFORM_LABELS[story.platform] || story.platform} |\n`;
  md += `| 視覺風格 | ${story.style} |\n\n`;

  md += `---\n\n## 分鏡腳本\n\n`;

  story.scenes.forEach((s, i) => {
    md += `### 場景 ${i + 1}：${s.title}\n\n`;
    md += `**情緒：** ${s.emotionalBeat} · **時間：** ${s.timeOfDay} · **時長：** ${s.duration}\n\n`;
    md += `#### 旁白\n\n> ${s.narration}\n\n`;
    md += `#### 場景描述\n\n${s.sceneDescription}\n\n`;
    md += `#### 鏡頭設定\n\n`;
    md += `- **鏡頭：** ${s.camera}\n`;
    md += `- **鏡頭：** ${s.lens}\n`;
    md += `- **燈光：** ${s.lighting}\n`;
    md += `- **調色：** ${s.colorGrade}\n`;
    md += `- **音效：** ${s.soundDesign}\n\n`;
    md += `#### ${PLATFORM_LABELS[story.platform] || story.platform} Prompt\n\n\`\`\`\n${s.mainPrompt}\n\`\`\`\n\n`;
    md += `#### Negative Prompt\n\n\`\`\`\n${s.negPrompt}\n\`\`\`\n\n`;
    md += `---\n\n`;
  });

  downloadFile(md, `${sanitizeFilename(story.title)}.md`, 'text/markdown');
}

// ─── Export as Platform-specific Script ───
export function exportAsPlatformScript(story) {
  const platform = story.platform;
  let script = '';

  switch (platform) {
    case 'sora':
      script = generateSoraScript(story);
      break;
    case 'runway':
      script = generateRunwayScript(story);
      break;
    case 'kling':
      script = generateKlingScript(story);
      break;
    case 'pika':
      script = generatePikaScript(story);
      break;
    default:
      script = generateGenericScript(story);
  }

  downloadFile(script, `${sanitizeFilename(story.title)}-${platform}-script.txt`, 'text/plain');
}

function generateSoraScript(story) {
  let s = `SORA VIDEO GENERATION SCRIPT\n`;
  s += `${'═'.repeat(50)}\n`;
  s += `Title: ${story.title}\n`;
  s += `Total Duration: ${story.totalDuration}\n`;
  s += `Scenes: ${story.scenes.length}\n\n`;

  story.scenes.forEach((sc, i) => {
    s += `SCENE ${i + 1} [${sc.duration}]\n`;
    s += `${'─'.repeat(30)}\n`;
    s += `PROMPT:\n${sc.mainPrompt}\n\n`;
    s += `NEGATIVE:\n${sc.negPrompt}\n\n`;
    s += `NOTES:\n`;
    s += `  - Camera: ${sc.camera}\n`;
    s += `  - Lens: ${sc.lens}\n`;
    s += `  - Lighting: ${sc.lighting}\n`;
    s += `  - Duration: ${sc.duration}\n`;
    s += `  - Aspect: ${sc.aspect}\n\n`;
  });

  return s;
}

function generateRunwayScript(story) {
  let s = `RUNWAY GEN-3 VIDEO SCRIPT\n`;
  s += `${'═'.repeat(50)}\n\n`;

  story.scenes.forEach((sc, i) => {
    s += `[Scene ${i + 1}] Duration: ${sc.duration}\n`;
    s += `Camera Motion: ${sc.camera}\n`;
    s += `Prompt: ${sc.mainPrompt}\n`;
    s += `Style: ${sc.videoStyle}\n`;
    s += `Resolution: 4K · ${sc.aspect}\n\n`;
  });

  return s;
}

function generateKlingScript(story) {
  let s = `KLING AI VIDEO SCRIPT\n`;
  s += `${'═'.repeat(50)}\n\n`;

  story.scenes.forEach((sc, i) => {
    s += `── Shot ${i + 1} ──\n`;
    s += `Description: ${sc.sceneDescription}\n`;
    s += `Prompt: ${sc.mainPrompt}\n`;
    s += `Camera: ${sc.camera}\n`;
    s += `Duration: ${sc.duration}\n`;
    s += `Negative: ${sc.negPrompt}\n\n`;
  });

  return s;
}

function generatePikaScript(story) {
  let s = `PIKA VIDEO SCRIPT\n`;
  s += `${'═'.repeat(50)}\n\n`;

  story.scenes.forEach((sc, i) => {
    s += `Clip ${i + 1} [${sc.duration}]\n`;
    s += `Prompt: ${sc.mainPrompt}\n`;
    s += `Motion: ${sc.camera}\n\n`;
  });

  return s;
}

function generateGenericScript(story) {
  let s = `VIDEO GENERATION SCRIPT\n`;
  s += `${'═'.repeat(50)}\n`;
  s += `Title: ${story.title}\n`;
  s += `Platform: ${PLATFORM_LABELS[story.platform] || story.platform}\n\n`;

  story.scenes.forEach((sc, i) => {
    s += `Scene ${i + 1}: ${sc.title}\n`;
    s += `Prompt: ${sc.mainPrompt}\n`;
    s += `Negative: ${sc.negPrompt}\n\n`;
  });

  return s;
}

// ─── Copy All Prompts ───
export function copyAllPromptsToClipboard(story) {
  const text = story.scenes.map((s, i) =>
    `【場景 ${i + 1}】\n${s.mainPrompt}\n\n[Negative]\n${s.negPrompt}`
  ).join('\n\n════════════════════\n\n');

  navigator.clipboard.writeText(text).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  });
}

// ─── Helpers ───
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function sanitizeFilename(name) {
  return (name || 'video-story').replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
}
