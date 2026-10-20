import { createApp, pointerLockChanged, pressButton, releaseButton, pressKey, releaseKey } from "@dylanebert/shallot";
import { setTransform, PhysicsWorldDefinition } from "@dylanebert/shallot/standard/physics";
import { AtmosphereSettings } from "../src/atmosphere";
import { SandboxPlugin, SandboxState } from "../src/sandbox";
import { Gun } from "../src/gun";
import { LocalPlayer, PlayerInput } from "../src/player";
import { hud } from "../src/hud";
import { captureFrame } from "@dylanebert/shallot/rendering";

const app = await createApp({ plugins: [SandboxPlugin], setup(w) {
    w.resource(AtmosphereSettings).touchOnly = false;
    w.resource(PhysicsWorldDefinition).workerCount = 1;
} });
const world = app.world;
const entities = world.resource(SandboxState).entities!;
const overlay = document.createElement("div");
document.body.append(overlay);
const clearHud = hud(overlay, world);
world.onDispose(clearHud);
const frame = () => world.step(1 / 60);
for (let i = 0; i < 120; i++) await frame();
world.remove(entities.player, LocalPlayer);

async function capture() {
    await world.frameFence;
    const pending = captureFrame(document.querySelector<HTMLCanvasElement>("#canvas")!);
    await world.step(0);
    const image = await pending;
    // Lossless render-target bytes, not a CSS/page screenshot.
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(image.rgba), image.width, image.height), 0, 0);
    return canvas.toDataURL("image/png").split(",")[1];
}
const driver = {
    capture,
    async hall() {
        setTransform(world, entities.player, [0, .95, -8], [0, 0, 0, 1]);
        for (let i = 0; i < 3; i++) await frame();
    },
    async toggleFog() {
        pressKey(world, "KeyG"); await frame();
        releaseKey(world, "KeyG"); await frame();
    },
    async hold() {
        world.storage(PlayerInput).pitch.set(entities.player, -.1);
        world.storage(PlayerInput).yaw.set(entities.player, .03);
        pointerLockChanged(world, true);
        await frame();
        pressButton(world, "left"); releaseButton(world, "left"); await frame();
        for (let i = 0; i < 120; i++) await frame();
        return world.resource(Gun).body !== 0;
    },
};
declare global { interface Window { sandbox: typeof driver } }
window.sandbox = driver;
