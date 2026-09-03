# Qbox Senja Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Qbox Senja schedule Artifact into a real, deployed Next.js site with an identical look, where Frida can unlock an inline edit mode with a shared password and edit/add/remove every piece of text (schedule days, entries, packing list, hero copy).

**Architecture:** A single Server Component page (`app/page.tsx`) fetches all content from Supabase using a service-role key (no Supabase Auth, no client-side Supabase calls at all) and passes it to a client component tree. Edit access is controlled entirely by our own signed cookie, set by a `unlockEditMode` Server Action after checking a shared password against `ADMIN_PASSWORD`. All mutations go through Server Actions in `app/actions.ts`, which re-check the cookie server-side before touching the database, then `revalidatePath('/')`.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Supabase (Postgres only, service-role key, no Supabase Auth/RLS-write) · `@supabase/supabase-js` · Vitest + @testing-library/react · Vercel

**Spec:** `docs/superpowers/specs/2026-09-03-qbox-senja-website-design.md`

## Global Constraints

- Public (logged-out) view must be visually identical to the current Artifact (`https://claude.ai/code/artifact/bb420edd-57df-4443-af5f-68d090f76af9`) — same palette (`#bf5594` rose, `#9568b6` violet, `#3fa6b5` teal), same Roboto/Lora pairing, same layout.
- Shared password is `Kristoffer123`, stored only in the `ADMIN_PASSWORD` env var — never in client code.
- No Supabase Auth, no user accounts, no `/admin` route — editing happens inline on `/` once unlocked.
- All content (hero text, schedule days/entries, packing list) is editable; days, entries, and packing rows can be added and removed, not just edited.
- No image upload/replacement in edit mode — only text.
- Hosting on a free Vercel subdomain (no custom domain in this phase).

---

## File Map

```
qbox-senja-website/
├── app/
│   ├── layout.tsx                # Roboto + Lora via next/font/google, root <html>/<body>
│   ├── globals.css                # Ported 1:1 from the Artifact's <style> block + edit-mode UI rules
│   ├── page.tsx                   # Server Component — fetches content, days, packing, edit-mode; renders HomePage
│   └── actions.ts                 # 'use server' — unlock/lock/getEditMode + all CRUD actions
├── components/
│   ├── HomePage.tsx               # 'use client' — orchestrator, owns state, wires save handlers
│   ├── Hero.tsx                   # 'use client' — logo, eyebrow, title, dates, route
│   ├── Timeline.tsx               # 'use client' — days + entries, add/remove, breakout photo
│   ├── PackingList.tsx            # 'use client' — two packing sections, add/remove
│   ├── Footer.tsx                 # 'use client' — logo + footer text
│   ├── EditableText.tsx           # 'use client' — generic click-to-edit text field
│   └── LockToggle.tsx             # 'use client' — password prompt / "avsluta redigering"
├── lib/
│   ├── supabase-server.ts         # createClient() with service-role key
│   ├── db.ts                      # pure DB functions (accept SupabaseClient), tested
│   ├── auth.ts                    # password check + signed session token, tested
│   └── __tests__/
│       ├── auth.test.ts
│       └── db.test.ts
├── components/__tests__/
│   └── EditableText.test.tsx
├── public/
│   ├── logo.png                   # already extracted from the Artifact
│   └── hamn-senja.jpg             # already extracted from the Artifact
└── vitest.config.ts
```

---

## Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, etc. (generated)

- [ ] **Step 1: Run create-next-app in the existing directory**

```bash
cd /Users/fridastenstrom/qbox-senja-website
npx create-next-app@latest . --typescript --no-tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

We already have a hand-written CSS file to port (Task 2), so answer **No** to Tailwind when prompted (or use the flag above). Accept defaults for everything else. Turbopack: **Yes**.

- [ ] **Step 2: Install Supabase client**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 4: Create `.env.local` placeholder**

```bash
cat > .env.local << 'EOF'
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=Kristoffer123
SESSION_SECRET=
EOF
```

(Filled in for real once the Supabase project exists — Task 3 — and `SESSION_SECRET` is generated in that same task.)

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts at http://localhost:3000 with the default Next.js starter page.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with Supabase client and Vitest"
```

---

## Task 2: Fonts, layout, and global CSS

