// Små hjelpere: tid, tall, kroner og trygg HTML-tekst.
export const H = 3600e3;
export const D = 24 * H;

export function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }
export function deepMerge(t, s) {
  Object.keys(s).forEach((k) => { if (isObj(s[k]) && isObj(t[k])) deepMerge(t[k], s[k]); else t[k] = clone(s[k]); });
  return t;
}
export function hms(h, m, s) { return h * 3600 + m * 60 + s; }
export function sum(a) { return a.reduce((x, y) => x + y, 0); }
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function ore(n) { return Math.round(n * 100) / 100; }
export function kr(n) {
  const r = ore(n);
  return r.toLocaleString("nb-NO", { minimumFractionDigits: r % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " kr";
}
export function pad(n) { return (n < 10 ? "0" : "") + n; }
export function toLocalInput(ts) {
  const d = new Date(ts);
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
export function listText(arr) { return arr.length <= 1 ? arr.join("") : arr.slice(0, -1).join(", ") + " og " + arr[arr.length - 1]; }

export function fmtTid(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return h ? h + ":" + pad(m) + ":" + pad(s) : m + ":" + pad(s);
}
export function fmtNum(v) { return Number(v).toLocaleString("nb-NO", { maximumFractionDigits: 2 }); }
export function when(ts) {
  return new Date(ts).toLocaleString("nb-NO", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
export function fmtDate(s) { return new Date(s + "T12:00:00").toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" }); }
export function shortDate(s) { return new Date(s + "T12:00:00").toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" }); }
export function rel(ts) {
  const diff = ts - Date.now(), a = Math.abs(diff);
  let txt;
  if (a < H) txt = Math.max(1, Math.round(a / 60e3)) + " min";
  else if (a < D) txt = Math.floor(a / H) + " t";
  else { const d = Math.floor(a / D), h = Math.floor(a % D / H); txt = d + " d" + (h ? " " + h + " t" : ""); }
  return diff >= 0 ? "om " + txt : "for " + txt + " siden";
}
