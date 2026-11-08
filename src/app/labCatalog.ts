/**
 * Canonical laboratory catalogue.
 * Concepts describe a test once; assignments describe its age/stage context.
 * LIFE_STAGES is a UI compatibility projection, never an authoring source.
 */
export type LabTestGender = "all" | "f" | "m";
export interface LabTestConcept { id: string; name: string; what: string; gender: LabTestGender; }
export interface LabTestAssignment {
  id: string;
  conceptId: string;
  stageId: string;
  frequency: string;
  /** Contextual copy may differ by age stage without duplicating concept identity. */
  name?: string;
  what?: string;
  gender?: LabTestGender;
  priority?: "r";
}
export interface LabTest {
  /** Stable assignment identity used by saved uploads and measurements. */
  id: string;
  conceptId: string;
  name: string;
  what: string;
  frequency: string;
  gender: LabTestGender;
  priority?: "r";
}
export interface LabTestStageDefinition { id: string; label: string; age: string; current?: boolean; pinned?: boolean; }
export interface LifeStage extends LabTestStageDefinition { tests: LabTest[]; }

/** Stage presentation metadata; test records are stored separately. */
export const LAB_TEST_STAGE_DEFINITIONS: LabTestStageDefinition[] = [
  {
    "id": "base",
    "label": "Базовые — при рождении",
    "age": "нужны каждому",
    "pinned": true
  },
  {
    "id": "newborn",
    "label": "Новорождённый",
    "age": "0–12 мес"
  },
  {
    "id": "early_child",
    "label": "Дошкольник",
    "age": "1–6 лет"
  },
  {
    "id": "school",
    "label": "Школьник",
    "age": "6–17 лет"
  },
  {
    "id": "reproductive",
    "label": "Репродуктивное здоровье ♀",
    "age": "17–45+ лет"
  },
  {
    "id": "young_adult",
    "label": "Молодой взрослый",
    "age": "17–30 лет",
    "current": true
  },
  {
    "id": "adult",
    "label": "Взрослый",
    "age": "30–45 лет"
  },
  {
    "id": "thrombosis",
    "label": "Тромбоз и свёртываемость",
    "age": "от 20 лет"
  },
  {
    "id": "iron_deficit",
    "label": "Дефицит железа",
    "age": "от 15 лет"
  },
  {
    "id": "autoimmune",
    "label": "Аутоиммунные маркеры",
    "age": "по показаниям"
  }
];

