// ═══ Prompt Engine — Video Prompt Generator ═══

const CAMS = ['Wide establishing shot', 'Medium shot', 'Close-up', 'Extreme close-up', 'Tracking shot', 'Dolly shot', 'Crane shot', 'Steadicam shot', 'Handheld camera', 'Aerial drone shot', 'POV shot', 'Dutch angle', "Bird's eye view", 'Low angle shot'];
const MOVES = ['Static locked-off shot', 'Slow pan left to right', 'Slow tilt up', 'Slow push-in (dolly in)', '360-degree orbit around subject', 'Following subject from behind', 'Crane rising upward', 'Handheld following action', 'Subtle lateral drift', 'Slow zoom out revealing environment'];
const LIGHTING = {
  scifi: ['Cold cyan neon rim lighting, volumetric haze, practical LED strips casting geometric shadows', 'Clinical white overhead with blue accent LEDs, reflective secondary light bounce, slight lens flare', 'Holographic ambient lighting with shifting color temperature, dark environment with isolated pools of artificial light'],
  fantasy: ['Golden hour magic light through ancient stone arches, dust particles in light shafts, warm ambient fill', 'Ethereal moonlight through massive tree canopy, bioluminescent flora providing soft secondary illumination', 'Warm candlelight in stone chamber, dramatic chiaroscuro, flickering light creating movement in shadows'],
  romance: ['Soft golden hour backlight with lens flare and hair light, warm fill, bokeh city lights in background', 'Gentle diffused window light, warm interior tones, intimate close lighting', 'Candlelight and fairy lights creating warm intimate pools of light, deep background shadows'],
  mystery: ['Hard noir single source lighting casting long dramatic shadows, venetian blind shadow patterns', 'Foggy dim streetlight creating isolated pool of visibility, cold blue-green color cast', 'Computer monitor glow as sole light source, blue-white digital light on subject face'],
  horror: ['Flickering unstable light source, deep oppressive darkness, movement in shadows', 'Cold blue moonlight through thin curtains, long distorted shadows, desaturated palette', 'Near-total darkness with brief strobe-like flashes revealing disturbing details'],
  historical: ['Warm oil lamp and candle glow, natural window light, period-appropriate shadows', 'Torchlight in stone corridor, dramatic orange warm light, smoke and dust in air', 'Dawn light through wooden lattice, long morning shadows, incense smoke catching light beams'],
  cyberpunk: ['Neon reflections on wet surfaces, multiple colored light sources, volumetric rain and fog', 'Dark with electric blue and magenta accent lighting, holographic ads providing ambient color', 'Screen and monitor glow mixing with practical neon, constantly shifting color temperature'],
  wuxia: ['Misty mountain dawn light with soft golden edge lighting, atmospheric perspective layers', 'Moonlight reflecting on still lake surface, soft rim light, deep blue ambient', 'Dramatic backlit silhouette against billowing clouds, heroic low-angle light'],
};
const COLOR_GRADE = { scifi: 'Cool teal and orange, crushed blacks with blue tint, digital sharp', fantasy: 'Rich warm golds and deep greens, lifted shadows with purple tint, film grain', romance: 'Warm amber midtones, soft highlights with pink tint, slightly lifted blacks', mystery: 'High contrast, teal-amber split toning, crushed blacks, desaturated except red', horror: 'Heavily desaturated cold blue-green, crushed deep blacks, minimal color except red', historical: 'Warm earth tones, Kodak Portra 400 emulation, soft contrast, faded highlights', cyberpunk: 'Hyper-saturated neon primaries, deep blacks, high contrast, chromatic aberration', wuxia: 'Ink wash inspired, desaturated with selective color, misty lifted shadows' };
const STYLE_REFS = { scifi: 'Blade Runner 2049, Arrival, Ex Machina, Dune (2021)', fantasy: "Lord of the Rings, Studio Ghibli, Pan's Labyrinth", romance: 'In the Mood for Love, Before Sunrise, Her', mystery: 'Se7en, Zodiac, Gone Girl, True Detective S1', horror: 'The Conjuring, Hereditary, The Shining, Midsommar', historical: 'The Last Emperor, Hero (Zhang Yimou), Barry Lyndon', cyberpunk: 'Ghost in the Shell (1995), The Matrix, Blade Runner', wuxia: 'Crouching Tiger Hidden Dragon, Hero (2002), Shadow (2018)' };
const VIDEO_STYLES = { cinematic: 'cinematic film quality, professional color grading, anamorphic lens, shallow depth of field', documentary: 'natural handheld, available light, observational, authentic', anime: 'anime/animation style, cel-shaded, vibrant colors, dynamic angles', 'music-video': 'stylized, rhythmic editing, bold color grading, creative transitions', noir: 'black and white or heavily desaturated, extreme contrast, fatalistic', commercial: 'polished, high-key lighting, perfect focus, aspirational' };
const PLATFORM_CFG = { sora: { pre: '', suf: ' Photorealistic, cinematic quality.' }, runway: { pre: 'Cinematic shot: ', suf: ' High fidelity, smooth motion.' }, kling: { pre: '', suf: ' High quality rendering, detailed textures.' }, pika: { pre: '', suf: ' Stylized motion, creative interpretation.' }, veo: { pre: '', suf: ' Natural motion, photorealistic rendering.' }, generic: { pre: '', suf: '' } };
const NEG_PROMPT = 'low quality, blurry, distorted faces, extra limbs, watermark, text overlay, stock footage feel, flat lighting, amateur, shaky camera, overexposed highlights, digital noise, compression artifacts';

