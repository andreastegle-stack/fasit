// Alt som bygger HTML: topplinje, lister, ark, oppgjør og tabell.
import { D, esc, kr, ore, sum, toLocalInput, listText, fmtTid, fmtNum, when, fmtDate, shortDate, rel } from "./util.js";
import { S, G, ids, nm, myId, names, getBet, groups, withGroup } from "./store.js";
import {
  TYPE, STATUS, isNum, options, tippers, participants, pot, status, fasit, ranking, winnersOf, settle, points, myTurn,
  ledgerItems, netBetween, remaining
} from "./rules.js";

// Tilstand for visningen (ikke lagret).
export const nav = { view: "bets", sheet: null, sheetId: null, page: null, pageId: null };
export const ui = { editTip: false, inviteOpen: false, protestOpen: false, expanded: null, statusTab: null, groupMenu: false, anim: null };

/* ---------- Formatering som trenger betten ---------- */
function fmtVal(b, v) {
  if (b.type === "tid") return fmtTid(v);
  if (b.type === "tall") return fmtNum(v) + (b.unit ? " " + b.unit : "");
  return v;
}
function fmtDist(b, d) {
  if (d === 0) return "traff eksakt";
  if (b.type === "tid") {
    const h = Math.floor(d / 3600), m = Math.floor(d % 3600 / 60), s = d % 60, out = [];
    if (h) out.push(h + " t"); if (m) out.push(m + " min"); if (s) out.push(s + " s");
    return out.join(" ") + " unna";
  }
  return fmtNum(d) + (b.unit ? " " + b.unit : "") + " unna";
}
function ruleText(b) {
  if (b.stakeMode === "kr" && isNum(b)) return "Alle satser " + kr(b.stake) + ". Nærmest fasit tar potten. Deler flere plassen, deles potten likt.";
  if (b.stakeMode === "kr") return "Alle satser " + kr(b.stake) + ". De som treffer, deler potten likt.";
  if (isNum(b)) return "Nærmest fasit vinner. Innsats: " + esc(b.stakeText) + ".";
  return "Alle som treffer, vinner. Innsats: " + esc(b.stakeText) + ".";
}

/* ---------- Ikoner til fanelinja ---------- */
const ICON = {
  bets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>',
  oppgjor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h13l-4-4M17 17H4l4 4"/></svg>',
  tabell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 6h3v1a3 3 0 0 1-3 3M7 6H4v1a3 3 0 0 0 3 3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
};

/* ---------- Topplinje: gruppevelger og fargevalg ---------- */
function groupInfo(id) {
  return withGroup(id, () => {
    const g = G();
    return { name: g.name + (g.example ? " (eksempel)" : ""), n: g.members.length, turn: g.bets.filter(myTurn).length };
  });
}
export function headerBar() {
  const cur = groupInfo(S.groupId);
  let html = '<div class="gbar"><button class="gpick" data-act="gmenu" aria-expanded="' + ui.groupMenu + '" aria-haspopup="true">' +
    '<span class="eyebrow">Gruppe' + (cur.n ? " · " + cur.n + " medlemmer" : "") + '</span><span class="gname">' + esc(cur.name) +
    '&nbsp;<span class="garrow" aria-hidden="true">' + (ui.groupMenu ? "▴" : "▾") + "</span></span></button>" +
    '<div class="seg2" role="group" aria-label="Farger">' +
    [["futur", "Ken"], ["barbie", "Barbie"]].map((o) => '<button data-act="skin" data-v="' + o[0] + '" aria-pressed="' + (S.prefs.skin === o[0]) + '">' + o[1] + "</button>").join("") + "</div>";
  if (ui.groupMenu) {
    html += '<div class="gmenu" role="menu">' + groups().map((g) => {
      const i = groupInfo(g.id);
      return '<button class="gitem" role="menuitem" data-act="group" data-id="' + esc(g.id) + '" aria-current="' + (g.id === S.groupId) + '"><span><b>' + esc(i.name) +
        '</b><span class="calc">' + (i.n ? " · " + i.n + " medlemmer" : "") + "</span></span>" +
        (i.turn ? '<span class="pill pill-turn">Din tur ' + i.turn + "</span>" : "") + "</button>";
    }).join("") + '<button class="gitem add" role="menuitem" data-act="new-group">+ Ny gruppe</button></div>';
  }
  return html + "</div>";
}
export function whoBar() {
  const g = G(), me = myId();
  if (!g.members.length) return "";
  const chips = g.members.map((m) => '<button class="who" data-act="me" data-id="' + esc(m.id) + '" aria-pressed="' + (m.id === me) + '">' + esc(m.name) + "</button>").join("");
  if (g.example) {
    return '<div class="proto"><div class="row"><span><b>Eksempel</b> med oppdiktede bets. Endringer lagres bare på denne telefonen.</span>' +
      '<button class="btn-link" data-act="reset">Nullstill</button></div><div class="proto-row"><span>Se appen som:</span>' + chips + "</div></div>";
  }
  return '<div class="proto"><div class="proto-row"><b>Hvem tipper nå?</b>' + chips + "</div>" +
    '<div class="row"><span>Velg deg selv før du tipper. Alle ser hvem som har valgt hva.</span><button class="btn-link" data-act="delete-group">Slett gruppa</button></div></div>';
}
export function tabBar() {
  const v = nav.view, turn = G().bets.some(myTurn);
  function t(id, label, dot) {
    return '<button class="tab" data-act="nav" data-view="' + id + '"' + (v === id ? ' aria-current="page"' : "") + ">" + ICON[id] +
      "<span>" + label + "</span>" + (dot ? '<span class="dot" aria-label="Din tur"></span>' : "") + "</button>";
  }
  return '<nav class="tabs" aria-label="Hovedmeny"><div class="tabs-in">' + t("bets", "Bets", turn) + t("oppgjor", "Oppgjør") + t("tabell", "Tabell") +
    '<button class="btn btn-primary tab-new" data-act="new-bet">' + ICON.plus + "Ny bet</button></div></nav>";
}

