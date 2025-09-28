import argparse
import os
import math
import numpy as np
import trimesh
import pyrender
from PIL import Image

# --------------------------
# Configurable presets
# --------------------------
MATERIAL_PRESETS = {
    "matte-black": dict(baseColorFactor=[0.06, 0.06, 0.06, 1.0], metallicFactor=0.1, roughnessFactor=0.8),
    "anodized-silver": dict(baseColorFactor=[0.78, 0.78, 0.80, 1.0], metallicFactor=0.9, roughnessFactor=0.35),
    "gloss-white": dict(baseColorFactor=[0.96, 0.96, 0.96, 1.0], metallicFactor=0.0, roughnessFactor=0.15),
}

# Hero views: (azimuth°, elevation°, distance multiplier, name)
DEFAULT_VIEWS = [
    ( 45,  20, 1.35, "hero_3q"),
    ( 20,  35, 1.30, "hero_alt"),
    ( 90,   5, 1.30, "profile"),
    (  0,  85, 1.40, "top"),
    (135,  25, 1.35, "dramatic"),
    ( 45,  10, 0.90, "macro_close")  # closer, slight zoom for detail
]

def normalize_mesh(mesh: trimesh.Trimesh, target_size=1.0):
    # Center and scale to a nice bounding size
    mesh = mesh.copy()
    if not mesh.is_watertight:
        mesh.remove_unreferenced_vertices()
    # Center at origin
    mesh.vertices -= mesh.bounding_box.centroid
    # Uniform scale
    extents = mesh.extents
    max_extent = np.max(extents)
    if max_extent == 0:
        max_extent = 1.0
    scale = target_size / max_extent
    mesh.apply_scale(scale)
    return mesh

def make_material(preset_name: str):
    p = MATERIAL_PRESETS[preset_name]
    return pyrender.MetallicRoughnessMaterial(
        baseColorFactor=p["baseColorFactor"],
        metallicFactor=p["metallicFactor"],
        roughnessFactor=p["roughnessFactor"]
    )

def look_at(eye, target=np.array([0,0,0.0]), up=np.array([0,0,1.0])):
    f = (target - eye)
    f = f/np.linalg.norm(f)
    u = up/np.linalg.norm(up)
    s = np.cross(f, u); s = s/np.linalg.norm(s)
    u = np.cross(s, f)
    m = np.eye(4)
    m[0,:3] = s
    m[1,:3] = u
    m[2,:3] = -f
    m[:3, 3] = eye
    return m

def spherical_to_cartesian(az_deg, el_deg, radius):
    az = math.radians(az_deg)
    el = math.radians(el_deg)
    x = radius * math.cos(el) * math.cos(az)
    y = radius * math.cos(el) * math.sin(az)
    z = radius * math.sin(el)
    return np.array([x, y, z])

def add_studio_lights(scene, center, radius):
    # Key light (strong, directional)
    key_dir = spherical_to_cartesian(35, 35, radius*2.5) + center
    key_pose = look_at(key_dir, center)
    scene.add(pyrender.DirectionalLight(color=np.ones(3), intensity=3.5), pose=key_pose)

    # Fill light (softer, opposite)
    fill_dir = spherical_to_cartesian(200, 10, radius*3.0) + center
    fill_pose = look_at(fill_dir, center)
    scene.add(pyrender.DirectionalLight(color=np.ones(3), intensity=1.3), pose=fill_pose)

    # Rim light (back edge definition)
    rim_dir = spherical_to_cartesian(-135, 20, radius*2.7) + center
    rim_pose = look_at(rim_dir, center)
    scene.add(pyrender.DirectionalLight(color=np.ones(3), intensity=2.2), pose=rim_pose)

    # Overhead soft light
    over_dir = center + np.array([0, 0, radius*3.0])
    over_pose = look_at(over_dir, center)
    scene.add(pyrender.DirectionalLight(color=np.ones(3), intensity=0.9), pose=over_pose)

