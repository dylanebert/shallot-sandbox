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
- Touch controls retain movement, look, and jump; the gun uses mouse buttons.

The pyramid obstructs the doorway: clear yourself a passage with the gun. The pit has a step back out near its room-side edge.

Solid-coloured architecture, faint-grained timber and procedural stone sit under two shadow-casting lamps. The frame is point-sampled at 360 lines, warm-graded and lightly vignetted. Surface materials quantize lit OKLab lightness to ten bands. Camera debanding is disabled so it does not fight those bands. Ordered Bayer dither breaks up the bands at the render target's pixel resolution. The crosshair changes from cross to hover ring to held dot, with contextual mouse prompts.

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

The capture subject drives a built, stepped page and overlays `captureFrame`’s rendered target beneath the HUD before taking each PNG; it refuses to run without an output directory. Room, hall and held-block captures are evidence for a person, not visual goldens. Play `bun run dev` to judge motion and spatial sound.

The Node tests step the game’s actual world, including its joints, player, and gravity gun. Browser checks cover the built page. Run `bunx playwright install chromium` once before browser checks. `bun run preview` serves a production build.

## Publishing

The existing [itch.io page](https://individualkex.itch.io/shallot-sandbox) uses `web`, `windows`, `mac` and `linux` Butler channels. Build from a directory named `shallot-sandbox`: the native CLI names the executable after its directory. These build commands do not launch the game.

```sh
bun install --frozen-lockfile
bun run build
butler push dist individualkex/shallot-sandbox:web
```

Desktop uploads bundle CEF with `--portable`. For Linux:

```sh
bunx shallot build --target linux --portable --release
patchelf --set-rpath '$ORIGIN/cef' build/linux/release-portable/shallot-sandbox
butler push build/linux/release-portable individualkex/shallot-sandbox:linux
```

The 0.10.1 Linux prebuilt shell lacks a runtime library path; without the patch, direct launch fails to find its bundled `libcef.so`. For Windows and Mac, substitute `windows` or `mac` in the build and upload commands and omit `patchelf`. Build Linux on Linux and Mac on macOS; `bunx shallot build --help` lists source-build requirements when a prebuilt shell is unavailable.

The Mac upload is Apple Silicon and ad-hoc signed, not notarized; Gatekeeper can block downloaded copies. The web upload needs “This file will be played in the browser” and “SharedArrayBuffer support” enabled in itch.io’s page settings.
