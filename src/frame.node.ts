import { expect, setDefaultTimeout, test } from "bun:test";
import { PointLight, Transform, pressKey, releaseKey } from "@dylanebert/shallot";
import { attachTexture, captureTexture } from "@dylanebert/shallot/rendering";
import { PhysicsWorldDefinition } from "@dylanebert/shallot/standard/physics";
import { TIMEOUT } from "@dylanebert/shallot/testing";
import { openGpuApp } from "@dylanebert/shallot/testing/gpu";
import { setupGlobals } from "@dylanebert/shallot/webgpu";
import { Player } from "./player";
import { SandboxPlugin, SandboxState } from "./sandbox";
setDefaultTimeout(TIMEOUT.node);
await setupGlobals();

test("the hall's lamps light surfaces, cast shadows, and brighten air around the lamp only with fog", async () => {
    const app = await openGpuApp({ plugins: [SandboxPlugin], setup(w) {
        w.resource(PhysicsWorldDefinition).workerCount = 1;
    } });
    const w = app.world;
    console.info("frame adapter:", w.gpuIfAvailable!.adapter);
    try {
        const e = w.resource(SandboxState).entities!;
        w.remove(e.player, Player);
        w.storage(Transform).translation.set(e.eye, 0, 1.6, -8);
        attachTexture(w, e.eye, { width: 640, height: 360 });
        const read = async () => {
            for (let i = 0; i < 8; i++) w.step(0);
            return (await captureTexture(w, e.eye)).rgba;
        };
        const mean = (pixels: Uint8ClampedArray, x0: number, y0: number, x1: number, y1: number) => {
            let sum = 0;
            for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
                const i = (y * 640 + x) * 4;
                sum += pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722;
            }
            return sum / ((x1 - x0) * (y1 - y0));
        };
        const fogOn = await read();
        pressKey(w, "KeyG"); w.step(0);
        releaseKey(w, "KeyG"); w.step(0);
        const fogOff = await read();
        const haloOn = mean(fogOn, 280, 95, 360, 130);
        const haloOff = mean(fogOff, 280, 95, 360, 130);
        console.info({ haloOn, haloOff });
        // At least 15 display-code levels: a visible halo, not merely nonzero fog math.
        expect(haloOn).toBeGreaterThan(haloOff + 15);
        const lights = [...w.query([PointLight])];
        for (const light of lights) w.storage(PointLight).shadowMapsEnabled.set(light, 0);
        const unshadowed = await read();
        // Same geometry, pose and lighting: removing shadow maps must brighten cast-shadow pixels.
        let shadowPixels = 0;
        for (let i = 0; i < fogOff.length; i += 4)
            if (unshadowed[i] > fogOff[i] + 25) shadowPixels++;
        expect(shadowPixels).toBeGreaterThan(100);
        for (const light of lights) w.storage(PointLight).intensity.set(light, 0);
        const ambientOnly = await read();
        const litFloor = mean(unshadowed, 240, 305, 400, 350);
        const ambientFloor = mean(ambientOnly, 240, 305, 400, 350);
        console.info({ shadowPixels, litFloor, ambientFloor });
        expect(litFloor).toBeGreaterThan(ambientFloor + 25);
    } finally { app.dispose(); }
});
