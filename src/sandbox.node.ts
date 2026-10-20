import { expect, setDefaultTimeout, test } from "bun:test";
import {
    GlobalTransform,
    pointerLockChanged,
    pressButton,
    releaseButton,
    SphericalJoint,
    Time,
    type World,
} from "@dylanebert/shallot";
import {
    getMassData,
    setLinearVelocity,
    PhysicsWorldDefinition,
} from "@dylanebert/shallot/standard/physics";
import { TIMEOUT } from "@dylanebert/shallot/testing";
import { openGpuApp } from "@dylanebert/shallot/testing/gpu";
import { setupGlobals } from "@dylanebert/shallot/webgpu";
import { box, SandboxPlugin, SandboxState } from "./sandbox";
import { Gun } from "./gun";
import { LocalPlayer, PlayerInput } from "./player";
setDefaultTimeout(TIMEOUT.node);
await setupGlobals();
async function game() {
    const app = await openGpuApp({
        plugins: [SandboxPlugin],
        setup(world) {
            world.resource(PhysicsWorldDefinition).workerCount = 1;
        },
    });
    const adapter = app.world.gpuIfAvailable!.adapter;
    console.info(`sandbox adapter: ${adapter.class} (${adapter.identity})`);
    return app;
}
function position(world: World, eid: number) {
    const t = world.storage(GlobalTransform).translation;
    return [t.x.get(eid), t.y.get(eid), t.z.get(eid)];
}
function tick(world: World, count: number) {
    for (let i = 0; i < count; i++) world.tick();
}
function jointError(world: World, eid: number) {
    const j = world.storage(SphericalJoint);
    const t = world.storage(GlobalTransform);
    function anchor(body: number, local: typeof j.localAnchorA) {
        const x = local.x.get(eid),
            y = local.y.get(eid),
            z = local.z.get(eid);
        const q = t.rotation,
            a = q.x.get(body),
            b = q.y.get(body),
            c = q.z.get(body),
            d = q.w.get(body);
        const tx = 2 * (b * z - c * y),
            ty = 2 * (c * x - a * z),
            tz = 2 * (a * y - b * x);
        const p = position(world, body);
        return [
            p[0] + x + d * tx + b * tz - c * ty,
            p[1] + y + d * ty + c * tx - a * tz,
            p[2] + z + d * tz + a * ty - b * tx,
        ];
    }
    const a = anchor(j.a.get(eid), j.localAnchorA),
        b = anchor(j.b.get(eid), j.localAnchorB);
    return Math.hypot(...a.map((v, i) => v - b[i]));
}
test("the bridge carries its stack, chains hang and swing without parting, and the pyramid stands until struck", async () => {
    const app = await game();
    try {
        const w = app.world,
            e = w.resource(SandboxState).entities!;
        expect(e.pyramid).toHaveLength(55);
        expect(e.planks).toHaveLength(10);
        expect(Array.from(w.query([SphericalJoint]))).toHaveLength(55);
        for (const c of e.chains) expect(c.links).toHaveLength(18);
        const tickConnected = (count: number) => {
            let error = 0;
            for (let i = 0; i < count; i++) {
                w.tick();
                for (const id of w.query([SphericalJoint]))
                    error = Math.max(error, jointError(w, id));
            }
            expect(error).toBeLessThan(0.15);
        };
        tickConnected(360);
        expect(getMassData(w, e.pyramid[0])!.mass).toBeCloseTo(2);
        expect(getMassData(w, e.planks[4])!.mass).toBeCloseTo(8);
        expect(getMassData(w, e.chains[0].links[0])!.mass).toBeCloseTo(0.5);
        expect(getMassData(w, e.chains[1].weight)!.mass).toBeCloseTo(12);
        expect(position(w, e.planks[4])[1]).toBeLessThan(-0.3);
        for (const block of e.stack) {
            const p = position(w, block);
            expect(p[1]).toBeGreaterThan(position(w, e.planks[4])[1] + 0.2);
            expect(Math.abs(p[0])).toBeLessThan(0.5);
            expect(Math.abs(p[2] + 15)).toBeLessThan(0.5);
        }
        for (const id of w.query([SphericalJoint])) expect(jointError(w, id)).toBeLessThan(0.15);
        for (const c of e.chains) expect(position(w, c.links.at(-1)!)[1]).toBeLessThan(1.4);
        expect(position(w, e.pyramid.at(-1)!)[1]).toBeGreaterThan(3.6);
        const weight = e.chains[1].weight,
            before = position(w, weight);
        setLinearVelocity(w, weight, { x: 3, y: 0, z: 0 });
        tickConnected(30);
        expect(Math.abs(position(w, weight)[0] - before[0])).toBeGreaterThan(0.1);
        tickConnected(240);
        for (const id of w.query([SphericalJoint])) expect(jointError(w, id)).toBeLessThan(0.15);
        const projectile = box(w, [-3, 3.8, -4], [0.35, 0.2, 0.2], 2);
        w.tick();
        setLinearVelocity(w, projectile, { x: 20, y: 0, z: 0 });
        tick(w, 180);
        expect(position(w, e.pyramid.at(-1)!)[1]).toBeLessThan(3.6);
    } finally {
        app.dispose();
    }
});
test("after clearing the pyramid with the gun, the player traverses the doorway and reaches the bridge", async () => {
    const app = await game();
    try {
        const w = app.world,
            e = w.resource(SandboxState).entities!;
        w.step(Time.FIXED_DT);
        const input = w.storage(PlayerInput);
        const gun = w.resource(Gun);
        // The pyramid blocks the doorway: use the game's gun to clear a passage first.
        for (let attempt = 0; attempt < 70; attempt++) {
            const block = e.pyramid.find(
                (id) => position(w, id)[2] < -3.3 && Math.abs(position(w, id)[0]) < 1.1,
            );
            if (!block) break;
            const p = position(w, block),
                eye = position(w, e.player);
            const dx = p[0] - eye[0],
                dy = p[1] - eye[1] - 0.7,
                dz = p[2] - eye[2];
            input.yaw.set(e.player, Math.atan2(-dx, -dz));
            input.pitch.set(e.player, Math.atan2(dy, Math.hypot(dx, dz)));
            tick(w, 2);
            gun.left++;
            w.tick();
            if (!gun.body) continue;
            tick(w, 60);
            input.yaw.set(e.player, Math.PI);
            input.pitch.set(e.player, 0.3);
            tick(w, 2);
            gun.left++;
            w.tick();
            tick(w, 30);
        }
        input.yaw.set(e.player, 0);
        input.pitch.set(e.player, 0);
        input.move.set(e.player, 0, 1);
        tick(w, 210);
        input.jumpPresses.set(e.player, 1);
        tick(w, 90);
        expect(position(w, e.player)[2]).toBeLessThan(-11);
        expect(position(w, e.player)[1]).toBeGreaterThan(-1);
    } finally {
        app.dispose();
    }
});
test("the crosshair grabs, reels to two metres, launches along aim, and drops", async () => {
    const app = await game();
    try {
        const w = app.world,
            e = w.resource(SandboxState).entities!;
        w.step(Time.FIXED_DT);
        w.remove(e.player, LocalPlayer);
        pointerLockChanged(w, true);
        w.storage(PlayerInput).pitch.set(e.player, -0.1);
        w.storage(PlayerInput).yaw.set(e.player, 0.03);
        tick(w, 120);
        const gun = w.resource(Gun);
        const click = (button: "left" | "right") => {
            pressButton(w, button);
            releaseButton(w, button);
            w.step(0);
        };
        click("left");
        expect(gun.body).toBe(0);
        w.tick();
        expect(gun.body).not.toBe(0);
        const block = gun.body;
        tick(w, 120);
        expect(gun.distance).toBeCloseTo(2);
        const p = position(w, block);
        expect(
            Math.hypot(p[0] - gun.origin.x, p[1] - gun.origin.y, p[2] - gun.origin.z),
        ).toBeLessThan(3);
        click("left");
        w.tick();
        expect(gun.body).toBe(0);
        expect(w.storage(GlobalTransform).linearVelocity.z.get(block)).toBeLessThan(-19);
        tick(w, 30);
        click("left");
        w.tick();
        expect(gun.body).not.toBe(0);
        tick(w, 120);
        const dropped = gun.body,
            height = position(w, dropped)[1];
        click("right");
        w.tick();
        expect(gun.body).toBe(0);
        expect(gun.joint).toBe(0);
        expect(gun.target).toBe(0);
        tick(w, 60);
        expect(position(w, dropped)[1]).toBeLessThan(height - 0.1);
    } finally {
        app.dispose();
    }
});
