# Questions and answers

*Gate status (R-PUB-4): the validation gate R-VAL-5 is not met — the replays miss hourly prices by
9–12 €/MWh in 2023–2024 and 17–18 in the blind year 2025, against a threshold of 15 (with the gas
plants' one bid, DECISIONS D-164, decided by the owner on 2026-10-22; 8–11 and 17–18 before it on
the register of D-115, accepted by the owner on 2026-10-11, D-116; 9–12 and 18–19 before that,
on D-111 to D-114; 12–17 and 21–22 on the register he accepted on 2026-10-05); the EstLink 2 gate
R-VAL-6 is met. 2026 so far, January to October, is no gate year: 14.9 / 11.5 / 10.7 €/MWh in Estonia, Latvia and
Lithuania. On 2026-10-17 the owner accepted these results for release, the nuclear plant's
included (D-123); the thresholds stay the target and the Calibration page shows every deviation.*

Plain answers for a reader of the application. The binding description is the specification
(`docs/SPECIFICATION.md`); every formula is in the methodology, with the function that computes it.

## How good is it?

The *Calibration* view shows it. Each observed year from 2020 is replayed with its own fleet, demand,
fuel prices, transfer capacities and neighbours' prices, and compared with what happened; the Baltic
prices being measured are never an input. The model misses the hourly price by 9–12 €/MWh on average
in 2023 and 2024 and by 17–18 €/MWh in 2025, against the threshold of 15 that the specification sets
(2023 and 2024 meet it). In 2026, January to October, the miss is 14.9 €/MWh in Estonia and 11.5 and 10.7 in
Latvia and Lithuania; the model's average is 6.6 €/MWh below the market's in Estonia and 4.5 in the other two, most of
Estonia's in hours the model separates it from Latvia and the market did not. The misses are largest in the dearest hours, though less than an average
over the hours the market priced highest suggests: hours chosen by the observed price carry its
surprises, and a model right on average would show much of the same gap there. The model has no
scarcity pricing: every gas plant of the three countries bids one price, a combined-cycle plant's
cost plus a fitted 42.5 €/MWh, whatever share of its output is in use; its storage and hydro plants
see the day and the next with certainty, and of the thermal plants only oil shale is committed by
the day. It
reproduces the effect of the 2024 EstLink 2 outage on the Estonian price (+19.1 €/MWh, beside
Elering's estimate of about 18; Eesti Energia's up to +24 for the second quarter and up to +42 for July compare
with the model's 5–21 by month in April–June and 32.6 in July).

## Why are the neighbours' prices raised above the profile?

The levels of 75, 90 and 120 €/MWh are the owner's assumption, not a result of any source: ENTSO-E's profile gives
Finland, SE4 and Poland 39.9, 45.9 and 57.2 €/MWh for 2035. The Presentation's slides 6–8 set out the reason —
data centres and new industrial loads on their way in each country, from the grid operators' own plans and queues,
every figure linked to its document. They show where demand is heading, not how far prices move: a price rises only
if the build of generation lags the demand, which the slides do not show. For scale, the market of 2026 so far
(1 January–25 November): Finland 58.4, SE4 104.3, Poland 131.5 €/MWh. With the profile as published, Estonia's price
without the plant is 66.8 €/MWh in place of 108.1, and the plant's effect is smaller with it: two units take 16.0 €/MWh
off in place of 22.1, and their contract for difference costs the state about 204 M€ a year in place of 15.

## Where do the neighbours' prices come from?

Finland, Sweden's SE4 zone and Poland are not modelled plant by plant. Their hourly prices come from
ENTSO-E's market model for the scenario and weather year chosen — TYNDP 2024 Distributed Energy or
Global Ambition 2035, or TYNDP 2026 National Trends+ 2035 — and each can be scaled by a level factor.
The Baltic countries buy from and sell to them at those prices, up to the capacity of the lines.
The list also offers two profiles from the model's own research on the three neighbours: their prices
in 2035 if demand comes and the build lags, each country on its own or all three at once. They are
conditional cases, not forecasts, and they keep the fuel prices they were computed with (D-121).

## The neighbours' prices rest on other gas and CO₂ prices than the Baltic plants pay. Does that matter?

It can. ENTSO-E's market model of TYNDP 2024 ran on a gas blend at about 33 €/MWh thermal, three
quarters of it paying for CO₂ at 130 €/t in 2035; the scenario's Baltic plants pay 38 €/MWh and
197.5 €/t. The model takes the neighbours' profiles as published, times their price level: the scenario's gas and
CO₂ prices move the Baltic plants alone, and the level stands for the rest (D-194, at the owner's word). From
D-079 to D-194 a box in the panel, ticked as the application opened, moved the neighbours' hours that those prices
set to the scenario's two prices; it is removed, and the owner's levels now give the same averages of 75, 90 and
120 €/MWh on the profile as published.

## Why are the three Baltic prices often the same?

Within an hour, prices differ only where a line between two zones runs at its limit. When the lines
between Estonia, Latvia and Lithuania have room, the three share one price.

## What are the four scenarios of 2035?

*0 SMR* is the base case: Estonia's fleet and demand as in Elering and TalTech's base
scenario S1 (September 2026), with its firm capacity as gas plants, and Latvia's and Lithuania's as
in ENTSO-E's ERAA 2025. Two changes are the owner's (D-182, 2026-10-27): Estonia's onshore wind at
1 300 MW and solar at 2 500 MW in place of S1's 1 244 and 1 785, and the neighbours' prices raised by their
level to an average of 75, 90 and 120 €/MWh — Finland ×1.88, Sweden's SE4 ×1.96, Poland ×2.10 on the profile as
published, whose averages are 39.9, 45.9 and 57.2 (D-185 set the last two; D-194 took them to the profile as
published). The levels
belong to that profile alone, TYNDP 2024's Distributed Energy 2035: every other profile of the list opens at ×1, as
published or as the research built it, and a level you move carries over to it by the same share (D-190). The panel
shows each level's factor on the profile as published beside its box (▲ ×1.88), with a line under the three sliders marking them as the owner's levels and giving the profile's published averages (D-231), and S1's own figures beside the two sliders. *1 SMR*, *2 SMR* and *3 SMR* are the same with one, two or three nuclear units of
315 MW added — the BWRX-300's gross power, the owner's choice (D-189); its net output to grid is about 300 MW. The
four share one base and differ only in their units (D-151). The four run together
on the same settings and are shown side by side, each with its difference to *0 SMR*.

## Which weather years are used, and why three?

The model runs 1995, 2008 and 2009, the climate years ENTSO-E uses for its scenarios, and weights them
0.233, 0.367 and 0.400 as ENTSO-E does; the headline is the weighted average, and each year's figure is
shown beside it. The years differ: 2009 was the calmest year for Estonian onshore wind in 38, 1995
and 2008 among the windiest. ENTSO-E chose them for TYNDP 2022 among the thirty years 1987–2016
as the combination of three whose residual load — demand less wind, solar and hydro, per
European region — best stands for all thirty (a Euclidean filter, then a K-Medoids clustering
score), and kept them for TYNDP 2024; the weights are the share of the thirty years each
represents, and 2009 is "the most representative". The market model's prices for the neighbours
exist for these three years only, which is why the model can run on no other. The *Weather* view
tells it in ENTSO-E's words and shows each year's place among the 38 for every Baltic zone. With
TYNDP 2026 the model runs that edition's three weather scenarios of 2035 with their weights
instead.

## What does the Statistics page show?

The last ten years of the gas price (TTF, by month), of the CO₂ price (EU ETS auctions, by
month, from 2017) and of the day-ahead prices of the six zones, and how much onshore wind,
offshore wind and solar Estonia, Latvia, Lithuania, Finland, Sweden and Poland added each year
from 2016 to 2025 — with Sweden's southern zone, SE4, apart, and the countries' own counts beside
IRENA's where they differ much. Through each a straight line is
carried to 2040: for the prices two — least squares, as a spreadsheet draws it, and Theil–Sen,
which the crisis of 2022 moves little; for the capacity the line through the yearly additions, and
the installed capacity of 2035 and 2040 read two ways — the trend goes on, or the pace of 2021–2025
holds. Beside them stand the model's own assumptions. A line through the past is arithmetic, not
a forecast: it shows how far the scenarios are from what the last decade did.

## Why does the model never show a negative price?

Wind and solar offer their output at 0 €/MWh, their running cost; the model does not include the
subsidies or contracts that make some producers sell below zero. An hour with more wind and solar
than anyone can take is priced at 0 and the surplus is curtailed. The contract's clause "no
difference paid in hours at or below 0" therefore applies to the hours at that zero.

## How do the batteries work?

A battery buys electricity in cheap hours and sells it in dear ones. The model charges and discharges it wherever that
lowers the system's cost, seeing the day and the next, on four rules:
- it moves energy only when the price gap between the two hours covers its losses — it gives back 85 % of what it
  charges — and a cycling cost of 71.5 €/MWh, its wear, fitted so that Estonia's batteries discharge in the replay of
  2026 what the record shows;
- it makes at most 1.5 full cycles a day;
- the power sold as frequency reserves (FCR and aFRR) is held out of the day-ahead market in every hour;
- it stores two hours of its power, so it moves energy within a day or two, not from a windy week to a calm one.

In the scenarios of 2035 Estonia has 1 500 MW of batteries (3 000 MWh; Elering and TalTech's S1), Latvia 420 MW and
Lithuania 1 750 MW (ERAA 2025). The panel's sliders change the megawatts, the cycling cost and the efficiency. Kruonis,
Lithuania's pumped-storage plant, follows the same principle with a cycle cost of 60 €/MWh.

## How does the model take the lines' capacity held for balancing since synchronisation?

Since 9 February 2025 the Baltic states run synchronously with Continental Europe, and since 5 February 2025 they buy
balancing capacity together in one Baltic market. Part of the AC lines' capacity between Estonia and Latvia and between
Latvia and Lithuania is therefore held for exchanging balancing energy and is not offered day-ahead. The model takes it
in two ways:
- **Past years:** each border carries, hour by hour, the capacity the operators offered the day-ahead market (ENTSO-E
  A31), which already includes outages and other limits. On Estonia–Latvia the published figure still contains the
  capacity allocated to balancing, so the model takes it off, hour by hour, from the Baltic Transparency Dashboard
  (265–325 MW on average by period); the market's own schedule stops at that lower figure. On Latvia–Lithuania the
  published figure is already without it, and nothing is taken off.
- **Scenarios of 2035:** each border carries ERAA 2025's hourly capacity of the year, less the average held for
  balancing in 2025: 265 MW on Estonia–Latvia and 272 MW on Latvia–Lithuania. Without the Latvia–Lithuania reservation
  the prices are the same to 0.1 €/MWh: that border does not bind in 2035.

Beside the lines, the reserves themselves are held out of the market: in every hour the upward reserve (FCR, aFRR and
mFRR; in 2026 about 28, 96–120 and 580–604 MW for the three states, Elering) is not offered day-ahead — batteries hold
the fast reserve, thermal plants the rest. A box in the panel turns this off. The model does not compute stability
limits of its own (inertia, the largest single loss): it takes the capacities the operators publish, and any line can be
limited or switched off in the panel's links card.

## What are "hours with a fossil price"?

The share of the hours in which Estonia's price was set by a Baltic gas or oil-shale plant, or by a
neighbour's price at or above the cost of a gas plant on the fuel and CO₂ prices behind the
neighbours' prices (TYNDP 2024's). Since the neighbours' plants are not modelled, their part is an
estimate.

## Can I change what a plant bids?

In a scenario, yes, for the thermal plants of Estonia, Latvia and Lithuania; not for waste, which
runs whatever the price, nor for the nuclear units, which run as baseload. The gas plants of the
three countries bid one price — a combined-cycle plant's fuel, CO₂ and running costs plus 42.5
€/MWh fitted on 2023–2024, the gas priced per net MWh as ERAA's efficiencies are — shown once under the gas and CO₂ prices; type another into that box and
it moves for every gas plant of the three. Oil shale, biomass and the like each have a box right of
the plant's slider. The model keeps the difference to what the costs give, so a change of the gas
or CO₂ price still moves the bid. The figure turns amber, the tip under the pointer shows the costs
and the difference, the scenario's text and link carry it, and an empty box returns the costs' bid.

## What are the standard sensitivities?

Four variants, run in the background: the scenarios at four price pairs of LNG and CO₂ the owner
chose (D-183), everything else the same, each in the four scenarios, 0 to 3 SMR (D-184).

| | LNG, €/MWh thermal | CO₂, €/t |
|---|---|---|
| (1) | 30 | 80 |
| (2) | 45 | 95 |
| (3) | 60 | 120 |
| (4) | 75 | 150 |

The LNG prices are per MWh of the gas's net calorific value, as the panel's gas box takes them (D-192). The Baltic
gas plants bid on these prices: the table's head gives their one bid at the pair, 127, 159, 195 and 233 €/MWh
(D-187). The neighbours' prices stay the headline's (D-194).

Since D-195 the four are one table, the owner's: a column per pair, under its LNG, CO₂ and bid; Estonia's price
without the plant and with one to three units, named by their output in a year, each with the share of the year in
which a Baltic gas plant set the price; and for the units what the lower price and the contract are worth a year
(D-188): the fall of Estonia's average price against *0 SMR* at the same pair times its demand, 11.6 TWh — what its
consumers pay less at the exchange; what the state receives or pays under the contract for difference at the
strike; and the two together, the consumers' net gain. The price is the hours' average, not weighted by the load.
Until D-183 the five
sensitivities were slow build with and without electrolysis, storage above the scenario, the gas shock
of 2026 and CO₂ at its 2026 price.

## Where does a number come from?

Every value on the panel has an *i* button naming its source — the API call or the document and
page — and linking to the *Sources* view. The repository keeps a lineage record for every file
fetched and cites every documentary value to its page.

## Who made it?

Andres Ingerman

Fermi Energia Head of AI and Digital communication

andres.ingerman@fermi.ee
