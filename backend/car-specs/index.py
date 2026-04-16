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
        local = _find_local_engines(brand, model, generation, year)
        if local:
            print(f"Local DB hit: {brand} {model} {generation} {year} -> {len(local)} engines")
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'engines': local}, ensure_ascii=False)}

        if not api_key:
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'engines': []}, ensure_ascii=False)}

        prompt = f"""Полный список ВСЕХ двигателей для {car}, год выпуска {year}.
ВАЖНО: верни ТОЛЬКО двигатели, которые реально устанавливались на {brand} {model} поколения {generation if generation else '?'} в {year} году. Не путай с другими поколениями!
Формат JSON: {{"engines":[{{"id":"1","name":"1AZ-FE 2.0 бензин 150 л.с.","volume":"2.0","fuel":"бензин","power":"150"}}]}}
Включи: код двигателя, объём, тип топлива (бензин/дизель/гибрид), мощность в л.с.
Перечисли ВСЕ варианты моторов для этого конкретного поколения (бензин, дизель, гибрид). От 3 до 15 вариантов."""
        print(f"Calling AI for engines: {car} year={year}")
        result = _call_ai(api_key, prompt, max_tokens=1200, use_openai=use_openai)
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

        prompt = f"""Полный регламент ТО для {car}{eng} — все жидкости и фильтры с реальными интервалами замены по заводскому регламенту. JSON без markdown:
{{"intervals":[
{{"id":"oil","name":"Масло мотор","icon":"Droplets","color":"#e05a2b","interval_km":10000,"interval_months":12,"unit":"km"}},
{{"id":"atf","name":"Масло АКПП","icon":"Settings","color":"#f97316","interval_km":60000,"interval_months":null,"unit":"km"}},
{{"id":"gear_oil","name":"Масло КПП","icon":"Cog","color":"#84cc16","interval_km":60000,"interval_months":null,"unit":"km"}},
{{"id":"transfer","name":"Масло раздатки","icon":"GitFork","color":"#a78bfa","interval_km":60000,"interval_months":null,"unit":"km"}},
{{"id":"diff_front","name":"Масло дифф. пер.","icon":"Circle","color":"#fb923c","interval_km":60000,"interval_months":null,"unit":"km"}},
{{"id":"diff_rear","name":"Масло дифф. зад.","icon":"Circle","color":"#f43f5e","interval_km":60000,"interval_months":null,"unit":"km"}},
{{"id":"power_steering","name":"Жидкость ГУР","icon":"Gauge","color":"#38bdf8","interval_km":null,"interval_months":36,"unit":"months"}},
{{"id":"brake_fluid","name":"Тормозная жидк.","icon":"AlertTriangle","color":"#f59e0b","interval_km":null,"interval_months":24,"unit":"months"}},
{{"id":"coolant","name":"Антифриз","icon":"Thermometer","color":"#06b6d4","interval_km":null,"interval_months":60,"unit":"months"}},
{{"id":"air_filter","name":"Возд. фильтр","icon":"Wind","color":"#10b981","interval_km":30000,"interval_months":null,"unit":"km"}},
{{"id":"cabin_filter","name":"Салон. фильтр","icon":"Wind","color":"#8b5cf6","interval_km":15000,"interval_months":null,"unit":"km"}},
{{"id":"spark","name":"Свечи","icon":"Zap","color":"#eab308","interval_km":60000,"interval_months":null,"unit":"km"}},
{{"id":"washer","name":"Омывайка","icon":"Droplets","color":"#3b82f6","interval_km":null,"interval_months":3,"unit":"months"}}
]}}
Правила:
- Включай ТОЛЬКО позиции актуальные для {car} (например масло АКПП — только если есть АКПП, ГУР — только если есть ГУР, раздатка/диффы — только если полный привод)
- Реальные интервалы строго по заводскому регламенту
- Поля: id(уникальный), name(короткое русское до 14 символов), icon(lucide-react), color(hex), interval_km(число или null), interval_months(число или null), unit(km или months)
- Верни 8-14 позиций"""

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


