# Performance audit — `@lucidme/app`

> Data measured on the production build (`pnpm --filter @lucidme/app build`) on
> **2026-07-05**. App is SPA mode (`ssr = false`, SvelteKit + adapter-static), so
> the **client** bundle is what matters; server output is irrelevant at runtime.
>
> Budgets (from `wiki/08-piano-sviluppo.md` §8.5.3):
> - **TTI < 2 s** on Moto G-class device.
> - **Initial bundle < 200 KB gz** (excluding web fonts).
> - **Canvas ≤ 8 ms / frame** (generative render).

## TL;DR

| Metric | Budget | Measured | Status |
|---|---|---|---|
| Initial bundle (gz) | < 200 KB | **~54 KB gz** (26 chunks) | ✅ comfortable, 27% of budget |
| sqlite-wasm + glue in initial | must be lazy | **lazy** (0 references in `index.html`) | ✅ verified |
| Canvas per-frame | ≤ 8 ms | deferred (S1-4 device bench) | ⏳ not measurable here |
| TTI on Moto G | < 2 s | ~0.9–1.4 s (estimate) | ✅ likely within budget |

The app is **well within the 200 KB budget** at initial load. The heavy pieces
(SQLite WASM ~865 KB, the 21-day Sentiero content, Sentry/web-vitals tracing) are
all code-split and load lazily.

## Bundle sizes — top 10 chunks

Measured on `build/_app/immutable/**`. `raw` = minified JS bytes, `gz` = gzip.
"Initial" = referenced from `build/index.html` modulepreload (`load` chunk of the
entry); "lazy" = dynamic import / route chunk / web-worker asset.

| # | Chunk | raw | ~gz | Load | What it is |
|---|---|---:|---:|---|---|
| 1 | `chunks/BKN8ax1t.js` | 216 KB | 66 KB | **lazy** | wa-sqlite worker glue (`sqlite3Worker1Promiser`) — DB layer |
| 2 | `chunks/DRpbV3Gy.js` | 116 KB | 40 KB | **lazy** | Sentry browser + `web-vitals` (CLS/FID/LCP/INP/TTFB tracing) |
| 3 | `nodes/8.*.js` | 53 KB | 19 KB | **lazy** (route) | Sentiero — the 21-day lesson content (Markdown bodies inlined) |
| 4 | `chunks/DukX6lPQ.js` | 28 KB | 11 KB | **initial** | SvelteKit router/internal (CSS loader + `start`) |
| 5 | `chunks/C7ql4nD7.js` | 26 KB | 10 KB | **initial** | Svelte runtime + shared UI primitives |
| 6 | `chunks/B6GMQT_m.js` | 13 KB | 4.6 KB | **initial** | small shared chunk |
| 7 | `chunks/CyjckyRD.js` | 13 KB | 6.0 KB | **initial** | small shared chunk |
| 8 | `nodes/4.*.js` | 12 KB | 4.8 KB | lazy (route) | one of the (app) section routes |
| 9 | `nodes/7.*.js` | 12 KB | 4.2 KB | lazy (route) | one of the (app) section routes |
| 10 | `nodes/6.*.js` | 11 KB | 4.8 KB | lazy (route) | one of the (app) section routes |

**WASM asset (not JS, separate request):**
- `assets/sqlite3.*.wasm` — **865 KB raw** (~320–350 KB gz with brotli, ~410 KB with gzip). **Lazy.** Loaded by the wa-sqlite worker, requested only when the DB layer initializes.

### Total JS on the client
- Sum of all client JS chunks: **~818 KB raw** (everything the PWA could ever load across all routes).
- The service worker (`sw.js` + `workbox-*.js`, 15 KB) precaches the shell + static assets; it is not part of the JS execution budget.

## Initial bundle — detailed breakdown

The initial bundle is everything `index.html` asks for via modulepreload before the
first route renders. Computed by summing every chunk referenced in `index.html`:

| | raw | ~gz |
|---|---:|---:|
| **Initial entry + shared chunks** (26 files) | **129 KB** | **54 KB** |

Largest initial contributors:
- `DukX6lPQ` (router/start) — 28 KB raw / 11 KB gz
- `C7ql4nD7` (Svelte runtime + UI) — 26 KB raw / 10 KB gz
- `B6GMQT_m` + `CyjckyRD` (shared) — ~13 KB raw each
- `app.*` entry — 8.4 KB raw / 3.5 KB gz
- The rest are < 4 KB each.

**vs 200 KB budget:** 54 KB gz is **27% of budget** — ~146 KB of headroom. Fonts are
excluded by rule (see *Font loading*). Nothing currently pushes the initial bundle
over; the heaviest real dependencies (SQLite, Sentry tracing, Sentiero content) are
all correctly split out.

### sqlite-wasm laziness — verified ✅

`index.html` does **not** reference `sqlite3.*.wasm` nor the glue chunk `BKN8ax1t`
(0 matches). The wasm is fetched on demand by the worker in
`chunks/BKN8ax1t.js` (`sqlite3Worker1Promiser`), which is itself only imported when
the DB layer initializes. So the ~865 KB wasm + 216 KB glue never block first paint.

