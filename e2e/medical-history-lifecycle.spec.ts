import { expect, test } from "@playwright/test";

test("catalog lab measurements and uploaded reports support edit, replacement and confirmed delete", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье", exact: true }).click();
  await page.getByRole("tab", { name: "Анализы", exact: true }).click();
  await page.getByRole("button", { name: "Базовые — при рождении" }).click();

  await page.getByRole("button", { name: "+ Значение" }).first().click();
  await page.getByLabel("Дата анализа").fill("2026-11-19");
  await page.getByLabel("Значение результата").fill("5.4");
  await page.getByLabel("Единицы измерения").fill("ммоль/л");
  await page.getByRole("button", { name: "Сохранить результат" }).click();
  await expect(page.getByText("5.4 ммоль/л", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Изменить результат от 2026-11-19" }).click();
  await page.getByLabel("Значение результата").fill("5.6");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(page.getByText("5.6 ммоль/л", { exact: true }).first()).toBeVisible();

  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Удалить результат от 2026-11-19" }).click();
  await expect(page.getByText("5.6 ммоль/л", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Файл" }).first().click();
  await page.locator('input[aria-label="Загрузить результат анализа"]').setInputFiles({
    name: "catalog-report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 original"),
  });
  await expect(page.getByRole("link", { name: "catalog-report.pdf" })).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Заменить файл catalog-report.pdf" }).click();
  await page.locator('input[aria-label="Загрузить результат анализа"]').setInputFiles({
    name: "catalog-report-updated.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 replacement"),
  });
  await expect(page.getByRole("link", { name: "catalog-report-updated.pdf" })).toBeVisible();
  await expect(page.getByRole("link", { name: "catalog-report.pdf" })).toHaveCount(0);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Удалить файл catalog-report-updated.pdf" }).click();
  await expect(page.getByRole("link", { name: "catalog-report-updated.pdf" })).toHaveCount(0);
});

test("dental records can be edited and safely deleted", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье", exact: true }).click();
  await page.getByRole("tab", { name: "Стоматолог", exact: true }).click();
  await page.locator('button[title="Зуб 11 — верхний правый резец"]').click();
  await page.getByRole("button", { name: "Кариес", exact: true }).click();
  await page.getByPlaceholder("Заметки: дата, врач, жалобы...").fill("Запись для удаления");
  await expect(page.getByRole("button", { name: "Удалить запись о зубе" })).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Удалить запись о зубе" }).click();
  await expect(page.getByRole("button", { name: "Удалить запись о зубе" })).toHaveCount(0);
});

