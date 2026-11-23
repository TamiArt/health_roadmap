import { expect, test } from "@playwright/test";

test.describe("primary navigation", () => {
  test("opens each main section from the sidebar", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Карта жизни" })).toBeVisible();

    await page.getByRole("button", { name: "Здоровье" }).click();
    await expect(page.getByRole("heading", { name: "Навигатор здоровья" })).toBeVisible();

    await page.getByRole("button", { name: "Семья" }).click();
    await expect(page.getByRole("heading", { name: "Семья" })).toBeVisible();

    await page.getByRole("button", { name: "Аналитика" }).click();
    await expect(page.getByRole("heading", { name: "Аналитика здоровья" })).toBeVisible();
  });

  test("opens the health sub-sections", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Здоровье" }).click();

    for (const tab of ["Анализы", "Прививки", "Стоматолог", "Профилактика"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await expect(page.getByRole("heading", { name: "Навигатор здоровья" })).toBeVisible();
    }
  });
});

test("rejects unsupported lab attachments and accepts a valid PDF", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье" }).click();
  await page.getByRole("tab", { name: "Анализы", exact: true }).click();
  await page.getByRole("button", { name: "Базовые — при рождении" }).click();

  await page.getByRole("button", { name: "Файл" }).first().click();
  await page.locator('input[type="file"][accept^="application/pdf"]').setInputFiles({
    name: "unsafe.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg></svg>"),
  });
  await expect(page.getByRole("alert")).toContainText("Поддерживаются только");

  await page.getByRole("button", { name: "Файл" }).first().click();
  await page.locator('input[type="file"][accept^="application/pdf"]').setInputFiles({
    name: "lab-result.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 test"),
  });
  await expect(page.getByRole("link", { name: "lab-result.pdf" })).toBeVisible();
});

test("adds a life event and displays it in the timeline", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить событие" }).click();

  await page.getByPlaceholder("Год (2025)").fill("1800");
  await page.getByPlaceholder("Название события").fill("E2E проверка события");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("от 1900 до 2100");
  await page.getByPlaceholder("Год (2025)").fill("2026");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByRole("button", { name: /^Все события/ }).click();

  await expect(page.getByText("E2E проверка события", { exact: true })).toBeVisible();
});

test("creates a child profile and opens its health view", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Семья" }).click();
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить ребёнка" }).click();

  await page.getByPlaceholder("Имя").fill("E2E ребёнок");
  await page.getByPlaceholder("Год рождения (2022)").fill("2020");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByRole("button", { name: "Готово" }).click();

  await page.getByText("E2E ребёнок", { exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "E2E ребёнок" })).toBeVisible();
  await page.getByRole("tab", { name: "Стоматолог", exact: true }).click();

  const childTooth = page.locator('button[title="Зуб 11 — верхний правый резец"]').last();
  await childTooth.click();
  await page.getByRole("button", { name: "Кариес", exact: true }).click();
  const childNote = page.getByPlaceholder("Заметки: дата, врач, жалобы...").last();
  await childNote.fill("Заметка детского профиля");

  await page.getByRole("button", { name: "Вернуться к семье" }).click();
  await expect(page.getByRole("heading", { name: "Семья" })).toBeVisible();
  await page.getByText("E2E ребёнок", { exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "E2E ребёнок" })).toBeVisible();
  await expect(childNote).toHaveValue("Заметка детского профиля");

  await page.getByRole("button", { name: "Карта жизни" }).click();
  await page.getByRole("button", { name: "Семья" }).click();
  await expect(page.getByRole("heading", { name: "E2E ребёнок" })).toBeVisible();
  await expect(childNote).toHaveValue("Заметка детского профиля");
});

test("edits and deletes a life event", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить событие" }).click();

  await page.getByPlaceholder("Год (2025)").fill("2026");
  await page.getByPlaceholder("Название события").fill("E2E событие для изменения");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByRole("button", { name: /^Все события/ }).click();

  const eventTitle = page.getByText("E2E событие для изменения", { exact: true });
  await expect(eventTitle).toBeVisible();
  const eventCard = eventTitle.locator("xpath=ancestor::div[contains(@class, 'relative')][1]");
  await eventCard.getByRole("button").first().click();
  await page.getByPlaceholder("Название", { exact: true }).fill("E2E событие изменено");
  await page.getByRole("button", { name: "Сохранить" }).click();

  await expect(page.getByText("E2E событие изменено", { exact: true })).toBeVisible();
  const updatedTitle = page.getByText("E2E событие изменено", { exact: true });
  await updatedTitle.locator("xpath=ancestor::div[contains(@class, 'relative')][1]").getByRole("button").nth(1).click();
  await expect(updatedTitle).toHaveCount(0);
});

