"""Build the 3D hero object for every content page (src/app/obj/<name>.eeq) in Blender.

Run inside Blender (tested on 5.2.1 LTS):

    blender --background --python tools/blender/make_objects.py -- <site root>

or exec it in a live Blender with EE_SITE_ROOT set to the site's root folder. Every object is
built from code, so any of them can be rebuilt by editing this file. The approach and the mesh
helpers follow the Eagle Eye app's scripts/features/make_features.py (its feature-page objects).

Each object is written in a COMPACT model format, EEQ1, that src/app/wl-obj.js expands to the
app's EEM2 layout on load:
    b"EEQ1", uint32 vertex count, then per vertex 10 bytes:
    int16 x, y, z  (position / 0.5 * 32767; the object is centred and its largest side is 1.0)
    int8  nx, ny, nz (unit normal * 127)
    uint8 part
three vertices per triangle, x across, y up, z towards the viewer (EEM2 is 28 bytes a vertex;
this is 10, about a third, with no visible loss at hero size).

`part` carries two things, as in the app: part % 4 is the finish (0 red metal, 1 white enamel,
2 graphite, 3 glowing red); part // 4 is its stage in the build-up (stage 0 lands first).
"""

from __future__ import annotations

import math
import os
import struct
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

_argv_root = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv[:-1] else None
ROOT = Path(os.environ.get("EE_SITE_ROOT") or _argv_root or Path.cwd())
OUT_DIR = ROOT / "src" / "app" / "obj"

RED, WHITE, GRAPHITE, GLOW = 0, 1, 2, 3
COLOURS = {RED: (0.85, 0.04, 0.05, 1), WHITE: (0.95, 0.95, 0.95, 1), GRAPHITE: (0.07, 0.06, 0.065, 1), GLOW: (1.0, 0.2, 0.15, 1)}
PREFIX = "EESite_"
MAX_TRIS = 3200          # per object: keeps every model under ~100 KB


def stage(part, n):
    return part + 4 * n


# --- mesh pieces (Blender axes: x across, y away from the viewer, z up) -----------------------

def _object(bm, name, part, smooth=False, bevel=0.0, segs=1):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(PREFIX + name + "Mesh")
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = smooth
    ob = bpy.data.objects.new(PREFIX + name, me)
    bpy.context.scene.collection.objects.link(ob)
    if bevel:
        mod = ob.modifiers.new("Bevel", "BEVEL")
        mod.width, mod.segments, mod.limit_method, mod.angle_limit = bevel, segs, "ANGLE", 0.5236
    mat = bpy.data.materials.get(PREFIX + str(part % 4)) or bpy.data.materials.new(PREFIX + str(part % 4))
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = COLOURS[part % 4]
    bsdf.inputs["Roughness"].default_value = 0.3
    ob.data.materials.append(mat)
    return ob, part


def box(name, part, c, size, bevel=0.02, segs=1, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=bm.verts, vec=size)
    if rot:
        for ax, ang in rot:
            bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(ang, 3, ax))
    bmesh.ops.translate(bm, verts=bm.verts, vec=c)
    return _object(bm, name, part, bevel=bevel, segs=segs)


def cyl(name, part, c, r, depth, axis="Z", segs=32, r2=None, bevel=0.012, smooth=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    if axis == "Y":
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "X"))
    elif axis == "X":
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "Y"))
    bmesh.ops.translate(bm, verts=bm.verts, vec=c)
    ob = _object(bm, name, part, smooth=False, bevel=bevel)
    ax = {"X": 0, "Y": 1, "Z": 2}[axis]
    for poly in ob[0].data.polygons:
        poly.use_smooth = smooth and abs(poly.normal[ax]) < 0.5
    return ob


def sphere(name, part, c, r, segs=20):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=max(8, segs // 2), radius=r)
    bmesh.ops.translate(bm, verts=bm.verts, vec=c)
    return _object(bm, name, part, smooth=True)


def slab(name, part, pts, depth, y=0.0, bevel=0.01, smooth=False):
    """A flat shape facing the viewer: pts are (x, z) in the front plane, pushed back `depth`."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, y - depth / 2, z)) for x, z in pts]
    face = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    bmesh.ops.translate(bm, verts=[e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)], vec=(0, depth, 0))
    return _object(bm, name, part, smooth=smooth, bevel=bevel)


def plate(name, part, pts, thick, z=0.0, bevel=0.01):
    """A flat shape lying on the floor: pts are (x, y) in plan, raised `thick`."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z)) for x, y in pts]
    face = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    bmesh.ops.translate(bm, verts=[e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)], vec=(0, 0, thick))
    return _object(bm, name, part, bevel=bevel)


def lathe(name, part, prof, c=(0, 0, 0), segs=32, squash_y=1.0):
    bm = bmesh.new()
    rings = [[bm.verts.new((r * math.cos(2 * math.pi * k / segs), r * math.sin(2 * math.pi * k / segs) * squash_y, z))
              for k in range(segs)] for r, z in prof]
    for j in range(len(rings) - 1):
        for k in range(segs):
            try:
                bm.faces.new((rings[j][k], rings[j][(k + 1) % segs], rings[j + 1][(k + 1) % segs], rings[j + 1][k]))
            except ValueError:
                pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.translate(bm, verts=bm.verts, vec=c)
    return _object(bm, name, part, smooth=True)


def arc_tube(name, part, c, radius, thick, a0, a1, plane="XZ", segs=32, ring=10):
    """A tube bent along a circular arc (radians) — in the front plane (XZ) or on the floor (XY)."""
    bm = bmesh.new()
    rings = []
    for i in range(segs + 1):
        a = a0 + (a1 - a0) * i / segs
        centre = Vector((radius * math.cos(a), 0, radius * math.sin(a)))
        out = Vector((math.cos(a), 0, math.sin(a)))
        side = Vector((0, 1, 0))
        rings.append([bm.verts.new(centre + (out * math.cos(2 * math.pi * k / ring) + side * math.sin(2 * math.pi * k / ring)) * thick)
                      for k in range(ring)])
    for j in range(segs):
        for k in range(ring):
            bm.faces.new((rings[j][k], rings[j][(k + 1) % ring], rings[j + 1][(k + 1) % ring], rings[j + 1][k]))
    if abs((a1 - a0) - 2 * math.pi) > 1e-6:
        for rr in (rings[0], rings[-1]):
            bm.faces.new(rr)
    else:
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    if plane == "XY":
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "X"))
    bmesh.ops.translate(bm, verts=bm.verts, vec=c)
    return _object(bm, name, part, smooth=True)


def sector(name, part, c, r0, r1, a0, a1, thick, segs=24):
    """A flat wedge of a ring lying on the floor (a radar sweep)."""
    pts_o = [(r1 * math.cos(a0 + (a1 - a0) * i / segs), r1 * math.sin(a0 + (a1 - a0) * i / segs)) for i in range(segs + 1)]
    pts_i = [(r0 * math.cos(a1 - (a1 - a0) * i / segs), r0 * math.sin(a1 - (a1 - a0) * i / segs)) for i in range(segs + 1)]
    return plate(name, part, [(x + c[0], y + c[1]) for x, y in pts_o + pts_i], thick, z=c[2], bevel=0)


def rounded_rect(w, h, r, n=6, cx=0.0, cz=0.0):
    pts = []
    for (ox, oz, a0) in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + ox + r * math.cos(a), cz + oz + r * math.sin(a)))
    return pts


def pin_profile(R=1.0, H=2.55):
    t = math.asin(R / H)
    tx, tz = R * math.cos(t), H - R * math.sin(t)
    pts = [(0.0, 0.0)] + [(tx * i / 5, tz * i / 5) for i in range(1, 5)]
    for i in range(12):
        a = -t + (math.pi / 2 + t) * i / 11
        pts.append((R * math.cos(a), H + R * math.sin(a)))
    pts[-1] = (0.0, H + R)
    return pts


def map_pin(name, part, c, height, eye_part=None, segs=18):
    s = height / 3.55
    prof = [(r * s, z * s) for r, z in pin_profile()]
    out = [lathe(name, part, prof, c=c, segs=segs, squash_y=0.62)]
    if eye_part is not None:
        out.append(cyl(name + "Eye", eye_part, (c[0], c[1] - 0.01, c[2] + 2.55 * s), 0.4 * s, 2 * 0.62 * s + 0.03, axis="Y", segs=14, bevel=0))
    return out


def question_mark(name, part, c, s=1.0):
    return [arc_tube(name + "Arc", part, (c[0], c[1], c[2] + 0.12 * s), 0.17 * s, 0.05 * s, math.radians(-90), math.radians(200), segs=20),
            cyl(name + "Stem", part, (c[0], c[1], c[2] - 0.1 * s), 0.05 * s, 0.14 * s, axis="Z", segs=12),
            sphere(name + "Dot", part, (c[0], c[1], c[2] - 0.28 * s), 0.06 * s, segs=14)]


HEAT = [GLOW, GLOW, RED, RED, WHITE, GRAPHITE]   # rank bands, best to worst


# --- the objects --------------------------------------------------------------------------------

def storefront(prop=None, landmark=None):
    """A local shop on its block of the map. With a `prop` (its trade's emblem, on the roof)
    the pin stands on the pavement in front; with a `landmark` (its metro) that stands behind."""
    if prop or landmark:
        out = _storefront_base(skip_tall=landmark is not None, pin=prop is None)
        if prop:
            out += grow(PROPS[prop]((0, 0.12, 0.73)), (0, 0.12, 0.73), PROP_SCALE.get(prop, 1.55))
            out += map_pin("SFPinFront", stage(RED, 3), (-0.62, -0.5, 0), 0.5, eye_part=stage(WHITE, 3))
        if landmark:
            out += grow(LANDMARKS[landmark]((0.66, 0.48, 0)), (0.66, 0.48, 0), 1.35)
        return out
    return _storefront_base()


def grow(parts, base, k):
    """Scale built parts by k about a base point (their meshes stay as built; only the
    objects' transforms change, which the exporter bakes in)."""
    bpy.context.view_layer.update()
    b = Vector(base)
    for ob, _ in parts:
        ob.location = ob.location * k + b * (1 - k)
        ob.scale = ob.scale * k
    return parts


def _storefront_base(skip_tall=False, pin=True):
    out = [box("SFTile", stage(GRAPHITE, 0), (0, 0, -0.05), (2.1, 1.5, 0.1), bevel=0.03)]
    for i, x in enumerate((-0.75, 0.75)):
        out.append(box(f"SFRoadX{i}", stage(WHITE, 0), (x, 0, 0.005), (0.04, 1.5, 0.012), bevel=0))
    out.append(box("SFRoadY", stage(WHITE, 0), (0, -0.55, 0.005), (2.1, 0.04, 0.012), bevel=0))
    out.append(box("SFBody", stage(WHITE, 1), (0, 0.12, 0.33), (1.0, 0.7, 0.66), bevel=0.02))
    out.append(box("SFRoof", stage(GRAPHITE, 1), (0, 0.12, 0.69), (1.1, 0.8, 0.08), bevel=0.015))
    out.append(box("SFSign", stage(RED, 2), (0, -0.25, 0.58), (0.7, 0.04, 0.13), bevel=0.01))
    out.append(box("SFDoor", stage(GRAPHITE, 2), (-0.2, -0.235, 0.17), (0.2, 0.03, 0.34), bevel=0.008))
    out.append(box("SFWin", stage(GLOW, 2), (0.2, -0.235, 0.22), (0.3, 0.03, 0.22), bevel=0.008))
    # The awning: five stripes, red and white, tipped out over the pavement.
    for i in range(5):
        x = -0.4 + i * 0.2
        out.append(box(f"SFAwn{i}", stage(RED if i % 2 == 0 else WHITE, 2), (x, -0.33, 0.44), (0.2, 0.22, 0.03), bevel=0, rot=[("X", math.radians(-28))]))
    for i, (x, y) in enumerate(((-0.75, 0.45), (0.78, 0.35), (-0.78, -0.25))):
        if skip_tall and i == 1:
            continue
        h = (0.35, 0.5, 0.28)[i]
        out.append(box(f"SFNbr{i}", stage(GRAPHITE, 1), (x, y, h / 2), (0.35, 0.35, h), bevel=0.015))
    if pin:
        out += map_pin("SFPin", stage(RED, 3), (0, 0.12, 0.85), 0.62, eye_part=stage(WHITE, 3))
    return out


