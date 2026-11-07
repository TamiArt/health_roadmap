import { useId, useState } from "react";
import { usePersistentState } from "./storage";
import { motion } from "motion/react";
import { ArrowLeft, Baby, Heart, Plus } from "lucide-react";
import { FAMILY_EVENTS_INIT, FAMILY_MEMBERS_INIT, type Child, type ToothStatus, type VaccineStatus } from "./data";
import { CURRENT_YEAR, childAgeStages, childAgeVaccines, createId, isValidRequiredText, parseBoundedInteger, DelBtn, EditToggle, INP } from "./shared";
import { DentalTab, LabTestsTab, VaccinesTab } from "./HealthSection";

// ─── Child Health View ────────────────────────────────────────────────────────

function ChildHealthView({ child, onBack }: { child:Child; onBack:()=>void }) {
  const age = CURRENT_YEAR - child.birthYear;
  const [tab, setTab] = useState<"tests"|"vaccines"|"dental">("tests");
  const tabsId = useId();
  const [vaccineStatuses, setVaccineStatuses, vaccineReady, vaccineError] = usePersistentState<Record<string,VaccineStatus>>(
    `childHealth:${child.id}:vaccineStatuses`,
    Object.fromEntries(childAgeVaccines(age).map(v => [v.id, v.status]))
  );
  const [toothData, setToothData, toothReady, toothError] = usePersistentState<Record<number,{status:ToothStatus;note:string}>>(
    `childHealth:${child.id}:toothData`,
    {}
  );
  const stages = childAgeStages(age);
  const agePeriod = age<1?"Новорождённый":age<6?"Дошкольник":age<18?"Школьник":"Взрослый";

  const tabs: Array<["tests"|"vaccines"|"dental", string]> = [["tests","Анализы"],["vaccines","Прививки"]];
  if (age>=5) tabs.push(["dental","Стоматолог"]);

  if (!vaccineReady || !toothReady) return <div className="p-8 text-sm text-muted-foreground">Загрузка данных профиля…</div>;
  if (vaccineError || toothError) return <div role="alert" className="p-8 text-sm text-red-600">{vaccineError ?? toothError}</div>;

  return (
    <div className="p-8 max-w-xl">
      <button onClick={onBack} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft size={13}/> Вернуться к семье
      </button>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">{child.emoji}</div>
        <div>
          <h1 className="text-xl font-bold text-foreground" style={{ fontFamily:"'Playfair Display', serif" }}>{child.name}</h1>
          <p className="text-sm text-muted-foreground">{age} {age===1?"год":age<5?"года":"лет"} · {child.birthYear} г.р.</p>
          <span className="inline-block mt-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{agePeriod}</span>
        </div>
      </div>
      <div role="tablist" aria-label="Разделы здоровья ребёнка" className="flex gap-1 bg-muted p-1 rounded-lg mb-6">
        {tabs.map(([id,label]) => (
          <button key={id} id={`${tabsId}-tab-${id}`} type="button" role="tab" aria-selected={tab===id} aria-controls={`${tabsId}-panel-${id}`} onClick={() => setTab(id)} className={`flex-1 py-1.5 text-xs rounded-md transition-all font-medium ${tab===id?"bg-card shadow-sm text-foreground":"text-muted-foreground hover:text-foreground"}`}>{label}</button>
        ))}
      </div>
      <div id={`${tabsId}-panel-tests`} role="tabpanel" aria-labelledby={`${tabsId}-tab-tests`} hidden={tab !== "tests"}><LabTestsTab stages={stages} defaultGender="f" storageKey={`childHealth:${child.id}:labUploads`}/></div>
      <div id={`${tabsId}-panel-vaccines`} role="tabpanel" aria-labelledby={`${tabsId}-tab-vaccines`} hidden={tab !== "vaccines"}><VaccinesTab statuses={vaccineStatuses} setStatuses={setVaccineStatuses} filterAge={age}/></div>
      {age>=5 && <div id={`${tabsId}-panel-dental`} role="tabpanel" aria-labelledby={`${tabsId}-tab-dental`} hidden={tab !== "dental"}><DentalTab data={toothData} onChange={setToothData}/></div>}
    </div>
  );
}

// ─── Family Section ───────────────────────────────────────────────────────────

