# The deck of the public presentation of 10 November 2026 (docs/PLAN.md §9; D-123, D-124): Estonian,
# 10–15 minutes, nine slides and five in reserve. Every figure is read from figures.ts's output
# (data/derived/presentation/figures.json), the protocol's results (data/derived/validation/) and the
# robustness research's summary (spikes/smr-robustness/summary.json), so
# the deck is rebuilt on the frozen figures with one command; the slide text is the owner's to edit.
# Usage (the python3 on PATH, which has python-pptx): python3 spikes/presentation-2026-11/deck.py [out.pptx]
import gzip
import json
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION, XL_LEGEND_POSITION
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[2]
OWNER = (ROOT / "data" / "derived" / "presentation" / "energiamudel_2026-11-10.pptx").resolve()
OUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else OWNER
if OUT == OWNER and OUT.exists():  # the owner edits that file, named or not; a rebuild names its own
    sys.exit(f"{OUT.relative_to(ROOT)} exists and is the owner's; name another output: deck.py <out.pptx>")
F = json.loads((ROOT / "data" / "derived" / "presentation" / "figures.json").read_text())
V = {y: json.loads((ROOT / "data" / "derived" / "validation" / f"{y}.json").read_text())
     for y in (2023, 2024, 2025, 2026)}

# the application's palette (app/src/ui/theme.css): dark slides on its night background, light ones on white
DARK, SURF_D = RGBColor(0x0A, 0x0E, 0x12), RGBColor(0x14, 0x1A, 0x1F)
INK, MUTED, MUTED_D = RGBColor(0x10, 0x15, 0x1A), RGBColor(0x4B, 0x56, 0x61), RGBColor(0xA3, 0xAD, 0xB7)
BLUE, BLUE_D = RGBColor(0x0B, 0x66, 0x99), RGBColor(0x5A, 0xC8, 0xFA)
AMBER, AMBER_INK = RGBColor(0xE8, 0xA3, 0x17), RGBColor(0x8A, 0x57, 0x00)
GREEN, RED = RGBColor(0x0D, 0x73, 0x40), RGBColor(0xB3, 0x26, 0x1E)
SURF, LINE, WHITE = RGBColor(0xF3, 0xF5, 0xF7), RGBColor(0xC9, 0xD0, 0xD6), RGBColor(0xFF, 0xFF, 0xFF)
HEAD, BODY = "Arial", "Calibri"
W, H = 13.333, 7.5

# the months of 2026 the replay covers: the export's year to its last hour (to October after the freeze)
MONTHS_ET = ["jaan", "veebr", "märts", "apr", "mai", "juuni", "juuli", "aug", "sept", "okt", "nov", "dets"]
H26 = json.loads(gzip.decompress((ROOT / "data" / "export" / "years" / "2026.json.gz").read_bytes()))["meta"]["hours"]
LAST26 = MONTHS_ET[(datetime(2026, 1, 1) + timedelta(hours=H26 - 1)).month - 1]

P = {k: v for k, v in F["profiles"].items()}
FORCE, TIGHT, TIGHTJ = P["DE_2035 (in force)"], P["TIGHT_2035"], P["TIGHTJ_2035"]
UNIT = F["unitMw"]  # the unit's megawatts as the model offers them (315 since D-189)
NB = F["neighbours DE_2035 (in force)"]  # the opening's neighbours at its levels (D-182, D-185)


