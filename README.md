# Lucid Me

> Coach scientifico per la pratica e il tracciamento dei sogni lucidi. Monorepo (fase: Step 0 — fondamenta).

Spec & roadmap in `../wiki-os/` (README, decision log, product design, piano di sviluppo, roadmap step-per-step). **Quel documento è la fonte di verità.** Questo repo è l'esecuzione.

## Stack

- **Node 22 LTS + pnpm 9** (lockfile committato; `.tool-versions`/`.nvmrc` vincolano le versioni)
- **Monorepo pnpm workspaces + Turborepo**
- **UI:** SvelteKit + TypeScript, PWA via `vite-plugin-pwa`, shell native Capacitor 6
- **Packages:** `@lucidme/core` (dominio puro), `@lucidme/db` (SQLite/repository), `@lucidme/ui` (design system), `@lucidme/generative` (motore organismi)
- **Quality:** Vitest + Playwright + ESLint strict + Prettier + Sentry (con scrub del contenuto sogni)

## Comandi

```bash
pnpm install              # una tantum
pnpm dev                  # avvia apps/app in dev (parallel)
pnpm build                # build di tutti i package
pnpm test                 # vitest su tutti
pnpm typecheck            # tsc --noEmit ovunque
pnpm lint                 # eslint
pnpm --filter @lucidme/app preview   # preview build (lo usa Playwright)
pnpm --filter @lucidme/e2e test      # e2e Playwright
pnpm native:sync          # build app + cap sync (richiede piattaforme aggiunte)
```

## Struttura

```
lucidme/
├── apps/
│   ├── app/        # SvelteKit PWA (core prodotto)
│   └── site/       # landing/coming soon
├── packages/
│   ├── core/       # dominio (entities, use-case, zero UI/DB)
│   ├── generative/ # motore organismi (seed → render)
│   ├── ui/         # design system (token, componenti, i18n)
│   └── db/         # SQLite, migrazioni, repository
├── native/         # Capacitor 6 (config + plugin; iOS/Android generati dopo cap add)
├── e2e/            # Playwright
├── scripts/        # check-coverage, regen-icons
└── .github/        # CI workflows
```

## Stato

- **Step 0:** ✅ in corso (questo commit)
- **Step 1:** ⛔ sbloccato (D-007 = Organico Generativo)
- Vedi `../wiki-os/roadmap/README.md` per lo stato avanzamento step.

Vedi [`CONTRIBUTING.md`](./CONTRIBUTING.md) per branch/PR/regole di ingaggio.
