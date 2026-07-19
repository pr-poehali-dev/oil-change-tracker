import json
import os
import re
import urllib.request
import urllib.parse
import psycopg2  # noqa: F401 — required, installed via requirements.txt
from engines_db import ENGINES_DB
from vin_decoder import decode_vin, RU_BODY_CODES

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p21156567_oil_change_tracker')


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def _fix_consumables(items: list, engine: str, transmission: str) -> list:
    """Пост-обработка списка расходников: убираем логически неверные позиции,
    которые иногда всё равно проскакивают в ответе ИИ.
    - не показываем оба масла КПП (АКПП + механика) одновременно
    - не показываем свечи зажигания для дизельных двигателей
    - не показываем моторное масло/свечи/топливный фильтр для электромобилей
    """
    if not items:
        return items

    engine_low = (engine or '').lower()
    is_diesel = 'дизел' in engine_low or 'diesel' in engine_low
    is_electric = 'электр' in engine_low or re.search(r'\bev\b', engine_low) is not None

    result = []
    ids_seen = set()
    for item in items:
        item_id = (item.get('id') or '').lower()
        name_low = (item.get('name') or '').lower()

        if transmission == 'auto' and item_id == 'gear_oil':
            continue
        if transmission == 'manual' and item_id == 'atf':
            continue

        if is_diesel and (item_id == 'spark' or 'свеча зажигания' in name_low or 'свечи зажигания' in name_low):
            continue

        if is_electric and item_id in ('oil', 'spark', 'fuel_filter'):
            continue

        result.append(item)
        ids_seen.add(item_id)

    # Если коробка не указана и модель ответила обоими маслами КПП сразу — оставляем только первое
    if transmission not in ('auto', 'manual') and 'atf' in ids_seen and 'gear_oil' in ids_seen:
        seen_once = False
        filtered = []
        for item in result:
            item_id = (item.get('id') or '').lower()
            if item_id in ('atf', 'gear_oil'):
                if seen_once:
                    continue
                seen_once = True
            filtered.append(item)
        result = filtered

    return result


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

    if mode == 'vin':
        vin = body.get('vin', '').strip()
        result = decode_vin(vin)
        print(f"VIN decode: {vin} -> {result.get('brand')} {result.get('year')}")
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps(result, ensure_ascii=False)}

    if mode == 'sts_photo':
        image_b64 = body.get('image', '')
        if not image_b64:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'valid': False, 'error': 'Фото не передано'}, ensure_ascii=False)}
        result = _recognize_sts_photo(image_b64)
        print(f"STS photo decode -> {result.get('brand')} {result.get('model')} {result.get('year')} valid={result.get('valid')}")
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps(result, ensure_ascii=False)}

    if mode == 'car_image':
        if not brand or not model:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'image': ''}, ensure_ascii=False)}
        generation = body.get('generation', '').strip()
        image_url = _find_car_image(brand, model, generation, year)
        print(f"Car image: {brand} {model} {generation} {year} -> {image_url[:80] if image_url else 'none'}")
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'image': image_url}, ensure_ascii=False)}

    if mode == 'save_engine':
        gen = body.get('generation', '').strip()
        saved = _save_custom_engine(
            brand, model, gen,
            body.get('name', '').strip(),
            body.get('volume', '').strip(),
            body.get('power', '').strip(),
            body.get('fuel', 'бензин').strip(),
        )
        print(f"Save custom engine: {brand} {model} {gen} -> {saved}")
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'ok': saved}, ensure_ascii=False)}

    if not brand or not model or not year:
        print(f"Missing required fields: mode={mode!r} brand={brand!r} model={model!r} year={year!r} body_keys={list(body.keys())}")
        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'brand, model, year обязательны'})}

    api_key = os.environ.get('YANDEX_API_KEY', '')
    use_openai = False

    generation = body.get('generation', '').strip()
    car = f"{brand} {model} {year}" + (f" ({generation})" if generation else "")
    engine = body.get('engine', '').strip()
    eng = f", двиг. {engine}" if engine else ""
    transmission = body.get('transmission', '').strip().lower()

    if mode == 'engines':
        custom = _find_custom_engines(brand, model, generation)

        local = _find_local_engines(brand, model, generation, year)
        if local:
            print(f"Local DB hit: {brand} {model} {generation} {year} -> {len(local)} engines")
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'engines': _merge_engines(local, custom)}, ensure_ascii=False)}

        if not api_key:
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'engines': custom}, ensure_ascii=False)}

        wiki_text = _fetch_wiki_text(brand, model, generation)
        print(f"Wiki text length: {len(wiki_text)}")

        gen_hint = f" поколения {generation}" if generation else ""
        if wiki_text:
            prompt = f"""Из текста Wikipedia извлеки все двигатели для {brand} {model}{gen_hint} {year} г.

ТЕКСТ:
{wiki_text[:5500]}

Извлеки из текста выше ВСЕ двигатели (engine codes). Конвертируй kW в л.с. (×1.36), hp/PS = л.с.
НЕ ДОБАВЛЯЙ двигатели которых нет в тексте!
JSON: {{"engines":[{{"id":"1","name":"1ZZ-FE 1.8 бензин 143 л.с.","volume":"1.8","fuel":"бензин","power":"143"}}]}}"""
        else:
            prompt = f"""Двигатели {brand} {model}{gen_hint} {year} года. ТОЛЬКО реальные заводские коды. НЕ ВЫДУМЫВАЙ.
JSON: {{"engines":[{{"id":"1","name":"M20A-FKS 2.0 бензин 171 л.с.","volume":"2.0","fuel":"бензин","power":"171"}}]}}
Поля: id, name, volume, fuel (бензин/дизель/гибрид), power (л.с.). 2-10 вариантов."""

        print(f"Calling AI for engines: {car} year={year} wiki={'yes' if wiki_text else 'no'}")
        result = _call_ai(api_key, prompt, max_tokens=1500, use_openai=use_openai)
        engines = result.get('engines', [])
        engines = _validate_engines(engines)
        # Подмешиваем сохранённые пользователем двигатели (из СТС)
        result['engines'] = _merge_engines(engines, custom)
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

    def _fix_transmission(items):
        """Гарантируем что не показываются оба круга КПП сразу."""
        if transmission == 'auto':
            return [i for i in items if i.get('id') != 'gear_oil']
        if transmission == 'manual':
            return [i for i in items if i.get('id') != 'atf']
        ids = {i.get('id') for i in items}
        if 'atf' in ids and 'gear_oil' in ids:
            return [i for i in items if i.get('id') != 'gear_oil']
        return items

    if mode == 'intervals':
        if car_id and not force_refresh:
            cached = _get_cached_intervals(car_id)
            if cached:
                print(f"Cache hit intervals: {car_id}")
                cached = _fix_transmission(cached)
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'intervals': cached}, ensure_ascii=False)}

        if transmission == 'auto':
            trans_hint = " с АКПП (автоматическая коробка)"
            trans_rule = '- Коробка АКПП (автомат): включи "Масло АКПП" (id "atf"). ЗАПРЕЩЕНО включать "Масло КПП" (id "gear_oil") — это позиция только для механики!'
        elif transmission == 'manual':
            trans_hint = " с МКПП (механическая коробка)"
            trans_rule = '- Коробка МКПП (механика): включи "Масло КПП" (id "gear_oil"). ЗАПРЕЩЕНО включать "Масло АКПП" (id "atf") — это позиция только для автомата!'
        else:
            trans_hint = ""
            trans_rule = '- Коробка не указана: включи ТОЛЬКО ОДНУ позицию масла КПП — либо "Масло АКПП" (atf), либо "Масло КПП" (gear_oil), в зависимости от того что чаще ставят на эту модель. НЕ включай обе одновременно!'

        prompt = f"""Полный регламент ТО для {car}{eng}{trans_hint} — все жидкости и фильтры с реальными интервалами замены по заводскому регламенту. JSON без markdown:
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
- Включай ТОЛЬКО позиции актуальные для {car} (ГУР — только если есть ГУР, раздатка/диффы — только если полный привод)
{trans_rule}
- Реальные интервалы строго по заводскому регламенту
- Поля: id(уникальный), name(короткое русское до 14 символов), icon(lucide-react), color(hex), interval_km(число или null), interval_months(число или null), unit(km или months)
- Верни 8-14 позиций"""

        result = _call_ai(api_key, prompt, max_tokens=1200, use_openai=use_openai)
        intervals = result.get('intervals', [])

        # Подстраховка: не допускаем оба круга КПП одновременно
        intervals = _fix_transmission(intervals)

        if car_id and intervals:
            _save_cached_intervals(car_id, intervals)

        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'intervals': intervals}, ensure_ascii=False)}

    if mode == 'consumables':
        if car_id and not force_refresh:
            cached = _get_cached_consumables(car_id)
            if cached:
                print(f"Cache hit consumables: {car_id}")
                cached = _fix_consumables(cached, engine, transmission)
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'consumables': cached}, ensure_ascii=False)}

        engine_low = engine.lower()
        is_diesel = 'дизел' in engine_low or 'diesel' in engine_low
        is_electric = 'электр' in engine_low or 'ev' in engine_low.split()

        if transmission == 'auto':
            trans_line = 'Коробка АКПП (автомат) — если есть трансмиссионное масло, укажи "Масло АКПП" (id "atf"). НЕ указывай "Масло КПП" (id "gear_oil").'
        elif transmission == 'manual':
            trans_line = 'Коробка МКПП (механика) — если есть трансмиссионное масло, укажи "Масло КПП" (id "gear_oil"). НЕ указывай "Масло АКПП" (id "atf").'
        else:
            trans_line = 'Тип коробки не указан — укажи ТОЛЬКО ОДНУ позицию трансмиссионного масла (atf либо gear_oil), в зависимости от того, что чаще ставится на эту модель.'

        fuel_line = (
            'Двигатель ДИЗЕЛЬНЫЙ — НЕ включай свечи зажигания (только свечи накаливания, если применимо), обрати внимание на топливный фильтр и сажевый фильтр если есть.'
            if is_diesel else
            'Двигатель БЕНЗИНОВЫЙ — включи свечи зажигания с указанием реального типа (иридиевые/платиновые/обычные) для этого мотора.'
            if not is_electric else
            'Электромобиль — НЕ включай моторное масло, свечи зажигания, топливный фильтр. Укажи актуальные для EV расходники: тормозная жидкость, охлаждающая жидкость батареи/инвертора, салонный фильтр.'
        )

        prompt = f"""Список реально нужных расходников для конкретного автомобиля {car}{eng}.
{trans_line}
{fuel_line}
Включай ТОЛЬКО те позиции, которые физически существуют на этом автомобиле (например ГУР, раздатку, дифференциалы — только если они есть на этой модели/комплектации).
Артикулы должны быть реальными оригинальными/аналоговыми номерами именно для {car}{eng}, не выдумывай случайные числа.

JSON без markdown:
{{"consumables":[{{"id":"oil","category":"Масло и фильтры","name":"Моторное масло","spec":"5W-30 SN/CF","article":"оригинал артикул","interval":"10000 км или 1 год","qty":"4.5 л","note":"допуск производителя"}},{{"id":"air_filter","category":"Масло и фильтры","name":"Воздушный фильтр","spec":"","article":"17801-0H010","interval":"30000 км","qty":"1 шт","note":""}},{{"id":"cabin_filter","category":"Масло и фильтры","name":"Салонный фильтр","spec":"","article":"87139-0E040","interval":"15000 км","qty":"1 шт","note":""}},{{"id":"spark","category":"Зажигание","name":"Свечи зажигания","spec":"Иридиевые","article":"90919-01253","interval":"60000 км","qty":"4 шт","note":""}},{{"id":"brake_fluid","category":"Тормозная система","name":"Тормозная жидкость","spec":"DOT 4","article":"","interval":"2 года","qty":"0.5 л","note":""}},{{"id":"coolant","category":"Охлаждение","name":"Антифриз","spec":"LLC красный","article":"","interval":"5 лет","qty":"7 л","note":""}}]}}
Категории: Масло и фильтры, Зажигание, Тормозная система, Охлаждение, Трансмиссия, Подвеска. 8-15 позиций, только актуальные для этого авто."""

        result = _call_ai(api_key, prompt, max_tokens=2000, use_openai=use_openai)
        consumables = result.get('consumables', [])
        consumables = _fix_consumables(consumables, engine, transmission)

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
        "4runner": {"n120/n130": [1989,1995], "n180": [1995,2002], "n210": [2002,2009], "n280": [2009,2026]},
        "levin": {"ae71": [1979,1983], "ae86": [1983,1987], "ae92": [1987,1991], "ae101": [1991,1995], "ae111": [1995,2000], "e120": [2019,2021], "e210 рестайлинг": [2022,2026]},
        "celica": {"a20/a35": [1977,1981], "a40/a50": [1981,1985], "a60": [1982,1985], "t160": [1985,1989], "t180": [1989,1993], "t200": [1993,1999], "t230": [1999,2006]},
        "prius": {"nhw10": [1997,2000], "nhw20": [2003,2009], "zvw30": [2009,2015], "zvw50": [2015,2022], "mxwh60": [2022,2026]},
        "mark ii": {"x60": [1984,1988], "x70": [1988,1992], "x80": [1992,1996], "x90": [1996,2000], "x100": [1996,2000], "x110": [2000,2004]},
        "chaser": {"x60": [1984,1988], "x70": [1988,1992], "x80": [1992,1996], "x90": [1996,2001], "x100": [1996,2001]},
        "highlander": {"xu20": [2000,2007], "xu40": [2007,2013], "xu50": [2013,2019], "xu70": [2019,2026]},
        "avensis": {"t220": [1997,2003], "t250": [2003,2008], "t270": [2008,2018]},
        "yaris": {"xp10": [1999,2005], "xp90": [2005,2011], "xp130": [2011,2020], "xp210": [2020,2026]},
        "supra": {"a40": [1978,1981], "a60": [1981,1986], "a70": [1986,1993], "a80": [1993,2002], "a90": [2019,2026]},
        "cresta": {"x60": [1984,1988], "x70": [1988,1992], "x80": [1992,1996], "x90": [1996,2001], "x100": [1996,2001]},
        "sprinter trueno": {"ae71": [1979,1983], "ae86": [1983,1987], "ae92": [1987,1991], "ae101": [1991,1995], "ae111": [1995,2000]},
        "harrier": {"xu10": [1997,2003], "xu30": [2003,2013], "zsu60": [2013,2020], "mxua80": [2020,2026]},
        "c-hr": {"ngx10/zyx10": [2016,2026]},
        "fortuner": {"i поколение": [2005,2015], "ii поколение": [2015,2026]},
        "alphard": {"h10": [2002,2008], "h20": [2008,2015], "h30": [2015,2023], "h40": [2023,2026]},
        "estima": {"r10/r20": [1990,1999], "r30/r40": [2000,2005], "r50": [2006,2019]},
        "noah": {"r60": [2001,2007], "r70": [2007,2014], "r80": [2014,2021], "r90": [2021,2026]},
        "voxy": {"r60": [2001,2007], "r70": [2007,2014], "r80": [2014,2021], "r90": [2021,2026]},
        "crown": {"s170": [1999,2003], "s180": [2003,2008], "s200": [2008,2012], "s210": [2012,2018]},
        "mark x": {"x120": [2004,2009], "x130": [2009,2019]},
        "vitz": {"xp10": [1999,2005], "xp90": [2005,2010], "xp130": [2010,2020]},
        "passo": {"m300": [2004,2016], "m700": [2016,2026]},
        "ractis": {"xp100": [2005,2010], "xp120": [2010,2016]},
        "sienta": {"xp80": [2003,2015], "xp170": [2015,2026]},
        "wish": {"ane10": [2003,2009], "ane20": [2009,2017]},
        "ipsum": {"sxm10": [1996,2001], "acm20": [2001,2009]},
        "premio": {"t240": [2001,2007], "t260": [2007,2021]},
        "allion": {"t240": [2001,2007], "t260": [2007,2021]},
        "caldina": {"t210": [1997,2002], "t240": [2002,2007]},
        "fielder": {"e120": [2000,2006], "e140": [2006,2012], "e160": [2012,2026]},
        "vellfire": {"h20": [2008,2015], "h30": [2015,2023], "h40": [2023,2026]},
        "aqua": {"nhp10": [2011,2021], "mxpk10": [2021,2026]},
        "hiace": {"h100": [1989,2004], "h200": [2004,2026]},
        "probox": {"p50": [2002,2014], "p160": [2014,2026]},
        "auris": {"e150": [2006,2012], "e180": [2012,2018]},
        "bb": {"ncp30": [2000,2005], "qnc20": [2005,2016]},
        "ist": {"ncp60": [2002,2007], "ncp110": [2007,2016]},
        "corona": {"t190": [1992,1996], "t210": [1996,2001]},
        "carina": {"t190": [1992,1996], "t210": [1996,2001]},
        "kluger": {"u20": [2000,2007], "u40": [2007,2013]},
        "rush": {"j200": [2006,2016]},
        "raum": {"exz10": [1997,2003], "ncz20": [2003,2011]},
    },
    "volkswagen": {
        "golf": {"golf i": [1974,1983], "golf ii": [1983,1992], "golf iii": [1991,1998], "golf iv": [1997,2006], "golf v": [2003,2009], "golf vi": [2008,2013], "golf vii": [2012,2020], "golf viii": [2019,2026]},
        "passat": {"b1": [1973,1980], "b2": [1980,1988], "b3": [1988,1993], "b4": [1993,1997], "b5": [1996,2005], "b6": [2005,2010], "b7": [2010,2015], "b8": [2014,2026]},
        "polo": {"mk1": [1975,1981], "mk2": [1981,1994], "mk3": [1994,2002], "mk4": [2001,2009], "mk5": [2009,2017], "mk6": [2017,2026]},
        "tiguan": {"mk1": [2007,2016], "mk2": [2016,2026]},
        "touareg": {"7l": [2002,2010], "7p": [2010,2018], "cr": [2018,2026]},
        "jetta": {"mk1": [1979,1984], "mk2": [1984,1992], "mk3": [1992,1999], "mk4": [1998,2005], "mk5": [2005,2010], "mk6": [2010,2018], "mk7": [2018,2026]},
        "transporter": {"t3": [1979,1992], "t4": [1990,2003], "t5": [2003,2015], "t6": [2015,2026]},
    },
    "audi": {
        "a3": {"8l": [1996,2003], "8p": [2003,2012], "8v": [2012,2020], "8y": [2020,2026]},
        "a4": {"b5": [1994,2001], "b6": [2000,2006], "b7": [2004,2008], "b8": [2007,2015], "b9": [2015,2026]},
        "a6": {"c4": [1994,1997], "c5": [1997,2004], "c6": [2004,2011], "c7": [2011,2018], "c8": [2018,2026]},
        "q5": {"8r": [2008,2017], "fy": [2017,2026]},
        "q7": {"4l": [2005,2015], "4m": [2015,2026]},
        "tt": {"8n": [1998,2006], "8j": [2006,2014], "8s": [2014,2023]},
        "a5": {"8t": [2007,2016], "f5": [2016,2026]},
        "a7": {"4g": [2010,2018], "4k": [2018,2026]},
        "a8": {"d2": [1994,2002], "d3": [2002,2010], "d4": [2010,2017], "d5": [2017,2026]},
        "a1": {"8x": [2010,2018], "gb": [2018,2026]},
        "q2": {"ga": [2016,2026]},
        "q3": {"8u": [2011,2018], "f3": [2018,2026]},
        "q8": {"4m": [2018,2026]},
    },
    "hyundai": {
        "solaris": {"i поколение": [2010,2017], "ii поколение": [2017,2026]},
        "creta": {"i поколение": [2015,2020], "ii поколение": [2020,2026]},
        "tucson": {"jm": [2004,2009], "lm/ix35": [2009,2015], "tl": [2015,2020], "nx4": [2020,2026]},
        "santa fe": {"sm": [2000,2006], "cm": [2006,2012], "dm": [2012,2018], "tm": [2018,2026]},
        "elantra": {"j1": [1990,1995], "j2": [1995,2000], "xd": [2000,2006], "hd": [2006,2010], "md/ud": [2010,2015], "ad": [2015,2020], "cn7": [2020,2026]},
        "sonata": {"y2": [1988,1993], "y3": [1993,1998], "ef": [1998,2004], "nf": [2004,2010], "yf": [2009,2014], "lf": [2014,2019], "dn8": [2019,2026]},
        "accent": {"x3": [1994,2000], "lc": [1999,2005], "mc": [2005,2011], "rb": [2010,2017], "hc": [2017,2026]},
        "i20": {"pb": [2008,2014], "gb": [2014,2020], "bc3": [2020,2026]},
        "i30": {"fd": [2007,2012], "gd": [2012,2017], "pd": [2017,2026]},
        "i40": {"vf": [2011,2019]},
        "palisade": {"lx2": [2018,2026]},
        "kona": {"os": [2017,2023], "sx2": [2023,2026]},
        "staria": {"i поколение": [2021,2026]},
        "getz": {"tb": [2002,2011]},
    },
    "kia": {
        "rio": {"dc": [2000,2005], "jb": [2005,2011], "ub": [2011,2017], "fb": [2017,2023], "ybf": [2023,2026]},
        "ceed": {"ed": [2006,2012], "jd": [2012,2018], "cd": [2018,2026]},
        "proceed": {"cd": [2019,2026]},
        "sportage": {"ja": [1993,2004], "km": [2004,2010], "sl": [2010,2015], "ql": [2015,2021], "nq5": [2021,2026]},
        "sorento": {"bl": [2002,2009], "xm": [2009,2014], "um": [2014,2020], "mq4": [2020,2026]},
        "soul": {"am": [2008,2014], "ps": [2014,2019], "sk3": [2019,2026]},
        "mohave": {"hm": [2008,2019], "hm рестайл": [2019,2026]},
        "stinger": {"ck": [2017,2026]},
        "carnival": {"gq": [1998,2006], "vq": [2006,2014], "ka4": [2020,2026]},
        "optima": {"ms": [2000,2005], "mg": [2005,2010], "tf": [2010,2015], "jf": [2015,2020]},
        "k5": {"dl3": [2020,2026]},
        "cerato": {"ld": [2003,2008], "td": [2008,2013], "yd": [2013,2018], "bd": [2018,2023]},
        "picanto": {"sa": [2004,2011], "ta": [2011,2017], "ja": [2017,2026]},
        "seltos": {"sp2": [2019,2026]},
        "xceed": {"cd": [2019,2026]},
        "stonic": {"yb": [2017,2026]},
        "niro": {"de": [2016,2022], "sg2": [2022,2026]},
    },
    "bmw": {
        "1 series": {"e87": [2004,2011], "f20/f21": [2011,2019], "f40": [2019,2026]},
        "2 series": {"f22/f23": [2013,2021], "g42": [2021,2026]},
        "3 series": {"e21": [1975,1983], "e30": [1982,1994], "e36": [1990,2000], "e46": [1997,2006], "e90/e91/e92/e93": [2004,2013], "f30/f31/f34": [2011,2019], "g20/g21": [2018,2026]},
        "4 series": {"f32/f33/f36": [2013,2020], "g22/g23/g26": [2020,2026]},
        "5 series": {"e12": [1972,1981], "e28": [1981,1988], "e34": [1988,1996], "e39": [1995,2004], "e60/e61": [2003,2010], "f10/f11": [2009,2017], "g30/g31": [2016,2026]},
        "6 series": {"e24": [1976,1989], "e63/e64": [2003,2010], "f06/f12/f13": [2011,2018], "g32": [2017,2026]},
        "7 series": {"e23": [1977,1986], "e32": [1986,1994], "e38": [1994,2001], "e65/e66": [2001,2008], "f01/f02": [2008,2015], "g11/g12": [2015,2022]},
        "8 series": {"e31": [1989,1999], "g14/g15": [2018,2026]},
        "x1": {"e84": [2009,2015], "f48": [2015,2022], "u11": [2022,2026]},
        "x2": {"f39": [2017,2023], "u10": [2023,2026]},
        "x3": {"e83": [2003,2010], "f25": [2010,2017], "g01": [2017,2026]},
        "x4": {"f26": [2014,2018], "g02": [2018,2026]},
        "x5": {"e53": [1999,2006], "e70": [2006,2013], "f15": [2013,2018], "g05": [2018,2026]},
        "x6": {"e71": [2008,2014], "f16": [2014,2019], "g06": [2019,2026]},
        "x7": {"g07": [2019,2026]},
        "z4": {"e85/e86": [2002,2008], "e89": [2009,2016], "g29": [2018,2026]},
        "m3": {"e30 m3": [1986,1991], "e36 m3": [1992,1999], "e46 m3": [2000,2006], "e90/e92 m3": [2007,2013], "f80 m3": [2014,2018], "g80 m3": [2020,2026]},
        "m5": {"e28 m5": [1985,1988], "e34 m5": [1988,1995], "e39 m5": [1998,2003], "e60 m5": [2004,2010], "f10 m5": [2011,2016], "f90 m5": [2017,2026]},
    },
    "mercedes-benz": {
        "a-class": {"w168": [1997,2004], "w169": [2004,2012], "w176": [2012,2018], "w177": [2018,2026]},
        "b-class": {"w245": [2005,2011], "w246": [2011,2018], "w247": [2018,2026]},
        "c-class": {"w201": [1982,1993], "w202": [1993,2000], "w203": [2000,2007], "w204": [2007,2014], "w205": [2014,2021], "w206": [2021,2026]},
        "cla": {"c117": [2013,2019], "c118": [2019,2026]},
        "cls": {"c219": [2004,2011], "c218": [2011,2018], "c257": [2018,2026]},
        "e-class": {"w123": [1976,1985], "w124": [1984,1997], "w210": [1995,2003], "w211": [2002,2009], "w212": [2009,2016], "w213": [2016,2026]},
        "gla": {"x156": [2013,2020], "h247": [2020,2026]},
        "glb": {"x247": [2019,2026]},
        "glc": {"x253": [2015,2022], "x254": [2022,2026]},
        "gle": {"w166": [2011,2019], "w167": [2018,2026]},
        "gls": {"x166": [2015,2019], "x167": [2019,2026]},
        "g-class": {"w460": [1979,1992], "w461": [1992,2001], "w463": [1989,2018], "w463a": [2018,2026]},
        "s-class": {"w116": [1972,1980], "w126": [1979,1991], "w140": [1991,1998], "w220": [1998,2005], "w221": [2005,2013], "w222": [2013,2020], "w223": [2020,2026]},
        "sl": {"r107": [1971,1989], "r129": [1989,2002], "r230": [2001,2012], "r231": [2012,2020], "r232": [2020,2026]},
        "slk": {"r170": [1996,2004], "r171": [2004,2011], "r172": [2011,2020]},
        "sprinter": {"w901-905": [1995,2006], "w906": [2006,2018], "w907/w910": [2018,2026]},
        "vito": {"w638": [1996,2003], "w639": [2003,2014], "w447": [2014,2026]},
        "v-class": {"w447": [2014,2026]},
        "viano": {"w639": [2003,2014]},
        "ml": {"w163": [1997,2005], "w164": [2005,2011]},
        "glk": {"x204": [2008,2015]},
    },
    "nissan": {
        "qashqai": {"j10": [2006,2013], "j11": [2013,2021], "j12": [2021,2026]},
        "x-trail": {"t30": [2000,2007], "t31": [2007,2013], "t32": [2013,2021], "t33": [2021,2026]},
        "almera": {"n15": [1995,2000], "n16": [2000,2006], "g15": [2012,2018]},
        "micra": {"k11": [1992,2002], "k12": [2002,2010], "k13": [2010,2016], "k14": [2017,2026]},
        "note": {"e11": [2004,2013], "e12": [2012,2026]},
        "tiida": {"c11": [2004,2012], "c12": [2011,2016]},
        "sentra": {"b13": [1990,1994], "b14": [1995,1999], "b15": [2000,2006], "b16": [2007,2012], "b17": [2013,2019], "b18": [2019,2026]},
        "teana": {"j31": [2003,2008], "j32": [2008,2014], "l33": [2013,2018]},
        "maxima": {"a32": [1995,1999], "a33": [1999,2003], "a34": [2003,2008], "a35": [2008,2015], "a36": [2015,2023]},
        "murano": {"z50": [2002,2008], "z51": [2008,2014], "z52": [2014,2026]},
        "pathfinder": {"r50": [1995,2004], "r51": [2004,2012], "r52": [2012,2020], "r53": [2021,2026]},
        "patrol": {"y60": [1987,1997], "y61": [1997,2013], "y62": [2010,2026]},
        "navara": {"d22": [1997,2015], "d40": [2005,2015], "d23": [2014,2026]},
        "frontier": {"d22": [1997,2004], "d40": [2004,2021], "d23": [2021,2026]},
        "juke": {"f15": [2010,2019], "f16": [2019,2026]},
        "kicks": {"p15": [2016,2026]},
        "terrano": {"ii": [1993,2006], "iii": [2013,2022]},
        "leaf": {"ze0": [2010,2017], "ze1": [2017,2026]},
        "gt-r": {"r35": [2007,2026]},
        "350z": {"z33": [2002,2009]},
        "370z": {"z34": [2009,2020]},
        "skyline": {"r33": [1993,1998], "r34": [1998,2002], "v35": [2001,2006], "v36": [2006,2014], "v37": [2014,2026]},
        "silvia": {"s13": [1988,1993], "s14": [1993,1999], "s15": [1999,2002]},
        "cefiro": {"a31": [1988,1994], "a32": [1994,1998], "a33": [1998,2003]},
        "laurel": {"c34": [1993,1997], "c35": [1997,2002]},
        "stagea": {"wc34": [1996,2001], "m35": [2001,2007]},
        "serena": {"c24": [1999,2005], "c25": [2005,2010], "c26": [2010,2016], "c27": [2016,2026]},
        "bluebird": {"u13": [1991,1996], "u14": [1996,2001]},
        "primera": {"p11": [1995,2002], "p12": [2001,2008]},
        "wingroad": {"y11": [1999,2005], "y12": [2005,2018]},
        "ad": {"y11": [1999,2006], "y12": [2006,2026]},
        "cube": {"z11": [2002,2008], "z12": [2008,2020]},
        "march": {"k12": [2002,2010], "k13": [2010,2022]},
        "fuga": {"y50": [2004,2009], "y51": [2009,2022]},
        "elgrand": {"e50": [1997,2002], "e51": [2002,2010], "e52": [2010,2026]},
    },
    "ford": {
        "fiesta": {"mk4": [1995,2002], "mk5": [2002,2008], "mk6": [2008,2017], "mk7": [2017,2023], "mk8": [2023,2026]},
        "focus": {"i поколение": [1998,2005], "ii поколение": [2004,2011], "iii поколение": [2010,2018], "iv поколение": [2018,2026]},
        "mondeo": {"i поколение": [1992,1996], "ii поколение": [1996,2000], "iii поколение": [2000,2007], "iv поколение": [2007,2014], "v поколение": [2014,2026]},
        "explorer": {"v поколение": [2011,2019], "vi поколение": [2019,2026]},
        "ranger": {"t6": [2011,2019], "t6.2": [2019,2022], "p703": [2022,2026]},
        "mustang": {"s197": [2004,2014], "s550": [2015,2023], "s650": [2023,2026]},
        "kuga": {"i поколение": [2008,2012], "ii поколение": [2012,2019], "iii поколение": [2019,2026]},
        "transit": {"mk6": [2000,2006], "mk7": [2006,2013], "mk8": [2013,2026]},
        "ecosport": {"i поколение": [2003,2012], "ii поколение": [2012,2026]},
        "edge": {"i поколение": [2006,2014], "ii поколение": [2014,2026]},
        "escape": {"i": [2000,2012], "ii": [2013,2019], "iii": [2019,2026]},
    },
    "mazda": {
        "2": {"dy": [2002,2007], "de": [2007,2014], "dj/dl": [2014,2026]},
        "3": {"bk": [2003,2009], "bl": [2009,2013], "bm/bn": [2013,2019], "bp": [2019,2026]},
        "6": {"gg/gy": [2002,2008], "gh": [2007,2012], "gj/gl": [2012,2026]},
        "cx-3": {"dk": [2015,2026]},
        "cx-30": {"dm": [2019,2026]},
        "cx-5": {"ke": [2011,2017], "kf": [2017,2026]},
        "cx-7": {"er": [2006,2012]},
        "cx-9": {"tb": [2007,2015], "tc": [2015,2026]},
        "cx-60": {"kh": [2022,2026]},
        "mx-5": {"na": [1989,1997], "nb": [1997,2005], "nc": [2005,2015], "nd": [2015,2026]},
        "rx-8": {"se": [2003,2012]},
        "bt-50": {"ur": [2011,2020], "tf": [2020,2026]},
    },
    "honda": {
        "civic": {"ef/ed": [1987,1991], "eg/eh": [1991,1995], "ek": [1995,2000], "ep/eu/es": [2000,2005], "fd/fa": [2005,2011], "fb/fg": [2011,2015], "fc/fk": [2015,2021], "fe/fl": [2021,2026]},
        "accord": {"cd/ce": [1993,1997], "cg/cf": [1997,2002], "cl/cm": [2002,2008], "cp/cs": [2007,2013], "cr": [2012,2017], "cv": [2017,2022], "cy": [2023,2026]},
        "cr-v": {"rd": [1995,2001], "rd4-rd9": [2001,2006], "re": [2006,2012], "rm": [2012,2018], "rw/rt": [2016,2022], "rs": [2022,2026]},
        "hr-v": {"gh": [1998,2006], "ru": [2014,2021], "rv": [2021,2026]},
        "jazz": {"gd": [2001,2008], "ge": [2008,2013], "gk": [2013,2020], "gr": [2020,2026]},
        "pilot": {"yf1": [2002,2008], "yf3": [2008,2015], "yf5": [2015,2022], "yf6": [2022,2026]},
        "odyssey": {"ra": [1994,2004], "rb1/rb2": [2003,2008], "rb3/rb4": [2008,2013], "rc1/rc2": [2013,2026]},
        "city": {"gm": [2008,2013], "gm2": [2013,2019], "gn": [2019,2026]},
        "fit": {"gd": [2001,2007], "ge": [2007,2013], "gk": [2013,2020], "gr": [2020,2026]},
        "freed": {"ge": [2008,2016], "gb": [2016,2026]},
        "stepwgn": {"rf": [1996,2005], "rg": [2005,2009], "rk": [2009,2015], "rp": [2015,2026]},
        "stream": {"rn1": [2000,2006], "rn6": [2006,2014]},
        "vezel": {"ru": [2013,2021], "rv": [2021,2026]},
        "insight": {"ze": [2009,2014], "ze4": [2018,2022]},
        "integra": {"dc2": [1993,2001], "dc5": [2001,2006]},
        "prelude": {"bb": [1991,2001]},
        "cr-z": {"zf": [2010,2016]},
        "legend": {"kb": [2004,2012], "kc": [2015,2022]},
        "elysion": {"rr": [2004,2013]},
        "airwave": {"gj": [2005,2010]},
        "mobilio": {"gb": [2001,2008], "dd": [2014,2026]},
        "shuttle": {"gp7": [2015,2022]},
        "n-box": {"jf1": [2011,2017], "jf3": [2017,2026]},
        "s2000": {"ap1": [1999,2005], "ap2": [2005,2009]},
        "inspire": {"uc1": [2003,2007], "cp3": [2007,2012]},
    },
    "renault": {
        "clio": {"i": [1990,1998], "ii": [1998,2005], "iii": [2005,2012], "iv": [2012,2019], "v": [2019,2026]},
        "megane": {"i": [1995,2002], "ii": [2002,2009], "iii": [2008,2016], "iv": [2016,2026]},
        "logan": {"i поколение": [2004,2012], "ii поколение": [2012,2026]},
        "sandero": {"i поколение": [2007,2012], "ii поколение": [2012,2020], "iii поколение": [2020,2026]},
        "duster": {"i поколение": [2010,2018], "ii поколение": [2017,2026]},
        "kaptur": {"i поколение": [2016,2020]},
        "arkana": {"i поколение": [2019,2026]},
        "fluence": {"i": [2009,2017]},
        "koleos": {"i": [2008,2016], "ii": [2016,2026]},
        "kadjar": {"i": [2015,2022]},
        "captur": {"i": [2013,2019], "ii": [2019,2026]},
        "laguna": {"i": [1993,2000], "ii": [2000,2007], "iii": [2007,2015]},
        "symbol": {"i": [1999,2008], "ii": [2008,2012], "iii": [2012,2019]},
        "trafic": {"ii": [2001,2014], "iii": [2014,2026]},
    },
    "skoda": {
        "fabia": {"mk1": [1999,2007], "mk2": [2007,2014], "mk3": [2014,2021], "mk4": [2021,2026]},
        "octavia": {"a4/1u": [1996,2004], "a5/1z": [2004,2013], "a7/5e": [2012,2020], "a8/nx": [2019,2026]},
        "superb": {"3u": [2001,2008], "3t": [2008,2015], "3v": [2015,2026]},
        "kodiaq": {"ns": [2016,2026]},
        "karoq": {"nu": [2017,2026]},
        "kamiq": {"ns": [2019,2026]},
        "scala": {"nw": [2019,2026]},
        "rapid": {"nh": [2012,2019], "nk": [2020,2026]},
        "yeti": {"5l": [2009,2017]},
        "citigo": {"nf": [2011,2019]},
        "roomster": {"5j": [2006,2015]},
    },
    "subaru": {
        "impreza": {"gc/gf": [1992,2000], "gd/gg": [2000,2007], "ge/gh": [2007,2011], "gp/gj": [2011,2016], "gt": [2016,2026]},
        "legacy": {"bc/bj": [1989,1994], "bd/bg": [1994,1999], "be/bh": [1999,2003], "bl/bp": [2003,2009], "bm/br": [2009,2014], "bs/bn": [2014,2026]},
        "forester": {"sf": [1997,2002], "sg": [2002,2008], "sh": [2008,2013], "sj": [2013,2018], "sk": [2018,2026]},
        "outback": {"bh": [1999,2003], "bp": [2003,2009], "br": [2009,2014], "bs": [2014,2020], "bt": [2020,2026]},
        "wrx": {"gc": [1992,2000], "gd": [2000,2007], "ge": [2007,2014], "va": [2014,2021], "vb": [2022,2026]},
        "xv/crosstrek": {"gp": [2011,2017], "gt": [2017,2026]},
        "brz": {"i": [2012,2020], "ii": [2021,2026]},
        "tribeca": {"wx": [2005,2014]},
        "exiga": {"ya": [2008,2018]},
        "levorg": {"vm": [2014,2020], "vn": [2020,2026]},
        "trezia": {"nc": [2010,2016]},
        "sambar": {"tv": [1999,2012]},
        "vivio": {"kk": [1992,1998]},
        "pleo": {"l": [1998,2010]},
        "stella": {"rn": [2006,2011]},
    },
    "mitsubishi": {
        "lancer": {"ix": [2000,2010], "x": [2007,2017]},
        "lancer evolution": {"iv-vi": [1996,2001], "vii-ix": [2001,2007], "x": [2007,2016]},
        "outlander": {"cu": [2001,2006], "cw": [2006,2012], "gf": [2012,2021], "gn": [2021,2026]},
        "pajero": {"ii": [1991,1999], "iii": [1999,2006], "iv": [2006,2021]},
        "pajero sport": {"i": [1996,2008], "ii": [2008,2015], "iii": [2015,2026]},
        "l200": {"iii": [1996,2006], "iv": [2005,2015], "v": [2015,2026]},
        "asx": {"ga": [2010,2026]},
        "eclipse cross": {"ga": [2017,2026]},
        "colt": {"z30": [2002,2012]},
        "galant": {"viii": [1996,2003]},
        "space star": {"a00": [2012,2026]},
    },
    "lexus": {
        "is": {"xe10": [1998,2005], "xe20": [2005,2013], "xe30": [2013,2026]},
        "es": {"xv10": [1991,1996], "xv20": [1996,2001], "xv30": [2001,2006], "xv40": [2006,2012], "xv60": [2012,2018], "xv70": [2018,2026]},
        "gs": {"s140": [1993,1997], "s160": [1997,2005], "s190": [2005,2011], "l10": [2011,2020]},
        "ls": {"xf10": [1989,1994], "xf20": [1994,2000], "xf30": [2000,2006], "xf40": [2006,2017], "xf50": [2017,2026]},
        "rx": {"xu10": [1998,2003], "xu30": [2003,2008], "al10": [2008,2015], "al20": [2015,2022], "al30": [2022,2026]},
        "nx": {"az10": [2014,2021], "az20": [2021,2026]},
        "gx": {"j120": [2002,2009], "j150": [2009,2023], "j250": [2023,2026]},
        "lx": {"j80": [1996,1997], "j100": [1998,2007], "j200": [2008,2021], "j300": [2021,2026]},
        "ct": {"a10": [2010,2022]},
        "lc": {"z100": [2017,2026]},
        "rc": {"xc10": [2014,2026]},
        "ux": {"za10": [2018,2026]},
        "lm": {"lm10": [2020,2026]},
    },
    "peugeot": {
        "206": {"i поколение": [1998,2006]},
        "207": {"i поколение": [2006,2014]},
        "208": {"a9": [2012,2019], "ub": [2019,2026]},
        "307": {"i поколение": [2001,2008]},
        "308": {"i поколение": [2007,2013], "ii поколение": [2013,2021], "iii поколение": [2021,2026]},
        "407": {"i поколение": [2004,2010]},
        "508": {"i": [2010,2018], "ii": [2018,2026]},
        "2008": {"a94": [2013,2019], "p24": [2019,2026]},
        "3008": {"t84": [2008,2016], "p84": [2016,2023], "p84 ii": [2023,2026]},
        "5008": {"t87": [2009,2017], "p87": [2017,2026]},
    },
    "opel": {
        "corsa": {"a": [1982,1993], "b": [1993,2000], "c": [2000,2006], "d": [2006,2014], "e": [2014,2019], "f": [2019,2026]},
        "astra": {"f": [1991,1998], "g": [1998,2005], "h": [2004,2014], "j": [2009,2015], "k": [2015,2021], "l": [2021,2026]},
        "vectra": {"a": [1988,1995], "b": [1995,2002], "c": [2002,2008]},
        "insignia": {"a": [2008,2017], "b": [2017,2026]},
        "mokka": {"a": [2012,2019], "b": [2020,2026]},
        "zafira": {"a": [1999,2005], "b": [2005,2014], "c": [2011,2019]},
        "omega": {"a": [1986,1993], "b": [1994,2003]},
    },
    "chevrolet": {
        "aveo": {"t200": [2002,2006], "t250": [2006,2011], "t300": [2011,2022]},
        "cruze": {"j300": [2008,2016], "j400": [2016,2026]},
        "lacetti": {"j200": [2002,2018]},
        "captiva": {"c100": [2006,2011], "c140": [2011,2018]},
        "cobalt": {"t250": [2011,2026]},
        "trailblazer": {"i": [2001,2009], "ii": [2019,2026]},
        "niva": {"i": [2002,2020]},
        "spark": {"m200": [2005,2010], "m300": [2010,2022]},
        "camaro": {"v": [2010,2015], "vi": [2016,2026]},
        "corvette": {"c5": [1997,2004], "c6": [2004,2013], "c7": [2013,2019], "c8": [2019,2026]},
    },
    "volvo": {
        "s40": {"ii": [2004,2012]},
        "s60": {"p24": [2000,2009], "p24 рестайл": [2010,2018], "y20": [2018,2026]},
        "s80": {"ts": [1998,2006], "as": [2006,2016]},
        "s90": {"ii": [2016,2026]},
        "v40": {"ii": [2012,2019]},
        "v60": {"i": [2010,2018], "ii": [2018,2026]},
        "v70": {"p80": [1996,2000], "p26": [2000,2007], "bb": [2007,2016]},
        "v90": {"ii": [2016,2026]},
        "xc40": {"v": [2017,2026]},
        "xc60": {"dz": [2008,2017], "uz": [2017,2026]},
        "xc70": {"p26": [2000,2007], "bb": [2007,2016]},
        "xc90": {"c": [2002,2014], "l": [2014,2026]},
        "c30": {"m": [2006,2013]},
        "c70": {"ii": [2006,2013]},
    },
    "land rover": {
        "defender": {"classic": [1983,2016], "l663": [2020,2026]},
        "discovery": {"series i": [1989,1998], "series ii": [1998,2004], "series iii": [2004,2009], "series iv": [2009,2017], "series v": [2017,2026]},
        "range rover": {"classic": [1970,1996], "p38a": [1994,2002], "l322": [2002,2012], "l405": [2012,2021], "l460": [2021,2026]},
        "range rover sport": {"l320": [2005,2013], "l494": [2013,2022], "l461": [2022,2026]},
        "range rover evoque": {"l538": [2011,2018], "l551": [2018,2026]},
        "range rover velar": {"l560": [2017,2026]},
        "freelander": {"l314": [1997,2006], "l359": [2006,2015]},
        "discovery sport": {"l550": [2014,2026]},
    },
    "porsche": {
        "911": {"996": [1997,2004], "997": [2004,2012], "991": [2011,2019], "992": [2019,2026]},
        "cayenne": {"9pa": [2002,2010], "92a": [2010,2017], "9ya": [2017,2026]},
        "macan": {"95b": [2014,2026]},
        "panamera": {"970": [2009,2016], "971": [2016,2026]},
        "718 boxster": {"981": [2012,2016], "982": [2016,2026]},
        "718 cayman": {"981": [2012,2016], "982": [2016,2026]},
        "taycan": {"j1": [2019,2026]},
    },
    "infiniti": {
        "q50": {"v37": [2013,2026]},
        "q60": {"cv37": [2016,2022]},
        "q70": {"y51": [2010,2019]},
        "qx30": {"h15": [2016,2019]},
        "qx50": {"j50": [2013,2017], "j55": [2017,2026]},
        "qx55": {"j55": [2021,2026]},
        "qx60": {"l50": [2013,2020], "l51": [2022,2026]},
        "qx70": {"s51": [2008,2017]},
        "qx80": {"z62": [2010,2026]},
        "g": {"v35": [2002,2007], "v36": [2007,2015]},
        "fx": {"s50": [2003,2008], "s51": [2008,2013]},
    },
    "jaguar": {
        "xe": {"x760": [2015,2024]},
        "xf": {"x250": [2008,2015], "x260": [2015,2026]},
        "xj": {"x350": [2003,2009], "x351": [2009,2019]},
        "e-pace": {"x540": [2017,2026]},
        "f-pace": {"x761": [2016,2026]},
        "i-pace": {"x590": [2018,2026]},
        "f-type": {"x152": [2013,2026]},
    },
    "jeep": {
        "grand cherokee": {"wj": [1999,2004], "wk": [2005,2010], "wk2": [2011,2021], "wl": [2021,2026]},
        "wrangler": {"tj": [1997,2006], "jk": [2007,2018], "jl": [2018,2026]},
        "compass": {"mk": [2007,2017], "mp": [2017,2026]},
        "cherokee": {"xj": [1984,2001], "kj": [2001,2007], "kk": [2008,2013], "kl": [2014,2022]},
        "renegade": {"bu": [2015,2026]},
        "gladiator": {"jt": [2019,2026]},
        "commander": {"xk": [2006,2010]},
    },
    "suzuki": {
        "swift": {"zc/zd": [2004,2010], "fz/nz": [2010,2017], "az": [2017,2026]},
        "vitara": {"ft": [1988,2006], "lt": [2015,2026]},
        "grand vitara": {"jt": [2005,2014]},
        "jimny": {"jb23": [1998,2018], "jb64/jb74": [2018,2026]},
        "sx4": {"yc": [2006,2014], "jy": [2013,2021]},
        "baleno": {"ea": [1995,2002], "wb": [2015,2026]},
        "ignis": {"mf": [2016,2026]},
        "ertiga": {"i поколение": [2012,2026]},
        "kizashi": {"fr": [2009,2015]},
    },
    "haval": {
        "f7": {"i поколение": [2018,2026]},
        "f7x": {"i поколение": [2019,2026]},
        "jolion": {"i поколение": [2020,2026]},
        "h2": {"i поколение": [2014,2020]},
        "h6": {"i поколение": [2011,2017], "ii поколение": [2017,2020], "iii поколение": [2020,2026]},
        "h9": {"i поколение": [2014,2026]},
        "dargo": {"i поколение": [2020,2026]},
        "f5": {"i поколение": [2018,2021]},
    },
    "chery": {
        "tiggo 2": {"i поколение": [2016,2021]},
        "tiggo 3": {"i поколение": [2014,2020]},
        "tiggo 4": {"i поколение": [2017,2026]},
        "tiggo 7": {"i поколение": [2016,2020]},
        "tiggo 7 pro": {"i поколение": [2020,2026]},
        "tiggo 8": {"i поколение": [2018,2026]},
        "tiggo 8 pro": {"i поколение": [2021,2026]},
        "tiggo 8 pro max": {"i поколение": [2022,2026]},
        "tiggo 9": {"i поколение": [2022,2026]},
        "arrizo 5": {"i поколение": [2016,2026]},
        "arrizo 8": {"i поколение": [2022,2026]},
        "qq": {"i поколение": [2003,2012]},
        "amulet": {"i поколение": [1999,2012]},
        "fora": {"i поколение": [2006,2010]},
    },
    "geely": {
        "atlas": {"i поколение": [2017,2020]},
        "atlas pro": {"i поколение": [2020,2026]},
        "coolray": {"i поколение": [2018,2026]},
        "tugella": {"i поколение": [2019,2026]},
        "monjaro": {"i поколение": [2021,2026]},
        "preface": {"i поколение": [2020,2026]},
        "emgrand": {"i поколение": [2009,2016], "ii поколение": [2016,2024]},
        "okavango": {"i поколение": [2020,2026]},
    },
    "byd": {
        "f3": {"i поколение": [2005,2013]},
        "f0": {"i поколение": [2008,2015]},
        "g3": {"i поколение": [2009,2014]},
        "han": {"i поколение": [2020,2026]},
        "tang": {"i поколение": [2014,2018], "ii поколение": [2018,2026]},
        "song": {"i поколение": [2016,2026]},
        "song plus": {"i поколение": [2020,2026]},
        "atto 3": {"i поколение": [2022,2026]},
        "seal": {"i поколение": [2022,2026]},
        "dolphin": {"i поколение": [2021,2026]},
        "seagull": {"i поколение": [2023,2026]},
        "sealion": {"i поколение": [2024,2026]},
    },
    "changan": {
        "cs15": {"i поколение": [2014,2021]},
        "cs35": {"i поколение": [2012,2018]},
        "cs35 plus": {"i поколение": [2018,2026]},
        "cs55": {"i поколение": [2017,2020]},
        "cs55 plus": {"i поколение": [2020,2026]},
        "cs75": {"i поколение": [2014,2019]},
        "cs75 plus": {"i поколение": [2019,2026]},
        "cs85": {"i поколение": [2018,2021]},
        "cs95": {"i поколение": [2017,2022]},
        "eado": {"i поколение": [2013,2026]},
        "uni-t": {"i поколение": [2020,2026]},
        "uni-k": {"i поколение": [2021,2026]},
        "uni-v": {"i поколение": [2022,2026]},
    },
    "daihatsu": {
        "terios": {"j100": [1997,2005], "j200": [2006,2017]},
        "sirion": {"m100": [1998,2004], "m300": [2004,2011]},
        "mira": {"l700": [1998,2006], "l275": [2006,2018]},
        "move": {"l150": [2002,2010]},
        "boon": {"m300": [2004,2010]},
        "rocky": {"a200": [2019,2026]},
    },
    "isuzu": {
        "d-max": {"i": [2002,2012], "ii": [2011,2019], "iii": [2019,2026]},
        "mu-x": {"i": [2013,2020], "ii": [2020,2026]},
        "trooper": {"ii": [1991,2002]},
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


def _find_custom_engines(brand: str, model: str, generation: str = '') -> list:
    """Читает сохранённые пользователем двигатели (например из СТС) для марки/модели."""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, name, volume, power, fuel FROM {SCHEMA}.custom_engines
                WHERE LOWER(brand) = LOWER(%s) AND LOWER(model) = LOWER(%s)
                ORDER BY created_at DESC""",
            (brand.strip(), model.strip()),
        )
        rows = cur.fetchall()
        conn.close()
    except Exception as e:
        print(f"Custom engines read error: {e}")
        return []

    result = []
    for row in rows:
        result.append({
            'id': f"custom_{row[0]}",
            'name': row[1],
            'volume': row[2] or '',
            'power': row[3] or '',
            'fuel': row[4] or 'бензин',
        })
    return result


def _save_custom_engine(brand: str, model: str, generation: str,
                        name: str, volume: str, power: str, fuel: str) -> bool:
    """Сохраняет двигатель (из СТС) в базу, чтобы использовать его позже."""
    if not brand or not model or not name:
        return False
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.custom_engines (brand, model, generation, name, volume, power, fuel)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (brand, model, generation, volume, power) DO NOTHING""",
            (brand.strip(), model.strip(), generation.strip(),
             name.strip(), volume.strip(), power.strip(), (fuel or 'бензин').strip()),
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Custom engine save error: {e}")
        return False


def _merge_engines(primary: list, extra: list) -> list:
    """Объединяет списки двигателей, убирая дубли по объёму+мощности."""
    seen = set()
    merged = []
    for e in extra + primary:
        key = f"{(e.get('volume') or '').strip()}|{(e.get('power') or '').strip()}"
        if key in seen:
            continue
        seen.add(key)
        merged.append(e)
    return merged


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


def _wiki_api(lang: str, params: dict) -> dict:
    base = f"https://{lang}.wikipedia.org/w/api.php"
    params['format'] = 'json'
    qs = urllib.parse.urlencode(params)
    req = urllib.request.Request(f"{base}?{qs}", headers={'User-Agent': 'CarSpecsBot/1.0'})
    with urllib.request.urlopen(req, timeout=8) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _commons_api(params: dict) -> dict:
    base = "https://commons.wikimedia.org/w/api.php"
    params['format'] = 'json'
    qs = urllib.parse.urlencode(params)
    req = urllib.request.Request(f"{base}?{qs}", headers={'User-Agent': 'CarSpecsBot/1.0'})
    with urllib.request.urlopen(req, timeout=8) as resp:
        return json.loads(resp.read().decode('utf-8'))


_TRANSLIT_MAP = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
}


