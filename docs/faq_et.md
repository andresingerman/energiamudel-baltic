# Küsimused ja vastused

*Lühendatud eestikeelne tõlge ingliskeelsest küsimuste ja vastuste lehest (`docs/faq.md`),
seisuga 24. november 2026. Kui need kaks lahknevad, kehtib ingliskeelne. Metoodika lühikokkuvõte on
sakil „Metoodika lühidalt“, täielik metoodika on inglise keeles.*

*Valideerimise lävend (R-PUB-4): R-VAL-5 on täitmata — aastate 2023–2024 valideerimisarvutused
eksivad tunnihinnas keskmiselt 9–12 €/MWh ja pimeaastal 2025 17–18 €/MWh, lävend on 15; EstLink 2
test R-VAL-6 on täidetud. 2026. aasta jaanuarist oktoobrini (lävendita aasta) on viga Eestis 14,9,
Lätis 11,5 ja Leedus 10,7 €/MWh. Omanik kiitis tulemused, sealhulgas tuumajaama omad,
avaldamiseks heaks 17. oktoobril 2026 (D-123); lävend jääb eesmärgiks ja leht „Kalibreerimine“
näitab iga kõrvalekallet.*

## Kui hea see on?

Seda näitab vaade „Kalibreerimine“. Iga tegelik aasta alates 2020. aastast arvutatakse uuesti selle
enda tootmispargi, tarbimise, kütusehindade, ülekandevõimsuste ja naabrite hindadega ning võrreldakse
sellega, mis tegelikult juhtus; mõõdetavad Balti hinnad ei ole kunagi sisend. Mudel eksib tunnihinnas
keskmiselt 9–12 €/MWh aastatel 2023 ja 2024 ning 17–18 €/MWh aastal 2025, samas kui spetsifikatsiooni
lävend on 15. 2026. aasta jaanuarist oktoobrini on viga Eestis 14,9 ning Lätis ja Leedus 11,5 ja 10,7 €/MWh;
mudeli keskmine on turu omast Eestis 6,6 ja Lätis ja Leedus 4,5 €/MWh madalam, Eestis peamiselt tundidel, mil mudel
eraldab Eesti hinna Läti omast ja turg mitte. Suurimad on vead kõige kallimatel tundidel. Mudel kordab 2024. aasta EstLink 2 rikke mõju
Eesti hinnale: +19,1 €/MWh, Eleringi hinnang oli umbes 18.

## Miks on naabrite hinnad profiilist kõrgemad?

Tasemed 75, 90 ja 120 €/MWh on omaniku eeldus, mitte ühegi allika tulemus: ENTSO-E profiil annab Soomele, SE4-le ja
Poolale 2035. aastaks 39,9, 45,9 ja 57,2 €/MWh. Põhjenduse annavad esitluse slaidid 6–8: igas riigis tulemas
andmekeskused ja uued tööstuskoormused põhivõrguettevõtjate kavade ja liitumisjärjekordade järgi, iga arv lingitud
oma dokumendiga. Need näitavad nõudluse suunda, mitte hinnamuutuse suurust: hind tõuseb ainult siis, kui tootmise
ehitus jääb nõudlusest maha, ja seda slaidid ei näita. Võrdluseks 2026. aasta turg (1. jaanuar – 25. november): Soome
58,4, SE4 104,3, Poola 131,5 €/MWh. Avaldatud profiiliga oleks Eesti hind ilma tuumajaamata 66,8 €/MWh, mitte 108,1,
ja jaama mõju väiksem: kaks plokki langetavad hinda 16,0 €/MWh, mitte 22,1, ja nende hinnavahe leping maksab riigile
umbes 204 miljonit eurot aastas, mitte 15.

## Kust tulevad naabrite hinnad?

Soomet, Rootsi SE4 piirkonda ja Poolat ei modelleerita jaam jaama haaval. Nende tunnihinnad tulevad
ENTSO-E turumudelist valitud stsenaariumi ja ilmaaasta kohta — TYNDP 2024 Distributed Energy või Global
Ambition 2035 või TYNDP 2026 National Trends+ 2035 — ja igaüht saab korrutada hinnataseme teguriga.
Balti riigid ostavad ja müüvad neile nende hindadega kuni liinide võimsuseni. Loendis on ka kaks
profiili mudeli enda uuringust: naabrite hinnad 2035. aastal, kui tarbimine kasvab ja ehitus jääb maha.
Need on tingimuslikud juhtumid, mitte prognoosid.