# --- trade emblems (on the shop's roof) ---------------------------------------------------------
# Each takes the point it stands on and returns its parts, about 0.5 tall, built in stage 3 (the
# last chapter of the page's story), so the trade is the reveal.

def _st(part):
    return stage(part, 3)


def p_wrench(c, part=RED):
    """A spanner, leaning: a ring end at the foot, the shaft, and an open jaw at the top whose
    mouth faces OUT along the shaft (a jaw opening towards the shaft reads as a candy cane)."""
    x, y, z = c
    lean = math.radians(22)                               # the top leans to +x
    at = lambda d: (x + 0.05 + d * math.sin(lean), y, z + 0.1 + d * math.cos(lean))
    up = math.pi / 2 - lean                               # the shaft's direction in the XZ plane
    out = [box("PWrShaft", _st(part), at(0.23), (0.075, 0.06, 0.34), bevel=0.015, rot=[("Y", lean)])]
    out.append(arc_tube("PWrJaw", _st(part), at(0.46), 0.1, 0.04, up + math.radians(38), up + 2 * math.pi - math.radians(38), segs=18, ring=8))
    out.append(arc_tube("PWrRing", _st(part), at(0.0), 0.065, 0.032, 0, 2 * math.pi, segs=16, ring=8))
    return out


def p_tooth(c):
    x, y, z = c
    prof = [(0.0, 0.0), (0.06, 0.02), (0.08, 0.16), (0.13, 0.22), (0.2, 0.32), (0.21, 0.45), (0.17, 0.53), (0.08, 0.55), (0.0, 0.5)]
    out = [lathe("PTooth", _st(WHITE), prof, c=(x, y, z), segs=20)]
    out.append(sphere("PToothGlint", _st(GLOW), (x - 0.08, y - 0.15, z + 0.42), 0.035, segs=10))
    return out


def p_plate(c):
    x, y, z = c
    out = [cyl("PPlate", _st(WHITE), (x, y, z + 0.03), 0.3, 0.04, segs=32), cyl("PPlateIn", _st(GRAPHITE), (x, y, z + 0.05), 0.2, 0.02, segs=28, bevel=0)]
    out.append(box("PFork", _st(RED), (x - 0.38, y, z + 0.25), (0.04, 0.04, 0.5), bevel=0.01))
    for k in range(3):
        out.append(box(f"PForkT{k}", _st(RED), (x - 0.42 + k * 0.04, y, z + 0.53), (0.02, 0.02, 0.12), bevel=0))
    out.append(box("PKnife", _st(RED), (x + 0.38, y, z + 0.3), (0.06, 0.03, 0.6), bevel=0.01))
    return out


def p_gavel(c):
    x, y, z = c
    out = [cyl("PGvBlock", _st(GRAPHITE), (x, y, z + 0.04), 0.25, 0.08, segs=28)]
    out.append(cyl("PGvHead", _st(RED), (x, y, z + 0.35), 0.09, 0.36, axis="X", segs=20))
    out.append(box("PGvHandle", _st(WHITE), (x + 0.16, y, z + 0.18), (0.05, 0.05, 0.44), bevel=0.01, rot=[("Y", math.radians(-40))]))
    return out


def p_bag(c):
    x, y, z = c
    return [box("PBag", _st(RED), (x, y, z + 0.22), (0.4, 0.2, 0.44), bevel=0.025),
            arc_tube("PBagH", _st(WHITE), (x, y, z + 0.44), 0.12, 0.025, 0, math.pi, segs=14, ring=8),
            box("PBagTag", _st(WHITE), (x, y - 0.11, z + 0.22), (0.18, 0.02, 0.12), bevel=0)]


def p_car(c, tag=False):
    x, y, z = c
    out = [box("PCarBody", _st(RED), (x, y, z + 0.12), (0.7, 0.32, 0.14), bevel=0.04, segs=2),
           box("PCarCab", _st(RED), (x - 0.04, y, z + 0.25), (0.38, 0.28, 0.14), bevel=0.04, segs=2),
           box("PCarGlass", _st(GLOW), (x - 0.04, y - 0.141, z + 0.25), (0.3, 0.01, 0.09), bevel=0)]
    for k, dx in enumerate((-0.22, 0.22)):
        for side in (-1, 1):
            out.append(cyl(f"PCarW{k}{side}", _st(GRAPHITE), (x + dx, y + side * 0.16, z + 0.06), 0.07, 0.06, axis="Y", segs=16))
    if tag:
        out.append(box("PCarTag", _st(WHITE), (x + 0.12, y - 0.17, z + 0.45), (0.22, 0.02, 0.14), bevel=0.008))
        out.append(cyl("PCarTagStr", _st(WHITE), (x + 0.12, y - 0.17, z + 0.33), 0.006, 0.12, segs=6, bevel=0))
    return out


def p_house(c, part=WHITE):
    x, y, z = c
    out = [box("PHouse", _st(part), (x, y, z + 0.15), (0.36, 0.3, 0.3), bevel=0.015)]
    roof = [(x - 0.24, z + 0.29), (x + 0.24, z + 0.29), (x, z + 0.5)]
    out.append(slab("PHouseRoof", _st(RED), roof, 0.36, y=y, bevel=0.01))
    out.append(box("PHouseDoor", _st(GLOW), (x, y - 0.155, z + 0.08), (0.08, 0.01, 0.15), bevel=0))
    return out


def p_dumbbell(c):
    x, y, z = c
    out = [cyl("PDbBar", _st(WHITE), (x, y, z + 0.16), 0.03, 0.6, axis="X", segs=12, bevel=0)]
    for k, dx in enumerate((-0.24, -0.17, 0.17, 0.24)):
        out.append(cyl(f"PDbW{k}", _st(RED if abs(dx) > 0.2 else GRAPHITE), (x + dx, y, z + 0.16), 0.16 if abs(dx) > 0.2 else 0.12, 0.06, axis="X", segs=24))
    return out


def p_scissors(c):
    x, y, z = c
    out = []
    for k, a in enumerate((25, -25)):
        b = box(f"PScBlade{k}", _st(WHITE), (x, y - 0.02 * k, z + 0.35), (0.05, 0.02, 0.42), bevel=0.008, rot=[("Y", math.radians(a))])
        out.append(b)
        out.append(arc_tube(f"PScRing{k}", _st(RED), (x + (0.1 if a > 0 else -0.1), y - 0.02 * k, z + 0.1), 0.07, 0.022, 0, 2 * math.pi, segs=16, ring=6))
    out.append(sphere("PScPivot", _st(GLOW), (x, y - 0.04, z + 0.27), 0.03, segs=10))
    return out


def p_barberpole(c):
    x, y, z = c
    out = [cyl("PBPCap", _st(GRAPHITE), (x, y, z + 0.03), 0.1, 0.06, segs=20), cyl("PBPTop", _st(GRAPHITE), (x, y, z + 0.6), 0.1, 0.06, segs=20)]
    for k in range(5):
        out.append(cyl(f"PBPBand{k}", _st(RED if k % 2 == 0 else WHITE), (x, y, z + 0.1 + k * 0.1), 0.075, 0.1, segs=20, bevel=0))
    out.append(sphere("PBPBall", _st(GLOW), (x, y, z + 0.68), 0.06, segs=12))
    return out


def p_spine(c):
    x, y, z = c
    out = []
    for k in range(6):
        out.append(cyl(f"PSpV{k}", _st(WHITE), (x + math.sin(k * 0.6) * 0.04, y, z + 0.06 + k * 0.1), 0.09 - k * 0.006, 0.06, segs=18))
        if k < 5:
            out.append(cyl(f"PSpD{k}", _st(RED), (x + math.sin(k * 0.6 + 0.3) * 0.04, y, z + 0.11 + k * 0.1), 0.06, 0.03, segs=14, bevel=0))
    return out


def p_paw(c):
    x, y, z = c
    out = [cyl("PPawPad", _st(RED), (x, y, z + 0.18), 0.15, 0.06, axis="Y", segs=24)]
    for k, (dx, dz) in enumerate(((-0.17, 0.34), (-0.06, 0.4), (0.06, 0.4), (0.17, 0.34))):
        out.append(cyl(f"PPawToe{k}", _st(WHITE), (x + dx, y, z + dz), 0.055, 0.06, axis="Y", segs=16))
    return out


def p_shingles(c):
    """A roof being laid: a little gable house whose two slopes are courses of shingles (each
    course stepped out over the one above it, as shingles lie), a ridge cap, and the hammer."""
    x, y, z = c
    eave, ridge, half = 0.12, 0.44, 0.3
    out = [slab("PShgGable", _st(WHITE), [(x - half + 0.02, z), (x + half - 0.02, z), (x + half - 0.02, z + eave), (x, z + ridge - 0.02), (x - half + 0.02, z + eave)], 0.36, y=y, bevel=0.008)]
    th = math.atan2(ridge - eave, half)
    run = math.hypot(half, ridge - eave) + 0.04
    for side, sgn in ((0, -1), (1, 1)):
        for r in range(3):
            t = (r + 0.45) / 3.1                           # the top course stops at the ridge cap
            px, pz = x + sgn * (half + 0.02 - (half + 0.02) * t), z + eave + (ridge - eave) * t
            lift = 0.03 * (2 - r) / 2                       # lower courses sit proud of the upper
            out.append(box(f"PShg{side}{r}", _st(RED if r % 2 == 0 else GRAPHITE),
                           (px + sgn * math.sin(th) * lift, y, pz + 0.035 + math.cos(th) * lift), (run / 3 + 0.02, 0.44, 0.035),
                           bevel=0.006, rot=[("Y", sgn * th)]))
    out.append(cyl("PShgRidge", _st(WHITE), (x, y, z + ridge + 0.05), 0.03, 0.46, axis="Y", segs=12))
    out.append(box("PShgHammer", _st(GRAPHITE), (x + 0.42, y - 0.12, z + 0.2), (0.035, 0.035, 0.38), bevel=0.008, rot=[("Y", math.radians(-12))]))
    out.append(box("PShgHead", _st(GLOW), (x + 0.38, y - 0.12, z + 0.39), (0.16, 0.06, 0.06), bevel=0.01, rot=[("Y", math.radians(-12))]))
    return out


def p_drop(c):
    x, y, z = c
    prof = [(0.0, 0.0), (0.12, 0.04), (0.19, 0.14), (0.2, 0.24), (0.16, 0.34), (0.1, 0.44), (0.04, 0.54), (0.0, 0.6)]
    return [lathe("PDrop", _st(GLOW), prof, c=(x, y, z), segs=24), sphere("PDropGlint", _st(WHITE), (x - 0.07, y - 0.12, z + 0.25), 0.04, segs=10)]


