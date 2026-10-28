// 抓取線上 Firestore 規則，換成本專案的 shift_* 片段，寫出本地 firestore.rules。
// 只讀線上規則、只寫本地檔案，不部署任何東西。
// 可重複執行：先移除舊的 shift 標記區塊，再插入最新片段，不影響其他專案段落。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JWT } from "google-auth-library";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..");
const keyDir = path.resolve(here, "..", "..");
const START = "// ===== 風自然班表 START =====";
const END = "// ===== 風自然班表 END =====";

function findKeyFile() {
  const files = fs.readdirSync(keyDir).filter((f) => /^opencode-sk-.*\.json$/i.test(f)).sort();
  if (!files.length) throw new Error("找不到金鑰檔 opencode-sk-*.json（應在專案上一層）");
  return path.join(keyDir, files[0]);
}

async function fetchLiveRules() {
  const key = JSON.parse(fs.readFileSync(findKeyFile(), "utf8"));
  const client = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const { token } = await client.getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const list = await (await fetch(
    "https://firebaserules.googleapis.com/v1/projects/opencode-sk/rulesets?pageSize=5", { headers })).json();
  const latest = (list.rulesets || [])[0];
  if (!latest) throw new Error("讀不到線上 rules 版本");
  const src = await (await fetch(
    `https://firebaserules.googleapis.com/v1/${latest.name}`, { headers })).json();
  const text = ((src.source && src.source.files) || []).map((f) => f.content).join("\n");
  return { text, createTime: latest.createTime };
}

function stripExisting(text) {
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  if (s !== -1 && e !== -1) {
    return { text: text.slice(0, s) + text.slice(e + END.length), stripped: true };
  }
  // 相容舊版：無 START/END 標記的 shift 區塊，從其標頭註解到 fz_ 的 function signedIn() 之前。
  const legacy = text.indexOf("風自然班表（shift_*）");
  if (legacy !== -1) {
    const cStart = text.lastIndexOf("//", text.lastIndexOf("\n", legacy));
    const fz = text.indexOf("function signedIn() {", legacy);
    if (cStart !== -1 && fz !== -1) {
      const lineStart = text.lastIndexOf("\n", cStart) + 1;
      const fzLineStart = text.lastIndexOf("\n", fz) + 1;
      return { text: text.slice(0, lineStart) + text.slice(fzLineStart), stripped: true };
    }
  }
  return { text, stripped: false };
}

async function main() {
  const { text: liveText, createTime } = await fetchLiveRules();
  console.log(`線上最新規則版本：${createTime}（${liveText.length} 字元）`);

  const { text: base, stripped } = stripExisting(liveText);
  console.log(stripped ? "已移除線上舊的 shift 區塊，將重插最新片段。" : "線上尚無 shift 區塊，將新增。");

  const block = fs.readFileSync(path.join(ROOT, "tools", "firestore-shift-block.rules"), "utf8").replace(/\s+$/, "");
  const marker = /match\s+\/databases\/\{database\}\/documents\s*\{/;
  const m = base.match(marker);
  if (!m) throw new Error("找不到 `match /databases/{database}/documents {` 區塊");
  const idx = m.index + m[0].length;

  const merged = base.slice(0, idx) + "\n\n" + block + "\n" + base.slice(idx);
  const outPath = path.join(ROOT, "firestore.rules");
  fs.writeFileSync(outPath, merged, "utf8");
  console.log(`已寫出 ${outPath}（${merged.length} 字元）：線上原規則 + 最新 shift_* 片段。`);
}

main().then(() => process.exit(0)).catch((e) => { console.error("[失敗]", e.message); process.exit(1); });