/* ---------- Bets-lista ---------- */
// Det som betyr mest i betten sin nåværende fase, vist som tekst i listeraden.
function factData(b, st) {
  const n = tippers(b).length;
  const potOrStake = b.stakeMode === "kr" ? ["Pott", kr(pot(b))] : ["Innsats", esc(b.stakeText)];
  if (st === "apen") return [["Frist", rel(b.deadline).replace(/^om /, "")], ["Tippet", n + " av " + G().members.length], potOrStake];
  if (st === "venter") return [["Fristen gikk", rel(b.deadline)], ["Fasit fra", esc(nm(b.host))], b.resolveDate ? ["Avgjøres", shortDate(b.resolveDate)] : potOrStake];
  if (st === "protestfrist") return [["Fasit", esc(fmtVal(b, b.result.value))], ["Protestfrist", rel(b.result.at + D).replace(/^om /, "")], potOrStake];
  if (st === "avstemning") return [["Protest fra", esc(nm(b.protest.by))], ["Stemmer", Object.keys(b.protest.votes).length + " av " + participants(b).length], ["Fasit nå", esc(fmtVal(b, b.result.value))]];
  const f = fasit(b), w = winnersOf(b, f);
  return [["Fasit", esc(fmtVal(b, f))], [isNum(b) ? "Vinner" : "Traff", w.length ? esc(names(w)) : "Ingen"], potOrStake];
}
function chips(b, withDeadline) {
  const c = [["type", TYPE[b.type]]];
  if (withDeadline || b.stakeMode === "kr") c.push(["stake", "<small>Innsats</small>" + (b.stakeMode === "kr" ? kr(b.stake) : esc(b.stakeText))]);
  c.push(["host", "<small>Vert</small>" + esc(nm(b.host))]);
  if (withDeadline) c.push(["date", "<small>Frist</small>" + when(b.deadline)]);
  if (b.resolveDate) c.push(["date", "<small>Avgjøres</small>" + shortDate(b.resolveDate)]);
  return '<span class="chips">' + c.map((x) => '<span class="chip-i chip-' + x[0] + '">' + x[1] + "</span>").join("") + "</span>";
}
// «Tipp» åpner en utvidelse rett under raden, så du kan svare uten å forlate lista.
function actionBtn(b) {
  const mine = (b.tips || {})[myId()], exp = ui.expanded === b.id, id = esc(b.id);
  if (status(b) !== "apen") return "";
  return mine
    ? '<button class="tipbtn" data-act="expand" data-id="' + id + '" aria-expanded="' + exp + '"><small>Ditt tips</small><b>' + esc(fmtVal(b, mine.value)) + '</b><span aria-hidden="true">' + (exp ? "▴" : "▾") + "</span></button>"
    : '<button class="btn btn-primary btn-small" data-act="expand" data-id="' + id + '" aria-expanded="' + exp + '">' + (exp ? "Lukk" : "Tipp ▾") + "</button>";
}
function lrow(b) {
  const st = status(b), mine = (b.tips || {})[myId()], exp = st === "apen" && ui.expanded === b.id;
  let meta = factData(b, st).map((x) => x[0] + " " + x[1]).join(" · ");
  if (st === "protestfrist" || st === "avstemning") meta = STATUS[st] + " · " + meta;
  return '<article class="lrow' + (myTurn(b) ? " turn" : "") + '"><button class="lrow-main" data-act="open" data-id="' + esc(b.id) + '">' +
    '<span class="lrow-q">' + esc(b.question) + '</span><span class="lrow-meta">' + meta + "</span></button>" + actionBtn(b) +
    (exp ? quickPanel(b, mine) : "") + "</article>";
}
function quickPanel(b, mine) {
  const cur = mine ? mine.value : null;
  let html = '<div class="quick' + (ui.anim === "quick" ? " enter" : "") + '">';
  if (b.criteria) html += '<p class="note rules">' + esc(b.criteria) + "</p>";
  if (isNum(b)) {
    html += '<form class="stack" data-form="tip" data-id="' + esc(b.id) + '" novalidate>' + valueInput(b, "tip", cur, "Ditt tips") +
      '<p class="err" role="alert"></p><div class="btns"><button class="btn btn-primary btn-small" type="submit">Lagre tips</button></div></form>';
  } else {
    const opts = options(b);
    html += '<div class="qopts' + (opts.length === 2 ? " two" : "") + '">' + opts.map((o) =>
      '<button class="qopt" data-act="quick-tip" data-id="' + esc(b.id) + '" data-v="' + esc(o) + '" aria-pressed="' + (cur === o) + '">' + esc(o) + "</button>").join("") + "</div>";
  }
  return html + '<p class="note">Tipser som <b>' + esc(nm(myId())) + "</b>. " + ruleText(b) + "</p></div>";
}

