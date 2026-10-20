import type { Plugin } from "@dylanebert/shallot";
import { DiagnosticsOverlayPlugin } from "@dylanebert/shallot/extras";
import { APP_PLUGINS } from "./plugins";

export const AppPlugin: Plugin = {
    name: "SandboxApp",
    dependencies: [...APP_PLUGINS, DiagnosticsOverlayPlugin],
};
