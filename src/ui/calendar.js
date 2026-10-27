import { daysInMonth, weekdayOf } from "../lib/dates.js";

const HEAD = ["日", "一", "二", "三", "四", "五", "六"];

// 回傳以「週」為單位的月曆格線；週日為第一欄，前後補空白格。
export function buildMonthGrid(ym) {
  const days = daysInMonth(ym);
  const firstWd = weekdayOf(days[0]);
  const cells = [];
  for (let i = 0; i < firstWd; i++) cells.push({ date: null, weekday: i, day: null, inMonth: false });
  for (const d of days) cells.push({ date: d, weekday: weekdayOf(d), day: Number(d.slice(8, 10)), inMonth: true });
  while (cells.length % 7 !== 0) cells.push({ date: null, weekday: cells.length % 7, day: null, inMonth: false });
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// days：Set（或任何有 .has(date) 的物件）；decorate(date)：回傳額外 class 字串（如 " warn-red"）。
export function renderCalendar(el, { ym, days, onToggle, decorate }) {
  const head = HEAD.map((w) => `<div class="cal-head">${w}</div>`).join("");
  const body = buildMonthGrid(ym).flat().map((c) => {
    if (!c.inMonth) return `<div class="cal-cell empty"></div>`;
    const marked = !!(days && typeof days.has === "function" && days.has(c.date));
    const deco = decorate ? decorate(c.date) : "";
    return `<div class="cal-cell${marked ? " marked" : ""}${deco}" data-date="${c.date}" title="${c.date}">` +
      `<span class="d">${c.day}</span></div>`;
  }).join("");
  el.innerHTML = `<div class="cal-grid">${head}${body}</div>`;
  if (onToggle) el.querySelectorAll(".cal-cell[data-date]").forEach((cell) =>
    cell.addEventListener("click", () => onToggle(cell.dataset.date)));
}
