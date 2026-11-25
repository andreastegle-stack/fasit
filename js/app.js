// Oppstart, tegning av skjermen, ark som glir opp, og alle trykk og skjema.
import { D, clone } from "./util.js";
import {
  S, G, myId, getBet, save, setGroup, setMe, setSkin, patchBet, createBet, patchGroup, resetExample, createGroup, deleteGroup
} from "./store.js";
import { status, participants, checkVote, ledgerItems, netBetween, markKey } from "./rules.js";
import { nav, ui, headerBar, whoBar, tabBar, viewList, sheetBet, sheetNew, sheetGroup, viewLedger, viewTable, readValue } from "./views.js";

const root = document.documentElement;
const $app = document.getElementById("app");
const $sheet = document.getElementById("sheet");
const $sheetBody = document.getElementById("sheet-body");
const $toast = document.getElementById("toast");

/* ---------- Tema ---------- */
function applySkin() {
  root.setAttribute("data-skin", S.prefs.skin);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", S.prefs.skin === "barbie" ? "#12060F" : "#070A12");
}

/* ---------- Tegning ---------- */
function render() {
  let main;
  switch (nav.view) {
    case "oppgjor": main = viewLedger(); break;
    case "tabell": main = viewTable(); break;
    default: main = viewList();
  }
  const flash = S.saveFailed ? '<div class="callout" role="alert">Kunne ikke lagre på telefonen. Sjekk at privat nettlesing er slått av.</div>' : "";
  $app.innerHTML = '<div class="wrap">' + headerBar() + whoBar() + flash +
    '<div class="view' + (ui.anim === "view" ? " enter" : "") + '">' + main + "</div></div>" + tabBar();
  if (nav.sheet) renderSheet();
  ui.anim = null;
}
function renderSheet() {
  $sheetBody.innerHTML = nav.sheet === "bet" ? sheetBet() : nav.sheet === "new" ? sheetNew() : sheetGroup();
}

/* ---------- Ark som glir opp nederfra ---------- */
function resetSheetUi() { ui.editTip = false; ui.protestOpen = false; ui.editBet = false; }
function openSheet(kind, id) {
  const wasOpen = !!nav.sheet;
  nav.sheet = kind; nav.sheetId = id || null;
  resetSheetUi(); ui.groupMenu = false;
  render();
  $sheetBody.scrollTop = 0;
  if (!wasOpen) {
    // Tilbake-knappen på Android lukker arket i stedet for å gå ut av appen.
    try { history.pushState({ sheet: true }, ""); } catch (e) {}
    $sheet.style.transform = "";
    void $sheet.offsetHeight; // les av layout først, så arket glir inn i stedet for å hoppe frem
    root.classList.add("sheet-open", "lock");
  }
}
function closeSheet(fromHistory) {
  if (!nav.sheet) return;
  if (!fromHistory && history.state && history.state.sheet) { history.back(); return; }
  nav.sheet = null; nav.sheetId = null; resetSheetUi();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  $sheet.classList.remove("dragging");
  $sheet.style.transform = "";
  root.classList.remove("sheet-open", "lock");
  render();
}
window.addEventListener("popstate", () => { if (nav.sheet) closeSheet(true); });

// Dra arket nedover for å lukke det (fra håndtaket, eller fra innholdet når det er scrollet helt opp).
(function dragToClose() {
  let y0 = 0, dy = 0, t0 = 0, dragging = false, startedInHead = false, active = false;
  const isField = (el) => el && el.closest && el.closest("input, textarea, select");
  $sheet.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    active = true; dragging = false; dy = 0;
    y0 = e.touches[0].clientY; t0 = Date.now();
    startedInHead = !!e.target.closest(".sheet-head");
  }, { passive: true });
  $sheet.addEventListener("touchmove", (e) => {
    if (!active) return;
    const y = e.touches[0].clientY;
    if (!dragging) {
      const down = y - y0;
      if (down > 6 && (startedInHead || $sheetBody.scrollTop <= 0) && !isField(e.target)) {
        dragging = true; y0 = y; t0 = Date.now();
        $sheet.classList.add("dragging");
      } else if (Math.abs(down) > 6) { active = false; return; }
      else return;
    }
    e.preventDefault();
    dy = Math.max(0, y - y0);
    $sheet.style.transform = "translateY(" + dy + "px)";
  }, { passive: false });
  $sheet.addEventListener("touchend", () => {
    if (!active) return;
    active = false;
    if (!dragging) return;
    dragging = false;
    const speed = dy / Math.max(1, Date.now() - t0);
    $sheet.classList.remove("dragging");
    if (dy > 110 || speed > 0.6) closeSheet();
    else $sheet.style.transform = "";
  });
})();

