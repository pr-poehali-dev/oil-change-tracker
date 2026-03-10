import os
import hashlib
import psycopg2


def handler(event: dict, context) -> dict:
    """Записывает уникальный визит по IP (один раз в сутки)"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = event.get('headers', {})
    ip = (
        headers.get('Ddg-Connecting-Ip') or
        headers.get('X-Real-Remote-Address') or
        headers.get('X-Original-Forwarded-For') or
        headers.get('X-Real-Ip') or
        headers.get('X-Forwarded-For') or
        event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')
    ).split(',')[0].strip()
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    cur.execute(
        f"INSERT INTO visits (ip_hash, date) VALUES ('{ip_hash}', CURRENT_DATE) ON CONFLICT (ip_hash, date) DO NOTHING"
    )
    conn.commit()
    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': {'ok': True}
    }