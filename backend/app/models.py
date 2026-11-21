"""Authoritative JSON contract. All risk values are illustrative demo scores."""

from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

Identifier = Annotated[str, Field(min_length=1, pattern=r'^\S+$')]
FiniteNumber = Annotated[float, Field(allow_inf_nan=False)]
NonnegativeNumber = Annotated[float, Field(ge=0, allow_inf_nan=False)]
Risk = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]


class ContractModel(BaseModel):
    model_config = ConfigDict(extra='forbid', populate_by_name=True)


class GraphNode(ContractModel):
    id: Identifier
    areaId: Identifier
    x: FiniteNumber
    y: FiniteNumber
    floor: int
    kind: Literal['room', 'corridor', 'junction', 'exit']


class GraphEdge(ContractModel):
    id: Identifier
    from_node: Identifier = Field(alias='from')
    to: Identifier
    distance: NonnegativeNumber
    bidirectional: bool


class BuildingGraph(ContractModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    exitNodeIds: list[Identifier]

    @model_validator(mode='after')
    def validate_references(self) -> Self:
        nodes = {node.id: node for node in self.nodes}
        if len(nodes) != len(self.nodes):
            raise ValueError('Node IDs must be unique')
        if len({edge.id for edge in self.edges}) != len(self.edges):
            raise ValueError('Edge IDs must be unique')
        if len(set(self.exitNodeIds)) != len(self.exitNodeIds):
            raise ValueError('Exit IDs must be unique')
        for edge in self.edges:
            if edge.from_node not in nodes or edge.to not in nodes:
                raise ValueError('Edge endpoints must reference existing nodes')
        for node_id in self.exitNodeIds:
            if node_id not in nodes or nodes[node_id].kind != 'exit':
                raise ValueError('Exit IDs must reference nodes of kind exit')
        return self


class AreaHazard(ContractModel):
    id: Identifier
    fireRisk: Risk | None = None
    smokeRisk: Risk | None = None


class HazardSnapshot(ContractModel):
    time: NonnegativeNumber
    areas: list[AreaHazard]
    blockedEdges: list[Identifier]

    @model_validator(mode='after')
    def validate_unique_ids(self) -> Self:
        if len({area.id for area in self.areas}) != len(self.areas):
            raise ValueError('Hazard area IDs must be unique')
        if len(set(self.blockedEdges)) != len(self.blockedEdges):
            raise ValueError('Blocked edge IDs must be unique')
        return self

    def validate_against(self, graph: BuildingGraph) -> Self:
        """Check references; absent areas/scores still mean unknown risk."""
        if not {area.id for area in self.areas} <= {node.areaId for node in graph.nodes}:
            raise ValueError('Hazard areas must exist in the graph')
        if not set(self.blockedEdges) <= {edge.id for edge in graph.edges}:
            raise ValueError('Blocked edges must exist in the graph')
        return self


class UserLocation(ContractModel):
    currentNodeId: Identifier

    def validate_against(self, graph: BuildingGraph) -> Self:
        if self.currentNodeId not in {node.id for node in graph.nodes}:
            raise ValueError('User location must reference an existing node')
        return self


class RouteResult(ContractModel):
    status: Literal['ok', 'no_route', 'invalid_input']
    nodeIds: list[Identifier]
    edgeIds: list[Identifier]
    totalCost: NonnegativeNumber | None
    exitNodeId: Identifier | None

    @model_validator(mode='after')
    def validate_result(self) -> Self:
        if self.status == 'ok':
            if not self.nodeIds or self.totalCost is None or self.exitNodeId != self.nodeIds[-1]:
                raise ValueError('Successful routes require a cost and an ending exit node')
            if len(self.edgeIds) != len(self.nodeIds) - 1:
                raise ValueError('Routes require one edge between each pair of nodes')
        elif self.nodeIds or self.edgeIds or self.totalCost is not None or self.exitNodeId is not None:
            raise ValueError('Unavailable routes require empty paths and null cost/exit')
        return self


class HealthResponse(ContractModel):
    status: Literal['ok'] = 'ok'
