export type {
  Section, Category, VaccineStatus, ToothStatus, Urgency, LifeEvent,
  UploadedResult, LabMeasurement, VaccineRecord, Child, FamilyMember,
  FamilyEvent, HealthRoadmapCheck, HealthRoadmapStage, QualityDataPoint
} from "./models";
import type {
  Category, FamilyEvent, FamilyMember, HealthRoadmapStage, LifeEvent,
  QualityDataPoint, Urgency, VaccineRecord
} from "./models";

export { LIFE_STAGES, LAB_TEST_CONCEPTS, LAB_TEST_ASSIGNMENTS, LAB_TEST_STAGE_DEFINITIONS } from "./labCatalog";
export type { LabTest, LabTestConcept, LabTestAssignment, LabTestGender, LabTestStageDefinition, LifeStage } from "./labCatalog";

// ─── Config ───────────────────────────────────────────────────────────────────

export const CATEGORY_CONFIG: Record<Category, { label: string; bg: string; text: string }> = {
  personal:    { label: "Личное",       bg: "bg-violet-100", text: "text-violet-700" },
  education:   { label: "Образование",  bg: "bg-sky-100",    text: "text-sky-700"    },
  career:      { label: "Карьера",      bg: "bg-teal-100",   text: "text-teal-700"   },
  travel:      { label: "Путешествия",  bg: "bg-amber-100",  text: "text-amber-700"  },
  health:      { label: "Здоровье",     bg: "bg-rose-100",   text: "text-rose-700"   },
  family:      { label: "Семья",        bg: "bg-orange-100", text: "text-orange-700" },
  achievement: { label: "Достижения",   bg: "bg-emerald-100",text: "text-emerald-700"},
};