## TTI estimate

TTI on a Moto G-class device is dominated by: parse+eval of the initial JS, plus the
Google Fonts stylesheet, plus first route hydrate.

Assumptions (typical Moto G / Snapdragon 6-class, mid-tier mobile CPU, 4G):
- Initial JS ~54 KB gz → ~129 KB decompressed → ~150–250 ms parse+eval on a mid CPU.
- Font CSS + first paint: ~150–300 ms.
- First route (Giardino) hydrate + first DB read: the DB layer is lazy, so the very
  first render is shell + empty state; DB loads async.

**Rough estimate: 0.9–1.4 s TTI on 4G**, comfortably under the 2 s budget. On slow 3G
or a cold cache this stretches; the SW precaches the shell so subsequent loads are
near-instant. **This is an estimate, not a measurement** — real Lighthouse / on-device
profiling on a Moto G is still owed (see *Open items*).

## Canvas budget (generative renderFrame)

Target: 60 fps → **≤ 16 ms/frame total**, of which the wiki budgets **≤ 8 ms** for
the generative `render()` alone. The renderer is Canvas 2D
(`packages/generative`), deterministic per seed.

- **Status: ⏳ deferred to S1-4.** The on-device benchmark (the `dev/bench` route
  with 12 organisms + FPS counter, tested on ≤ Moto G / 4 GB RAM and an older iPhone)
  is the gate per `wiki/roadmap/step-01-design-system.md`. This audit cannot measure
  per-frame time — that needs a real device.
- **Three allowed fallback interventions** (per the wiki, if frame budget is blown):
  1. **Offscreen aura** — render the expensive glow/blur layers once to an offscreen
     canvas and composite, instead of recomputing per frame.
  2. **Cap DPR** — clamp `devicePixelRatio` (e.g. to ≤ 2) so the backing store stays
     small on high-DPI phones; huge wins on retina devices.
  3. **Reduce petals at small size** — drop filament/petal count for organisms below
     a size threshold; the seed identity is preserved, detail is not.

## Font loading

- Fonts: **Fraunces** (serif, headlines) + **Outfit** (sans, UI), served from Google
  Fonts via `<link>` in the root layout (`googleFontsHref` from `@lucidme/ui`).
- Strategy: `display=swap` (FOUT) — text renders immediately in a system fallback,
  then swaps when the webfont arrives. No invisible-text blocking.
- **Excluded from the 200 KB budget** per wiki §8.5.3 ("escluso font"). This is
  correct: fonts are streamed from a CDN, cached cross-session, and don't compete
  with app JS for the critical path budget.
- Preconnect hints to `fonts.googleapis.com` / `fonts.gstatic.com` are already in the
  layout, which trims the TLS handshake.

## Recommendations — 3 concrete next steps

These keep the initial bundle lean as features land (Step 7 sync, Step 8 paywall):

1. **Lazy-load `Lume`'s `TrendChart`.** The chart code path (and any chart lib) should
   be a dynamic import inside `/lume`, not a static import. Lume is a secondary tab;
   its trend visualization must not be in the shared/initial chunk. (Today Lume is
   already a route chunk, but verify the chart dependency doesn't get hoisted into a
   shared chunk when other routes start using it.)

2. **Gate the 21-day Sentiero content.** `nodes/8.*.js` (53 KB raw / 19 KB gz) inlines
   all lesson Markdown. Consider splitting lessons into a per-day or per-phase chunk
   (or a JSON import loaded on demand) so a first-time user opening Giardino doesn't
   eventually pull all 21 days. This is already lazy (route-scoped), so it's an
   optimization, not a budget violation.

3. **Keep Sentry tracing opt-in / DSN-gated.** `chunks/DRpbV3Gy.js` (116 KB raw /
   40 KB gz — `web-vitals` + Sentry browser tracing) is lazy today only because the
   `@sentry/sveltekit` init is dynamically imported behind `if (SENTRY_DSN)` in
   `hooks.client.ts`. **Keep it that way.** Do not add a static `import` of Sentry
   anywhere in the initial graph, or 40 KB gz jumps into the initial bundle.

## Open items / debt

- 🔲 **On-device canvas benchmark (S1-4):** measure real per-frame time on a Moto G
  and an older iPhone via the `dev/bench` route; record the number here.
- 🔲 **Real Lighthouse / TTI run** on a throttled Moto G profile; replace the estimate
  above with a measurement.
- 🔲 **Brotli precompression** is off (`precompress: false` in `svelte.config.js`).
  Enabling it would shave the wasm + JS transport size further (brotli beats gzip on
  this content by ~10–15%). Not needed for the budget today, but cheap upside.
- 🔲 **Re-run this audit** after Step 7 (sync) and Step 8 (paywall) land — those are
  the steps most likely to grow the bundle.

---

*Method: `pnpm --filter @lucidme/app build`, then `wc -c` / `gzip -c | wc -c` on
`build/_app/immutable/**`. Initial bundle = union of `modulepreload`/script paths in
`build/index.html`. Sizes are minified-output bytes; runtime memory and parse cost
are not captured by byte size alone.*