export function valueInput(b, p, cur, label) {
  if (b.type === "tall") {
    return '<div class="field"><label class="lbl" for="' + p + '-num">' + label + (b.unit ? " (" + esc(b.unit) + ")" : "") + "</label>" +
      '<input id="' + p + '-num" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" value="' + (cur != null ? esc(String(cur).replace(".", ",")) : "") + '"></div>';
  }
  if (b.type === "tid") {
    const parts = cur != null ? [Math.floor(cur / 3600), Math.floor(cur % 3600 / 60), cur % 60] : ["", "", ""];
    return '<div class="field"><span class="lbl">' + label + '</span><div class="tid">' +
      ["h", "m", "s"].map((k, i) => "<label>" + ["Timer", "Minutter", "Sekunder"][i] + '<input id="' + p + "-" + k + '" type="number" min="0"' +
        (k !== "h" ? ' max="59"' : "") + ' inputmode="numeric" value="' + parts[i] + '"></label>').join("") + "</div></div>";
  }
  return '<fieldset class="field"><legend class="lbl">' + label + '</legend><div class="seg" style="margin-top:6px">' +
    options(b).map((o, i) => '<label class="opt"><input type="radio" id="' + p + "-opt-" + i + '" name="' + p + '-opt" value="' + esc(o) + '"' +
      (cur === o ? " checked" : "") + "> <span>" + esc(o) + "</span></label>").join("") + "</div></fieldset>";
}
export function readValue(b, p) {
  const q = (id) => document.getElementById(id);
  if (b.type === "tall") {
    const raw = q(p + "-num").value.trim().replace(/\s/g, "").replace(",", ".");
    if (raw === "" || isNaN(Number(raw))) return { ok: false, err: "Skriv inn et tall." };
    return { ok: true, value: Number(raw) };
  }
  if (b.type === "tid") {
    const h = Number(q(p + "-h").value || 0), m = Number(q(p + "-m").value || 0), s = Number(q(p + "-s").value || 0);
    if ([h, m, s].some((x) => x < 0 || x % 1 !== 0) || m > 59 || s > 59) return { ok: false, err: "Bruk hele tall. Minutter og sekunder må være mellom 0 og 59." };
    const v = h * 3600 + m * 60 + s;
    if (!v) return { ok: false, err: "Skriv inn en tid." };
    return { ok: true, value: v };
  }
  const c = document.querySelector('input[name="' + p + '-opt"]:checked');
  if (!c) return { ok: false, err: "Velg et alternativ." };
  return { ok: true, value: c.value };
}

export function viewList() {
  const g = G();
  // Korte fanenavn så alle fire får plass: Venter = venter på fasit, Protest = kan protesteres eller avstemning.
  const groupsDef = [["apen", "Åpne"], ["venter", "Venter"], ["til", "Protest"], ["avgjort", "Avgjort"]];
  let html = '<div class="row"><p class="note">' + esc(names(ids())) + "</p>" +
    (g.example ? '<button class="btn btn-ghost btn-small" data-act="invite" aria-expanded="' + ui.inviteOpen + '">Inviter</button>' : "") + "</div>";
  if (g.example && ui.inviteOpen) {
    html += '<div class="card"><h3>Inviter med lenke</h3><p class="note">Del lenken i gruppechatten. Den som åpner den, blir med i gruppa. (Eksempellenke. Deling kommer når appen får en server.)</p>' +
      '<div class="invite"><input id="invite-link" type="text" readonly value="…/bli-med/gjengen-k7f2"><button class="btn btn-ghost btn-small" data-act="copy">Kopier</button></div></div>';
  }
  if (!g.bets.length) return html + '<div class="card"><p>Ingen bets ennå.</p><p class="note">Trykk «Ny bet» nederst for å lage den første.</p></div>';
  const byTab = {};
  groupsDef.forEach((gr) => {
    byTab[gr[0]] = g.bets.filter((b) => { const st = status(b); return gr[0] === "til" ? (st === "protestfrist" || st === "avstemning") : st === gr[0]; })
      .sort((a, c) => (gr[0] === "avgjort" ? c.result.at - a.result.at : a.deadline - c.deadline));
  });
  const tab = ui.statusTab && byTab[ui.statusTab] ? ui.statusTab : (groupsDef.find((gr) => byTab[gr[0]].length) || groupsDef[0])[0];
  html += '<div class="stabs" role="tablist" aria-label="Status">' + groupsDef.map((gr) => {
    const list = byTab[gr[0]], turn = list.some(myTurn);
    return '<button class="stab" role="tab" data-act="stab" data-v="' + gr[0] + '" aria-selected="' + (tab === gr[0]) + '">' +
      (turn ? '<span class="dot" aria-label="Din tur"></span>' : "") + gr[1] + '<span class="n">' + list.length + "</span></button>";
  }).join("") + "</div>";
  const bets = byTab[tab];
  if (!bets.length) return html + '<div class="card"><p class="note">Ingen bets her nå.</p></div>';
  return html + '<div class="rows">' + bets.map(lrow).join("") + "</div>";
}

