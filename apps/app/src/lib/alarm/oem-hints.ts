/**
 * Hint OEM per l'ottimizzazione batteria (§S4-3, §S4-5).
 *
 * Su Android, alcuni OEM (Xiaomi/MIUI, Samsung/One UI, Huawei/EMUI,
 * Oppo/ColorOS) uccidono le app in background aggressivamente → la sveglia
 * WBTB può NON suonare. Non possiamo rilevare l'OEM a runtime in modo affidabile
 * dal web/nativo senza fingerprinting invasivo, quindi forniamo una MAPPA di
 * hint testuali (con deep-link agli intent dove noti) che la UI mostra
 * on-demand. Limitazione onesta: i deep-link cambiano tra versioni ROM.
 *
 * Fonti: documentazione Capacitor community, issue tracker dei vendor.
 * NON pretendiamo che funzionino ovunque — copy onesto.
 */
export interface OemHint {
  /** Nome vendor/ROM da mostrare. */
  vendor: string;
  /** Testo breve del problema (Italiano, onesto). */
  issue: string;
  /** Passaggi consigliati (Italiano). */
  steps: string[];
  /** Deep-link intent dove noto, o null. */
  deepLink: string | null;
}

export const OEM_HINTS: Readonly<Record<string, OemHint>> = {
  xiaomi: {
    vendor: 'Xiaomi / MIUI',
    issue:
      'MIUI può bloccare le notifiche di sveglia in background per risparmio batteria.',
    steps: [
      'Impostazioni → App → Lucid Me → Risparmio energetico → "Nessuna restrizione".',
      'Attiva "Avvio automatico" per Lucid Me.',
      'Blocca le notifiche dell\'app NON devono essere silenziate.',
    ],
    deepLink: 'android.settings.APPLICATION_DETAILS_SETTINGS',
  },
  samsung: {
    vendor: 'Samsung / One UI',
    issue:
      'One UI mette le app in stato di sospensione dopo alcuni giorni di inattività.',
    steps: [
      'Impostazioni → Manutenzione dispositivo → Batteria → Limiti uso in background.',
      'Rimuovi Lucid Me dalla lista delle app in sospensione.',
    ],
    deepLink: 'android.settings.SETTINGS',
  },
  huawei: {
    vendor: 'Huawei / EMUI',
    issue:
      'EMUI può terminare le app in background per ottimizzare la batteria.',
    steps: [
      'Impostazioni → Batteria → Avvio app → Lucid Me → gestisci manualmente.',
      'Attiva "Avvio automatico" e "Esecuzione in background".',
    ],
    deepLink: 'android.settings.SETTINGS',
  },
  oppo: {
    vendor: 'Oppo / ColorOS',
    issue:
      'ColorOS ha un "App Freeze" che congela le app poco usate, bloccando le sveglie.',
    steps: [
      'Impostazioni → Batteria → Ultilizzo app in background → Lucid Me.',
      'Disattiva il congelamento automatico per Lucid Me.',
    ],
    deepLink: 'android.settings.SETTINGS',
  },
};

/** Hint per vendor key (case-insensitive), o null. */
export function getOemHint(vendorKey: string): OemHint | null {
  const k = vendorKey.toLowerCase();
  return OEM_HINTS[k] ?? null;
}
