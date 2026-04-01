"""
SMS отправка через SMS.RU API.
POST / — отправить SMS на номер(а).
GET /balance — проверить баланс.
GET /status?sms_id=... — проверить статус SMS.
"""
import json
import os
import urllib.request
import urllib.parse

API_KEY = os.environ.get("SMS_RU_API_KEY", "")
SMS_RU_BASE = "https://sms.ru"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def sms_ru_request(path: str, params: dict) -> dict:
    """Выполняет запрос к SMS.RU API."""
    params["api_id"] = API_KEY
    params["json"] = 1
    url = f"{SMS_RU_BASE}{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    if not API_KEY:
        return {
            "statusCode": 500,
            "headers": CORS,
            "body": json.dumps({"error": "SMS_RU_API_KEY не настроен"}, ensure_ascii=False),
        }

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")

    # GET /balance — баланс аккаунта
    if method == "GET" and "/balance" in path:
        try:
            result = sms_ru_request("/my/balance", {})
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps(result, ensure_ascii=False),
            }
        except Exception as e:
            return {
                "statusCode": 500,
                "headers": CORS,
                "body": json.dumps({"error": str(e)}, ensure_ascii=False),
            }

    # GET /status?sms_id=... — статус SMS
    if method == "GET" and "/status" in path:
        query = event.get("queryStringParameters") or {}
        sms_id = query.get("sms_id", "")
        if not sms_id:
            return {
                "statusCode": 400,
                "headers": CORS,
                "body": json.dumps({"error": "Укажите sms_id"}, ensure_ascii=False),
            }
        try:
            result = sms_ru_request("/sms/status", {"sms_id": sms_id})
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps(result, ensure_ascii=False),
            }
        except Exception as e:
            return {
                "statusCode": 500,
                "headers": CORS,
                "body": json.dumps({"error": str(e)}, ensure_ascii=False),
            }

    # POST / — отправить SMS
    if method == "POST":
        try:
            body = json.loads(event.get("body") or "{}")
        except Exception:
            return {
                "statusCode": 400,
                "headers": CORS,
                "body": json.dumps({"error": "Некорректный JSON"}, ensure_ascii=False),
            }

        to = body.get("to", "")        # номер или список номеров через запятую
        msg = body.get("msg", "")      # текст сообщения
        from_name = body.get("from", "")  # имя отправителя (опционально)
        test = body.get("test", 0)     # 1 = тестовый режим (не списывает)

        if not to or not msg:
            return {
                "statusCode": 400,
                "headers": CORS,
                "body": json.dumps({"error": "Укажите 'to' и 'msg'"}, ensure_ascii=False),
            }

        params = {"to": to, "msg": msg}
        if from_name:
            params["from"] = from_name
        if test:
            params["test"] = 1

        try:
            result = sms_ru_request("/sms/send", params)
            status_code = 200 if result.get("status") == "OK" else 400
            return {
                "statusCode": status_code,
                "headers": CORS,
                "body": json.dumps(result, ensure_ascii=False),
            }
        except Exception as e:
            return {
                "statusCode": 500,
                "headers": CORS,
                "body": json.dumps({"error": str(e)}, ensure_ascii=False),
            }

    return {
        "statusCode": 404,
        "headers": CORS,
        "body": json.dumps({"error": "Маршрут не найден"}, ensure_ascii=False),
    }