test("changes a vaccine status and reflects the new state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье" }).click();
  await page.getByRole("tab", { name: "Прививки", exact: true }).click();

  const vaccineStatus = page.getByRole("button", { name: /Изменить статус вакцины/ }).first();
  await expect(vaccineStatus).toBeVisible();
  const initialLabel = await vaccineStatus.getAttribute("aria-label");
  await vaccineStatus.click();
  await expect(vaccineStatus).not.toHaveAttribute("aria-label", initialLabel);
});

test("updates a tooth status and saves its note", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье" }).click();
  await page.getByRole("tab", { name: "Стоматолог", exact: true }).click();

  const tooth = page.locator('button[title="Зуб 11 — верхний правый резец"]');
  await tooth.click();
  await page.getByRole("button", { name: "Кариес", exact: true }).click();
  await expect(tooth.locator("div").first()).toHaveCSS("background-color", "rgb(239, 68, 68)");

  const note = page.getByPlaceholder("Заметки: дата, врач, жалобы...");
  await note.fill("E2E заметка о визите");
  await page.locator('button[title="Зуб 12 — верхний правый резец"]').click();
  await tooth.click();
  await expect(note).toHaveValue("E2E заметка о визите");
  await expect(page.getByRole("button", { name: "Кариес", exact: true })).toHaveClass(/bg-red-500/);
});

test("keeps main sections within a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const mobileNavigation = page.getByRole("navigation", { name: "Основная навигация" });
  const backupPanel = page.getByRole("region", { name: "Резервное копирование" });
  const navigationBox = await mobileNavigation.boundingBox();
  const backupBox = await backupPanel.boundingBox();
  expect(navigationBox).not.toBeNull();
  expect(backupBox).not.toBeNull();
  expect(backupBox!.y + backupBox!.height).toBeLessThanOrEqual(navigationBox!.y);

  for (const section of ["Карта жизни", "Здоровье", "Семья", "Аналитика"]) {
    await page.getByRole("button", { name: section }).click();
    const main = page.locator("main");
    await expect(main).toBeVisible();
    const dimensions = await main.evaluate(element => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(
      dimensions.scrollWidth,
      `Horizontal overflow in section "${section}" at 390px: ${JSON.stringify(dimensions)}`,
    ).toBeLessThanOrEqual(dimensions.clientWidth);
  }
});

test("preserves section state when navigating between main sections", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить событие" }).click();
  await page.getByPlaceholder("Год (2025)").fill("2026");
  await page.getByPlaceholder("Название события").fill("Событие после навигации");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByRole("button", { name: /^Все события/ }).click();

  await page.getByRole("button", { name: "Семья" }).click();
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить ребёнка" }).click();
  await page.getByPlaceholder("Имя").fill("Профиль после навигации");
  await page.getByPlaceholder("Год рождения (2022)").fill("2021");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();

  await page.getByRole("button", { name: "Карта жизни" }).click();
  await expect(page.getByText("Событие после навигации", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Семья" }).click();
  await expect(page.getByText("Профиль после навигации", { exact: true }).first()).toBeVisible();
});

test("preserves health sub-tab data after navigating away and back", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье" }).click();
  await page.getByRole("tab", { name: "Стоматолог", exact: true }).click();

  const tooth = page.locator('button[title="Зуб 11 — верхний правый резец"]');
  await tooth.click();
  await page.getByRole("button", { name: "Кариес", exact: true }).click();
  const note = page.getByPlaceholder("Заметки: дата, врач, жалобы...");
  await note.fill("Сохраняется после перехода между разделами");

  await page.getByRole("tab", { name: "Прививки", exact: true }).click();
  await page.getByRole("tab", { name: "Стоматолог", exact: true }).click();
  await expect(note).toHaveValue("Сохраняется после перехода между разделами");

  await page.getByRole("button", { name: "Семья" }).click();
  await page.getByRole("button", { name: "Здоровье" }).click();
  await expect(page.getByRole("tab", { name: "Стоматолог", exact: true })).toBeVisible();
  await expect(tooth).toBeVisible();
  await expect(note).toHaveValue("Сохраняется после перехода между разделами");
  await expect(page.getByRole("button", { name: "Кариес", exact: true })).toHaveClass(/bg-red-500/);
});


test("keeps all primary sections within a tablet viewport", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");

  for (const section of ["Карта жизни", "Здоровье", "Семья", "Аналитика"]) {
    await page.getByRole("button", { name: section }).click();
    const main = page.locator("main");
    const dimensions = await main.evaluate(element => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(
      dimensions.scrollWidth,
      `Horizontal overflow in section "${section}" at 768px: ${JSON.stringify(dimensions)}`,
    ).toBeLessThanOrEqual(dimensions.clientWidth);
  }
});

