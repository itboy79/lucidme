// Onboarding — route marker. Niente load asincrono qui: il flag di completamento
// è letto (in modo resiliente) dal root guard nel layout, non dal load della
// pagina. Se chiamassimo `ensureLoaded()` qui e il backend SQLite non fosse
// inizializzabile, il load rigetterebbe e la pagina non renderizzerebbe —
// evitiamo quella dipendenza. Il rendering è interamente client-side (ssr=false).
export const prerender = false;
