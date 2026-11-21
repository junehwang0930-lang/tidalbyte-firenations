# Fire Nations — shared project instructions

Read this file before implementing anything. It is the shared contract for all team members and AI coding agents. Keep changes scoped to the assigned feature branch.

## Project goal

Build a predictive evacuation system designed for eventual authorized building use. The hackathon prototype is simulation only and uses a fictional layout inspired by the MSC at Texas A&M. The detector network is the primary mocked external data source because live fire alarm access is unavailable. Implement and test downstream estimation, propagation, forecasting, routing, and visualization. Never represent simulated risk as validated safety information.

## Scope and priorities

The [machine learning roadmap](docs/ai-roadmap.md) defines six phases. Keep the detector data provider replaceable and configure building layouts and detector locations independently of the algorithms. The demo uses computed results from virtual detector events through web and mobile visualization. Hardcoded results and scripted animations do not satisfy the demo requirements.

Test the provider boundary with equivalent normalized events from two providers. Downstream algorithms should yield equivalent results for the same inputs. Handle missing, offline, stale, invalid, and contradictory readings explicitly. Preserve unknown hazard scores when evidence is insufficient, and never treat a normal reading as proof of safety.

MVP: interactive 2D floorplan, simulated user location, simulated fire/smoke and blocked pathways, hazard visualization, multiple simulated exit candidates, risk-weighted routing and automatic rerouting, no-route handling, and simulation controls. Future: verified building data, approved integration with fire alarm/access-control systems and indoor positioning, CFAST/FDS-based validated modeling, accessibility support based on verified building plans, firefighter dashboard, AR/3D, and campus app integration. Do not connect to or modify any real building life-safety system.

## Shared project setup

Agreed stack: React + TypeScript + Vite frontend, SVG for the 2D map, Python + FastAPI backend, Python for hazard estimation, propagation, and routing, planned scikit-learn Random Forest models for forecasting, Pydantic request/response models, JSON fixtures, npm for the frontend, a Python virtual environment and requirements.txt for the backend, and GitHub. Use HTTP/JSON between frontend and backend. No database, authentication, external sensor connections, or cloud deployment is required for the MVP.

Establish the shared app scaffold, types and fictional fixture on main through a team-approved setup commit before feature implementations diverge. Use npm and commit its lockfile; pin Python dependencies in requirements.txt. Keep one shared frontend and one shared backend. Include setup/run/test instructions for Windows PowerShell and other systems; exclude .venv/, node_modules/, build output, caches and secrets from Git.

## Branch and file ownership

| Owner | Branch | Primary files |
| --- | --- | --- |
| Person 1 — Map & Frontend | feature/map-frontend | frontend/public/maps/, frontend/src/components/, frontend/src/App.tsx |
| Person 2 — Hazard Simulation | feature/hazard-simulation | backend/app/simulation/, backend/app/routers/simulation.py, backend/tests/test_simulation.py |
| Person 3 — Pathfinding | feature/pathfinding | backend/app/pathfinding/, backend/app/routers/pathfinding.py, backend/tests/test_pathfinding.py |
| Shared (coordinate before editing) | main via reviewed PRs | backend/app/models.py, backend/app/main.py, frontend/src/types/, frontend/src/api/, data/, dependencies, AGENTS.md |

Suggested structure: frontend/ (src/components/, src/types/, src/api/, src/App.tsx, public/maps/); backend/ (app/main.py, app/models.py, app/simulation/, app/pathfinding/, app/routers/, tests/, requirements.txt); data/ (shared fictional JSON fixtures); README.md; AGENTS.md. These are proposed directories, not a claim they already exist. Do not rename/reformat another owner's files or change shared contracts without coordination.

## Proposed shared data contract

Define authoritative Pydantic models in backend/app/models.py and matching TypeScript interfaces in frontend/src/types/ before implementing. Preserve the specified camelCase JSON wire keys consistently (Pydantic aliases are acceptable). Use stable string IDs, a single coordinate system, and consistent units (meters for distances where known; arbitrary demo units otherwise; seconds for simulated time). Example shape:

- BuildingGraph: nodes [{id, areaId, x, y, floor, kind}], edges [{id, from, to, distance, bidirectional}], exitNodeIds [nodeId]. Node kind can be room, corridor, junction, or exit. Use only modeled traversable connections; do not infer exits from an image. The same coordinate system must align with the SVG.
- HazardSnapshot: time (simulated seconds), areas [{id, fireRisk, smokeRisk}], blockedEdges [edgeId]. Risks are finite numbers in [0,1], illustrative risk scores only. Area IDs match the graph; blocked edge IDs match the graph. Explicitly distinguish missing/unknown input from zero risk.
- UserLocation: currentNodeId (a node ID selected in the demo).
- RouteResult: status ('ok', 'no_route', or 'invalid_input'), nodeIds, edgeIds, totalCost (null when unavailable), exitNodeId (null when unavailable).

Use mock fixtures in early development so modules can be developed and tested independently. Agree on the exact schema before coding and avoid duplicate incompatible definitions. For demonstration only, do not treat a missing hazard score, an unverified exit, or an invalid graph as proof of safety.

## Module responsibilities

1. Map/frontend: render the fictional graph/floorplan, show user and simulated hazard state, display the routing result and no-route state, expose scenario/time controls. Provide map and graph data together.
2. Hazard simulation: process timestamped detector readings and activation history through a replaceable provider. Estimate current hazard scores and model fire and smoke propagation on the configured graph. Emit HazardSnapshot values through a Python interface independent of FastAPI and React. Preserve unknowns and distinguish observed readings, current estimates, and forecasts.
3. Pathfinding: implement a pure function accepting BuildingGraph, HazardSnapshot, and UserLocation. Use nonnegative hazard/distance costs in Dijkstra initially, exclude blocked or unknown/invalid modeled pathways, evaluate eligible exits, return explicit no-route/invalid-input states, and recompute on snapshot changes. No UI code or independent hazard simulation. Test ordinary route, competing exits, blocked edge, changed snapshot, disconnected graph, malformed input, and no-route cases. Never describe demo results as guaranteed safe.

Planned integration flow: detector provider → event history → current hazard estimation and 30- and 60-second forecasts → risk-weighted Dijkstra → FastAPI → React web and MAUI mobile visualization. Train and evaluate the model offline using synthetic scenarios. Keep algorithms as pure/testable Python functions, separate from the HTTP routers. Initial shared endpoints: GET /health (health check) and GET /api/graph (fictional graph fixture). Proposed feature endpoints: POST /api/simulation (scenario and simulated time -> HazardSnapshot), POST /api/route (BuildingGraph, HazardSnapshot, UserLocation -> RouteResult). Coordinate exact request models and route registration on main. Recompute the route when detector-driven estimates, forecasts, or simulated user location change. Configure Vite's development proxy or explicit development-only CORS; no hardcoded production URLs.

## Git workflow and AI agent rules (mandatory)

Default authorization for assigned code and documentation tasks includes implementing changes, running relevant checks, committing the task's files, pushing the assigned feature branch, and opening or updating its PR. Perform these steps without waiting for a separate request to commit or share. This does not authorize merging, pushing directly to `main`, force-pushing, publishing secrets, or including unrelated work. Explicit task-specific instructions such as "local only" or "do not push" override this default; report which sharing steps were intentionally skipped. Tool permissions and authentication requirements still apply.