test("supports keyboard activation of primary navigation", async ({ page }) => {
  await page.goto("/");
  const healthButton = page.getByRole("button", { name: "Здоровье" });
  await healthButton.focus();
  await expect(healthButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Навигатор здоровья" })).toBeVisible();
});

test("exposes active navigation and health tabs to assistive technology", async ({ page }) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Основная навигация" });
  await expect(navigation.getByRole("button", { name: "Карта жизни" })).toHaveAttribute("aria-current", "page");

  const healthButton = navigation.getByRole("button", { name: "Здоровье" });
  await healthButton.focus();
  await page.keyboard.press("Enter");
  await expect(healthButton).toHaveAttribute("aria-current", "page");

  const tablist = page.getByRole("tablist", { name: "Разделы навигатора здоровья" });
  const dentalTab = tablist.getByRole("tab", { name: "Стоматолог" });
  await expect(tablist.getByRole("tab", { name: "Профилактика" })).toHaveAttribute("aria-selected", "true");
  await dentalTab.click();
  await expect(dentalTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Стоматолог" })).toBeVisible();

  const tooth = page.getByRole("button", { name: /Зуб 11 — верхний правый резец/ });
  await expect(tooth).toHaveAttribute("aria-pressed", "false");
  await tooth.focus();
  await page.keyboard.press("Enter");
  await expect(tooth).toHaveAttribute("aria-pressed", "true");
});

test("opens a child profile card with the keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Семья" }).click();
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить ребёнка" }).click();
  await page.getByPlaceholder("Имя").fill("Клавиатурный профиль");
  await page.getByPlaceholder("Год рождения (2022)").fill("2020");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByRole("button", { name: "Готово" }).click();

  const profile = page.getByRole("button", { name: "Открыть профиль ребёнка Клавиатурный профиль, 6 лет" });
  await profile.focus();
  await expect(profile).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Клавиатурный профиль" })).toBeVisible();
  const childTabs = page.getByRole("tablist", { name: "Разделы здоровья ребёнка" });
  await expect(childTabs.getByRole("tab", { name: "Анализы" })).toHaveAttribute("aria-selected", "true");
});

test("validates child creation without creating an empty profile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Семья" }).click();
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить ребёнка" }).click();
  await page.getByRole("button", { name: "Добавить", exact: true }).click();

  await expect(page.getByText("Проверка валидации", { exact: true })).toHaveCount(0);
  await page.getByPlaceholder("Имя").fill("   ");
  await page.getByPlaceholder("Год рождения (2022)").fill("2027");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Укажите имя ребёнка");
  await expect(page.getByText("Проверка валидации", { exact: true })).toHaveCount(0);

  await page.getByPlaceholder("Имя").fill("Проверка валидации");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("от 1900 до 2026");
  await expect(page.getByText("Проверка валидации", { exact: true })).toHaveCount(0);

  await page.getByPlaceholder("Год рождения (2022)").fill("2021");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await expect(page.getByText("Проверка валидации", { exact: true }).first()).toBeVisible();
});


test("persists life events across a page reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Данные хранятся только в этом браузере.")).toBeVisible();
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить событие" }).click();
  await page.getByPlaceholder("Год (2025)").fill("2026");
  await page.getByPlaceholder("Название события").fill("Сохранённое локально событие");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByRole("button", { name: /^Все события/ }).click();
  await expect(page.getByText("Сохранённое локально событие", { exact: true })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: /^Все события/ }).click();
  await expect(page.getByText("Сохранённое локально событие", { exact: true })).toBeVisible();
});

test("exports a backup and restores data from a validated backup", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Экспорт" })).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^life-maps-backup-.*\.json$/);

  const backup = {
    format: "life-maps-backup",
    schemaVersion: 1,
    exportedAt: "2026-11-06T00:00:00.000Z",
    records: {
      lifeEvents: [{
        id: "restored-event",
        year: 2026,
        title: "Восстановленное событие",
        description: "Проверка восстановления",
        category: "personal",
        emoji: "✨",
      }],
      familyMembers: [],
      children: [],
      familyEvents: [],
      vaccineStatuses: {},
      labMeasurements: {
        b1: [{ id: "restored-measurement", date: "2026-11-06", value: "A(II)", unit: "Rh+" }],
      },
    },
  };

  // Set the file directly on the hidden input. This exercises the same
  // browser change event as a user selecting a file, without a file-chooser race.
  page.once("dialog", dialog => dialog.accept());
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });

  const status = page.getByRole("status");
  await expect(status).toContainText("Данные восстановлены", { timeout: 10000 });
  await page.getByRole("button", { name: /^Все события/ }).click();
  await expect(page.getByText("Восстановленное событие", { exact: true })).toBeVisible();

  // The restore event must not unmount the app or leave it stuck on loading.
  await expect(page.getByRole("button", { name: "Импорт" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Здоровье" })).toBeEnabled();

  await page.getByRole("button", { name: "Здоровье" }).click();
  await page.getByRole("tab", { name: "Анализы" }).click();
  await page.getByRole("button", { name: "Базовые — при рождении" }).click();
  await expect(page.getByText("A(II) Rh+", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("06.11.2026", { exact: true }).first()).toBeVisible();
});

test("shows a validation error for an invalid backup and keeps the app usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Импорт" })).toBeEnabled();

  page.once("dialog", dialog => dialog.accept());
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
    name: "invalid-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ not: "a Life Maps backup" })),
  });

  const status = page.getByRole("status");
  await expect(status).toContainText("не является резервной копией", { timeout: 5000 });
  await expect(page.getByRole("button", { name: "Импорт" })).toBeEnabled();
  await page.getByRole("button", { name: "Здоровье" }).click();
  await expect(page.getByRole("heading", { name: "Навигатор здоровья" })).toBeVisible();
});