def p_bed(c):
    x, y, z = c
    return [box("PBedBase", _st(GRAPHITE), (x, y, z + 0.08), (0.6, 0.38, 0.12), bevel=0.02),
            box("PBedSheet", _st(WHITE), (x + 0.05, y, z + 0.17), (0.5, 0.36, 0.06), bevel=0.02),
            box("PBedPillow", _st(WHITE), (x - 0.21, y, z + 0.22), (0.13, 0.3, 0.07), bevel=0.03, segs=2),
            box("PBedHead", _st(RED), (x - 0.31, y, z + 0.25), (0.04, 0.4, 0.38), bevel=0.015),
            box("PBedBlanket", _st(RED), (x + 0.1, y, z + 0.205), (0.36, 0.37, 0.02), bevel=0)]


def p_spray(c):
    x, y, z = c
    return [cyl("PSprBottle", _st(WHITE), (x, y, z + 0.18), 0.1, 0.36, segs=20, r2=0.08),
            box("PSprHead", _st(RED), (x + 0.04, y, z + 0.42), (0.18, 0.08, 0.1), bevel=0.02),
            box("PSprTrig", _st(RED), (x - 0.02, y - 0.03, z + 0.33), (0.03, 0.06, 0.1), bevel=0.008),
            sphere("PSprMist0", _st(GLOW), (x + 0.2, y, z + 0.44), 0.035, segs=10),
            sphere("PSprMist1", _st(GLOW), (x + 0.28, y, z + 0.47), 0.025, segs=10)]


def p_tree(c):
    x, y, z = c
    return [cyl("PTreeTrunk", _st(GRAPHITE), (x, y, z + 0.12), 0.04, 0.24, segs=12),
            cyl("PTreeLow", _st(RED), (x, y, z + 0.3), 0.22, 0.24, segs=20, r2=0.06),
            cyl("PTreeHigh", _st(GLOW), (x, y, z + 0.48), 0.16, 0.2, segs=20, r2=0.0)]


def p_bug(c):
    x, y, z = c
    out = [sphere("PBugBody", _st(GRAPHITE), (x, y, z + 0.2), 0.14, segs=16), sphere("PBugHead", _st(GRAPHITE), (x + 0.18, y, z + 0.22), 0.07, segs=12)]
    for k, dx in enumerate((-0.08, 0.0, 0.08)):
        for side in (-1, 1):
            leg = box(f"PBugLeg{k}{side}", _st(WHITE), (x + dx, y + side * 0.15, z + 0.1), (0.02, 0.16, 0.02), bevel=0, rot=[("X", math.radians(side * 30))])
            out.append(leg)
    out.append(arc_tube("PBugNo", _st(RED), (x, y - 0.05, z + 0.25), 0.28, 0.025, 0, 2 * math.pi, segs=28, ring=6))
    out.append(box("PBugSlash", _st(RED), (x, y - 0.05, z + 0.25), (0.54, 0.03, 0.04), bevel=0, rot=[("Y", math.radians(-40))]))
    return out


def p_bolt(c):
    x, y, z = c
    pts = [(x - 0.04, z + 0.62), (x + 0.16, z + 0.62), (x + 0.04, z + 0.36), (x + 0.18, z + 0.36), (x - 0.12, z - 0.0), (x - 0.02, z + 0.27), (x - 0.15, z + 0.27)]
    return [slab("PBolt", _st(GLOW), pts, 0.1, y=y, bevel=0.012)]


def p_fan(c):
    x, y, z = c
    out = [cyl("PFanRing", _st(GRAPHITE), (x, y, z + 0.3), 0.3, 0.08, axis="Y", segs=32), cyl("PFanHub", _st(RED), (x, y - 0.05, z + 0.3), 0.06, 0.08, axis="Y", segs=16)]
    for k in range(4):
        a = k * math.pi / 2 + 0.3
        out.append(box(f"PFanBlade{k}", _st(WHITE), (x + math.cos(a) * 0.14, y - 0.05, z + 0.3 + math.sin(a) * 0.14), (0.2, 0.02, 0.08), bevel=0.01, rot=[("Y", -a)]))
    out.append(box("PFanFlake", _st(GLOW), (x, y - 0.1, z + 0.3), (0.5, 0.01, 0.02), bevel=0))
    return out


def p_cross(c):
    x, y, z = c
    return [box("PCrossV", _st(RED), (x, y, z + 0.3), (0.16, 0.12, 0.5), bevel=0.02), box("PCrossH", _st(RED), (x, y, z + 0.3), (0.5, 0.12, 0.16), bevel=0.02),
            box("PCrossCore", _st(WHITE), (x, y - 0.065, z + 0.3), (0.1, 0.01, 0.1), bevel=0)]


def p_cup(c):
    x, y, z = c
    prof = [(0.0, 0.0), (0.13, 0.0), (0.15, 0.04), (0.17, 0.32), (0.155, 0.34), (0.14, 0.06), (0.0, 0.06)]
    out = [lathe("PCup", _st(WHITE), prof, c=(x, y, z), segs=24), cyl("PCupCoffee", _st(GRAPHITE), (x, y, z + 0.28), 0.14, 0.02, segs=20, bevel=0)]
    out.append(arc_tube("PCupHandle", _st(WHITE), (x + 0.19, y, z + 0.18), 0.07, 0.025, -math.pi / 2, math.pi / 2, segs=12, ring=6))
    for k in range(2):
        out.append(arc_tube(f"PCupSteam{k}", _st(GLOW), (x - 0.04 + k * 0.08, y, z + 0.45), 0.05, 0.012, math.radians(-60), math.radians(240), segs=12, ring=5))
    out.append(cyl("PCupSaucer", _st(RED), (x, y, z - 0.01), 0.24, 0.02, segs=28, bevel=0))
    return out


def p_umbrella(c):
    x, y, z = c
    prof = [(0.0, 0.62), (0.12, 0.6), (0.24, 0.54), (0.32, 0.45), (0.33, 0.42), (0.0, 0.47)]
    return [lathe("PUmbCanopy", _st(RED), prof, c=(x, y, z), segs=8),
            cyl("PUmbShaft", _st(WHITE), (x, y, z + 0.28), 0.015, 0.4, segs=8, bevel=0),
            arc_tube("PUmbHook", _st(WHITE), (x + 0.05, y, z + 0.08), 0.05, 0.018, math.pi, 2 * math.pi, segs=10, ring=5)]


def p_box(c):
    x, y, z = c
    return [box("PBox", _st(GRAPHITE), (x, y, z + 0.18), (0.42, 0.36, 0.36), bevel=0.015), box("PBoxTape", _st(RED), (x, y, z + 0.365), (0.42, 0.08, 0.01), bevel=0),
            box("PBoxTop", _st(GRAPHITE), (x + 0.08, y + 0.05, z + 0.46), (0.3, 0.26, 0.2), bevel=0.012, rot=[("Z", math.radians(15))]),
            box("PBoxArrow", _st(WHITE), (x, y - 0.185, z + 0.2), (0.04, 0.01, 0.14), bevel=0)]


def p_ledger(c):
    x, y, z = c
    out = []
    for k in range(3):
        out.append(box(f"PLedger{k}", _st(WHITE if k != 1 else RED), (x, y, z + 0.04 + k * 0.07), (0.5, 0.36, 0.06), bevel=0.012, rot=[("Z", math.radians(k * 6))]))
    for k in range(4):
        out.append(cyl(f"PLedCoin{k}", _st(GLOW), (x + 0.32, y - 0.05, z + 0.03 + k * 0.05), 0.1, 0.04, segs=20))
    out.append(slab("PLedPct", _st(RED), rounded_rect(0.06, 0.2, 0.02, cx=x - 0.1, cz=z + 0.4), 0.04, y=y - 0.1))
    return out


def p_ball(c):
    x, y, z = c
    return [sphere("PBall", _st(RED), (x, y, z + 0.24), 0.24, segs=24), arc_tube("PBallBand", _st(WHITE), (x, y, z + 0.24), 0.245, 0.02, 0, 2 * math.pi, segs=28, ring=6),
            box("PBallBandRest", _st(GLOW), (x + 0.38, y, z + 0.1), (0.04, 0.04, 0.2), bevel=0.01)]


def p_glasses(c):
    x, y, z = c
    out = []
    for k, dx in enumerate((-0.17, 0.17)):
        out.append(arc_tube(f"PGlRim{k}", _st(RED), (x + dx, y, z + 0.3), 0.13, 0.025, 0, 2 * math.pi, segs=28, ring=6))
        out.append(cyl(f"PGlLens{k}", _st(GLOW), (x + dx, y, z + 0.3), 0.11, 0.01, axis="Y", segs=24, bevel=0))
    out.append(arc_tube("PGlBridge", _st(RED), (x, y, z + 0.33), 0.05, 0.018, 0, math.pi, segs=10, ring=5))
    for k, dx in enumerate((-0.3, 0.3)):
        out.append(box(f"PGlArm{k}", _st(GRAPHITE), (x + dx, y + 0.18, z + 0.32), (0.02, 0.36, 0.02), bevel=0))
    return out


def p_flower(c):
    x, y, z = c
    out = [cyl("PFlStem", _st(GRAPHITE), (x, y, z + 0.2), 0.015, 0.4, segs=8, bevel=0), sphere("PFlCore", _st(GLOW), (x, y, z + 0.45), 0.07, segs=14)]
    for k in range(6):
        a = k * math.pi / 3
        out.append(sphere(f"PFlPetal{k}", _st(RED if k % 2 == 0 else WHITE), (x + math.cos(a) * 0.12, y, z + 0.45 + math.sin(a) * 0.12), 0.075, segs=12))
    out.append(box("PFlLeaf", _st(GRAPHITE), (x + 0.08, y, z + 0.18), (0.14, 0.02, 0.05), bevel=0.01, rot=[("Y", math.radians(-30))]))
    return out


def p_unit(c):
    x, y, z = c
    out = [box("PUnit", _st(GRAPHITE), (x, y, z + 0.2), (0.5, 0.36, 0.4), bevel=0.015)]
    for k in range(5):
        out.append(box(f"PUnitSlat{k}", _st(RED if k == 0 else WHITE), (x, y - 0.185, z + 0.06 + k * 0.065), (0.38, 0.01, 0.045), bevel=0))
    out.append(cyl("PUnitLock", _st(GLOW), (x, y - 0.2, z + 0.04), 0.03, 0.02, axis="Y", segs=12, bevel=0))
    return out


def p_key(c):
    x, y, z = c
    out = [arc_tube("PKeyBow", _st(GLOW), (x, y, z + 0.45), 0.12, 0.035, 0, 2 * math.pi, segs=24, ring=8),
           box("PKeyShaft", _st(GLOW), (x, y, z + 0.18), (0.05, 0.04, 0.36), bevel=0.01)]
    for k, dz in enumerate((0.04, 0.12)):
        out.append(box(f"PKeyBit{k}", _st(GLOW), (x + 0.06, y, z + dz), (0.08, 0.04, 0.05), bevel=0.005))
    return out


def p_toolhouse(c):
    return p_house((c[0] - 0.2, c[1], c[2]), part=WHITE) + p_wrench((c[0] + 0.25, c[1], c[2]))


def p_gear_car(c):
    x, y, z = c
    out = p_car((x, y, z))
    out.append(arc_tube("PGear", _st(GLOW), (x + 0.32, y - 0.05, z + 0.5), 0.12, 0.035, 0, 2 * math.pi, segs=24, ring=6))
    for k in range(8):
        a = k * math.pi / 4
        out.append(box(f"PGearT{k}", _st(GLOW), (x + 0.32 + math.cos(a) * 0.16, y - 0.05, z + 0.5 + math.sin(a) * 0.16), (0.06, 0.05, 0.06), bevel=0, rot=[("Y", -a)]))
    return out


