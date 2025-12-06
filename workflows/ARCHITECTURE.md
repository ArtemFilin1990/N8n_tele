# 🗺️ Архитектура EvaRoomBot Workflow

## Визуальная схема workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TELEGRAM TRIGGER                             │
│  Принимает входящие сообщения и callback-запросы от Telegram        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW CONFIGURATION                            │
│  Хранит конфигурацию: DaData API URL, Token, Secret                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SESSION STATE (FSM)                           │
│  Управляет состоянием пользователя: IDLE, MENU, WAIT_INN и др.      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          ROUTER (SWITCH)                             │
│  Разделяет входящие сообщения по типу                               │
└─────┬────────────────────┬────────────────────┬─────────────────────┘
      │                    │                    │
      │ Commands           │ Callbacks          │ Text Search
      │ (/start, /help)    │ (inline buttons)   │ (ИНН для проверки)
      ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────────┐
│   SEND       │    │   ROUTE ACTIONS  │    │  DADATA FIND        │
│   WELCOME    │    │    (SWITCH)      │    │  COMPANY            │
│   MENU       │    │                  │    │                      │
│              │    │  5 кнопок:       │    │  HTTP POST запрос   │
│ Показывает   │    │  ├─check_company │    │  к DaData API       │
│ главное меню │    │  ├─score_company │    └──────┬───────────────┘
│ с кнопками   │    │  ├─check_person  │           │
└──────────────┘    │  ├─check_contract│           ▼
                    │  └─about_bot     │    ┌──────────────────────┐
                    └──────┬───────────┘    │  CALCULATE SCORING   │
                           │                │                      │
                    ┌──────┴───────────┐    │  • Базовая оценка: 50│
                    │                  │    │  • Применение 30+    │
                    ▼                  ▼    │    критериев         │
            ┌───────────────┐  ┌─────────┐ │  • Нормализация 0-100│
            │   ASK INN     │  │  SEND   │ │  • Определение уровня│
            │   FOR CHECK/  │  │  ABOUT  │ │    риска             │
            │   SCORING     │  │  INFO   │ │  • Формирование      │
            │               │  │         │ │    маркеров          │
            │ Запрашивает   │  │ Инфо о  │ └──────┬───────────────┘
            │ ввод ИНН      │  │ боте    │        │
            └───────────────┘  └─────────┘        ▼
                                          ┌──────────────────────┐
                                          │  SEND SCORING        │
                                          │  RESULT              │
                                          │                      │
                                          │  Форматирует и       │
                                          │  отправляет отчет:   │
                                          │  • Компания          │
                                          │  • Реквизиты         │
                                          │  • Оценка 0-100      │
                                          │  • Уровень риска     │
                                          │  • Рекомендации      │
                                          │  • Маркеры           │
                                          └──────────────────────┘
```

## Поток данных

### 1. Пользователь отправляет /start

```
[Telegram] → [Trigger] → [Config] → [Session State]
                                    (state = MENU)
                                           ↓
                                    [Router: Commands]
                                           ↓
                                    [Send Welcome Menu]
                                           ↓
                                    [Telegram Bot] → Пользователь видит меню
```

### 2. Пользователь нажимает "📊 Скоринг контрагента"

```
[Telegram] → [Trigger] → [Config] → [Session State]
                                    (state = WAIT_INN)
                                           ↓
                                    [Router: Callbacks]
                                           ↓
                                    [Route Actions: score_company]
                                           ↓
                                    [Ask INN for Scoring]
                                           ↓
                                    [Telegram Bot] → Просит ввести ИНН
```

### 3. Пользователь вводит ИНН

```
[Telegram] → [Trigger] → [Config] → [Session State]
                                    (state = WAIT_INN)
                                           ↓
                                    [Router: Text Search]
                                           ↓
                                    [DaData Find Company]
                                    (POST запрос с ИНН)
                                           ↓
                                    [Calculate Scoring]
                                    (Анализ 30+ критериев)
                                           ↓
                                    [Send Scoring Result]
                                    (Форматированный отчет)
                                           ↓
                                    [Telegram Bot] → Отчет пользователю