**Files:**
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Delete: `app/page.module.css` (if generated — we don't use CSS modules)

- [ ] **Step 1: Write the root layout with Roboto + Lora**

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { Roboto, Lora } from 'next/font/google'
import './globals.css'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-roboto',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Qbox Senja',
  description: 'Schema för Qbox konferensresa Stockholm–Senja, 16–20 september',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className={`${roboto.variable} ${lora.variable}`}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Write globals.css — ported from the Artifact, plus edit-mode UI rules**

```css
/* app/globals.css */
:root {
  --rose: #bf5594;
  --violet: #9568b6;
  --teal: #3fa6b5;
  --ink: #23202b;
  --ink-soft: #514c5c;
  --paper: #f5ecf1;
  --paper-dim: #ecdfe8;
  --paper-card: #ffffff;
  --rule: rgba(35, 32, 43, 0.14);
  --shadow: 0 1px 2px rgba(35, 32, 43, 0.06), 0 8px 24px -12px rgba(35, 32, 43, 0.18);
}

* { box-sizing: border-box; }

html, body { margin: 0; padding: 0; }

body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-lora), Georgia, 'Times New Roman', serif;
  -webkit-font-smoothing: antialiased;
}

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}

a { color: inherit; }

.wrap { max-width: 760px; margin: 0 auto; padding: 0 24px; }

/* ---------- HERO ---------- */
.hero {
  position: relative;
  padding: 52px 0 88px;
  background: linear-gradient(120deg, var(--rose) 0%, var(--violet) 52%, var(--teal) 100%);
  overflow: hidden;
}
.hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px);
  background-size: 14px 14px;
  opacity: 0.35;
  mix-blend-mode: overlay;
}
.hero-inner { position: relative; max-width: 760px; margin: 0 auto; padding: 0 24px; }
.logo { height: 34px; width: auto; filter: brightness(0) invert(1); opacity: 0.95; display: block; margin-bottom: 28px; }
.hero-eyebrow {
  font-family: var(--font-roboto), Arial, sans-serif;
  font-weight: 500; font-style: italic; font-size: 15px;
  letter-spacing: 0.03em; color: rgba(255,255,255,0.88); margin: 0 0 10px;
}
.hero-title {
  font-family: var(--font-roboto), Arial, sans-serif;
  font-weight: 700; font-size: clamp(44px, 9vw, 76px);
  line-height: 0.98; letter-spacing: -0.01em; color: #ffffff; margin: 0 0 18px;
  text-wrap: balance;
}
.hero-dates {
  font-family: var(--font-roboto), Arial, sans-serif;
  font-weight: 400; font-size: 18px; color: rgba(255,255,255,0.95);
  font-variant-numeric: tabular-nums; margin: 0;
}
.hero-route {
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 28px;
  font-family: var(--font-roboto), Arial, sans-serif; font-size: 13px;
  letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.85);
}
.hero-route-stop { display: inline-flex; align-items: center; gap: 10px; }
.hero-route .dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,0.7); }

/* ---------- INTRO ---------- */
.intro { padding: 28px 0 4px; }
.intro-text { font-size: 16.5px; line-height: 1.55; color: var(--ink-soft); max-width: 58ch; margin: 0; }

/* ---------- TIMELINE ---------- */
.timeline { padding: 8px 0 8px; }

.day { padding: 22px 0 2px; border-top: 1px solid var(--rule); position: relative; }
.day:first-child { border-top: none; padding-top: 6px; }

.day-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.day-name { font-family: var(--font-roboto), Arial, sans-serif; font-weight: 700; font-size: 22px; letter-spacing: -0.01em; margin: 0; }
.day-name .accent { color: var(--accent); }
.day-head-right { display: flex; align-items: center; gap: 10px; }
.day-tag {
  font-family: var(--font-roboto), Arial, sans-serif; font-weight: 500; font-style: italic;
  font-size: 13px; color: var(--ink-soft); white-space: nowrap;
}

.entries { display: flex; flex-direction: column; }

.entry { display: grid; grid-template-columns: 84px 1fr; gap: 18px; padding: 7px 0; position: relative; }
.entry--editable { padding-right: 26px; }
.entry::before {
  content: ""; position: absolute; left: 3px; top: 6px; width: 6px; height: 6px;
  border-radius: 50%; background: var(--accent);
}
.entry::after {
  content: ""; position: absolute; left: 5.5px; top: 16px; bottom: -3px; width: 1px; background: var(--rule);
}
.entry:last-child::after { display: none; }

.entry-time {
  font-family: var(--font-roboto), Arial, sans-serif; font-weight: 500; font-size: 13px;
  font-variant-numeric: tabular-nums; color: var(--ink-soft); padding-left: 22px; padding-top: 1px;
}
.entry-body { min-width: 0; }
.entry-title { font-family: var(--font-roboto), Arial, sans-serif; font-weight: 500; font-size: 15.5px; margin: 0 0 1px; }
.entry-note { font-family: var(--font-lora), Georgia, serif; font-size: 14px; line-height: 1.4; color: var(--ink-soft); margin: 0; }

/* ---------- BREAKOUT PHOTO ---------- */
.photo-break { margin: 14px -24px 2px; border-radius: 4px; overflow: hidden; box-shadow: var(--shadow); }
.photo-break img { display: block; width: 100%; height: auto; max-height: 280px; object-fit: cover; }
.photo-caption {
  font-family: var(--font-roboto), Arial, sans-serif; font-size: 12px; letter-spacing: 0.03em;
  color: var(--ink-soft); padding: 8px 24px 0; margin: 0;
}

/* ---------- PACKLISTA ---------- */
.packing { margin: 32px 0 40px; padding: 28px 32px; background: var(--paper-dim); border-radius: 4px; }
.packing h2 { font-family: var(--font-roboto), Arial, sans-serif; font-weight: 700; font-size: 21px; margin: 0 0 16px; }
.packing-list { display: flex; flex-direction: column; gap: 12px; }
.packing-item { display: flex; gap: 10px; align-items: flex-start; font-size: 15.5px; line-height: 1.5; position: relative; }
.packing-item--editable { padding-right: 26px; }
.packing-item svg { flex: none; margin-top: 3px; }
.packing-item .stroke { stroke: var(--teal); }

.packing-sub { margin-top: 20px; padding-left: 18px; border-left: 2px solid var(--rose); }
.packing-sub-title {
  font-family: var(--font-roboto), Arial, sans-serif; font-weight: 500; font-style: italic;
  font-size: 13px; letter-spacing: 0.02em; color: var(--rose); margin: 0 0 12px;
}
.packing-sub .packing-item .stroke { stroke: var(--rose); }

@media (max-width: 560px) { .photo-break { margin-left: -24px; margin-right: -24px; } }

/* ---------- FOOTER ---------- */
footer { border-top: 1px solid var(--rule); padding: 28px 0 48px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
footer img { height: 20px; width: auto; opacity: 0.8; }
footer p { font-family: var(--font-roboto), Arial, sans-serif; font-size: 12.5px; letter-spacing: 0.03em; color: var(--ink-soft); margin: 0; }

/* ---------- EDIT MODE ---------- */
.editable { cursor: text; border-radius: 3px; transition: background-color 0.15s ease; }
.editable:hover { background: rgba(149, 104, 182, 0.12); }
.editable:focus-visible { outline: 2px solid var(--violet); outline-offset: 2px; }
.editable-input {
  font: inherit; color: inherit; background: var(--paper-card);
  border: 1.5px solid var(--violet); border-radius: 3px; padding: 2px 6px; width: 100%; resize: vertical;
}

.add-btn {
  font-family: var(--font-roboto), Arial, sans-serif; font-weight: 500; font-size: 13px;
  color: var(--violet); background: none; border: 1px dashed var(--violet); border-radius: 4px;
  padding: 8px 14px; margin-top: 10px; cursor: pointer;
}
.add-btn:hover { background: rgba(149, 104, 182, 0.1); }
.add-btn--day { margin: 18px 0 8px; }

.remove-btn { background: none; border: none; cursor: pointer; font-size: 13px; opacity: 0.55; padding: 2px 4px; line-height: 1; }
.remove-btn:hover { opacity: 1; }
.remove-btn--entry { position: absolute; right: 0; top: 4px; }

.lock-toggle-wrap { position: fixed; bottom: 20px; right: 20px; z-index: 20; }
.lock-toggle {
  font-family: var(--font-roboto), Arial, sans-serif; font-size: 18px; width: 42px; height: 42px;
  border-radius: 50%; border: 1px solid var(--rule); background: var(--paper-card);
  box-shadow: var(--shadow); cursor: pointer;
}
.lock-toggle--active {
  position: fixed; bottom: 20px; right: 20px; z-index: 20; width: auto; height: auto;
  border-radius: 100px; padding: 10px 18px; font-size: 13px; font-weight: 500; letter-spacing: 0.03em;
  color: #fff; background: var(--violet); border: none; box-shadow: var(--shadow); cursor: pointer;
  font-family: var(--font-roboto), Arial, sans-serif;
}
.lock-prompt {
  position: absolute; bottom: 52px; right: 0; background: var(--paper-card); border: 1px solid var(--rule);
  border-radius: 8px; box-shadow: var(--shadow); padding: 14px; display: flex; flex-direction: column;
  gap: 8px; width: 200px;
}
.lock-prompt input {
  font: 14px var(--font-lora), Georgia, serif; padding: 7px 10px; border: 1px solid var(--rule);
  border-radius: 4px; background: var(--paper); color: var(--ink);
}
.lock-prompt button {
  font-family: var(--font-roboto), Arial, sans-serif; font-weight: 500; font-size: 13px; padding: 8px;
  border: none; border-radius: 4px; background: var(--violet); color: #fff; cursor: pointer;
}
.lock-prompt button:disabled { opacity: 0.6; cursor: default; }
.lock-error { font-family: var(--font-roboto), Arial, sans-serif; font-size: 12px; color: var(--rose); margin: 0; }
```

- [ ] **Step 3: Remove generated CSS module if present**

```bash
rm -f app/page.module.css
```

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/globals.css
git rm --cached app/page.module.css 2>/dev/null || true
git commit -m "feat: port Artifact styles into globals.css, wire up Roboto/Lora"
```

---

## Task 3: Supabase project setup (manual)

This task requires manual steps in the Supabase dashboard. No code files.

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com → New project. Name: `qbox-senja`. Region: Europe (Stockholm). Save the **Project URL** and the **service_role key** (Settings → API — NOT the anon key, we only use service-role here since there's no client-side Supabase access).

- [ ] **Step 2: Generate a session secret**

```bash
openssl rand -hex 32
```

- [ ] **Step 3: Fill in `.env.local`**

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_PASSWORD=Kristoffer123
SESSION_SECRET=<output of openssl rand -hex 32>
```

- [ ] **Step 4: Run schema migration in the Supabase SQL Editor**

```sql
create table site_content (
  key text primary key,
  value text not null
);

create table schedule_days (
  id uuid primary key default gen_random_uuid(),
  day_name text not null,
  day_tag text,
  accent text not null default 'rose',
  sort_order int not null
);

create table schedule_entries (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references schedule_days(id) on delete cascade,
  time_label text not null,
  title text not null,
  note text,
  photo_url text,
  photo_caption text,
  sort_order int not null
);

create table packing_items (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  text text not null,
  sort_order int not null
);

alter table site_content enable row level security;
alter table schedule_days enable row level security;
alter table schedule_entries enable row level security;
alter table packing_items enable row level security;

create policy "public read site_content" on site_content for select using (true);
create policy "public read schedule_days" on schedule_days for select using (true);
create policy "public read schedule_entries" on schedule_entries for select using (true);
create policy "public read packing_items" on packing_items for select using (true);
```

No write policies are needed — all writes happen server-side through the service-role key (which bypasses RLS entirely), gated by our own password-protected cookie, never by Supabase Auth.

- [ ] **Step 5: Seed the current content**

```sql
insert into site_content (key, value) values
  ('hero_eyebrow', 'Konferensresa'),
  ('hero_title', 'Senja'),
  ('hero_dates', '16–20 september'),
  ('hero_route', 'Stockholm · Boden · Narvik · Senja · Tromsø · Stockholm'),
  ('intro_text', 'Tåg norrut, boende vid havet på Senja och två dagar fyllda av konferens, fjäll och fiske innan resan går tillbaka via Tromsø. Här är hela schemat, dag för dag.'),
  ('footer_text', 'Senja · 16–20 september');

insert into schedule_days (day_name, day_tag, accent, sort_order) values
  ('Onsdag 16 september', null, 'rose', 0),
  ('Torsdag 17 september', null, 'violet', 1),
  ('Fredag 18 september', null, 'teal', 2),
  ('Lördag 19 september', null, 'rose', 3),
  ('Söndag 20 september', 'Alternativ 1', 'violet', 4);

insert into schedule_entries (day_id, time_label, title, note, sort_order)
select id, '18.12', 'Tåg från Stockholm', 'Avgår från Stockholm Central, mot Boden. Konferens på tåget.', 0
from schedule_days where day_name = 'Onsdag 16 september';

insert into schedule_entries (day_id, time_label, title, note, photo_url, photo_caption, sort_order)
select id, v.time_label, v.title, v.note, v.photo_url, v.photo_caption, v.sort_order
from schedule_days, (values
  ('05.42', 'Ankomst Boden', 'Byte av tåg.', null, null, 0),
  ('06.01', 'Avgång tåg Boden', 'Mot Narvik.', null, null, 1),
  ('12.36', 'Ankomst Narvik', 'Frukost och lunch på tåget som utgångspunkt, köps av var och en.', null, null, 2),
  ('12.36', 'Upphämtning Narvik', 'Beräknad avgång Narvik–Hamn kl 13.00. Bussturen till Hamn tar ca 3,5 tim. Hamn i Senja ansvarar för busstransporten.', null, null, 3),
  ('16.30', 'Ankomst / incheckning', 'Beräknad ankomst till Hamn i Senja.', '/hamn-senja.jpg', 'Hamn i Senja — boendet för konferensen', 4),
  ('17.30–19.30', 'Vandring?', 'Kan bli svårt att nå hela vägen upp på Sukkertoppen då det börjar bli mörkt i september — turen tar minst 3 tim, utsikten ca 1 tim tur och retur.', null, null, 5),
  ('20.00', '3-rätters middag', 'Kan flyttas till 21.00 om någon vill försöka sig på Sukkertoppen. Dryckespaket bestäms och köps på plats.', null, null, 6)
) as v(time_label, title, note, photo_url, photo_caption, sort_order)
where day_name = 'Torsdag 17 september';

insert into schedule_entries (day_id, time_label, title, note, sort_order)
select id, v.time_label, v.title, v.note, v.sort_order
from schedule_days, (values
  ('07.30–09.00', 'Frukost', null, 0),
  ('09.00–11.00', 'Konferens', 'Med mötesrum.', 1),
  ('11.00–13.00', 'Båttur & lunch', 'Utomhus på en ö.', 2),
  ('13.00–16.00', 'Fisketur', 'Med varm dryck och snacks.', 3),
  ('19.00', '3-rätters middag', null, 4)
) as v(time_label, title, note, sort_order)
where day_name = 'Fredag 18 september';

insert into schedule_entries (day_id, time_label, title, note, sort_order)
select id, v.time_label, v.title, v.note, v.sort_order
from schedule_days, (values
  ('07.30–09.00', 'Frukost', null, 0),
  ('09.00–09.30', 'Båttransport till Skaland', null, 1),
  ('10.00–14.00', 'Fjälltur till Husfjellet', 'Ca 4 tim tur och retur. Fika/macka under turen.', 2),
  ('14.30–15.00', 'Båttransport', 'Från Skaland till Færøya.', 3),
  ('15.30–17.00', 'Sen lunch på Færøya', 'På vägen hem.', 4),
  ('17.00–17.30', 'Båttransport', 'Tillbaka till Hamn.', 5),
  ('18.00–19.30', 'Jacuzzi / bastu', null, 6),
  ('20.00', '3-rätters middag', null, 7)
) as v(time_label, title, note, sort_order)
where day_name = 'Lördag 19 september';

insert into schedule_entries (day_id, time_label, title, note, sort_order)
select id, v.time_label, v.title, v.note, v.sort_order
from schedule_days, (values
  ('07.30–10.00', 'Frukost', null, 0),
  ('10.00–11.00', 'Buss till Finnsnes', 'Bussturen tar ca 1 tim.', 1),
  ('11.30–14.15', 'Hurtigruten, Finnsnes–Tromsø', 'Avgår 11.30, framme i Tromsø 14.15.', 2),
  ('12.00–13.30', 'Lunch & konferens', 'Ombord på Hurtigruten.', 3),
  ('14.30–15.00', 'Buss till flygplatsen', 'Från Hurtigruten till Tromsø flygplats, knappt 30 min.', 4),
  ('17.25', 'Flyg avgår Tromsø', 'Mellanlandar i Oslo 19.30, avgår Oslo 20.00.', 5),
  ('21.00', 'Anländer Arlanda', null, 6)
) as v(time_label, title, note, sort_order)
where day_name = 'Söndag 20 september';

insert into packing_items (section, text, sort_order) values
  ('general', 'Bekväma kläder för tågresa — tofflor är att rekommendera', 0),
  ('general', 'Kläder till konferenstid och middagarna', 1),
  ('general', 'Dator', 2),
  ('activities', 'Kläder och skor för vandring utomhus. Vindjacka och även regntät jacka är att rekommendera', 0),
  ('activities', 'Mössa och handskar', 1),
  ('activities', 'Till fisket får ni låna en overall som yttersta lager', 2),
  ('activities', 'Badkläder', 3);
```

Verify: `select count(*) from schedule_entries;` → 23. `select count(*) from packing_items;` → 7.

---

## Task 4: Supabase server client + Vitest wiring

**Files:**
- Create: `lib/supabase-server.ts`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Create the Supabase server client**

```typescript
// lib/supabase-server.ts
import { createClient } from '@supabase/supabase-js'

export function getSupabaseServer() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

- [ ] **Step 2: Create vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 3: Create vitest setup file**

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test scripts to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Commit**

```bash
git add lib/supabase-server.ts vitest.config.ts vitest.setup.ts package.json
git commit -m "feat: add Supabase server client and Vitest configuration"
```

---

## Task 5: Password check + session token (`lib/auth.ts`)

**Files:**
- Create: `lib/auth.ts`
- Test: `lib/__tests__/auth.test.ts`

**Interfaces:**
- Produces: `checkPassword(input: string, expected: string): boolean`, `signSession(secret: string, expiresAt: number): string`, `verifySession(secret: string, token: string | undefined): boolean`, `COOKIE_NAME: string`, `MAX_AGE_SECONDS: number`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/__tests__/auth.test.ts
import { describe, it, expect } from 'vitest'
import { checkPassword, signSession, verifySession } from '@/lib/auth'

describe('checkPassword', () => {
  it('returns true for matching passwords', () => {
    expect(checkPassword('Kristoffer123', 'Kristoffer123')).toBe(true)
  })
  it('returns false for a wrong password', () => {
    expect(checkPassword('wrong', 'Kristoffer123')).toBe(false)
  })
  it('returns false when lengths differ', () => {
    expect(checkPassword('short', 'muchlongerpassword')).toBe(false)
  })
})

describe('signSession / verifySession', () => {
  const secret = 'test-secret'

  it('verifies a freshly signed, non-expired token', () => {
    const token = signSession(secret, Date.now() + 10_000)
    expect(verifySession(secret, token)).toBe(true)
  })

  it('rejects an expired token', () => {
    const token = signSession(secret, Date.now() - 1000)
    expect(verifySession(secret, token)).toBe(false)
  })

  it('rejects a tampered token', () => {
    const token = signSession(secret, Date.now() + 10_000)
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a')
    expect(verifySession(secret, tampered)).toBe(false)
  })

  it('rejects a token signed with a different secret', () => {
    const token = signSession('other-secret', Date.now() + 10_000)
    expect(verifySession(secret, token)).toBe(false)
  })

  it('rejects an undefined token', () => {
    expect(verifySession(secret, undefined)).toBe(false)
  })

  it('rejects a malformed token', () => {
    expect(verifySession(secret, 'not-a-real-token')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm run test:run
```

Expected: FAIL — `Cannot find module '@/lib/auth'`

- [ ] **Step 3: Implement lib/auth.ts**

```typescript
// lib/auth.ts
import crypto from 'crypto'

export const COOKIE_NAME = 'qbox_edit_session'
export const MAX_AGE_SECONDS = 60 * 60 * 12 // 12 hours

export function checkPassword(input: string, expected: string): boolean {
  const a = Buffer.from(input)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function signSession(secret: string, expiresAt: number): string {
  const payload = String(expiresAt)
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${hmac}`
}

