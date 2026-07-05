-- 002-path.sql — progresso del Sentiero (§S3-3, §8.3 PathProgress).
-- Una riga per (user_id, day) completato. `user_id` è 'local' per ora
-- (gli account arrivano nello Step 7). Regola d'uso: un solo giorno
-- completabile per giorno solare — applicata a livello di repository
-- (PathRepo.canCompleteDay), non qui (vincolo temporale, non strutturale).

CREATE TABLE IF NOT EXISTS path_progress (
  user_id TEXT,
  day INTEGER NOT NULL,
  completed_at TEXT NOT NULL,
  technique TEXT,
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_path_progress_user_day
  ON path_progress(user_id, day);
