"""
REST API для управления автомобилями пользователя.
GET / — список авто текущего пользователя (по X-User-Id)
POST / с action: create_car, update_car, delete_car, get_entries, save_entry, delete_entry, search_car
"""
import json
import os
import base64
import datetime
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def resp(status, body):
    return {
        'statusCode': status,
        'headers': {'Content-Type': 'application/json', **CORS_HEADERS},
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def get_user_id(event):
    headers = event.get('headers') or {}
    return headers.get('X-User-Id') or headers.get('x-user-id') or 'anonymous'


# ─── Web Push уведомления ──────────────────────────────────────────
def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


def generate_vapid_keys() -> dict:
    """Генерирует пару VAPID-ключей (EC P-256) в base64url."""
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization

    private_key = ec.generate_private_key(ec.SECP256R1())
    priv_bytes = private_key.private_numbers().private_value.to_bytes(32, 'big')
    pub_bytes = private_key.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint,
    )
    return {
        'publicKey': _b64url(pub_bytes),
        'privateKey': _b64url(priv_bytes),
        'subject': 'mailto:admin@avtopilot.app',
    }


def _send_push(subscription: dict, payload: dict) -> tuple:
    """Отправляет один push. Возвращает (ok, status_code)."""
    from pywebpush import webpush, WebPushException

    private_key = os.environ.get('VAPID_PRIVATE_KEY', '')
    subject = os.environ.get('VAPID_SUBJECT', 'mailto:admin@avtopilot.app')
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload, ensure_ascii=False),
            vapid_private_key=private_key,
            vapid_claims={'sub': subject},
        )
        return True, 201
    except WebPushException as e:
        code = getattr(getattr(e, 'response', None), 'status_code', 0) or 0
        print(f"Push failed ({code}): {e}")
        return False, code
    except Exception as e:
        print(f"Push error: {e}")
        return False, 0


def _warning_message(remaining: int, car_name: str) -> dict:
    if remaining <= 0:
        return {'title': 'Срочно! Замена масла',
                'body': f'{car_name}: интервал замены масла превышен. Замените как можно скорее.',
                'tag': 'oil_overdue', 'url': '/'}
    return {'title': 'Скоро замена масла',
            'body': f'{car_name}: осталось {remaining} км до замены масла. Не откладывайте.',
            'tag': 'oil_warning', 'url': '/'}


def handle_push_action(action, body, user_id):
    """Обработка push-действий. Возвращает resp(...) или None, если действие не push."""
    if action == 'generate_vapid':
        return resp(200, generate_vapid_keys())

    if action == 'vapid_public_key':
        return resp(200, {'publicKey': os.environ.get('VAPID_PUBLIC_KEY', '')})

    if action == 'save_subscription':
        sub = body.get('subscription') or {}
        endpoint = sub.get('endpoint')
        keys = sub.get('keys') or {}
        p256dh, auth = keys.get('p256dh'), keys.get('auth')
        if not endpoint or not p256dh or not auth:
            return resp(400, {'ok': False, 'error': 'invalid subscription'})
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
                       VALUES (%s, %s, %s, %s)
                       ON CONFLICT (endpoint) DO UPDATE SET
                         user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth""",
                    (user_id, endpoint, p256dh, auth))
        conn.commit()
        conn.close()
        return resp(200, {'ok': True})

    if action == 'remove_subscription':
        endpoint = body.get('endpoint')
        if endpoint:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("DELETE FROM push_subscriptions WHERE endpoint = %s", (endpoint,))
            conn.commit()
            conn.close()
        return resp(200, {'ok': True})

    if action == 'test_push':
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = %s", (user_id,))
        rows = cur.fetchall()
        conn.close()
        payload = {'title': 'АвтоПилот',
                   'body': 'Серверные напоминания работают! Мы напомним о замене масла вовремя.',
                   'tag': 'test', 'url': '/'}
        sent = 0
        for endpoint, p256dh, auth in rows:
            ok, _ = _send_push({'endpoint': endpoint, 'keys': {'p256dh': p256dh, 'auth': auth}}, payload)
            if ok:
                sent += 1
        return resp(200, {'ok': True, 'sent': sent, 'total': len(rows)})

    if action == 'check_and_send':
        return _check_and_send()

    return None


def _check_and_send():
    """Планировщик: считает остаток до замены и рассылает push тем, кому пора."""
    today = datetime.date.today()
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""SELECT id, user_id, endpoint, p256dh, auth, last_notified_date
                   FROM push_subscriptions""")
    subs = cur.fetchall()

    cur.execute("""
        SELECT c.user_id, c.brand, c.model, c.oil_interval, COALESCE(SUM(e.km), 0)
        FROM cars c
        LEFT JOIN car_entries e ON e.car_id = c.id
        WHERE COALESCE(c.oil_hidden, false) = false
        GROUP BY c.id, c.user_id, c.brand, c.model, c.oil_interval
    """)
    car_rows = cur.fetchall()

    user_min = {}
    for uid, brand, model, oil_interval, total_km in car_rows:
        if not oil_interval or oil_interval <= 0:
            continue
        remaining = int(round(float(oil_interval) - float(total_km)))
        if uid not in user_min or remaining < user_min[uid][0]:
            user_min[uid] = (remaining, f"{brand} {model}")

    sent = 0
    dead = []
    for sub_id, uid, endpoint, p256dh, auth, last_date in subs:
        info = user_min.get(uid)
        if not info:
            continue
        remaining, car_name = info
        if remaining > 300:
            continue
        if last_date == today:
            continue
        ok, code = _send_push({'endpoint': endpoint, 'keys': {'p256dh': p256dh, 'auth': auth}},
                              _warning_message(remaining, car_name))
        if ok:
            sent += 1
            cur.execute("""UPDATE push_subscriptions
                           SET last_notified_date = %s, last_notified_remaining = %s WHERE id = %s""",
                        (today, remaining, sub_id))
        elif code in (404, 410):
            dead.append(endpoint)

    for ep in dead:
        cur.execute("DELETE FROM push_subscriptions WHERE endpoint = %s", (ep,))

    conn.commit()
    conn.close()
    return resp(200, {'ok': True, 'sent': sent, 'removed': len(dead)})


