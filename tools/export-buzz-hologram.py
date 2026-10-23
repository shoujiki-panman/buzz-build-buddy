"""Export the BUZZ layout from project-buzz as a light GLB for the hologram.

Source: work/project-buzz/cad/tripo/bee35_on_buzz.blend (2026-09-23).
  - buzz_tripo: Tripo3D model of the figure, scaled so the two silver screws
    are 44.2 mm apart; origin = midpoint of the screws; X = left/right,
    Y = head(+)/feet(-), Z = up from the back. Units: mm.
  - bottom_plate / duct_* / prop_* / stack / battery: the Bee35 layout placed
    on the back (blockout boxes and cylinders, not a measured frame model).

Run:  blender -b <blend> --python tools/export-buzz-hologram.py -- <out.glb>
The figure mesh is decimated; everything is exported in metres, glTF Y-up
(so the head points -Z and the screws lie on the X axis).
"""

import sys

import bpy

out_path = sys.argv[sys.argv.index("--") + 1]
DECIMATE_RATIO = 0.06

body = bpy.data.objects["buzz_tripo"]
mod = body.modifiers.new("decimate", "DECIMATE")
mod.ratio = DECIMATE_RATIO
bpy.context.view_layer.objects.active = body
bpy.ops.object.modifier_apply(modifier=mod.name)
body.name = "buzz_body"

# Keep only mesh objects; strip materials so the app decides the look.
for obj in bpy.data.objects:
    if obj.type != "MESH":
        continue
    obj.data.materials.clear()

# The blend is authored in millimetres (1 unit = 1 mm). Convert to metres.
MM_TO_M = 0.001
for obj in bpy.data.objects:
    if obj.type != "MESH":
        continue
    obj.location = obj.location * MM_TO_M
    obj.scale = obj.scale * MM_TO_M
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_materials="NONE",
    export_normals=True,
    export_texcoords=False,
    use_selection=False,
)
for obj in bpy.data.objects:
    if obj.type == "MESH":
        print(f"EXPORTED {obj.name} verts={len(obj.data.vertices)}")
