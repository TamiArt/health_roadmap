// ─── Types ────────────────────────────────────────────────────────────────────

export type Section = "map" | "health" | "family" | "analytics";
export type Category = "personal" | "education" | "career" | "travel" | "health" | "family" | "achievement";
export type VaccineStatus = "done" | "due" | "overdue" | "not_applicable";
export type ToothStatus = "healthy" | "caries" | "filled" | "crown" | "implant" | "extracted" | "treatment";
export type Urgency = "critical" | "important" | "routine" | "ok";

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

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface LifeEvent {
  id: string; year: number; title: string; description: string;
  category: Category; emoji: string; milestone?: boolean;
}

export interface LabTest {
  /** Unique assignment ID within the catalogue. */
  id: string;
  /** Stable identity shared by age-specific assignments of the same test concept. */
  conceptId?: string;
  name: string;
  what: string;
  frequency: string;
  gender: "all" | "f" | "m";
  priority?: "r";
}

export interface LabTestConcept {
  id: string;
  name: string;
  what: string;
  gender: "all" | "f" | "m";
  priority?: "r";
}

export interface LabTestAssignment {
  id: string;
  conceptId: string;
  stageId: string;
  frequency: string;
}

export interface LifeStage {
  id: string; label: string; age: string;
  current?: boolean; pinned?: boolean; tests: LabTest[];
}

export interface UploadedResult {
  id: string;
  name: string;
  date: string;
  blob: Blob;
  isPdf: boolean;
}

export interface VaccineRecord {
  id: string; name: string; protects: string; schedule: string;
  mandatory: boolean; status: VaccineStatus; note: string; minAge?: number;
}

export interface Child {
  id: string; name: string; birthYear: number; emoji: string;
}

// ─── Life Events ──────────────────────────────────────────────────────────────

LIFE_EVENTS_INIT

// ─── Health roadmap ───────────────────────────────────────────────────────────

export const HEALTH_ROADMAP = [
  { age: 17, label: "17 лет", done: true, current: false,
    checks: [
      { name: "Терапевт (профосмотр)",      done: true,  reason: "Базовая проверка состояния здоровья" },
      { name: "Гинеколог",                  done: true,  reason: "Важно начать профилактику в подростковом возрасте" },
      { name: "Офтальмолог",                done: true,  reason: "Нагрузка на зрение в период активной учёбы" },
      { name: "Стоматолог",                 done: true,  reason: "Профилактика кариеса и заболеваний дёсен" },
    ]},
  { age: 20, label: "20 лет", done: true, current: false,
    checks: [
      { name: "Общий анализ крови",            done: true, reason: "Базовый маркер состояния организма" },
      { name: "Биохимия: холестерин, глюкоза", done: true, reason: "Ранняя диагностика нарушений обмена веществ" },
      { name: "УЗИ органов малого таза",       done: true, reason: "Профилактика для женского здоровья" },
    ]},
  { age: 25, label: "25 лет", done: false, current: false,
    checks: [
      { name: "ПАП-тест (онкоцитология)",      done: true,  reason: "Выявление предраковых изменений шейки матки" },
      { name: "УЗИ щитовидной железы",         done: false, reason: "Актуально для женщин в северных регионах" },
      { name: "Анализ на витамин D",           done: false, reason: "Дефицит очень распространён в Петербурге" },
    ]},
  { age: 27, label: "27 лет", done: false, current: true,
    checks: [
      { name: "Ежегодный осмотр у гинеколога",    done: false, reason: "Обязательно каждый год" },
      { name: "Анализ на ферритин и железо",       done: false, reason: "Женщины часто страдают от скрытой анемии" },
      { name: "Стоматолог (плановый)",             done: true,  reason: "Рекомендован каждые 6 месяцев" },
      { name: "ТТГ, Т3, Т4 (гормоны щитовидной)", done: false, reason: "Базовая проверка эндокринной системы" },
    ]},
];

// ─── Lab stages ───────────────────────────────────────────────────────────────

