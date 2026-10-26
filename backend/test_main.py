"""AI assistance: Initial implementation developed with ChatGPT/Copilot and reviewed and adapted by the student."""
import os
import tempfile
from io import BytesIO
from pathlib import Path

from PIL import Image

TEST_UPLOAD_DIR = Path(tempfile.mkdtemp(prefix="chat-about-a-photo-tests-"))
os.environ["UPLOAD_DIR"] = str(TEST_UPLOAD_DIR)

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

client = TestClient(main.app)


def png_bytes(color: str = "navy") -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (12, 12), color=color).save(buffer, format="PNG")
    return buffer.getvalue()


def reset_shared_state() -> None:
    main.PHOTO_METADATA.clear()
    main.manager.current_photo = None
    for path in TEST_UPLOAD_DIR.iterdir():
        if path.is_file():
            path.unlink()


def test_health_docs_and_root():
    assert client.get("/").status_code == 200
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/docs").status_code == 200


def test_photo_upload_gallery_and_image_serving():
    reset_shared_state()
    assert client.get("/photos").json() == []
    response = client.post(
        "/upload-photo",
        files={"file": ("sample.png", png_bytes(), "image/png")},
    )
    assert response.status_code == 200
    photo = response.json()
    assert photo["filename"].endswith(".png")
    assert photo["url"].startswith("/images/")
    assert photo["uploaded_at"]

    gallery = client.get("/photos")
    assert gallery.status_code == 200
    assert [item["filename"] for item in gallery.json()] == [photo["filename"]]
    image_response = client.get(photo["url"])
    assert image_response.status_code == 200
    assert image_response.headers["content-type"] == "image/png"


def test_rejects_unsupported_and_invalid_images():
    reset_shared_state()
    unsupported = client.post(
        "/upload-photo",
        files={"file": ("notes.txt", b"not an image", "text/plain")},
    )
    assert unsupported.status_code == 400
    malformed = client.post(
        "/upload-photo",
        files={"file": ("fake.png", b"not a png", "image/png")},
    )
    assert malformed.status_code == 400
    empty = client.post(
        "/upload-photo",
        files={"file": ("empty.png", b"", "image/png")},
    )
    assert empty.status_code == 400
    too_large = client.post(
        "/upload-photo",
        files={"file": ("large.png", b"x" * (main.MAX_UPLOAD_BYTES + 1), "image/png")},
    )
    assert too_large.status_code == 413


def test_websocket_chat_photo_sync_validation_and_disconnect():
    reset_shared_state()
    uploaded = client.post(
        "/upload-photo",
        files={"file": ("sample.png", png_bytes(), "image/png")},
    ).json()
    photo_url = f"http://testserver{uploaded['url']}"
    with client.websocket_connect("/ws") as first:
        with client.websocket_connect("/ws") as second:
            first.send_text("{bad json")
            assert first.receive_json()["type"] == "error"
            first.send_json({"type": "chat", "author": "Device", "text": "   "})
            assert first.receive_json()["type"] == "error"

            first.send_json({
                "type": "chat",
                "author": "Device",
                "text": "Hello from a test",
                "timestamp": "2026-10-26T18:00:00Z",
            })
            assert first.receive_json()["text"] == "Hello from a test"
            assert second.receive_json()["text"] == "Hello from a test"

            first.send_json({"type": "unrecognized"})
            assert first.receive_json()["type"] == "error"
            first.send_json({"type": "photo_selected", "url": "https://example.com/images/elsewhere.jpg"})
            assert first.receive_json()["type"] == "error"
            first.send_json({"type": "photo_selected", "url": "http://testserver/images/not-uploaded.jpg"})
            assert first.receive_json()["type"] == "error"

            first.send_json({"type": "photo_selected", "url": photo_url})
            assert first.receive_json() == {"type": "photo_selected", "url": photo_url}
            assert second.receive_json() == {"type": "photo_selected", "url": photo_url}

        assert len(main.manager.active_connections) == 1
    assert not main.manager.active_connections


def test_latest_selected_photo_is_sent_to_new_connections():
    reset_shared_state()
    uploaded = client.post(
        "/upload-photo",
        files={"file": ("sample.png", png_bytes(), "image/png")},
    ).json()
    selected_url = f"http://testserver{uploaded['url']}"
    main.manager.current_photo = selected_url
    with client.websocket_connect("/ws") as websocket:
        assert websocket.receive_json() == {"type": "photo_selected", "url": selected_url}
    assert not main.manager.active_connections


def teardown_module():
    for path in TEST_UPLOAD_DIR.iterdir():
        if path.is_file():
            path.unlink()
    TEST_UPLOAD_DIR.rmdir()
