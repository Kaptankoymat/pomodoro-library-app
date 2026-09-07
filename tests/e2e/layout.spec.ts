import { expect, test, type Locator, type Page } from "@playwright/test";
import { getInitialLibraryState } from "../../src/lib/libraryInventory";

const seedShelf = async (page: Page) => {
  const initial = getInitialLibraryState();
  const state = {
    ...initial,
    tasks: Array.from({ length: 7 }, (_, index) => ({
      id: `task-${index}`, title: `Task ${index}`, done: false, createdAt: 1, updatedAt: 1,
    })),
    items: initial.items.map((item) => {
      if (item.kind === "timer") return { ...item, row: 3, col: 0 };
      if (item.kind === "plant") return { ...item, row: 0, col: 20 };
      if (item.kind === "painting") return { ...item, placement: "shelf", sideSlot: undefined, row: 0, col: 4 };
      return item;
    }),
  };
  await page.addInitScript((initialState) => {
    localStorage.setItem("pomodoro-library-state-v3", JSON.stringify(initialState));
  }, state);
  await page.goto("/");
  await expect(page.locator('[data-item-id="painting"]')).toHaveAttribute("data-grid-col", "4");
  // The first ResizeObserver measurement briefly disables dragging.
  await page.waitForTimeout(200);
};

const center = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Drag target is not rendered");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const beginDrag = async (page: Page, item: Locator, target: { x: number; y: number }) => {
  const source = await center(item);
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await expect(page.locator("[data-drag-ghost]")).toHaveCount(1);
};

for (const width of [1280, 390]) {
  test.describe(`${width}px shelf dragging`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("swaps a shelf painting with a side note using its expanded task size", async ({ page }) => {
      await seedShelf(page);
      const painting = page.locator('[data-item-id="painting"]');
      const note = page.locator('[data-item-id="sticky"]');
      await beginDrag(page, painting, await center(note));
      await expect(page.locator("[data-side-placement-preview]")).toHaveAttribute("data-side-placement-preview", "swap");
      await page.mouse.up();

      await expect(painting).toHaveAttribute("data-side-placement", "left-column");
      await expect(painting).toHaveAttribute("data-side-slot", "6");
      await expect(note).toHaveAttribute("data-grid-col", "4");
      await expect(note).toHaveAttribute("data-grid-row", "0");
      const book = await page.locator('[data-item-id="book-1"]').boundingBox();
      const noteBox = await note.boundingBox();
      expect(noteBox!.height).toBeGreaterThan(book!.height * 2);
      await expect(page.locator("[data-drag-ghost]")).toHaveCount(0);
      await expect(page.getByRole("dialog")).toHaveCount(0);

      await page.reload();
      await expect(page.locator("[data-item-id]")).toHaveCount(6);
      await expect(painting).toHaveAttribute("data-side-slot", "6");
      await expect(note).toHaveAttribute("data-grid-col", "4");
    });

    test("rejects a tall side note near the bottom without moving or opening it", async ({ page }) => {
      await seedShelf(page);
      const note = page.locator('[data-item-id="sticky"]');
      const book = await page.locator('[data-item-id="book-1"]').boundingBox();
      const noteBox = await note.boundingBox();
      const cellHeight = (book!.height + 0.4) / 0.95;
      await beginDrag(page, note, {
        x: book!.x + 4 * (book!.width + 8) + noteBox!.width / 2,
        y: book!.y + 2 * (cellHeight + 8 + 18) + noteBox!.height / 2,
      });
      const preview = page.locator("[data-placement-preview]");
      await expect(preview).toHaveAttribute("data-placement-preview", "blocked");
      expect(await preview.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(book!.height * 2);
      await page.mouse.up();

      await expect(note).toHaveAttribute("data-side-placement", "left-column");
      await expect(note).toHaveAttribute("data-side-slot", "6");
      await expect(page.locator("[data-item-id]")).toHaveCount(6);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test("cancels dragging on Escape and window blur without committing the later release", async ({ page }) => {
      await seedShelf(page);
      const book = page.locator('[data-item-id="book-1"]');
      for (const reason of ["escape", "blur"]) {
        const source = await center(book);
        await beginDrag(page, book, { x: source.x + 70, y: source.y + 10 });
        if (reason === "escape") await page.keyboard.press("Escape");
        else await page.evaluate(() => window.dispatchEvent(new Event("blur")));
        await expect(page.locator("[data-drag-ghost]")).toHaveCount(0);
        await page.waitForTimeout(200);
        await page.mouse.up();
        await expect(book).toHaveAttribute("data-grid-col", "0");
        await expect(book).toHaveAttribute("data-grid-row", "0");
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
      await book.click();
      await expect(page.getByRole("dialog", { name: /çalışma defteri/ })).toBeVisible();
    });
  });
}