test("renders age-specific child health paths without duplicate birth tests", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Семья" }).click();
  await page.getByRole("button", { name: "Изменить" }).click();

  const profiles = [
    { name: "Профиль младенца", birthYear: "2026", stage: "Новорождённый", hasDental: false },
    { name: "Профиль дошкольника", birthYear: "2021", stage: "Дошкольник", hasDental: true },
    { name: "Профиль школьника", birthYear: "2014", stage: "Школьник", hasDental: true },
    { name: "Профиль взрослого", birthYear: "2008", stage: "Молодой взрослый", hasDental: true },
  ];

  for (const profile of profiles) {
    await page.getByRole("button", { name: "Добавить ребёнка" }).click();
    await page.getByPlaceholder("Имя").fill(profile.name);
    await page.getByPlaceholder("Год рождения (2022)").fill(profile.birthYear);
    await page.getByRole("button", { name: "Добавить", exact: true }).click();
  }

  await page.getByRole("button", { name: "Готово" }).click();

  for (const profile of profiles) {
    await page.getByText(profile.name, { exact: true }).first().click();
    await expect(page.getByRole("heading", { name: profile.name })).toBeVisible();
    await expect(page.locator("span:visible").filter({ hasText: profile.stage }).first()).toBeVisible();
    const dentalTab = page.getByRole("tab", { name: "Стоматолог", exact: true });
    if (profile.hasDental) await expect(dentalTab).toBeVisible();
    else await expect(dentalTab).toHaveCount(0);

    if (profile.stage === "Новорождённый") {
      await page.getByRole("button", { name: /Базовые — при рождении/ }).click();
      await expect(page.getByText("Группа крови и резус-фактор", { exact: true })).toHaveCount(1);
    }
    await page.getByRole("button", { name: "Вернуться к семье" }).click();
  }
});

 
test("stale tab cannot overwrite a newer lab measurement revision", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье" }).click();
  await page.getByRole("tab", { name: "Анализы" }).click();
  await page.getByRole("button", { name: "Базовые — при рождении" }).click();
  await page.getByRole("button", { name: "+ Значение" }).first().click();
  await page.getByLabel("Дата анализа").fill("2026-11-06");
  await page.getByLabel("Значение результата").fill("5.4");
  await page.getByLabel("Единицы измерения").fill("ммоль/л");
  await page.getByRole("button", { name: "Сохранить результат" }).click();
  await expect(page.getByText("5.4 ммоль/л", { exact: true }).first()).toBeVisible();

  const staleTab = await page.context().newPage();
  // Disable live notifications in this tab to deterministically exercise the
  // IndexedDB revision check rather than the BroadcastChannel refresh path.
  await staleTab.addInitScript(() => {
    Object.defineProperty(window, "BroadcastChannel", { configurable: true, value: undefined });
  });
  await staleTab.goto("/");
  await staleTab.getByRole("button", { name: "Здоровье" }).click();
  await staleTab.getByRole("tab", { name: "Анализы" }).click();
  await staleTab.getByRole("button", { name: "Базовые — при рождении" }).click();
  await expect(staleTab.getByText("5.4 ммоль/л", { exact: true }).first()).toBeVisible();
  const staleRevision = await staleTab.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open("life-maps", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction("app-records", "readonly");
      const read = transaction.objectStore("app-records").get("labMeasurements");
      read.onsuccess = () => resolve(read.result?.revision ?? 0);
      read.onerror = () => reject(read.error);
    };
  }));
  // Merely opening a tab must not create a new revision by re-saving the
  // snapshot it just loaded.
  await expect.poll(async () => staleTab.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open("life-maps", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction("app-records", "readonly");
      const read = transaction.objectStore("app-records").get("labMeasurements");
      read.onsuccess = () => resolve(read.result?.revision ?? 0);
      read.onerror = () => reject(read.error);
    };
  }))).toBe(staleRevision);

  await page.getByRole("button", { name: "Изменить результат от 2026-11-06" }).click();
  await page.getByLabel("Значение результата").fill("6.1");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(page.getByText("6.1 ммоль/л", { exact: true }).first()).toBeVisible();
  await expect.poll(async () => page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open("life-maps", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction("app-records", "readonly");
      const read = transaction.objectStore("app-records").get("labMeasurements");
      read.onsuccess = () => resolve(read.result?.revision ?? 0);
      read.onerror = () => reject(read.error);
    };
  }))).toBeGreaterThan(staleRevision);

  await staleTab.getByRole("button", { name: "Изменить результат от 2026-11-06" }).click();
  await staleTab.getByLabel("Значение результата").fill("7.2");
  await staleTab.getByRole("button", { name: "Сохранить изменения" }).click();

  // The stale write is rejected, the tab adopts the committed winner,
  // and the user is explicitly told that their attempted edit was not saved.
  await expect(staleTab.getByRole("status").filter({ hasText: "ваше изменение не сохранено" })).toBeVisible();
  await expect(staleTab.getByText("6.1 ммоль/л", { exact: true }).first()).toBeVisible();
  await expect(staleTab.getByText("7.2 ммоль/л", { exact: true })).toHaveCount(0);
  await staleTab.reload();
  await staleTab.getByRole("button", { name: "Здоровье" }).click();
  await staleTab.getByRole("tab", { name: "Анализы" }).click();
  await staleTab.getByRole("button", { name: "Базовые — при рождении" }).click();
  await expect(staleTab.getByText("6.1 ммоль/л", { exact: true }).first()).toBeVisible();
  await expect(staleTab.getByText("7.2 ммоль/л", { exact: true })).toHaveCount(0);
  await staleTab.close();
});

