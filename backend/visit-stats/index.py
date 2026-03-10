import os
import psycopg2


def handler(event: dict, context) -> dict:
    """Возвращает статистику уникальных визитов: всего, за сегодня, за 7 дней, за 30 дней, по дням за последние 30 дней"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    cur.execute("SELECT COUNT(DISTINCT ip_hash) FROM visits")
    total = cur.fetchone()[0]

    cur.execute("SELECT COUNT(DISTINCT ip_hash) FROM visits WHERE date = CURRENT_DATE")
    today = cur.fetchone()[0]

    cur.execute("SELECT COUNT(DISTINCT ip_hash) FROM visits WHERE date >= CURRENT_DATE - INTERVAL '7 days'")
    week = cur.fetchone()[0]

    cur.execute("SELECT COUNT(DISTINCT ip_hash) FROM visits WHERE date >= CURRENT_DATE - INTERVAL '30 days'")
    month = cur.fetchone()[0]

    cur.execute("""
        SELECT date::text, COUNT(DISTINCT ip_hash) as count
        FROM visits
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date
        ORDER BY date ASC
    """)
    by_day = [{'date': row[0], 'count': row[1]} for row in cur.fetchall()]

    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': {
            'total': total,
            'today': today,
            'week': week,
            'month': month,
            'by_day': by_day
        }
    }