/* ---------- Detaljark for én bet ---------- */
function distBoard(b, f) {
  const n = tippers(b).length;
  const rows = options(b).map((o) => ({ o, who: tippers(b).filter((id) => b.tips[id].value === o) }));
  const used = rows.filter((r) => r.who.length || (f != null && r.o === f));
  const empty = rows.filter((r) => used.indexOf(r) < 0).map((r) => r.o);
  return '<div class="dist">' + used.map((r) => {
    const hit = f != null && r.o === f;
    return '<div class="dist-row' + (hit ? " hit" : "") + '"><span><b>' + esc(r.o) + (hit ? " ✓" : "") + '</b> <span class="calc">' + (r.who.length ? esc(names(r.who)) : "ingen") + "</span></span>" +
      '<span class="count">' + r.who.length + '</span><span class="bar"><i style="width:' + (n ? Math.round(r.who.length / n * 100) : 0) + '%"></i></span></div>';
  }).join("") + "</div>" + (empty.length && n ? '<p class="note">Ingen har valgt ' + esc(listText(empty)) + ".</p>" : "");
}
function revealBoard(b, st) {
  const hasF = st !== "venter", f = hasF ? fasit(b) : null;
  let html = '<section class="card"><h3>Tipsene</h3>';
  if (isNum(b)) {
    const rows = hasF ? ranking(b, f) : tippers(b).map((id) => ({ id, value: b.tips[id].value })).sort((a, c) => a.value - c.value);
    html += '<div class="tablewrap"><table><thead><tr><th>Navn</th><th class="r">Tips</th>' + (hasF ? '<th class="r">Avstand</th>' : "") + "</tr></thead><tbody>" +
      rows.map((r) => '<tr class="' + (hasF && r.rank === 1 ? "win " : "") + (r.id === myId() ? "me" : "") + '"><td>' + esc(nm(r.id)) + '</td><td class="r num">' + esc(fmtVal(b, r.value)) + "</td>" +
        (hasF ? '<td class="r">' + fmtDist(b, r.dist) + "</td>" : "") + "</tr>").join("") + "</tbody></table></div>";
  } else {
    html += distBoard(b, f);
  }
  if (b.stakeMode === "kr") html += '<p class="note">Potten er ' + tippers(b).length + " × " + kr(b.stake) + " = " + kr(pot(b)) + ". " + ruleText(b) + "</p>";
  return html + "</section>";
}
function resultBlock(b, prelim) {
  const f = fasit(b), s = settle(b, f);
  let html = '<section class="card"><h3>' + (prelim ? "Foreløpig resultat" : "Resultat") + "</h3>";
  html += '<div class="row"><span>Fasit</span><b class="num">' + esc(fmtVal(b, f)) + "</b></div>";
  if (isNum(b)) {
    const r = ranking(b, f).filter((x) => x.rank === 1);
    if (r.length) html += "<p>" + (r.length > 1 ? "Nærmest, delt: " : "Nærmest: ") + esc(names(s.winners)) + ", " + fmtDist(b, r[0].dist) + ".</p>";
  } else {
    html += "<p>" + (s.winners.length ? "Traff: " + esc(names(s.winners)) + "." : "Ingen traff.") + "</p>";
  }
  if (s.kind === "tekst") {
    if (s.winners.length && s.losers.length) html += '<div class="callout"><b>' + esc(b.stakeText) + "</b><br>Taperne: " + esc(names(s.losers)) + ". Vinnerne: " + esc(names(s.winners)) + ".</div>";
  } else if (s.kind === "ingen") {
    html += '<p class="note">' + (s.winners.length ? "Alle traff, så ingen skylder noe." : "Ingen traff, så ingen skylder noe.") + "</p>";
  } else {
    const nW = s.winners.length;
    html += '<div class="stack">' + s.transfers.map((t) => {
      const L = esc(nm(t.from)), w = esc(nm(t.to));
      const calc = nW === 1 ? L + " betaler innsatsen sin." : "Innsatsen til " + L + " deles på " + nW + " vinnere: " + kr(b.stake) + " ÷ " + nW + (ore(t.amount) % 1 ? " ≈ " : " = ") + kr(t.amount) + ".";
      return '<div class="transfer"><div class="row"><span>' + L + " → " + w + '</span><b class="num">' + kr(t.amount) + '</b></div><span class="calc">' + calc + "</span></div>";
    }).join("") + "</div>";
    s.winners.forEach((w) => {
      const amts = s.transfers.filter((t) => t.to === w).map((t) => t.amount);
      if (!amts.length) return;
      const tot = sum(amts);
      const expr = amts.length === 1 ? kr(tot) : amts.length + " × " + kr(amts[0]) + " = " + kr(tot);
      html += '<div class="callout">' + esc(nm(w)) + ' får <span class="num">' + expr + "</span></div>";
    });
  }
  const p = points(b), pk = Object.keys(p).sort((a, c) => p[c] - p[a]);
  if (pk.length) html += '<p class="note">Poeng til tabellen: ' + pk.map((id) => esc(nm(id)) + " " + p[id]).join(", ") + ".</p>";
  if (prelim) html += '<p class="note">Avgjøres endelig når protestfristen går ut ' + rel(b.result.at + D) + ".</p>";
  return html + "</section>";
}
// Kriterier og utgangspunkt i en sammenleggbar boks: åpen før du har tippet, lukket etterpå.
function infoBox(b, st, closed) {
  if (!b.criteria && !b.note) return "";
  const title = b.criteria && b.note ? "Kriterier og utgangspunkt" : b.criteria ? "Kriterier for avgjørelse" : "Utgangspunkt";
  return '<details class="info"' + (closed ? "" : " open") + "><summary>" + title + "</summary>" +
    (b.criteria ? '<p class="rules">' + esc(b.criteria) + '</p><p class="note">Satt av ' + esc(nm(b.host)) + ". " + (st === "apen" ? "Låses når fristen går ut." : "Låst.") + "</p>" : "") +
    (b.note ? '<p class="rules note">' + esc(b.note) + "</p>" : "") + "</details>";
}
export function pageEdit(b) {
  if (!b) return '<p class="note">Fant ikke betten.</p>';
  const st = status(b);
  let html = '<form class="stack page-form" id="page-form" data-form="edit" data-id="' + esc(b.id) + '" novalidate><p class="note">' + esc(b.question) + '</p>';
  if (st === "apen") {
    // Spørsmål, type og alternativer kan bare endres før noen har tippet, så ingen får tipset sitt endret under seg.
    if (Object.keys(b.tips || {}).length) {
      html += '<p class="note">Spørsmål, type og alternativer kan ikke endres fordi noen allerede har tippet.</p>';
    } else {
      const types = [["tall", "Tall"], ["tid", "Tid"], ["valg", "Alternativer"], ["janei", "Ja/nei"]];
      html += '<div class="field"><label class="lbl" for="e-q">Spørsmål</label><input id="e-q" type="text" autocomplete="off" value="' + esc(b.question) + '"></div>' +
        '<fieldset class="field"><legend class="lbl">Type svar</legend><div class="seg" style="margin-top:6px">' +
        types.map((t) => '<label class="opt"><input type="radio" name="e-type" value="' + t[0] + '"' + (b.type === t[0] ? " checked" : "") + "> <span>" + t[1] + "</span></label>").join("") + "</div></fieldset>" +
        '<div class="field" data-eshow="tall"' + (b.type === "tall" ? "" : " hidden") + '><label class="lbl" for="e-unit">Enhet (valgfri)</label><input id="e-unit" type="text" placeholder="USD, kg, antall" autocomplete="off" value="' + esc(b.unit || "") + '"></div>' +
        '<div class="field" data-eshow="valg"' + (b.type === "valg" ? "" : " hidden") + '><label class="lbl" for="e-opts">Alternativer, ett per linje</label><textarea id="e-opts">' + esc((b.options || []).join("\n")) + "</textarea></div>" +
        '<p class="note">Spørsmål, type og alternativer kan endres til noen har tippet.</p>';
    }
  }
  if (st === "apen") {
    html += b.stakeMode === "kr"
      ? '<div class="field"><label class="lbl" for="e-stake">Innsats per person (kr)</label><input id="e-stake" type="number" min="1" step="1" inputmode="numeric" value="' + b.stake + '"></div>'
      : '<div class="field"><label class="lbl" for="e-stext">Hva spiller dere om?</label><input id="e-stext" type="text" autocomplete="off" value="' + esc(b.stakeText) + '"></div>';
    html += '<div class="field"><label class="lbl" for="e-dl">Frist for tips</label><input id="e-dl" type="datetime-local" value="' + toLocalInput(b.deadline) + '"></div>';
    html += '<div class="field"><label class="lbl" for="e-criteria">Kriterier for avgjørelse (valgfri)</label><textarea id="e-criteria" placeholder="Når er svaret ja? Hvilken kilde gjelder? Hva skjer hvis det er uklart?">' +
      esc(b.criteria || "") + '</textarea><span class="note">Låses når fristen går ut.</span></div>';
  }
  html += '<div class="field"><label class="lbl" for="e-note">Utgangspunkt og forklaring</label><textarea id="e-note">' + esc(b.note || "") + "</textarea></div>" +
    '<p class="err" role="alert"></p><button class="btn btn-primary btn-block" type="submit">Lagre</button></form>';
  return html;
}

