BEGIN TRANSACTION;

ALTER TABLE volunteer_feedback ADD COLUMN status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE volunteer_feedback ADD COLUMN resolution_notes TEXT;
ALTER TABLE volunteer_feedback ADD COLUMN handled_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE volunteer_feedback ADD COLUMN handled_at TEXT;

COMMIT;
