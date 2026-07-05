# native/ — shell Capacitor 6

**Stato Step 0:** scaffold config pronto. Build iOS/Android e TestFlight differiti (richiedono device fisici + account Apple/Google dev — vedi risposta utente).

## Setup (quando si parte con le build)

```bash
# 1. assicurarsi che apps/app abbia un build aggiornato
pnpm native:sync        # = pnpm --filter @lucidme/app build && cap sync

# 2. aggiungere le piattaforme (una tantum)
pnpm --filter @lucidme/native add:ios
pnpm --filter @lucidme/native add:android

# 3. aprire negli IDE
pnpm native:ios         # Xcode
pnpm native:android     # Android Studio
```

## Plugin installati (SOLO questi, regola S0-4)

- `@capacitor/local-notifications` — sveglie WBTB (Step 4)
- `@capacitor/haptics` — vibrazione cue (Step 4)
- `@capacitor/filesystem` — backup locale cifrato (Step 7)
- `@capacitor/app` — lifecycle (foreground/background)

Nessun altro plugin senza issue `dep-request` approvata dal PM.

## appId provvisorio

`me.lucid.app.dev` — **NON cambiare**. Quello definitivo è bloccato da D-008 (naming). Cambiare l'appId a posteriori invalida i database locali dei device già installati → va fatto una volta sola, prima del lancio (Step 8).