export const LIFE_STAGES: LifeStage[] = [
  {
    id:"base", label:"Базовые — при рождении", age:"нужны каждому", pinned:true,
    tests:[
      { id:"b1", gender:"all", frequency:"Однократно",
        name:"Группа крови и резус-фактор",
        what:"Критически важно при переливаниях, операциях и беременности" },
      { id:"b2", gender:"all", frequency:"3–5 день жизни",
        name:"Неонатальный скрининг (пяточный тест)",
        what:"ФКУ, врождённый гипотиреоз, галактоземия, АГС, муковисцидоз" },
      { id:"b3", gender:"all", frequency:"Однократно в роддоме",
        name:"Аудиологический скрининг (слух)",
        what:"Проверка слуха до выписки из роддома" },
      { id:"b4", gender:"all", frequency:"В 1 мес",
        name:"УЗИ тазобедренных суставов",
        what:"Скрининг дисплазии ТБС; при раннем выявлении лечится без операции" },
    ],
  },
  {
    id:"newborn", label:"Новорождённый", age:"0–12 мес",
    tests:[
      { id:"n3", gender:"all", frequency:"В 1 мес и в 12 мес",
        name:"ОАК (общий анализ крови)",
        what:"Гемоглобин, эритроциты, лейкоциты — исключение анемии и инфекций" },
      { id:"n4", gender:"all", frequency:"В 12 месяцев",
        name:"ОАМ (общий анализ мочи)",
        what:"Белок, глюкоза, лейкоциты — состояние почек и мочевыводящих путей" },
    ],
  },
  {
    id:"early_child", label:"Дошкольник", age:"1–6 лет",
    tests:[
      { id:"ec1", conceptId:"cbc", gender:"all", frequency:"Ежегодно",
        name:"ОАК", what:"Гемоглобин, лейкоцитарная формула — анемия, воспаление" },
      { id:"ec2", conceptId:"urinalysis", gender:"all", frequency:"Ежегодно",
        name:"ОАМ", what:"Состояние почек; скрытые инфекции у детей часто бессимптомны" },
      { id:"ec3", conceptId:"glucose", gender:"all", frequency:"В 3 и 6 лет",
        name:"Глюкоза крови натощак", what:"Скрининг диабета 1 типа; норма 3,3–5,5 ммоль/л" },
      { id:"ec4", conceptId:"ferritin", gender:"all", frequency:"В 1, 3 и 6 лет",
        name:"Ферритин", what:"Запасы железа — скрытый дефицит у 30–40% дошкольников" },
    ],
  },
  {
    id:"school", label:"Школьник", age:"6–17 лет",
    tests:[
      { id:"s1", conceptId:"cbc", gender:"all", frequency:"Ежегодно",
        name:"ОАК", what:"Гемоглобин, лейкоцитарная формула, тромбоциты, СОЭ" },
      { id:"s2", conceptId:"urinalysis", gender:"all", frequency:"Ежегодно",
        name:"ОАМ", what:"Почки, мочевыводящие пути; скрытый пиелонефрит у девочек" },
      { id:"s3", conceptId:"glucose", gender:"all", frequency:"Каждые 3 года",
        name:"Глюкоза натощак", what:"Ранняя диагностика диабета" },
      { id:"s4", conceptId:"lipid-profile", gender:"all", frequency:"Однократно в 9–12 лет", priority:"r",
        name:"Липидный профиль", what:"При семейном анамнезе ССЗ или ожирении" },
      { id:"s5", conceptId:"ferritin", gender:"f", frequency:"Ежегодно с 12 лет",
        name:"Ферритин и сывороточное железо", what:"С началом менструаций — до 20% школьниц имеют скрытую анемию" },
      { id:"s6", conceptId:"tsh", gender:"all", frequency:"Однократно в 13–15 лет", priority:"r",
        name:"ТТГ", what:"Аутоиммунный тиреоидит часто дебютирует в подростковом возрасте" },
    ],
  },
  {
    id:"reproductive", label:"Репродуктивное здоровье ♀", age:"17–45+ лет",
    tests:[
      { id:"r1", gender:"f", frequency:"3–5 день цикла", priority:"r",
        name:"ФСГ", what:"Оценка овариального резерва; повышен при истощении яичников" },
      { id:"r2", gender:"f", frequency:"3–5 день цикла", priority:"r",
        name:"ЛГ", what:"Регуляция овуляции; ЛГ/ФСГ > 2–3 — признак СПКЯ" },
      { id:"r3", gender:"f", frequency:"3–5 день цикла", priority:"r",
        name:"Эстрадиол (Е2)", what:"Основной женский половой гормон" },
      { id:"r4", gender:"f", frequency:"21 день цикла", priority:"r",
        name:"Прогестерон", what:"Подтверждение овуляции; снижен при ановуляции" },
      { id:"r5", gender:"f", frequency:"Любой день цикла", priority:"r",
        name:"Пролактин", what:"Гиперпролактинемия нарушает овуляцию" },
      { id:"r6", gender:"f", frequency:"Любой день цикла", priority:"r",
        name:"АМГ", what:"Наиболее точный маркер овариального резерва" },
      { id:"r11", gender:"f", frequency:"Ежегодно / перед беременностью", priority:"r",
        name:"ТТГ + АТ-ТПО", what:"Аутоиммунный тиреоидит — частая причина нарушений цикла" },
      { id:"r12", gender:"f", frequency:"Однократно (перед беременностью)", priority:"r",
        name:"Краснуха IgG", what:"Отсутствие иммунитета → пороки развития плода" },
      { id:"r13", gender:"f", frequency:"Однократно (перед беременностью)", priority:"r",
        name:"Токсоплазмоз IgG/IgM", what:"Первичный токсоплазмоз при беременности — поражение мозга плода" },
    ],
  },
  {
    id:"young_adult", label:"Молодой взрослый", age:"17–30 лет", current:true,
    tests:[
      { id:"ya1", conceptId:"cbc", gender:"all", frequency:"Ежегодно", name:"ОАК", what:"Гемоглобин, лейкоцитарная формула, тромбоциты, СОЭ" },
      { id:"ya2", conceptId:"urinalysis", gender:"all", frequency:"Ежегодно", name:"ОАМ", what:"Белок, глюкоза, лейкоциты, эритроциты" },
      { id:"ya3", conceptId:"blood-chemistry", gender:"all", frequency:"Ежегодно", name:"Биохимия крови", what:"АЛТ, АСТ, билирубин, мочевина, креатинин" },
      { id:"ya4", conceptId:"glucose", gender:"all", frequency:"Ежегодно", name:"Глюкоза натощак", what:"Диагностика диабета; норма строго < 6,1 ммоль/л" },
      { id:"ya5", conceptId:"lipid-profile", gender:"all", frequency:"Каждые 5 лет", name:"Липидный профиль", what:"Ранние признаки атеросклероза выявляются в 20–25 лет" },
      { id:"ya6", conceptId:"tsh", gender:"all", frequency:"Каждые 2–3 года", name:"ТТГ", what:"Скрытый гипотиреоз — частая причина усталости у молодых женщин" },
      { id:"ya7", conceptId:"ferritin", gender:"f", frequency:"Ежегодно", name:"Ферритин", what:"Менструальные потери → хронический дефицит у каждой четвёртой" },
      { id:"ya8", conceptId:"vitamin-d", gender:"all", frequency:"Ежегодно", name:"Витамин D (25-OH)", what:"Дефицит у 60–80% жителей северной России" },
      { id:"ya9", gender:"all", frequency:"Каждые 3 года", priority:"r", name:"Витамин B12", what:"Дефицит у вегетарианцев, при приёме метформина" },
      { id:"ya10", gender:"all", frequency:"Однократно", name:"ВИЧ (Anti-HIV 1/2)", what:"ВОЗ рекомендует однократное обследование всем взрослым" },
      { id:"ya11", gender:"all", frequency:"Однократно", name:"Гепатиты B и C", what:"Хронический гепатит С бессимптомен годами, ведёт к циррозу" },
      { id:"ya12", gender:"f", frequency:"Каждые 3 года (с 21 года)", name:"ПАП-тест", what:"Выявление предраковых изменений шейки матки" },
      { id:"ya13", gender:"f", frequency:"С 25 лет", name:"ВПЧ высокого риска (16/18 типы)", what:"Причина 99% случаев рака шейки матки" },
    ],
  },
  {
    id:"adult", label:"Взрослый", age:"30–45 лет",
    tests:[
      { id:"a11", conceptId:"chest-imaging", gender:"all", frequency:"Ежегодно для взрослых",
        name:"Флюорография / рентген грудной клетки",
        what:"Скрининг туберкулёза и патологии лёгких; обязателен ежегодно по закону РФ" },
      { id:"a1", conceptId:"cbc", gender:"all", frequency:"Ежегодно", name:"ОАК", what:"Полная гематологическая картина" },
      { id:"a2", conceptId:"urinalysis", gender:"all", frequency:"Ежегодно", name:"ОАМ", what:"Почки, скрытая патология" },
      { id:"a3", conceptId:"blood-chemistry", gender:"all", frequency:"Ежегодно", name:"Биохимия крови", what:"АЛТ, АСТ, функция органов-мишеней" },
      { id:"a4", gender:"all", frequency:"Ежегодно с 35 лет", priority:"r", name:"HbA1c", what:"Средний уровень глюкозы за 3 месяца; норма < 5,7%" },
      { id:"a5", conceptId:"lipid-profile", gender:"all", frequency:"Каждые 3–5 лет", priority:"r", name:"Липидный профиль", what:"Атеросклероз активно прогрессирует в 30–40 лет" },
      { id:"a6", conceptId:"tsh", gender:"all", frequency:"Каждые 2–3 года", name:"ТТГ, Т3 св., Т4 св.", what:"Гипотиреоз — у каждой 10-й женщины после 35 лет" },
      { id:"a7", conceptId:"ferritin", gender:"f", frequency:"Ежегодно", name:"Ферритин", what:"Репродуктивный возраст — основной период истощения запасов железа" },
      { id:"a8", conceptId:"vitamin-d", gender:"all", frequency:"Ежегодно", name:"Витамин D", what:"Дефицит связан с риском онкологии, аутоиммунных заболеваний" },
      { id:"a9", gender:"f", frequency:"Каждые 5 лет", priority:"r", name:"ВПЧ + ПАП-тест", what:"Совместный скрининг рака шейки матки" },
      { id:"a10", gender:"m", frequency:"Ежегодно с 45 лет", priority:"r", name:"ПСА", what:"Ранняя диагностика рака простаты" },
    ],
  },
  {
    id:"thrombosis", label:"Тромбоз и свёртываемость", age:"от 20 лет",
    tests:[
      { id:"th1", gender:"all", frequency:"По показаниям (ОК, беременность, операция)",
        name:"D-димер", what:"Маркер активного тромбообразования. Норма < 500 нг/мл" },
      { id:"th2", gender:"all", frequency:"Перед операциями, при антикоагулянтах",
        name:"Коагулограмма (МНО, АПТВ, фибриноген)", what:"Оценка всей системы свёртывания" },
      { id:"th3", gender:"all", frequency:"Каждые 3–5 лет", priority:"r",
        name:"Гомоцистеин", what:"Независимый фактор риска тромбозов, инфаркта, инсульта" },
    ],
  },
  {
    id:"iron_deficit", label:"Дефицит железа", age:"от 15 лет",
    tests:[
      { id:"fe1", gender:"all", frequency:"Ежегодно (особенно женщины)",
        name:"Ферритин", what:"Норма > 30 мкг/л. Снижается до падения гемоглобина" },
      { id:"fe2", gender:"all", frequency:"При сниженном ферритине", priority:"r",
        name:"Сывороточное железо + ОЖСС", what:"Насыщение трансферрина < 16% подтверждает дефицит" },
    ],
  },
  {
    id:"autoimmune", label:"Аутоиммунные маркеры", age:"по показаниям",
    tests:[
      { id:"ai1", gender:"all", frequency:"По показаниям (суставы, сыпь, усталость)", priority:"r",
        name:"АНА (антинуклеарные антитела)", what:"Скрининговый маркер СКВ, склеродермии" },
      { id:"ai2", gender:"all", frequency:"По показаниям (признаки РА)", priority:"r",
        name:"АЦЦП (анти-CCP)", what:"Наиболее специфичный маркер ревматоидного артрита (>95%)" },
      { id:"ai3", gender:"all", frequency:"По показаниям", priority:"r",
        name:"Ревматоидный фактор (РФ)", what:"Классический маркер РА; менее специфичен, чем АЦЦП" },
    ],
  },
];

