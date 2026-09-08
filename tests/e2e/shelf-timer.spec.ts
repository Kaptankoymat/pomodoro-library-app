import { expect, test, type Page } from "@playwright/test";
import {
  createBookItem,
  getInitialLibraryState,
} from "../../src/lib/libraryInventory";
import type { LibraryState } from "../../src/types/library";

async function savedItems(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("pomodoro-library", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<LibraryState["items"]>((resolve, reject) => {
        const request = database
          .transaction("states")
          .objectStore("states")
          .get("pomodoro-library-state-v3");
        request.onsuccess = () => resolve(request.result.value.items);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });
}

for (const width of [1366, 1440, 1920]) {
  test(`the single large clock belongs to the bookshelf at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const timer = page.locator('[data-item-kind="timer"]');
    await expect(timer).toHaveCount(1);
    await expect(page.locator(".shelf-timer-device")).toHaveCount(1);
    await expect(page.locator(".library-focus-dock")).toHaveCount(0);
    const device = await timer.boundingBox();
    const cabinet = await page.locator(".library-bookcase").boundingBox();
    expect(device!.width).toBeGreaterThanOrEqual(480);
    expect(device!.height).toBeGreaterThanOrEqual(110);
    expect(device!.y).toBeGreaterThan(cabinet!.y);
    expect(device!.y + device!.height).toBeLessThanOrEqual(
      cabinet!.y + cabinet!.height,
    );
    expect(device!.x).toBeGreaterThanOrEqual(cabinet!.x);
    expect(device!.x + device!.width).toBeLessThanOrEqual(
      cabinet!.x + cabinet!.width,
    );
    await expect(timer).toHaveAttribute("data-grid-row", "1");
  });
}

test("the expanded clock drags without jumping its saved anchor or opening controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const timer = page.locator('[data-item-kind="timer"]');
  await expect(timer).toHaveAttribute("data-grid-col", "4");
  await page.waitForTimeout(200);
  const before = await savedItems(page);
  const box = await timer.boundingBox();
  const book = await page.locator('[data-item-id="book-1"]').boundingBox();
  const source = { x: box!.x + 22, y: box!.y + box!.height - 9 };
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(source.x + 4 * (book!.width + 8), source.y, {
    steps: 10,
  });
  await expect(page.locator("[data-drag-ghost]")).toHaveCount(1);
  await page.mouse.up();
  await expect(timer).toHaveAttribute("data-grid-col", "8");
  await expect(timer).toHaveAttribute("data-grid-row", "1");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(timer).toHaveAttribute("data-grid-col", "8");
  const after = await savedItems(page);
  expect(after).toEqual(
    before.map((item) => (item.kind === "timer" ? { ...item, col: 8 } : item)),
  );
});

test("a full clock row preserves every object and keeps a large usable clock", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const state = getInitialLibraryState();
  const timer = state.items.find((item) => item.kind === "timer")!;
  const columns = Array.from({ length: 28 }, (_, col) => col).filter(
    (col) => col < 4 || col >= 8,
  );
  state.items.push(
    ...columns.map((col) =>
      createBookItem({
        id: `crowded-${col}`,
        shelfId: timer.shelfId,
        title: `Kitap ${col}`,
        position: { row: 1, col },
        createdAt: 1,
      }),
    ),
  );
  await page.addInitScript((initial) => {
    localStorage.setItem("pomodoro-library-state-v3", JSON.stringify(initial));
  }, state);
  await page.goto("/");
  await expect(page.locator('[data-item-kind="timer"]')).toHaveCount(1);
  const original = await savedItems(page);
  const clock = page.locator('[data-item-kind="timer"]');
  const clockBox = await clock.boundingBox();
  expect(clockBox!.width).toBeGreaterThanOrEqual(480);
  for (const book of await page.locator('[data-item-id^="crowded-"]').all()) {
    const box = await book.boundingBox();
    const overlap =
      Math.min(box!.x + box!.width, clockBox!.x + clockBox!.width) >
        Math.max(box!.x, clockBox!.x) &&
      Math.min(box!.y + box!.height, clockBox!.y + clockBox!.height) >
        Math.max(box!.y, clockBox!.y);
    expect(overlap).toBe(false);
    await expect(book).toHaveAttribute("data-grid-row", "1");
  }
  await clock
    .getByRole("button", { name: "Odak saatini aç", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Odak saatini aç", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".shelf-timer-device")).toHaveCount(1);
  expect(await savedItems(page)).toEqual(original);
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(await savedItems(page)).toEqual(original);
});
