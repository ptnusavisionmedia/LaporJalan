import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import main
from app.detector import Box, ModelUnavailable

TOKEN = {"X-Internal-Token": "secret"}


def png(size=(64, 64)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, "gray").save(buf, "PNG")
    return buf.getvalue()


class FakeDetector:
    version = "test-v0"

    def __init__(self, boxes):
        self._boxes = boxes

    def detect(self, image):
        return self._boxes


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_INTERNAL_TOKEN", "secret")
    main.get_detector.cache_clear()


@pytest.fixture
def client():
    return TestClient(main.app)


def post(client, content=None, ctype="image/png", headers=TOKEN):
    return client.post("/analyze", files={"file": ("a.png", content if content is not None else png(), ctype)}, headers=headers)


def use_detector(monkeypatch, detector=None, error=None):
    def fake():
        if error:
            raise error
        return detector

    monkeypatch.setattr(main, "get_detector", fake)


def test_requires_token(client):
    assert post(client, headers={}).status_code == 401
    assert post(client, headers={"X-Internal-Token": "wrong"}).status_code == 401


def test_fails_closed_when_secret_unset(client, monkeypatch):
    monkeypatch.delenv("AI_SERVICE_INTERNAL_TOKEN")
    assert post(client, headers={"X-Internal-Token": ""}).status_code == 401


def test_unsupported_type(client):
    assert post(client, ctype="application/pdf").status_code == 415


def test_not_actually_an_image(client):
    assert post(client, content=b"not an image").status_code == 422


def test_too_large(client):
    assert post(client, content=b"0" * (5 * 1024 * 1024 + 10)).status_code == 413


def test_model_missing_returns_503_not_fake_data(client, monkeypatch):
    use_detector(monkeypatch, error=ModelUnavailable("no weights"))
    r = post(client)
    assert r.status_code == 503
    assert r.json()["detail"]["code"] == "model_unavailable"


def test_no_detection(client, monkeypatch):
    use_detector(monkeypatch, FakeDetector([]))
    body = post(client).json()
    assert body["category"] == "none" and body["boxes"] == []


def test_low_confidence_filtered(client, monkeypatch):
    use_detector(monkeypatch, FakeDetector([Box("pothole", "D40", 0.10, 0, 0, 10, 10)]))
    assert post(client).json()["category"] == "none"


def test_detection_returns_structure(client, monkeypatch):
    use_detector(monkeypatch, FakeDetector([Box("pothole", "D40", 0.9, 0, 0, 32, 32)]))
    body = post(client).json()
    assert body["category"] == "pothole"
    assert body["model_version"] == "test-v0"
    assert body["severity_estimate"] == "critical"  # 25% of frame
    assert len(body["boxes"]) == 1


def test_health_degraded_without_model(client, monkeypatch):
    use_detector(monkeypatch, error=ModelUnavailable("no weights"))
    assert client.get("/health").json()["status"] == "degraded"