export function sheetBet() {
  const b = getBet(nav.sheetId);
  if (!b) return '<p class="note">Fant ikke betten.</p>';
  const st = status(b), me = myId(), mine = (b.tips || {})[me], ex = G().example;
  let html = '<section class="card"><div class="row"><span class="pill pill-' + st + '">' + STATUS[st] + "</span>" + (myTurn(b) ? '<span class="pill pill-turn">Din tur</span>' : "") + "</div>" +
    "<h2>" + esc(b.question) + "</h2>" + chips(b, true) + infoBox(b, st, !(st === "apen" && !mine)) +
    (b.host === me && !b.result ? '<div><button class="btn btn-ghost btn-small" data-act="edit-open">Rediger</button></div>' : "") + "</section>";

  if (st === "apen") {
    if (mine && !ui.editTip) {
      // Etter tips: én kompakt stripe med tipset, Endre og veien videre.
      const nextBet = G().bets.filter((x) => x.id !== b.id && status(x) === "apen" && !(x.tips || {})[me]).sort((a, c) => a.deadline - c.deadline)[0];
      html += '<section class="card tight"><div class="row"><span><span class="fact-k">Ditt tips · ' + esc(nm(me)) + '</span><br><b class="num">' + esc(fmtVal(b, mine.value)) + "</b></span>" +
        '<button class="btn btn-ghost btn-small" data-act="edit-tip">Endre</button></div>' +
        (nextBet ? '<button class="btn btn-primary" data-act="open" data-id="' + esc(nextBet.id) + '">Neste spørsmål →</button>' : '<p class="note">Du har tippet på alt som er åpent.</p>') + "</section>";
    } else {
      html += '<section class="card"><h3>Ditt tips · ' + esc(nm(me)) + "</h3>" +
        '<form class="stack" data-form="tip" data-id="' + esc(b.id) + '" novalidate>' + valueInput(b, "tip", mine ? mine.value : null, "Hva tror du?") +
        '<p class="note">' + ruleText(b) + '</p><p class="err" role="alert"></p><div class="btns"><button class="btn btn-primary" type="submit">' + (mine ? "Lagre endring" : "Lever tips") + "</button>" +
        (mine ? '<button class="btn btn-ghost" type="button" data-act="cancel-edit">Avbryt</button>' : "") + "</div></form></section>";
    }
    const n = tippers(b).length, missing = ids().filter((id) => !(b.tips || {})[id]);
    html += '<section class="card tight"><div class="row"><h3>Tippet ' + n + " av " + ids().length + "</h3>" +
      (b.stakeMode === "kr" ? '<span class="calc num">Pott ' + n + " × " + kr(b.stake) + " = " + kr(pot(b)) + "</span>" : "") + "</div>" +
      (!isNum(b) && n ? distBoard(b, null) : "") +
      (missing.length ? '<p class="note">Mangler: ' + esc(names(missing)) + ".</p>" : "") +
      (isNum(b) && n ? '<p class="note">Tallene vises når fristen er ute.</p>' : "") + "</section>";
    if (ex) html += '<button class="btn btn-proto" data-act="ff-deadline" data-id="' + esc(b.id) + '">Eksempel: spol frem til fristen</button>';
    return html;
  }

  html += revealBoard(b, st);

  if (st === "venter") {
    if (b.host === me) {
      html += '<form class="card stack" data-form="fasit" data-id="' + esc(b.id) + '" novalidate><h3>Legg inn fasit</h3>' + valueInput(b, "f", null, "Hva ble svaret?") +
        '<p class="note">De andre får 24 timer på å protestere. Kommer det en protest, stemmer deltakerne.</p><p class="err" role="alert"></p>' +
        '<div class="btns"><button class="btn btn-primary" type="submit">Legg inn fasit</button></div></form>';
    } else {
      html += '<section class="card"><p>Venter på at ' + esc(nm(b.host)) + " legger inn fasit" + (b.resolveDate ? " " + fmtDate(b.resolveDate) : "") + ".</p></section>";
    }
    return html;
  }

  if (st === "protestfrist") {
    html += '<section class="card"><p>' + esc(nm(b.result.by)) + " la inn fasit " + when(b.result.at) + ".</p>";
    const canProtest = participants(b).indexOf(me) >= 0 && me !== b.host;
    if (canProtest && !ui.protestOpen) html += '<div class="btns"><button class="btn btn-ghost" data-act="protest-open">Protester mot fasit</button></div>';
    else if (canProtest) {
      html += '<form class="stack" data-form="protest" data-id="' + esc(b.id) + '" novalidate>' + valueInput(b, "pr", null, "Hva mener du er riktig fasit?") +
        '<p class="note">Alle deltakerne stemmer over ditt forslag og fasiten til ' + esc(nm(b.host)) + ". Flertallet avgjør. Står det likt, gjelder vertens fasit.</p>" +
        '<p class="err" role="alert"></p><div class="btns"><button class="btn btn-primary" type="submit">Send protest</button><button class="btn btn-ghost" type="button" data-act="protest-close">Avbryt</button></div></form>';
    } else if (me === b.host) html += '<p class="note">Du er vert. De andre kan protestere frem til ' + when(b.result.at + D) + ".</p>";
    html += "</section>" + resultBlock(b, true);
    if (ex) html += '<button class="btn btn-proto" data-act="ff-protest" data-id="' + esc(b.id) + '">Eksempel: spol frem 24 timer</button>';
    return html;
  }

  if (st === "avstemning") {
    const p = b.protest, voters = participants(b), maj = Math.floor(voters.length / 2) + 1;
    const voteRow = (key, label) => {
      const who = voters.filter((id) => p.votes[id] === key);
      return '<div class="dist-row"><b>' + label + '</b><span class="count">' + who.length + '</span><span class="calc" style="grid-column:1/-1">' + (who.length ? esc(names(who)) : "Ingen stemmer ennå") + "</span></div>";
    };
    html += '<section class="card"><h3>Avstemning</h3><p>' + esc(nm(p.by)) + " mener fasit er <b>" + esc(fmtVal(b, p.proposed)) + "</b>, ikke <b>" + esc(fmtVal(b, b.result.value)) + "</b> som " + esc(nm(b.host)) + " la inn.</p>" +
      '<div class="dist">' + voteRow("vert", esc(fmtVal(b, b.result.value)) + " (vertens fasit)") + voteRow("ny", esc(fmtVal(b, p.proposed)) + " (forslaget til " + esc(nm(p.by)) + ")") + "</div>";
    if (voters.indexOf(me) < 0) html += '<p class="note">Du er ikke med i denne betten, så du stemmer ikke.</p>';
    else if (p.votes[me]) html += '<p class="note">Du har stemt.</p>';
    else html += '<div class="btns"><button class="btn btn-ghost" data-act="vote" data-id="' + esc(b.id) + '" data-v="vert">Stem ' + esc(fmtVal(b, b.result.value)) + '</button><button class="btn btn-ghost" data-act="vote" data-id="' + esc(b.id) + '" data-v="ny">Stem ' + esc(fmtVal(b, p.proposed)) + "</button></div>";
    html += '<p class="note">' + Object.keys(p.votes).length + " av " + voters.length + " har stemt. " + maj + " like stemmer avgjør. Står det likt når alle har stemt, gjelder vertens fasit.</p></section>";
    return html;
  }

  if (b.protest && b.protest.closed) {
    html += '<section class="card"><p class="note">Avgjort ved avstemning, ' + b.protest.final.vert + " mot " + b.protest.final.ny + ". " +
      (b.protest.outcome === "ny" ? "Forslaget til " + esc(nm(b.protest.by)) + " vant." : "Fasiten til " + esc(nm(b.host)) + " står.") + "</p></section>";
  }
  return html + resultBlock(b, false);
}

