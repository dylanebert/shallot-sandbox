import { cube, Meshes, type Resource, type World } from "@dylanebert/shallot";
import { MaterialPlugin, extendedMaterial, Materials, applyPbrLighting, pbrInputFromStandardMaterial, StandardMaterial } from "@dylanebert/shallot/standard/rendering";
import tgpu from "typegpu";
import * as d from "typegpu/data";
import * as std from "typegpu/std";
import { posterizeLightness, POSTERIZATION_LEVELS } from "./posterize";

export function linearHex(hex: number): [number, number, number, number] {
    const linear = (v: number) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    return [linear((hex >> 16 & 255) / 255), linear((hex >> 8 & 255) / 255), linear((hex & 255) / 255), 1];
}
export const GritPaint = StandardMaterial({ baseColor: linearHex(0x393836), perceptualRoughness: 1 });
export const WoodPaint = StandardMaterial({ baseColor: linearHex(0x5a4e3c), perceptualRoughness: 1 });
export const StonePaint = StandardMaterial({ baseColor: linearHex(0x575149), perceptualRoughness: 1 });
const hash = tgpu.fn([d.vec3f], d.f32)((p) => {
    "use gpu";
    const q = std.fract(std.mul(p, .1031));
    const r = std.add(q, std.dot(q, std.add(q.zyx, d.vec3f(31.32))));
    return std.fract((r.x + r.y) * r.z);
});
const noise = tgpu.fn([d.vec3f], d.f32)((p) => {
    "use gpu";
    const i = std.floor(p);
    const f = std.fract(p);
    const u = std.mul(std.mul(f, f), std.sub(d.vec3f(3), std.mul(f, 2)));
    return std.mix(
        std.mix(std.mix(hash(i), hash(std.add(i, d.vec3f(1,0,0))), u.x), std.mix(hash(std.add(i,d.vec3f(0,1,0))),hash(std.add(i,d.vec3f(1,1,0))),u.x),u.y),
        std.mix(std.mix(hash(std.add(i,d.vec3f(0,0,1))),hash(std.add(i,d.vec3f(1,0,1))),u.x),std.mix(hash(std.add(i,d.vec3f(0,1,1))),hash(std.add(i,d.vec3f(1,1,1))),u.x),u.y), u.z);
});

// Standard-derived surfaces keep PBR/depth/shadow bindings. Like scream-jam, quantization is
// after applyPbrLighting and before the renderer applies fog; atmosphere is never quantized.
export const Grit = extendedMaterial(Materials, {
    name: "Grit",
    fragment: ctx => {
        "use gpu";
        const p = ctx.world;
        const broad = noise(std.mul(p, 2.1));
        const medium = noise(std.mul(p, 8));
        const tooth = noise(std.mul(p, 40));
        const shade = .72 + broad * .24 + medium * .15 + tooth * .1;
        const surface = pbrInputFromStandardMaterial(ctx);
        surface.baseColor = d.vec4f(std.mul(surface.baseColor.rgb, shade), surface.baseColor.a);
        const color = applyPbrLighting(surface);
        return d.vec4f(posterizeLightness(color.rgb, POSTERIZATION_LEVELS), color.a);
    },
});
export const Wood = extendedMaterial(Materials, {
    name: "Wood",
    fragment: ctx => {
        "use gpu";
        // Authored timber UVs are metres: x crosses the grain; y follows the longest axis.
        const grain = std.sin(ctx.uv.x * 38 + std.sin(ctx.uv.y * 2) * .25);
        const fiber = std.sin(ctx.uv.x * 95 + ctx.uv.y * .7);
        const surface = pbrInputFromStandardMaterial(ctx);
        surface.baseColor = d.vec4f(std.mul(surface.baseColor.rgb, .94 + grain * .045 + fiber * .015), surface.baseColor.a);
        const color = applyPbrLighting(surface);
        return d.vec4f(posterizeLightness(color.rgb, POSTERIZATION_LEVELS), color.a);
    },
});
export const Stone = extendedMaterial(Materials, {
    name: "Stone",
    fragment: ctx => {
        "use gpu";
        const vein = noise(d.vec3f(ctx.uv.x * 21, ctx.uv.y * 15, 7));
        const surface = pbrInputFromStandardMaterial(ctx);
        surface.baseColor = d.vec4f(std.mul(surface.baseColor.rgb, .7 + vein * .4), surface.baseColor.a);
        const color = applyPbrLighting(surface);
        return d.vec4f(posterizeLightness(color.rgb, POSTERIZATION_LEVELS), color.a);
    },
});
export const SurfacePlugins = [MaterialPlugin(Grit), MaterialPlugin(Wood), MaterialPlugin(Stone)];

const TimberMeshes: Resource<Map<string, number>> = { create: () => new Map() };
/** Metre-space near-parallel rings authored as UVs, so standard-derived materials need no private transform binding. */
export function timberMesh(world: World, size: readonly number[]): number {
    const cache = world.resource(TimberMeshes);
    const key = size.join(",");
    const existing = cache.get(key);
    if (existing !== undefined) return existing;
    const mesh = cube();
    const axis = size[1] > size[0] && size[1] >= size[2] ? 1 : size[2] > size[0] && size[2] > size[1] ? 2 : 0;
    const a = (axis + 1) % 3, b = (axis + 2) % 3;
    for (let i = 0; i < mesh.vertices.length; i += 8) {
        mesh.vertices[i + 6] = mesh.vertices[i + a] * size[a] * .35 + mesh.vertices[i + b] * size[b] * .94;
        mesh.vertices[i + 7] = mesh.vertices[i + axis] * size[axis];
    }
    const id = world.resource(Meshes).add({ name: `timber-${key}`, ...mesh });
    cache.set(key, id);
    return id;
}