def _transliterate(text: str) -> str:
    """Транслитерирует кириллицу в латиницу (Wikimedia Commons хранит файлы почти всегда на латинице)."""
    result = []
    for ch in text:
        lower = ch.lower()
        if lower in _TRANSLIT_MAP:
            t = _TRANSLIT_MAP[lower]
            result.append(t.capitalize() if ch.isupper() and t else t)
        else:
            result.append(ch)
    return ''.join(result)


def _has_cyrillic(text: str) -> bool:
    return bool(re.search('[а-яА-Я]', text))


def _significant_words(text: str) -> list:
    """Ключевые слова названия модели (без общих слов вроде 'next', 'series')."""
    stop = {'next', 'series', 'i', 'ii', 'iii', 'iv', 'v', 'nn'}
    words = re.findall(r'[a-zA-Zа-яА-Я0-9]+', text.lower())
    return [w for w in words if w not in stop and len(w) > 1]


def _commons_search_image(query: str, must_contain: list = None) -> str:
    """Ищет конкретное фото на Wikimedia Commons (там фото рассортированы по поколениям/кузовам).

    must_contain — список слов, хотя бы одно из которых должно встречаться в названии
    найденного файла (защита от случайных/непохожих фото).
    """
    try:
        search = _commons_api({'action': 'query', 'list': 'search',
                                'srsearch': f"{query} filetype:bitmap",
                                'srnamespace': '6', 'srlimit': '8'})
        hits = search.get('query', {}).get('search', [])
        for hit in hits:
            title = hit.get('title', '')
            if not title.startswith('File:'):
                continue
            if must_contain:
                title_low = title.lower()
                if not any(w in title_low for w in must_contain):
                    continue
            info = _commons_api({'action': 'query', 'titles': title,
                                  'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': '800'})
            pages = info.get('query', {}).get('pages', {})
            for p in pages.values():
                ii = p.get('imageinfo')
                if ii:
                    url = ii[0].get('thumburl') or ii[0].get('url')
                    if url:
                        return url
    except Exception as e:
        print(f"Commons search failed {query}: {e}")
    return ''


