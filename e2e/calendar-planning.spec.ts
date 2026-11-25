import { expect, test } from "@playwright/test";

test("medical calendar creates, links, completes and persists planned events", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("life-maps", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const source = [{ id: "calendar-history-source", date: "2026-11-20", kind: "other", title: "Приём терапевта", description: "Осмотр", facility: "Клиника" }];
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("app-records", "readwrite");
      transaction.objectStore("app-records").put({ key: "guest::healthEvents", value: source, revision: 1 });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
    const channel = new BroadcastChannel("life-maps:records");
    channel.postMessage({ key: "healthEvents", scope: "guest", revision: 1, value: source });
    channel.close();
  });

  await page.getByRole("button", { name: "Календарь" }).click();
  await expect(page.getByRole("heading", { name: "Планы и напоминания" })).toBeVisible();
  await page.getByRole("button", { name: "Добавить событие" }).click();
  await page.getByLabel("Тип события").selectOption("appointment");
  await page.getByLabel("Название", { exact: true }).fill("Контрольный приём терапевта");
  await page.getByLabel("Дата начала").fill("2026-12-10");
  await page.getByLabel("Время").fill("10:30");
  await page.getByLabel("Врач / учреждение / место").fill("Городская клиника");
  await page.getByLabel("Связать с медицинской историей").selectOption("health:calendar-history-source");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();

  const planned = page.locator("article").filter({ hasText: "Контрольный приём терапевта" }).last();
  await expect(planned).toContainText("Приём врача");
  await expect(planned).toContainText("Связано: Событие здоровья");
  await expect(planned).toContainText("Городская клиника");

  await page.reload();
  await page.getByRole("button", { name: "Календарь" }).click();
  const restored = page.locator("article").filter({ hasText: "Контрольный приём терапевта" }).last();
  await expect(restored).toContainText("Запланировано");
  await restored.getByRole("button", { name: "Отметить выполненным" }).click();
  await expect(restored).toContainText("Выполнено");
});

test("treatment courses keep their end date and can be edited or deleted", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Календарь" }).click();
  await page.getByRole("button", { name: "Добавить событие" }).click();
  await page.getByLabel("Тип события").selectOption("treatment");
  await page.getByLabel("Название", { exact: true }).fill("Курс лечения");
  await page.getByLabel("Дата начала").fill("2026-12-01");
  await page.getByLabel("Дата окончания курса").fill("2026-12-14");
  await page.getByLabel("Примечания, схема или подготовка").fill("Схема по назначению врача");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();

  const course = page.locator("article").filter({ hasText: "Курс лечения" }).last();
  await expect(course).toContainText("Курс до 2026-12-14");
  await course.getByRole("button", { name: "Изменить: Курс лечения" }).click();
  await page.getByLabel("Дата окончания курса").fill("2026-12-15");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.locator("article").filter({ hasText: "Курс лечения" }).last()).toContainText("Курс до 2026-12-15");

  page.once("dialog", dialog => dialog.accept());
  await page.locator("article").filter({ hasText: "Курс лечения" }).last().getByRole("button", { name: "Удалить: Курс лечения" }).click();
  await expect(page.locator("article").filter({ hasText: "Курс лечения" })).toHaveCount(0);
});
