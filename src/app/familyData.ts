import type { FamilyEvent, FamilyMember } from "./models";

/** Family-domain demo fixtures. */
export const FAMILY_MEMBERS_INIT: FamilyMember[] = [
  { id:"demo-member-1", name:"Пример взрослого", relation:"Партнёр", age:32, emoji:"👤" },
  { id:"demo-member-2", name:"Пример родственника", relation:"Родитель", age:58, emoji:"👩" },
];

export const FAMILY_EVENTS_INIT: FamilyEvent[] = [
  { id:"demo-event-1", date:"Лето 2024", title:"Семейное событие", emoji:"💍" },
  { id:"demo-event-2", date:"Весна 2000", title:"День рождения", emoji:"🎂" },
  { id:"demo-event-3", date:"Осень 2003", title:"Памятная дата", emoji:"👶" },
];
