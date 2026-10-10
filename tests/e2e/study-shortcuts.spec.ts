import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

test.use({ reducedMotion: "reduce" });

test("study shortcuts remain readable and reachable on small screens", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const desk = page.getByRole("region", { name: "Your study desk" });
  const links = desk.getByRole("link");
  for (const width of [320, 390, 760, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(links).toHaveCount(6);
    await expect(links.first().locator("span").last()).toBeVisible();
    await expect(async () => {
      const fits = await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      );
      expect(fits).toBe(true);
      for (const link of await links.all()) {
        const bounds = await link.boundingBox();
        expect(bounds!.width).toBeGreaterThanOrEqual(44);
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        await expect(link.locator("span").last()).toHaveCSS("opacity", "1");
      }
    }).toPass();
  }
  const scan = await new AxeBuilder({ page })
    .include(".study-shortcuts")
    .analyze();
  expect(scan.violations).toEqual([]);

  await page.evaluate(() => {
    document.documentElement.dataset.shortcutNavigation = "active";
  });
  await links.getByText("Words", { exact: true }).click();
  await expect(page).toHaveURL(/\/vocabulary$/);
  await expect(page.locator("html")).toHaveAttribute(
    "data-shortcut-navigation",
    "active",
  );
  await page.goBack();
  await desk.getByRole("link", { name: "Calendar", exact: true }).click();
  await expect(page).toHaveURL(/\/planner$/);
  expect(errors).toEqual([]);
});

test("glass shortcuts support keyboard use without WebGL", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (
        type === "webgl2" ||
        type === "webgl" ||
        type === "experimental-webgl"
      )
        return null;
      return Reflect.apply(getContext, this, [type, ...args]);
    } as typeof getContext;
  });
  await page.reload();
  const desk = page.getByRole("region", { name: "Your study desk" });
  const book = desk.getByRole("link", { name: "Book journey", exact: true });
  await expect(book).toBeVisible();
  await expect(book.locator("span").last()).toHaveCSS("opacity", "1");
  await expect(book.locator(":scope > span").first()).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
  await page.keyboard.press("Tab");
  await book.focus();
  await expect(book).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/lessons$/);
});
