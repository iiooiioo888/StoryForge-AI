// ═══ API Layer ═══
export let currentUser = null;
export function setUser(u) { currentUser = u; }

export async function api(path, opts = {}) {
  const config = { headers: { 'Content-Type': 'application/json' }, ...opts };
  if (opts.body && typeof opts.body === 'object') config.body = JSON.stringify(opts.body);
  const res = await fetch(`/api${path}`, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '請求失敗');
  return data;
}

export const DB = {
  KEY: 'storyforge_v3',
  getAll() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; } },
  save(s) { localStorage.setItem(this.KEY, JSON.stringify(s)); },
  add(story) {
    const s = this.getAll();
    story.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    story.created_at = new Date().toISOString();
    s.push(story); this.save(s); return story;
  },
  update(id, data) {
    const s = this.getAll();
    const i = s.findIndex(x => x.id === id);
    if (i >= 0) { s[i] = { ...s[i], ...data }; this.save(s); }
  },
  delete(id) { this.save(this.getAll().filter(s => s.id !== id)); },
  getById(id) { return this.getAll().find(s => s.id === id); }
};
