import { expect, test, type Page } from "@playwright/test";
import type { LibraryState } from "../../src/types/library";

const stateKey = "pomodoro-library-state-v3";

async function readState(page: Page, key = stateKey): Promise<LibraryState> {
  return page.evaluate(async (recordKey) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("pomodoro-library", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<LibraryState>((resolve, reject) => {
        const request = database.transaction("states").objectStore("states").get(recordKey);
        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = () => reject(request.error);
      });
    } finally { database.close(); }
  }, key);
}

async function replaceState(page: Page, value: unknown) {
  await page.evaluate(async ({ recordKey, value }) => {
    const database = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open("pomodoro-library", 1);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("states", "readwrite");
      transaction.objectStore("states").put({ key: recordKey, revision: 100, value });
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  }, { recordKey: stateKey, value });
  await page.reload();
}

async function importState(page: Page, value: LibraryState) {
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles({
    name: "library.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ app: "pomodoro-library", version: 1, data: value })),
  });
  await expect(page.getByRole("status")).toContainText("Yedek doğrulandı ve yüklendi");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Raf adı", exact: true })).toHaveValue("Ana Raf");
});

test("import stops old timers without awards and atomically preserves the actual current record", async ({ page }) => {
  const original = await readState(page);
  const backup = structuredClone(original);
  backup.tasks = [{ id: "imported-task", title: "Imported task", done: false, createdAt: Date.now() }];
  backup.activeFocusSession = {
    id: "old-imported-session", targetBookId: "book-1", status: "running",
    startedAt: Date.now() - 2_000_000, resumedAt: Date.now() - 2_000_000,
    accumulatedSeconds: 0, durationSeconds: 1500,
  };
  // A full localStorage quota must not prevent an IndexedDB-backed recovery.
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("Quota full", "QuotaExceededError"); }; });
  await importState(page, backup);
  const imported = await readState(page);
  expect(imported.activeFocusSession).toBeNull();
  expect(imported.focusSessions).toEqual(original.focusSessions);
  expect(imported.items).toEqual(original.items);
  expect((await readState(page, `${stateKey}:pre-import-backup`)).tasks).toEqual(original.tasks);
  await page.reload();
  expect((await readState(page)).focusSessions).toHaveLength(0);
});

test("a valid backup recovers corrupt storage and preserves the corrupt record", async ({ page }) => {
  const valid = await readState(page);
  const corrupt = { shelves: "unreadable", privateNote: "keep this recovery content" };
  await replaceState(page, corrupt);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Kayıt açılamadı");
  await expect(page.getByRole("button", { name: "Kütüphaneye ekle" })).toHaveCount(0);
  await importState(page, valid);
  await expect(page.getByRole("textbox", { name: "Raf adı", exact: true })).toHaveValue("Ana Raf");
  expect(await readState(page, `${stateKey}:pre-import-backup`)).toEqual(corrupt);
});

