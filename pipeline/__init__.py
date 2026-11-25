"""Stage 2: fetch every measured input from a public API and record its provenance.

Layout
------
config.py      the zone, technology and border tables — the vocabulary every other module uses
lineage.py     the provenance record every dataset must carry (SPECIFICATION.md R-DATA-3)
sources/       one module per provider; each knows how to fetch, cache and parse its responses
history.py     fetches everything v5 needs, 2020 to the last complete month (make history)
smoke.py       proves each configured source with one small fetch (make smoke)
register.py    renders docs/SOURCE_REGISTER.md (make register)
migrate_v4.py  one-off: clones v4's lineage-bearing raw cache into data/raw (make migrate-v4)

Nothing in this package runs on the site. It is a maintainer tool, like a build script.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