/* ---------- Egne sider: ny bet, rediger og ny gruppe ---------- */
export function pageNew() {
  const dl = new Date(Date.now() + 3 * D); dl.setMinutes(0, 0, 0);
  const types = [["tall", "Tall"], ["tid", "Tid"], ["valg", "Alternativer"], ["janei", "Ja/nei"]];
  return '<form class="stack page-form" id="page-form" data-form="new" novalidate>' +
    '<p class="note">Ny bet i ' + esc(G().name) + '. Du blir vert for betten (' + esc(nm(myId())) + "). Verten bestemmer alternativer og innsats.</p>" +
    '<div class="field"><label class="lbl" for="n-q">Spørsmål</label><input id="n-q" type="text" placeholder="Hvem kommer sist til festen?" autocomplete="off" enterkeyhint="next"></div>' +
    '<fieldset class="field"><legend class="lbl">Type svar</legend><div class="seg" style="margin-top:6px">' +
    types.map((t, i) => '<label class="opt"><input type="radio" id="n-type-' + t[0] + '" name="n-type" value="' + t[0] + '"' + (i === 0 ? " checked" : "") + "> <span>" + t[1] + "</span></label>").join("") + "</div></fieldset>" +
    '<div class="field" data-show="tall"><label class="lbl" for="n-unit">Enhet (valgfri)</label><input id="n-unit" type="text" placeholder="USD, kg, antall" autocomplete="off"></div>' +
    '<div class="field" data-show="valg" hidden><label class="lbl" for="n-opts">Alternativer, ett per linje</label><textarea id="n-opts" placeholder="Rød&#10;Grønn&#10;Blå"></textarea></div>' +
    '<div class="field"><label class="lbl" for="n-dl">Frist for tips</label><input id="n-dl" type="datetime-local" value="' + toLocalInput(dl.getTime()) + '"></div>' +
    '<div class="field"><label class="lbl" for="n-resolve">Avgjøres (valgfri)</label><input id="n-resolve" type="date"></div>' +
    '<fieldset class="field"><legend class="lbl">Innsats</legend><div class="seg" style="margin-top:6px">' +
    '<label class="opt"><input type="radio" id="n-stake-kr" name="n-stake" value="kr" checked> <span>Kroner</span></label>' +
    '<label class="opt"><input type="radio" id="n-stake-tekst" name="n-stake" value="tekst"> <span>Noe annet</span></label></div></fieldset>' +
    '<div class="field" data-show="kr"><label class="lbl" for="n-amount">Innsats per person (kr)</label><input id="n-amount" type="number" min="1" step="1" inputmode="numeric" value="100"></div>' +
    '<div class="field" data-show="tekst" hidden><label class="lbl" for="n-stext">Hva spiller dere om?</label><input id="n-stext" type="text" placeholder="En øl, en straff eller bare æren" autocomplete="off"></div>' +
    '<div class="field"><label class="lbl" for="n-criteria">Kriterier for avgjørelse (valgfri)</label><textarea id="n-criteria" placeholder="Når er svaret ja? Hvilken kilde gjelder? Hva skjer hvis det er uklart?"></textarea><span class="note">Låses når fristen går ut.</span></div>' +
    '<div class="field"><label class="lbl" for="n-note">Utgangspunkt og forklaring (valgfri)</label><textarea id="n-note" placeholder="For eksempel dagens kurs, eller hvordan fasit avgjøres"></textarea></div>' +
    '<p class="err" role="alert"></p><button class="btn btn-primary btn-block" type="submit">Opprett bet</button></form>';
}
export function pageGroup() {
  return '<form class="stack page-form" id="page-form" data-form="group" novalidate>' +
    '<p class="note">Gruppa lagres bare på denne telefonen. Dere kan bruke samme telefon og bytte med «Hvem tipper nå?» øverst.</p>' +
    '<div class="field"><label class="lbl" for="g-name">Navn på gruppa</label><input id="g-name" type="text" placeholder="Hyttegjengen" autocomplete="off" enterkeyhint="next"></div>' +
    '<div class="field"><label class="lbl" for="g-members">Hvem er med? Ett navn per linje</label><textarea id="g-members" placeholder="Deg selv først&#10;Neste person&#10;…"></textarea>' +
    '<span class="note">Første navn blir valgt som deg.</span></div>' +
    '<p class="err" role="alert"></p><button class="btn btn-primary btn-block" type="submit">Lag gruppa</button></form>';
}

