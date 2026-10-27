export async function listGroups(db) {
  const s = await db.collection("shift_agentGroups").get();
  return s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
export async function saveGroup(db, id, data) {
  const ref = id ? db.collection("shift_agentGroups").doc(id) : db.collection("shift_agentGroups").doc();
  await ref.set(data, { merge: true }); return ref.id;
}
export async function deleteGroup(db, id) { return db.collection("shift_agentGroups").doc(id).delete(); }
