import { afterAll, beforeAll, expect, setDefaultTimeout, test } from "bun:test";
import { probeTexture } from "@dylanebert/shallot";
import { TIMEOUT } from "@dylanebert/shallot/testing";
import { openGpuApp } from "@dylanebert/shallot/testing/gpu";
import { setupGlobals } from "@dylanebert/shallot/webgpu";
import tgpu from "typegpu";
import { posterizeLightness } from "./posterize";
setDefaultTimeout(TIMEOUT.gpu);
await setupGlobals();
let app: Awaited<ReturnType<typeof openGpuApp>>;
let pipeline: GPURenderPipeline;
let output: GPUTexture;
beforeAll(async () => {
    app = await openGpuApp({ defaults: false, plugins: [{ name: "PosterizeProbe", gpu: {} }] });
    console.info("posterize adapter:", app.world.gpuIfAvailable!.adapter);
    const device = app.world.gpu.device;
    const module = device.createShaderModule({ code: tgpu.resolve({ externals: { posterizeLightness }, template: `
@vertex fn vertex(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
    let x=f32((i<<1u)&2u); let y=f32(i&2u); return vec4f(x*2-1,y*2-1,0,1);
}
@fragment fn fragment(@builtin(position) pixel:vec4f)->@location(0) vec4f {
    let L=(floor(pixel.x)+0.25)/128.0;
    return vec4f(posterizeLightness(vec3f(L*L*L),10.0),1);
}` }) });
    pipeline = device.createRenderPipeline({ layout: "auto", vertex: { module, entryPoint: "vertex" }, fragment: { module, entryPoint: "fragment", targets: [{ format: "rgba32float" }] } });
    output = device.createTexture({ size: [128, 4], format: "rgba32float", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
    app.world.own(output);
});
afterAll(() => app?.dispose());
test("a fullscreen OKLab gradient resolves to the exact ten-band linear RGB values", async () => {
    const device = app.world.gpu.device;
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: output.createView(), loadOp: "clear", storeOp: "store" }] });
    pass.setPipeline(pipeline); pass.draw(3); pass.end();
    device.queue.submit([encoder.finish()]);
    const rgba = new Float32Array((await probeTexture(app.world, output)).bytes);
    const bands = new Set<number>();
    for (let y = 0; y < 4; y++) for (let x = 0; x < 128; x++) {
        const band = Math.round((x + .25) / 128 * 10) / 10;
        bands.add(band);
        for (let c = 0; c < 3; c++) expect(rgba[(y * 128 + x) * 4 + c]).toBeCloseTo(band ** 3, 5);
        expect(rgba[(y * 128 + x) * 4 + 3]).toBe(1);
    }
    expect([...bands]).toEqual([0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1]);
});
test.todo("Bayer 4×4 framebuffer-pixel dither of amplitude 1/10 alternates a gradient between adjacent OKLab bands", () => {
    throw new Error("Requires published Shallot material fragment ctx.fragCoord; no object-UV or private-engine substitute");
});