/* ---------- Oppgjør og tabell ---------- */
export function viewLedger() {
  const items = ledgerItems(), me = myId(), all_ = ids();
  let html = '<div class="top"><div><div class="eyebrow">' + esc(G().name) + "</div><h1>Oppgjør</h1></div></div>";
  const rows = all_.filter((id) => id !== me).map((id) => {
    const nb = netBetween(items, me, id);
    return { id, n: nb.n, byBet: nb.byBet, rem: remaining(items, me, id) };
  }).filter((x) => Object.keys(x.byBet).length);
  html += '<section class="card"><h3>Oppgjør for ' + esc(nm(me)) + "</h3>";
  if (!rows.length) html += '<p class="note">Ingen avgjorte bets med kroner ennå.</p>';
  rows.forEach((x) => {
    const label = x.rem > 0 ? esc(nm(x.id)) + " skylder deg" : x.rem < 0 ? "Du skylder " + esc(nm(x.id)) : esc(nm(x.id));
    const amt = x.rem > 0 ? '<b class="big plus">' + kr(x.rem) + "</b>" : x.rem < 0 ? '<b class="big minus">' + kr(-x.rem) + "</b>" : '<span class="pill pill-avgjort">Gjort opp</span>';
    let parts = Object.keys(x.byBet).map((bid) => {
      const v = x.byBet[bid];
      return '<div class="row calc"><span>' + esc(getBet(bid).question) + '</span><span class="num ' + (v > 0 ? "plus" : "minus") + '">' + (v > 0 ? "+" : "−") + kr(Math.abs(v)) + "</span></div>";
    }).join("");
    const settled = ore(x.n - x.rem);
    if (settled) parts += '<div class="row calc"><span>Merket som gjort opp</span><span class="num">' + (settled > 0 ? "−" : "+") + kr(Math.abs(settled)) + "</span></div>";
    html += '<div class="debt"><div class="row"><b>' + label + "</b>" + amt + "</div>" + parts +
      (x.rem ? '<div><button class="btn btn-ghost btn-small" data-act="mark" data-id="' + esc(x.id) + '">Merk som gjort opp</button></div>' : "") + "</div>";
  });
  html += "</section>";

  const all = [];
  for (let i = 0; i < all_.length; i++) for (let j = i + 1; j < all_.length; j++) {
    const r = remaining(items, all_[i], all_[j]);
    if (r > 0) all.push([all_[j], all_[i], r]); else if (r < 0) all.push([all_[i], all_[j], -r]);
  }
  html += '<section class="card"><h3>Hele gruppa</h3>' + (all.length ? '<div class="stack">' + all.map((a) =>
    '<div class="row"><span>' + esc(nm(a[0])) + " skylder " + esc(nm(a[1])) + '</span><b class="num">' + kr(a[2]) + "</b></div>").join("") + "</div>" : '<p class="note">Alle er skuls.</p>') + "</section>";

  const other = G().bets.filter((b) => status(b) === "avgjort" && b.stakeMode !== "kr");
  if (other.length) {
    html += '<section class="card"><h3>Andre innsatser</h3><div class="stack">' + other.map((b) => {
      const s = settle(b, fasit(b));
      return '<div class="transfer"><b>' + esc(b.stakeText) + '</b><span class="calc">' + esc(b.question) + "</span>" +
        '<span class="calc">' + (s.losers.length && s.winners.length ? "Taperne: " + esc(names(s.losers)) + ". Vinnerne: " + esc(names(s.winners)) + "." : "Ingen skylder noe.") + "</span></div>";
    }).join("") + "</div></section>";
  }
  return html + '<p class="note">Appen holder ingen penger. Dere gjør opp seg imellom og merker det her etterpå.</p>';
}

