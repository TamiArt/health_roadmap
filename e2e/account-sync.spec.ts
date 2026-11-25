import { expect, test } from "@playwright/test";

async function waitForLifeEventInIndexedDb(page: import("@playwright/test").Page, title: string) {
  await expect.poll(() => page.evaluate(async expectedTitle => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("life-maps", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const records = await new Promise<Array<{ key: string; value: unknown }>>((resolve, reject) => {
        const request = database.transaction("app-records", "readonly").objectStore("app-records").getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const lifeEvents = records.find(record => record.key === "lifeEvents")?.value;
      return Array.isArray(lifeEvents) && lifeEvents.some(event =>
        Boolean(event) && typeof event === "object" && "title" in event && event.title === expectedTitle,
      );
    } finally {
      database.close();
    }
  }, title)).toBe(true);
}

test("registers an account and restores its full backup in a separate browser profile", async ({ page, browser }) => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-${unique}@example.test`;
  const password = "e2e-secure-password-2026";
  const eventTitle = `Событие для переноса ${unique}`;

  await page.goto("/");
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить событие" }).click();
  await page.getByPlaceholder("Год (2025)").fill("2026");
  await page.getByPlaceholder("Название события").fill(eventTitle);
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByRole("button", { name: /^Все события/ }).click();
  await expect(page.getByText(eventTitle, { exact: true })).toBeVisible();
  await waitForLifeEventInIndexedDb(page, eventTitle);

  await page.getByRole("button", { name: "Аккаунт и синхронизация" }).click();
  await page.getByRole("button", { name: "Регистрация", exact: true }).click();
  await page.getByLabel("Электронная почта").fill(email);
  await page.getByLabel(/Пароль/).fill(password);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page.getByRole("status")).toContainText("Аккаунт создан");

  await page.getByRole("button", { name: "Сохранить локальные данные в аккаунте" }).click();
  await expect(page.getByRole("status")).toContainText("Все локальные данные и вложения сохранены");

  const secondContext = await browser.newContext();
  try {
    const secondPage = await secondContext.newPage();
    secondPage.on("dialog", dialog => dialog.accept());
    await secondPage.goto("/");
    await secondPage.getByRole("button", { name: "Аккаунт и синхронизация" }).click();
    await secondPage.getByLabel("Электронная почта").fill(email);
    await secondPage.getByLabel(/Пароль/).fill(password);
    await secondPage.getByRole("button", { name: "Войти", exact: true }).click();
    await expect(secondPage.getByRole("status")).toContainText("На сервере есть сохранённые данные");
    await secondPage.getByRole("button", { name: "Восстановить данные из аккаунта" }).click();
    await expect(secondPage.getByRole("status")).toContainText("Данные аккаунта восстановлены на этом устройстве");
    await secondPage.getByRole("button", { name: /^Все события/ }).click();
    await expect(secondPage.getByText(eventTitle, { exact: true })).toBeVisible();
  } finally {
    await secondContext.close();
  }
});
