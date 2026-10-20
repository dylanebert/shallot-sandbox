import { expect, test, setDefaultTimeout } from "bun:test";
import { Body, BodyType, Shape, Sound, pressKey, releaseKey, Transform } from "@dylanebert/shallot";
import { Fog } from "@dylanebert/shallot/extras";
import { PhysicsEvents, PhysicsWorldDefinition } from "@dylanebert/shallot/standard/physics";
import { TIMEOUT } from "@dylanebert/shallot/testing";
import { openGpuApp } from "@dylanebert/shallot/testing/gpu";
import { setupGlobals } from "@dylanebert/shallot/webgpu";
import { SandboxPlugin } from "./sandbox";
import { AtmosphereSettings } from "./atmosphere";
import { GameAudioPlugin, GameClips, IMPACT_SPEED, ImpactSystem } from "./audio";
setDefaultTimeout(TIMEOUT.node);
await setupGlobals();
async function game(touchOnly = false) {
    const app = await openGpuApp({ plugins: [SandboxPlugin], setup(w) {
        w.resource(AtmosphereSettings).touchOnly = touchOnly;
        w.resource(PhysicsWorldDefinition).workerCount = 1;
    } });
    console.info("presentation adapter:", app.world.gpuIfAvailable!.adapter);
    return app;
}
test("stepped contact hits play at their point only above the approach-speed threshold; G toggles fog", async () => {
    const app = await game();
    const w = app.world;
    try {
        // Step real physics first, then exercise the event consumer with deterministic boundary records.
        w.tick();
        for (const eid of w.query([Sound])) w.destroy(eid);
        const hits = w.resource(PhysicsEvents).contactHit;
        const pair = { shapeA: w.ref(0), shapeB: w.ref(0), bodyA: w.ref(0), bodyB: w.ref(0),
            point: { x: 1, y: 2, z: -3 }, normal: { x: 0, y: 1, z: 0 },
            userMaterialIdA: 0n, userMaterialIdB: 0n };
        hits.records[0] = { ...pair, approachSpeed: IMPACT_SPEED - 0.01 };
        hits.count = 1;
        ImpactSystem.update!(w);
        expect([...w.query([Sound])]).toHaveLength(0);
        hits.records[0].approachSpeed = IMPACT_SPEED + 1;
        ImpactSystem.update!(w);
        const sounds = [...w.query([Sound])];
        expect(sounds).toHaveLength(1);
        expect(w.storage(Sound).clip.get(sounds[0])).toBe(w.resource(GameClips).impact);
        const t = w.storage(Transform).translation;
        expect([t.x.get(sounds[0]), t.y.get(sounds[0]), t.z.get(sounds[0])]).toEqual([1, 2, -3]);
        expect([...w.query([Fog])]).toHaveLength(1);
        pressKey(w, "KeyG");
        w.step(1 / 60);
        expect([...w.query([Fog])]).toHaveLength(0);
        releaseKey(w, "KeyG"); w.step(1 / 60);
        pressKey(w, "KeyG"); w.step(1 / 60);
        expect([...w.query([Fog])]).toHaveLength(1);
    } finally { app.dispose(); }
});
for (const speed of [1.2, 3]) test(`a real ${speed} m/s contact ${speed > IMPACT_SPEED ? "plays" : "does not play"} at the hit point`, async () => {
    const app = await openGpuApp({ plugins: [GameAudioPlugin], setup(w) {
        const def = w.resource(PhysicsWorldDefinition);
        def.workerCount = 1;
        def.gravity = { x: 0, y: 0, z: 0 };
        def.hitEventThreshold = 0;
        for (const dynamic of [false, true]) {
            const eid = w.create();
            w.add(eid, Transform, { translation: [dynamic ? -2 : 0, 0, 0] });
            w.add(eid, Body, { type: dynamic ? BodyType.Dynamic : BodyType.Static, linearVelocity: [dynamic ? speed : 0, 0, 0] });
            w.add(eid, Shape, { enableHitEvents: 1 });
        }
    } });
    const w = app.world;
    console.info("impact adapter:", w.gpuIfAvailable!.adapter);
    try {
        let observed = false;
        for (let i = 0; i < 180; i++) {
            w.tick();
            const hits = w.resource(PhysicsEvents).contactHit;
            if (!hits.count) continue;
            observed = true;
            const hit = hits.records[0];
            expect(hit.approachSpeed).toBeCloseTo(speed, 1);
            const sounds = [...w.query([Sound])];
            expect(sounds.length).toBe(speed > IMPACT_SPEED ? hits.count : 0);
            if (sounds.length) {
                const p = w.storage(Transform).translation;
                expect([p.x.get(sounds[0]), p.y.get(sounds[0]), p.z.get(sounds[0])]).toEqual([hit.point.x, hit.point.y, hit.point.z]);
            }
            break;
        }
        expect(observed).toBe(true);
    } finally { app.dispose(); }
});
test("touch-only startup leaves fog off; G can enable it", async () => {
    const app = await game(true);
    try {
        expect([...app.world.query([Fog])]).toHaveLength(0);
        pressKey(app.world, "KeyG"); app.world.step(1 / 60);
        expect([...app.world.query([Fog])]).toHaveLength(1);
    } finally { app.dispose(); }
});
