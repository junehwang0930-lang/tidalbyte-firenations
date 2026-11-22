"""HTTP entry point for the shared scaffold and Wayfind training demo."""

from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse

from app.models import BuildingGraph, HealthResponse
from app.pathfinding.atlas_fire import AtlasScenario

GRAPH_PATH = Path(__file__).resolve().parents[2] / 'data' / 'building.json'


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail at startup if the shared fixture violates the contract.
    app.state.graph = BuildingGraph.model_validate_json(GRAPH_PATH.read_text(encoding='utf-8'))
    local = GRAPH_PATH.parent.parent / '.wayfind-local' / 'floor-atlas'
    folder = local if os.getenv('WAYFIND_LOCAL') == '1' else GRAPH_PATH.parent / 'floor-atlas'
    app.state.atlas = folder if folder.is_dir() else None
    scenario = folder / 'scenario.json'
    app.state.atlas_scenario = AtlasScenario.load(scenario) if app.state.atlas and scenario.is_file() else None
    yield


app = FastAPI(title='Fire Nations demo API', lifespan=lifespan)


@app.get('/api/floor-atlas/{level}', include_in_schema=False)
def floor_plate(level: str, request: Request):
    folder = request.app.state.atlas
    if not folder or level not in {'1', '2'}:
        raise HTTPException(404, 'Local floor drawing not available')
    if (not request.client or request.client.host not in {'127.0.0.1', '::1'}
            or request.url.hostname not in {'localhost', '127.0.0.1', '::1'}):
        raise HTTPException(403, 'Local floor drawings are loopback-only')
    file = folder / f'level-{level}.svg'
    if not file.is_file():
        raise HTTPException(404, 'Floor drawing not found')
    return FileResponse(file, media_type='image/svg+xml', headers={
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    })


def atlas_scenario(request: Request):
    scenario = request.app.state.atlas_scenario
    if not scenario:
        raise HTTPException(404, 'Local atlas scenario not loaded')
    if (not request.client or request.client.host not in {'127.0.0.1', '::1'}
            or request.url.hostname not in {'localhost', '127.0.0.1', '::1'}):
        raise HTTPException(403, 'Local training scenario is loopback-only')
    return scenario


@app.get('/api/floor-atlas/scenario/catalog')
def scenario_catalog(request: Request):
    return atlas_scenario(request).catalog()


@app.get('/api/floor-atlas/scenario/route')
def scenario_route(request: Request, response: Response, origin: str, fire: str | None = None,
                   elapsed: int = Query(default=0, ge=0, le=86400)):
    scenario = atlas_scenario(request)
    response.headers['Cache-Control'] = 'no-store'
    try:
        return scenario.route(origin, fire, elapsed)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@app.get('/health', response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.get('/api/graph', response_model=BuildingGraph, response_model_by_alias=True)
def graph(request: Request) -> BuildingGraph:
    return request.app.state.graph