def top(*vals: float) -> float:
    """A chart's axis maximum: the largest value with room for its label, up to the next 20."""
    return 20 * -(-max(vals) * 1.12 // 20)


def nbsp(t: str) -> str:
    """A number and its unit on one line: a no-break space between them."""
    return re.sub(r"(\d) (?=€|M€|TWh|MW|%|p\.p\.)", "\\1\u00a0", t)


def et(x: float, d: int = 1) -> str:
    """A number as Estonian writes it: decimal comma, a no-break space between thousands (a line never breaks inside a
    number), a true minus."""
    s = f"{abs(x):,.{d}f}".replace(",", "\u00a0").replace(".", ",")
    return ("−" if x < 0 and float(s.replace("\u00a0", "").replace(",", ".")) != 0 else "") + s


def signed_range(a: float, b: float) -> str:
    """Two cash flows as a range, M€: "+49…58", or "−7…+62" when it crosses zero."""
    lo, hi = sorted((a, b))
    if round(lo) >= 0:
        return f"+{et(lo, 0)}…{et(hi, 0)}"
    return f"{et(lo, 0)}…{et(hi, 0)}" if round(hi) <= 0 else f"{et(lo, 0)}…+{et(hi, 0)}"


prs = Presentation()
prs.slide_width, prs.slide_height = Inches(W), Inches(H)
TITLE_ONLY = prs.slide_layouts[5]
N_MAIN = 9


def background(slide, color):
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = color


def text(slide, x, y, w, h, paras, size=16, color=INK, font=BODY, bold=False, align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP, name=None, space_after=6):
    """A text box with no inner margin; `paras` is a string or a list of paragraphs, each a string or
    a list of (text, {bold, color, size}) runs."""
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    if name:
        box.name = name
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    for i, para in enumerate([paras] if isinstance(paras, str) else paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = Pt(space_after)
        for run_text, o in ([(para, {})] if isinstance(para, str) else para):
            r = p.add_run()
            r.text = nbsp(run_text)
            r.font.name = o.get("font", font)
            r.font.size = Pt(o.get("size", size))
            r.font.bold = o.get("bold", bold)
            r.font.color.rgb = o.get("color", color)
    return box


def titled(title, dark=False, number=None, section=""):
    s = prs.slides.add_slide(TITLE_ONLY)
    background(s, DARK if dark else WHITE)
    t = s.shapes.title
    t.left, t.top, t.width, t.height = Inches(0.6), Inches(0.45), Inches(W - 1.2), Inches(0.9)
    tf = t.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.word_wrap = True
    tf.text = title
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    for r in p.runs:
        r.font.name, r.font.size, r.font.bold = HEAD, Pt(34), True
        r.font.color.rgb = WHITE if dark else INK
    foot = MUTED_D if dark else MUTED
    text(s, 0.6, H - 0.5, 6, 0.3, f"energiamudel.ee{' · ' + section if section else ''}", size=11,
         color=foot, name="footer")
    if number:
        text(s, W - 1.6, H - 0.5, 1.0, 0.3, number, size=11, color=foot, align=PP_ALIGN.RIGHT,
             name="slide number")
    return s


def card(slide, x, y, w, h, fill=SURF, name=None):
    c = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    c.adjustments[0] = 0.08
    c.fill.solid()
    c.fill.fore_color.rgb = fill
    c.line.fill.background()
    c.shadow.inherit = False
    if name:
        c.name = name
    return c


def style_chart(chart, size=13, dark=False):
    ink = MUTED_D if dark else MUTED
    chart.font.name, chart.font.size = BODY, Pt(size)
    chart.font.color.rgb = ink
    return chart


def column_chart(slide, x, y, w, h, cats, series, colors, vmax, labels, name, point_colors=None):
    cd = CategoryChartData()
    cd.categories = cats
    for sname, vals in series:
        cd.add_series(sname, vals)
    gf = slide.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(x), Inches(y), Inches(w), Inches(h), cd)
    gf.name = name
    ch = style_chart(gf.chart)
    plot = ch.plots[0]
    plot.gap_width, plot.overlap = 60, -10
    for i, s in enumerate(plot.series):
        s.format.fill.solid()
        s.format.fill.fore_color.rgb = colors[i]
        s.format.line.fill.background()
        for j, txt in enumerate(labels[i]):
            pt = s.points[j]
            if point_colors and point_colors[i] and point_colors[i][j]:
                pt.format.fill.solid()
                pt.format.fill.fore_color.rgb = point_colors[i][j]
            dl = pt.data_label
            dl.position = XL_LABEL_POSITION.OUTSIDE_END
            tf = dl.text_frame
            tf.text = txt
            for r in tf.paragraphs[0].runs:
                r.font.size, r.font.bold, r.font.name = Pt(14), True, BODY
                r.font.color.rgb = INK
    va = ch.value_axis
    va.maximum_scale, va.minimum_scale = vmax, 0
    va.has_major_gridlines = True
    va.major_gridlines.format.line.color.rgb = LINE
    va.format.line.fill.background()
    va.tick_labels.font.size = Pt(12)
    va.tick_labels.font.color.rgb = MUTED
    ca = ch.category_axis
    ca.tick_labels.font.size = Pt(13)
    ca.tick_labels.font.color.rgb = INK
    ca.format.line.color.rgb = LINE
    ch.has_legend = len(series) > 1
    if ch.has_legend:
        ch.legend.position = XL_LEGEND_POSITION.TOP
        ch.legend.include_in_layout = False
        ch.legend.font.size = Pt(13)
        ch.legend.font.color.rgb = INK
    return ch


# ---------------------------------------------------------------------------------------------------- 1
s = titled("Elektri hind Eestis 2035. aastal — mida muudab tuumajaam?", dark=True)
s.shapes.title.top, s.shapes.title.height = Inches(1.6), Inches(1.9)
for r in s.shapes.title.text_frame.paragraphs[0].runs:
    r.font.size = Pt(44)
text(s, 0.6, 0.6, 8, 0.4, "energiamudel v5", size=18, color=BLUE_D, bold=True, name="kicker")
text(s, 0.6, 3.6, 7.2, 1.0, "Avatud tunnipõhine elektriturumudel Eestile, Lätile ja Leedule", size=22,
     color=MUTED_D, name="subtitle")
text(s, 0.6, 6.25, 8, 0.4, "Andres Ingerman · 10. november 2026", size=16, color=WHITE, name="author")
# the motif: Estonia's price-duration curve in 2035, without the plant and with two units
cd = CategoryChartData()
cd.categories = list(range(100))
cd.add_series("0 SMR", F["curves"]["gas"])
cd.add_series("2 SMR", F["curves"]["smr2"])
gf = s.shapes.add_chart(XL_CHART_TYPE.LINE, Inches(8.0), Inches(3.9), Inches(4.8), Inches(2.6), cd)
gf.name = "price-duration motif"
ch = style_chart(gf.chart, size=10, dark=True)
ch.has_legend = False
for line_series, color in zip(ch.plots[0].series, (BLUE_D, AMBER)):
    line_series.format.line.color.rgb = color
    line_series.format.line.width = Pt(3)
    line_series.smooth = True
ch.value_axis.visible = ch.category_axis.visible = False
ch.value_axis.has_major_gridlines = False
text(s, 8.0, 6.55, 4.8, 0.3, [[("— 0 SMR", {"color": BLUE_D}), ("   — 2 SMR", {"color": AMBER})]],
     size=11, color=MUTED_D, name="motif legend")
text(s, 8.0, 3.55, 4.8, 0.3, "Eesti tunnihinnad 2035, kallimast odavamani", size=11, color=MUTED_D,
     name="motif caption")
s.notes_slide.notes_text_frame.text = (
    "Tere. Räägin sellest, milline võiks olla elektri hind Eestis 2035. aastal ja mida muudaks tuumajaam. "
    "Kõik numbrid on pärit energiamudelist, mida saab ise proovida aadressil energiamudel.ee.")

# ---------------------------------------------------------------------------------------------------- 2
s = titled("Huvide deklaratsioon", number=f"2 / {N_MAIN}")
card(s, 0.6, 1.55, W - 1.2, 1.7, name="declaration card")
circ = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.95), Inches(1.95), Inches(0.9), Inches(0.9))
circ.fill.solid()
circ.fill.fore_color.rgb = BLUE
circ.line.fill.background()
circ.name = "declaration icon"
circ.text_frame.text = "i"
for r in circ.text_frame.paragraphs[0].runs:
    r.font.size, r.font.bold, r.font.name, r.font.color.rgb = Pt(30), True, HEAD, WHITE
circ.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
text(s, 2.2, 1.85, W - 3.1, 1.6, [
    "Autor teeb koostööd Fermi Energiaga — ettevõttega, mis arendab Eestisse kahest BWRX-300 "
    "plokist koosnevat tuumajaama (iga plokk umbes 300 MW neto, 315 MW bruto). Mudel on loodud, et anda "
    "sellele otsusele sisendit."], size=19, name="declaration")
text(s, 0.6, 3.75, W - 1.2, 0.4, "Et see seos numbreid ei mõjutaks:", size=19, bold=True, name="safeguards head")
for i, (head, body) in enumerate((
        ("Iga eeldus on nähtav.", " Kõik sisendid on muudetavad ja allikaga ning salvestuvad koos tulemusega."),
        ("Stsenaarium ilma jaamata on esimene.", " „0 SMR” — põhivõrguettevõtja baasstsenaarium S1 autori tuule-, "
                                                 "päikese- ja naabrite hinnaeeldustega — on mudeli vaikimisi seis ja "
                                                 "seda näidatakse alati enne jaamaga juhtumeid."))):
    y = 4.35 + i * 0.95
    dot = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.65), Inches(y + 0.08), Inches(0.22), Inches(0.22))
    dot.fill.solid()
    dot.fill.fore_color.rgb = BLUE
    dot.line.fill.background()
    text(s, 1.1, y, W - 1.8, 0.9, [[(head, {"bold": True}), (body, {})]], size=18, name=f"safeguard {i + 1}")
