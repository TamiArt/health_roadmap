import { describe, expect, it } from "vitest";
import { childAgeStages, childAgeVaccines, createId, isValidRequiredText, parseBoundedInteger, validateLabMeasurement, validateLabUpload } from "./shared";
import { LAB_TEST_ASSIGNMENTS, LAB_TEST_CONCEPTS, LIFE_STAGES } from "./labCatalog";

describe("childAgeStages", () => {
  it.each([
    [0, ["base", "newborn"]],
    [1, ["early_child"]],
    [5, ["early_child"]],
    [6, ["school"]],
    [17, ["school"]],
    [18, ["young_adult"]],
  ])("selects the configured stage set at age %i", (age, expected) => {
    expect(childAgeStages(age).map(stage => stage.id)).toEqual(expected);
  });

  it("does not show the same test concept twice for an infant", () => {
    const infantAssignments = childAgeStages(0).flatMap(stage => stage.tests);
    const conceptIds = infantAssignments.map(test => test.conceptId ?? test.id);

    expect(new Set(conceptIds).size).toBe(conceptIds.length);
    expect(infantAssignments.some(test => test.id === "n1" || test.id === "n2")).toBe(false);
  });
});

describe("childAgeVaccines", () => {
  it("does not include the Shingrix record in the child list", () => {
    expect(childAgeVaccines(18).some(vaccine => vaccine.id === "shingrix")).toBe(false);
  });

  it("filters records by their configured minimum age", () => {
    const age = 6;
    const vaccines = childAgeVaccines(age);

    expect(vaccines.every(vaccine => (vaccine.minAge ?? 0) <= age)).toBe(true);
  });

  it("never returns fewer records at an older age", () => {
    expect(childAgeVaccines(18).length).toBeGreaterThanOrEqual(childAgeVaccines(0).length);
  });
});

