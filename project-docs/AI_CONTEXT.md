# AI Context

Документ для быстрого погружения в проект `primerkakoles-app`.

Заполняется только проверенной информацией из репозитория. Если архитектура, деплой, env-переменные или продуктовая логика меняются, этот файл нужно обновлять вместе с кодом.

## Рабочие Документы

- `project-docs/AI_CONTEXT.md` - стабильная карта проекта: архитектура, технологии, маршруты, интеграции, риски и правила работы.
- `project-docs/PROJECT_LOG.md` - журнал проверенных изменений и важных решений.
- `project-docs/ROADMAP.md` - планы, приоритеты и следующие задачи.

## Текущий Статус

- Проект: веб-приложение "Примерка Колес".
- Тип: React SPA на Vite.
- Основная функция: виртуальная примерка автомобильных дисков по фото автомобиля и фото диска.
- Деплой: GitHub Pages через GitHub Actions.
- Основная ветка: `main`.
- Кастомный домен: `app.primerkakoles.ru`.
- Backend в репозитории отсутствует. Используются Supabase и внешний webhook генерации.

## Технологии

- React 18.
- React Router DOM 7.
- Vite 5.
- Tailwind CSS 4 через `@tailwindcss/vite`.
- Supabase JS SDK.
- JavaScript/JSX, без TypeScript.

Основные npm scripts:

```bash
npm run dev
npm run build
npm run preview
```

## Структура Проекта

- `index.html` - HTML-шаблон Vite, содержит `div#root` и подключает `/src/main.jsx`.
- `src/main.jsx` - точка входа React, подключает `App`, `ErrorBoundary`, глобальные стили.
- `src/App.jsx` - маршруты приложения.
- `src/index.css` - Tailwind import и базовые стили.
- `src/pages/` - страницы приложения.
- `src/components/` - переиспользуемые UI-компоненты.
- `src/lib/` - Supabase-клиент, hooks авторизации, профиля и SEO.
- `supabase/migrations/` - SQL-миграции Supabase.
- `.github/workflows/deploy.yml` - деплой в GitHub Pages.
- `public/CNAME` - домен GitHub Pages.
- `.env.example` - безопасный пример env-переменных без реальных секретов.

## Маршруты

Маршруты заданы в `src/App.jsx`:

- `/` - главная страница.
- `/try` - примерка дисков.
- `/gallery` - публичная галерея.
- `/my` - личные генерации пользователя.
- `/login` - регистрация и вход по email/password.
- `/auth/callback` - callback авторизации.
- `/cabinet` - личный кабинет.
- `/support` - страница поддержки.
- `*` - fallback на главную страницу.

## Основная Логика

### Авторизация

- Авторизация реализована через Supabase Auth.
- Текущий пользователь берется через `src/lib/useAuth.js`.
- На странице `/login` используется email/password через `supabase.auth.signUp` и `supabase.auth.signInWithPassword`.
- Регистрация должна создавать кабинет сразу, без подтверждения email. Для этого в Supabase Auth должна быть отключена обязательная email confirmation.
- После входа пользователь перенаправляется в `/cabinet`.
- Неавторизованный пользователь на `/try`, `/my`, `/cabinet` перенаправляется к авторизации или видит CTA на вход.

### Профиль И Лимиты

- Профиль пользователя загружается из таблицы `users` через `src/lib/useUserProfile.js`.
- Используемые поля профиля:
  - `id`
  - `email`
  - `phone`
  - `chat_id`
  - `first_name`
  - `username`
  - `generations_limit`
  - `generations_used`
- Лимит генераций считается как `generations_limit - generations_used`.

### Генерация

- Страница генерации: `src/pages/TryPage.jsx`.
- Пользователь загружает два изображения:
  - фото автомобиля;
  - фото диска.
- Компонент загрузки: `src/components/PhotoUpload.jsx`.
- Изображения конвертируются в base64 на клиенте.
- Запрос отправляется на `VITE_WEBHOOK_URL`.
- В запросе передается Supabase access token в заголовке `Authorization: Bearer ...`.
- Ожидаемый ответ webhook: изображение (`image/*`) как blob.
- Результат отображается через `src/components/GenerationResult.jsx`.

### Галереи

- Публичная галерея: `src/pages/GalleryPage.jsx`.
- Личная галерея: `src/pages/MyGenerationsPage.jsx`.
- Обе читают таблицу `generations`.
- Публичная галерея показывает последние генерации с непустым `result_url`.
- Личная галерея фильтрует записи по `auth_user_id = user.id`.
- В обеих галереях есть preview modal с переключением `result`, `car`, `wheel`.

