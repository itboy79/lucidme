# Vigilia

> Diario dei sogni lucidi — local-first, privacy-first, basato sull'evidenza.
> PWA (SvelteKit) + shell native Capacitor. *Nome di lavoro: "Vigilia" (D-008 pending).*

Spec & roadmap in `../wiki-os/` — **quella è la fonte di verità**; questo repo è l'esecuzione.
Per "cosa manca per il lancio": [`../wiki-os/09-chiusura-progetto.md`](../wiki-os/09-chiusura-progetto.md).

## Stack

- **Node 22 LTS + pnpm 9** (lockfile committato; `.tool-versions`/`.nvmrc` vincolano le versioni)
- **Monorepo pnpm workspaces + Turborepo**
- **UI:** SvelteKit 2 + Svelte 5 (runes) + TypeScript strict, PWA via `vite-plugin-pwa`, shell native Capacitor 6
- **Storage:** SQLite WASM (OPFS/kvvfs, fallback InMemoryDB) con FTS5 — local-first, zero cloud in v1 (D-009)
- **Packages:** `@lucidme/core` (dominio puro + entitlements), `@lucidme/db` (migrazioni/repository/export), `@lucidme/ui` (design system "Organico Generativo" + i18n it), `@lucidme/generative` (motore organismi deterministico), `@lucidme/content` (21+2 lezioni validate)
- **Quality:** Vitest (coverage gate) + Playwright + ESLint strict + Sentry (scrub del contenuto sogni)

## Comandi

```bash
pnpm install              # una tantum
pnpm dev                  # avvia apps/app in dev (parallel)
pnpm build                # build di tutti i package
pnpm test                 # vitest su tutti (321)
pnpm typecheck            # tsc --noEmit / svelte-check ovunque
pnpm lint                 # eslint
node scripts/check-coverage.mjs        # gate coverage (core, db)
pnpm --filter @lucidme/app preview     # preview build (lo usa Playwright)
cd e2e && npx playwright test          # e2e su build preview (16)
pnpm native:sync          # build app + cap sync (richiede piattaforme aggiunte)
```

Env: vedi `.env.example`. Chiavi pubbliche: `PUBLIC_POSTHOG_KEY` (analytics
**opt-in, default OFF** — D-010; posthog-js lazy-loaded solo con chiave),
`PUBLIC_BETA` + `PUBLIC_FEEDBACK_ENDPOINT` (bottone feedback beta),
`PUBLIC_WAITLIST_ENDPOINT` (landing).

## Struttura

```
lucidme/
├── apps/
│   ├── app/        # la PWA — 5 sezioni: giardino, sentiero, alba, notte, lume
│   └── site/       # landing marketing + waitlist beta (statica, vite vanilla)
├── packages/
│   ├── core/       # dominio puro: Dream, metriche, entitlements, privacy scrub
│   ├── generative/ # motore organismi (PRNG deterministico → canvas/SVG)
│   ├── ui/         # design system: token, componenti, i18n it
│   ├── db/         # SQLite: migrazioni 001-005, repository, backup/export
│   └── content/    # lezioni Sentiero (markdown → bundle validato vs fonti)
├── native/         # Capacitor 6 (config + plugin; iOS/Android generati dopo cap add)
├── e2e/            # Playwright (smoke + flows) + store-shots.mjs (screenshot store)
├── scripts/        # check-coverage
└── .github/        # CI workflows
```

Regole architetturali: `core` non importa da UI/DB; ogni scrittura passa dal
repository locale; **nessun contenuto di sogni** in log/analytics/crash (scrub attivo).

## Stato (2026-09-17)

- Step 0–6 ✅ · bug bash UX ✅ · **Step 8 code-complete** ✅ (paywall con billing
  stub — RevenueCat reale ~1gg dopo l'account, onboarding 4 slide + noRecall,
  analytics opt-in) · S9-2 feedback beta ✅ · D-009 = sync post-lancio
- **Bloccato solo su PM**: naming (D-008), account esterni (Apple/Google/
  RevenueCat/Vercel/Sentry/PostHog), screenshot definitivi, beta, matrice sveglia
- Stato avanzamento step: `../wiki-os/roadmap/README.md`

Vedi [`CONTRIBUTING.md`](./CONTRIBUTING.md) per branch/PR/regole di ingaggio.
