// Spillereglene: status, fasit, vinnere, oppgjør, poeng og avstemning ved protest.
import { D, ore } from "./util.js";
import { G, ids, myId } from "./store.js";

export const TYPE = { tall: "Tall", tid: "Tid", valg: "Alternativer", janei: "Ja/nei" };
export const STATUS = { apen: "Åpen", venter: "Venter på fasit", protestfrist: "Kan protesteres", avstemning: "Avstemning", avgjort: "Avgjort" };

export function isNum(b) { return b.type === "tall" || b.type === "tid"; }
export function options(b) { return b.type === "janei" ? ["Ja", "Nei"] : b.options; }
export function tippers(b) { const t = b.tips || {}; return ids().filter((id) => t[id]); }
export function participants(b) { const t = b.tips || {}; return ids().filter((id) => t[id] || id === b.host); }
export function pot(b) { return b.stakeMode === "kr" ? b.stake * tippers(b).length : 0; }

export function status(b) {
  const now = Date.now();
  if (now < b.deadline) return "apen";
  if (!b.result) return "venter";
  if (b.protest && !b.protest.closed) return "avstemning";
  if (!b.protest && now < b.result.at + D) return "protestfrist";
  return "avgjort";
}
export function fasit(b) {
  if (b.protest && b.protest.closed && b.protest.outcome === "ny") return b.protest.proposed;
  return b.result.value;
}
export function ranking(b, f) {
  const rows = tippers(b).map((id) => ({ id, value: b.tips[id].value, dist: Math.abs(b.tips[id].value - f) }));
  rows.sort((a, c) => a.dist - c.dist);
  let rank = 0;
  rows.forEach((r, i) => { if (i === 0 || r.dist !== rows[i - 1].dist) rank = i + 1; r.rank = rank; });
  return rows;
}
export function winnersOf(b, f) {
  if (isNum(b)) return ranking(b, f).filter((r) => r.rank === 1).map((r) => r.id);
  return tippers(b).filter((id) => b.tips[id].value === f);
}
// Alle satser det verten har bestemt. Hver taper betaler innsatsen sin, delt likt på vinnerne.
export function settle(b, f) {
  const winners = winnersOf(b, f);
  const losers = tippers(b).filter((id) => winners.indexOf(id) < 0);
  const res = { winners, losers, transfers: [], kind: "kr" };
  if (b.stakeMode !== "kr") { res.kind = "tekst"; return res; }
  if (!winners.length || !losers.length) { res.kind = "ingen"; return res; }
  losers.forEach((L) => winners.forEach((w) => res.transfers.push({ from: L, to: w, amount: b.stake / winners.length })));
  return res;
}
// Tabellpoeng: 3/2/1 for de tre nærmeste på tall og tid, 3 for treff på alternativer og ja/nei.
export function points(b) {
  const f = fasit(b), p = {};
  if (isNum(b)) ranking(b, f).forEach((r) => { const pts = { 1: 3, 2: 2, 3: 1 }[r.rank] || 0; if (pts) p[r.id] = pts; });
  else winnersOf(b, f).forEach((id) => { p[id] = 3; });
  return p;
}
// Flertall avgjør. Står det likt når alle har stemt, gjelder vertens fasit.
export function checkVote(b) {
  const p = b.protest, voters = participants(b), n = voters.length;
  const c = { vert: 0, ny: 0 };
  voters.forEach((id) => { if (p.votes[id]) c[p.votes[id]]++; });
  const maj = Math.floor(n / 2) + 1;
  if (c.ny >= maj) { p.closed = true; p.outcome = "ny"; }
  else if (c.vert >= maj) { p.closed = true; p.outcome = "vert"; }
  else if (c.ny + c.vert === n) { p.closed = true; p.outcome = c.ny > c.vert ? "ny" : "vert"; }
  if (p.closed) { p.final = c; p.closedAt = Date.now(); }
}
export function myTurn(b) {
  const st = status(b), me = myId();
  if (st === "apen") return !(b.tips || {})[me];
  if (st === "venter") return b.host === me;
  if (st === "avstemning") return participants(b).indexOf(me) >= 0 && !b.protest.votes[me];
  return false;
}

/* ---------- Oppgjør ---------- */
export function ledgerItems() {
  const items = [];
  G().bets.forEach((b) => {
    if (status(b) !== "avgjort" || b.stakeMode !== "kr") return;
    settle(b, fasit(b)).transfers.forEach((t) => items.push({ from: t.from, to: t.to, amount: t.amount, bet: b }));
  });
  return items;
}
export function netBetween(items, a, c) { // positivt = c skylder a
  let n = 0;
  const byBet = {};
  items.forEach((it) => {
    const v = it.to === a && it.from === c ? it.amount : it.to === c && it.from === a ? -it.amount : 0;
    if (!v) return;
    n += v; byBet[it.bet.id] = (byBet[it.bet.id] || 0) + v;
  });
  Object.keys(byBet).forEach((k) => { byBet[k] = ore(byBet[k]); });
  return { n: ore(n), byBet };
}
export function markKey(a, c) { return [a, c].sort().join("_"); }
export function remaining(items, a, c) {
  const n = netBetween(items, a, c).n, k = markKey(a, c), first = [a, c].sort()[0];
  const nFirst = first === a ? n : -n, rem = ore(nFirst - (G().marks[k] || 0));
  return first === a ? rem : -rem;
}
