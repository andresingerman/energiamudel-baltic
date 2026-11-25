# Mudeli otsedemo — skript 10. novembri esitluseks

*Koostatud 19. oktoobril 2026 omaniku palvel ("Pack for the presentation"), kasutajaliidese nimed
uuendatud 21., 23. ja 28. oktoobril ning 10. novembril. Umbes kolm ja pool minutit. Arvud on 10. novembri seisuga:
omaniku algvaade (tuul 1 300 ja päike 2 500 MW, naabrid 75 / 90 / 120 €/MWh ehk TYNDP profiil avaldatud kujul
×1,88 / ×1,96 / ×2,10, 315 MW plokid; D-182 … D-194) ja tundlikkused omaniku nelja LNG ja CO₂ hinnapaarina
(D-183 … D-188). Külmutamine (`make freeze`) ei ole jooksnud: kalibreerimise 2026. aasta rida ulatub septembri lõpuni
(samm 8). Kõik peale sammu 6 on saidil eelnevalt arvutatud ja ilmub kohe.*

## Enne esitlust

- Avada **https://energiamudel.ee/?lang=et** — ilma `#s=…` lõputa, siis avaneb algvaade. Aken vähemalt
  1 000 pikslit lai. Sait on parooli taga (D-178): logida eelnevalt sisse või vajutada meeskonna tööriistalehe kaardil
  „Ava ilma paroolita →“, mis jätab brauserisse 30 päevaks küpsise (D-179). Võrguta koopia parooli ei küsi.
- Brauseri suurendus 125–150 %, et tabel oleks saali tagant loetav.
- Sait on ainult heledas teemas (D-196): projektori jaoks pole midagi ümber lülitada.
- **Kui saalis internet ei tööta:** võrguta koopia (`make offline` pärast külmutamise deploy'd, vt
  README). Topeltklõps failil `data/derived/offline/energiamudel.command` avab sama saidi samade
  arvudega, internetita.
- Algvaatesse tagasi: avada aadress uuesti ilma `#s=…` lõputa.

## Samm-sammult

**1. Ausus enne arve (15 s).** Näidata lehe ülaosa kollast rida.
> „Ülal on kirjas, et mudeli valideerimise eesmärk 2025. aastal on täitmata. Me ei peida seda: iga
> kõrvalekalle on lehel „Kalibreerimine“.“

**2. Neli stsenaariumi (40 s).** Kaart *Stsenaariumid, 2035* lehe ülaosas.
> „Neli 2035. aasta stsenaariumi: Eleringi ja TalTechi baasstsenaarium S1 minu tuule-, päikese- ja naabrite
> hinnaeeldustega ilma tuumajaamata, „0 SMR“, ning sama stsenaarium ühe, kahe ja kolme 315-megavatise plokiga —
> muus osas on kõik neli samad. Eesti keskmine hind on 108,1 €/MWh; ühe plokiga 96,2, kahega 86,0, kolmega 75,0.
> Läti ja Leedu hind langeb vähem: kahe plokiga 109,5-lt 106,0-le.“

Klõpsata tabeli päises **2 SMR** — kaardid ja graafikud näitavad kahe ploki stsenaariumi.

**3. Hinnavahe leping (30 s).** Kaart *Hinnavahe leping*.
> „Lepinguhind 90 €/MWh. Jaam saab turult keskmiselt 87,2 €/MWh, riik maksab vahe: umbes 15 miljonit
> eurot aastas. Ühe plokiga oleks see vastupidi: jaam maksaks riigile umbes 20 miljonit.“

Soovi korral liigutada liugurit *Lepinguhind*: kulu arvutatakse kohe ümber (mootorit ei käivitata).

**4. Tundlikkused (30 s).** Kaardid tabeli all.
> „Neli LNG ja CO₂ hinnapaari. Kõige odavama juures — LNG 30 eurot, CO₂ 80 — on Eesti hind ilma tuumajaamata
> 90,7 €/MWh, kõige kallima juures 112,5; kahe plokiga 77,2 ja 86,7. Kaardi nimes on gaasijaamade pakkumine,
> 127 kuni 233 eurot. Mida kallim on fossiilne elekter, seda rohkem jaam säästab.“

