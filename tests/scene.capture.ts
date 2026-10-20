import { expect, test } from "playwright/test";
import { TIMEOUT } from "@dylanebert/shallot/testing";
import { mkdir, writeFile } from "node:fs/promises";

// Manual look evidence, deliberately outside the ordinary browser claim set.
test("room, hall haze on and off, and a held block", async ({ page }) => {
    test.setTimeout(TIMEOUT.browser);
    const directory = process.env.SHALLOT_CAPTURE_DIR;
    if (!directory) throw new Error("Set SHALLOT_CAPTURE_DIR for the manual look review");
    await mkdir(directory, { recursive: true });
    const save = async (name: string) => {
        const png = await page.evaluate(() => window.sandbox.capture());
        await writeFile(`${directory}/${name}.png`, Buffer.from(png, "base64"));
    };
    await page.goto("/tests/stepped.html");
    await page.waitForFunction(() => !!window.sandbox);
    await save("room");
    await page.evaluate(() => window.sandbox.hall());
    await save("hall-fog-on");
    await page.evaluate(() => window.sandbox.toggleFog());
    await save("hall-fog-off");
    await page.reload();
    await page.waitForFunction(() => !!window.sandbox);
    expect(await page.evaluate(() => window.sandbox.hold())).toBe(true);
    await save("held-block");
});
