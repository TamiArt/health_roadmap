import { motion } from "motion/react";
import { AlertTriangle, Clock } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { QUALITY_DATA, URGENCY_CFG, VACCINES, type Urgency, type VaccineStatus } from "./data";
import type { Section } from "./data";

// ─── Analytics — Health Focus ─────────────────────────────────────────────────

interface HealthPriority {
  area: string; detail: string; urgency: Urgency; action: string;
}

function buildPriorities(vaccineStatuses: Record<string, VaccineStatus>): HealthPriority[] {
  const items: HealthPriority[] = [];
  VACCINES.filter(v => vaccineStatuses[v.id]==="overdue").forEach(v => {
    items.push({ area:`Вакцинация: ${v.name}`, detail:v.protects, urgency:"critical", action:"Записаться на прививку" });
  });
  items.push(
    { area:"Гинеколог — ежегодный осмотр", detail:"ПАП-тест, осмотр, УЗИ малого таза. Выявляет рак шейки матки на ранней стадии", urgency:"critical", action:"Записаться к гинекологу" },
    { area:"Ферритин + ОАК", detail:"Женщины репродуктивного возраста теряют железо ежемесячно. Скрытый дефицит — у 30% женщин", urgency:"important", action:"Сдать кровь натощак" },
    { area:"Витамин D (25-OH)", detail:"Дефицит у 60–80% жителей Петербурга. Влияет на иммунитет, кости, настроение", urgency:"important", action:"Сдать 25-OH витамин D" },
  );
  VACCINES.filter(v => vaccineStatuses[v.id]==="due" && v.mandatory).forEach(v => {
    items.push({ area:`Вакцинация: ${v.name}`, detail:v.protects, urgency:"important", action:"Запланировать прививку" });
  });
  items.push(
    { area:"ТТГ + АТ-ТПО", detail:"Аутоиммунный тиреоидит дебютирует в 20–35 лет. Проверяется раз в 2–3 года", urgency:"routine", action:"Сдать ТТГ, АТ-ТПО" },
    { area:"Стоматолог (плановый)", detail:"Рекомендован каждые 6 месяцев. Профилактика дешевле лечения", urgency:"routine", action:"Записаться к стоматологу" },
    { area:"ОАК + Биохимия + Глюкоза", detail:"Ежегодный обязательный минимум для оценки состояния организма", urgency:"ok", action:"Сданы — продолжайте ежегодно!" },
    { area:"ВПЧ + ПАП-тест", detail:"Пройден. Следующий — через 3 года. Рак шейки матки полностью предотвратим", urgency:"ok", action:"Следующий в 2027" },
  );
  const order: Urgency[] = ["critical","important","routine","ok"];
  return items.sort((a,b) => order.indexOf(a.urgency)-order.indexOf(b.urgency));
}

