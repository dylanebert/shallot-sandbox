import { MaterialPlugin, materialType, lit } from "@dylanebert/shallot/standard/rendering";
import * as d from "typegpu/data";
import * as std from "typegpu/std";

const SurfaceParameters = d.struct({ color: d.vec3f });
const WoodParameters = d.struct({ color: d.vec3f, size: d.vec3f });

// Like examples/materials: lit fragment materials retain the standard light/shadow path.
export const Grit = materialType({
    name: "Grit",
    parameters: SurfaceParameters,
    defaults: { color: d.vec3f(0.115, 0.108, 0.098) },
    fragment: (ctx) => {
        "use gpu";
        const p = ctx.world;
        const tooth = std.fract(std.sin(std.dot(std.floor(std.mul(p, 70)), d.vec3f(12.989, 78.233, 37.719))) * 43758.5453);
        const stain = std.sin(p.x * 2.3 + std.sin(p.z * 3)) * std.sin(p.y * 4.1 + p.z);
        return d.vec4f(lit(std.mul(ctx.parameters.color, 0.9 + tooth * 0.08 + stain * 0.06), ctx.worldNormal), 1);
    },
});
export const Wood = materialType({
    name: "Wood",
    parameters: WoodParameters,
    defaults: { color: d.vec3f(0.15, 0.112, 0.071), size: d.vec3f(1) },
    fragmentInputs: { localPos: true },
    fragment: (ctx) => {
        "use gpu";
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
        // A distant pith gives nearly parallel rings, with only slow axial wander.
        const radius = std.length(std.sub(radial, d.vec2f(3, 8)));
        const grain = std.sin(radius * 38 + std.sin(axial * 2) * 0.25);
        const fiber = std.sin(radial.x * 95 + axial * 0.7);
        return d.vec4f(lit(std.mul(ctx.parameters.color, 0.94 + grain * 0.045 + fiber * 0.015), ctx.worldNormal), 1);
    },
});
export const Stone = materialType({
    name: "Stone",
    parameters: SurfaceParameters,
    defaults: { color: d.vec3f(0.13, 0.12, 0.105) },
    fragmentInputs: { localPos: true },
    fragment: (ctx) => {
        "use gpu";
        const p = ctx.localPos;
        const vein = std.sin(p.x * 38 + std.sin(p.y * 19) * 2 + p.z * 21);
        return d.vec4f(lit(std.mul(ctx.parameters.color, 0.8 + std.abs(vein) * 0.25), ctx.worldNormal), 1);
    },
});
export const SurfacePlugins = [MaterialPlugin(Grit), MaterialPlugin(Wood), MaterialPlugin(Stone)];
