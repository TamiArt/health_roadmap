/** Shared domain types used by feature modules and data fixtures. */
export type Section = "map" | "health" | "family" | "analytics";
export type Category = "personal" | "education" | "career" | "travel" | "health" | "family" | "achievement";
export type VaccineStatus = "done" | "due" | "overdue" | "not_applicable";
export type ToothStatus = "healthy" | "caries" | "filled" | "crown" | "implant" | "extracted" | "treatment";
export type Urgency = "critical" | "important" | "routine" | "ok";

export interface LifeEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  category: Category;
  emoji: string;
  milestone?: boolean;
}
export interface UploadedResult { id: string; name: string; date: string; blob: Blob; isPdf: boolean; }
export interface LabMeasurement {
  id: string;
  /** Local YYYY-MM-DD date when the sample was collected or test performed. */
  date: string;
  /** Original numeric or qualitative result representation. */
  value: string;
  unit: string;
}
export interface VaccineRecord {
  id: string; name: string; protects: string; schedule: string;
  mandatory: boolean; status: VaccineStatus; note: string; minAge?: number;
}
export interface Child { id: string; name: string; birthYear: number; emoji: string; }
export interface FamilyMember { id: string; name: string; relation: string; age: number; emoji: string; }
export interface FamilyEvent { id: string; date: string; title: string; emoji: string; }
export interface HealthRoadmapCheck { name: string; done: boolean; reason: string; }
export interface HealthRoadmapStage {
  age: number; label: string; done: boolean; current: boolean; checks: HealthRoadmapCheck[];
}
export interface QualityDataPoint { year: string; value: number; }