def _find_car_image(brand: str, model: str, generation: str = '', year: str = '') -> str:
    """Ищет фото конкретного поколения авто: сначала Wikimedia Commons (точнее по кузовам),
    затем главное изображение страницы Wikipedia как запасной вариант."""
    b = brand.strip()
    m = model.strip()
    g = re.sub(r'\s*(поколение|рестайлинг|series)\s*', '', generation, flags=re.IGNORECASE).strip()

    # Для кириллических марок/моделей — используем транслитерацию, т.к. Commons
    # хранит файлы почти всегда на латинице (иначе поиск не найдёт нужное фото).
    b_q = _transliterate(b) if _has_cyrillic(b) else b
    m_q = _transliterate(m) if _has_cyrillic(m) else m
    g_q = _transliterate(g) if _has_cyrillic(g) else g

    # Ключевые слова модели — хотя бы одно ДОЛЖНО быть в названии найденного файла,
    # иначе принимать случайное непохожее фото нельзя.
    keywords = _significant_words(f"{m_q} {g_q}") or _significant_words(m_q)

    # Сначала пробуем найти фото именно этого поколения через Commons
    if g_q:
        commons_queries = [f"{b_q} {m_q} {g_q}", f"{b_q} {g_q}"]
        for q in commons_queries:
            img = _commons_search_image(q, must_contain=keywords)
            if img:
                return img

    # Общее фото модели (без поколения) через Commons — тоже проверяем на совпадение
    img = _commons_search_image(f"{b_q} {m_q}", must_contain=keywords)
    if img:
        return img

    queries = []
    if g_q:
        queries.append(f"{b_q} {m_q} {g_q}")
    if year:
        queries.append(f"{b_q} {m_q} {year}")
    queries.append(f"{b_q} {m_q}")
    if b_q != b or m_q != m:
        queries.append(f"{b} {m}")

    for lang in ['en', 'ru']:
        for q in queries:
            try:
                # Ищем подходящую страницу
                search = _wiki_api(lang, {'action': 'query', 'list': 'search',
                                           'srsearch': q, 'srlimit': '3', 'srnamespace': '0'})
                hits = search.get('query', {}).get('search', [])
                for hit in hits:
                    title = hit.get('title', '')
                    if not title:
                        continue
                    # Заголовок статьи должен содержать марку или модель — иначе
                    # это случайная непохожая статья (защита от неправильных фото)
                    title_low = title.lower()
                    brand_ok = not b_q or b_q.lower() in title_low
                    model_ok = not keywords or any(w in title_low for w in keywords)
                    if not (brand_ok or model_ok):
                        continue
                    img = _wiki_page_image(lang, title)
                    if img:
                        return img
            except Exception as e:
                print(f"Car image search failed {lang} {q}: {e}")
                continue

    # Ничего не нашли — лучше вернуть пусто, чем показать случайное непохожее фото
    return ''


