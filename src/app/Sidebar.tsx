import { BarChart2, CalendarDays, Heart, Map, Users } from "lucide-react";
import type { Section } from "./data";

const NAV_ITEMS = [
  { id: "map", label: "Карта жизни", mobileLabel: "Карта", Icon: Map },
  { id: "health", label: "Здоровье", mobileLabel: "Здоровье", Icon: Heart },
  { id: "family", label: "Семья", mobileLabel: "Семья", Icon: Users },
  { id: "calendar", label: "Календарь", mobileLabel: "Календарь", Icon: CalendarDays },
  { id: "analytics", label: "Аналитика", mobileLabel: "Аналитика", Icon: BarChart2 },
] as const;

export function Sidebar({ active, onSelect }: { active: Section; onSelect: (section: Section) => void }) {
  return (
    <aside className="order-last sm:order-first flex h-[calc(4.25rem+env(safe-area-inset-bottom))] w-full shrink-0 flex-row border-t border-border bg-card pb-[env(safe-area-inset-bottom)] sm:h-screen sm:w-56 sm:flex-col sm:border-r sm:border-t-0 sm:pb-0">
      <div className="hidden items-center gap-3 border-b border-border px-5 py-4 sm:flex">
        <img src="/icon.svg" alt="" aria-hidden="true" className="h-9 w-9 rounded-xl" />
        <span>
          <span className="block font-bold leading-tight text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Life Maps</span>
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Навигатор жизни</span>
        </span>
      </div>
      <nav aria-label="Основная навигация" className="flex min-w-0 flex-1 flex-row items-stretch justify-around gap-1 px-1 py-1 sm:flex-col sm:items-stretch sm:justify-start sm:gap-1.5 sm:p-2.5">
        {NAV_ITEMS.map(({ id, label, mobileLabel, Icon }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-current={selected ? "page" : undefined}
              onClick={() => onSelect(id as Section)}
              className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1 text-[10px] leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-h-11 sm:flex-row sm:flex-none sm:justify-start sm:gap-2.5 sm:px-3 sm:py-2.5 sm:text-sm ${selected ? "bg-primary text-primary-foreground font-semibold shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <Icon size={19} strokeWidth={selected ? 2.4 : 1.8} aria-hidden="true" />
              <span className="truncate sm:hidden">{mobileLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
