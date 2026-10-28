const SUFFIX = "@shift.local";
export function toEmail(prefix) { return String(prefix).trim().toLowerCase() + SUFFIX; }
export function isValidPassword(pw) { return typeof pw === "string" && pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw); }
export async function login(prefix, password) {
  const { auth } = window.__fb;
  return auth.signInWithEmailAndPassword(toEmail(prefix), password);
}
export async function loginWithEmail(email, password) {
  const { auth } = window.__fb;
  return auth.signInWithEmailAndPassword(email, password);
}
// 先用「姓名」查對照表；查不到再視為帳號前綴。
export async function resolveLoginEmail(entered) {
  const key = String(entered == null ? "" : entered).trim();
  if (!key) return null;
  const snap = await window.__fb.db.collection("shift_login_map").doc(key).get();
  if (snap.exists && snap.data().email) return snap.data().email;
  return toEmail(key);
}
export async function logout() { return window.__fb.auth.signOut(); }
export async function currentUser() { return window.__fb.auth.currentUser; }
export async function loadProfile(uid) {
  const snap = await window.__fb.db.collection("shift_users").doc(uid).get();
  return snap.exists ? { uid, ...snap.data() } : null;
}
export function requireRole(profile, role) { return !!profile && profile.shiftRole === role && profile.active !== false; }
export async function changeMyPassword(oldPw, newPw) {
  const u = window.__fb.auth.currentUser;
  const cred = window.firebase.auth.EmailAuthProvider.credential(u.email, oldPw);
  await u.reauthenticateWithCredential(cred);
  await u.updatePassword(newPw);
}
