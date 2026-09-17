-- 005-norecall.sql — flag "sogno non ricordato" su Dream (ticket S8-2).
-- L'onboarding ("primo sogno guidato") offre "Non ricordo il sogno": crea una
-- entry con body vuoto, lucidity 0 ed emotion obbligatoria. La colonna è
-- INTEGER 0/1 (SQLite non ha BOOLEAN): il mapper in DreamRepo converte.
-- DEFAULT 0: tutti i sogni esistenti restano recall normali. Non distruttivo,
-- coerente con l'invariante append-only + soft delete (§5.1, §8.3).

ALTER TABLE dream ADD COLUMN no_recall INTEGER NOT NULL DEFAULT 0;