// Når tastaturet er oppe, skal arket ligge rett over tastaturet og krympe så feltet du skriver i synes.
// Telefonene gjør dette ulikt: noen flytter faste elementer opp selv (nyere iPhone), andre lar tastaturet
// dekke dem. Vi måler derfor hvor bunnen av skjermen faktisk havner, og løfter arket bare det som mangler.
let measureVV = () => {};
if (window.visualViewport) {
  const vv = window.visualViewport;
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:fixed;left:0;bottom:0;width:1px;height:0;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  measureVV = () => {
    const hidden = probe.getBoundingClientRect().bottom - vv.offsetTop - vv.height;
    const kb = hidden > 1 ? Math.round(hidden) : 0;
    root.style.setProperty("--kb", kb + "px");
    root.style.setProperty("--vvh", Math.round(vv.height) + "px");
  };
  vv.addEventListener("resize", measureVV); vv.addEventListener("scroll", measureVV); measureVV();
}
// Tastaturet glir inn og ut over litt tid, så vi måler på nytt når det har lagt seg.
document.addEventListener("focusin", () => setTimeout(measureVV, 350));
document.addEventListener("focusout", () => setTimeout(measureVV, 350));
$sheetBody.addEventListener("focusin", (e) => {
  const el = e.target;
  if (!el.matches("input, textarea")) return;
  setTimeout(() => { measureVV(); try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (x) {} }, 380);
});

/* ---------- Kort beskjed ---------- */
let toastTimer = null;
function toast(msg) {
  $toast.textContent = msg;
  $toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove("show"), 1800);
  try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
}

/* ---------- Trykk ---------- */
function showErr(form, msg) { const e = form.querySelector(".err"); if (e) e.textContent = msg; }
function syncNew() {
  const ty = document.querySelector('input[name="n-type"]:checked'), sk = document.querySelector('input[name="n-stake"]:checked');
  document.querySelectorAll("[data-show]").forEach((el) => { const k = el.dataset.show; el.hidden = !(ty && k === ty.value) && !(sk && k === sk.value); });
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  // Trykk utenfor gruppemenyen lukker den.
  if (ui.groupMenu && !e.target.closest(".gbar")) { ui.groupMenu = false; render(); if (!el) return; }
  if (!el) return;
  const act = el.dataset.act, b = el.dataset.id ? getBet(el.dataset.id) : null, ex = G().example, me = myId();
  switch (act) {
    case "gmenu": ui.groupMenu = !ui.groupMenu; render(); break;
    case "group":
      setGroup(el.dataset.id); nav.view = "bets"; ui.expanded = null; ui.inviteOpen = false; ui.statusTab = null; ui.groupMenu = false; ui.anim = "view";
      render(); window.scrollTo(0, 0); break;
    case "new-group": ui.groupMenu = false; openSheet("group"); break;
    case "delete-group":
      if (!ex && confirm("Slette gruppa «" + G().name + "» og alle bets i den? Dette kan ikke angres.")) {
        deleteGroup(S.groupId); nav.view = "bets"; ui.statusTab = null; ui.anim = "view"; render(); toast("Gruppa er slettet");
      }
      break;
    case "stab": ui.statusTab = el.dataset.v; ui.expanded = null; render(); break;
    case "skin": setSkin(el.dataset.v); applySkin(); render(); break;
    case "nav":
      if (nav.view === el.dataset.view) { window.scrollTo({ top: 0, behavior: "smooth" }); break; }
      nav.view = el.dataset.view; ui.expanded = null; ui.groupMenu = false; ui.anim = "view"; render(); window.scrollTo(0, 0); break;
    case "new-bet": openSheet("new"); break;
    case "open": openSheet("bet", el.dataset.id); break;
    case "close-sheet": closeSheet(); break;
    case "me": setMe(el.dataset.id); resetSheetUi(); ui.expanded = null; render(); break;
    case "reset": if (ex && confirm("Nullstille eksempelgruppa til slik den var fra start?")) { resetExample(); ui.expanded = null; render(); toast("Eksempelet er nullstilt"); } break;
    case "invite": ui.inviteOpen = !ui.inviteOpen; render(); break;
    case "copy": {
      const inp = document.getElementById("invite-link");
      const fallback = () => { inp.focus(); inp.select(); el.textContent = "Marker og kopier"; };
      try { navigator.clipboard.writeText(inp.value).then(() => { el.textContent = "Kopiert"; }, fallback); } catch (err) { fallback(); }
      break;
    }
    case "expand":
      ui.expanded = ui.expanded === el.dataset.id ? null : el.dataset.id;
      if (ui.expanded) ui.anim = "quick";
      render(); break;
    case "quick-tip":
      if (b && status(b) === "apen") {
        const qt = { tips: {} }; qt.tips[me] = { value: el.dataset.v };
        ui.expanded = null; patchBet(b, qt); render(); toast("Tips lagret: " + el.dataset.v);
      }
      break;
    case "edit-tip": ui.editTip = true; render(); break;
    case "cancel-edit": ui.editTip = false; render(); break;
    case "edit-open": ui.editBet = true; render(); break;
    case "edit-close": ui.editBet = false; render(); break;
    case "ff-deadline": if (b && ex) { patchBet(b, { deadline: Date.now() - 60e3 }); render(); } break;
    case "ff-protest": if (b && ex && b.result) { patchBet(b, { result: { at: Date.now() - D - 60e3 } }); render(); } break;
    case "protest-open": ui.protestOpen = true; render(); break;
    case "protest-close": ui.protestOpen = false; render(); break;
    case "vote":
      if (b && b.protest && !b.protest.closed && participants(b).indexOf(me) >= 0 && !b.protest.votes[me]) {
        const nb = clone(b); nb.protest.votes[me] = el.dataset.v; checkVote(nb);
        patchBet(b, { protest: nb.protest }); render(); toast("Stemme lagret");
      }
      break;
    case "mark": {
      const items = ledgerItems(), pair = [me, el.dataset.id].sort(), patch = { marks: {} };
      patch.marks[markKey(me, el.dataset.id)] = netBetween(items, pair[0], pair[1]).n;
      patchGroup(patch); render(); toast("Merket som gjort opp");
      break;
    }
  }
});
document.addEventListener("change", (e) => {
  if (e.target.name === "n-type" || e.target.name === "n-stake") syncNew();
});

