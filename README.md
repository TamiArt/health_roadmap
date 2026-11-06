# Life Maps

Локальное приложение для ведения карты жизненных событий, семейной информации и личной медицинской истории.

## Требования

- Node.js 22 или совместимая LTS-версия.
- npm.

## Запуск

```bash
npm install
npm run dev
```

## Проверка типов

```bash
npm run typecheck
```

## Тесты

```bash
npm test
npm run test:e2e
```

Unit-тесты выполняются Vitest. E2E smoke-тесты запускаются Playwright в Chromium; команда автоматически поднимает локальный Vite dev server.

## Production-сборка

```bash
npm run typecheck
npm test
npm run build
```

Сборка создаётся Vite в каталоге `dist/`.

## Технологии и UI

React 18, TypeScript, Vite, Tailwind CSS 4, Motion, Recharts, Lucide, Vitest и Playwright. Интерфейс реализован непосредственно в feature-компонентах на JSX и Tailwind CSS. Неиспользуемый каталог шаблонных shadcn/Radix-компонентов удалён; приложение не зависит от Figma UI-блоков или Figma runtime.

## Текущее состояние

Приложение работает на клиентской стороне. Основные данные пока демонстрационные и хранятся в исходном коде; полноценное постоянное хранилище, backend и авторизация не реализованы. Не используйте демонстрационные медицинские сведения как персональные рекомендации.
