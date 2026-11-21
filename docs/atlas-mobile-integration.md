# Atlas integration with the current mobile UI

The root React/FastAPI app preserves the existing maroon light/dark dashboard,
custom floor selector, camera auto-start, split/fullscreen swipe controls, and
full-screen map dialog. It replaces the former alternating hardcoded route with
the atlas API's computed route and fire/smoke overlay. Guidance is cleared while
a request is pending, after an error, or if the floor drawing cannot load.

## Required private assets

PR #15 did **not** include the drawings or the occupancy-grid scenario. The
referenced local generation scripts are also absent. Obtain the authorized assets
from the teammate who produced the PR; do not invent real-building geometry or
commit private source material:

```text
.wayfind-local/floor-atlas/level-1.svg
.wayfind-local/floor-atlas/level-2.svg
.wayfind-local/floor-atlas/scenario.json
```

The SVG overlay coordinate system currently follows the PR's 1240 by 740 drawing
viewBox. The scenario grid, room anchors, stair landings and drawing must match.
Without these files, the app shows the existing fictional floor preview and an
explicit unavailable state, with no fabricated route or fire display.

From the repository root in Windows PowerShell, after installing the private files:

```powershell
$env:WAYFIND_LOCAL = '1'
.\backend\.venv\Scripts\python.exe -X utf8 -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Start Vite in a second terminal with `cd frontend; npm.cmd run dev`. The private
atlas API intentionally remains loopback-only. Native-phone/LAN access to these
private assets is not enabled by this integration; that requires a separate
authorized asset-distribution decision. Mobile layout is preserved, but physical
iPhone map/camera behavior has not been revalidated here.

## Computation and limitations

Select a Level 2 starting room and optional ignition room. The Python grid search
excludes predicted hazard footprints, prefers lower exposure before shorter
distance, and uses explicitly supplied stair-to-exterior paths. Recalculation
runs every 20 seconds and on selection, refresh, reset, and page visibility changes.
Forecasts use the PR's synthetic distance-to-arrival coefficients and a 30-second
horizon. They are not calibrated physical fire models or live detector estimates.
No new claim of trained-model accuracy is established by this integration.

The atlas engine is a separate grid adapter; the shared Pydantic graph contract
and existing Python `find_route` remain unchanged. The complete detector-provider
roadmap is not implemented by this PR. All displayed routes and assumed landings
are for simulation only, not verified building egress advice.

Validation: `cd backend` then `.venv/Scripts/python.exe -X utf8 -m pytest`,
and `cd frontend` then `npm.cmd run build`. API tests use synthetic occupancy
grids, including default startup without any private files and loopback guards.
