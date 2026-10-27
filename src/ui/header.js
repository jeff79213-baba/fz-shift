function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// 每頁最上方固定顯示「風自然班表」＋導覽＋登出。
export function renderHeader(el, { user, onLogout, nav = [] }) {
  const links = nav.map((n) =>
    `<a href="${esc(n.href)}" class="${n.active ? "active" : ""}">${esc(n.label)}</a>`).join("");
  el.innerHTML = `<header class="app-header">
    <h1 class="app-title">風自然班表</h1>
    <nav class="app-nav">${links}</nav>
    <div class="app-user">${user ? esc(user.name) : ""} <button id="logoutBtn" type="button">登出</button></div>
  </header>`;
  if (onLogout) {
    const btn = el.querySelector("#logoutBtn");
    if (btn) btn.addEventListener("click", onLogout);
  }
}