### SEO

- SEO-мета обновляются через `src/lib/useSeo.js`.
- Хук меняет `document.title`, `meta[name="description"]`, `og:title`, `og:description`.

## Env-Переменные

Используются frontend env-переменные Vite:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WEBHOOK_URL`
- `VITE_TELEGRAM_BOT_USERNAME` передается в GitHub Actions build, но по проверенному коду сейчас не используется.

Важно:

- `.env` не должен быть в git.
- Локально `.env` остается на компьютере разработчика.
- Для GitHub Pages значения задаются в GitHub Secrets.
- `VITE_SUPABASE_ANON_KEY` публичен в браузерном bundle по природе frontend-приложения; безопасность должна обеспечиваться RLS-политиками Supabase и backend/webhook-проверками.
- Нельзя использовать Supabase `service_role` ключ во frontend.

## Supabase

Миграции находятся в `supabase/migrations/`.

Проверенные миграции:

- `20260421_pr1_auth_schema.sql` - добавляет auth-связь, `auth_user_id`, RLS, trigger создания `public.users` при signup.
- `20260422_pr3_gallery_public_select.sql` - открывает select для `generations`.
- `20260423_pr5_telegram_user_fields.sql` - добавляет `first_name`, `username`.
- `20260424_pr6_phone_column_trigger.sql` - добавляет `phone`, обновляет trigger создания пользователя.
- `20260505_pr7_email_password_no_free_generations.sql` - обновляет trigger создания пользователя: новые пользователи получают `generations_limit = 0`.

Критично при изменениях:

- Не ломать RLS.
- Не расширять публичный доступ к приватным данным.
- Проверять, что authenticated users видят публичную галерею и свои генерации.
- Проверять, что `generations_used` и `generations_limit` корректно отражаются в UI.

## Деплой

Деплой описан в `.github/workflows/deploy.yml`.

Сценарий:

- Trigger: push в `main` и ручной `workflow_dispatch`.
- Node.js: 20.
- Install: `npm ci`.
- Build: `npm run build`.
- Env для build берется из GitHub Secrets.
- После сборки `dist/index.html` копируется в `dist/404.html` для SPA fallback на GitHub Pages.
- Публикуется папка `dist`.

Особенности GitHub Pages:

- Роутинг работает через `BrowserRouter`.
- Для прямых URL вроде `/try` и `/cabinet` нужен `404.html` fallback.
- `public/CNAME` должен попадать в `dist` при сборке Vite.

## Проверенные Риски

- Если отсутствуют `VITE_SUPABASE_URL` или `VITE_SUPABASE_ANON_KEY`, `src/lib/supabase.js` пишет ошибку в console, но все равно вызывает `createClient`.
- Если отсутствует `VITE_WEBHOOK_URL`, генерация на `/try` упадет на `fetch`.
- В `PhotoUpload` при замене файла может оставаться старый object URL, если файл заменили без очистки.
- Логика preview в `GalleryPage` и `MyGenerationsPage` дублируется.
- `vercel.json.bak` выглядит как остаток после миграции с Vercel.
- Локальная проверка `npm run build` в Codex-среде ранее не запускалась, потому что `npm` не был доступен и `node_modules` отсутствовал.

## Правила Работы

- Не переписывать проект без необходимости.
- Новые страницы добавлять в `src/pages` и регистрировать маршрут в `src/App.jsx`.
- Общие UI-паттерны выносить в `src/components`.
- Supabase/auth/profile-логику держать в `src/lib`.
- Новые изменения БД оформлять отдельной миграцией в `supabase/migrations`.
- Перед изменениями auth, генерации, лимитов и деплоя проверять полный пользовательский сценарий.
- Не коммитить `.env`, реальные ключи, реальные webhook URL и любые private secrets.
- При изменении GitHub Pages деплоя проверять прямые URL SPA.
- При изменении генерации проверять:
  - неавторизованный пользователь не может генерировать;
  - пользователь без лимита не может генерировать;
  - две картинки отправляются на webhook;
  - результат отображается и скачивается.

## Где Смотреть Историю И Планы

- Проверенные изменения и решения фиксируются в `project-docs/PROJECT_LOG.md`.
- Текущие планы и следующие задачи фиксируются в `project-docs/ROADMAP.md`.
