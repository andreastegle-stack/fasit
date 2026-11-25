// Lagring: alt ligger bare på denne telefonen (localStorage). Ingen server ennå.
// Eksempelgruppa «Gjengen» har oppdiktede navn og bets. Egne grupper kan lages i gruppemenyen.
import { D, H, hms, deepMerge } from "./util.js";

const LS_DATA = "fasit-data-v1";
const LS_GROUP = "fasit-gruppe";
const LS_ME = "fasit-hvem";
const LS_PREFS = "fasit-visning";
export const EXAMPLE_ID = "gjengen";

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function lsJson(k) { try { return JSON.parse(lsGet(k)); } catch (e) { return null; } }

/* ---------- Eksempelgruppa (oppdiktet) ---------- */
export function seedExample() {
  const now = Date.now();
  const mem = [
    { id: "kari", name: "Kari" }, { id: "ola", name: "Ola" }, { id: "nora", name: "Nora" },
    { id: "emil", name: "Emil" }, { id: "sofie", name: "Sofie" }
  ];
  const people = mem.map((m) => m.name);
  return {
    id: EXAMPLE_ID, name: "Gjengen", example: true, members: mem, marks: {},
    bets: [
      { id: "b7", question: "Blir det hvit jul i Oslo i år?", type: "janei", host: "nora", deadline: now + 20 * D, stakeMode: "kr", stake: 50, result: null, protest: null,
        tips: { nora: { value: "Ja" }, ola: { value: "Nei" }, sofie: { value: "Ja" }, emil: { value: "Nei" } } },
      { id: "b2", question: "Slår Ola Nora på 10 km-løpet lørdag?", type: "janei", host: "kari", deadline: now - 2 * H, stakeMode: "kr", stake: 50, result: null, protest: null,
        tips: { ola: { value: "Ja" }, nora: { value: "Nei" }, emil: { value: "Nei" }, sofie: { value: "Nei" }, kari: { value: "Nei" } } },
      { id: "b3", question: "Hvem kommer sist frem til hytteturen?", type: "valg", options: people, host: "sofie", deadline: now + 2 * D + 5 * H,
        stakeMode: "tekst", stakeText: "Taperne tar oppvasken", result: null, protest: null,
        criteria: "Det som teller, er når bilen eller bussen er fremme ved hytta. Sofie noterer klokkeslettene.",
        tips: { ola: { value: "Ola" }, emil: { value: "Nora" }, sofie: { value: "Emil" } } },
      { id: "b4", question: "Hva koster en Nvidia-aksje 25. november 2027?", type: "tall", unit: "USD", host: "kari", deadline: now + 6 * D, stakeMode: "kr", stake: 100,
        note: "Sluttkurs på Nasdaq den dagen gjelder.", result: null, protest: null, tips: { kari: { value: 210 }, ola: { value: 260 } } },
      { id: "b5", question: "Kommer Emil for sent til fredagspilsen?", type: "janei", host: "ola", deadline: now - 2 * D, stakeMode: "tekst", stakeText: "Taperne spanderer første runde",
        result: { value: "Ja", by: "ola", at: now - 5 * H }, protest: null,
        tips: { ola: { value: "Ja" }, nora: { value: "Ja" }, kari: { value: "Nei" }, emil: { value: "Nei" }, sofie: { value: "Ja" } } },
      { id: "b1", question: "Hvilken tid løper Emil halvmaraton på?", type: "tid", host: "emil", deadline: now - 10 * D, stakeMode: "kr", stake: 50,
        result: { value: hms(1, 47, 12), by: "emil", at: now - 9 * D }, protest: null,
        tips: { kari: { value: hms(1, 45, 0) }, ola: { value: hms(1, 52, 0) }, nora: { value: hms(1, 48, 30) }, emil: { value: hms(1, 44, 0) }, sofie: { value: hms(1, 50, 0) } } },
      { id: "b6", question: "Hvem vinner fantasy-ligaen i oktober?", type: "valg", options: people, host: "ola", deadline: now - 40 * D, stakeMode: "kr", stake: 50,
        result: { value: "Sofie", by: "ola", at: now - 25 * D }, protest: null,
        tips: { kari: { value: "Kari" }, ola: { value: "Ola" }, nora: { value: "Sofie" }, emil: { value: "Ola" }, sofie: { value: "Sofie" } } }
    ]
  };
}

