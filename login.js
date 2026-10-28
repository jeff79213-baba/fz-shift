import { initFirebase } from "./src/firebase-init.js";
import { loginWithEmail, resolveLoginEmail, logout, loadProfile, changeMyPassword, isValidPassword } from "./src/auth.js";
import { pwToggleHtml, wirePwToggles } from "./src/ui/pw-toggle.js";

window.__fb = initFirebase();

document.getElementById("pwSlot").innerHTML = pwToggleHtml("pw");
document.getElementById("newPwSlot").innerHTML = pwToggleHtml("newPw");
wirePwToggles();

let pendingProfile = null;

function redirectTo(profile) {
  location.href = profile.shiftRole === "manager" ? "admin.html" : "index.html";
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("msg");
  msg.textContent = "";
  msg.className = "msg";
  const entered = document.getElementById("prefix").value.trim();
  const pw = document.getElementById("pw").value;
  try {
    const email = await resolveLoginEmail(entered);
    if (!email) { msg.textContent = "請輸入姓名或帳號"; return; }
    const cred = await loginWithEmail(email, pw);
    const profile = await loadProfile(cred.user.uid);
    if (!profile || profile.active === false) {
      await logout();
      msg.textContent = "帳號未啟用或不存在";
      return;
    }
    if (profile.mustChangePassword) {
      pendingProfile = { ...profile, oldPw: pw };
      document.getElementById("firstLogin").hidden = false;
      document.querySelector("#loginForm button[type=submit]").disabled = true;
      return;
    }
    redirectTo(profile);
  } catch (err) {
    msg.textContent = "登入失敗，請確認帳號密碼";
  }
});

document.getElementById("changePwBtn").addEventListener("click", async () => {
  const msg2 = document.getElementById("msg2");
  msg2.textContent = "";
  msg2.className = "msg";
  const np = document.getElementById("newPw").value;
  const np2 = document.getElementById("newPw2").value;
  if (!isValidPassword(np)) { msg2.textContent = "密碼需 ≥8 碼且含英文與數字"; return; }
  if (np !== np2) { msg2.textContent = "兩次輸入的密碼不一致"; return; }
  try {
    await changeMyPassword(pendingProfile.oldPw, np);
    await window.__fb.db.collection("shift_users").doc(pendingProfile.uid).set({ mustChangePassword: false }, { merge: true });
    redirectTo(pendingProfile);
  } catch (err) {
    msg2.textContent = err.message || "變更密碼失敗";
  }
});
