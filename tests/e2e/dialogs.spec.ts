import { expect, test, type Page } from "@playwright/test";

const openBook = async (page: Page) => {
  await page.locator('[data-item-id="book-1"]').click();
  const dialog = page.getByRole("dialog", { name: /çalışma defteri/ });
  await expect(dialog).toBeVisible();
  return dialog;
};

test("notun boşlukları ve satır sonları kaydetme ve yenilemede korunur", async ({ page }) => {
  await page.goto("/");
  const dialog = await openBook(page);
  const note = "\n  Birinci satır  \n\tİkinci satır\n\n";
  await dialog.getByLabel("Ana not").fill(note);
  await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(dialog).not.toBeVisible();

  await page.reload();
  const reopenedDialog = await openBook(page);
  await expect(reopenedDialog.getByLabel("Ana not")).toHaveValue(note);
  await page.keyboard.press("Escape");
  await expect(reopenedDialog).not.toBeVisible();
});

test("başarısız not kaydı açık pencereden yeniden denenebilir", async ({ page }) => {
  await page.goto("/");
  const dialog = await openBook(page);
  const note = "\n  Yeniden denenecek not  \n\n";
  await dialog.getByLabel("Ana not").fill(note);
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () {
      IDBObjectStore.prototype.put = originalPut;
      throw new DOMException("Simulated quota error", "QuotaExceededError");
    };
  });
  await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
  const retry = dialog.getByRole("button", { name: "Tekrar dene", exact: true });
  await expect(retry).toBeVisible();
  await expect(dialog.getByLabel("Ana not")).toHaveValue(note);
  await retry.click();
  await expect(retry).toHaveCount(0);
  await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(dialog).not.toBeVisible();

  await page.reload();
  const reopenedDialog = await openBook(page);
  await expect(reopenedDialog.getByLabel("Ana not")).toHaveValue(note);
});

test("320px not penceresi taşmaz ve vazgeçilen kapatma odağı editöre döndürür", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  const dialog = await openBook(page);
  const editor = dialog.getByLabel("Ana not");
  await editor.fill("Kaybolmaması gereken taslak");
  await expect.poll(() => dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

  await editor.press("Escape");
  const continueEditing = dialog.getByRole("button", { name: "Düzenlemeye devam et" });
  await expect(continueEditing).toBeFocused();
  await continueEditing.click();
  await expect(editor).toBeFocused();
  await expect(editor).toBeInViewport();
  await expect(editor).toHaveValue("Kaybolmaması gereken taslak");

  await editor.press("Escape");
  await expect(continueEditing).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(continueEditing).not.toBeVisible();
  await expect(editor).toBeFocused();
  await editor.press("Escape");
  await dialog.getByRole("button", { name: "Kaydetmeden kapat" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-item-id="book-1"]')).toBeFocused();
});

test("başka sekmede arşivlenen kitabın açık taslağı korunur ve çakışma görünür", async ({ page, context }) => {
  await page.goto("/");
  const firstDialog = await openBook(page);
  await firstDialog.getByLabel("Ana not").fill("Bu sekmenin kaydedilmemiş notu");

  const otherPage = await context.newPage();
  await otherPage.goto("/");
  const otherDialog = await openBook(otherPage);
  await otherDialog.getByRole("button", { name: "Kaydet ve Depoya Kaldır" }).click();
  await expect(otherDialog).not.toBeVisible();
  await expect(page.locator('[data-item-id="book-1"]')).toHaveCount(0);

  await expect(firstDialog).toBeVisible();
  await expect(firstDialog.getByLabel("Ana not")).toHaveValue("Bu sekmenin kaydedilmemiş notu");
  await firstDialog.getByRole("button", { name: "Kaydet", exact: true }).click();
  const error = firstDialog.getByRole("alert");
  await expect(error).toContainText("başka bir sekmede");
  await expect(error).toBeFocused();
  await expect(firstDialog.getByLabel("Ana not")).toHaveValue("Bu sekmenin kaydedilmemiş notu");
});

test("depo kitabı notuyla birlikte aktif rafa geri getirir", async ({ page }) => {
  await page.goto("/");
  const dialog = await openBook(page);
  await dialog.getByLabel("Ana not").fill("Arşivden geri gelecek not");
  await dialog.getByRole("button", { name: "Kaydet ve Depoya Kaldır" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-item-id="book-1"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Raf yönetimini aç" }).click();
  const manager = page.getByRole("dialog", { name: "Raflar ve Depo" });
  await expect(manager.getByText("Deep Work", { exact: true })).toBeVisible();
  await manager.getByRole("button", { name: "Aktif rafa al" }).click();
  await expect(manager.getByText("Depoda kitap yok.", { exact: false })).toBeVisible();
  await expect(manager.getByRole("heading", { name: "Kitap Deposu" })).toBeFocused();
  await manager.getByRole("button", { name: "Raf yönetimini kapat" }).click();

  const restoredDialog = await openBook(page);
  await expect(restoredDialog.getByLabel("Ana not")).toHaveValue("Arşivden geri gelecek not");
});
