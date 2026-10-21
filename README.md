# FlipPilot

[![CI](https://github.com/Nap20192/flippilot/actions/workflows/ci.yml/badge.svg)](https://github.com/Nap20192/flippilot/actions/workflows/ci.yml)

Инструмент для перекупщиков автомобилей: берёт объявление из Германии и считает, сколько реально заработаешь на перепродаже в Чехии.

- **Полная себестоимость**: транспорт, регистрация, ремонт, хранение, сборы, НДС
- **Потолок цены**: сколько максимум можно заплатить под целевой ROI
- **Три сценария**: консервативный, ожидаемый, оптимистичный, плюс анализ чувствительности
- **Deal Score, риск и уверенность** считаются отдельно; нехватка данных снижает уверенность и никогда не считается хорошим знаком
- **Отбор сделок под стратегию**: капитал, резерв, размер позиции, минимальная прибыль, допустимый убыток, риск
- **Watchlist** с историей цен, **алерты**, **план ремонта**, **фото машин**

> Объявления и рыночные цены сейчас демонстрационные и вымышленные. Курсы валют фиксированные. Реальные площадки, проверка истории авто и оплата пока не подключены.

## Структура

| Папка | Что это | Стек |
|---|---|---|
| [`backend/`](backend/) | API: расчёты, анализ, аккаунты, хранение, фото | Go, SQLite |
| [`web/`](web/) | веб-приложение | React, Vite, TypeScript |
| [`mobile/`](mobile/) | приложение для iOS, Android и веба | React Native, Expo |
| [`prototype/`](prototype/) | исходный прототип одним HTML-файлом | HTML, JS |

Расчётный движок бэкенда перенесён из прототипа один в один. Совпадение проверяется тестами: эталонные результаты в `backend/internal/analysis/testdata/golden.json` получены из оригинального JS.

## Быстрый старт

Нужны Go 1.26+ и Node.js 24+.

Бэкенд на `http://localhost:8080`:

```bash
cd backend
go run ./cmd/api
```

Веб на `http://localhost:5173` (запросы `/api` проксируются на бэкенд):

```bash
cd web
npm install
npm run dev
```

Мобильное приложение (без настройки работает на встроенных демо-данных):

```bash
cd mobile
npm install
npm start
```

Прототип открывается просто в браузере: `prototype/flippilot.html`.

## Настройки бэкенда

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `ADDR` | `:8080` | адрес сервера |
| `DB_PATH` | `flippilot.db` | файл SQLite |
| `PHOTOS_DIR` | `photos` | папка для фото |
| `CORS_ORIGINS` | `*` | разрешённые Origin через запятую |
| `AI_SERVICE_URL` | пусто | адрес ИИ-сервиса; пусто = ИИ отключён |

Для веба адрес API задаётся через `VITE_API_URL`, для мобильного приложения через `EXPO_PUBLIC_API_URL`.

Полный список эндпоинтов — в [`backend/README.md`](backend/README.md).

## Деплой (Railway)

Проект `flippilot` на Railway подключён к этому репозиторию: каждый пуш в `master` пересобирает и выкатывает то, что изменилось.

| Сервис | Корневая папка | Что собирается | Адрес |
|---|---|---|---|
| `flippilot-web` | `web/` | `npm run build`, раздача статики `serve` с запасным `index.html` для маршрутов | https://flippilot-web-production.up.railway.app |
| `flippilot-api` | `backend/` | `Dockerfile.railway` (копия `Dockerfile` без `VOLUME`, его Railway не принимает) | https://flippilot-api-production.up.railway.app |

- Сервис пересобирается, только если изменились файлы в его папке (watch paths `/web/**` и `/backend/**`).
- У `flippilot-api` подключён том `/data` (SQLite и фото), проверка здоровья `/healthz`.
- Переменные `flippilot-api`: `PORT=8080`, `ADDR=:8080`, `DB_PATH=/data/flippilot.db`, `PHOTOS_DIR=/data/photos`, `RAILWAY_RUN_UID=0` (чтобы писать в том), `RAILWAY_DOCKERFILE_PATH=Dockerfile.railway`, при желании `CORS_ORIGINS`.
- Переменная `flippilot-web`: `VITE_API_URL` с адресом API. Она вшивается при сборке, поэтому после её изменения нужен новый деплой.
- Ручной выкат без пуша: `npx @railway/cli up --service flippilot-web` из папки `web/`.

## Тесты

```bash
cd backend && go test ./...
```

```bash
cd web && npm run build
```

```bash
cd mobile && npm run typecheck
```

Всё это же запускается в GitHub Actions на каждый push и pull request.

## Деплой

- Бэкенд: `backend/Dockerfile` (данные в томе `/data`) или `backend/Dockerfile.railway`
- Веб и мобильный веб: статическая сборка в `dist/`, для Railway есть `railway.json`, для Vercel и Netlify настроены редиректы

## Дальше

- **ИИ-сервис на Python**: разбор текста объявлений и фото (скрытые дефекты, следы ремонта, ржавчина). Контракт уже описан в [`backend/README.md`](backend/README.md#контракт-для-python-ии-сервиса), бэкенд проксирует запросы на `AI_SERVICE_URL`
- подключение реальных площадок и живых курсов валют
- уведомления по алертам