# Props drawn large already are scaled up less, so every emblem reads at about the same size.
PROP_SCALE = {"hvac": 1.05, "pest-control": 1.15, "roofers": 1.2, "accountants": 1.25, "hotels": 1.3, "auto-repair": 1.25, "car-dealerships": 1.3, "gyms-and-fitness": 1.3}

PROPS = {
    "plumbers": p_wrench, "dentists": p_tooth, "restaurants": p_plate, "law-firms": p_gavel, "retail": p_bag,
    "auto-repair": p_gear_car, "real-estate": lambda c: p_house(c, part=WHITE), "gyms-and-fitness": p_dumbbell,
    "salons-and-spas": p_scissors, "barbers": p_barberpole, "chiropractors": p_spine, "veterinarians": p_paw,
    "roofers": p_shingles, "med-spas": p_drop, "hotels": p_bed, "cleaning-services": p_spray, "landscapers": p_tree,
    "pest-control": p_bug, "electricians": p_bolt, "hvac": p_fan, "car-dealerships": lambda c: p_car(c, tag=True),
    "urgent-care": p_cross, "coffee-shops": p_cup, "insurance-agents": p_umbrella, "moving-companies": p_box,
    "accountants": p_ledger, "physical-therapy": p_ball, "optometrists": p_glasses, "florists": p_flower,
    "self-storage": p_unit, "locksmiths": p_key, "home-services": p_toolhouse,
}


# --- metro landmarks (behind the shop, for the trade-in-city pages) -----------------------------
# Generic silhouettes in the house finishes — an idea of the place, not a replica of anything.

def _lm(part):
    return stage(part, 1)


def l_spire(c):        # New York: a stepped tower with a spire
    x, y, z = c
    out = []
    for k, (w, h0, h1) in enumerate(((0.36, 0.0, 0.55), (0.27, 0.55, 0.85), (0.18, 0.85, 1.05), (0.1, 1.05, 1.15))):
        out.append(box(f"LNY{k}", _lm(GRAPHITE if k < 3 else WHITE), (x, y, z + (h0 + h1) / 2), (w, w, h1 - h0), bevel=0.008))
    out.append(cyl("LNYSpire", _lm(GLOW), (x, y, z + 1.3), 0.015, 0.3, segs=6, r2=0.003, bevel=0, smooth=False))
    return out


def l_palms(c):        # Los Angeles: two palms
    out = []
    # each frond an arc that rises out of the crown and droops (flat spokes read as a broken umbrella)
    r = 0.17
    for k, (dx, h) in enumerate(((-0.12, 0.85), (0.14, 1.05))):
        x, y, z = c[0] + dx, c[1], c[2]
        out.append(cyl(f"LLATrunk{k}", _lm(GRAPHITE), (x, y, z + h / 2), 0.035, h, segs=8, r2=0.02, bevel=0))
        out.append(sphere(f"LLACrown{k}", _lm(GRAPHITE), (x, y, z + h), 0.04, segs=10))
        for j in range(7):
            a = j * 2 * math.pi / 7 + k * 0.4
            fr = arc_tube(f"LLAFrond{k}{j}", _lm(RED if j % 2 else GLOW), (0.5 * r, 0, -0.866 * r), r, 0.02, math.radians(15), math.radians(120), segs=7, ring=4)
            fr[0].location = (x, y, z + h)
            fr[0].rotation_euler = (0, 0, a)
            out.append(fr)
    return out


def l_twin(c):         # Chicago: a dark tower with twin antennas
    x, y, z = c
    out = [box("LCHI0", _lm(GRAPHITE), (x, y, z + 0.45), (0.32, 0.32, 0.9), bevel=0.008), box("LCHI1", _lm(GRAPHITE), (x + 0.04, y, z + 1.0), (0.22, 0.22, 0.2), bevel=0.008)]
    for k, dx in enumerate((-0.04, 0.1)):
        out.append(cyl(f"LCHIAnt{k}", _lm(WHITE), (x + dx, y, z + 1.25), 0.012, 0.3, segs=6, bevel=0))
        out.append(sphere(f"LCHIBeacon{k}", _lm(GLOW), (x + dx, y, z + 1.41), 0.025, segs=8))
    return out


def l_rocket(c):       # Houston: a rocket on its pad
    x, y, z = c
    prof = [(0.0, 0.0), (0.1, 0.0), (0.1, 0.7), (0.07, 0.85), (0.0, 0.98)]
    out = [lathe("LHOU", _lm(WHITE), prof, c=(x, y, z + 0.06), segs=18), cyl("LHOUPad", _lm(GRAPHITE), (x, y, z + 0.03), 0.22, 0.06, segs=20)]
    for k in range(3):
        a = k * 2 * math.pi / 3
        out.append(box(f"LHOUFin{k}", _lm(RED), (x + math.cos(a) * 0.12, y + math.sin(a) * 0.12, z + 0.16), (0.08, 0.02, 0.2), bevel=0, rot=[("Z", a)]))
    out.append(cyl("LHOUBand", _lm(RED), (x, y, z + 0.55), 0.102, 0.08, segs=18, bevel=0))
    return out


def l_cactus(c):       # Phoenix: a saguaro under a sun disc
    x, y, z = c
    out = [cyl("LPHX", _lm(RED), (x, y, z + 0.4), 0.08, 0.8, segs=14), sphere("LPHXTop", _lm(RED), (x, y, z + 0.8), 0.08, segs=12)]
    for k, (dx, h) in enumerate(((-0.16, 0.5), (0.16, 0.42))):
        out.append(cyl(f"LPHXArmV{k}", _lm(RED), (x + dx, y, z + h), 0.05, 0.3, segs=12))
        out.append(cyl(f"LPHXArmH{k}", _lm(RED), (x + dx / 2, y, z + h - 0.13), 0.045, 0.16, axis="X", segs=12))
    out.append(cyl("LPHXSun", _lm(GLOW), (x + 0.2, y + 0.2, z + 1.05), 0.14, 0.03, axis="Y", segs=24, bevel=0))
    return out


def l_bell(c):         # Philadelphia: a bell in its frame
    x, y, z = c
    prof = [(0.0, 0.62), (0.08, 0.6), (0.12, 0.5), (0.14, 0.32), (0.2, 0.18), (0.22, 0.14), (0.0, 0.16)]
    out = [lathe("LPHL", _lm(RED), prof, c=(x, y, z + 0.2), segs=24)]
    for k, dx in enumerate((-0.3, 0.3)):
        out.append(box(f"LPHLPost{k}", _lm(GRAPHITE), (x + dx, y, z + 0.45), (0.06, 0.06, 0.9), bevel=0.008))
    out.append(box("LPHLBeam", _lm(GRAPHITE), (x, y, z + 0.88), (0.68, 0.08, 0.06), bevel=0.008))
    out.append(box("LPHLCrack", _lm(WHITE), (x + 0.03, y - 0.15, z + 0.55), (0.012, 0.01, 0.22), bevel=0, rot=[("Y", math.radians(12))]))
    return out


def l_mission(c):      # San Antonio: a mission facade with its curved gable
    x, y, z = c
    pts = [(x - 0.35, z), (x + 0.35, z), (x + 0.35, z + 0.45)] + [(x + 0.22 * math.cos(a), z + 0.5 + 0.22 * math.sin(a)) for a in [i * math.pi / 10 for i in range(11)]] + [(x - 0.35, z + 0.45)]
    out = [slab("LSA", _lm(WHITE), pts, 0.12, y=y, bevel=0.01)]
    out.append(slab("LSADoor", _lm(GRAPHITE), [(x - 0.08, z), (x + 0.08, z)] + [(x + 0.08 * math.cos(a), z + 0.25 + 0.08 * math.sin(a)) for a in [i * math.pi / 8 for i in range(9)]], 0.03, y=y - 0.07, bevel=0))
    out.append(cyl("LSAWin", _lm(GLOW), (x, y - 0.07, z + 0.52), 0.05, 0.03, axis="Y", segs=14, bevel=0))
    return out


def l_sail(c):         # San Diego: a sailboat
    x, y, z = c
    out = [box("LSDHull", _lm(GRAPHITE), (x, y, z + 0.06), (0.6, 0.18, 0.12), bevel=0.04, segs=2), cyl("LSDMast", _lm(WHITE), (x, y, z + 0.55), 0.012, 0.9, segs=6, bevel=0)]
    out.append(slab("LSDSail", _lm(WHITE), [(x + 0.02, z + 0.18), (x + 0.32, z + 0.18), (x + 0.02, z + 0.95)], 0.02, y=y, bevel=0))
    out.append(slab("LSDJib", _lm(RED), [(x - 0.02, z + 0.2), (x - 0.25, z + 0.2), (x - 0.02, z + 0.8)], 0.02, y=y, bevel=0))
    return out


def l_ball(c):         # Dallas: a tower with a lit ball on top
    x, y, z = c
    # three shafts under a lit ball banded by LATITUDE rings (great circles round a glowing
    # orange ball read as a basketball's seams)
    out = []
    for k in range(3):
        a = k * 2 * math.pi / 3
        out.append(cyl(f"LDAL{k}", _lm(GRAPHITE), (x + math.cos(a) * 0.05, y + math.sin(a) * 0.05, z + 0.45), 0.035, 0.9, segs=10))
    out.append(cyl("LDALDeck", _lm(GRAPHITE), (x, y, z + 0.86), 0.1, 0.05, segs=18))
    out.append(sphere("LDALBall", _lm(WHITE), (x, y, z + 1.02), 0.16, segs=20))
    for k, dz in enumerate((-0.08, 0.0, 0.08)):
        rr = math.sqrt(0.163 ** 2 - dz ** 2) + 0.004
        out.append(arc_tube(f"LDALRing{k}", _lm(GLOW), (x, y, z + 1.02 + dz), rr, 0.012, 0, 2 * math.pi, plane="XY", segs=20, ring=4))
    return out


def l_dome(c):         # Austin: a domed capitol
    x, y, z = c
    out = [box("LAUS", _lm(WHITE), (x, y, z + 0.15), (0.7, 0.3, 0.3), bevel=0.01), cyl("LAUSDrum", _lm(WHITE), (x, y, z + 0.4), 0.14, 0.2, segs=20)]
    prof = [(0.15, 0.0), (0.15, 0.04), (0.13, 0.12), (0.09, 0.2), (0.04, 0.25), (0.0, 0.26)]
    out.append(lathe("LAUSDome", _lm(RED), prof, c=(x, y, z + 0.5), segs=20))
    out.append(cyl("LAUSTop", _lm(GLOW), (x, y, z + 0.82), 0.015, 0.12, segs=6, bevel=0))
    for k in range(5):
        out.append(box(f"LAUSCol{k}", _lm(GRAPHITE), (x - 0.24 + k * 0.12, y - 0.16, z + 0.12), (0.035, 0.02, 0.22), bevel=0))
    return out


LANDMARKS = {
    "new-york": l_spire, "los-angeles": l_palms, "chicago": l_twin, "houston": l_rocket, "phoenix": l_cactus,
    "philadelphia": l_bell, "san-antonio": l_mission, "san-diego": l_sail, "dallas": l_ball, "austin": l_dome,
}


