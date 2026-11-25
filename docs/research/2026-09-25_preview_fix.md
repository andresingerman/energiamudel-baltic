# Correcting the preview, or not (2026-09-25)

*Gate status (R-PUB-4): the validation gate R-VAL-5 is not met (methodology §7.3); the EstLink 2
gate R-VAL-6 is met. No result with the plant exists.*

The owner's question after ERRATA E-040: find out, including on the internet, how the preview
could be corrected or supplemented. What was found, what was built and measured, and what the
owner decided (D-026).

## What others do

- **Hydro with an energy budget.** ANTARES (RTE's adequacy and market simulator) does not place
  reservoir hydro on prices at all in its pre-allocation: it splits the monthly energy over days
  in proportion to the daily load raised to a power β ("inter-daily breakdown"), bounds the daily
  peak-to-average ratio ("intra-daily modulation") and leaves the hours to its weekly
  optimisation ([Antares reference guide, hydro storage heuristics](https://antares-simulator.readthedocs.io/en/v8.8.10/reference-guide/08-miscellaneous/);
  [input files](https://antares-simulator.readthedocs.io/en/stable/user-guide/solver/02-inputs/)).
  The preview's rule is price-based (R-ENG-5), and the simplest step in that direction is a finer
  price response.
- **The Daugava cascade itself.** Pļaviņas HES was built as a peak-load station that runs in the
  hours of the day when consumption is highest, and in the spring flood, for about four to six
  weeks, the inflow lets it run in base mode ([Latvian Wikipedia, Pļaviņu HES](https://lv.wikipedia.org/wiki/P%C4%BCavi%C5%86u_HES)).
  The cascade shifts water within the day; the model's weekly budget (R-ENG-5, kept by the owner
  in D-025) is the looser bound. Latvenergo's own page on the cascade could not be retrieved from
  here (HTTP 451).
- **Storage that moves the price.** A price-taker schedule overstates what a large storage fleet
  earns and misses the prices it suppresses; Ikechi Emmanuel and Denholm correct it with a
  feedback from net load to price ([L26], [Applied Energy 310, 118250](https://doi.org/10.1016/j.apenergy.2021.118250)).
  `spikes/storage-impact/` found in M2 that full-power steps are the obstacle: the LP runs storage
  at part load.

## What was built and measured

`spikes/preview-fix/`: the Daugava's price response from five pass-one clearings between its
minimum flow and its turbine limit instead of two, and each storage unit planned in six slices,
each against the prices the slices before it leave (never against the direction the unit already
takes in that hour), with those prices as the charging ceilings of pass two.

| Estonia, €/MWh | Engine of record | Preview as built | Corrected |
|---|---|---|---|
| 2024 replay: annual mean | 91.0 | 136.7 | 92.6 |
| 2025 replay | 86.2 | 128.1 | 88.4 |
| Climate year 2009, ERAA 2035 | 85.5 | 122.6 | 86.3 |
| Climate year 1995, ERAA 2035 | 40.2 | 54.1 | 44.3 |
| Time per year, one thread | 0.8–1.6 s | 0.2 s | 0.7–0.8 s |

The corrections bring the annual means within 0.8–4.1 €/MWh, the replays' hourly prices within
about 3 €/MWh and the scenario runs' within 6–34 €/MWh — at the cost of the preview's speed. The
engine of record with its weeks on four workers takes 0.35 s for a replay year and 1.45 s for a set
of three climate years (M2's benchmark), so the corrected preview would arrive barely before it.

## Decision

The owner chose to drop the preview from the application (D-026, specification revision 1.5): the
interface shows a progress indication and then the engine of record's result. The two-pass
engine stays in the repository unchanged as the documented baseline of methodology §5 and
`make gap`; the corrections are recorded here and in the spike, not built into it.
