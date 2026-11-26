import { expect, test } from "@playwright/test";

const email = `release-${Date.now()}@example.test`;
const password = "release-test-password-2026";

async function openAccountPanel(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Аккаунт и синхронизация" }).click();
}

async function waitUntilSynced(page: import("@playwright/test").Page) {
  await expect(page.getByText("Синхронизировано", { exact: true })).toBeVisible({ timeout: 20_000 });
}

test("registers an account and synchronizes online/offline edits and deletions between two browser devices", async ({ browser, page }) => {
  await page.goto("/");
  await openAccountPanel(page);
  await page.getByRole("button", { name: "Регистрация", exact: true }).click();
  await page.getByLabel("Электронная почта").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();

  await expect(page.getByText("Выполнен вход", { exact: true })).toBeVisible();
  await waitUntilSynced(page);

  const deviceOne = await page.context().cookies("http://127.0.0.1:4173");
  const secondContext = await browser.newContext();
  await secondContext.addCookies(deviceOne);
  const secondDevice = await secondContext.newPage();
  try {
    await secondDevice.goto("/");
    await openAccountPanel(secondDevice);
    await expect(secondDevice.getByText(email, { exact: true })).toBeVisible();
    await waitUntilSynced(secondDevice);

    await page.evaluate(async () => {
      const { writeRecord } = await import("/src/app/storage.ts");
      await writeRecord("lifeEvents", [{ id: "release-online-event", year: 2026, title: "Запись с первого устройства" }]);
    });
    await waitUntilSynced(page);
    await expect.poll(() => secondDevice.evaluate(async () => {
      const { readRecord } = await import("/src/app/storage.ts");
      const events = await readRecord<Array<{ id: string }>>("lifeEvents");
      return events?.some(event => event.id === "release-online-event") ?? false;
    }), { timeout: 20_000 }).toBe(true);

    await secondContext.setOffline(true);
    await secondDevice.evaluate(async () => {
      const { writeRecord } = await import("/src/app/storage.ts");
      await writeRecord("lifeEvents", [
        { id: "release-online-event", year: 2026, title: "Запись с первого устройства" },
        { id: "release-offline-event", year: 2026, title: "Запись офлайн" },
      ]);
    });
    await expect(secondDevice.getByText("Нет подключения", { exact: true })).toBeVisible({ timeout: 10_000 });
    await secondContext.setOffline(false);
    await waitUntilSynced(secondDevice);

    await expect.poll(() => page.evaluate(async () => {
      const { readRecord } = await import("/src/app/storage.ts");
      const events = await readRecord<Array<{ id: string }>>("lifeEvents");
      return events?.some(event => event.id === "release-offline-event") ?? false;
    }), { timeout: 20_000 }).toBe(true);

    await secondDevice.evaluate(async () => {
      const { writeRecord } = await import("/src/app/storage.ts");
      await writeRecord("lifeEvents", []);
    });
    await waitUntilSynced(secondDevice);
    await expect.poll(() => page.evaluate(async () => {
      const { readRecord } = await import("/src/app/storage.ts");
      return await readRecord<Array<{ id: string }>>("lifeEvents");
    }), { timeout: 20_000 }).toEqual([]);
  } finally {
    await secondContext.close();
  }
});
