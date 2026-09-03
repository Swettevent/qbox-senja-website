# Qbox Senja — schemasajt med inline-redigering

**Datum:** 2026-09-03
**Status:** Godkänd av Frida, redo för implementationsplan

## Bakgrund

Qbox konferensresa Stockholm → Senja (Norge), 16–20 september. Schemat
finns idag som en statisk Claude Artifact
(`https://claude.ai/code/artifact/bb420edd-57df-4443-af5f-68d090f76af9`).
Frida vill lansera den som en riktig, deployad sajt där hon själv kan
redigera allt textinnehåll (schema, packlista, hero-text) utan att gå
via Claude — skyddat av ett enkelt lösenord.

Utseendet (färger, typsnitt, layout) ska vara **exakt som den
nuvarande Artifact-sidan** — ingen omdesign. Nahla Bells sajt
(`~/nahla-bell-website/`) är enbart referens för *hur man bygger
redigeringsmekaniken* (t.ex. server actions mot Supabase), inte för
utseende eller innehåll.

## Mål

- Riktig, deployad sajt (inte en Claude Artifact) på en Vercel-subdomän.
- Publik vy: pixel-lik kopia av dagens Artifact-design.
- Redigeringsläge: lås upp med ett delat lösenord (`Kristoffer123`),
  redigera text direkt på sidan (klicka på ett fält → ändra → sparas),
  lägg till/ta bort hela dagar, schemapunkter och packlisterader.
- Ändringar ska bestå (lagras i databas, inte bara i webbläsaren).

## Icke-mål

- Inga användarkonton eller flera behörighetsnivåer (ett delat lösenord räcker).
- Ingen omdesign eller nytt innehåll utöver det som redan finns i Artifact-sidan.
- Inget eget domännamn i denna omgång (Vercel-subdomän räcker).
- Ingen bildhantering i redigeringsläget (byte av foto/logga) — endast text och rad-struktur.

## Teknikval

Samma stack som Nahla Bells sajt:

- **Next.js 15** (App Router), TypeScript
- **Tailwind CSS** — eller ren CSS portad direkt från Artifact-sidans `<style>`-block (se Öppna frågor). Layouten är redan färdig CSS, så vi portar den rakt av snarare än att bygga om i Tailwind-klasser.
- **Supabase** (Postgres) — lagrar allt redigerbart innehåll
- **Vercel** — hosting, deploy från GitHub, gratis-subdomän (t.ex. `qbox-senja.vercel.app`)

## Datamodell (Supabase)

```sql
-- Fritextfält (hero, intro, footer, m.m.)
create table site_content (
  key text primary key,        -- t.ex. 'hero_eyebrow', 'hero_title', 'hero_dates', 'intro_text'
  value text not null,
  sort_order int not null default 0
);

-- En rad per schemadag
create table schedule_days (
  id uuid primary key default gen_random_uuid(),
  day_name text not null,      -- "Onsdag 16 september"
  day_tag text,                -- "Alternativ 1" (nullable)
  accent text not null default 'rose', -- rose | violet | teal
  sort_order int not null
);

-- En rad per punkt inom en dag
create table schedule_entries (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references schedule_days(id) on delete cascade,
  time_label text not null,    -- "18.12" eller "17.30–19.30"
  title text not null,
  note text,                   -- nullable
  photo_url text,              -- nullable, för brytfotot under torsdagens incheckning
  photo_caption text,
  sort_order int not null
);

-- Packlisterader, två sektioner via `section`
create table packing_items (
  id uuid primary key default gen_random_uuid(),
  section text not null,       -- 'general' | 'activities'
  text text not null,
  sort_order int not null
);
```

Ingen `updated_at`/versionering — låg risk, en kund, enkel sajt.

## Befintligt innehåll (migreras rakt av)

**Hero:**
- Eyebrow: "Konferensresa"
- Titel: "Senja"
- Datum: "16–20 september"
- Rutt: Stockholm · Boden · Narvik · Senja · Tromsø · Stockholm
- Logga: `public/logo.png` (redan extraherad ur Artifact-sidan)

**Intro:** "Tåg norrut, boende vid havet på Senja och två dagar fyllda av konferens, fjäll och fiske innan resan går tillbaka via Tromsø. Här är hela schemat, dag för dag."

