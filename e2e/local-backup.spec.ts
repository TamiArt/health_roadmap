import { expect, test } from "@playwright/test";

test("local backup round-trips child records and a binary attachment", async ({ page, browser }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("life-maps", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("app-records", "readwrite");
      const store = tx.objectStore("app-records");
      store.put({ key: "lifeEvents", value: [{ id: "evt-1", title: "Round trip" }], revision: 1 });
      store.put({ key: "children", value: [{ id: "child-1", name: "Profile" }], revision: 1 });
      store.put({ key: "childHealth:child-1:labUploads", value: {
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
        const request = indexedDB.open("life-maps", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction("app-records", "readonly");
      const store = tx.objectStore("app-records");
      const values = await Promise.all(["lifeEvents", "children", "childHealth:child-1:labUploads"].map(key =>
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
