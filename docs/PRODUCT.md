# Product

## Register

product

## Users

Three readers, in this order:

- **The room at the public presentation of 10 November 2026.** Decision makers, energy professionals and
  journalists reading the Presentation view projected on a screen, from a distance, while the owner speaks.
  They get a few seconds per figure.
- **Visitors of energiamudel.ee** on a desktop or laptop: analysts, engineers, students and journalists who
  check a claim, change a control and read the notes.
- **Reviewers** who trace a figure to its source, its assumptions and its errata.

## Product Purpose

energiamudel v5 is an open model of the Baltic day-ahead market (Estonia, Latvia, Lithuania) that computes
hourly prices in the browser with a linear programme, validated against 2023–2025. Its scenario view
compares 2035 with no, one, two and three BWRX-300 units in Estonia on one base. Every input has a source;
every assumption of the owner is labelled as such; the validation gate that is not met is said on every page.
Success: a reader can see what the plant changes, what it costs and on which assumptions, and trust the
figures because they can check them.

## Brand Personality

Rigorous, transparent, calm. The voice of a research institute's report: precise words, numbers with their
units and their sources, no persuasion. The author works with Fermi Energia and declares it in the README and in the questions and answers (on every page until D-224);
the design earns trust by being visibly neutral, not by selling.

## Anti-references

- **An advertisement for nuclear power.** Selling slides, heroic numbers without their assumptions, loud or
  triumphant colours, the plant's scenarios styled as winners.
- **A bare spreadsheet.** Every cell the same size and weight, no hierarchy, no main finding a reader can take
  away.
- SaaS hero-metric dashboards, gradients, decorative icons.

## Design Principles

1. **Evidence before emphasis.** Every figure keeps its unit, its source and its assumption within reach;
   emphasis comes from hierarchy, never from colour that argues.
2. **Read from the back of the room.** On the Presentation view the main figures and findings read at a
   glance from a projector; the details go behind a "?" or into one quiet line.
3. **Symmetric judgement.** A change is coloured by its sign alone, the same way in every table; no scenario
   is styled better than another.
4. **One system.** The presentation uses the application's tokens, fonts, group colours and components, so a
   figure looks the same wherever it appears.
5. **Assumptions in daylight.** What the model does not know — an owner's assumption, an undiscounted sum,
   an unpriced line — is named where the figure is.

## Accessibility & Inclusion

WCAG 2 AA: every text colour at least 4.5:1 on every surface in both themes and in print (R-UI-5,
`app/test/theme.test.ts`); never colour alone — a sign, a label or a legend carries the meaning; the
generation groups' stack order keeps neighbours apart for colour-blind readers (D-029); keyboard focus visible;
desktop only (D-149), in a light and a dark theme; reduced motion respected.
