from fastapi.testclient import TestClient

from app.main import app
from test_atlas_fire import corridor


def test_default_startup_does_not_require_private_atlas_or_missing_training_router(monkeypatch):
    monkeypatch.delenv('WAYFIND_LOCAL', raising=False)
    with TestClient(app) as client:
        assert client.get('/health').json() == {'status': 'ok'}
        assert client.get('/api/graph').status_code == 200
        assert client.get('/api/floor-atlas/scenario/catalog').status_code == 404


def test_atlas_route_computes_and_validates_inputs():
    with TestClient(app, base_url='http://localhost', client=('127.0.0.1', 50000)) as client:
        app.state.atlas_scenario = corridor()
        assert client.get('/api/floor-atlas/scenario/catalog').json()['defaultRoom'] == 'middle'
        initial = client.get('/api/floor-atlas/scenario/route', params={'origin': 'middle', 'fire': 'left'})
        assert initial.status_code == 200
        assert initial.headers['cache-control'] == 'no-store'
        assert initial.json()['stair'] == 'E'
        later = client.get('/api/floor-atlas/scenario/route', params={'origin': 'middle', 'fire': 'left', 'elapsed': 200})
        assert later.json()['status'] == 'no_route'
        for params in ({'origin': 'missing'}, {'origin': 'middle', 'elapsed': -1},
                       {'origin': 'middle', 'elapsed': 86401}, {'origin': 'middle', 'fire': 'missing'}):
            assert client.get('/api/floor-atlas/scenario/route', params=params).status_code == 422


def test_private_atlas_remains_loopback_only():
    with TestClient(app, base_url='http://localhost', client=('192.0.2.10', 50000)) as client:
        app.state.atlas_scenario = corridor()
        assert client.get('/api/floor-atlas/scenario/catalog').status_code == 403
    with TestClient(app, base_url='http://untrusted.example', client=('127.0.0.1', 50000)) as client:
        app.state.atlas_scenario = corridor()
        assert client.get('/api/floor-atlas/scenario/route?origin=middle').status_code == 403