s.notes_slide.notes_text_frame.text = (
    "Enne numbreid: teen koostööd Fermi Energiaga, mis arendab Eestisse tuumajaama. Seepärast on mudel ehitatud "
    "nii, et iga eeldus on nähtav ja põhistsenaarium ilma jaamata tuleb alati esimesena.")

# ---------------------------------------------------------------------------------------------------- 3
gas, s1, s2, s3 = (FORCE[k] for k in ("gas", "smr1", "smr2", "smr3"))
steps = [gas["EE"] - s1["EE"], s1["EE"] - s2["EE"], s2["EE"] - s3["EE"]]
tight_up = sorted([TIGHT["gas"]["EE"] - gas["EE"], TIGHTJ["gas"]["EE"] - gas["EE"]])
tight_lv = sorted([TIGHT["gas"]["EE"], TIGHTJ["gas"]["EE"]])
s = titled("Peamised järeldused", number=f"3 / {N_MAIN}")
cards = [
    (f"{et(gas['EE'], 0)} €/MWh", BLUE,
     "Eesti keskmine elektri hind 2035. aastal põhistsenaariumis „0 SMR”"),
    (f"−{et(min(steps), 0)}…{et(max(steps), 0)} €/MWh", AMBER_INK,
     f"iga {et(UNIT, 0)} MW SMR-plokk langetab Eesti hinda: {et(s1['EE'], 0)} / {et(s2['EE'], 0)} / {et(s3['EE'], 0)} "
     "€/MWh ühe, kahe ja kolme plokiga"),
    (f"+{et(tight_up[0], 0)}…{et(tight_up[1], 0)} €/MWh", RED,
     f"kui naabrite elektrisüsteem on pingeline, tõuseb Eesti hind {et(tight_lv[0], 0)}–{et(tight_lv[1], 0)} "
     "€/MWh-ni: suurim määramatus"),
    ("Läbipaistev", GREEN,
     "iga eeldus on nähtav ja muudetav, iga number allikaga; mudel arvutab teie brauseris"),
]
for i, (big, color, small) in enumerate(cards):
    x, y = 0.6 + (i % 2) * 6.17, 1.6 + (i // 2) * 2.75
    card(s, x, y, 5.95, 2.5, name=f"finding {i + 1}")
    text(s, x + 0.35, y + 0.3, 5.3, 0.9, big, size=40, bold=True, color=color, font=HEAD, name=f"finding {i + 1} figure")
    text(s, x + 0.35, y + 1.3, 5.3, 1.1, small, size=17, color=INK, name=f"finding {i + 1} text")
s.notes_slide.notes_text_frame.text = (
    f"Neli sõnumit. Ametlik stsenaarium annab 2035. aastaks umbes {et(gas['EE'], 0)} eurot megavatt-tunni eest. "
    f"Iga tuumaplokk langetab hinda {et(min(steps), 0)}–{et(max(steps), 0)} eurot. Suurim määramatus pole aga meie "
    "jaamad, vaid naabrite hinnad. "
    "Ja kõik see on läbipaistev: iga eeldust saab ise muuta.")

# ---------------------------------------------------------------------------------------------------- 4
s = titled("Kuidas mudel töötab", number=f"4 / {N_MAIN}")
nodes = {"FI": (3.1, 1.5, "Soome", False), "EE": (3.1, 2.6, "Eesti", True), "LV": (3.1, 3.7, "Läti", True),
         "LT": (3.1, 4.8, "Leedu", True), "SE4": (0.8, 4.2, "Rootsi\nSE4", False), "PL": (1.75, 5.85, "Poola", False)}
D = 0.85
for a, b, label, dx, dy in (("FI", "EE", "EstLink 1+2", 0.25, -0.05), ("EE", "LV", "", 0, 0), ("LV", "LT", "", 0, 0),
                            ("LT", "SE4", "NordBalt", -0.55, -0.5), ("LT", "PL", "LitPol", 0.55, 0.25)):
    (x1, y1, *_), (x2, y2, *_) = nodes[a], nodes[b]
    ln = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1 + D / 2), Inches(y1 + D / 2),
                                Inches(x2 + D / 2), Inches(y2 + D / 2))
    ln.line.color.rgb = LINE
    ln.line.width = Pt(4)
    ln.name = f"link {a}-{b}"
    if label:
        text(s, (x1 + x2) / 2 + D / 2 + dx + 0.15, (y1 + y2) / 2 + D / 2 + dy - 0.15, 1.6, 0.3, label, size=12,
             color=MUTED, name=f"label {label}")
for k, (x, y, label, core) in nodes.items():
    shp = s.shapes.add_shape(MSO_SHAPE.OVAL if core else MSO_SHAPE.ROUNDED_RECTANGLE,
                             Inches(x), Inches(y), Inches(D), Inches(D))
    shp.name = f"node {k}"
    shp.fill.solid()
    shp.fill.fore_color.rgb = BLUE if core else WHITE
    shp.line.color.rgb = BLUE
    shp.line.width = Pt(2.5)
    tf = shp.text_frame
    tf.margin_left = tf.margin_right = 0
    tf.text = label
    for p in tf.paragraphs:
        p.alignment = PP_ALIGN.CENTER
        for r in p.runs:
            r.font.size, r.font.bold, r.font.name = Pt(12), True, BODY
            r.font.color.rgb = WHITE if core else BLUE
text(s, 0.6, 1.5, 2.3, 0.6, [[("●", {"color": BLUE}), (" mudeli turg", {})],
                              [("▢", {"color": BLUE}), (" naaber: hind antud", {})]], size=12, color=MUTED,
     name="diagram legend", space_after=2)
