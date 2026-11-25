# This model beside Ea Energy's study for the Ministry of Climate (2026-10-18)

**Why.** The experts' questions found one likely question the documents could not answer (K21). Ea
Energy Analyses' study for Estonia's Ministry of Climate puts Estonia's 2035 price at about
54 €/MWh. This model's opening view puts it at 84.7. The owner answered the recommendation to
compare them with "merge and upload", after which the comparison was the next task.

**Answer.** The gap is in the inputs, not in the models. Run on Ea's gas and CO₂ prices and Ea's
Estonian demand, this model gives Estonia **54.9 €/MWh** in 2035; Ea's Scenario 2 gives 54.
- CO₂ is most of the gap: ENTSO-E's ERAA 2025 has 197.5 €/t for 2035, Ea about 97.
- Gas is a smaller part: 38.2 against about 27 €/MWh thermal.

## The study

*Modelling the electricity exchange price 2026–2050: final results 17-02-26*, published in March 2026.
It is cached as `doc.ea_energy_ee_2026.pdf`, 241 slides; the slide numbers below are those printed on
the slides.

**The model.** Balmorel, with investments optimised at least cost and perfect competition. Five
scenarios and a sixth of 100 % renewables, each with sensitivities.

**Scenario 2** is the market-based case:
- investments by the market;
- Estonia's island-operation requirement;
- a capacity mechanism from 2036;
- new interconnectors from 2035: Estonia–Finland +700 MW and Estonia–Latvia +1 000 MW (slides 6 and
  10).

**Its 2035 inputs**, read off the charts, so to about half a unit:

| Input | Ea, 2035 | This model's opening view | Where |
|---|---|---|---|
| Natural gas | about 7.5 €/GJ, **27 €/MWh** thermal: the IEA WEO 2024, average of APS and STEPS, the LNG import price | **38.2 €/MWh** thermal (ERAA 2025) | Ea slide 13; methodology §5.9 |
| CO₂ (EU ETS) | about **97 €/t**, rising to 130 by 2050 | **197.5 €/t** (ERAA 2025) | Ea slide 13 |
| Estonia's demand | about **10.2 TWh** (8.5 in 2026, 11.2 in 2040) | **11.6 TWh** (Elering and TalTech's S1) | Ea slide 17; methodology §9 |
| Euros | of 2022, as its slide 3 states for every cost and price; the ETS chart's axis reads EUR24 | as the presets hold them | — |

**Its 2035 prices** (Scenario 2):

| | Price | Source |
|---|---|---|
| Estonia | 54 €/MWh | slides 45 and 48 |
| Finland | about 55 | slide 48 |
| Latvia | about 53 | slide 48 |
| Lithuania | about 51 | slide 48 |
| Sweden SE3 | about 56 | slide 48 |

**Two points from its own text:**
- **Its prices sit below the market's.** Its modelled 2026 Baltic price, 64 €/MWh, is below 2025's
  record of 80–85. Ea puts this down to "the assumption of full competition in the model, reducing
  mark-ups and scarcity rents" (slide 48).
- **Its exchange price is not what consumers pay.** It adds a "cost recovery shortfall": what
  generators' revenues do not cover, as a levy per MWh of demand. In Scenario 2 that is 6 €/MWh in
  2035, so 54 + 6 = 60 (slides 162–166).

## This model with Ea's inputs

The opening state as the site runs it, the three climate years weighted. Each row changes one input,
or several together (`spikes/ea-energy/compare.ts`, which writes `compare.json`; from `app/`).

| Run | EE | LV | LT | EE with 2 SMR | The plant's effect | Capture price, 2 SMR | The CfD at 90, 2 SMR, M€ a year |
|---|---|---|---|---|---|---|---|
| As the site | 84.7 | 80.9 | 80.9 | 67.2 | −17.5 | 68.2 | 110 |
| Ea's gas | 77.2 | 73.2 | 73.2 | 61.8 | −15.3 | 62.7 | 138 |
| Ea's CO₂ | 67.2 | 64.3 | 64.3 | 53.4 | −13.7 | 54.2 | 181 |
| Ea's gas and CO₂ | 57.8 | 55.0 | 55.0 | 46.5 | −11.3 | 47.2 | 216 |
| **Ea's gas, CO₂ and Estonian demand** | **54.9** | **53.6** | **53.6** | 42.5 | −12.4 | 43.1 | 237 |
| The neighbours as TYNDP published them | 69.3 | 65.3 | 65.3 | 53.8 | −15.5 | 54.7 | 179 |
| Ea's gas and CO₂, the neighbours as published | 61.8 | 59.3 | 59.3 | 50.2 | −11.6 | 50.9 | 198 |

