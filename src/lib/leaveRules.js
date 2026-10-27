import { weekdayOf, weekdayZh } from "./dates.js";

export function countWeekday(dates, weekday) {
  return dates.filter((d) => weekdayOf(d) === weekday).length;
}
export function evaluateWarnings(dates, { rule, quota }) {
  const out = [];
  if (rule && rule.enabled) {
    const checks = [[5, rule.friMax, "週五"], [6, rule.satMax, "週六"], [0, rule.sunMax, "週日"]];
    for (const [wd, max, label] of checks) {
      const count = countWeekday(dates, wd);
      if (count > max) out.push({ type: "weekend", weekday: wd, count, max, message: `本月${label}休 ${count} 天，超過 ${max} 天` });
    }
  }
  if (typeof quota === "number" && dates.length > quota) {
    out.push({ type: "quota", total: dates.length, quota, message: `本月休 ${dates.length} 天，超過可休假日 ${quota} 天` });
  }
  return out;
}
