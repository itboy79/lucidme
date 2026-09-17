# Store screenshots — spec (6.7" iPhone)

> Specification for the **6 screenshots, 6.7" iPhone (1290 × 2796 px)** required by
> App Store and Google Play. The actual artwork must be **generated from the real
> app** (deferred to design — not a code task). This file is the brief.

**Status:** 🟡 PLACEHOLDER CATTURATI (S8-4 prep, 2026-09-17). In `6.7/` e `6.1/`
trovi 6 screenshot reali dell'app per dimensione (onboarding, alba, sentiero,
notte, giardino, pro), generati con `e2e/store-shots.mjs` (preview build :4173).
Sono **placeholder onesti** — screenshot "as-is" senza headline di marketing.
Il brief qui sotto resta il target di design: sovrapporre headline/subcopy e
rigenerare con contenuto più ricco (giardino con 8-12 organismi, sentiero a
giorno 9, notte in modalità notte).

**Rigenerare i placeholder:** `pnpm --filter @lucidme/app build && pnpm --filter @lucidme/app preview &` poi `cd e2e && node store-shots.mjs`.

**Source of truth for visuals:** the design system "Organico Generativo"
(`wiki/07-product-design.md` §7.5) and the live `dev/ui` catalog route.

## Common design rules (all 6 frames)

- **Canvas:** 1290 × 2796 px (6.7" iPhone, portrait).
- **Background:** deep night gradient `#0a0a14` → indigo `#141430`, radial glow at top.
  Never pure white. Use `--lm-stage-bg`.
- **Typography:** Fraunces (serif) for headlines/ritual numbers, Outfit (sans) for
  body. Same scale as the app.
- **Headline pattern:** short eyebrow (uppercase, tracked) + serif headline with one
  italic accent word in a bioluminescent hue (cyan `#7fe7dc` / violet `#b69cff` /
  amber `#ffc98a` / pink `#ff9ec6`).
- **Shapes:** no rectangular cards. Use organic blobs / superellipses with
  asymmetric `border-radius` and the `breathe` curve. The device chrome (status bar,
  nav) is real, the content is a faithful app snapshot.
- **Tone:** calm, nocturnal, evidence-based. No exclamation marks, no "guaranteed",
  no medical imagery.
- **Accessibility:** keep contrast ≥ 4.5:1 on headline text; avoid relying on color
  alone to convey meaning.
- **Footer mark:** small "Lucid Me" wordmark + leaf glyph, bottom-center. (Subject to
  D-008 — name may change.)

## Frame-by-frame

### 1. Hero — the garden
- **Goal:** the differentiator. Show a populated dream garden (8–12 organisms,
  generated via `gardenLayout`) with varied emotions/lucidity.
- **Eyebrow:** IL TUO GIARDINO ONIRICO
- **Headline:** *Ogni sogno* fiorisce
- **Subcopy (small):** un organismo unico per ogni notte
- **Capture:** real `/giardino` with seeded fixtures (the `dev/ui` previews are the
  reference organisms).

### 2. Alba — dawn capture
- **Goal:** the capture loop. Show the Alba entry screen: emotion chips, lucidity
  picker, text area with a sample dream.
- **Eyebrow:** ALL'ALBA
- **Headline:** *Cattura* il sogno appena svegliə
- **Subcopy:** voce o testo, in un gesto
- **Capture:** real `/alba` with a half-typed sample (no real personal data).

### 3. Sentiero — the path
- **Goal:** the 21-day adaptive path. Show the Sentiero with a few completed days
  and the upcoming technique.
- **Eyebrow:** IL SENTIERO
- **Headline:** 21 giorni di *pratica*
- **Subcopy:** MILD, WBTB, SSILD, TLR — con fonti reali
- **Capture:** real `/sentiero` mid-progress (e.g. day 9).

### 4. Notte — the night ritual
- **Goal:** the wind-down. Show the Notte ritual screen with the three gestures and
  night-mode (amber, dimmed) palette.
- **Eyebrow:** LA NOTTE
- **Headline:** Tre gesti prima di *attraversare*
- **Subcopy:** intenzione · training TLR · dream sign
- **Capture:** real `/notte` in night mode (data-night active).

### 5. Lume — progress lights
- **Goal:** honest metrics. Show the Lume screen with lucidity rate trend, recall
  score, streak.
- **Eyebrow:** I LUMI DEL PROGRESSO
- **Headline:** Numeri *onesti*, sul tuo dispositivo
- **Subcopy:** frequenza · ricordo · streak
- **Capture:** real `/lume` with the TrendChart visible.

### 6. Privacy — the promise
- **Goal:** the value prop that sets us apart. Dark frame, a single organism as
  accent, a short privacy statement.
- **Eyebrow:** PRIVACY
- **Headline:** I tuoi sogni *restano tuoi*
- **Subcopy:** local-first · export sempre · niente cloud di default
- **Capture:** composed — a subtle organism + the headline. Reference the
  `/privacy` route copy. Do **not** fake settings toggles.

## Out of scope / forbidden

- ❌ Binaural-beats imagery or claims (forbidden, `wiki` §5.4).
- ❌ Medical / therapeutic framing ("therapy", "treatment", clinical imagery).
- ❌ Promises of results ("become lucid tonight", "guaranteed").
- ❌ Pure white backgrounds or harsh contrast.

## Handoff checklist (for design)

- [ ] 6 PNGs at 1290 × 2796, sRGB, no alpha.
- [ ] localize headlines IT + EN (IT for primary listing, EN for international).
- [ ] confirm organism renders match the production `render()` (same seed = same art).
- [ ] re-export if D-008 changes the app name/wordmark.
