import { daysInMonth as monthDays } from "./dates.js";

function cell(v) {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(rows) { return rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n"; }
export function withBom(csv) { return "\uFEFF" + csv; }
export function leaveOverviewCsv({ ym, users, leaves }) {
  const rows = [["姓名", "狀態", "休假日期"]];
  for (const u of users) {
    const l = leaves.find((x) => x.uid === u.uid);
    rows.push([u.name, l ? (l.status === "submitted" ? "已送出" : "草稿") : "尚未送出", l ? l.dates.join(" ") : ""]);
  }
  return withBom(toCsv(rows));
}
export function finalScheduleMatrixCsv({ ym, users, shiftTypes, finalsDays }) {
  const days = monthDays(ym);
  const tmap = Object.fromEntries(shiftTypes.map((t) => [t.id, t.name]));
  const rows = [["姓名", ...days.map((d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`)]];
  for (const u of users) {
    rows.push([u.name, ...days.map((d) => {
      const s = finalsDays?.[d]?.[u.uid];
      return s === "REST" ? "休" : (s ? (tmap[s] || s) : "");
    })]);
  }
  return withBom(toCsv(rows));
}
export function usersCsv(users) {
  const rows = [["姓名", "登入前綴", "角色", "啟用"]];
  for (const u of users) rows.push([u.name, u.loginPrefix, u.shiftRole === "manager" ? "主管" : "員工", u.active ? "是" : "否"]);
  return withBom(toCsv(rows));
}
export function shiftTypesCsv(types) {
  const rows = [["名稱", "開始", "結束", "顏色", "啟用"]];
  for (const t of types) rows.push([t.name, t.startTime, t.endTime, t.color, t.active ? "是" : "否"]);
  return withBom(toCsv(rows));
}
export function groupsCsv(groups, usersById) {
  const rows = [["組別", "成員"]];
  for (const g of groups) rows.push([g.name, (g.memberUids || []).map((u) => usersById[u]?.name || u).join("、")]);
  return withBom(toCsv(rows));
}
