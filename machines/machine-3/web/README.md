# Запуск
- `docker compose up -d`
- Если нужно жестко перезапустить `docker compose down -v && docker compose up -d`.

# Как пересоздать данные

- Выполнить сид внутри backend-контейнера:
  - `docker compose exec backend sh -c "npx ts-node --compiler-options '{\\\"module\\\":\\\"commonjs\\\"}' --transpile-only prisma/seed.ts"`
- Сид перезатирает БД и заново создаёт департаменты/проекты/пользователей/файлы

ЛИБО

- `docker compose down -v && docker compose up -d`

# Как менять сид (`backend/prisma/seed.ts`)
1) Открыть `backend/prisma/seed.ts`.
2) Править нужные блоки:
   - `baseDepartments` и `departmentCodes` — структура департаментов и их коды.
   - `projectsData` — проекты (код, имя, описание, департамент).
   - `leadership`/`bulkAdd` — пользователи, роли, телефоны и т.д.
   - `filesSeed` — файлы (владелец, путь `files/<CODE>/...`, mime, доступ).
3) Сохранить файл.
4) Пересобрать backend, чтобы изменения попали в контейнер:
   `docker compose build backend && docker compose up -d backend`
5) `docker compose down -v && docker compose up -d`
