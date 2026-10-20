import { expect, test } from "bun:test";
import { APP_PLUGINS } from "./plugins";
import { SandboxPlugin } from "./sandbox";

test("the page selects the sandbox game plugin", () => {
    expect(APP_PLUGINS.includes(SandboxPlugin)).toBe(true);
});
