# Фонд "Волонтерка" — продакшн версія сайту

Це продакшн-орієнтований веб-додаток для публічного представлення діяльності фонду "Волонтерка". Проєкт містить багатосторінковий сайт, адміністративну панель та бекенд на Node.js/Express із реальною базою даних SQLite.

## Основні можливості

- 🎯 Відображення поточної фандрейзингової цілі, статистики надходжень та витрат.
- 🚙 Окрема сторінка автопарку з описом стану кожного автомобіля.
- 💳 Сторінка реквізитів із можливістю залишити публічний запис про донат.
- 🤝 Форма заявки для волонтерів із серверною валідацією.
- 📄 Розділ документів і публікацій у медіа.
- 🔐 Адмін-панель із входом за паролем, можливістю додавати донати та фіксувати витрати.
- 👥 Кабінет модерації заявок донаторів із підтвердженням чеків, присвоєнням ролей і блокуванням.
- 🧾 Експорт таблиці користувачів у формат PDF та керування банківськими реквізитами безпосередньо в інтерфейсі.
- 📰 Редагування контенту сайту (блоки, медіа, статті) й автопарку з адмінки.
- ⭐ Розділ відгуків донаторів та запитів від волонтерів із модерацією.
- 🛡️ Захист за допомогою CSRF-токенів, helmet, rate limiting та валідації введення.

## Технології

- Node.js 18+
- Express 4
- EJS як шаблонізатор
- SQLite (через `better-sqlite3`)
- Bootstrap 5 + кастомні стилі

## Структура

```
.
├── app.js                # Точка входу Express
├── public/               # Статичні ресурси (CSS, JS, зображення)
├── views/                # EJS-шаблони
├── routes/               # Маршрути (публічні, API, адмінські)
├── services/             # Бізнес-логіка та робота з БД
├── db/
│   ├── migrations/       # SQL-міграції
│   ├── seeds/            # Демонстраційні дані
│   └── volonterka.sqlite # Файл БД (створюється після міграцій)
├── scripts/              # Скрипти для міграцій та сидів
└── README.md
```

## Початок роботи

1. Скопіюйте `.env.example` у `.env` та задайте власні значення:
   ```bash
   cp .env.example .env
   ```
   Обов'язково змініть `SESSION_SECRET`, `ADMIN_EMAIL` та `ADMIN_PASSWORD`.

2. Встановіть залежності:
   ```bash
   npm install
   ```

3. Застосуйте міграції та початкові дані:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Запустіть застосунок у режимі розробки або продакшн:
   ```bash
   npm run dev   # з nodemon
   npm start     # звичайний запуск
   ```

5. Вхід до адмін-панелі: `http://localhost:3000/admin/login` з обліковими даними з `.env`.

## Безпека та продакшн-практики

- `helmet`, `hpp` та `compression` підключені за замовчуванням.
- Сесії зберігаються у SQLite через `connect-sqlite3`.
- Усі форми захищено CSRF-токенами.
- Валідація даних виконується на сервері (`express-validator`).
- API маршрути обмежені rate limiter'ом.

## Дизайн-система та гайдлайн по інтерфейсу

### Базові токени (усі збережено з першого коміту `css/style.css`)

| Токен | Значення | Використання |
| --- | --- | --- |
| `--legacy-primary-blue` | `#0057b7` | Основні CTA, активні стани меню, графіки.
| `--legacy-primary-yellow` | `#ffd700` | Акценти у кнопках, бейджі статусів, індикатори прогресу.
| `--legacy-dark-blue` | `#004494` | Фони секцій, тіні у героях, hover-ефекти.
| `--legacy-light-blue` | `#e6f0ff` | Плашки KPI, фони карток у темах.
| `--legacy-light-gray` | `#f5f5f5` | Бекграунд сторінок, скелетони.
| `--legacy-dark-gray` | `#333333` | Основний текст у світлій темі.

Розширені змінні (`--color-primary`, `--color-accent`, `--shadow-soft`, `--radius-lg` тощо) базуються на цих кольорах і використовуються у всіх нових компонентах.

### Типографіка

- Базовий шрифт: `--font-sans-base` (`'Segoe UI', 'Montserrat', Tahoma, sans-serif`).
- Заголовки секцій та героїв: `--font-display` (`'Montserrat'`).
- Розмірна сітка: 16px базовий розмір, 24px/32px для підзаголовків, 44px+ для hero.
- Медіа-запити: 480px, 768px, 992px, 1200px — mobile first.

### Компонентні патерни

- **Hero та KPI-картки**: використовують градієнт `--gradient-hero`, грід `dashboard-kpis`, плавну появу через `data-reveal`.
- **Прогрес-бари**: задаються властивістю `style="--progress-value: 0.65"` та ініціалізуються спостерігачем у `public/js/main.js`.
- **Таймлайн донатів**: клас `timeline` з маркером `timeline-item__badge`, використовується на сторінці «Донати» та у превʼю модалок.
- **Автопарк**: картки `vehicle-card` для публічної частини та `list-card-item` з формами оновлення у адмінці.
- **Форми-мастри**: клас `wizard`, кроки позначаються `data-step`/`data-step-panel`. Логіка в `initWizard`.
- **Toast та скелетони**: `data-toast-container` і `data-skeleton` включають плавне зникнення повідомлень та shimmer-завантаження.
- **Адмін-панель**: `admin-form-card` для редагування, `dashboard-kpi-card` з канвас-графіками (`data-sparkline`), `data-table` з пошуком.

### Приклади використання

```html
<article class="dashboard-kpi-card">
  <div class="dashboard-kpi-card__header">
    <span class="dashboard-kpi-card__icon"><i class="fa-solid fa-piggy-bank"></i></span>
    <span class="dashboard-kpi-card__label">Зібрано</span>
  </div>
  <div class="dashboard-kpi-card__value">1 250 000 ₴</div>
  <canvas data-sparkline data-values='[125000,140000,180000]' data-color="primary"></canvas>
</article>
```

```html
<form class="wizard" data-donation-form>
  <div class="wizard-steps">
    <div class="wizard-step is-active" data-step="1">...</div>
  </div>
  <div class="wizard-forms is-active" data-step-panel="1">...</div>
</form>
```

```html
<div class="list-card-item">
  <strong>Volkswagen Transporter</strong>
  <p class="small text-muted">needs_funding • оновлено 05.04</p>
  <form class="row g-2" id="vehicle-form-12">...</form>
</div>
```

### JS-хуки

- `data-sparkline` — канвас для міні-графіків (ініціалізується `initSparklineCharts`).
- `data-table="donations"` + `data-table-body="donations"` — живий пошук у таблицях адмінки.
- `data-export-form` — модальне вікно «Центр експорту» з чекбоксами `data-export-dataset` та селектором `data-export-format`.
- `data-admin-nav` — бічне меню адмін-панелі з активним станом.

## Подальший розвиток

- Підключити платіжні системи (Fondy/LiqPay) для онлайн-оплат.
- Додати можливість редагувати автопарк та банківські реквізити через адмінку.
- Реалізувати експорт звітів у форматах CSV/PDF.

Будь-які pull request'и та пропозиції вітаються!