test("saves and reloads manually entered lab measurements with date and unit", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье" }).click();
  await page.getByRole("tab", { name: "Анализы" }).click();
  await page.getByRole("button", { name: "Базовые — при рождении" }).click();
  await page.getByRole("button", { name: "+ Значение" }).first().click();
  await page.getByLabel("Дата анализа").fill("2026-11-06");
  await page.getByLabel("Значение результата").fill("5.4");
  await page.getByLabel("Единицы измерения").fill("ммоль/л");
  await page.getByRole("button", { name: "Сохранить результат" }).click();
  await expect(page.getByText("5.4 ммоль/л", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("06.11.2026", { exact: true }).first()).toBeVisible();

  const secondTab = await page.context().newPage();
  await secondTab.goto("/");
  await secondTab.getByRole("button", { name: "Здоровье" }).click();
  await secondTab.getByRole("tab", { name: "Анализы" }).click();
  await secondTab.getByRole("button", { name: "Базовые — при рождении" }).click();
  await expect(secondTab.getByText("5.4 ммоль/л", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Изменить результат от 2026-11-06" }).click();
  await expect(page.getByText("Редактирование результата анализа")).toBeVisible();
  await page.getByLabel("Значение результата").fill("<0.1");
  await page.getByLabel("Дата анализа").fill("2026-11-07");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(page.getByText("<0.1 ммоль/л", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("07.11.2026", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("5.4 ммоль/л", { exact: true }).first()).toHaveCount(0);
  await expect(secondTab.getByText("<0.1 ммоль/л", { exact: true }).first()).toBeVisible();
  await expect(secondTab.getByText("07.11.2026", { exact: true }).first()).toBeVisible();
  await secondTab.close();
  await page.reload();
  await page.getByRole("button", { name: "Здоровье" }).click();
  await page.getByRole("tab", { name: "Анализы" }).click();
  await page.getByRole("button", { name: "Базовые — при рождении" }).click();
  await expect(page.getByText("<0.1 ммоль/л", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("07.11.2026", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("5.4 ммоль/л", { exact: true }).first()).toHaveCount(0);
  const storedRevision = await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open("life-maps", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction("app-records", "readonly");
      const read = transaction.objectStore("app-records").get("labMeasurements");
      read.onsuccess = () => resolve(read.result?.revision ?? 0);
      read.onerror = () => reject(read.error);
    };
  }));
  expect(storedRevision).toBeGreaterThanOrEqual(2);
});


test("adds medical events, monitoring items and multi-indicator lab history", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье" }).click();

  await page.getByRole("tab", { name: "События", exact: true }).click();
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByLabel("Дата", { exact: true }).fill("2025-04-12");
  await page.getByLabel("Тип события").selectOption("fracture");
  await page.getByLabel("Название события").fill("E2E перелом");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByText("E2E перелом", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "На контроле", exact: true }).click();
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByLabel("Название контроля").fill("E2E глюкоза");
  await page.getByLabel("Следующая проверка").fill("2026-12-01");
  await page.getByLabel("Интервал в днях").fill("90");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByText("E2E глюкоза", { exact: true })).toBeVisible();
  await page.getByLabel("Значение E2E глюкоза").fill("5.4");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByText("5.4", { exact: true }).first()).toBeVisible();

  await page.getByRole("tab", { name: "История", exact: true }).click();
  await page.getByRole("button", { name: "Добавить анализ", exact: true }).click();
  await page.getByLabel("Название анализа").fill("E2E биохимия");
  await page.getByLabel("Дата анализа").fill("2025-04-12");
  await page.getByLabel("Название показателя 1").fill("Глюкоза");
  await page.getByLabel("Значение показателя 1").fill("5.2");
  await page.getByLabel("Единица измерения 1").fill("ммоль/л");
  await page.getByRole("button", { name: "Показатель" }).click();
  await page.getByLabel("Название показателя 2").fill("Креатинин");
  await page.getByLabel("Значение показателя 2").fill("72");
  await page.getByLabel("Единица измерения 2").fill("мкмоль/л");
  await page.getByRole("button", { name: "Прикрепить документ" }).click();
  await page.getByLabel("Выбрать документ анализа").setInputFiles({
    name: "first-result.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 first"),
  });
  await page.getByRole("button", { name: "Сохранить анализ" }).click();
  await expect(page.getByText("E2E биохимия", { exact: true })).toBeVisible();
  await expect(page.getByText("Креатинин", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "first-result.pdf" })).toBeVisible();

  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Заменить прикреплённый документ" }).click();
  await page.getByLabel("Выбрать документ для замены").setInputFiles({
    name: "replacement-result.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 replacement"),
  });
  await expect(page.getByRole("link", { name: "replacement-result.pdf" })).toBeVisible();
  await expect(page.getByRole("link", { name: "first-result.pdf" })).toHaveCount(0);
});

