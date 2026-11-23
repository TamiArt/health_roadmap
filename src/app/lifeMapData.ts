import type { Category, LifeEvent } from "./models";

/** Life-map display configuration and demo fixtures. */
export const CATEGORY_CONFIG: Record<Category, { label: string; bg: string; text: string }> = {
  personal:    { label: "Личное",       bg: "bg-violet-100", text: "text-violet-700" },
  education:   { label: "Образование",  bg: "bg-sky-100",    text: "text-sky-700"    },
  career:      { label: "Карьера",      bg: "bg-teal-100",   text: "text-teal-700"   },
  travel:      { label: "Путешествия",  bg: "bg-amber-100",  text: "text-amber-700"  },
  health:      { label: "Здоровье",     bg: "bg-rose-100",   text: "text-rose-700"   },
  family:      { label: "Семья",        bg: "bg-orange-100", text: "text-orange-700" },
  achievement: { label: "Достижения",   bg: "bg-emerald-100",text: "text-emerald-700"},
};

export const LIFE_EVENTS_INIT: LifeEvent[] = [
  { id:"demo-1", year:2000, title:"Рождение", description:"Демонстрационное событие для примера временной шкалы.", category:"family", emoji:"🌟", milestone:true },
  { id:"demo-2", year:2007, title:"Начало учёбы", description:"Пример образовательного события.", category:"education", emoji:"🎒" },
  { id:"demo-3", year:2018, title:"Завершение обучения", description:"Пример важного образовательного достижения.", category:"achievement", emoji:"🎓", milestone:true },
  { id:"demo-4", year:2020, title:"Новый этап жизни", description:"Пример личного события без реальных имён и адресов.", category:"personal", emoji:"🏙️" },
  { id:"demo-5", year:2022, title:"Профессиональный рост", description:"Пример карьерного достижения.", category:"career", emoji:"⬆️", milestone:true },
  { id:"demo-6", year:2024, title:"Семейное событие", description:"Пример памятной даты.", category:"family", emoji:"💕", milestone:true },
];
