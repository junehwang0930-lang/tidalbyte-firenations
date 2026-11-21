# Fire Nations predictive evacuation roadmap

Fire Nations is designed as a predictive evacuation system for eventual use
with authorized building data. **Simulation only.** The hackathon prototype
uses a fictional building and virtual detectors because the project has no
authorized access to live fire alarm data. Official alarms and emergency
personnel supersede any prototype suggestion.

## Architecture

The detector network is the primary mocked external data source. The demo
must run functional, tested downstream algorithms for event processing,
current hazard estimation, graph-based propagation, model inference, and
routing. The web and mobile interfaces must render those outputs as inputs
change. Hardcoded routes and scripted animations are placeholders during
development and do not satisfy the end-to-end demo.

- **Live demo:** Detector provider → event processing and activation history →
  current fire and smoke estimates → Random Forest forecasts → current and
  forecast risk integration → risk-weighted Dijkstra → web and mobile updates.
- **Offline training:** Graph-based fire and smoke simulation → synthetic
  detector histories and hazard targets → feature generation → Random Forest
  training and evaluation → model used for live inference.

The replaceable provider supplies detector ID, status, configured location or
area ID, and timestamp. Event processing validates those records and maintains
activation history. A future authorized provider can normalize its input to
the same interface without rewriting estimation, prediction, routing, or
visualization. Keep layouts, graph connections, and detector placements in
configuration consumed by the algorithms.

Test that boundary by replaying equivalent normalized readings through the
virtual provider and a test adapter. With the same layout, initial state, and
event timing, both must produce the same hazard estimates, forecasts, and
routes. Only the provider should know how a reading was obtained.

| Data | Meaning |
| --- | --- |
| Observed detector reading | What a detector reports at a timestamp, including its reported status. In the demo, the provider generates these readings. |
| Estimated current hazard | The estimator's current area-level fire and smoke scores derived from valid observations, event history, and graph-based propagation. |
| Predicted future hazard | A model estimate for an area at a particular horizon, associated with the timestamp when the forecast was issued. |

Handle missing, offline, stale, invalid, and contradictory readings explicitly.
Keep missing detectors distinct from reported offline status. Flag stale
readings, reject malformed records, and surface unresolved contradictions as
uncertainty. A normal reading describes a single detector report. Normal or
missing readings never prove an area is safe. Preserve unknown hazard scores
when the evidence is insufficient.

## Development phases

1. **Detector registry, provider, and event history.** Define the provider
   interface and implement the virtual detector provider. Map stable detector
   IDs to configured locations, validate incoming statuses and timestamps, and
   record alarm activations and clears. Test event replay, invalid records,
   missing and offline detectors, stale readings, and contradictory reports.
2. **Current hazard estimation and propagation.** Estimate current fire and
   smoke risk from observations and activation history. Implement separate
   graph-based fire and smoke propagation models across configured
   connections. Emit current `HazardSnapshot` values and explicitly record
   blocked edges. Use the same simulation engine to generate reproducible
   scenarios by varying ignition area, timing, propagation settings, and
   detector availability. The propagation models are simplified and require
   empirical validation for real-world use.
3. **Dataset, features, training, and evaluation.** Use Python and scikit-learn
   to train Random Forest regression models for area-level fire and smoke
   risk 30 and 60 seconds after the forecast issue time. Generate examples
   from synthetic scenarios using detector activation histories and other
   features available at the issue time. Use the same feature computation in
   training and live inference. Use later simulator scores only as labels
   and exclude simulator state that a deployed estimator could not observe
   or derive. Split by scenario before making time windows and group related
   runs together. Fit preprocessing and tune only on training scenarios,
   then evaluate on unseen scenarios. Report actual mean absolute error
   and forecast coverage for each hazard and horizon on comparable examples,
   alongside non-ML baselines such as persistence and simulator-only
   extrapolation. Document configurations, seeds, coverage gaps, and
   limitations. Synthetic-data performance measures performance on those
   simulations and cannot establish real-world predictive accuracy.
4. **Forecast integration and automatic rerouting.** Combine current and
   forecast hazard scores in a routing adapter for the existing Dijkstra
   engine. Specify how the adapter selects horizons and combines scores.
   Preserve current blocked edges and unknown current scores. Lower
   forecasts cannot reduce known current risk. Use current-only routing when
   forecasts are unavailable. Recompute routes when detector updates change
   hazard estimates or forecasts, and preserve explicit no-route handling.
5. **Real-time frontend and mobile integration.** Update the React web app and
   MAUI mobile shell from the same computed results. Label detector readings,
   current estimates, and time-stamped forecasts separately. Show reroutes and
   unavailable or no-route states as data changes, with a visible
   simulation-only notice.
6. **End-to-end testing and hackathon demonstration.** Run a scenario from
   virtual detector events through estimation, forecast, Dijkstra, and both
   views. Vary incoming events to verify that a route changes because of
   computed hazard scores. Verify that both clients display the route
   returned by Dijkstra for the same snapshot as the displayed hazards.
   Exercise blocked routes, missing and conflicting
   readings, and unavailable forecasts. Report measured evaluation results
   and demonstrate the limits of the fictional scenario.

Preserve the existing `BuildingGraph`, `HazardSnapshot`, `UserLocation`, and
`RouteResult` contracts. Coordinate any new detector or forecast metadata
separately under the existing ownership and review process.

## Current implementation and deployment prerequisites

The [pathfinding engine](../backend/app/pathfinding/README.md) is already
available as a standalone Python function. The current web and mobile demo
uses sample routes. Detector processing, propagation, model training, and
live routing integration are planned.

Future deployment requires verified building layouts, approved detector
locations, authorized sensor access, reliable indoor positioning, empirical
validation, and applicable life-safety review. Follow [AGENTS.md](../AGENTS.md)
for the existing shared contracts, ownership, and Git workflow.
