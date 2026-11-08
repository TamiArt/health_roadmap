import { Check, Pencil, Trash2 } from "lucide-react";
import { LIFE_STAGES, VACCINES } from "./data";
import type { LifeStage } from "./labCatalog";
import type { VaccineRecord } from "./models";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const INP = "w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/60";
export const SEL = "text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary/50";
export const CURRENT_YEAR = 2026;

/** Parse an integer without treating an empty field as zero. */
export function parseBoundedInteger(value: string | number, min: number, max: number): number | null {
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

/** Validate required user-facing text after trimming whitespace. */
export function isValidRequiredText(value: string, maxLength: number): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength;
}

/** Validate a manually entered lab result and its sample date. */
export function validateLabMeasurement(value: string, date: string, unit: string): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "Укажите значение результата.";
  if (trimmedValue.length > 40) return "Значение не должно превышать 40 символов.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Укажите корректную дату анализа.";
  const parsedDate = new Date(date + "T00:00:00");
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.getFullYear() !== Number(date.slice(0, 4)) ||
      parsedDate.getMonth() + 1 !== Number(date.slice(5, 7)) || parsedDate.getDate() !== Number(date.slice(8, 10))) {
    return "Укажите корректную дату анализа.";
  }
  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth()+1).padStart(2,"0"), String(now.getDate()).padStart(2,"0")].join("-");
  if (date > today) return "Дата анализа не может быть в будущем.";
  if (unit.trim().length > 20) return "Единица измерения не должна превышать 20 символов.";
  return null;
}

/** Validate lab-result uploads before persisting their Blob in IndexedDB. */
export function validateLabUpload(file: Pick<File, "name" | "type" | "size">): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedTypes: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  };
  const expectedType = allowedTypes[extension];
  if (!expectedType) return "Поддерживаются только PDF, PNG, JPG, WEBP и GIF.";
  if (file.size <= 0) return "Файл пустой.";
  if (file.size > 15 * 1024 * 1024) return "Размер одного файла не должен превышать 15 МБ.";
  if (file.type && file.type !== expectedType) return "Тип файла не соответствует его расширению.";
  return null;
}

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

export function DelBtn({ onClick, ariaLabel }: { onClick: () => void; ariaLabel?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className="shrink-0 p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all">
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
