# Maintainer entry points. Every target is build-time; nothing here runs on the site.

PY ?= python3
VENV ?= .venv
BIN = $(VENV)/bin

.PHONY: public help setup lock test lint smoke history prices-to-date register nordpool nordpool-schedule db export check gap fit validate ci browser-check freeze deploy deploy-ready live-check offline migrate-v4 clean

help:
	@echo "setup      create $(VENV) and install the project with the dev extra, at the versions of constraints.txt"
	@echo "lock       rewrite constraints.txt from the packages installed in $(VENV) (after an upgrade)"
	@echo "test       run the Python unit tests (npm test in app/ runs the engine's and the page's)"
	@echo "lint       ruff and mypy (npm run lint in app/ checks the TypeScript)"
	@echo "smoke      prove every configured data source with one small fetch (needs .env)"
	@echo "history    fetch every dataset v5 needs into data/raw (idempotent; needs .env)"
	@echo "prices-to-date  the current month's day-ahead prices of the six zones so far (needs .env)"
	@echo "register   regenerate docs/SOURCE_REGISTER.md (R-DOC-5)"
	@echo "nordpool   fetch Nord Pool's aggregated bid curves of today and tomorrow, import the spool (D-108)"
	@echo "nordpool-schedule  install or update the fetch at 15:00 and 23:30 (launchd; D-108)"
	@echo "db         (re)build data/energiamudel.duckdb from data/raw + data/lineage"
	@echo "export     write data/export/ from the database (R-DATA-8)"
	@echo "check      data and export gate: lineage, register, hours, tables, JAO time, verification, rebuild, export"
	@echo "gap        engine vs the LP reference on the R-ENG-8 test weeks (needs Node, highspy)"
	@echo "fit        M3 fits: CHP floor, the gas bid's adder and Kruonis's step, battery cycling cost -> data/derived/fitted_parameters.json"
	@echo "validate   the R-VAL-5 table and the EstLink 2 gate (R-VAL-6) -> data/derived/validation/; fails while a gate is not met"
	@echo "ci         Python and engine tests, lints, the golden fixture (in V8 and JavaScriptCore), the contract types, the built site"
	@echo "browser-check  the built site with its sets in Chromium and WebKit: the page's store, a store that does not answer, the Presentation page's charts (needs a Python with Playwright: PLAYWRIGHT_PYTHON)"
	@echo "freeze     from a clean commit on 3 November: October's data in, every check, the sets against the live site's (mirrored over ssh: DEPLOY_TARGET, RSYNC_RSH), the deck's figures (FETCH=0: no fetch)"
	@echo "deploy     from a clean commit: the gate of R-DEP-2, the opening view and the presentation's states computed, the live site kept for a rollback and its sets compared, then app/dist to DEPLOY_TARGET, every file checked through the way in without the password, the offline copy made (DRY_RUN=1: nothing sent)"
	@echo "live-check after a deploy: the live site against app/dist, then its pages in Chromium and WebKit (PLAYWRIGHT_PYTHON as for browser-check)"
	@echo "public     main's tree as one snapshot commit on the local branch public, for the public repository (D-324); pushes nothing"
	@echo "offline    after a deploy: the site as deployed, with a double-click server, in data/derived/offline/ (no network needed)"
	@echo "migrate-v4 one-off: clone the lineage-bearing v4 raw cache into data/raw (R-DATA-9)"
	@echo "clean      remove the database (raw cache and lineage are kept)"

setup:
	$(PY) -m venv $(VENV)
	$(BIN)/pip install --upgrade pip
	$(BIN)/pip install -c constraints.txt -e ".[dev,reference]"
	cd app && npm ci

lock:
	{ head -2 constraints.txt; $(BIN)/pip freeze --exclude-editable; } > constraints.txt.new
	mv constraints.txt.new constraints.txt

test:
	$(BIN)/pytest

lint:
	$(BIN)/ruff check .
	$(BIN)/mypy

smoke:
	$(BIN)/python -m pipeline.smoke

history:
	$(BIN)/python -m pipeline.history

