// 在 Firestore 建立 shift_setup/token 種子文件（本專案專屬集合）。
// 只寫 shift_setup/token，不動其他任何資料。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const keyDir = path.resolve(here, "..", "..");
const requireFromFunctions = createRequire(path.resolve(here, "..", "functions", "package.json"));
const admin = requireFromFunctions("firebase-admin");

function findKeyFile() {
  const files = fs.readdirSync(keyDir).filter((f) => /^opencode-sk-.*\.json$/i.test(f)).sort();
  if (!files.length) throw new Error("找不到金鑰檔 opencode-sk-*.json（應在專案上一層）");
  return path.join(keyDir, files[0]);
}

async function main() {
  const token = process.argv[2];
  const force = process.argv.includes("--force");
  if (!token) throw new Error("用法：node tools/seed-setup-token.js <token> [--force]");

  const sa = JSON.parse(fs.readFileSync(findKeyFile(), "utf8"));
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: "opencode-sk" });
  const db = admin.firestore();

  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const ref = db.collection("shift_setup").doc("token");
  const snap = await ref.get();
  if (snap.exists && !force) {
    console.log("shift_setup/token 已存在，未覆蓋：", JSON.stringify(snap.data()));
    return;
  }
  await ref.set({ hash, used: false }, { merge: true });
  console.log("已建立 shift_setup/token");
  console.log("  hash =", hash);
  console.log("  used = false");
}

main().then(() => process.exit(0)).catch((e) => { console.error("[失敗]", e.message); process.exit(1); });
