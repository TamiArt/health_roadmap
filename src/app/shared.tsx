import { Check, Pencil, Trash2 } from "lucide-react";
import { LIFE_STAGES, VACCINES, type LifeStage, type VaccineRecord } from "./data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const INP = "w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/60";
export const SEL = "text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary/50";
export const CURRENT_YEAR = 2026;

let fallbackIdCounter = 0;

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  fallbackIdCounter += 1;
  return `id-${Date.now()}-${fallbackIdCounter}`;
}

export function EditToggle({ on, toggle }: { on: boolean; toggle: () => void }) {
  return (
    <button onClick={toggle}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
        on ? "bg-primary/10 border-primary/30 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      {on ? <><Check size={11} /> Готово</> : <><Pencil size={11} /> Изменить</>}
    </button>
  );
}

export function DelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="shrink-0 p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all">
      <Trash2 size={12} />
    </button>
  );
}

export function childAgeStages(age: number): LifeStage[] {
  const stageId = age < 1
    ? ["base", "newborn"]
    : age < 6
      ? ["early_child"]
      : age < 18
        ? ["school"]
        : ["young_adult"];

  return stageId
    .map(id => LIFE_STAGES.find(stage => stage.id === id))
    .filter((stage): stage is LifeStage => stage !== undefined);
}

export function childAgeVaccines(age: number): VaccineRecord[] {
  return VACCINES.filter(v => {
    if (v.id === "shingrix") return false;
    return (v.minAge ?? 0) <= age;
  });
}