def handler(event: dict, context) -> dict:
    """Обработчик CRUD операций с автомобилями и записями пробега, с изоляцией по user_id."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    user_id = get_user_id(event)

    if method == 'GET':
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT c.id, c.brand, c.model, c.year, c.oil_interval, c.guides, c.custom,
                   cs.specs, c.filters, c.consumables, c.service_intervals, c.oil_hidden
            FROM cars c
            LEFT JOIN car_specs cs ON cs.car_id = c.id
            WHERE c.user_id = %s
            ORDER BY c.created_at
        """, (user_id,))
        rows = cur.fetchall()

        # Загружаем персональные замены пользователя
        car_ids = [row[0] for row in rows]
        resets_map = {}
        if car_ids:
            placeholders = ','.join(['%s'] * len(car_ids))
            cur.execute(f"""
                SELECT car_id, interval_id, last_km, last_date
                FROM service_resets
                WHERE car_id IN ({placeholders}) AND user_id = %s
            """, car_ids + [user_id])
            for r in cur.fetchall():
                resets_map.setdefault(r[0], {})[r[1]] = {
                    'last_km': r[2], 'last_date': str(r[3]) if r[3] else None
                }
        conn.close()

        cars = []
        for row in rows:
            car_id = row[0]
            base_intervals = row[10] if row[10] is not None else []
            user_resets = resets_map.get(car_id, {})
            # Подмешиваем персональные даты/км в каждый интервал
            merged = []
            for interval in base_intervals:
                iid = interval.get('id')
                if iid and iid in user_resets:
                    interval = {**interval, **user_resets[iid]}
                merged.append(interval)
            cars.append({
                'id': car_id, 'brand': row[1], 'model': row[2], 'year': row[3],
                'oilInterval': row[4], 'guides': row[5] if row[5] is not None else [],
                'custom': row[6], 'specs': row[7] if row[7] is not None else [],
                'filters': row[8] if row[8] is not None else [],
                'consumables': row[9] if row[9] is not None else [],
                'serviceIntervals': merged,
                'oilHidden': bool(row[11]),
            })
        return resp(200, cars)

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        action = body.get('action', 'create_car')

        push_resp = handle_push_action(action, body, user_id)
        if push_resp is not None:
            return push_resp

        if action == 'create_car':
            car_id = body['id']
            guides = json.dumps(body.get('guides', []), ensure_ascii=False)
            specs = json.dumps(body.get('specs', []), ensure_ascii=False)
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO cars (id, brand, model, year, oil_interval, guides, custom, user_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    brand = EXCLUDED.brand, model = EXCLUDED.model, year = EXCLUDED.year,
                    oil_interval = EXCLUDED.oil_interval, guides = EXCLUDED.guides,
                    user_id = EXCLUDED.user_id
            """, (car_id, body['brand'], body['model'], body['year'],
                  body.get('oilInterval', 5000), guides, body.get('custom', True), user_id))
            cur.execute("""
                INSERT INTO car_specs (car_id, specs) VALUES (%s, %s)
                ON CONFLICT (car_id) DO UPDATE SET specs = EXCLUDED.specs
            """, (car_id, specs))
            conn.commit()
            conn.close()
            return resp(200, {'ok': True, 'id': car_id})

        if action == 'update_car':
            car_id = body['id']
            fields, values = [], []
            for key, col in [('brand','brand'),('model','model'),('year','year'),('oilInterval','oil_interval'),('oilHidden','oil_hidden')]:
                if key in body:
                    fields.append(f'{col} = %s'); values.append(body[key])
            if 'guides' in body:
                fields.append('guides = %s'); values.append(json.dumps(body['guides'], ensure_ascii=False))
            if 'consumables' in body:
                fields.append('consumables = %s'); values.append(json.dumps(body['consumables'], ensure_ascii=False))
            if 'serviceIntervals' in body:
                # Сохраняем базовую структуру (без last_km/last_date) в общую таблицу
                base = [{k: v for k, v in s.items() if k not in ('last_km', 'last_date')}
                        for s in body['serviceIntervals']]
                fields.append('service_intervals = %s'); values.append(json.dumps(base, ensure_ascii=False))
            conn = get_conn()
            cur = conn.cursor()
            if fields:
                values.append(car_id)
                values.append(user_id)
                cur.execute(f"UPDATE cars SET {', '.join(fields)} WHERE id = %s AND user_id = %s", values)
            if 'specs' in body:
                cur.execute("""
                    INSERT INTO car_specs (car_id, specs) VALUES (%s, %s)
                    ON CONFLICT (car_id) DO UPDATE SET specs = EXCLUDED.specs
                """, (car_id, json.dumps(body['specs'], ensure_ascii=False)))
            conn.commit()
            conn.close()
            return resp(200, {'ok': True})

        if action == 'delete_car':
            car_id = body['id']
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("DELETE FROM car_entries WHERE car_id = %s", (car_id,))
            cur.execute("DELETE FROM car_specs WHERE car_id = %s", (car_id,))
            cur.execute("DELETE FROM cars WHERE id = %s AND user_id = %s", (car_id, user_id))
            conn.commit()
            conn.close()
            return resp(200, {'ok': True})

        if action == 'get_entries':
            car_id = body['carId']
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("SELECT entry_date, km FROM car_entries WHERE car_id = %s ORDER BY entry_date", (car_id,))
            rows = cur.fetchall()
            conn.close()
            return resp(200, [{'date': str(r[0]), 'km': float(r[1])} for r in rows])

        if action == 'save_entry':
            car_id = body['carId']
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO car_entries (car_id, entry_date, km) VALUES (%s, %s, %s)
                ON CONFLICT (car_id, entry_date) DO UPDATE SET km = EXCLUDED.km
            """, (car_id, body['date'], float(body['km'])))
            conn.commit()
            conn.close()
            return resp(200, {'ok': True})

        if action == 'delete_entry':
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("DELETE FROM car_entries WHERE car_id = %s AND entry_date = %s",
                        (body['carId'], body['date']))
            conn.commit()
            conn.close()
            return resp(200, {'ok': True})

        if action == 'save_reset':
            car_id = body['carId']
            interval_id = body['intervalId']
            last_km = body.get('lastKm')
            last_date = body.get('lastDate')
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO service_resets (car_id, user_id, interval_id, last_km, last_date)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (car_id, user_id, interval_id)
                DO UPDATE SET last_km = EXCLUDED.last_km, last_date = EXCLUDED.last_date
            """, (car_id, user_id, interval_id, last_km, last_date))
            conn.commit()
            conn.close()
            return resp(200, {'ok': True})

        if action == 'migrate_user':
            # Перенос данных со старого случайного uid на телефон/аккаунт.
            old_id = (body.get('oldUserId') or '').strip()
            if not old_id or old_id == user_id:
                return resp(200, {'ok': True, 'migrated': 0})
            conn = get_conn()
            cur = conn.cursor()
            # Переносим только если у текущего пользователя ещё нет машин
            cur.execute("SELECT COUNT(*) FROM cars WHERE user_id = %s", (user_id,))
            has_cars = cur.fetchone()[0]
            migrated = 0
            if has_cars == 0:
                cur.execute("UPDATE cars SET user_id = %s WHERE user_id = %s", (user_id, old_id))
                migrated = cur.rowcount
                cur.execute("UPDATE service_resets SET user_id = %s WHERE user_id = %s", (user_id, old_id))
            conn.commit()
            conn.close()
            return resp(200, {'ok': True, 'migrated': migrated})

        if action == 'search_car':
            brand = body.get('brand', '').strip().lower()
            model = body.get('model', '').strip().lower()
            year = body.get('year', '').strip()
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("""
                SELECT c.id, c.brand, c.model, c.year, c.oil_interval, c.guides, c.custom, cs.specs
                FROM cars c
                LEFT JOIN car_specs cs ON cs.car_id = c.id
                WHERE LOWER(c.brand) = %s AND LOWER(c.model) = %s AND c.year = %s
                LIMIT 1
            """, (brand, model, year))
            row = cur.fetchone()
            conn.close()
            if not row:
                return resp(200, {'found': False})
            return resp(200, {
                'found': True, 'id': row[0], 'brand': row[1], 'model': row[2],
                'year': row[3], 'oilInterval': row[4],
                'guides': row[5] if row[5] is not None else [],
                'custom': row[6], 'specs': row[7] if row[7] is not None else [],
            })

    return resp(405, {'error': 'Method not allowed'})