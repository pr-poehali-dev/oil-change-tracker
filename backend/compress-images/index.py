"""
Сжимает изображения каталога и загружает их обратно в S3.
Возвращает новые URL сжатых изображений.
"""
import os
import json
import boto3
import urllib.request
from io import BytesIO
from PIL import Image


Image.MAX_IMAGE_PIXELS = None
from PIL import ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True


def jpeg_dimensions(data: bytes):
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            break
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            h = (data[i + 5] << 8) | data[i + 6]
            w = (data[i + 7] << 8) | data[i + 8]
            return w, h
        length = (data[i + 2] << 8) | data[i + 3]
        i += 2 + length
    return None, None


def compress_image(url: str, max_size: int = 900, quality: int = 85) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    # Узнаём размер JPEG через парсинг заголовка (без загрузки пикселей)
    w, h = jpeg_dimensions(data)
    buf = BytesIO(data)
    img = Image.open(buf)
    if w and h:
        factor = max(w, h) / max_size
        if factor > 1 and img.format == "JPEG":
            target = (int(w / factor), int(h / factor))
            img.draft("RGB", target)
    img = img.convert("RGB")
    if img.width > max_size or img.height > max_size:
        img.thumbnail((max_size, max_size), Image.LANCZOS)
    out = BytesIO()
    img.save(out, format="JPEG", quality=quality, optimize=True)
    return out.getvalue()


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type"}, "body": ""}

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )

    body = json.loads(event.get("body") or "{}")
    images = body.get("images", [])

    results = []
    for item in images:
        product_id = item["id"]
        url = item["url"]
        key = f"compressed/product_{product_id}.jpg"

        compressed = compress_image(url)
        s3.put_object(Bucket="files", Key=key, Body=compressed, ContentType="image/jpeg")

        new_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        results.append({
            "id": product_id,
            "original_url": url,
            "new_url": new_url,
            "compressed_kb": len(compressed) // 1024,
        })

    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*"},
        "body": json.dumps({"results": results}),
    }