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
