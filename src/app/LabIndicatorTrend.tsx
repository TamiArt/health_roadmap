import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface LabTrendPoint {
  date: string;
  value: number;
}

export function LabIndicatorTrend({ name, unit, points }: { name: string; unit: string; points: LabTrendPoint[] }) {
  const data = useMemo(() => [...points].sort((a, b) => a.date.localeCompare(b.date)), [points]);
  if (data.length < 2) return null;
  const first = data[0].value;
  const last = data[data.length - 1].value;
  const direction = last > first ? "Растёт" : last < first ? "Снижается" : "Без изменений";
  const delta = last - first;
  const formatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 });
  return (
    <div className="mt-3 rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-foreground">Динамика: {name}</p>
        <p className="text-[11px] text-muted-foreground" aria-live="polite">
          {direction} · {delta > 0 ? "+" : ""}{formatter.format(delta)} {unit}
        </p>
      </div>
      <div className="h-36 w-full" role="img" aria-label={`График динамики показателя ${name}: ${direction.toLocaleLowerCase("ru")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 2, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={value => new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU")} />
            <YAxis width={48} tick={{ fontSize: 10 }} />
            <Tooltip labelFormatter={value => new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU")} formatter={value => [`${formatter.format(Number(value))} ${unit}`, name]} />
            <Line type="monotone" dataKey="value" name={name} stroke="currentColor" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
