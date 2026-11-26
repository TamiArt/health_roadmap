import { describe, expect, it } from "vitest";
import { createCalendarEvent, sortCalendarEvents, validateCalendarEvent, type CalendarPlanEvent } from "./calendarModel";

const draft = {
  type: "appointment" as const, title: "Приём кардиолога", date: "2026-12-10", endDate: "",
  time: "09:30", status: "planned" as const, facility: "Клиника", details: "",
  reminder: { enabled: true, leadDays: 2, time: "09:00" },
};

describe("calendar planning events", () => {
  it("validates appointments, examinations, labs, vaccines and treatment courses", () => {
    expect(validateCalendarEvent(draft)).toBeNull();
    expect(validateCalendarEvent({ ...draft, date: "2026-02-30" })).toContain("дату");
    expect(validateCalendarEvent({ ...draft, endDate: "2026-12-09" })).toContain("окончания");
    expect(validateCalendarEvent({ ...draft, reminder: { ...draft.reminder, leadDays: 366 } })).toContain("напоминания");
  });

  it("creates stable identifiers and timestamps for a saved event", () => {
    const event = createCalendarEvent(draft, new Date("2026-11-25T10:00:00.000Z"));
    expect(event.id).toBeTruthy();
    expect(event.createdAt).toBe("2026-11-25T10:00:00.000Z");
    expect(event.updatedAt).toBe(event.createdAt);
  });

  it("sorts by date and then time without mutating the source array", () => {
    const late = createCalendarEvent({ ...draft, date: "2026-12-11", time: "10:00" });
    const early = createCalendarEvent({ ...draft, date: "2026-12-10", time: "08:00" });
    const source: CalendarPlanEvent[] = [late, early];
    expect(sortCalendarEvents(source).map(item => item.id)).toEqual([early.id, late.id]);
    expect(source[0].id).toBe(late.id);
  });
});