Naabrite hinnad tuginevad teistele gaasi- ja CO₂-hindadele kui need, mida maksavad Balti jaamad. Mudel võtab
naabrite profiilid nii, nagu need on avaldatud, korrutatuna hinnatasemega: stsenaariumi gaasi- ja CO₂-hind
liigutavad ainult Balti jaamu (D-194, omaniku otsus). Märkeruut, mis viis naabrite gaasi- ja CO₂-tunnid stsenaariumi
hindadele (D-079 kuni D-194), on eemaldatud.

## Mis on 2035. aasta neli stsenaariumi?

*0 SMR* on baasjuhtum: Eesti tootmispark ja tarbimine nagu Eleringi ja TalTechi
baasstsenaariumis S1 (september 2026), selle püsivõimsus gaasijaamadena, Läti ja Leedu omad nagu
ENTSO-E ERAA 2025-s. Kaks muudatust on omaniku omad (D-182, 27.10.2026): Eesti maismaatuul 1 300 MW ja päike
2 500 MW S1 1 244 ja 1 785 asemel ning naabrite hinnad tõstetud hinnatasemega keskmiselt 75, 90 ja 120 €/MWh-ni
(Soome ×1,88, Rootsi SE4 ×1,96, Poola ×2,10 avaldatud profiili suhtes, mille keskmised on 39,9, 45,9 ja 57,2;
kaks viimast seadis D-185, avaldatud profiilile viis D-194). Hinnatasemed kuuluvad ainult sellele profiilile,
TYNDP 2024 Distributed Energy 2035: kõik teised loendi profiilid algavad ×1-st, nagu need on avaldatud või uuringus
ehitatud, ja liigutatud hinnatase kandub neile sama suhtega (D-190). Paneel näitab iga hinnataseme kordajat avaldatud profiili suhtes selle kasti kõrval (▲ ×1,88) ning kolme liuguri all rida, mis märgib need omaniku hinnatasemeteks ja annab avaldatud profiili keskmised (D-231), ja kahe liuguri juures S1 enda arve. *1 SMR*, *2 SMR* ja *3 SMR* on sama alus, millele on lisatud üks, kaks või kolm
315 MW tuumaplokki — BWRX-300 brutovõimsus omaniku valikul (D-189); neto võrku umbes 300 MW. Neljal stsenaariumil on sama alus ja need erinevad ainult plokkide arvu poolest
(D-151). Kõik neli arvutatakse koos samade seadetega ja näidatakse kõrvuti, igaüks oma erinevusega
juhtumist *0 SMR*.

## Milliseid ilmaaastaid kasutatakse ja miks kolme?

Mudel arvutab aastad 1995, 2008 ja 2009 — ilmaaastad, mida ENTSO-E oma stsenaariumides kasutab — ja
kaalub neid 0,233, 0,367 ja 0,400-ga nagu ENTSO-E; põhitulemus on kaalutud keskmine ja iga aasta näitaja
on selle kõrval. Aastad erinevad: 2009 oli 38 aasta seas Eesti maismaatuulele kõige vaiksem, 1995 ja
2008 kõige tuulisemate seas. Naabrite turumudeli hinnad on olemas ainult nende kolme aasta kohta. Vaade
„Ilm“ selgitab valikut ENTSO-E sõnadega.

## Miks mudel ei näita kunagi negatiivset hinda?

Tuul ja päike pakuvad oma toodangut 0 €/MWh eest, mis on nende käitamiskulu; mudel ei arvesta toetusi
ega lepinguid, mille tõttu mõni tootja müüb alla nulli. Tund, kus tuult ja päikest on rohkem, kui keegi
saab vastu võtta, saab hinnaks 0 ja ülejääk piiratakse.

## Kuidas akud töötavad?

Aku ostab elektrit odavatel tundidel ja müüb kallitel. Mudel laeb ja tühjendab akut seal, kus see süsteemi kulu
vähendab, nähes ette käesolevat ja järgmist päeva, nelja reegli järgi:
- aku liigutab energiat ainult siis, kui kahe tunni hinnavahe katab kaod — aku annab tagasi 85 % laetust — ja
  tsüklikulu 71,5 €/MWh ehk kulumise; see on sobitatud nii, et Eesti akud tühjenevad 2026. aasta
  valideerimisarvutuses sama palju kui tegelikult;
- kõige rohkem 1,5 täistsüklit päevas;
- sagedusreservideks (FCR ja aFRR) müüdud võimsus on igal tunnil päev-ette turult väljas;
- aku mahutab kahe tunni võimsuse, nii et see liigutab energiat päeva või kahe piires, mitte tuuliselt nädalalt
  vaiksele.

2035. aasta stsenaariumides on Eestis 1 500 MW akusid (3 000 MWh; Eleringi ja TalTechi S1), Lätis 420 MW ja Leedus
1 750 MW (ERAA 2025). Paneeli liuguritega saab muuta megavatte, tsüklikulu ja kasutegurit. Kruonise
hüdroakumulatsioonijaam Leedus töötab samal põhimõttel, tsüklikuluga 60 €/MWh.

