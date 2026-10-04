# Запуск, редактирование и восстановление

Команды выполняются из корня проекта. Используйте Node.js 24 и npm; точный набор зависимостей — package-lock.json. Секреты не копируйте в публичные файлы, отчёты, архив передачи или сообщения.

## Локальный запуск

```sh
npm ci
MIGRATION_DEV=1 npm run dev -- --webpack --port 3000
```

Launcher запускает приватную базу при её отсутствии, отключённый outbox worker и Next.js на 127.0.0.1:3000. Уже работающий мост базы переиспользуется. Не запускайте второй процесс PGlite с тем же `.data/postgres`. Не останавливайте отдельный управляемый preview Ship Studio.

В чистом проекте после запуска:

```sh
node server/migrate.mjs
node scripts/import-catalog.mjs
node scripts/import-catalog.mjs --apply
node scripts/bootstrap-owner.mjs
```

Первая команда мигрирует схему; импорт сначала показывает dry-run. В этой рабочей копии 69 записей уже импортированы, повтор создаёт ноль дублей. Локальные данные владельца находятся в приватном `.data/owner-access.txt`; не публикуйте его. Откройте http://localhost:3000/admin/login. Owner email@localhost.test не является получателем реальных уведомлений.

Если владелец забыл пароль, сначала используйте ссылку восстановления, которую формирует администратор в кабинете. Аварийная команда `node scripts/recover-owner.mjs` применяется оператором с доступом к серверу; результат сохраняется в приватный файл и не отключает MFA. Приватная ссылка записывается в .data/owner-recovery.txt.

## Работа в кабинете

1. Создайте организацию и выдайте приглашение staff/partner в `/admin/settings`. Ссылка приглашения приватная и одноразовая; доставка приглашений автоматически не настроена.
2. В `/admin` выберите предложение или создайте черновик. Заполните RU/EN, фотографии, цену и её основание, длительность, варианты, программу и реальные условия. Для аренды заполните тарифы и залог отдельно. USD вводится в центах, VND в донгах; пустая сумма означает неизвестную цену.
3. Партнёр сохраняет черновик и отправляет его на проверку. Owner/staff с publish проверяет и публикует конкретную версию. Открытый сайт до этого показывает прежний снимок. Предпросмотр доступен только разрешённой роли; заявки в нём отключены.
4. Новые категории появляются в публичном меню после появления опубликованного предложения. Пустой ассортимент авто не выдумывается.
5. `/admin/leads` показывает сохранённые заявки, исходный снимок цены и состояние двух каналов уведомлений. Owner/staff с leads назначает ответственного; другой staff видит только назначенное. Дата в форме — пожелание, а не подтверждение наличия.
6. В `/admin/settings` привяжите TOTP владельца к своему устройству до production. Не заменяйте подтверждение MFA наличием тестового отчёта.

## CSV и сверка

```sh
node scripts/import-csv.mjs /absolute/path/catalog.csv
IMPORT_FILE=.data/csv-prepared.json node scripts/import-catalog.mjs --apply
```

Поддерживаемые колонки: source_id, type, destination, category, slug, title_en, title_ru, description_en, description_ru, price_minor, currency, unit. Точную схему проверяйте в scripts/import-csv.mjs. Нужен стабильный source_id. Формулы и некорректные суммы карантинируются; новый CSV создаёт черновик. Повтор не дублирует, изменения источника не затирают редакторскую версию. Карантин/конфликты — `/admin/imports`, отчёт dry-run — `.shipstudio/csv-dry-run.json`.

Исходные Sheets/CSV из ТЗ не предоставлены. Нельзя считать их импортированными из-за наличия публичного архива. Для проверенной общей сверки служат source_id, provenance, conflicts и data/audit-register.json.

## Локальная приёмка

```sh
npm run lint -- --quiet
NEXT_PUBLIC_LOCAL_SAFE_MODE=1 MIGRATION_BUILD=1 npm run build
node scripts/check-database.mjs
node scripts/check-application.mjs
node scripts/check-moderation.mjs
node scripts/check-mfa.mjs
node scripts/check-import.mjs
node scripts/check-public-routes.mjs
node scripts/check-seo.mjs
node scripts/check-responsive.mjs
node scripts/check-audit-register.mjs
node scripts/backup-restore.mjs
```