rows = [("Tund-tunnilt.", " Eesti, Läti ja Leedu päev-ette turg 2035: iga tund, iga jaam, salvesti ja ühendus."),
        ("Naabrid.", " Soome, Rootsi (SE4) ja Poola annavad hinna; ühenduste läbilaskevõime on mudelis."),
        ("Optimeerimine.", " Lineaarne optimeerimine (HiGHS) lahendab iga nädala päevade kaupa — otse brauseris."),
        ("Ilm.", " Kolm kliimaaastat (1995, 2008, 2009): tuul, päike, vesi ja tarbimine, kaalutud keskmine."),
        ("Andmed.", " ENTSO-E, TYNDP 2024, ERAA 2025, Elering ja TalTech (S1): 188 dokumenti, üle 7 000 "
                    "andmekirje, iga number allikaga.")]
for i, (head, body) in enumerate(rows):
    y = 1.6 + i * 1.02
    num = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(5.6), Inches(y), Inches(0.5), Inches(0.5))
    num.fill.solid()
    num.fill.fore_color.rgb = SURF
    num.line.fill.background()
    num.name = f"step {i + 1}"
    num.text_frame.text = str(i + 1)
    num.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    for r in num.text_frame.paragraphs[0].runs:
        r.font.size, r.font.bold, r.font.color.rgb, r.font.name = Pt(15), True, BLUE, HEAD
    text(s, 6.35, y - 0.02, W - 6.95, 0.95, [[(head, {"bold": True}), (body, {})]], size=17, name=f"how {i + 1}")
s.notes_slide.notes_text_frame.text = (
    "Mudel arvutab Balti päev-ette turgu tund-tunnilt: kõik jaamad, salvestid ja ühendused. Naabrite hinnad "
    "tulevad ENTSO-E stsenaariumidest. Arvutus käib otse teie brauseris, iga number on allikaga.")

# ---------------------------------------------------------------------------------------------------- 5
s = titled("Kas mudelit saab usaldada?", number=f"5 / {N_MAIN}")
years = [(2023, "2023 · kalibreerimine"), (2024, "2024 · kalibreerimine"), (2025, "2025 · pimetest"),
         (2026, f"2026 jaan–{LAST26} · pimetest")]
tbl = s.shapes.add_table(len(years) + 1, 4, Inches(0.6), Inches(1.75), Inches(6.6), Inches(3.6))
tbl.name = "validation scorecard"
t = tbl.table
t.columns[0].width = Inches(3.0)
for j in range(1, 4):
    t.columns[j].width = Inches(1.2)
hdr = ["Hinnaviga tunnis, €/MWh", "Eesti", "Läti", "Leedu"]


def cell(c, txt, size=16, bold=False, color=INK, fill=None, align=PP_ALIGN.CENTER):
    c.text = nbsp(txt)
    for p in c.text_frame.paragraphs:  # a heading may run to two lines
        p.alignment = align
        for r in p.runs:
            r.font.size, r.font.bold, r.font.color.rgb, r.font.name = Pt(size), bold, color, BODY
    c.vertical_anchor = MSO_ANCHOR.MIDDLE
    c.fill.solid()
    c.fill.fore_color.rgb = fill or WHITE


for j, hd in enumerate(hdr):
    cell(t.cell(0, j), hd, size=14, bold=True, color=WHITE, fill=BLUE, align=PP_ALIGN.LEFT if j == 0 else PP_ALIGN.CENTER)
for i, (yr, label) in enumerate(years, start=1):
    cell(t.cell(i, 0), label, size=15, align=PP_ALIGN.LEFT, fill=SURF)
    for j, z in enumerate(("EE", "LV", "LT"), start=1):
        mae = V[yr]["zones"][z]["mae"]
        ok = mae <= 15
        cell(t.cell(i, j), et(mae), size=18, bold=True, color=WHITE, fill=GREEN if ok else AMBER_INK)
text(s, 0.6, 5.55, 6.6, 0.4, [[("■", {"color": GREEN}), (" eesmärk ≤ 15 täidetud    ", {}),
                               ("■", {"color": AMBER_INK}), (" eesmärk täitmata", {})]], size=13, color=MUTED,
     name="scorecard legend")
mae = {y: sorted(V[y]["zones"][z]["mae"] for z in ("EE", "LV", "LT")) for y in (2023, 2024, 2025, 2026)}
mae25, mae26 = mae[2025], mae[2026]
ok2324 = max(mae[2023][-1], mae[2024][-1]) <= 15
# the figures, not a verdict: 2026 is read again after each refresh of its months (the freeze's rehearsal)
text(s, 7.7, 1.7, W - 8.3, 4.9, [
    "Mudel arvutab läbi tegelikud aastad ja võrdleb iga tunni hinda börsihinnaga.",
    [("Eesmärk: ", {"bold": True}), ("keskmine viga ≤ 15 €/MWh igas riigis.", {})],
    [("2023–2024: ", {"bold": True}), (("hinnaviga eesmärgi piires (" if ok2324 else "")
                                        + f"{et(min(mae[2023][0], mae[2024][0]))}–{et(max(mae[2023][-1], mae[2024][-1]))} €/MWh"
                                        + (")." if ok2324 else "."), {})],
    [("2025: ", {"bold": True}), (f"{et(mae25[0])}–{et(mae25[-1])} €/MWh — aasta, mille järgi parameetreid ei "
                                    "sobitatud; eesmärk on täitmata.", {})],
    [(f"2026 (jaan–{LAST26}): ", {"bold": True}), (f"{et(mae26[0])}–{et(mae26[-1])} €/MWh — teine pimeaasta.", {})],
    [("EstLink 2 rike 2024: ", {"bold": True}), ("mudel kordab selle mõju hinnale.", {})],
    [("Tulemused avaldatakse autori otsusel koos nende näitajatega.", {"color": MUTED})]],
     size=17, name="validation text", space_after=10)
s.notes_slide.notes_text_frame.text = (
    "Kas mudelit saab usaldada? Lasime tal läbi arvutada tegelikud aastad ja võrdlesime iga tunni hinda börsiga. "
    "2023. ja 2024. aastal jääb viga alla 15 euro, mis oli meie eesmärk. 2025. aastal, mille järgi me "
    f"parameetreid ei sobitanud, on viga {round(mae25[0])}–{round(mae25[-1])} eurot: eesmärk on täitmata ja ütlen "
    f"selle otse välja. 2026. aasta on teine pimeaasta: viga on {round(mae26[0])}–{round(mae26[-1])} eurot.")

