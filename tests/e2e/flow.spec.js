import { test, expect } from "@playwright/test";

test("登入頁標題為『風自然班表』且密碼可切換顯示", async ({ page }) => {
  await page.goto("/login.html");
  await expect(page.locator(".app-title")).toHaveText("風自然班表");

  const pw = page.locator("#pw");
  await expect(pw).toHaveAttribute("type", "password");
  await page.locator("#pwSlot .pw-toggle").click();
  await expect(pw).toHaveAttribute("type", "text");
  await page.locator("#pwSlot .pw-toggle").click();
  await expect(pw).toHaveAttribute("type", "password");
});

test("首次設定頁可載入", async ({ page }) => {
  await page.goto("/setup.html");
  await expect(page.locator(".app-title")).toHaveText("風自然班表");
  await expect(page.locator("#setupForm")).toBeVisible();
});