def _wiki_page_image(lang: str, title: str) -> str:
    """Возвращает URL главного изображения страницы Wikipedia."""
    try:
        data = _wiki_api(lang, {'action': 'query', 'prop': 'pageimages',
                                 'piprop': 'original|thumbnail', 'pithumbsize': '800',
                                 'titles': title})
        pages = data.get('query', {}).get('pages', {})
        for p in pages.values():
            original = (p.get('original') or {}).get('source')
            if original:
                return original
            thumb = (p.get('thumbnail') or {}).get('source')
            if thumb:
                return thumb
    except Exception as e:
        print(f"Wiki page image failed {title}: {e}")
    return ''


def _wiki_get_sections(lang: str, title: str) -> list:
    data = _wiki_api(lang, {'action': 'parse', 'page': title, 'prop': 'sections'})
    return data.get('parse', {}).get('sections', [])


def _wiki_get_section_text(lang: str, title: str, section_idx: int) -> str:
    data = _wiki_api(lang, {'action': 'query', 'prop': 'extracts', 'titles': title,
                             'exlimit': '1', 'explaintext': '1', 'exsectionformat': 'plain',
                             'exchars': '8000', 'exintro': '' if section_idx == 0 else None})
    if section_idx > 0:
        data = _wiki_api(lang, {'action': 'parse', 'page': title, 'prop': 'wikitext',
                                  'section': str(section_idx)})
        wt = data.get('parse', {}).get('wikitext', {}).get('*', '')
        clean = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', wt)
        clean = re.sub(r'\{\{[^}]*\}\}', '', clean)
        clean = re.sub(r'<[^>]+>', '', clean)
        clean = re.sub(r"'{2,}", '', clean)
        return clean.strip()
    pages = data.get('query', {}).get('pages', {})
    for p in pages.values():
        return p.get('extract', '')
    return ''


