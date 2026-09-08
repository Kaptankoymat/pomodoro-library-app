import { expect, test } from "@playwright/test";
import {
  DEFAULT_SHELF_ROWS,
  getInitialLibraryState,
} from "../../src/lib/libraryInventory";

test("many shelves keep mobile navigation from covering library controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const state = getInitialLibraryState();
  state.shelves.push(
    ...Array.from({ length: 119 }, (_, index) => ({
      id: `navigation-shelf-${index}`,
      title: `Raf ${index + 2}`,
      rowCount: DEFAULT_SHELF_ROWS,
    })),
  );
  await page.addInitScript((initial) => {
    localStorage.setItem("pomodoro-library-state-v3", JSON.stringify(initial));
  }, state);
  await page.goto("/");
  const shelfName = page.getByRole("textbox", { name: "Raf adı", exact: true });
  await expect(shelfName).toHaveValue("Ana Raf");
  await page.getByRole("button", { name: "Sonraki raf", exact: true }).click();
  await expect(shelfName).toHaveValue("Raf 2");
  await page.getByRole("button", { name: "Önceki raf", exact: true }).click();
  await expect(shelfName).toHaveValue("Ana Raf");

  const taskNote = page.locator('[data-item-id="sticky"]');
  await taskNote.scrollIntoViewIfNeeded();
  // A geometrically visible item can still be covered by fixed navigation.
  await expect
    .poll(() =>
      taskNote.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        );
        return hit === element || (hit !== null && element.contains(hit));
      }),
    )
    .toBe(true);
  await taskNote.click();
  await expect(
    page.getByRole("dialog", { name: "Görevler", exact: true }),
  ).toBeVisible();
});
