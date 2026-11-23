/**
 * Backward-compatible data exports.
 * New feature code should import from the owning domain module directly.
 */
export type { Section, Category, VaccineStatus, ToothStatus, Urgency, LifeEvent, UploadedResult, LabMeasurement, VaccineRecord, Child, FamilyMember, FamilyEvent, HealthRoadmapCheck, HealthRoadmapStage, QualityDataPoint } from "./models";
export { LIFE_STAGES, LAB_TEST_CONCEPTS, LAB_TEST_ASSIGNMENTS, LAB_TEST_STAGE_DEFINITIONS } from "./labCatalog";
export type { LabTest, LabTestConcept, LabTestAssignment, LabTestGender, LabTestStageDefinition, LifeStage } from "./labCatalog";
export { CATEGORY_CONFIG, LIFE_EVENTS_INIT } from "./lifeMapData";
export { HEALTH_ROADMAP, VACCINES } from "./healthData";
export { FAMILY_MEMBERS_INIT, FAMILY_EVENTS_INIT } from "./familyData";
export { QUALITY_DATA, URGENCY_CFG } from "./analyticsData";