test("a failed write remains retryable when a later action is attempted", async ({ page }) => {
  const original = await readState(page);
  await page.getByRole("button", { name: "Görevleri aç" }).click();
  await page.getByRole("textbox", { name: "Yeni görev" }).fill("Keep the failed task");
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () {
      IDBObjectStore.prototype.put = originalPut;
      throw new DOMException("Simulated quota error", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Görev ekle" }).click();
  await expect(page.getByRole("dialog").getByText("Görev kaydedilemedi", { exact: false })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Kapat", exact: true }).click();
  await page.getByRole("button", { name: "Kütüphaneye ekle" }).click();
  await page.getByRole("button", { name: "Kitap Ekle", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Önce kaydedilemeyen değişiklik");
  await page.getByRole("button", { name: "Tekrar dene", exact: true }).click();
  await expect.poll(async () => (await readState(page)).tasks.some((task) => task.title === "Keep the failed task")).toBe(true);
  expect((await readState(page)).items).toHaveLength(original.items.length);
});

test("concurrent tabs preserve separate tasks and complete one expired session once", async ({ page, context }) => {
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByRole("textbox", { name: "Raf adı", exact: true })).toBeVisible();
  for (const tab of [page, second]) await tab.getByRole("button", { name: "Görevleri aç" }).click();
  await page.getByRole("textbox", { name: "Yeni görev" }).fill("First tab task");
  await second.getByRole("textbox", { name: "Yeni görev" }).fill("Second tab task");
  await Promise.all([page, second].map((tab) => tab.getByRole("button", { name: "Görev ekle" }).click()));
  await expect.poll(async () => (await readState(page)).tasks.length).toBe(3);
  const state = await readState(page);
  const now = Date.now();
  state.activeFocusSession = {
    id: "one-natural-completion", targetBookId: null, status: "running",
    startedAt: now - 1_501_000, resumedAt: now - 1_501_000,
    accumulatedSeconds: 0, durationSeconds: 1500,
  };
  await replaceState(page, state);
  await second.reload();
  await expect.poll(async () => (await readState(page)).focusSessions?.length).toBe(1);
  const completed = await readState(page);
  expect(completed.activeFocusSession).toBeNull();
  expect(completed.focusSessions?.[0].awardedXp).toBe(25);
  expect(completed.focusSessions?.[0].completedAt).toBe(now - 1000);
  expect(completed.items.length).toBe(state.items.length + 1);
  await Promise.all([page.reload(), second.reload()]);
  expect((await readState(page)).focusSessions).toHaveLength(1);
});

test("pause survives reload and early finish records elapsed time without rewards", async ({ page }) => {
  await page.locator('[data-item-kind="timer"]').click();
  await page.getByRole("button", { name: "Başlat", exact: true }).click();
  await expect(page.getByRole("button", { name: "Duraklat", exact: true })).toBeVisible();
  await expect.poll(async () => {
    const session = (await readState(page)).activeFocusSession;
    return session?.resumedAt ? Date.now() - session.resumedAt : 0;
  }).toBeGreaterThan(1100);
  await page.getByRole("button", { name: "Duraklat", exact: true }).click();
  const paused = (await readState(page)).activeFocusSession;
  expect(paused?.status).toBe("paused");
  await page.reload();
  await page.locator('[data-item-kind="timer"]').click();
  await expect(page.getByRole("button", { name: "Başlat", exact: true })).toBeVisible();
  expect((await readState(page)).activeFocusSession?.accumulatedSeconds).toBe(paused?.accumulatedSeconds);
  await page.getByRole("button", { name: "Bitir", exact: true }).click();
  await expect.poll(async () => (await readState(page)).focusSessions?.length).toBe(1);
  const finished = await readState(page);
  expect(finished.activeFocusSession).toBeNull();
  expect(finished.focusSessions?.[0].completion).toBe("ended-early");
  expect(finished.focusSessions?.[0].awardedXp).toBe(0);
  expect(finished.focusSessions?.[0].durationSeconds).toBeLessThan(10);
});

test("retrying a stale pause never pauses a replacement session from another tab", async ({ page, context }) => {
  await page.locator('[data-item-kind="timer"]').click();
  await page.getByRole("button", { name: "Başlat", exact: true }).click();
  const firstSession = (await readState(page)).activeFocusSession;
  const second = await context.newPage();
  await second.goto("/");
  await second.locator('[data-item-kind="timer"]').click();
  await expect(second.getByRole("button", { name: "Duraklat", exact: true })).toBeVisible();
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () {
      IDBObjectStore.prototype.put = originalPut;
      throw new DOMException("Simulated quota error", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Duraklat", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Tekrar dene", exact: true })).toBeVisible();
  await second.getByRole("button", { name: "Sıfırla", exact: true }).click();
  await expect(second.getByRole("button", { name: "Başlat", exact: true })).toBeEnabled();
  await second.getByRole("button", { name: "Başlat", exact: true }).click();
  const replacement = (await readState(second)).activeFocusSession;
  expect(replacement?.id).not.toBe(firstSession?.id);
  await page.getByRole("dialog").getByRole("button", { name: "Tekrar dene", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Tekrar dene", exact: true })).toHaveCount(0);
  expect((await readState(page)).activeFocusSession).toEqual(replacement);
});

test("mobile task list stays usable with fifty tasks and many shelves", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await readState(page);
  state.tasks = Array.from({ length: 50 }, (_, index) => ({
    id: `long-list-task-${index}`, title: `Görev ${index + 1}`, done: false, createdAt: Date.now(),
  }));
  state.shelves.push(...Array.from({ length: 19 }, (_, index) => ({
    id: `extra-shelf-${index}`, title: `Raf ${index + 2}`, rowCount: 3,
  })));
  await replaceState(page, state);
  const navigation = page.getByRole("button", { name: "Görevleri aç" });
  await expect(navigation).toBeInViewport();
  await navigation.click();
  const dialog = page.getByRole("dialog", { name: "Görevler", exact: true });
  const lastTask = dialog.getByRole("button", { name: "Görev 50", exact: true });
  await lastTask.scrollIntoViewIfNeeded();
  await lastTask.click();
  await expect(lastTask).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByRole("button", { name: "Kapat", exact: true })).toBeInViewport();
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(navigation).toBeFocused();
  expect((await readState(page)).shelves).toHaveLength(20);
});
