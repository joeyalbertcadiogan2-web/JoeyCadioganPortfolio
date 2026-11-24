# Joey Cadiogan · AI Automation Portfolio

A single-page, cinematic portfolio: a scroll-scrubbed hero with layered headline and storytelling
passages, one shared 3D "automation core" that travels through About → Services → Case Studies,
then a final CTA and footer.

## Preview locally

```bash
node tools/serve.mjs        # then open http://localhost:5173
```

The page uses ES modules, so open it through the server rather than by double-clicking
`index.html`.

## Deploying

The Vercel project is connected to this GitHub repo: every push to `main` deploys to
https://joey-cadiogan.vercel.app automatically, and pushes to other branches get a preview URL.

```bash
git add -A
git commit -m "Describe the change"
git push
```

## Editing the numbers

The case-study results and About stats are example figures written into `index.html`
(About `.stats` and the three `.case` cards). Edit them there, then commit and push.

## Project layout

```
index.html                  page markup and copy
assets/css/site.css         all styles (tokens on :root, mobile + reduced-motion rules at the end)
assets/js/site.js           Lenis smooth scroll, hero scrub with inertia, passages, reveals, nav
assets/js/scene.js          Three.js scene: lighting, bloom, scroll choreography, light-path pulses
assets/js/core-model.js     the procedural Automation Core model (gears, glass plates, node paths)
assets/models/automation-core.glb   the same model exported as GLB (opens in Blender)
assets/img/                 optimized WebP assets used by the page (about 560 KB total)
assets/src/                 original Higgsfield outputs (not deployed)
tools/                      asset, GLB, video and QA scripts (npm i inside tools/ first)
```

## Generated assets (Higgsfield)

| Asset | Model | File |
|---|---|---|
| Hero first frame (identity from `portrait.png`) | Nano Banana 2 | `assets/src/hero-frame.png` → `hero-start-16x9.png` |
| Foreground cutout for the layered headline | Image Background Remover | `assets/src/hero-cutout.png` |
| Automation core signature image | Nano Banana 2 | `assets/src/core.png` |
| Glass node cluster, chrome agent orb, data pipeline, app tiles | Z Image (keyed to alpha locally) | `assets/src/obj-*.png` |

The brief asked for GPT Image 2.5 and Seedance 2.5. The account is on Higgsfield's free plan,
which rejects GPT Image 2.5 ("Basic plan required"), so the images above use free-plan models.
After upgrading, you can regenerate any of them with `gpt_image_2_5` and run `node tools/process-assets.mjs`.

## Hero orbit video

The live hero is a 10 s **Kling 3.0 Pro** orbit (`assets/src/hero-kling.mp4`). It starts and ends
on `hero-start-16x9.png`, so it loops back to the opening composition. Seedance 2.5, as the brief
asked, needs Higgsfield's **Pro or Ultimate** plan. To upgrade the hero to Seedance later:

```bash
higgsfield generate create seedance_2_5 --mode omni_reference \
  --start-image assets/src/hero-start-16x9.png --end-image assets/src/hero-start-16x9.png \
  --image portrait.png --aspect_ratio 16:9 --duration 12 --resolution 1080p --generate_audio false \
  --prompt "Seamless cinematic orbit around the man in the start frame, keeping his exact face, sunglasses, braces smile, spiky black hair, black tuxedo, bow tie, pocket square and silver watch from the reference photo, completely unaltered. Dark minimal studio, soft volumetric haze, faint holographic cyan workflow nodes joined by thin light paths, no text, no UI, no logos. The camera orbits slowly: front, then his left side where it pauses for a moment while he taps the tablet, then behind him as he faces the floating nodes with natural sideways glances, then his right side where it pauses while he sweeps his free hand to rearrange nearby nodes, then back to the exact opening composition. Smooth constant motion, no cuts, deep charcoal, graphite, electric cyan and soft white only, no pink or red." \
  --wait --wait-timeout 30m

node tools/prepare-video.mjs path/to/downloaded.mp4
```

`prepare-video.mjs` re-encodes the video with every frame as a keyframe, so scrubbing backward is
instant. It writes `assets/video/hero-1080.mp4` (desktop) and `hero-720.mp4` (mobile) and fills in
the `data-src` attributes in `index.html`. The site then scrubs the video, turns off the virtual
camera, and fades the foreground cutout as soon as the orbit starts. If the side views land at
different moments, adjust each passage's `data-start` / `data-end` in `index.html` (0–1 = hero progress).

## Rebuilding

```bash
cd tools && npm i
node process-assets.mjs     # assets/src → optimized assets/img
node export-glb.mjs         # core-model.js → assets/models/automation-core.glb
node shoot.mjs 1440 900 desk          # QA screenshots (needs serve.mjs running)
node shoot.mjs 390 844 mob
node shoot.mjs 1440 900 red reduced
```
