# Конфигурация EvaRoomBot

## 🔑 Переменные окружения для n8n

Создайте файл `.env` в директории n8n или установите переменные окружения:

```env
# DaData API ключи
DADATA_TOKEN=your_dadata_api_token_here
DADATA_SECRET=your_dadata_secret_key_here

# Telegram Bot (опционально, если не используете credentials в UI)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# n8n настройки (опционально)
GENERIC_TIMEZONE=Europe/Moscow
WEBHOOK_URL=https://your-domain.com/
```

## 📝 Получение DaData API ключей

1. Зарегистрируйтесь на [dadata.ru](https://dadata.ru)
2. Перейдите в раздел **API ключи**
3. Скопируйте:
   - **API ключ** (Token) → `DADATA_TOKEN`
   - **Secret ключ** → `DADATA_SECRET`

**Бесплатный тариф:**
- 10,000 запросов/день
- Достаточно для тестирования и небольших проектов

**Платные тарифы:**
- От 2,000 ₽/месяц
- До 100,000 запросов/день
- Приоритетная поддержка

## 🤖 Получение Telegram Bot Token

1. Найдите [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям:
   - Введите имя бота (например: "EvaRoom Check Bot")
   - Введите username бота (должен заканчиваться на "bot", например: "EvaRoomCheckBot")
4. Скопируйте полученный токен

**Пример токена:**
```
123456789:ABCdefGHIjklMNOpqrsTUVwxyz1234567890
```

## 🔧 Docker Compose конфигурация

Если вы используете Docker Compose для запуска n8n:

```yaml
version: "3.7"

services:
  n8n:
    image: n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      # Основные настройки
      - GENERIC_TIMEZONE=Europe/Moscow
      - TZ=Europe/Moscow
      
      # Webhook URL (замените на ваш домен)
      - WEBHOOK_URL=https://your-domain.com/
      
      # DaData API
      - DADATA_TOKEN=${DADATA_TOKEN}
      - DADATA_SECRET=${DADATA_SECRET}
      
      # Telegram Bot (опционально)
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      
      # n8n настройки (опционально)
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      
      # Персистентность данных
      - N8N_USER_FOLDER=/home/node/.n8n
      
    volumes:
      - n8n_data:/home/node/.n8n
      
    networks:
      - n8n-network

volumes:
  n8n_data:
    driver: local

networks:
  n8n-network:
    driver: bridge
```

**Файл `.env` для Docker Compose:**
```env
DADATA_TOKEN=your_token_here
DADATA_SECRET=your_secret_here
TELEGRAM_BOT_TOKEN=your_bot_token_here
N8N_PASSWORD=your_secure_password_here
```

## 🌐 Настройка домена и HTTPS

### С Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL сертификаты (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Увеличиваем таймауты для webhook
    proxy_read_timeout 300;
    proxy_connect_timeout 300;
    proxy_send_timeout 300;
    
    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

### С Caddy (проще)

```
your-domain.com {
    reverse_proxy localhost:5678
}
```

## 📱 Настройка Telegram Webhook

После запуска n8n и получения webhook URL:

### Метод 1: Через curl

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/webhook/evaroombot",
    "max_connections": 40,
    "allowed_updates": ["message", "callback_query"]
  }'
```

### Метод 2: Через браузер

Откройте в браузере:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-domain.com/webhook/evaroombot
```

### Проверка webhook

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

**Ожидаемый ответ:**
```json
{
  "ok": true,
  "result": {
    "url": "https://your-domain.com/webhook/evaroombot",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40,
    "ip_address": "1.2.3.4"
  }
}
```

### Удаление webhook (если нужно)

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

## 🔒 Безопасность

### 1. Защита переменных окружения

**НЕ КОММИТЬТЕ** `.env` файл в Git!

Добавьте в `.gitignore`:
```
.env
.env.local
.env.production
```

### 2. Настройка базовой аутентификации n8n

```env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_secure_password
```

### 3. Ограничение доступа к webhook

В n8n можно настроить webhook secret для дополнительной безопасности.

### 4. Регулярное обновление токенов

- Меняйте DaData токены раз в 6 месяцев
- Меняйте Telegram Bot Token при подозрении на утечку
- Используйте сильные пароли для n8n

## 📊 Лимиты и квоты

### DaData API

| Тариф | Запросов/день | Цена |
|-------|---------------|------|
| Бесплатный | 10,000 | 0 ₽ |
| Стартовый | 50,000 | 2,000 ₽/мес |
| Бизнес | 100,000 | 5,000 ₽/мес |
| Корпоративный | Безлимит | По запросу |

### Telegram API

- **Максимум сообщений:** 30 сообщений/секунду
- **Максимум сообщений на пользователя:** 1 сообщение/секунду
- **Размер сообщения:** До 4096 символов

## 🧪 Тестирование конфигурации

### 1. Проверка DaData API

```bash
curl -X POST https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party \
  -H "Authorization: Token ${DADATA_TOKEN}" \
  -H "X-Secret: ${DADATA_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"query": "7707083893"}'
```

**Ожидаемый ответ:** JSON с информацией о Сбербанке

### 2. Проверка Telegram Bot

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
```

**Ожидаемый ответ:**
```json
{
  "ok": true,
  "result": {
    "id": 123456789,
    "is_bot": true,
    "first_name": "EvaRoomBot",
    "username": "EvaRoomCheckBot"
  }
}
```

### 3. Проверка n8n webhook

```bash
curl -X POST "https://your-domain.com/webhook-test/evaroombot" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## ❓ FAQ

### Q: Как узнать webhook URL в n8n?

A: 
1. Откройте workflow в n8n
2. Кликните на ноду "Telegram Trigger"
3. Webhook URL отображается в настройках ноды

### Q: Можно ли использовать localhost для webhook?

A: Нет, Telegram требует публичный HTTPS URL. Используйте:
- n8n.cloud (бесплатный план доступен)
- VPS с доменом и SSL
- ngrok для тестирования (временное решение)

### Q: Как использовать ngrok для тестирования?

A:
```bash
# Установите ngrok
npm install -g ngrok

# Запустите ngrok
ngrok http 5678

# Используйте полученный HTTPS URL для webhook
# Пример: https://abc123.ngrok.io/webhook/evaroombot
```

### Q: Бот не отвечает, что делать?

A: Проверьте:
1. ✅ Workflow активен в n8n
2. ✅ Webhook зарегистрирован в Telegram
3. ✅ DaData токены корректны
4. ✅ Нет ошибок в логах n8n

## 📞 Поддержка

Если возникли проблемы с конфигурацией:

- 📧 Email: support@evacorebot.com
- 💬 Telegram: [@EvaCoreBot](https://t.me/EvaCoreBot)
- 🐛 GitHub Issues: [ArtemFilin1990/N8n_tele/issues](https://github.com/ArtemFilin1990/N8n_tele/issues)

---

**Версия:** 1.0  
**Последнее обновление:** Декабрь 2024
