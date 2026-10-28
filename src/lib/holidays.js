import { HOLIDAYS } from "../../data/holidays.js";
import { parseYm, daysInMonth, weekdayOf } from "./dates.js";

export function holidayDatesInMonth(ym) {
  const { year } = parseYm(ym);
  return (HOLIDAYS[String(year)] || []).filter((d) => d.startsWith(ym));
}

export function holidayDaysInMonth(ym) {
  return holidayDatesInMonth(ym).length;
}

// 該月休息日統計：正常六日、其他國定紅字（不含落在六日的）、共幾天。
export function monthOffDays(ym) {
  const hd = new Set(holidayDatesInMonth(ym));
  let weekends = 0;
  let otherHolidays = 0;
  for (const d of daysInMonth(ym)) {
    const wd = weekdayOf(d);
    if (wd === 0 || wd === 6) weekends += 1;
    else if (hd.has(d)) otherHolidays += 1;
  }
  return { weekends, otherHolidays, total: weekends + otherHolidays };
}

// 可休假日：主管覆寫優先，否則 = 該月（正常六日 + 其他國定紅字）總數。
export function quotaForMonth(monthDoc, ym) {
  const o = monthDoc && monthDoc.quotaOverride;
  if (typeof o === "number" && o >= 0) return o;
  return monthOffDays(ym).total;
}
