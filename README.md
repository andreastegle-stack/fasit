# Vennebets

Veddemål og spådommer i vennegjengen. Appen er dommer og regnskapsfører. Ingen penger går gjennom appen, og gjeld gjøres opp utenfor.

Dette er en testversjon. Alt lagres bare på telefonen som bruker appen. Det finnes ingen server ennå, og eksempelgruppa «Gjengen» har oppdiktede navn og bets.

## Slik fungerer det

- **Svartyper:** tall, tid, alternativer og ja/nei.
- **Vinnere:** Ved tall og tid vinner den som er nærmest fasit. Ved alternativer og ja/nei deler de som treffer potten likt.
- **Innsats:** Verten bestemmer innsatsen, enten et fast kronebeløp per person eller fritekst (for eksempel «en øl»). Ingen odds.
- **Fasit:** Verten legger inn fasit. Deltakerne har 24 timer på å protestere, og da avgjør flertallet. Står det likt, gjelder vertens fasit.
- **Kriterier:** Verten kan sette kriterier for avgjørelse. De låses når fristen går ut.
- **Synlighet:** Hvem som har valgt hvilket alternativ, vises med navn også før fristen. Tall- og tidstips er skjult til fristen.
- **Oppgjør:** Hvem skylder hvem, og «Merk som gjort opp».
- **Tabell:** 3, 2 og 1 poeng til de tre nærmeste på tall og tid. 3 poeng for treff på alternativer og ja/nei.
- **«Hvem tipper nå?»** gjør at flere kan bruke samme telefon.
- **Fargetema:** Ken (turkis og lilla) eller Barbie (plomme, rosa og lilla), valgt per person.

## Installere på telefonen

**iPhone:** Åpne lenken i Safari, trykk Del-knappen (firkant med pil opp), velg «Legg til på Hjem-skjerm».

**Android:** Åpne lenken i Chrome, trykk menyen (tre prikker), velg «Installer app» eller «Legg til på startsiden».

## Teknisk

En installerbar nettapp (PWA) uten rammeverk og uten byggesteg.

| Fil | Innhold |
| --- | --- |
| `index.html` | Skallet, iPhone-tagger og arket som glir opp |
| `css/app.css` | Hele designet, begge fargetemaene |
| `js/app.js` | Oppstart, tegning, ark, trykk og skjema |
| `js/views.js` | HTML for lister, ark, oppgjør og tabell |
| `js/rules.js` | Spillereglene |
| `js/store.js` | Lagring på telefonen og eksempelgruppa |
| `js/util.js` | Formatering av tall, tid og kroner |
| `sw.js` | Service worker, så appen starter uten nett |
| `manifest.webmanifest` | Navn, ikoner og fullskjerm |
| `tools/make_icons.py` | Lager ikonene på nytt (krever Pillow) |

**Kjøre lokalt:** `python -m http.server 5173`, og åpne http://localhost:5173.

**Ny versjon ut til telefonene:** Øk `VERSION` i `sw.js` når filer endres. Da henter telefonene den nye versjonen neste gang appen åpnes med nett.
