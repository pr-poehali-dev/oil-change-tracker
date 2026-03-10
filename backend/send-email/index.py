import json
import os
import urllib.request

def send_telegram(text: str):
    token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    if not token or not chat_id:
        return
    url = f'https://api.telegram.org/bot{token}/sendMessage'
    payload = json.dumps({'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'}).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'}, method='POST')
    urllib.request.urlopen(req, timeout=10)

def handler(event: dict, context) -> dict:
    '''Отправка заявок в Telegram'''
    
    method = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body = json.loads(event.get('body', '{}'))
    email_type = body.get('type')
    data = body.get('data', {})
    
    if email_type == 'purchase':
        tg_text = (
            "🦷 <b>Заявка на покупку — VAV DENTAL</b>\n\n"
            f"👤 <b>ФИО:</b> {data.get('name')}\n"
            f"🏙 <b>Город:</b> {data.get('city')}\n"
            f"🩺 <b>Специальность:</b> {data.get('specialty')}\n"
            f"📞 <b>Телефон:</b> {data.get('phone')}\n"
            f"💬 <b>Комментарий:</b> {data.get('message', 'Не указан')}"
        )
    elif email_type == 'testdrive':
        tg_text = (
            "🚀 <b>Заявка на тест-драйв — VAV DENTAL</b>\n\n"
            f"👤 <b>ФИО:</b> {data.get('fullName')}\n"
            f"📞 <b>Телефон:</b> {data.get('phone')}\n"
            f"🩺 <b>Специальность:</b> {data.get('specialty')}\n"
            f"🏙 <b>Город:</b> {data.get('city')}"
        )
    elif email_type == 'cart':
        items = data.get('items', [])
        items_tg = '\n'.join([f"  • {item['name']} x{item['quantity']} — {item['price']:,} ₽" for item in items])
        tg_text = (
            "🛒 <b>Новый заказ — VAV DENTAL</b>\n\n"
            f"👤 <b>Имя:</b> {data.get('name')}\n"
            f"📞 <b>Телефон:</b> {data.get('phone')}\n"
            f"📧 <b>Email:</b> {data.get('email', 'Не указан')}\n"
            f"💬 <b>Комментарий:</b> {data.get('comment', 'Нет')}\n\n"
            f"📦 <b>Состав заказа:</b>\n{items_tg}\n\n"
            f"💰 <b>Итого: {data.get('total', 0):,} ₽</b>"
        )
    else:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Unknown type'}),
            'isBase64Encoded': False
        }
    
    send_telegram(tg_text)
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }
