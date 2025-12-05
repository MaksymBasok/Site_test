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

-- Production-friendly seed: keep core content, remove test donors/feedback/financial logs
INSERT INTO fundraising_goals (title, description, target_amount, status)
VALUES (
  'Позашляховик для фронту',
  'Готуємо повнопривідний автомобіль із додатковим захистом для евакуації та логістики у прифронтових районах.',
  850000,
  'active'
);

INSERT INTO bank_accounts (label, recipient, iban, edrpou, purpose)
VALUES
  (
    'Основна картка',
    'Roleders Aleksandrs',
    'UA443077700000026204016710032',
    NULL,
    'Для поповнення картки 4323347377472482, Roleders Aleksandrs'
  ),
  (
    'Рахунок НКППК',
    'ГО "Національний клуб професіоналів прикладного карате"',
    'UA213052990000026204016740987',
    '12345678',
    'Добровільний внесок на статутну діяльність'
  );

INSERT INTO vehicles (name, description, status, image_path, category)
VALUES
  ('Mitsubishi L200', 'Пікап із підвищеним кліренсом, уже пройшов сервіс і встановлення додаткового освітлення.', 'ready_for_mission', 'images/img/cars/car1.jpg', 'pickup'),
  ('Toyota Hilux', 'Новий бортовий Hilux, збираємо кошти на бронювання кабіни та захист паливної системи.', 'needs_funding', 'images/img/cars/car2.jpg', 'pickup'),
  ('Ford Ranger', 'Ремонтуємо ходову частину та замінюємо амортизатори після інтенсивної експлуатації.', 'repairing', 'images/img/cars/car3.jpg', 'pickup'),
  ('Nissan Navara', 'Готуємо авто до бронювання скла та встановлення захисту двигуна.', 'in_progress', 'images/img/cars/car4.jpg', 'pickup'),
  ('Nissan Patrol', 'Потребує повного оновлення електрики та заміни зчеплення перед виїздом.', 'needs_funding', 'images/img/cars/car5.jpg', 'suv'),
  ('Toyota Land Cruiser 100', 'Позашляховик прибув із Європи, проводимо ТО та встановлюємо захист моторного відсіку.', 'in_progress', 'images/img/cars/car6.jpg', 'suv'),
  ('Mitsubishi Pajero Sport', 'Заміна трансмісії та оновлення підвіски для роботи на бездоріжжі.', 'repairing', 'images/img/cars/car7.jpg', 'suv'),
  ('Volkswagen Amarok', 'Укомплектований медичним набором та готовий до виїзду як машина супроводу.', 'ready_for_mission', 'images/img/cars/car8.jpg', 'pickup'),
  ('Volkswagen Transporter T5', 'Переданий медикам на схід та вже працює як санітарний бус.', 'funded', 'images/img/cars/car9.jpg', 'van'),
  ('Mercedes-Benz Sprinter 4x4', 'Переобладнуємо салон під евакуацію поранених та встановлюємо автономне опалення.', 'in_progress', 'images/img/cars/car10.jpg', 'van'),
  ('Renault Master L3H2', 'Довгобазовий бус для перевезення гуманітарних вантажів, повністю готовий до рейсів.', 'ready_for_mission', 'images/img/cars/car11.jpg', 'van'),
  ('Opel Vivaro', 'Сервісний мікроавтобус для волонтерів, завершено фарбування у захисний колір.', 'funded', 'images/img/cars/car12.jpg', 'van'),
  ('Peugeot Boxer', 'Плануємо придбати комплект гуми та посилити ресори для збільшення вантажопідйомності.', 'needs_funding', 'images/img/cars/car13.jpg', 'van'),
  ('Fiat Ducato 4x4', 'Потребує заміни роздаткової коробки та перевірки приводу повного приводу.', 'repairing', 'images/img/cars/car14.jpg', 'van'),
  ('Hyundai H1', 'Виконує роль мобільного штабу, обладнаний зарядними станціями та зв''язком.', 'funded', 'images/img/cars/car15.jpg', 'van'),
  ('Toyota RAV4 Hybrid', 'Готуємо до розвідувальних виїздів, збираємо кошти на додаткові акумулятори.', 'needs_funding', 'images/img/cars/car16.jpg', 'crossover'),
  ('Subaru Forester', 'Підсилюємо захист днища та встановлюємо гуму для бездоріжжя.', 'in_progress', 'images/img/cars/car17.jpg', 'crossover'),
  ('Land Rover Discovery 3', 'Відновлюємо пневмопідвіску та діагностуємо електроніку перед боєвими задачами.', 'repairing', 'images/img/cars/car18.jpg', 'suv'),
  ('Suzuki Vitara', 'Компактний позашляховик для медиків, укомплектований аптечками та генератором.', 'ready_for_mission', 'images/img/cars/car19.jpg', 'crossover'),
  ('Chevrolet Tahoe', 'Шукаємо донорів на паливо та встановлення бронепластин для дверей.', 'needs_funding', 'images/img/cars/car20.jpg', 'suv'),
  ('Isuzu D-Max', 'Підсилюємо кузов та встановлюємо каркас для евакуації поранених.', 'in_progress', 'images/img/cars/car21.jpg', 'pickup');

