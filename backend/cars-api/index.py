"""
REST API для управления автомобилями пользователя.
Все запросы идут через корневой URL с полем action в теле или методом GET.
GET / — список авто
POST / с action: create_car, update_car, delete_car, get_entries, save_entry, delete_entry, search_car
"""
import json
import os
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


def handler(event: dict, context) -> dict:
    """Обработчик CRUD операций с автомобилями и записями пробега."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')

    if method == 'GET':
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT c.id, c.brand, c.model, c.year, c.oil_interval, c.guides, c.custom,
                   cs.specs
            FROM cars c
            LEFT JOIN car_specs cs ON cs.car_id = c.id
            ORDER BY c.created_at
        """)
        rows = cur.fetchall()
        conn.close()
        cars = []
        for row in rows:
            cars.append({
                'id': row[0], 'brand': row[1], 'model': row[2], 'year': row[3],
                'oilInterval': row[4], 'guides': row[5] if row[5] is not None else [],
                'custom': row[6], 'specs': row[7] if row[7] is not None else [],
            })
        return resp(200, cars)

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        action = body.get('action', 'create_car')

        if action == 'create_car':
            car_id = body['id']
            guides = json.dumps(body.get('guides', []), ensure_ascii=False)
            specs = json.dumps(body.get('specs', []), ensure_ascii=False)
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO cars (id, brand, model, year, oil_interval, guides, custom)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    brand = EXCLUDED.brand, model = EXCLUDED.model, year = EXCLUDED.year,
                    oil_interval = EXCLUDED.oil_interval, guides = EXCLUDED.guides
            """, (car_id, body['brand'], body['model'], body['year'],
                  body.get('oilInterval', 5000), guides, body.get('custom', True)))
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
            for key, col in [('brand','brand'),('model','model'),('year','year'),('oilInterval','oil_interval')]:
                if key in body:
                    fields.append(f'{col} = %s'); values.append(body[key])
            if 'guides' in body:
                fields.append('guides = %s'); values.append(json.dumps(body['guides'], ensure_ascii=False))
            conn = get_conn()
            cur = conn.cursor()
            if fields:
                values.append(car_id)
                cur.execute(f"UPDATE cars SET {', '.join(fields)} WHERE id = %s", values)
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
            cur.execute("DELETE FROM cars WHERE id = %s", (car_id,))
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
