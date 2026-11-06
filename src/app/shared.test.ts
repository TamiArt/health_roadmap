import { describe, expect, it } from "vitest";
import { childAgeStages, childAgeVaccines, createId } from "./shared";
import { LAB_TEST_ASSIGNMENTS, LAB_TEST_CONCEPTS, LIFE_STAGES } from "./data";

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
