export async function getFinals(db, ym) {
  const s = await db.collection("shift_finals").doc(ym).get();
  return s.exists ? { ym, ...s.data() } : { ym, days: {}, updatedAt: null, updatedBy: null };
}
export async function saveFinals(db, ym, days, updatedBy) {
  return db.collection("shift_finals").doc(ym).set({ days, updatedAt: new Date(), updatedBy }, { merge: true });
}
export async function listFinals(db) {
  const s = await db.collection("shift_finals").get();
  return s.docs.map((d) => ({ ym: d.id, ...d.data() }));
}
