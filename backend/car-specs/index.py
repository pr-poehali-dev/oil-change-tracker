import json
import os
import urllib.request


def handler(event: dict, context) -> dict:
    """Подбор двигателей, масла, фильтров для автомобиля через ИИ."""
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

    if not brand or not model or not year:
        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'brand, model, year обязательны'})}

    deepseek_key = os.environ.get('DEEPSEEK_API_KEY', '')
    openai_key = os.environ.get('OPENAI_API_KEY', '')
    api_key = deepseek_key or openai_key
    if not api_key:
        return {'statusCode': 500, 'headers': cors, 'body': json.dumps({'error': 'API key не задан'})}
    use_openai = not bool(deepseek_key)

    generation = body.get('generation', '').strip()
    car = f"{brand} {model} {year}" + (f" ({generation})" if generation else "")
    engine = body.get('engine', '').strip()
    eng = f", двиг. {engine}" if engine else ""

    if mode == 'engines':
        prompt = f'Engines for {car}. JSON: {{"engines":[{{"id":"1","name":"1AZ-FE 2.0 бензин 150 л.с.","volume":"2.0","fuel":"бензин","power":"150"}}]}} Up to 12 variants. Include engine code, volume, fuel, power. Russian fuel names.'

        result = _call_ai(api_key, prompt, max_tokens=600, use_openai=use_openai)
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps(result, ensure_ascii=False)}

    if mode == 'filters':
        prompt = f"""Инструкции замены фильтров {car}{eng}. JSON без markdown:
{{"filters":[{{"id":"air_filter","title":"Воздушный фильтр","icon":"Wind","article":"OEM артикул","interval":"30000 км","steps":[{{"step":1,"title":"Шаг","items":["действие"],"warning":null}}]}}]}}
Фильтры: воздушный(Wind), масляный(Droplets), салонный(AirVent), топливный(Fuel). По 3 шага каждый. Реальные артикулы."""

        result = _call_ai(api_key, prompt, max_tokens=1500, use_openai=use_openai)
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'filters': result.get('filters', [])}, ensure_ascii=False)}

    prompt = f"""Подбор масла {car}{eng}. JSON без markdown:
{{"specs":[["Масло","вязкость"],["Объём","X л"],["Фильтр","артикул"],["Пробка","ключ и момент"],["Интервал","км"],["Двигатель","{engine or 'стандартный'}"]],"oilInterval":10000,"guides":[{{"id":"oil","title":"Замена масла","icon":"Droplets","steps":[{{"step":1,"title":"Подготовка","items":["Прогреть 5 мин","Подготовить масло, фильтр, ёмкость"],"warning":null}},{{"step":2,"title":"Слив","items":["Поднять авто","Открутить пробку","Слить 15 мин"],"warning":"Масло горячее!"}},{{"step":3,"title":"Фильтр","items":["Снять старый","Смазать кольцо нового","Установить"],"warning":null}},{{"step":4,"title":"Заливка","items":["Закрутить пробку","Залить масло","Проверить уровень"],"warning":null}},{{"step":5,"title":"Проверка","items":["Завести на 2 мин","Проверить подтёки","Проверить уровень"],"warning":null}}]}}]}}
Адаптируй под конкретный автомобиль: артикулы, вязкость, объём, момент затяжки."""

    result = _call_ai(api_key, prompt, max_tokens=1200, use_openai=use_openai)
    return {'statusCode': 200, 'headers': cors, 'body': json.dumps(result, ensure_ascii=False)}


def _call_ai(api_key: str, prompt: str, max_tokens: int = 1200, use_openai: bool = True) -> dict:
    if use_openai:
        model = 'gpt-4o-mini'
        url = 'https://api.openai.com/v1/chat/completions'
        extra = {'response_format': {'type': 'json_object'}}
    else:
        model = 'deepseek-chat'
        url = 'https://api.deepseek.com/chat/completions'
        extra = {}

    payload = json.dumps({
        'model': model,
        'messages': [
            {'role': 'system', 'content': 'Reply with valid JSON only. No markdown. No explanation.'},
            {'role': 'user', 'content': prompt}
        ],
        'temperature': 0.1,
        'max_tokens': max_tokens,
        'stream': False,
        **extra,
    }).encode('utf-8')

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"AI call failed: {e}")
        return _fallback(prompt)

    content = data['choices'][0]['message']['content'].strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return _fallback(prompt)


def _fallback(prompt: str) -> dict:
    if '"engines"' in prompt:
        return {"engines": []}
    if '"filters"' in prompt:
        return {"filters": []}
    return {"specs": [], "oilInterval": 10000, "guides": []}