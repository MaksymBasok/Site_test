BEGIN TRANSACTION;

ALTER TABLE pending_actions ADD COLUMN source TEXT;
ALTER TABLE pending_actions ADD COLUMN processed_entity_id INTEGER;
ALTER TABLE pending_actions ADD COLUMN resolution_notes TEXT;

COMMIT;