def multiloc():
    """One brand, many places: pins of every height across one disc."""
    out = [cyl("MLBase", stage(GRAPHITE, 0), (0, 0, -0.05), 1.05, 0.1, segs=40, bevel=0.008)]
    out.append(arc_tube("MLRing", stage(WHITE, 0), (0, 0, 0.005), 1.0, 0.012, 0, 2 * math.pi, plane="XY", segs=48, ring=4))
    spots = [((0.0, 0.0), 0.95, RED, 3), ((-0.6, 0.35), 0.6, WHITE, 1), ((0.55, 0.42), 0.7, RED, 2), ((-0.35, -0.55), 0.5, WHITE, 1), ((0.62, -0.4), 0.55, WHITE, 2)]
    for i, ((x, y), hgt, fin, st) in enumerate(spots):
        out += map_pin(f"MLPin{i}", stage(fin, st), (x, y, 0), hgt, eye_part=stage(WHITE if fin == RED else RED, st), segs=16 if i == 0 else 12)
        out.append(cyl(f"MLHalo{i}", stage(GLOW, st), (x, y, 0.01), 0.16 * hgt + 0.05, 0.015, segs=16, bevel=0))
    return out


def radar():
    """A scan sweeping out from the shop: rings on the floor, the sweep, blips where it ranks."""
    out = [cyl("RDBase", stage(GRAPHITE, 0), (0, 0, -0.05), 1.05, 0.1, segs=40, bevel=0.008)]
    for i, r in enumerate((0.35, 0.65, 0.95)):
        out.append(arc_tube(f"RDRing{i}", stage(WHITE, 1), (0, 0, 0.01), r, 0.012, 0, 2 * math.pi, plane="XY", segs=40, ring=4))
    out.append(sector("RDSweep", stage(GLOW, 2), (0, 0, 0.012), 0.05, 0.98, math.radians(20), math.radians(75), 0.02))
    for i, (r, a) in enumerate(((0.5, 40), (0.8, 55), (0.3, 160), (0.7, 250), (0.9, 310))):
        x, y = r * math.cos(math.radians(a)), r * math.sin(math.radians(a))
        out.append(sphere(f"RDBlip{i}", stage(GLOW if i < 2 else RED, 2), (x, y, 0.06), 0.05, segs=14))
    out += map_pin("RDPin", stage(RED, 3), (0, 0, 0.02), 0.8, eye_part=stage(WHITE, 3))
    return out


def podium():
    """Who holds #1: the podium, your pin on the top step and the rivals below."""
    out = [box("PDStep2", stage(GRAPHITE, 0), (-0.62, 0, 0.27), (0.6, 0.6, 0.54)),
           box("PDStep1", stage(RED, 1), (0, 0, 0.42), (0.6, 0.6, 0.84)),
           box("PDStep3", stage(GRAPHITE, 0), (0.62, 0, 0.19), (0.6, 0.6, 0.38))]
    one = [(-0.06, 0.2), (0.08, 0.2), (0.08, 0.66), (-0.02, 0.66), (-0.13, 0.56), (-0.1, 0.52), (-0.06, 0.54)]
    out.append(slab("PDOne", stage(WHITE, 2), one, 0.05, y=-0.32, bevel=0.006))
    out += map_pin("PDYou", stage(GLOW, 3), (0, 0, 0.84), 0.62, eye_part=stage(WHITE, 3))
    out += map_pin("PDRivalA", stage(WHITE, 2), (-0.62, 0, 0.54), 0.42)
    out += map_pin("PDRivalB", stage(WHITE, 2), (0.62, 0, 0.38), 0.36)
    return out


def calendar():
    """A calendar with its scan days lit, and the clock that runs them."""
    out = [box("CLBody", stage(WHITE, 0), (0, 0, 0), (1.5, 0.16, 1.3), bevel=0.04, segs=2)]
    out.append(box("CLTop", stage(RED, 1), (0, -0.01, 0.52), (1.5, 0.17, 0.26), bevel=0.03))
    for i, x in enumerate((-0.4, 0.4)):
        out.append(arc_tube(f"CLRing{i}", stage(GRAPHITE, 1), (x, 0, 0.66), 0.08, 0.025, 0, math.pi, segs=12, ring=8))
    for r in range(3):
        for c in range(5):
            lit = (r, c) in {(0, 1), (1, 1), (2, 1), (1, 3)}
            out.append(box(f"CLDay{r}{c}", stage(GLOW if lit else GRAPHITE, 2 if lit else 1), (-0.56 + c * 0.28, -0.1, 0.2 - r * 0.27),
                           (0.2, 0.04 if not lit else 0.08, 0.2), bevel=0.012))
    out.append(cyl("CLClock", stage(GRAPHITE, 3), (0.62, -0.24, -0.5), 0.34, 0.1, axis="Y", segs=40))
    out.append(arc_tube("CLClockRim", stage(RED, 3), (0.62, -0.3, -0.5), 0.34, 0.03, 0, 2 * math.pi, segs=40, ring=8))
    out.append(box("CLHandH", stage(WHITE, 3), (0.62, -0.31, -0.42), (0.035, 0.02, 0.17), bevel=0))
    out.append(box("CLHandM", stage(WHITE, 3), (0.71, -0.32, -0.5), (0.2, 0.02, 0.03), bevel=0))
    return out


def film():
    """Every run as a film: three frames of the same grid, the map turning red frame by frame."""
    out = []
    for f in range(3):
        x, y = -0.55 + f * 0.55, f * 0.22
        out.append(box(f"FMFrame{f}", stage(GRAPHITE, f), (x, y, 0), (0.95, 0.06, 0.95), bevel=0.02))
        for r in range(4):
            for c in range(4):
                d = max(abs(r - 1.5), abs(c - 1.5))
                hot = d < (0.6 + f * 0.7)
                out.append(box(f"FMCell{f}{r}{c}", stage(GLOW if hot and f == 2 else RED if hot else WHITE, f), (x - 0.3 + c * 0.2, y - 0.04, 0.3 - r * 0.2),
                               (0.16, 0.02, 0.16), bevel=0))
        for k in range(6):
            out.append(box(f"FMHole{f}{k}", stage(WHITE, f), (x - 0.38 + k * 0.152, y - 0.04, 0.53), (0.07, 0.02, 0.04), bevel=0))
    # the play button: a disc with its triangle, standing by the strip's foot (it used to lie on the
    # floor well below the frames, so the frames hung in the air above it)
    out.append(cyl("FMPlayDisc", stage(GRAPHITE, 3), (0.92, -0.3, -0.25), 0.22, 0.06, axis="Y", segs=32))
    out.append(slab("FMPlay", stage(GLOW, 3), [(0.86, -0.36), (0.86, -0.14), (1.03, -0.25)], 0.04, y=-0.35, bevel=0.005))
    return out


def twomaps():
    """Google and Apple, side by side: two map tiles, the same pin, a bridge of light between."""
    out = []
    for side, (x, fin, pinfin) in enumerate(((-0.62, RED, WHITE), (0.62, WHITE, RED))):
        tile = box(f"TMTile{side}", stage(fin, 0), (x, 0, 0), (1.0, 1.0, 0.08), bevel=0.03, rot=[("Y", math.radians(8 if side else -8))])
        out.append(tile)
        for k in range(3):
            out.append(box(f"TMRoad{side}{k}", stage(GRAPHITE, 1), (x, -0.3 + k * 0.3, 0.05), (0.9, 0.03, 0.01), bevel=0))
        out += map_pin(f"TMPin{side}", stage(pinfin, 2), (x, 0, 0.06), 0.55, eye_part=stage(GRAPHITE if pinfin == WHITE else WHITE, 2))
    out.append(arc_tube("TMBridge", stage(GLOW, 3), (0, 0, 0.75), 0.62, 0.025, math.radians(15), math.radians(165), segs=28, ring=8))
    return out


def book():
    """An open guide: lines on one page, a scan grid on the other, a ribbon marking the place."""
    out = [box("BKCover", stage(GRAPHITE, 0), (0, 0, -0.04), (2.0, 1.3, 0.06), bevel=0.02)]
    for side, sgn in ((0, -1), (1, 1)):
        out.append(box(f"BKPage{side}", stage(WHITE, 1), (sgn * 0.48, 0, 0.04), (0.92, 1.2, 0.08), bevel=0.02, rot=[("Y", math.radians(-sgn * 7))]))
    for i, w in enumerate((0.7, 0.6, 0.66, 0.45, 0.62, 0.5)):
        out.append(box(f"BKLine{i}", stage(GRAPHITE, 2), (-0.83 + w / 2, 0.42 - i * 0.17, 0.12 + (0.83 - w / 2) * 0.12), (w, 0.05, 0.015), bevel=0))
    for r in range(4):
        for c in range(4):
            d = max(abs(r - 1.5), abs(c - 1.5))
            fin = GLOW if d < 0.6 else RED if d < 1.2 else GRAPHITE
            hgt = 0.04 + (0.1 if d < 0.6 else 0.05 if d < 1.2 else 0.0)
            out.append(box(f"BKCell{r}{c}", stage(fin, 2 if fin == GRAPHITE else 3), (0.25 + c * 0.17, -0.27 + r * 0.17, 0.12 + hgt / 2), (0.13, 0.13, hgt), bevel=0))
    out.append(box("BKRibbon", stage(RED, 3), (0.12, -0.5, 0.08), (0.08, 0.5, 0.02), bevel=0, rot=[("X", math.radians(-10))]))
    return out


def scales(rival="block"):
    """A fair comparison, weighed: Eagle Eye's pin heavy in one pan, the other tool in the other —
    a stack of blocks for a suite, a single tile, a shield, a flat grid, or a plain block."""
    out = [cyl("SCBase", stage(GRAPHITE, 0), (0, 0, 0.04), 0.45, 0.08, segs=40),
           cyl("SCPole", stage(WHITE, 0), (0, 0, 0.6), 0.04, 1.1, segs=16),
           sphere("SCKnob", stage(RED, 1), (0, 0, 1.18), 0.08, segs=18)]
    tilt = math.radians(9)       # positive: the beam's +x end (Eagle Eye's pan) goes DOWN — it outweighs
    out.append(box("SCBeam", stage(RED, 1), (0, 0, 1.1), (1.7, 0.08, 0.07), bevel=0.02, rot=[("Y", tilt)]))
    for side, sgn in ((0, -1), (1, 1)):
        ex, ez = sgn * 0.8 * math.cos(tilt), 1.1 - sgn * 0.8 * math.sin(tilt)
        pz = ez - 0.55
        for k, dx in enumerate((-0.18, 0.18)):
            ln = cyl(f"SCChain{side}{k}", stage(WHITE, 2), (0, 0, 0), 0.008, 0.6, segs=6, bevel=0, smooth=False)
            ln[0].location = (ex + dx / 2, 0, (ez + pz) / 2)
            ln[0].rotation_euler = (0, math.atan2(-dx / 2, ez - pz) * -1, 0)
            out.append(ln)
        out.append(cyl(f"SCPan{side}", stage(GRAPHITE, 2), (ex, 0, pz), 0.3, 0.04, segs=32, r2=0.24))
        if side == 1:
            out += map_pin("SCPin", stage(GLOW, 3), (ex, 0, pz + 0.02), 0.5, eye_part=stage(WHITE, 3))
        elif rival == "stack":
            for k in range(3):
                out.append(box(f"SCStack{k}", stage(WHITE if k != 1 else GRAPHITE, 3), (ex, 0, pz + 0.06 + k * 0.1), (0.24 - k * 0.04, 0.2, 0.09), bevel=0.01))
        elif rival == "tile":
            out.append(box("SCTile", stage(WHITE, 3), (ex, 0, pz + 0.14), (0.26, 0.04, 0.24), bevel=0.012, rot=[("Z", math.radians(20))]))
        elif rival == "shield":
            pts = [(ex - 0.12, pz + 0.3), (ex + 0.12, pz + 0.3), (ex + 0.12, pz + 0.15), (ex, pz + 0.03), (ex - 0.12, pz + 0.15)]
            out.append(slab("SCShield", stage(WHITE, 3), pts, 0.05, y=0, bevel=0.01))
        elif rival == "grid":
            for r in range(3):
                for k in range(3):
                    out.append(box(f"SCGrid{r}{k}", stage(WHITE if (r + k) % 2 else GRAPHITE, 3), (ex - 0.08 + k * 0.08, -0.08 + r * 0.08, pz + 0.04), (0.06, 0.06, 0.03), bevel=0))
        else:
            out.append(box("SCBlock", stage(WHITE, 3), (ex, 0, pz + 0.1), (0.2, 0.2, 0.16), bevel=0.015))
    return out