# the current month's day-ahead prices so far, for the deck's year-to-date averages (D-257; needs .env)
prices-to-date:
	$(BIN)/python -m pipeline.history prices-to-date

register:
	$(BIN)/python -m pipeline.register

nordpool:
	$(BIN)/python -m pipeline.sources.nordpool

# launchd may not read ~/Documents: the fetch runs from a copy outside it (D-108)
NP_HOME := $(HOME)/Library/Application Support/energiamudel
NP_AGENT := $(HOME)/Library/LaunchAgents/ee.energiamudel.nordpool.plist
nordpool-schedule:
	mkdir -p "$(NP_HOME)/nordpool"
	cp pipeline/sources/nordpool_fetch.py "$(NP_HOME)/"
	sed "s|@HOME@|$(HOME)|g" pipeline/sources/nordpool.plist > "$(NP_AGENT)"
	-launchctl bootout gui/$$(id -u)/ee.energiamudel.nordpool 2>/dev/null
	launchctl bootstrap gui/$$(id -u) "$(NP_AGENT)"

db:
	$(BIN)/python -m db.build

export:
	$(BIN)/python -m export

check:
	$(BIN)/python -m db.check

GAP ?= data/derived/gap
gap:
	cd app && node --no-maglev scripts/gap_weeks.ts $(abspath $(GAP))/weeks
	$(BIN)/python -m reference.gap $(abspath $(GAP))/weeks

fit:
	$(BIN)/python -m validate.fit

validate:
	cd app && node --no-maglev scripts/validate_fit.ts --check; s=$$?; node --no-maglev scripts/estlink2.ts && exit $$s

ci: test lint
	cd app && npm test && npm run lint && npm run golden && npm run golden:jsc && npm run contract:check && npm run site

# What make ci cannot see — the page in a browser, its workers and its IndexedDB store (ERRATA E-191): the site built
# with its sets, about three minutes, then spikes/page-speed/browser_check.py in Chromium and WebKit, about one.
# PLAYWRIGHT_PYTHON is a Python that has Playwright and its browsers; Playwright is no dependency of the repository,
# so this is not part of make ci. Run it before a deploy that touches the page's store, its workers or its sets.
PLAYWRIGHT_PYTHON ?= python3
browser-check:
	cd app && npm run build && node --no-maglev scripts/opening.ts
	$(PLAYWRIGHT_PYTHON) -I spikes/page-speed/browser_check.py

# R-DEP-1 … R-DEP-5. The gate first — the tests, lints, golden fixture and contract, the provenance
# coverage; the release rests on the owner's acceptance of the validation (D-123) — then the build goes to
# DEPLOY_TARGET (user@host:path of energiamudel.ee's document root, htdocs/, the owner's, never committed)
# and the deployed site is compared with the build over HTTPS (D-125). Before the copy the opening
# view is computed into dist/data/opening.bin.gz, which the page shows without a run (D-126), and the presentation's
# states into dist/data/sets/, fetched when asked for (D-129): about 1.5 minutes on seven workers. DRY_RUN=1 sends nothing.
# A deploy is of a commit: the bundle and the sets carry its name, and a page built from a changed tree keeps nothing.
# Every file goes up readable to all, whatever the mask of the shell that built it (ERRATA E-169; the Mac's openrsync
# has no --chmod, and rsync gives a file new to the server its source's mode).
# Before the copy, the site as it stands is kept for a rollback in data/raw-aside/live-<the commit of its opening
# view>/, .htaccess left out, and its sets are compared with the
# build's: compare_sets lists what the deploy changes, a dry run's too. After it, every file of the build as the site
# serves it, the site open to a reader and its security headers (validate.deployed, D-318, D-331), and the offline
# copy made of what went up. A rollback sends a kept copy back the same way: `chmod -R a+rX` it, then
# `rsync -rvm --delete --exclude .htaccess data/raw-aside/live-<commit>/ <DEPLOY_TARGET>`. The copies stay until the
# owner has them removed.
DEPLOY_URL ?= https://energiamudel.ee
deploy: deploy-ready ci
	$(BIN)/python -m db.check --fast
	cd app && node --no-maglev scripts/opening.ts
	chmod -R a+rX app/dist
	C=$$($${RSYNC_RSH:-ssh} $(DEPLOY_HOST) 'gzip -dc $(DEPLOY_ROOT)/data/opening.bin.gz | head -c 400' | LC_ALL=C grep -aEo '"commit":"[0-9a-f]+"' | cut -d'"' -f4); \
	  D=data/raw-aside/live-$${C:-$$(date +%Y%m%d-%H%M)}; mkdir -p $$D && rsync -rm --delete --exclude .htaccess $(DEPLOY_TARGET:%/=%)/ $$D/ && \
	  echo "deploy: the site as it stands kept for a rollback in $$D/" && \
	  { node app/scripts/compare_sets.ts $$D/data app/dist/data || echo "deploy: the sets listed above change with this deploy"; }
	rsync -rvm --delete $(if $(filter 1,$(DRY_RUN)),--dry-run) app/dist/ $(DEPLOY_TARGET)
	$(if $(filter 1,$(DRY_RUN)),@echo "deploy: dry run; nothing sent",$(DEPLOYED))
	$(if $(filter 1,$(DRY_RUN)),,$(MAKE) offline)

