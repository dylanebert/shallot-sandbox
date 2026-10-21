import { expect, test } from "playwright/test";
import { TIMEOUT } from "@dylanebert/shallot/testing";
import { mkdir } from "node:fs/promises";

// Manual look evidence, deliberately outside the ordinary browser claim set.
test("room, hall and held block", async ({ page }) => {
    test.setTimeout(TIMEOUT.browser);
    const directory = process.env.SHALLOT_CAPTURE_DIR;
    if (!directory) throw new Error("Set SHALLOT_CAPTURE_DIR for the manual look review");
    await mkdir(directory, { recursive: true });
    const save = async (name: string) => {
        await page.evaluate(() => window.sandbox.capture());
        await page.screenshot({ path: `${directory}/${name}.png` });
        await page.locator("#captured-frame").evaluate(element => element.remove());
    };
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/tests/stepped.html");
    await page.waitForFunction(() => !!window.sandbox);
    await save("room");
    await page.evaluate(() => window.sandbox.hall());
    await save("hall");
    await page.reload();
    await page.waitForFunction(() => !!window.sandbox);
    expect(await page.evaluate(() => window.sandbox.hold())).toBe(true);
    await save("held-block");
});
