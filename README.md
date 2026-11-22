# Fire Nations — TidalHack

The [Wayfind demo guide](docs/atlas-mobile-integration.md) explains how to run
the bundled Level 1/2 atlas, choose an ignition, and review a simulated route.

Fire Nations is a predictive evacuation project designed for eventual use with
authorized building data. The virtual detector network is the demo's primary
mocked external data source. The planned algorithms use configurable layouts
and detector placements to compute hazard estimates, forecasts, and routes.
The demo requires live computed outputs in the web and mobile views.
As detector readings change, both views should show the resulting hazard
estimates, forecasts, and routes. The existing sample routes are placeholders
until that integration is complete.

See the [six-phase machine learning roadmap](docs/ai-roadmap.md) for the
replaceable detector interface, graph-based propagation, Python and scikit-learn
Random Forest forecasts, and evaluation against non-ML baselines. Follow
[AGENTS.md](AGENTS.md) when changing shared files.

**Simulation only.** The building is fictional, not an approved MSC map. This is
not a validated emergency navigation system. Official alarms and emergency
personnel supersede any prototype suggestion.

## Prerequisites

- Git, Node.js 24 LTS (minimum 22.12), and npm.
- Python 3.12 recommended (the setup was verified with 3.12).
- Two terminal windows, starting at the repository root.

## Windows PowerShell

Clone once, if you do not already have this repository:

```powershell
git clone https://github.com/junehwang0930-lang/tidalbyte-firenations.git
cd tidalbyte-firenations
```

Install and run the backend in the first terminal:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -X utf8 -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -X utf8 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

These commands use the virtual environment directly, so PowerShell activation
and execution-policy changes are unnecessary. If `py` is unavailable, use a
working `python` command or the full path to your Python 3.12 executable for the
venv command. `-X utf8` avoids console encoding errors in non-ASCII paths.

Install and run the frontend in the second terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173 to view the fictional evacuation map. Floor 1 shows
the simulated fire marker and sample routes. Floors 2 and 3 show floor plans.
The frontend requests the graph from the backend and starts with the bundled
fictional fixture, which also supports offline demos.
`npm.cmd` avoids Windows execution-policy issues with `npm.ps1`.

Stop either server with Ctrl+C. API documentation: http://127.0.0.1:8000/docs.

## Tests and build (Windows)

From the repository root:

```powershell
cd backend
.\.venv\Scripts\python.exe -X utf8 -m pytest
.\.venv\Scripts\python.exe -X utf8 -m pip check
cd ../frontend
npm.cmd run build
```

The build runs TypeScript checking and writes the Vite bundle to `frontend/dist`.
There is no frontend unit-test suite yet. Backend API, contract, and pathfinding
tests use Pytest.
With both servers running, verify direct and proxied HTTP/JSON:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:5173/health
Invoke-RestMethod http://127.0.0.1:5173/api/graph
```

## macOS / Linux

From the repository root, in the first terminal:

```sh
cd backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In the second terminal:

```sh
cd frontend
npm ci
npm run dev
```

For verification, run `.venv/bin/python -m pytest` from `backend`, and
`npm run build` from `frontend`.

## Structure and ownership

```text
backend/
  app/
    main.py                # shared startup and GET endpoints
    models.py              # authoritative Pydantic contract
    routers/               # future HTTP feature adapters
    simulation/            # reserved for Person 2
    pathfinding/           # pure Python risk-weighted Dijkstra
  tests/                   # API, contract, and pathfinding tests
  pytest.ini
  requirements.txt         # pinned runtime and test dependencies
data/building.json         # shared fictional graph
frontend/
  public/maps/             # reserved for Person 1's SVG assets
  src/
    api/index.ts           # shared relative-URL HTTP client
    types/index.ts         # matching TypeScript interfaces
    components/            # floor map and camera panel
    App.tsx                # floor picker and sample route visualization
    main.tsx
    style.css
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
MobileApp/                 # MAUI shell bundling the shared frontend
```

The backend implements risk-weighted Dijkstra as a standalone Python function.
FastAPI serves health and graph endpoints, and the frontend uses sample routes.
The [MAUI shell](MobileApp/README.md) bundles the frontend for offline demos.
The detector pipeline, hazard simulator, 30- and 60-second fire and smoke
forecasts, and live routing integration are planned. Start
feature work from the reviewed setup on `main` and follow [AGENTS.md](AGENTS.md).

