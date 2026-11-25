# Data centres and new industrial loads in the six countries (2026-11-04)

The research behind the Statistics page's *Data centres* and *Industry* tabs (DECISIONS D-214). The owner asked for
both tabs on 2026-11-04 ("add data centers and industry too"). Asked what they should show, the owner chose:
- **Data centres:** a table by country of consumption, connection requests, what is firm and the operators' plans.
- **Industry:** the new industrial loads, meaning hydrogen, e-fuels, steel and electric heat, rather than industry's
  consumption.
- **Sources:** anything reachable ("you have full access to the internet, APIs and so on").

Four searches covered the work: data centres and new industry, each for the Baltic states and for Finland, Sweden and
Poland. They began from the review of 29 October 2026 in the untracked `reports/` folder and checked it against the
primary documents.

Every figure on the two tabs is a row of `data/documentary/parameters.csv` (`statistics.dc.*`, `statistics.ind.*`).
Each has the page it was read on and a record in `verification.csv`. The document behind it is cached by
`pipeline/sources/documents.py` with its lineage record. A figure was taken only after a script found the quoted phrase,
and the value inside it, on the cited page of the cached copy. A sum (Latvia's and Poland's lists, Sweden's industry
applications) was recomputed from the cached table. The model's own research rows (`se2035.*`, `pl2035.*`, D-121) appear
beside them as they stand.

## What the figures are, and are not

- **A connection request is not demand.** Queues run far ahead of what gets built:
  - Finland has about 100 GW of data-centre enquiries against nearly 5 GW of agreements and some 360 MW in operation.
  - Poland has 9.2 GW of conditions issued for data centres and no agreement.
- **A figure in MW is a capacity, not a year's load.** It is the capacity at the connection point (or a plant's
  nominal power).
