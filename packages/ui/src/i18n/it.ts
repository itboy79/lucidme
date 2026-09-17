/**
 * i18n — copy italiano, COPIATO dal prototipo Organico Generativo.
 *
 * Oggetto piatto `{chiave: stringa}` (no nesting). Le chiavi seguono la
 * convenzione `<sezione>.<campo>`. I testi sono letterali del prototipo:
 * non vanno riscritti, solo estratti. Ogni voce ha come commento il selettore
 * di provenienza nel prototipo.
 *
 * Se una chiave manca, `t()` restituisce la chiave stessa (debug visivo).
 */

export const it = {
  // ---- Nav (riga 207-211: label moon) ----
  'nav.giardino': 'Giardino',
  'nav.sentiero': 'Sentiero',
  'nav.alba': 'Alba',
  'nav.notte': 'Notte',
  'nav.lume': 'Lume',

  // ---- Giardino (righe 118-122) ----
  'giardino.eyebrow': 'Il tuo giardino onirico',
  // h1 con placeholder {n} = numero sogni. Prototipo: "9 sogni <em>fioriti</em><br>questa luna"
  'giardino.titolo': 'sogni fioriti',
  'giardino.titolo_singolare': 'sogno Fiorito',
  'giardino.titolo_questa': 'questa luna',
  'giardino.hint': 'tocca un organismo per rivivere il sogno',

  // ---- Sentiero (righe 126-136) ----
  'sentiero.eyebrow': 'Sentiero · giorno 8 di 21',
  'sentiero.titolo_pre': 'Fase II',
  'sentiero.titolo_em': 'Reality testing',
  'sentiero.oggi_t': 'Oggi: il check delle mani',
  'sentiero.oggi_d':
    'Durante il giorno, ogni volta che vedi le tue mani, chiediti davvero: «sto sognando?». Guarda le dita, contale. Nel sogno appariranno distorte — e lo saprai.',
  'sentiero.fonte': 'Fonte: LaBerge, Exploring the World of Lucid Dreaming, cap. 3',
  'sentiero.start_btn': 'Inizia la pratica · 6 min',
  // tag fase nel path SVG (riga 368)
  'sentiero.fase.fondamenta': 'fondamenta',
  'sentiero.fase.reality_testing': 'reality testing',
  'sentiero.fase.mild_tlr': 'MILD → TLR',

  // ---- Sentiero — copy dinamica Step 3 (S3-3/S3-4) ----
  // eyebrow con placeholder {n}: "Sentiero · giorno {n} di 21"
  'sentiero.eyebrow_giorno': 'Sentiero · giorno {n} di 21',
  // h1 della fase corrente (placeholder {fase} = nome fase)
  'sentiero.h1_pre': 'Sentiero',
  'sentiero.h1_em': 'fase {fase}',
  // CTA del bottone "Inizia" (placeholder {min} = durata)
  'sentiero.inizia': 'Inizia la pratica · {min} min',
  'sentiero.inizia_primo': 'Inizia il percorso · {min} min',
  // giorni futuri bloccati
  'sentiero.bloccato': 'Torna domani',
  'sentiero.completato_label': 'Completato',
  'sentiero.riprendi': 'Rileggi',
  // LessonPlayer (S3-4)
  'sentiero.player.completato': 'Completato',
  'sentiero.player.avanti': 'Avanti',
  'sentiero.player.chiudi': '✕',
  'sentiero.player.fonte': 'Fonte',
  'sentiero.player.scroll_hint': 'Scorri fino in fondo per completare',
  'sentiero.player.audio_mancante': 'Audio non disponibile — versione testo',
  'sentiero.player.step': 'Passo {n} di {tot}',
  'sentiero.toast_completato': 'Lezione completata ☾',
  'sentiero.errore_audio': 'Traccia non trovata, testo mostrato',
  // fase completata (h1 quando tutto il percorso è finito)
  'sentiero.finito_pre': 'Sentiero',
  'sentiero.finito_em': 'completato',

  // ---- Alba (righe 141-154) ----
  'alba.eyebrow': 'Alba · appena svegliə',
  'alba.titolo_pre': 'Cosa hai',
  'alba.titolo_em': 'sognato',
  'alba.rec_label': 'tieni premuto e racconta',
  'alba.emozione_label': 'Emozione dominante',
  'alba.lucidita_label': 'Quanto eri lucidə?',
  // etichette slider lucidità (riga 152) — anche per LucidityPicker
  'lucidity.0': 'assente',
  'lucidity.1': 'barlume',
  'lucidity.2': 'lucido',
  'lucidity.3': 'pieno controllo',
  // etichette detail overlay (riga 317, LUC_LABEL) — leggermente diverse
  'lucidity.detail.0': 'non lucido',
  'lucidity.detail.1': 'barlume',
  'lucidity.detail.2': 'lucido',
  'lucidity.detail.3': 'pieno controllo',
  'alba.plant_btn': 'Pianta nel giardino',
  'alba.toast_voce': 'Registrazione vocale (mock)',
  'alba.toast_piantato': 'Seme piantato nel giardino ✶',

  // ---- Notte (righe 158-170) ----
  'notte.eyebrow': 'Notte · rituale',
  'notte.titolo_pre': 'Prepara la',
  'notte.titolo_em': 'soglia',
  'notte.sub': 'La luce si abbassa. Tre gesti prima di attraversare.',
  'notte.ritual.1_t': 'Intenzione MILD',
  'notte.ritual.1_s':
    '«La prossima volta che sogno, mi accorgerò che sto sognando»',
  'notte.ritual.2_t': 'Training audio TLR · 20 min',
  'notte.ritual.2_s':
    'Associa il cue sonoro allo stato lucido (Konkoly 2024)',
  'notte.ritual.3_t': 'Ripassa i tuoi dream sign',
  'notte.ritual.3_s': 'acqua · volare · corridoi',
  'notte.ritual.done_toast': 'Rituale completato ☾',
  'notte.wbtb.lbl': 'Sveglia WBTB',
  'notte.wbtb.time': '04:40',
  'notte.wbtb.rs': 'suoneria «Marea» · vibrazione dolce · affidabilità garantita',

  // ---- Lume (righe 175-191) ----
  'lume.eyebrow': 'Lume · il tuo progresso',
  'lume.titolo_pre': 'La lucidità',
  'lume.titolo_em': 'cresce',
  'lume.big_u': 'sogni lucidi a settimana',
  'lume.trend': '▲ da 0,7 — quattro settimane fa',
  'lume.signs_label': 'Dream sign ricorrenti',
  'lume.mini.recall': 'recall score',
  'lume.mini.streak': 'notti di fila',
  'lume.mini.piantati': 'sogni piantati',
  'lume.pochi_dati': 'Primi passi. Torna tra qualche notte per vedere la crescita.',
  'lume.delta_su': '▲ {n} rispetto a un mese fa',
  'lume.delta_giu': '▼ {n} rispetto a un mese fa',
  'lume.settimane_4': '4 settimane',
  'lume.settimane_12': '12 settimane',
  'lume.condividi': 'Condividi',
  'lume.no_signs': 'Ancora nessun segno ricorrente. Continua a registrare i tuoi sogni.',

  // ---- Detail overlay (righe 195-201) ----
  'detail.close': '✕',
  'detail.modifica': 'Modifica',
  'detail.elimina': 'Elimina',
  'detail.undo': 'Annulla',
  'detail.eliminato_toast': 'Sogno lasciato andare · tocca per ripristinare',
  'detail.ripristinato_toast': 'Sogno tornato nel giardino ✶',
  'detail.signs_label': 'Segni ricorrenti',
  'detail.nessun_sign': 'Nessun segno ricorrente ancora visibile',
  'detail.no_recall': 'sogno non ricordato',

  // ---- Toast generici ----
  'toast.sentiero_sessione': 'Sessione guidata · 6 min ▸',

  // ---- Alba (form completo S2-3) ----
  'alba.titolo_input_label': 'Titolo (facoltativo)',
  'alba.titolo_placeholder': 'Dai un nome al sogno…',
  'alba.body_label': 'Racconto',
  'alba.body_placeholder': 'Scrivi o detta il sogno…',
  'alba.errore_emozione': 'Scegli un’emozione per piantare il sogno',
  'alba.errore_body': 'Il racconto è vuoto',
  'alba.errore_generico': 'Qualcosa non è andato, riprova',
  'alba.plant_btn_crea': 'Pianta nel giardino',
  'alba.plant_btn_salva': 'Salva le modifiche',
  'alba.toast_aggiornato': 'Sogno aggiornato ✶',
  'alba.rec_non_supportato': 'Dettatura non disponibile su questo dispositivo',
  'alba.rec_ascolto': 'Ti ascolto…',
  'alba.edit_eyebrow': 'Modifica il sogno',
  'alba.draft_ripristinato': 'Bozza ripristinata',

  // ---- Giardino (S2-4) ----
  'giardino.vuoto': 'Il tuo giardino attende il primo sogno.',
  'giardino.vuoto_cta': 'Pianta il primo sogno',
  'giardino.mese': 'luna',
  'giardino.cerca': 'Cerca nei sogni',
  'giardino.impostazioni': 'Impostazioni',
  'giardino.hint_mese': 'scorri tra le lune',

  // ---- Ricerca (S2-5) ----
  'search.placeholder': 'Cerca una parola, un luogo, un’emozione…',
  'search.eyebrow': 'Cerca nel giardino',
  'search.nessun_risultato': 'Nessun sogno per «{q}»',
  'search.close': 'Chiudi',

  // ---- Impostazioni (S2-5) ----
  'impostazioni.eyebrow': 'Impostazioni',
  'impostazioni.titolo_pre': 'Il tuo',
  'impostazioni.titolo_em': 'giardino privato',
  'impostazioni.sub': 'Tutto resta sul tuo dispositivo. Portalo con te.',
  'impostazioni.esporta_json': 'Esporta JSON',
  'impostazioni.esporta_md': 'Esporta Markdown',
  'impostazioni.esportato_json': 'Backup JSON scaricato',
  'impostazioni.esportato_md': 'Diario Markdown scaricato',
  'impostazioni.esporta_errore': 'Export non riuscito, riprova',
  'impostazioni.versione': 'Versione app',
  'impostazioni.privacy': 'Privacy',
  'impostazioni.termini': 'Termini',
  'impostazioni.privacy_link': 'Come proteggiamo i tuoi sogni',

  // ---- Privacy (placeholder) ----
  'privacy.eyebrow': 'Privacy',
  'privacy.titolo_pre': 'I tuoi sogni',
  'privacy.titolo_em': 'restano tuoi',
  'privacy.corpo':
    'Lucid Me è local-first: ogni sogno vive solo sul tuo dispositivo. Niente cloud, niente account, niente analisi remota. Puoi esportare e cancellare quando vuoi.',

  // ---- Notte — Step 4 (S4-1..S4-4) ----
  'notte.sub_vuoto': 'La luce si abbassa. Tre gesti prima di attraversare.',
  // gesti rituali (placeholder {signs} = elenco sign reali)
  'notte.ritual_1': 'Intenzione MILD',
  'notte.ritual_1_sub': '«La prossima volta che sogno, mi accorgerò che sto sognando»',
  'notte.ritual_2': 'Training audio TLR · 20 min',
  'notte.ritual_2_sub': 'Associa il cue sonoro allo stato lucido (Konkoly 2024)',
  'notte.ritual_3': 'Ripassa i tuoi dream sign',
  'notte.ritual_3_sub': '{signs}',
  'notte.ritual_3_no_signs': 'Nessun sign ancora — scrivi qualche sogno e torneranno qui',
  'notte.ritual_done': 'Gesto tenuto da parte ☾',
  'notte.wbtb_card_lbl': 'Sveglia WBTB',
  'notte.wbtb_card_off': 'WBTB non attivo',
  'notte.wbtb_card_sound': 'suoneria «{sound}» · vibrazione dolce',
  // copy ONESTO sulla affidabilità (§5.1.1) — niente finzioni
  'notte.pwa_limite':
    'Sul web questa sveglia funziona solo se l\'app resta aperta. Sul telefono (app nativa) è molto più affidabile.',
  'notte.wbtb_hint': 'Cade nella finestra REM-densa, due ore prima di alzarti.',
  'notte.wbtb_invalido':
    'L\'orario WBTB deve cadere tra l\'ora-sonno +2h e l\'ora-sveglia −30min.',
  'notte.rientro': 'Torna a dormire con l\'intenzione MILD. Sei a metà della notte.',
  'notte.programma': 'Programma',
  'notte.disattiva': 'Disattiva',
  'notte.wbtb_programmato': 'Sveglia programmata per le {time}',

  // TLR player (S4-4)
  'notte.tlr.titolo': 'Training TLR',
  'notte.tlr.sub': '20 minuti di silenzio, interrotti da un cue. Tieni lo schermo acceso.',
  'notte.tlr.minuti': 'minuti',
  'notte.tlr.cue': 'cue: {n}',
  'notte.tlr.soglia': 'completato se raggiungi i {min} min',
  'notte.tlr.inizia': 'Inizia',
  'notte.tlr.ferma': 'Ferma',
  'notte.tlr.completato': 'Training TLR completato · 20 min ☾',
  'notte.tlr.interrotto': 'Sessione interrotta a {min} min',
  'notte.tlr.errore': 'Non sono riuscito a salvare la sessione',

  // ---- Impostazioni — Sonno (S4-2) ----
  'impostazioni.sonno_eyebrow': 'Sonno',
  'impostazioni.sonno_titolo': 'Il tuo ritmo di notte',
  'impostazioni.sonno_sub': 'A che ora attraversi la soglia, e quando ritorni.',
  'impostazioni.sonno_sleep': 'Ora-sonno',
  'impostazioni.sonno_wake': 'Ora-sveglia',
  'impostazioni.sonno_wbtb': 'Risveglio WBTB',
  'impostazioni.sonno_wbtb_time': 'Orario WBTB',
  'impostazioni.sonno_sound': 'Suoneria',
  'impostazioni.sonno_salvato': 'Impostazioni sonno salvate',
  'impostazioni.sonno_salva_btn': 'Salva ritmo',
  'impostazioni.sound_marea': 'Marea',
  'impostazioni.sound_bosco': 'Bosco',
  'impostazioni.sound_campana': 'Campana',
  'impostazioni.analytics_label': 'Statistiche anonime',
  'impostazioni.analytics_sub':
    'Ci aiuti a capire come viene usata l\u2019app. Mai contenuti dei sogni, mai dati personali. Attivo solo con il tuo consenso.',

  // ---- Pro / paywall (S8-1) ----
  'pro.eyebrow': 'Lucid Me Pro',
  'pro.titolo_pre': 'Il diario resta',
  'pro.titolo_em': 'sempre libero',
  'pro.sub':
    'Pro apre il percorso completo e gli strumenti pi\u00f9 profondi. Ci\u00f2 che \u00e8 gratis oggi resta gratis per sempre.',
  'pro.piano_mese': 'Mensile',
  'pro.piano_mese_prezzo': '4,99 $/mese',
  'pro.piano_anno': 'Annuale',
  'pro.piano_anno_prezzo': '49,99 $/anno',
  'pro.piano_trial': '7 giorni di prova inclusi',
  'pro.cta_mese': 'Abbonati mensile',
  'pro.cta_anno': 'Abbonati annuale',
  'pro.ripristina': 'Ripristina acquisti',
  'pro.non_disponibile': 'Gli acquisti non sono ancora attivi in questa build',
  'pro.f0': 'Journal, giardino ed export: illimitati, per tutti',
  'pro.f1': 'Percorso completo, giorni 8\u201321 + training TLR',
  'pro.f2': 'Trend Lume fino a 12 settimane',
  'pro.f3': 'Reality check fino a 8 al giorno',
  'pro.f4': 'Suonerie sveglia personalizzate',
  'pro.torna': 'Torna al giardino',

  // ---- Feedback beta (S9-2) ----
  'feedback.bottone': 'Feedback',
  'feedback.titolo': 'Dicci tutto',
  'feedback.sub': 'Qualcosa non torna? Un\u2019idea? I beta tester guidano il prossimo ciclo di miglioramenti.',
  'feedback.placeholder': 'Racconta com\u2019è andata\u2026',
  'feedback.invia': 'Invia',
  'feedback.annulla': 'Annulla',
  'feedback.inviato': 'Feedback ricevuto, grazie \u2726',
  'feedback.accodato': 'Feedback salvato: sar\u00e0 inviato appena possibile',

  // ---- Reality check (S5-3) ----
  'rc.overlay_titolo': 'Reality check',
  'rc.overlay_sub': 'Per un istante, verifica.',
  'rc.btn_sognando': 'Stavo sognando 😴',
  'rc.btn_sveglio': 'Ero sveglio',
  'rc.sognando_toast': 'Segnale interessante — lo tengo da conto',
  'rc.sveglio_toast': 'Bene. Continua la giornata',

  // ---- Onboarding primo avvio (S8-2) ----
  // Slide 1 — benvenuto + promessa di valore.
  'onboarding.slide1_eyebrow': 'Lucid Me',
  'onboarding.slide1_titolo_pre': 'Benvenutə in',
  'onboarding.slide1_titolo_em': 'Lucid Me',
  'onboarding.slide1_sub':
    'Un diario per i tuoi sogni e una pratica del sognare lucido. Ogni sogno che scrivi diventa un organismo nel tuo giardino.',
  'onboarding.inizia': 'Inizia',
  // Slide 2 — come funziona (3 mini-card).
  'onboarding.slide2_titolo': 'Come cresce',
  'onboarding.slide2_alba_t': 'Alba',
  'onboarding.slide2_alba_d': 'Appena svegliə, raccogli il sogno finché è vivo.',
  'onboarding.slide2_sentiero_t': 'Sentiero',
  'onboarding.slide2_sentiero_d': 'Un percorso di ventuno giorni di pratica.',
  'onboarding.slide2_giardino_t': 'Giardino',
  'onboarding.slide2_giardino_d': 'Ogni sogno piantato diventa un organismo unico.',
  // Slide 3 — notifiche (pre-prompt pattern S8-2).
  'onboarding.notif_titolo': 'Un piccolo segnale',
  'onboarding.notif_sub':
    'Ti avvisiamo quando è il momento di un reality check e per il risveglio WBTB. Nessuna notifica di marketing, mai.',
  'onboarding.notif_attiva': 'Sì, attiva le notifiche',
  'onboarding.notif_dopo': 'Non ora',
  // Slide 4 — primo sogno guidato.
  'onboarding.slide3_titolo_pre': 'Pianta il tuo',
  'onboarding.slide3_titolo_em': 'primo sogno',
  'onboarding.slide3_sub':
    'Anche un frammento basta. Scegli un’emozione e scrivi cosa resta del sogno di stanotte.',
  'onboarding.slide3_primo': 'Pianta il primo sogno',
  'onboarding.non_ricordo': 'Non ricordo il sogno',
  'onboarding.aria_root': 'Onboarding',
  'onboarding.aria_dots': 'Avanzamento onboarding',
  'onboarding.aria_slide': 'Schermata {n} di {total}',
  'onboarding.salta': 'Salta',
  'onboarding.avanti': 'Avanti',
} as const;

export type I18nKey = keyof typeof it;

/** Tipo del dizionario (per swap futuro con altre lingue). */
export type Dict = Readonly<Record<string, string>>;

/**
 * Helper `t(key, vars?)` — restituisce la stringa per la chiave, o la chiave
 * stessa se mancante (debug visivo immediato). Sostituibile con lookup
 * localizzato. Supporta placeholder `{nome}` sostituiti con `vars[nome]`.
 */
export function t(key: string, dict: Dict = it, vars?: Record<string, string | number>): string {
  let s = dict[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return s;
}