export function verifySession(secret: string, token: string | undefined): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, hmac] = parts
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const a = Buffer.from(hmac)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  if (!crypto.timingSafeEqual(a, b)) return false
  const expiresAt = Number(payload)
  return Number.isFinite(expiresAt) && Date.now() < expiresAt
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm run test:run
```

Expected: all `auth.test.ts` tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts lib/__tests__/auth.test.ts
git commit -m "feat: add password check and signed session token with tests"
```

---

## Task 6: Database functions (`lib/db.ts`)

**Files:**
- Create: `lib/db.ts`
- Test: `lib/__tests__/db.test.ts`

**Interfaces:**
- Consumes: none (accepts a `SupabaseClient` argument, same pattern as `lib/supabase-server.ts`'s return type)
- Produces: types `SiteContent`, `ScheduleDay`, `ScheduleEntry`, `DayWithEntries`, `PackingItem`; functions `getSiteContent`, `setSiteContent`, `getScheduleDays`, `addDay`, `updateDay`, `deleteDay`, `addEntry`, `updateEntry`, `deleteEntry`, `getPackingItems`, `addPackingItem`, `updatePackingItem`, `deletePackingItem` — all used by `app/actions.ts` (Task 7)

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/__tests__/db.test.ts
import { describe, it, expect, vi } from 'vitest'
import * as db from '@/lib/db'
import type { SupabaseClient } from '@supabase/supabase-js'

function client(from: ReturnType<typeof vi.fn>) {
  return { from } as unknown as SupabaseClient
}

describe('getSiteContent', () => {
  it('turns key/value rows into a lookup object', async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: [{ key: 'hero_title', value: 'Senja' }, { key: 'hero_dates', value: '16–20 september' }],
      }),
    }))
    const result = await db.getSiteContent(client(from))
    expect(result).toEqual({ hero_title: 'Senja', hero_dates: '16–20 september' })
    expect(from).toHaveBeenCalledWith('site_content')
  })

  it('returns an empty object when there are no rows', async () => {
    const from = vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: null }) }))
    const result = await db.getSiteContent(client(from))
    expect(result).toEqual({})
  })
})

