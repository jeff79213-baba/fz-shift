import { initFirebase } from "./src/firebase-init.js";
import { logout, loadProfile } from "./src/auth.js";
import { renderHeader } from "./src/ui/header.js";
import { listUsers } from "./src/data-access/users.js";
import { listShiftTypes, saveShiftType, deleteShiftType } from "./src/data-access/shifts.js";
import { listGroups, saveGroup, deleteGroup } from "./src/data-access/groups.js";
import { listMonths, saveMonth } from "./src/data-access/months.js";
import { listLeaves } from "./src/data-access/leaves.js";
import { getSettings, saveSettings } from "./src/data-access/settings.js";
import { usersCsv, shiftTypesCsv, groupsCsv } from "./src/lib/csv.js";
import { holidayDaysInMonth } from "./src/lib/holidays.js";

window.__fb = initFirebase();
const { auth, db } = window.__fb;

const cache = { employees: [], shifts: [], groups: [], months: [], leaves: [], settings: null };
let activeTab = "employees";

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function msg(text, isErr = false) {
  const el = document.getElementById("msg");
  el.textContent = text || "";
  el.className = "msg" + (isErr ? " warn-red" : " ok");
  if (text) setTimeout(() => { el.textContent = ""; el.className = "msg"; }, 4000);
}
function downloadCsv(filename, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- 員工管理 ----------
function renderEmployees() {
  const me = auth.currentUser ? auth.currentUser.uid : null;
  const rows = cache.employees.map((u) => {
    const isSelf = u.uid === me;
    return `<tr>
      <td>${esc(u.name)}</td>
      <td>${esc(u.loginPrefix)}</td>
      <td><select data-act="role" data-uid="${u.uid}"${isSelf ? " disabled" : ""}>
        <option value="staff"${u.shiftRole === "staff" ? " selected" : ""}>員工</option>
        <option value="manager"${u.shiftRole === "manager" ? " selected" : ""}>主管</option>
      </select></td>
      <td><input type="checkbox" data-act="active" data-uid="${u.uid}"${u.active !== false ? " checked" : ""}${isSelf ? " disabled" : ""}></td>
      <td>${isSelf ? "（本人）" : ""}</td>
    </tr>`;
  }).join("");
  document.getElementById("content").innerHTML = `
    <h3>員工管理</h3>
    <div class="hint">
      帳號的「建立／改密碼／刪除」由管理者在自己的電腦執行本機工具（不需 Cloud Functions、不需付費方案）：<br>
      <code>node tools/shift-account.js open &lt;前綴&gt; &lt;密碼&gt; [manager|staff] [姓名]</code><br>
      <code>node tools/shift-account.js passwd &lt;前綴&gt; &lt;新密碼&gt;</code>　
      <code>node tools/shift-account.js remove &lt;前綴&gt;</code>　
      <code>node tools/shift-account.js list</code>
    </div>
    <div class="hint">下表可直接調整「角色／啟用」（寫入 Firestore，即時生效）。不可調整自己的角色或啟用，以免鎖死。</div>
    <div class="scroll"><table class="matrix">
      <thead><tr><th>姓名</th><th>登入前綴</th><th>角色</th><th>啟用</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;

  document.querySelectorAll('#content [data-act="role"]').forEach((el) => el.addEventListener("change", async () => {
    try { await db.collection("shift_users").doc(el.dataset.uid).set({ shiftRole: el.value, updatedAt: new Date() }, { merge: true }); msg("已更新角色"); await refresh(); }
    catch (e) { msg(e.message, true); await refresh(); }
  }));
  document.querySelectorAll('#content [data-act="active"]').forEach((el) => el.addEventListener("change", async () => {
    try { await db.collection("shift_users").doc(el.dataset.uid).set({ active: el.checked, updatedAt: new Date() }, { merge: true }); msg("已更新啟用狀態"); await refresh(); }
    catch (e) { msg(e.message, true); await refresh(); }
  }));
}

// ---------- 班別設定 ----------
function renderShiftTypes() {
  const rows = cache.shifts.map((t) => `<tr>
    <td>${esc(t.name)}</td><td>${esc(t.startTime || "")}</td><td>${esc(t.endTime || "")}</td>
    <td><span style="display:inline-block;width:16px;height:16px;background:${esc(t.color || "#888")};border-radius:3px"></span> ${esc(t.color || "")}</td>
    <td>${t.active === false ? "停用" : "啟用"}</td>
    <td><button class="btn" data-act="edit" data-id="${t.id}">編輯</button>
        <button class="btn btn-danger" data-act="del" data-id="${t.id}">刪除</button></td>
  </tr>`).join("");
  document.getElementById("content").innerHTML = `
    <h3>班別設定</h3>
    <div class="field row">
      <input id="stName" placeholder="名稱（如 早班）">
      <input id="stStart" type="time">
      <input id="stEnd" type="time">
      <input id="stColor" type="color" value="#2f6f4f">
      <button id="addShift" class="btn btn-primary">新增班別</button>
    </div>
    <div class="scroll"><table class="matrix">
      <thead><tr><th>名稱</th><th>開始</th><th>結束</th><th>顏色</th><th>狀態</th><th>操作</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;

  document.getElementById("addShift").onclick = async () => {
    const name = document.getElementById("stName").value.trim();
    if (!name) { msg("請輸入班別名稱", true); return; }
    try {
      await saveShiftType(db, null, {
        name, startTime: document.getElementById("stStart").value, endTime: document.getElementById("stEnd").value,
        color: document.getElementById("stColor").value, active: true, order: cache.shifts.length,
      });
      msg("已新增班別"); await refresh();
    } catch (e) { msg(e.message, true); }
  };
  document.querySelectorAll('#content [data-act="del"]').forEach((el) => el.addEventListener("click", async () => {
    if (!confirm("確定刪除此班別？")) return;
    try { await deleteShiftType(db, el.dataset.id); msg("已刪除"); await refresh(); }
    catch (e) { msg(e.message, true); }
  }));
  document.querySelectorAll('#content [data-act="edit"]').forEach((el) => el.addEventListener("click", async () => {
    const t = cache.shifts.find((x) => x.id === el.dataset.id);
    const name = prompt("名稱", t.name); if (name === null) return;
    const startTime = prompt("開始時間 HH:mm", t.startTime || ""); if (startTime === null) return;
    const endTime = prompt("結束時間 HH:mm", t.endTime || ""); if (endTime === null) return;
    const color = prompt("顏色（#RRGGBB）", t.color || "#2f6f4f"); if (color === null) return;
    const active = confirm("要啟用此班別嗎？（取消＝停用）");
    try { await saveShiftType(db, t.id, { name, startTime, endTime, color, active }); msg("已更新"); await refresh(); }
    catch (e) { msg(e.message, true); }
  }));
}

// ---------- 代理人組別 ----------
function renderGroups() {
  const empOptions = cache.employees.map((u) => `<option value="${u.uid}">${esc(u.name)}</option>`).join("");
  const rows = cache.groups.map((g) => {
    const names = (g.memberUids || []).map((uid) => (cache.employees.find((u) => u.uid === uid) || {}).name || uid);
    return `<tr>
      <td>${esc(g.name)}</td>
      <td>${esc(names.join("、"))}</td>
      <td>${g.active === false ? "停用" : "啟用"}</td>
      <td><button class="btn" data-act="edit" data-id="${g.id}">編輯成員</button>
          <button class="btn btn-danger" data-act="del" data-id="${g.id}">刪除</button></td>
    </tr>`;
  }).join("");
  document.getElementById("content").innerHTML = `
    <h3>代理人組別</h3>
    <div class="field row">
      <input id="gName" placeholder="組別名稱（如 櫃檯組）">
      <select id="gMembers" multiple size="6">${empOptions}</select>
      <button id="addGroup" class="btn btn-primary">新增組別</button>
    </div>
    <div class="hint">新增時可按住 Ctrl／Cmd 多選成員。</div>
    <div class="scroll"><table class="matrix">
      <thead><tr><th>組別</th><th>成員</th><th>狀態</th><th>操作</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;

  document.getElementById("addGroup").onclick = async () => {
    const name = document.getElementById("gName").value.trim();
    if (!name) { msg("請輸入組別名稱", true); return; }
    const memberUids = [...document.getElementById("gMembers").selectedOptions].map((o) => o.value);
    try { await saveGroup(db, null, { name, memberUids, active: true, order: cache.groups.length }); msg("已新增組別"); await refresh(); }
    catch (e) { msg(e.message, true); }
  };
  document.querySelectorAll('#content [data-act="edit"]').forEach((el) => el.addEventListener("click", async () => {
    const g = cache.groups.find((x) => x.id === el.dataset.id);
    const name = prompt("組別名稱", g.name); if (name === null) return;
    const memberUids = prompt("成員（以逗號分隔 uid）", (g.memberUids || []).join(","));
    if (memberUids === null) return;
    try { await saveGroup(db, g.id, { name, memberUids: memberUids.split(",").map((s) => s.trim()).filter(Boolean) }); msg("已更新"); await refresh(); }
    catch (e) { msg(e.message, true); }
  }));
  document.querySelectorAll('#content [data-act="del"]').forEach((el) => el.addEventListener("click", async () => {
    if (!confirm("確定刪除此組別？")) return;
    try { await deleteGroup(db, el.dataset.id); msg("已刪除"); await refresh(); }
    catch (e) { msg(e.message, true); }
  }));
}

// ---------- 月份管理 ----------
function renderMonths() {
  const rows = cache.months.map((m) => {
    const dl = m.deadline && m.deadline.toDate ? m.deadline.toDate().toISOString().slice(0, 10) : "";
    const hd = holidayDaysInMonth(m.ym);
    return `<tr>
      <td>${m.ym}</td>
      <td><select data-act="status" data-ym="${m.ym}">
        <option value="closed"${m.status === "closed" ? " selected" : ""}>未開放</option>
        <option value="open"${m.status === "open" ? " selected" : ""}>開放排休</option>
        <option value="arranging"${m.status === "arranging" ? " selected" : ""}>編排中</option>
      </select></td>
      <td><input type="date" data-act="deadline" data-ym="${m.ym}" value="${dl}"></td>
      <td>${hd}</td>
      <td><input type="number" min="0" data-act="quota" data-ym="${m.ym}" value="${m.quotaOverride == null ? "" : m.quotaOverride}" placeholder="留空＝依國定"></td>
      <td><button class="btn btn-danger" data-act="del" data-ym="${m.ym}">刪除</button></td>
    </tr>`;
  }).join("");
  document.getElementById("content").innerHTML = `
    <h3>月份管理</h3>
    <div class="field row">
      <input id="mYm" type="month">
      <button id="addMonth" class="btn btn-primary">新增／開啟月份</button>
    </div>
    <div class="hint">「可休假日」= 該月國定紅字假日天數；可於右欄覆寫。</div>
    <div class="scroll"><table class="matrix">
      <thead><tr><th>年月</th><th>狀態</th><th>截止日</th><th>可休假日</th><th>覆寫天數</th><th>操作</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;

  document.getElementById("addMonth").onclick = async () => {
    const ym = document.getElementById("mYm").value;
    if (!ym) { msg("請選擇年月", true); return; }
    try { await saveMonth(db, ym, { status: "open", holidayDays: holidayDaysInMonth(ym) }); msg("已新增／開啟月份"); await refresh(); }
    catch (e) { msg(e.message, true); }
  };
  document.querySelectorAll('#content [data-act="status"]').forEach((el) => el.addEventListener("change", async () => {
    try { await saveMonth(db, el.dataset.ym, { status: el.value }); msg("已更新狀態"); await refresh(); } catch (e) { msg(e.message, true); }
  }));
  document.querySelectorAll('#content [data-act="deadline"]').forEach((el) => el.addEventListener("change", async () => {
    const v = el.value ? new Date(el.value + "T23:59:59") : null;
    try { await saveMonth(db, el.dataset.ym, { deadline: v }); msg("已更新截止日"); } catch (e) { msg(e.message, true); }
  }));
  document.querySelectorAll('#content [data-act="quota"]').forEach((el) => el.addEventListener("change", async () => {
    const v = el.value === "" ? null : Number(el.value);
    try { await saveMonth(db, el.dataset.ym, { quotaOverride: v }); msg("已更新可休假日"); } catch (e) { msg(e.message, true); }
  }));
  document.querySelectorAll('#content [data-act="del"]').forEach((el) => el.addEventListener("click", async () => {
    if (!confirm("確定刪除此月份設定？")) return;
    try { await db.collection("shift_months").doc(el.dataset.ym).delete(); msg("已刪除"); await refresh(); }
    catch (e) { msg(e.message, true); }
  }));
}

// ---------- 假日與週末規則 ----------
function renderSettings() {
  const r = (cache.settings && cache.settings.weekendRule) || { enabled: true, friMax: 1, satMax: 1, sunMax: 1 };
  document.getElementById("content").innerHTML = `
    <h3>假日與週末規則（橘色軟提醒）</h3>
    <div class="hint">國定假日天數內建於 <code>data/holidays.js</code>；此處設定週末各別上限，超過僅提醒不阻擋。</div>
    <div class="field row">
      <label><input type="checkbox" id="wrEnabled"${r.enabled ? " checked" : ""}> 啟用週末規則</label>
      <label>週五上限 <input type="number" min="0" id="wrFri" value="${r.friMax}"></label>
      <label>週六上限 <input type="number" min="0" id="wrSat" value="${r.satMax}"></label>
      <label>週日上限 <input type="number" min="0" id="wrSun" value="${r.sunMax}"></label>
      <button id="saveSettings" class="btn btn-primary">儲存</button>
    </div>`;
  document.getElementById("saveSettings").onclick = async () => {
    const weekendRule = {
      enabled: document.getElementById("wrEnabled").checked,
      friMax: Number(document.getElementById("wrFri").value) || 0,
      satMax: Number(document.getElementById("wrSat").value) || 0,
      sunMax: Number(document.getElementById("wrSun").value) || 0,
    };
    try { await saveSettings(db, { weekendRule }); msg("已儲存"); await refresh(); }
    catch (e) { msg(e.message, true); }
  };
}

// ---------- 最後修改時間 ----------
function renderLastModified() {
  const rows = cache.employees.map((u) => {
    const mine = cache.leaves.filter((l) => l.uid === u.uid).sort((a, b) => {
      const at = a.updatedAt && a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
      const bt = b.updatedAt && b.updatedAt.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
      return bt - at;
    })[0];
    const when = mine && mine.updatedAt ? (mine.updatedAt.toDate ? mine.updatedAt.toDate().toLocaleString() : new Date(mine.updatedAt).toLocaleString()) : "-";
    const who = mine && mine.updatedBy ? (cache.employees.find((e) => e.uid === mine.updatedBy) || {}).name || mine.updatedBy : "-";
    return `<tr><td>${esc(u.name)}</td><td>${esc(when)}</td><td>${esc(who)}</td><td>${mine ? esc(mine.ym) : "-"}</td></tr>`;
  }).join("");
  document.getElementById("content").innerHTML = `
    <h3>最後修改時間</h3>
    <div class="hint">只保留最近一筆（依休假申請的最後更新時間）。</div>
    <div class="scroll"><table class="matrix">
      <thead><tr><th>姓名</th><th>最後修改時間</th><th>修改人</th><th>月份</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

// ---------- 匯出 ----------
function exportCurrent() {
  if (activeTab === "employees") return downloadCsv("員工清單.csv", usersCsv(cache.employees));
  if (activeTab === "shiftTypes") return downloadCsv("班別清單.csv", shiftTypesCsv(cache.shifts));
  if (activeTab === "groups") {
    const byId = Object.fromEntries(cache.employees.map((u) => [u.uid, u]));
    return downloadCsv("代理人組別.csv", groupsCsv(cache.groups, byId));
  }
  msg("此分頁沒有可匯出的 CSV", true);
}

// ---------- 分頁切換 ----------
function renderTab() {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === activeTab));
  if (activeTab === "employees") renderEmployees();
  else if (activeTab === "shiftTypes") renderShiftTypes();
  else if (activeTab === "groups") renderGroups();
  else if (activeTab === "months") renderMonths();
  else if (activeTab === "settings") renderSettings();
  else if (activeTab === "lastModified") renderLastModified();
}
document.querySelectorAll(".tab-btn").forEach((b) => b.addEventListener("click", () => { activeTab = b.dataset.tab; renderTab(); }));

async function refresh() {
  [cache.employees, cache.shifts, cache.groups, cache.months, cache.leaves, cache.settings] = await Promise.all([
    listUsers(db), listShiftTypes(db), listGroups(db), listMonths(db), listLeavesAll(), getSettings(db),
  ]);
  renderTab();
}
async function listLeavesAll() {
  const snap = await db.collection("shift_leaves").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

document.getElementById("exportCsv").onclick = exportCurrent;
document.getElementById("print").onclick = () => window.print();

auth.onAuthStateChanged(async (u) => {
  if (!u) { location.href = "login.html"; return; }
  const profile = await loadProfile(u.uid);
  if (!profile || profile.shiftRole !== "manager" || profile.active === false) { location.href = "index.html"; return; }
  renderHeader(document.getElementById("header"), {
    user: profile,
    onLogout: async () => { await logout(); location.href = "login.html"; },
    nav: [
      { label: "我的月曆", href: "index.html" },
      { label: "全員休假", href: "overview.html" },
      { label: "最終班表", href: "schedule.html" },
      { label: "主管後台", href: "admin.html", active: true },
    ],
  });
  await refresh();
});