ENGINE_SECTION_KEYWORDS = [
    'engine', 'powertrain', 'drivetrain', 'motor', 'specification',
    'двигател', 'силов', 'характеристик', 'модификац',
    'performance', 'technical', 'generation', 'variant', 'model',
]


def _extract_engine_sections(lang: str, title: str, generation: str = '') -> str:
    try:
        sections = _wiki_get_sections(lang, title)
    except Exception as e:
        print(f"Wiki sections failed {title}: {e}")
        return ''

    relevant = []
    gen_lower = generation.lower().strip() if generation else ''

    for s in sections:
        line_lower = s.get('line', '').lower()
        level = int(s.get('level', 2))
        idx = int(s.get('index', 0))

        is_engine = any(kw in line_lower for kw in ENGINE_SECTION_KEYWORDS)
        is_gen = gen_lower and (gen_lower in line_lower or any(p in line_lower for p in gen_lower.replace('/', ' ').split()))

        if is_engine or is_gen:
            relevant.append((idx, s.get('line', ''), level))

    if not relevant:
        for s in sections:
            level = int(s.get('level', 2))
            if level <= 2:
                relevant.append((int(s.get('index', 0)), s.get('line', ''), level))
        relevant = relevant[:5]

    result_parts = []
    total_len = 0
    for idx, name, level in relevant[:8]:
        try:
            text = _wiki_get_section_text(lang, title, idx)
            if text and len(text) > 30:
                part = f"=== {name} ===\n{text}"
                result_parts.append(part)
                total_len += len(part)
                if total_len > 6000:
                    break
        except Exception as e:
            print(f"Wiki section {idx} failed: {e}")

    return '\n\n'.join(result_parts)


