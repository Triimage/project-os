# Project OS — ADHD Edition

> 3 active projects max. Every project needs a next action. No exceptions.

A lightweight, installable PWA for ADHD-friendly project management. Built in plain HTML/CSS/JS. No build step. No framework. Works offline.

---

## File Structure

```
project-os/
├── index.html              ← App shell (thin HTML, links to CSS/JS)
├── style.css               ← All styles
├── app.js                  ← All app logic / UI rendering
├── db.js                   ← Storage adapter (localStorage now, Supabase-ready)
├── manifest.webmanifest    ← PWA manifest (name, icons, display: standalone)
├── sw.js                   ← Service worker (offline caching)
├── vercel.json             ← Vercel deployment config
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── .gitignore
```

---

## Step 7 — Run Locally

You need a local server (not just opening the file) for the service worker to work.

**Python (no install needed):**
```bash
cd project-os
python -m http.server 8000
```
Then open: http://localhost:8000

**Node (if you have it):**
```bash
npx serve .
```

The app will:
- Load and save all data to `localStorage`
- Register the service worker
- Show an **Install App** button in Chrome/Edge once the PWA criteria are met

---

## Step 8 — Deploy to GitHub + Vercel

### Push to GitHub
```bash
cd project-os
git init
git add .
git commit -m "Initial commit - Project OS v1"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/project-os.git
git push -u origin main
```

### Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Framework preset: **Other** (no framework)
4. Root directory: `.` (leave as is)
5. Click Deploy

Vercel auto-detects `vercel.json` — no config needed.

**To update later:**
```bash
git add .
git commit -m "your changes"
git push
```
Vercel auto-deploys on every push to `main`.

---

## Step 9 → 10 — Upgrade to Supabase

**Only `db.js` changes.** `app.js` and `index.html` stay identical.

### 1. Create a Supabase project
- Go to [supabase.com](https://supabase.com) → New Project
- Copy your **Project URL** and **anon key** from Settings → API

### 2. Run this SQL in the Supabase SQL Editor

```sql
create table projects (
  id               text primary key,
  name             text not null,
  state            text not null default 'Inbox',
  type             text,
  energy           text,
  definition_of_done text,
  deadline         date,
  next_action      text,
  context          text,
  blockers         text,
  backlog          jsonb default '[]',
  progress_log     jsonb default '[]',
  pause_note       jsonb,
  ai_log           jsonb default '[]',
  waiting_for      text,
  waiting_who      text,
  check_in_date    date,
  created          date,
  last_worked      date,
  updated_at       timestamptz default now()
);

create table app_state (
  id            text primary key default 'singleton',
  north_star    text default '',
  last_reset    text default '',
  today         jsonb,
  weekly_resets jsonb default '[]'
);

-- Insert the default singleton row
insert into app_state (id) values ('singleton') on conflict do nothing;

-- Optional: enable Row Level Security later when you add auth
-- alter table projects enable row level security;
-- alter table app_state enable row level security;
```

### 3. Replace the DB object in db.js

Open `db.js`, find the section marked **SUPABASE SWAP TEMPLATE**, uncomment it, fill in your project URL and anon key, and delete the old `localStorage` implementation.

### 4. Export your current data first!

Before switching, hit the **Export** button in the app to download a backup JSON. After switching to Supabase, use the **Import** button to load it into your new database.

---

## Export / Import

- **Export** (top-right button): Downloads `project-os-backup-YYYY-MM-DD.json`
- **Import** (top-right button): Loads a backup file and merges projects into current state

The backup format is:
```json
{
  "version": 1,
  "exportedAt": "2026-03-31T...",
  "projects": [...],
  "northStar": "...",
  "lastReset": "...",
  "weeklyResets": [...],
  "today": {...}
}
```

---

## ADHD System Rules (enforced by the app)

1. **3 Active projects max** — must park or finish before adding a new one
2. **Every Active project needs a Next Physical Action** — vague = blocked
3. **Definition of Done required** before a project can go Active
4. **Inbox is for capture only** — process during Weekly Reset
5. **Parked projects need a Resume Note** — future you will thank you

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| UI | Vanilla HTML/CSS/JS | No build step, no dependencies |
| Storage | `localStorage` → Supabase | Start local, upgrade path ready |
| Offline | Service Worker | Cache-first for app shell |
| Hosting | Vercel | Free, auto-deploys from GitHub |
| Fonts | Google Fonts (CDN) | Cached by SW after first load |