**Schema (5 dagar):**
1. **Onsdag 16 september** (rose) — Tåg från Stockholm 18.12
2. **Torsdag 17 september** (violet) — Ankomst Boden 05.42, avgång Boden 06.01, ankomst Narvik 12.36, upphämtning Narvik 12.36, ankomst/incheckning 16.30, [foto: Hamn i Senja, `public/hamn-senja.jpg`], vandring 17.30–19.30, 3-rätters middag 20.00
3. **Fredag 18 september** (teal) — Frukost 07.30–09.00, Konferens 09.00–11.00, Båttur & lunch 11.00–13.00, Fisketur 13.00–16.00, 3-rätters middag 19.00
4. **Lördag 19 september** (rose) — Frukost 07.30–09.00, Båttransport till Skaland 09.00–09.30, Fjälltur till Husfjellet 10.00–14.00, Båttransport till Færøya 14.30–15.00, Sen lunch på Færøya 15.30–17.00, Båttransport tillbaka 17.00–17.30, Jacuzzi/bastu 18.00–19.30, 3-rätters middag 20.00
5. **Söndag 20 september** ("Alternativ 1", violet) — Frukost 07.30–10.00, Buss till Finnsnes 10.00–11.00, Hurtigruten Finnsnes–Tromsø 11.30–14.15, Lunch & konferens ombord 12.00–13.30, Buss till flygplatsen 14.30–15.00, Flyg avgår Tromsø 17.25, Anländer Arlanda 21.00

(Fullständiga titlar/notetexter finns i den nuvarande Artifact-koden och portas ordagrant vid implementation.)

**Packlista:**
- Allmänt: Bekväma kläder för tågresa (tofflor rekommenderas); Kläder till konferenstid och middagarna; Dator
- Till aktiviteterna: Kläder och skor för vandring (vind-/regnjacka rekommenderas); Mössa och handskar; Lånad overall till fisket; Badkläder

**Footer:** Logga + "Senja · 16–20 september"

## Redigeringsflöde

1. Ett låsikon-element (t.ex. hörnet av headern) öppnar en liten
   lösenordsprompt.
2. Lösenordet skickas till en Server Action / Route Handler som
   jämför mot miljövariabeln `ADMIN_PASSWORD` (`Kristoffer123`,
   aldrig i klientkoden).
3. Vid rätt lösenord: sätts en signerad, httpOnly-cookie
   (`qbox_edit_session`) med ~12 timmars giltighet.
4. Server Component läser cookien och avgör om sidan renderas i
   redigeringsläge. I redigeringsläge:
   - Alla textfält (hero, dagnamn, tider, titlar, notes, packlisterader) blir klickbara → inline-textfält, sparas via Server Action med optimistisk uppdatering + `revalidatePath`.
   - "+ Lägg till dag" / "+ Lägg till punkt" / "+ Lägg till packlisterad" -knappar.
   - Papperskorgs-ikon per rad/dag/punkt för borttagning (med enkel bekräftelse).
   - En synlig "Avsluta redigering"-knapp som rensar cookien.
5. Utan giltig cookie: sidan renderas helt skrivskyddad, identisk med dagens Artifact-utseende.

## Felhantering

- Fel lösenord → inline-felmeddelande under prompten, ingen låsning/rate-limit (låg risk, en användare).
- Misslyckad sparning (nätverksfel etc.) → felmeddelande vid fältet, fältets text återgår inte automatiskt (behåller det du skrev så du kan försöka spara igen).
- Borttagning av rad/dag → enkel bekräftelsedialog innan den faktiskt tas bort ur databasen.

## Test

Manuell verifiering i webbläsaren innan sajten rapporteras klar:
- Publik vy matchar nuvarande Artifact-design (visuell jämförelse).
- Lås upp med rätt lösenord → redigeringsläge aktiveras.
- Fel lösenord → felmeddelande, ingen åtkomst.
- Redigera ett textfält → ladda om sidan → ändringen kvarstår.
- Lägg till en dag/punkt/packlisterad → syns direkt och kvarstår efter omladdning.
- Ta bort en rad → försvinner och kvarstår efter omladdning.
- Avsluta redigering → sidan går tillbaka till skrivskyddat läge.

## Öppna frågor (löses vid implementation, låg risk)

- **CSS-strategi:** porta Artifact-sidans `<style>`-block rakt av som global CSS (snabbast, garanterat identiskt utseende) snarare än att bygga om i Tailwind-utility-klasser. Tailwind används ändå för ev. nya UI-element i redigeringsläget (knappar, prompt-modal).
