import { expect, test } from "playwright/test";

test("the built game loads an isolated canvas and a centre aiming mark without page errors", async ({
    page,
}) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page).toHaveTitle("Shallot Sandbox");
    await expect(page.locator(".crosshair")).toHaveText("+");
    // The player mounts its touch controls after the application has initialized.
    await expect(page.locator("[data-touch-stick]")).toHaveCount(1);
    expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
    expect(await canvas.evaluate((c: HTMLCanvasElement) => c.width > 0 && c.height > 0)).toBe(true);
    expect(errors).toEqual([]);
});
