import json
import os
import urllib.request

def handler(event: dict, context) -> dict:
    """
    Два режима:
    1) POST /engines — подбирает список двигателей для brand/model/year
    2) POST / — подбирает масло, фильтр, интервал и инструкцию с учётом engine
    Принимает: brand, model, year, [engine]
    """
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

    api_key = os.environ.get('DEEPSEEK_API_KEY', '')
    if not api_key:
        return {'statusCode': 500, 'headers': cors, 'body': json.dumps({'error': 'DEEPSEEK_API_KEY не задан'})}

    # Режим 1: подбор двигателей
    if mode == 'engines':
        prompt = f"""Ты автомеханик-эксперт. Для автомобиля {brand} {model} {year} года перечисли ВСЕ варианты двигателей, которые устанавливались на эту модель в этот период.
Включай все модификации: разные объёмы, бензиновые и дизельные, атмосферные и турбированные, разные поколения двигателя если были рестайлинги.
Выдай только JSON (без markdown):
{{
  "engines": [
    {{
      "id": "1az_fe",
      "name": "1AZ-FE 2.0 бензин 150 л.с.",
      "volume": "2.0",
      "fuel": "бензин",
      "power": "150"
    }}
  ]
}}
Правила:
- Перечисли ВСЕ реальные двигатели для этой модели и года, минимум 2-4 варианта если они существовали
- Если двигатель один — всё равно верни массив из одного элемента
- id должен быть уникальным snake_case названием двигателя
- name — полное название с объёмом, типом топлива и мощностью
- Только реальные двигатели, без выдуманных"""

        result = _call_deepseek(api_key, prompt)
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps(result, ensure_ascii=False)}

    # Режим 2: подбор масла и инструкции
    engine = body.get('engine', '').strip()
    engine_str = f", двигатель {engine}" if engine else ""

    prompt = f"""Ты автомеханик-эксперт. Для автомобиля {brand} {model} {year} года{engine_str} выдай JSON (только JSON, без markdown):
{{
  "specs": [
    ["Масло", "10W-40 (или конкретная рекомендация)"],
    ["Объём", "4,5 л (с фильтром)"],
    ["Фильтр", "Артикул или рекомендация"],
    ["Пробка картера", "размер ключа и момент затяжки"],
    ["Интервал", "например 10 000 км или 1 год"],
    ["Двигатель", "{engine if engine else 'стандартный'}"]
  ],
  "oilInterval": 10000,
  "guides": [
    {{
      "id": "oil",
      "title": "Замена масла",
      "icon": "Droplets",
      "steps": [
        {{
          "step": 1,
          "title": "Подготовка",
          "items": ["Прогрейте двигатель 5-10 минут", "Подготовьте: масло, новый фильтр, ёмкость для слива, ключи"],
          "warning": null
        }},
        {{
          "step": 2,
          "title": "Слив старого масла",
          "items": ["Поднимите автомобиль на домкрате или заедьте на яму", "Подставьте ёмкость под сливную пробку", "Открутите пробку ключом на [размер]", "Дайте маслу полностью стечь 10-15 минут"],
          "warning": "Масло горячее! Берегите руки."
        }},
        {{
          "step": 3,
          "title": "Замена масляного фильтра",
          "items": ["Открутите старый фильтр (спецключом или руками)", "Смажьте резиновое кольцо нового фильтра свежим маслом", "Закрутите новый фильтр от руки до упора, затем на 3/4 оборота"],
          "warning": null
        }},
        {{
          "step": 4,
          "title": "Установка пробки",
          "items": ["Очистите резьбу пробки и картера", "Закрутите пробку с моментом затяжки [момент]", "Убедитесь что прокладка/шайба на месте"],
          "warning": null
        }},
        {{
          "step": 5,
          "title": "Заливка нового масла",
          "items": ["Откройте крышку маслозаливной горловины сверху", "Залейте рекомендуемое масло: [марка, вязкость]", "Объём: [объём] (не превышайте MAX на щупе)", "Закройте крышку"],
          "warning": null
        }},
        {{
          "step": 6,
          "title": "Проверка",
          "items": ["Заведите двигатель на 1-2 минуты", "Проверьте нет ли подтёков под машиной", "Заглушите, подождите 5 минут", "Проверьте уровень щупом — должно быть между MIN и MAX"],
          "warning": null
        }}
      ]
    }}
  ]
}}

Адаптируй все детали конкретно под {brand} {model} {year}{engine_str}. Укажи реальные артикулы фильтров, правильную вязкость масла для российского климата, реальный объём двигателя и момент затяжки пробки."""

    result = _call_deepseek(api_key, prompt)
    return {'statusCode': 200, 'headers': cors, 'body': json.dumps(result, ensure_ascii=False)}


def _call_deepseek(api_key: str, prompt: str) -> dict:
    payload = json.dumps({
        'model': 'deepseek-chat',
        'messages': [
            {'role': 'system', 'content': 'Ты отвечаешь только валидным JSON без markdown-обёртки.'},
            {'role': 'user', 'content': prompt}
        ],
        'temperature': 0.2,
        'max_tokens': 2000,
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://api.deepseek.com/chat/completions',
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST'
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))

    content = data['choices'][0]['message']['content'].strip()
    if content.startswith('```'):
        content = content.split('\n', 1)[1].rsplit('```', 1)[0].strip()

    return json.loads(content)