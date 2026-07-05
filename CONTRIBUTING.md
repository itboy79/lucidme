# Contribuire a Lucid Me

Regole d'ingaggio copiate da `../wiki-os/roadmap/README.md` — **valgono per tutti i ticket**.

## Ambiente

- Node 22 LTS, **pnpm 9** (mai npm/yarn), TypeScript 5.x `strict: true`.
- Versioni bloccate in `.tool-versions` e `.nvmrc`; lockfile SEMPRE committato.

## Setup

```bash
pnpm install
pnpm build && pnpm test && pnpm typecheck && pnpm lint   # devono essere verdi
```

## Git

- Branch: `feat/S<step>-<ticket>-slug` (es. `feat/S2-3-alba-form`).
- Commit convenzionali: `feat:`, `fix:`, `chore:`, `test:`, `docs:`.
- PR piccole (< 400 righe diff netto). 1 ticket = 1 PR salvo dove indicato.
- Ogni PR deve avere:
  - descrizione con ticket ID (es. `S2-3`),
  - screenshot/video se tocca UI,
  - checklist DoD del ticket **copiata e spuntata**.

## Definition of Done globale (si somma a quella del ticket)

1. `pnpm lint && pnpm typecheck && pnpm test` verdi in CI;
2. coverage `packages/core` e `packages/db` ≥ 90% (gate `scripts/check-coverage.mjs`);
3. zero `any`, zero `@ts-ignore` senza commento `// APPROVED-BY-PM: <motivo>`;
4. **nessun testo di sogni in log/analytics/Sentry** (regola wiki §8.5.4 — revisione manuale in PR; lo scrub è in `packages/core/src/privacy/scrub-fields.ts`);
5. stringhe UI in `packages/ui/src/i18n/it.ts` (mai hardcoded nei componenti).

## "Non agire in autonomia"

Se un ticket non specifica un comportamento (edge case, colore, copy), **non inventarlo**:
apri issue con label `question` e blocca il ticket. È previsto e preferibile a una scelta
inventata. Stessa cosa per una nuova dipendenza: issue `dep-request` con nome, licenza, peso gz,
alternativa considerata.

## Sicurezza & privacy

- Contenuto sogni: **mai** in log, analytics, Sentry, breadcrumb. Lo scrub Sentry è in
  `apps/app/src/hooks.client.ts`; se aggiungi un client analitico, fallo passare per lo stesso scrub.
- Modifica al package `db`: ogni PR richiede test di crash-recovery (regola §8.5.2).
- Modifica al `tokens.css`/palette: la fonte di verità è `../prototipo/lucidme-prototype-organico-generativo.html`
  (D-007). Non "migliorare" varianti — semmai apri una issue.
