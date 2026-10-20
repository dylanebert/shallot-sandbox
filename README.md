# Shallot Sandbox

A first-person gravity-gun playground built with the published Shallot engine and its standard Box3D physics. Pull apart a ten-row block pyramid, play with two hanging chains, and cross a sagging plank bridge carrying a loose stack of blocks.

```sh
bun install
bun run dev
```

Open the URL Vite prints. Click the game to capture the mouse; Escape releases it.

- WASD moves; Shift sprints; Space jumps.
- Aim at a dynamic object within 15 metres: a cool outline marks it.
- Left-click grabs it and reels it to two metres in front of you.
- Left-click again launches it along your aim; right-click drops it.
- G toggles warm volumetric haze (on initially, except on touch-only devices).
- Touch controls retain movement, look, and jump; the gun uses mouse buttons.

The pyramid obstructs the doorway: clear yourself a passage with the gun. The pit has a step back out near its room-side edge.

Procedural grit, wood and stone sit under two shadow-casting lamps. The frame is point-sampled at 360 lines, warm-graded and lightly vignetted. Surface materials quantize lit OKLab lightness to ten bands before smooth fog. Camera debanding is disabled so it does not fight those bands. Ordered Bayer dither awaits a published engine with material fragment pixel coordinates; its pending GPU claim is recorded as a TODO. The crosshair changes from cross to hover ring to held dot, with contextual mouse prompts.

Impact, grab and launch sounds are modal tones synthesized into PCM at startup and registered as clips, following Shallot’s sound example. Impacts above 1.5 m/s play at their contact point; grab plays at the hit and launch at the camera. The camera carries the spatial listener. No audio files or external recordings are used. Click the page to enable browser audio.

## Checks

```sh
bun check
bun test --path-ignore-patterns '**/*.gpu.test.ts'
bun test ./src/posterize.gpu.test.ts
bun test $(find ./src ./tests -name '*.node.ts' -print | sort)
bunx playwright test
bun run build
```

For manual look review, produce render-target PNGs with:

```sh
SHALLOT_CAPTURE_DIR=/tmp/sandbox-captures bunx playwright test -c capture.config.ts
```

The capture subject drives a built, stepped page and overlays `captureFrame`’s rendered target beneath the HUD before taking each PNG; it refuses to run without an output directory. Room, hall and held-block captures include haze-on desktop views and haze-off comparisons; they are evidence for a person, not visual goldens. Play `bun run dev` to judge motion and spatial sound.

The Node tests step the game’s actual world, including its joints, player, and gravity gun. Browser checks cover the built page. Run `bunx playwright install chromium` once before browser checks. `bun run preview` serves a production build.
