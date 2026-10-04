# Миграция Enduro Vietnam

Действующее поручение: автономное выполнение ТЗ v1 с сохранением исходных страниц и ссылок. Пользователь отложил исходное визуальное совпадение и разрешил новый каталог. Исторические 97.15% при 1230 px не выдаются за выполненные 99.5%.

Текущий отчёт: `.shipstudio/migration.json`. Реализация: `docs/ARCHITECTURE.md`. Приёмка этапов: `docs/STATUS.md`. Запуск, редактор, импорт, восстановление и подготовка production: `docs/RUNBOOK.md`.

Туры и аренда разделены: `/all-tours` и `/ru/all-tours` содержат только туры/активности; `/rentals/motorbikes` и `/ru/rentals/motorbikes` — аренду. Главная направляет поиск в выбранный раздел. Старые ссылки поиска аренды перенаправляются с сохранением фильтров.

Первичные материалы не перезаписываются: `.shipstudio/enduro-vietnam-source.zip`, `.shipstudio/enduro-vietnam-export.zip`, `.shipstudio/backups/s01-original`, `content/pages.json` и `content/link-ledger.csv`. Исторический EXPORT.md описывает исходный экспорт, а не текущую CMS.

Текущий пакет кода и публичных данных: `.shipstudio/enduro-vietnam-current-project.zip`; состав, CRC и SHA-256 проверяются scripts/package-release.py и записываются в `.shipstudio/current-package-report.json`. Приватная `.data`, пароли, сессии и персональные заявки в этот ZIP не входят. База и приватные загрузки требуют отдельного защищённого резервирования.

Не считать внешние сервисы подключёнными по наличию кода: реальные email/Telegram, production PostgreSQL, hosting/TLS/DNS и offsite backup не подтверждены. 44 замечания аудита остаются needs-data; отсутствующие факты не выдуманы.
