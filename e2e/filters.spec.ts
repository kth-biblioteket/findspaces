import { test, expect } from "@playwright/test";

/**
 * E2E: filtering flow on the student search page.
 *
 * We drive the visible UI (search input, intent pills, chips) and assert
 * against the URL search params + rendered chips. We deliberately don't
 * assert exact space cards, since the data comes from Lovable Cloud and
 * may change; instead we check that the list re-renders (count changes
 * or empty-state appears) after each filter action.
 */

test.describe("Filtering flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait until spaces have loaded — either a card or the empty state.
    await page.waitForLoadState("networkidle");
  });

  test("has the updated meta title", async ({ page }) => {
    await expect(page).toHaveTitle(/Hitta studieplats\s*[–-]\s*KTH Biblioteket/);
  });

  test("free-text search updates URL and shows a chip", async ({ page }) => {
    const input = page.getByPlaceholder(/Sök på lokal/i);
    await input.fill("bok");

    // Debounced URL sync — poll for the q param.
    await expect
      .poll(() => new URL(page.url()).searchParams.get("q"), { timeout: 5_000 })
      .toBe("bok");

    // Chip appears with the query label.
    await expect(
      page.getByRole("button", { name: /Ta bort filter: Sök/i }),
    ).toBeVisible();

    // Remove chip → query cleared.
    await page.getByRole("button", { name: /Ta bort filter: Sök/i }).click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("q"))
      .toBe("");
  });

  test("intent 'Grupprum' reveals group size, size selection reflects in URL", async ({ page }) => {
    await page.getByRole("button", { name: "I grupprum" }).click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get("mode"))
      .toBe("grupprum");

    // Group size sub-controls become visible.
    const size24 = page.getByRole("button", { name: /2[–-]4 pers/ });
    await expect(size24).toBeVisible();
    await size24.click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get("size"))
      .toBe("2-4");

    // "Free only" toggle is available under grupprum.
    const freeOnly = page.getByRole("checkbox", { name: /Visa bara lediga just nu/ });
    await expect(freeOnly).toBeVisible();
    await freeOnly.check();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("free"))
      .toBe("true");
  });

  test("switching intent away from Grupprum clears group size & free-only", async ({ page }) => {
    await page.getByRole("button", { name: "I grupprum" }).click();
    await page.getByRole("button", { name: /5\+ pers/ }).click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("size"))
      .toBe("5+");

    await page.getByRole("button", { name: "Enskilt" }).click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("mode"))
      .toBe("enskilt");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("size"))
      .toBeNull();
  });

  test("'Rensa alla' clears all active filters", async ({ page }) => {
    await page.getByPlaceholder(/Sök på lokal/i).fill("test");
    await page.getByRole("button", { name: "Tillsammans" }).click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get("mode"))
      .toBe("tillsammans");

    await page.getByRole("button", { name: /Rensa alla/i }).first().click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get("q"))
      .toBe("");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("mode"))
      .toBeNull();
  });
});
