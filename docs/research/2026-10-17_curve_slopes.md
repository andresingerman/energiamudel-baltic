# How far the neighbours' and the Baltic price move per GW: Nord Pool's curves (2026-10-17)

## §0 The question and the method (written before the results)

**The owner's question (2026-10-17).** "is it
worth analysing the model with the curves now?", and, to the answer that began with Finland's slope:
"but we have Finland, Sweden, Poland and
the Baltic states".

**What the curves can say now.** D-108 collects Nord Pool's aggregated bid curves for the clusters
BALTIC (EE + LV + LT), FI, SE (Sweden's four areas together) and PL, to derive and cross-check R-SUP-6's
markup and R-BND-6's slope. R-BND-6 holds the boundary zones as price-takers (s = 0); its documented
value when enabled is 5 €/MWh per GW of Finland's net export, range 2–10, from the literature, "to be
re-estimated with its dispersion from the FI aggregated bidding curve"; SE4 and Poland have no estimate.
This note measures, from the curves alone, how far each cluster's price moves when its net demand
moves by a given volume: R-BND-6's slope for Finland, its like for Sweden and Poland, and the Baltic
market's own response as a benchmark for the model.

**The data.** Every curve file collected so far: delivery days 2026-10-08 … 2026-10-18, 96
fifteen-minute MTUs a day, four clusters (44 files, `data/raw/nordpool`, with lineage). The curves
themselves are never committed or published (D-108); this note gives statistics derived from them.

**The method** (`spikes/nordpool-curves/slopes.py`).
- Each MTU's supply curve gives the MW offered at prices up to x, its demand curve the MW bid at prices
  of x and above, each linear between its points; a volume offered or bid at one price counts at that
  price in full.
- The clearing price is the lowest price at which supply less demand reaches zero; with the cluster's
  net demand moved by Δ MW (more export from the cluster is more demand on its curve), the lowest price
  at which it reaches Δ. Found by bisection on −600 … 4 000 €/MWh.
- The slope is (p(+Δ) − p(−Δ)) / 2Δ, in €/MWh per GW, for Δ = 300, 500 and 1 000 MW: one SMR unit,
  about NordBalt or EstLink 2, and EstLink 1 + 2. The up and the down move are reported apart where they
  differ.
- The portal folds each cluster's realised net position and block volumes into its curves, so the
  shift holds every other border and every block fixed.

**What the numbers can and cannot mean** (fixed before the results).
- **An upper bound for a coupled zone.** In an hour when Finland's price equals Sweden's, a change in
  EstLink's flow is shared with Sweden through the open borders, and Finland's own curve overstates the
  move. The SE curve is the opposite case for SE4: when SE4 is split from SE3, SE4's own response is
  steeper than all Sweden's. Telling the hours apart needs October's zone prices (ENTSO-E A44), which the
  pipeline holds once October is a complete month.
- **October only.** Eleven autumn days; the winter's dear hours, where the slope is steepest and
  R-SUP-6's upper bins act, are not in them. No parameter of the model is changed on them.
- **Read against R-BND-6.** A median slope for Finland inside 2–10 €/MWh per GW keeps the documented
  range; outside it, the range is a candidate for revision at the winter's re-estimate (Proposed).

## §1 The results (delivery days 2026-10-08 … 2026-10-18; 1 056 MTUs a cluster)

The slope s is in €/MWh per GW of the cluster's net demand, its median with the 10th and 90th
percentile in brackets; up and down are the rise for +500 MW and the fall for −500 MW, per GW.

| Cluster | Clearing price | s ±300 MW | s ±500 MW | s ±1 000 MW | up / down ±500 | MTUs where a shift meets the cap or floor |
|---|---|---|---|---|---|---|
| FI | 31.9 [6.1–151.6] | 153 [23–739] | 298 [31–887] | 724 [174–2 000] | 547 / 55 | 317 |
| SE (all four areas) | 47.0 [8.4–135.6] | 117 [24–288] | 137 [26–519] | 355 [44–705] | 196 / 69 | 0 |
| PL | 131.6 [82.6–232.2] | 94 [22–281] | 113 [21–360] | 217 [41–566] | 90 / 69 | 31 |
| BALTIC (EE + LV + LT) | 107.4 [24.0–214.0] | 655 [204–1 063] | 838 [383–997] | 2 005 [1 201–2 300] | 1 394 / 222 | 871 |

The slope ±500 MW by the clearing price (MTUs in brackets):

| Clearing price | FI | SE | PL | BALTIC |
|---|---|---|---|---|
| below 20 €/MWh | 46 (275) | 25 (211) | 206 (31) | 291 (77) |
| 20–50 | 298 (504) | 100 (341) | 126 (16) | 495 (224) |
| 50–100 | 585 (99) | 184 (299) | 213 (96) | 703 (197) |
| 100 and above | 969 (178) | 509 (205) | 96 (913) | 889 (558) |

The same in megawatts: what each cluster gains, supply up and demand down, between its clearing price
and 100 €/MWh above it — the Baltic cluster 134 MW at the median [P10 89 – P90 295], Finland 345
[140–769], Sweden 505 [266–1 060], Poland 756 [319–1 661].

A check on one MTU (15 October, 12:00 EEST): Finland cleared at 7.6 €/MWh, and from there to 107.6 its
supply rises by 750 MW and its demand falls by 60; the Baltic cluster cleared at 83, and from there to
183 its supply rises by 108 MW and its demand falls by 54. The bisection reproduces hand-made curves,
blocks on either side included (`self_check`).

## §2 Reading

- **Every cluster is steep once its borders are held fixed:** from about 100 €/MWh per GW in Poland and
  Sweden to 300 in Finland and 840 in the Baltic states, at the median, and steeper the higher the
  price. With its net import fixed, the Baltic market gains about 130 MW (90–300) between its price
  and 100 €/MWh above it.
- **The move is one-sided.** Adding demand lifts the price five to ten times as far as removing the
  same demand lowers it (Finland 547 against 55 €/MWh per GW). A linear slope, R-BND-6's form, fits
  neither side.
- **These are not R-BND-6's slope.** The documented 5 €/MWh per GW (2–10) is the response with the
  borders open, when Sweden absorbs most of a change in EstLink's flow; the curves give the response
  with the borders shut, as §0 set out. What a zone's price does in a given hour therefore turns on
  whether its own borders are congested in that hour, more than on its curve.
- **For the model:** its boundary zones are price-takers (s = 0), right for hours when the boundary
  zone is coupled with its wider market. In hours when the boundary zone is itself cut off (Finland
  from Sweden, SE4 from SE3, Poland under its allocation constraint), the curves say its price would
  move by tens to hundreds of €/MWh per GW of Baltic trade, and the model moves it by none. How many
  such hours there are decides whether this matters.

## §3 What follows (Proposed; no parameter changes)

1. **November, once October is a complete month** (`make history`): October's zone prices (A44) mark
   each MTU as coupled or cut off — Finland against SE1 and SE3, SE4 against SE3, the Baltic zones
   against each other and their neighbours. Then: the share of cut-off hours per zone and the slope
   within them, which together are the measured R-BND-6 (Finland) and its candidates for SE4 and
   Poland; and the model's replay of October against the Baltic curve in the hours the three Baltic
   prices are equal.
2. **After the winter (December–February):** the same measures on the dear hours, where R-SUP-6's
   upper bins act, and only then any proposal to change R-BND-6's value or form, or to give SE4 and
   Poland a slope (a specification revision, the owner's decision).

## §4 The second round (planned 2026-10-17, written before its results)

The owner, the same day: "plan the
work and start it; there is no time limit". §3 assumed October's zone prices would tell coupled hours
from cut-off ones; v5 holds no prices for SE1–SE3, so the history comes from v4's cache, read-only and
checked against its lineage (D-002), which holds every zone's A44 to August 2026.

- **A. How often each neighbour is cut off** (`coupling.py`), 2020-01 … 2026-08, hour by hour: Finland
  is with its market when its price equals SE1's or SE3's; SE4 when it equals SE3's; Poland when it
  equals a neighbour's (DE, CZ, SK, LT, SE4); and the Baltic links the same way (EE–FI, EE–LV, LV–LT,
  LT–SE4, LT–PL). Equal means within 0.01 €/MWh. Shares by year, by month since the second Aurora
  Line connection (2025-11-13), by direction (the zone dearer or cheaper than its market) and by the
  zone's price.
- **B. The slopes by direction** (`slopes.py`). A Baltic plant that exports more lowers its neighbour's
  price: the down move is the one an SMR makes, the up move the one a Baltic shortage makes. For Finland
  also the slope with all Sweden open (the FI and SE curves added together), a lower bound beside
  Finland's own, an upper bound. With A's shares since the Aurora Line, a band for R-BND-6's slope,
  read against its 5 €/MWh per GW (2–10).
- **C. Demand.** What the Baltic and Finnish demand curves withdraw between the clearing price and 100,
  500 and 3 000 €/MWh above it, against R-DEM-6, which gives the model no demand elasticity beyond its
  DSR bands (EE 2035: 260 MW at 2 000 €/MWh).
- **D. Prepared now, run in November.** R-SUP-6 asks for its markup to be cross-checked against the
  Baltic aggregated supply curve for a sample of days. `model_stack.ts` reads the model's own Baltic
  supply stack out of the engine's problem hour by hour; tested now on September 2026, run on October
  once `make history` holds it.
- **E. Housekeeping.** D-122 for the 2026-10-13 deploy (AGENTS.md: a decision record is not edited);
  whether the curves are in a backup.

Every result is a number in this log; a change to a parameter, to R-BND-6's form or to the
specification is Proposed and the owner's.

## §5 The second round's results

**A. How often the neighbours are with their market.** Exact equality of prices, the test that works
before the Nordic flow-based go-live (2024-10-29):

| Coupled, share of hours | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 (to August) |
|---|---|---|---|---|---|---|---|
| FI with SE1 or SE3 | 56% | 72% | 59% | 79% | 57% | 12% | 11% |
| SE4 with SE3 | 71% | 56% | 79% | 74% | 58% | 4% | 8% |
| PL with DE, CZ, SK, LT or SE4 | 20% | 41% | 30% | 33% | 37% | 22% | 11% |
| EE with FI | 67% | 60% | 62% | 46% | 33% | 27% | 32% |
| EE with LV | 95% | 95% | 75% | 93% | 97% | 79% | 57% |
| LV with LT | 98% | 93% | 96% | 98% | 99% | 98% | 94% |

Under flow-based, neighbouring prices part by a little in most hours, the domain binding somewhere, so
exact equality no longer tells coupled hours from cut-off ones: before the go-live in 2024, the gap
between Finland and the nearer of SE1 and SE3 is either nil (67 % of hours) or large; after it, it
spreads (median 1.15 €/MWh before the second Aurora Line, 0.61 since). The hours since the second Aurora
Line (2025-11-13 … 2026-08-31, 7 008 hours) are therefore classed by the gap — within 2 €/MWh (with its
market), 2–10, 10 and more (cut off):

| Price of the zone | Finland: gap < 2 / 2–10 / ≥ 10 | dearer than Sweden by ≥ 10 | SE4 against SE3: < 2 / 2–10 / ≥ 10 | dearer by ≥ 10 |
|---|---|---|---|---|
| below 20 €/MWh | 88 / 10 / 2 % | 0 % | 90 / 10 / 0 % | 0 % |
| 20–50 | 59 / 27 / 14 % | 2 % | 44 / 41 / 15 % | 15 % |
| 50–100 | 46 / 26 / 28 % | 14 % | 32 / 21 / 48 % | 48 % |
| 100 and above | 32 / 16 / 52 % | 42 % | 31 / 10 / 59 % | 59 % |
| all hours | 61 / 19 / 20 % | 12 % | 43 / 17 / 40 % | 40 % |

- When Finland is dearer than both SE1 and SE3 by 10 €/MWh or more, it is so by 34.6 €/MWh at the
  median (P90 96.8): as far as a Baltic surplus could lower Finland's price before Sweden takes the rest.
- Poland's allocation constraint (D-076) binds in 32 % of these hours, parting its price from the Core
  price by 11.9 €/MWh at the median where it binds.
- **The dear hours are the cut-off hours.** Above 100 €/MWh, Finland is cut off from Sweden in about
  half the hours and SE4 from SE3 in three of five, each dearer than its market.

**B. The slopes by direction** (October 2026; €/MWh per GW, median [P10–P90]):

| Cluster | down ±300 MW | down ±500 | down ±1 000 | up ±300 | up ±500 | up ±1 000 |
|---|---|---|---|---|---|---|
| FI | 78 [9–406] | 55 [8–271] | 31 [5–151] | 215 [32–993] | 547 [53–1 477] | 1 422 [337–3 942] |
| SE | 79 [9–207] | 69 [7–192] | 42 [5–125] | 153 [33–386] | 196 [44–856] | 663 [82–1 293] |
| PL | 72 [11–260] | 69 [11–278] | 56 [14–436] | 88 [16–294] | 90 [21–491] | 248 [22–1 108] |
| BALTIC | 308 [56–599] | 222 [38–430] | 197 [25–797] | 1 001 [345–1 566] | 1 394 [671–1 613] | 3 850 [2 328–3 959] |
| FI with all Sweden | 41 [4–152] | 39 [3–148] | 33 [3–118] | 75 [8–205] | 90 [9–268] | 161 [18–512] |

By Finland's own clearing price, ±500 MW, down / up:

| Finland's price | MTUs | Finland alone | Finland with all Sweden |
|---|---|---|---|
| below 20 €/MWh | 275 | 14 / 71 | 10 / 28 |
| 20–50 | 504 | 55 / 548 | 39 / 88 |
| 50–100 | 99 | 109 / 1 069 | 107 / 185 |
| 100 and above | 178 | 288 / 1 594 | 150 / 300 |

- Adding the SE curve to Finland's lowers its slope by about 30 % (down) and over 80 % (up), yet
  leaves it 8 (down) to 18 (up) times R-BND-6's 5 €/MWh per GW. The curves collected hold Norway, Denmark, Germany
  and the rest fixed — Norway's reservoirs above all — so even "Finland with all Sweden" is no open
  border: the curves cannot measure the coupled response, only the cut-off one.
- Weighting each MTU by the classes of A at its price (open: Finland with all Sweden; cut off:
  Finland alone; 2–10 either way) gives 74–80 €/MWh per GW for a Baltic surplus (median 42–46) and
  283–404 for a Baltic shortage (median 149–285), an upper bound by the bullet above.

**C. What the curves give above the clearing price**, MW, median [P10–P90]:

| Cluster | supply added to +100 €/MWh | to +500 | demand withdrawn to +100 | to +500 | to the cap |
|---|---|---|---|---|---|
| FI | 236 [67–636] | 405 [181–868] | 110 [52–193] | 266 [198–373] | 499 [393–638] |
| SE | 448 [174–955] | 565 [268–1 148] | 69 [37–124] | 273 [227–334] | 626 [555–734] |
| PL | 545 [202–1 417] | 707 [314–1 536] | 162 [50–435] | 523 [242–903] | 600 [279–1 157] |
| BALTIC | 88 [54–199] | 243 [178–384] | 40 [20–121] | 150 [119–241] | 334 [297–425] |

The Baltic demand gives up about 40 MW in the first 100 €/MWh above its price and 330 MW before the
cap, some of it the stores' charging; the model's demand gives up none (R-DEM-6: no demand elasticity
beyond the DSR bands, none in a replay).

**D. Prepared.** `model_stack.ts` on 2026-09-20 … 30 (264 hours, the three Baltic prices equal in
142): the model's own offers add 17 MW to +100 €/MWh above Lithuania's price at the median, 275 MW in
the hours the three prices are equal; their demand withdraws nothing; the stores could still give 975
MW and the Daugava 415 at the median. It is September against October, so no comparison is drawn:
the same measures on the same hours come with October's data.

**E.** D-122 records the deploy of 2026-10-13 as its own decision. **No backup holds the curves:** Time
Machine has no destination on this Mac, the repository's folder ends in `.nosync`, which iCloud does not
sync, and the spool lives in ~/Library. The files cannot be fetched again (D-108).

## §6 Reading (Proposed)

1. **R-BND-6's form does not fit the neighbours.** A single linear slope, the same in every hour and
   both ways, describes a price that hardly moves in most hours, when the neighbour is with its
   market, and moves by tens to hundreds of €/MWh per GW in the dear hours, when it is cut off — and
   five to ten times further up than down.
2. **What the model misses is a floor and a ceiling, not a slope.** When Finland is dearer than Sweden
   (12 % of the hours, 42 % above 100 €/MWh), a Baltic surplus lowers Finland's price toward Sweden's —
   by up to 35 €/MWh at the median — and Sweden takes the rest; the same holds for SE4 against SE3 (40 %
   of the hours, 59 % above 100 €/MWh). A boundary with two levels — the neighbour's price, then its
   market's price behind the cut-off flow — would carry this; it needs the market's price (SE1/SE3: A44
   for replays, TYNDP's SE01/SE03 for the climate years) in the year files: a change of D-002's data
   scope and of R-BND-6, the owner's decision.
3. **It is D-121's fixed-profile error.** A profile held fixed overstated Estonia with three SMR by up to
   7.6 €/MWh; the curves say why: the plant's exports meet a neighbour that is cut off in the dear hours.
4. **Next, in November:** October's data (`make history`, `make export`) — the curves' clearing
   price against the published one (FI, PL), the October classes, and the model's Baltic stack against
   the Baltic curve on the same hours (R-SUP-6's cross-check). The winter's curves then carry the same
   measures to the dear hours.
5. **Where it matters: the tight views, not the opening one.** In TYNDP's DE 2035 market model, the
   opening profile's source (the node prices before re-pricing, `nb2035_cy*.json`), Finland is within
   2 €/MWh of SE1 or SE3 in 81–86 % of the hours of each climate year, and never dearer than both by
   10 €/MWh or more; it is cheaper by that much in 9–13 % (a windy Finland exporting to its limit), and
   SE4 parts from SE3 by 10 €/MWh or more in 14–19 %. The two-level boundary would change the opening
   view little. It bears on the tight profiles, where Finland is short and cut off — and there D-121's
   coupled runs already measure it, Finland's own market modelled (`docs/research/
   2026-10-12_sweden_poland_2035.md` §8). No prototype is built now.