## Shared contract and fixture

- `BuildingGraph`: nodes, modeled edges, and explicit `exitNodeIds`. Coordinates
  and distances use arbitrary demo units, **not meters**. X increases rightward,
  Y downward; all fixture nodes are on Floor 1. The Floor 1 SVG uses this
  coordinate system. The fixture represents a fictional building.
- `HazardSnapshot`: nonnegative simulated seconds, area IDs, nullable risk
  scores in [0,1], and blocked edge IDs. Null/omitted scores and absent areas
  mean **unknown**, never zero. No hazard generator is included.
- `UserLocation`: selected demo `currentNodeId`.
- `RouteResult`: `ok`, `no_route`, or `invalid_input`. Unavailable results use
  empty node/edge lists and null cost/exit. An `ok` result ends at `exitNodeId`
  and has one edge per node transition; a user already at an exit can have a
  one-node, zero-edge result. See the [pathfinding engine](backend/app/pathfinding/README.md).
- JSON uses the specified camelCase names and edge keys `from`/`to`. Python's
  `from_node` is aliased to `from`; serialize with `model_dump(by_alias=True)`.
- Models reject nonfinite numbers, invalid graph references, duplicate IDs,
  extra fields, and out-of-range scores. Call `snapshot.validate_against(graph)`
  and `location.validate_against(graph)` to check cross-model references when
  integrating future feature endpoints; these raise `ValueError` on mismatch.
  TypeScript interfaces describe the wire shape, not runtime validation.

`GET /health` returns `{"status":"ok"}`. `GET /api/graph` returns the validated
fixture. Invalid fixture data fails backend startup. Fixture loading is relative
to the source file rather than the shell's current directory.

Vite proxies `/health` and `/api` to `http://127.0.0.1:8000` in development;
the browser client uses relative URLs. Keep both servers running. Port 5173 is
strict so a conflict is reported instead of silently moving. A production host
would need same-origin API routing; deployment is outside this scaffold's scope.

Commit `package-lock.json` with dependency changes. Python requirements pin
runtime and test dependencies; reinstall them inside a virtual environment.
Generated output, environments, caches, local editor files, and secrets are
excluded by `.gitignore`.

### Physical iPhone tracking check

Use an HTTPS deployment with a certificate the phone trusts. Open Safari and
tap **Track device location**. Grant Location and Motion & Orientation when
prompted. Fire and smoke remain experimental simulations. Device readings stay
in browser memory. Enable **Use device location for Bethancourt routes** to route from the anchor of a confidently matched section (2300A–E or the prefunction lobby). This requires verified Level 2 calibration, device tracking, and a confirmed floor. Turn the option off to select a room manually.

- Deny location and confirm the permission message. Enable access in Safari
  settings, stop tracking, restart it, and verify that accuracy updates.
- Rotate across north and check for a smooth transition. Check the displayed
  reference (magnetic compass, absolute orientation, or moving GPS course).
- On a known floor, hold the phone at its usual carrying height and calibrate.
  The provisional Floor 1 and Floor 2 elevations are 360 and 368 feet.
  Calibration offsets the local altitude datum and carrying height. GPS
  vertical accuracy must be within one meter. Expect uncertain results
  indoors. Safari supplies geolocation altitude when available. A future
  native barometer provider can feed timestamped calibrated elevations.
- Take the stairs with a teammate and compare the estimated floor with the
  posted floor. Verify that sustained changes switch floors, poor altitude
  retains the last confirmed floor, and the floor picker still works.
- Background Safari for more than 15 seconds, return, and check the freshness
  indicator. Stop tracking and confirm that device data disappears.

The atlas contains schematic drawings. To enable geographic projection, enter
three verified, non-collinear control points per floor in
`data/floor-atlas/calibration.json`. Each point needs WGS84 `latitude` and
`longitude` and the corresponding atlas `x` and `y` in the 1240 × 740 view.
Check residual error against a fourth independently surveyed point before
using the configuration. Leave the floor empty if that correspondence cannot
be verified. Projection uses the surveyed triangle and displays a horizontal
uncertainty radius. It supplies an estimated marker only.

Run `node --experimental-strip-types --test tests/*.test.mjs` in `frontend`
for the positioning checks. The physical-device checklist requires an iPhone.
