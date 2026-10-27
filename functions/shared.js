const SUFFIX = "@shift.local";

function normalizePrefix(p) {
  return String(p || "").trim().toLowerCase();
}

function isShiftEmail(e) {
  return typeof e === "string" && e.endsWith(SUFFIX);
}

function toEmail(prefix) {
  return normalizePrefix(prefix) + SUFFIX;
}

function isValidPassword(pw) {
  return (
    typeof pw === "string" &&
    pw.length >= 8 &&
    /[a-zA-Z]/.test(pw) &&
    /[0-9]/.test(pw)
  );
}

module.exports = { SUFFIX, normalizePrefix, isShiftEmail, toEmail, isValidPassword };