GENERATION_YEARS = {
    "toyota": {
        "corolla": {"e80": [1983,1987], "e90": [1987,1992], "e100": [1991,1999], "e110": [1995,2002], "e120 / e130": [2001,2007], "e140 / e150": [2006,2013], "e160 / e170": [2012,2019], "e210": [2018,2026]},
        "camry": {"v10": [1982,1986], "v20": [1986,1991], "v30": [1991,1996], "v40": [1994,2001], "xv30": [2001,2006], "xv40": [2006,2011], "xv50": [2011,2017], "xv70": [2017,2026]},
        "rav4": {"xa10": [1994,2000], "xa20": [2000,2005], "xa30": [2005,2012], "xa40": [2012,2018], "xa50": [2018,2026]},
        "land cruiser": {"60 series": [1980,1990], "70 series": [1984,2026], "80 series": [1990,1998], "100 series": [1998,2007], "200 series": [2007,2021], "300 series": [2021,2026]},
        "land cruiser prado": {"j70": [1984,1996], "j90": [1996,2002], "j120": [2002,2009], "j150": [2009,2026]},
        "hilux": {"n50": [1978,1983], "n60": [1983,1988], "n80": [1988,1997], "n100": [1997,2005], "n120/n150": [2004,2015], "n210": [2015,2026]},
    },
    "volkswagen": {
        "golf": {"golf i": [1974,1983], "golf ii": [1983,1992], "golf iii": [1991,1998], "golf iv": [1997,2006], "golf v": [2003,2009], "golf vi": [2008,2013], "golf vii": [2012,2020], "golf viii": [2019,2026]},
        "passat": {"b1": [1973,1980], "b2": [1980,1988], "b3": [1988,1993], "b4": [1993,1997], "b5": [1996,2005], "b6": [2005,2010], "b7": [2010,2015], "b8": [2014,2026]},
        "polo": {"mk1": [1975,1981], "mk2": [1981,1994], "mk3": [1994,2002], "mk4": [2001,2009], "mk5": [2009,2017], "mk6": [2017,2026]},
        "tiguan": {"mk1": [2007,2016], "mk2": [2016,2026]},
        "touareg": {"7l": [2002,2010], "7p": [2010,2018], "cr": [2018,2026]},
    },
    "hyundai": {
        "solaris": {"i поколение": [2010,2017], "ii поколение": [2017,2026]},
        "creta": {"i поколение": [2015,2020], "ii поколение": [2020,2026]},
        "tucson": {"jm": [2004,2009], "lm/ix35": [2009,2015], "tl": [2015,2020], "nx4": [2020,2026]},
        "santa fe": {"sm": [2000,2006], "cm": [2006,2012], "dm": [2012,2018], "tm": [2018,2026]},
        "elantra": {"xd": [2000,2006], "hd": [2006,2010], "md/ud": [2010,2015], "ad": [2015,2020], "cn7": [2020,2026]},
        "sonata": {"ef": [1998,2004], "nf": [2004,2010], "yf": [2009,2014], "lf": [2014,2019], "dn8": [2019,2026]},
    },
    "kia": {
        "rio": {"dc": [2000,2005], "jb": [2005,2011], "ub": [2011,2017], "fb": [2017,2026]},
        "ceed": {"ed": [2006,2012], "jd": [2012,2018], "cd": [2018,2026]},
        "sportage": {"i поколение": [1993,2004], "km": [2004,2010], "sl": [2010,2015], "ql": [2015,2021], "nq5": [2021,2026]},
        "sorento": {"bl": [2002,2009], "xm": [2009,2014], "um": [2014,2020], "mq4": [2020,2026]},
    },
    "bmw": {
        "3 series": {"e21": [1975,1983], "e30": [1982,1994], "e36": [1990,2000], "e46": [1997,2006], "e90/e91/e92/e93": [2004,2013], "f30/f31/f34": [2011,2019], "g20/g21": [2018,2026]},
        "5 series": {"e12": [1972,1981], "e28": [1981,1988], "e34": [1988,1996], "e39": [1995,2004], "e60/e61": [2003,2010], "f10/f11": [2009,2017], "g30/g31": [2016,2026]},
        "x3": {"e83": [2003,2010], "f25": [2010,2017], "g01": [2017,2026]},
        "x5": {"e53": [1999,2006], "e70": [2006,2013], "f15": [2013,2018], "g05": [2018,2026]},
    },
    "mercedes-benz": {
        "c-class": {"w201": [1982,1993], "w202": [1993,2000], "w203": [2000,2007], "w204": [2007,2014], "w205": [2014,2021], "w206": [2021,2026]},
        "e-class": {"w123": [1976,1985], "w124": [1984,1997], "w210": [1995,2003], "w211": [2002,2009], "w212": [2009,2016], "w213": [2016,2026]},
    },
    "nissan": {
        "qashqai": {"j10": [2006,2013], "j11": [2013,2021], "j12": [2021,2026]},
        "x-trail": {"t30": [2000,2007], "t31": [2007,2013], "t32": [2013,2021], "t33": [2021,2026]},
    },
    "ford": {
        "focus": {"i поколение": [1998,2005], "ii поколение": [2004,2011], "iii поколение": [2010,2018], "iv поколение": [2018,2026]},
        "mondeo": {"i поколение": [1992,1996], "ii поколение": [1996,2000], "iii поколение": [2000,2007], "iv поколение": [2007,2014], "v поколение": [2014,2026]},
    },
    "mazda": {
        "3": {"bk": [2003,2009], "bl": [2009,2013], "bm/bn": [2013,2019], "bp": [2019,2026]},
        "6": {"gg/gy": [2002,2008], "gh": [2007,2012], "gj/gl": [2012,2026]},
        "cx-5": {"ke": [2011,2017], "kf": [2017,2026]},
    },
    "honda": {
        "civic": {"6th": [1995,2000], "7th": [2000,2005], "8th": [2005,2011], "9th": [2011,2015], "10th": [2015,2021], "11th": [2021,2026]},
        "cr-v": {"rd1-rd3": [1995,2001], "rd4-rd7": [2001,2006], "re": [2006,2012], "rm": [2012,2018], "rw": [2016,2026]},
        "accord": {"6th": [1997,2002], "7th": [2002,2008], "8th": [2007,2013], "9th": [2012,2017], "10th": [2017,2026]},
    },
    "renault": {
        "logan": {"i поколение": [2004,2012], "ii поколение": [2012,2026]},
        "duster": {"i поколение": [2010,2018], "ii поколение": [2018,2026]},
    },
    "skoda": {
        "octavia": {"a4/1u": [1996,2004], "a5/1z": [2004,2013], "a7/5e": [2012,2020], "a8/nx": [2019,2026]},
    },
}


