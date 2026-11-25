# Slider designs — a separate bench (2026-10-21)

The owner asked for different designs of the panel's sliders, "for now only as a separate development". `index.html`
shows seven, each on the same three source rows as the site's panel (icon, label with its change from the reference
year, MW tile, bid tile); only the slider differs. Nothing here is in the application.

| | Design | In short |
|---|---|---|
| A | today | the browser's own slider in the accent colour, the reference a tick |
| B | hairline | a 2 px line filled to the value, a small ringed knob |
| C | capsule | a thick rounded track, a large light knob (phones' habit) |
| D | ruler | a thin track over a scale of tenths, the reference a triangle |
| E | change from the reference | the fill from the reference year's value to the scenario's, green up, red down |
| F | fill bar | no knob, the bar is the control, the reference a dashed line |
| G | stepper | the hairline with − and + for one step each |

Open it from the repository's root so that the application's fonts load:

```
python3 -m http.server 5181 --bind 127.0.0.1
```

then http://127.0.0.1:5181/spikes/slider-designs/. The ☀ | ☾ button switches the theme.
