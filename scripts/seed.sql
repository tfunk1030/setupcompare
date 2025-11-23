-- Seed file for SetupComparer
INSERT OR IGNORE INTO users (id, email, password_hash, created_at) VALUES ('demo-user', 'demo@example.com', '$2a$10$demoHash', datetime('now'));
