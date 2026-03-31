/**
 * db.js — Storage Adapter for Project OS
 * ========================================
 * Currently backed by localStorage.
 * To upgrade to Supabase, replace only this file.
 *
 * Supabase upgrade checklist (step 9 → 10):
 *   1. npm install @supabase/supabase-js
 *   2. Create a Supabase project at supabase.com
 *   3. Run this SQL in the Supabase SQL editor:
 *
 *      create table projects (
 *        id          text primary key,
 *        name        text not null,
 *        state       text not null default 'Inbox',
 *        type        text,
 *        energy      text,
 *        definition_of_done text,
 *        deadline    date,
 *        next_action text,
 *        context     text,
 *        blockers    text,
 *        backlog     jsonb default '[]',
 *        progress_log jsonb default '[]',
 *        pause_note  jsonb,
 *        ai_log      jsonb default '[]',
 *        waiting_for text,
 *        waiting_who text,
 *        check_in_date date,
 *        created     date,
 *        last_worked date,
 *        updated_at  timestamptz default now()
 *      );
 *
 *      create table app_state (
 *        id          text primary key default 'singleton',
 *        north_star  text default '',
 *        last_reset  text default '',
 *        today       jsonb,
 *        weekly_resets jsonb default '[]'
 *      );
 *
 *   4. Replace the DB object below with the Supabase version.
 *      The interface (getState, setState, etc.) stays the same.
 *      app.js does NOT change.
 *
 * ------------------------------------------------
 * CURRENT: localStorage implementation
 * ------------------------------------------------
 */

const STORAGE_KEY = 'adhd_pos_v1';

const DB = {

  // ── Read full state ──────────────────────────────────────────
  getState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('DB.getState error:', e);
    }
    return null;
  },

  // ── Write full state ─────────────────────────────────────────
  setState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('DB.setState error:', e);
    }
  },

  // ── Export all data as a JSON blob ───────────────────────────
  exportJSON() {
    const state = this.getState();
    if (!state) return '{}';
    const out = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: state.projects || [],
      northStar: state.northStar || '',
      lastReset: state.lastReset || '',
      weeklyResets: state.weeklyResets || [],
      today: state.today || null
    };
    return JSON.stringify(out, null, 2);
  },

  // ── Import from a JSON backup ────────────────────────────────
  // Returns { ok: true } or { ok: false, error: string }
  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      // Basic validation
      if (!data || typeof data !== 'object') {
        return { ok: false, error: 'Not a valid JSON object.' };
      }
      if (!Array.isArray(data.projects)) {
        return { ok: false, error: 'Missing or invalid "projects" array.' };
      }
      // Validate each project has at minimum an id and name
      for (const p of data.projects) {
        if (!p.id || !p.name) {
          return { ok: false, error: 'One or more projects missing required id/name.' };
        }
      }

      // Merge into current state (preserves today if not in backup)
      const current = this.getState() || {};
      const merged = Object.assign({}, current, {
        projects:     data.projects,
        northStar:    data.northStar    ?? current.northStar    ?? '',
        lastReset:    data.lastReset    ?? current.lastReset    ?? '',
        weeklyResets: data.weeklyResets ?? current.weeklyResets ?? [],
      });
      // Don't override today with a stale backup value
      this.setState(merged);
      return { ok: true, count: data.projects.length };

    } catch (e) {
      return { ok: false, error: 'JSON parse error: ' + e.message };
    }
  },

  // ── Clear everything (for testing / reset) ───────────────────
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

};

// Make DB globally available to app.js
// When switching to Supabase, just replace the DB object above.
// app.js calls DB.getState() and DB.setState() — those calls stay identical.
window.DB = DB;


/* ============================================================
 * SUPABASE SWAP TEMPLATE (keep this commented out until ready)
 * ============================================================
 *
 * import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
 *
 * const supabase = createClient(
 *   'https://YOUR_PROJECT.supabase.co',
 *   'YOUR_ANON_KEY'
 * )
 *
 * const DB = {
 *   async getState() {
 *     const { data: stateRow } = await supabase
 *       .from('app_state').select('*').eq('id','singleton').single()
 *     const { data: projects } = await supabase
 *       .from('projects').select('*').order('created', { ascending: false })
 *     return {
 *       projects: projects || [],
 *       northStar:    stateRow?.north_star    || '',
 *       lastReset:    stateRow?.last_reset    || '',
 *       weeklyResets: stateRow?.weekly_resets || [],
 *       today:        stateRow?.today         || null
 *     }
 *   },
 *   async setState(state) {
 *     // upsert app_state row
 *     await supabase.from('app_state').upsert({
 *       id: 'singleton',
 *       north_star:    state.northStar,
 *       last_reset:    state.lastReset,
 *       weekly_resets: state.weeklyResets,
 *       today:         state.today
 *     })
 *     // upsert all projects
 *     if (state.projects?.length) {
 *       await supabase.from('projects').upsert(state.projects)
 *     }
 *   }
 * }
 *
 * window.DB = DB
 * ============================================================ */