export function viewTable() {
  const items = ledgerItems(), stats = {}, all_ = ids();
  all_.forEach((id) => { stats[id] = { id, pts: 0, wins: 0, played: 0, net: 0 }; });
  G().bets.forEach((b) => {
    if (status(b) !== "avgjort") return;
    const p = points(b), w = winnersOf(b, fasit(b));
    tippers(b).forEach((id) => { stats[id].played++; stats[id].pts += p[id] || 0; if (w.indexOf(id) >= 0) stats[id].wins++; });
  });
  items.forEach((it) => { if (stats[it.to]) stats[it.to].net += it.amount; if (stats[it.from]) stats[it.from].net -= it.amount; });
  all_.forEach((id) => { stats[id].net = ore(stats[id].net); });
  const rows = all_.map((id) => stats[id]).sort((a, c) => c.pts - a.pts || c.net - a.net);
  const decided = G().bets.filter((b) => status(b) === "avgjort").length;
  return '<div class="top"><div><div class="eyebrow">' + esc(G().name) + "</div><h1>Tabell</h1></div></div>" +
    (decided ? "" : '<p class="note">Ingen bets er avgjort ennå, så alle står på null.</p>') +
    '<section class="card"><div class="tablewrap"><table><thead><tr><th>#</th><th>Navn</th><th class="r">Poeng</th><th class="r">Vunnet</th><th class="r">Netto</th></tr></thead><tbody>' +
    rows.map((r, i) => '<tr class="' + (r.id === myId() ? "me" : "") + '"><td class="num">' + (i + 1) + "</td><td>" + esc(nm(r.id)) + '</td><td class="r num">' + r.pts +
      '</td><td class="r num">' + r.wins + " av " + r.played + '</td><td class="r num ' + (r.net > 0 ? "plus" : r.net < 0 ? "minus" : "") + '">' +
      (r.net > 0 ? "+" : r.net < 0 ? "−" : "") + kr(Math.abs(r.net)) + "</td></tr>").join("") + "</tbody></table></div></section>" +
    '<p class="note">Poeng: 3, 2 og 1 til de tre nærmeste på tall og tid. 3 poeng for treff på alternativer og ja/nei.</p>';
}
