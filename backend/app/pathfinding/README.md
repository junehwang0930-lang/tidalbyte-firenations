# Python pathfinding

Call `find_route(graph, hazards, location)` from `app.pathfinding` with the shared
Pydantic models. It needs no FastAPI server, simulation generator, or database.
Call it again with a fresh snapshot to recompute a route; it keeps no cached state.

Dijkstra explores the cheapest known route first, updating a node whenever it
finds a cheaper way there. This implementation explores all reachable nodes and
compares every explicitly listed exit. It then follows predecessor links backward
to assemble the node and edge IDs. An exit-shaped node not in `exitNodeIds` is not
eligible. Tied exits are selected by ID; sorted edge IDs make ties reproducible.

Each connection costs `distance * (1 + 5 * fire + 3 * smoke)`, using the larger
of the two endpoint-area scores for each risk. Thus risk can make a longer route
preferable. The weights 5 and 3 are illustrative demo choices, not scientific
constants. `totalCost` is a weighted score, not travel time or a safety guarantee.
Zero-distance edges cost zero; strict improvements prevent loops in zero-cost
cycles. The graph supplies distances and direction; coordinates do not invent
connections. The endpoint approximation cannot represent hazards between nodes.

Blocked edges are removed in both directions. An area needs both known fire and
smoke scores; absent areas and null scores exclude their nodes and incident edges.
This also applies to the starting node and exits. A known starting exit returns
a one-node, zero-edge route with cost zero. Risk 1 increases cost; it is not an
automatic closure. Providers must use `blockedEdges` for absolute exclusions.

Malformed models, dangling references, or nonfinite calculated costs produce
`invalid_input`. Valid data with no reachable eligible exit produces `no_route`.
Both use empty paths and null cost/exit. Models are copied and revalidated to
catch invalid mutations without changing caller data. Unknown data is a valid
incomplete snapshot, not a declaration of zero risk.

Tests use mock snapshots and run independently of Person 2's module:

```powershell
cd backend
.\.venv\Scripts\python.exe -X utf8 -m pytest
```

This is a fictional simulation only. Official alarms and emergency personnel
supersede prototype suggestions. HTTP registration and frontend integration are
deliberately left to a coordinated follow-up; shared contracts are unchanged.
