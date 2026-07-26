import { expect, test, type Page } from "@playwright/test";

const studySpaceCount = 12;

function desktopFilters(page: Page) {
  return page.getByRole("complementary", { name: "Filter" });
}

async function waitForSpaces(page: Page, count = studySpaceCount) {
  await expect(page.locator("article")).toHaveCount(count);
}

async function expectSearchParam(page: Page, key: string, value: string | null) {
  await expect.poll(() => new URL(page.url()).searchParams.get(key)).toBe(value);
}

test.describe("Filtering flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForSpaces(page);
  });

  test("has the updated meta title", async ({ page }) => {
    await expect(page).toHaveTitle(/Hitta studieplats\s*[–-]\s*KTH Biblioteket/);
  });

  test("free-text search updates URL and shows a chip", async ({ page }) => {
    const input = desktopFilters(page).getByPlaceholder(/Sök på lokal/i);
    await input.fill("Studieplats 2");
    await expectSearchParam(page, "q", "Studieplats 2");

    const chip = page.getByRole("button", {
      name: /Ta bort filter: Sök/i,
    });
    await expect(chip).toBeVisible();
    await expect(page.locator("article")).toHaveCount(1);

    await chip.click();
    await expectSearchParam(page, "q", "");
    await waitForSpaces(page);
  });

  test("finds the visible English name", async ({ page }) => {
    await page.getByRole("button", { name: /English/i }).click();
    const input = desktopFilters(page).getByPlaceholder(/Search for a space/i);
    await input.fill("english study space 7");

    await expectSearchParam(page, "q", "english study space 7");
    await expect(page.locator("article")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "English Study Space 7" })).toBeVisible();
  });

  test("group-room filters update the URL and clear incompatible state", async ({ page }) => {
    const filters = desktopFilters(page);
    await filters.getByRole("button", { name: "I grupprum" }).click();
    await expectSearchParam(page, "mode", "grupprum");

    const size24 = filters.getByRole("button", { name: /2[–-]4 pers/ });
    await expect(size24).toBeVisible();
    await size24.click();
    await expectSearchParam(page, "size", "2-4");

    const freeOnly = filters.getByRole("checkbox", {
      name: /Visa bara lediga just nu/,
    });
    await expect(freeOnly).toBeVisible();
    await freeOnly.check();
    await expectSearchParam(page, "free", "true");

    await filters.getByRole("button", { name: "Enskilt" }).click();
    await expectSearchParam(page, "mode", "enskilt");
    await expectSearchParam(page, "size", null);
    await expectSearchParam(page, "free", null);
  });

  test("clear all clears all active filters", async ({ page }) => {
    const filters = desktopFilters(page);
    await filters.getByPlaceholder(/Sök på lokal/i).fill("test");
    await filters.getByRole("button", { name: "Tillsammans" }).click();
    await expectSearchParam(page, "mode", "tillsammans");

    await filters.getByRole("button", { name: /Rensa alla/i }).click();
    await expectSearchParam(page, "q", "");
    await expectSearchParam(page, "mode", null);
  });

  test("uses the selected space kind as the count total", async ({ page }) => {
    const filters = desktopFilters(page);
    await filters.getByRole("button", { name: "Tillsammans" }).click();
    await expect(
      page.locator("span.hidden.lg\\:inline").filter({ hasText: "12 av 12 matchar dina filter" }),
    ).toBeVisible();

    await filters.getByRole("button", { name: "Service" }).click();
    await expectSearchParam(page, "kind", "service");
    await expect(page.locator("article")).toHaveCount(2);
    await expect(
      page.locator("span.hidden.lg\\:inline").filter({ hasText: "2 träffar" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Ta bort filter: Service" })).toBeVisible();

    await page.getByRole("button", { name: /English/i }).click();
    await expect(
      page.getByRole("button", {
        name: "Remove filter: Library services",
      }),
    ).toBeVisible();
  });

  test("panel filters, card chips and sorting preserve scroll", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 700));
    const initialFilterScroll = await page.evaluate(() => window.scrollY);
    expect(initialFilterScroll).toBeGreaterThan(300);

    await desktopFilters(page).getByRole("button", { name: "Tillsammans" }).click();
    await expectSearchParam(page, "mode", "tillsammans");
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(initialFilterScroll - 80);

    const cardChip = page.locator("article").nth(4).getByRole("button", { name: "I grupprum" });
    await cardChip.scrollIntoViewIfNeeded();
    const initialChipScroll = await page.evaluate(() => window.scrollY);
    await cardChip.click();
    await expectSearchParam(page, "mode", "grupprum");
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(initialChipScroll - 80);

    await page.evaluate(() => window.scrollTo(0, 50));
    const initialSortScroll = await page.evaluate(() => window.scrollY);
    expect(initialSortScroll).toBeGreaterThan(30);
    const sort = page.getByRole("combobox", { name: "Sortera" });
    await sort.click();
    await page.getByRole("option", { name: "Namn (A–Ö)" }).click();
    await expectSearchParam(page, "sort", "name_asc");
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(initialSortScroll - 30);
  });

  test("an internal space link still scrolls to the target card", async ({ page }) => {
    await page.locator("article").first().getByRole("button", { name: "Studieplats 10" }).click();
    await expectSearchParam(page, "highlight", "studieplats-10");

    const target = page.locator("#space-00000000-0000-4000-8000-000000000010");
    await expect(target).toBeInViewport();
  });
});

