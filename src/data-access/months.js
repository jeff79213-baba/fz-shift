export async function getMonth(db, ym) {
  const s = await db.collection("shift_months").doc(ym).get();
  return s.exists ? { ym, ...s.data() } : { ym, status: "closed", deadline: null, holidayDays: 0, quotaOverride: null };
}
export async function listMonths(db) {
  const s = await db.collection("shift_months").get();
  return s.docs.map((d) => ({ ym: d.id, ...d.data() })).sort((a, b) => a.ym.localeCompare(b.ym));
}
export async function saveMonth(db, ym, data) {
  return db.collection("shift_months").doc(ym).set({ ...data, updatedAt: new Date() }, { merge: true });
}
// 預設顯示月份：本月若有設定就用本月，否則用「最近一個有設定的月份」。
export async function pickDefaultYm(db, now = new Date()) {
  const s = await db.collection("shift_months").get();
  const yms = s.docs.map((d) => d.id).sort();
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (yms.includes(cur)) return cur;
  return yms.length ? yms[yms.length - 1] : cur;
}