# --- one object per remaining page ---------------------------------------------------------------

def agency():
    """Agencies: a stack of client workspaces, each its own card, the top one reporting a climb."""
    out = []
    for k in range(3):
        out.append(slab(f"AGCard{k}", stage(GRAPHITE if k < 2 else WHITE, k), rounded_rect(1.3, 0.85, 0.08, cx=k * 0.12, cz=k * 0.16), 0.05, y=0.3 - k * 0.22))
    for i, hgt in enumerate((0.12, 0.2, 0.18, 0.3, 0.42)):
        out.append(box(f"AGBar{i}", stage(RED, 3), (-0.2 + i * 0.16, -0.17, 0.12 + hgt / 2), (0.1, 0.04, hgt), bevel=0.008))
    out.append(box("AGLogo", stage(GLOW, 3), (-0.32, -0.17, 0.58), (0.16, 0.03, 0.08), bevel=0.006))
    return out


def pie():
    """Share of local voice: the map's pie, your slice lifted out and glowing."""
    out = []
    for k, (a0, a1, fin) in enumerate(((0, 138, GLOW), (138, 230, GRAPHITE), (230, 300, WHITE), (300, 360, RED))):
        lift = 0.16 if k == 0 else 0.0
        mid = math.radians((a0 + a1) / 2)
        pts = [(0, 0)] + [(0.8 * math.cos(math.radians(a0 + (a1 - a0) * i / 16)), 0.8 * math.sin(math.radians(a0 + (a1 - a0) * i / 16))) for i in range(17)]
        out.append(plate(f"PIESlice{k}", stage(fin, 3 if k == 0 else 1 + k % 2), [(x + math.cos(mid) * lift, y + math.sin(mid) * lift) for x, y in pts], 0.18 if k == 0 else 0.12, z=0.06 if k == 0 else 0, bevel=0.01))
    out.append(cyl("PIEBase", stage(GRAPHITE, 0), (0, 0, -0.04), 0.95, 0.06, segs=40))
    return out


def vault():
    """Data never on the market: a vault door swung open on a glowing core of listings."""
    out = [box("VTBody", stage(GRAPHITE, 0), (0, 0.15, 0.5), (1.2, 0.5, 1.0), bevel=0.04, segs=2)]
    out.append(cyl("VTCore", stage(GLOW, 2), (0, -0.1, 0.5), 0.3, 0.05, axis="Y", segs=32, bevel=0))
    for r in range(4):
        out.append(box(f"VTList{r}", stage(WHITE, 2), (0, -0.14, 0.62 - r * 0.08), (0.34 - abs(r - 1.5) * 0.06, 0.02, 0.035), bevel=0))
    # The door hangs on a hinge at the left of the opening, swung 70 degrees out towards the viewer
    # (it used to stand on its own beside the safe, and its wheel's spokes all lay on one line).
    hx, hy, R, op = -0.46, -0.16, 0.42, math.radians(70)
    out.append(cyl("VTHinge", stage(GRAPHITE, 3), (hx, hy - 0.02, 0.5), 0.045, 0.72, segs=14))
    cx, cy = hx + (R + 0.03) * math.cos(op), hy - (R + 0.03) * math.sin(op)
    door = cyl("VTDoor", stage(RED, 3), (0, 0, 0), R, 0.1, axis="Y", segs=36)
    door[0].location = (cx, cy, 0.5); door[0].rotation_euler = (0, 0, -op)
    out.append(door)
    # the wheel, on the door's outer face (closed, that face looks down -y; swung, it turns with it)
    nx, ny = -math.sin(op), -math.cos(op)
    for k in range(3):
        sp = box(f"VTSpoke{k}", stage(WHITE, 3), (0, 0, 0), (0.34, 0.03, 0.03), bevel=0)
        sp[0].location = (cx + nx * 0.07, cy + ny * 0.07, 0.5); sp[0].rotation_euler = (0, k * math.pi / 3, -op)
        out.append(sp)
    hub = cyl("VTHub", stage(GLOW, 3), (0, 0, 0), 0.05, 0.05, axis="Y", segs=14, bevel=0)
    hub[0].location = (cx + nx * 0.08, cy + ny * 0.08, 0.5); hub[0].rotation_euler = (0, 0, -op)
    out.append(hub)
    return out


def maptile(which="google"):
    """One map, on its own: Google's tile in red or Apple's in white, a road grid, a pin, a compass."""
    fin, pinfin = (RED, WHITE) if which == "google" else (WHITE, RED)
    out = [box("MTTile", stage(fin, 0), (0, 0, 0), (1.6, 1.2, 0.08), bevel=0.03)]
    for k in range(4):
        out.append(box(f"MTRoadX{k}", stage(GRAPHITE, 1), (-0.6 + k * 0.4, 0, 0.05), (0.03, 1.15, 0.01), bevel=0))
    for k in range(3):
        out.append(box(f"MTRoadY{k}", stage(GRAPHITE, 1), (0, -0.4 + k * 0.4, 0.05), (1.55, 0.03, 0.01), bevel=0))
    for k, (x, y) in enumerate(((-0.4, 0.2), (0.4, -0.2), (0.0, 0.4))):
        out.append(box(f"MTBlk{k}", stage(GRAPHITE if which == "google" else RED, 1), (x, y, 0.1), (0.25, 0.25, 0.12 + k * 0.05), bevel=0.01))
    out += map_pin("MTPin", stage(pinfin, 2), (0.0, -0.05, 0.06), 0.8, eye_part=stage(GLOW, 2))
    out.append(cyl("MTCompass", stage(GRAPHITE, 3), (0.62, 0.42, 0.08), 0.14, 0.05, segs=24))
    out.append(slab("MTNeedle", stage(GLOW, 3), [(0.6, 0.0), (0.64, 0.0), (0.62, 0.2)], 0.02, y=0.42, bevel=0))
    out[-1][0].location = (0, 0, 0.11)
    return out


def localpack():
    """The local pack: three listings stacked, yours on top and lit, the rest of the map below."""
    out = [box("LPMap", stage(GRAPHITE, 0), (0, 0.2, -0.04), (1.6, 1.0, 0.06), bevel=0.02)]
    for k in range(3):
        top = k == 0
        out.append(box(f"LPCard{k}", stage(RED if top else WHITE, 3 - k), (0, -0.05 - k * 0.0, 0.25 + (2 - k) * 0.22), (1.1, 0.5, 0.06), bevel=0.02))
        out.append(box(f"LPNum{k}", stage(WHITE if top else GRAPHITE, 3 - k), (-0.42, -0.31, 0.25 + (2 - k) * 0.22), (0.1, 0.02, 0.04), bevel=0))
        out.append(box(f"LPLine{k}", stage(GLOW if top else GRAPHITE, 3 - k), (0.05, -0.31, 0.25 + (2 - k) * 0.22), (0.6, 0.02, 0.025), bevel=0))
    return out


def profilecard():
    """A Business Profile: the card, its photo, five stars, and the pin it belongs to."""
    out = [slab("PCCard", stage(WHITE, 0), rounded_rect(1.2, 1.5, 0.08), 0.06)]
    out.append(box("PCPhoto", stage(GRAPHITE, 1), (0, -0.05, 0.42), (1.0, 0.03, 0.45), bevel=0.01))
    out.append(box("PCName", stage(GRAPHITE, 2), (-0.18, -0.05, 0.05), (0.6, 0.02, 0.07), bevel=0))
    for k in range(5):
        a = [(math.cos(math.radians(90 + 72 * i)) * (0.07 if i % 2 == 0 else 0.03), math.sin(math.radians(90 + 72 * i)) * (0.07 if i % 2 == 0 else 0.03)) for i in range(10)]
        a = [(math.cos(math.radians(90 + 36 * i)) * (0.07 if i % 2 == 0 else 0.03), math.sin(math.radians(90 + 36 * i)) * (0.07 if i % 2 == 0 else 0.03)) for i in range(10)]
        out.append(slab(f"PCStar{k}", stage(GLOW if k < 4 else GRAPHITE, 3), [(x - 0.4 + k * 0.17, z - 0.22) for x, z in a], 0.03, y=-0.05, bevel=0))
    for k in range(2):
        out.append(box(f"PCRow{k}", stage(GRAPHITE, 2), (-0.1, -0.05, -0.45 - k * 0.13), (0.8, 0.02, 0.05), bevel=0))
    out += map_pin("PCPin", stage(RED, 3), (0.48, -0.15, 0.62), 0.42, eye_part=stage(WHITE, 3))
    return out


def phone():
    """'Near me': a phone in hand, the map on its screen, the nearest pin rising out of it."""
    out = [box("PHBody", stage(GRAPHITE, 0), (0, 0, 0), (0.7, 0.08, 1.35), bevel=0.06, segs=2)]
    out.append(box("PHScreen", stage(WHITE, 1), (0, -0.045, 0.0), (0.6, 0.01, 1.2), bevel=0.02))
    for k in range(3):
        out.append(box(f"PHRoad{k}", stage(GRAPHITE, 1), (0, -0.052, -0.3 + k * 0.3), (0.58, 0.006, 0.025), bevel=0))
    out.append(box("PHRoadV", stage(GRAPHITE, 1), (0.1, -0.052, 0), (0.025, 0.006, 1.15), bevel=0))
    out.append(sphere("PHYou", stage(GLOW, 2), (-0.12, -0.07, -0.2), 0.05, segs=12))
    out.append(arc_tube("PHYouRing", stage(GLOW, 2), (-0.12, -0.06, -0.2), 0.11, 0.012, 0, 2 * math.pi, segs=24, ring=5))
    out += map_pin("PHPin", stage(RED, 3), (0.15, -0.25, 0.1), 0.55, eye_part=stage(WHITE, 3))
    return out


def glossary():
    """The glossary: lettered blocks, A to Z, stacked like a dictionary's tabs."""
    out = []
    for k, ch in enumerate("ABC"):
        out.append(box(f"GLBlock{k}", stage(WHITE if k != 1 else RED, k), (-0.45 + k * 0.45, 0, 0.2 + (k % 2) * 0.05), (0.4, 0.4, 0.4), bevel=0.04, segs=2))
    # the letters, as raised bars on each face (A: a peak, B: two bumps, C: an arc)
    out.append(slab("GLA", stage(GRAPHITE, 3), [(-0.58, 0.05), (-0.45, 0.38), (-0.32, 0.05), (-0.37, 0.05), (-0.45, 0.25), (-0.53, 0.05)], 0.03, y=-0.21, bevel=0))
    out.append(box("GLABar", stage(GRAPHITE, 3), (-0.45, -0.21, 0.15), (0.17, 0.03, 0.04), bevel=0))   # A's crossbar
    out.append(box("GLBSpine", stage(WHITE, 3), (-0.06, -0.21, 0.28), (0.05, 0.03, 0.37), bevel=0))   # B's upright
    out.append(arc_tube("GLB1", stage(WHITE, 3), (-0.04, -0.21, 0.36), 0.08, 0.025, -math.pi / 2, math.pi / 2, segs=12, ring=5))
    out.append(arc_tube("GLB2", stage(WHITE, 3), (-0.04, -0.21, 0.2), 0.08, 0.025, -math.pi / 2, math.pi / 2, segs=12, ring=5))
    out.append(arc_tube("GLC", stage(GRAPHITE, 3), (0.45, -0.21, 0.2), 0.12, 0.025, math.radians(45), math.radians(315), segs=16, ring=5))
    out.append(box("GLShelf", stage(GRAPHITE, 0), (0, 0, -0.03), (1.6, 0.6, 0.06), bevel=0.02))
    return out


