"""
Авторизация клиентов через SMS-код.
POST / action=send — отправить код на номер телефона.
POST / action=verify — проверить код, получить токен сессии.
POST / action=check — проверить валидность токена.
POST / action=logout — завершить сессию.
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

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите action: send, verify, check, logout"}, ensure_ascii=False)}