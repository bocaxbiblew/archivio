-- 1. Aggiungi la colonna per l'immagine profilo nella tabella users (se non esiste già)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic TEXT;

-- 2. Crea la nuova tabella per salvare i poster/sfondi/loghi personalizzati (override)
-- Nota: il backend interroga questa tabella per (user_id, tmdb_id), quindi entrambe
-- le colonne sono necessarie e la chiave primaria deve essere composta.
CREATE TABLE IF NOT EXISTS title_metadata (
    tmdb_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    poster_path TEXT,
    backdrop_path TEXT,
    logo_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, tmdb_id)
);