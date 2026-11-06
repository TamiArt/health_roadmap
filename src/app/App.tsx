import { useState, useRef } from "react";
import { motion } from "motion/react";
import {
  Map, Heart, Users, BarChart2, Settings, CheckCircle, Compass, ChevronRight,
  Upload, FileText, Image as ImageIcon, X, Pencil, Trash2, Plus, Check,
  AlertTriangle, Clock, Baby, ArrowLeft,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "map" | "health" | "family" | "analytics";
type Category = "personal" | "education" | "career" | "travel" | "health" | "family" | "achievement";
type VaccineStatus = "done" | "due" | "overdue" | "not_applicable";
type ToothStatus = "healthy" | "caries" | "filled" | "crown" | "implant" | "extracted" | "treatment";
type Urgency = "critical" | "important" | "routine" | "ok";

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<Category, { label: string; bg: string; text: string }> = {
  personal:    { label: "Личное",       bg: "bg-violet-100", text: "text-violet-700" },
  education:   { label: "Образование",  bg: "bg-sky-100",    text: "text-sky-700"    },
  career:      { label: "Карьера",      bg: "bg-teal-100",   text: "text-teal-700"   },
  travel:      { label: "Путешествия",  bg: "bg-amber-100",  text: "text-amber-700"  },
  health:      { label: "Здоровье",     bg: "bg-rose-100",   text: "text-rose-700"   },
  family:      { label: "Семья",        bg: "bg-orange-100", text: "text-orange-700" },
  achievement: { label: "Достижения",   bg: "bg-emerald-100",text: "text-emerald-700"},
};

const URGENCY_CFG: Record<Urgency, { label: string; bg: string; text: string; border: string; dot: string }> = {
  critical:  { label: "Критично",  bg: "bg-red-50",      text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500"     },
  important: { label: "Важно",     bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500"   },
  routine:   { label: "Плановое",  bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-400"    },
  ok:        { label: "Норма",     bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface LifeEvent {
  id: string; year: number; title: string; description: string;
  category: Category; emoji: string; milestone?: boolean;
}

interface LabTest {
  id: string; name: string; what: string; frequency: string;
  gender: "all" | "f" | "m"; priority?: "r";
}

interface LifeStage {
  id: string; label: string; age: string;
  current?: boolean; pinned?: boolean; tests: LabTest[];
}

interface UploadedResult {
  id: string; name: string; date: string; url: string; isPdf: boolean;
}

interface VaccineRecord {
  id: string; name: string; protects: string; schedule: string;
  mandatory: boolean; status: VaccineStatus; note: string; minAge?: number;
}

interface Child {
  id: string; name: string; birthYear: number; emoji: string;
}

// ─── Life Events ──────────────────────────────────────────────────────────────

const LIFE_EVENTS_INIT: LifeEvent[] = [
  { id:"1",  year:1997, title:"Рождение",                    description:"Москва, 14 марта 1997 года. Всё только начинается.",                  category:"family",      emoji:"🌟", milestone:true  },
  { id:"2",  year:2003, title:"Первый класс",                description:"Школа №57, г. Москва. Новые друзья и первые открытия.",               category:"education",   emoji:"🎒"                  },
  { id:"6",  year:2014, title:"Золотая медаль",               description:"Окончание школы с золотой медалью. ЕГЭ: 285 из 300 баллов.",          category:"achievement", emoji:"🎓", milestone:true  },
  { id:"7",  year:2015, title:"МГУ, биологический факультет", description:"Поступление на биофак МГУ. Новая жизнь в студенческом городке.",       category:"education",   emoji:"🔬", milestone:true  },
  { id:"9",  year:2018, title:"Экспедиция на Байкал",         description:"Полевые исследования экосистемы. 3 недели, −15°C, незабываемо.",       category:"travel",      emoji:"🌊"                  },
  { id:"10", year:2019, title:"Красный диплом МГУ",           description:"Бакалавриат завершён с отличием.",                                    category:"education",   emoji:"📜", milestone:true  },
  { id:"11", year:2019, title:"Переезд в Санкт-Петербург",    description:"Новый город, новые возможности и новая глава жизни.",                 category:"personal",    emoji:"🏙️"                 },
  { id:"13", year:2021, title:"Senior Researcher",            description:"Повышение после успешного завершения ключевого исследовательского проекта.", category:"career", emoji:"⬆️", milestone:true },
  { id:"14", year:2022, title:"Знакомство с Дмитрием",        description:"Начало отношений. Познакомились на конференции по биотехнологиям.",   category:"family",      emoji:"💕"                  },
  { id:"16", year:2024, title:"Собственная квартира",         description:"Первое собственное жильё в Санкт-Петербурге.",                        category:"personal",    emoji:"🏠", milestone:true  },
  { id:"17", year:2024, title:"Свадьба",                      description:"Бракосочетание с Дмитрием, июнь 2024. Самый счастливый день.",        category:"family",      emoji:"💍", milestone:true  },
];

// ─── Health roadmap ───────────────────────────────────────────────────────────

const HEALTH_ROADMAP = [
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

const LIFE_STAGES: LifeStage[] = [
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
      { id:"b5", gender:"all", frequency:"Ежегодно для взрослых",
        name:"Флюорография / рентген грудной клетки",
        what:"Скрининг туберкулёза и патологии лёгких; обязателен ежегодно по закону РФ" },
    ],
  },
  {
    id:"newborn", label:"Новорождённый", age:"0–12 мес",
    tests:[
      { id:"n1", gender:"all", frequency:"3–5 день жизни",
        name:"Неонатальный скрининг",
        what:"ФКУ, врождённый гипотиреоз, галактоземия, АГС, муковисцидоз" },
      { id:"n2", gender:"all", frequency:"Однократно",
        name:"Группа крови и резус-фактор",
        what:"Определяется один раз в жизни; критично при переливаниях и операциях" },
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
      { id:"ec1", gender:"all", frequency:"Ежегодно",
        name:"ОАК", what:"Гемоглобин, лейкоцитарная формула — анемия, воспаление" },
      { id:"ec2", gender:"all", frequency:"Ежегодно",
        name:"ОАМ", what:"Состояние почек; скрытые инфекции у детей часто бессимптомны" },
      { id:"ec3", gender:"all", frequency:"В 3 и 6 лет",
        name:"Глюкоза крови натощак", what:"Скрининг диабета 1 типа; норма 3,3–5,5 ммоль/л" },
      { id:"ec4", gender:"all", frequency:"В 1, 3 и 6 лет",
        name:"Ферритин", what:"Запасы железа — скрытый дефицит у 30–40% дошкольников" },
    ],
  },
  {
    id:"school", label:"Школьник", age:"6–17 лет",
    tests:[
      { id:"s1", gender:"all", frequency:"Ежегодно",
        name:"ОАК", what:"Гемоглобин, лейкоцитарная формула, тромбоциты, СОЭ" },
      { id:"s2", gender:"all", frequency:"Ежегодно",
        name:"ОАМ", what:"Почки, мочевыводящие пути; скрытый пиелонефрит у девочек" },
      { id:"s3", gender:"all", frequency:"Каждые 3 года",
        name:"Глюкоза натощак", what:"Ранняя диагностика диабета" },
      { id:"s4", gender:"all", frequency:"Однократно в 9–12 лет", priority:"r",
        name:"Липидный профиль", what:"При семейном анамнезе ССЗ или ожирении" },
      { id:"s5", gender:"f", frequency:"Ежегодно с 12 лет",
        name:"Ферритин и сывороточное железо", what:"С началом менструаций — до 20% школьниц имеют скрытую анемию" },
      { id:"s6", gender:"all", frequency:"Однократно в 13–15 лет", priority:"r",
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
      { id:"r11", gender:"f", frequency:"Ежегодно / перед беременностью",
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
      { id:"ya1", gender:"all", frequency:"Ежегодно", name:"ОАК", what:"Гемоглобин, лейкоцитарная формула, тромбоциты, СОЭ" },
      { id:"ya2", gender:"all", frequency:"Ежегодно", name:"ОАМ", what:"Белок, глюкоза, лейкоциты, эритроциты" },
      { id:"ya3", gender:"all", frequency:"Ежегодно", name:"Биохимия крови", what:"АЛТ, АСТ, билирубин, мочевина, креатинин" },
      { id:"ya4", gender:"all", frequency:"Ежегодно", name:"Глюкоза натощак", what:"Диагностика диабета; норма строго < 6,1 ммоль/л" },
      { id:"ya5", gender:"all", frequency:"Каждые 5 лет", name:"Липидный профиль", what:"Ранние признаки атеросклероза выявляются в 20–25 лет" },
      { id:"ya6", gender:"all", frequency:"Каждые 2–3 года", name:"ТТГ", what:"Скрытый гипотиреоз — частая причина усталости у молодых женщин" },
      { id:"ya7", gender:"f", frequency:"Ежегодно", name:"Ферритин", what:"Менструальные потери → хронический дефицит у каждой четвёртой" },
      { id:"ya8", gender:"all", frequency:"Ежегодно", name:"Витамин D (25-OH)", what:"Дефицит у 60–80% жителей северной России" },
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
      { id:"a1", gender:"all", frequency:"Ежегодно", name:"ОАК", what:"Полная гематологическая картина" },
      { id:"a2", gender:"all", frequency:"Ежегодно", name:"ОАМ", what:"Почки, скрытая патология" },
      { id:"a3", gender:"all", frequency:"Ежегодно", name:"Биохимия крови", what:"АЛТ, АСТ, функция органов-мишеней" },
      { id:"a4", gender:"all", frequency:"Ежегодно с 35 лет", name:"HbA1c", what:"Средний уровень глюкозы за 3 месяца; норма < 5,7%" },
      { id:"a5", gender:"all", frequency:"Каждые 3–5 лет", name:"Липидный профиль", what:"Атеросклероз активно прогрессирует в 30–40 лет" },
      { id:"a6", gender:"all", frequency:"Каждые 2–3 года", name:"ТТГ, Т3 св., Т4 св.", what:"Гипотиреоз — у каждой 10-й женщины после 35 лет" },
      { id:"a7", gender:"f", frequency:"Ежегодно", name:"Ферритин", what:"Репродуктивный возраст — основной период истощения запасов железа" },
      { id:"a8", gender:"all", frequency:"Ежегодно", name:"Витамин D", what:"Дефицит связан с риском онкологии, аутоиммунных заболеваний" },
      { id:"a9", gender:"f", frequency:"Каждые 5 лет", name:"ВПЧ + ПАП-тест", what:"Совместный скрининг рака шейки матки" },
      { id:"a10", gender:"m", frequency:"Ежегодно с 45 лет", name:"ПСА", what:"Ранняя диагностика рака простаты" },
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

const VACCINES: VaccineRecord[] = [
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

const FAMILY_MEMBERS_INIT = [
  { id:"m1", name:"Дмитрий Морозов",  relation:"Муж",  age:30, emoji:"👨‍💼" },
  { id:"m2", name:"Ирина Соколова",   relation:"Мама", age:54, emoji:"👩"   },
  { id:"m3", name:"Андрей Соколов",   relation:"Папа", age:57, emoji:"👨"   },
  { id:"m4", name:"Максим Соколов",   relation:"Брат", age:24, emoji:"👦"   },
];

const FAMILY_EVENTS_INIT = [
  { id:"e1", date:"14 июня 2024",    title:"Свадьба с Дмитрием",      emoji:"💍" },
  { id:"e2", date:"14 марта 1997",   title:"День рождения Александры", emoji:"🎂" },
  { id:"e3", date:"2 сентября 2001", title:"Рождение брата Максима",   emoji:"👶" },
];

// ─── Health quality data ──────────────────────────────────────────────────────

const QUALITY_DATA = [
  { year:"2018", value:62 }, { year:"2019", value:70 },
  { year:"2020", value:55 }, { year:"2021", value:74 },
  { year:"2022", value:80 }, { year:"2023", value:84 },
  { year:"2024", value:88 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INP = "w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/60";
const SEL = "text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary/50";
const CURRENT_YEAR = 2026;

function EditToggle({ on, toggle }: { on: boolean; toggle: () => void }) {
  return (
    <button onClick={toggle}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
        on ? "bg-primary/10 border-primary/30 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      {on ? <><Check size={11} /> Готово</> : <><Pencil size={11} /> Изменить</>}
    </button>
  );
}

function DelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="shrink-0 p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all">
      <Trash2 size={12} />
    </button>
  );
}

function childAgeStages(age: number): LifeStage[] {
  const base = LIFE_STAGES.find(s => s.id === "base")!;
  if (age < 1)  return [base, LIFE_STAGES.find(s => s.id === "newborn")!];
  if (age < 6)  return [base, LIFE_STAGES.find(s => s.id === "early_child")!];
  if (age < 18) return [base, LIFE_STAGES.find(s => s.id === "school")!];
  return [base];
}

function childAgeVaccines(age: number): VaccineRecord[] {
  return VACCINES.filter(v => {
    if (v.id === "shingrix") return false;
    return (v.minAge ?? 0) <= age;
  });
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id:"map",       label:"Карта жизни",  Icon: Map      },
  { id:"health",    label:"Здоровье",     Icon: Heart    },
  { id:"family",    label:"Семья",        Icon: Users    },
  { id:"analytics", label:"Аналитика",    Icon: BarChart2},
] as const;

function Sidebar({ active, onSelect }: { active: Section; onSelect: (s: Section) => void }) {
  return (
    <aside className="w-56 h-screen flex flex-col shrink-0 bg-card border-r border-border">
      <div className="px-5 py-4 border-b border-border">
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
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-lg">👩‍🔬</div>
          <div>
            <p className="text-sm font-semibold text-foreground">Александра М.</p>
            <p className="text-[11px] text-muted-foreground">27 лет · Санкт-Петербург</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2.5 space-y-0.5">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => onSelect(id as Section)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
              active === id ? "bg-primary text-primary-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </nav>
      <div className="p-2.5 border-t border-border">
        <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Settings size={15} />Настройки
        </button>
      </div>
    </aside>
  );
}

// ─── Life Map ─────────────────────────────────────────────────────────────────

function LifeMapSection() {
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
    const ev: LifeEvent = { id: Date.now().toString(), year:+addForm.year, title:addForm.title, description:addForm.description, category:addForm.category, emoji:addForm.emoji||"✨", milestone:addForm.milestone };
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
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />
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

// ─── Lab Tests Tab ────────────────────────────────────────────────────────────

const RECOMMENDED_IDS = new Set([
  "s4","s6","r1","r2","r3","r4","r5","r6","ya9","th3","fe2","ai1","ai2","ai3",
  "r11","r12","r13","a4","a5","a9","a10",
]);

function LabTestsTab({ stages, defaultGender = "f" }: { stages?: LifeStage[]; defaultGender?: "f"|"m" }) {
  const [gender, setGender] = useState<"f"|"m">(defaultGender);
  const [openStage, setOpenStage] = useState<string|null>(null);
  const [uploads, setUploads] = useState<Record<string, UploadedResult[]>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingId = useRef<string|null>(null);
  const allStages = stages ?? LIFE_STAGES;

  function triggerUpload(testId: string) { pendingId.current = testId; fileRef.current?.click(); }
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; const id = pendingId.current;
    if (!file || !id) return;
    const r: UploadedResult = { id:Date.now().toString(), name:file.name, date:new Date().toLocaleDateString("ru-RU"), url:URL.createObjectURL(file), isPdf:file.type==="application/pdf" };
    setUploads(prev => ({ ...prev, [id]:[...(prev[id]??[]), r] }));
    e.target.value="";
  }

  const visibleStages = allStages.filter(s => s.tests.some(t => t.gender==="all" || t.gender===gender));
  const total = visibleStages.reduce((n,s) => n + s.tests.filter(t => t.gender==="all"||t.gender===gender).length, 0);

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
      {!stages && (
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button onClick={() => setGender("f")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${gender==="f"?"bg-card shadow-sm text-foreground":"text-muted-foreground"}`}>♀ Женщина</button>
            <button onClick={() => setGender("m")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${gender==="m"?"bg-card shadow-sm text-foreground":"text-muted-foreground"}`}>♂ Мужчина</button>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px]"><span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500"/><span className="text-muted-foreground">Необходимо</span></span>
            <span className="flex items-center gap-1.5 text-[11px]"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"/><span className="text-muted-foreground">Желательно</span></span>
            <span className="text-xs text-muted-foreground">{total} анализов</span>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {visibleStages.map(stage => {
          const filtered = stage.tests.filter(t => t.gender==="all"||t.gender===gender);
          if (!filtered.length) return null;
          const isOpen = openStage===stage.id;
          const uploadedCount = filtered.reduce((n,t) => n+(uploads[t.id]?.length??0), 0);
          return (
            <div key={stage.id} className={`bg-card rounded-xl border overflow-hidden ${stage.pinned?"border-amber-300/60":stage.current?"border-primary/30":"border-border"}`}>
              <button onClick={() => setOpenStage(isOpen?null:stage.id)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 shrink-0 ${stage.pinned?"bg-amber-100 border-amber-300 text-amber-800":stage.current?"bg-primary border-primary text-primary-foreground":"bg-muted border-border text-muted-foreground"}`} style={{ fontFamily:"'DM Mono', monospace" }}>
                    {stage.pinned?"★":stage.age.slice(0,2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${stage.pinned?"text-amber-800":stage.current?"text-primary":"text-foreground"}`}>{stage.label}</span>
                      <span className="text-xs text-muted-foreground">{stage.age}</span>
                      {stage.current && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Сейчас</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {uploadedCount>0 && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{uploadedCount} загружено</span>}
                  <span className="text-xs text-muted-foreground" style={{ fontFamily:"'DM Mono', monospace" }}>{filtered.length}</span>
                  <ChevronRight size={13} className={`text-muted-foreground transition-transform ${isOpen?"rotate-90":""}`} />
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-border divide-y divide-border/60">
                  {filtered.map(test => {
                    const ups = uploads[test.id]??[];
                    const isRec = RECOMMENDED_IDS.has(test.id);
                    return (
                      <div key={test.id} className="px-4 py-3.5">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{test.name}</span>
                              {isRec
                                ? <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-700">желательно</span>
                                : <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-rose-100 text-rose-700">необходимо</span>}
                              {test.gender!=="all" && <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${test.gender==="f"?"bg-pink-100 text-pink-700":"bg-blue-100 text-blue-700"}`}>{test.gender==="f"?"♀":"♂"}</span>}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{test.what}</p>
                            <p className="text-[11px] text-muted-foreground/70 mt-1 italic" style={{ fontFamily:"'DM Mono', monospace" }}>{test.frequency}</p>
                            {ups.length>0 && (
                              <div className="mt-2 space-y-1">
                                {ups.map(r => (
                                  <div key={r.id} className="flex items-center gap-2 bg-primary/5 rounded-lg px-3 py-2">
                                    {r.isPdf?<FileText size={12} className="text-primary shrink-0"/>:<ImageIcon size={12} className="text-primary shrink-0"/>}
                                    <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate flex-1">{r.name}</a>
                                    <span className="text-[10px] text-muted-foreground shrink-0" style={{ fontFamily:"'DM Mono', monospace" }}>{r.date}</span>
                                    <button onClick={() => setUploads(prev => ({ ...prev, [test.id]:(prev[test.id]??[]).filter(u=>u.id!==r.id) }))}><X size={11} className="text-muted-foreground hover:text-foreground"/></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={() => triggerUpload(test.id)} className="shrink-0 flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-border hover:border-primary/50 hover:text-primary text-muted-foreground transition-all">
                            <Upload size={11}/>Загрузить
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vaccines Tab ─────────────────────────────────────────────────────────────

const VACCINE_STATUS_CFG: Record<VaccineStatus, { label:string; bg:string; text:string }> = {
  done:           { label:"Сделана",       bg:"bg-emerald-100", text:"text-emerald-700" },
  due:            { label:"Нужна",         bg:"bg-amber-100",   text:"text-amber-700"   },
  overdue:        { label:"Просрочена",    bg:"bg-red-100",     text:"text-red-700"     },
  not_applicable: { label:"Не актуальна", bg:"bg-slate-100",   text:"text-slate-500"   },
};

function VaccinesTab({
  statuses, setStatuses, filterAge,
}: {
  statuses: Record<string, VaccineStatus>;
  setStatuses: (v: Record<string, VaccineStatus>) => void;
  filterAge?: number;
}) {
  const vaccines = filterAge !== undefined ? childAgeVaccines(filterAge) : VACCINES;
  const mandatory = vaccines.filter(v => v.mandatory);
  const recommended = vaccines.filter(v => !v.mandatory);
  const countDone = (list: VaccineRecord[]) => list.filter(v => statuses[v.id]==="done").length;
  function cycle(id: string) {
    const order: VaccineStatus[] = ["done","due","overdue","not_applicable"];
    setStatuses({ ...statuses, [id]: order[(order.indexOf(statuses[id]??order[1])+1)%order.length] });
  }

  function VCard({ v }: { v: VaccineRecord }) {
    const s = statuses[v.id]??"due";
    const cfg = VACCINE_STATUS_CFG[s];
    return (
      <div className={`bg-card border rounded-xl p-4 ${v.mandatory&&s!=="done"&&s!=="not_applicable"?"border-red-200/60":"border-border"}`}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{v.name}</span>
            {v.mandatory && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Обязательная</span>}
          </div>
          <button onClick={() => cycle(v.id)} className={`shrink-0 text-[11px] px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all ${cfg.bg} ${cfg.text}`}>{cfg.label}</button>
        </div>
        <p className="text-xs text-muted-foreground mb-1">{v.protects}</p>
        <p className="text-[11px] text-muted-foreground/70 italic mb-1" style={{ fontFamily:"'DM Mono', monospace" }}>{v.schedule}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{v.note}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
        Нажмите на статус вакцины для изменения. Национальный календарь РФ + рекомендации ВОЗ.
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-0.5">Обязательных</p>
          <p className="text-xl font-bold text-foreground" style={{ fontFamily:"'DM Mono', monospace" }}>{countDone(mandatory)}/{mandatory.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-0.5">Рекомендованных</p>
          <p className="text-xl font-bold text-foreground" style={{ fontFamily:"'DM Mono', monospace" }}>{countDone(recommended)}/{recommended.length}</p>
        </div>
      </div>
      {mandatory.length>0 && <>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Обязательные</p>
        <div className="space-y-2 mb-5">{mandatory.map(v=><VCard key={v.id} v={v}/>)}</div>
      </>}
      {recommended.length>0 && <>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Рекомендованные</p>
        <div className="space-y-2">{recommended.map(v=><VCard key={v.id} v={v}/>)}</div>
      </>}
    </div>
  );
}

// ─── Dental Tab ───────────────────────────────────────────────────────────────

const TOOTH_STATUS_CFG: Record<ToothStatus, { label:string; bg:string; text:string; fill:string }> = {
  healthy:   { label:"Здоров",        bg:"bg-emerald-500", text:"text-white",     fill:"#10b981" },
  caries:    { label:"Кариес",        bg:"bg-red-500",     text:"text-white",     fill:"#ef4444" },
  filled:    { label:"Пломба",        bg:"bg-blue-500",    text:"text-white",     fill:"#3b82f6" },
  crown:     { label:"Коронка",       bg:"bg-amber-400",   text:"text-white",     fill:"#fbbf24" },
  implant:   { label:"Имплант",       bg:"bg-violet-500",  text:"text-white",     fill:"#8b5cf6" },
  extracted: { label:"Удалён",        bg:"bg-slate-300",   text:"text-slate-600", fill:"#cbd5e1" },
  treatment: { label:"Нужно лечение", bg:"bg-orange-500",  text:"text-white",     fill:"#f97316" },
};

function toothLabel(n: number) {
  const pos=n%10, quad=Math.floor(n/10);
  const side=(quad===1||quad===4)?"правый":"левый";
  const jaw=quad<=2?"верхний":"нижний";
  const type=pos===8?"зуб мудрости":pos>=6?"моляр":pos>=4?"премоляр":pos===3?"клык":"резец";
  return `Зуб ${n} — ${jaw} ${side} ${type}`;
}

function DentalTab({
  data, onChange,
}: {
  data: Record<number, { status:ToothStatus; note:string }>;
  onChange: (d: Record<number, { status:ToothStatus; note:string }>) => void;
}) {
  const [selected, setSelected] = useState<number|null>(null);
  const [note, setNote] = useState("");
  const UPPER=[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
  const LOWER=[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
  const pick = (n: number) => { setSelected(n); setNote(data[n]?.note??""); };
  const setStatus = (n: number, s: ToothStatus) => onChange({ ...data, [n]:{ status:s, note:data[n]?.note??"" } });
  const saveNote = () => { if (!selected) return; onChange({ ...data, [selected]:{ status:data[selected]?.status??"healthy", note } }); };

  function ToothCell({ n, upper }: { n:number; upper:boolean }) {
    const t=data[n]; const cfg=t?TOOTH_STATUS_CFG[t.status]:null; const isSel=selected===n;
    return (
      <button onClick={() => pick(n)} title={toothLabel(n)} style={{ flexDirection:upper?"column-reverse":"column" }} className="flex flex-col items-center gap-0.5">
        <div className={`w-6 h-8 flex items-center justify-center border-2 transition-all text-[8px] font-bold ${upper?"rounded-t-lg rounded-b-sm":"rounded-b-lg rounded-t-sm"} ${isSel?"ring-2 ring-offset-1 ring-primary border-primary":cfg?"border-transparent":"border-border"}`}
          style={{ backgroundColor:cfg?cfg.fill:"#f1f5f9", color:cfg?(t?.status==="extracted"?"#64748b":"#fff"):"#94a3b8" }}>
          {n%10}
        </div>
        <div className="w-1 h-2 rounded-full opacity-50" style={{ backgroundColor:cfg?cfg.fill:"#cbd5e1" }}/>
      </button>
    );
  }

  const selData = selected?data[selected]:null;
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(Object.keys(TOOTH_STATUS_CFG) as ToothStatus[]).map(s => {
          const c=TOOTH_STATUS_CFG[s];
          return <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
        })}
      </div>
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest mb-3">Верхняя челюсть (FDI)</p>
        <div className="flex justify-center">
          <div className="flex gap-0.5">{UPPER.slice(0,8).map(n=><ToothCell key={n} n={n} upper={true}/>)}</div>
          <div className="w-3"/>
          <div className="flex gap-0.5">{UPPER.slice(8).map(n=><ToothCell key={n} n={n} upper={true}/>)}</div>
        </div>
        <div className="my-3 flex items-center gap-2">
          <div className="flex-1 border-t border-dashed border-border"/>
          <span className="text-[9px] text-muted-foreground whitespace-nowrap">линия смыкания</span>
          <div className="flex-1 border-t border-dashed border-border"/>
        </div>
        <div className="flex justify-center">
          <div className="flex gap-0.5">{LOWER.slice(0,8).map(n=><ToothCell key={n} n={n} upper={false}/>)}</div>
          <div className="w-3"/>
          <div className="flex gap-0.5">{LOWER.slice(8).map(n=><ToothCell key={n} n={n} upper={false}/>)}</div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest mt-3">Нижняя челюсть (FDI)</p>
      </div>
      {selected ? (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-semibold text-foreground mb-2">{toothLabel(selected)}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(Object.keys(TOOTH_STATUS_CFG) as ToothStatus[]).map(s => {
              const c=TOOTH_STATUS_CFG[s];
              return <button key={s} onClick={() => setStatus(selected,s)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${selData?.status===s?`${c.bg} ${c.text}`:"bg-muted text-muted-foreground hover:bg-muted/80"}`}>{c.label}</button>;
            })}
          </div>
          <textarea value={note} onChange={e=>setNote(e.target.value)} onBlur={saveNote} placeholder="Заметки: дата, врач, жалобы..." rows={2}
            className="w-full text-xs p-3 rounded-lg border border-border bg-muted/30 text-foreground resize-none focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/60"
          />
        </div>
      ) : (
        <div className="text-center text-xs text-muted-foreground py-5 bg-card border border-dashed border-border rounded-xl">
          Нажмите на зуб для просмотра и редактирования
        </div>
      )}
    </div>
  );
}

// ─── Health Section ───────────────────────────────────────────────────────────

function HealthSection({
  vaccineStatuses, setVaccineStatuses,
}: {
  vaccineStatuses: Record<string, VaccineStatus>;
  setVaccineStatuses: (v: Record<string, VaccineStatus>) => void;
}) {
  const [tab, setTab] = useState<"roadmap"|"tests"|"vaccines"|"dental">("roadmap");
  const [openIdx, setOpenIdx] = useState<number|null>(3);
  const [toothData, setToothData] = useState<Record<number,{status:ToothStatus;note:string}>>({});

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily:"'Playfair Display', serif" }}>Навигатор здоровья</h1>
      <p className="text-sm text-muted-foreground mb-5">Профилактика и медицинская история</p>
      <div className="flex gap-1 bg-muted p-1 rounded-lg mb-7">
        {[["roadmap","Профилактика"],["tests","Анализы"],["vaccines","Прививки"],["dental","Стоматолог"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id as typeof tab)} className={`flex-1 py-1.5 text-xs rounded-md transition-all font-medium ${tab===id?"bg-card shadow-sm text-foreground":"text-muted-foreground hover:text-foreground"}`}>{label}</button>
        ))}
      </div>

      {tab==="roadmap" && <>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { emoji:"📅", val:"Гинеколог",  sub:"Рекомендован сейчас",  label:"Следующий визит"    },
            { emoji:"✅", val:"Стоматолог",  sub:"Ноябрь 2024",          label:"Последнее посещение"},
            { emoji:"⚠️", val:"4 пункта",   sub:"Этого возраста",       label:"Требует внимания"   },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-3.5">
              <div className="text-2xl mb-2">{c.emoji}</div>
              <div className="text-xs font-semibold text-foreground">{c.val}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{c.label}</div>
              <div className="text-[10px] text-muted-foreground">{c.sub}</div>
            </div>
          ))}
        </div>
        <div className="relative pl-4">
          <div className="absolute left-4 top-4 bottom-4 w-px bg-border"/>
          <div className="space-y-3">
            {HEALTH_ROADMAP.map((cp, idx) => {
              const isOpen=openIdx===idx;
              const doneCount=cp.checks.filter(c=>c.done).length;
              const allDone=doneCount===cp.checks.length;
              return (
                <div key={cp.age} className="relative pl-8">
                  <div className={`absolute left-0 top-3.5 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border-2 z-10 ${cp.current?"bg-primary border-primary text-primary-foreground shadow-md":allDone?"bg-emerald-500 border-emerald-400 text-white":"bg-card border-border text-muted-foreground"}`} style={{ fontFamily:"'DM Mono', monospace" }}>{cp.age}</div>
                  <button onClick={() => setOpenIdx(isOpen?null:idx)} className="w-full text-left bg-card border border-border rounded-xl p-3.5 hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${cp.current?"text-primary":"text-foreground"}`}>{cp.label}</span>
                        {cp.current && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Сейчас</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground" style={{ fontFamily:"'DM Mono', monospace" }}>{doneCount}/{cp.checks.length}</span>
                        <ChevronRight size={13} className={`text-muted-foreground transition-transform ${isOpen?"rotate-90":""}`}/>
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} className="mt-2 space-y-2">
                      {cp.checks.map((check, i) => (
                        <div key={i} className="flex items-start gap-3 bg-muted/50 rounded-lg p-3 border border-border/50">
                          <CheckCircle size={14} className={`mt-0.5 shrink-0 ${check.done?"text-emerald-500":"text-border"}`}/>
                          <div>
                            <p className={`text-xs ${check.done?"line-through text-muted-foreground":"text-foreground font-medium"}`}>{check.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 italic">{check.reason}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </>}
      {tab==="tests" && <LabTestsTab/>}
      {tab==="vaccines" && <VaccinesTab statuses={vaccineStatuses} setStatuses={setVaccineStatuses}/>}
      {tab==="dental" && <DentalTab data={toothData} onChange={setToothData}/>}
    </div>
  );
}

// ─── Child Health View ────────────────────────────────────────────────────────

function ChildHealthView({ child, onBack }: { child:Child; onBack:()=>void }) {
  const age = CURRENT_YEAR - child.birthYear;
  const [tab, setTab] = useState<"tests"|"vaccines"|"dental">("tests");
  const [vaccineStatuses, setVaccineStatuses] = useState<Record<string,VaccineStatus>>(
    () => Object.fromEntries(childAgeVaccines(age).map(v => [v.id, v.status]))
  );
  const [toothData, setToothData] = useState<Record<number,{status:ToothStatus;note:string}>>({});
  const stages = childAgeStages(age);
  const agePeriod = age<1?"Новорождённый":age<6?"Дошкольник":age<18?"Школьник":"Взрослый";

  const tabs: Array<["tests"|"vaccines"|"dental", string]> = [["tests","Анализы"],["vaccines","Прививки"]];
  if (age>=5) tabs.push(["dental","Стоматолог"]);

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
      <div className="flex gap-1 bg-muted p-1 rounded-lg mb-6">
        {tabs.map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex-1 py-1.5 text-xs rounded-md transition-all font-medium ${tab===id?"bg-card shadow-sm text-foreground":"text-muted-foreground hover:text-foreground"}`}>{label}</button>
        ))}
      </div>
      {tab==="tests" && <LabTestsTab stages={stages} defaultGender="f"/>}
      {tab==="vaccines" && <VaccinesTab statuses={vaccineStatuses} setStatuses={setVaccineStatuses} filterAge={age}/>}
      {tab==="dental" && age>=5 && <DentalTab data={toothData} onChange={setToothData}/>}
    </div>
  );
}

// ─── Family Section ───────────────────────────────────────────────────────────

function FamilySection() {
  const [members, setMembers] = useState(FAMILY_MEMBERS_INIT);
  const [children, setChildren] = useState<Child[]>([]);
  const [events, setEvents] = useState(FAMILY_EVENTS_INIT);
  const [editMode, setEditMode] = useState(false);
  const [viewingChild, setViewingChild] = useState<Child|null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [mForm, setMForm] = useState({ name:"", relation:"", age:"", emoji:"👤" });
  const [cForm, setCForm] = useState({ name:"", birthYear:"", emoji:"👶" });
  const [eForm, setEForm] = useState({ date:"", title:"", emoji:"📅" });

  if (viewingChild) return <ChildHealthView child={viewingChild} onBack={() => setViewingChild(null)}/>;

  function addMember() {
    if (!mForm.name) return;
    setMembers(p => [...p, { id:Date.now().toString(), name:mForm.name, relation:mForm.relation, age:+mForm.age||0, emoji:mForm.emoji }]);
    setMForm({ name:"", relation:"", age:"", emoji:"👤" }); setShowAddMember(false);
  }
  function addChild() {
    if (!cForm.name||!cForm.birthYear) return;
    setChildren(p => [...p, { id:Date.now().toString(), name:cForm.name, birthYear:+cForm.birthYear, emoji:cForm.emoji }]);
    setCForm({ name:"", birthYear:"", emoji:"👶" }); setShowAddChild(false);
  }
  function addEvent() {
    if (!eForm.title) return;
    setEvents(p => [...p, { id:Date.now().toString(), ...eForm }]);
    setEForm({ date:"", title:"", emoji:"📅" }); setShowAddEvent(false);
  }

  return (
    <div className="p-8 max-w-xl">
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
            <input value={mForm.name} onChange={e=>setMForm(f=>({...f,name:e.target.value}))} placeholder="Имя" className={INP}/>
            <input value={mForm.emoji} onChange={e=>setMForm(f=>({...f,emoji:e.target.value}))} placeholder="Emoji" className={INP}/>
            <input value={mForm.relation} onChange={e=>setMForm(f=>({...f,relation:e.target.value}))} placeholder="Кто (Мама, Муж...)" className={INP}/>
            <input value={mForm.age} onChange={e=>setMForm(f=>({...f,age:e.target.value}))} placeholder="Возраст" type="number" className={INP}/>
          </div>
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
                className="relative bg-card border border-primary/15 rounded-xl p-4 text-center cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group"
                onClick={() => !editMode && setViewingChild(child)}
              >
                {editMode && <div className="absolute top-1.5 right-1.5" onClick={e=>e.stopPropagation()}><DelBtn onClick={()=>setChildren(p=>p.filter(c=>c.id!==child.id))}/></div>}
                <div className="text-3xl mb-2">{child.emoji}</div>
                <p className="text-xs font-semibold text-foreground">{child.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{age} {age===1?"год":age<5?"года":"лет"}</p>
                {!editMode && (
                  <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-primary/60 group-hover:text-primary transition-colors">
                    <Heart size={9}/> здоровье ребёнка
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
      {editMode ? (showAddChild ? (
        <div className="bg-card border border-primary/20 rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-foreground mb-3">Добавить ребёнка</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={cForm.name} onChange={e=>setCForm(f=>({...f,name:e.target.value}))} placeholder="Имя" className={INP}/>
            <input value={cForm.emoji} onChange={e=>setCForm(f=>({...f,emoji:e.target.value}))} placeholder="Emoji 👶" className={INP}/>
          </div>
          <input value={cForm.birthYear} onChange={e=>setCForm(f=>({...f,birthYear:e.target.value}))} placeholder="Год рождения (2022)" type="number" className={`${INP} mb-3`}/>
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
            <input value={eForm.title} onChange={e=>setEForm(f=>({...f,title:e.target.value}))} placeholder="Название события" className={INP}/>
            <input value={eForm.emoji} onChange={e=>setEForm(f=>({...f,emoji:e.target.value}))} placeholder="Emoji" className={INP}/>
          </div>
          <input value={eForm.date} onChange={e=>setEForm(f=>({...f,date:e.target.value}))} placeholder="Дата (14 июня 2024)" className={`${INP} mb-3`}/>
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
  );
}

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

function AnalyticsSection({
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

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [section, setSection] = useState<Section>("map");
  const [vaccineStatuses, setVaccineStatuses] = useState<Record<string, VaccineStatus>>(
    () => Object.fromEntries(VACCINES.map(v => [v.id, v.status]))
  );

  function renderSection() {
    switch (section) {
      case "map":       return <LifeMapSection/>;
      case "health":    return <HealthSection vaccineStatuses={vaccineStatuses} setVaccineStatuses={setVaccineStatuses}/>;
      case "family":    return <FamilySection/>;
      case "analytics": return <AnalyticsSection vaccineStatuses={vaccineStatuses} onNavigate={setSection}/>;
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily:"'Inter', sans-serif" }}>
      <Sidebar active={section} onSelect={setSection}/>
      <main className="flex-1 overflow-y-auto"
        style={{ backgroundImage:"radial-gradient(circle, rgba(44,95,90,0.045) 1px, transparent 1px)", backgroundSize:"26px 26px" }}
      >
        <motion.div key={section} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.22 }}>
          {renderSection()}
        </motion.div>
      </main>
    </div>
  );
}