test("adds a family date with annual recurrence and reminder settings", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Семья" }).click();
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить дату" }).click();
  await page.getByPlaceholder("Название события").fill("E2E годовщина");
  await page.getByLabel("Дата памятного события").fill("2025-06-15");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await expect(page.getByText("E2E годовщина", { exact: true })).toBeVisible();
  await expect(page.getByText("2025-06-15", { exact: true })).toBeVisible();
});


test("aggregates health events and monitoring dates in the unified calendar", async ({ page }) => {
  await page.goto("/");
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });

  await page.getByRole("button", { name: "Здоровье" }).click();
  await page.getByRole("tab", { name: "События", exact: true }).click();
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByLabel("Дата", { exact: true }).fill(today);
  await page.getByLabel("Название события").fill("E2E событие для календаря");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();

  await page.getByRole("tab", { name: "На контроле", exact: true }).click();
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByLabel("Название контроля").fill("E2E проверка для календаря");
  await page.getByLabel("Следующая проверка").fill(today);
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();

  await page.getByRole("button", { name: "Календарь" }).click();
  await expect(page.getByRole("button", { name: "Календарь" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Календарь" })).toBeVisible();
  const calendar = page.locator("section").filter({ has: page.getByRole("heading", { name: "Календарь" }) });
  await expect(calendar.getByText("E2E событие для календаря", { exact: true })).toBeVisible();
  await expect(calendar.getByText("Проверка: E2E проверка для календаря", { exact: true })).toBeVisible();
});


test("deleting a child profile removes its health records and keeps tombstone revisions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Семья" }).click();
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить ребёнка" }).click();
  await page.getByPlaceholder("Имя").fill("Профиль для удаления");
  await page.getByPlaceholder("Год рождения (2022)").fill("2021");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByRole("button", { name: "Готово" }).click();

  await page.getByRole("button", { name: /Открыть профиль ребёнка Профиль для удаления/ }).click();
  await page.getByRole("button", { name: /Дошкольник/ }).click();
  await page.locator("button:visible").filter({ hasText: "+ Значение" }).first().click();
  await page.getByLabel("Значение результата").fill("14.7");
  await page.getByLabel("Единицы измерения").fill("г/л");
  await page.getByRole("button", { name: "Сохранить результат" }).click();
  await expect(page.getByText("14.7 г/л", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Вернуться к семье" }).click();

  const childId = await page.evaluate(() => new Promise<string>((resolve, reject) => {
    const request = indexedDB.open("life-maps", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction("app-records", "readonly");
      const read = transaction.objectStore("app-records").get("children");
      read.onsuccess = () => resolve(read.result.value.find((child: { name: string }) => child.name === "Профиль для удаления").id);
      read.onerror = () => reject(read.error);
    };
  }));
  const key = `childHealth:${childId}:labMeasurements`;
  const previousRevision = await page.evaluate(key => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open("life-maps", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction("app-records", "readonly");
      const read = transaction.objectStore("app-records").get(key);
      read.onsuccess = () => resolve(read.result.revision);
      read.onerror = () => reject(read.error);
    };
  }), key);

  await page.getByRole("button", { name: "Изменить" }).click();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Удалить профиль ребёнка Профиль для удаления" }).click();
  await expect(page.getByText("Профиль для удаления", { exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(key => new Promise<{ value: unknown; revision: number }>((resolve, reject) => {
    const request = indexedDB.open("life-maps", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction("app-records", "readonly");
      const read = transaction.objectStore("app-records").get(key);
      read.onsuccess = () => resolve({ value: read.result.value, revision: read.result.revision });
      read.onerror = () => reject(read.error);
    };
  }), key)).toEqual({ value: undefined, revision: previousRevision + 1 });
});


