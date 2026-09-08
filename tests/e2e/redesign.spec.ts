import { expect, test, type Page } from "@playwright/test";
import { getInitialLibraryState } from "../../src/lib/libraryInventory";
import type { LibraryState } from "../../src/types/library";

async function readState(page: Page): Promise<LibraryState> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("pomodoro-library", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<LibraryState>((resolve, reject) => {
        const request = database
          .transaction("states")
          .objectStore("states")
          .get("pomodoro-library-state-v3");
        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });
}

async function openLibrary(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("textbox", { name: "Raf adı", exact: true }),
  ).toHaveValue("Ana Raf");
  await expect(page.locator("[data-item-id]")).toHaveCount(6);
}

for (const width of [320, 390, 768, 900, 1366, 1440, 1920, 2560]) {
  test(`library fits ${width}px with reachable objects and no browser errors`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await openLibrary(page);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      )
      .toBeLessThanOrEqual(1);
    for (const item of await page.locator("[data-item-id]").all()) {
      await item.scrollIntoViewIfNeeded();
      await expect(item).toBeInViewport();
      const box = await item.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      if (width <= 900) {
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    }
    expect(errors).toEqual([]);
  });
}

test("changing between desktop, tablet and phone never rewrites a saved arrangement", async ({
  page,
}) => {
  await openLibrary(page);
  const original = await readState(page);
  for (const width of [390, 768, 2560, 320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    if (width <= 900)
      await expect(page.locator("[data-mobile-library]")).toBeVisible();
    else await expect(page.locator("[data-mobile-library]")).toHaveCount(0);
    expect((await readState(page)).items).toEqual(original.items);
  }
  await page.reload();
  await expect(page.locator("[data-item-id]")).toHaveCount(6);
  expect((await readState(page)).items).toEqual(original.items);
});

test.describe("mobile shelf workflows", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("placement is keyboard accessible, can cancel and persists only an explicit move", async ({
    page,
  }) => {
    await openLibrary(page);
    const original = await readState(page);
    await page
      .getByRole("button", { name: "Rafı düzenle", exact: true })
      .click();
    const book = page.locator('[data-item-id="book-1"]');
    await book.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", {
      name: "Yerini değiştir",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Raf katı", { exact: true }).selectOption("3");
    await dialog.getByLabel("Raf sırası", { exact: true }).selectOption("20");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(book).toBeFocused();
    expect((await readState(page)).items).toEqual(original.items);

    await page.keyboard.press("Enter");
    await dialog.getByLabel("Raf katı", { exact: true }).selectOption("3");
    await dialog.getByLabel("Raf sırası", { exact: true }).selectOption("20");
    await dialog
      .getByRole("button", { name: "Yerleştir", exact: true })
      .click();
    await expect(book).toHaveAttribute("data-grid-row", "3");
    await expect(book).toHaveAttribute("data-grid-col", "20");
    await page.reload();
    await expect(book).toHaveAttribute("data-grid-row", "3");
    await expect(book).toHaveAttribute("data-grid-col", "20");
    const moved = (await readState(page)).items.find(
      (item) => item.id === "book-1",
    )!;
    expect(moved).toEqual({
      ...original.items.find((item) => item.id === "book-1"),
      row: 3,
      col: 20,
    });
  });

  test("mobile side placement rejects a tall note at the bottom and preserves valid swaps", async ({
    page,
  }) => {
    const state = getInitialLibraryState();
    state.tasks = Array.from({ length: 7 }, (_, index) => ({
      id: `mobile-task-${index}`,
      title: `Görev ${index + 1}`,
      done: false,
      createdAt: 1,
    }));
    await page.addInitScript((initial) => {
      localStorage.setItem(
        "pomodoro-library-state-v3",
        JSON.stringify(initial),
      );
    }, state);
    await openLibrary(page);
    await page
      .getByRole("button", { name: "Rafı düzenle", exact: true })
      .click();
    const note = page.locator('[data-item-id="sticky"]');
    await note.click();
    const dialog = page.getByRole("dialog", {
      name: "Yerini değiştir",
      exact: true,
    });
    await dialog.getByLabel("Konum", { exact: true }).selectOption("shelf");
    await dialog.getByLabel("Raf katı", { exact: true }).selectOption("3");
    await dialog.getByLabel("Raf sırası", { exact: true }).selectOption("12");
    await expect(dialog.getByRole("status")).toContainText("yeterli yer yok");
    await expect(
      dialog.getByRole("button", { name: "Yerleştir", exact: true }),
    ).toBeDisabled();
    await dialog.getByRole("button", { name: "Vazgeç", exact: true }).click();
    await expect(note).toHaveAttribute("data-side-placement", "left-column");
    await expect(note).toHaveAttribute("data-side-slot", "6");

    await page.locator('[data-item-id="painting"]').click();
    await dialog
      .getByLabel("Konum", { exact: true })
      .selectOption("left-column");
    await dialog.getByLabel("Süsleme yeri", { exact: true }).selectOption("6");
    await expect(dialog.getByRole("status")).toContainText(
      "yer değiştirilecek",
    );
    await dialog
      .getByRole("button", { name: "Yerleştir", exact: true })
      .click();
    await expect(note).toHaveAttribute("data-side-placement", "right-column");
    await expect(note).toHaveAttribute("data-side-slot", "2");
    await expect(page.locator('[data-item-id="painting"]')).toHaveAttribute(
      "data-side-placement",
      "left-column",
    );

    await note.click();
    await dialog.getByLabel("Konum", { exact: true }).selectOption("shelf");
    await dialog.getByLabel("Raf katı", { exact: true }).selectOption("0");
    await dialog.getByLabel("Raf sırası", { exact: true }).selectOption("20");
    await dialog
      .getByRole("button", { name: "Yerleştir", exact: true })
      .click();
    await expect(note).toHaveAttribute("data-grid-row", "0");
    const preview = note.locator(".library-paper-note");
    await expect(preview.locator(".library-paper-task")).toHaveCount(7);
    const noteBox = await preview.boundingBox();
    const lastTaskBox = await preview
      .locator(".library-paper-task")
      .last()
      .boundingBox();
    expect(lastTaskBox!.y + lastTaskBox!.height).toBeLessThanOrEqual(
      noteBox!.y + noteBox!.height,
    );
  });

  test("books, focus selection, timer and task notes remain usable on a phone", async ({
    page,
  }) => {
    await openLibrary(page);
    await page.locator('[data-item-id="book-1"]').click();
    const notebook = page.getByRole("dialog", { name: /çalışma defteri/ });
    await notebook
      .getByLabel("Ana not", { exact: true })
      .fill("Bugün bir sayfa daha.");
    await notebook.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(notebook).toHaveCount(0);
    await page.locator('[data-item-kind="timer"]').click();
    const timer = page.getByRole("dialog", { name: "Odak saati", exact: true });
    await timer.getByRole("button", { name: "Kitap seç", exact: true }).click();
    await page.locator('[data-item-id="book-1"]').click();
    await expect(
      timer.getByRole("heading", { name: "Deep Work", exact: true }),
    ).toBeVisible();
    await timer.getByRole("button", { name: "Başlat", exact: true }).click();
    await expect(
      timer.getByRole("button", { name: "Duraklat", exact: true }),
    ).toBeEnabled();
    await timer.getByRole("button", { name: "Duraklat", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.locator('[data-item-id="sticky"]').click();
    const tasks = page.getByRole("dialog", { name: "Görevler", exact: true });
    await tasks
      .getByRole("textbox", { name: "Yeni görev", exact: true })
      .fill("İkinci bölümü oku");
    await tasks
      .getByRole("button", { name: "Görev ekle", exact: true })
      .click();
    await expect(
      tasks.getByRole("button", { name: "İkinci bölümü oku", exact: true }),
    ).toBeVisible();
    const saved = await readState(page);
    expect(saved.activeFocusSession?.status).toBe("paused");
    expect(saved.activeFocusSession?.targetBookId).toBe("book-1");
    expect(saved.items.find((item) => item.id === "book-1")).toHaveProperty(
      "note",
      "Bugün bir sayfa daha.",
    );
    expect(saved.tasks.some((task) => task.title === "İkinci bölümü oku")).toBe(
      true,
    );
  });

  test("phone customization keeps unlocked costumes reachable and saves the chosen cover", async ({
    page,
  }) => {
    const initial = getInitialLibraryState();
    initial.wardrobe!.unlockedCostumeIds.push("book:arcane");
    await page.addInitScript((state) => {
      localStorage.setItem("pomodoro-library-state-v3", JSON.stringify(state));
    }, initial);
    await openLibrary(page);
    await page.getByRole("button", { name: /^Kost[uü]mler$/ }).click();
    await page.locator('[data-item-id="book-1"]').click();
    const panel = page.locator("[data-wardrobe-panel]");
    await panel.locator('[data-costume-card="book:arcane"]').click();
    await panel.getByRole("button", { name: "Uygula", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await readState(page)).items.find((item) => item.id === "book-1")
            ?.costumeId,
      )
      .toBe("book:arcane");
    expect(
      await panel.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await panel.getByRole("button", { name: /panelini kapat/ }).click();
    await page.reload();
    await expect(page.locator('[data-item-id="book-1"]')).toBeVisible();
    expect(
      (await readState(page)).items.find((item) => item.id === "book-1")
        ?.costumeId,
    ).toBe("book:arcane");
  });
});
