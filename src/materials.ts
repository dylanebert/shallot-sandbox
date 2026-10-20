import { MaterialPlugin, materialType, lit } from "@dylanebert/shallot/standard/rendering";
import * as d from "typegpu/data";
import * as std from "typegpu/std";

const SurfaceParameters = d.struct({ color: d.vec3f });

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
    parameters: SurfaceParameters,
    defaults: { color: d.vec3f(0.15, 0.112, 0.071) },
    fragmentInputs: { localPos: true },
    fragment: (ctx) => {
        "use gpu";
        const p = ctx.localPos;
        const grain = std.sin(p.y * 80 + std.sin(p.x * 9 + p.z * 6) * 3);
        const fiber = std.sin(p.z * 230 + p.y * 40);
        return d.vec4f(lit(std.mul(ctx.parameters.color, 0.82 + grain * 0.12 + fiber * 0.045), ctx.worldNormal), 1);
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
