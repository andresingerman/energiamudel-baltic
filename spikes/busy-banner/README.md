# Computing banner — a separate bench (2026-11-03)

The owner asked to improve the banner the Model view shows at the top while the model computes, with examples in a
separate HTML page. `index.html` shows seven, each on a sketch of the view's top (header, panel's edge, results) in
the site's tokens and Montserrat; only the banner differs. Nothing here is in the application.

The banner is D-054's (the owner, 2026-10-05: a big header while the model computes, so that it is plain that the run
goes on and the figures are not final) and D-127's two stages: the scenario shown first, its three years with the
results dimmed, then the other three scenarios, nine years, the results already this run's. The texts are the site's
Estonian ones (`app/src/ui/et.ts`); a few variants shorten them.

| | Variant | In short |
|---|---|---|
| 0 | today | `theme.css`'s `.computing`: a sticky amber bar, 20 px bold white, a still ⟳ |
| A | indigo bar | the same place and message in the header's navy, a turning ring, the note in a second voice |
| B | a line and a chip | a 3 px line sliding under the header, a chip over the results; the page does not move |
| C | a bar that fills | fills as the years finish, the shown scenario's three before a mark; count and seconds |
| D | a floating card | a white card at the bottom right with a ring and both messages |
| E | in the header | a pill beside the run's name, a shimmer over the dimmed figures |
| F | two steps | the run's two stages as steps, the first ticking when its figures are in |

**The owner's choice, 2026-11-03:** B, a line and a chip — in the application since D-209.

"Play a run" plays one as the site's (about 2.4 s for the scenario shown, 3 s for the others); the buttons hold a
stage; "Reduced motion" stops the rings, the line and the shimmer.

Serve the repository's root so that the application's fonts load, and open `/spikes/busy-banner/`:

```
python3 -m http.server 5181 --bind 127.0.0.1
```
