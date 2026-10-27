export async function listShiftTypes(db) {
  const s = await db.collection("shift_shiftTypes").get();
  return s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
export async function saveShiftType(db, id, data) {
  const ref = id ? db.collection("shift_shiftTypes").doc(id) : db.collection("shift_shiftTypes").doc();
  await ref.set(data, { merge: true }); return ref.id;
}
export async function deleteShiftType(db, id) { return db.collection("shift_shiftTypes").doc(id).delete(); }