def _find_gen_by_year(brand: str, model: str, year: int) -> str:
    brand_gens = GENERATION_YEARS.get(brand)
    if not brand_gens:
        return ''
    model_gens = brand_gens.get(model)
    if not model_gens:
        return ''
    for gen_name, (y_start, y_end) in model_gens.items():
        if y_start <= year <= y_end:
            return gen_name
    return ''


def _find_local_engines(brand: str, model: str, generation: str = '', year: str = '') -> list:
    b = brand.lower().strip()
    m = model.lower().strip()
    g = generation.lower().strip()
    y = 0
    try:
        y = int(year)
    except (ValueError, TypeError):
        pass

    brand_data = ENGINES_DB.get(b)
    if not brand_data:
        return []
    model_data = brand_data.get(m)
    if not model_data:
        return []

    if isinstance(model_data, dict):
        if g:
            for key in model_data:
                if key.lower() == g:
                    return model_data[key]
            for key in model_data:
                if key.lower() in g or g in key.lower():
                    return model_data[key]

        if y and not g:
            found_gen = _find_gen_by_year(b, m, y)
            if found_gen:
                for key in model_data:
                    if key.lower() == found_gen:
                        return model_data[key]
                    if key.lower() in found_gen or found_gen in key.lower():
                        return model_data[key]

        seen = set()
        result = []
        for engines in model_data.values():
            for e in engines:
                key = e['name']
                if key not in seen:
                    seen.add(key)
                    result.append(e)
        return result

    return model_data


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