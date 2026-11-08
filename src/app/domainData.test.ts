import { describe, expect, it } from "vitest";
import { CATEGORY_CONFIG, LIFE_EVENTS_INIT } from "./lifeMapData";
import { HEALTH_ROADMAP, VACCINES } from "./healthData";
import { FAMILY_EVENTS_INIT, FAMILY_MEMBERS_INIT } from "./familyData";
import { QUALITY_DATA, URGENCY_CFG } from "./analyticsData";

describe("domain data modules", () => {
  it("keeps life-map configuration and fixtures in the life-map domain", () => {
    expect(Object.keys(CATEGORY_CONFIG)).toHaveLength(7);
    expect(LIFE_EVENTS_INIT).toHaveLength(6);
    expect(new Set(LIFE_EVENTS_INIT.map(event => event.id)).size).toBe(LIFE_EVENTS_INIT.length);
  });

  it("keeps health reference data in the health domain", () => {
    expect(HEALTH_ROADMAP.map(stage => stage.age)).toEqual([18, 21, 25, 30]);
    expect(VACCINES).toHaveLength(13);
    expect(new Set(VACCINES.map(vaccine => vaccine.id)).size).toBe(VACCINES.length);
  });

  it("keeps family fixtures in the family domain", () => {
    expect(FAMILY_MEMBERS_INIT).toHaveLength(2);
    expect(FAMILY_EVENTS_INIT).toHaveLength(3);
    expect(new Set(FAMILY_MEMBERS_INIT.map(member => member.id)).size).toBe(FAMILY_MEMBERS_INIT.length);
    expect(new Set(FAMILY_EVENTS_INIT.map(event => event.id)).size).toBe(FAMILY_EVENTS_INIT.length);
  });

  it("keeps analytics presentation settings separate from demo chart values", () => {
    expect(Object.keys(URGENCY_CFG)).toEqual(["critical", "important", "routine", "ok"]);
    expect(QUALITY_DATA.map(point => point.year)).toEqual(["2018", "2019", "2020", "2021", "2022", "2023", "2024"]);
    expect(QUALITY_DATA.every(point => point.value >= 0 && point.value <= 100)).toBe(true);
  });
});