/** One canonical record per distinct laboratory-test concept. */
export const LAB_TEST_CONCEPTS: LabTestConcept[] = [
  {
    "id": "b1",
    "name": "Группа крови и резус-фактор",
    "what": "Критически важно при переливаниях, операциях и беременности",
    "gender": "all"
  },
  {
    "id": "b2",
    "name": "Неонатальный скрининг (пяточный тест)",
    "what": "ФКУ, врождённый гипотиреоз, галактоземия, АГС, муковисцидоз",
    "gender": "all"
  },
  {
    "id": "b3",
    "name": "Аудиологический скрининг (слух)",
    "what": "Проверка слуха до выписки из роддома",
    "gender": "all"
  },
  {
    "id": "b4",
    "name": "УЗИ тазобедренных суставов",
    "what": "Скрининг дисплазии ТБС; при раннем выявлении лечится без операции",
    "gender": "all"
  },
  {
    "id": "n3",
    "name": "ОАК (общий анализ крови)",
    "what": "Гемоглобин, эритроциты, лейкоциты — исключение анемии и инфекций",
    "gender": "all"
  },
  {
    "id": "n4",
    "name": "ОАМ (общий анализ мочи)",
    "what": "Белок, глюкоза, лейкоциты — состояние почек и мочевыводящих путей",
    "gender": "all"
  },
  {
    "id": "cbc",
    "name": "ОАК",
    "what": "Гемоглобин, лейкоцитарная формула — анемия, воспаление",
    "gender": "all"
  },
  {
    "id": "urinalysis",
    "name": "ОАМ",
    "what": "Состояние почек; скрытые инфекции у детей часто бессимптомны",
    "gender": "all"
  },
  {
    "id": "glucose",
    "name": "Глюкоза крови натощак",
    "what": "Скрининг диабета 1 типа; норма 3,3–5,5 ммоль/л",
    "gender": "all"
  },
  {
    "id": "ferritin",
    "name": "Ферритин",
    "what": "Запасы железа — скрытый дефицит у 30–40% дошкольников",
    "gender": "all"
  },
  {
    "id": "lipid-profile",
    "name": "Липидный профиль",
    "what": "При семейном анамнезе ССЗ или ожирении",
    "gender": "all"
  },
  {
    "id": "iron-studies",
    "name": "Ферритин и сывороточное железо",
    "what": "С началом менструаций — до 20% школьниц имеют скрытую анемию",
    "gender": "f"
  },
  {
    "id": "tsh",
    "name": "ТТГ",
    "what": "Аутоиммунный тиреоидит часто дебютирует в подростковом возрасте",
    "gender": "all"
  },
  {
    "id": "r1",
    "name": "ФСГ",
    "what": "Оценка овариального резерва; повышен при истощении яичников",
    "gender": "f"
  },
  {
    "id": "r2",
    "name": "ЛГ",
    "what": "Регуляция овуляции; ЛГ/ФСГ > 2–3 — признак СПКЯ",
    "gender": "f"
  },
  {
    "id": "r3",
    "name": "Эстрадиол (Е2)",
    "what": "Основной женский половой гормон",
    "gender": "f"
  },
  {
    "id": "r4",
    "name": "Прогестерон",
    "what": "Подтверждение овуляции; снижен при ановуляции",
    "gender": "f"
  },
  {
    "id": "r5",
    "name": "Пролактин",
    "what": "Гиперпролактинемия нарушает овуляцию",
    "gender": "f"
  },
  {
    "id": "r6",
    "name": "АМГ",
    "what": "Наиболее точный маркер овариального резерва",
    "gender": "f"
  },
  {
    "id": "r11",
    "name": "ТТГ + АТ-ТПО",
    "what": "Аутоиммунный тиреоидит — частая причина нарушений цикла",
    "gender": "f"
  },
  {
    "id": "r12",
    "name": "Краснуха IgG",
    "what": "Отсутствие иммунитета → пороки развития плода",
    "gender": "f"
  },
  {
    "id": "r13",
    "name": "Токсоплазмоз IgG/IgM",
    "what": "Первичный токсоплазмоз при беременности — поражение мозга плода",
    "gender": "f"
  },
  {
    "id": "blood-chemistry",
    "name": "Биохимия крови",
    "what": "АЛТ, АСТ, билирубин, мочевина, креатинин",
    "gender": "all"
  },
  {
    "id": "vitamin-d",
    "name": "Витамин D (25-OH)",
    "what": "Дефицит у 60–80% жителей северной России",
    "gender": "all"
  },
  {
    "id": "ya9",
    "name": "Витамин B12",
    "what": "Дефицит у вегетарианцев, при приёме метформина",
    "gender": "all"
  },
  {
    "id": "ya10",
    "name": "ВИЧ (Anti-HIV 1/2)",
    "what": "ВОЗ рекомендует однократное обследование всем взрослым",
    "gender": "all"
  },
  {
    "id": "ya11",
    "name": "Гепатиты B и C",
    "what": "Хронический гепатит С бессимптомен годами, ведёт к циррозу",
    "gender": "all"
  },
  {
    "id": "ya12",
    "name": "ПАП-тест",
    "what": "Выявление предраковых изменений шейки матки",
    "gender": "f"
  },
  {
    "id": "ya13",
    "name": "ВПЧ высокого риска (16/18 типы)",
    "what": "Причина 99% случаев рака шейки матки",
    "gender": "f"
  },
  {
    "id": "chest-imaging",
    "name": "Флюорография / рентген грудной клетки",
    "what": "Скрининг туберкулёза и патологии лёгких; обязателен ежегодно по закону РФ",
    "gender": "all"
  },
  {
    "id": "a4",
    "name": "HbA1c",
    "what": "Средний уровень глюкозы за 3 месяца; норма < 5,7%",
    "gender": "all"
  },
  {
    "id": "thyroid-panel",
    "name": "ТТГ, Т3 св., Т4 св.",
    "what": "Гипотиреоз — у каждой 10-й женщины после 35 лет",
    "gender": "all"
  },
  {
    "id": "a9",
    "name": "ВПЧ + ПАП-тест",
    "what": "Совместный скрининг рака шейки матки",
    "gender": "f"
  },
  {
    "id": "a10",
    "name": "ПСА",
    "what": "Ранняя диагностика рака простаты",
    "gender": "m"
  },
  {
    "id": "th1",
    "name": "D-димер",
    "what": "Маркер активного тромбообразования. Норма < 500 нг/мл",
    "gender": "all"
  },
  {
    "id": "th2",
    "name": "Коагулограмма (МНО, АПТВ, фибриноген)",
    "what": "Оценка всей системы свёртывания",
    "gender": "all"
  },
  {
    "id": "th3",
    "name": "Гомоцистеин",
    "what": "Независимый фактор риска тромбозов, инфаркта, инсульта",
    "gender": "all"
  },
  {
    "id": "fe1",
    "name": "Ферритин",
    "what": "Норма > 30 мкг/л. Снижается до падения гемоглобина",
    "gender": "all"
  },
  {
    "id": "fe2",
    "name": "Сывороточное железо + ОЖСС",
    "what": "Насыщение трансферрина < 16% подтверждает дефицит",
    "gender": "all"
  },
  {
    "id": "ai1",
    "name": "АНА (антинуклеарные антитела)",
    "what": "Скрининговый маркер СКВ, склеродермии",
    "gender": "all"
  },
  {
    "id": "ai2",
    "name": "АЦЦП (анти-CCP)",
    "what": "Наиболее специфичный маркер ревматоидного артрита (>95%)",
    "gender": "all"
  },
  {
    "id": "ai3",
    "name": "Ревматоидный фактор (РФ)",
    "what": "Классический маркер РА; менее специфичен, чем АЦЦП",
    "gender": "all"
  }
];