function pk(arr) { return arr[~~(Math.random() * arr.length)]; }

export function splitScenes(text) {
  let p = text.split(/·\s*·\s*·/).filter(x => x.trim().length > 30);
  if (p.length < 2) p = text.split(/\n\s*\n/).filter(x => x.trim().length > 30);
  if (p.length < 2) {
    const s = text.match(/[^。！？\n]+[。！？]+/g) || [text];
    p = [];
    for (let i = 0; i < s.length; i += 2) p.push(s.slice(i, i + 2).join(''));
  }
  if (p[0]?.match(/《[^》]+》/)) p.shift();
  return p.slice(0, 8).map(x => x.trim());
}

export function genScene(stxt, idx, tot, genre, tone, char, vs, plat) {
  const isIntro = idx <= 1, isClimax = idx >= tot - 1, isEnd = idx === tot;
  const hasD = /["「」]/.test(stxt), hasA = /跑|走|飛|跳|打|戰|衝|握|舉/.test(stxt);
  const hasN = /雨|雪|風|霧|月|星|山|海/.test(stxt), hasE = /笑|哭|怒|怕|驚|悲|顫/.test(stxt);
  const cam = isIntro ? 'Aerial drone shot' : isClimax ? 'Tracking shot' : hasD ? 'Close-up' : hasA ? 'Steadicam shot' : pk(CAMS);
  const mv = isIntro ? 'Slow crane rising, revealing full environment' : isClimax ? 'Dynamic tracking pushing toward climax' : hasA ? 'Handheld following the action' : pk(MOVES);
  const lens = isIntro ? '24mm wide angle' : hasD ? '85mm portrait' : '50mm prime';
  const lit = pk(LIGHTING[genre] || LIGHTING.scifi);
  const cg = COLOR_GRADE[genre] || COLOR_GRADE.scifi;
  const sr = STYLE_REFS[genre] || STYLE_REFS.scifi;
  const vsd = VIDEO_STYLES[vs] || VIDEO_STYLES.cinematic;
  const pcfg = PLATFORM_CFG[plat] || PLATFORM_CFG.generic;
  const fps = isClimax ? pk(['24fps cinematic', '120fps slow motion']) : '24fps cinematic';
  const dur = isClimax ? '8-15 seconds' : isEnd ? '10-15 seconds' : '5-10 seconds';

  const vis = [];
  if (/城市|街|霓虹/.test(stxt)) vis.push('urban environment with architectural detail');
  if (/森林|竹|古樹/.test(stxt)) vis.push('lush forest with depth layers');
  if (/山|崖|峰/.test(stxt)) vis.push('dramatic mountain landscape');
  if (/海|洋|浪/.test(stxt)) vis.push('vast ocean with wave movement');
  if (/雨/.test(stxt)) vis.push('rain with wet reflective surfaces');
  if (/雪/.test(stxt)) vis.push('falling snow, cold breath visible');
  if (/霧/.test(stxt)) vis.push('thick atmospheric fog/mist');
  if (/夜|月|星/.test(stxt)) vis.push('nighttime with celestial elements');
  if (/晨|日|陽/.test(stxt)) vis.push('dawn golden light');
  if (/光|芒/.test(stxt)) vis.push('dramatic light beams');
  if (/門|窗|鏡/.test(stxt)) vis.push('architectural framing elements');
  if (/劍|刀/.test(stxt)) vis.push('weapon detail with metallic reflections');
  if (/虛擬|數據/.test(stxt)) vis.push('digital/virtual reality effects');
  if (/火|焰/.test(stxt)) vis.push('fire and ember particles');
  if (!vis.length) vis.push('richly detailed cinematic environment');

  const mp = `${pcfg.pre}${cam}, ${mv}. ${lens} lens. Scene: ${vis.join(', ')}. Subject: ${char} — ${hasA ? 'dynamic physical performance' : 'nuanced emotional performance'}. Lighting: ${lit}. Color: ${cg}. Style: ${vsd}. Camera: ${lens}, ${fps}, 2.39:1 Anamorphic. Reference: ${sr}. ${hasN ? 'Atmospheric environment present.' : ''} ${hasE ? 'Emotionally charged moment.' : ''} ${hasD ? 'Dialogue with character interaction.' : ''} Duration: ${dur}. 4K resolution.${pcfg.suf}`;
  const summary = stxt.slice(0, 80).replace(/\n/g, ' ') + '...';

  return { id: idx, title: `場景 ${idx}`, summary, fullText: stxt, mainPrompt: mp, negPrompt: NEG_PROMPT, camera: `${cam} — ${mv}`, lens, lighting: lit, colorGrade: cg, styleRef: sr, fps, duration: dur, aspect: '2.39:1 Anamorphic', videoStyle: vsd, charName: char, visuals: vis.join(', ') };
}

export const VIDEO_STYLE_OPTIONS = [
  { value: 'cinematic', label: '電影感' },
  { value: 'documentary', label: '紀錄片' },
  { value: 'anime', label: '動畫風' },
  { value: 'noir', label: '黑色電影' },
  { value: 'music-video', label: 'MV 風格' },
  { value: 'commercial', label: '廣告質感' },
];

export const PLATFORM_OPTIONS = [
  { value: 'sora', label: 'Sora' },
  { value: 'runway', label: 'Runway Gen-3' },
  { value: 'kling', label: 'Kling' },
  { value: 'pika', label: 'Pika' },
  { value: 'veo', label: 'Veo' },
  { value: 'generic', label: '通用' },
];
