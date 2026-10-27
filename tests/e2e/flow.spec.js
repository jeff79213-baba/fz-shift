import { test, expect } from '@playwright/test';

test('主管建立員工 -> 員工登入排休送出 -> 主管編排 -> 紅色警示', async ({ browser }) => {
  // 主管端
  const mgr = await browser.newContext();
  const p1 = await mgr.newPage();
  await p1.goto('/login.html');
  await p1.fill('#prefix', 'manager');
  await p1.fill('#pw', 'manager1234');
  await p1.click('button[type=submit]');
  await p1.goto('/admin.html');

  // 建立員工
  await p1.fill('#empName', '王小明');
  await p1.fill('#empPrefix', 'emp01');
  await p1.fill('#empPw', 'abcd1234');
  await p1.click('#addEmp');
  await expect(p1.locator('#empList')).toContainText('王小明');

  // 員工端
  const st = await browser.newContext();
  const p2 = await st.newPage();
  await p2.goto('/login.html');
  await p2.fill('#prefix', 'emp01');
  await p2.fill('#pw', 'abcd1234');
  await p2.click('button[type=submit]');
  await expect(p2).toHaveURL(/index\.html/);

  // 員工排休
  await p2.click('.cal-cell[data-date$="-05"]'); // 選擇一個日期
  await p2.click('#saveDraft');
  await expect(p2.locator('#warnings')).toContainText('草稿');

  // 員工送出
  await p2.click('#submit');
  await expect(p2.locator('#warnings')).toContainText('已送出');

  // 主管開啟當月
  await p1.goto('/admin.html');
  await p1.click('.tab-btn', { hasText: '月份管理' });
  await p1.selectOption('select', 'open');
  await p1.click('button', { hasText: '新增月份' }); // 简化处理

  // 主管編排班表
  await p1.goto('/schedule.html');
  await p1.selectOption('select[data-date$="-05"]', 'REST');

  // 驗證警示
  await expect(p1.locator('#conflicts')).toContainText(/無代理人衝突|同休/);
});
