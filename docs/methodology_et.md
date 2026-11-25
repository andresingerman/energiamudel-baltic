# Metoodika lühidalt

*Lühikokkuvõte ingliskeelsest metoodikast (`docs/methodology.md`, sakk „Täielik metoodika“),
seisuga 25. november 2026. Kui need kaks lahknevad, kehtib ingliskeelne; iga allpool oleva väite
valemid, allikad ja otsused on seal.*

## Mida mudel teeb

Mudel arvutab Eesti, Läti ja Leedu päev-ette turu tunnihinnad terveks aastaks. Igal tunnil leiab
see hinnad, mille juures pakkumine katab nõudluse kolmes riigis, kui on teada elektrijaamad, ilm,
ühenduste võimsused ja naabrite hinnad. Soomet, Rootsi SE4 piirkonda ja Poolat ei modelleerita
jaam jaama haaval: Balti riigid ostavad ja müüvad neile nende antud tunnihinnaga kuni liinide
võimsuseni.

Arvutus on lineaarplaneerimine. Iga nädal lahendatakse päev haaval: iga päev 48 tunni aknas (see
päev ja järgmine), millest jäetakse alles esimene päev. Nii näevad salvestid ja Daugava vesi ette
kaks päeva, mitte rohkem. Põlevkivijaamad sisenevad turule terve päeva kaupa: esimene arvutus
otsustab, millised plokid päeval töötavad, teine arvutab hinnad nende töötamisega. Lahendaja on
HiGHS, mis töötab otse brauseris; algvaade ja esitluse seisud on arvutatud saidi ehitamisel sama
mootoriga.

## Sisendid 2035. aasta stsenaariumis

- **Tootmispark ja tarbimine:** Eesti nagu Eleringi ja TalTechi baasstsenaariumis S1 (september
  2026), maismaatuul 1 300 MW ja päike 2 500 MW S1 1 244 ja 1 785 asemel (omaniku eeldus, D-182), Läti ja
  Leedu nagu ENTSO-E ERAA 2025-s. SMR-plokid (igaüks 315 MW, D-189) lisanduvad
  samale alusele: neljal stsenaariumil on sama alus ja need erinevad ainult plokkide arvu poolest (D-151).
- **Ilm:** kolm ilmaaastat 1995, 2008 ja 2009 kaaludega 0,233, 0,367 ja 0,400, nagu ENTSO-E;
  tuule ja päikese kasutustegurid PECD-st, tarbimise kuju TYNDP profiilidest. Tulemus on kolme
  aasta kaalutud keskmine.
- **Kütus ja CO₂:** ERAA 2025 trajektoor, 2035. aastal gaas 38,2 €/MWh soojust ja CO₂ 197,5 €/t.
- **Naabrid:** TYNDP 2024 Distributed Energy 2035. aasta hinnad samade ilmaaastate jaoks, nii nagu need on
  avaldatud, omaniku hinnatasemega: Soome ×1,88, Rootsi SE4 ×1,96, Poola ×2,10, keskmiselt 75, 90 ja 120 €/MWh
  (D-182, D-185, D-194). Stsenaariumi gaasi- ja CO₂-hind liigutavad ainult Balti jaamu: naabrite profiilide
  ümberhinnastamine on eemaldatud (D-194). Teised profiilid algavad ×1-st (D-190).
- **Ühendused:** merekaablid on nimivõimsusel koos tüüpilise käideldavusega ENTSO-E alalisvooluühenduste
  statistikast; maismaapiirid ERAA 2025 tunnipõhiste võimsustega; Leedu–Poola piir Litgridi plaani järgi,
  Harmony Link töös. EstLink 3 ja neljas Eesti–Läti liin on 2035. aastal väljas nagu S1-s.

## Pakkumised

- Tuul ja päike pakuvad 0 €/MWh eest ja neid saab piirata; tuumajaam töötab baaskoormusel.
- Soojusjaamad pakuvad oma lühiajalise kuluga: kütus jagatud kasuteguriga, CO₂ ja käitamiskulud.
- Eesti, Läti ja Leedu gaasijaamad pakuvad üht hinda: kombineeritud tsükliga jaama kütuse-, CO₂- ja
  käitamiskulud pluss lisa 42,5 €/MWh, mis on sobitatud aastate 2023–2024 tegelike hindadega; gaasi hind on
  alumise kütteväärtuse järgi, nagu ERAA kasutegurid (D-171).