export const URGENCY_CFG: Record<Urgency, { label: string; bg: string; text: string; border: string; dot: string }> = {
  critical:  { label: "Критично",  bg: "bg-red-50",      text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500"     },
  important: { label: "Важно",     bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500"   },
  routine:   { label: "Плановое",  bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-400"    },
  ok:        { label: "Норма",     bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
};

// ─── Life Events ──────────────────────────────────────────────────────────────

export const LIFE_EVENTS_INIT: LifeEvent[] = [
  { id:"demo-1", year:2000, title:"Рождение", description:"Демонстрационное событие для примера временной шкалы.", category:"family", emoji:"🌟", milestone:true },
  { id:"demo-2", year:2007, title:"Начало учёбы", description:"Пример образовательного события.", category:"education", emoji:"🎒" },
  { id:"demo-3", year:2018, title:"Завершение обучения", description:"Пример важного образовательного достижения.", category:"achievement", emoji:"🎓", milestone:true },
  { id:"demo-4", year:2020, title:"Новый этап жизни", description:"Пример личного события без реальных имён и адресов.", category:"personal", emoji:"🏙️" },
  { id:"demo-5", year:2022, title:"Профессиональный рост", description:"Пример карьерного достижения.", category:"career", emoji:"⬆️", milestone:true },
  { id:"demo-6", year:2024, title:"Семейное событие", description:"Пример памятной даты.", category:"family", emoji:"💕", milestone:true },
];

// ─── Health roadmap ───────────────────────────────────────────────────────────

export const HEALTH_ROADMAP: HealthRoadmapStage[] = [
  { age: 18, label: "18 лет", done: false, current: false,
    checks: [
      { name: "Профилактический осмотр", done: false, reason: "Демонстрационный пункт для примера плана" },
      { name: "Проверка зрения", done: false, reason: "Пример периодической оценки состояния здоровья" },
      { name: "Стоматолог", done: false, reason: "Пример профилактического посещения" },
    ]},
  { age: 21, label: "21 год", done: false, current: false,
    checks: [
      { name: "Общий анализ крови", done: false, reason: "Пример записи в истории обследований" },
      { name: "Общий анализ мочи", done: false, reason: "Пример записи в истории обследований" },
      { name: "Профилактический осмотр", done: false, reason: "Периодический осмотр по индивидуальным показаниям" },
    ]},
  { age: 25, label: "25 лет", done: false, current: false,
    checks: [
      { name: "Профилактический осмотр", done: false, reason: "Демонстрационный пункт без персонального статуса" },
      { name: "Обсуждение скринингов с врачом", done: false, reason: "Состав обследований зависит от возраста и факторов риска" },
    ]},
  { age: 30, label: "30 лет", done: false, current: true,
    checks: [
      { name: "Плановый осмотр", done: false, reason: "Пример индивидуального плана" },
      { name: "Проверка стоматологического здоровья", done: false, reason: "Пример профилактического пункта" },
      { name: "Обсуждение анализов с врачом", done: false, reason: "Исследования выбираются по клиническим показаниям" },
    ]},
];

// ─── Lab stages ───────────────────────────────────────────────────────────────

// The normalized laboratory catalogue is defined in ./labCatalog.

// ─── Vaccines ─────────────────────────────────────────────────────────────────


export const VACCINES: VaccineRecord[] = [
  { id:"hepb", mandatory:true, status:"done", minAge:0,
    name:"Гепатит B",
    protects:"Вирусный гепатит B → цирроз → рак печени",
    schedule:"При рождении, 1 мес, 6 мес. Ревакцинация через 10 лет при Anti-HBs < 10 МЕ/л",
    note:"Один из главных факторов риска рака печени. Вакцинация устраняет его полностью" },
  { id:"bcg", mandatory:true, status:"done", minAge:0,
    name:"БЦЖ (туберкулёз)",
    protects:"Тяжёлые формы ТБ: менингит, милиарный туберкулёз у детей",
    schedule:"3–7 день жизни в роддоме. Ревакцинация в 7 лет при отрицательной Манту",
    note:"Защищает от смертельных форм ТБ у детей" },
  { id:"dtp", mandatory:true, status:"done", minAge:0,
    name:"АКДС (дифтерия + столбняк + коклюш)",
    protects:"Дифтерийный круп, столбняк (летальность 30–50%), коклюш",
    schedule:"3, 4.5, 6 мес → буст 18 мес → АДС в 6–7 и 14 лет",
    note:"Взрослым нужна ревакцинация каждые 10 лет. Столбняк смертелен даже при лечении" },
  { id:"adt", mandatory:true, status:"overdue", minAge:14,
    name:"АДС-М — взрослая ревакцинация",
    protects:"Поддержание иммунитета к дифтерии и столбняку",
    schedule:"Каждые 10 лет пожизненно: 14 → 24 → 34 → 44 лет",
    note:"Если с последней прививки прошло > 10 лет — необходима ревакцинация" },
  { id:"polio", mandatory:true, status:"done", minAge:0,
    name:"ОПВ/ИПВ (полиомиелит)",
    protects:"Полиомиелит — необратимый паралич нижних конечностей",
    schedule:"3, 4.5, 6 мес → ревакцинации 18, 20 мес, 6 и 14 лет",
    note:"Россия свободна от полиомиелита с 2002 года благодаря массовой вакцинации" },
  { id:"mmr", mandatory:true, status:"done", minAge:0,
    name:"КПК (корь + паротит + краснуха)",
    protects:"Корь (энцефалит), паротит (орхит, бесплодие), краснуха (пороки плода)",
    schedule:"12 мес + ревакцинация 6 лет. Взрослым без документов — 2 дозы",
    note:"Вспышки кори фиксируются в непривитых группах" },
  { id:"pneumo", mandatory:true, status:"done", minAge:0,
    name:"Пневмококковая (PCV13)",
    protects:"Пневмококковая пневмония, менингит, сепсис",
    schedule:"2, 4.5 мес + буст 15 мес",
    note:"Особенно важна для детей до 2 лет, пожилых и людей с хроническими болезнями" },
  { id:"flu", mandatory:false, status:"due", minAge:0,
    name:"Грипп (ежегодная)",
    protects:"Грипп и осложнения: пневмония, инфаркт у групп риска",
    schedule:"Ежегодно в сентябре–октябре. Состав обновляется ВОЗ",
    note:"Грипп — не простуда. Вакцинация снижает смертность на 40–60%" },
  { id:"hpv", mandatory:false, status:"overdue", minAge:9,
    name:"ВПЧ (Гардасил 9 / Церварикс)",
    protects:"Рак шейки матки (99% вызваны ВПЧ), рак прямой кишки, глотки",
    schedule:"Оптимально 9–14 лет (2 дозы). 15–26 лет: 3 дозы",
    note:"Фактически это противораковая вакцина. Защищает от 90% случаев рака шейки матки" },
  { id:"varicella", mandatory:false, status:"done", minAge:0,
    name:"Ветряная оспа (Варилрикс)",
    protects:"Ветрянка; в будущем — опоясывающий лишай с мучительной невралгией",
    schedule:"12–18 мес (2 дозы). Взрослым, не болевшим — 2 дозы",
    note:"Ветрянка у взрослых протекает тяжело. Реактивация через 40–60 лет — опоясывающий лишай" },
  { id:"hepa", mandatory:false, status:"due", minAge:0,
    name:"Гепатит A",
    protects:"Гепатит A — острое поражение печени через заражённую пищу и воду",
    schedule:"2 дозы с интервалом 6–18 мес. Пожизненный иммунитет",
    note:"Обязательна при поездках в Азию, Африку, Латинскую Америку" },
  { id:"mening", mandatory:false, status:"due", minAge:11,
    name:"Менингококковая ACYW135",
    protects:"Менингит и сепсис — летальность 10–15% при лечении",
    schedule:"11–12 лет + буст 16 лет. Студентам, военнослужащим",
    note:"Молниеносный менингококковый сепсис убивает за часы" },
  { id:"shingrix", mandatory:false, status:"not_applicable", minAge:50,
    name:"Shingrix (опоясывающий лишай)",
    protects:"Опоясывающий лишай и постгерпетическая невралгия",
    schedule:"2 дозы с интервалом 2–6 мес. От 50 лет",
    note:"Эффективность > 90% даже в возрасте 80+" },
];

// ─── Family data ──────────────────────────────────────────────────────────────

export const FAMILY_MEMBERS_INIT: FamilyMember[] = [
  { id:"demo-member-1", name:"Пример взрослого", relation:"Партнёр", age:32, emoji:"👤" },
  { id:"demo-member-2", name:"Пример родственника", relation:"Родитель", age:58, emoji:"👩" },
];

export const FAMILY_EVENTS_INIT: FamilyEvent[] = [
  { id:"demo-event-1", date:"Лето 2024", title:"Семейное событие", emoji:"💍" },
  { id:"demo-event-2", date:"Весна 2000", title:"День рождения", emoji:"🎂" },
  { id:"demo-event-3", date:"Осень 2003", title:"Памятная дата", emoji:"👶" },
];

// ─── Health quality data ──────────────────────────────────────────────────────

export const QUALITY_DATA: QualityDataPoint[] = [
  { year:"2018", value:62 }, { year:"2019", value:70 },
  { year:"2020", value:55 }, { year:"2021", value:74 },
  { year:"2022", value:80 }, { year:"2023", value:84 },
  { year:"2024", value:88 },
];
