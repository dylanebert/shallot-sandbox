import {
    Body,
    BodyType,
    Devices,
    GlobalTransform,
    InputPlugin,
    MotorJoint,
    Outline,
    OutlinePlugin,
    type Plugin,
    type Resource,
    type System,
    Transform,
    type World,
} from "@dylanebert/shallot";
import {
    castRayClosest,
    emptyQueryHit,
    getLocalPoint,
    getMassData,
    PhysicsWorldDefinition,
    setAwake,
    setLinearVelocity,
    setTargetTransform,
    StandardPhysicsPlugin,
} from "@dylanebert/shallot/standard/physics";
import { Player } from "./player";

const MAX_RANGE = 15;
const HOLD_DISTANCE = 2;
const REEL_SPEED = 20;
const LAUNCH_SPEED = 20;

export const Gun: Resource<ReturnType<typeof createGun>> = { create: createGun };
function createGun() {
    return {
        body: 0,
        target: 0,
        joint: 0,
        outlined: 0,
        distance: 0,
        left: 0,
        right: 0,
        consumedLeft: 0,
        consumedRight: 0,
        origin: { x: 0, y: 0, z: 0 },
        direction: [0, 0, -1] as [number, number, number],
        translation: { x: 0, y: 0, z: -MAX_RANGE },
        point: [0, 0, 0] as [number, number, number],
        hit: emptyQueryHit(),
    };
}
function release(world: World): void {
    const gun = world.resource(Gun);
    if (gun.joint) world.destroy(gun.joint);
    if (gun.target) world.destroy(gun.target);
    gun.body = gun.target = gun.joint = 0;
}
const sample: System = {
    name: "gun-input",
    group: "setup",
    update(world) {
        const gun = world.resource(Gun),
            devices = world.resource(Devices);
        if (!devices.enabled) return;
        for (const event of devices.pointer.buttonEvents)
            if (event.pressed) {
                if (event.button === "left") gun.left++;
                if (event.button === "right") gun.right++;
            }
    },
};
const aim: System = {
    name: "gun-aim",
    group: "fixed",
    before: StandardPhysicsPlugin.systems?.filter((system) => system.group === "fixed"),
    update(world) {
        const gun = world.resource(Gun);
        for (const player of world.query([Player])) {
            const p = world.storage(Player);
            const t = world.storage(GlobalTransform).translation;
            gun.origin.x = t.x.get(player);
            gun.origin.y = t.y.get(player) + p.eyeHeight.get(player);
            gun.origin.z = t.z.get(player);
            const yaw = p.yaw.get(player),
                pitch = p.pitch.get(player);
            gun.direction[0] = -Math.sin(yaw) * Math.cos(pitch);
            gun.direction[1] = Math.sin(pitch);
            gun.direction[2] = -Math.cos(yaw) * Math.cos(pitch);
            break;
        }
        const left = gun.left !== gun.consumedLeft,
            right = gun.right !== gun.consumedRight;
        gun.consumedLeft = gun.left;
        gun.consumedRight = gun.right;
        let hovered = 0;
        if (gun.body) {
            if (left || right) {
                const body = gun.body;
                release(world);
                if (left)
                    setLinearVelocity(world, body, {
                        x: gun.direction[0] * LAUNCH_SPEED,
                        y: gun.direction[1] * LAUNCH_SPEED,
                        z: gun.direction[2] * LAUNCH_SPEED,
                    });
            } else {
                gun.distance +=
                    Math.sign(HOLD_DISTANCE - gun.distance) *
                    Math.min(
                        Math.abs(HOLD_DISTANCE - gun.distance),
                        REEL_SPEED * world.time.deltaTime,
                    );
                gun.point[0] = gun.origin.x + gun.direction[0] * gun.distance;
                gun.point[1] = gun.origin.y + gun.direction[1] * gun.distance;
                gun.point[2] = gun.origin.z + gun.direction[2] * gun.distance;
                setTargetTransform(world, gun.target, gun.point, [0, 0, 0, 1]);
            }
        } else {
            gun.translation.x = gun.direction[0] * MAX_RANGE;
            gun.translation.y = gun.direction[1] * MAX_RANGE;
            gun.translation.z = gun.direction[2] * MAX_RANGE;
            const hit = castRayClosest(world, gun.origin, gun.translation, gun.hit, {
                categoryBits: 1n,
                maskBits: 1n,
            });
            hovered =
                hit && world.storage(Body).type.get(gun.hit.body) === BodyType.Dynamic
                    ? gun.hit.body
                    : 0;
            if (hovered && left) {
                const mass = getMassData(world, gun.hit.body)!;
                const anchor = getLocalPoint(world, gun.hit.body, gun.hit.point)!;
                gun.body = gun.hit.body;
                gun.distance = gun.hit.fraction * MAX_RANGE;
                gun.target = world.create();
                world.add(gun.target, Transform, {
                    translation: [gun.hit.point.x, gun.hit.point.y, gun.hit.point.z],
                });
                world.add(gun.target, Body, { type: BodyType.Kinematic, enableSleep: 0 });
                const g = world.resource(PhysicsWorldDefinition).gravity;
                const mg = mass.mass * Math.hypot(g.x, g.y, g.z);
                const lever = Math.sqrt(
                    (mass.inertia.cx.x + mass.inertia.cy.y + mass.inertia.cz.z) / (3 * mass.mass),
                );
                gun.joint = world.create();
                world.add(gun.joint, MotorJoint, {
                    a: gun.target,
                    b: gun.body,
                    localAnchorB: [anchor.x, anchor.y, anchor.z],
                    linearHertz: 7.5,
                    linearDampingRatio: 1,
                    maxSpringForce: 100 * mg,
                    maxVelocityTorque: 0.5 * lever * mg,
                });
                setAwake(world, gun.body, true);
            }
        }
        const active = gun.body || hovered;
        if (gun.outlined && gun.outlined !== active && world.has(gun.outlined, Outline))
            world.remove(gun.outlined, Outline);
        if (active) {
            if (!world.has(active, Outline)) world.add(active, Outline, { occlude: 1 });
            world.storage(Outline).color.set(active, gun.body ? 0xcc8033 : 0x808f9e);
            world.storage(Outline).width.set(active, gun.body ? 3 : 2);
        }
        gun.outlined = active;
    },
};
export const GunPlugin: Plugin = {
    name: "Gun",
    dependencies: [InputPlugin, OutlinePlugin],
    systems: [sample, aim],
    recovery: (world) => ({
        snapshot: () => structuredClone(world.resource(Gun)),
        restore: (saved: ReturnType<typeof createGun>) =>
            Object.assign(world.resource(Gun), structuredClone(saved)),
    }),
};