export function AnalyticsSection({
  vaccineStatuses, onNavigate,
}: {
  vaccineStatuses: Record<string, VaccineStatus>;
  onNavigate: (s: Section) => void;
}) {
  const priorities = buildPriorities(vaccineStatuses);
  const done    = VACCINES.filter(v => vaccineStatuses[v.id]==="done").length;
  const total   = VACCINES.length;
  const overdue = VACCINES.filter(v => vaccineStatuses[v.id]==="overdue").length;
  const dueMandatory = VACCINES.filter(v => vaccineStatuses[v.id]==="due" && v.mandatory).length;
  const critCount = priorities.filter(p => p.urgency==="critical").length;
  const impCount  = priorities.filter(p => p.urgency==="important").length;

  const stageInfo = [
    { stage:"Молодой взрослый (17–30 лет)", current:true, focus:"Репродуктивное здоровье, формирование привычек профилактики, скрининг хронических заболеваний" },
    { stage:"Взрослый (30–45 лет)",         current:false, focus:"Кардиоваскулярный скрининг, гормональный фон, онкологическая настороженность" },
    { stage:"Средний возраст (45–60 лет)",  current:false, focus:"Менопауза, сахарный диабет 2 типа, остеопороз, онкомаркеры" },
    { stage:"Пожилой (60+ лет)",            current:false, focus:"Деменция, ССЗ, ХБП, поддержание функциональности" },
  ];

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily:"'Playfair Display', serif" }}>Аналитика здоровья</h1>
      <p className="text-sm text-muted-foreground mb-7">Что нужно вашему здоровью прямо сейчас · 27 лет</p>

      {/* Stage banner */}
      <div className="bg-primary/8 border border-primary/20 rounded-2xl p-5 mb-6">
        <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider mb-1">Текущий период жизни</p>
        <p className="text-lg font-bold text-foreground mb-1" style={{ fontFamily:"'Playfair Display', serif" }}>Молодой взрослый · 17–30 лет</p>
        <p className="text-sm text-muted-foreground mb-4">Репродуктивное здоровье, профилактика хронических заболеваний, формирование правильных привычек</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            [String(critCount), "критично", "bg-red-50 border-red-200 text-red-700"],
            [String(impCount),  "важно",    "bg-amber-50 border-amber-200 text-amber-700"],
            [`${done}/${total}`,"прививок", "bg-emerald-50 border-emerald-200 text-emerald-700"],
          ].map(([v,l,cls]) => (
            <div key={l} className={`rounded-xl p-3 text-center border ${cls}`}>
              <div className="text-xl font-bold" style={{ fontFamily:"'DM Mono', monospace" }}>{v}</div>
              <div className="text-[10px] font-medium mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Priority list – wider */}
        <div className="lg:col-span-3">
          <p className="text-sm font-semibold text-foreground mb-4">Приоритеты здоровья — от срочного к плановому</p>
          <div className="space-y-2.5">
            {priorities.map((p, i) => {
              const cfg = URGENCY_CFG[p.urgency];
              return (
                <motion.div key={i} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}
                  className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-sm font-semibold ${cfg.text}`}>{p.area}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{p.detail}</p>
                      <p className={`text-xs font-medium ${cfg.text}`}>→ {p.action}</p>
                    </div>
                    <button onClick={() => onNavigate("health")} className={`shrink-0 text-xs px-2.5 py-1.5 rounded-lg border ${cfg.border} ${cfg.text} hover:opacity-80 transition-opacity whitespace-nowrap`}>
                      Раздел →
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Vaccination meter */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-semibold text-foreground mb-1">Вакцинация</p>
            <p className="text-xs text-muted-foreground mb-3">Национальный календарь + рекомендованные</p>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-2">
              <motion.div initial={{ width:0 }} animate={{ width:`${Math.round(done/total*100)}%`}} transition={{ duration:1, ease:"easeOut" }} className="h-full bg-primary rounded-full"/>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mb-3">
              <span>{done} из {total}</span>
              <span className="font-bold text-foreground" style={{ fontFamily:"'DM Mono', monospace" }}>{Math.round(done/total*100)}%</span>
            </div>
            {overdue>0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
                <AlertTriangle size={12} className="text-red-500 shrink-0"/>
                <p className="text-xs text-red-700">{overdue} просроченных</p>
              </div>
            )}
            {dueMandatory>0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Clock size={12} className="text-amber-500 shrink-0"/>
                <p className="text-xs text-amber-700">{dueMandatory} обязательных ожидают</p>
              </div>
            )}
          </div>

          {/* Health score */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-sm font-semibold text-foreground">Динамика здоровья</p>
              <span className="text-sm font-bold text-primary" style={{ fontFamily:"'DM Mono', monospace" }}>88</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Субъективная оценка (0–100)</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={QUALITY_DATA} margin={{ top:5, right:5, bottom:0, left:-22 }}>
                <defs>
                  <linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2C5F5A" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#2C5F5A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tick={{ fontSize:9, fontFamily:"'DM Mono', monospace", fill:"#7A8592" }}/>
                <YAxis domain={[40,100]} tick={{ fontSize:9, fontFamily:"'DM Mono', monospace", fill:"#7A8592" }}/>
                <Tooltip contentStyle={{ background:"#fff", border:"1px solid rgba(26,37,53,0.10)", borderRadius:"8px", fontSize:"11px" }}/>
                <Area type="monotone" dataKey="value" name="Оценка" stroke="#2C5F5A" strokeWidth={2} fill="url(#hGrad)" dot={{ r:3, fill:"#2C5F5A", strokeWidth:0 }} activeDot={{ r:4 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Life stage roadmap */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Здоровье по периодам жизни</p>
            <div className="space-y-3">
              {stageInfo.map((s, i) => (
                <div key={i} className={`rounded-xl p-3 border ${s.current?"bg-primary/8 border-primary/25":"border-border bg-muted/30"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {s.current && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-semibold">Сейчас</span>}
                    <span className={`text-xs font-semibold ${s.current?"text-primary":"text-muted-foreground"}`}>{s.stage}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{s.focus}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