- **Eurostat's data-centre statistics are new.**
  - *Electricity consumption of data centres* (`isoc_env_ict_nrg`, NACE data centres) has figures for Finland, Sweden
    and Poland, and for Latvia (7.8 GWh) and Lithuania (17.3 GWh) from 2024 only.
  - Estonia reports 0 for every year, which reads as "not reported". The page leaves Estonia's row out and says so.
  - Latvia's and Lithuania's first figures are far below what one operating site would use (Delska's 10 MW in Riga).
    They probably count only part of the consumption.
- **Dates differ by row.** Each row carries its own as-of date: a queue is a snapshot (AST 13.09.2026, PSE 30.09.2026,
  Svenska kraftnät 01.10.2026), a plan its publication.

## By country

- **Estonia.**
  - **Elering:** the demand forecast of its 2026–2035 plan (10 TWh in 2030) leaves new energy-intensive industry out
    (p. 44), and its grid analysis leaves possible new data centres at Harku, Kiisa and Aruküla out (p. 96). Elering
    publishes no consumers' queue.
  - **The 2,900 MW** of data-centre requests (seven projects, end of September 2026) is known only from the press
    (Ehitusuudised).
  - **The government's cabinet agenda of 22 October 2026** gives Enterprise Estonia's estimates. About 300 MW is "more
    likely to be built" and up to 1,000 MW is every plan. These are estimates, not contracts.
  - **Greenergy's first 22 MW hall at Harku** is the company's own figure.
  - **Hydrogen:** Elering's voluntary survey of 2025 counts 13 projects, about 760 MW of electrolysers by 2035, were
    every one built. BHG-Estonia's 15 MW at Sillamäe has state aid but no investment decision.
  - **Not taken:** Elering's reported 250 MW of data-centre contracts sits behind Postimees's paywall and could not be
    checked.
- **Latvia.**
  - **Data centres:** AST's connection table (the Internet Archive's copy of 13.09.2026; ast.lv refuses the fetcher)
    shows 1,560 MW of requests. Of these, 550 MW (Latvenergo at Riga's CHP-2) is reserved, and none has reached an
    agreement. Delska's 10 MW in Riga opened in April 2026.
  - **Hydrogen:** CIS Liepaja's 1,000 MW is reserved at technical conditions.
  - **Electric heat:** two district-heating loads are in commissioning, 75.5 MW together.
  - **AST's forecast** (2026 report) adds hydrogen plants as a column of their own: 1,300 GWh in 2035 in the base
    scenario. It has no data centres.
  - **Not taken:** Utilitas's two rows labelled "hydrogen production" (299 MW) match a wind and battery project on the
    same line and were left out.
- **Lithuania.**
  - **Litgrid's plan 2026–2035** is the one Baltic TSO plan that counts data centres: 1.4 TWh in 2030 and 2.8 in 2035
    in the national scenario. It also counts new industry from its letters of intent: 3.2 TWh and 615 MW of peak in
    2035.
  - **Electrolysis in Litgrid's plan:** 16.7 TWh in 2035 in the national scenario, from the market's surveys. Its
    slower scenario, the plan's headline, has 0.67 GW of electrolysers, from the connection conditions issued.
  - **Kruonis DC:** a letter of intent for up to 200 MW.
  - **Achema's 171 MW electrolyser** has state aid (2024) and no investment decision found.
  - **Not taken:** Klaipėda's 2.25 MW electrolyser is in operation, but the port's site refuses the fetcher.
- **Finland.**
  - **Data centres:** Fingrid's Q3/2026 forecast gives about 100 GW of non-binding enquiries. Fingrid's news of
    18.08.2026 gives nearly 5 GW of signed agreements, the distribution networks' included.
  - **Fingrid's planning case (High Growth)** has 18 TWh of data centres in 2030 and 35 in 2035. Industry other than
    data centres, hydrogen and e-fuels included, rises from about 36 TWh in 2025 to 44 in 2030 and 62 in 2035.
  - **Electrolysers:** P2X Solutions' 20 MW at Harjavalta is the one of industrial scale in operation. Neste withdrew
    its 120 MW at Porvoo.
  - **Electric boilers:** over 3 GW under construction or in operation, mostly for district heating.
  - **Google (added 2026-11-23, D-268):** a 22-year power purchase agreement with Fortum of 9 September 2026 for up
    to 50 % of the Loviisa nuclear plant's capacity — from 2028 at a smaller share, 50 % in 2030–2049; the plant is two
    reactors of 507 MWe, about 8 TWh a year, so about 507 MW and 4 TWh (the energy an estimate, not the contract's).
    It secures the plant's life extension to 2050 (about 1 bn €, 700 M€ of it undecided before) and enables 10 MW of
    uprate beside 38 MW under way: existing generation, not new. Google announced 13 bn € for 2027–2028 at Hamina,
    Kajaani, Muhos and Vaala and publishes no megawatts for the sites (press: nine halls at Muhos, eight at Kajaani, up
    to four buildings at Vaala; its own study models an illustrative 1 GW). The supervisory authority halted the
    preparatory works at Muhos and Kajaani in October 2026 until the environmental assessments are done (press).
  - **Arctial (added 2026-11-23, D-267):** the aluminium smelter planned at Kokkola needs about 1 050 MW of steady
    electrical load for some 610 000 tonnes a year (its environmental impact assessment's report of 28 May 2026,
    pp. 26, 61). No investment decision; whether Fingrid's High Growth counts it is not stated.
  - **The large projects planned (added 2026-11-23, D-264, corrected D-266):** twelve, 4 345 MW of final capacity
    together: 1 857 MW with building begun (Microsoft's three sites 615, atNorth's Myllykoski 430, XTX Markets' Kajaani
    250, Mikkeli 212, Utajärvi 200, Hyperco's Kouvola 150), 128 MW with an investment decision (Lahti), 2 360 MW in
    planning or studies (Seinäjoki, Järvenpää, Rovaniemi, Forssa, Lappeenranta).
    - The megawatts are a campus's final capacity, built over years: 2027 brings first phases (Kouvola 50 MW, Lahti 50,
      a building at Myllykoski; Kajaani's first 22.5 MW of IT power is due in 2026). Fermi Energia's fact-check of
      14.11.2026 found a chart of seven such projects read as 1 858 MW completing in 2027.
    - Sources: the environmental impact assessments for Microsoft (Vihti 265, Espoo 200, Kirkkonummi 150 MW of
      electrical power; a chart gave Kirkkonummi 250 and the trade agency's table 480 for the three), the companies'
      releases for atNorth, XTX Markets and AmpTank, a report of the study TikTok and Hyperco commissioned, and Germany
      Trade & Invest's table of 28 August 2026 for the rest.
- **Sweden and Poland, project by project (added 2026-11-23, D-279), for the deck's eighth and ninth slides:**
  - Sweden: five campuses announced, 2 800 MW of final capacity — Borlänge (EcoDataCenter with Mistral AI, ground
    broken, 250 MW first and up to 600 MW; trade press), Strängnäs (Brookfield, the site from 300 to 750 MW, up to
    SEK 95 billion over 10–15 years; its release of 4 June 2025), Skellefteå (EdgeConneX, up to 1 GW on Lyten's site,
    subject to approvals; trade press), Sollefteå (atNorth, 300 MW, operational in H1 2028; its release) and
    Smedjebacken (EcoDataCenter, 150 MW, permits outstanding; trade press). Svenska kraftnät names no project; its
    queue of 7 326 MW of data centres stands in SE3 (5 169), SE2 (1 662) and SE1 (495), none in SE4.
  - Poland: PSE's list of connection requests (30.09.2026) holds 22 data-centre rows, 11 284 MW: conditions issued for
    9 185 MW (Chynowo 4 000, Pałowo 1 600, Czerniewice 1 100, Stoszowice 800, Suczki 590, Dobiecin 500, Komorniki 230,
    Warszawa-4 150, Konin 135, Piaseczno 80) and requests for 2 099 MW (Kołbaskowo 1 140, Central Airport Data Center
    500, Święte 219, Wrocław 100, Jędrzychowice 100, Sękocin 40). No row holds an agreement; 6 990 MW of the conditions
    are WBS Power's. PSE's own plan takes 3 093 MW of data centres for 2036 (Tab. 4.3).
    - Soft: Hyperco's and XTX Markets' figures are IT power, the others electrical; EUDCA counts Finland's IT power at
      362 MW in 2025 and forecasts 556 for 2027, a measure of its own.
    - Not taken: the City of Kouvola's overview (404) and EK's database (an interactive page). gtai.de answers a
      repeated request with a bot-check; its page was read once.
- **Sweden.**
  - **Svenska kraftnät's queue at 1 October 2026:** 7,326 MW of data-centre applications and 14,612 MW of industry
    (10,950 in SE1), hydrogen within it. SE4, the model's neighbour, has neither: its only consumer applications are
    531 MW of "other".
  - **What is reserved** is published only in total. The 3.5 GW for data centres comes from the press, quoting
    Svenska kraftnät.
  - **Stegra's electrolysers** for its steelworks at Boden, in SE1, more than 700 MW, were ordered in 2023 (the
    supplier's contract).
  - **The short-term analysis** has hydrogen production at 13 TWh in 2030.
- **Poland.**
  - **PSE's list at 30.09.2026:** 9,185 MW of data-centre connection conditions (16 rows, 76 % under the names WBS
    Power) and no agreement. Another 2,099 MW of requests is still unanswered.
  - **Hydrogen:** three projects have conditions, 1,620 MW together.
  - **New industry with agreements in force:** ArcelorMittal, ANWIL and RE Alloys, 923 MW together.
  - **PSE's draft plan:** 17.4 TWh of data centres and 1,500 MW of electrolysers in 2036, and 15 TWh for new industrial
    loads.

## The capacity figures (the Wind and Solar tabs)

At the same word the Wind and Solar tabs gained a figure of each country's installed capacity at every year's end,
2015–2025 (IRENASTAT, the same series as the additions), wind onshore and offshore together. Each figure carries the
table's two readings to 2040, trend and pace, summed over the technologies. The model's own figures for 2035 and 2040
are hollow diamonds where the model has one for every technology summed.

## Access, for whoever refreshes the figures

- **Blocked sources:** ast.lv, lsm.lv and Klaipėda's port refuse a plain request. AST is read through the Internet
  Archive.
- **Overwritten files:** PSE's list and Svenska kraftnät's queue pages are replaced in place every month. The cached
  copies are the evidence for the dates the page gives.
- **Partly paywalled:** Ehitusuudised and Postimees show only their opening paragraph free. The figure taken from
  Ehitusuudised stands in that paragraph.