# ---------------------------------------------------------------------------------------------------- 6
s = titled("Eesti hind 2035: põhistsenaarium ja SMR", number=f"6 / {N_MAIN}")
cats = ["0 SMR\n(põhi)", "1 SMR", "2 SMR", "3 SMR"]
ee = [FORCE[k]["EE"] for k in ("gas", "smr1", "smr2", "smr3")]
lv = [FORCE[k]["LV"] for k in ("gas", "smr1", "smr2", "smr3")]
column_chart(s, 0.5, 1.45, 7.6, 5.4, cats, [("Eesti", ee), ("Läti ja Leedu", lv)], [AMBER, LINE], top(*ee, *lv),
             [[et(v) for v in ee], [et(v) for v in lv]], "price by scenario",
             point_colors=[[BLUE, None, None, None], None])
imp = [FORCE[k]["eeNetImportTwh"] for k in ("gas", "smr1", "smr2", "smr3")]
h150 = [FORCE[k]["ee150"] for k in ("gas", "smr1", "smr2", "smr3")]
text(s, 8.5, 1.6, W - 9.1, 5.0, [
    [("Põhistsenaarium: ", {"bold": True}),
     (f"Elering ja TalTech S1 (24.09.2026), maismaatuul {et(F['eeWindMw'], 0)} ja päike {et(F['eeSolarMw'], 0)} MW "
      f"(autori eeldus); Läti ja Leedu ERAA 2025; naabrid ENTSO-E TYNDP 2024, keskmiselt "
      f"{et(NB['FI'], 0)} / {et(NB['SE4'], 0)} / {et(NB['PL'], 0)} €/MWh (autori hinnatase).", {})],
    [("SMR-plokid ", {"bold": True}), ("lisanduvad samale alusele; muus osas on neli stsenaariumi samad.", {})],
    [("Eesti netoimport: ", {"bold": True}), (" → ".join(et(v) for v in imp) + " TWh aastas", {})],
    [("Tunde ≥ 150 €/MWh: ", {"bold": True}), (" → ".join(et(v, 0) for v in h150), {})],
    [("Hinnad €/MWh, kolme kliimaaasta kaalutud keskmine.", {"color": MUTED, "size": 14})]],
     size=17, name="scenario notes", space_after=12)
s.notes_slide.notes_text_frame.text = (
    "Esimesena põhistsenaarium: Eleringi ja TalTechi S1, minu tuule-, päikese- ja naabrite hinnaeeldustega. "
    f"Eesti keskmine hind on 2035. aastal umbes {et(FORCE['gas']['EE'], 0)} eurot. "
    f"Iga {et(UNIT, 0)}-megavatine plokk lisandub samale alusele ja langetab hinda"
    + ("; kolme plokiga muutub Eesti elektri eksportijaks." if FORCE["smr3"]["eeNetImportTwh"] < 0 else "."))

# ---------------------------------------------------------------------------------------------------- 7
# the coupled run of "each neighbour tight on its own" (spikes/neighbours-2035/each.ts), its newest output
_coupled = sorted((ROOT / "data" / "derived" / "neighbours2035").glob("each_C_d*.json"), key=lambda f: f.stat().st_mtime)
COUPLED = json.loads(_coupled[-1].read_text())["result"] if _coupled else None
s = titled("Jaama tulu ja hinnavahe leping", number=f"7 / {N_MAIN}")
units = ("smr1", "smr2", "smr3")
rows7 = [("", ["1 plokk", "2 plokki", "3 plokki"], True),
         ("Toodang, TWh aastas", [et(FORCE[u]["outputTwh"]) for u in units], False),
         ("Põhistsenaarium: jaama keskmine müügihind, €/MWh", [et(FORCE[u]["capture"]) for u in units], False),
         ("Põhistsenaarium: riigi rahavoog, M€ aastas", [et(-FORCE[u]["cfdMeur"], 0) for u in units], False),
         ("Pingelised naabrid: jaama keskmine müügihind, €/MWh",
          [f"{et(min(TIGHT[u]['capture'], TIGHTJ[u]['capture']), 0)}–{et(max(TIGHT[u]['capture'], TIGHTJ[u]['capture']), 0)}"
           for u in units], False),
         ("Pingelised naabrid: riigi rahavoog, M€ aastas",
          [signed_range(-TIGHT[u]["cfdMeur"], -TIGHTJ[u]["cfdMeur"]) for u in units], False)]
tbl = s.shapes.add_table(len(rows7), 4, Inches(0.6), Inches(1.5), Inches(W - 1.2), Inches(3.9))
tbl.name = "plant and contract"
t = tbl.table
t.columns[0].width = Inches(6.4)
for j in range(1, 4):
    t.columns[j].width = Inches((W - 1.2 - 6.4) / 3)
for i, (label, vals, head) in enumerate(rows7):
    money = i in (3, 5)  # the state's cash flow: red where it pays, green where it receives
    cell(t.cell(i, 0), label, size=15, bold=head, color=WHITE if head else INK, fill=BLUE if head else SURF,
         align=PP_ALIGN.LEFT)
    for j, v in enumerate(vals, start=1):
        cell(t.cell(i, j), v, size=18 if not head else 15, bold=True,
             color=WHITE if head else (RED if money and v.startswith("−") else GREEN if money and v != "0" else INK),
             fill=BLUE if head else WHITE)
text(s, 0.6, 5.6, W - 1.2, 1.2, [
    [("Kahepoolne hinnavahe leping tunnihinnaga, lepinguhind ", {}), (f"{et(F['strike'], 0)} €/MWh", {"bold": True}),
     (" (mudeli vaikeväärtus, muudetav). Miinus: riik maksab jaamale; pluss: jaam maksab riigile.", {})],
    [("Pingelised naabrid: kaks juhtumit — iga naaber pingeline omaette või kõik korraga. Naabrihind on neis "
      "fikseeritud ega näe, et jaam langetab ka naabrite hinda; seotud mudelis on riigi tulu väiksem"
      + (f" (3 plokki, iga naaber omaette: riigi rahavoog {et(-COUPLED['smr3']['cfd'], 0)} M€ aastas)." if COUPLED else "."),
      {"color": MUTED, "size": 13})]],
     size=15, name="contract notes")
s.notes_slide.notes_text_frame.text = (
    "Kui palju jaam teenib ja mida see riigile maksab, sõltub peamiselt naabrite hindadest. Põhistsenaariumis on "
    f"jaama müügihind {' / '.join(et(FORCE[u]['capture'], 0) for u in units)} eurot ühe, kahe ja kolme plokiga ja "
    f"lepinguhind {et(F['strike'], 0)}: kus müügihind jääb lepinguhinnast alla, maksab riik vahe, kus see on kõrgem, "
    "maksab jaam vahe riigile tagasi. Pingeliste naabritega on müügihind "
    f"{' / '.join(et(min(TIGHT[u]['capture'], TIGHTJ[u]['capture']), 0) + '–' + et(max(TIGHT[u]['capture'], TIGHTJ[u]['capture']), 0) for u in units)} eurot.")