/* ---------- Skjema ---------- */
document.addEventListener("submit", (e) => {
  e.preventDefault();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const f = e.target, kind = f.dataset.form, b = f.dataset.id ? getBet(f.dataset.id) : null, me = myId();
  let r, patch;
  if (kind === "tip") {
    if (status(b) !== "apen") return showErr(f, "Fristen er ute, så tipset kan ikke endres.");
    r = readValue(b, "tip"); if (!r.ok) return showErr(f, r.err);
    patch = { tips: {} }; patch.tips[me] = { value: r.value };
    ui.editTip = false; ui.expanded = null; patchBet(b, patch); render(); toast("Tips lagret");
  } else if (kind === "fasit") {
    r = readValue(b, "f"); if (!r.ok) return showErr(f, r.err);
    patchBet(b, { result: { value: r.value, by: me, at: Date.now() } }); render(); toast("Fasit lagt inn");
  } else if (kind === "protest") {
    r = readValue(b, "pr"); if (!r.ok) return showErr(f, r.err);
    if (r.value === b.result.value) return showErr(f, "Forslaget ditt er likt fasiten som er lagt inn.");
    const nb = clone(b); nb.protest = { by: me, proposed: r.value, votes: {}, closed: false };
    nb.protest.votes[me] = "ny"; nb.protest.votes[b.host] = "vert";
    checkVote(nb); ui.protestOpen = false; patchBet(b, { protest: nb.protest }); render(); toast("Protest sendt");
  } else if (kind === "edit") {
    patch = { note: document.getElementById("e-note").value.trim() };
    if (status(b) === "apen") {
      const dlv = new Date(document.getElementById("e-dl").value).getTime();
      if (!dlv || isNaN(dlv)) return showErr(f, "Velg en frist for tips.");
      if (dlv <= Date.now()) return showErr(f, "Fristen må være frem i tid.");
      patch.deadline = dlv;
      patch.criteria = document.getElementById("e-criteria").value.trim();
      const optsEl = document.getElementById("e-opts");
      if (optsEl && b.type === "valg") {
        if (Object.keys(b.tips || {}).length) return showErr(f, "Noen har tippet i mellomtiden, så alternativene kan ikke endres.");
        let opts = optsEl.value.split("\n").map((s) => s.trim()).filter(Boolean);
        opts = opts.filter((o, i) => opts.indexOf(o) === i);
        if (opts.length < 2) return showErr(f, "Skriv inn minst to ulike alternativer.");
        patch.options = opts;
      }
      if (b.stakeMode === "kr") {
        const amt = Number(document.getElementById("e-stake").value);
        if (!(amt >= 1) || amt % 1 !== 0) return showErr(f, "Skriv inn innsatsen i hele kroner, minst 1 kr.");
        patch.stake = amt;
      } else {
        const stx = document.getElementById("e-stext").value.trim();
        if (!stx) return showErr(f, "Skriv hva dere spiller om.");
        patch.stakeText = stx;
      }
    }
    ui.editBet = false; patchBet(b, patch); render(); toast("Endringen er lagret");
  } else if (kind === "new") {
    const q = document.getElementById("n-q").value.trim();
    const type = document.querySelector('input[name="n-type"]:checked').value;
    const stakeMode = document.querySelector('input[name="n-stake"]:checked').value;
    const dl = new Date(document.getElementById("n-dl").value).getTime();
    if (!q) return showErr(f, "Skriv inn et spørsmål.");
    if (!dl || isNaN(dl)) return showErr(f, "Velg en frist for tips.");
    if (dl <= Date.now()) return showErr(f, "Fristen må være frem i tid.");
    const nb = { id: "b" + Date.now().toString(36), question: q, type, host: me, deadline: dl, stakeMode, tips: {}, result: null, protest: null };
    const resolve = document.getElementById("n-resolve").value; if (resolve) nb.resolveDate = resolve;
    const note = document.getElementById("n-note").value.trim(); if (note) nb.note = note;
    const crit = document.getElementById("n-criteria").value.trim(); if (crit) nb.criteria = crit;
    if (type === "tall") nb.unit = document.getElementById("n-unit").value.trim();
    if (type === "valg") {
      let opts = document.getElementById("n-opts").value.split("\n").map((s) => s.trim()).filter(Boolean);
      opts = opts.filter((o, i) => opts.indexOf(o) === i);
      if (opts.length < 2) return showErr(f, "Skriv inn minst to ulike alternativer.");
      nb.options = opts;
    }
    if (stakeMode === "kr") {
      const a = Number(document.getElementById("n-amount").value);
      if (!(a >= 1) || a % 1 !== 0) return showErr(f, "Skriv inn innsatsen i hele kroner, minst 1 kr.");
      nb.stake = a;
    } else {
      nb.stakeText = document.getElementById("n-stext").value.trim();
      if (!nb.stakeText) return showErr(f, "Skriv hva dere spiller om, for eksempel en øl.");
    }
    createBet(nb); ui.statusTab = "apen"; nav.view = "bets";
    openSheet("bet", nb.id); toast("Betten er opprettet");
  } else if (kind === "group") {
    const name = document.getElementById("g-name").value.trim();
    let members = document.getElementById("g-members").value.split("\n").map((s) => s.trim()).filter(Boolean);
    members = members.filter((m, i) => members.map((x) => x.toLowerCase()).indexOf(m.toLowerCase()) === i);
    if (!name) return showErr(f, "Gi gruppa et navn.");
    if (members.length < 2) return showErr(f, "Skriv inn minst to ulike navn, ett per linje.");
    const g = createGroup(name, members);
    setGroup(g.id); setMe(g.members[0].id);
    nav.view = "bets"; ui.statusTab = null; ui.expanded = null; ui.anim = "view";
    closeSheet(); window.scrollTo(0, 0); toast("Gruppa er laget");
  }
});

// Når appen hentes frem igjen, oppdateres frister og nedtellinger.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const a = document.activeElement;
  if (!(a && a.closest && a.closest("form"))) render();
});

/* ---------- Oppstart uten nett (service worker) ---------- */
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Ny versjon er lastet ned: last inn på nytt, men ikke midt i et skjema eller et åpent ark.
    if (!hadController || reloading) return;
    const busy = nav.sheet || (document.activeElement && document.activeElement.closest && document.activeElement.closest("form"));
    if (busy) return;
    reloading = true; location.reload();
  });
  window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
}

applySkin();
save();
render();
