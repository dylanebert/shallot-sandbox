import tgpu from "typegpu";
import * as d from "typegpu/data";

export const POSTERIZATION_LEVELS = 10;
// Linear sRGB <-> OKLab, Björn Ottosson's 2021 matrices (MIT/public domain).
// Same material-stage operation as scream-jam: lighting first, banding next.
// Archive Glaze composite.ts: row-major Bayer rank / 16 - .5, one band wide.
// Pixel centres come directly from the view's 360-line render target, not CSS pixels.
export const posterizeLightness = tgpu.fn([d.vec3f, d.f32, d.vec2f], d.vec3f)(`(rgb: vec3f, levels: f32, pixel: vec2f) -> vec3f {
  let bayer = array<f32, 16>(0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5);
  let index = (u32(pixel.x) % 4u) + (u32(pixel.y) % 4u) * 4u;
  let offset = (bayer[index] / 16.0 - .5) / levels;
  let lms = vec3f(dot(rgb, vec3f(.4122214708, .5363325363, .0514459929)),
    dot(rgb, vec3f(.2119034982, .6806995451, .1073969566)),
    dot(rgb, vec3f(.0883024619, .2817188376, .6299787005)));
  let root = sign(lms) * pow(abs(lms), vec3f(1.0 / 3.0));
  let L = floor((dot(root, vec3f(.2104542553, .7936177850, -.0040720468)) + offset) * levels + .5) / levels;
  let a = dot(root, vec3f(1.9779984951, -2.4285922050, .4505937099));
  let b = dot(root, vec3f(.0259040371, .7827717662, -.8086757660));
  let inverse = vec3f(L + .3963377774*a + .2158037573*b,
    L - .1055613458*a - .0638541728*b, L - .0894841775*a - 1.2914855480*b);
  let cube = inverse * inverse * inverse;
  return max(vec3f(0.0), vec3f(dot(cube, vec3f(4.0767416621, -3.3077115913, .2309699292)),
    dot(cube, vec3f(-1.2684380046, 2.6097574011, -.3413193965)),
    dot(cube, vec3f(-.0041960863, -.7034186147, 1.7076147010))));
}`);
