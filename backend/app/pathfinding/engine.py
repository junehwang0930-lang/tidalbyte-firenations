"""Dijkstra search using illustrative, nonnegative risk-weighted distances."""

from heapq import heappop, heappush
from math import isfinite
from typing import Literal

from pydantic import ValidationError

from app.models import BuildingGraph, HazardSnapshot, RouteResult, UserLocation


def _unavailable(status: Literal['invalid_input', 'no_route']) -> RouteResult:
    return RouteResult(status=status, nodeIds=[], edgeIds=[], totalCost=None, exitNodeId=None)


def find_route(graph: BuildingGraph, hazards: HazardSnapshot, location: UserLocation) -> RouteResult:
    """Return the least-cost eligible exit route; never infer missing risk as zero.

    Inputs must be the shared models. Copies are revalidated because Pydantic
    instances can be mutated after construction. No input or global state changes.
    """
    if not isinstance(graph, BuildingGraph) or not isinstance(hazards, HazardSnapshot) or not isinstance(location, UserLocation):
        return _unavailable('invalid_input')
    try:
        graph = BuildingGraph.model_validate(graph.model_dump(by_alias=True))
        hazards = HazardSnapshot.model_validate(hazards.model_dump(by_alias=True))
        location = UserLocation.model_validate(location.model_dump(by_alias=True))
        hazards.validate_against(graph)
        location.validate_against(graph)
    except (ValidationError, ValueError, TypeError):
        return _unavailable('invalid_input')

    areas = {area.id: area for area in hazards.areas
             if area.fireRisk is not None and area.smokeRisk is not None}
    known = {node.id: areas[node.areaId] for node in graph.nodes if node.areaId in areas}
    start = location.currentNodeId
    if start not in known:
        return _unavailable('no_route')

    adjacency = {node: [] for node in known}
    blocked = set(hazards.blockedEdges)
    for edge in sorted(graph.edges, key=lambda edge: edge.id):
        if edge.id in blocked or edge.from_node not in known or edge.to not in known:
            continue
        source, target = known[edge.from_node], known[edge.to]
        cost = edge.distance * (1 + 5 * max(source.fireRisk, target.fireRisk)
                                + 3 * max(source.smokeRisk, target.smokeRisk))
        if not isfinite(cost):
            return _unavailable('invalid_input')
        adjacency[edge.from_node].append((edge.to, edge.id, cost))
        if edge.bidirectional:
            adjacency[edge.to].append((edge.from_node, edge.id, cost))

    distances = {start: 0.0}
    previous = {}
    queue = [(0.0, start)]
    while queue:
        cost, node = heappop(queue)
        if cost != distances[node]:
            continue
        for neighbor, edge_id, weight in adjacency[node]:
            candidate = cost + weight
            if not isfinite(candidate):
                return _unavailable('invalid_input')
            if candidate < distances.get(neighbor, float('inf')):
                distances[neighbor] = candidate
                previous[neighbor] = (node, edge_id)
                heappush(queue, (candidate, neighbor))

    reachable = [node for node in graph.exitNodeIds if node in distances]
    if not reachable:
        return _unavailable('no_route')
    exit_id = min(reachable, key=lambda node: (distances[node], node))
    node_ids, edge_ids = [exit_id], []
    while node_ids[-1] != start:
        node, edge_id = previous[node_ids[-1]]
        node_ids.append(node)
        edge_ids.append(edge_id)
    return RouteResult(status='ok', nodeIds=node_ids[::-1], edgeIds=edge_ids[::-1],
                       totalCost=distances[exit_id], exitNodeId=exit_id)
