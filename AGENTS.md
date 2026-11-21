# Fire Nations — shared project instructions

Read this file before implementing anything. It is the shared contract for all team members and AI coding agents. Keep changes scoped to the assigned feature branch.

## Project goal

Build a student hackathon prototype showing how a dynamically updated 2D indoor navigation map can recommend evacuation routes around simulated hazards in a building inspired by the MSC at Texas A&M. This is a demonstration, not a validated emergency navigation system. Use fictional/simplified layouts until an approved building map is available. Never represent simulated risk as validated safety information.

## Scope and priorities

MVP: interactive 2D floorplan, simulated user location, simulated fire/smoke and blocked pathways, hazard visualization, multiple simulated exit candidates, risk-weighted routing and automatic rerouting, no-route handling, and simulation controls. Future: verified building data, approved integration with fire alarm/access-control systems and indoor positioning, CFAST/FDS-based validated modeling, accessibility support based on verified building plans, firefighter dashboard, AR/3D, and campus app integration. Do not connect to or modify any real building life-safety system.

## Shared project setup

Recommended stack (confirm with team before changing it): React + TypeScript + Vite, SVG for the 2D map, TypeScript for the hazard simulation and routing engine, JSON fixtures, npm and GitHub. Keep the MVP client-side; no database or server is required. If an existing application already uses a different stack, discuss before replacing it.

Establish the shared app scaffold, types and fictional fixture on main through a team-approved setup commit before feature implementations diverge. Use one package manager and commit its lockfile. Do not each create a separate app.

## Branch and file ownership

| Owner | Branch | Primary files |
| --- | --- | --- |
| Person 1 — Map & Frontend | feature/map-frontend | public/maps/, src/components/, src/App.tsx |
| Person 2 — Hazard Simulation | feature/hazard-simulation | src/simulation/ |
| Person 3 — Pathfinding | feature/pathfinding | src/pathfinding/ |
| Shared (coordinate before editing) | main via reviewed PRs | src/types/, src/data/, package.json, tests/, AGENTS.md |

Suggested structure: public/maps/; src/components/; src/simulation/; src/pathfinding/; src/data/; src/types/; src/App.tsx; tests/. These are proposed directories, not a claim they already exist. Feature-specific tests may live alongside owned modules. Do not rename/reformat another owner's files or change shared contracts without coordination.

## Proposed shared data contract

Agree on the exact TypeScript definitions in src/types/ before implementing. Use stable string IDs, a single coordinate system, and consistent units (meters for distances where known; arbitrary demo units otherwise; seconds for simulated time). Example shape:

- BuildingGraph: nodes [{id, areaId, x, y, floor, kind}], edges [{id, from, to, distance, bidirectional}], exitNodeIds [nodeId]. Node kind can be room, corridor, junction, or exit. Use only modeled traversable connections; do not infer exits from an image. The same coordinate system must align with the SVG.
- HazardSnapshot: time (simulated seconds), areas [{id, fireRisk, smokeRisk}], blockedEdges [edgeId]. Risks are finite numbers in [0,1], illustrative risk scores only. Area IDs match the graph; blocked edge IDs match the graph. Explicitly distinguish missing/unknown input from zero risk.
- UserLocation: currentNodeId (a node ID selected in the demo).
- RouteResult: status ('ok', 'no_route', or 'invalid_input'), nodeIds, edgeIds, totalCost (null when unavailable), exitNodeId (null when unavailable).

Use mock fixtures in early development so modules can be developed and tested independently. Agree on the exact schema before coding and avoid duplicate incompatible definitions. For demonstration only, do not treat a missing hazard score, an unverified exit, or an invalid graph as proof of safety.

## Module responsibilities

1. Map/frontend: render the fictional graph/floorplan, show user and simulated hazard state, display the routing result and no-route state, expose scenario/time controls. Provide map and graph data together.
2. Hazard simulation: generate deterministic mock HazardSnapshot values over time and scenarios; expose a small interface returning a snapshot independent of React. Use simplified illustrative values; no claims of real fire dynamics. Future scientific data providers must fit the same contract.
3. Pathfinding: implement a pure function accepting BuildingGraph, HazardSnapshot, and UserLocation. Use nonnegative hazard/distance costs in Dijkstra initially, exclude blocked or unknown/invalid modeled pathways, evaluate eligible exits, return explicit no-route/invalid-input states, and recompute on snapshot changes. No UI code or independent hazard simulation. Test ordinary route, competing exits, blocked edge, changed snapshot, disconnected graph, malformed input, and no-route cases. Never describe demo results as guaranteed safe.

Integration flow: graph + user location + hazard snapshot -> routing engine -> RouteResult -> frontend. The frontend should call the routing module again on updated snapshots.

## Git workflow and AI agent rules

- Check the current branch and working-tree state before editing. Do not discard or overwrite teammate or user work. Stay within your assigned module.
- Fetch latest remote changes and incorporate main before starting feature work; coordinate conflicts and shared-file edits rather than force-pushing.
- Read existing files and shared types first. If the scaffold or agreed interface is missing, propose the necessary changes before implementing.
- Make small commits with descriptive messages; run relevant tests and report actual outcomes. Do not claim tests passed unless run.
- Open pull requests into main; do not merge other people's work without explicit authorization.
- Keep API keys, credentials, individual real-time location data and restricted building information out of the public repository.
- Keep a visible simulation-only disclaimer in the interface; official alarms and emergency personnel supersede any prototype suggestion.
