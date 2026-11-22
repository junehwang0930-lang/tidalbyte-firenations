"""Fit a lightweight arrival-time surrogate to synthetic grid arrival simulations.

Run with NumPy: python scripts/train_atlas_spread.py
Training grids and time units are illustrative. No building or fire data is used.
"""
import heapq
import json
from pathlib import Path

import numpy as np


def samples(seed, count):
    rng = np.random.default_rng(seed)
    xs, ys = [], []
    for _ in range(count):
        n = 40
        # Per-edge transport varies independently of the inference model.
        widths = rng.uniform(.7, 1.3, (n, n))
        free = rng.random((n, n)) > .14
        free[0, 0] = True

        def flood(mode):
            time = {(0, 0): 0.}
            queue = [(0., 0, 0)]
            while queue:
                t, x, y = heapq.heappop(queue)
                if t != time[x, y]:
                    continue
                for a, b in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                    if not (0 <= a < n and 0 <= b < n and free[a,b]):
                        continue
                    dt = 1 if mode == 'distance' else (
                        (.7 + .42 / widths[a,b]) if mode == 'smoke' else (2.9 + 1.25 / widths[a,b]))
                    arrival = t + dt
                    if arrival < time.get((a,b), float('inf')):
                        time[a,b] = arrival
                        heapq.heappush(queue, (arrival,a,b))
            return time

        distance, smoke, heat = (flood(mode) for mode in ('distance','smoke','heat'))
        for pos in list(distance)[1::8]:
            xs.append([distance[pos]])
            ys.append([smoke[pos], heat[pos]])
    return np.array(xs), np.array(ys)


if __name__ == '__main__':
    x,y = samples(9301, 42)
    weights = np.linalg.lstsq(x, y, rcond=None)[0][0]
    test, target = samples(9302, 8)
    mae = np.abs(test * weights - target).mean(axis=0)
    result = dict(version=1, model='synthetic-grid-arrival-regression', feature='walkable distance in demo units',
                  smokeSecondsPerUnit=round(weights[0],6), heatSecondsPerUnit=round(weights[1],6),
                  trainingSamples=len(x), syntheticHoldoutMAE=mae.round(3).tolist())
    out = Path(__file__).resolve().parents[1]/'backend/app/simulation/atlas_spread_weights.json'
    out.write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print(result)
