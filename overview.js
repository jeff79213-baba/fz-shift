import { initFirebase } from "./src/firebase-init.js";
import { logout, loadProfile } from "./src/auth.js";
import { renderHeader } from "./src/ui/header.js";
import { listLeaves } from "./src/data-access/leaves.js";
import { listGroups } from "./src/data-access/groups.js";
import { listUsers } from "./src/data-access/users.js";
import { restByUidFromLeaves, findConflicts } from "./src/lib/conflicts.js";
import { leaveOverviewCsv } from "./src/lib/csv.js";
import { canSeeOthers } from "./src/lib/state.js";
import { ymOf, addMonthsYm, daysInMonth } from "./src/lib/dates.js";

window.__fb = initFirebase();
const { auth, db } = window.__fb;

const state = { ym: ymOf(new Date()), profile: null };

function downloadCsv(filename, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function load() {
  const uid = auth.currentUser.uid;
  const [users, leaves, groups] = await Promise.all([listUsers(db), listLeaves(db, state.ym), listGroups(db)]);
  document.getElementById("monthBar").innerHTML =
    `<button id="prevM" class="btn">◀</button> <b>${state.ym}</b> <button id="nextM" class="btn">▶</button>`;
  document.getElementById("prevM").onclick = () => { state.ym = addMonthsYm(state.ym, -1); load(); };
  document.getElementById("nextM").onclick = () => { state.ym = addMonthsYm(state.ym, 1); load(); };

  const myLeave = leaves.find((l) => l.uid === uid);
  const isMgr = !!(state.profile && state.profile.shiftRole === "manager");
  if (!isMgr && !canSeeOthers(myLeave)) {
    document.getElementById("gate").innerHTML = `<div class="warn-orange">您尚未送出本月休假，送出後才能查看全員休假。</div>`;
    document.getElementById("matrix").innerHTML = "";
    document.getElementById("conflicts").innerHTML = "";
    return;
  }
  document.getElementById("gate").innerHTML = "";

  const days = daysInMonth(state.ym);
  const byUid = Object.fromEntries(leaves.map((l) => [l.uid, new Set(l.dates)]));
  const nameOf = Object.fromEntries(users.map((u) => [u.uid, u.name]));

  const head = ["姓名", "狀態", ...days.map((d) => Number(d.slice(8, 10)))].map((h) => `<th>${h}</th>`).join("");
  const rows = users.map((u) => {
    const l = leaves.find((x) => x.uid === u.uid);
    const status = l ? (l.status === "submitted" ? "已送出" : "草稿") : "尚未送出";
    const cells = days.map((d) => `<td class="${byUid[u.uid] && byUid[u.uid].has(d) ? "rest" : ""}">${byUid[u.uid] && byUid[u.uid].has(d) ? "休" : ""}</td>`).join("");
    return `<tr><th>${u.name}</th><td class="st">${status}</td>${cells}</tr>`;
  }).join("");
  document.getElementById("matrix").innerHTML = `<div class="scroll"><table class="matrix"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;

  const conflicts = findConflicts(groups, restByUidFromLeaves(leaves));
  document.getElementById("conflicts").innerHTML = conflicts.length
    ? conflicts.map((c) => `<div class="warn-red">${c.date}｜${c.groupName}：${c.uids.map((u) => nameOf[u] || u).join("、")} 同休</div>`).join("")
    : `<div class="ok">無代理人衝突</div>`;

  document.getElementById("exportCsv").onclick = () => downloadCsv(`休假總覽_${state.ym}.csv`, leaveOverviewCsv({ ym: state.ym, users, leaves }));
  document.getElementById("print").onclick = () => window.print();
}

auth.onAuthStateChanged(async (u) => {
  if (!u) { location.href = "login.html"; return; }
  state.profile = await loadProfile(u.uid);
  if (!state.profile || state.profile.active === false) { await logout(); location.href = "login.html"; return; }
  renderHeader(document.getElementById("header"), {
    user: state.profile,
    onLogout: async () => { await logout(); location.href = "login.html"; },
    nav: [
      { label: "我的月曆", href: "index.html" },
      { label: "全員休假", href: "overview.html", active: true },
      { label: "最終班表", href: "schedule.html" },
    ].concat(state.profile.shiftRole === "manager" ? [{ label: "主管後台", href: "admin.html" }] : []),
  });
  await load();
});
