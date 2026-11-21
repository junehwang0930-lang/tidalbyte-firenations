# Wayfind prototype
This directory preserves the original hackathon prototype for reference during the team's FastAPI integration. Combine the three feature branches to run the full demo. Frontend owns the browser UI, hazard simulation owns the incident server and forecasts, and pathfinding owns the training graph and route search.

From this directory run `npm ci`, `npm run build`, then `npm start`. Use Node.js 22.12+ or 24. The occupant page is http://localhost:4173 and the presenter page is http://localhost:4173/presenter. Build the presenter before using either system launcher.

## One-minute demo

1. Open the occupant view on one screen and presenter on another. The dot and blue route lead from the gallery entrance toward East exit in a fictional training layout.
2. Press Start replay. While still near the starting point, trigger Forecast smoke from the presenter. The blue path changes to West exit before simulated smoke reaches East Hall. Refresh on the phone pulls the snapshot without resetting progress.
3. Open Camera. Allow rear camera and heading if supported. The waypoint is from the training layout; a real camera behind it does not turn it into MSC navigation. Missing heading or camera produces a labeled state.
4. Trigger Blocked exits. The line and arrow disappear. Enable fictional refuge to exercise a reachable refuge, or leave the toggle off to inspect the no-route state. Emergency help provides mock Call and Ping flows. Neither sends anything.
5. Open Options → Browse MSC plans to inspect the real building's historical reference layouts. Floor tabs browse reference floors. Demo map returns to the fictional walk. Reset on the presenter restores the starting scenario.

## Test on iPhone

The phone cannot use the laptop’s localhost. Use a trusted HTTPS reverse proxy forwarding to 127.0.0.1:4173 with SSE buffering disabled, or run the included HTTPS listener on a private LAN. Use a certificate valid for the LAN hostname/IP that Safari trusts. For LAN mode set HOST=0.0.0.0, TLS_CERT and TLS_KEY to local PEM paths before starting. In PowerShell use `$env:HOST="0.0.0.0"`, `$env:TLS_CERT="C:\path\cert.pem"` and `$env:TLS_KEY="C:\path\key.pem"` on separate lines. In macOS Terminal use `HOST=0.0.0.0 TLS_CERT=/path/cert.pem TLS_KEY=/path/key.pem npm start`. Do not copy keys into the project. Open /presenter at the phone-accessible address to generate its judge QR code. Anyone on the private demo endpoint can operate the presenter. Deployment and Git remotes are deferred.

Physical-device checks still needed: measured accuracy at an MSC junction, authorized camera and absolute heading in portrait and landscape, permission denial, compass drift and real stair elevation. Precise tracking and automatic floor changes are unavailable on this uncalibrated map. Locate me reads device accuracy locally; it requests landmark confirmation rather than guessing the correct corridor. Landmark confirmation expires. Replay timing and heading inputs can be tested independently.

## Source and limits

Historical reference diagrams in public/reference.js are original simplified schematics of room positions in the [2015 ANS conference program, page 29](https://students.ans.org/wp-content/uploads/2016/12/2015TAMU.pdf#page=29), reviewed November 21, 2026. The layouts cover first, second and lower levels; room uses may have changed. The interactive training floor, exits, refuge and scale are fictional. Real MSC egress and georeferencing have not been verified.

The [MSC facility page](https://ucenter.tamu.edu/facilities/memorial-student-center/) and the January 2026 [first](https://clubcrawl.tamu.edu/wp-content/uploads/2026/01/ClubCrawlSpring2026-Maps_website_MSC-1stFloor.pdf) and [second](https://clubcrawl.tamu.edu/wp-content/uploads/2026/01/ClubCrawlSpring2026-Maps_website_MSC-2ndFloor.pdf) floor event listings were consulted. The event PDF downloads returned 404 during the build. Event materials cannot establish a building emergency plan.

## Development

- Occupant UI and device lifecycle: public/app.js. SVG drawing and floor geometry: public/map.js, public/reference.js. Styles: public/style.css.
- Incident service: server.js. GET /api/state, GET /api/events (SSE), POST /api/control?op=start|pause|reset|fire|smoke|blocked|refuge. State contains epoch, sequence, timestamp, floor, affected zone and relative scenario clock. The presenter and occupant share one clock; private positions never enter the API. Replace the mock preset source with an authorized read-only adapter only after reviewing a real schema, timing and validation requirements.
- Graph and routing: public/model.js. Edges have a zone ID; a blocked door is explicitly impassable. The search checks predicted hazard arrival against traversal time plus a five-second illustrative margin. The fixture omits elevators. Its named refuge is fictional and enabled only on presenter request.
- Offline forecast: public/forecast.js. To substitute a precomputed dataset, map each simulated fire/smoke threshold crossing to a graph zone and a scenario-relative time, export the normalized events, and record model, source, geometry mapping and license. Update the display attribution and overlay to match new model zones. The included forecast is illustrative. [NIST FDS and Smokeview](https://pages.nist.gov/fds-smv/) are potential offline sources; neither runs in this demo.
- Additional coverage needs checked artwork, scale, north alignment, surveyed control points, passable doorway/stair links, a documented refuge designation, and an on-site test. Keep incomplete floors browse-only.
- Presenter source: src/presenter.tsx (React/TypeScript). Run `npm ci` then `npm run build` to regenerate its local Vite bundle after changes. The occupant UI uses native ES modules and SVG; edits appear on refresh. `npm test` runs the routing suite without installing dependencies.
