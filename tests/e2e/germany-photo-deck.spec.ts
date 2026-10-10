import { test, expect } from "./fixtures";

test.describe("Germany photo deck with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("a learner browses Germany photos with touch controls and the keyboard", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/inspiration");
    const deck = page.getByRole("figure", {
      name: "Germany destination photos",
    });
    const caption = deck.locator("figcaption > span");
    await expect(caption).toContainText("Berlin");
    await expect(
      deck.getByRole("button", { name: "Pause Germany slideshow" }),
    ).toHaveCount(0);
    await deck.getByRole("button", { name: "Next Germany photo" }).click();
    await expect(caption).toContainText("Hamburg");
    await deck.getByRole("button", { name: "Previous Germany photo" }).click();
    await expect(caption).toContainText("Berlin");
    await deck.getByRole("region", { name: "Card stack" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(caption).toContainText("Hamburg");
    for (const width of [320, 390, 760, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await expect(
        deck.getByRole("button", { name: "Next Germany photo" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page
      .getByRole("button", { name: "Choose Eibsee as my daily reminder" })
      .click();
    await expect(caption).toContainText("Eibsee");
    await page.reload();
    await expect(caption).toContainText("Eibsee");
    expect(errors).toEqual([]);
  });
});

test("a learner can pause the four-second Germany slideshow", async ({
  page,
}) => {
  await page.goto("/inspiration");
  const deck = page.getByRole("figure", { name: "Germany destination photos" });
  await expect(deck.locator("figcaption > span")).toContainText("Hamburg", {
    timeout: 12_000,
  });
  await deck.getByRole("button", { name: "Pause Germany slideshow" }).click();
  await expect(
    deck.getByRole("button", { name: "Play Germany slideshow" }),
  ).toHaveAttribute("aria-pressed", "true");
  const place = await deck.locator("figcaption > span").innerText();
  await page.locator("main h1").click();
  // Wait one interval to verify that pausing continues after focus leaves the controls.
  await page.waitForTimeout(4400);
  await expect(deck.locator("figcaption > span")).toHaveText(place);
});
