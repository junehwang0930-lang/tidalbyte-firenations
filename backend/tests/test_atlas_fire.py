import base64
import zlib

import pytest

from app.pathfinding.atlas_fire import AtlasScenario


def corridor():
    # A short west descent and a longer east descent on a single floor.
    width,height,step=23,7,20
    free=bytearray(width*height)
    zones=bytearray(width*height)
    for x in range(1,22):
        free[3*width+x]=1
    rooms=[]
    for z,(name,x) in enumerate([('left',4),('middle',10),('right',17)],1):
        # Side room connected to the hall by a single door.
        for y in (1,2):
            free[y*width+x]=1
            zones[y*width+x]=z
        rooms.append(dict(id=name,label=name,point=[x*step,step],zone=z,
                          polygon=[[x*step,step],[x*step+5,step],[x*step,step+5]]))
    def enc(b):
        return base64.b64encode(zlib.compress(b)).decode()
    return AtlasScenario(dict(width=width,height=height,step=step,walkable=enc(free),zones=enc(zones),
        rooms=rooms,defaultRoom='middle',stairs=[
            dict(id='W',point=[step,3*step],lower=[9,42],assumedLanding=True,
                 exitName='West',lowerPath=[[9,42],[9,62],[9,72]]),
            dict(id='E',point=[21*step,3*step],lower=[11,29],assumedLanding=False,
                 exitName='East',lowerPath=[[11,29],[11,9],[11,0]])]))


def test_opposite_side_fire_outweighs_distance_and_pairs_landing():
    scenario=corridor()
    assert scenario.route('middle')['stair']=='W'
    left=scenario.route('middle','left')
    assert left['stair']=='E' and left['legs'][-1]=={'level':1,'points':[[11,29],[11,9],[11,0]]}
    right=scenario.route('middle','right')
    assert right['stair']=='W' and right['assumedLanding']
    assert right['legs'][-1]['points']==[[9,42],[9,62],[9,72]]
    assert scenario.route('middle')['firePolygon']==[]


def test_dead_end_stair_is_not_a_destination():
    scenario=corridor()
    del scenario.stairs['W']['lowerPath']
    result=scenario.route('middle')
    assert result['stair']=='E' and result['exitName']=='East'
    del scenario.stairs['E']['lowerPath']
    assert scenario.route('middle')['legs']==[]


def test_no_fallback_and_invalid_room():
    scenario=corridor()
    assert scenario.route('left','left')['legs']==[]
    del scenario.stairs['E']
    assert scenario.route('middle','left')['status']=='no_route'
    assert scenario.route('middle','left')['stair'] is None
    with pytest.raises(ValueError):
        scenario.route('middle','level-one')


def test_forecast_changes_eligibility_without_moving_ignition():
    scenario = corridor()
    initial = scenario.route('middle','left',0)
    later = scenario.route('middle','left',200)
    assert initial['status'] == 'ok' and later['status'] == 'no_route'
    assert initial['firePolygon'] == later['firePolygon']
    assert initial['forecast']['smoke'] != later['forecast']['smoke']
    assert initial['forecast']['heat'] != later['forecast']['heat']
    assert scenario.route('middle', None)['forecast'] is None


def test_forecast_cannot_cross_a_sealed_wall():
    scenario = corridor()
    mask = bytearray(scenario.mask)
    mask[3*scenario.width+8] = 0
    scenario.mask = bytes(mask)
    assert scenario.distances(scenario.rooms['left']['zone'])[scenario.index(scenario.rooms['middle']['point'])] == -1
    after = scenario.route('middle','left',1000)
    assert after['status'] == 'ok' and after['stair'] == 'E'
