"""
API для управления клиентами CRM дезинсекции.
GET / — список клиентов, POST / — создать, PUT /{id} — обновить.
"""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p33849287_desinsect_service_ma")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    parts = [p for p in path.strip("/").split("/") if p]
    client_id = int(parts[-1]) if parts and parts[-1].isdigit() else None

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            search = (event.get("queryStringParameters") or {}).get("search", "")
            type_filter = (event.get("queryStringParameters") or {}).get("type", "")
            query = f"""
                SELECT c.*,
                    COUNT(o.id) AS orders_count,
                    COALESCE(SUM(o.price), 0) AS total_spent,
                    MAX(o.order_date) AS last_visit
                FROM {SCHEMA}.clients c
                LEFT JOIN {SCHEMA}.orders o ON o.client_id = c.id
                WHERE 1=1
            """
            params = []
            if search:
                query += " AND (c.name ILIKE %s OR c.phone ILIKE %s OR c.address ILIKE %s)"
                params += [f"%{search}%", f"%{search}%", f"%{search}%"]
            if type_filter in ("company", "individual"):
                query += " AND c.type = %s"
                params.append(type_filter)
            query += f" GROUP BY c.id ORDER BY c.created_at DESC"
            cur.execute(query, params)
            rows = cur.fetchall()
            data = []
            for r in rows:
                row = dict(r)
                row["orders_count"] = int(row["orders_count"])
                row["total_spent"] = float(row["total_spent"])
                row["last_visit"] = str(row["last_visit"]) if row["last_visit"] else None
                row["created_at"] = str(row["created_at"])
                row["updated_at"] = str(row["updated_at"])
                data.append(row)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            cur.execute(
                f"INSERT INTO {SCHEMA}.clients (name, phone, email, address, type, notes) VALUES (%s,%s,%s,%s,%s,%s) RETURNING *",
                (body.get("name"), body.get("phone"), body.get("email"), body.get("address"), body.get("type", "individual"), body.get("notes", ""))
            )
            conn.commit()
            row = dict(cur.fetchone())
            row["created_at"] = str(row["created_at"])
            row["updated_at"] = str(row["updated_at"])
            return {"statusCode": 201, "headers": CORS, "body": json.dumps(row, ensure_ascii=False)}

        if method == "PUT" and client_id:
            body = json.loads(event.get("body") or "{}")
            cur.execute(
                f"UPDATE {SCHEMA}.clients SET name=%s, phone=%s, email=%s, address=%s, type=%s, notes=%s, updated_at=NOW() WHERE id=%s RETURNING *",
                (body.get("name"), body.get("phone"), body.get("email"), body.get("address"), body.get("type", "individual"), body.get("notes", ""), client_id)
            )
            conn.commit()
            row = dict(cur.fetchone())
            row["created_at"] = str(row["created_at"])
            row["updated_at"] = str(row["updated_at"])
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(row, ensure_ascii=False)}

    finally:
        cur.close()
        conn.close()

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}