# DEPLOY_TARGET's host and path, for the ssh steps.
DEPLOY_HOST = $(firstword $(subst :, ,$(DEPLOY_TARGET)))
DEPLOY_ROOT = $(word 2,$(subst :, ,$(DEPLOY_TARGET)))

# R-DEP-5's check of the open site (D-318, D-331): the manifest, every file of the build, the answer to a reader and
# the security headers. DEPLOY_AUTH (user:password) still logs in where a site sits behind Basic Auth.
DEPLOYED = $(BIN)/python -m validate.deployed $(DEPLOY_URL)

# After a deploy, the live site against the build in app/dist — validate.deployed's checks — and then its pages in
# Chromium and WebKit: browser_check.py on DEPLOY_URL, PLAYWRIGHT_PYTHON as
# for browser-check. A few minutes on a quiet machine; it reads the site and changes nothing on it.
live-check:
	$(DEPLOYED)
	$(PLAYWRIGHT_PYTHON) -I spikes/page-speed/browser_check.py $(DEPLOY_URL)

deploy-ready:
	@test -n "$(DEPLOY_TARGET)" || { echo "deploy: DEPLOY_TARGET is not set (user@host:path of the document root)"; exit 1; }
	@git diff --quiet HEAD -- || { echo "deploy: the tree has changes not committed; deploy a commit"; exit 1; }

# The freeze of 3 November (PLAN §9; docs/research/2026-10-18_freeze_rehearsal.md; D-145): the year's partial
# weather and auction files set aside (D-111) and every dataset fetched, the database built afresh (a record fetched
# again replaces its old row only in a new database, D-147), the export and every check,
# the validation tables, then the site's sets computed and compared with the live site's — October's data move none
# of them unless code did — and the deck's figures with a preview of the deck. Run it on 3 November after the World
# Bank's Pink Sheet is out (the afternoon in Tallinn); it stops at the first failure, and commits and deploys nothing,
# both being the owner's. FETCH=0 leaves the fetches out and runs the rest on the data as they are.
FETCH ?= 1
YEAR := $(shell date +%Y)
ASIDE := data/raw-aside/$(shell date +%F)
# the live site's sets, mirrored over ssh first — its data/ alone — so
# that the comparison needs no password and an ssh failure stops the freeze before its long steps (ERRATA E-175)
LIVE := $(ASIDE)/live
freeze:
	@git diff --quiet HEAD -- || { echo "freeze: the tree has changes not committed; freeze from a commit"; exit 1; }
	@test -n "$(DEPLOY_TARGET)" || { echo "freeze: DEPLOY_TARGET is not set (user@host:path of the document root), to mirror the live site's sets"; exit 1; }
	rm -rf $(LIVE) && mkdir -p $(LIVE) && rsync -rm $(DEPLOY_TARGET:%/=%)/data/ $(LIVE)/
