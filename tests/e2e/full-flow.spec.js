import { test, expect } from "@playwright/test";

// 完整跨角色流程。前置條件（目前尚未滿足，故預設 skip）：
//   1. firestore.rules 已合併（含 shift_* 段落），見 tools/README-rules.md
//   2. 以 Admin SDK 於模擬器建立 manager@shift.local 並設 shiftRole=manager
//   3. 啟動全部模擬器：auth, firestore, functions, hosting
// 要執行時：把 test.skip 改成 test，並依上述條件準備環境。
test.skip("主管建帳號 → 員工排休送出 → 主管編排 → 警示", async ({ browser }) => {
  const admin = await browser.newContext();
  const a = await admin.newPage();
  await a.goto("/login.html");
  await a.fill("#prefix", "manager");
  await a.fill("#pw", "manager1234");
  await a.click("#loginForm button[type=submit]");
  await expect(a).toHaveURL(/admin\.html/);

  await a.fill("#newName", "王小明");
  await a.fill("#newPrefix", "emp01");
  await a.fill("#newPw", "abcd1234");
  await a.click("#addEmp");
  await expect(a.locator("#content table")).toContainText("王小明");

  const staff = await browser.newContext();
  const s = await staff.newPage();
  await s.goto("/login.html");
  await s.fill("#prefix", "emp01");
  await s.fill("#pw", "abcd1234");
  await s.click("#loginForm button[type=submit]");
  await expect(s).toHaveURL(/index\.html/);

  await s.locator('.cal-cell[data-date$="-05"]').click();
  await s.click("#submit");
  await expect(s.locator("#warnings")).toContainText("已送出");

  await a.goto("/schedule.html");
  await a.locator('select[data-date$="-05"]').selectOption("REST");
  await expect(a.locator("#conflicts")).toContainText(/無代理人衝突|同休/);
});
