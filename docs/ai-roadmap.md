# Fire Nations machine learning roadmap

Fire Nations is a hackathon simulation using fictional floor plans and virtual
detectors. Its route suggestions illustrate how changing hazards can affect
route choice. Official alarms and emergency personnel supersede the demo.

## Architecture

Virtual detector network → simulated detector events → fire/smoke simulation →
synthetic training dataset → Random Forest prediction → risk-weighted Dijkstra →
frontend and mobile visualization.

Dataset generation, training, and evaluation run offline. During the demo, the
simulator supplies current estimates and the trained model supplies forecasts
from information available at the current simulation tick. The demo does not
train a model while routing.

Each layer keeps its own meaning for the data.

| Data | Meaning |
| --- | --- |
| Observed detector signal | A reading or alarm reported by a virtual detector at a specific simulated time. A normal reading reflects only that detector's report. |
| Estimated current hazard | The simulator's current area-level fire and smoke scores, with unknown values preserved when information is insufficient. |
| Predicted hazard | A model estimate for an area at a specified future simulated time, associated with the tick when the forecast was issued. |

Missing, stale, or normal detector readings are never proof of safety. Only
represent zero risk when it is a known illustrative score under the simulation
rules. Keep observed signals, current estimates, and forecasts distinguishable
through routing and visualization.

## Development phases

1. **Detector registry and event history.** Give each virtual detector a stable
   ID, detector type, and graph area ID. Emit timestamped simulated alarm and
   clear events and retain activation history. Distinguish a normal reading
   from missing or stale data. Define a provider interface for the registry and
   events that is independent of the model and simulator implementation. A
   future authorized sensor adapter could emit the same input through this
   interface. The hackathon demo uses the virtual provider exclusively.
2. **Graph-based fire and smoke simulation.** Run configurable, reproducible
   scenarios on the fictional building graph. Vary the starting area, timing,
   propagation settings, and detector availability. Track fire and smoke
   separately across explicitly modeled connections. Emit current
   `HazardSnapshot` values and explicitly record blocked edge IDs. Keep
   simulator rules illustrative and preserve unknown values.
3. **Synthetic training dataset.** Generate reproducible runs and label each
   row by scenario, area, and simulated tick. Build features from detector
   history and available simulation estimates through that tick. Use the
   simulator's later area scores as targets at 30 and 60 simulated seconds.
   Keep unavailable targets out of the corresponding training or evaluation
   task and record the scenario configuration and seed for reproducibility.
4. **Random Forest regression.** Forecast area-level fire and smoke risk at
   both horizons. Return illustrative scores in `[0, 1]` and identify the issue
   tick and target tick. Preserve unavailable forecasts as unknown. Train
   offline and use the trained model for inference during the demo.
5. **Model evaluation.** Assign entire scenarios to separate training and
   held-out test sets before generating time windows. Keep runs derived from
   the same scenario together. Tune on training scenarios only using
   scenario-grouped validation. Compute rolling features using data at or
   before the issue tick, keep future simulator values in the targets, and fit
   any preprocessing on training data only. Compare mean absolute error and
   forecast coverage by hazard and horizon using the same held-out examples
   for the model and a non-ML persistence baseline that carries the current
   estimate forward. Report performance on changing hazards separately from
   steady periods. Performance on synthetic data only measures how well the
   model generalizes across the tested simulations.
6. **Risk-weighted route integration.** Use a routing adapter to combine
   current and forecast area scores into the single `HazardSnapshot` consumed
   by the existing Dijkstra engine. Document the horizon selection and
   combination policy before implementation. A lower forecast must never
   reduce a known current score, and forecasts must never reopen a blocked
   edge or turn an unknown current score into a known one. With unavailable
   forecasts, retain current-only routing and its existing no-route behavior.
   Preserve `BuildingGraph`, `HazardSnapshot`, `UserLocation`, and
   `RouteResult` and coordinate any additional forecast metadata separately.
7. **Live visualization and hackathon demo.** Update the React frontend and
   its MAUI mobile shell as simulated time advances. Label detector events,
   current hazard estimates, and forecasts at each horizon. Show the simulated
   location, route changes, and no-route or unavailable data states. Rehearse
   a fictional scenario with a detector activation, a changing route, and a
   blocked or unknown segment. Keep the simulation-only notice visible.

The existing [pathfinding engine](../backend/app/pathfinding/README.md) is
available as a pure Python function. Live simulation, forecasting, and API
integration are planned. Follow the existing ownership, shared contracts, and
review workflow in [AGENTS.md](../AGENTS.md).