How the runs were set up:
- The neighbours' profile is re-priced to each run's gas and CO₂, as the application does by default
  (D-079). The published profile carries TYNDP's own 33.0 €/MWh and 130.2 €/t.
- Estonia's demand is scaled to 10.2 TWh by its multiplier (R-DEM-3).
- The contract is the card's: two-sided, hourly, strike 90, without the clause.

## What it shows

1. **The two models agree once the inputs do.** On Ea's three inputs this model's Estonia is within a
   euro of Ea's, and Latvia and Lithuania within about two. The remaining differences — Ea's
   endogenous build-out, its own neighbours, its capacity mechanism, our markup fitted to the record —
   happen to offset at this level of comparison.
   - Of the 29.8 €/MWh between 84.7 and 54.9, CO₂ is 17.5, gas 7.5 and their overlap and demand the
     rest. Every step is a run in the table above.
2. **The price level follows ERAA's CO₂ price.** 197.5 €/t is ENTSO-E's assumption for 2035. Ea
   follows forwards and expects the EU to reject prices that high. The site lets anyone set the CO₂
   price; at Ea's 97 Estonia's price is 67.2 €/MWh.
3. **The plant's price effect shrinks with fuel and CO₂, and the contract's cost grows.**
   - Two units take 17.5 €/MWh off Estonia's price on ERAA's prices, and 12.4 on Ea's inputs.
   - Their capture price falls from 68 to 43 €/MWh, so a contract at 90 costs the state 237 M€ a year
     instead of 110.
   - The cheaper fossil power becomes, the more the plant costs and the less it saves.
4. **Ea's nuclear case rests on its own cost assumptions.** Its Scenario 5 adds 600 MW of nuclear
   from 2040, and Estonia's price falls by 2–3 €/MWh (slide 104). The shortfall levy, however, rises
   to 35 €/MWh in 2040, against 10 in Scenario 2: 392 against 114 M€ a year (slide 163). That rests
   on:
   - a capital cost of €10 million/MW;
   - a 25-year economic life;
   - a 6 % WACC.

   Together these give an LCOE of about 136 €/MWh; Ea notes that some estimates are nearer €7 million
   (slide 162). This model computes no cost of the plant. Its contract is a strike the owner sets.

## For the presentation

- **K21 gets its answer.** The study's 54 and this model's 85 differ by their CO₂ and gas prices and
  Estonia's demand. Run on Ea's, this model gives 54.9.
- **A question to expect:** "Ea's study says nuclear adds 35 €/MWh to consumers." The answer is in
  the inputs, again: €10 million/MW over 25 years. The new K44 gives it.
- **Slide 9's line on fuel and CO₂ can carry the table's second message.** At ENTSO-E's CO₂ price
  Estonia's 2035 price is 85 €/MWh, at the forwards' it is about 67. The plant's effect and the
  contract's cost move the other way.

## Re-run on the gas plants' one bid (2026-10-23)

`compare.ts` again on main 6912017 — the units on top of the gas (D-151), every gas plant of the three zones at one
bid (D-164) — with Ea's inputs as above (`compare.json` rewritten). Estonia weighted over the climate years, €/MWh;
the contract (a) at 90 €/MWh with two units, M€ a year; in brackets the run of 2026-10-18 above, the units in place
of gas and the gas on D-115's ladder:

| Run | EE | EE, 2 SMR | The plant's effect | Contract (a), 2 SMR, M€ |
|---|---|---|---|---|
| as the site | 85.4 (84.7) | 67.1 (67.2) | −18.3 (−17.5) | 111 (110) |
| Ea's gas only | 78.3 (77.2) | 62.0 (61.8) | −16.3 (−15.3) | 137 (138) |
| Ea's CO₂ only | 68.7 (67.2) | 54.1 (53.4) | −14.6 (−13.7) | 177 (181) |
| Ea's gas and CO₂, neighbours re-priced | 59.4 (57.8) | 47.0 (46.5) | −12.5 (−11.3) | 214 (216) |
| neighbours as TYNDP published them | 70.2 (69.3) | 54.1 (53.8) | −16.1 (−15.5) | 177 (179) |
| Ea's gas and CO₂, neighbours as published | 63.7 (61.8) | 50.7 (50.2) | −13.0 (−11.6) | 195 (198) |
| **Ea's gas, CO₂ and Estonian demand** | **56.8** (54.9) | 43.0 (42.5) | −13.8 (−12.4) | 235 (237) |

