import { describe, expect, it } from "vitest";
import { childAgeStages, childAgeVaccines } from "./shared";

describe("childAgeStages", () => {
  it.each([
    [0, ["base", "newborn"]],
    [1, ["base", "early_child"]],
    [5, ["base", "early_child"]],
    [6, ["base", "school"]],
    [17, ["base", "school"]],
    [18, ["base"]],
  ])("selects the configured stage set at age %i", (age, expected) => {
    expect(childAgeStages(age).map(stage => stage.id)).toEqual(expected);
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