def gridsizes():
    """Grid sizes: the same block searched at three densities, from 9 x 9 to 21 x 21."""
    out = []
    for g, (n, cx, fin) in enumerate(((3, -0.85, WHITE), (5, 0.0, RED), (7, 0.85, GLOW))):
        out.append(box(f"GSBase{g}", stage(GRAPHITE, g), (cx, 0, -0.03), (0.72, 0.72, 0.06), bevel=0.015))
        step = 0.62 / n
        for r in range(n):
            for k in range(n):
                out.append(box(f"GSDot{g}{r}{k}", stage(fin if fin != GLOW or (r + k) % 3 == 0 else RED, g + 1 if g < 2 else 3), (cx - 0.31 + step * (k + 0.5), -0.31 + step * (r + 0.5), 0.02), (step * 0.6, step * 0.6, 0.04), bevel=0))
    return out


def pinvsgrid():
    """One pin against a whole grid: the old way, one number from your desk, and the map."""
    out = [box("PGFloor", stage(GRAPHITE, 0), (0, 0, -0.03), (2.0, 1.0, 0.06), bevel=0.02)]
    out += map_pin("PGOne", stage(WHITE, 1), (-0.6, 0, 0), 0.7, eye_part=stage(GRAPHITE, 1))
    out.append(box("PGDivider", stage(GLOW, 2), (0, 0, 0.2), (0.02, 0.9, 0.4), bevel=0))
    for r in range(5):
        for k in range(5):
            d = max(abs(r - 2), abs(k - 2))
            out.append(box(f"PGCell{r}{k}", stage(HEAT[min(5, d * 2)], 3), (0.25 + k * 0.14, -0.28 + r * 0.14, 0.04 + (3 - d) * 0.03), (0.1, 0.1, 0.08 + (3 - d) * 0.06), bevel=0))
    return out


def clipboard():
    """The reporting guide: a clipboard with its checklist ticked, and the chart it ends on."""
    out = [slab("CBBoard", stage(GRAPHITE, 0), rounded_rect(1.2, 1.6, 0.08), 0.06)]
    out.append(box("CBClip", stage(RED, 1), (0, -0.04, 0.78), (0.4, 0.06, 0.12), bevel=0.02))
    out.append(slab("CBPaper", stage(WHITE, 1), rounded_rect(1.0, 1.35, 0.03, cz=-0.05), 0.02, y=-0.04))
    for k in range(3):
        z = 0.45 - k * 0.22
        out.append(slab(f"CBTick{k}", stage(GLOW, 2), [(-0.4, z), (-0.35, z - 0.06), (-0.24, z + 0.06), (-0.27, z + 0.08), (-0.35, z - 0.01), (-0.38, z + 0.02)], 0.03, y=-0.06, bevel=0))
        out.append(box(f"CBRow{k}", stage(GRAPHITE, 2), (0.08, -0.06, z), (0.55, 0.02, 0.05), bevel=0))
    for i, hgt in enumerate((0.15, 0.22, 0.3, 0.42)):
        out.append(box(f"CBBar{i}", stage(RED, 3), (-0.25 + i * 0.17, -0.07, -0.5 + hgt / 2), (0.11, 0.04, hgt), bevel=0.008))
    return out


def toolbox():
    """Free tools: an open toolbox, its tray lifted, a calculator and a magnifier inside."""
    out = [box("TBBox", stage(RED, 0), (0, 0, 0.22), (1.3, 0.6, 0.44), bevel=0.03)]
    out.append(box("TBTray", stage(GRAPHITE, 1), (0, -0.05, 0.62), (1.2, 0.5, 0.12), bevel=0.02))
    out.append(arc_tube("TBHandle", stage(WHITE, 1), (0, 0, 0.44), 0.25, 0.03, 0, math.pi, segs=16, ring=6))
    out.append(box("TBCalc", stage(WHITE, 2), (-0.3, -0.05, 0.8), (0.3, 0.08, 0.36), bevel=0.02, rot=[("Y", math.radians(-10))]))
    out.append(box("TBCalcScreen", stage(GLOW, 2), (-0.31, -0.1, 0.9), (0.22, 0.01, 0.08), bevel=0))
    out.append(arc_tube("TBLens", stage(GLOW, 3), (0.3, -0.05, 0.92), 0.13, 0.03, 0, 2 * math.pi, segs=24, ring=6))
    out.append(box("TBLensHandle", stage(GRAPHITE, 3), (0.42, -0.05, 0.72), (0.05, 0.05, 0.28), bevel=0.01, rot=[("Y", math.radians(35))]))
    return out


def magnifier():
    """The free rank check: a lens held over a grid, the business's own square lit under it."""
    out = [box("MGFloor", stage(GRAPHITE, 0), (0, 0, -0.03), (1.6, 1.6, 0.06), bevel=0.02)]
    for r in range(6):
        for k in range(6):
            d = max(abs(r - 2.5), abs(k - 2.5))
            out.append(box(f"MGCell{r}{k}", stage(HEAT[min(5, int(d * 1.6))], 1 if d > 1 else 2), (-0.6 + k * 0.24, -0.6 + r * 0.24, 0.04), (0.18, 0.18, 0.04 + (3 - d) * 0.04), bevel=0))
    # The lens is tipped 35 degrees towards the viewer (lying flat it read as a frisbee) and the
    # handle runs straight out of the rim, down to the lower right.
    tip, L = math.radians(35), Vector((0.0, 0.05, 0.95))
    rot = Matrix.Rotation(tip, 3, "X")
    for name, mk in (("MGRim", lambda: arc_tube("MGRim", stage(WHITE, 3), (0, 0, 0), 0.36, 0.05, 0, 2 * math.pi, plane="XY", segs=36, ring=8)),
                     ("MGGlass", lambda: cyl("MGGlass", stage(GLOW, 3), (0, 0, 0), 0.33, 0.012, segs=32, bevel=0))):
        ob = mk(); ob[0].location = L; ob[0].rotation_euler = (tip, 0, 0); out.append(ob)
    d = rot @ Vector((0.7071, -0.7071, 0.0))
    h = cyl("MGHandle", stage(GRAPHITE, 3), (0, 0, 0), 0.055, 0.5, segs=14)
    h[0].location = L + d * (0.36 + 0.03 + 0.25)
    h[0].rotation_mode = "QUATERNION"; h[0].rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    out.append(h)
    out.append(cyl("MGCollar", stage(RED, 3), (0, 0, 0), 0.07, 0.08, segs=14))
    out[-1][0].location = L + d * 0.42; out[-1][0].rotation_mode = "QUATERNION"; out[-1][0].rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    return out


def signpost():
    """Solutions: a signpost at the crossroads — one arm to the agencies, one to the brands."""
    out = [cyl("SPBase", stage(GRAPHITE, 0), (0, 0, 0.03), 0.6, 0.06, segs=36), cyl("SPPost", stage(WHITE, 0), (0, 0, 0.7), 0.04, 1.35, segs=14)]
    arm = lambda x0, z, sgn: [(x0, z - 0.09), (x0 + sgn * 0.7, z - 0.09), (x0 + sgn * 0.82, z), (x0 + sgn * 0.7, z + 0.09), (x0, z + 0.09)]
    out.append(slab("SPArmA", stage(RED, 1), arm(-0.05, 1.15, 1), 0.06, y=-0.05, bevel=0.01))
    out.append(slab("SPArmB", stage(WHITE, 2), arm(0.05, 0.85, -1), 0.06, y=0.05, bevel=0.01))
    for k in range(3):
        out += map_pin(f"SPPinA{k}", stage(GLOW, 3), (0.45 + k * 0.18, -0.25 + k * 0.12, 0.06), 0.28, segs=12)
    out += map_pin("SPPinB", stage(RED, 3), (-0.5, 0.2, 0.06), 0.42, eye_part=stage(WHITE, 3), segs=14)
    return out


def featureset():
    """Features: the scan grid with every feature orbiting it — a calendar, a report, a rival."""
    out = scangrid()
    out.append(arc_tube("FSOrbit", stage(WHITE, 3), (0, 0, 0.9), 1.05, 0.01, 0, 2 * math.pi, plane="XY", segs=48, ring=4))
    for k, fin in enumerate((GLOW, WHITE, RED, GLOW)):
        a = k * math.pi / 2 + 0.4
        out.append(box(f"FSSat{k}", stage(fin, 3), (math.cos(a) * 1.05, math.sin(a) * 1.05, 0.9), (0.14, 0.14, 0.14), bevel=0.02))
    return out


def calculator():
    """The scan-cost calculator: a lit screen and its keys, the equals key glowing."""
    out = [box("CCBody", stage(GRAPHITE, 0), (0, 0, 0), (1.1, 0.16, 1.5), bevel=0.05, segs=2)]
    out.append(box("CCScreen", stage(GLOW, 1), (0, -0.09, 0.5), (0.86, 0.04, 0.3), bevel=0.015))
    for r in range(4):
        for c in range(4):
            tall = c == 3 and r >= 2
            if c == 3 and r == 3:
                continue
            z = 0.15 - r * 0.24 - (0.12 if tall else 0)
            fin = RED if tall else WHITE if c < 3 else RED
            out.append(box(f"CCKey{r}{c}", stage(fin, 2 if c < 3 else 3), (-0.36 + c * 0.24, -0.1, z), (0.18, 0.06, 0.18 if not tall else 0.42), bevel=0.02))
    return out


def coins():
    """Credits: a stack of coins, and one standing with the Eagle Eye hexagon on its face."""
    out = []
    for i in range(6):
        out.append(cyl(f"CNStack{i}", stage(RED if i % 2 == 0 else WHITE, 0 if i < 3 else 1), (-0.35, 0.1, 0.06 + i * 0.12), 0.42, 0.1, segs=40, bevel=0.02))
    out.append(cyl("CNStand", stage(RED, 2), (0.45, -0.1, 0.5), 0.45, 0.1, axis="Y", segs=48, bevel=0.025))
    hexa = [(0.24 * math.cos(math.radians(30 + 60 * k)) + 0.45, 0.24 * math.sin(math.radians(30 + 60 * k)) + 0.5) for k in range(6)]
    out.append(slab("CNHex", stage(WHITE, 3), hexa, 0.04, y=-0.17, bevel=0.01))
    out.append(cyl("CNHexEye", stage(GLOW, 3), (0.45, -0.2, 0.5), 0.08, 0.03, axis="Y", segs=20, bevel=0))
    out.append(cyl("CNFloor", stage(GRAPHITE, 0), (0, 0, -0.03), 1.0, 0.06, segs=48))
    return out


