import { initFirebase } from "./src/firebase-init.js";
import { isValidPassword } from "./src/auth.js";
import { pwToggleHtml, wirePwToggles } from "./src/ui/pw-toggle.js";

window.__fb = initFirebase();

document.getElementById("pwSlot").innerHTML = pwToggleHtml("pw");
wirePwToggles();

document.getElementById("setupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("msg");
  msg.textContent = "";
  msg.className = "msg";
  const name = document.getElementById("name").value.trim();
  const prefix = document.getElementById("prefix").value.trim();
  const password = document.getElementById("pw").value;
  const token = document.getElementById("token").value.trim();

  if (!name || !prefix || !token) { msg.textContent = "請填寫所有欄位"; return; }
  if (!isValidPassword(password)) { msg.textContent = "密碼需 ≥8 碼且含英文與數字"; return; }

  try {
    const r = await fetch("/api/shift/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, prefix, password, token }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      msg.textContent = err.error || "設定失敗";
      return;
    }
    alert("主管帳號已建立，請登入");
    location.href = "login.html";
  } catch {
    msg.textContent = "網路錯誤，請稍後再試";
  }
});