def _fetch_wiki_text(brand: str, model: str, generation: str = '') -> str:
    b = brand.strip()
    m = model.strip()
    g = generation.strip()

    titles_to_try = []
    if g:
        gen_clean = re.sub(r'[/\\]', '', g).strip()
        gen_code = re.sub(r'\s*(поколение|рестайлинг|series)\s*', '', gen_clean, flags=re.IGNORECASE).strip()
        titles_to_try.append(f"{b} {m} ({gen_clean})")
        titles_to_try.append(f"{b} {m} ({gen_code})")
    titles_to_try.append(f"{b} {m}")

    for lang in ['en', 'ru']:
        for title in titles_to_try:
            try:
                text = _extract_engine_sections(lang, title, g)
                if text and len(text) > 100:
                    print(f"Wiki {lang} sections found: {title} ({len(text)} chars)")
                    return text
            except Exception as e:
                print(f"Wiki {lang} failed {title}: {e}")
                continue

    for lang in ['en', 'ru']:
        for title in titles_to_try:
            try:
                data = _wiki_api(lang, {'action': 'query', 'prop': 'extracts', 'titles': title,
                                         'exlimit': '1', 'explaintext': '1', 'exchars': '6000'})
                pages = data.get('query', {}).get('pages', {})
                for pid, page in pages.items():
                    if pid == '-1':
                        continue
                    text = page.get('extract', '')
                    if text and len(text) > 200:
                        print(f"Wiki {lang} full fallback: {title} ({len(text)} chars)")
                        return text
            except Exception:
                continue

    return ''


