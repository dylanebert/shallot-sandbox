import type { System, World } from "@dylanebert/shallot";
import { Gun } from "./gun";

// App-owned overlay and cleanup, as examples/hud; reads gameplay data, not DOM input.
export function hud(container: HTMLElement, world: World): () => void {
    const crosshair = document.createElement("span");
    crosshair.className = "crosshair";
    crosshair.setAttribute("aria-hidden", "true");
    const prompts = document.createElement("div");
    prompts.style.cssText = "position:absolute;right:28px;bottom:28px;color:#eee2cf;font:12px monospace;line-height:2;text-align:right;pointer-events:none;text-shadow:0 1px 3px #000";
    container.append(crosshair, prompts);
    const update = () => {
        const gun = world.resource(Gun);
        const mode = gun.body ? "hold" : gun.outlined ? "hover" : "idle";
        crosshair.dataset.mode = mode;
        crosshair.textContent = mode === "hold" ? "⊙" : mode === "hover" ? "○" : "+";
        crosshair.style.color = mode === "hold" ? "#e4ad73" : mode === "hover" ? "#b4cfdf" : "#eee";
        prompts.innerText = (mode === "hold" ? "LMB · Launch\nRMB · Drop\n" : mode === "hover" ? "LMB · Grab\n" : "") + "G · Haze";
    };
    const read: System = { name: "SandboxHud/Read", group: "draw", update };
    world.addSystem(read);
    update();
    return () => { world.removeSystem(read); crosshair.remove(); prompts.remove(); };
}
