/**
 * db.js — Project OS storage adapter
 * ---------------------------------
 * Browser app reads/writes local cache immediately.
 * Vercel Function /api/state mirrors that cache to Supabase.
 *
 * This keeps app.js simple while making the deployed app persistent.
 */

const STORAGE_KEY = 'adhd_pos_v2';
const SYNC_ENDPOINT = '/api/state';

let syncTimer = null;
let inflightSync = null;

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('DB.readLocal error:', e);
    return null;
  }
}

function writeLocal(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('DB.writeLocal error:', e);
  }
}

function withTimeout(ms = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    done() { clearTimeout(timer); }
  };
}

async function fetchRemoteState() {
  const t = withTimeout();
  try {
    const resp = await fetch(SYNC_ENDPOINT, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: t.signal
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    return data && data.state ? data.state : null;
  } finally {
    t.done();
  }
}

async function pushRemoteState(state) {
  const resp = await fetch(SYNC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state })
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error('Remote save failed: ' + resp.status + ' ' + text);
  }
  return resp.json().catch(() => ({}));
}

function scheduleSync(state) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    inflightSync = pushRemoteState(state).catch(err => {
      console.warn('DB remote sync failed:', err);
    }).finally(() => {
      inflightSync = null;
    });
  }, 300);
}

const DB = {
  ready: (async () => {
    const local = readLocal();
    try {
      const remote = await fetchRemoteState();
      if (remote && typeof remote === 'object') {
        writeLocal(remote);
        return remote;
      }
    } catch (e) {
      console.warn('DB.ready remote fetch failed, using local cache:', e);
    }
    return local;
  })(),

  getState() {
    return readLocal();
  },

  setState(state) {
    writeLocal(state);
    scheduleSync(state);
  },

  exportJSON() {
    const state = this.getState();
    if (!state) return '{}';
    const out = {
      version: 2,
      exportedAt: new Date().toISOString(),
      projects: state.projects || [],
      northStar: state.northStar || '',
      lastReset: state.lastReset || '',
      weeklyResets: state.weeklyResets || [],
      today: state.today || null
    };
    return JSON.stringify(out, null, 2);
  },

  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      if (!data || typeof data !== 'object') {
        return { ok: false, error: 'Not a valid JSON object.' };
      }
      if (!Array.isArray(data.projects)) {
        return { ok: false, error: 'Missing or invalid "projects" array.' };
      }
      for (const p of data.projects) {
        if (!p.id || !p.name) {
          return { ok: false, error: 'One or more projects missing required id/name.' };
        }
      }

      const current = this.getState() || {};
      const merged = Object.assign({}, current, {
        projects: data.projects,
        northStar: data.northStar ?? current.northStar ?? '',
        lastReset: data.lastReset ?? current.lastReset ?? '',
        weeklyResets: data.weeklyResets ?? current.weeklyResets ?? [],
        today: data.today ?? current.today ?? null
      });

      this.setState(merged);
      return { ok: true, count: data.projects.length };
    } catch (e) {
      return { ok: false, error: 'JSON parse error: ' + e.message };
    }
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
    scheduleSync({ projects: [], northStar: '', lastReset: '', weeklyResets: [], today: null });
  },

  async syncNow() {
    const state = this.getState() || {};
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    await pushRemoteState(state);
  }
};

window.DB = DB;
