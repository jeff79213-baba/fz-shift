// 本機帳號工具（管理者在自己電腦執行；用服務帳號金鑰，繞過 Firestore 規則）。
// 不需要 Cloud Functions、不需要付費方案。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const keyDir = path.resolve(here, "..", "..");
const requireFromFunctions = createRequire(path.resolve(here, "..", "functions", "package.json"));
const { initializeApp, cert } = requireFromFunctions("firebase-admin/app");
const { getAuth } = requireFromFunctions("firebase-admin/auth");
const { getFirestore } = requireFromFunctions("firebase-admin/firestore");

const DOMAIN = "shift.local";
const ROLES = ["staff", "manager"];

function findKeyFile() {
  const files = fs.readdirSync(keyDir).filter((f) => /^opencode-sk-.*\.json$/i.test(f)).sort();
  if (!files.length) throw new Error(`找不到金鑰檔：${path.join(keyDir, "opencode-sk-*.json")}`);
  return path.join(keyDir, files[0]);
}

let app = null;
function admin() {
  if (!app) {
    app = initializeApp({ credential: cert(JSON.parse(fs.readFileSync(findKeyFile(), "utf8"))), projectId: "opencode-sk" });
  }
  return { auth: getAuth(app), db: getFirestore(app) };
}

function toEmail(raw) {
  const v = String(raw == null ? "" : raw).trim().toLowerCase();
  if (!v) return null;
  if (v.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(v)) return null;
  return `${v}@${DOMAIN}`;
}

function isValidPassword(pw) {
  return typeof pw === "string" && pw.length >= 6;
}

function usage() {
  console.log("用法：");
  console.log("  node tools/shift-account.js list                              列出所有帳號");
  console.log("  node tools/shift-account.js open <前綴> <密碼> [manager|staff] [姓名]");
  console.log("  node tools/shift-account.js passwd <前綴> <新密碼>            重設密碼");
  console.log("  node tools/shift-account.js remove <前綴>                     刪除帳號");
  console.log("  node tools/shift-account.js sync                             重建姓名→email 對照（供姓名登入）");
}

async function list() {
  const { db } = admin();
  const snap = await db.collection("shift_users").get();
  if (snap.empty) {
    console.log("尚無帳號。開第一位主管：node tools/shift-account.js open manager <密碼> manager 主管姓名");
    return;
  }
  const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => (a.loginPrefix || "").localeCompare(b.loginPrefix || ""));
  for (const r of rows) {
    console.log(`- ${r.loginPrefix || "?"}  ${r.shiftRole || "?"}  ${r.active === false ? "停用" : "啟用"}  ${r.name || ""}  (${r.uid})`);
  }
}

async function open(prefix, password, role, name) {
  const email = toEmail(prefix);
  if (!email) throw new Error("帳號前綴格式不正確（只允許英數與 . _ -）");
  if (!isValidPassword(password)) throw new Error("密碼需 ≥8 碼且含英文與數字");
  if (!ROLES.includes(role)) throw new Error("角色只能是 manager 或 staff");
  const { auth, db } = admin();
  let uid;
  let created = true;
  try {
    uid = (await auth.createUser({ email, password, emailVerified: true, disabled: false, displayName: name || undefined })).uid;
  } catch (e) {
    if (e.code !== "auth/email-already-exists") throw e;
    created = false;
    const u = await auth.getUserByEmail(email);
    uid = u.uid;
    await auth.updateUser(uid, { password, emailVerified: true, disabled: false, displayName: name || undefined });
  }
  const displayName = name || String(prefix).trim();
  await db.collection("shift_users").doc(uid).set({
    name: displayName,
    loginPrefix: String(prefix).trim().toLowerCase(),
    shiftRole: role,
    active: true,
    mustChangePassword: false,
    updatedAt: new Date(),
  }, { merge: true });
  await db.collection("shift_login_map").doc(displayName).set({ email, uid }, { merge: true });
  console.log(`[完成] ${email} → ${role}  姓名=${displayName}${created ? "" : "（帳號已存在，已更新密碼與角色）"}  uid=${uid}`);
}

async function sync() {
  const { db } = admin();
  const snap = await db.collection("shift_users").get();
  let n = 0;
  for (const d of snap.docs) {
    const u = d.data() || {};
    if (!u.name || !u.loginPrefix) continue;
    await db.collection("shift_login_map").doc(u.name).set({ email: `${u.loginPrefix}@${DOMAIN}`, uid: d.id }, { merge: true });
    n += 1;
  }
  console.log(`[完成] 已同步 ${n} 筆「姓名→email」對照（供姓名登入）。`);
}

async function passwd(prefix, password) {
  const email = toEmail(prefix);
  if (!email) throw new Error("帳號前綴格式不正確");
  if (!isValidPassword(password)) throw new Error("密碼需 ≥8 碼且含英文與數字");
  const { auth, db } = admin();
  const user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { password });
  await db.collection("shift_users").doc(user.uid).set({ mustChangePassword: true, updatedAt: new Date() }, { merge: true });
  console.log(`[完成] ${email} 密碼已重設（對方下次登入需更改）`);
}

async function remove(prefix) {
  const email = toEmail(prefix);
  if (!email) throw new Error("帳號前綴格式不正確");
  const { auth, db } = admin();
  let uid = null;
  try {
    uid = (await auth.getUserByEmail(email)).uid;
    await auth.deleteUser(uid);
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
  }
  const snap = await db.collection("shift_users").where("loginPrefix", "==", String(prefix).trim().toLowerCase()).get();
  for (const d of snap.docs) {
    const nm = (d.data() || {}).name;
    if (nm) await db.collection("shift_login_map").doc(nm).delete().catch(() => {});
    await d.ref.delete();
  }
  console.log(`[完成] 已刪除 ${email}${uid ? ` (${uid})` : ""}`);
  const rest = await db.collection("shift_users").where("shiftRole", "==", "manager").where("active", "==", true).get();
  if (rest.empty) console.log("[注意] 已無啟用中的主管，請盡快補一位，否則無人能管理。");
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === "--help") return usage();
  const cmd = args[0];
  if (cmd === "list") return list();
  if (cmd === "open") return open(args[1], args[2], args[3] || "staff", args[4]);
  if (cmd === "passwd") return passwd(args[1], args[2]);
  if (cmd === "remove") return remove(args[1]);
  if (cmd === "sync") return sync();
  return usage();
}

main().then(() => process.exit(0)).catch((err) => { console.error("[失敗]", err.message); process.exit(1); });
