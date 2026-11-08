import type { QualityDataPoint, Urgency } from "./models";

/** Analytics presentation configuration and demo-only chart values. */
export const URGENCY_CFG: Record<Urgency, { label: string; bg: string; text: string; border: string; dot: string }> = {
  critical:  { label: "Критично",  bg: "bg-red-50",      text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500"     },
  important: { label: "Важно",     bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500"   },
  routine:   { label: "Плановое",  bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-400"    },
  ok:        { label: "Норма",     bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
};

export const QUALITY_DATA: QualityDataPoint[] = [
  { year:"2018", value:62 }, { year:"2019", value:70 },
  { year:"2020", value:55 }, { year:"2021", value:74 },
  { year:"2022", value:80 }, { year:"2023", value:84 },
  { year:"2024", value:88 },
];
