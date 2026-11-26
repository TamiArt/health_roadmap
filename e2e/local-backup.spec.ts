import { expect, test } from "@playwright/test";

test("local backup round-trips child records and a binary attachment", async ({ page, browser }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("life-maps", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("app-records", "readwrite");
      const store = tx.objectStore("app-records");
      store.put({ key: "guest::lifeEvents", value: [{ id: "evt-1", title: "Round trip" }], revision: 1 });
      store.put({ key: "guest::children", value: [{ id: "child-1", name: "Profile" }], revision: 1 });
      store.put({ key: "guest::childHealth:child-1:labUploads", value: {
        cbc: [{ id: "file-1", name: "report.pdf", blob: new Blob(["attachment-content"], { type: "application/pdf" }) }],
      }, revision: 1 });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();

  const context = await browser.newContext();
  try {
    const restoredPage = await context.newPage();
    restoredPage.on("dialog", dialog => dialog.accept());
    await restoredPage.goto("/");
    await restoredPage.locator('input[type="file"]').setInputFiles(path!);
    await expect(restoredPage.locator("#backup-status")).toContainText("Данные восстановлены");
    const restored = await restoredPage.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("life-maps", 2);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction("app-records", "readonly");
      const store = tx.objectStore("app-records");
      const values = await Promise.all(["guest::lifeEvents", "guest::children", "guest::childHealth:child-1:labUploads"].map(key =>
        new Promise<any>((resolve, reject) => {
          const request = store.get(key);
          request.onsuccess = () => resolve(request.result?.value);
          request.onerror = () => reject(request.error);
        })));
      const blob = values[2].cbc[0].blob as Blob;
      const result = { event: values[0][0].title, child: values[1][0].name, type: blob.type, text: await blob.text() };
      db.close();
      return result;
    });
    expect(restored).toEqual({ event: "Round trip", child: "Profile", type: "application/pdf", text: "attachment-content" });
  } finally {
    await context.close();
  }
});

test("migrates unscoped IndexedDB v1 records into the guest workspace without changing revisions", async ({ page }) => {
  await page.goto("/manifest.webmanifest");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("life-maps", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("app-records", { keyPath: "key" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("app-records", "readwrite");
      tx.objectStore("app-records").put({ key: "lifeEvents", value: [{ id: "legacy-event", year: 2026, title: "Запись из старой базы", description: "Миграция v1", category: "personal", emoji: "📌" }], revision: 7 });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });

  await page.goto("/");
  await page.getByRole("button", { name: /^Все события/ }).click();
  await expect(page.getByText("Запись из старой базы", { exact: true })).toBeVisible();
  const migrated = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("life-maps", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const values = await new Promise<{ migrated?: { revision: number }; old?: unknown }>((resolve, reject) => {
      const tx = db.transaction("app-records", "readonly");
      const store = tx.objectStore("app-records");
      const migrated = store.get("guest::lifeEvents");
      const old = store.get("lifeEvents");
      tx.oncomplete = () => resolve({ migrated: migrated.result, old: old.result });
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return { revision: values.migrated?.revision, oldKeyExists: values.old !== undefined };
  });
  expect(migrated).toEqual({ revision: 7, oldKeyExists: false });
});
