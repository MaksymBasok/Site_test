INSERT INTO fundraising_goals (title, description, target_amount, status)
VALUES ('Позашляховик для фронту', 'Мета — придбати повнопривідний автомобіль для евакуації та підвозу гуманітарної допомоги.', 850000, 'active');

INSERT INTO bank_accounts (label, recipient, iban, edrpou, purpose)
VALUES
  ('Основна картка', 'Roleders Aleksandrs', 'UA443077700000026204016710032', NULL, 'Для поповнення картки 4323347377472482, Roleders Aleksandrs'),
  ('Рахунок НКППК', 'ГО "Національний клуб професіоналів прикладного карате"', 'UA213052990000026204016740987', '12345678', 'Добровільний внесок на статутну діяльність');

INSERT INTO donations (donor_name, amount, currency, message, public, created_at)
VALUES
  ('Анонімний герой', 15000, 'UAH', 'Разом до перемоги!', 1, datetime('now','-2 day')),
  ('Марія П.', 5000, 'UAH', 'На ремонт машин', 1, datetime('now','-1 day')),
  ('Команда ІТ', 32000, 'UAH', 'Підтримка від компанії', 1, datetime('now','-6 hours'));

INSERT INTO withdrawals (amount, description)
VALUES
  (12000, 'Оплата ремонту ходової'),
  (8000, 'Заправка та витратні матеріали');

INSERT INTO vehicles (name, description, status, image_path, category)
VALUES
  ('Mitsubishi L200', 'Повнопривідний пікап для доставки вантажів у прифронтові зони.', 'in_progress', 'images/img/cars/car1.jpg', 'pickup'),
  ('Nissan Patrol', 'Потребує ремонту та бронювання скла.', 'needs_funding', 'images/img/cars/car5.jpg', 'suv'),
  ('Volkswagen Transporter', 'Мікроавтобус для евакуації цивільних та поранених.', 'funded', 'images/img/cars/car9.jpg', 'van');

INSERT INTO media_links (title, summary, url, image_path)
VALUES
  ('Александр Роледерс: іноземця у Вінниці душить система', 'Історія боротьби засновника фонду проти корупційного тиску.', 'https://onenews.online/aleksandr-roleders-inozemtsya-u-vinnitsi-dushit-sistema', 'images/img/org/media1.jpg');

INSERT INTO documents (title, description, file_path, file_type)
VALUES
  ('Свідоцтва волонтера', 'Посвідчення та бейджі засновника.', 'images/img/docs/posv/badges-all.jpg', 'image'),
  ('Паспорт волонтера', 'Паспорт Львівської обласної адміністрації.', 'images/img/docs/posv/pasport-lv.jpg', 'image'),
  ('Лист з Офісу Президента', 'Офіційний лист на підтримку діяльності.', 'images/img/docs/papers/letter-presidents-office.jpg', 'image'),
  ('Відеозвіт', 'Відео з передачею автомобіля.', 'images/img/org/result1.mp4', 'video');
