"""
Авторизация клиентов через SMS-код и Яндекс OAuth.
POST / action=send — отправить OTP на телефон.
POST / action=verify — проверить OTP, получить токен.
POST / action=check — проверить токен.
POST / action=logout — выйти.
POST / action=yandex_token — обменять Яндекс code на токен сессии.
GET  / action=yandex_url — получить URL для редиректа на Яндекс.
"""
import json
import os
import random
import secrets
import urllib.request
import urllib.parse
import psycopg2
from psycopg2.extras import RealDictCursor

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p21156567_oil_change_tracker")
SMS_API_KEY = os.environ.get("SMS_RU_API_KEY", "")
SMS_RU_BASE = "https://sms.ru"
YANDEX_CLIENT_ID = os.environ.get("YANDEX_CLIENT_ID", "")
YANDEX_CLIENT_SECRET = os.environ.get("YANDEX_CLIENT_SECRET", "")
YANDEX_REDIRECT_URI = "https://functions.poehali.dev/942caddf-e666-440d-9d89-682d8a35bae3/yandex/callback"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)


def send_sms(phone: str, message: str) -> dict:
    params = {
        "api_id": SMS_API_KEY,
        "to": phone,
        "msg": message,
        "json": 1,
    }
    url = f"{SMS_RU_BASE}/sms/send?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def normalize_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if digits.startswith("8") and len(digits) == 11:
        digits = "7" + digits[1:]
    if not digits.startswith("7"):
        digits = "7" + digits
    return digits


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    raw_body = event.get("body") or "{}"
    try:
        body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
        if isinstance(body, str):
            body = json.loads(body)
    except Exception:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректный JSON"}, ensure_ascii=False)}

    if not isinstance(body, dict):
        body = {}

    action = body.get("action", "")

    # action=send — отправить OTP
    if action == "send":
        phone_raw = body.get("phone", "").strip()
        if not phone_raw:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите номер телефона"}, ensure_ascii=False)}

        phone = normalize_phone(phone_raw)
        code = str(random.randint(100000, 999999))

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"DELETE FROM {SCHEMA}.auth_sessions WHERE phone = %s AND verified_at IS NULL",
            (phone,)
        )
        cur.execute(
            f"""INSERT INTO {SCHEMA}.auth_sessions (phone, code, expires_at)
                VALUES (%s, %s, NOW() + INTERVAL '10 minutes')""",
            (phone, code)
        )
        conn.commit()
        cur.close()
        conn.close()

        try:
            sms_result = send_sms(phone, f"АвтоПилот: ваш код входа {code}")
            sms_ok = sms_result.get("status") == "OK"
        except Exception as e:
            sms_ok = False
            sms_result = {"error": str(e)}

        if not sms_ok:
            return {
                "statusCode": 500,
                "headers": CORS,
                "body": json.dumps({"error": "Не удалось отправить SMS", "detail": sms_result}, ensure_ascii=False),
            }

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({"ok": True, "phone": phone}, ensure_ascii=False),
        }

    # action=verify — проверить код
    if action == "verify":
        phone_raw = body.get("phone", "").strip()
        code = body.get("code", "").strip()

        if not phone_raw or not code:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите телефон и код"}, ensure_ascii=False)}

        phone = normalize_phone(phone_raw)

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id FROM {SCHEMA}.auth_sessions
                WHERE phone = %s AND code = %s AND verified_at IS NULL AND expires_at > NOW()
                ORDER BY created_at DESC LIMIT 1""",
            (phone, code)
        )
        row = cur.fetchone()

        if not row:
            cur.close()
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неверный или устаревший код"}, ensure_ascii=False)}

        token = secrets.token_hex(32)
        cur.execute(
            f"""UPDATE {SCHEMA}.auth_sessions
                SET verified_at = NOW(), token = %s
                WHERE id = %s""",
            (token, row["id"])
        )
        conn.commit()
        cur.close()
        conn.close()

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({"ok": True, "token": token, "phone": phone}, ensure_ascii=False),
        }

    # action=check — проверить токен
    if action == "check":
        token = body.get("token", "").strip()
        if not token:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"ok": False}, ensure_ascii=False)}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT phone FROM {SCHEMA}.auth_sessions WHERE token = %s AND verified_at IS NOT NULL",
            (token,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"ok": False}, ensure_ascii=False)}

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({"ok": True, "phone": row["phone"]}, ensure_ascii=False),
        }

    # action=logout — выход
    if action == "logout":
        token = body.get("token", "").strip()
        if token:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {SCHEMA}.auth_sessions WHERE token = %s", (token,))
            conn.commit()
            cur.close()
            conn.close()

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({"ok": True}, ensure_ascii=False),
        }

    # action=yandex_url — получить ссылку для входа через Яндекс
    if action == "yandex_url":
        state = secrets.token_hex(16)
        params = {
            "response_type": "code",
            "client_id": YANDEX_CLIENT_ID,
            "redirect_uri": YANDEX_REDIRECT_URI,
            "state": state,
        }
        url = "https://oauth.yandex.ru/authorize?" + urllib.parse.urlencode(params)
        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({"ok": True, "url": url, "state": state}, ensure_ascii=False),
        }

    # action=yandex_token — обменять code на токен сессии
    if action == "yandex_token":
        code = body.get("code", "").strip()
        if not code:
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "Не передан code"}, ensure_ascii=False)}

        # Обмениваем code на access_token Яндекса
        token_params = urllib.parse.urlencode({
            "grant_type": "authorization_code",
            "code": code,
            "client_id": YANDEX_CLIENT_ID,
            "client_secret": YANDEX_CLIENT_SECRET,
            "redirect_uri": YANDEX_REDIRECT_URI,
        }).encode("utf-8")

        token_req = urllib.request.Request(
            "https://oauth.yandex.ru/token",
            data=token_params,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        try:
            with urllib.request.urlopen(token_req, timeout=10) as resp:
                token_data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            return {"statusCode": 500, "headers": CORS,
                    "body": json.dumps({"error": f"Ошибка получения токена Яндекс: {e}"}, ensure_ascii=False)}

        ya_token = token_data.get("access_token")
        if not ya_token:
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "Яндекс не вернул токен"}, ensure_ascii=False)}

        # Получаем профиль пользователя
        info_req = urllib.request.Request(
            "https://login.yandex.ru/info?format=json",
            headers={"Authorization": f"OAuth {ya_token}"},
        )
        try:
            with urllib.request.urlopen(info_req, timeout=10) as resp:
                user_info = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            return {"statusCode": 500, "headers": CORS,
                    "body": json.dumps({"error": f"Ошибка получения профиля: {e}"}, ensure_ascii=False)}

        ya_id = str(user_info.get("id", ""))
        display_name = user_info.get("display_name") or user_info.get("login", "")
        # Берём телефон если есть, иначе используем yandex_id как идентификатор
        default_phone = user_info.get("default_phone", {})
        phone = default_phone.get("number", "") if isinstance(default_phone, dict) else ""
        identifier = phone if phone else f"yandex:{ya_id}"

        # Создаём сессию
        session_token = secrets.token_hex(32)
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.auth_sessions (phone, code, token, verified_at, expires_at)
                VALUES (%s, %s, %s, NOW(), NOW() + INTERVAL '30 days')""",
            (identifier, "yandex", session_token)
        )
        conn.commit()
        cur.close()
        conn.close()

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({
                "ok": True,
                "token": session_token,
                "phone": identifier,
                "name": display_name,
            }, ensure_ascii=False),
        }

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите action: send, verify, check, logout, yandex_url, yandex_token"}, ensure_ascii=False)}