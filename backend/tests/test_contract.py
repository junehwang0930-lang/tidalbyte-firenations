import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.models import BuildingGraph, HazardSnapshot, RouteResult, UserLocation


@pytest.fixture
def graph_data():
    return json.loads((Path(__file__).resolve().parents[2] / 'data/building.json').read_text())


def test_graph_round_trips_wire_keys(graph_data):
    graph = BuildingGraph.model_validate(graph_data)
    assert graph.model_dump(by_alias=True) == graph_data


@pytest.mark.parametrize('mutation', ['duplicate_node', 'duplicate_edge', 'dangling_edge', 'invalid_exit', 'negative_distance', 'nonfinite_coordinate'])
def test_invalid_graph_is_rejected(graph_data, mutation):
    if mutation == 'duplicate_node':
        graph_data['nodes'].append(graph_data['nodes'][0])
    elif mutation == 'duplicate_edge':
        graph_data['edges'].append(graph_data['edges'][0])
    elif mutation == 'dangling_edge':
        graph_data['edges'][0]['to'] = 'missing'
    elif mutation == 'invalid_exit':
        graph_data['exitNodeIds'] = [graph_data['nodes'][0]['id']]
    elif mutation == 'negative_distance':
        graph_data['edges'][0]['distance'] = -1
    else:
        graph_data['nodes'][0]['x'] = float('inf')
    with pytest.raises(ValidationError):
        BuildingGraph.model_validate(graph_data)


def test_unknown_risk_is_not_zero():
    snapshot = HazardSnapshot.model_validate({'time': 0, 'areas': [{'id': 'hall', 'fireRisk': 0}], 'blockedEdges': []})
    assert snapshot.areas[0].fireRisk == 0
    assert snapshot.areas[0].smokeRisk is None
    assert snapshot.model_dump(by_alias=True)['areas'][0]['smokeRisk'] is None


@pytest.mark.parametrize('risk', [-0.1, 1.1, float('nan'), float('inf')])
def test_invalid_risk_is_rejected(risk):
    with pytest.raises(ValidationError):
        HazardSnapshot(time=0, areas=[{'id': 'hall', 'fireRisk': risk}], blockedEdges=[])


def test_cross_model_references(graph_data):
    graph = BuildingGraph.model_validate(graph_data)
    HazardSnapshot(time=0, areas=[], blockedEdges=[]).validate_against(graph)
    UserLocation(currentNodeId=graph.nodes[0].id).validate_against(graph)
    with pytest.raises(ValueError):
        HazardSnapshot(time=0, areas=[{'id': 'missing'}], blockedEdges=[]).validate_against(graph)
    with pytest.raises(ValueError):
        HazardSnapshot(time=0, areas=[], blockedEdges=['missing']).validate_against(graph)
    with pytest.raises(ValueError):
        UserLocation(currentNodeId='missing').validate_against(graph)


def test_unavailable_route_uses_null():
    result = RouteResult(status='no_route', nodeIds=[], edgeIds=[], totalCost=None, exitNodeId=None)
    assert result.model_dump()['totalCost'] is None
    with pytest.raises(ValidationError):
        RouteResult(status='ok', nodeIds=[], edgeIds=[], totalCost=None, exitNodeId=None)