test.describe("Mobile filter sheet", () => {
  test.use({ viewport: { width: 390, height: 700 } });

  test("stays docked at the bottom and applies a draft", async ({ page }) => {
    await page.goto("/");
    await waitForSpaces(page);

    const openButton = page.getByRole("button", { name: "Filter", exact: true });
    const buttonBox = await openButton.boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(700);
    expect(buttonBox!.y).toBeGreaterThan(600);

    await page.evaluate(() => window.scrollTo(0, 700));
    const initialScroll = await page.evaluate(() => window.scrollY);
    expect(initialScroll).toBeGreaterThan(300);
    await openButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "I grupprum" }).click();
    await dialog.getByRole("button", { name: /2[–-]4 pers/ }).click();

    await dialog.getByRole("button", { name: /Visa resultat/ }).click();
    await expect(dialog).toBeHidden();
    await expectSearchParam(page, "mode", "grupprum");
    await expectSearchParam(page, "size", "2-4");
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(initialScroll - 80);
  });
});

test.describe("Iframe with its own scroll", () => {
  test("preserves iframe scroll without touching the parent page", async ({ page }) => {
    await page.goto("/e2e-iframe-host.html");

    const frameLocator = page.frameLocator("#app-frame");
    await expect(frameLocator.locator("article")).toHaveCount(studySpaceCount);
    const appFrame = page.frames().find((frame) => frame !== page.mainFrame());
    expect(appFrame).toBeDefined();

    await appFrame!.evaluate(() => window.scrollTo(0, 700));
    const appScroll = await appFrame!.evaluate(() => window.scrollY);
    const parentScroll = await page.evaluate(() => window.scrollY);
    expect(appScroll).toBeGreaterThan(300);

    await frameLocator
      .getByRole("complementary", { name: "Filter" })
      .getByRole("button", { name: "Tillsammans" })
      .click();

    await expect.poll(() => new URL(appFrame!.url()).searchParams.get("mode")).toBe("tillsammans");
    await expect
      .poll(() => appFrame!.evaluate(() => window.scrollY))
      .toBeGreaterThan(appScroll - 80);
    expect(await page.evaluate(() => window.scrollY)).toBe(parentScroll);
  });

  test("keeps the mobile dock in the iframe viewport", async ({ page }) => {
    await page.goto("/e2e-iframe-host.html?mobile=1");
    const frameLocator = page.frameLocator("#app-frame");
    await expect(frameLocator.locator("article")).toHaveCount(studySpaceCount);
    const appFrame = page.frames().find((frame) => frame !== page.mainFrame());
    expect(appFrame).toBeDefined();

    await appFrame!.evaluate(() => window.scrollTo(0, 700));
    const initialScroll = await appFrame!.evaluate(() => window.scrollY);
    const openButton = frameLocator.getByRole("button", {
      name: "Filter",
      exact: true,
    });
    const buttonBox = await openButton.boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(buttonBox!.y).toBeGreaterThanOrEqual(200);
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(800);

    await openButton.click();
    const dialog = frameLocator.getByRole("dialog");
    await dialog.getByRole("button", { name: "Tillsammans" }).click();
    await dialog.getByRole("button", { name: /Visa resultat/ }).click();
    await expect
      .poll(() => appFrame!.evaluate(() => window.scrollY))
      .toBeGreaterThan(initialScroll - 80);
  });
});
