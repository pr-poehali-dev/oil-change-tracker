"""
API для управления сметами и счетами CRM дезинсекции.
GET / — список документов, POST / — создать документ, PUT /{id} — обновить.
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
    doc_id = int(parts[-1]) if parts and parts[-1].isdigit() else None

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            type_filter = (event.get("queryStringParameters") or {}).get("type", "")
            query = f"SELECT * FROM {SCHEMA}.documents WHERE 1=1"
            params = []
            if type_filter in ("estimate", "invoice"):
                query += " AND type = %s"
                params.append(type_filter)
            query += " ORDER BY created_at DESC"
            cur.execute(query, params)
            rows = cur.fetchall()
            data = []
            for r in rows:
                row = dict(r)
                row["items"] = row["items"] if isinstance(row["items"], list) else json.loads(row["items"] or "[]")
                row["issue_date"] = str(row["issue_date"]) if row["issue_date"] else None
                row["due_date"] = str(row["due_date"]) if row["due_date"] else None
                row["created_at"] = str(row["created_at"])
                row["updated_at"] = str(row["updated_at"])
                data.append(row)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            items_json = json.dumps(body.get("items", []), ensure_ascii=False)
            cur.execute(
                f"""INSERT INTO {SCHEMA}.documents
                    (doc_number, type, client_id, client_name, order_id, issue_date, due_date, status, items)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
                (
                    body.get("doc_number"), body.get("type", "estimate"),
                    body.get("client_id"), body.get("client_name"),
                    body.get("order_id"), body.get("issue_date"), body.get("due_date"),
                    body.get("status", "draft"), items_json
                )
            )
            conn.commit()
            row = dict(cur.fetchone())
            row["items"] = row["items"] if isinstance(row["items"], list) else json.loads(row["items"] or "[]")
            row["issue_date"] = str(row["issue_date"]) if row["issue_date"] else None
            row["due_date"] = str(row["due_date"]) if row["due_date"] else None
            row["created_at"] = str(row["created_at"])
            row["updated_at"] = str(row["updated_at"])
            return {"statusCode": 201, "headers": CORS, "body": json.dumps(row, ensure_ascii=False)}

        if method == "PUT" and doc_id:
            body = json.loads(event.get("body") or "{}")
            fields = []
            vals = []
            for key in ("doc_number", "type", "client_name", "issue_date", "due_date", "status"):
                if key in body:
                    fields.append(f"{key}=%s")
                    vals.append(body[key])
            if "items" in body:
                fields.append("items=%s")
                vals.append(json.dumps(body["items"], ensure_ascii=False))
            fields.append("updated_at=NOW()")
            vals.append(doc_id)
            cur.execute(
                f"UPDATE {SCHEMA}.documents SET {', '.join(fields)} WHERE id=%s RETURNING *",
                vals
            )
            conn.commit()
            row = dict(cur.fetchone())
            row["items"] = row["items"] if isinstance(row["items"], list) else json.loads(row["items"] or "[]")
            row["issue_date"] = str(row["issue_date"]) if row["issue_date"] else None
            row["due_date"] = str(row["due_date"]) if row["due_date"] else None
            row["created_at"] = str(row["created_at"])
            row["updated_at"] = str(row["updated_at"])
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(row, ensure_ascii=False)}

    finally:
        cur.close()
        conn.close()

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}