# ---------------------------------------------------------------------------------------------------- 8
s = titled("Naabrite hinnad on suurim määramatus", number=f"8 / {N_MAIN}")
cats8 = ["Põhistsenaarium\n(vaikimisi)", "Iga naaber\npingeline omaette", "Kõik naabrid\npingelised korraga"]
nog = [FORCE["gas"]["EE"], TIGHT["gas"]["EE"], TIGHTJ["gas"]["EE"]]
two = [FORCE["smr2"]["EE"], TIGHT["smr2"]["EE"], TIGHTJ["smr2"]["EE"]]
column_chart(s, 0.5, 1.45, 7.6, 5.4, cats8, [("Ilma jaamata", nog), ("2 SMR", two)], [BLUE, AMBER], top(*nog, *two),
             [[et(v) for v in nog], [et(v) for v in two]], "price by neighbours")
nb = {k: F[f"neighbours {k}"] for k in ("DE_2035 (in force)", "TIGHT_2035", "TIGHTJ_2035")}
nbt = s.shapes.add_table(4, 4, Inches(8.5), Inches(1.65), Inches(W - 9.1), Inches(1.9))
nbt.name = "neighbours' prices"
t = nbt.table
t.columns[0].width = Inches(1.9)
for j in range(1, 4):
    t.columns[j].width = Inches((W - 9.1 - 1.9) / 3)
for j, hd in enumerate(["Naabrid, €/MWh", "Soome", "SE4", "Poola"]):
    cell(t.cell(0, j), hd, size=12, bold=True, color=WHITE, fill=BLUE, align=PP_ALIGN.LEFT if j == 0 else PP_ALIGN.CENTER)
for i, (label, key) in enumerate((("Põhi", "DE_2035 (in force)"), ("Omaette", "TIGHT_2035"),
                                  ("Korraga", "TIGHTJ_2035")), start=1):
    cell(t.cell(i, 0), label, size=13, align=PP_ALIGN.LEFT, fill=SURF)
    for j, z in enumerate(("FI", "SE4", "PL"), start=1):
        cell(t.cell(i, j), et(nb[key][z], 0), size=14, bold=True)
text(s, 8.5, 3.85, W - 9.1, 3.0, [
    [("Pingeline: ", {"bold": True}), ("nõudlus (andmekeskused, tööstus) kasvab, aga tuule- ja püsivõimsuse ehitus "
                                       "jääb maha — energiamudeli enda uuring, tingimuslik juhtum.", {})],
    [(f"+{et(tight_up[0], 0)}–{et(tight_up[1], 0)} €/MWh", {"bold": True, "size": 24, "color": RED, "font": HEAD})],
    [(f"tõstavad pingelised naabrid Eesti hinda — "
      f"{'rohkem' if tight_up[1] > gas['EE'] - s3['EE'] else 'vähem'}, kui kolm plokki seda langetavad "
      f"({et(gas['EE'] - s3['EE'], 0)} €/MWh).", {})]],
     size=16, name="neighbours notes", space_after=12)
s.notes_slide.notes_text_frame.text = (
    "Suurim küsimus on naabrid. Põhistsenaariumis on Soome, Rootsi ja Poola keskmine hind 2035. aastal "
    f"{et(NB['FI'], 0)}, {et(NB['SE4'], 0)} ja {et(NB['PL'], 0)} eurot. Kui seal nõudlus kasvab ja ehitus jääb maha, "
    f"tõuseb Eesti hind {et(tight_up[0], 0)}–{et(tight_up[1], 0)} eurot — "
    f"{'rohkem' if tight_up[1] > gas['EE'] - s3['EE'] else 'vähem'}, kui kolm tuumaplokki seda langetavad. "
    f"Kahe ploki puhul jääb hind siis {et(min(two[1:]), 0)}–{et(max(two[1:]), 0)} euro juurde. Need arvud on "
    "fikseeritud naabrihinnaga; seotud mudelis, kus jaam langetab ka naabrite hinda, on Eesti hind mõne euro "
    "võrra madalam.")

# ---------------------------------------------------------------------------------------------------- 9
s = titled("Mida mudel ei ütle — ja kus seda ise proovida", dark=True, number=f"9 / {N_MAIN}")
limits = ["Mudel ei ennusta: tulemused kehtivad näidatud eelduste korral.",
          "2025. aasta valideerimise eesmärk on täitmata.",
          "Naabrite hinnad on mudelis antud; tegelikult reageerivad need Balti kaubandusele, eriti kallitel tundidel.",
          "Kütuse ja CO₂ hind mõjutavad tulemust tugevalt: 2035 gaas 38 €/MWh, CO₂ 198 €/t (ERAA 2025). "
          f"CO₂ {F['co2']['eua']} €/t juures (Ea Energy uuring Kliimaministeeriumile) oleks Eesti hind "
          f"{et(F['co2']['gas']['EE'], 0)} €/MWh."]
for i, lim in enumerate(limits):
    y = 1.7 + i * 1.1
    dot = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.65), Inches(y + 0.1), Inches(0.22), Inches(0.22))
    dot.fill.solid()
    dot.fill.fore_color.rgb = AMBER
    dot.line.fill.background()
    text(s, 1.1, y, 6.2, 1.1, lim, size=18, color=WHITE, name=f"limit {i + 1}")
card(s, 7.5, 1.7, W - 8.1, 4.6, fill=SURF_D, name="try it card")
text(s, 7.9, 2.15, W - 8.9, 0.7, "energiamudel.ee", size=34, bold=True, color=BLUE_D, font=HEAD, name="url")
text(s, 7.9, 3.2, W - 8.9, 3.0, ["Muutke eeldusi ise — tulemus arvutatakse teie brauseris.",
                                 "Iga number on allikaga; meetod ja andmed on kirjeldatud.",
                                 "Küsimused ja tagasiside on teretulnud."], size=18, color=MUTED_D, name="try it text",
     space_after=12)
s.notes_slide.notes_text_frame.text = (
    "Lõpetuseks: mudel ei ennusta, see näitab, mis juhtub antud eeldustel. Kõik eeldused saab ise muuta "
    "aadressil energiamudel.ee. Aitäh!")

