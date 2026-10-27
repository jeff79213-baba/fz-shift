export async function getSettings(db) {
  const s = await db.collection("shift_settings").doc("app").get();
  return s.exists ? s.data() : { weekendRule: { enabled: true, friMax: 1, satMax: 1, sunMax: 1 } };
}
export async function saveSettings(db, data) {
  return db.collection("shift_settings").doc("app").set(data, { merge: true });
}
