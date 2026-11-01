export async function listUsers(db) {
  const snap = await db.collection("shift_users").get();
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

// 依主管自訂的順序排列（shift_settings/app.userOrder）；未列者依姓名排在後面。
export async function listUsersOrdered(db) {
  const users = await listUsers(db);
  let order = [];
  try {
    const s = await db.collection("shift_settings").doc("app").get();
    order = (s.exists && s.data().userOrder) || [];
  } catch { order = []; }
  const idx = new Map(order.map((uid, i) => [uid, i]));
  return users.slice().sort((a, b) => {
    const ia = idx.has(a.uid) ? idx.get(a.uid) : Number.MAX_SAFE_INTEGER;
    const ib = idx.has(b.uid) ? idx.get(b.uid) : Number.MAX_SAFE_INTEGER;
    if (ia !== ib) return ia - ib;
    return (a.name || "").localeCompare(b.name || "");
  });
}
function apiBase() { return "/api/shift"; }
async function authHeader() {
  const u = window.__fb.auth.currentUser;
  const t = await u.getIdToken();
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
}
export async function apiListEmployees() {
  const r = await fetch(`${apiBase()}/employees`, { headers: await authHeader() });
  if (!r.ok) throw new Error((await r.json()).error || "讀取失敗");
  return (await r.json()).employees || [];
}
export async function apiCreateEmployee({ name, prefix, password }) {
  const r = await fetch(`${apiBase()}/employees`, { method: "POST", headers: await authHeader(), body: JSON.stringify({ name, prefix, password }) });
  if (!r.ok) throw new Error((await r.json()).error || "建立失敗");
  return r.json();
}
export async function apiUpdateEmployee(uid, data) {
  const r = await fetch(`${apiBase()}/employees/${uid}`, { method: "PUT", headers: await authHeader(), body: JSON.stringify(data) });
  if (!r.ok) throw new Error((await r.json()).error || "更新失敗");
  return r.json();
}
export async function apiResetPassword(uid, newPassword) {
  const r = await fetch(`${apiBase()}/employees/${uid}/reset-password`, { method: "PUT", headers: await authHeader(), body: JSON.stringify({ newPassword }) });
  if (!r.ok) throw new Error((await r.json()).error || "重設失敗");
  return r.json();
}
export async function apiDeleteEmployee(uid) {
  const r = await fetch(`${apiBase()}/employees/${uid}`, { method: "DELETE", headers: await authHeader() });
  if (!r.ok) throw new Error((await r.json()).error || "刪除失敗");
  return r.json();
}
