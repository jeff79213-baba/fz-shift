const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const {
  normalizePrefix,
  isShiftEmail,
  toEmail,
  isValidPassword,
} = require("./shared.js");

initializeApp();
const auth = getAuth();
const db = getFirestore();
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ strict: true }));

async function verifyManager(req, res, next) {
  try {
    const token = (req.headers.authorization || "").split("Bearer ")[1];
    if (!token) return res.status(401).json({ error: "未提供 Token" });
    const decoded = await auth.verifyIdToken(token, true);
    if (decoded.shiftRole !== "manager") return res.status(403).json({ error: "無主管權限" });
    req.mgr = decoded;
    next();
  } catch { res.status(401).json({ error: "Token 無效" }); }
}

async function assertShiftUser(uid) {
  const rec = await auth.getUser(uid).catch(() => null);
  if (!rec || !isShiftEmail(rec.email)) { const e = new Error("非本系統帳號"); e.status = 403; throw e; }
  return rec;
}

async function setShiftRole(uid, shiftRole) {
  const u = await auth.getUser(uid);
  const claims = { ...(u.customClaims || {}), shiftRole };
  await auth.setCustomUserClaims(uid, claims);
}

app.post("/api/shift/setup", async (req, res) => {
  const { name, prefix, password, token } = req.body || {};
  if (!token || !isValidPassword(password) || !normalizePrefix(prefix)) return res.status(400).json({ error: "參數不完整" });
  const ref = db.collection("shift_setup").doc("token");
  const snap = await ref.get();
  if (!snap.exists || snap.data().used || snap.data().hash !== crypto.createHash("sha256").update(token).digest("hex"))
    return res.status(403).json({ error: "setup token 無效" });
  const email = toEmail(prefix);
  const rec = await auth.createUser({ email, password, displayName: name }).catch((e) => { throw { status: 400, message: e.message }; });
  await auth.setCustomUserClaims(rec.uid, { shiftRole: "manager" });
  await db.collection("shift_users").doc(rec.uid).set({ name, loginPrefix: normalizePrefix(prefix), shiftRole: "manager", active: true, mustChangePassword: false, createdAt: new Date(), updatedAt: new Date() });
  await ref.set({ used: true, usedBy: rec.uid, usedAt: new Date() }, { merge: true });
  res.json({ uid: rec.uid });
});

app.get("/api/shift/employees", verifyManager, async (req, res) => {
  const s = await db.collection("shift_users").get();
  res.json({ employees: s.docs.map((d) => ({ uid: d.id, ...d.data() })) });
});

app.post("/api/shift/employees", verifyManager, async (req, res) => {
  try {
    const { name, prefix, password } = req.body || {};
    if (!name || !normalizePrefix(prefix) || !isValidPassword(password)) return res.status(400).json({ error: "請填姓名、帳號，密碼需 ≥8 碼含英數" });
    const email = toEmail(prefix);
    const rec = await auth.createUser({ email, password, displayName: name });
    await auth.setCustomUserClaims(rec.uid, { shiftRole: "staff" });
    await db.collection("shift_users").doc(rec.uid).set({ name, loginPrefix: normalizePrefix(prefix), shiftRole: "staff", active: true, mustChangePassword: true, createdAt: new Date(), updatedAt: new Date() });
    res.json({ uid: rec.uid });
  } catch (e) { res.status(400).json({ error: e.message || "建立失敗" }); }
});

app.put("/api/shift/employees/:uid", verifyManager, async (req, res) => {
  try {
    const { uid } = req.params; await assertShiftUser(uid);
    const { name, active, shiftRole } = req.body || {};
    if (shiftRole !== undefined && !["staff", "manager"].includes(shiftRole)) return res.status(400).json({ error: "角色不合法" });
    if (name) await auth.updateUser(uid, { displayName: name });
    if (typeof active === "boolean") await auth.updateUser(uid, { disabled: !active });
    if (shiftRole) await setShiftRole(uid, shiftRole);
    const patch = { updatedAt: new Date() };
    if (name) patch.name = name;
    if (typeof active === "boolean") patch.active = active;
    if (shiftRole) patch.shiftRole = shiftRole;
    await db.collection("shift_users").doc(uid).set(patch, { merge: true });
    res.json({ ok: true });
  } catch (e) { res.status(e.status || 400).json({ error: e.message || "更新失敗" }); }
});

app.put("/api/shift/employees/:uid/reset-password", verifyManager, async (req, res) => {
  try {
    const { uid } = req.params; await assertShiftUser(uid);
    const { newPassword } = req.body || {};
    if (!isValidPassword(newPassword)) return res.status(400).json({ error: "密碼需 ≥8 碼含英數" });
    await auth.updateUser(uid, { password: newPassword });
    await db.collection("shift_users").doc(uid).set({ mustChangePassword: true, updatedAt: new Date() }, { merge: true });
    res.json({ ok: true });
  } catch (e) { res.status(e.status || 400).json({ error: e.message || "重設失敗" }); }
});

app.delete("/api/shift/employees/:uid", verifyManager, async (req, res) => {
  try {
    const { uid } = req.params; await assertShiftUser(uid);
    await auth.deleteUser(uid);
    await db.collection("shift_users").doc(uid).delete();
    res.json({ ok: true });
  } catch (e) { res.status(e.status || 400).json({ error: e.message || "刪除失敗" }); }
});

exports.shiftApi = functions.https.onRequest(app);
