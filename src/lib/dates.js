export function ymOf(date) {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function parseYm(ym) {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m };
}
export function daysInMonth(ym) {
  const { year, month } = parseYm(ym);
  const last = new Date(year, month, 0).getDate();
  return Array.from({ length: last }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`);
}
export function weekdayOf(dateStr) { return new Date(dateStr + "T00:00:00").getDay(); }
export function isValidDateStr(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + "T00:00:00").getTime()); }
export const isvalidDateStr = isValidDateStr;
export function addMonthsYm(ym, delta) {
  const { year, month } = parseYm(ym);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function formatMD(dateStr) { const { month } = parseYm(ymOf(dateStr)); return `${month}/${Number(dateStr.slice(8, 10))}`; }
export function weekdayZh(n) { return "日一二三四五六"[n]; }
