import { BarChart2, Compass, Heart, Map, Settings, Users } from "lucide-react";
import type { Section } from "./data";

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id:"map",       label:"Карта жизни",  Icon: Map      },
  { id:"health",    label:"Здоровье",     Icon: Heart    },
  { id:"family",    label:"Семья",        Icon: Users    },
  { id:"analytics", label:"Аналитика",    Icon: BarChart2},
] as const;

export function Sidebar({ active, onSelect }: { active: Section; onSelect: (s: Section) => void }) {
  return (
    <aside className="order-last sm:order-first w-full h-16 sm:w-56 sm:h-screen flex flex-row sm:flex-col shrink-0 bg-card border-t sm:border-t-0 sm:border-r border-border">
      <div className="hidden sm:block px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Compass size={15} className="text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-none mb-0.5" style={{ fontFamily:"'Playfair Display', serif" }}>Life Maps</p>
            <p className="text-[10px] text-muted-foreground tracking-wide uppercase">Навигатор жизни</p>
          </div>
        </div>
      </div>
      <div className="hidden sm:block px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-lg">👩‍🔬</div>
          <div>
            <p className="text-sm font-semibold text-foreground">Александра М.</p>
            <p className="text-[11px] text-muted-foreground">27 лет · Санкт-Петербург</p>
          </div>
        </div>
      </div>
      <nav aria-label="Основная навигация" className="flex flex-1 flex-row sm:flex-col items-center sm:items-stretch justify-around sm:justify-start p-1 sm:p-2.5 sm:space-y-0.5">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button key={id} type="button" aria-current={active === id ? "page" : undefined} onClick={() => onSelect(id as Section)}
            className={`flex-1 sm:flex-none w-full flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2.5 px-1 sm:px-3 py-1.5 sm:py-2.5 rounded-lg text-[10px] sm:text-sm transition-all ${
              active === id ? "bg-primary text-primary-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </nav>
      <div className="hidden sm:block p-2.5 border-t border-border">
        <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Settings size={15} />Настройки
        </button>
      </div>
    </aside>
  );
}
