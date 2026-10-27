// 抓取線上 Firestore 規則，併入本專案的 shift_* 片段，寫出本地 firestore.rules。
// 只讀線上規則、只寫本地檔案，不部署任何東西。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JWT } from "google-auth-library";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..");
const keyDir = path.resolve(here, "..", "..");

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

async function main() {
  const { text: liveText, createTime } = await fetchLiveRules();
  console.log(`線上最新規則版本：${createTime}（${liveText.length} 字元）`);

  if (liveText.includes("match /shift_users/")) {
    console.log("[略過] 線上規則已含 shift_* 段落，無需合併。");
    return;
  }

  const block = fs.readFileSync(path.join(ROOT, "tools", "firestore-shift-block.rules"), "utf8").replace(/\s+$/, "");
  const marker = /match\s+\/databases\/\{database\}\/documents\s*\{/;
  const m = liveText.match(marker);
  if (!m) throw new Error("線上規則找不到 `match /databases/{database}/documents {` 區塊");
  const idx = m.index + m[0].length;

  const merged = liveText.slice(0, idx) + "\n\n" + block + "\n" + liveText.slice(idx);
  const outPath = path.join(ROOT, "firestore.rules");
  fs.writeFileSync(outPath, merged, "utf8");
  console.log(`已寫出 ${outPath}（${merged.length} 字元）：線上原規則 + shift_* 片段，未刪改任何既有段落。`);
}

main().then(() => process.exit(0)).catch((e) => { console.error("[失敗]", e.message); process.exit(1); });
