# Line glow — a separate bench (2026-11-03)

The owner asked for a light animation, a glow, on the Links map's lines in service, and then for a separate HTML
prototype with the variants side by side to choose from. `index.html` shows six, each on the application's own map;
only the glow differs. Click a line on any map to switch it: every map follows. Nothing here is in the application.

| | Variant | In short |
|---|---|---|
| 0 | today | no motion: on indigo, off red dashed, held amber dashed |
| A | breathing band | a wider lavender band under each line in service swells and fades every 3 s; flat, no direction |
| B | soft glow | A's rhythm with a blurred halo; leaves the design's flat style, slower in Safari |
| C | shimmer | a light gradient runs along each line; implies a direction the map does not know |
| D | shimmer by the year's flow | C's gradient runs the way the opening run's net flow went (0 SMR, weather year 2009), faster for more TWh |
| E | pulse on a change | still until a line is switched on, then two pulses; within WCAG 2.2.2 with no pause control |

Below them, at the owner's next word ("show variations of C and D"), the shimmer in six looks, a switch setting the
way and pace of all six, and sliders for speed and strength. The switch: C one stream, every line the same way, as
drawn; D one stream the way of the opening run's net flow, faster for more TWh; and, at the owner's word after that
("let the flows go both ways along the cable's edges"), both ways — a stream on each edge, the two opposite ways, each
on the right of its way as on a two-way road — at one pace, or each at the pace and strength of what its way carried in
the year (the borders panel's sent TWh: FI→EE 6.48 against EE→FI 0.64, SE4→LT 4.25 against 1.09, LT→PL 5.17 against
3.02, LT→LV 3.46 against 2.49, EE→LV 2.55 against 1.31). Both ways is the switch's first setting.

| | Style | In short |
|---|---|---|
| C1 | streak | a short light streak every 48 units: the C and D above |
| C2 | comet | sparse bright heads with a fading tail behind: the way at a glance |
| C3 | particles | small light dots, as current in a diagram; a dashed stroke moved by CSS, the cheapest |
| C4 | travelling glow | a soft blurred lavender glow drifting under the cable: B's glow, moving |
| C5 | chevrons | small arrows moving along the cable: the plainest about the way, the loudest |
| C6 | living cable | a slow wave of light along the cable itself: the quietest |

**The owner's choice, 2026-11-03:** C1, the streak, both ways at one pace, speed 1, strength 90 % — in the
application since D-208.

Motion that starts by itself, lasts more than five seconds and runs beside other content needs a way to pause it
(WCAG 2.2.2, level A): A to D would need a pause control or a stop after a few seconds; E needs neither. The checkbox
"Reduced motion" shows what each variant leaves a reader who asked the system for less motion.

The map is the one `app/src/ui/panel.ts` draws for the opening scenario's Estonian panel on `design/fermi-style`
(D-206, D-207). D's flows were read off the application's borders panel on 2026-11-03: FI→EE 5.83, SE4→LT 3.17,
LT→PL 2.15, EE→LV 1.24, LT→LV 0.98 TWh.

Build `index.html` from `template.html` (edit the template, not the page), from the repository's root:

```
node --no-maglev spikes/line-glow/build.ts
```

Serve the repository's root so that the application's fonts load, and open `/spikes/line-glow/`:

```
python3 -m http.server 5181 --bind 127.0.0.1
```
