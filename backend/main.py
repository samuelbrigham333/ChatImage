"""AI assistance: Initial implementation developed with ChatGPT/Copilot and reviewed and adapted by the student."""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/tmp/uploads"))
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
MAX_WEBSOCKET_MESSAGE_BYTES = 16 * 1024
MAX_CHAT_LENGTH = 1000
MAX_AUTHOR_LENGTH = 40
IMAGE_FORMATS = {
    "JPEG": (".jpg", "image/jpeg"),
    "PNG": (".png", "image/png"),
    "WEBP": (".webp", "image/webp"),
}
PHOTO_PATH_PATTERN = re.compile(r"^/images/[A-Za-z0-9_-]+\.(?:jpg|png|webp)$", re.IGNORECASE)
PHOTO_METADATA: dict[str, dict[str, str]] = {}

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Chat About a Photo API",
    description="Photo uploads, gallery access, and live chat/photo synchronization.",
    version="1.0.0",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.mount("/images", StaticFiles(directory=str(UPLOAD_DIR)), name="images")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class ConnectionManager:
    """Tracks connected clients and shared selection for this process."""

    def __init__(self) -> None:
        self.active_connections: set[WebSocket] = set()
        self.current_photo: str | None = None

    async def connect(self, websocket: WebSocket) -> bool:
        await websocket.accept()
        self.active_connections.add(websocket)
        if self.current_photo:
            try:
                await websocket.send_json({"type": "photo_selected", "url": self.current_photo})
            except (WebSocketDisconnect, RuntimeError, OSError):
                self.disconnect(websocket)
                return False
        return True

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)

    async def broadcast(self, data: dict[str, Any]) -> None:
        failed_connections: list[WebSocket] = []
        for connection in tuple(self.active_connections):
            try:
                await connection.send_json(data)
            except (WebSocketDisconnect, RuntimeError, OSError):
                failed_connections.append(connection)
        for connection in failed_connections:
            self.disconnect(connection)

    async def send_error(self, websocket: WebSocket, detail: str) -> bool:
        try:
            await websocket.send_json({"type": "error", "detail": detail})
            return True
        except (WebSocketDisconnect, RuntimeError, OSError):
            self.disconnect(websocket)
            return False


manager = ConnectionManager()


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Chat About a Photo API", "docs": "/docs", "health": "/health"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/upload-photo")
async def upload_photo(file: UploadFile = File(...)) -> dict[str, str]:
    temporary_path = UPLOAD_DIR / f".{uuid.uuid4().hex}.upload"
    final_path: Path | None = None
    total_bytes = 0
    try:
        with temporary_path.open("wb") as output:
            while chunk := await file.read(64 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Photo exceeds the 8 MB upload limit.")
                output.write(chunk)
        if total_bytes == 0:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")

        try:
            with Image.open(temporary_path) as image:
                if image.format not in IMAGE_FORMATS:
                    raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP image.")
                if image.width * image.height > MAX_IMAGE_PIXELS:
                    raise HTTPException(status_code=413, detail="Image dimensions exceed the supported limit.")
                image.verify()
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
            raise HTTPException(status_code=400, detail="The uploaded file is not a valid supported image.") from error

        image_format = image.format
        extension, _content_type = IMAGE_FORMATS[image_format]
        filename = f"{uuid.uuid4().hex}{extension}"
        final_path = UPLOAD_DIR / filename
        os.replace(temporary_path, final_path)
        uploaded_at = utc_now()
        PHOTO_METADATA[filename] = {"filename": filename, "url": f"/images/{filename}", "uploaded_at": uploaded_at}
        return PHOTO_METADATA[filename]
    except HTTPException:
        raise
    except OSError as error:
        raise HTTPException(status_code=500, detail="The photo could not be stored.") from error
    finally:
        await file.close()
        temporary_path.unlink(missing_ok=True)


@app.get("/photos")
async def list_photos() -> list[dict[str, str]]:
    photos: list[dict[str, str]] = []
    for path in UPLOAD_DIR.iterdir():
        if not path.is_file() or path.suffix.lower() not in {".jpg", ".png", ".webp"}:
            continue
        metadata = PHOTO_METADATA.get(path.name)
        if metadata is None:
            metadata = {
                "filename": path.name,
                "url": f"/images/{path.name}",
                "uploaded_at": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat().replace("+00:00", "Z"),
            }
        photos.append(metadata)
    return sorted(photos, key=lambda photo: photo["uploaded_at"], reverse=True)


def validated_photo_url(value: Any, request_host: str) -> bool:
    if not isinstance(value, str) or not value or len(value) > 2048:
        return False
    try:
        parsed = urlsplit(value)
    except ValueError:
        return False
    if parsed.query or parsed.fragment:
        return False
    if parsed.scheme or parsed.netloc:
        if parsed.scheme not in {"http", "https"} or parsed.netloc.casefold() != request_host.casefold():
            return False
    elif not value.startswith("/"):
        return False
    if PHOTO_PATH_PATTERN.fullmatch(parsed.path) is None:
        return False
    filename = parsed.path.removeprefix("/images/")
    return (UPLOAD_DIR / filename).is_file()


def valid_timestamp(value: Any) -> str:
    if isinstance(value, str) and len(value) <= 64:
        try:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
            return value
        except ValueError:
            pass
    return utc_now()


async def handle_client_message(websocket: WebSocket, raw_message: str) -> bool:
    if len(raw_message.encode("utf-8")) > MAX_WEBSOCKET_MESSAGE_BYTES:
        return await manager.send_error(websocket, "Message exceeds the 16 KB limit.")
    try:
        message = json.loads(raw_message)
    except json.JSONDecodeError:
        return await manager.send_error(websocket, "Message must contain valid JSON.")
    if not isinstance(message, dict):
        return await manager.send_error(websocket, "Message must be a JSON object.")

    message_type = message.get("type")
    if message_type == "chat":
        author = message.get("author")
        text = message.get("text")
        if not isinstance(author, str) or not author.strip() or len(author.strip()) > MAX_AUTHOR_LENGTH:
            return await manager.send_error(websocket, "Chat author must contain 1–40 characters.")
        if not isinstance(text, str) or not text.strip() or len(text) > MAX_CHAT_LENGTH:
            return await manager.send_error(websocket, "Chat text must contain 1–1000 characters.")
        await manager.broadcast({
            "type": "chat",
            "author": author.strip(),
            "text": text.strip(),
            "timestamp": valid_timestamp(message.get("timestamp")),
        })
        return True

    if message_type == "photo_selected":
        url = message.get("url")
        request_host = websocket.headers.get("host", "")
        if not validated_photo_url(url, request_host):
            return await manager.send_error(websocket, "Photo URL must point to an image served by this backend.")
        manager.current_photo = url
        await manager.broadcast({"type": "photo_selected", "url": url})
        return True

    return await manager.send_error(websocket, "Unsupported message type. Use chat or photo_selected.")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    if not await manager.connect(websocket):
        return
    try:
        while True:
            message = await websocket.receive_text()
            if not await handle_client_message(websocket, message):
                return
    except WebSocketDisconnect:
        manager.disconnect(websocket)
