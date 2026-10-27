import { LEAVE_STATUS } from "../lib/state.js";
export function buildLeaveDoc(ym, uid, dates, status, updatedBy) {
  const now = new Date();
  return { uid, ym, dates: mergeLeaveDates(dates), status, updatedBy,
    submittedAt: status === LEAVE_STATUS.SUBMITTED ? now : null, updatedAt: now };
}
export function mergeLeaveDates(dates, add) {
  const s = new Set(dates || []);
  if (add) s.add(add);
  return [...s].sort();
}
export async function getMyLeave(db, ym, uid) {
  const snap = await db.collection("shift_leaves").doc(`${ym}_${uid}`).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}
export async function saveDraft(db, ym, uid, dates) {
  return db.collection("shift_leaves").doc(`${ym}_${uid}`).set(buildLeaveDoc(ym, uid, dates, LEAVE_STATUS.DRAFT, uid));
}
export async function submitLeave(db, ym, uid, dates) {
  return db.collection("shift_leaves").doc(`${ym}_${uid}`).set(buildLeaveDoc(ym, uid, dates, LEAVE_STATUS.SUBMITTED, uid));
}
export async function listLeaves(db, ym) {
  const snap = await db.collection("shift_leaves").where("ym", "==", ym).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
