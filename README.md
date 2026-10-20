# MessengerFront

Клиент мессенджера на Angular 22. Данные для разработки — статические JSON из
`src/assets/mocks`, отдельного бэкенда нет.

## Локальный запуск

```bash
npm install
npm start        # http://localhost:4200
npm run build    # production-сборка в dist/MessengerFront/browser
```

## Деплой на Netlify

Конфигурация лежит в [`netlify.toml`](netlify.toml), поэтому в UI Netlify
достаточно подключить Git-репозиторий и не заполнять настройки сборки вручную:

- команда сборки: `npm run build`;
- папка публикации: `dist/MessengerFront/browser`;
- Node.js: версия 22 (задана в `netlify.toml`).

Настройки из `netlify.toml` имеют приоритет над тем, что указано в интерфейсе
Netlify. Для клиентского роутинга настроен SPA-fallback: любой путь отдаёт
`index.html` со статусом 200.

Проверка перед пушем — та же команда, что выполнит Netlify:

```bash
npm run build
```

Если она проходит и в `dist/MessengerFront/browser/index.html` появился файл,
сборка на Netlify пройдёт так же.
