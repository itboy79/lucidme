-- Feedback beta (S9-2): testo libero scritto DALL'utente a proposito dell'app.
-- Mai contenuto di sogni letto dal device: il client non lo invia (vedi wiki).
CREATE TABLE feedback (
  id         integer PRIMARY KEY AUTOINCREMENT,
  text       text NOT NULL,
  created_at text NOT NULL
);
