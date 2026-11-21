import copy

import pytest

from app.models import BuildingGraph, HazardSnapshot, UserLocation
from app.pathfinding import find_route


@pytest.fixture
def inputs():
    graph = BuildingGraph(nodes=[dict(id=n, areaId=n, x=0, y=0, floor=1,
        kind='exit' if n in ('a', 'b') else 'corridor') for n in ('s', 'j', 'a', 'b')],
        edges=[dict(id=i, **{'from': a}, to=b, distance=d, bidirectional=True)
            for i, a, b, d in [('sj', 's', 'j', 1), ('ja', 'j', 'a', 1), ('sb', 's', 'b', 4)]],
        exitNodeIds=['b', 'a'])
    hazard = HazardSnapshot(time=0, areas=[dict(id=n.id, fireRisk=0, smokeRisk=0) for n in graph.nodes], blockedEdges=[])
    return graph, hazard, UserLocation(currentNodeId='s')


def test_shortest_exit_and_contract(inputs):
    result = find_route(*inputs)
    assert result.model_dump() == dict(status='ok', nodeIds=['s', 'j', 'a'], edgeIds=['sj', 'ja'], totalCost=2, exitNodeId='a')


@pytest.mark.parametrize('field', ['fireRisk', 'smokeRisk'])
def test_risk_changes_best_exit(inputs, field):
    graph, hazard, user = inputs
    setattr(hazard.areas[1], field, 1)
    assert find_route(graph, hazard, user).exitNodeId == 'b'
    setattr(hazard.areas[1], field, 0)
    assert find_route(graph, hazard, user).exitNodeId == 'a'


def test_blocked_edges_and_no_route(inputs):
    g, h, u = inputs
    h.blockedEdges = ['ja']
    assert find_route(g, h, u).exitNodeId == 'b'
    h.blockedEdges.append('sb')
    result = find_route(g, h, u)
    assert result.status == 'no_route'
    assert result.nodeIds == result.edgeIds == []
    assert result.totalCost is result.exitNodeId is None


@pytest.mark.parametrize('unknown', ['absent', 'fireRisk', 'smokeRisk'])
def test_unknown_area_excluded(inputs, unknown):
    g, h, u = inputs
    if unknown == 'absent':
        h.areas.pop(1)
    else:
        setattr(h.areas[1], unknown, None)
    assert find_route(g, h, u).exitNodeId == 'b'


def test_unknown_start_and_exit(inputs):
    g, h, u = inputs
    h.areas[0].fireRisk = None
    assert find_route(g, h, u).status == 'no_route'
    u.currentNodeId = 's'
    h.areas[0].fireRisk = 0
    h.areas[2].smokeRisk = None
    assert find_route(g, h, u).exitNodeId == 'b'


def test_direction_and_disconnected_exit(inputs):
    g, h, u = inputs
    g.edges[0].bidirectional = False
    u.currentNodeId = 'j'
    g.exitNodeIds = ['b']
    assert find_route(g, h, u).status == 'no_route'
    g.edges[0].bidirectional = True
    assert find_route(g, h, u).nodeIds == ['j', 's', 'b']


def test_already_at_exit_and_no_exits(inputs):
    g, h, u = inputs
    u.currentNodeId = 'a'
    result = find_route(g, h, u)
    assert result.nodeIds == ['a'] and result.edgeIds == [] and result.totalCost == 0
    g.exitNodeIds = []
    assert find_route(g, h, u).status == 'no_route'


@pytest.mark.parametrize('bad', ['node', 'edge', 'area', 'blocked', 'risk', 'distance', 'duplicate'])
def test_invalid_mutated_models(inputs, bad):
    g, h, u = inputs
    if bad == 'node': u.currentNodeId = 'missing'
    elif bad == 'edge': g.edges[0].to = 'missing'
    elif bad == 'area': h.areas[0].id = 'missing'
    elif bad == 'blocked': h.blockedEdges = ['missing']
    elif bad == 'risk': h.areas[0].fireRisk = float('nan')
    elif bad == 'distance': g.edges[0].distance = -1
    else: g.nodes.append(g.nodes[0])
    assert find_route(g, h, u).status == 'invalid_input'


def test_wrong_types_and_overflow(inputs):
    g, h, u = inputs
    assert find_route(None, h, u).status == 'invalid_input'
    g.edges[0].distance = 1e308
    h.areas[0].fireRisk = 1
    assert find_route(g, h, u).status == 'invalid_input'


def test_zero_cycle_parallel_edges_and_purity(inputs):
    g, h, u = inputs
    g.edges[0].distance = 0
    g.edges.append(g.edges[0].model_copy(update={'id': 'parallel', 'distance': 10}))
    original = copy.deepcopy(inputs)
    assert find_route(g, h, u).totalCost == 1
    assert inputs == original
    assert find_route(g, h, u) == find_route(g, h, u)


def test_endpoint_maximum_cost(inputs):
    g, h, u = inputs
    g.exitNodeIds = ['a']
    h.areas[1].fireRisk = .2
    h.areas[2].smokeRisk = .5
    assert find_route(g, h, u).totalCost == pytest.approx(5.5)


def test_equal_cost_exits_use_stable_id_not_input_order(inputs):
    g, h, u = inputs
    g.edges[2].distance = 2
    assert find_route(g, h, u).exitNodeId == 'a'
    g.exitNodeIds.reverse()
    g.edges.reverse()
    assert find_route(g, h, u).exitNodeId == 'a'


def test_accumulated_cost_overflow_is_invalid(inputs):
    g, h, u = inputs
    g.edges[0].distance = 1e308
    g.edges[1].distance = 1e308
    assert find_route(g, h, u).status == 'invalid_input'
