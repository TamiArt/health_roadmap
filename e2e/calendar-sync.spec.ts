import { expect, test } from "@playwright/test";

test("synchronizes planned medical calendar events to a second device", async ({ page, browser }) => {
  test.setTimeout(60000);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `calendar-${unique}@example.test`;
  const password = "calendar-sync-password-2026";
  const title = `Синхронизируемый план ${unique}`;

  await page.goto("/");
  await page.getByRole("button", { name: "Календарь" }).click();
  await page.getByRole("button", { name: "Добавить событие" }).click();
  await page.getByLabel("Тип события").selectOption("examination");
  await page.getByLabel("Название", { exact: true }).fill(title);
  await page.getByLabel("Дата начала").fill("2026-12-20");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();

  await page.getByRole("button", { name: "Аккаунт и синхронизация" }).click();
  await page.getByRole("tab", { name: "Регистрация", exact: true }).click();
  await page.getByLabel("Электронная почта").fill(email);
  await page.getByLabel(/Пароль/).fill(password);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect.poll(async () => page.locator('[aria-label="Резервное копирование"]').innerText(), { timeout: 20000 }).toContain("Синхронизировано");

  const secondContext = await browser.newContext();
  try {
    const secondPage = await secondContext.newPage();
    await secondPage.goto("/");
    await secondPage.getByRole("button", { name: "Аккаунт и синхронизация" }).click();
    await secondPage.getByLabel("Электронная почта").fill(email);
    await secondPage.getByLabel(/Пароль/).fill(password);
    await secondPage.getByRole("button", { name: "Войти", exact: true }).click();
    await expect(secondPage.getByText("Синхронизировано", { exact: true })).toBeVisible({ timeout: 20000 });
    await secondPage.getByRole("button", { name: "Календарь" }).click();
    await expect(secondPage.getByText(title, { exact: true })).toBeVisible();
  } finally {
    await secondContext.close();
  }
});
