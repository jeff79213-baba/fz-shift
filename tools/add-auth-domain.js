// 追加 Firebase Auth 授權網域（不動原有網域）。
// 先 GET 完整清單，再以完整清單 PATCH（避免覆蓋掉其他 App 的網域）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JWT } from "google-auth-library";

const here = path.dirname(fileURLToPath(import.meta.url));
const keyDir = path.resolve(here, "..", "..");

function findKeyFile() {
  const files = fs.readdirSync(keyDir).filter((f) => /^opencode-sk-.*\.json$/i.test(f)).sort();
  if (!files.length) throw new Error("找不到金鑰檔 opencode-sk-*.json");
  return path.join(keyDir, files[0]);
}

async function main() {
  const add = process.argv.slice(2);
  if (!add.length) throw new Error("用法：node tools/add-auth-domain.js <domain> [...]");
  const key = JSON.parse(fs.readFileSync(findKeyFile(), "utf8"));
  const client = new JWT({ email: key.client_email, key: key.private_key, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const { token } = await client.getAccessToken();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const url = "https://identitytoolkit.googleapis.com/admin/v2/projects/opencode-sk/config";

  const cfg = await (await fetch(url, { headers })).json();
  const current = cfg.authorizedDomains || [];
  console.log("現有授權網域：", current.join(", ") || "(無)");

  const merged = [...current];
  for (const d of add) if (!merged.includes(d)) merged.push(d);
  if (merged.length === current.length) {
    console.log("無需變更（指定的網域都已存在）。");
    return;
  }

  const res = await fetch(url + "?updateMask=authorizedDomains", {
    method: "PATCH",
    headers,
    body: JSON.stringify({ authorizedDomains: merged }),
  });
  if (!res.ok) throw new Error(`PATCH 失敗 ${res.status} ${await res.text()}`);
  const out = await res.json();
  console.log("更新後授權網域：", (out.authorizedDomains || merged).join(", "));
}

main().then(() => process.exit(0)).catch((e) => { console.error("[失敗]", e.message); process.exit(1); });
