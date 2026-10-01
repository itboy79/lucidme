-- Waitlist beta (S9-1): SOLO l'email, nient'altro (privacy by design).
-- PK su email: un ripubblicamento della stessa email è un no-op (INSERT OR IGNORE).
CREATE TABLE waitlist (
  email      text PRIMARY KEY,
  created_at text NOT NULL
);
