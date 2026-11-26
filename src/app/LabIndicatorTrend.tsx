import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { parseReferenceRange } from "./analyticsModel";
export interface LabTrendPoint { date: string; value: number; }
const format = (value: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value);
export function LabIndicatorTrend({ name, unit, points, referenceRange }: { name: string; unit: string; points: LabTrendPoint[]; referenceRange?: string }) {
  const data = useMemo(() => [...points].sort((a,b) => a.date.localeCompare(b.date)), [points]);
  const bounds = parseReferenceRange(referenceRange);
  if (data.length < 2) return null;
  const first = data[0].value; const last = data[data.length - 1].value;
  const direction = last > first ? "Рост" : last < first ? "Снижение" : "Без изменений";
  const delta = last - first; const values = data.map(item => item.value);
  const min = Math.min(...values, bounds?.lower ?? Infinity); const max = Math.max(...values, bounds?.upper ?? -Infinity);
  const padding = Math.max((max - min) * 0.12, Math.abs(max || 1) * 0.03, 0.01);
  const domain: [number, number] = [min - padding, max + padding];
  const rangeText = referenceRange ? `Референс: ${referenceRange} ${unit}` : "Референсный диапазон не указан";
  return <section className="mt-3 min-w-0 w-full overflow-hidden rounded-lg border border-border/70 bg-muted/20 p-3" aria-label={`Динамика показателя ${name}`}>
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><p className="text-xs font-medium text-foreground">{name}</p><p className="text-[11px] text-muted-foreground">{direction} · {delta > 0 ? "+" : ""}{format(delta)} {unit}</p></div>
    <p className="mb-2 text-[10px] text-muted-foreground">{rangeText}</p>
    <div className="h-40 min-w-0 w-full overflow-hidden" role="img" aria-label={`График ${name}: ${direction.toLocaleLowerCase("ru")}. ${rangeText}`}>
      <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, bottom: 2, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
        {bounds?.lower !== undefined && bounds.upper !== undefined && <ReferenceArea y1={bounds.lower} y2={bounds.upper} fill="#16a34a" fillOpacity={0.08}/>}
        {bounds?.lower !== undefined && bounds.upper === undefined && <ReferenceArea y1={bounds.lower} y2={domain[1]} fill="#16a34a" fillOpacity={0.08}/>}
        {bounds?.upper !== undefined && bounds.lower === undefined && <ReferenceArea y1={domain[0]} y2={bounds.upper} fill="#16a34a" fillOpacity={0.08}/>}
        {bounds?.lower !== undefined && <ReferenceLine y={bounds.lower} stroke="#16a34a" strokeDasharray="4 3"/>}
        {bounds?.upper !== undefined && <ReferenceLine y={bounds.upper} stroke="#16a34a" strokeDasharray="4 3"/>}
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={value => new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU")}/>
        <YAxis width={52} domain={domain} tick={{ fontSize: 10 }}/>
        <Tooltip labelFormatter={value => new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU")} formatter={value => [`${format(Number(value))} ${unit}`, name]}/>
        <Line type="monotone" dataKey="value" name={name} stroke="currentColor" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}/>
      </LineChart></ResponsiveContainer>
    </div>
  </section>;
}
