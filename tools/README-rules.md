# Firestore 規則：只追加 `shift_*`，絕不動其他專案

本專案與父層專案共用同一個 Firebase 專案（`opencode-sk`）的 Firestore 規則。
規則檔是「整份覆蓋」的部署單位，因此**部署一份少了別的專案段落的規則，就等於把那些規則刪掉**。

為了避免這件事發生，本專案目前**刻意不建立** `firestore.rules`：

- `shift_*` 的規則放在 [`tools/firestore-shift-block.rules`](firestore-shift-block.rules)，是「片段」。
- 沒有合併完成前，`npm run deploy:safe` 與 `node tools/check-rules-drift.js` 都會失敗（讀不到 `firestore.rules`）——
  這是刻意設計的「失敗即安全」，而不是待修的錯誤。

## 正確流程

1. **取得線上規則全文**
   到 Firebase Console → Firestore Database → 「規則」分頁，複製**整份**現行規則
   （`node tools/check-rules-drift.js` 只會比對段落名稱、**不會**幫你備份全文）。

2. **合併成本地 `firestore.rules`**
   把剛才複製的全文存成專案根目錄的 `firestore.rules`，
   再把 `tools/firestore-shift-block.rules` 的全部內容貼進它的
   `service cloud.firestore { match /databases/{database}/documents { ... } }` 區塊之內。
   既有段落一個字都不要改。

3. **驗證後才部署**
   - `firebase emulators:exec --only firestore "echo rules-ok"` 確認語法無誤（不部署）。
   - `node tools/check-rules-drift.js --strict`：必須顯示線上與本地段落一致（`[OK]`）。
     若出現 `[危險] 線上有的...本地沒有`，表示合併還沒完成，**不要部署**。
   - 只有 `[OK]` 之後才可 `npm run deploy:safe`（它會先跑 `--strict` 再部署 hosting／functions／firestore）。

## 禁止事項

- ❌ 直接 `firebase deploy --only firestore`（繞過 `deploy:safe` 的 --strict 保護）。
- ❌ 把 `tools/firestore-shift-block.rules` 當成整份規則部署。
- ❌ 在本地 `firestore.rules` 裡刪改其他專案的 `match` 段落。

## 附註：函式名稱衝突

片段裡的 helper 一律加 `shift` 前綴（`shiftSignedIn`、`shiftIsManager`）。
父層規則若已有 `isSignedIn()`／`isManager()`，同名會讓整份規則編譯失敗——加前綴即可避免。

## 附註：第一位主管的 setup token

`POST /api/shift/setup` 需要 `shift_setup/token` 文件，內含：

- `hash`：setup token 的 SHA-256 十六進位字串（`sha256(token)`）
- `used`：`false`
- （成功使用後函式會自行寫入 `used: true`、`usedBy`、`usedAt`）

規則把 `shift_setup` 設為 `allow read, write: if false`，只有 Admin SDK 能存取，所以**必須手動建立**：
Firebase Console → Firestore → 新增集合 `shift_setup`、文件 ID `token`，欄位如上。
token 請用密碼學隨機值（例如 32 字元以上），並在建立主管帳號後確認 `used` 已變為 `true`。

本機要產生 hash 可用：

```
node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" <你的token>
```
