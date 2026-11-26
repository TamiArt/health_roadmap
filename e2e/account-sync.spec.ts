import { expect, test, type Page } from "@playwright/test";

async function addLifeEvent(page: Page, title: string) {
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить событие" }).click();
  await page.getByPlaceholder("Год (2025)").fill("2026");
  await page.getByPlaceholder("Название события").fill(title);
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByRole("button", { name: /^Все события/ }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

async function accountId(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const response = await fetch("/api/auth/me");
    const body = await response.json() as { user: { id: string } };
    return body.user.id;
  });
}

test("automatically syncs records and attachments across devices and retries queued offline changes", async ({ page, browser }) => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `sync-${unique}@example.test`;
  const password = "e2e-secure-password-2026";
  const firstEvent = `Первая запись ${unique}`;
  const secondEvent = `Изменение второго устройства ${unique}`;

  await page.goto("/");
  await addLifeEvent(page, firstEvent);
  await page.getByRole("button", { name: "Аккаунт и синхронизация" }).click();
  await page.getByRole("button", { name: "Регистрация", exact: true }).click();
  await page.getByLabel("Электронная почта").fill(email);
  await page.getByLabel(/Пароль/).fill(password);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect.poll(async () => page.locator('[aria-label="Резервное копирование"]').innerText(), { timeout: 20000 }).toContain("Синхронизировано");

  const ownerId = await accountId(page);
  await page.evaluate(async ({ ownerId }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("life-maps", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("app-records", "readwrite");
      tx.objectStore("app-records").put({
        key: `${ownerId}::labUploads`,
        value: { cbc: [{ id: "attachment-e2e", name: "analysis.pdf", blob: new Blob(["medical-document"], { type: "application/pdf" }) }] },
        revision: 1,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    const channel = new BroadcastChannel("life-maps:records");
    channel.postMessage({ key: "labUploads", scope: ownerId, revision: 2, value: {} });
    channel.close();
  }, { ownerId });
  await expect.poll(async () => {
    const response = await page.request.get("/api/data");
    const body = await response.json() as { payload: { records: Record<string, unknown> } };
    const uploads = body.payload.records.labUploads as { cbc?: Array<{ blob?: { base64?: string } }> };
    return uploads?.cbc?.[0]?.blob?.base64;
  }, { timeout: 20000 }).toBe("bWVkaWNhbC1kb2N1bWVudA==");

  const secondContext = await browser.newContext();
  try {
    const secondPage = await secondContext.newPage();
    await secondPage.goto("/");
    await secondPage.getByRole("button", { name: "Аккаунт и синхронизация" }).click();
    await secondPage.getByLabel("Электронная почта").fill(email);
    await secondPage.getByLabel(/Пароль/).fill(password);
    await secondPage.getByRole("button", { name: "Войти", exact: true }).click();

    // Login triggers an automatic pull; no manual restore action is available or needed.
    await expect(secondPage.getByText("Синхронизировано", { exact: true })).toBeVisible({ timeout: 20000 });
    await secondPage.getByRole("button", { name: /^Все события/ }).click();
    await expect(secondPage.getByText(firstEvent, { exact: true })).toBeVisible();
    const restoredAttachment = await secondPage.evaluate(async ({ ownerId }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("life-maps", 2);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const record = await new Promise<{ value: { cbc: Array<{ blob: Blob }> } }>((resolve, reject) => {
          const request = db.transaction("app-records", "readonly").objectStore("app-records").get(`${ownerId}::labUploads`);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        return await record.value.cbc[0].blob.text();
      } finally { db.close(); }
    }, { ownerId });
    expect(restoredAttachment).toBe("medical-document");

    await secondContext.setOffline(true);
    await addLifeEvent(secondPage, secondEvent);
    await expect(secondPage.getByText("Нет подключения", { exact: true })).toBeVisible({ timeout: 10000 });
    await secondContext.setOffline(false);
    await expect(secondPage.getByText("Синхронизировано", { exact: true })).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: /^Все события/ }).click();
    await expect(page.getByText(secondEvent, { exact: true })).toBeVisible({ timeout: 20000 });
  } finally {
    await secondContext.close();
  }
});

test("keeps two accounts in separate local workspaces in the same browser profile", async ({ page }) => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const firstEmail = `first-${unique}@example.test`;
  const secondEmail = `second-${unique}@example.test`;
  const password = "e2e-secure-password-2026";
  const privateEvent = `Только первый аккаунт ${unique}`;

  await page.goto("/");
  await addLifeEvent(page, privateEvent);
  await page.getByRole("button", { name: "Аккаунт и синхронизация" }).click();
  await page.getByRole("button", { name: "Регистрация", exact: true }).click();
  await page.getByLabel("Электронная почта").fill(firstEmail);
  await page.getByLabel(/Пароль/).fill(password);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page.getByText("Синхронизировано", { exact: true })).toBeVisible({ timeout: 20000 });

  await page.getByRole("button", { name: "Выйти" }).click();
  await page.getByRole("button", { name: "Аккаунт и синхронизация" }).click();
  await page.getByRole("button", { name: "Регистрация", exact: true }).click();
  await page.getByLabel("Электронная почта").fill(secondEmail);
  await page.getByLabel(/Пароль/).fill(password);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page.getByText("Синхронизировано", { exact: true })).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: /^Все события/ }).click();
  await expect(page.getByText(privateEvent, { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Выйти" }).click();
  await page.getByRole("button", { name: "Аккаунт и синхронизация" }).click();
  await page.getByLabel("Электронная почта").fill(firstEmail);
  await page.getByLabel(/Пароль/).fill(password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.getByText("Синхронизировано", { exact: true })).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: /^Все события/ }).click();
  await expect(page.getByText(privateEvent, { exact: true })).toBeVisible();
});