- Check the current branch and working-tree state before editing (`git status --short --branch`). Do not discard, overwrite, move, or silently commit teammate or unrelated user work. Stay within your assigned module and feature branch.
- Before starting new work, fetch the latest remote changes. Incorporate `main` into your feature branch when safe; coordinate conflicts and shared-file edits. Never force-push or reset away existing work.
- Read existing files and shared types first. If the scaffold or agreed interface is missing, propose the necessary changes before implementing.
- Never commit or push directly to `main`. Shared changes must also use a separate branch and a reviewed PR into `main`.
- Make a descriptive commit for each coherent completed change, including documentation and tests. Do not wait until the entire project is finished. Stage only files belonging to that change, and inspect the diff before committing.
- Run relevant tests and report actual outcomes. Do not claim tests passed unless run. Unfinished or failing work may be published as a draft PR with its limitations explicitly documented.
- Push every completed commit to the corresponding remote feature branch. Open a pull request from that branch into `main` if one does not already exist. If a PR is already open for that branch, push additional commits to update the same PR rather than opening duplicate PRs.
- Keep each PR scoped to its assigned feature; include a summary, test results, known issues, and any dependencies on other branches. Do not merge PRs automatically or merge another teammate's work without explicit team authorization.
- Keep API keys, credentials, individual real-time location data and restricted building information out of the public repository.
- Keep a visible simulation-only disclaimer in the interface; official alarms and emergency personnel supersede any prototype suggestion.

### Required end-of-task checklist for every AI coding agent

A code or documentation task is not complete until all applicable steps are done. Do not stop after merely editing local files.

1. Confirm that you are on the correct assigned branch; inspect `git status` and the diff.
2. Run relevant tests or validation and record the results.
3. Stage only the task's intended files and commit with a descriptive message (e.g. `feat: implement risk-weighted routing`).
4. Push the branch and its commits to GitHub (e.g. `git push -u origin <assigned-branch>`).
5. Open a PR targeting `main`, or update the existing open PR for that feature branch. Use a draft PR if the implementation is not ready for review.
6. Verify the commit is present on the remote branch and report the branch name, commit SHA, PR URL, validation results, and any remaining uncommitted changes or blockers.

If GitHub authentication, permissions, conflicts, or the execution environment prevent a commit, push, or PR, preserve the changes, report exactly which step failed, and provide the commands or platform actions needed to finish. Never falsely report that a PR or commit exists. If there are no changes, report that rather than creating an empty commit or PR.

### Recover existing uncommitted work

Each teammate must run the checklist above in their own workspace for any work already completed but not yet committed or pushed. Review and preserve existing changes before fetching or merging updates; do not use destructive commands or blindly stage unrelated files. Publish the work on its assigned feature branch and open or update its PR into `main`. Local changes in another teammate's workspace cannot be recovered merely by inspecting GitHub.

### Team sharing cycle

1. Start new feature branches from the latest `origin/main`. For an existing feature branch, incorporate updated `main` when safe, preserving local work and coordinating conflicts.
2. Implement and validate a coherent change on the assigned branch, then commit and push it. A pushed branch shares code immediately; merging is a separate decision.
3. Open a draft PR for unfinished work or a ready-for-review PR for completed work. Update the same open PR as work progresses. If the previous PR was merged or closed, use a fresh branch and PR for a new task.
4. A teammate reviews the PR; an authorized team member merges it. Agents do not merge automatically.
5. After a merge, teammates fetch and incorporate the updated `main` before continuing dependent work. Unmerged PRs are not yet part of the shared baseline; document any dependency on them.

### Reusable teammate prompt

Replace the placeholders with the assigned branch and a concrete task. Keep this repository open as the agent's workspace. Instructions must be present in that checkout: after this instructions PR is merged, synchronize with `main` before starting.

```text
Read and follow the root AGENTS.md, any applicable nested AGENTS.md files,
and .github/copilot-instructions.md before editing.
My assigned branch is <feature/map-frontend | feature/hazard-simulation | feature/pathfinding>.
Task: <describe the change and acceptance criteria>.
Preserve unrelated work and stay within my assigned scope.
Run relevant checks, commit this task's changes, push my feature branch,
and open or update its PR into main. Use a draft PR if unfinished.
Do not push directly to main or merge any PR.
Report the commit SHA, PR link, check results, and remaining blockers.
```

This prompt makes the intended workflow explicit; it cannot grant missing repository access or override higher-priority tool restrictions. Avoid adding "do not push" unless the task really must remain local.

