import { Devices, InputPlugin, type Plugin, type Resource, type System, type World } from "@dylanebert/shallot";
import { Fog, FogPlugin } from "@dylanebert/shallot/extras";
export const AtmosphereSettings: Resource<{ touchOnly: boolean }> = { create: () => ({ touchOnly: false }) };
function addFog(world: World) {
    world.add(world.create(), Fog, {
        density: 0.012, color: 0x2a2016, absorption: 0.1, scattering: 1,
        scatteringAsymmetry: 0.5, heightFalloff: 0.05, lightIntensity: 0.2,
        viewDistance: 50, maxDistance: 100,
    });
}
export const FogToggleSystem: System = {
    name: "sandbox-fog-toggle",
    group: "setup",
    update(world) {
        if (!world.resource(Devices).keys.pressed.has("KeyG")) return;
        const existing = [...world.query([Fog])];
        if (existing.length) for (const eid of existing) world.destroy(eid);
        else addFog(world);
    },
};
export const AtmospherePlugin: Plugin = {
    name: "SandboxAtmosphere", dependencies: [InputPlugin, FogPlugin], systems: [FogToggleSystem],
    initialize(world) { if (!world.resource(AtmosphereSettings).touchOnly) addFog(world); },
};
