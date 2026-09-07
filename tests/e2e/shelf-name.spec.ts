import { expect, test, type Page } from "@playwright/test";

async function readShelfTitle(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("pomodoro-library", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<string>((resolve, reject) => {
        const request = database.transaction("states").objectStore("states").get("pomodoro-library-state-v3");
        request.onsuccess = () => {
          const state = request.result.value;
          resolve(state.shelves.find((shelf: { id: string }) => shelf.id === state.activeShelfId).title);
        };
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Raf adı", exact: true })).toHaveValue("Ana Raf");
});

test("rapid shelf typing remains intact and saves once editing finishes", async ({ page }) => {
  const input = page.getByRole("textbox", { name: "Raf adı", exact: true });
  const title = "Okuma ve Calisma Kitapligi";
  await input.fill("");
  await input.pressSequentially(title, { delay: 0 });
  await expect(input).toHaveValue(title);
  expect(await readShelfTitle(page)).toBe("Ana Raf");

  await input.press("Tab");
  await expect.poll(() => readShelfTitle(page)).toBe(title);
  await page.reload();
  await expect(input).toHaveValue(title);
});

test("Escape cancels a shelf draft and Enter commits the next edit", async ({ page }) => {
  const input = page.getByRole("textbox", { name: "Raf adı", exact: true });
  await input.fill("Vazgecilen raf adi");
  await input.press("Escape");
  await expect(input).toHaveValue("Ana Raf");
  expect(await readShelfTitle(page)).toBe("Ana Raf");
  await page.reload();
  await expect(input).toHaveValue("Ana Raf");

  await input.fill("Kaydedilen raf adi");
  await input.press("Enter");
  await expect.poll(() => readShelfTitle(page)).toBe("Kaydedilen raf adi");
  await page.reload();
  await expect(input).toHaveValue("Kaydedilen raf adi");
});

test("an idle field receives another tab's saved shelf title", async ({ page, context }) => {
  const otherPage = await context.newPage();
  await otherPage.goto("/");
  const otherInput = otherPage.getByRole("textbox", { name: "Raf adı", exact: true });
  await expect(otherInput).toHaveValue("Ana Raf");
  await otherInput.fill("Diger sekmenin rafi");
  await otherInput.press("Enter");

  await expect(page.getByRole("textbox", { name: "Raf adı", exact: true })).toHaveValue("Diger sekmenin rafi");
});

test("a failed shelf save preserves its draft until retry", async ({ page }) => {
  const input = page.getByRole("textbox", { name: "Raf adı", exact: true });
  await input.fill("Korunacak raf taslagi");
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () {
      IDBObjectStore.prototype.put = originalPut;
      throw new DOMException("Simulated quota error", "QuotaExceededError");
    };
  });
  await input.press("Enter");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveValue("Korunacak raf taslagi");
  expect(await readShelfTitle(page)).toBe("Ana Raf");

  await page.getByRole("button", { name: "Tekrar dene", exact: true }).click();
  await expect.poll(() => readShelfTitle(page)).toBe("Korunacak raf taslagi");
  await input.focus();
  await input.press("Enter");
  await expect(input).not.toHaveAttribute("aria-invalid");
  await page.reload();
  await expect(input).toHaveValue("Korunacak raf taslagi");
});
