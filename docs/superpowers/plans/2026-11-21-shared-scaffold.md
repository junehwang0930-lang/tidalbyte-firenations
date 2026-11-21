# Shared scaffold implementation plan

**Goal:** Initialize the shared Fire Nations foundation on main, following AGENTS.md and the user's nine setup tasks.

**Architecture:** Pydantic owns the camelCase HTTP/JSON contract; matching TypeScript interfaces consume it. FastAPI loads a fictional JSON graph. A minimal React screen requests health and graph through Vite's development proxy.

**Constraints:** No simulation, routing algorithms, complete map UI, database, deployment, or automatic push. Use npm lockfile, pinned Python dependencies and Windows instructions. Keep a visible demo disclaimer.

**Contract choices:** Null or omitted hazard scores mean unknown, never zero; omitted areas likewise mean unknown. Coordinates and distances use arbitrary demo units, with x rightward and y downward. Validate graph references and finite numeric values. Cross-model hazard/location references are checked explicitly against a graph.

## Tasks

- [x] Add backend tests for health, graph serialization, invalid graph/risk inputs, and unknown risk.
- [x] Implement shared models, fixture, FastAPI endpoints and empty module packages; run Pytest.
- [x] Add Vite/React/TypeScript scaffold, interfaces and HTTP client with loading/error states; install and lock dependencies, build.
- [x] Document Windows and POSIX setup, contract and team ownership; verify running servers and proxied HTTP/JSON, review changes.

## Review focus

Malformed graph references, nonfinite/out-of-range risks, unknown versus zero, HTTP failure states, fixture loading independent of current working directory, and wire alias parity.

## Verification results

- Python 3.12.10: 16 Pytest tests passed; pip check found no broken requirements.
- Node 24.22.1: TypeScript check and Vite production build passed; npm install reported zero vulnerabilities.
- Live Uvicorn startup succeeded; direct and Vite-proxied health returned ok, proxied graph returned 7 nodes / 6 edges / 2 exits, frontend returned HTTP 200.
- git diff --check passed; virtual environment, node_modules and dist are ignored.
- Independent read-only code review found no critical or important issues.
- This agent environment required running Python socket-based tests and servers outside its network sandbox. No application workaround was needed.
- User authorized committing the verified setup locally on main; no push authorized. Temporary verification servers stopped.
