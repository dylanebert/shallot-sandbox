import { expect, test, setDefaultTimeout } from "bun:test";
import { TIMEOUT } from "@dylanebert/shallot/testing";
import { modal } from "./audio";
setDefaultTimeout(TIMEOUT.cheap);
test("modal PCM is finite, bounded, begins at silence and decays", () => {
    const pcm = modal([[330, 1, .1], [540, .6, .05]], .001, .5);
    expect(pcm).toHaveLength(48000);
    expect(pcm[0]).toBe(0);
    expect(pcm.every(value => Number.isFinite(value) && Math.abs(value) <= .5)).toBe(true);
    const peak = (samples: Float32Array) => samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
    expect(peak(pcm.subarray(0, 4800))).toBeGreaterThan(.1);
    expect(peak(pcm.subarray(43200))).toBeLessThan(.001);
});