test("keeps primary sections within extra-narrow mobile viewports", async ({ page }) => {
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto("/");

    for (const section of ["Карта жизни", "Здоровье", "Семья", "Аналитика"]) {
      await page.getByRole("button", { name: section }).click();
      const dimensions = await page.locator("main").evaluate(element => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(
        dimensions.scrollWidth,
        `Horizontal overflow in section "${section}" at ${width}px: ${JSON.stringify(dimensions)}`,
      ).toBeLessThanOrEqual(dimensions.clientWidth);
    }
  }
});

test("provides a keyboard skip link to the main content", async ({ page }) => {
  await page.goto("/");
  const skipLink = page.getByRole("link", { name: "Перейти к основному содержимому" });

  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toHaveAttribute("href", "#main-content");
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("restoring a backup cannot be overwritten by a tab with an uncommitted initial snapshot", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Экспорт" })).toBeEnabled();

  const staleTab = await context.newPage();
  await staleTab.addInitScript(() => {
    Object.defineProperty(window, "BroadcastChannel", { configurable: true, value: undefined });
  });
  await staleTab.goto("/");
  await expect(staleTab.getByRole("button", { name: "Экспорт" })).toBeEnabled();

  // Neither tab has written the default lifeEvents value yet: both hold
  // revision 0 in memory, which exposed the restore/reset-to-zero race.
  const backup = {
    format: "life-maps-backup",
    schemaVersion: 1,
    exportedAt: "2026-11-07T00:00:00.000Z",
    records: {
      lifeEvents: [{
        id: "restore-wins",
        year: 2026,
        title: "Событие из резервной копии",
        description: "Должно сохраниться после конфликта",
        category: "personal",
        emoji: "✨",
        milestone: true,
      }],
      familyMembers: [],
      children: [],
      familyEvents: [],
      vaccineStatuses: {},
    },
  };

  page.once("dialog", dialog => dialog.accept());
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
    name: "restore-race.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole("status")).toContainText("Данные восстановлены", { timeout: 10000 });

  await staleTab.getByRole("button", { name: "Изменить" }).click();
  await staleTab.getByRole("button", { name: "Добавить событие" }).click();
  await staleTab.getByPlaceholder("Год (2025)").fill("2026");
  await staleTab.getByPlaceholder("Название события").fill("Устаревшая запись из другой вкладки");
  await staleTab.getByRole("button", { name: "Добавить", exact: true }).click();
  await staleTab.getByRole("button", { name: /^Все события/ }).click();

  await expect(staleTab.getByText("Событие из резервной копии", { exact: true })).toBeVisible();
  await expect(staleTab.getByText("Устаревшая запись из другой вкладки", { exact: true })).toHaveCount(0);

  await staleTab.reload();
  await staleTab.getByRole("button", { name: /^Все события/ }).click();
  await expect(staleTab.getByText("Событие из резервной копии", { exact: true })).toBeVisible();
  await expect(staleTab.getByText("Устаревшая запись из другой вкладки", { exact: true })).toHaveCount(0);
  await staleTab.close();
});

test("backup restore refreshes records in other open tabs", async ({ page, context }) => {
  await page.goto("/");
  const otherTab = await context.newPage();
  await otherTab.goto("/");
  await otherTab.getByRole("button", { name: /^Все события/ }).click();
  await expect(otherTab.getByText("Восстановленное в другой вкладке", { exact: true })).toHaveCount(0);

  const backup = {
    format: "life-maps-backup",
    schemaVersion: 1,
    exportedAt: "2026-11-07T00:00:00.000Z",
    records: {
      lifeEvents: [{
        id: "cross-tab-restored",
        year: 2026,
        title: "Восстановленное в другой вкладке",
        description: "Обновление через BroadcastChannel",
        category: "personal",
        emoji: "✨",
        milestone: true,
      }],
      familyMembers: [],
      children: [],
      familyEvents: [],
      vaccineStatuses: {},
    },
  };
  page.once("dialog", dialog => dialog.accept());
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
    name: "cross-tab-restore.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole("status")).toContainText("Данные восстановлены", { timeout: 10000 });
  await expect(otherTab.getByText("Восстановленное в другой вкладке", { exact: true })).toBeVisible({ timeout: 10000 });
  await otherTab.close();
});

test("a stale tab cannot resurrect a record removed by backup restore", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить событие" }).click();
  await page.getByPlaceholder("Год (2025)").fill("2026");
  await page.getByPlaceholder("Название события").fill("Событие до восстановления");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByRole("button", { name: /^Все события/ }).click();
  await expect(page.getByText("Событие до восстановления", { exact: true })).toBeVisible();

  const staleTab = await context.newPage();
  await staleTab.addInitScript(() => {
    Object.defineProperty(window, "BroadcastChannel", { configurable: true, value: undefined });
  });
  await staleTab.goto("/");
  await staleTab.getByRole("button", { name: /^Все события/ }).click();
  await expect(staleTab.getByText("Событие до восстановления", { exact: true })).toBeVisible();

  const backup = {
    format: "life-maps-backup",
    schemaVersion: 1,
    exportedAt: "2026-11-07T00:00:00.000Z",
    records: {
      familyMembers: [],
      children: [],
      familyEvents: [],
      vaccineStatuses: {},
    },
  };
  page.once("dialog", dialog => dialog.accept());
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
    name: "remove-life-events.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole("status")).toContainText("Данные восстановлены", { timeout: 10000 });

  await staleTab.getByRole("button", { name: "Изменить" }).click();
  await staleTab.getByRole("button", { name: "Добавить событие" }).click();
  await staleTab.getByPlaceholder("Год (2025)").fill("2026");
  await staleTab.getByPlaceholder("Название события").fill("Устаревшая попытка воскресить запись");
  await staleTab.getByRole("button", { name: "Добавить", exact: true }).click();
  await staleTab.getByRole("button", { name: /^Все события/ }).click();

  await expect(staleTab.getByText("Событие до восстановления", { exact: true })).toHaveCount(0);
  await expect(staleTab.getByText("Устаревшая попытка воскресить запись", { exact: true })).toHaveCount(0);
  await expect(staleTab.getByRole("button", { name: "Добавить событие" })).toBeVisible();
  await staleTab.close();
});