- Akud laevad ja tühjenevad, kui hinnavahe ületab nende tsüklikulu; Kruonise toodang tunnis tuleb
  neljas võimsuse astmes, iga järgmine kallim; Daugava nädala vesi läheb kõige kallimatesse
  tundidesse oma vahemiku piires.

## Kontroll

Iga tegelik aasta alates 2020. aastast arvutatakse uuesti oma tootmispargi, tarbimise,
kütusehindade, ülekandevõimsuste ja naabrite hindadega ning võrreldakse tegelikkusega. Mõõdetavad
Balti hinnad ei ole kunagi sisend.

- [✗ täitmata] Mudel eksib tunnihinnas keskmiselt 9–12 €/MWh aastatel 2023 ja 2024 (sobitusaastad) ning 17–18
  €/MWh aastal 2025 (pimeaasta, mille põhjal midagi ei sobitatud). Spetsifikatsiooni lävend on 15.
  Valideerimise lävend on seega täitmata; omanik kiitis tulemused avaldamiseks heaks (D-123) ja leht
  „Kalibreerimine“ näitab iga kõrvalekallet.
- [✓ täidetud] EstLink 2 test on täidetud: 2024. aasta katkestus tõstis mudelis Eesti hinda 19,1 €/MWh, Eleringi
  hinnang oli umbes 18.
- [✓ täidetud] Brauseri mootor annab testnädalatel sama tulemuse kui sõltumatu Pythoni võrdlusmudel.

## Kuidas tulemusi lugeda

Tulemused on stsenaariumitulemused näidatud eeldustel, mitte prognoosid. Neli 2035. aasta
stsenaariumi (0, 1, 2 ja 3 SMR) arvutatakse koos ja näidatakse kõrvuti, igaüks oma
erinevusega juhtumist 0 SMR. Neli standardtundlikkust — omaniku neli LNG ja CO₂ hinnapaari (30/80,
45/95, 60/120 ja 75/150 €/MWh ja €/t, LNG alumise kütteväärtuse järgi) — on üks tabel, omaniku oma (D-195): iga
paari all gaasijaamade pakkumine, Eesti hind tuumaenergiata ning ühe kuni kolme plokiga, igaühe juures aasta osa, mil
hinna kujundas Balti gaasijaam, ning plokkide kohta hinnaalanduse kasu, hinnavahemehhanism ja tarbijate netokasu
aastas (D-183, D-184, D-187, D-188). Hinnavahemehhanismi rida arvutab riigi makse jaamaga arvutusest, nii et jaama
enda mõju hinnale on sees; sama arvutus on esitluse slaidil, mis näitab jaama kogukasu Eestile. Eraldi hinnavahe
lepingu kaarti mudeli vaates enam ei ole (D-294).

## Piirangud

- **Naabrid on hinnavõtjad.** Soome, SE4 ja Poola hinnad ei reageeri Balti voogudele. Kui jaam
  langetaks ka Soome hinda, langeks Eesti hind rohkem; ametlikus profiilis on see vahe väike,
  pingelistes profiilides suurem.
- **Puhast nappuse hinnakujundust pole.** Gaasijaamad pakuvad üht hinda (2035. aastal umbes 185 €/MWh);
  selle ja koormuse piiramise (4 000 €/MWh) vahel on mudelil vähe pakkumisi (Kruonise astmed, tarbimise
  juhtimine), reaalsel turul rohkem. Seepärast on mudeli päev kõige teravamatel päevadel lamedam kui
  tegelikkuses ja kõige kallimaid tunde on vähem.
- **Tarbimine ei reageeri hinnale** peale ERAA tarbimise juhtimise astmete.
- **Ette näeb kaks päeva.** Salvestid ja vesi teavad hindu kaks päeva ette kindlalt.
- **Tunnipõhine.** Turg on alates oktoobrist 2025 veerandtunnipõhine; mudel arvutab tunde.
- **Kruonist kasutatakse liiga vähe:** aastatel 2023–2025 mudelis kaks kuni kolm korda vähem kui tegelikult
  päev-ette turul.
- **Keskmine hind on mõne euro võrra madalam:** aastatel 2023–2025 2–6 €/MWh alla tegeliku, 2026. aastal kuni 7.

## Kust lugeda edasi

Täielik metoodika (inglise keeles) on selle vaate teisel sakil; iga väärtuse allikas on paneeli *i* nupu taga
ja sakil „Allikad“. Mudeli kood, andmed ja dokumendid on GitHubis avalikud.
