-- 001-init.sql — schema iniziale Lucid Me (§S2-2, §8.3).
-- Append-only + soft delete per `dream`: nessuna cancellazione fisica (§5.1).
-- `dream_revision` conserva lo storico dei body (update = nuovo write).
-- FTS5 su title+body con trigger di sync; in fallback node/test lo stub ignora
-- FTS5/trigger e usa LIKE (vedi DreamRepo.search).

CREATE TABLE IF NOT EXISTS dream (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  dreamed_on TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  emotion TEXT NOT NULL,
  lucidity INTEGER NOT NULL,
  seed TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_dream_dreamed_on ON dream(dreamed_on DESC);

CREATE TABLE IF NOT EXISTS dream_revision (
  dream_id TEXT NOT NULL,
  body TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  FOREIGN KEY (dream_id) REFERENCES dream(id)
);

CREATE TABLE IF NOT EXISTS dream_sign (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  auto_detected INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS dream_sign_hit (
  dream_id TEXT NOT NULL,
  dream_sign_id TEXT NOT NULL,
  PRIMARY KEY (dream_id, dream_sign_id),
  FOREIGN KEY (dream_id) REFERENCES dream(id),
  FOREIGN KEY (dream_sign_id) REFERENCES dream_sign(id)
);

-- Full-text search su title + body. content='dream' (external content table)
-- + trigger di sync. Lo stub InMemoryDB ignora queste istruzioni.
CREATE VIRTUAL TABLE IF NOT EXISTS dream_fts USING fts5(
  title, body, content='dream', content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS dream_ai AFTER INSERT ON dream BEGIN
  INSERT INTO dream_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;
CREATE TRIGGER IF NOT EXISTS dream_ad AFTER DELETE ON dream BEGIN
  INSERT INTO dream_fts(dream_fts, rowid, title, body) VALUES('delete', old.rowid, old.title, old.body);
END;
CREATE TRIGGER IF NOT EXISTS dream_au AFTER UPDATE ON dream BEGIN
  INSERT INTO dream_fts(dream_fts, rowid, title, body) VALUES('delete', old.rowid, old.title, old.body);
  INSERT INTO dream_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;