describe("createId", () => {
  it("returns a distinct non-empty identifier for each call", () => {
    const ids = Array.from({ length: 100 }, () => createId());

    expect(ids.every(id => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("lab test catalogue", () => {
  it("uses concepts and assignments as the canonical source for the UI stage projection", () => {
    expect(LAB_TEST_CONCEPTS).toHaveLength(42);
    expect(LAB_TEST_ASSIGNMENTS).toHaveLength(57);
    expect(LAB_TEST_CONCEPTS.every(concept =>
      LAB_TEST_ASSIGNMENTS.some(assignment => assignment.conceptId === concept.id)
    )).toBe(true);

    const projected = LIFE_STAGES.flatMap(stage => stage.tests);
    expect(projected).toHaveLength(LAB_TEST_ASSIGNMENTS.length);
    expect(projected.map(test => test.id)).toEqual(LAB_TEST_ASSIGNMENTS.map(assignment => assignment.id));
    expect(projected.every(test => test.conceptId.length > 0)).toBe(true);
  });

  it("keeps age-specific presentation overrides on assignments", () => {
    const schoolCbc = LAB_TEST_ASSIGNMENTS.find(assignment => assignment.id === "s1");
    expect(schoolCbc?.what).toContain("тромбоциты");
    expect(LIFE_STAGES.find(stage => stage.id === "early_child")?.tests.find(test => test.id === "ec1")?.what)
      .toContain("анемия");
    expect(LIFE_STAGES.find(stage => stage.id === "school")?.tests.find(test => test.id === "s1")?.what)
      .toBe(schoolCbc?.what);
  });

  it("keeps normalized concept and age-assignment identities consistent", () => {
    const conceptIds = new Set(LAB_TEST_CONCEPTS.map(concept => concept.id));

    expect(new Set(LAB_TEST_CONCEPTS.map(concept => concept.id)).size).toBe(LAB_TEST_CONCEPTS.length);
    expect(LAB_TEST_ASSIGNMENTS.every(assignment => conceptIds.has(assignment.conceptId))).toBe(true);
    expect(new Set(LAB_TEST_ASSIGNMENTS.map(assignment => assignment.id)).size).toBe(LAB_TEST_ASSIGNMENTS.length);
  });

  it("reuses canonical concepts for repeated age-specific tests", () => {
    const assignmentsByConcept = LAB_TEST_ASSIGNMENTS.reduce<Record<string, string[]>>((result, assignment) => {
      result[assignment.conceptId] = [...(result[assignment.conceptId] ?? []), assignment.stageId];
      return result;
    }, {});

    expect(assignmentsByConcept.cbc).toEqual(["early_child", "school", "young_adult", "adult"]);
    expect(assignmentsByConcept.urinalysis).toEqual(["early_child", "school", "young_adult", "adult"]);
    expect(assignmentsByConcept.ferritin).toEqual(["early_child", "young_adult", "adult"]);
    expect(assignmentsByConcept["iron-studies"]).toEqual(["school"]);
    expect(assignmentsByConcept.tsh).toEqual(["school", "young_adult"]);
    expect(assignmentsByConcept["thyroid-panel"]).toEqual(["adult"]);
  });

  it("keeps test identifiers unique across age stages", () => {
    const ids = LIFE_STAGES.flatMap(stage => stage.tests.map(test => test.id));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps recommended classification in the catalogue as the single source of truth", () => {
    const recommendedIds = LIFE_STAGES
      .flatMap(stage => stage.tests)
      .filter(test => test.priority === "r")
      .map(test => test.id)
      .sort();

    expect(recommendedIds).toEqual([
      "a10", "a4", "a5", "a9", "ai1", "ai2", "ai3", "fe2", "r1", "r11",
      "r12", "r13", "r2", "r3", "r4", "r5", "r6", "s4", "s6", "th3", "ya9",
    ]);
  });
});


describe("form validation helpers", () => {
  it("rejects empty, whitespace-only, decimal and out-of-range integer values", () => {
    expect(parseBoundedInteger("", 0, 120)).toBeNull();
    expect(parseBoundedInteger("   ", 0, 120)).toBeNull();
    expect(parseBoundedInteger("1.5", 0, 120)).toBeNull();
    expect(parseBoundedInteger("-1", 0, 120)).toBeNull();
    expect(parseBoundedInteger("121", 0, 120)).toBeNull();
    expect(parseBoundedInteger("27", 0, 120)).toBe(27);
  });

  it("accepts only non-empty trimmed text within the configured length", () => {
    expect(isValidRequiredText("  ", 80)).toBe(false);
    expect(isValidRequiredText(" A ", 80)).toBe(true);
    expect(isValidRequiredText("x".repeat(81), 80)).toBe(false);
  });
});


describe("manual lab measurement validation", () => {
  it("accepts numeric and qualitative values with a valid non-future date", () => {
    expect(validateLabMeasurement("5.4", "2026-11-06", "ммоль/л")).toBeNull();
    expect(validateLabMeasurement("<0.1", "2026-11-06", "нг/мл")).toBeNull();
    expect(validateLabMeasurement("отрицательно", "2026-11-06", "")).toBeNull();
  });
  it("rejects blank values, invalid/future dates and oversized units", () => {
    expect(validateLabMeasurement("  ", "2026-11-06", "")).toContain("Укажите значение");
    expect(validateLabMeasurement("5", "2026-02-30", "")).toContain("корректную дату");
    expect(validateLabMeasurement("5", "2099-01-01", "")).toContain("будущем");
    expect(validateLabMeasurement("5", "2026-11-06", "x".repeat(21))).toContain("20 символов");
  });
});

describe("medical attachment validation", () => {
  it("allows supported formats and rejects unsupported or misleading files", () => {
    expect(validateLabUpload({ name: "result.pdf", type: "application/pdf", size: 1024 })).toBeNull();
    expect(validateLabUpload({ name: "scan.JPG", type: "image/jpeg", size: 1024 })).toBeNull();
    expect(validateLabUpload({ name: "scan.svg", type: "image/svg+xml", size: 1024 })).toContain("Поддерживаются только");
    expect(validateLabUpload({ name: "result.pdf", type: "image/png", size: 1024 })).toContain("не соответствует");
  });

  it("rejects empty files and files larger than 15 MiB", () => {
    expect(validateLabUpload({ name: "empty.pdf", type: "application/pdf", size: 0 })).toBe("Файл пустой.");
    expect(validateLabUpload({ name: "large.pdf", type: "application/pdf", size: 15 * 1024 * 1024 + 1 })).toContain("15 МБ");
    expect(validateLabUpload({ name: "limit.pdf", type: "application/pdf", size: 15 * 1024 * 1024 })).toBeNull();
  });
});