Tabel kaartide all: hinnaalanduse ja hinnavahelepingu netokasu. „Tarbijate netokasu on kõigil juhtudel positiivne: kahe plokiga
94 miljonit eurot aastas kõige odavama paari juures ja 288 miljonit kõige kallima juures.“ (Kuni 28. oktoobrini oli kolm
plokki odava kütuse juures kahjumlik, −53; alates D-194 ei lange naabrite hind koos meie gaasi- ja CO₂-hinnaga.)

**5. Pingelised naabrid (30 s).** Paneelis *Naabrite hinnad* → *Naabrite hindade stsenaarium* →
„pingeline juhtum, igaüks eraldi“.
> „Kui naabrite tarbimine kasvab ja ehitus jääb maha, on Eesti hind stsenaariumis „0 SMR“ 119,1 ja kahe
> plokiga 94,6. Siis leping toob riigile raha: umbes 31 miljonit eurot aastas.“

Pingelisel juhtumil on naabrite hinnatase ×1, nagu uuring selle ehitas; paneeli liugurid näitavad seda (D-190).
Tagasi: sama valik → esimene rida (TYNDP 2024 Distributed Energy) — hinnatase läheb tagasi ×1,88 / ×1,96 / ×2,10-le.

**6. Arvutus brauseris (20 s).** Liigutada paneelis mõnda liugurit, näiteks *Naabrite hinnad* →
*Hinnatase* → *Soome* 1,88 → 2,00.
> „Iga muudatus arvutatakse siinsamas brauseris: 12 aastat tund tunnilt. Näidatud stsenaarium on
> valmis paari sekundiga, kõik neli umbes viiega.“

Sülearvutis kulub umbes 1,5 s näidatud stsenaariumile ja 4–5 s kõigile neljale; tundlikkused (neli paari igale
stsenaariumile, alates D-184) tulevad mõnekümne sekundi jooksul. Kui aega on vähe, jätta see samm vahele: sammud
1–5 on eelnevalt arvutatud. Tagasi algvaatesse: aadress ilma `#s=…` lõputa.

**7. Esitlus (30 s).** Vaade **Esitlus** (päises *Mudel* kõrval).
> „Kõik neli stsenaariumi ühel lehel: sisendid riikide kaupa, Eesti näitajad ja mõju — keskmise leibkonna
> elektrienergia aastas, Eesti netoimpordi arve jaama 60-aastase eluea jooksul ja selle nüüdisväärtus 3 %
> juures, riigi makse lepingu järgi — ning kuu hinnad, energiaallikad ja hinna kestuskõver.“

Lehe ülaosas on energiamiksi investeeringud; selle all sama kokkuvõte iga naabrite hindade stsenaariumi kohta
(TYNDP 2024 Distributed Energy 2035, Global Ambition 2035, National Trends 2040, kaks pingelist juhtumit), igaüks
oma pealkirjaga „Naabrite hinnad: …“ (D-177). Kerida plokk ploki haaval. Keele vahetus EN | ET jätab vaate alles.
Üleval on ka liugurid — Soome, Rootsi SE4 ja Poola hinnatase ning stsenaariumi gaasi ja CO₂ hind: nihutamine muudab sisendi igas plokis
ja mootor arvutab plokid brauseris uuesti (≈ pool minutit kõigile); algvaate tasemele (×1,88 / ×1,96 / ×2,10)
naastes tulevad eelarvutatud seisud tagasi. Teised plokid liiguvad sama suhtega oma ×1 juurest (D-180, D-190).

**7b. Esitlus 2 — slaidid saidil (valikuline, 30–60 s).** Vaade **Esitlus 2** (päises *Esitlus* kõrval) või aadress
`https://energiamudel.ee/?lang=et&view=deck` (D-220, D-221). Samad kaksteist slaidi mis v3 pressideki omad ja kaks uut —
slaid 12, mudeli täpsus (D-223, omaniku kinnitamisel), ja slaid 13, möödunud aastad joonistena (D-229) —, Fermi esitluse
kujunduses; iga arv on mudeli oma ja arvutub samast seisust, mida paneel näitab — algvaates needsamad arvud, mis
kaardil „Stsenaariumid, 2035“ ja Esitluse lehel.
> „Samad arvud slaididena. Need ei ole pildid: iga number siin tuleb mudelist ja muutub, kui eeldusi muuta.“

