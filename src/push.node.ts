import { afterAll, expect, setDefaultTimeout, test } from "bun:test";
import { Character, CharacterPlugin, GlobalTransform, Time, type System } from "@dylanebert/shallot";
import { PhysicsWorldDefinition, setTransform, StepPhysicsSystem } from "@dylanebert/shallot/standard/physics";
import { TIMEOUT } from "@dylanebert/shallot/testing";
import { openGpuApp } from "@dylanebert/shallot/testing/gpu";
import { setupGlobals } from "@dylanebert/shallot/webgpu";
import { DrivePlayerSystem, PlayerInput } from "./player";
import { box, SandboxPlugin, SandboxState } from "./sandbox";
setDefaultTimeout(TIMEOUT.node);
await setupGlobals();
const reports: unknown[] = [];
afterAll(async () => {
    const path = process.env.SHALLOT_PUSH_REPORT;
    if (path) await Bun.write(path, JSON.stringify(reports, null, 2));
});
for (const scenario of ["free", "loose", "pyramid", "bridge"] as const) test(`one second of ${scenario} walking retains intent and forward travel`, async () => {
    let player = 0, active = false, commanded = 0, resolved = 0;
    const command: System = { name: "measure-command", group: "fixed", after: [DrivePlayerSystem], before: CharacterPlugin.systems, update(w) {
        if (active) commanded = -w.storage(Character).velocity.z.get(player);
    } };
    const resolve: System = { name: "measure-resolution", group: "fixed", after: CharacterPlugin.systems, before: [StepPhysicsSystem], update(w) {
        if (active) resolved = -w.storage(Character).velocity.z.get(player);
    } };
    const app = await openGpuApp({ plugins: [SandboxPlugin, { name: "PushDiagnostic", systems: [command, resolve] }], setup(w) {
        w.resource(PhysicsWorldDefinition).workerCount = 1;
    } });
    try {
        const w = app.world, e = w.resource(SandboxState).entities!;
        player = e.player;
        const target = scenario === "loose" ? box(w, [0,.2,1], [.35,.2,.2], 2)
            : scenario === "pyramid" ? e.pyramid[4] : scenario === "bridge" ? e.stack[0] : 0;
        for (let i = 0; i < 360; i++) w.tick();
        const t = w.storage(GlobalTransform);
        const start = target ? [t.translation.x.get(target), t.translation.y.get(target) + .75, t.translation.z.get(target) + .61] : [3.5,.95,1.61];
        setTransform(w, player, start as [number,number,number], [0,0,0,1]);
        for (let i = 0; i < 60; i++) w.tick();
        const initialTarget = target ? [t.translation.x.get(target),t.translation.y.get(target),t.translation.z.get(target)] : null;
        const initialPlayer = [t.translation.x.get(player),t.translation.y.get(player),t.translation.z.get(player)];
        w.storage(PlayerInput).move.set(player, 0, 1);
        w.storage(PlayerInput).yaw.set(player, 0);
        active = true;
        const rows = [];
        let previousPlayerZ = initialPlayer[2], previousBlockZ = initialTarget?.[2] ?? 0;
        for (let tick = 1; tick <= 60; tick++) {
            w.tick();
            const playerZ = t.translation.z.get(player), blockZ = target ? t.translation.z.get(target) : null;
            rows.push({ tick, commanded, resolved, block: target ? -t.linearVelocity.z.get(target) : null,
                playerZ, blockZ, playerTravelSpeed: (previousPlayerZ - playerZ) / Time.FIXED_DT,
                blockTravelSpeed: blockZ === null ? null : (previousBlockZ - blockZ) / Time.FIXED_DT,
                grounded: w.storage(Character).groundState.get(player), carryZ: -w.storage(Character).groundVelocity.z.get(player) });
            previousPlayerZ = playerZ;
            previousBlockZ = blockZ ?? 0;
        }
        reports.push({ scenario, dt: Time.FIXED_DT, axis: "forward = world -Z; speeds in m/s", initialPlayer, initialTarget, rows });
        // In free space these are the template's normal walk speed and first-second travel.
        // On contact, keep that intent even if the mover resolves a smaller velocity.
        expect(Math.min(...rows.slice(30).map(r => r.commanded))).toBeGreaterThan(4.2);
        const playerTravel = initialPlayer[2] - rows.at(-1)!.playerZ;
        if (initialTarget) {
            const blockTravel = initialTarget[2] - rows.at(-1)!.blockZ!;
            const minimum = scenario === "loose" ? 3.6 : scenario === "pyramid" ? .18 : 1.2;
            expect(blockTravel).toBeGreaterThan(minimum);
            expect(playerTravel).toBeGreaterThan(minimum);
        } else {
            expect(playerTravel).toBeGreaterThan(4.15);
            expect(playerTravel).toBeLessThan(4.25);
        }
    } finally { app.dispose(); }
});
