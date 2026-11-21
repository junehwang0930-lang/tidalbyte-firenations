# Continue Wayfind update

State:

- Branch: `feature/wayfind-training-integration`
- Server: `backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --no-access-log`
- UI: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- Private asset directory: `.wayfind-local`
- Commands: `npm run build` from `frontend`; `python -m pytest -q` from `backend`; `python scripts/train_atlas_spread.py` only when retraining synthetic weights.

## Part A: Whole-floor overlays and Baseline review

Done, uncommitted (if Part B is later discarded, keep only these files):

- `.wayfind-local/draw_whole_floors.py`
- `.wayfind-local/atlas_openings.py`
- `.wayfind-local/build_atlas_scenario.py`
- `frontend/src/App.tsx`, `frontend/src/atlas-route.css`, `frontend/src/style.css`

Key outputs: `frontend/src/App.tsx` now has static Level 2/1 tabs and shows route overlays; `.wayfind-local/floor-atlas/*.svg` are generated locally; 31 items are selectable; 13 first-floor stairs use the same solid tread appearance; doors and four Level 1 entrance markers are drawn. Worked example: fire in `2300B` from `2300C` changes Baseline route `BW` to `WC`.

User review: confirm versions of the drawings and stair matches, then ask Build to proceed to generic ML updates, or ask to discard Part B.

## Part B: Generic static fire/smoke spread

Next: create two commits on `feature/wayfind-training-integration` with Parts A and B:

```powershell
git fetch origin
git status --short --branch
# inspect diffs

# Commit A: vector-overlay demo
git add .wayfind-local/draw_whole_floors.py .wayfind-local/atlas_openings.py .wayfind-local/build_atlas_scenario.py frontend/src/App.tsx frontend/src/atlas-route.css frontend/src/style.css
git commit -m "feat: add whole-floor overlay demo"

# Commit B: static spread and reset
git add .well-find-dummy 2>/dev/null
git add backend/app/simulation/atlas_spread.py backend/app/simulation/atlas_spread_weights.json backend/app/pathfinding/atlas_fire.py backend/app/main.py backend/tests/test_atlas_fire.py
git commit -m "feat: add synthetic static fire spread and reset"
```

Run 57 backend tests and frontend build, then push:

```powershell
git push -u origin feature/wayfind-training-integration
```

Do not create or force-push PRs without explicit ask. If GitHub authentication or GitHub CLI is unavailable, report that; changes remain local and are listed above.

Verification expectations after Part B:

```text
30-second forecasts from ignition, auto-refresh 20 seconds
30s expiry switching climb-friendly stairs to heat-safe stairs
Reset restores default origin, clear fire, Level 2
```

Useful console/UI assertions:

```text
Ignition +N becomes Increasing as Time Moves.
Reset sets Ignition +0.
Fire sets 60s elapsed Fire Elapsed Time increasing with timeout rates over seconds pass Integer limit.
```
