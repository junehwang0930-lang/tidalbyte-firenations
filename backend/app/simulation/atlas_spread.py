"""Synthetic ML arrival forecasts over walkable cells; no physical calibration."""
from functools import lru_cache
import json
from pathlib import Path

LOOKAHEAD = 30
MAX_SECONDS = 86400


@lru_cache(maxsize=1)
def coefficients():
    data = json.loads(Path(__file__).with_name('atlas_spread_weights.json').read_text())
    smoke, heat = data['smokeSecondsPerUnit'], data['heatSecondsPerUnit']
    if not (0 < smoke < heat):
        raise ValueError('Invalid synthetic spread weights')
    return smoke, heat


def arrival_bands(step, elapsed):
    """Cutoffs for estimated arrival within the horizon and a softer caution band."""
    smoke, heat = coefficients()
    return {key: int(seconds / (slope * step)) for key, seconds, slope in (
        ('heat', elapsed + LOOKAHEAD, heat),
        ('smoke', elapsed + LOOKAHEAD, smoke),
        ('caution', elapsed + LOOKAHEAD + 20, smoke),
    )}


def overlay(distances, width, step, cutoff):
    """Horizontal runs on the actual occupancy grid; never shade through walls."""
    runs = []
    for row in range(0, len(distances), width):
        start = None
        for x in range(width+1):
            active = x < width and 0 <= distances[row+x] <= cutoff
            if active and start is None:
                start = x
            elif not active and start is not None:
                runs.append(f'M{start*step-step/2:g},{(row//width)*step:g}h{(x-start)*step:g}')
                start = None
    return ''.join(runs)
