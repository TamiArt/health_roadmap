import { useState } from "react";
import { motion } from "motion/react";
import { Pencil, Plus } from "lucide-react";
import { CATEGORY_CONFIG, LIFE_EVENTS_INIT, type Category, type LifeEvent } from "./data";
import { CURRENT_YEAR, createId, DelBtn, EditToggle, INP, SEL } from "./shared";

// ─── Life Map ─────────────────────────────────────────────────────────────────

export function LifeMapSection() {
  const [events, setEvents] = useState<LifeEvent[]>(LIFE_EVENTS_INIT);
  const [showAll, setShowAll] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<LifeEvent>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ year:"", emoji:"✨", title:"", description:"", category:"personal" as Category, milestone:false });

  const sorted = [...events].sort((a, b) => a.year - b.year);
  const visible = showAll ? sorted : sorted.filter(e => e.milestone);

  function startEdit(ev: LifeEvent) { setEditingId(ev.id); setEditForm({ ...ev }); }
  function saveEdit() {
    if (!editingId || !editForm.title) return;
    setEvents(prev => prev.map(e => e.id === editingId ? { ...e, ...editForm } as LifeEvent : e));
    setEditingId(null);
  }
  function addEvent() {
    if (!addForm.year || !addForm.title) return;
    const ev: LifeEvent = { id: createId(), year:+addForm.year, title:addForm.title, description:addForm.description, category:addForm.category, emoji:addForm.emoji||"✨", milestone:addForm.milestone };
    setEvents(prev => [...prev, ev]);
    setAddForm({ year:"", emoji:"✨", title:"", description:"", category:"personal", milestone:false });
    setShowAdd(false);
  }

  const milestones = events.filter(e => e.milestone).length;

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 backdrop-blur-sm border-b border-border px-8 py-5"
        style={{ background:"rgba(242,238,228,0.95)", backgroundImage:"radial-gradient(circle, rgba(44,95,90,0.07) 1px, transparent 1px)", backgroundSize:"22px 22px" }}
      >
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily:"'Playfair Display', serif" }}>Карта жизни</h1>
            <p className="text-sm text-muted-foreground">Ваш путь с 1997 по сегодня</p>
          </div>
          <div className="flex items-center gap-4">
            {[[String(CURRENT_YEAR - 1997),"лет"],[String(milestones),"ключевых"]].map(([v,l]) => (
              <div key={l} className="text-right">
                <div className="text-xl font-bold text-foreground" style={{ fontFamily:"'DM Mono', monospace" }}>{v}</div>
                <div className="text-[11px] text-muted-foreground">{l}</div>
              </div>
            ))}
            <EditToggle on={editMode} toggle={() => { setEditMode(e => !e); setShowAdd(false); setEditingId(null); }} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => setShowAll(false)} className={`text-xs px-3 py-1 rounded-full transition-all ${!showAll ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            ★ Ключевые ({milestones})
          </button>
          <button onClick={() => setShowAll(true)} className={`text-xs px-3 py-1 rounded-full transition-all ${showAll ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            Все события ({events.length})
          </button>
        </div>
      </div>

      <div className="px-8 py-10 max-w-3xl mx-auto">
        <div className="relative">
          <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />
          <div className="space-y-5">
            {visible.map((ev, i) => {
              const flip = i % 2 === 1;
              const cfg = CATEGORY_CONFIG[ev.category];
              const isEditing = editingId === ev.id;
              return (
                <motion.div key={ev.id} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.04 }}
                  className={`flex items-center ${flip ? "flex-row-reverse" : ""}`}
                >
                  <div className={`flex-1 ${flip ? "pl-7" : "pr-7"} flex ${flip ? "justify-start" : "justify-end"}`}>
                    <div className="relative w-full max-w-[270px]">
                      {editMode && !isEditing && (
                        <div className="absolute -top-1.5 -right-1.5 z-10 flex gap-1">
                          <button onClick={() => startEdit(ev)} className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"><Pencil size={11} /></button>
                          <DelBtn onClick={() => setEvents(prev => prev.filter(e => e.id !== ev.id))} />
                        </div>
                      )}
                      {isEditing ? (
                        <div className="bg-card border border-primary/30 rounded-xl p-3 shadow-md">
                          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                            <input value={editForm.year??""} onChange={e => setEditForm(f => ({ ...f, year:+e.target.value }))} type="number" placeholder="Год" className={INP} />
                            <input value={editForm.emoji??""} onChange={e => setEditForm(f => ({ ...f, emoji:e.target.value }))} placeholder="Emoji" className={INP} />
                          </div>
                          <input value={editForm.title??""} onChange={e => setEditForm(f => ({ ...f, title:e.target.value }))} placeholder="Название" className={`${INP} mb-1.5`} />
                          <textarea value={editForm.description??""} onChange={e => setEditForm(f => ({ ...f, description:e.target.value }))} rows={2} placeholder="Описание" className={`${INP} resize-none mb-1.5`} />
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                              <input type="checkbox" checked={editForm.milestone??false} onChange={e => setEditForm(f => ({ ...f, milestone:e.target.checked }))} className="w-3.5 h-3.5 accent-primary" />
                              Ключевое
                            </label>
                            <div className="flex gap-1.5">
                              <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 border border-border rounded text-muted-foreground">Отмена</button>
                              <button onClick={saveEdit} className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">Сохранить</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={`bg-card rounded-xl border p-4 shadow-sm ${ev.milestone ? "border-primary/25 ring-1 ring-primary/10" : "border-border"}`}>
                          <div className="flex items-start gap-3">
                            <span className="text-xl shrink-0">{ev.emoji}</span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-semibold text-foreground">{ev.title}</span>
                                {ev.milestone && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">★</span>}
                              </div>
                              {ev.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed italic">{ev.description}</p>}
                              <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="relative z-10 shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border-2 shadow-sm ${ev.milestone ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"}`}
                      style={{ fontFamily:"'DM Mono', monospace" }}
                    >
                      '{String(ev.year).slice(2)}
                    </div>
                  </div>
                  <div className="flex-1" />
                </motion.div>
              );
            })}
          </div>

          {editMode && (
            <div className="mt-6 flex justify-center">
              {showAdd ? (
                <div className="w-full max-w-sm bg-card border border-primary/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-foreground mb-3">Новое событие</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input value={addForm.year} onChange={e => setAddForm(f => ({ ...f, year:e.target.value }))} placeholder="Год (2025)" type="number" className={INP} />
                    <input value={addForm.emoji} onChange={e => setAddForm(f => ({ ...f, emoji:e.target.value }))} placeholder="Emoji ✨" className={INP} />
                  </div>
                  <input value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title:e.target.value }))} placeholder="Название события" className={`${INP} mb-2`} />
                  <div className="flex items-center gap-2 mb-2">
                    <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category:e.target.value as Category }))} className={`${SEL} flex-1`}>
                      {(Object.keys(CATEGORY_CONFIG) as Category[]).map(k => (
                        <option key={k} value={k}>{CATEGORY_CONFIG[k].label}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                      <input type="checkbox" checked={addForm.milestone} onChange={e => setAddForm(f => ({ ...f, milestone:e.target.checked }))} className="w-3.5 h-3.5 accent-primary" />
                      Ключевое
                    </label>
                  </div>
                  <textarea value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description:e.target.value }))} placeholder="Описание (необязательно)" rows={2} className={`${INP} resize-none mb-3`} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowAdd(false)} className="text-xs px-3 py-1.5 border border-border rounded-lg text-muted-foreground">Отмена</button>
                    <button onClick={addEvent} className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg">Добавить</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 text-xs px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-xl hover:bg-primary/15 transition-all">
                  <Plus size={13} /> Добавить событие
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
