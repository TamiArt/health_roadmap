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
      await page.getByRole("button", { name: tab, exact: true }).click();
      await expect(page.getByRole("heading", { name: "Навигатор здоровья" })).toBeVisible();
    }
  });
});

test("adds a life event and displays it in the timeline", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить событие" }).click();

  await page.getByPlaceholder("Год (2025)").fill("2026");
  await page.getByPlaceholder("Название события").fill("E2E проверка события");
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

  await page.getByText("E2E ребёнок", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "E2E ребёнок" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Анализы", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Вернуться к семье" }).click();
  await expect(page.getByRole("heading", { name: "Семья" })).toBeVisible();
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
  await page.getByRole("button", { name: "Прививки", exact: true }).click();

  const vaccineStatus = page.getByRole("button", { name: "Нужна", exact: true }).first();
  await expect(vaccineStatus).toBeVisible();
  await vaccineStatus.click();
  await expect(page.getByRole("button", { name: "Сделана", exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Сделана", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Просрочена", exact: true }).first()).toBeVisible();
});

test("updates a tooth status and saves its note", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье" }).click();
  await page.getByRole("button", { name: "Стоматолог", exact: true }).click();

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

  await page.getByRole("button", { name: "Семья" }).click();
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "Добавить ребёнка" }).click();
  await page.getByPlaceholder("Имя").fill("Профиль после навигации");
  await page.getByPlaceholder("Год рождения (2022)").fill("2021");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();

  await page.getByRole("button", { name: "Карта жизни" }).click();
  await expect(page.getByText("Событие после навигации", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Семья" }).click();
  await expect(page.getByText("Профиль после навигации", { exact: true })).toBeVisible();
});

test("preserves health sub-tab data after navigating away and back", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Здоровье" }).click();
  await page.getByRole("button", { name: "Стоматолог", exact: true }).click();

  const tooth = page.locator('button[title="Зуб 11 — верхний правый резец"]');
  await tooth.click();
  await page.getByRole("button", { name: "Кариес", exact: true }).click();
  const note = page.getByPlaceholder("Заметки: дата, врач, жалобы...");
  await note.fill("Сохраняется после перехода между разделами");

  await page.getByRole("button", { name: "Прививки", exact: true }).click();
  await page.getByRole("button", { name: "Стоматолог", exact: true }).click();
  await expect(note).toHaveValue("Сохраняется после перехода между разделами");

  await page.getByRole("button", { name: "Семья" }).click();
  await page.getByRole("button", { name: "Здоровье" }).click();
  await expect(page.getByRole("button", { name: "Стоматолог", exact: true })).toBeVisible();
  await expect(tooth).toBeVisible();
  await expect(note).toHaveValue("Сохраняется после перехода между разделами");
  await expect(page.getByRole("button", { name: "Кариес", exact: true })).toHaveClass(/bg-red-500/);
});