def _validate_engines(engines: list) -> list:
    valid = []
    seen = set()
    if not isinstance(engines, list):
        return []
    for e in engines:
        if not isinstance(e, dict):
            continue
        name = str(e.get('name') or '').strip()
        volume = str(e.get('volume') or '').strip()
        power = str(e.get('power') or '').strip()
        if not name:
            continue
        try:
            v = float(volume) if volume else 0
            p = int(float(power)) if power else 0
        except (ValueError, TypeError):
            v, p = 0, 0
        if v and (v < 0.5 or v > 8.0):
            continue
        if p and (p < 30 or p > 800):
            continue
        key = f"{name.lower()}"
        if key in seen:
            continue
        seen.add(key)
        e['name'] = name
        e['volume'] = volume
        e['power'] = power
        e['fuel'] = str(e.get('fuel') or 'бензин').strip()
        e['id'] = str(e.get('id') or len(valid) + 1)
        valid.append(e)
    return valid


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
    actual_max = max(max_tokens, 2000)
    payload = json.dumps({
        'modelUri': f'gpt://{folder_id}/yandexgpt',
        'completionOptions': {
            'stream': False,
            'temperature': 0.1,
            'maxTokens': actual_max,
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


def _yandex_ocr(image_b64: str, api_key: str, folder_id: str) -> str:
    """Распознаёт весь текст с фото через Yandex Vision OCR. Возвращает текст."""
    payload = json.dumps({
        'mimeType': 'JPEG',
        'languageCodes': ['ru', 'en'],
        'model': 'page',
        'content': image_b64,
    }).encode('utf-8')
    r = urllib.request.Request(
        'https://ocr.api.cloud.yandex.net/ocr/v1/recognizeText',
        data=payload,
        headers={
            'Authorization': f'Api-Key {api_key}',
            'x-folder-id': folder_id,
            'x-data-logging-enabled': 'true',
            'Content-Type': 'application/json',
        },
        method='POST',
    )
    with urllib.request.urlopen(r, timeout=40) as resp:
        raw = resp.read().decode('utf-8').strip()

    # Ответ может быть обычным JSON или JSON Lines (несколько объектов)
    def _extract(obj):
        result = obj.get('result') or obj
        annotation = result.get('textAnnotation') or {}
        return annotation.get('fullText', '') or ''

    try:
        return _extract(json.loads(raw))
    except json.JSONDecodeError:
        texts = []
        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                texts.append(_extract(json.loads(line)))
            except json.JSONDecodeError:
                continue
        return '\n'.join(t for t in texts if t)


def _recognize_sts_photo(image_b64: str) -> dict:
    """Распознаёт данные авто по фото СТС: Yandex OCR -> YandexGPT.

    Возвращает {brand, model, year, vin, volume, power, valid, error}.
    """
    api_key = os.environ.get('YANDEX_API_KEY', '')
    folder_id = os.environ.get('YANDEX_FOLDER_ID', '')
    if not api_key or not folder_id:
        return {'valid': False, 'error': 'Распознавание временно недоступно', 'brand': '', 'model': '', 'year': '', 'vin': ''}

    # Отсекаем префикс data:image/...;base64, если он есть
    if ',' in image_b64 and image_b64.strip().startswith('data:'):
        image_b64 = image_b64.split(',', 1)[1]

    # Шаг 1 — распознаём текст с фото
    try:
        ocr_text = _yandex_ocr(image_b64, api_key, folder_id)
    except Exception as e:
        print(f"STS OCR failed: {e}")
        return {'valid': False, 'error': 'Не удалось прочитать фото. Сфотографируйте чётче.', 'brand': '', 'model': '', 'year': '', 'vin': ''}

    print(f"STS OCR text ({len(ocr_text)} chars): {ocr_text[:300]}")
    if not ocr_text or len(ocr_text) < 10:
        return {'valid': False, 'error': 'Текст на фото не распознан. Сфотографируйте СТС чётче.', 'brand': '', 'model': '', 'year': '', 'vin': ''}

    # Шаг 2 — из текста извлекаем данные авто через YandexGPT
    prompt = (
        "Это распознанный текст с российского СТС или ПТС. Извлеки данные автомобиля.\n\n"
        f"ТЕКСТ:\n{ocr_text[:4000]}\n\n"
        "Верни СТРОГО валидный JSON без markdown:\n"
        '{"brand":"марка латиницей (Toyota, BMW, Lada...)","model":"модель","year":"год выпуска 4 цифры",'
        '"vin":"VIN 17 символов","volume":"объём двигателя в литрах, напр 2.0","power":"мощность в л.с., только число"}\n'
        "Правила: марку латиницей в общепринятом виде. Объём переведи из см³ в литры (1998 см³ -> 2.0). "
        "Мощность в л.с. (не кВт). Если поле не найдено — пустая строка. Только JSON."
    )
    ai = _call_ai(api_key, prompt, max_tokens=400, use_openai=False)

    result = {
        'valid': True,
        'error': '',
        'brand': str(ai.get('brand') or '').strip(),
        'model': str(ai.get('model') or '').strip(),
        'year': str(ai.get('year') or '').strip(),
        'vin': str(ai.get('vin') or '').strip().upper(),
        'volume': str(ai.get('volume') or '').strip(),
        'power': str(ai.get('power') or '').strip(),
    }
    if not (result['brand'] or result['vin']):
        result['valid'] = False
        result['error'] = 'Не удалось распознать данные. Сфотографируйте СТС чётче.'

    # Если ИИ вместо названия модели вернул технический индекс шасси (напр. С41А23) —
    # подставляем реальное название модели из справочника
    model_key = result['model'].strip().upper().replace(' ', '')
    if model_key in RU_BODY_CODES:
        real_brand, real_model = RU_BODY_CODES[model_key]
        print(f"STS model code mapped: {result['model']} -> {real_brand} {real_model}")
        result['brand'] = real_brand
        result['model'] = real_model

    return result


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