test("vaccination history remains isolated to the selected child profile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Семья" }).click();
  await page.getByRole("button", { name: "Изменить" }).click();
  for (const name of ["Вакцинационный профиль A", "Вакцинационный профиль B"]) {
    await page.getByRole("button", { name: "Добавить ребёнка" }).click();
    await page.getByPlaceholder("Имя").fill(name);
    await page.getByPlaceholder("Год рождения (2022)").fill("2021");
    await page.getByRole("button", { name: "Добавить", exact: true }).click();
  }
  await page.getByRole("button", { name: "Готово" }).click();
  await page.getByText("Вакцинационный профиль A", { exact: true }).first().click();
  await page.getByRole("tab", { name: "Прививки", exact: true }).click();
  await page.getByRole("button", { name: "Добавить запись" }).click();
  await page.getByLabel("Вакцина для записи").selectOption({ index: 1 });
  await page.getByLabel("Дата вакцинации").fill("2026-11-15");
  await page.getByLabel("Доза вакцины").fill("Только профиль A");
  await page.getByRole("button", { name: "Сохранить запись" }).click();
  const vaccinePanel = page.locator('section[aria-label="История вакцинации"]:visible');
  await expect(vaccinePanel.getByText("Только профиль A", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Вернуться к семье" }).click();
  await page.getByText("Вакцинационный профиль B", { exact: true }).first().click();
  await page.getByRole("tab", { name: "Прививки", exact: true }).click();
  await expect(page.locator('section[aria-label="История вакцинации"]:visible').getByText("Только профиль A", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Вернуться к семье" }).click();
  await page.getByRole("button", { name: "Здоровье", exact: true }).click();
  await page.getByRole("tab", { name: "Прививки", exact: true }).click();
  await expect(page.getByText("Только профиль A", { exact: true })).toHaveCount(0);
});

test("medical events support create, edit, search and confirmed delete", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье", exact: true }).click();
  await page.getByRole("tab", { name: "События", exact: true }).click();
  await page.getByRole("button", { name: "Добавить", exact: true }).click();

  await page.getByLabel("Дата").fill("2026-11-20");
  await page.getByLabel("Тип события").selectOption("operation");
  await page.getByLabel("Название события").fill("Операция для проверки CRUD");
  await page.getByLabel("Медицинское учреждение").fill("Тестовая клиника");
  await page.getByLabel("Описание события").fill("Первоначальное описание");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();

  await expect(page.getByText("Операция для проверки CRUD", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Изменить событие Операция для проверки CRUD" }).click();
  await page.getByLabel("Название события").fill("Операция обновлена");
  await page.getByLabel("Описание события").fill("Изменённое описание");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();

  await expect(page.getByText("Операция обновлена", { exact: true }).first()).toBeVisible();
  await page.getByPlaceholder("Название, тип, клиника, описание").fill("тестовая клиника");
  await expect(page.getByText("Операция обновлена", { exact: true }).first()).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Удалить событие Операция обновлена" }).click();
  await expect(page.getByText("Операция обновлена", { exact: true })).toHaveCount(0);
});

test("lab result entries support edit, multiple documents, replacement and deletion", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье", exact: true }).click();
  await page.getByRole("tab", { name: "История", exact: true }).click();
  const resultsPanel = page.getByRole("region", { name: "Подробные результаты анализов" });
  await page.getByRole("button", { name: "Добавить анализ" }).click();

  await page.getByLabel("Название анализа").fill("Панель лабораторных показателей");
  await page.getByLabel("Дата анализа").fill("2026-11-21");
  await page.getByLabel("Название показателя 1").fill("Гемоглобин");
  await page.getByLabel("Значение показателя 1").fill("132");
  await page.getByLabel("Единица измерения 1").fill("г/л");
  await page.locator('input[aria-label="Выбрать документ анализа"]').setInputFiles([
    { name: "first-report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 first") },
    { name: "second-report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 second") },
  ]);
  await page.getByRole("button", { name: "Сохранить анализ" }).click();

  await expect(resultsPanel.getByRole("link", { name: "first-report.pdf" })).toBeVisible();
  await expect(resultsPanel.getByRole("link", { name: "second-report.pdf" })).toBeVisible();
  expect(await resultsPanel.locator("a").allTextContents()).toEqual(["first-report.pdf", "second-report.pdf"]);
  await expect(resultsPanel.getByRole("link", { name: "first-report.pdf" })).toHaveAttribute("href", /^blob:/);
  await resultsPanel.getByRole("button", { name: "Изменить анализ Панель лабораторных показателей от 2026-11-21" }).click();
  await page.getByLabel("Название анализа").fill("Панель обновлена");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(resultsPanel.getByText("Панель обновлена", { exact: true })).toBeVisible();
  await expect(resultsPanel.getByRole("link", { name: "first-report.pdf" })).toBeVisible();
  await expect(resultsPanel.getByRole("link", { name: "second-report.pdf" })).toBeVisible();

  page.once("dialog", dialog => dialog.accept());
  await resultsPanel.getByRole("button", { name: "Заменить документ first-report.pdf" }).click();
  await resultsPanel.locator('input[aria-label="Выбрать документ для замены"]').setInputFiles({
    name: "replacement-report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 replacement"),
  });
  await expect(resultsPanel.getByRole("link", { name: "replacement-report.pdf" })).toBeVisible();
  await expect(resultsPanel.getByRole("link", { name: "first-report.pdf" })).toHaveCount(0);

  page.once("dialog", dialog => dialog.accept());
  await resultsPanel.getByRole("button", { name: "Удалить документ second-report.pdf" }).click();
  await expect(resultsPanel.getByRole("link", { name: "second-report.pdf" })).toHaveCount(0);
  page.once("dialog", dialog => dialog.accept());
  await resultsPanel.getByRole("button", { name: "Удалить анализ Панель обновлена от 2026-11-21" }).click();
  await expect(resultsPanel.getByText("Панель обновлена", { exact: true })).toHaveCount(0);
});