def bubble():
    """Asked before you sign up: a speech bubble with its question mark, a reply behind it."""
    out = [slab("BBBack", stage(GRAPHITE, 0), rounded_rect(1.1, 0.7, 0.22, cx=0.45, cz=0.25), 0.16, y=0.35)]
    out.append(slab("BBBackTail", stage(GRAPHITE, 0), [(0.7, -0.08), (0.95, -0.35), (0.55, -0.08)], 0.16, y=0.35, bevel=0.006))
    for k in range(3):
        out.append(sphere(f"BBDot{k}", stage(WHITE, 1), (0.2 + k * 0.25, 0.25, 0.25), 0.06, segs=14))
    out.append(slab("BBFront", stage(RED, 2), rounded_rect(1.3, 0.95, 0.3, cx=-0.3, cz=0.75), 0.22))
    out.append(slab("BBTail", stage(RED, 2), [(-0.55, 0.33), (-0.85, 0.0), (-0.3, 0.33)], 0.22, bevel=0.008))
    out += question_mark("BBQ", stage(WHITE, 3), (-0.3, -0.13, 0.8), 1.0)
    return out


def report():
    """A branded report: your logo, the trend climbing, a second page behind."""
    out = [slab("RPBack", stage(GRAPHITE, 0), rounded_rect(1.2, 1.6, 0.06, cx=0.25, cz=0.12), 0.06, y=0.15)]
    out.append(slab("RPPage", stage(WHITE, 1), rounded_rect(1.2, 1.6, 0.06), 0.07))
    out.append(box("RPLogo", stage(GLOW, 2), (-0.38, -0.05, 0.62), (0.22, 0.04, 0.16), bevel=0.01))
    out.append(box("RPTitle", stage(GRAPHITE, 2), (0.12, -0.05, 0.62), (0.55, 0.03, 0.07), bevel=0.008))
    for i, hgt in enumerate((0.22, 0.3, 0.28, 0.42, 0.55, 0.72)):
        out.append(box(f"RPBar{i}", stage(GRAPHITE if i < 3 else RED, 3 if i >= 3 else 2), (-0.4 + i * 0.16, -0.07, -0.45 + hgt / 2), (0.11, 0.06, hgt), bevel=0.01))
    for i, w in enumerate((0.8, 0.6)):
        out.append(box(f"RPLine{i}", stage(GRAPHITE, 2), (-0.48 + w / 2, -0.05, 0.42 - i * 0.12), (w, 0.03, 0.05), bevel=0))
    return out


def api():
    """Scans from your own code: the brackets, and the server they talk to."""
    out = []
    for i in range(3):
        z = -0.35 + i * 0.3
        out.append(box(f"APRack{i}", stage(GRAPHITE, 0), (0.15, 0.35, z), (1.2, 0.5, 0.24), bevel=0.02))
        out.append(sphere(f"APLed{i}", stage(GLOW if i == 1 else WHITE, 1), (-0.35, 0.09, z), 0.035, segs=12))
        out.append(box(f"APSlot{i}", stage(WHITE, 1), (0.3, 0.09, z), (0.6, 0.02, 0.04), bevel=0))
    lt = [(-0.45, 0.85), (-0.75, 0.55), (-0.45, 0.25), (-0.35, 0.33), (-0.57, 0.55), (-0.35, 0.77)]
    out.append(slab("APLt", stage(RED, 2), lt, 0.1, y=-0.1, bevel=0.01))
    out.append(slab("APGt", stage(RED, 2), [(-x + 0.2, z) for x, z in lt][::-1], 0.1, y=-0.1, bevel=0.01))
    out.append(slab("APSlash", stage(GLOW, 3), [(-0.05, 0.22), (0.05, 0.22), (-0.05 + 0.05 + 0.05, 0.88), (-0.05 + 0.05 - 0.05, 0.88)], 0.1, y=-0.1, bevel=0.01))
    return out


def gauge():
    """The number a client remembers: a dial, the red arc of the score, the needle on it."""
    out = [arc_tube("GGTrack", stage(GRAPHITE, 0), (0, 0, 0), 0.85, 0.07, 0, math.pi, segs=40, ring=10)]
    out.append(arc_tube("GGValue", stage(GLOW, 2), (0, -0.04, 0), 0.85, 0.075, math.radians(70), math.pi, segs=32, ring=10))
    for k in range(9):
        a = math.pi * k / 8
        out.append(box(f"GGTick{k}", stage(WHITE, 1), (0.65 * math.cos(a), -0.02, 0.65 * math.sin(a)), (0.03, 0.03, 0.1), bevel=0, rot=[("Y", -(a - math.pi / 2))]))
    out.append(box("GGNeedle", stage(WHITE, 3), (0, 0, 0), (0.04, 0.05, 0.7), bevel=0.01, rot=[("Y", -(math.radians(70) - math.pi / 2))]))
    nd = out[-1][0]
    nd.location = (0.33 * math.cos(math.radians(70)), -0.06, 0.33 * math.sin(math.radians(70)))
    out.append(cyl("GGHub", stage(RED, 3), (0, -0.06, 0), 0.12, 0.12, axis="Y", segs=28))
    out.append(box("GGBase", stage(GRAPHITE, 0), (0, 0.02, -0.12), (1.95, 0.24, 0.14), bevel=0.03))
    return out


def scangrid():
    """The scan itself: a 7 x 7 grid rising as tall as the business ranks there, the pin at its heart."""
    out = [box("SGFloor", stage(GRAPHITE, 0), (0, 0, -0.04), (1.9, 1.9, 0.06), bevel=0.02)]
    for r in range(7):
        for c in range(7):
            d = max(abs(r - 3), abs(c - 3))
            if d == 0:
                continue
            jitter = ((r * 7 + c) * 37 % 11) / 11
            band = min(5, int(d * 1.2 + jitter * 1.6))
            fin = HEAT[band]
            hgt = max(0.03, 0.55 - band * 0.1 + jitter * 0.05)
            out.append(box(f"SGCell{r}{c}", stage(fin, 1 if band >= 3 else 2), ((c - 3) * 0.26, (r - 3) * 0.26, hgt / 2), (0.2, 0.2, hgt), bevel=0))
    # The centre tile is empty, so the pin stands on the floor and clears the tallest towers.
    out += map_pin("SGPin", stage(RED, 3), (0, 0, 0), 1.35, eye_part=stage(WHITE, 3))
    return out


def stairs():
    """Find the gap, prove the lift, report the win: three steps climbing, an arrow over them."""
    out = []
    for i, (hgt, fin) in enumerate(((0.35, GRAPHITE), (0.65, RED), (0.95, GLOW))):
        out.append(box(f"STStep{i}", stage(fin, i), (-0.6 + i * 0.6, 0, hgt / 2), (0.52, 0.6, hgt), bevel=0.025))
        out.append(slab(f"STNum{i}", stage(WHITE, i), [(-0.6 + i * 0.6 - 0.04, hgt - 0.28), (-0.6 + i * 0.6 + 0.04, hgt - 0.28),
                                                     (-0.6 + i * 0.6 + 0.04, hgt - 0.08), (-0.6 + i * 0.6 - 0.04, hgt - 0.08)], 0.04, y=-0.31, bevel=0))
    arrow = [(-0.85, 0.6), (0.4, 1.25), (0.35, 1.37), (0.72, 1.33), (0.55, 1.03), (0.5, 1.15), (-0.8, 0.48)]
    out.append(slab("STArrow", stage(WHITE, 3), arrow, 0.07, y=-0.2, bevel=0.01))
    return out


OBJECTS = {
    "storefront": storefront, "multiloc": multiloc, "radar": radar, "podium": podium, "calendar": calendar,
    "film": film, "twomaps": twomaps, "book": book, "scales": scales, "calculator": calculator, "coins": coins,
    "bubble": bubble, "report": report, "api": api, "gauge": gauge, "scangrid": scangrid, "stairs": stairs,
    # one per remaining page (build.mjs OBJRULES names which page gets which)
    "agency": agency, "pie": pie, "vault": vault, "maptile-google": lambda: maptile("google"), "maptile-apple": lambda: maptile("apple"),
    "localpack": localpack, "profilecard": profilecard, "phone": phone, "glossary": glossary, "gridsizes": gridsizes,
    "pinvsgrid": pinvsgrid, "clipboard": clipboard, "toolbox": toolbox, "magnifier": magnifier, "featureset": featureset, "signpost": signpost,
    "scales-stack": lambda: scales("stack"), "scales-tile": lambda: scales("tile"), "scales-shield": lambda: scales("shield"), "scales-grid": lambda: scales("grid"),
}
# Every trade's shop (its emblem on the roof), and every trade-in-metro page (the metro behind it).
CITY_TRADES = ["plumbers", "hvac", "roofers", "electricians", "med-spas"]
for _t in PROPS:
    OBJECTS[f"shop-{_t}"] = (lambda t: lambda: storefront(prop=t))(_t)
for _t in CITY_TRADES:
    for _m in LANDMARKS:
        OBJECTS[f"city-{_t}-{_m}"] = (lambda t, m: lambda: storefront(prop=t, landmark=m))(_t, _m)


# --- build and export ----------------------------------------------------------------------------

def clear():
    for o in [o for o in bpy.data.objects if o.name.startswith(PREFIX)]:
        bpy.data.objects.remove(o)
    for m in [m for m in bpy.data.meshes if m.name.startswith(PREFIX) and not m.users]:
        bpy.data.meshes.remove(m)


def export(name, parts):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    tris = []
    for piece, (ob, part) in enumerate(parts):
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        mw = ob.matrix_world
        nm = mw.to_3x3().inverted_safe().transposed()
        normals = [n.vector for n in me.corner_normals] if hasattr(me, "corner_normals") else [lp.normal for lp in me.loops]
        for tri in me.loop_triangles:
            for li in tri.loops:
                co = mw @ me.vertices[me.loops[li].vertex_index].co
                n = (nm @ normals[li]).normalized()
                tris.append((co.x, co.y, co.z, n.x, n.y, n.z, part, piece))
        ev.to_mesh_clear()
    lo = [min(t[i] for t in tris) for i in range(3)]
    hi = [max(t[i] for t in tris) for i in range(3)]
    mid = [(a + b) / 2 for a, b in zip(lo, hi)]
    s = 1.0 / max(b - a for a, b in zip(lo, hi))
    q = lambda v: max(-32767, min(32767, round(v / 0.5 * 32767)))
    n8 = lambda v: max(-127, min(127, round(v * 127)))
    buf = bytearray()
    for x, y, z, nx, ny, nz, part, piece in tris:
        # Blender is Z up with Y away from the viewer; the page is Y up with Z towards it.
        # EEQ2: EEQ1's 10 bytes, then the uint16 piece the vertex belongs to, so the page can
        # move every piece on its own (dropped in, risen, exploded in).
        buf += struct.pack("<3h3bBH", q((x - mid[0]) * s), q((z - mid[2]) * s), q(-(y - mid[1]) * s), n8(nx), n8(nz), n8(-ny), int(part), piece)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{name}.eeq"
    out.write_bytes(b"EEQ2" + struct.pack("<I", len(tris)) + bytes(buf))
    return len(tris) // 3, out


def build(names=None, keep=None):
    report_lines = []
    for name, make in OBJECTS.items():
        if names and name not in names:
            continue
        clear()
        n, path = export(name, make())
        flag = "  OVER BUDGET" if n > MAX_TRIS else ""
        report_lines.append(f"{name:11s} {n:5d} tris {path.stat().st_size:8,d} bytes{flag}")
    clear()
    if keep:
        OBJECTS[keep]()
    print("\n".join(report_lines))
    return report_lines


if __name__ == "__main__":
    build()
