-- 003-night.sql — rituale serale + impostazioni sonno (§S4-1, §S4-2).
-- `night_ritual`: una riga per (user_id, date YYYY-MM-DD). I tre flag MILD/TLR/
-- sign sono i "tre gesti" del rituale; `wbtb_time` registra la sveglia impostata
-- per quella notte. `settings`: key-value generico per le impostazioni sonno
-- (ora-sonno, ora-sveglia, WBTB on/off, orario WBTB, suoneria). I valori sono
-- serializzati come JSON dal `SettingsRepo`.

CREATE TABLE IF NOT EXISTS night_ritual (
  user_id TEXT NOT NULL DEFAULT 'local',
  date TEXT NOT NULL,                      -- 'YYYY-MM-DD'
  mild_done INTEGER NOT NULL DEFAULT 0,
  tlr_done INTEGER NOT NULL DEFAULT 0,
  signs_done INTEGER NOT NULL DEFAULT 0,
  wbtb_time TEXT,
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT NOT NULL DEFAULT 'local',
  key TEXT NOT NULL,
  value TEXT NOT NULL,                     -- JSON-serializzato dal SettingsRepo
  PRIMARY KEY (user_id, key)
);