describe('setSiteContent', () => {
  it('upserts key and value', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    await db.setSiteContent(client(vi.fn(() => ({ upsert }))), 'hero_title', 'Senja')
    expect(upsert).toHaveBeenCalledWith({ key: 'hero_title', value: 'Senja' })
  })
})

describe('getScheduleDays', () => {
  it('nests entries under their day, both ordered by sort_order', async () => {
    const days = [
      { id: 'd1', day_name: 'Onsdag', day_tag: null, accent: 'rose', sort_order: 0 },
      { id: 'd2', day_name: 'Torsdag', day_tag: null, accent: 'violet', sort_order: 1 },
    ]
    const entries = [
      { id: 'e1', day_id: 'd1', time_label: '18.12', title: 'Tåg', note: null, photo_url: null, photo_caption: null, sort_order: 0 },
      { id: 'e2', day_id: 'd2', time_label: '05.42', title: 'Ankomst', note: null, photo_url: null, photo_caption: null, sort_order: 0 },
    ]
    const from = vi.fn((table: string) => {
      if (table === 'schedule_days') {
        return { select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: days }) })) }
      }
      return { select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: entries }) })) }
    })
    const result = await db.getScheduleDays(client(from))
    expect(result).toEqual([
      { ...days[0], entries: [entries[0]] },
      { ...days[1], entries: [entries[1]] },
    ])
  })
})

describe('addDay', () => {
  it('inserts and returns the created row', async () => {
    const day = { id: 'd3', day_name: 'Ny dag', day_tag: null, accent: 'rose', sort_order: 5 }
    const single = vi.fn().mockResolvedValue({ data: day, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    const result = await db.addDay(client(vi.fn(() => ({ insert }))), {
      day_name: 'Ny dag', day_tag: null, accent: 'rose', sort_order: 5,
    })
    expect(insert).toHaveBeenCalledWith({ day_name: 'Ny dag', day_tag: null, accent: 'rose', sort_order: 5 })
    expect(result).toEqual(day)
  })

  it('throws when Supabase returns an error', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }))
    await expect(
      db.addDay(client(vi.fn(() => ({ insert }))), { day_name: 'x', day_tag: null, accent: 'rose', sort_order: 0 })
    ).rejects.toEqual({ message: 'boom' })
  })
})

describe('deleteDay', () => {
  it('deletes by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn(() => ({ eq }))
    await db.deleteDay(client(vi.fn(() => ({ delete: del }))), 'd1')
    expect(eq).toHaveBeenCalledWith('id', 'd1')
  })
})

describe('addPackingItem', () => {
  it('inserts and returns the created row', async () => {
    const item = { id: 'p1', section: 'general', text: 'Ny rad', sort_order: 3 }
    const single = vi.fn().mockResolvedValue({ data: item, error: null })
    const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }))
    const result = await db.addPackingItem(client(vi.fn(() => ({ insert }))), {
      section: 'general', text: 'Ny rad', sort_order: 3,
    })
    expect(result).toEqual(item)
  })
})

