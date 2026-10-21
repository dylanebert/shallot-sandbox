import { MaterialPlugin, extendedMaterial, materialType, Materials, applyPbrLighting, pbrInputFromMaterial, pbrInputFromStandardMaterial, StandardMaterial } from "@dylanebert/shallot/standard/rendering";
import tgpu from "typegpu";
import * as d from "typegpu/data";
import * as std from "typegpu/std";
import { posterizeLightness, POSTERIZATION_LEVELS } from "./posterize";

export function linearHex(hex: number): [number, number, number, number] {
    const linear = (v: number) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    return [linear((hex >> 16 & 255) / 255), linear((hex >> 8 & 255) / 255), linear((hex & 255) / 255), 1];
}
export const ArchitecturePaint = StandardMaterial({ baseColor: linearHex(0x393836), perceptualRoughness: 1 });
export const WoodPaint = StandardMaterial({ baseColor: linearHex(0x5a4e3c), perceptualRoughness: 1 });
export const StonePaint = StandardMaterial({ baseColor: linearHex(0x575149), perceptualRoughness: 1 });
// Stone's procedural veins still use value noise; architecture does not.
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

// Like scream-jam, quantization follows applyPbrLighting.
export const Architecture = extendedMaterial(Materials, {
    name: "Architecture",
    fragment: ctx => {
        "use gpu";
        const color = applyPbrLighting(pbrInputFromStandardMaterial(ctx));
        return d.vec4f(posterizeLightness(color.rgb, POSTERIZATION_LEVELS, ctx.fragCoord.xy), color.a);
    },
});
const WoodParameters = d.struct({ baseColor: d.vec4f, size: d.vec3f });
export const Wood = materialType({
    name: "Wood",
    parameters: WoodParameters,
    defaults: { baseColor: WoodPaint.baseColor, size: d.vec3f(1) },
    fragmentInputs: { localPos: true },
    depthPass: { prepass: true, shadows: true },
    fragment: ctx => {
        "use gpu";
        // Metre-space grain stays attached to a tumbling timber. Size is authored
        // per material through the public parameter schema, not a renderer buffer.
        const size = ctx.parameters.size;
        const p = std.mul(ctx.localPos, size);
        let axial = p.x;
        let radial = d.vec2f(p.y, p.z);
        if (size.y > size.x && size.y >= size.z) {
            axial = p.y;
            radial = d.vec2f(p.z, p.x);
        } else if (size.z > size.x && size.z > size.y) {
            axial = p.z;
            radial = d.vec2f(p.x, p.y);
        }
        const grain = std.sin(std.length(std.sub(radial, d.vec2f(3, 8))) * 6 + std.sin(axial * 1.5) * .1);
        // On a unit cube, one border distance is zero on the face. The median
        // selects distance to that face's edge without depending on face UVs.
        const border = std.sub(d.vec3f(.5), std.abs(ctx.localPos));
        const edge = std.min(std.max(border.x, border.y), std.min(std.max(border.y, border.z), std.max(border.z, border.x)));
        const seam = .55 + .45 * std.smoothstep(0, .035, edge);
        const surface = pbrInputFromMaterial(ctx);
        surface.perceptualRoughness = 1;
        surface.baseColor = d.vec4f(std.mul(ctx.parameters.baseColor.rgb, seam * (.98 + grain * .002)), ctx.parameters.baseColor.a);
        const color = applyPbrLighting(surface);
        return d.vec4f(posterizeLightness(color.rgb, POSTERIZATION_LEVELS, ctx.fragCoord.xy), color.a);
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
        return d.vec4f(posterizeLightness(color.rgb, POSTERIZATION_LEVELS, ctx.fragCoord.xy), color.a);
    },
});
export const SurfacePlugins = [MaterialPlugin(Architecture), MaterialPlugin(Wood), MaterialPlugin(Stone)];
