# 部署設定

## 1. Firebase 專案設定

### 專案 ID
`opencode-sk` (已存在)

### Hosting 網站
`fzshift-sk` (專案內獨立網站)

### Cloud Functions 代碼庫
`shift` (專案內獨立函式代碼庫)

### Firestore 規則
`firestore.rules` (存在但需更新)

## 2. GitHub Actions

```yaml
name: 部署到 Firebase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: 設定 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - name: 安裝依賴
        run: npm ci
      - name: 執行 check-rules-drift
        run: node tools/check-rules-drift.js --strict
      - name: Firebase 部署
        run: npm run deploy:safe
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

## 3. GitHub 頁面配置

```json
{
  "repository": "jeff79213-baba/fz-shift",
  "branch": "main",
  "site_url": "https://jeff79213-baba.github.io/fz-shift",
  "routes": {
    "/api/*": "https://jeff79213-baba-fz-shift.cloudfunctions.net/shiftApi"
  }
}
```

## 4. 本地開發環境

```bash
# 1. 安裝依賴
npm install

# 2. 啟動 Firebase 仿真
firebase emulators:start --only auth,firestore,functions,hosting

# 3. 在另一個終端啟動前端
npm start

# 4. 執行 E2E 測試
npx playwright test

# 5. 執行單元測試
npx vitest run
```

## 5. 部署流程

### 5.1. 安全性檢查

```bash
# 1. 檢查 Firestore 規則漂移
node tools/check-rules-drift.js

# 2. 檢查 `shift_*` 集合命名
node scripts/validate-collection-names.js

# 3. 驗證 Firebase 配置文件
cat firebase.json | jq .hosting.site
```

### 5.2. 執行的部署

```bash
npm run deploy:safe
```

### 5.3. 驗證

```bash
# 檢查網站是否正常運行
curl https://fzshift-sk.web.app

# 測試 API 端點
curl -X POST https://your-domain.cloudfunctions.net/shiftApi/api/shift/employees -H "Content-Type: application/json" -d '{"name":"test","prefix":"test","password":"Test1234"}'
```

## 6. 環境變數

```bash
# .env 檔案
FIREBASE_PROJECT_ID=opencode-sk
FIREBASE_STORAGE_BUCKET=opencode-sk.appspot.com
GITHUB_REPO=jeff79213-baba/fz-shift
```

## 7. CI/CD 管道

```yaml
# .github/workflows/deploy.yml
name: 自動化部署
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: 設定 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - name: 安裝依賴
        run: npm ci
      - name: 執行單元測試
        run: npx vitest run
      - name: 執行 E2E 測試 (若有 git diff)
        run: npx playwright test
        if: github.event_name == 'push'

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: 設定 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - name: 安裝依賴
        run: npm ci
      - name: 驗證環境
        run: node tools/check-rules-drift.js --strict
      - name: Firebase 部署
        run: npm run deploy:safe
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

## 8. 本地測試腳本

```bash
#!/bin/bash
# scripts/test-all.sh

echo "🔍 執行安全性檢查..."
node tools/check-rules-drift.js --strict || exit 1

echo "🧪 執行單元測試..."
npx vitest run || exit 1

echo "🌐 啟動 Firebase 仿真（5 秒後會話...）"
# 啟動仿真在 background
firebase emulators:start --only auth,firestore,functions,hosting > /tmp/firebase.log 2>&1 &
EMULATOR_PID=$!

sleep 5

echo "🧪 執行 E2E 測試..."
npx playwright test || {
  kill $EMULATOR_PID
  exit 1
}

kill $EMULATOR_PID
echo "✅ 所有測試通過！"
```

## 9. 監控與日誌

### 9.1. Firebase 日誌
- 使用 Firebase 日誌跟踪函式調用、請求等
- 設定日誌保留時間：30 天

### 9.2. 本地日誌
- 複寫到 `logs/` 目錄
- 支援日誌輪轉
- 包含請求者 IP、請求路徑、回應狀態碼

### 9.3. 運作警報
- 使用 GitHub Actions 工作流程監視部署失敗
- 設定 Slack/Teams 通知
- 監控函式執行時間

## 10. 數據保護

### 10.1. 存取限制
- 員工資料：只存取必要欄位
- 班表資料：只存取當前月份
- 備份與歷史紀錄：每 90 天自動清理

### 10.2. 存取權限
- 員工只能存取自己的資料
- 主管可以存取所有員工資料
- 系統管理員擁有完整權限

### 10.3. 傳輸安全
- 使用 HTTPS
- 設定 CORS 策略
- 實作 JWT 驗證

## 11. 維護

### 11.1. 備份
- 每週自動備份 Firestore 資料
- 每個月手動備份 Firebase 設定檔
- 儲存 Git 歷史

### 11.2. 恢復
- 建立災難恢復程序
- 支援時間點恢復
- 測試定期恢復

### 11.3. 安全審查
- 每個月審查一次安全性
- 檢查未使用的依賴
- 驗證 IAM 權限

## 12. 性能最佳化

### 12.1. 快取緩存
- 使用 CloudFlare 快取
- 設定靜態資源快取
- 實現 API 快取

### 12.2. 資料庫索引
- 優化 Firestore 索引
- 使用複合查詢
- 設定資料分片

### 12.3. 冷啟動優化
- 使用冷啟動記憶體
- 預載常見查詢
- 實作漸進載入