describe('deletePackingItem', () => {
  it('deletes by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    await db.deletePackingItem(client(vi.fn(() => ({ delete: vi.fn(() => ({ eq })) }))), 'p1')
    expect(eq).toHaveBeenCalledWith('id', 'p1')
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm run test:run
```

Expected: FAIL — `Cannot find module '@/lib/db'`

- [ ] **Step 3: Implement lib/db.ts**

```typescript
// lib/db.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export type SiteContent = Record<string, string>

export type ScheduleEntry = {
  id: string
  day_id: string
  time_label: string
  title: string
  note: string | null
  photo_url: string | null
  photo_caption: string | null
  sort_order: number
}

export type ScheduleDay = {
  id: string
  day_name: string
  day_tag: string | null
  accent: 'rose' | 'violet' | 'teal'
  sort_order: number
}

export type DayWithEntries = ScheduleDay & { entries: ScheduleEntry[] }

export type PackingItem = {
  id: string
  section: 'general' | 'activities'
  text: string
  sort_order: number
}

export async function getSiteContent(supabase: SupabaseClient): Promise<SiteContent> {
  const { data } = await supabase.from('site_content').select('key, value')
  const result: SiteContent = {}
  for (const row of (data ?? []) as { key: string; value: string }[]) result[row.key] = row.value
  return result
}

export async function setSiteContent(supabase: SupabaseClient, key: string, value: string) {
  return supabase.from('site_content').upsert({ key, value })
}

export async function getScheduleDays(supabase: SupabaseClient): Promise<DayWithEntries[]> {
  const [{ data: days }, { data: entries }] = await Promise.all([
    supabase.from('schedule_days').select('*').order('sort_order', { ascending: true }),
    supabase.from('schedule_entries').select('*').order('sort_order', { ascending: true }),
  ])
  return ((days ?? []) as ScheduleDay[]).map((day) => ({
    ...day,
    entries: ((entries ?? []) as ScheduleEntry[]).filter((e) => e.day_id === day.id),
  }))
}

export async function addDay(
  supabase: SupabaseClient,
  data: { day_name: string; day_tag: string | null; accent: string; sort_order: number }
): Promise<ScheduleDay> {
  const { data: row, error } = await supabase.from('schedule_days').insert(data).select().single()
  if (error) throw error
  return row as ScheduleDay
}

export async function updateDay(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<ScheduleDay, 'day_name' | 'day_tag' | 'accent'>>
) {
  return supabase.from('schedule_days').update(patch).eq('id', id)
}

export async function deleteDay(supabase: SupabaseClient, id: string) {
  return supabase.from('schedule_days').delete().eq('id', id)
}

export async function addEntry(
  supabase: SupabaseClient,
  data: { day_id: string; time_label: string; title: string; sort_order: number }
): Promise<ScheduleEntry> {
  const { data: row, error } = await supabase
    .from('schedule_entries')
    .insert({ ...data, note: null, photo_url: null, photo_caption: null })
    .select()
    .single()
  if (error) throw error
  return row as ScheduleEntry
}

export async function updateEntry(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<ScheduleEntry, 'time_label' | 'title' | 'note' | 'photo_caption'>>
) {
  return supabase.from('schedule_entries').update(patch).eq('id', id)
}

export async function deleteEntry(supabase: SupabaseClient, id: string) {
  return supabase.from('schedule_entries').delete().eq('id', id)
}

export async function getPackingItems(supabase: SupabaseClient): Promise<PackingItem[]> {
  const { data } = await supabase.from('packing_items').select('*').order('sort_order', { ascending: true })
  return (data ?? []) as PackingItem[]
}

export async function addPackingItem(
  supabase: SupabaseClient,
  data: { section: 'general' | 'activities'; text: string; sort_order: number }
): Promise<PackingItem> {
  const { data: row, error } = await supabase.from('packing_items').insert(data).select().single()
  if (error) throw error
  return row as PackingItem
}

export async function updatePackingItem(supabase: SupabaseClient, id: string, text: string) {
  return supabase.from('packing_items').update({ text }).eq('id', id)
}

export async function deletePackingItem(supabase: SupabaseClient, id: string) {
  return supabase.from('packing_items').delete().eq('id', id)
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm run test:run
```

Expected: all `db.test.ts` tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts lib/__tests__/db.test.ts
git commit -m "feat: add typed Supabase DB functions with test coverage"
```

---

## Task 7: Server Actions (`app/actions.ts`)

**Files:**
- Create: `app/actions.ts`

**Interfaces:**
- Consumes: everything from `lib/auth.ts` (Task 5) and `lib/db.ts` (Task 6), `getSupabaseServer` (Task 4)
- Produces: `unlockEditMode(password: string): Promise<{ ok: boolean }>`, `lockEditMode(): Promise<void>`, `getEditMode(): Promise<boolean>`, `updateContent(key: string, value: string): Promise<void>`, `addScheduleDay(input): Promise<ScheduleDay>`, `updateScheduleDay(id, patch): Promise<void>`, `deleteScheduleDay(id): Promise<void>`, `addScheduleEntry(input): Promise<ScheduleEntry>`, `updateScheduleEntry(id, patch): Promise<void>`, `deleteScheduleEntry(id): Promise<void>`, `addPackingListItem(input): Promise<PackingItem>`, `updatePackingListItem(id, text): Promise<void>`, `deletePackingListItem(id): Promise<void>` — all consumed directly by client components in Tasks 9–13

No unit tests for this file — it is a thin wiring layer over already-tested `lib/auth.ts` and `lib/db.ts`, and Server Actions require the Next.js request runtime (`cookies()`) to execute, which is exercised in the manual browser verification in Task 14.

- [ ] **Step 1: Implement app/actions.ts**

```typescript
// app/actions.ts
'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkPassword, signSession, verifySession, COOKIE_NAME, MAX_AGE_SECONDS } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase-server'
import * as db from '@/lib/db'
import type { ScheduleDay, ScheduleEntry, PackingItem } from '@/lib/db'

export async function unlockEditMode(password: string): Promise<{ ok: boolean }> {
  const ok = checkPassword(password, process.env.ADMIN_PASSWORD ?? '')
  if (!ok) return { ok: false }
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000
  const token = signSession(process.env.SESSION_SECRET ?? '', expiresAt)
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  })
  return { ok: true }
}

export async function lockEditMode(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function getEditMode(): Promise<boolean> {
  const store = await cookies()
  return verifySession(process.env.SESSION_SECRET ?? '', store.get(COOKIE_NAME)?.value)
}

async function requireEditMode() {
  if (!(await getEditMode())) throw new Error('Not in edit mode')
}

export async function updateContent(key: string, value: string): Promise<void> {
  await requireEditMode()
  await db.setSiteContent(getSupabaseServer(), key, value)
  revalidatePath('/')
}

export async function addScheduleDay(input: {
  day_name: string
  accent: string
  sort_order: number
}): Promise<ScheduleDay> {
  await requireEditMode()
  const day = await db.addDay(getSupabaseServer(), { ...input, day_tag: null })
  revalidatePath('/')
  return day
}

export async function updateScheduleDay(
  id: string,
  patch: { day_name?: string; day_tag?: string | null; accent?: string }
): Promise<void> {
  await requireEditMode()
  await db.updateDay(getSupabaseServer(), id, patch)
  revalidatePath('/')
}

export async function deleteScheduleDay(id: string): Promise<void> {
  await requireEditMode()
  await db.deleteDay(getSupabaseServer(), id)
  revalidatePath('/')
}

export async function addScheduleEntry(input: {
  day_id: string
  time_label: string
  title: string
  sort_order: number
}): Promise<ScheduleEntry> {
  await requireEditMode()
  const entry = await db.addEntry(getSupabaseServer(), input)
  revalidatePath('/')
  return entry
}

export async function updateScheduleEntry(
  id: string,
  patch: { time_label?: string; title?: string; note?: string | null; photo_caption?: string | null }
): Promise<void> {
  await requireEditMode()
  await db.updateEntry(getSupabaseServer(), id, patch)
  revalidatePath('/')
}

export async function deleteScheduleEntry(id: string): Promise<void> {
  await requireEditMode()
  await db.deleteEntry(getSupabaseServer(), id)
  revalidatePath('/')
}

export async function addPackingListItem(input: {
  section: 'general' | 'activities'
  text: string
  sort_order: number
}): Promise<PackingItem> {
  await requireEditMode()
  const item = await db.addPackingItem(getSupabaseServer(), input)
  revalidatePath('/')
  return item
}

export async function updatePackingListItem(id: string, text: string): Promise<void> {
  await requireEditMode()
  await db.updatePackingItem(getSupabaseServer(), id, text)
  revalidatePath('/')
}

export async function deletePackingListItem(id: string): Promise<void> {
  await requireEditMode()
  await db.deletePackingItem(getSupabaseServer(), id)
  revalidatePath('/')
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions.ts
git commit -m "feat: add server actions for edit-mode auth and all content CRUD"
```

---

## Task 8: EditableText component

**Files:**
- Create: `components/EditableText.tsx`
- Test: `components/__tests__/EditableText.test.tsx`

**Interfaces:**
- Produces: `<EditableText value editMode onSave as? className? placeholder? multiline? />` — consumed by Tasks 10–13

- [ ] **Step 1: Write the failing tests**

```typescript
// components/__tests__/EditableText.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EditableText from '@/components/EditableText'

describe('EditableText', () => {
  it('renders plain, non-interactive text when editMode is false', () => {
    render(<EditableText value="Hej" editMode={false} onSave={vi.fn()} />)
    expect(screen.getByText('Hej')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders as a clickable element when editMode is true', () => {
    render(<EditableText value="Hej" editMode={true} onSave={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Hej' })).toBeInTheDocument()
  })

  it('shows an input on click and calls onSave with the new value on blur', () => {
    const onSave = vi.fn()
    render(<EditableText value="Hej" editMode={true} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hej' }))
    const input = screen.getByDisplayValue('Hej')
    fireEvent.change(input, { target: { value: 'Hejsan' } })
    fireEvent.blur(input)
    expect(onSave).toHaveBeenCalledWith('Hejsan')
  })

  it('does not call onSave when the value is unchanged', () => {
    const onSave = vi.fn()
    render(<EditableText value="Hej" editMode={true} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hej' }))
    fireEvent.blur(screen.getByDisplayValue('Hej'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('renders a textarea instead of an input when multiline', () => {
    render(<EditableText value="Hej" editMode={true} onSave={vi.fn()} multiline />)
    fireEvent.click(screen.getByRole('button', { name: 'Hej' }))
    expect(screen.getByDisplayValue('Hej').tagName).toBe('TEXTAREA')
  })

  it('shows the placeholder when value is empty', () => {
    render(<EditableText value="" editMode={false} onSave={vi.fn()} placeholder="Lägg till text…" />)
    expect(screen.getByText('Lägg till text…')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm run test:run
```

Expected: FAIL — `Cannot find module '@/components/EditableText'`

- [ ] **Step 3: Implement components/EditableText.tsx**

```typescript
// components/EditableText.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  value: string
  editMode: boolean
  onSave: (value: string) => void | Promise<void>
  as?: 'span' | 'p' | 'h1' | 'h2'
  className?: string
  placeholder?: string
  multiline?: boolean
}

export default function EditableText({
  value,
  editMode,
  onSave,
  as: Tag = 'span',
  className,
  placeholder,
  multiline = false,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (!editMode) {
    return <Tag className={className}>{value || placeholder}</Tag>
  }

  if (!editing) {
    return (
      <Tag
        className={`${className ?? ''} editable`.trim()}
        role="button"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setEditing(true)
        }}
      >
        {value || placeholder}
      </Tag>
    )
  }

  async function commit() {
    setEditing(false)
    if (draft !== value) await onSave(draft)
  }

  return multiline ? (
    <textarea
      ref={inputRef as React.RefObject<HTMLTextAreaElement>}
      className={`${className ?? ''} editable-input`.trim()}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      rows={3}
    />
  ) : (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      className={`${className ?? ''} editable-input`.trim()}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
      }}
    />
  )
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm run test:run
```

Expected: all `EditableText.test.tsx` tests PASS

- [ ] **Step 5: Commit**

```bash
git add components/EditableText.tsx components/__tests__/EditableText.test.tsx
git commit -m "feat: add EditableText click-to-edit component with tests"
```

---

## Task 9: LockToggle component

**Files:**
- Create: `components/LockToggle.tsx`

**Interfaces:**
- Consumes: `unlockEditMode`, `lockEditMode` from `app/actions.ts` (Task 7)
- Produces: `<LockToggle editMode onUnlock onLock />` — consumed by `components/HomePage.tsx` (Task 14)

- [ ] **Step 1: Implement components/LockToggle.tsx**

```typescript
// components/LockToggle.tsx
'use client'

import { useState } from 'react'
import { unlockEditMode, lockEditMode } from '@/app/actions'

type Props = {
  editMode: boolean
  onUnlock: () => void
  onLock: () => void
}

export default function LockToggle({ editMode, onUnlock, onLock }: Props) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await unlockEditMode(password)
    setLoading(false)
    if (!result.ok) {
      setError('Fel lösenord')
      return
    }
    setPassword('')
    setOpen(false)
    onUnlock()
  }

  async function handleLock() {
    await lockEditMode()
    onLock()
  }

  if (editMode) {
    return (
      <button type="button" className="lock-toggle--active" onClick={handleLock}>
        Avsluta redigering
      </button>
    )
  }

  return (
    <div className="lock-toggle-wrap">
      <button
        type="button"
        className="lock-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label="Redigera sidan"
      >
        🔒
      </button>
      {open && (
        <form className="lock-prompt" onSubmit={submit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Lösenord"
            autoFocus
          />
          {error && <p className="lock-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Kollar…' : 'Lås upp'}
          </button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/LockToggle.tsx
git commit -m "feat: add LockToggle password prompt component"
```

---

## Task 10: Hero component

**Files:**
- Create: `components/Hero.tsx`

**Interfaces:**
- Consumes: `SiteContent` type and `EditableText` (Task 8)
- Produces: `<Hero content editMode saveField />` — consumed by `components/HomePage.tsx` (Task 14)

- [ ] **Step 1: Implement components/Hero.tsx**

```typescript
// components/Hero.tsx
'use client'

import Image from 'next/image'
import EditableText from './EditableText'
import type { SiteContent } from '@/lib/db'

type Props = {
  content: SiteContent
  editMode: boolean
  saveField: (key: string) => (value: string) => Promise<void>
}

export default function Hero({ content, editMode, saveField }: Props) {
  const route = (content.hero_route ?? '')
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <header className="hero">
      <div className="hero-inner">
        <Image className="logo" src="/logo.png" alt="qbox" width={120} height={34} />
        <EditableText
          as="p"
          className="hero-eyebrow"
          value={content.hero_eyebrow ?? ''}
          editMode={editMode}
          onSave={saveField('hero_eyebrow')}
        />
        <EditableText
          as="h1"
          className="hero-title"
          value={content.hero_title ?? ''}
          editMode={editMode}
          onSave={saveField('hero_title')}
        />
        <EditableText
          as="p"
          className="hero-dates"
          value={content.hero_dates ?? ''}
          editMode={editMode}
          onSave={saveField('hero_dates')}
        />
        {editMode ? (
          <EditableText
            as="p"
            className="hero-route"
            value={content.hero_route ?? ''}
            editMode={editMode}
            onSave={saveField('hero_route')}
          />
        ) : (
          <div className="hero-route">
            {route.map((stop, i) => (
              <span key={i} className="hero-route-stop">
                {i > 0 && <span className="dot" />}
                {stop}
              </span>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Hero.tsx
git commit -m "feat: add Hero component with editable hero text"
```

---

## Task 11: Timeline component

**Files:**
- Create: `components/Timeline.tsx`

**Interfaces:**
- Consumes: `DayWithEntries` type (Task 6), `EditableText` (Task 8), `addScheduleDay`/`updateScheduleDay`/`deleteScheduleDay`/`addScheduleEntry`/`updateScheduleEntry`/`deleteScheduleEntry` (Task 7)
- Produces: `<Timeline days editMode onChange />` — consumed by `components/HomePage.tsx` (Task 14)

- [ ] **Step 1: Implement components/Timeline.tsx**

```typescript
// components/Timeline.tsx
'use client'

import { Fragment } from 'react'
import EditableText from './EditableText'
import type { DayWithEntries } from '@/lib/db'
import {
  addScheduleDay,
  updateScheduleDay,
  deleteScheduleDay,
  addScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
} from '@/app/actions'

type Props = {
  days: DayWithEntries[]
  editMode: boolean
  onChange: (days: DayWithEntries[]) => void
}

const ACCENTS = ['rose', 'violet', 'teal'] as const

export default function Timeline({ days, editMode, onChange }: Props) {
  async function handleAddDay() {
    const sortOrder = days.length ? Math.max(...days.map((d) => d.sort_order)) + 1 : 0
    const accent = ACCENTS[days.length % ACCENTS.length]
    const day = await addScheduleDay({ day_name: 'Ny dag', accent, sort_order: sortOrder })
    onChange([...days, { ...day, entries: [] }])
  }

  async function handleUpdateDayName(dayId: string, value: string) {
    onChange(days.map((d) => (d.id === dayId ? { ...d, day_name: value } : d)))
    await updateScheduleDay(dayId, { day_name: value })
  }

  async function handleDeleteDay(dayId: string) {
    if (!confirm('Ta bort hela dagen?')) return
    onChange(days.filter((d) => d.id !== dayId))
    await deleteScheduleDay(dayId)
  }

  async function handleAddEntry(dayId: string) {
    const day = days.find((d) => d.id === dayId)
    if (!day) return
    const sortOrder = day.entries.length ? Math.max(...day.entries.map((e) => e.sort_order)) + 1 : 0
    const entry = await addScheduleEntry({ day_id: dayId, time_label: '00.00', title: 'Ny punkt', sort_order: sortOrder })
    onChange(days.map((d) => (d.id === dayId ? { ...d, entries: [...d.entries, entry] } : d)))
  }

  async function handleUpdateEntry(
    dayId: string,
    entryId: string,
    patch: { time_label?: string; title?: string; note?: string | null; photo_caption?: string | null }
  ) {
    onChange(
      days.map((d) =>
        d.id === dayId
          ? { ...d, entries: d.entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)) }
          : d
      )
    )
    await updateScheduleEntry(entryId, patch)
  }

  async function handleDeleteEntry(dayId: string, entryId: string) {
    if (!confirm('Ta bort punkten?')) return
    onChange(days.map((d) => (d.id === dayId ? { ...d, entries: d.entries.filter((e) => e.id !== entryId) } : d)))
    await deleteScheduleEntry(entryId)
  }

  return (
    <section className="timeline">
      {days.map((day) => (
        <article key={day.id} className="day" style={{ ['--accent' as string]: `var(--${day.accent})` }}>
          <div className="day-head">
            <h2 className="day-name">
              <EditableText
                value={day.day_name}
                editMode={editMode}
                onSave={(v) => handleUpdateDayName(day.id, v)}
              />
            </h2>
            <div className="day-head-right">
              {day.day_tag && <span className="day-tag">{day.day_tag}</span>}
              {editMode && (
                <button type="button" className="remove-btn" onClick={() => handleDeleteDay(day.id)} aria-label="Ta bort dag">
                  🗑
                </button>
              )}
            </div>
          </div>
          <div className="entries">
            {day.entries.map((entry) => (
              <Fragment key={entry.id}>
                <div className={`entry${editMode ? ' entry--editable' : ''}`}>
                  <div className="entry-time">
                    <EditableText
                      value={entry.time_label}
                      editMode={editMode}
                      onSave={(v) => handleUpdateEntry(day.id, entry.id, { time_label: v })}
                    />
                  </div>
                  <div className="entry-body">
                    <p className="entry-title">
                      <EditableText
                        value={entry.title}
                        editMode={editMode}
                        onSave={(v) => handleUpdateEntry(day.id, entry.id, { title: v })}
                      />
                    </p>
                    {(entry.note || editMode) && (
                      <p className="entry-note">
                        <EditableText
                          value={entry.note ?? ''}
                          editMode={editMode}
                          onSave={(v) => handleUpdateEntry(day.id, entry.id, { note: v })}
                          placeholder="Lägg till anteckning…"
                          multiline
                        />
                      </p>
                    )}
                  </div>
                  {editMode && (
                    <button
                      type="button"
                      className="remove-btn remove-btn--entry"
                      onClick={() => handleDeleteEntry(day.id, entry.id)}
                      aria-label="Ta bort punkt"
                    >
                      🗑
                    </button>
                  )}
                </div>
                {entry.photo_url && (
                  <>
                    <div className="photo-break">
                      <img src={entry.photo_url} alt={entry.photo_caption ?? ''} />
                    </div>
                    <p className="photo-caption">
                      <EditableText
                        value={entry.photo_caption ?? ''}
                        editMode={editMode}
                        onSave={(v) => handleUpdateEntry(day.id, entry.id, { photo_caption: v })}
                      />
                    </p>
                  </>
                )}
              </Fragment>
            ))}
          </div>
          {editMode && (
            <button type="button" className="add-btn" onClick={() => handleAddEntry(day.id)}>
              + Lägg till punkt
            </button>
          )}
        </article>
      ))}
      {editMode && (
        <button type="button" className="add-btn add-btn--day" onClick={handleAddDay}>
          + Lägg till dag
        </button>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Timeline.tsx
git commit -m "feat: add Timeline component with add/edit/remove for days and entries"
```

---

## Task 12: PackingList component

**Files:**
- Create: `components/PackingList.tsx`

**Interfaces:**
- Consumes: `PackingItem` type (Task 6), `EditableText` (Task 8), `addPackingListItem`/`updatePackingListItem`/`deletePackingListItem` (Task 7)
- Produces: `<PackingList items editMode onChange />` — consumed by `components/HomePage.tsx` (Task 14)

- [ ] **Step 1: Implement components/PackingList.tsx**

```typescript
// components/PackingList.tsx
'use client'

import EditableText from './EditableText'
import type { PackingItem } from '@/lib/db'
import { addPackingListItem, updatePackingListItem, deletePackingListItem } from '@/app/actions'

type Props = {
  items: PackingItem[]
  editMode: boolean
  onChange: (items: PackingItem[]) => void
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path className="stroke" d="M2 8.5L6 12.5L14 3.5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PackingList({ items, editMode, onChange }: Props) {
  const general = items.filter((i) => i.section === 'general')
  const activities = items.filter((i) => i.section === 'activities')

  async function handleAdd(section: 'general' | 'activities') {
    const group = section === 'general' ? general : activities
    const sortOrder = group.length ? Math.max(...group.map((i) => i.sort_order)) + 1 : 0
    const item = await addPackingListItem({ section, text: 'Ny rad', sort_order: sortOrder })
    onChange([...items, item])
  }

  async function handleUpdate(id: string, text: string) {
    onChange(items.map((i) => (i.id === id ? { ...i, text } : i)))
    await updatePackingListItem(id, text)
  }

  async function handleDelete(id: string) {
    if (!confirm('Ta bort raden?')) return
    onChange(items.filter((i) => i.id !== id))
    await deletePackingListItem(id)
  }

  function renderGroup(group: PackingItem[]) {
    return (
      <div className="packing-list">
        {group.map((item) => (
          <div key={item.id} className={`packing-item${editMode ? ' packing-item--editable' : ''}`}>
            <CheckIcon />
            <EditableText value={item.text} editMode={editMode} onSave={(v) => handleUpdate(item.id, v)} multiline />
            {editMode && (
              <button type="button" className="remove-btn" onClick={() => handleDelete(item.id)} aria-label="Ta bort rad">
                🗑
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <section className="packing">
      <h2>Packlista</h2>
      {renderGroup(general)}
      {editMode && (
        <button type="button" className="add-btn" onClick={() => handleAdd('general')}>
          + Lägg till rad
        </button>
      )}
      <div className="packing-sub">
        <p className="packing-sub-title">Till aktiviteterna</p>
        {renderGroup(activities)}
        {editMode && (
          <button type="button" className="add-btn" onClick={() => handleAdd('activities')}>
            + Lägg till rad
          </button>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/PackingList.tsx
git commit -m "feat: add PackingList component with add/edit/remove"
```

---

## Task 13: Footer component

**Files:**
- Create: `components/Footer.tsx`

**Interfaces:**
- Consumes: `SiteContent` type (Task 6), `EditableText` (Task 8)
- Produces: `<Footer content editMode saveField />` — consumed by `components/HomePage.tsx` (Task 14)

- [ ] **Step 1: Implement components/Footer.tsx**

```typescript
// components/Footer.tsx
'use client'

import Image from 'next/image'
import EditableText from './EditableText'
import type { SiteContent } from '@/lib/db'

type Props = {
  content: SiteContent
  editMode: boolean
  saveField: (key: string) => (value: string) => Promise<void>
}

export default function Footer({ content, editMode, saveField }: Props) {
  return (
    <footer>
      <Image src="/logo.png" alt="qbox" width={90} height={20} />
      <p>
        <EditableText value={content.footer_text ?? ''} editMode={editMode} onSave={saveField('footer_text')} />
      </p>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Footer.tsx
git commit -m "feat: add Footer component with editable footer text"
```

---

## Task 14: HomePage assembly + page.tsx

**Files:**
- Create: `components/HomePage.tsx`
- Modify: `app/page.tsx`
- Delete: `app/page.module.css` reference if `create-next-app` left one in `app/page.tsx`

**Interfaces:**
- Consumes: `Hero` (Task 10), `Timeline` (Task 11), `PackingList` (Task 12), `Footer` (Task 13), `LockToggle` (Task 9), `EditableText` (Task 8), `updateContent` (Task 7), `getSupabaseServer` (Task 4), `db.*` (Task 6), `getEditMode` (Task 7)

- [ ] **Step 1: Implement components/HomePage.tsx**

```typescript
// components/HomePage.tsx
'use client'

import { useState } from 'react'
import Hero from './Hero'
import Timeline from './Timeline'
import PackingList from './PackingList'
import Footer from './Footer'
import LockToggle from './LockToggle'
import EditableText from './EditableText'
import { updateContent } from '@/app/actions'
import type { SiteContent, DayWithEntries, PackingItem } from '@/lib/db'

type Props = {
  initialContent: SiteContent
  initialDays: DayWithEntries[]
  initialPacking: PackingItem[]
  initialEditMode: boolean
}

export default function HomePage({ initialContent, initialDays, initialPacking, initialEditMode }: Props) {
  const [editMode, setEditMode] = useState(initialEditMode)
  const [content, setContent] = useState(initialContent)
  const [days, setDays] = useState(initialDays)
  const [packing, setPacking] = useState(initialPacking)

  function saveField(key: string) {
    return async (value: string) => {
      setContent((c) => ({ ...c, [key]: value }))
      await updateContent(key, value)
    }
  }

  return (
    <>
      <Hero content={content} editMode={editMode} saveField={saveField} />
      <main className="wrap">
        <section className="intro">
          <EditableText
            as="p"
            className="intro-text"
            value={content.intro_text ?? ''}
            editMode={editMode}
            onSave={saveField('intro_text')}
            multiline
          />
        </section>
        <Timeline days={days} editMode={editMode} onChange={setDays} />
        <PackingList items={packing} editMode={editMode} onChange={setPacking} />
        <Footer content={content} editMode={editMode} saveField={saveField} />
      </main>
      <LockToggle editMode={editMode} onUnlock={() => setEditMode(true)} onLock={() => setEditMode(false)} />
    </>
  )
}
```

- [ ] **Step 2: Replace app/page.tsx**

```typescript
// app/page.tsx
import { getSupabaseServer } from '@/lib/supabase-server'
import * as db from '@/lib/db'
import { getEditMode } from '@/app/actions'
import HomePage from '@/components/HomePage'

export default async function Page() {
  const supabase = getSupabaseServer()
  const [content, days, packing, editMode] = await Promise.all([
    db.getSiteContent(supabase),
    db.getScheduleDays(supabase),
    db.getPackingItems(supabase),
    getEditMode(),
  ])

  return (
    <HomePage
      initialContent={content}
      initialDays={days}
      initialPacking={packing}
      initialEditMode={editMode}
    />
  )
}
```

- [ ] **Step 3: Remove any leftover generated files referencing the old starter page**

```bash
rm -f app/page.module.css
```

- [ ] **Step 4: Run the full test suite**

```bash
npm run test:run
```

Expected: all tests still PASS (this task adds no new tests, but must not break existing ones).

- [ ] **Step 5: Manual verification in the browser**

```bash
npm run dev
```

Open http://localhost:3000 and check:
- Page renders read-only, matching the Artifact's look (hero gradient, 5 days, packing list, footer)
- Click the 🔒 button bottom-right → wrong password shows "Fel lösenord" → correct password (`Kristoffer123`) unlocks edit mode
- Click any text (hero title, a day name, an entry time/title/note, a packing row) → it becomes editable, blur saves it
- Reload the page → the edit persists
- "+ Lägg till dag" / "+ Lägg till punkt" / "+ Lägg till rad" add new rows; the 🗑 buttons remove them (with confirmation) and the removal persists after reload
- "Avsluta redigering" returns to the read-only view

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx components/HomePage.tsx
git rm --cached app/page.module.css 2>/dev/null || true
git commit -m "feat: assemble HomePage and wire up the server-rendered page"
```

---

## Task 15: Verify assets

**Files:**
- Verify: `public/logo.png`, `public/hamn-senja.jpg`

- [ ] **Step 1: Confirm the assets extracted during spec work are present**

```bash
ls -la public/
```

Expected: `logo.png` (~23KB) and `hamn-senja.jpg` (~343KB) are both present (already extracted from the Artifact and committed in the spec commit). If missing, they need to be re-extracted from the Artifact before deploying.

- [ ] **Step 2: Visually confirm in the running dev server**

With `npm run dev` running, confirm the logo renders white-on-gradient in the hero and footer, and the Hamn i Senja photo renders under Thursday's "Ankomst / incheckning" entry.

No commit needed — assets were already committed with the spec.

---

## Task 16: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

Create a new repo at github.com (e.g. `qbox-senja-website`), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/qbox-senja-website.git
git push -u origin main
```

- [ ] **Step 2: Create Vercel project**

Go to https://vercel.com/new → Import the GitHub repo. Framework: **Next.js** (auto-detected). Do not deploy yet — add environment variables first (next step), then deploy.

- [ ] **Step 3: Add environment variables in Vercel**

In the Vercel project's "Configure Project" step (or Settings → Environment Variables after creation), add:
```
SUPABASE_URL = https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJ...
ADMIN_PASSWORD = Kristoffer123
SESSION_SECRET = <the value generated in Task 3>
```

Click Deploy.

- [ ] **Step 4: Verify the live site**

Open the Vercel deployment URL (e.g. `qbox-senja.vercel.app`) and repeat the checks from Task 14 Step 5 against the live URL:
- Public view matches the Artifact
- Lock/unlock with the password works
- Editing, adding, and removing rows persists after reload
- "Avsluta redigering" returns to read-only

- [ ] **Step 5: Update project memory with the live URL**

Once verified, tell Frida the live URL so it can be saved to the `project_qbox_senja` memory note in place of (or alongside) the old Artifact link.

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Real deployed site on a Vercel subdomain | Task 16 |
| Public view pixel-identical to the Artifact | Task 2 |
| Shared password (`Kristoffer123`), never in client code | Task 5, Task 7 |
| Signed cookie, ~12h session, no user accounts | Task 5, Task 7 |
| Inline click-to-edit for all text | Task 8, Tasks 10–13 |
| Add/remove schedule days | Task 11 |
| Add/remove schedule entries (incl. breakout photo caption) | Task 11 |
| Add/remove packing list rows | Task 12 |
| Content persisted in Supabase, not just the browser | Task 3, Task 4, Task 6, Task 7 |
| Wrong password shows inline error, no lockout | Task 9 |
| Failed save doesn't clear the field's local text | Task 8 (draft state stays local until a successful `onSave`) |
| Delete confirmation before removing a row | Task 11, Task 12 |
| Existing schedule + packing content migrated verbatim | Task 3 (seed data) |
| Nahla's site used only as a reference, not for look/content | N/A — no Nahla code reused; own CSS ported from the Artifact (Task 2) |
