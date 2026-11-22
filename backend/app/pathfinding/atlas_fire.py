"""Static training routing on an atlas-aligned occupancy grid, in drawing units."""
import base64
import heapq
import json
import zlib
from collections import deque
from math import inf
from functools import lru_cache
from array import array

from app.simulation.atlas_spread import arrival_bands, overlay, LOOKAHEAD, MAX_SECONDS


class AtlasScenario:
    def __init__(self, data):
        self.width, self.height, self.step = data['width'], data['height'], data['step']
        self.mask = zlib.decompress(base64.b64decode(data['walkable']))
        self.zone = zlib.decompress(base64.b64decode(data['zones']))
        if len(self.mask) != self.width * self.height or len(self.zone) != len(self.mask):
            raise ValueError('Grid size mismatch')
        self.rooms = {room['id']: room for room in data['rooms']}
        self.stairs = {s['id']: s for s in data['stairs']}
        self.default = data['defaultRoom']
        for item in [*self.rooms.values(), *self.stairs.values()]:
            if not self.mask[self.index(item['point'])]:
                raise ValueError(f"Blocked scenario anchor: {item['id']}")

    @classmethod
    def load(cls, path):
        return cls(json.loads(path.read_text(encoding='utf-8')))

    def catalog(self):
        return {'rooms': [{'id': r['id'], 'label': r['label']} for r in self.rooms.values()],
                'defaultRoom': self.default}

    def index(self, point):
        x, y = (round(v / self.step) for v in point)
        if not (0 <= x < self.width and 0 <= y < self.height):
            raise ValueError('Anchor outside map')
        return y * self.width + x

    def xy(self, index):
        return ((index % self.width) * self.step, (index // self.width) * self.step)

    def neighbors(self, i):
        x, y = i % self.width, i // self.width
        for dx, dy in ((0,-1),(-1,0),(1,0),(0,1)):
            if 0 <= x+dx < self.width and 0 <= y+dy < self.height:
                j = i + dy*self.width + dx
                if self.mask[j]:
                    yield j

    @lru_cache(maxsize=4)
    def distances(self, zone):
        """Feature field shared by static exclusion and learned spread; -1 is unreachable."""
        distance = array('i', [-1]) * len(self.mask)
        q = deque()
        for i, cell_zone in enumerate(self.zone):
            if cell_zone == zone and self.mask[i]:
                q.append(i)
                distance[i] = 0
        while q:
            i = q.popleft()
            d = distance[i]+1
            for j in self.neighbors(i):
                if distance[j] == -1:
                    distance[j] = d
                    q.append(j)
        return distance

    @lru_cache(maxsize=8)
    def forecast(self, zone, elapsed):
        exposure = self.distances(zone)
        bands = arrival_bands(self.step, elapsed)
        return bands, dict(elapsed=elapsed, horizon=LOOKAHEAD, cellSize=self.step,
                           smoke=overlay(exposure,self.width,self.step,bands['smoke']),
                           heat=overlay(exposure,self.width,self.step,bands['heat']))

    def route(self, origin, fire=None, elapsed=0):
        if origin not in self.rooms or (fire is not None and fire not in self.rooms):
            raise ValueError('Select a Level 2 room from the catalog')
        room = self.rooms[fire] if fire else None
        if not 0 <= elapsed <= MAX_SECONDS:
            raise ValueError('Simulated incident time out of range; clear and restart the scenario')
        result = dict(status='no_route', reason='', stair=None, exitName=None, assumedLanding=False, legs=[],
                      firePolygon=room['polygon'] if room else [], forecast=None)
        start = self.index(self.rooms[origin]['point'])
        exposure = self.distances(room['zone']) if room else None
        hard = max(1, round(30 / self.step))
        far = max(hard+1, round(85 / self.step))
        if room:
            bands, result['forecast'] = self.forecast(room['zone'], elapsed)
            hard = max(hard, bands['smoke'], bands['heat'])
            far = max(far, bands['caution'], hard+1)
        if exposure is not None and 0 <= exposure[start] <= hard:
            result['reason'] = 'Start is inside the fire exclusion zone or the predicted smoke/heat footprint.'
            return result
        goals = {self.index(s['point']): s for s in self.stairs.values()
                 if s.get('exitName') and len(s.get('lowerPath', [])) >= 2 and s['lowerPath'][0] == s['lower']}
        if not goals:
            result['reason'] = 'No modeled Level 1 connection from a stair to an exterior door.'
            return result
        # Lexicographic cost: minimize exposure first, then distance. A short
        # route cannot buy permission to move closer to the fire in its buffer.
        queue = [(0, 0, start)]
        best = {start: (0, 0)}
        parent = {}
        while queue:
            risk, length, i = heapq.heappop(queue)
            if best[i] != (risk, length):
                continue
            if i in goals:
                stair = goals[i]
                path = [i]
                while i != start:
                    i = parent[i]
                    path.append(i)
                points = []
                for cell in reversed(path):
                    x,y = self.xy(cell)
                    if len(points) >= 2 and (points[-2][0] == points[-1][0] == x or
                                              points[-2][1] == points[-1][1] == y):
                        points.pop()
                    points.append((x,y))
                # Preserve the exact survey/drawing marker at the stair rather
                # than copying Level 2 coordinates onto Level 1.
                if tuple(points[-1]) != tuple(stair['point']):
                    points.append(tuple(stair['point']))
                result.update(status='ok', reason=f"Continue from the Level 1 landing to {stair['exitName']} (modeled).",
                              exitName=stair['exitName'],
                              stair=stair['id'], assumedLanding=stair['assumedLanding'],
                              legs=[dict(level=2, points=points),dict(level=1, points=stair['lowerPath'])])
                return result
            for j in self.neighbors(i):
                d = min(far, exposure[j]) if exposure is not None and exposure[j]>=0 else far
                here = min(far, exposure[i]) if exposure is not None and exposure[i]>=0 else far
                if exposure is not None and (d <= hard or d < here):
                    continue
                score = (risk + far - d, length+1)
                if score < best.get(j, (inf,inf)):
                    best[j] = score
                    parent[j] = i
                    heapq.heappush(queue, (*score,j))
        result['reason'] = 'No modeled stair can be reached without entering or approaching the predicted hazard buffer.'
        return result
