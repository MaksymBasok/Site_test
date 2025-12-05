BEGIN TRANSACTION;

DELETE FROM donor_reviews;
DELETE FROM volunteer_feedback;
DELETE FROM media_links;
DELETE FROM documents;
DELETE FROM vehicles;
DELETE FROM withdrawals;
DELETE FROM donations;
DELETE FROM bank_accounts;
DELETE FROM fundraising_goals;
DELETE FROM content_blocks;
DELETE FROM site_articles;

-- Seed only minimal placeholder rows needed for a clean production bootstrap
INSERT INTO fundraising_goals (title, description, target_amount, status)
VALUES (
  'Нова ціль',
  'Додайте опис у адмін-панелі перед публікацією сайту.',
  0,
  'draft'
);

COMMIT;