INSERT INTO media_links (title, summary, url, image_path)
VALUES
  (
    'Александр Роледерс: іноземця у Вінниці душить система',
    'Історія боротьби засновника фонду проти корупційного тиску.',
    'https://onenews.online/aleksandr-roleders-inozemtsya-u-vinnitsi-dushit-sistema',
    'images/img/org/media1.jpg'
  ),
  (
    'Передача транспорту бригаді на сході',
    'Фоторепортаж із передачі пікапа та медичного оснащення нашим захисникам.',
    'https://www.facebook.com',
    'images/img/org/result2.jpg'
  );

INSERT INTO documents (title, description, file_path, file_type)
VALUES
  ('Свідоцтва волонтера', 'Посвідчення та бейджі засновника.', 'images/img/docs/posv/badges-all.jpg', 'image'),
  ('Паспорт волонтера', 'Паспорт Львівської обласної адміністрації.', 'images/img/docs/posv/pasport-lv.jpg', 'image'),
  ('Лист з Офісу Президента', 'Офіційний лист на підтримку діяльності фонду.', 'images/img/docs/papers/letter-presidents-office.jpg', 'image'),
  ('Рішення податкової служби', 'Підтвердження неприбуткового статусу організації.', 'images/img/docs/papers/decision-tax-2021.jpg', 'image'),
  ('Публікація Living Earth', 'Міжнародна стаття про волонтерську ініціативу.', 'images/img/docs/papers/living-earth-press.jpg', 'image'),
  ('Доручення НКППК №1', 'Доручення на співпрацю з військовими частинами.', 'images/img/docs/papers/nkppk-doruchennya-1.jpg', 'image'),
  ('Доручення НКППК №2', 'Документ щодо матеріально-технічної допомоги.', 'images/img/docs/papers/nkppk-doruchennya-2.jpg', 'image'),
  ('Печатка громадської організації', 'Двомовна печатка ГО для офіційних листів.', 'images/img/docs/seals/stamp-ukr-en.jpg', 'image'),
  ('Печатки для перепусток', 'Комплект печаток для оформлення перепусток та складів.', 'images/img/docs/seals/stamps-2pc.jpg', 'image'),
  ('Відеозвіт', 'Відео з передачею автомобіля та звітом для донаторів.', 'images/img/org/result1.mp4', 'video');

INSERT INTO content_blocks (slug, title, body)
VALUES
  ('live_stream_info', 'Прямий ефір', 'Доступ до трансляції відкривається після підтвердження донату адміністратором. Слідкуйте за розкладом у чаті донаторів.'),
  ('volunteer_contacts', 'Координація волонтерів', 'Напишіть координатору у Telegram: @volonterka_help або телефонуйте +380931234567. Ми підкажемо, чим допомогти найближчим часом.'),
  ('home_reviews_intro', 'Голоси донорів', 'Кожне добре слово мотивує команду працювати ще більше. Ось кілька відгуків, які надихають щодня.');

INSERT INTO site_articles (title, excerpt, body, cover_image, published_at)
VALUES
  (
    'Як ми готуємо пікапи до фронту',
    'Розповідаємо про процес пошуку, ремонту та передачі автомобілів для захисників.',
    'Повний матеріал про те, як команда фонду працює з автомобілями: від закупівлі до передачі на передову. Ми ділимося чек-листом перевірки та списком партнерів, які допомагають із ремонтом.',
    'images/img/cars/car1.jpg',
    datetime('now','-5 day')
  ),
  (
    'Команда тижня: волонтери Вінниці',
    'Знайомтесь із людьми, які щодня обробляють десятки запитів на допомогу.',
    'Розмова з волонтерами, що координують запити з регіонів. Вони діляться досвідом і розповідають, як ефективно розподіляти ресурси.',
    'images/img/org/media1.jpg',
    datetime('now','-2 day')
  );

COMMIT;
