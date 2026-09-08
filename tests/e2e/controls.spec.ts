import { expect, test } from "@playwright/test";

test("the focal clock controls the existing timer across layouts and reloads", async ({
  page,
}) => {
  await page.goto("/");
  const clock = page.getByRole("button", {
    name: "Odak saatini aç",
    exact: true,
  });
  await expect(clock).toHaveAccessibleDescription("25:00");
  await page.getByRole("button", { name: "Odağı başlat", exact: true }).click();
  await expect(clock).toHaveAccessibleDescription(/^24:/);
  await page
    .getByRole("button", { name: "Odağı duraklat", exact: true })
    .click();
  const pausedTime = await page.locator(".library-focus-time").textContent();
  await page.setViewportSize({ width: 390, height: 844 });
  await clock.click();
  await expect(page.getByRole("dialog").getByRole("timer")).toHaveText(
    pausedTime!,
  );
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Başlat", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Odak duraklatıldı", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(clock).toBeFocused();
  await page.reload();
  await expect(clock).toHaveAccessibleDescription(pausedTime!);
  await expect(
    page.getByRole("button", { name: "Odağı başlat", exact: true }),
  ).toBeVisible();
  await clock.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sıfırla", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(clock).toHaveAccessibleDescription("25:00");
});

test("the add controls support keyboard entry, cancellation and saved objects", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-item-id]")).toHaveCount(6);
  const trigger = page.getByRole("button", {
    name: "Kütüphaneye ekle",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Kitap Ekle", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-item-id]")).toHaveCount(7);
  await expect(trigger).toBeFocused();

  for (const [index, name] of [
    "Saksı Ekle",
    "Tablo Ekle",
    "Not Ekle",
  ].entries()) {
    await trigger.click();
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator("[data-item-id]")).toHaveCount(8 + index);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  }
  await page.reload();
  await expect(page.locator("[data-item-id]")).toHaveCount(10);
  await trigger.click();
  await page.getByRole("button", { name: "Raf Ekle", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Raf adı", exact: true }),
  ).toHaveValue("Raf 2");
  await expect(page.locator("[data-item-kind=timer]")).toHaveCount(1);
  await page.getByRole("button", { name: "Önceki raf", exact: true }).click();
  await expect(page.locator("[data-item-id]")).toHaveCount(10);
});
