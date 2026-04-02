import json
import os
import urllib.request
import psycopg2  # noqa: F401 — required, installed via requirements.txt
from engines_db import ENGINES_DB

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p21156567_oil_change_tracker')


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    """Подбор двигателей, масла, фильтров для автомобиля через ИИ с кешем в БД."""
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    brand = body.get('brand', '').strip()
    model = body.get('model', '').strip()
    year = body.get('year', '').strip()
    mode = body.get('mode', '').strip()
    car_id = body.get('carId', '').strip()
    force_refresh = body.get('forceRefresh', False)

    if not brand or not model or not year:
        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'brand, model, year обязательны'})}

    api_key = os.environ.get('YANDEX_API_KEY', '')
    use_openai = False

    generation = body.get('generation', '').strip()
    car = f"{brand} {model} {year}" + (f" ({generation})" if generation else "")
    engine = body.get('engine', '').strip()
    eng = f", двиг. {engine}" if engine else ""

    if mode == 'engines':
        local = _find_local_engines(brand, model)
        if local:
            print(f"Local DB hit: {brand} {model} -> {len(local)} engines")
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'engines': local}, ensure_ascii=False)}

        if not api_key:
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'engines': []}, ensure_ascii=False)}

        prompt = f'Список двигателей для {car}. Верни JSON: {{"engines":[{{"id":"1","name":"1AZ-FE 2.0 бензин 150 л.с.","volume":"2.0","fuel":"бензин","power":"150"}}]}} До 12 вариантов. Включи код двигателя, объём, тип топлива (бензин/дизель/гибрид), мощность в л.с.'
        print(f"Calling AI for engines: {car}")
        result = _call_ai(api_key, prompt, max_tokens=600, use_openai=use_openai)
        print(f"AI engines result: {str(result)[:200]}")
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps(result, ensure_ascii=False)}

    if not api_key:
        return {'statusCode': 500, 'headers': cors, 'body': json.dumps({'error': 'API key не задан'})}

    if mode == 'filters':
        if car_id and not force_refresh:
            cached = _get_cached_filters(car_id)
            if cached:
                print(f"Cache hit filters: {car_id}")
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'filters': cached}, ensure_ascii=False)}

        prompt = f"""Инструкции замены фильтров {car}{eng}. JSON без markdown:
{{"filters":[{{"id":"air_filter","title":"Воздушный фильтр","icon":"Wind","article":"OEM артикул","interval":"30000 км","steps":[{{"step":1,"title":"Шаг","items":["действие"],"warning":null}}]}}]}}
Фильтры: воздушный(Wind), масляный(Droplets), салонный(AirVent), топливный(Fuel). По 3 шага каждый. Реальные артикулы."""

        result = _call_ai(api_key, prompt, max_tokens=1500, use_openai=use_openai)
        filters = result.get('filters', [])

        if car_id and filters:
            _save_cached_filters(car_id, filters)

        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'filters': filters}, ensure_ascii=False)}

    if mode == 'intervals':
        if car_id and not force_refresh:
            cached = _get_cached_intervals(car_id)
            if cached:
                print(f"Cache hit intervals: {car_id}")
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'intervals': cached}, ensure_ascii=False)}

        prompt = f"""Все жидкости и расходники {car}{eng} с интервалами замены. JSON без markdown:
{{"intervals":[
{{"id":"oil","name":"Масло","icon":"Droplets","color":"#e05a2b","interval_km":10000,"interval_months":12,"unit":"km"}},
{{"id":"washer","name":"Омывайка","icon":"Droplets","color":"#3b82f6","interval_km":null,"interval_months":3,"unit":"months"}},
{{"id":"air_filter","name":"Воздушный фильтр","icon":"Wind","color":"#10b981","interval_km":30000,"interval_months":null,"unit":"km"}},
{{"id":"cabin_filter","name":"Салонный фильтр","icon":"Wind","color":"#8b5cf6","interval_km":15000,"interval_months":null,"unit":"km"}},
{{"id":"brake_fluid","name":"Тормозная жидкость","icon":"AlertTriangle","color":"#f59e0b","interval_km":null,"interval_months":24,"unit":"months"}},
{{"id":"coolant","name":"Антифриз","icon":"Thermometer","color":"#06b6d4","interval_km":null,"interval_months":60,"unit":"months"}},
{{"id":"spark","name":"Свечи","icon":"Zap","color":"#f97316","interval_km":60000,"interval_months":null,"unit":"km"}}
]}}
Поля: id(уникальный), name(русское название), icon(lucide), color(hex), interval_km(число или null), interval_months(число или null), unit(km или months — основная единица).
Верни 6-10 позиций актуальных для {car}. Реальные интервалы по регламенту."""

        result = _call_ai(api_key, prompt, max_tokens=1200, use_openai=use_openai)
        intervals = result.get('intervals', [])

        if car_id and intervals:
            _save_cached_intervals(car_id, intervals)

        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'intervals': intervals}, ensure_ascii=False)}

    if mode == 'consumables':
        if car_id and not force_refresh:
            cached = _get_cached_consumables(car_id)
            if cached:
                print(f"Cache hit consumables: {car_id}")
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'consumables': cached}, ensure_ascii=False)}

        prompt = f"""Список расходников для {car}{eng}. JSON без markdown:
{{"consumables":[{{"id":"oil","category":"Масло и фильтры","name":"Моторное масло","spec":"5W-30 SN/CF","article":"оригинал артикул","interval":"10000 км или 1 год","qty":"4.5 л","note":"допуск Toyota WS"}},{{"id":"air_filter","category":"Масло и фильтры","name":"Воздушный фильтр","spec":"","article":"17801-0H010","interval":"30000 км","qty":"1 шт","note":""}},{{"id":"cabin_filter","category":"Масло и фильтры","name":"Салонный фильтр","spec":"","article":"87139-0E040","interval":"15000 км","qty":"1 шт","note":""}},{{"id":"spark","category":"Зажигание","name":"Свечи зажигания","spec":"Иридиевые","article":"90919-01253","interval":"60000 км","qty":"4 шт","note":""}},{{"id":"brake_fluid","category":"Тормозная система","name":"Тормозная жидкость","spec":"DOT 4","article":"","interval":"2 года","qty":"0.5 л","note":""}},{{"id":"coolant","category":"Охлаждение","name":"Антифриз","spec":"LLC красный","article":"","interval":"5 лет","qty":"7 л","note":""}}]}}
Категории: Масло и фильтры, Зажигание, Тормозная система, Охлаждение, Трансмиссия, Подвеска. Реальные OEM артикулы для {car}. 10-15 позиций."""

        result = _call_ai(api_key, prompt, max_tokens=2000, use_openai=use_openai)
        consumables = result.get('consumables', [])

        if car_id and consumables:
            _save_cached_consumables(car_id, consumables)

        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'consumables': consumables}, ensure_ascii=False)}

    if car_id and not force_refresh:
        cached = _get_cached_guides(car_id)
        if cached:
            print(f"Cache hit guides: {car_id}")
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps(cached, ensure_ascii=False)}

    prompt = f"""Подбор масла {car}{eng}. JSON без markdown:
{{"specs":[["Масло","вязкость"],["Объём","X л"],["Фильтр","артикул"],["Пробка","ключ и момент"],["Интервал","км"],["Двигатель","{engine or 'стандартный'}"]],"oilInterval":10000,"guides":[{{"id":"oil","title":"Замена масла","icon":"Droplets","steps":[{{"step":1,"title":"Подготовка","items":["Прогреть 5 мин","Подготовить масло, фильтр, ёмкость"],"warning":null}},{{"step":2,"title":"Слив","items":["Поднять авто","Открутить пробку","Слить 15 мин"],"warning":"Масло горячее!"}},{{"step":3,"title":"Фильтр","items":["Снять старый","Смазать кольцо нового","Установить"],"warning":null}},{{"step":4,"title":"Заливка","items":["Закрутить пробку","Залить масло","Проверить уровень"],"warning":null}},{{"step":5,"title":"Проверка","items":["Завести на 2 мин","Проверить подтёки","Проверить уровень"],"warning":null}}]}}]}}
Адаптируй под конкретный автомобиль: артикулы, вязкость, объём, момент затяжки."""

    result = _call_ai(api_key, prompt, max_tokens=1200, use_openai=use_openai)

    if car_id and result.get('guides'):
        _save_cached_guides(car_id, result)

    return {'statusCode': 200, 'headers': cors, 'body': json.dumps(result, ensure_ascii=False)}