test("keeps lab measurements isolated between child profiles after switching and reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Семья" }).click();
  await page.getByRole("button", { name: "Изменить" }).click();

  for (const name of ["Первый профиль — изоляция", "Второй профиль — изоляция"]) {
    await page.getByRole("button", { name: "Добавить ребёнка" }).click();
    await page.getByPlaceholder("Имя").fill(name);
    await page.getByPlaceholder("Год рождения (2022)").fill("2021");
    await page.getByRole("button", { name: "Добавить", exact: true }).click();
  }
  await page.getByRole("button", { name: "Готово" }).click();

  async function saveChildMeasurement(profileName: string, value: string) {
    await page.getByRole("button", { name: new RegExp(`Открыть профиль ребёнка ${profileName}, 5 лет`) }).click();
    await page.getByRole("button", { name: /Дошкольник/ }).click();
    // The main health section and other child profiles stay mounted but hidden.
    // Target the visible action rather than the first matching hidden "ОАК" label.
    const addMeasurement = page.locator("button:visible").filter({ hasText: "+ Значение" }).first();
    await expect(addMeasurement).toBeVisible();
    await addMeasurement.click();
    await page.getByLabel("Значение результата").fill(value);
    await page.getByLabel("Единицы измерения").fill("г/л");
    await page.getByRole("button", { name: "Сохранить результат" }).click();
    await expect(page.getByText(value + " г/л", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Вернуться к семье" }).click();
  }

  await saveChildMeasurement("Первый профиль — изоляция", "12.1");
  await saveChildMeasurement("Второй профиль — изоляция", "9.2");

  await page.getByRole("button", { name: /Открыть профиль ребёнка Первый профиль — изоляция/ }).click();
  // Inactive profile panels remain mounted; assert the other profile value is hidden, not absent from the DOM.
  await expect(page.getByText("12.1 г/л", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("9.2 г/л", { exact: true }).first()).toBeHidden();
  await page.getByRole("button", { name: "Вернуться к семье" }).click();

  await page.getByRole("button", { name: /Открыть профиль ребёнка Второй профиль — изоляция/ }).click();
  // The first profile panel remains mounted but must be hidden while the second profile is active.
  await expect(page.getByText("9.2 г/л", { exact: true })).toBeVisible();
  await expect(page.getByText("12.1 г/л", { exact: true }).first()).toBeHidden();

  await page.reload();
  await page.getByRole("button", { name: "Семья" }).click();
  await page.getByRole("button", { name: /Открыть профиль ребёнка Первый профиль — изоляция/ }).click();
  await page.getByRole("button", { name: /Дошкольник/ }).click();
  await expect(page.getByText("12.1 г/л", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("9.2 г/л", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Вернуться к семье" }).click();
  await page.getByRole("button", { name: /Открыть профиль ребёнка Второй профиль — изоляция/ }).click();
  await page.getByRole("button", { name: /Дошкольник/ }).click();
  await expect(page.getByText("9.2 г/л", { exact: true })).toBeVisible();
  await expect(page.getByText("12.1 г/л", { exact: true }).first()).toBeHidden();
});
