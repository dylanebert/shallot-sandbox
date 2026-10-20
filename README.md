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

The current game uses default materials and lighting; the custom look, sound, and contextual HUD are not included yet.

## Checks

```sh
bun check
bun test --path-ignore-patterns '**/*.gpu.test.ts'
bun test $(find ./src ./tests -name '*.node.ts' -print | sort)
bunx playwright test
bun run build
```

The Node tests step the game’s actual world, including its joints, player, and gravity gun. Browser checks cover the built page. Run `bunx playwright install chromium` once before browser checks. `bun run preview` serves a production build.