// ─── Vaccines ─────────────────────────────────────────────────────────────────


/**
 * Normalized catalogue read model:
 * - LabTestConcept describes what the test is.
 * - LabTestAssignment describes where/when it appears.
 * LIFE_STAGES remains the backwards-compatible UI grouping.
 */
export const LAB_TEST_CONCEPTS: LabTestConcept[] = (() => {
  const concepts = new Map<string, LabTestConcept>();
  for (const stage of LIFE_STAGES) {
    for (const test of stage.tests) {
      const id = test.conceptId ?? test.id;
      if (!concepts.has(id)) {
        concepts.set(id, {
          id,
          name: test.name,
          what: test.what,
          gender: test.gender,
          ...(test.priority ? { priority: test.priority } : {}),
        });
      }
    }
  }
  return [...concepts.values()];
})();

export const LAB_TEST_ASSIGNMENTS: LabTestAssignment[] = LIFE_STAGES.flatMap(stage =>
  stage.tests.map(test => ({
    id: test.id,
    conceptId: test.conceptId ?? test.id,
    stageId: stage.id,
    frequency: test.frequency,
  }))
);

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

export const FAMILY_MEMBERS_INIT = [
  { id:"demo-member-1", name:"Пример взрослого", relation:"Партнёр", age:32, emoji:"👤" },
  { id:"demo-member-2", name:"Пример родственника", relation:"Родитель", age:58, emoji:"👩" },
];

export const FAMILY_EVENTS_INIT = [
  { id:"demo-event-1", date:"Лето 2024", title:"Семейное событие", emoji:"💍" },
  { id:"demo-event-2", date:"Весна 2000", title:"День рождения", emoji:"🎂" },
  { id:"demo-event-3", date:"Осень 2003", title:"Памятная дата", emoji:"👶" },
];

// ─── Health quality data ──────────────────────────────────────────────────────

export const QUALITY_DATA = [
  { year:"2018", value:62 }, { year:"2019", value:70 },
  { year:"2020", value:55 }, { year:"2021", value:74 },
  { year:"2022", value:80 }, { year:"2023", value:84 },
  { year:"2024", value:88 },
];
