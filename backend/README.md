# FlipPilot API

Бэкенд на Go для FlipPilot: расчёт прибыли при перепродаже авто (DE → CZ и другие маршруты), оценка риска, отбор сделок под стратегию, watchlist, алерты, планировщик ремонта, фото машин. Расчёты перенесены из фронта один в один, совпадение проверяется тестами.

- Go 1.26, только стандартный `net/http`
- SQLite через `modernc.org/sqlite` (без CGO)
- Авторизация: email + пароль (bcrypt), Bearer-токен (хранится только его SHA-256)
- ИИ подключается отдельным Python-сервисом по HTTP (`AI_SERVICE_URL`)

## Запуск

```bash
go run ./cmd/api
```

| Переменная       | По умолчанию    | Назначение                                       |
|------------------|-----------------|--------------------------------------------------|
| `ADDR`           | `:8080`         | адрес сервера                                    |
| `DB_PATH`        | `flippilot.db`  | файл SQLite                                      |
| `PHOTOS_DIR`     | `photos`        | папка для фото                                   |
| `CORS_ORIGINS`   | `*`             | разрешённые Origin через запятую                 |
| `AI_SERVICE_URL` | пусто           | адрес Python ИИ-сервиса; пусто = ИИ отключён     |

```bash
go test ./...
```

```bash
docker build -t flippilot-api .
```

## Структура

```
cmd/api            точка входа
internal/engine    расчёт затрат, прибыли, ROI, потолка цены, валидация
internal/analysis  риски, Deal Score, уверенность, рекомендация, аналоги, ремонт, отбор сделок, алерты
internal/demo      демо-объявления и чешские аналоги (data.json)
internal/domain    общие типы
internal/store     SQLite
internal/photos    обработка и хранение фото
internal/ai        HTTP-клиент к ИИ-сервису
internal/httpapi   маршруты и обработчики
```

## API

Все суммы в EUR. Пустая строка или `null` в числовом поле значит «посчитать по умолчанию», явный `0` значит ноль.

Публичные (с токеном используют настройки пользователя):

| Метод | Путь | Что делает |
|---|---|---|
| GET  | `/healthz` | статус сервера и ИИ-сервиса |
| GET  | `/api/meta` | страны, маршруты, настройки и стратегия по умолчанию |
| POST | `/api/calculate` | калькулятор прибыли: 3 сценария и сетка чувствительности |
| POST | `/api/analyze` | анализ машины: прибыль, риски, score, уверенность, рекомендация |
| POST | `/api/repairs/plan` | план ремонта `{vehicle, confirmed?}` |
| GET  | `/api/listings?q=&country=&make=&maxPrice=&maxKm=` | демо-объявления с анализом |
| GET  | `/api/listings/{id}` | одно объявление |
| GET  | `/api/deals` | отбор под сохранённую стратегию (или стратегию по умолчанию) |
| POST | `/api/deals/screen` | отбор под стратегию из тела запроса |
| POST | `/api/ai/listing-analysis` | разбор объявления ИИ (503, если сервис не подключён) |

Авторизация:

| Метод | Путь |
|---|---|
| POST | `/api/auth/register` `{email, password}` → `{token, user}` |
| POST | `/api/auth/login` |
| POST | `/api/auth/logout` |
| GET  | `/api/me` |

Нужен `Authorization: Bearer <token>`:

| Метод | Путь |
|---|---|
| GET/PUT | `/api/settings` |
| GET/PUT | `/api/deal-rules` |
| GET/POST | `/api/watchlist` (POST `{id:"d0"}` добавляет демо-объявление) |
| PATCH/DELETE | `/api/watchlist/{id}` (PATCH `{note}`) |
| POST | `/api/watchlist/{id}/prices` `{p, d?}` |
| GET/POST | `/api/analyses` (хранятся последние 20) |
| DELETE | `/api/analyses/{id}` |
| GET/POST | `/api/alerts` |
| DELETE | `/api/alerts/{id}` |
| POST | `/api/alerts/{id}/test` (проверка на демо-данных, уведомления не отправляются) |
| GET/POST | `/api/vehicles/{id}/defects` |
| DELETE | `/api/defects/{id}` |
| GET/POST | `/api/vehicles/{id}/photos` |
| PUT | `/api/photos/{id}/main` |
| DELETE | `/api/photos/{id}` |

Ошибки ввода возвращаются как `422 {"error": "invalid input", "details": [...]}`.

## Фото

```bash
curl -H "Authorization: Bearer $TOKEN" -F photos=@front.jpg -F photos=@side.jpg http://localhost:8080/api/vehicles/d0/photos
```

- поле `photos`, до 10 файлов за раз, до 15 МБ каждый, до 30 фото на машину
- принимаются JPEG, PNG, WebP; разрешение до 50 Мп
- фото поворачивается по EXIF, метаданные (включая GPS) удаляются, сохраняется JPEG до 2560 px и превью 480 px
- ответ `201 {"photos": [...], "rejected": [{"file", "error"}]}`; если не сохранилось ни одного файла, `422`
- первое фото машины становится главным; при удалении главного главным становится следующее
- главное фото приходит в `/api/watchlist` и `/api/analyses` в поле `photo`
- картинки отдаются по `GET /api/photos/{id}` и `GET /api/photos/{id}/thumb` без токена, чтобы работал `<img src>`. id случайный (128 бит), поэтому ссылку нельзя подобрать, но любой, у кого она есть, увидит фото

## Контракт для Python ИИ-сервиса

Go проксирует запросы на `AI_SERVICE_URL`. Сервису нужно реализовать два эндпоинта:

`GET /healthz` → `200`

`POST /v1/listing-analysis`

```json
{"vehicle": {"make": "Volkswagen", "model": "Passat", "year": 2017, "km": 214000, "desc": "Motor klopft, export", "...": "..."}}
```

Ответ:

```json
{
  "summary": "Описание упоминает стук двигателя и продажу на экспорт.",
  "flags": [{"level": "r", "text": "Engine knocking mentioned"}],
  "suspectedDefects": [{"name": "Engine noise", "low": 500, "high": 3500, "confidence": "Low", "evidence": "Motor klopft"}],
  "model": "claude-sonnet-5-5"
}
```

`level`: `g` / `a` / `r`. Суммы в EUR.

## Что пока демо

- объявления и чешские аналоги вымышленные (`internal/demo/data.json`)
- курсы валют фиксированные
- импорт по ссылке, проверка истории и оплата не подключены
- `testdata/golden.json` получен из оригинального JS фронта; если поменяются формулы на фронте, его нужно пересоздать
