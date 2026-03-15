"""
REST API для управления автомобилями пользователя.
Методы: GET / — список, POST / — создать, PUT /{id} — обновить, DELETE /{id} — удалить.
GET /search?brand=X&model=Y&year=Z — поиск авто в БД.
Также: GET /entries/{car_id} — история км, POST /entries — добавить запись км.
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
    path = event.get('path', '/')

    # Убираем префикс если есть
    if '/entries' in path:
        return handle_entries(method, path, event)

    if '/specs' in path:
        return handle_specs(method, path, event)

    if '/search' in path:
        return handle_search(event)

    # /  — список всех авто
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
            car = {
                'id': row[0],
                'brand': row[1],
                'model': row[2],
                'year': row[3],
                'oilInterval': row[4],
                'guides': row[5] if row[5] is not None else [],
                'custom': row[6],
                'specs': row[7] if row[7] is not None else [],
            }
            cars.append(car)
        return resp(200, cars)

    # POST / — создать авто
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        car_id = body['id']
        brand = body['brand']
        model = body['model']
        year = body['year']
        oil_interval = body.get('oilInterval', 5000)
        guides = json.dumps(body.get('guides', []), ensure_ascii=False)
        custom = body.get('custom', True)
        specs = json.dumps(body.get('specs', []), ensure_ascii=False)

        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO cars (id, brand, model, year, oil_interval, guides, custom)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                brand = EXCLUDED.brand, model = EXCLUDED.model, year = EXCLUDED.year,
                oil_interval = EXCLUDED.oil_interval, guides = EXCLUDED.guides
        """, (car_id, brand, model, year, oil_interval, guides, custom))
        cur.execute("""
            INSERT INTO car_specs (car_id, specs)
            VALUES (%s, %s)
            ON CONFLICT (car_id) DO UPDATE SET specs = EXCLUDED.specs
        """, (car_id, specs))
        conn.commit()
        conn.close()
        return resp(200, {'ok': True, 'id': car_id})

    # PUT /{id} — обновить авто
    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        car_id = path.rstrip('/').split('/')[-1]
        fields = []
        values = []
        if 'brand' in body:
            fields.append('brand = %s'); values.append(body['brand'])
        if 'model' in body:
            fields.append('model = %s'); values.append(body['model'])
        if 'year' in body:
            fields.append('year = %s'); values.append(body['year'])
        if 'oilInterval' in body:
            fields.append('oil_interval = %s'); values.append(body['oilInterval'])
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

    # DELETE /{id} — удалить авто
    if method == 'DELETE':
        car_id = path.rstrip('/').split('/')[-1]
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM car_entries WHERE car_id = %s", (car_id,))
        cur.execute("DELETE FROM car_specs WHERE car_id = %s", (car_id,))
        cur.execute("DELETE FROM cars WHERE id = %s", (car_id,))
        conn.commit()
        conn.close()
        return resp(200, {'ok': True})

    return resp(405, {'error': 'Method not allowed'})


def handle_entries(method, path, event):
    """Работа с записями пробега (история км по датам)."""
    if method == 'GET':
        # GET /entries/{car_id}
        car_id = path.rstrip('/').split('/')[-1]
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT entry_date, km FROM car_entries
            WHERE car_id = %s ORDER BY entry_date
        """, (car_id,))
        rows = cur.fetchall()
        conn.close()
        entries = [{'date': str(r[0]), 'km': float(r[1])} for r in rows]
        return resp(200, entries)

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        car_id = body['carId']
        entry_date = body['date']
        km = float(body['km'])
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO car_entries (car_id, entry_date, km)
            VALUES (%s, %s, %s)
            ON CONFLICT (car_id, entry_date) DO UPDATE SET km = EXCLUDED.km
        """, (car_id, entry_date, km))
        conn.commit()
        conn.close()
        return resp(200, {'ok': True})

    if method == 'DELETE':
        # DELETE /entries/{car_id}/{date}
        parts = path.rstrip('/').split('/')
        car_id = parts[-2]
        entry_date = parts[-1]
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM car_entries WHERE car_id = %s AND entry_date = %s", (car_id, entry_date))
        conn.commit()
        conn.close()
        return resp(200, {'ok': True})

    return resp(405, {'error': 'Method not allowed'})


def handle_search(event):
    """Поиск авто в БД по brand, model, year через POST body."""
    body = json.loads(event.get('body') or '{}')
    brand = body.get('brand', '').strip().lower()
    model = body.get('model', '').strip().lower()
    year = body.get('year', '').strip()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT c.id, c.brand, c.model, c.year, c.oil_interval, c.guides, c.custom,
               cs.specs
        FROM cars c
        LEFT JOIN car_specs cs ON cs.car_id = c.id
        WHERE LOWER(c.brand) = %s AND LOWER(c.model) = %s AND c.year = %s
        LIMIT 1
    """, (brand, model, year))
    row = cur.fetchone()
    conn.close()
    if not row:
        return resp(404, {'found': False})
    car = {
        'found': True,
        'id': row[0],
        'brand': row[1],
        'model': row[2],
        'year': row[3],
        'oilInterval': row[4],
        'guides': row[5] if row[5] is not None else [],
        'custom': row[6],
        'specs': row[7] if row[7] is not None else [],
    }
    return resp(200, car)


def handle_specs(method, path, event):
    """Получение спецификаций автомобиля."""
    car_id = path.rstrip('/').split('/')[-1]
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT specs FROM car_specs WHERE car_id = %s", (car_id,))
    row = cur.fetchone()
    conn.close()
    return resp(200, row[0] if row else [])