Не запускайте browser/route приёмку во время изменения кода или сборки: dev может временно пересобирать manifest. После сборки дождитесь 200 главной, затем измеряйте. Проверки с фикстурами выполняйте последовательно, чтобы они не влияли на количество записей в соседней проверке. Все security/delivery тесты локальные; временные записи удаляются. Старые S01 проверки сравнивают исходные заголовки и отключённые формы и предназначены для снимка S01, не для нового агрегатора.

Сборка использует `.next-build`, изолированную от dev `.next-migration`. Для локального production smoke:

```sh
NEXT_PUBLIC_SITE_URL=http://localhost:3001 APP_HTTPS=0 NEXT_PUBLIC_LOCAL_SAFE_MODE=1 MIGRATION_BUILD=1 npm run start -- --port 3001
```

База-мост должен уже работать. Это локальный production runtime, не опубликованный сайт.

## Сохранение и восстановление

`node scripts/backup-restore.mjs` создаёт AES-256-GCM снимок базы и приватных медиа в `.data/backups/*.enc`, затем проверяет восстановление схемы, записей и контрольных сумм в отдельной PGlite. Ключ `.data/backup-key` хранить отдельно от копии. Исходные public/assets сверяются по SHA-256; их архив также нужен для восстановления. Сессии, приглашения и recovery-токены намеренно не восстанавливаются.

Это проверка локального восстановления, а не автоматическое offsite резервирование. `.data` содержит персональные данные и секреты; не включайте её в открытый ZIP. Исходная версия файлов — `.shipstudio/backups/s01-original`, SHA-256 — manifest.json. Для отката файлов восстанавливайте её в отдельную папку, сохраняя текущую базу и медиа.

## Production: подготовлено, но не выполнено

Dockerfile и compose.yaml описывают PostgreSQL 18, web и отдельный worker. Docker в текущей среде отсутствует; контейнерная сборка и удалённый PostgreSQL не проверены. Перед первым запуском нужны приватные `.env.production` и `.env` с POSTGRES_PASSWORD, HTTPS reverse proxy и независимая резервная копия. Пароль БД для URI должен быть URL-safe.

Пример порядка для оператора на подготовленном сервере:

```sh
docker compose build
docker compose up -d database
docker compose run --rm web node server/migrate.mjs
docker compose run --rm web node scripts/import-catalog.mjs --apply
docker compose run --rm web node scripts/bootstrap-owner.mjs
docker compose up -d web worker
```

Это подготовленная инструкция, не результат выполненного удалённого запуска. Настройте NEXT_PUBLIC_SITE_URL на внешний origin, APP_HTTPS=1, снимите local-safe и staging Basic Auth только на настоящем production. Для закрытого staging задаются обе STAGING_USER/STAGING_PASSWORD; половинная конфигурация блокирует доступ.

Для доставки необходимы реальные OWNER_EMAIL, EMAIL_FROM и RESEND_API_KEY, TELEGRAM_BOT_TOKEN и numeric TELEGRAM_CHAT_ID. Только после разрешённой проверки обоих адресатов устанавливайте DELIVERY_ENABLED=1. Рабочий worker запускается отдельно `node server/outbox-worker.mjs`; серверный HTTP-ответ не запускает доставку в фоне.

Перед переключением: pg_dump согласованной БД, полный снимок media, исходный архив public/assets, сохранённый предыдущий образ/релиз, независимая зашифрованная копия, пробное восстановление на отдельном сервере. После переключения повторить URL/canonical/hreflang, HTTPS, отсутствие глобального noindex, MFA, права, реальную тестовую заявку и доставку обоих каналов. Сохранить DNS MX/TXT. DNS/SSH/хостинг сейчас недоступны, переключение не выполнялось.

Откат production: остановить обработчик, сохранить новые заявки, вернуть предыдущий совместимый образ, при необходимости восстановить БД/медиа в отдельный volume и проверить до переключения. Не откатывайте базу поверх новых заявок без их сохранения. Автоматический cron, offsite retention и внешний мониторинг требуют реального сервера; текущий localhost health не заменяет внешнюю проверку.