/** Age/stage-specific assignments; IDs preserve existing saved-result keys. */
export const LAB_TEST_ASSIGNMENTS: LabTestAssignment[] = [
  {
    "id": "b1",
    "conceptId": "b1",
    "stageId": "base",
    "frequency": "Однократно"
  },
  {
    "id": "b2",
    "conceptId": "b2",
    "stageId": "base",
    "frequency": "3–5 день жизни"
  },
  {
    "id": "b3",
    "conceptId": "b3",
    "stageId": "base",
    "frequency": "Однократно в роддоме"
  },
  {
    "id": "b4",
    "conceptId": "b4",
    "stageId": "base",
    "frequency": "В 1 мес"
  },
  {
    "id": "n3",
    "conceptId": "n3",
    "stageId": "newborn",
    "frequency": "В 1 мес и в 12 мес"
  },
  {
    "id": "n4",
    "conceptId": "n4",
    "stageId": "newborn",
    "frequency": "В 12 месяцев"
  },
  {
    "id": "ec1",
    "conceptId": "cbc",
    "stageId": "early_child",
    "frequency": "Ежегодно"
  },
  {
    "id": "ec2",
    "conceptId": "urinalysis",
    "stageId": "early_child",
    "frequency": "Ежегодно"
  },
  {
    "id": "ec3",
    "conceptId": "glucose",
    "stageId": "early_child",
    "frequency": "В 3 и 6 лет"
  },
  {
    "id": "ec4",
    "conceptId": "ferritin",
    "stageId": "early_child",
    "frequency": "В 1, 3 и 6 лет"
  },
  {
    "id": "s1",
    "conceptId": "cbc",
    "stageId": "school",
    "frequency": "Ежегодно",
    "what": "Гемоглобин, лейкоцитарная формула, тромбоциты, СОЭ"
  },
  {
    "id": "s2",
    "conceptId": "urinalysis",
    "stageId": "school",
    "frequency": "Ежегодно",
    "what": "Почки, мочевыводящие пути; скрытый пиелонефрит у девочек"
  },
  {
    "id": "s3",
    "conceptId": "glucose",
    "stageId": "school",
    "frequency": "Каждые 3 года",
    "name": "Глюкоза натощак",
    "what": "Ранняя диагностика диабета"
  },
  {
    "id": "s4",
    "conceptId": "lipid-profile",
    "stageId": "school",
    "frequency": "Однократно в 9–12 лет",
    "priority": "r"
  },
  {
    "id": "s5",
    "conceptId": "iron-studies",
    "stageId": "school",
    "frequency": "Ежегодно с 12 лет"
  },
  {
    "id": "s6",
    "conceptId": "tsh",
    "stageId": "school",
    "frequency": "Однократно в 13–15 лет",
    "priority": "r"
  },
  {
    "id": "r1",
    "conceptId": "r1",
    "stageId": "reproductive",
    "frequency": "3–5 день цикла",
    "priority": "r"
  },
  {
    "id": "r2",
    "conceptId": "r2",
    "stageId": "reproductive",
    "frequency": "3–5 день цикла",
    "priority": "r"
  },
  {
    "id": "r3",
    "conceptId": "r3",
    "stageId": "reproductive",
    "frequency": "3–5 день цикла",
    "priority": "r"
  },
  {
    "id": "r4",
    "conceptId": "r4",
    "stageId": "reproductive",
    "frequency": "21 день цикла",
    "priority": "r"
  },
  {
    "id": "r5",
    "conceptId": "r5",
    "stageId": "reproductive",
    "frequency": "Любой день цикла",
    "priority": "r"
  },
  {
    "id": "r6",
    "conceptId": "r6",
    "stageId": "reproductive",
    "frequency": "Любой день цикла",
    "priority": "r"
  },
  {
    "id": "r11",
    "conceptId": "r11",
    "stageId": "reproductive",
    "frequency": "Ежегодно / перед беременностью",
    "priority": "r"
  },
  {
    "id": "r12",
    "conceptId": "r12",
    "stageId": "reproductive",
    "frequency": "Однократно (перед беременностью)",
    "priority": "r"
  },
  {
    "id": "r13",
    "conceptId": "r13",
    "stageId": "reproductive",
    "frequency": "Однократно (перед беременностью)",
    "priority": "r"
  },
  {
    "id": "ya1",
    "conceptId": "cbc",
    "stageId": "young_adult",
    "frequency": "Ежегодно",
    "what": "Гемоглобин, лейкоцитарная формула, тромбоциты, СОЭ"
  },
  {
    "id": "ya2",
    "conceptId": "urinalysis",
    "stageId": "young_adult",
    "frequency": "Ежегодно",
    "what": "Белок, глюкоза, лейкоциты, эритроциты"
  },
  {
    "id": "ya3",
    "conceptId": "blood-chemistry",
    "stageId": "young_adult",
    "frequency": "Ежегодно"
  },
  {
    "id": "ya4",
    "conceptId": "glucose",
    "stageId": "young_adult",
    "frequency": "Ежегодно",
    "name": "Глюкоза натощак",
    "what": "Диагностика диабета; норма строго < 6,1 ммоль/л"
  },
  {
    "id": "ya5",
    "conceptId": "lipid-profile",
    "stageId": "young_adult",
    "frequency": "Каждые 5 лет",
    "what": "Ранние признаки атеросклероза выявляются в 20–25 лет"
  },
  {
    "id": "ya6",
    "conceptId": "tsh",
    "stageId": "young_adult",
    "frequency": "Каждые 2–3 года",
    "what": "Скрытый гипотиреоз — частая причина усталости у молодых женщин"
  },
  {
    "id": "ya7",
    "conceptId": "ferritin",
    "stageId": "young_adult",
    "frequency": "Ежегодно",
    "what": "Менструальные потери → хронический дефицит у каждой четвёртой",
    "gender": "f"
  },
  {
    "id": "ya8",
    "conceptId": "vitamin-d",
    "stageId": "young_adult",
    "frequency": "Ежегодно"
  },
  {
    "id": "ya9",
    "conceptId": "ya9",
    "stageId": "young_adult",
    "frequency": "Каждые 3 года",
    "priority": "r"
  },
  {
    "id": "ya10",
    "conceptId": "ya10",
    "stageId": "young_adult",
    "frequency": "Однократно"
  },
  {
    "id": "ya11",
    "conceptId": "ya11",
    "stageId": "young_adult",
    "frequency": "Однократно"
  },
  {
    "id": "ya12",
    "conceptId": "ya12",
    "stageId": "young_adult",
    "frequency": "Каждые 3 года (с 21 года)"
  },
  {
    "id": "ya13",
    "conceptId": "ya13",
    "stageId": "young_adult",
    "frequency": "С 25 лет"
  },
  {
    "id": "a11",
    "conceptId": "chest-imaging",
    "stageId": "adult",
    "frequency": "Ежегодно для взрослых"
  },
  {
    "id": "a1",
    "conceptId": "cbc",
    "stageId": "adult",
    "frequency": "Ежегодно",
    "what": "Полная гематологическая картина"
  },
  {
    "id": "a2",
    "conceptId": "urinalysis",
    "stageId": "adult",
    "frequency": "Ежегодно",
    "what": "Почки, скрытая патология"
  },
  {
    "id": "a3",
    "conceptId": "blood-chemistry",
    "stageId": "adult",
    "frequency": "Ежегодно",
    "what": "АЛТ, АСТ, функция органов-мишеней"
  },
  {
    "id": "a4",
    "conceptId": "a4",
    "stageId": "adult",
    "frequency": "Ежегодно с 35 лет",
    "priority": "r"
  },
  {
    "id": "a5",
    "conceptId": "lipid-profile",
    "stageId": "adult",
    "frequency": "Каждые 3–5 лет",
    "what": "Атеросклероз активно прогрессирует в 30–40 лет",
    "priority": "r"
  },
  {
    "id": "a6",
    "conceptId": "thyroid-panel",
    "stageId": "adult",
    "frequency": "Каждые 2–3 года"
  },
  {
    "id": "a7",
    "conceptId": "ferritin",
    "stageId": "adult",
    "frequency": "Ежегодно",
    "what": "Репродуктивный возраст — основной период истощения запасов железа",
    "gender": "f"
  },
  {
    "id": "a8",
    "conceptId": "vitamin-d",
    "stageId": "adult",
    "frequency": "Ежегодно",
    "name": "Витамин D",
    "what": "Дефицит связан с риском онкологии, аутоиммунных заболеваний"
  },
  {
    "id": "a9",
    "conceptId": "a9",
    "stageId": "adult",
    "frequency": "Каждые 5 лет",
    "priority": "r"
  },
  {
    "id": "a10",
    "conceptId": "a10",
    "stageId": "adult",
    "frequency": "Ежегодно с 45 лет",
    "priority": "r"
  },
  {
    "id": "th1",
    "conceptId": "th1",
    "stageId": "thrombosis",
    "frequency": "По показаниям (ОК, беременность, операция)"
  },
  {
    "id": "th2",
    "conceptId": "th2",
    "stageId": "thrombosis",
    "frequency": "Перед операциями, при антикоагулянтах"
  },
  {
    "id": "th3",
    "conceptId": "th3",
    "stageId": "thrombosis",
    "frequency": "Каждые 3–5 лет",
    "priority": "r"
  },
  {
    "id": "fe1",
    "conceptId": "fe1",
    "stageId": "iron_deficit",
    "frequency": "Ежегодно (особенно женщины)"
  },
  {
    "id": "fe2",
    "conceptId": "fe2",
    "stageId": "iron_deficit",
    "frequency": "При сниженном ферритине",
    "priority": "r"
  },
  {
    "id": "ai1",
    "conceptId": "ai1",
    "stageId": "autoimmune",
    "frequency": "По показаниям (суставы, сыпь, усталость)",
    "priority": "r"
  },
  {
    "id": "ai2",
    "conceptId": "ai2",
    "stageId": "autoimmune",
    "frequency": "По показаниям (признаки РА)",
    "priority": "r"
  },
  {
    "id": "ai3",
    "conceptId": "ai3",
    "stageId": "autoimmune",
    "frequency": "По показаниям",
    "priority": "r"
  }
];

const conceptsById = new Map(LAB_TEST_CONCEPTS.map(concept => [concept.id, concept]));

/** Compatibility projection for the current UI, derived from canonical records. */
export const LIFE_STAGES: LifeStage[] = LAB_TEST_STAGE_DEFINITIONS.map(stage => ({
  ...stage,
  tests: LAB_TEST_ASSIGNMENTS.filter(assignment => assignment.stageId === stage.id).map(assignment => {
    const concept = conceptsById.get(assignment.conceptId);
    if (!concept) throw new Error(`Unknown lab-test concept "${assignment.conceptId}" in assignment "${assignment.id}".`);
    return {
      id: assignment.id,
      conceptId: assignment.conceptId,
      name: assignment.name ?? concept.name,
      what: assignment.what ?? concept.what,
      frequency: assignment.frequency,
      gender: assignment.gender ?? concept.gender,
      ...(assignment.priority ? { priority: assignment.priority } : {})
    };
  })
}));
