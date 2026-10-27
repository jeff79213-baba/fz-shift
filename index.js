import { initFirebase } from "./src/firebase-init.js";
import { logout, loadProfile } from "./src/auth.js";
import { renderHeader } from "./src/ui/header.js";
import { renderCalendar } from "./src/ui/calendar.js";
import { getMyLeave, saveDraft, submitLeave } from "./src/data-access/leaves.js";
import { getMonth } from "./src/data-access/months.js";
import { getSettings } from "./src/data-access/settings.js";
import { quotaForMonth } from "./src/lib/holidays.js";
import { evaluateWarnings } from "./src/lib/leaveRules.js";
import { canStaffEditLeave, isPastDeadline } from "./src/lib/state.js";
import { ymOf, addMonthsYm } from "./src/lib/dates.js";

window.__fb = initFirebase();
const { auth, db } = window.__fb;

const state = { ym: ymOf(new Date()), mine: null, month: null, settings: null, profile: null };
let datesSet = new Set();

const MONTH_STATUS_ZH = { closed: "未開放", open: "開放排休", arranging: "編排中" };

function render() {
  const allowed = canStaffEditLeave(state.month.status);
  document.getElementById("monthBar").innerHTML =
    `<button id="prevM" class="btn">◀</button> <b>${state.ym}</b> <button id="nextM" class="btn">▶</button>` +
    ` <span class="status">${MONTH_STATUS_ZH[state.month.status] || state.month.status}</span>` +
    ` <span class="quota">本月可休 ${quotaForMonth(state.month, state.ym)} 天</span>`;

  const deadline = state.month.deadline && state.month.deadline.toDate ? state.month.deadline.toDate() : state.month.deadline;
  const warns = evaluateWarnings([...datesSet], { rule: state.settings.weekendRule, quota: quotaForMonth(state.month, state.ym) });
  let html = "";
  if (isPastDeadline(deadline, new Date())) html += `<div class="warn-orange">已過排休截止日</div>`;
  html += warns.map((w) => `<div class="warn-orange">${w.message}</div>`).join("");
  if (state.mine && state.mine.status === "submitted") html += `<div class="ok">已送出（可再修改後重新送出）</div>`;
  document.getElementById("warnings").innerHTML = html;

  renderCalendar(document.getElementById("calendar"), {
    ym: state.ym,
    days: datesSet,
    onToggle: allowed ? (d) => {
      if (datesSet.has(d)) datesSet.delete(d); else datesSet.add(d);
      render();
    } : null,
  });

  const saveBtn = document.getElementById("saveDraft");
  const submitBtn = document.getElementById("submit");
  const submitted = state.mine && state.mine.status === "submitted";
  saveBtn.disabled = !allowed;
  submitBtn.disabled = !allowed;
  saveBtn.textContent = submitted ? "修改（存草稿）" : "儲存草稿";
  submitBtn.textContent = submitted ? "重新送出" : "送出";

  document.getElementById("prevM").onclick = () => { state.ym = addMonthsYm(state.ym, -1); load(); };
  document.getElementById("nextM").onclick = () => { state.ym = addMonthsYm(state.ym, 1); load(); };
}

async function load() {
  const u = auth.currentUser;
  const [mine, month, settings] = await Promise.all([
    getMyLeave(db, state.ym, u.uid),
    getMonth(db, state.ym),
    getSettings(db),
  ]);
  state.mine = mine;
  state.month = month;
  state.settings = settings;
  datesSet = new Set((mine && mine.dates) || []);
  render();
}

auth.onAuthStateChanged(async (u) => {
  if (!u) { location.href = "login.html"; return; }
  state.profile = await loadProfile(u.uid);
  if (!state.profile || state.profile.active === false) { await logout(); location.href = "login.html"; return; }

  renderHeader(document.getElementById("header"), {
    user: state.profile,
    onLogout: async () => { await logout(); location.href = "login.html"; },
    nav: [
      { label: "我的月曆", href: "index.html", active: true },
      { label: "全員休假", href: "overview.html" },
      { label: "最終班表", href: "schedule.html" },
    ].concat(state.profile.shiftRole === "manager" ? [{ label: "主管後台", href: "admin.html" }] : []),
  });

  document.getElementById("saveDraft").onclick = async () => {
    await saveDraft(db, state.ym, u.uid, [...datesSet]);
    await load();
  };
  document.getElementById("submit").onclick = async () => {
    await submitLeave(db, state.ym, u.uid, [...datesSet]);
    await load();
  };

  await load();
});
