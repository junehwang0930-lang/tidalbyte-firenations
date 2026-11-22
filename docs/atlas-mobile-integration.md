# Run the bundled Wayfind demo

Follow the [README startup instructions](../README.md) for FastAPI and Vite,
then open <http://127.0.0.1:5173>. The MAUI app bundles both floor drawings,
the scenario, and the client-side routing and forecast implementation. It
can run the same demo without FastAPI. A web build also uses these bundled
assets if the atlas API is unavailable at startup. No asset download, private
directory, environment flag, or model training is required. Select Level 2, start in
Bethancourt 2300C, and select simulated ignition in 2300B. Use the floor picker
to see the corresponding Level 1 landing. Try clearing the fire or selecting
another ignition. The route and 30-second forecast refresh every 20 seconds
after ignition; the manual refresh and reset controls also work.

`data/floor-atlas/` contains the two vector drawings and their matching
occupancy grid, room polygons and provisional stair locations. These are
original schematic training redraws informed by the supplied Level 1/2
directories and floor-plan references, not current campus egress drawings.
The [Texas A&M MSC guide](https://ucenter.tamu.edu/facilities/memorial-student-center/points-of-interest/)
provides public entrance names. Source photographs and mail attachments are
not needed and are not included. The SVGs are editable vector source; keep
their 1240×740 coordinate space in sync with the scenario when editing them.

The checked-in model weights require neither NumPy nor Pillow at runtime.
The optional synthetic training script uses NumPy. The forecast is illustrative,
not calibrated against an actual fire or live sensors. The bundled scenario
follows the modeled Level 1 continuation where supplied. It excludes stairs
that lack one; no route is verified for actual emergency egress.

The React app uses the existing mobile layout, floor picker, full-screen map,
and AR camera. The FastAPI routes stay on loopback. The offline implementation
uses the same scenario and spread coefficients as the API. Native iPhone
behavior requires an on-device check.
