# `@lucidme/generative` — benchmark FPS

Questo file traccia le misurazioni FPS del motore generativo su device reali.

## Stato

**Differito a S1-4 (Performance su device reale).** Lo step S1-4 crea la route
dev `apps/app/src/routes/dev/bench/+page.svelte` con 12 organismi animati + FPS
counter, e popola la tabella qui sotto dopo i test su hardware reale.

Il bench NON va eseguito in CI (è manuale, su telefono). La soglia di accettazione
è **≥ 55 FPS**; sotto, si seguono in ordine gli interventi prescritti dal ticket
S1-4 (pre-render aura, cap DPR a 2, ridurre petali su size<30) e, se ancora
insufficiente, si apre una `question` al PM (WebGL non si decide in autonomia).

## Tabella FPS (da compilare in S1-4)

| Device                | OS         | FPS (12 org.) | Interventi applicati | Note |
| --------------------- | ---------- | ------------- | -------------------- | ---- |
| _(Android fascia bassa, es. Moto G / 4GB)_ | _todo_ | _todo_ | — | baseline |
| _iPhone più vecchio disponibile_           | _todo_ | _todo_ | — | baseline |

## Cosa NON fare

- Non misurare su emulatori (i numeri non sono rappresentativi del thermal/GPU).
- Non aggiungere ottimizzazioni speculative prima della soglia < 55 FPS.
