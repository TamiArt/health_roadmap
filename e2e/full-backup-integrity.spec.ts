import { expect, test } from "@playwright/test";

test("complete local backup round-trip preserves adult, family, child and file data", async ({ page, browser }) => {
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
      const records: Array<[string, unknown]> = [
        ["lifeEvents", [{ id: "life-1", title: "Life event" }]],
        ["familyMembers", [{ id: "family-1", name: "Family member" }]],
        ["children", [{ id: "child-1", name: "Child one" }, { id: "child-2", name: "Child two" }]],
        ["familyEvents", [{ id: "family-event-1", title: "Family event" }]],
        ["vaccineStatuses", { vaccineA: "done" }],\n        ["vaccineRecords", [{ id: "adult-dose", vaccineId: "mmr", vaccineName: "MMR", date: "2026-11-10", dose: "1", facility: "", notes: "" }]],
        ["adultToothData", { "11": { status: "healthy" } }],
        ["labUploads", { cbc: [{ id: "adult-upload", blob: new Blob(["adult-file"], { type: "application/pdf" }) }] }],
        ["labMeasurements", { ferritin: [{ id: "adult-measurement", date: "2026-11-25", value: "32", unit: "ng/ml" }] }],
        ["healthEvents", [{ id: "adult-health-event", date: "2026-11-25", title: "Adult check" }]],
        ["healthMonitoring", [{ id: "adult-monitor", measurements: [{ id: "adult-reading", date: "2026-11-25", value: 5.2, unit: "mmol/l" }] }]],
        ["labResultEntries", [{ id: "adult-result", testName: "CBC", date: "2026-11-25", indicators: [{ id: "hb", name: "Hemoglobin", value: 125, unit: "g/l" }], document: { id: "adult-doc", name: "adult.pdf", blob: new Blob(["adult-document"], { type: "application/pdf" }) } }]],
        ["notificationSettings", { enabled: false }],
      ];
      for (const [key, value] of records) store.put({ key, value, revision: 1 });
      for (const childId of ["child-1", "child-2"]) {
        const childRecords: Array<[string, unknown]> = [
          ["vaccineStatuses", { vaccineA: "done" }],\n          ["vaccineRecords", [{ id: childId + "-dose", vaccineId: "dtp", vaccineName: "DTP", date: "2026-11-11", dose: "1", facility: "", notes: "" }]],
          ["toothData", { "21": { status: "healthy" } }],
          ["labUploads", { cbc: [{ id: childId + "-upload", blob: new Blob([childId + "-file"], { type: "application/pdf" }) }] }],
          ["labMeasurements", { ferritin: [{ id: childId + "-measurement", date: "2026-11-25", value: "14", unit: "ng/ml" }] }],
          ["healthEvents", [{ id: childId + "-event", date: "2026-11-25", title: "Child check" }]],
          ["healthMonitoring", [{ id: childId + "-monitor", measurements: [{ id: childId + "-reading", date: "2026-11-25", value: 4.8, unit: "mmol/l" }] }]],
          ["labResultEntries", [{ id: childId + "-result", testName: "CBC", date: "2026-11-25", indicators: [{ id: "hb", name: "Hemoglobin", value: 120, unit: "g/l" }], document: { id: childId + "-doc", name: "child.pdf", blob: new Blob([childId + "-document"], { type: "application/pdf" }) } }]],
        ];
        for (const [type, value] of childRecords) store.put({ key: "childHealth:" + childId + ":" + type, value, revision: 1 });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });

  await page.reload();
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

    const snapshot = await restoredPage.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("life-maps", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const values = await new Promise<Array<{ key: string; value: any }>>((resolve, reject) => {
        const request = db.transaction("app-records", "readonly").objectStore("app-records").getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      const map = new Map(values.map(item => [item.key, item.value]));
      const adultFile = map.get("labUploads").cbc[0].blob as Blob;
      const adultDocument = map.get("labResultEntries")[0].document.blob as Blob;
      const childFiles = ["child-1", "child-2"].map(id => {
        const upload = map.get("childHealth:" + id + ":labUploads").cbc[0].blob as Blob;
        const document = map.get("childHealth:" + id + ":labResultEntries")[0].document.blob as Blob;
        return { upload: upload.text(), document: document.text() };
      });
      return {
        keys: values.length,
        adults: map.get("lifeEvents")[0].id === "life-1" &&
          map.get("healthEvents")[0].id === "adult-health-event" &&
          map.get("labMeasurements").ferritin[0].id === "adult-measurement",
        family: map.get("familyMembers")[0].id === "family-1" &&
          map.get("children").map((item: any) => item.id).join(",") === "child-1,child-2",
        childRecords: ["child-1", "child-2"].every(id =>
          map.has("childHealth:" + id + ":vaccineStatuses") &&\n          map.has("childHealth:" + id + ":vaccineRecords") &&
          map.has("childHealth:" + id + ":toothData") &&
          map.has("childHealth:" + id + ":labUploads") &&
          map.has("childHealth:" + id + ":labMeasurements") &&
          map.has("childHealth:" + id + ":healthEvents") &&
          map.has("childHealth:" + id + ":healthMonitoring") &&
          map.has("childHealth:" + id + ":labResultEntries")),
        attachments: await adultFile.text() === "adult-file" &&
          await adultDocument.text() === "adult-document" &&
          await Promise.all(childFiles.map(async item => [await item.upload, await item.document])).then(items =>
            items.flat().join("|") === "child-1-file|child-1-document|child-2-file|child-2-document"),
      };
    });
    expect(snapshot.keys).toBe(29);
    expect(snapshot.adults).toBe(true);
    expect(snapshot.family).toBe(true);
    expect(snapshot.childRecords).toBe(true);
    expect(snapshot.attachments).toBe(true);

    await restoredPage.locator('input[type="file"]').setInputFiles({
      name: "invalid-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({
        format: "life-maps-backup", schemaVersion: 1, records: { credentials: { token: "invalid" } },
      })),
    });
    await expect(restoredPage.locator("#backup-status")).toContainText("Неизвестный тип данных");
    const preserved = await restoredPage.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("life-maps", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const value = await new Promise<any>((resolve, reject) => {
        const request = db.transaction("app-records", "readonly").objectStore("app-records").get("lifeEvents");
        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return value?.[0]?.id;
    });
    expect(preserved).toBe("life-1");
  } finally {
    await context.close();
  }
});
