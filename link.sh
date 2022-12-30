export $(grep -v '^#' .env | xargs)

curl "https://api.telegram.org/bot$TELEGRAM_API_TOKEN/setWebhook?url=$TELEGRAM_WEBHOOK_URL"