"""
API для управления заявками CRM дезинсекции.
GET / — список, POST / — создать, PUT /{id} — обновить статус/данные.
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
    order_id = int(parts[-1]) if parts and parts[-1].isdigit() else None

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            params_qs = event.get("queryStringParameters") or {}
            search = params_qs.get("search", "")
            status_filter = params_qs.get("status", "")
            query = f"SELECT * FROM {SCHEMA}.orders WHERE 1=1"
            params = []
            if search:
                query += " AND (client_name ILIKE %s OR address ILIKE %s OR service ILIKE %s)"
                params += [f"%{search}%", f"%{search}%", f"%{search}%"]
            if status_filter and status_filter != "all":
                query += " AND status = %s"
                params.append(status_filter)
            query += " ORDER BY created_at DESC"
            cur.execute(query, params)
            rows = cur.fetchall()
            data = []
            for r in rows:
                row = dict(r)
                row["price"] = float(row["price"])
                row["order_date"] = str(row["order_date"]) if row["order_date"] else None
                row["order_time"] = str(row["order_time"]) if row["order_time"] else None
                row["created_at"] = str(row["created_at"])
                row["updated_at"] = str(row["updated_at"])
                data.append(row)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            cur.execute(
                f"""INSERT INTO {SCHEMA}.orders
                    (client_id, client_name, phone, address, service, order_date, order_time, price, status, notes)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
                (
                    body.get("client_id"), body.get("client_name"), body.get("phone"),
                    body.get("address"), body.get("service"),
                    body.get("order_date"), body.get("order_time"),
                    body.get("price", 0), body.get("status", "new"), body.get("notes", "")
                )
            )
            conn.commit()
            row = dict(cur.fetchone())
            row["price"] = float(row["price"])
            row["order_date"] = str(row["order_date"]) if row["order_date"] else None
            row["order_time"] = str(row["order_time"]) if row["order_time"] else None
            row["created_at"] = str(row["created_at"])
            row["updated_at"] = str(row["updated_at"])
            return {"statusCode": 201, "headers": CORS, "body": json.dumps(row, ensure_ascii=False)}

        if method == "PUT" and order_id:
            body = json.loads(event.get("body") or "{}")
            fields = []
            vals = []
            for key in ("client_name", "phone", "address", "service", "order_date", "order_time", "price", "status", "notes"):
                if key in body:
                    fields.append(f"{key}=%s")
                    vals.append(body[key])
            fields.append("updated_at=NOW()")
            vals.append(order_id)
            cur.execute(
                f"UPDATE {SCHEMA}.orders SET {', '.join(fields)} WHERE id=%s RETURNING *",
                vals
            )
            conn.commit()
            row = dict(cur.fetchone())
            row["price"] = float(row["price"])
            row["order_date"] = str(row["order_date"]) if row["order_date"] else None
            row["order_time"] = str(row["order_time"]) if row["order_time"] else None
            row["created_at"] = str(row["created_at"])
            row["updated_at"] = str(row["updated_at"])
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(row, ensure_ascii=False)}

    finally:
        cur.close()
        conn.close()

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}
