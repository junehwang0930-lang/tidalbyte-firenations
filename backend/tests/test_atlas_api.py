from fastapi.testclient import TestClient

from app.main import app
from test_atlas_fire import corridor


def test_fresh_checkout_serves_bundled_atlas(monkeypatch):
    monkeypatch.delenv('WAYFIND_LOCAL', raising=False)
    with TestClient(app, base_url='http://localhost', client=('127.0.0.1', 50000)) as client:
        assert client.get('/health').json() == {'status': 'ok'}
        assert client.get('/api/graph').status_code == 200
        for floor in (1, 2):
            plate = client.get(f'/api/floor-atlas/{floor}')
            assert plate.status_code == 200 and 'image/svg+xml' in plate.headers['content-type']
            assert 'viewBox="0 0 1240 740"' in plate.text
        catalog = client.get('/api/floor-atlas/scenario/catalog').json()
        assert any(room['id'] == '2300C' for room in catalog['rooms'])
        route = client.get('/api/floor-atlas/scenario/route', params={'origin': '2300C', 'fire': '2300B'}).json()
        assert route['status'] == 'ok' and route['forecast']['smoke']
        assert [leg['level'] for leg in route['legs']] == [2, 1]
        assert route['exitName'] and len(route['legs'][1]['points']) >= 2


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