# ---------------------------------------------------------------------------------------------------- reserve
s = titled("Lisa: valideerimine aastate kaupa", number="L1", section="lisa")
yrs = (2023, 2024, 2025)
cols = ["Aasta · riik", "Hinnaviga tunnis", "Kestuskõvera viga", "Tunde ≥ 150 €/MWh, mudel / tegelik", "Kõrvalekaldeid kokku"]
tbl = s.shapes.add_table(1 + 3 * len(yrs), len(cols), Inches(0.6), Inches(1.45), Inches(W - 1.2), Inches(4.3))
tbl.name = "validation detail"
t = tbl.table
widths = [2.2, 2.2, 2.3, 3.6, W - 1.2 - 10.3]
for j, wv in enumerate(widths):
    t.columns[j].width = Inches(wv)
for j, hd in enumerate(cols):
    cell(t.cell(0, j), hd, size=12, bold=True, color=WHITE, fill=BLUE)
row = 1
for yr in yrs:
    for k, z in enumerate(("EE", "LV", "LT")):
        zz = V[yr]["zones"][z]
        sh = zz["share150"]
        cell(t.cell(row, 0), f"{yr} · {dict(EE='Eesti', LV='Läti', LT='Leedu')[z]}", size=12, fill=SURF, align=PP_ALIGN.LEFT)
        cell(t.cell(row, 1), et(zz["mae"]), size=13, bold=True, color=GREEN if zz["mae"] <= 15 else AMBER_INK)
        cell(t.cell(row, 2), et(zz["durationRmse"]), size=13)
        m, o = (sh if isinstance(sh, (list, tuple)) else (sh.get("model"), sh.get("observed")))
        cell(t.cell(row, 3), f"{et(100 * m)} % / {et(100 * o)} %", size=13)
        cell(t.cell(row, 4), str(len(V[yr]["failures"])) if k == 0 else "", size=13)
        row += 1
text(s, 0.6, 6.15, W - 1.2, 0.5, "Eesmärgid: hinnaviga ≤ 15, kestuskõvera viga ≤ 10 €/MWh; tunde ≥ 150 €/MWh ±3 p.p.; "
     "toodang ±10 %, ühenduste netovoog ±15 %. Kõik kõrvalekalded: energiamudel.ee → Calibration.", size=11, color=MUTED,
     name="validation targets")

s = titled("Lisa: tundlikkused", number="L2", section="lisa")
sens = F["sensitivities"]
# the owner's four price pairs of LNG and CO₂ (D-183), in the order figures.ts computed them, named by their label
keys = sorted({k.split("|")[1] for k in sens if k.startswith("gas|")}, key=lambda k: (len(k), k))
names = {k: sens[f"gas|{k}"]["label"].replace(".", ",") for k in keys}
tbl = s.shapes.add_table(len(keys) + 1, 3, Inches(0.6), Inches(1.6), Inches(W - 1.2), Inches(0.72 * (len(keys) + 1)))
tbl.name = "sensitivities"
t = tbl.table
t.columns[0].width = Inches(6.0)
t.columns[1].width = t.columns[2].width = Inches((W - 1.2 - 6.0) / 2)
for j, hd in enumerate(["Eesti hind 2035, €/MWh (muutus)", "0 SMR", "2 SMR"]):
    cell(t.cell(0, j), hd, size=14, bold=True, color=WHITE, fill=BLUE, align=PP_ALIGN.LEFT if j == 0 else PP_ALIGN.CENTER)
for i, k in enumerate(keys, start=1):
    cell(t.cell(i, 0), names[k], size=15, fill=SURF, align=PP_ALIGN.LEFT)
    for j, (scen, base) in enumerate((("gas", FORCE["gas"]["EE"]), ("smr2", FORCE["smr2"]["EE"])), start=1):
        v = sens[f"{scen}|{k}"]["EE"]
        cell(t.cell(i, j), f"{et(v)} ({'+' if v - base >= 0 else ''}{et(v - base)})", size=16, bold=True)
text(s, 0.6, 1.6 + 0.72 * (len(keys) + 1) + 0.2, W - 1.2, 1.2, [
    "Mida odavam on LNG ja CO₂, seda madalam on Eesti hind; tuumajaam vähendab hinna sõltuvust kütuse hinnast.",
    [("Neli LNG ja CO₂ hinnapaari; kõik muu nagu põhitulemuses. Naabrite hinnad jäävad igas paaris samaks: "
      "profiil avaldatud kujul omaniku hinnatasemega (D-194).", {"color": MUTED, "size": 14})]], size=16, name="sensitivities notes")

s = titled("Lisa: peamised eeldused ja allikad", number="L3", section="lisa")
items = [("Eesti:", " Elering ja TalTech, stsenaarium S1 (kavand, 24.09.2026) — tarbimine ja tootmisvõimsus; "
                   f"maismaatuul {et(F['eeWindMw'], 0)} ja päike {et(F['eeSolarMw'], 0)} MW autori eeldusena."),
         ("Läti ja Leedu:", " ENTSO-E ERAA 2025, rahvuslikud suundumused 2035."),
         ("Naabrid:", " ENTSO-E TYNDP 2024 „Distributed Energy” 2035, ümber hinnatud stsenaariumi kütusehindadele, "
                      f"autori hinnatasemega keskmiselt {et(NB['FI'], 0)} / {et(NB['SE4'], 0)} / {et(NB['PL'], 0)} €/MWh."),
         ("Kütus ja CO₂ 2035:", " ERAA 2025 — gaas 38,2 €/MWh, CO₂ 197,5 €/t."),
         ("Ilm:", " kliimaaastad 1995, 2008 ja 2009, kaalud 0,233 / 0,367 / 0,400 (TYNDP 2024)."),
         ("Mõõdetud andmed:", " ENTSO-E läbipaistvusplatvorm, Fingrid, JAO, Balti läbipaistvustöölaud; Nord Pooli "
                      "pakkumiskõverad ainult kalibreerimiseks, ei avaldata.")]
for i, (head, body) in enumerate(items):
    y = 1.6 + i * 0.85
    dot = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.65), Inches(y + 0.09), Inches(0.2), Inches(0.2))
    dot.fill.solid()
    dot.fill.fore_color.rgb = BLUE
    dot.line.fill.background()
    text(s, 1.1, y, W - 1.8, 0.8, [[(head, {"bold": True}), (body, {})]], size=17, name=f"source {i + 1}")

