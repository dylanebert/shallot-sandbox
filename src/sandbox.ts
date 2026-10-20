import {
    Body,
    BodyType,
    Camera,
    Character,
    CharacterPlugin,
    GlobalAmbientLight,
    Materials,
    Meshes,
    MeshInstance,
    MeshMaterial,
    MeshPlugin,
    NotShadowCaster,
    PointLight,
    sphere,
    type Plugin,
    type Resource,
    Shape,
    ShapeKind,
    SphericalJoint,
    StandardMaterial,
    StandardPhysicsPlugin,
    StandardRenderer,
    Transform,
    type World,
} from "@dylanebert/shallot";
import { LocalPlayer, Player, PlayerPlugin } from "./player";
import { GunPlugin } from "./gun";

type V3 = readonly [number, number, number];
type Q = readonly [number, number, number, number];
export function box(world: World, at: V3, half: V3, mass = 0, rotation: Q = [0, 0, 0, 1]): number {
    const eid = world.create();
    const size = half.map((v) => 2 * v) as [number, number, number];
    world.add(eid, Transform, { translation: at, scale: size, rotation });
    world.add(eid, Body, { type: mass ? BodyType.Dynamic : BodyType.Static });
    world.add(eid, Shape, { density: mass ? mass / (size[0] * size[1] * size[2]) : 1000 });
    world.add(eid, MeshInstance);
    world.add(eid, MeshMaterial, world.resource(Materials).add(StandardMaterial()));
    return eid;
}
export function pin(
    world: World,
    a: number,
    b: number,
    localAnchorA: V3,
    localAnchorB: V3,
): number {
    const eid = world.create();
    world.add(eid, SphericalJoint, { a, b, localAnchorA, localAnchorB, constraintHertz: 1000 });
    return eid;
}
export function chain(world: World, x: number, weighted: boolean) {
    const mount = world.create();
    world.add(mount, Transform, { translation: [x, 4.9, -15] });
    world.add(mount, Body);
    const links: number[] = [];
    let previous = mount;
    for (let i = 0; i < 18; i++) {
        const link = box(world, [x, 4.9 - 0.21 * (i + 0.5), -15], [0.05, 0.085, 0.05], 0.5);
        pin(world, previous, link, [0, i ? -0.105 : 0, 0], [0, 0.105, 0]);
        links.push(link);
        previous = link;
    }
    let weight = 0;
    if (weighted) {
        weight = world.create();
        world.add(weight, Transform, {
            translation: [x, 4.9 - 18 * 0.21 - 0.4, -15],
            scale: [0.8, 0.8, 0.8],
        });
        world.add(weight, Body, { type: BodyType.Dynamic });
        world.add(weight, Shape, {
            kind: ShapeKind.Sphere,
            radius: 0.5,
            density: 12 / ((4 / 3) * Math.PI * 0.4 ** 3),
        });
        world.add(weight, MeshInstance, {
            mesh: world.resource(Meshes).add({ name: "weight", ...sphere() }),
        });
        world.add(weight, MeshMaterial, world.resource(Materials).add(StandardMaterial()));
        pin(world, previous, weight, [0, -0.105, 0], [0, 0.4, 0]);
    }
    return { mount, links, weight };
}
export function bridge(world: World): number[] {
    const samples = 2000;
    const lengths = [0];
    const at = (t: number) => [8 * t, -2 * t * (1 - t)] as const;
    for (let i = 1; i <= samples; i++) {
        const a = at((i - 1) / samples),
            b = at(i / samples);
        lengths.push(lengths[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    const arc = lengths[samples],
        pitch = arc / 10;
    const pins: [number, number][] = [];
    for (let k = 0, i = 0; k <= 10; k++) {
        const distance = (arc * k) / 10;
        while (i < samples - 1 && lengths[i + 1] < distance) i++;
        const f = (distance - lengths[i]) / (lengths[i + 1] - lengths[i]);
        const a = at(i / samples),
            b = at((i + 1) / samples);
        pins.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    }
    const planks: number[] = [];
    for (let i = 0; i < 10; i++) {
        const a = pins[i],
            b = pins[i + 1];
        const angle = -Math.atan2(b[1] - a[1], b[0] - a[0]);
        planks.push(
            box(
                world,
                [0, -0.1 + (a[1] + b[1]) / 2, -19 + (a[0] + b[0]) / 2],
                [0.75, 0.1, pitch / 2 - 0.075],
                i === 0 || i === 9 ? 0 : 8,
                [Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)],
            ),
        );
    }
    for (let i = 0; i < 9; i++)
        for (const x of [-0.6, 0.6])
            pin(world, planks[i], planks[i + 1], [x, 0, pitch / 2], [x, 0, -pitch / 2]);
    return planks;
}
function lamp(world: World, z: number): number {
    const eid = world.create();
    world.add(eid, Transform, { translation: [0, 4.9, z], scale: [0.3, 0.3, 0.3] });
    world.add(eid, MeshInstance, {
        mesh: world.resource(Meshes).add({ name: "lamp", ...sphere() }),
    });
    world.add(
        eid,
        MeshMaterial,
        world.resource(Materials).add(StandardMaterial({ emissive: [1, 0.85, 0.62] })),
    );
    world.add(eid, NotShadowCaster);
    world.add(eid, PointLight, {
        color: 0xffd9a8,
        intensity: 980,
        range: 24,
        radius: 4,
        shadowMapsEnabled: 1,
    });
    return eid;
}
export function sandbox(world: World) {
    const architecture = [
        [
            [0, -0.1, 0],
            [4.5, 0.1, 4.5],
        ],
        [
            [0, 5, 0],
            [4.5, 0.1, 4.5],
        ],
        [
            [0, 2.5, 4.5],
            [4.5, 2.5, 0.25],
        ],
        [
            [-4.5, 2.5, 0],
            [0.25, 2.5, 4.5],
        ],
        [
            [4.5, 2.5, 0],
            [0.25, 2.5, 4.5],
        ],
        [
            [-2.7, 2.5, -4.5],
            [1.8, 2.5, 0.25],
        ],
        [
            [2.7, 2.5, -4.5],
            [1.8, 2.5, 0.25],
        ],
        [
            [0, 3.95, -4.5],
            [0.9, 1.05, 0.25],
        ],
        [
            [-4.5, 1, -14.5],
            [0.25, 4, 10],
        ],
        [
            [4.5, 1, -14.5],
            [0.25, 4, 10],
        ],
        [
            [0, 1, -24.5],
            [4.5, 4, 0.25],
        ],
        [
            [0, 5, -14.5],
            [4.5, 0.1, 10],
        ],
        [
            [0, -1.5, -7.75],
            [4.5, 1.5, 3.25],
        ],
        [
            [0, -1.5, -21.75],
            [4.5, 1.5, 2.75],
        ],
        [
            [0, -3.1, -15],
            [4.5, 0.1, 4],
        ],
        [
            [2.5, -2.25, -11.5],
            [1.5, 0.75, 0.5],
        ],
    ] as const satisfies readonly (readonly [V3, V3])[];
    for (const [at, half] of architecture) box(world, at, half);
    const pyramid: number[] = [];
    for (let row = 0; row < 10; row++)
        for (let i = 0; i < 10 - row; i++)
            pyramid.push(
                box(world, [(i - (9 - row) / 2) * 0.71, 0.2 + row * 0.41, -4], [0.35, 0.2, 0.2], 2),
            );
    const chains = [chain(world, -2.5, false), chain(world, 2.5, true)];
    const planks = bridge(world);
    const stack = Array.from({ length: 5 }, (_, i) =>
        box(world, [0, 0.22 + i * 0.42, -15], [0.35, 0.2, 0.2], 2),
    );
    world.resource(GlobalAmbientLight).brightness = 380;
    for (const z of [0, -14.5]) lamp(world, z);
    const eye = world.create();
    world.add(eye, Camera, { fov: 75, near: 0.05, far: 100 });
    world.add(eye, StandardRenderer);
    world.add(eye, Transform, { translation: [0, 1.6, 3] });
    const player = world.create();
    world.add(player, Transform, { translation: [0, 0.95, 3] });
    world.add(player, Body, { type: BodyType.Kinematic });
    world.add(player, Shape, {
        kind: ShapeKind.Capsule,
        capsuleCenter1: [0, -0.5, 0],
        capsuleCenter2: [0, 0.5, 0],
        radius: 0.4,
        filterCategoryLow: 2,
    });
    world.add(player, Character);
    world.add(player, Player, { camera: eye, gravity: 50, jumpSpeed: 15.8 });
    world.add(player, LocalPlayer);
    return { player, eye, pyramid, chains, planks, stack };
}
export const SandboxState: Resource<{ entities: ReturnType<typeof sandbox> | null }> = {
    create: () => ({ entities: null }),
};
export const SandboxPlugin: Plugin = {
    name: "Sandbox",
    dependencies: [PlayerPlugin, CharacterPlugin, StandardPhysicsPlugin, MeshPlugin, GunPlugin],
    initialize(world) {
        world.resource(SandboxState).entities = sandbox(world);
    },
};
