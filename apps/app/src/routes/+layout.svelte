<!--
  Layout radice — monta Nav (5 sezioni) in basso, Starfield di sfondo,
  transizioni `<slot>` con fade opacity (.8s ease standard del prototipo).
  La sezione attiva è derivata dall'URL ($app/stores page.url.pathname).
-->
<script lang="ts">
  import '../styles/tokens.css';
  import { page } from '$app/stores';
  import { goto } from '$lib/navigation';
  import { Nav, Toast, t, googleFontsHref } from '@lucidme/ui';
  import Starfield from '$lib/components/Starfield.svelte';
  import FeedbackButton from '$lib/components/FeedbackButton.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte.js';
  import { onboardingStore } from '$lib/stores/onboarding.svelte.js';
  import { startNightModeEffect } from '$lib/night/mode.js';
  import { track } from '$lib/analytics/index.js';

  let { children } = $props();

  // Le 5 sezioni — id corrisponde al path segment sotto (app)/.
  const items = [
    { id: 'giardino', label: t('nav.giardino'), icon: 'giardino' },
    { id: 'sentiero', label: t('nav.sentiero'), icon: 'sentiero' },
    { id: 'alba', label: t('nav.alba'), icon: 'alba' },
    { id: 'notte', label: t('nav.notte'), icon: 'notte' },
    { id: 'lume', label: t('nav.lume'), icon: 'lume' },
  ] as const;

  // Sezione attiva derivata dal pathname (es. "/giardino" → "giardino").
  const active = $derived.by(() => {
    const seg = $page.url.pathname.split('/').filter(Boolean)[0] ?? 'giardino';
    return seg;
  });

  // True se ci troviamo sulla route di onboarding (fullscreen, senza Nav).
  const onOnboarding = $derived($page.url.pathname === '/onboarding');

  function handleSelect(id: string): void {
    goto(`/${id}`);
  }

  // Carica le impostazioni sonno + avvia l'effetto modalità notte (§S4-1).
  // Ricalcola data-night ogni 60s in base all'ora-sonno/sveglia impostata.
  $effect(() => {
    void settingsStore.ensureLoaded();
    const stop = startNightModeEffect();
    return stop;
  });

  // ---- Root guard (onboarding primo avvio, S8-2) ----
  // Client-side only (ssr=false ovunque, ma qui siamo sicuri). Aspettiamo che
  // il flag di completamento sia stato letto dal DB, poi:
  //  - se NON completato E la rotta non è /onboarding → /onboarding
  //  - se completato E la rotta è /onboarding → /giardino
  // Usiamo un guard reattivo: quando `completed`/`onOnboarding` cambiano
  // (es. dopo markCompleted o dopo il load async), rivaluta.
  $effect(() => {
    // tocca le dipendenze reattive.
    const completed = onboardingStore.completed;
    const isOnb = onOnboarding;
    // Le route /dev/* sono esentate (diagnostiche, utili anche pre-onboarding).
    const isDev = $page.url.pathname.startsWith('/dev');
    if (!onboardingStore.loaded) return;
    if (!completed && !isOnb && !isDev) {
      void goto('/onboarding');
    } else if (completed && isOnb) {
      void goto('/giardino');
    }
  });

  // Avvia la lettura del flag di onboarding al primo render.
  $effect(() => {
    void onboardingStore.ensureLoaded();
  });

  // Evento anonimo di apertura app (S8-3): il layout radice monta una sola
  // volta per sessione. No-op finché l'utente non attiva le statistiche.
  $effect(() => {
    void track('app_opened');
  });
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href={googleFontsHref} rel="stylesheet" />
</svelte:head>

<div class="stage">
  <Starfield />

  <!-- Schermo attivo: transizione opacity fade tra route. -->
  <main class="screen active">
    {@render children?.()}
  </main>

  {#if !onOnboarding}
    <Nav {items} active={active} onselect={handleSelect} />
  {/if}
  <!-- Feedback in-app: visibile SOLO nelle build beta (PUBLIC_BETA=true, S9-2). -->
  <FeedbackButton />
  <Toast />
</div>

<style>
  .stage {
    position: relative;
    min-height: 100dvh;
    overflow: hidden;
    background: var(--lm-stage-bg, radial-gradient(120% 90% at 50% -10%, var(--lm-bg2) 0%, var(--lm-bg1) 45%, var(--lm-bg0) 100%));
  }
  /* `.screen` del prototipo: padding 58px 26px 130px, opacity transition. */
  .screen {
    position: relative;
    z-index: 1;
    padding: 58px 26px 130px;
    overflow-y: auto;
    scrollbar-width: none;
    animation: fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .screen::-webkit-scrollbar {
    display: none;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
