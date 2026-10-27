import { HOLIDAYS } from "../../data/holidays.js";
import { parseYm } from "./dates.js";

export function holidayDatesInMonth(ym) {
  const { year } = parseYm(ym);
  return (HOLIDAYS[String(year)] || []).filter((d) => d.startsWith(ym));
}
export function holidayDaysInMonth(ym) { return holidayDatesInMonth(ym).length; }
export function quotaForMonth(monthDoc, ym) {
  const o = monthDoc && monthDoc.quotaOverride;
  return typeof o === "number" && o >= 0 ? o : holidayDaysInMonth(ym);
}