def _find_local_engines(brand: str, model: str) -> list:
    b = brand.lower().strip()
    m = model.lower().strip()
    brand_data = ENGINES_DB.get(b)
    if brand_data:
        engines = brand_data.get(m)
        if engines:
            return engines
    return []


def _get_cached_filters(car_id: str) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT filters FROM {SCHEMA}.cars WHERE id = %s", (car_id,))
        row = cur.fetchone()
        conn.close()
        if row and row[0]:
            return row[0]
    except Exception as e:
        print(f"Cache read filters error: {e}")
    return []


def _save_cached_filters(car_id: str, filters: list):
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.cars SET filters = %s WHERE id = %s",
                    (json.dumps(filters, ensure_ascii=False), car_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Cache save filters error: {e}")


def _get_cached_consumables(car_id: str) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT consumables FROM {SCHEMA}.cars WHERE id = %s", (car_id,))
        row = cur.fetchone()
        conn.close()
        if row and row[0]:
            return row[0]
    except Exception as e:
        print(f"Cache read consumables error: {e}")
    return []


def _save_cached_consumables(car_id: str, consumables: list):
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.cars SET consumables = %s WHERE id = %s",
                    (json.dumps(consumables, ensure_ascii=False), car_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Cache save consumables error: {e}")


def _get_cached_intervals(car_id: str) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT service_intervals FROM {SCHEMA}.cars WHERE id = %s", (car_id,))
        row = cur.fetchone()
        conn.close()
        if row and row[0]:
            return row[0]
    except Exception as e:
        print(f"Cache read intervals error: {e}")
    return []


def _save_cached_intervals(car_id: str, intervals: list):
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.cars SET service_intervals = %s WHERE id = %s",
                    (json.dumps(intervals, ensure_ascii=False), car_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Cache save intervals error: {e}")


def _get_cached_guides(car_id: str) -> dict:
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT c.guides, cs.specs, c.oil_interval FROM {SCHEMA}.cars c LEFT JOIN {SCHEMA}.car_specs cs ON cs.car_id = c.id WHERE c.id = %s", (car_id,))
        row = cur.fetchone()
        conn.close()
        if row and row[0]:
            return {'guides': row[0], 'specs': row[1] or [], 'oilInterval': row[2] or 10000}
    except Exception as e:
        print(f"Cache read guides error: {e}")
    return {}


def _save_cached_guides(car_id: str, result: dict):
    try:
        conn = get_conn()
        cur = conn.cursor()
        guides = result.get('guides', [])
        specs = result.get('specs', [])
        oil_interval = result.get('oilInterval', 10000)
        cur.execute(f"UPDATE {SCHEMA}.cars SET guides = %s, oil_interval = %s WHERE id = %s",
                    (json.dumps(guides, ensure_ascii=False), oil_interval, car_id))
        cur.execute(f"""INSERT INTO {SCHEMA}.car_specs (car_id, specs) VALUES (%s, %s)
                    ON CONFLICT (car_id) DO UPDATE SET specs = EXCLUDED.specs""",
                    (car_id, json.dumps(specs, ensure_ascii=False)))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Cache save guides error: {e}")


def _call_ai(api_key: str, prompt: str, max_tokens: int = 1200, use_openai: bool = False) -> dict:
    folder_id = os.environ.get('YANDEX_FOLDER_ID', '')
    url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion'
    payload = json.dumps({
        'modelUri': f'gpt://{folder_id}/yandexgpt',
        'completionOptions': {
            'stream': False,
            'temperature': 0.1,
            'maxTokens': 2000,
        },
        'messages': [
            {'role': 'system', 'text': 'Отвечай только валидным JSON без markdown, без пояснений, без блоков ```json.'},
            {'role': 'user', 'text': prompt},
        ],
    }).encode('utf-8')

    data = None
    try:
        r = urllib.request.Request(url, data=payload, headers={
            'Authorization': f'Api-Key {api_key}',
            'Content-Type': 'application/json',
        }, method='POST')
        with urllib.request.urlopen(r, timeout=25) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"AI call failed: {e}")

    if data is None:
        return _fallback(prompt)

    try:
        content = data['result']['alternatives'][0]['message']['text'].strip()
        # Убираем markdown-обёртку если модель всё же добавила
        if content.startswith('```'):
            lines = content.split('\n')
            content = '\n'.join(lines[1:])
            if content.endswith('```'):
                content = content[:-3].strip()
            elif '```' in content:
                content = content[:content.rfind('```')].strip()
        parsed = json.loads(content)
        if isinstance(parsed, list):
            if '"engines"' in prompt:
                return {'engines': parsed}
            if '"filters"' in prompt:
                return {'filters': parsed}
            if '"consumables"' in prompt:
                return {'consumables': parsed}
            if '"guides"' in prompt:
                return {'guides': parsed}
        return parsed
    except Exception as e:
        print(f"AI parse failed: {e}, raw: {str(data)[:300]}")
        return _fallback(prompt)


def _fallback(prompt: str) -> dict:
    if '"engines"' in prompt:
        return {"engines": []}
    if '"filters"' in prompt:
        return {"filters": []}
    if '"consumables"' in prompt:
        return {"consumables": []}
    if '"intervals"' in prompt:
        return {"intervals": []}
    return {"specs": [], "oilInterval": 10000, "guides": []}