/* ---------- Tilstand ---------- */
function loadData() {
  const d = lsJson(LS_DATA);
  const data = d && d.version === 1 && Array.isArray(d.groups) ? d : { version: 1, groups: [] };
  if (!data.groups.some((g) => g.id === EXAMPLE_ID)) data.groups.push(seedExample());
  return data;
}

export const S = {
  data: loadData(),
  groupId: lsGet(LS_GROUP) || EXAMPLE_ID,
  meMap: lsJson(LS_ME) || {},
  prefs: { skin: (lsJson(LS_PREFS) || {}).skin === "barbie" ? "barbie" : "futur" },
  saveFailed: false
};
if (!S.data.groups.some((g) => g.id === S.groupId)) S.groupId = EXAMPLE_ID;

export function save() { S.saveFailed = !lsSet(LS_DATA, JSON.stringify(S.data)); }

/* ---------- Gruppe og medlemmer ---------- */
export function groups() {
  // Egne grupper først (nyeste øverst), eksempelgruppa til slutt.
  return S.data.groups.slice().sort((a, b) => (a.example ? 1 : 0) - (b.example ? 1 : 0) || (b.created || 0) - (a.created || 0));
}
export function G() { return S.data.groups.find((g) => g.id === S.groupId) || S.data.groups[0]; }
export function withGroup(id, fn) { const old = S.groupId; S.groupId = id; try { return fn(); } finally { S.groupId = old; } }
export function ids() { return G().members.map((m) => m.id); }
export function nm(id) { const m = G().members.find((x) => x.id === id); return m ? m.name : id; }
export function myId() { const m = S.meMap[S.groupId], all = ids(); return all.indexOf(m) >= 0 ? m : all[0]; }
export function names(list) {
  const n = list.map(nm);
  if (n.length <= 1) return n.join("");
  return n.slice(0, -1).join(", ") + " og " + n[n.length - 1];
}
export function getBet(id) { return G().bets.find((b) => b.id === id) || null; }

export function setGroup(id) { S.groupId = id; lsSet(LS_GROUP, id); }
export function setMe(id) { S.meMap[S.groupId] = id; lsSet(LS_ME, JSON.stringify(S.meMap)); }
export function setSkin(skin) { S.prefs.skin = skin; lsSet(LS_PREFS, JSON.stringify(S.prefs)); }

/* ---------- Endringer ---------- */
export function patchBet(b, obj) { deepMerge(b, obj); save(); }
export function createBet(nb) { G().bets.push(nb); save(); }
export function patchGroup(obj) { deepMerge(G(), obj); save(); }
export function resetExample() {
  const i = S.data.groups.findIndex((g) => g.id === EXAMPLE_ID);
  S.data.groups[i] = seedExample(); save();
}
function slug(name, taken) {
  let base = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "p";
  let id = base, n = 2;
  while (taken.indexOf(id) >= 0) id = base + "-" + n++;
  taken.push(id);
  return id;
}
export function createGroup(name, memberNames) {
  const taken = [];
  const g = { id: "g" + Date.now().toString(36), name, example: false, created: Date.now(), marks: {}, bets: [],
    members: memberNames.map((n) => ({ id: slug(n, taken), name: n })) };
  S.data.groups.push(g); save();
  return g;
}
export function deleteGroup(id) {
  S.data.groups = S.data.groups.filter((g) => g.id !== id || g.example);
  save();
  if (S.groupId === id) setGroup(EXAMPLE_ID);
}