# the plant's effect over 300 combinations of the inputs (docs/research/2026-10-18_smr_robustness.md)
M = json.loads((ROOT / "spikes" / "smr-robustness" / "summary.json").read_text())["measures"]
R = json.loads((ROOT / "spikes" / "smr-robustness" / "montecarlo.json").read_text())["ranges"]
ONE_SIGN = all(M[f"EE effect, {n} SMR"]["max"] < 0 for n in (1, 2, 3))
CFD = [M[f"CfD M€/yr, {n} SMR"]["pct"] for n in (1, 2, 3)]
s = titled("Lisa: kui kindel on tuumajaama mõju?", number="L4", section="lisa")
cols = ["Plokke", "Eesti hind langeb, €/MWh\n(90 % juhtudest)", "Mediaan", "Riik maksab lepingu järgi,\nM€ aastas (90 %)"]
tbl = s.shapes.add_table(4, len(cols), Inches(0.6), Inches(1.5), Inches(W - 1.2), Inches(2.6))
tbl.name = "robustness"
t = tbl.table
for j, wv in enumerate([2.2, 3.9, 2.0, W - 1.2 - 8.1]):
    t.columns[j].width = Inches(wv)
for j, hd in enumerate(cols):
    cell(t.cell(0, j), hd, size=14, bold=True, color=WHITE, fill=BLUE)
for i, n in enumerate((1, 2, 3), start=1):
    e, c = M[f"EE effect, {n} SMR"]["pct"], M[f"CfD M€/yr, {n} SMR"]["pct"]
    cell(t.cell(i, 0), f"{n} SMR", size=16, bold=True, fill=SURF)
    cell(t.cell(i, 1), f"{et(-e['95'])}–{et(-e['5'])}", size=18, bold=True)
    cell(t.cell(i, 2), et(-e["50"]), size=18)
    cell(t.cell(i, 3), f"{et(c['5'], 0)}–{et(c['95'], 0)}", size=18)
fossil = M["EE effect, 2 SMR"]["src2"]
text(s, 0.6, 4.4, W - 1.2, 2.4, [
    f"300 sisendite kombinatsiooni: CO₂ 2035 {et(R['eua'][0], 0)}–{et(R['eua'][1], 0)} €/t · gaas "
    f"{et(R['gas'][0], 0)}–{et(R['gas'][1], 0)} €/MWh · naabrite hinnatase ×{et(R['neighbours'][0])}–{et(R['neighbours'][1])} · "
    f"Eesti tarbimine {et(R['demand'][0] * FORCE['gas']['eeLoadTwh'])}–{et(R['demand'][1] * FORCE['gas']['eeLoadTwh'])} TWh · maismaatuul {et(R['onshore'][0], 0)}–"
    f"{et(R['onshore'][1], 0)} MW · päike {et(R['solar'][0], 0)}–{et(R['solar'][1], 0)} MW.",
    ("Mõju märk ei muutu üheski kombinatsioonis. " if ONE_SIGN else "") + "Selle suuruse määravad peamiselt gaasi ja CO₂ hind "
    f"({et(100 * (fossil['gas'] + fossil['eua']), 0)} % erinevustest): mida kallim on fossiilne elekter, seda rohkem jaam säästab.",
    [("Naabrite hinnad on antud; kui jaam langetaks ka Soome hinda, langeks Eesti hind rohkem.", {"color": MUTED, "size": 14})]],
    size=16, name="robustness notes", space_after=10)
s.notes_slide.notes_text_frame.text = (
    "Kas tulemus tuleneb lihtsalt valitud eeldustest? Arvutasime läbi 300 kombinatsiooni. Kaks plokki langetavad Eesti "
    f"hinda {'igal juhul' if ONE_SIGN else 'peaaegu igal juhul'}; 90 % juhtudest "
    f"{et(-M['EE effect, 2 SMR']['pct']['95'], 0)}–{et(-M['EE effect, 2 SMR']['pct']['5'], 0)} €/MWh. "
    + ("Leping maksab riigile igal juhul." if all(c["5"] > 0 for c in CFD) else
       "Lepingu rahavoog riigile sõltub eeldustest: kallima fossiilse elektriga maksab jaam vahe riigile tagasi."))

# CO₂'s price and the plant's effect: the sensitivity (e), Ea Energy's price and ERAA's
s = titled("Lisa: CO₂ hind ja tuumajaama mõju", number="L5", section="lisa")
co2 = [("CO₂ ≈ 78 €/t\n(2026. aasta keskmine)", F["co2_2026"]["gas"]["EE"], F["co2_2026"]["smr2"]["EE"]),
       (f"CO₂ {F['co2']['eua']} €/t\n(Ea Energy)", F["co2"]["gas"]["EE"], F["co2"]["smr2"]["EE"]),
       ("CO₂ 197,5 €/t\n(ERAA 2025, mudeli alus)", FORCE["gas"]["EE"], FORCE["smr2"]["EE"])]
column_chart(s, 0.6, 1.4, 8.2, 5.4, [c[0] for c in co2],
             [("0 SMR", [c[1] for c in co2]), ("2 SMR", [c[2] for c in co2])], [MUTED, BLUE], top(*(c[1] for c in co2)),
             [[et(c[1]) for c in co2], [et(c[2]) for c in co2]], "co2 chart")
card(s, 9.2, 1.6, W - 9.8, 4.9, name="co2 card")
text(s, 9.5, 1.85, W - 10.4, 4.5, [
    [("Kahe ploki mõju Eesti 2035. aasta hinnale, €/MWh", {"bold": True})],
    *[[(f"{c[0].split(chr(10))[0]}: ", {}), (et(c[2] - c[1]), {"bold": True})] for c in co2],
    [("Odavam CO₂ teeb elektri odavamaks ja jaama mõju väiksemaks — kuid see jääb alles.", {"color": MUTED, "size": 14})]],
    size=16, name="co2 notes", space_after=12)
s.notes_slide.notes_text_frame.text = (
    f"Mudeli alus on ERAA 2025 CO₂ hind 197,5 €/t. 2026. aasta keskmise hinnaga (≈78 €/t; tänane hind on umbes 85) oleks "
    f"Eesti hind umbes {et(co2[0][1], 0)} ja kahe plokiga {et(co2[0][2], 0)} €/MWh: jaama mõju väheneb "
    f"{et(co2[2][1] - co2[2][2], 0)}-lt umbes {et(co2[0][1] - co2[0][2], 0)}-le, kuid ei kao.")

OUT.parent.mkdir(parents=True, exist_ok=True)
prs.save(OUT)
print(f"wrote {OUT.relative_to(ROOT)}: {len(prs.slides)} slides")
