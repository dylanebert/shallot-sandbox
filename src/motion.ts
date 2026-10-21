import { component, f32, u32, vec2, vec4 } from "@dylanebert/shallot";

/** Fixed-tick movement history, including the latest jump press count consumed. */
export const PlayerMotion = component("PlayerMotion", {
    carry: vec4,
    /** Ground-relative horizontal locomotion, independent of the mover's clipped velocity. */
    horizontal: vec2,
    coyote: f32,
    buffer: f32,
    lastJumpPresses: u32,
});
