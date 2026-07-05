-- 004-rc.sql — reality check events (§S5-3).
-- Ogni riga è una notifica di reality check "sparata". `acknowledged` è
-- tri-state: NULL = in attesa di risposta, 1 = "stavo sognando", 0 = "ero sveglio".
-- Alimenta Lume (Step 6): tasso di risposta e "check in sogno" (segnale precoce
-- di lucidità). `fired_at` è ISO timestamp; `prompt_id` ссылка al prompt pool.

CREATE TABLE IF NOT EXISTS reality_check_event (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  fired_at TEXT NOT NULL,                  -- ISO timestamp
  acknowledged INTEGER,                    -- NULL=pending, 1=was-dreaming, 0=was-awake
  prompt_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_rc_event_fired
  ON reality_check_event(fired_at);
