CREATE TABLE IF NOT EXISTS attachments (
    id           SERIAL PRIMARY KEY,
    todo_id      INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    stored_name   TEXT NOT NULL UNIQUE,
    size          BIGINT NOT NULL,
    mime_type     TEXT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
