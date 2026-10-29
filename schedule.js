import { initFirebase } from "./src/firebase-init.js";
import { logout, loadProfile } from "./src/auth.js";
import { renderHeader } from "./src/ui/header.js";
import { renderCalendar } from "./src/ui/calendar.js";
import { getFinals, saveFinals } from "./src/data-access/finals.js";
import { listLeaves } from "./src/data-access/leaves.js";
import { listShiftTypes } from "./src/data-access/shifts.js";
import { listGroups } from "./src/data-access/groups.js";
import { listUsers } from "./src/data-access/users.js";
import { pickDefaultYm } from "./src/data-access/months.js";
import { restByUidFromFinals, findConflicts } from "./src/lib/conflicts.js";
import { finalScheduleMatrixCsv } from "./src/lib/csv.js";
import { ymOf, addMonthsYm, daysInMonth } from "./src/lib/dates.js";

window.__fb = initFirebase();
const { auth, db } = window.__fb;

const state = { ym: ymOf(new Date()), profile: null, cache: null };

function downloadCsv(filename, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderConflicts() {
  const { users, groups, days } = state.cache;
  const nameOf = Object.fromEntries(users.map((u) => [u.uid, u.name]));
  const conflicts = findConflicts(groups, restByUidFromFinals(days));
  state.cache.conflictDates = new Set(conflicts.map((c) => c.date));
  document.getElementById("conflicts").innerHTML = conflicts.length
    ? conflicts.map((c) => `<div class="warn-red">${c.date}｜${c.groupName}：${c.uids.map((u) => nameOf[u] || u).join("、")} 同休</div>`).join("")
    : `<div class="ok">無代理人衝突</div>`;
  document.querySelectorAll("#matrix td").forEach((td) => td.classList.remove("warn-red"));
  document.querySelectorAll("#matrix select").forEach((sel) => {
    if (conflicts.some((c) => c.date === sel.dataset.date && c.uids.includes(sel.dataset.uid))) sel.closest("td").classList.add("warn-red");
  });
  renderCalendarView();
}

function renderCalendarView() {
  renderCalendar(document.getElementById("calendar"), {
    ym: state.ym,
    days: state.cache.conflictDates || new Set(),
    decorate: (d) => (state.cache.conflictDates && state.cache.conflictDates.has(d) ? " warn-red" : ""),
  });
}

async function load() {
  const [users, shifts, groups, finals, leaves] = await Promise.all([
    listUsers(db), listShiftTypes(db), listGroups(db), getFinals(db, state.ym), listLeaves(db, state.ym),
  ]);
  // 以員工「已送出」的休假為底，再疊上主管已存的編排。
  const daysMap = {};
  for (const l of leaves) {
    if (l.status !== "submitted") continue;
    for (const d of l.dates || []) {
      daysMap[d] = daysMap[d] || {};
      daysMap[d][l.uid] = "REST";
    }
  }
  for (const [d, byUid] of Object.entries(finals.days || {})) {
    daysMap[d] = { ...(daysMap[d] || {}), ...byUid };
  }
  state.cache = { users, shifts, groups, days: daysMap };
  const isMgr = state.profile.shiftRole === "manager";

  document.getElementById("monthBar").innerHTML =
    `<button id="prevM" class="btn">◀</button> <b>${state.ym}</b> <button id="nextM" class="btn">▶</button>`;
  document.getElementById("prevM").onclick = () => { state.ym = addMonthsYm(state.ym, -1); load(); };
  document.getElementById("nextM").onclick = () => { state.ym = addMonthsYm(state.ym, 1); load(); };

  const days = daysInMonth(state.ym);
  const shiftName = (id) => (shifts.find((t) => t.id === id) || {}).name || "";
  const opts = (sel) => `<option value="">－</option><option value="REST"${sel === "REST" ? " selected" : ""}>休</option>` +
    shifts.filter((t) => t.active !== false).map((t) => `<option value="${t.id}"${sel === t.id ? " selected" : ""}>${t.name}</option>`).join("");

  const head = ["姓名", ...days.map((d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`)].map((h) => `<th>${h}</th>`).join("");
  const rows = users.map((u) => {
    const cells = days.map((d) => {
      const v = (state.cache.days[d] || {})[u.uid] || "";
      if (isMgr) return `<td><select data-uid="${u.uid}" data-date="${d}">${opts(v)}</select></td>`;
      return `<td>${v === "REST" ? "休" : (v ? shiftName(v) : "")}</td>`;
    }).join("");
    return `<tr><th>${u.name}</th>${cells}</tr>`;
  }).join("");
  document.getElementById("matrix").innerHTML = `<div class="scroll"><table class="matrix"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;

  if (isMgr) {
    document.querySelectorAll("#matrix select").forEach((sel) => sel.addEventListener("change", async () => {
      const { date, uid } = sel.dataset;
      state.cache.days[date] = state.cache.days[date] || {};
      if (sel.value) state.cache.days[date][uid] = sel.value; else delete state.cache.days[date][uid];
      await saveFinals(db, state.ym, state.cache.days, auth.currentUser.uid);
      renderConflicts();
    }));
  }

  document.getElementById("exportCsv").onclick = () => downloadCsv(`最終班表_${state.ym}.csv`,
    finalScheduleMatrixCsv({ ym: state.ym, users, shiftTypes: shifts, finalsDays: state.cache.days }));
  document.getElementById("print").onclick = () => window.print();

  renderConflicts();
}

document.getElementById("tabTable").addEventListener("click", () => {
  document.getElementById("matrix").hidden = false;
  document.getElementById("calendar").hidden = true;
  document.getElementById("tabTable").classList.add("active");
  document.getElementById("tabCalendar").classList.remove("active");
});
document.getElementById("tabCalendar").addEventListener("click", () => {
  document.getElementById("matrix").hidden = true;
  document.getElementById("calendar").hidden = false;
  document.getElementById("tabCalendar").classList.add("active");
  document.getElementById("tabTable").classList.remove("active");
});

auth.onAuthStateChanged(async (u) => {
  if (!u) { location.href = "login.html"; return; }
  state.profile = await loadProfile(u.uid);
  if (!state.profile || state.profile.active === false) { await logout(); location.href = "login.html"; return; }
  renderHeader(document.getElementById("header"), {
    user: state.profile,
    onLogout: async () => { await logout(); location.href = "login.html"; },
    nav: [
      { label: "我的月曆", href: "index.html" },
      { label: "全員休假", href: "overview.html" },
      { label: "最終班表", href: "schedule.html", active: true },
    ].concat(state.profile.shiftRole === "manager" ? [{ label: "主管後台", href: "admin.html" }] : []),
  });
  state.ym = await pickDefaultYm(db);
  await load();
});
