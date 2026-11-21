"""HTTP entry point. Simulation and pathfinding are separate future modules."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request

from app.models import BuildingGraph, HealthResponse

GRAPH_PATH = Path(__file__).resolve().parents[2] / 'data' / 'building.json'


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail at startup if the shared fixture violates the contract.
    app.state.graph = BuildingGraph.model_validate_json(GRAPH_PATH.read_text(encoding='utf-8'))
    yield


app = FastAPI(title='Fire Nations demo API', lifespan=lifespan)


@app.get('/health', response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.get('/api/graph', response_model=BuildingGraph, response_model_by_alias=True)
def graph(request: Request) -> BuildingGraph:
    return request.app.state.graph
