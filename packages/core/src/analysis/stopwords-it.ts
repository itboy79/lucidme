/**
 * Stopword italiane per `detectSigns` (§S2-1). ~150 voci: articoli,
 * congiunzioni, preposizioni (semplici/articolate), pronomi, ausiliari,
 * avverbi frequenti, negazioni e forme del verbo essere/avere più comuni.
 *
 * Fonte: adattato da "ISO stopword list italian" + NLTK italian, depurato dalle
 * forme troppo ambigue. Lista chiusa e stabile: cambiare qui cambia i sign
 * rilevati su tutti i sogni esistenti.
 */
export const STOPWORDS_IT = new Set<string>([
  // Articoli determinativi / indeterminativi / partitivi
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'un\'',
  'l\'', 'gli', 'dei', 'degl', 'del', 'della', 'delle', 'dello', 'dell\'',
  // Preposizioni semplici
  'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
  // Preposizioni articolate (campione frequente)
  'al', 'allo', 'alla', 'alle', 'ai', 'agli',
  'del', 'dello', 'della', 'delle', 'dei', 'degli',
  'dal', 'dallo', 'dalla', 'dalle', 'dai', 'dagli',
  'nel', 'nello', 'nella', 'nelle', 'nei', 'negli',
  'sul', 'sullo', 'sulla', 'sulle', 'sui', 'sugli',
  'col', 'coi',
  // Congiunzioni / avverbi connettivi
  'e', 'ed', 'o', 'od', 'ma', 'se', 'perché', 'poiché', 'siccome',
  'come', 'mentre', 'quando', 'dove', 'dato', 'visto', 'affinché',
  'così', 'cioè', 'invece', 'comunque', 'quindi', 'allora', 'dunque',
  'però', 'anche', 'ancora', 'mentre', 'che', 'cui', 'chi',
  'ne', 'né', 'non', 'no', 'si', 'sì',
  // Pronomi dimostrativi / relativi / personali / possessivi
  'questo', 'questa', 'questi', 'queste', 'quello', 'quella',
  'quelli', 'quegli', 'quelle', 'codesto',
  'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro',
  'mi', 'ti', 'ci', 'vi', 'si', 'me', 'te', 'se', 'sé',
  'mio', 'mia', 'miei', 'mie', 'tuo', 'tua', 'tuoi', 'tue',
  'suo', 'sua', 'suoi', 'sue', 'nostro', 'nostra', 'nostri', 'nostre',
  'vostro', 'vostra', 'vostri', 'vostre', 'loro',
  'qualcosa', 'qualcuno', 'tutto', 'tutti', 'tutta', 'tutte',
  'nulla', 'niente', 'ogni', 'alcuni', 'alcune', 'molto', 'molta',
  'molti', 'molte', 'poco', 'poche', 'tanto', 'quanto', 'tanto',
  // Ausiliari e verbi frequenti (presente)
  'essere', 'è', 'sono', 'sei', 'siamo', 'siete', 'era', 'eri',
  'eravamo', 'eravate', 'erano', 'sarò', 'sarai', 'sarà', 'saremo',
  'sarete', 'saranno', 'fui', 'fosti', 'fu', 'fummo', 'foste', 'furono',
  'stato', 'stata', 'stati', 'state', 'essere',
  'avere', 'ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno',
  'avevo', 'avevi', 'aveva', 'avevamo', 'avevate', 'avevano',
  'avrò', 'avrai', 'avrà', 'avremo', 'avrete', 'avranno',
  'ebbi', 'avesti', 'ebbe', 'avemmo', 'aveste', 'ebbero',
  'avuto', 'fare', 'faccio', 'fai', 'facciamo', 'fate', 'fanno',
  'facevo', 'facevi', 'faceva', 'facevamo', 'facevate', 'facevano',
  'feci', 'facesti', 'fece', 'facemmo', 'faceste', 'fecero',
  'fatto',
  // Avverbi di tempo/luogo/modo frequenti
  'oggi', 'ieri', 'domani', 'ora', 'allora', 'sempre', 'mai',
  'spesso', 'qui', 'lì', 'là', 'sopra', 'sotto', 'dentro', 'fuori',
  'prima', 'dopo', 'durante', 'verso', 'contro',
  'più', 'meno', 'tanto', 'poco', 'quasi', 'molto', 'già', 'appena',
  'solo', 'soltanto', 'pure', 'sempre', 'subito',
  'così', 'tanto', 'bene', 'male',
  // Altro
  'ecc', 'etc', 'verso', 'circa', 'oltre', 'attraverso',
]);
