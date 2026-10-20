---
layout: product
title: Toyota 1KZ-TE engine exterior
subject: Representative April 2004 Australian RHD manual KZN165 Hilux, non-intercooled 1KZ-TE.
summary: Detailed Blender scene and three optimized GLB levels of detail, in one download.
handle: toyota-1kz-te
kind: digital
price: ""
order: 1
published: false
# Package record, not rendered. Source: engines/toyota_1kz_te/delivery/c001_r028/
review:
  candidate: c001_r028
  owner_approval: not recorded (pipeline/owner_decisions.json is empty)
  channel: justice.engineering recommended in REVIEW.md; CGTrader and Fab pending eligibility
  price: not set
  terms: customer/LICENSE_DRAFT.txt is a draft for owner review
image: /assets/shop/toyota-1kz-te/finished_hero.jpg
image_alt: Toyota 1KZ-TE model from the front quarter, showing the ten-blade fan, belts and turbo side
image_caption: Detailed Blender render
gallery:
  - src: /assets/shop/toyota-1kz-te/finished_opposite.jpg
    alt: Opposite side of the 1KZ-TE model, injection pump and filter side
    caption: Detailed Blender render, opposite side
  - src: /assets/shop/toyota-1kz-te/finished_rear.jpg
    alt: Rear of the 1KZ-TE model with rear plate and flywheel
    caption: Detailed Blender render, rear
  - src: /assets/shop/toyota-1kz-te/detail_turbo.jpg
    alt: Close view of the turbocharger and heat shields
    caption: Turbo detail
  - src: /assets/shop/toyota-1kz-te/detail_fuel.jpg
    alt: Close view of the injection pump and fuel lines
    caption: Fuel system detail
  - src: /assets/shop/toyota-1kz-te/six_clay_views.jpg
    alt: Six orthographic clay views of the 1KZ-TE model
    caption: Six neutral clay views
  - src: /assets/shop/toyota-1kz-te/wireframe_hero.jpg
    alt: Wireframe render of the 1KZ-TE model
    caption: Wireframe
editions:
  - name: Blender scene
    kind: detailed
    text: "Editable Blender 5.1.2 file with 504 named meshes (308,258 evaluated triangles), procedural materials, a single ENGINE_ROOT and a separate studio. Includes the Python generator that rebuilds the model."
  - name: GLB levels of detail
    kind: realtime
    text: "Three separately baked GLBs: LOD0 117,966, LOD1 58,966 and LOD2 18,966 triangles. Two 2048-pixel PBR atlas sets per LOD, embedded and as PNGs, plus a local Three.js viewer. No automatic LOD switching or rig."
downloads:
  - file: c001_r028.zip
    bytes: 37489884
    sha256: b76548e1820a7657c8ff15c17b386ca3d995684c25476cc9ea25dc89fa402b2c
    contains: Both editions, buyer guide, tested configuration and license.
license: "Draft terms. Use and modify for informational and editorial visualization, including monetized stills, video and interactive presentations about the engine. No resale or redistribution of the files. The final license is shown before checkout."
---
The model includes the turbo and shields, the later EGR arrangement, injection pump and four pipes, oil cooler and filter, water pump and ten-blade fan, three belts, alternator, starter, AC compressor, gear-driven steering pump and reservoir, mounts, rear plate and flywheel, and the visible engine plumbing. The Blender scene keeps every part named and editable; use it for part edits and detailed renders. The GLBs are a separate, simplified real-time version, so the two will look different under different renderers.

## Not included

Transmission, clutch, radiator, chassis, full exhaust, ECU, complete vehicle wiring and internal parts. OEM logos and readable serial labels are left off. Hose and terminal ends stop at the engine boundary.

## Know before you buy

This is a proportional visual reconstruction from photographs, manuals and parts catalogs. It is not a scan, Toyota CAD, a fitment model, a printable solid or a service reference. Exterior dimensions and hidden details are estimated; the bare rear and underside had no direct photographs. The flywheel face simplifies machining and clutch-mount detail, and some curved surfaces show facets in extreme close-ups. A few tiny bevels in the GLB textures can show dark texel edges. Performance was measured on one Apple M2 Mac in Blender 5.1.2 and a Three.js 0.180.0 viewer in Chromium; no game-engine or mobile performance is promised.

## How it was made

AI-assisted original Blender Python modeling, reviewed against engine photographs and technical diagrams. Every image here is a render of the model in this download. Reference photos and manuals are not included.

Toyota and 1KZ-TE identify the subject. This independent model is not sponsored, endorsed or approved by Toyota.
