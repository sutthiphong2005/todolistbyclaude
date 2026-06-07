CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed users: password is "admin123" for both
INSERT INTO users (username, password_hash) VALUES
  ('admin', '$2a$10$2td112PqRE6RrZ4XIsMwlO3hxqjWJi/MSaFxsmQpiwW6y5kCti65O'),
  ('bob',   '$2a$10$iNDlr4lQkXyB/Q5IzVdyVu7k5Y.n.bruROZLBlH06YtteKRmjcdB6')
ON CONFLICT DO NOTHING;