The finding stands, 1.9 €/MWh higher: on Ea's inputs this model gives Estonia 56.8 €/MWh against the study's 54. Of
the 28.6 between 85.4 and 56.8, CO₂ alone is 16.7 and gas alone 7.1. The questions and answers (K21, K44) carry the
new figures.

## Re-run after the corrections of 2026-10-23 (D-169 to D-171)

`compare.ts` again on main 98a69de: the cheaper gas plant first (D-169), the Lithuania–Poland lines AC (D-170) and the
record's gas price per net MWh with the adder refitted to 42.5 €/MWh (D-171). `compare.json` is rewritten. In
brackets, the re-run on the gas plants' one bid above:

| Run | EE | EE, 2 SMR | The plant's effect | Contract (a), 2 SMR, M€ |
|---|---|---|---|---|
| as the site | 83.6 (85.4) | 66.2 (67.1) | −17.4 (−18.3) | 115 (111) |
| Ea's gas only | 76.6 (78.3) | 61.2 (62.0) | −15.4 (−16.3) | 141 (137) |
| Ea's CO₂ only | 67.3 (68.7) | 53.5 (54.1) | −13.8 (−14.6) | 181 (177) |
| Ea's gas and CO₂, neighbours re-priced | 58.0 (59.4) | 46.3 (47.0) | −11.6 (−12.5) | 217 (214) |
| neighbours as TYNDP published them | 68.1 (70.2) | 53.1 (54.1) | −14.9 (−16.1) | 182 (177) |
| Ea's gas and CO₂, neighbours as published | 62.3 (63.7) | 50.1 (50.7) | −12.2 (−13.0) | 198 (195) |
| **Ea's gas, CO₂ and Estonian demand** | 55.5 (56.8) | 42.7 (43.0) | −12.8 (−13.8) | 236 (235) |

On Ea's inputs this model gives Estonia 55.5 €/MWh against the study's 54. Of the 28.1 between 83.6 and 55.5, CO₂
alone is 16.3 and gas alone 7.0. The questions and answers (K21, K44) carry these figures.

## Addendum, 2026-10-28: on the owner's opening

The owner's opening (D-182 to D-190) adds Estonia's wind 1 300 MW and solar 2 500 MW, the neighbours at 75 / 90 /
120 €/MWh on Distributed Energy 2035, and units of 315 MW. `compare.ts` adds two runs: the neighbours at ×1, without
the owner's levels, and Ea's inputs with the neighbours at ×1. Numbers in brackets are the table above.

| Run | EE | EE, 2 SMR | The plant's effect | Contract (a), 2 SMR, M€ |
|---|---|---|---|---|
| as the site | 107.0 (83.6) | 85.6 (66.2) | −21.4 (−17.4) | 17 (115) |
| Ea's gas only | 98.8 (76.6) | 79.6 (61.2) | −19.2 (−15.4) | 50 (141) |
| Ea's CO₂ only | 86.0 (67.3) | 69.4 (53.5) | −16.6 (−13.8) | 105 (181) |
| Ea's gas and CO₂, neighbours re-priced | 74.9 (58.0) | 60.6 (46.3) | −14.3 (−11.6) | 152 (217) |
| neighbours as TYNDP published them (at the owner's levels) | 89.1 (68.1) | 70.5 (53.1) | −18.7 (−14.9) | 98 (182) |
| Ea's gas and CO₂, neighbours as published | 79.4 (62.3) | 64.9 (50.1) | −14.5 (−12.2) | 129 (198) |
| Ea's gas, CO₂ and Estonian demand | 72.1 (55.5) | 56.8 (42.7) | −15.3 (−12.8) | 172 (236) |
| the neighbours at ×1, without the owner's levels | 82.0 | 63.5 | −18.5 | 136 |
| **Ea's gas, CO₂ and Estonian demand, the neighbours at ×1** | **54.2** | 40.9 | −13.3 | 257 |

**Ea's inputs with the neighbours at ×1 give Estonia 54.2 €/MWh, the study's 54.**

Between the site's 107.0 and 54.2:
- CO₂ alone is 21.0;
- the owner's neighbours' levels alone are 25.0 (107.0 against 82.0);
- gas alone is 8.2.

The questions and answers (K21, K44) carry these figures.
