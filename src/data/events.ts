import type { NeighborhoodEvent } from "@/types/event";

export const EVENTS: NeighborhoodEvent[] = [
  {
    id: "1",
    slug: "shuk-ikarim-kikar-hapraḥim",
    title: "שוק איכרים בכיכר הפרחים",
    startDate: "2026-08-12T09:00:00+03:00",
    displayDay: "12",
    displayMonth: "אוג",
    displayTime: "09:00–13:00",
    location: "כיכר הפרחים",
    calendarUrl: "/ics/shuk-ikarim.ics",
  },
  {
    id: "2",
    slug: "sipur-yeladim-gan-kehilati",
    title: "סיפור ילדים בגן הקהילתי",
    startDate: "2026-08-15T17:30:00+03:00",
    displayDay: "15",
    displayMonth: "אוג",
    displayTime: "17:30",
    location: "גן ירוק",
    calendarUrl: "/ics/sipur-yeladim.ics",
  },
  {
    id: "3",
    slug: "erev-yoga-bapark",
    title: "ערב יוגה בפארק",
    startDate: "2026-08-20T19:00:00+03:00",
    displayDay: "20",
    displayMonth: "אוג",
    displayTime: "19:00",
    location: "פארק המורדות",
    calendarUrl: "/ics/erev-yoga.ics",
  },
];
