import { AudioPlugin, play, registerClip, type Plugin, type Resource, type System, type World } from "@dylanebert/shallot";
import { PhysicsEvents, StandardPhysicsPlugin } from "@dylanebert/shallot/standard/physics";
import { StandardAudioPlugin } from "@dylanebert/shallot/standard/audio";

// Offline PCM construction, following examples/sound/chime.ts. No realtime synth graph.
export function modal(modes: readonly (readonly [number, number, number])[], attack: number, gain: number) {
    const rate = 48000;
    const pcm = new Float32Array(rate);
    const sum = modes.reduce((s, m) => s + m[1], 0);
    for (let i = 0; i < pcm.length; i++) {
        const t = i / rate;
        let value = 0;
        for (const [frequency, amplitude, decay] of modes)
            value += amplitude * Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t / decay);
        pcm[i] = value / sum * gain * Math.min(1, t / attack) * (1 - i / pcm.length) ** 2;
    }
    return pcm;
}
export const GameClips: Resource<{ impact: number; grab: number; launch: number }> = {
    create: () => ({ impact: 0, grab: 0, launch: 0 }),
};
export const IMPACT_SPEED = 1.5;
export const ImpactSystem: System = {
    name: "sandbox-impact-sounds",
    group: "fixed",
    after: StandardPhysicsPlugin.systems?.filter(s => s.group === "fixed"),
    update(world) {
        const hits = world.resource(PhysicsEvents).contactHit;
        for (let i = 0; i < hits.count; i++) {
            const hit = hits.records[i];
            if (hit.approachSpeed <= IMPACT_SPEED) continue;
            play(world, world.resource(GameClips).impact, {
                position: [hit.point.x, hit.point.y, hit.point.z],
                volume: Math.min(0.8, hit.approachSpeed / 12),
            });
        }
    },
};
export function gunSound(world: World, kind: "grab" | "launch", position: readonly [number, number, number]) {
    play(world, world.resource(GameClips)[kind], { position: [...position] });
}
export const GameAudioPlugin: Plugin = {
    name: "SandboxAudio",
    dependencies: [AudioPlugin, StandardAudioPlugin, StandardPhysicsPlugin],
    systems: [ImpactSystem],
    initialize(world) {
        const clips = world.resource(GameClips);
        clips.impact = registerClip(world, modal([[330, 1, .1], [540, .6, .05], [905, .35, .028], [1450, .18, .016], [2280, .08, .009]], .001, .5), 48000);
        clips.grab = registerClip(world, modal([[175, 1, .22], [275, .55, .14], [470, .25, .08]], .015, .6), 48000);
        clips.launch = registerClip(world, modal([[130, 1, .09], [210, .5, .055], [380, .25, .03], [1600, .35, .02]], .0015, .85), 48000);
    },
};