test("vaccination history supports create, edit, document management and delete", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье", exact: true }).click();
  await page.getByRole("tab", { name: "Прививки", exact: true }).click();
  await page.getByRole("button", { name: "Добавить запись" }).click();

  await page.getByLabel("Вакцина для записи").selectOption({ index: 1 });
  await page.getByLabel("Дата вакцинации").fill("2026-11-18");
  await page.getByLabel("Доза вакцины").fill("Первая доза");
  await page.getByLabel("Медицинское учреждение вакцинации").fill("Клиника вакцинации");
  await page.getByLabel("Примечания к вакцинации").fill("Без особенностей");
  await page.locator('input[aria-label="Документы о вакцинации"]').setInputFiles({
    name: "vaccination-certificate.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 certificate"),
  });
  await page.getByRole("button", { name: "Сохранить запись" }).click();

  await expect(page.getByText("Первая доза", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "vaccination-certificate.pdf" })).toBeVisible();
  const vaccineCard = page.getByRole("region", { name: "История вакцинации" });
  const editButton = vaccineCard.getByRole("button", { name: /Изменить вакцинацию/ });
  await editButton.click();
  await page.getByLabel("Доза вакцины").fill("Вторая доза");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(vaccineCard.getByText(/Вторая доза/)).toBeVisible();

  page.once("dialog", dialog => dialog.accept());
  await vaccineCard.getByRole("button", { name: "Удалить документ vaccination-certificate.pdf" }).click();
  await expect(vaccineCard.getByRole("link", { name: "vaccination-certificate.pdf" })).toHaveCount(0);
  page.once("dialog", dialog => dialog.accept());
  await vaccineCard.getByRole("button", { name: /Удалить вакцинацию/ }).click();
  await expect(vaccineCard.getByText(/Вторая доза/)).toHaveCount(0);
});

test("monitoring items and their manual readings support create, edit and delete", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье", exact: true }).click();
  await page.getByRole("tab", { name: "На контроле", exact: true }).click();
  await page.getByRole("button", { name: "Добавить", exact: true }).click();

  await page.getByLabel("Название контроля").fill("Глюкоза для CRUD");
  await page.getByLabel("Единица измерения").fill("ммоль/л");
  await page.getByLabel("Следующая проверка").fill("2026-12-01");
  await page.getByLabel("Интервал в днях").fill("30");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByText("Глюкоза для CRUD", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Изменить Глюкоза для CRUD" }).click();
  await page.getByLabel("Название контроля").fill("Глюкоза обновлена");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(page.getByText("Глюкоза обновлена", { exact: true })).toBeVisible();

  await page.getByLabel("Дата значения Глюкоза обновлена").fill("2026-11-20");
  await page.getByLabel("Значение Глюкоза обновлена").fill("5.6");
  await page.getByRole("button", { name: "Добавить значение" }).click();
  await expect(page.getByText("5.6 ммоль/л", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Изменить значение Глюкоза обновлена от 2026-11-20" }).click();
  await page.getByLabel("Значение Глюкоза обновлена").fill("5.8");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByText("5.8 ммоль/л", { exact: true }).first()).toBeVisible();

  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Удалить значение Глюкоза обновлена от 2026-11-20" }).click();
  await expect(page.getByText("5.8", { exact: true })).toHaveCount(0);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Удалить Глюкоза обновлена" }).click();
  await expect(page.getByText("Глюкоза обновлена", { exact: true })).toHaveCount(0);
});

test("unified medical history searches, filters and sorts adult records without mixing child data", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье", exact: true }).click();
  await page.getByRole("tab", { name: "События", exact: true }).click();
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.getByLabel("Дата").fill("2026-11-10");
  await page.getByLabel("Название события").fill("Запись для общей истории");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();

  await page.getByRole("tab", { name: "История", exact: true }).click();
  await page.getByLabel("Поиск по всей истории").fill("общей истории");
  const history = page.getByRole("region", { name: "Единая медицинская история" });
  await expect(history.getByText("Запись для общей истории", { exact: true })).toBeVisible();
  await page.getByLabel("Тип медицинской записи").selectOption("event");
  await expect(history.getByText("Запись для общей истории", { exact: true })).toBeVisible();
  await page.getByLabel("С даты").fill("2026-11-11");
  await expect(history.getByText("Запись для общей истории", { exact: true })).toHaveCount(0);
});