```

## Структура узлов (Nodes)

### Input Nodes (Входные)

| ID | Тип | Назначение |
|----|-----|-----------|
| telegram-trigger-001 | Telegram Trigger | Получение сообщений |
| workflow-config-001 | Set | Конфигурация |

### Processing Nodes (Обработка)

| ID | Тип | Назначение |
|----|-----|-----------|
| session-state-001 | Function Item | FSM управление |
| router-001 | Switch | Маршрутизация |
| route-actions-001 | Switch | Обработка callbacks |
| dadata-find-company-001 | HTTP Request | Запрос к DaData |
| calculate-scoring-001 | Code | Расчет скоринга |

### Output Nodes (Выходные)

| ID | Тип | Назначение |
|----|-----|-----------|
| send-welcome-menu-001 | Telegram | Главное меню |
| ask-inn-check-001 | Telegram | Запрос ИНН (проверка) |
| ask-inn-score-001 | Telegram | Запрос ИНН (скоринг) |
| ask-person-data-001 | Telegram | Запрос данных физлица |
| ask-contract-data-001 | Telegram | Запрос реквизитов |
| send-about-info-001 | Telegram | Информация о боте |
| send-scoring-result-001 | Telegram | Результат скоринга |
| send-company-info-001 | Telegram | Информация о компании |

## Соединения (Connections)

```
Telegram Trigger
    └─> Workflow Configuration
            └─> Session State
                    └─> Router
                            ├─> [Commands] → Send Welcome Menu
                            ├─> [Callbacks] → Route Actions
                            │                       ├─> Ask INN Check
                            │                       ├─> Ask INN Scoring
                            │                       ├─> Ask Person Data
                            │                       ├─> Ask Contract Data
                            │                       └─> Send About Info
                            └─> [Text Search] → DaData Find Company
                                                        └─> Calculate Scoring
                                                                └─> Send Scoring Result
```

## FSM (Finite State Machine)

```
┌─────────┐
│  IDLE   │ ◄──────────────┐
└────┬────┘                │
     │                     │
     │ /start или /help    │ Таймаут 24 часа
     ▼                     │
┌─────────┐                │
│  MENU   │ ───────────────┤
└────┬────┘                │
     │                     │
     │ Нажата кнопка       │
     ▼                     │
┌──────────────┐           │
│  WAIT_INN    │ ──────────┤
└──────────────┘           │
     │                     │
     │ Введен ИНН          │
     │ Выполнен скоринг    │
     └─────────────────────┘
```

### Состояния

| Состояние | Описание | Триггеры входа | Триггеры выхода |
|-----------|----------|----------------|-----------------|
| IDLE | Покой | Старт, таймаут | Команда /start |
| MENU | Главное меню | /start, /help | Нажатие кнопки |
| WAIT_INN | Ожидание ИНН | check_company, score_company | Ввод ИНН, /start |
| WAIT_PERSON | Ожидание данных физлица | check_person | Ввод данных, /start |
| WAIT_CONTRACT | Ожидание реквизитов | check_contract | Ввод реквизитов, /start |

## Обработка данных

### Формат входящих данных (Telegram)

```json
{
  "message": {
    "chat": {
      "id": 123456789
    },
    "text": "/start"
  }
}
```

или

```json
{
  "callback_query": {
    "data": "score_company",
    "message": {
      "chat": {
        "id": 123456789
      }
    }
  }
}
```

### Формат запроса к DaData

```json
{
  "query": "7707083893"
}
```

### Формат ответа от DaData

```json
{
  "suggestions": [
    {
      "data": {
        "inn": "7707083893",
        "ogrn": "1027700132195",
        "name": {
          "full_with_opf": "ПАО СБЕРБАНК"
        },
        "state": {
          "status": "ACTIVE",
          "registration_date": "1991-06-30"
        },
        "capital": {
          "value": 87760000000
        },
        "employees": {
          "value": 228000
        }
      }
    }
  ]
}
```

### Формат выходных данных (Результат скоринга)

```json
{
  "found": true,
  "company": "ПАО СБЕРБАНК",
  "inn": "7707083893",
  "ogrn": "1027700132195",
  "score": 100,
  "level": "🟢 Наивысшая надёжность",
  "riskLevel": "Минимальный",
  "recommendation": "Контрагент заслуживает максимального доверия.",
  "paymentTerms": "Отсрочка до 60 дней",
  "markers": {
    "red": [],
    "yellow": [],
    "green": [
      "✅ Большой опыт: 33 лет (+10)",
      "✅ Системно значимая компания (+5)",
      ...
    ]
  }
}
```

## Критические точки

### 1. Креденшалы
- **Telegram Bot Token** - в credentials n8n
- **DaData Token/Secret** - в environment variables

### 2. Webhook
- Должен быть зарегистрирован в Telegram
- Требует HTTPS в production
- URL формат: `https://domain.com/webhook/evaroombot`

### 3. FSM хранение
- В `staticData.userStates`
- Очистка каждые 24 часа
- Сбрасывается при перезапуске workflow

## Ограничения и квоты

### DaData API
- Бесплатно: 10,000 запросов/день
- Платно: от 50,000 запросов/день

### Telegram API
- 30 сообщений/секунду на бота
- 1 сообщение/секунду на пользователя
- 4096 символов в сообщении

### n8n
- Cloud: ограничения по тарифу
- Self-hosted: зависит от ресурсов сервера

---

**Версия:** 1.0  
**Последнее обновление:** Декабрь 2024  
**Статус:** Документация актуальна