export function FamilySection() {
  const [members, setMembers, membersReady, membersError] = usePersistentState("familyMembers", FAMILY_MEMBERS_INIT);
  const [children, setChildren, childrenReady, childrenError] = usePersistentState<Child[]>("children", []);
  const [events, setEvents, eventsReady, eventsError] = usePersistentState("familyEvents", FAMILY_EVENTS_INIT);
  const [editMode, setEditMode] = useState(false);
  const [viewingChild, setViewingChild] = useState<Child|null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [mForm, setMForm] = useState({ name:"", relation:"", age:"", emoji:"👤" });
  const [cForm, setCForm] = useState({ name:"", birthYear:"", emoji:"👶" });
  const [eForm, setEForm] = useState({ date:"", title:"", emoji:"📅" });
  const [formError, setFormError] = useState<string | null>(null);

  if (!membersReady || !childrenReady || !eventsReady) return <div className="p-8 text-sm text-muted-foreground">Загрузка семейных данных…</div>;
  if (membersError || childrenError || eventsError) return <div role="alert" className="p-8 text-sm text-red-600">{membersError ?? childrenError ?? eventsError}</div>;

  function addMember() {
    const name = mForm.name.trim();
    const age = mForm.age.trim() ? parseBoundedInteger(mForm.age, 0, 120) : 0;
    if (!isValidRequiredText(name, 80)) { setFormError("Укажите имя (не более 80 символов)."); return; }
    if (age === null) { setFormError("Возраст должен быть целым числом от 0 до 120."); return; }
    if (mForm.relation.trim().length > 60 || mForm.emoji.length > 16) { setFormError("Проверьте длину поля родства или эмодзи."); return; }
    setMembers(p => [...p, { id:createId(), name, relation:mForm.relation.trim(), age, emoji:mForm.emoji.trim() || "👤" }]);
    setMForm({ name:"", relation:"", age:"", emoji:"👤" }); setShowAddMember(false); setFormError(null);
  }
  function addChild() {
    const name = cForm.name.trim();
    const birthYear = parseBoundedInteger(cForm.birthYear, 1900, CURRENT_YEAR);
    if (!isValidRequiredText(name, 80)) { setFormError("Укажите имя ребёнка (не более 80 символов)."); return; }
    if (birthYear === null) { setFormError(`Год рождения должен быть целым числом от 1900 до ${CURRENT_YEAR}.`); return; }
    if (cForm.emoji.length > 16) { setFormError("Слишком длинное значение эмодзи."); return; }
    setChildren(p => [...p, { id:createId(), name, birthYear, emoji:cForm.emoji.trim() || "👶" }]);
    setCForm({ name:"", birthYear:"", emoji:"👶" }); setShowAddChild(false); setFormError(null);
  }
  function addEvent() {
    const title = eForm.title.trim();
    if (!isValidRequiredText(title, 100)) { setFormError("Укажите название даты (не более 100 символов)."); return; }
    if (eForm.date.trim().length > 80 || eForm.emoji.length > 16) { setFormError("Проверьте длину даты или эмодзи."); return; }
    setEvents(p => [...p, { id:createId(), date:eForm.date.trim(), title, emoji:eForm.emoji.trim() || "📅" }]);
    setEForm({ date:"", title:"", emoji:"📅" }); setShowAddEvent(false); setFormError(null);
  }

  return (
    <>
    <div hidden={!!viewingChild} className="p-8 max-w-xl">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily:"'Playfair Display', serif" }}>Семья</h1>
          <p className="text-sm text-muted-foreground">Близкие люди, дети и важные даты</p>
        </div>
        <EditToggle on={editMode} toggle={() => { setEditMode(e=>!e); setShowAddMember(false); setShowAddChild(false); setShowAddEvent(false); }}/>
      </div>

      {/* Adults */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Взрослые</p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {members.map(m => (
          <motion.div key={m.id} initial={{ opacity:0,scale:.95 }} animate={{ opacity:1,scale:1 }} className="relative bg-card border border-border rounded-xl p-4 text-center">
            {editMode && <div className="absolute top-1.5 right-1.5"><DelBtn onClick={() => setMembers(p=>p.filter(x=>x.id!==m.id))}/></div>}
            <div className="text-3xl mb-2">{m.emoji}</div>
            <p className="text-xs font-semibold text-foreground">{m.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{m.relation}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5" style={{ fontFamily:"'DM Mono', monospace" }}>{m.age} лет</p>
          </motion.div>
        ))}
      </div>
      {editMode && (showAddMember ? (
        <div className="bg-card border border-primary/20 rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-foreground mb-3">Добавить взрослого</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input value={mForm.name} onChange={e=>setMForm(f=>({...f,name:e.target.value}))} placeholder="Имя" maxLength={80} required className={INP}/>
            <input value={mForm.emoji} onChange={e=>setMForm(f=>({...f,emoji:e.target.value}))} placeholder="Emoji" maxLength={16} className={INP}/>
            <input value={mForm.relation} onChange={e=>setMForm(f=>({...f,relation:e.target.value}))} placeholder="Кто (Мама, Муж...)" maxLength={60} className={INP}/>
            <input value={mForm.age} onChange={e=>setMForm(f=>({...f,age:e.target.value}))} placeholder="Возраст" type="number" min={0} max={120} step={1} className={INP}/>
          </div>
          {formError && <p role="alert" className="mb-2 text-xs text-red-600">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={()=>setShowAddMember(false)} className="text-xs px-3 py-1.5 border border-border rounded-lg text-muted-foreground">Отмена</button>
            <button onClick={addMember} className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg">Добавить</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setShowAddMember(true)} className="w-full flex items-center justify-center gap-2 text-xs py-2 bg-primary/5 border border-primary/15 text-primary rounded-xl mb-5 hover:bg-primary/10 transition-all">
          <Plus size={12}/> Добавить взрослого
        </button>
      ))}

      {/* Children */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-5">Дети</p>
      {children.length===0 && !editMode && (
        <div className="text-xs text-muted-foreground text-center py-4 bg-card border border-dashed border-border rounded-xl mb-3">
          Дети не добавлены
        </div>
      )}
      {children.length>0 && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          {children.map(child => {
            const age = CURRENT_YEAR - child.birthYear;
            return (
              <motion.div key={child.id} initial={{ opacity:0,scale:.95 }} animate={{ opacity:1,scale:1 }}
                className="relative bg-card border border-primary/15 rounded-xl p-4 text-center hover:border-primary/40 hover:shadow-sm transition-all group"
              >
                {editMode && <div className="absolute top-1.5 right-1.5 z-10"><DelBtn onClick={()=>setChildren(p=>p.filter(c=>c.id!==child.id))}/></div>}
                <button type="button" disabled={editMode} aria-haspopup="true" aria-label={`Открыть профиль ребёнка ${child.name}, ${age} лет`} onClick={() => setViewingChild(child)} className="w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-default">
                  <div className="text-3xl mb-2">{child.emoji}</div>
                  <p className="text-xs font-semibold text-foreground">{child.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{age} {age===1?"год":age<5?"года":"лет"}</p>
                  {!editMode && (
                    <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-primary/60 group-hover:text-primary transition-colors">
                      <Heart size={9}/> здоровье ребёнка
                    </div>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
      {editMode ? (showAddChild ? (
        <div className="bg-card border border-primary/20 rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-foreground mb-3">Добавить ребёнка</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={cForm.name} onChange={e=>setCForm(f=>({...f,name:e.target.value}))} placeholder="Имя" maxLength={80} required className={INP}/>
            <input value={cForm.emoji} onChange={e=>setCForm(f=>({...f,emoji:e.target.value}))} placeholder="Emoji 👶" maxLength={16} className={INP}/>
          </div>
          <input value={cForm.birthYear} onChange={e=>setCForm(f=>({...f,birthYear:e.target.value}))} placeholder="Год рождения (2022)" type="number" min={1900} max={CURRENT_YEAR} step={1} required className={`${INP} mb-3`}/>
          {formError && <p role="alert" className="mb-2 text-xs text-red-600">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={()=>setShowAddChild(false)} className="text-xs px-3 py-1.5 border border-border rounded-lg text-muted-foreground">Отмена</button>
            <button onClick={addChild} className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg">Добавить</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setShowAddChild(true)} className="w-full flex items-center justify-center gap-2 text-xs py-2 bg-primary/5 border border-primary/15 text-primary rounded-xl mb-5 hover:bg-primary/10 transition-all">
          <Baby size={12}/> Добавить ребёнка
        </button>
      )) : (
        <button onClick={()=>{setEditMode(true);setShowAddChild(true);}} className="w-full flex items-center justify-center gap-2 text-xs py-2 bg-primary/5 border border-primary/15 text-primary rounded-xl mb-5 hover:bg-primary/10 transition-all">
          <Baby size={12}/> Добавить ребёнка
        </button>
      )}

      {/* Events */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-2">Памятные даты</p>
      <div className="space-y-2.5">
        {events.map(ev => (
          <motion.div key={ev.id} initial={{ opacity:0,x:-12 }} animate={{ opacity:1,x:0 }} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
            <span className="text-2xl shrink-0">{ev.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{ev.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5" style={{ fontFamily:"'DM Mono', monospace" }}>{ev.date}</p>
            </div>
            {editMode && <DelBtn onClick={()=>setEvents(p=>p.filter(e=>e.id!==ev.id))}/>}
          </motion.div>
        ))}
      </div>
      {editMode && (showAddEvent ? (
        <div className="bg-card border border-primary/20 rounded-xl p-4 mt-3">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={eForm.title} onChange={e=>setEForm(f=>({...f,title:e.target.value}))} placeholder="Название события" maxLength={100} required className={INP}/>
            <input value={eForm.emoji} onChange={e=>setEForm(f=>({...f,emoji:e.target.value}))} placeholder="Emoji" maxLength={16} className={INP}/>
          </div>
          <input value={eForm.date} onChange={e=>setEForm(f=>({...f,date:e.target.value}))} placeholder="Дата (14 июня 2024)" maxLength={80} className={`${INP} mb-3`}/>
          {formError && <p role="alert" className="mb-2 text-xs text-red-600">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={()=>setShowAddEvent(false)} className="text-xs px-3 py-1.5 border border-border rounded-lg text-muted-foreground">Отмена</button>
            <button onClick={addEvent} className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg">Добавить</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setShowAddEvent(true)} className="w-full flex items-center justify-center gap-2 text-xs py-2 bg-primary/5 border border-primary/15 text-primary rounded-xl mt-3 hover:bg-primary/10 transition-all">
          <Plus size={12}/> Добавить дату
        </button>
      ))}
    </div>
    {children.map(child => (
      <div key={child.id} hidden={viewingChild?.id !== child.id}>
        <ChildHealthView child={child} onBack={() => setViewingChild(null)}/>
      </div>
    ))}
    </>
  );
}
