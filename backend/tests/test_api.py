import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


def test_health():
    with TestClient(app) as client:
        response = client.get('/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}


def test_graph_matches_fixture_from_any_working_directory(tmp_path, monkeypatch):
    expected = json.loads((Path(__file__).resolve().parents[2] / 'data/building.json').read_text())
    monkeypatch.chdir(tmp_path)
    with TestClient(app) as client:
        response = client.get('/api/graph')
    assert response.status_code == 200
    assert response.headers['content-type'] == 'application/json'
    assert response.json() == expected