- **Täisekraan:** nupp *Täisekraan* või klahv **F**; välja Esc või uuesti F. Slaidide lehitsemine: nooleklahvid,
  PageDown / PageUp, tühik, klõps slaidil (vasak kolmandik tagasi, ülejäänu edasi), puuteekraanil pühkimine; Home ja End.
- **Märkmed:** nupp *Märkmed* või klahv **N** näitab slaidi all esineja märkust selle slaidi juurde (D-222): mis on mis,
  kuidas arve lugeda ja mida need ei ütle. Arve märkmetes ei ole, need on slaidil. Täisekraanil märkmeid ei näidata ja
  täisekraanile minek paneb need kinni, nii et saal neid ei näe; harjutamiseks hoida aken tavavaates. Märkmed on saidil
  igaühele näha, kes N vajutab: sõnastus on omaniku muuta (`app/src/ui/et.ts`).
- **Aadress kannab slaidi numbrit** (`&slide=7`): lehe värskendamine, keelevahetus EN | ET ja edasi antud link avavad sama
  slaidi. Esitluse ajal võib brauseri aadressiriba seega rahulikult silmist lasta.
- **Slaid 8 (kaablid)** vajab kaht lisaseeriat (EstLink 2 väljas; EstLink 1 ja 2 väljas). Algvaates on need saidil
  eelarvutatud ja slaid ilmub kohe (D-221); muudetud eeldustel arvutab brauser need umbes 40 sekundiga ja lahtrites on
  seni „…“. Kui plaanis on slaid 8 näidata muudetud eeldustel, avada vaade Esitlus 2 varem ja lasta sel valmis arvutada.
- Saalis tasub näidata slaide 5 (stsenaariumid), 6 (hind ja mõju), 8 (kaablid), 10 (kapitalikulu) ja 11 (trilemma);
  1 ja 14 on raamiks. Slaidi 14 kutse energiamudel.ee avada eeldab, et parool on maha võetud (vt samm 9).
- **Slaid 12 (mudeli täpsus, D-223)** on vastus küsimusele „kui hea mudel on“ (K7–K9): valideerimise tunnihinna viga aastate
  ja riikide kaupa, loetud samadest tabelitest mis vaade Kalibreerimine (samm 8), nii et külmutamise järel on seal uued
  arvud ilma käsitsi muutmata. Slaidi sõnastus on omaniku kinnitada.
- **Slaid 13 (möödunud aastad, D-229)** näitab sama valideerimist joonistena, Eesti kohta: energiaallikad, hinna
  kestuskõver ning kuu keskmine ja mediaanhind, mudel pideva ja turg katkendliku joonega. Aasta valitakse slaidil
  nuppudega 2023, 2024, 2025; saidil on need kolm aastat eelarvutatud, muidu arvutab brauser aasta umbes minutiga.

**8. Kalibreerimine (20 s).** Vaade **Kalibreerimine**.
> „Mudel arvutab läbi aastad 2023–2025 tegelike tootmisparkide, ilma ja kütusehindadega. Tunnihinna
> viga on 9–18 €/MWh. 2026. aasta rida ulatub septembri lõpuni, 13,7 €/MWh.“

*Külmutamine (`make freeze`, oktoobri andmed) ei ole 10. novembri hommikuks jooksnud; kui see jookseb, lugeda tabelist
2026. aasta Eesti viga uuesti ja võrrelda slaidiga 5 (K11).*

**9. Lõpp (10 s).**
> „energiamudel.ee — avage see oma arvutis. Kõik eeldused on muudetavad ja iga arv on allikaga.“

*Sait on parooli taga (D-178): enne esitlust otsustada, kas parool võetakse maha või see lause jääb ära.*

## Kui midagi läheb valesti

- **Leht arvutab kaua** (kollane riba „Arvutatakse…“): eelmised arvud jäävad ekraanile hämardatult.
  Jätkata jutuga; arvutus lõpeb ise. Algvaatesse tagasi: aadress ilma `#s=…` lõputa.
- **Vale keel:** päise lüliti EN | ET (lippudega) või `?lang=et` aadressis.
- **Liiga kitsas aken** (tabel kerib külgsuunas): laiendada akent.
