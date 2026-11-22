# Run the bundled Wayfind demo

Follow the [README startup instructions](../README.md) for FastAPI and Vite,
then open <http://127.0.0.1:5173>. No asset download, private directory,
environment flag, or model training is required. Select Level 2, start in
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

The React app preserves the existing mobile layout. The API runs on loopback;
cloning the public repo does not deploy a web service or enable LAN access.
Native iPhone behavior is not verified by the desktop tests.