ifeq ($(FETCH),1)
	mkdir -p $(ASIDE)
	mv data/raw/openmeteo/openmeteo.archive.EE.$(YEAR).json data/raw/openmeteo/openmeteo.archive.LV.$(YEAR).json \
	  data/raw/openmeteo/openmeteo.archive.LT.$(YEAR).json data/raw/eex/eex.eua_auction.EU.$(YEAR).xlsx $(ASIDE)/
	$(MAKE) history nordpool
endif
	$(MAKE) clean db export check
	cd app && node --no-maglev scripts/validate_fit.ts && node --no-maglev scripts/estlink2.ts
	cd app && npm run build && node --no-maglev scripts/opening.ts && node scripts/compare_sets.ts $(abspath $(LIVE)) dist/data
	cd app && node --no-maglev ../spikes/presentation-2026-11/figures.ts
	python3 spikes/presentation-2026-11/deck.py data/derived/presentation/kulmutatud_$(shell date +%F).pptx
	@git status --short -- data/export data/derived/validation
	@echo "freeze: done. Read 2026's validation row above and the deck's slide 5; commit the export and the validation files; make deploy at the owner's word"

# The site to show without the network (the presentation, D-145): app/dist as the last deploy left it — the opening
# view and the presentation's sets in — copied with a script that serves it on this Mac and opens it in Estonian.
OFFLINE := data/derived/offline
offline:
	@test -f app/dist/data/sets.json.gz || { echo "offline: app/dist holds no computed sets; run it after make deploy"; exit 1; }
	rm -rf $(OFFLINE) && mkdir -p $(OFFLINE) && cp -R app/dist $(OFFLINE)/site
	printf '#!/bin/sh\n# energiamudel without the network: serves ./site on this Mac until the window is closed\ncd "$$(dirname "$$0")/site" || exit 1\n(sleep 1; open "http://127.0.0.1:8765/?lang=et") &\nexec python3 -m http.server 8765 --bind 127.0.0.1\n' > $(OFFLINE)/energiamudel.command
	chmod +x $(OFFLINE)/energiamudel.command
	@echo "offline: $(OFFLINE)/energiamudel.command — double-click it, or copy the folder to a stick"

# The public repository's history (D-324): main's tree as one commit on the local branch `public`, each later call a
# further snapshot on top of it, so that main's own history and its commit messages stay on this machine. Refuses a
# tree with changes not committed, and one that holds what D-323 took out: a Cyrillic letter or an internal host's
# name. The snapshot's author is main's last commit's, the noreply address (R-REPO-5), whatever git is configured
# with. It pushes nothing: pushing the branch is the owner's act (R-PUB-6). Until the first push the branch can be
# dropped and the snapshots started again.
PUBLIC_NOT = [\x{0400}-\x{04FF}]|tools\.fermi\.ee|slides\.fermi\.ee
public:
	@test -z "$$(git status --porcelain --untracked-files=no)" || { echo "public: commit the changes first"; exit 1; }
	@! LC_ALL=en_US.UTF-8 git grep -I -n -P '$(PUBLIC_NOT)' HEAD -- . || { echo "public: the tree holds what D-323 took out (above)"; exit 1; }
	@export GIT_AUTHOR_NAME="$$(git log -1 --format=%an HEAD)" GIT_AUTHOR_EMAIL="$$(git log -1 --format=%ae HEAD)"; \
	  export GIT_COMMITTER_NAME="$$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$$GIT_AUTHOR_EMAIL"; \
	  case "$$GIT_AUTHOR_EMAIL" in *@users.noreply.github.com) ;; *) echo "public: main's last commit is not under the noreply address (R-REPO-5)"; exit 1;; esac; \
	  c=$$(git commit-tree "HEAD^{tree}" $$(git rev-parse -q --verify refs/heads/public >/dev/null && echo "-p public") \
	  -m "energiamudel v5 as of $$(git log -1 --format=%cs HEAD)") && git update-ref refs/heads/public $$c && \
	  echo "public: snapshot $$c on the branch public; nothing pushed"

V4 ?= ../energiamudel-v4.nosync
migrate-v4:
	$(BIN)/python -m pipeline.migrate_v4 $(V4)

clean:
	rm -f data/energiamudel.duckdb data/energiamudel.duckdb.wal