def render_once(mesh_tri, mat, az, el, dist_mult, out_png, width, height, bg="transparent", gradient=False):
    # Estimate radius from bounds to place camera and lights
    bounds = mesh_tri.bounds
    center = (bounds[0] + bounds[1]) / 2.0
    diag = np.linalg.norm(bounds[1] - bounds[0])
    radius = max(1e-3, diag * 0.75)

    # Scene
    scene = pyrender.Scene(bg_color=[0, 0, 0, 0] if bg == "transparent" else [1, 1, 1, 1], ambient_light=(0.05, 0.05, 0.05))
    pr_mesh = pyrender.Mesh.from_trimesh(mesh_tri, material=mat, smooth=True)
    scene.add(pr_mesh)

    # Camera
    # Camera distance scales with model size
    cam_dist = radius * (2.2 * dist_mult)
    cam_pos = spherical_to_cartesian(az, el, cam_dist) + center
    cam_pose = look_at(cam_pos, center)
    camera = pyrender.PerspectiveCamera(yfov=np.pi/5.0)  # tighter FOV for product feel
    scene.add(camera, pose=cam_pose)

    # Lights
    add_studio_lights(scene, center, radius)

    # Render
    r = pyrender.OffscreenRenderer(viewport_width=width, viewport_height=height)
    color, _ = r.render(scene, flags=pyrender.RenderFlags.RGBA)
    r.delete()

    img = Image.fromarray(color)
    if gradient:
        img = composite_on_gradient(img)

    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    img.save(out_png)

def composite_on_gradient(fg_rgba, top=(255,255,255), bottom=(230,236,242)):
    """Simple Apple-like very subtle vertical gradient behind transparent foreground."""
    w, h = fg_rgba.size
    bg = Image.new("RGB", (w, h), color=0)
    # vertical gradient
    top = np.array(top, dtype=np.float32)
    bottom = np.array(bottom, dtype=np.float32)
    grad = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(h):
        t = y / max(1, h-1)
        c = (1.0 - t) * top + t * bottom
        grad[y, :, :] = c.clip(0, 255)
    bg = Image.fromarray(grad, mode="RGB")

    # composite: put fg over bg using alpha
    bg_rgba = bg.convert("RGBA")
    composed = Image.alpha_composite(bg_rgba, fg_rgba)
    return composed

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stl", required=True, help="Path to STL file")
    ap.add_argument("--out", default="./renders", help="Output folder for PNGs")
    ap.add_argument("--preset", default="matte-black", choices=list(MATERIAL_PRESETS.keys()))
    ap.add_argument("--size", type=int, default=2000, help="Output square size in px (e.g., 2000)")
    ap.add_argument("--views", type=str, default="", help="Custom views list 'az,el,dist,name;...' (overrides defaults)")
    args = ap.parse_args()

    # Load STL
    mesh = trimesh.load(args.stl, force='mesh')
    if isinstance(mesh, trimesh.Scene):
        # if it's a Scene, merge
        mesh = trimesh.util.concatenate(tuple(g for g in mesh.geometry.values()))

    # Normalize
    mesh = normalize_mesh(mesh, target_size=1.0)

    # Material
    material = make_material(args.preset)

    # Views
    if args.views.strip():
        views = []
        for spec in args.views.split(";"):
            if not spec.strip():
                continue
            az, el, dist, name = spec.split(",")
            views.append((float(az), float(el), float(dist), name.strip()))
    else:
        views = DEFAULT_VIEWS

    # Render both transparent and gradient background variants
    os.makedirs(args.out, exist_ok=True)
    for (az, el, dist_mult, name) in views:
        base = os.path.join(args.out, f"{name}_{args.preset}")
        # Transparent
        render_once(mesh, material, az, el, dist_mult, base + "_transparent.png", args.size, args.size, bg="transparent", gradient=False)
        # Gradient
        render_once(mesh, material, az, el, dist_mult, base + "_gradient.png", args.size, args.size, bg="transparent", gradient=True)

    print(f"Saved renders to: {os.path.abspath(args.out)}")
    print("Tip: try --preset anodized-silver or --preset gloss-white for variety.")

if __name__ == "__main__":
    main()