## Kuidas arvestab mudel ühenduste võimsust, mis on sünkroniseerimise järel hoitud tasakaalustamiseks?

Alates 9. veebruarist 2025 töötavad Balti riigid sünkroonis Mandri-Euroopaga ja alates 5. veebruarist 2025 ostavad nad
tasakaalustamisvõimsust ühiselt Balti turul. Seetõttu hoitakse osa Eesti–Läti ja Läti–Leedu vahelduvvooluliinide
võimsusest tasakaalustamisenergia vahetamiseks ja seda päev-ette turule ei pakuta. Mudel arvestab seda kahel viisil:
- **Möödunud aastad:** igal piiril on tund tunni kaupa võimsus, mida põhivõrguettevõtjad pakkusid päev-ette turule
  (ENTSO-E A31) ja mis sisaldab juba rikkeid ja muid piiranguid. Eesti–Läti avaldatud arvus on tasakaalustamiseks
  eraldatud võimsus veel sees, nii et mudel lahutab selle tund tunni kaupa Balti läbipaistvusplatvormi (BTD) andmetest
  (perioodide keskmisena 265–325 MW); turu enda graafik peatub just selle madalama arvu juures. Läti–Leedu avaldatud
  arvus seda enam ei ole ja midagi ei lahutata.
- **2035. aasta stsenaariumid:** igal piiril on ERAA 2025 selle aasta tunnipõhine võimsus, millest on lahutatud 2025.
  aasta keskmine tasakaalustamiseks hoitud osa: Eesti–Lätil 265 MW ja Läti–Leedul 272 MW. Ilma Läti–Leedu reserveeringuta
  on hinnad samad 0,1 €/MWh täpsusega: see piir 2035. aastal ei piira.

Liinide kõrval hoitakse turult väljas ka reservid ise: igal tunnil ei pakuta päev-ette turule ülesreguleerimise reservi
(FCR, aFRR ja mFRR; 2026. aastal kolmele riigile umbes 28, 96–120 ja 580–604 MW, Elering) — akud hoiavad kiiret reservi,
soojusjaamad ülejäänut. Paneelis saab selle välja lülitada. Mudel ei arvuta ise stabiilsuse piire (inerts, suurim
üksik kadu): see võtab põhivõrguettevõtjate avaldatud võimsused, ja iga liini saab paneeli ühenduste kaardil piirata
või välja lülitada.

## Mis on standardtundlikkused?

Neli varianti, mis arvutatakse taustal: stsenaariumid omaniku valitud nelja LNG ja CO₂ hinnapaari juures
(D-183), kõik muu sama, igaüks neljas stsenaariumis (0–3 SMR) (D-184).

| | LNG, €/MWh soojust | CO₂, €/t |
|---|---|---|
| (1) | 30 | 80 |
| (2) | 45 | 95 |
| (3) | 60 | 120 |
| (4) | 75 | 150 |

LNG hinnad on gaasi alumise kütteväärtuse MWh kohta, nagu paneeli gaasiväli neid võtab (D-192). Balti
gaasijaamad pakuvad nende hindade järgi: tabeli päises on nende ühine pakkumine hinnapaari juures, 127, 159, 195 ja
233 €/MWh (D-187). Naabrite hinnad jäävad põhitulemuse omadeks (D-194).

D-195-st on neli üks tabel, omaniku oma: veerg iga hinnapaari kohta selle LNG, CO₂ ja pakkumise all; Eesti hind
tuumaenergiata ning ühe kuni kolme plokiga, nimetatud nende aastatoodangu järgi, igaühe juures aasta osa, mil hinna
kujundas Balti gaasijaam; ning plokkide kohta, mida hinnaalandus ja leping aastas väärt on (D-188): Eesti keskmise
hinna langus võrreldes *0 SMR*-iga sama hinnapaari juures korrutatuna tarbimisega 11,6 TWh — nii palju maksavad
tarbijad börsil vähem; mida riik hinnavahelepingu järgi lepinguhinnaga saab või maksab; ja nende summa, tarbijate
netokasu. Hind on tundide keskmine, koormusega kaalumata.

## Kust number pärineb?

Paneeli igal väärtusel on *i* nupp, mis nimetab selle allika — API päringu või dokumendi ja lehekülje —
ja viib vaatesse „Allikad“. Repositoorium hoiab iga laaditud faili päritolukirjet ja viitab iga
dokumendist võetud väärtuse puhul selle leheküljele.

## Kes selle tegi?

Andres Ingerman

Fermi Energia Head of AI and Digital communication

andres.ingerman@fermi.ee
