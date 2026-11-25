"""Published documents read by a person, cached as files with a measured lineage record.

A value a person reads off a page lives in data/documentary/*.csv with its page; the document
itself is cached here, so a reviewer can open the page the CSV cites and the SHA-256 of the
file proves which edition was read (SPECIFICATION.md R-DATA-7, R-PROV-1). The documentary
page records written by db/build.py name the file record in `derived_from`.

Cache:  data/raw/doc/<dataset>.<ext>, dataset `doc.<key>` (the key is the `source` column of
        the documentary CSVs). HTML pages are cached as served; a page that renders its text
        with JavaScript is cached anyway and noted, and its values are read in a browser.
Links:  as read on 2026-09-24. Where the publisher's original URL is dead, `url` is an archived
        copy and `original` the dead address (ERRATA E-005).
"""

from __future__ import annotations

from pathlib import Path

from . import cached_get

RAW = "doc"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/128.0 Safari/537.36"}
PUBLIC = "public document; cited with page"

# key -> (url, ext, publisher and title, licence, notes); `dataset` overrides the id where a
# file migrated from v4 keeps the id it was fetched under.
DOCS: dict[str, dict] = {
    # ---- documents behind the person-read rows imported from v4 (re-verified in Stage 2)
    "ast_pso_2025": dict(
        url="https://www.ast.lv/sites/default/files/editor/PSO_Zinojums_2025_LV_FINAL.pdf",
        ext="pdf", title="AST, Pārvades sistēmas operatora novērtējuma ziņojums 2025"),
    "elering_arengukava_2025_2034": dict(
        url="https://web.archive.org/web/20250827064607/https://elering.ee/sites/default/"
            "files/2025-01/Eesti%20elektri%C3%BClekandev%C3%B5rgu%20arengukava%202025-2034.pdf",
        original="https://elering.ee/sites/default/files/2025-01/Eesti%20elektri%C3%BClekandev"
                 "%C3%B5rgu%20arengukava%202025-2034.pdf",
        ext="pdf", title="Elering, Eesti elektriülekandevõrgu arengukava 2025-2034 "
                         "(Internet Archive copy of 2025-08-27; removed from elering.ee)"),
    "elering_vka_2025": dict(
        url="https://eleringweb.cdn.prismic.io/eleringweb/E2ycOv1JSD1PO4Ow_Elering_VKA_2025_"
            "veeb-1.pdf",
        original="https://elering.ee/sites/default/files/public/varustuskindluse%20konverentsid/"
                 "2025/Elering_VKA_2025_veeb-1.pdf",
        ext="pdf", title="Elering, Eesti elektri varustuskindluse aruanne 2025"),
    "enefit_power_2026": dict(url="https://industry.enefit.com/et/elekter-ja-soojus", ext="html",
                              title="Enefit Industry, Elekter ja soojus (plant list)"),
    "err_2026_gas_tender": dict(
        url="https://www.err.ee/1610004487/eleringi-gaasijaamade-plaan-tekitab-tuumajaama-"
            "rajajates-hammingut", ext="html",
        title="ERR, Eleringi gaasijaamade plaan (2026-04-23)"),
    "litgrid_plan_2026_2035": dict(
        url="https://www.litgrid.eu/wp-content/uploads/2026/07/Litgrid-tinklo-pletros-planas-"
            "2026-2035.pdf", ext="pdf", title="Litgrid, tinklo plėtros planas 2026-2035"),
    "svk_lma_2026": dict(
        dataset="svk.langsiktig_marknadsanalys_2026",
        url="https://www.svk.se/49e8f3/siteassets/om-oss/rapporter/langsiktig-marknadsanalys/"
            "langsiktig-marknadsanalys-2026.pdf", ext="pdf",
        title="Svenska kraftnät, Långsiktig marknadsanalys 2026"),
    "eesti_energia_err_2025": dict(
        url="https://news.err.ee/1609638418/analysis-estonia-s-oil-shale-plants-kept-price-of-"
            "electricity-17-lower-in-2024", ext="html",
        title="ERR News, Eesti Energia analysis of oil-shale market entry prices (2025-03-20)"),
    "entsoe_tyndp2016_p1009": dict(
        url="https://eepublicdownloads.entsoe.eu/clean-documents/tyndp-documents/TYNDP%202016/"
            "projects/P1009.pdf", ext="pdf", title="ENTSO-E TYNDP 2016, project sheet P1009"),
    "keskkonnauuringute_keskus_2013": dict(
        url="https://energiatalgud.ee/sites/default/files/images_sala/7/78/Keskkonnauuringute_"
            "Keskus._Kasvuhoonegaaside_riigispetsiifiliste_eriheitetegurite_v%C3%A4ljat%C3%B6%C3%"
            "B6tamine_energeetika_sektoris_I.pdf", ext="pdf",
        title="Keskkonnauuringute Keskus (2013), riigispetsiifilised eriheitetegurid"),
    # ---- successors of dead or superseded editions
    "elering_arengukava_2026_2035": dict(
        url="https://eleringweb.cdn.prismic.io/eleringweb/I6Fa5cjdmHuG9ipW_Eestielektri%C3%BClek"
            "andev%C3%B5rguarengukava2026-2035.pdf", ext="pdf",
        title="Elering, Eesti elektriülekandevõrgu arengukava 2026-2035"),
    # ---- Elering and TalTech's scenarios of 2026 (specification revision 1.6, D-036)
    "taltech_elering_s1_2026": dict(
        url="https://eleringweb.cdn.prismic.io/eleringweb/PZt3PXskHv4M6ix5_Eesti_10_stsenaariumi_"
            "28092026.pdf", ext="pdf",
        note="public consultation to 2026-10-12, https://www.elering.ee/konsultatsioon/"
             "eesti-energiasusteemi-arengustsenaariumid",
        title="TalTech and Elering, Eesti baasvaade ja kümme analüüsitavat stsenaariumit aastani "
              "2050 (version agreed with Elering, 24.09.2026)"),
    # ---- sources found in the grilling of 2026-09-24 (SPECIFICATION.md Appendix A.2)
    "entsoe_hvdc_stats_2024": dict(
        url="https://eepublicdownloads.entsoe.eu/clean-documents/SOC%20documents/Nordic/2024/"
            "HVDC_Utilisation_and_Availability_Statistics_2024.pdf", ext="pdf",
        title="ENTSO-E, HVDC Utilisation and Availability Statistics 2024 (2025-06-30)"),
    "entsoe_hvdc_stats_2023": dict(
        url="https://eepublicdownloads.entsoe.eu/clean-documents/SOC%20documents/Nordic/2024/"
            "HVDC_Utilisation_and_Unavailability_Statistics_2023.pdf", ext="pdf",
        title="ENTSO-E, HVDC Utilisation and Unavailability Statistics 2023"),
    "entsoe_hvdc_stats_2021": dict(
        url="https://eepublicdownloads.entsoe.eu/clean-documents/SOC%20documents/Nordic/2021_ENTSO"
            "_E_HVDC_Utilisation_and_Unavailability_Statistics.pdf", ext="pdf",
        title="ENTSO-E, HVDC Utilisation and Unavailability Statistics 2021"),
    "entsoe_hvdc_stats_2020": dict(
        url="https://eepublicdownloads.entsoe.eu/clean-documents/SOC%20documents/Nordic/ENTSO-E_"
            "HVDC_Utilisation_and_Unavailability_Statistics_2020.pdf", ext="pdf",
        title="ENTSO-E, HVDC Utilisation and Unavailability Statistics 2020"),
    "entsoe_hvdc_stats_2019": dict(
        url="https://eepublicdownloads.entsoe.eu/clean-documents/Publications/SOC/Nordic/ENTSOE_"
            "HVDC_Utilisation_and_Unavailability_Statistics_2019.pdf", ext="pdf",
        title="ENTSO-E, HVDC Utilisation and Unavailability Statistics 2019"),
    "entsoe_hvdc_guidelines_2020": dict(
        url="https://eepublicdownloads.entsoe.eu/clean-documents/SOC%20documents/Nordic/Nordic_and"
            "_Baltic_Guidelines_for_HVDC_Statistics_17.11.2020.pdf", ext="pdf",
        title="ENTSO-E, Nordic and Baltic Guidelines for HVDC Statistics (2020-11-17)"),
    "cigre_tb815": dict(
        url="https://electra.cigre.org/312-october-2020/technical-brochures/update-of-service-"
            "experience-of-hv-underground-and-submarine-cable-systems.html", ext="html",
        title="CIGRE TB 815 (2020), ELECTRA 312 summary page"),
    "ofgem_ghd_2016": dict(
        url="https://www.ofgem.gov.uk/sites/default/files/docs/2016/10/ofgem_-_availability_model"
            "_update_-_final.pdf", ext="pdf",
        title="Ofgem / GHD (2016), Target availability figures for HVDC interconnectors"),
    "konkurentsiamet_2024": dict(
        url="https://www.konkurentsiamet.ee/sites/default/files/documents/2025-12/Electricity%20"
            "and%20gas%20market%20report%202024.pdf", ext="pdf",
        title="Konkurentsiamet, Electricity and gas market report 2024"),
    "elering_reserves_2025_11_07": dict(
        url="https://elering.ee/en/article/baltic-electricity-transmission-operators-announce-"
            "plan-phase-out-balancing-resources", ext="html",
        title="Elering, Baltic TSOs announce plan to phase out balancing resources (2025-11-07)"),
    "enefit_reserve_contract_2025": dict(
        url="https://finance.yahoo.com/news/eesti-energia-subsidiary-enefit-power-150000699.html",
        ext="html", note="GlobeNewswire's page timed out from here on 2026-09-24; Yahoo Finance "
                         "carries the same GlobeNewswire release",
        publisher_url="https://www.globenewswire.com/news-release/2025/11/11/3185550/0/en/Eesti-"
                      "Energia-Subsidiary-Enefit-Power-Wins-Tender-for-Reserve-Capability.html",
        title="Eesti Energia, Enefit Power wins tender for reserve capability (2025-11-11)"),
    "pse_litpol_constraints": dict(
        url="https://www.pse.pl/documents/31287/20735372/Ograniczenia_alokacji_LitPol_i_SwePol_"
            "EN.pdf", ext="pdf", title="PSE, Allocation constraints on LitPol and SwePol"),
    "nordic_tsos_batteries_2025": dict(
        url="https://www.fingrid.fi/globalassets/dokumentit/fi/sahkomarkkinat/reservit/batteries-"
            "in-the-nordic-reserve-markets-april-2025.pdf", ext="pdf",
        title="Energinet, Fingrid, Statnett, Svenska kraftnät: Batteries in the Nordic reserve "
              "markets (April 2025)"),
    "cleanhorizon_index": dict(url="https://www.cleanhorizon.com/battery-index/", ext="html",
                               title="Clean Horizon, Storage Index methodology"),
    "modo_gb_cycles_2024": dict(
        url="https://modoenergy.com/research/en/gb-battery-energy-storage-cycle-value-uplift-aug-"
            "2024", ext="html", title="Modo Energy, GB battery cycling (August 2024)"),
    "gev_bwrx300": dict(
        url="https://www.gevernova.com/content/dam/gevernova-nuclear/global/en_us/documents/carbon"
            "-free-power/005N9751-BWRX-300-General-Description.pdf", ext="pdf",
        title="GE Vernova Hitachi, BWRX-300 General Description"),
    "acer_hmmcp_da_2026": dict(
        url="https://www.acer.europa.eu/sites/default/files/documents/Individual%20Decisions/ACER-"
            "Decision-02-2026-harmonised-clearing-prices-day-ahead.pdf", ext="pdf",
        title="ACER Decision 02/2026, harmonised maximum and minimum clearing prices (SDAC)"),
    "acer_hmmcp_da_2026_annex": dict(
        url="https://www.acer.europa.eu/sites/default/files/documents/Individual%20Decisions_annex/"
            "ACER-Decision-02-2026-AnnexI.pdf", ext="pdf",
        title="ACER Decision 02/2026, Annex I: HMMCP methodology for SDAC (the values)"),
    "nemo_hmmcp_min_2026": dict(
        url="https://www.nemo-committee.eu/assets/files/harmonised-minimum-clearing-price-for-sdac"
            "-to-be-set-to-600-eur-per-mwh-starting-from-the-28th-may-2026-(trading-date).pdf",
        ext="pdf",
        title="NEMO Committee, SDAC minimum clearing price -600 EUR/MWh from 2026-05-28"),
    "epex_hmcp_5000": dict(
        url="https://www.epexspot.com/en/news/harmonised-maximum-clearing-price-sdac-be-set-5000-"
            "eurmwh-20th-september-trading-date", ext="html",
        title="EPEX SPOT, SDAC maximum clearing price +5 000 EUR/MWh from 20 September "
              "(2022; withdrawn, see epex_hmcp_4000_remains)"),
    "eesti_energia_balti11_cfb": dict(
        url="https://web.archive.org/web/20210516143721/https://www.energia.ee/uudised/avaleht/"
            "-/newsv2/migreeritud-uudis-344", ext="html",
        original="https://www.energia.ee/uudised/avaleht/-/newsv2/migreeritud-uudis-344 "
                 "(HTTP 404 on 2026-09-24)",
        title="Eesti Energia news: Balti power plant unit 11 renovated with circulating "
              "fluidised-bed boilers (which units are CFB)"),
    "epex_hmcp_4000_remains": dict(
        url="https://www.epexspot.com/en/news/no-changes-harmonised-maximum-clearing-price-sdac-"
            "20-september-it-remains-4000-eurmwh", ext="html",
        title="EPEX SPOT, No changes in harmonised maximum clearing price for SDAC from "
              "20 September: it remains at 4,000 EUR/MWh (2022)"),
    "acer_eraa2025_methodology": dict(
        url="https://www.acer.europa.eu/sites/default/files/documents/Individual%20Decisions_annex/"
            "ACER-Decision-06-2026-ERAA-2025-Annex-Ic-Methodology.pdf", ext="pdf",
        title="ACER Decision 06/2026, ERAA 2025 Annex Ic Methodology"),
    # ---- the gas price on the efficiencies' basis: net calorific value (D-171, ERRATA E-167)
    "ipcc_2006_v2_ch1": dict(
        url="https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/"
            "V2_1_Ch1_Introduction.pdf", ext="pdf",
        title="IPCC, 2006 Guidelines for National Greenhouse Gas Inventories, Volume 2 Energy, "
              "Chapter 1 Introduction"),
    # ---- national counts beside IRENA's on the Statistics page (D-093)
    "elering_2025_01_30_res": dict(
        url="https://elering.ee/en/article/both-solar-and-wind-energy-production-exceeded-one-"
            "terawatt-hours-last-year", ext="html",
        title="Elering, Both solar and wind energy production exceeded one terawatt-hours last "
              "year (2025-01-30): Estonia's wind and solar capacity at the end of 2024"),
    "pv_magazine_2026_03_04_estonia": dict(
        url="https://www.pv-magazine.com/2026/03/04/estonia-deploys-105-mw-of-solar-in-2025/",
        ext="html",
        title="pv magazine, Estonia deploys 105 MW of solar in 2025 (2026-03-04), citing Eesti "
              "Taastuvenergia Koda"),
    # ---- the climate years' selection (the Weather page, D-084)
    "tyndp2022_sbg": dict(
        url="https://www.entsog.eu/sites/default/files/2021-10/entsos_TYNDP_2022_Scenario_"
            "Building_Guidelines_211007_1.pdf", ext="pdf",
        title="ENTSO-E and ENTSOG, TYNDP 2022 Scenario Building Guidelines, October 2021 "
              "(climatic years, §4.1; the Dunkelflaute ranking, Table 20)"),
    "tyndp2022_iosn_ig": dict(
        url="https://eepublicdownloads.blob.core.windows.net/public-cdn-container/tyndp-documents/"
            "TYNDP2022/public/IoSN-IG.pdf", ext="pdf",
        title="ENTSO-E, TYNDP 2022 System Needs Study Implementation Guidelines (the method of "
              "the representative climate years, §6.2-6.3)"),
    "tyndp2024_methodology": dict(
        url="https://2024.entsos-tyndp-scenarios.eu/wp-content/uploads/2025/01/TYNDP_2024_"
            "Scenarios_Methodology_Report_Final_Version_250128.pdf", ext="pdf",
        title="ENTSO-E and ENTSOG, TYNDP 2024 Scenarios Methodology Report, final version, "
              "January 2025 (climate years, §4.1; the Dunkelflaute case, §14)"),
    "tyndp2024_ig": dict(
        url="https://eepublicdownloads.blob.core.windows.net/public-cdn-container/tyndp-documents/"
            "TYNDP2024/TYNDP%202024%20IG_intermediate_version.pdf", ext="pdf",
        title="ENTSO-E, TYNDP 2024 Implementation Guidelines (climate-year weights)"),
    "tyndp2024_ig_opinion": dict(
        url="https://eepublicdownloads.blob.core.windows.net/public-cdn-container/tyndp-documents/"
            "TYNDP2024/foropinion/CBA_Implementation_Guidelines.pdf", ext="pdf",
        title="ENTSO-E, Implementation Guidelines for TYNDP 2024 based on the 4th CBA Guideline "
              "(version for ACER's opinion)"),
    "tyndp2026_methodology": dict(
        url="https://www.entsog.eu/sites/default/files/2026-06/ENTSOs_TYNDP2026_Scenarios_"
            "Methodology_Report_260611.pdf", ext="pdf",
        title="ENTSOs, TYNDP 2026 Scenarios Methodology Report, version June 2026 (weather "
              "scenarios and their weights, Annex III)"),
    "err_estlink2_2024": dict(url="https://news.err.ee/1609560328/estonian-finnish-undersea-power"
                                  "-link-estlink-2-down-again-due-to-fault", ext="html",
                              title="ERR News, EstLink 2 down again due to fault"),
    "err_estlink2_2024_july": dict(url="https://news.err.ee/1609422787/estlink-2-outage-nearly-"
                                       "doubles-july-electricity-prices-in-estonia", ext="html",
                                   title="ERR News, EstLink 2 outage nearly doubles July prices"),
    "err_estlink2_2025_feb": dict(url="https://news.err.ee/1609605374/estlink-2-outage-to-cost-"
                                      "consumers-50-million-in-february", ext="html",
                                  title="ERR News, EstLink 2 outage to cost consumers "
                                        "EUR 50 million in February"),
    "err_estlink2_asymmetry": dict(url="https://news.err.ee/1609861752/electricity-links-larger-"
                                       "areas-affecting-smaller-expensive-areas-cheaper-ones",
                                   ext="html", title="ERR News, Elering on how larger areas "
                                                     "affect smaller ones"),
    "err_2025_annual": dict(url="https://news.err.ee/1609903027/estonia-got-half-its-2025-"
                                "electricity-from-finland-though-prices-double", ext="html",
                            title="ERR News, Estonia got half its 2025 electricity from Finland"),
    "litgrid_artelys_nraa_2026": dict(
        url="https://www.artelys.com/app/uploads/2026/07/Public_Report_vF.pdf", ext="pdf",
        title="Litgrid / Artelys, National Resource Adequacy Assessment 2028-2035 (2026-06-30)"),
    "svk_kma_2024": dict(
        url="https://www.svk.se/4959a4/siteassets/om-oss/rapporter/2025/kma-2024_20250324.pdf",
        ext="pdf", title="Svenska kraftnät, Kortsiktig marknadsanalys 2024"),
    "acer_opinion_01_2025": dict(
        url="https://www.acer.europa.eu/sites/default/files/documents/Official_documents/Acts_of_"
            "the_Agency/Opinions/Opinions/ACER_Opinion_01-2025_Polish_National_Resource_Adequacy_"
            "Assessment.pdf", ext="pdf",
        title="ACER Opinion 01/2025 on the Polish National Resource Adequacy Assessment"),
    "yle_ol3_2023": dict(url="https://yle.fi/a/74-20032375", ext="html",
                         title="Yle News, Finnish nuclear plant throttles production as price "
                               "plunges (2023)"),
    # ---- the delivery variant of SPECIFICATION revision 1.3 (R-SUP-9, Appendix A.5)
    "windeurope_stats_2025": dict(
        url="https://www.csve.cz/wp-content/uploads/2026/02/windeurope-european-stats-2025.pdf",
        publisher_url="https://windeurope.org/data/products/wind-energy-in-europe-2025-statistics-"
                      "and-the-outlook-for-2026-2030/",
        note="copy published by the Czech Wind Energy Association (CSVE); WindEurope hands the "
             "report out behind a form",
        ext="pdf", title="WindEurope, Wind energy in Europe: 2025 statistics and the outlook for "
                         "2026-2030 (February 2026)"),
    "irena_capacity_2026": dict(
        url="https://www.irena.org/-/media/Files/IRENA/Agency/Publication/2026/Mar/"
            "IRENA_DAT_RE_Capacity_Statistics_2026.pdf",
        publisher_url="https://www.irena.org/Publications/2026/Mar/"
                      "Renewable-capacity-statistics-2026",
        ext="pdf", title="IRENA, Renewable capacity statistics 2026 (March 2026)"),
    "litgrid_generation_capacity": dict(
        url="https://www.litgrid.eu/index.php/power-system/power-system-information/"
            "generation-capacity/546", ext="html",
        title="Litgrid, Generation capacity (installed capacity by source)"),
    "ess_lt_capex_2025": dict(
        url="https://www.energy-storage.news/lithuania-capex-support-scheme-help-fund-4000mwh-of-"
            "bess-battery-storage/", ext="html",
        title="Energy-Storage.news, Lithuania's capex support scheme to help fund 4,000MWh of "
              "energy storage (2025-08-27)"),
    "ess_news_auvere_2025": dict(
        url="https://www.ess-news.com/2025/03/27/estonia-inagurates-its-largest-battery-storage-"
            "project/", ext="html",
        title="ESS News, Estonia inaugurates its largest battery energy storage project "
              "(2025-03-27)"),
    "ess_news_baltic_2025_10": dict(
        url="https://www.ess-news.com/2025/10/30/latvia-adds-big-batteries-to-complete-grid-sync-"
            "with-europe-two-major-estonian-projects-secure-finance/", ext="html",
        title="ESS News, Latvia adds big batteries to complete grid sync with Europe, two major "
              "Estonian projects secure finance (2025-10-30)"),
    "nidec_hertz1_2025": dict(
        url="https://www.nidec-conversion.com/nidec-awarded-bess-project-estonia/", ext="html",
        title="Nidec Conversion, Nidec Conversion awarded the Hertz 1 project, the largest BESS "
              "project in Estonia (2025-03-18)"),
    # ---- unit constants (SPECIFICATION revision 1.3, OPEN-13; PLAN §3.9)
    "nist_sp811": dict(
        url="https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication811e2008.pdf",
        ext="pdf", title="NIST Special Publication 811 (2008 edition), Guide for the Use of the "
                         "International System of Units (SI)"),
    # ---- the research on Sweden and Poland in 2035
    # (docs/research/2026-10-12_sweden_poland_2035.md)
    "svk_kma_2025": dict(
        url="https://www.svk.se/494e46/contentassets/15b86ea1af674859867243761471c6ca/aktuella-tendenser-"
            "i-kraftsystemet--kortsiktig-marknadsanalys-2025.pdf", ext="pdf",
        title="Svenska kraftnät, Aktuella tendenser i kraftsystemet, "
              "Kortsiktig marknadsanalys 2025"),
    "svk_nup_2026": dict(
        url="https://www.svk.se/49011f/contentassets/d92ea45b663f4e1f839d025479182f13/svk_natutveckling_"
            "nup_2026-2035_eng.pdf", ext="pdf",
        title="Svenska kraftnät, Network development plan 2026-2035"),
    "svk_kraftbalans_2026": dict(
        url="https://www.svk.se/49aa58/siteassets/om-oss/rapporter/2026/kraftbalansen-pa-den-svenska-"
            "elmarknaden-rapport-var-2026.pdf", ext="pdf",
        title="Svenska kraftnät, Kraftbalansen på den svenska elmarknaden, rapport våren 2026"),
    "svk_leveranssaker_2026": dict(
        url="https://www.svk.se/49c81e/siteassets/om-oss/rapporter/2026/uppdrag-3.1-planering-for-ett-"
            "leveranssakert-elsystem.pdf", ext="pdf",
        title="Svenska kraftnät, Planering för ett leveranssäkert elsystem (uppdrag 3.1), 2026"),
    "svk_invplan_2026": dict(
        url="https://www.svk.se/49ddb2/contentassets/259ee3494c0f499aaf8acdfb5eba5e7d/arende_nr_2026-2692_"
            "regeringsuppdrag_att_inkomma_med_en_reviderad_investesteringsplan_2027-2029.pdf",
        ext="pdf",
        title="Svenska kraftnät, Reviderad investeringsplan 2027-2029 (17 June 2026)"),
    "gov_invplan_2026": dict(
        url="https://regeringen.se/contentassets/bfe589668a254df094f1f1e71307ca76/uppdrag-till-affarsverket-"
            "svenska-kraftnat-att-inkomma-med-en-reviderad-investeringsplan.pdf", ext="pdf",
        title="Regeringen, beslut KN2026/01027: uppdrag till Svenska kraftnät om en reviderad "
              "investeringsplan (7 May 2026)"),
    "gov_rs_2022": dict(
        url="https://www.regeringen.se/pressmeddelanden/2022/11/regeringen-beslutar-om-en-"
            "tillforlitlighetsnorm-for-sverige/", ext="html",
        title="Regeringen, Regeringen beslutar om en tillförlitlighetsnorm för Sverige "
              "(17 Nov 2022)"),
    "gov_offshore_2026": dict(
        url="https://regeringen.se/pressmeddelanden/2026/07/nya-beslut-om-havsbaserad-vindkraft/",
        ext="html",
        title="Regeringen, Nya beslut om havsbaserad vindkraft (16 July 2026)"),
    "gps_q1_2026": dict(
        url="https://mb.cision.com/Main/155/4355787/4125315.pdf", ext="pdf",
        title="Green Power Sweden, Vindkraftsstatistik och prognos Q1 2026 (2 June 2026)"),
    "nordic_maxntc": dict(
        url="https://www.nordpoolgroup.com/globalassets/download-center/tso/max-ntc.pdf", ext="pdf",
        title="Nordic TSOs, Maximum NTC (valid from 1 January 2024)"),
    "fingrid_aurora": dict(
        url="https://www.fingrid.fi/en/news/news/2025/aurora-line-power-transmission-connection-to-be-"
            "commissioned-on-november-13/", ext="html",
        title="Fingrid, Aurora Line to be commissioned on 13 November (29 Oct 2025)"),
    "pse_prsp_2027_2036_apr2026": dict(
        url="https://www.pse.pl/documents/20182/7102190804/PRSP_2027-2036-dokument_glowny_projekt_po_"
            "konsultacji.pdf/de2f004f-8a80-4264-907a-a38d52c5d50f", ext="pdf",
        title="PSE, Plan rozwoju sieci przesyłowej 2027-2036, projekt po konsultacji (April 2026)"),
    "kpeik_2026_annex1_wam": dict(
        url="https://www.gov.pl/attachment/416c5e28-f174-4996-a9c0-c75da7d83566", ext="pdf",
        title="Ministry of Energy (PL), KPEiK annex 1, scenario WAM (adopted 8 June 2026)"),
    "kpeik_2026_annex2_wem": dict(
        url="https://www.gov.pl/attachment/5d1de0a5-7b21-4d8b-9b59-6673505e8ac8", ext="pdf",
        title="Ministry of Energy (PL), KPEiK annex 2, scenario WEM (adopted 8 June 2026)"),
    "mkis_reg_2024_1389": dict(
        url="https://dziennikustaw.gov.pl/D2024000138901.pdf", ext="pdf",
        title="Rozporządzenie Ministra Klimatu i Środowiska z 13 września 2024 "
              "(Dz.U. 2024 poz. 1389), "
              "the reliability standard"),
    "ure_cm_main_2030": dict(
        url="https://www.ure.gov.pl/pl/urzad/informacje-ogolne/aktualnosci/13031,Prezes-URE-oglasza-"
            "ostateczne-wyniki-aukcji-glownej-rynku-mocy-na-dostawy-w-2030.html", ext="html",
        title="URE, ostateczne wyniki aukcji głównej rynku mocy na rok dostaw 2030"),
    "acer_decision_06_2026_eraa2025": dict(
        url="https://www.acer.europa.eu/sites/default/files/documents/Individual%20Decisions/ACER-Decision-"
            "06-2026-ERAA-2025.pdf", ext="pdf",
        title="ACER Decision 06/2026 on the European Resource Adequacy Assessment 2025"),
    "entsoe_eraa_2025_annex6": dict(
        url="https://eepublicdownloads.blob.core.windows.net/public-cdn-container/clean-documents/sdc-"
            "documents/ERAA/ERAA_2025_Annex6_CountryComments_ENTSOEProposal_Dec2025.pdf", ext="pdf",
        title="ENTSO-E, ERAA 2025 Annex 6, country comments (December 2025)"),
    "tge_gpi_pscmi": dict(
        url="https://gpi.tge.pl/en/web/wegiel/47", ext="html",
        title="TGE, Polish Steam Coal Market Index (PSCMI 1)",
        note="the monthly table is published as an image; v4's coal_pscmi.csv transcribes it"),
    # ---- the sources of the research on Finland and on Sweden and Poland in 2035
    # (docs/research/2026-10-11_finland_2035.md, docs/research/2026-10-12_sweden_poland_2035.md)
    "acer_eraa_2025": dict(
        url="https://www.acer.europa.eu/sites/default/files/documents/Individual%20Decisions_annex/"
            "ACER-Decision-06-2026-ERAA-2025-Annex-II-Amendments.pdf",
        note="a corrigendum of 1 July 2026 corrects other zones' rows of Tables 1, 3, 5, 6 and 7 "
             "(EE00, MT00, LT00, TR00, CY00, MD00), not the Swedish ones: "
             "https://www.acer.europa.eu/sites/default/files/documents/Individual%20Decisions_annex"
             "/20260701-Corrigendum-Annex-II-ACER-Decision-06-2026-ERAA-2025.pdf",
        ext="pdf",
        title="ACER, Decision 06/2026, Annex II: Amendments to ERAA 2025 (24 April 2026): average "
              "LOLE with out-of-market measures (Table 1) and before and after curtailment sharing "
              "(Table 7)"),
    "acer_eraa2025_input_data": dict(
        url="https://www.acer.europa.eu/sites/default/files/documents/Individual%20Decisions_annex/"
            "ACER-Decision-06-2026-ERAA-2025-Annex-Ib-Input-data-assumptions.pdf",
        ext="pdf",
        title="ACER, Decision 06/2026, Annex I.b: ERAA 2025 Input Data and Assumptions (ENTSO-E's "
              "Annex 1, December 2025; approved 24 April 2026)"),
    "svk_lma_2024": dict(
        url="https://www.svk.se/siteassets/om-oss/rapporter/langsiktig-marknadsanalys/lma_2024.pdf",
        original="https://www.svk.se/siteassets/om-oss/rapporter/2024/lma_2024.pdf (HTTP 404 on "
                 "2026-10-13)",
        ext="pdf",
        title="Svenska kraftnät, Långsiktig marknadsanalys 2024: scenarier för kraftsystemets "
              "utveckling fram till 2050, version 2 (26 January 2024)"),
    "scb_elanv_2025": dict(
        url="https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__EN__EN0108__EN0108A/"
            "ElanvMN/",
        note="the table page renders with JavaScript; Sweden's use in 2025 ('förbrukning inom "
             "landet', the 12 months summed: 134 195 GWh, losses included) is read with the API "
             "query https://statistikdatabasen.scb.se/api/v2/tables/TAB6399/data?lang=sv&"
             "valueCodes%5BAnvOmrade%5D=F%C3%B6rBrILandet&valueCodes%5BContentsCode%5D=000008IM&"
             "valueCodes%5BTid%5D=2025M*&outputFormat=csv",
        ext="html",
        title="SCB (producer Energimyndigheten), Elanvändning efter användningsområde, månad "
              "(table ElanvMN, TAB6399; updated 9 October 2026)"),
    "em_scenarier_2025": dict(
        url="https://energimyndigheten.a-w2m.se/Arkitektkopia/GetTemplateResource/121?id="
            "1173312576a844f5a08e2c4a2005ccfb&res=9b9af97b21e0473289a2fa55412b869e&lr=False&fn="
            "ER%202025_13webb.pdf&elp=portal&elt=t&eloid=1173312576a844f5a08e2c4a2005ccfb",
        note="Fig. 17 (p. 43) is a chart; its values, 2035 net export 23.7-50.5 TWh across the "
             "four scenarios, are in the figure data https://www.energimyndigheten.se/495b9a/"
             "globalassets/energisystem-och-analys/langsiktiga-scenarier/figurunderlag-langsiktiga-"
             "scenarier-2025.xlsx",
        ext="pdf",
        title="Energimyndigheten, Scenarier över Sveriges energisystem: vägar till ett "
              "energisystem med nettonollutsläpp 2050 (ER 2025:13, March 2025)"),
    "gov_offshore_2024": dict(
        url="https://www.regeringen.se/pressmeddelanden/2024/11/avslag-pa-13-havsbaserade-"
            "vindkraftparker-i-ostersjon/",
        ext="html",
        title="Regeringen, Avslag på 13 havsbaserade vindkraftparker i Östersjön (4 November "
              "2024)"),
    "vattenfall_kriegers_flak_2024": dict(
        url="https://group.vattenfall.com/press-and-media/pressreleases/2024/vattenfall-to-pause-"
            "offshore-wind-project-swedish-kriegers-flak/",
        ext="html",
        title="Vattenfall, Vattenfall to pause offshore wind project Swedish Kriegers Flak (2 "
              "September 2024)"),
    "oedigital_vidar_2026": dict(
        url="https://www.oedigital.com/news/541305-vattenfall-drops-planned-vidar-offshore-wind-"
            "project-in-sweden",
        note="Reuters' report; Vattenfall's own releases do not mention Vidar",
        ext="html",
        title="Offshore Engineer (Reuters), Vattenfall drops planned Vidar offshore wind project "
              "in Sweden (17 July 2026)"),
    "stegra_review_2026": dict(
        url="https://stegra.com/en/news-and-stories/stegra-implements-changes-following-100-day-"
            "review-under-new-owners--hkan-buskhe-appointed-ceo",
        publisher_url="https://mb.cision.com/Main/20623/4402585/4294921.pdf (the same release on "
                      "Cision)",
        ext="html",
        title="Stegra, Stegra implements changes following 100-day review under new owners: Håkan "
              "Buskhe appointed CEO (30 September 2026)"),
    "direkt_stegra_2026": dict(
        url="https://www.placera.se/telegram/stal-stegra-behover-ta-in-ytterligare-10-mdr-kr-afv-"
            "20260929",
        note="SEK 10 bn is the additional capital Stegra needs, per Affärsvärlden's sources; "
             "Stegra has not confirmed the figure",
        ext="html",
        title="Nyhetsbyrån Direkt (Placera), Stegra behöver ta in ytterligare 10 mdr kr - AfV (29 "
              "September 2026)"),
    "northvolt_bankruptcy_2025": dict(
        url="https://northvolt.com/articles/northvolt-files-for-bankruptcy-in-sweden/",
        ext="html",
        title="Northvolt, Northvolt files for bankruptcy in Sweden (12 March 2025)"),
    "orsted_flagshipone_2024": dict(
        url="https://orsted.com/en/company-announcement-list/2024/08/interim-report-for-the-first-"
            "half-year-of-2024--in-139870831",
        ext="html",
        title="Ørsted, Interim report for the first half year of 2024 (15 August 2024): "
              "development of FlagshipONE ceased"),
    "lkab_kiruna_2024": dict(
        url="https://lkab.com/en/news/our-successful-exploration-opens-up-new-opportunities-in-"
            "kiruna/",
        ext="html",
        title="LKAB, Our successful exploration opens up new opportunities in Kiruna (24 October "
              "2024): sponge iron in Kiruna after the 2040s"),
    "uniper_karlshamn_2025": dict(
        url="https://www.mynewsdesk.com/se/uniper/pressreleases/karlshamnsverket-laegger-block-2-i-"
            "malpaase-3415180",
        note="block 2 was contracted again for 15 January-15 March 2026 (svk_leveranssaker_2026 p. "
             "12; TT, https://www.tv4.se/artikel/tt-260108-elreserv1-03d20653/svenska-elreserven-"
             "sakrad-i-vinter)",
        ext="html",
        title="Uniper, Karlshamnsverket lägger block 2 i malpåse (10 November 2025)"),
    "svk_hansa_2024": dict(
        url="https://www.svk.se/en/about-us/news/news/svenska-kraftnat-ends-the-hansa-powerbridge-"
            "project-after-the-governments-rejection",
        ext="html",
        title="Svenska kraftnät, Svenska kraftnät ends the Hansa PowerBridge project after the "
              "government's rejection (3 July 2024)"),
    "ei_reliability_2026": dict(
        url="https://ei.se/om-oss/nyheter/2026/2026-01-21-ei-uppdaterar-data-och-berakningen-av-"
            "tillforlitlighetsnormen-for-sverige",
        ext="html",
        title="Energimarknadsinspektionen, Ei uppdaterar data och beräkningen av "
              "tillförlitlighetsnormen för Sverige (21 January 2026)"),
    "parkiet_polaniec_2026": dict(
        url="https://www.parkiet.com/energetyka/art43883341-gaz-zamiast-wegla-brunatnego-polacy-"
            "zaplaca-za-nowy-filar-energetyki",
        ext="html",
        title="Parkiet (B. Sawicki), Gaz zamiast węgla brunatnego. Polacy zapłacą za nowy filar "
              "energetyki (27 February 2026): no bidder for Połaniec's gas units in 2025, Enea now "
              "speaks of 2035"),
    "windeurope_stats_2026_h1": dict(
        url="https://proceedings.windeurope.org/biplatform/rails/active_storage/blobs/redirect/"
            "eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBBbWdLIiwiZXhwIjpudWxsLCJwdXIiOiJibG9iX2lkIn19--"
            "98f9224dddc205d0a638526b77f9c2e533fb1984/WindEurope-H1%202026%20Autumn%20Update.pdf",
        publisher_url="https://windeurope.org/data/products/latest-wind-energy-data-for-europe-"
                      "autumn-2026/",
        ext="pdf",
        title="WindEurope, Latest wind energy data for Europe: Autumn 2026 (1 September 2026): "
              "installations in H1 2026"),
    "kpeik_2026_main": dict(
        url="https://www.gov.pl/attachment/1086a55d-7170-418f-9f79-9f2a93836be8",
        publisher_url="https://www.gov.pl/web/energia/krajowy-plan-w-dziedzinie-energii-i-klimatu-"
                      "do-2030-r-z-perspektywa-do-2040-r---przyjety-przez-rade-ministrow",
        ext="pdf",
        title="Ministry of Energy (PL), Krajowy plan w dziedzinie energii i klimatu do 2030 r. z "
              "perspektywą do 2040 r., main document (adopted 8 June 2026)"),
    "me_answer_3635_2026": dict(
        url="https://api.sejm.gov.pl/sejm/term10/interpellations/attachment/ATTDX5HFT/z03635-o1."
            "pdf",
        note="the closest statement found to the log's quote of August 2026; the quoted words are "
             "not in it",
        ext="pdf",
        title="Ministry of Energy (PL), answer to written question no. 3635, signed by "
              "Undersecretary of State Konrad Wojnarowski (15 August 2026): no significant "
              "adequacy problems expected to 2033"),
    "tge_otf_2026_10_09": dict(
        url="https://tge.pl/energia-elektryczna-otf?dateShow=09-10-2026&dateAction=",
        cacheable=False,                    # `make history` leaves it out (the freeze's rehearsal)
        note="not cacheable: TGE resets the connection of a request with the fetcher's browser "
             "User-Agent (2026-10-13). BASE_Y-30 settlement 439.00 PLN/MWh; at NBP's EUR/PLN "
             "4.3775 of 9 October 2026 (table 197/A/NBP/2026, "
             "https://static.nbp.pl/dane/kursy/xml/a197z261009.xml) 100.3 EUR/MWh",
        ext="html",
        title="TGE, Energia elektryczna OTF: futures quotes of the session of 9 October 2026"),
    "tge_summary_2026_09": dict(
        url="https://tge.pl/pub/TGE/komunikaty/2026/10/2026.10.05_"
            "podsumowanie%20dzialalnosci%20tge%20we%20wrzesniu%202026.pdf",
        ext="pdf",
        title="TGE, Podsumowanie działalności TGE we wrześniu 2026 r. (5 October 2026): day-ahead "
              "(RDN) average 666.68 PLN/MWh"),
    "pap_belchatow_2021": dict(
        url="https://www.bankier.pl/wiadomosc/Wygaszanie-blokow-w-Elektrowni-Belchatow-od-2030-r-"
            "8129339.html",
        ext="html",
        title="PAP (Bankier.pl), Wygaszanie Elektrowni Bełchatów od 2030 r. PGE liczy na wsparcie "
              "Unii (8 June 2021): the units' closure years 2030-2036"),
    "fingrid_forecast_q3_2025": dict(
        url="https://www.fingrid.fi/globalassets/dokumentit/fi/kantaverkko/kantaverkon-"
            "kehittaminen/fingrid_energiaennuste-q3-2025-eng.pdf",
        publisher_url="https://www.fingrid.fi/en/grid/development/prospects-for-future-electricity-"
                      "production-and-consumption-q3-2024/prospects-for-future-electricity-"
                      "production-and-consumption-q3-2025/",
        note="the 2035 net export of 10-16 TWh is not printed: production (p. 8) less consumption "
             "(p. 5); EstLink 3 is not mentioned",
        ext="pdf",
        title="Fingrid, Prospects for future electricity production and consumption: Fingrid's "
              "forecast Q3/2025 (September 2025)"),
    "fingrid_forecast_q3_2026": dict(
        url="https://www.fingrid.fi/globalassets/dokumentit/fi/kantaverkko/kantaverkon-"
            "kehittaminen/best-estimate-q3-2026/fingrid-sahkon-tuotannon-ja-kulutuksen-"
            "kehitysnakymat-q3-2026.pdf",
        publisher_url="https://www.fingrid.fi/ajankohtaista/tiedotteet/2026/sahkon-tuotannon-ja-"
                      "kulutuksen-kehitysnakymat-paivitetty--sahkonkulutuksen-kasvu-"
                      "konkretisoituu/",
        ext="pdf",
        title="Fingrid, Sähkön tuotannon ja kulutuksen kehitysnäkymät Q3/2026 (30 September 2026)"),
    "fingrid_fs_bulletin_2025": dict(
        url="https://www.fingrid.fi/en/news/news/2026/fingrid-oyjs-financial-statements-bulletin-"
            "januarydecember-2025/",
        ext="html",
        title="Fingrid, Fingrid Oyj's financial statements bulletin January-December 2025 (3 March "
              "2026)"),
    "fingrid_h1_2026": dict(
        url="https://www.fingrid.fi/en/news/news/2026/fingrid-groups-half-year-report-1.1.30.6."
            "2026/",
        ext="html",
        title="Fingrid, Fingrid Group's half-year report 1.1.-30.6.2026 (23 July 2026)"),
    "fingrid_consumption_2026_08": dict(
        url="https://www.fingrid.fi/en/news/news/2026/electricity-consumption-is-set-to-increase-"
            "sharply--more-balancing-power-will-also-be-needed/",
        ext="html",
        title="Fingrid, Electricity consumption is set to increase sharply: more balancing power "
              "will also be needed (18 August 2026)"),
    "yle_datacentres_2026": dict(
        url="https://yle.fi/a/74-20219798",
        ext="html",
        title="Yle (J. Talasterä), Etelä-Suomen sähköverkko ei kestä kaikkia datakeskushankkeita: "
              "sähköä on, mutta väärissä paikoissa (10 April 2026), quoting Fingrid's Jussi "
              "Jyrinsalo"),
    "fingrid_winter_2026": dict(
        url="https://www.fingrid.fi/en/news/news/2026/electricity-is-expected-to-be-sufficient-"
            "this-winter-provided-that-domestic-production-and-transmission-lines-operate-"
            "reliably/",
        ext="html",
        title="Fingrid, Electricity is expected to be sufficient this winter, provided that "
              "domestic production and transmission lines operate reliably (24 September 2026)"),
    "fingrid_winter_report_2026": dict(
        url="https://www.sttinfo.fi/files/69819787/71928306/351058/fi",
        publisher_url="https://www.sttinfo.fi/tiedote/71928306/ (Fingrid's release on STT)",
        ext="pdf",
        title="Fingrid, Sähköjärjestelmän toiminta talvella 2025-2026 (1 April 2026)"),
    "et_district_heat_2025": dict(
        url="https://energia.fi/wp-content/uploads/2026/01/Kaukolampovuosi-2025_ennakkograafit_v1."
            "pdf",
        ext="pdf",
        title="Energiateollisuus, Kaukolämpövuosi 2025: ennakkotilastot (21 January 2026)"),
    "fingrid_winter_2025": dict(
        url="https://www.fingrid.fi/en/news/news/2025/aurora-line-commissioning-will-help-ensure-"
            "an-adequate-supply-of-electricity-over-the-coming-winter",
        ext="html",
        title="Fingrid, Aurora Line commissioning will help ensure an adequate supply of "
              "electricity over the coming winter (23 September 2025)"),
    "fingrid_adequacy_2025": dict(
        url="https://www.fingrid.fi/globalassets/dokumentit/fi/yhtio/toimikunnat/"
            "markkinatoimikunta/sahkon-riittavyys-24.9.-sahkomarkkinatoimikunta.pdf",
        ext="pdf",
        title="Fingrid (V. Virasjoki), Sähkön riittävyys pitkällä aikavälillä ja tulevan talven "
              "tehotilanne, slides to the electricity market committee (24 September 2025)"),
    "fingrid_grid_plan_2026": dict(
        url="https://www.fingrid.fi/globalassets/dokumentit/en/publications/main-grid-development-"
            "plan/fingrid_main-grid-development-plan-2026-2035.pdf",
        ext="pdf",
        title="Fingrid, Main grid development plan 2026-2035 (March 2026)"),
    "err_estlink3_2026": dict(
        url="https://news.err.ee/1610015374/elering-estlink-3-electricity-cable-decision-delayed-"
            "until-2031",
        ext="html",
        title="ERR News, Elering: EstLink 3 electricity cable decision delayed until 2031 (6 May "
              "2026)"),
    "fingrid_large_demand_2026": dict(
        url="https://www.fingrid.fi/globalassets/dokumentit/fi/palvelut/kulutuksen-ja-tuotannon-"
            "liittaminen-kantaverkkoon/fingrid---suurten-kulutuslaitosten-tekniset-vaatimukset.pdf",
        note="in force for Fingrid's direct customers from 12 June 2026; for loads on distribution "
             "networks once KJV2026 is confirmed (stakeholder slides of 12 June 2026, slide 11)",
        ext="pdf",
        title="Fingrid, Suurten kulutuslaitosten tekniset vaatimukset (12 June 2026)"),
    "tem_flexibility_2025": dict(
        url="https://julkaisut.valtioneuvosto.fi/server/api/core/bitstreams/5e92eeb9-8d3a-4712-"
            "862a-bc60f5b8eee6/content",
        ext="pdf",
        title="Ministry of Economic Affairs and Employment (TEM), Fossiilittoman jouston työryhmän "
              "loppuraportti (TEM publications 2025:23, June 2025)"),
    "fingrid_balance_fees": dict(
        url="https://www.fingrid.fi/en/electricity-market/balance-service/fees/",
        note="a live page: the cached copy holds the volume fee's history to the zero fee of "
             "October and November 2026",
        ext="html",
        title="Fingrid, Balance service fees (the fees and their history, read 13 October 2026)"),
    "statfin_12sv": dict(
        url="https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__ehk/12sv.px/",
        note="a PxWeb selection page: the values are in the table file "
             "https://pxdata.stat.fi/PXWeb/Resources/PX/Databases/StatFin/ehk/12sv.px",
        ext="html",
        title="Statistics Finland, 12sv: Supplies and total consumption of electricity, 1960-2024 "
              "(updated 16 December 2025)"),
    "statfin_12su": dict(
        url="https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__ehk/12su.px/",
        note="2025's total consumption, 84 474 GWh (preliminary), is this monthly table's; 12sv "
             "ends at 2024. A PxWeb selection page: the values are in the table file "
             "https://pxdata.stat.fi/PXWeb/Resources/PX/Databases/StatFin/ehk/12su.px",
        ext="html",
        title="Statistics Finland, 12su: Supplies and total consumption of electricity, monthly, "
              "1992M01-2026M06 (updated 23 September 2026)"),
    "microsoft_espoo_eia_2024": dict(
        url="https://www.ymparisto.fi/sites/default/files/documents/Microsoft_Espoo_datak_YVA_"
            "Selostus_20240129_0.pdf",
        ext="pdf",
        title="Microsoft 3465 Finland Oy, Arviointiselostus: Espoon datakeskus (EIA report, 29 "
              "January 2024)"),
    "ely_kirkkonummi_dc_2023": dict(
        url="https://www.ymparisto.fi/sites/default/files/documents/Kuulutus%2C_Kirkkonummen_"
            "datakeskusalue.pdf",
        note="the EIA report of 21 March 2024 gives 144 MW of IT and 175.8 MW of electrical "
             "capacity: https://www.ymparisto.fi/sites/default/files/documents/Arviointiselostus_"
             "Kirkkonummen_datakeskus_2024.pdf",
        ext="pdf",
        title="Uusimaa ELY Centre, Kuulutus: Kirkkonummen datakeskusalueen YVA-ohjelma (Microsoft; "
              "notice of the EIA programme, 1 August 2023)"),
    "ely_vihti_dc_2023": dict(
        url="https://www.ymparisto.fi/sites/default/files/documents/Kuulutus%2C_Vihdin_datakeskus."
            "pdf",
        note="the EIA report of 1 February 2024 gives 192 MW of IT and 234.4 MW of electrical "
             "capacity: https://www.ymparisto.fi/sites/default/files/documents/2024-02-"
             "01%20Microsoft%20Vihti%20YVA%20Selostus.pdf",
        ext="pdf",
        title="Uusimaa ELY Centre, Kuulutus: Vihdin datakeskuksen YVA-ohjelma (Microsoft; notice "
              "of the EIA programme, 20 July 2023)"),
    "nebius_mantsala_2024": dict(
        url="https://nebius.com/newsroom/nebius-to-triple-capacity-at-finland-data-center-to-75-mw",
        ext="html",
        title="Nebius, Nebius to triple capacity at Finland data center to 75 MW (8 October 2024)"),
    "nebius_lappeenranta_2026": dict(
        url="https://nebius.com/newsroom/nebius-to-construct-310-mw-ai-factory-in-finland",
        ext="html",
        title="Nebius, Nebius to construct 310 MW AI factory in Finland (31 March 2026)"),
    "wmedia_nebius_2026": dict(
        url="https://w.media/nebius-expands-its-infrastructure-in-finland-with-second-data-center/",
        ext="html",
        title="W.Media, Nebius expands its infrastructure in Finland with second data center (14 "
              "August 2026)"),
    "atnorth_kouvola_2023": dict(
        url="https://www.atnorth.com/news/atnorth-announces-heat-reuse-enabled-mega-site-in-"
            "kouvola/",
        ext="html",
        title="atNorth, atNorth announces heat reuse enabled mega site in Kouvola (7 December "
              "2023)"),
    "verne_mantsala_2026": dict(
        url="https://www.verne.co/news/news-verne-begins-construction-of-the-first-70-mw-on-its-"
            "data-center-campus-in-m%C3%A4nts%C3%A4l%C3%A4",
        ext="html",
        title="Verne, Verne begins construction of the first 70 MW on its data center campus in "
              "Mäntsälä (17 June 2026)"),
    "hyperco_kouvola_eia_2026": dict(
        url="https://www.ymparisto.fi/sites/default/files/documents/"
            "Hyperco%20Data%20System%20Oy%20-%20Kouvola%20YVA-selostus%20-"
            "%20julkaisuversio%2020260219_teksti_0.pdf",
        note="about 100 MW of IT and 130 MW of electrical capacity; the 64 MW of the first "
             "building is in no document found",
        ext="pdf",
        title="Hyperco Data Systems Oy, YVA-selostus: Kouvolan datakeskus (EIA report, 19 February "
              "2026)"),
    "google_finland_2026": dict(
        url="https://www.googlecloudpresscorner.com/2026-09-09-Google-Deepens-Commitment-to-"
            "Finland-with-Two-Year-EUR13-Billion-investment-in-AI-Infrastructure",
        ext="html",
        title="Google Cloud, Google deepens commitment to Finland with two-year EUR 13 billion "
              "investment in AI infrastructure (9 September 2026)"),
    "thelec_google_2026": dict(
        url="https://www.thelec.net/news/articleView.html?idxno=13835",
        ext="html",
        title="TheElec, Google to invest EUR 13 billion in Finland AI infrastructure (10 September "
              "2026)"),
    "lvv_tuike_2026": dict(
        url="https://www.sttinfo.fi/tiedote/72390663/lupa-ja-valvontavirasto-kehottaa-tuike-"
            "finland-oyta-keskeyttamaan-muhoksen-ja-kajaanin-datakeskushankkeiden-valmistelutoimet",
        note="a request (kehotus) to stop by 23 October 2026 until the EIAs are complete, with "
             "coercive measures considered; lvv.fi answers scripted requests with a challenge",
        ext="html",
        title="Lupa- ja valvontavirasto (LVV), Lupa- ja valvontavirasto kehottaa Tuike Finland "
              "Oy:tä keskeyttämään Muhoksen ja Kajaanin datakeskushankkeiden valmistelutoimet (6 "
              "October 2026)"),
    "fdca_dc_2026": dict(
        url="https://www.fdca.fi/data-centers-are-posing-a-challenge-to-the-electricity-market-but-"
            "the-challenge-can-be-overcome/",
        ext="html",
        title="Finnish Data Center Association (FDCA), Data centers are posing a challenge to the "
              "electricity market, but the challenge can be overcome (28 April 2026)"),
    "gtai_fi_datacentres_2026": dict(
        url="https://www.gtai.de/de/trade/finnland/branchen/datenzentren-ki-fabriken-2016828",
        ext="html",
        note="gtai.de answers a repeated automated request with a bot-check page, and the Internet "
             "Archive holds no copy: the cached file is the page as served to one plain request on "
             "2026-11-23, recorded with its lineage through cached_get's `content`; it is not "
             "requested again while the file is cached",
        title="Germany Trade & Invest (GTAI), Finnland wird zum Hotspot für Datenzentren und "
              "KI-Fabriken (28 August 2026), the table 'Ausgewählte Datenzentrumsprojekte in "
              "Finnland (nach Investitionssumme)'"),
    # the large data-centre projects' own documents (D-266), as Fermi Energia's fact-check of
    # 14 November 2026 cites them
    "kmh_ms_vihti_2023": dict(
        url="https://www.ymparisto.fi/sites/default/files/documents/"
            "Kuulutus,%20Vihdin%20datakeskus.pdf",
        ext="pdf",
        title="Uusimaa ELY Centre, public notice of the environmental impact assessment: Vihti "
              "data centre (Microsoft; 2023)"),
    "kmh_ms_espoo_2023": dict(
        url="https://www.ymparisto.fi/sites/default/files/documents/"
            "Kuulutus,%20Espoon%20datakeskusalue.pdf",
        ext="pdf",
        title="Uusimaa ELY Centre, public notice of the environmental impact assessment: Espoo "
              "data centre area (Microsoft; 2023)"),
    "kmh_ms_kirkkonummi_2023": dict(
        url="https://www.ymparisto.fi/sites/default/files/documents/Lausuntokoonti_Kirkkonummen_"
            "datakeskus_yva-ohjelma_25092023.pdf",
        ext="pdf",
        title="Uusimaa ELY Centre, statements on the environmental impact assessment programme of "
              "the Kirkkonummi data centre (Microsoft; 25 September 2023)"),
    "yit_atnorth_2026_07_21": dict(
        url="https://www.inderes.fi/sv/releases/yit-ja-atnorth-sopimukseen-datakeskuksen-"
            "rakentamisesta-kouvolaan-arvo-yitlle-noin-300-miljoonaa-euroa",
        ext="html",
        title="YIT, YIT ja atNorth sopimukseen datakeskuksen rakentamisesta Kouvolaan (stock "
              "exchange release, 21 July 2026; Inderes's copy)"),
    "briefs_tiktok_kouvola_2026": dict(
        url="https://www.briefs.co/news/tiktok-to-tap-150-mw-at-new-finland-data-center/",
        ext="html",
        title="Briefs, TikTok to tap 150 MW at new Finland data center (8 September 2026)"),
    "xtx_kajaani": dict(
        url="https://files.xtxmarkets.com/publications/kajaani/index.html", ext="html",
        title="XTX Markets, the Kajaani data centre campus (press release, 22 January 2025)"),
    "eudca_state_2026": dict(
        url="https://www.eudca.org/documents/content/ZlZXb4bRSRefaEVqya2I_Aoea?download=0",
        ext="pdf",
        title="European Data Centre Association (EUDCA), State of European Data Centres 2026"),
    "amptank_utajarvi_2026": dict(
        url="https://convergedigest.com/amptank-advances-200-mw-ai-data-center-project-in-finland/",
        ext="html",
        title="Converge Digest, AmpTank advances 200 MW AI data center project in Finland (2026)"),
    "fortum_google_loviisa_2026": dict(
        url="https://news.cision.com/fortum/r/inside-information--fortum-and-google-partner-to-"
            "drive-sustainable-growth-for-finland---sign-nuclear,c4393630",
        ext="html",
        title="Fortum, Inside information: Fortum and Google partner to drive sustainable growth "
              "for Finland - sign nuclear power purchase agreement (stock exchange release, "
              "9 September 2026)"),
    # Sweden's large data-centre projects, each from its developer's own release (D-279)
    "brookfield_strangnas_2025": dict(
        url="https://bam.brookfield.com/press-releases/brookfield-advance-ai-infrastructure-sweden-"
            "through-sek-95-billion-investment", ext="html",
        title="Brookfield, Brookfield to advance AI infrastructure in Sweden through SEK 95 "
              "billion investment (press release, 4 June 2025)"),
    "ecodatacenter_mistral_2026": dict(
        url="https://www.mynewsdesk.com/se/ecodatacenter/pressreleases/mistral-ai-and-ecodatacenter-"
            "partner-to-build-ai-focused-data-center-in-sweden-3431886", ext="html",
        title="EcoDataCenter, Mistral AI and EcoDataCenter partner to build AI-focused data center "
              "in Sweden (press release, 11 February 2026)"),
    "dcd_mistral_borlange_2026": dict(
        url="https://www.datacenterdynamics.com/en/news/french-ai-firm-mistral-signs-12bn-deal-to-"
            "lease-ecodatacenter-facility-in-sweden/", ext="html",
        title="Data Center Dynamics, French AI firm Mistral signs $1.2bn deal to build "
              "EcoDataCenter facility in Sweden (February 2026)"),
    "ecodatacenter_smedjebacken_2026": dict(
        url="https://w.media/ecodatacenter-secures-land-for-third-swedish-data-center-campus/",
        ext="html",
        title="W.Media, EcoDataCenter secures land for third Swedish data center campus (2026)"),
    "atnorth_solleftea_2026": dict(
        url="https://www.hpcwire.com/off-the-wire/atnorth-plans-300mw-high-density-data-center-in-"
            "northern-sweden/", ext="html",
        title="atNorth, atNorth plans 300MW high-density data center in northern Sweden (press "
              "release of February 2026, HPCwire's copy)"),
    "edgeconnex_skelleftea_2026": dict(
        url="https://w.media/edgeconnex-plans-1gw-data-center-campus-in-skelleftea-sweden/",
        ext="html",
        title="W.Media, EdgeConneX plans 1GW data center campus in Skellefteå, Sweden (2026)"),
    "vn_dc_roadmap_2025": dict(
        url="https://web.archive.org/web/20260311185707/https://julkaisut.valtioneuvosto.fi/items/"
            "454158c4-1f2e-4ea6-8f04-6313838ef553",
        publisher_url="https://urn.fi/URN:ISBN:978-952-383-885-7",
        note="the publisher answers scripted requests with a challenge (403) and the report PDF is "
             "not archived: the archived landing page holds the report's record; the log reads its "
             "figures via fdca_dc_2026",
        ext="html",
        title="Finnish Government, National roadmap for data centres: rapporteur's report (the "
              "Mattila report; Publications of the Finnish Government 2025:95, 4 November 2025), "
              "Internet Archive copy of the landing page"),
    "fortum_arctial_2024": dict(
        url="https://web.archive.org/web/20250723115737/https://www.fortum.com/media/2024/12/"
            "fortum-energy-partner-support-feasibility-study-low-carbon-aluminium-production-"
            "finland",
        publisher_url="https://www.fortum.com/media/2024/12/fortum-energy-partner-support-"
                      "feasibility-study-low-carbon-aluminium-production-finland (does not answer "
                      "the fetcher's request: read timeout)",
        ext="html",
        title="Fortum, Fortum as energy partner to support feasibility study on low-carbon "
              "aluminium production in Finland (4 December 2024), Internet Archive copy of 23 "
              "July 2025"),
    "arctial_eia_programme_2025": dict(
        url="https://www.ymparisto.fi/sites/default/files/documents/Arctial_YVA-ohjelma_suomi.pdf",
        ext="pdf",
        title="Arctial MidstreamCo, Alumiinitehtaan YVA-ohjelma (EIA programme, 26 May 2025)"),
    "arctial_eia_report_2026": dict(
        url="https://www.ymparisto.fi/sites/default/files/documents/"
            "Arctial%20ymp%C3%A4rist%C3%B6vaikutusten%20arviointiselostus_0.pdf",
        ext="pdf",
        title="Arctial MidstreamCo, Alumiinitehtaan ympäristövaikutusten arviointiselostus (EIA "
              "report, 28 May 2026)"),
    "lvv_arctial_2026": dict(
        url="https://www.ymparisto.fi/sites/default/files/documents/Yhteysviranomaisen_"
            "perusteltu%20p%C3%A4%C3%A4telm%C3%A4_Arctial_0.pdf",
        note="dated 2 October 2026, announced 8 October 2026: "
             "https://www.sttinfo.fi/tiedote/72396361/alumiinitehdashankkeen-yva-selostuksesta-on-"
             "annettu-perusteltu-paatelma?lang=fi",
        ext="pdf",
        title="Lupa- ja valvontavirasto (LVV), Yhteysviranomaisen perusteltu päätelmä: "
              "alumiinitehdas, Kokkola ja Kruunupyy (the EIA's reasoned conclusion, 2 October "
              "2026)"),
    "arctial_deck_2026": dict(
        url="https://teknologiateollisuus.fi/jasenille/wp-content/uploads/sites/1/2026/04/Arctial-"
            "Fernqvist.pdf",
        ext="pdf",
        title="Arctial (F. Fernqvist), The latest on Arctial: Europe's first new low-carbon "
              "primary aluminium smelter in over three decades, slides at the Finnish Aluminium "
              "Day (16 April 2026)"),
    "arctial_home": dict(
        url="https://www.arctial.com/",
        ext="html",
        title="Arctial, home page (read 13 October 2026): the letter of intent with Fingrid"),
    "ch2_observatory_harjavalta_2025": dict(
        url="https://observatory.clean-hydrogen.europa.eu/media/news/finlands-first-industrial-"
            "scale-renewable-h2-plant-operational",
        ext="html",
        title="European Clean Hydrogen Observatory, Finland's first industrial-scale renewable H2 "
              "plant operational (24 February 2025)"),
    "ogj_neste_porvoo_2024": dict(
        url="https://ogj.com/refining-processing/refining/article/55238124/neste-tables-original-"
            "plan-for-porvoo-refinery-renewable-hydrogen-unit",
        ext="html",
        title="Oil & Gas Journal, Neste tables original plan for Porvoo refinery renewable "
              "hydrogen unit (24 October 2024)"),
    "ytj_flexens": dict(
        url="https://tietopalvelu.ytj.fi/yritys/2948023-9",
        note="the page renders with JavaScript; the bankruptcy (KONK) registered on 2 June 2025 is "
             "in the open-data record https://avoindata.prh.fi/opendata-ytj-api/v3/companies?"
             "businessId=2948023-9",
        ext="html",
        title="Finnish Patent and Registration Office, YTJ company record: Flexens Oy Ab, "
              "2948023-9"),
    "tem_vetyalfa_2026": dict(
        url="https://web.archive.org/web/20260607163926/https://valtioneuvosto.fi/en/-/1410877/"
            "finnish-hydrogen-project-to-receive-eur-224-million-from-eu-s-innovation-fund",
        publisher_url="https://valtioneuvosto.fi/en/-/1410877/finnish-hydrogen-project-to-receive-"
                      "eur-224-million-from-eu-s-innovation-fund (a challenge to scripted "
                      "requests, 403)",
        ext="html",
        title="Ministry of Economic Affairs and Employment, Finnish hydrogen project to receive "
              "EUR 224 million from EU's Innovation Fund (7 May 2026), Internet Archive copy of 7 "
              "June 2026"),
    "vetyalfa_2026": dict(
        url="https://tuulialfa.fi/vety-uutiset/vetyalfan-utajarven-vetyjalostamohanke-etenee/",
        ext="html",
        title="VetyAlfa, VetyAlfan Utajärven vetyjalostamohanke etenee (7 September 2026)"),
    "finlex_1352_2025": dict(
        url="https://www.finlex.fi/fi/lainsaadanto/saadoskokoelma/2025/1352",
        ext="html",
        title="Finlex, Laki sähkön ja eräiden polttoaineiden valmisteverosta annetun lain eräiden "
              "säännösten kumoamisesta 1352/2025 (22 December 2025; in force 1 July 2026)"),
    "vero_electricity_tax_2026": dict(
        url="https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/valmisteverotus/sahkovero/"
            "verotaulukot/",
        ext="html",
        title="Tax Administration (Vero), Sähkövero: verotaulukot (the electricity tax rates valid "
              "from 1 April 2026; read 13 October 2026)"),
    "fdca_dc_support_2026": dict(
        url="https://www.fdca.fi/datakeskusteollisuus-on-suomen-nopeimmin-kasvava-teollisuuden-"
            "ala/",
        ext="html",
        title="Finnish Data Center Association (FDCA), Datakeskusteollisuus on Suomen nopeimmin "
              "kasvava teollisuuden ala hallituksen toimista huolimatta (2 September 2026)"),
    "finlex_he_70_2026": dict(
        url="https://www.finlex.fi/api/media/government-proposal/920180/mainPdf/main.pdf",
        publisher_url="https://www.finlex.fi/fi/hallituksen-esitykset/2026/70",
        ext="pdf",
        title="Government of Finland, HE 70/2026 vp: hallituksen esitys eduskunnalle uudeksi "
              "alueidenkäyttölaiksi ja laeiksi eräiden siihen liittyvien lakien muuttamisesta (16 "
              "April 2026)"),
    "yle_afry_2025": dict(
        url="https://yle.fi/a/74-20192344",
        ext="html",
        title="Yle News, Study: big growth in data centres could raise electricity prices by 10% "
              "by 2030 (5 November 2025), on AFRY's study for the government"),
    "rf_wind_2022": dict(
        url="https://suomenuusiutuvat.fi/media/tuulivoima_vuositilastot_2022.pdf",
        ext="pdf",
        title="Suomen Tuulivoimayhdistys (now Renewables Finland), Tuulivoima Suomessa 2022: "
              "vuositilastot (17 January 2023)"),
    "rf_wind_2023": dict(
        url="https://suomenuusiutuvat.fi/media/tuulivoima_vuositilastot-2023.pdf",
        ext="pdf",
        title="Suomen Tuulivoimayhdistys (now Renewables Finland), Tuulivoima Suomessa 2023: "
              "vuositilastot (31 December 2023)"),
    "rf_wind_2024": dict(
        url="https://suomenuusiutuvat.fi/media/tuulivoima_vuositilastot-2024.pdf",
        ext="pdf",
        title="Suomen Uusiutuvat (Renewables Finland), Tuulivoima Suomessa 31.12.2024: tuulivoiman "
              "vuositilastot (3 January 2025)"),
    "rf_wind_2025": dict(
        url="https://suomenuusiutuvat.fi/media/wind-power-stats-fin-2025.pdf",
        ext="pdf",
        title="Renewables Finland, Wind power in Finland 2025: annual statistics (31 December "
              "2025)"),
    "rf_wind_2026_h1": dict(
        url="https://suomenuusiutuvat.fi/media/wind-power-stats-fin-6_2026.pdf",
        ext="pdf",
        title="Renewables Finland, Wind power in Finland, first half of 2026 (30 June 2026)"),
    "rf_projects_2026_01": dict(
        url="https://suomenuusiutuvat.fi/media/20260115-wind-power-projects-in-finland-winter-2025."
            "pdf",
        ext="pdf",
        title="Renewables Finland, Wind power projects in Finland, winter 2025 list (16 January "
              "2026)"),
    "rf_projects_2026_08": dict(
        url="https://suomenuusiutuvat.fi/media/surf-wind-power-projects-in-finland-summer-2026.pdf",
        ext="pdf",
        title="Renewables Finland, Wind power projects in Finland, summer 2026 list (19 August "
              "2026)"),
    "rf_solar_2026_h1": dict(
        url="https://suomenuusiutuvat.fi/media/solar-power-30.6.2026.pdf",
        ext="pdf",
        title="Renewables Finland, Industrial-scale solar power, first half of 2026 (30 June "
              "2026)"),
    "et_statistics_2025": dict(
        url="https://www.sttinfo.fi/tiedote/71751647/energiatilastot-2025-kaukolammon-paastot-"
            "putosivat-kolmanneksella-sahko-lahes-fossiilitonta-ja-euroopan-edullisinta",
        ext="html",
        title="Energiateollisuus, Energiatilastot 2025: kaukolämmön päästöt putosivat "
              "kolmanneksella, sähkö lähes fossiilitonta ja Euroopan edullisinta (21 January "
              "2026)"),
    "tem_eez_act_2024": dict(
        url="https://web.archive.org/web/20241219193031/https://valtioneuvosto.fi/en/-/1410877/act-"
            "on-offshore-wind-power-in-the-exclusive-economic-zone-enters-into-force-first-tenders-"
            "could-be-organised-at-the-end-of-2025",
        publisher_url="https://valtioneuvosto.fi/en/-/1410877/act-on-offshore-wind-power-in-the-"
                      "exclusive-economic-zone-enters-into-force-first-tenders-could-be-organised-"
                      "at-the-end-of-2025 (a challenge to scripted requests, 403)",
        ext="html",
        title="Ministry of Economic Affairs and Employment, Act on offshore wind power in the "
              "exclusive economic zone enters into force: first tenders could be organised at the "
              "end of 2025 (19 December 2024), Internet Archive copy"),
    "ev_eez_tender_2026": dict(
        url="https://web.archive.org/web/20260509204001/https://energiavirasto.fi/talousvyohykkeen-"
            "merituulivoima-alueiden-kilpailutus",
        publisher_url="https://energiavirasto.fi/talousvyohykkeen-merituulivoima-alueiden-"
                      "kilpailutus (a challenge to scripted requests, 403)",
        ext="html",
        title="Energiavirasto, Talousvyöhykkeen merituulivoima-alueiden kilpailutus (the tender "
              "page, Internet Archive copy of 9 May 2026)"),
    "ens_offshore_2024": dict(
        url="https://ens.dk/en/press/north-sea-offshore-wind-tendering-procedure-danish-energy-"
            "agency-has-not-received-any-bids",
        ext="html",
        title="Danish Energy Agency, North Sea offshore wind tendering procedure: the Danish "
              "Energy Agency has not received any bids (5 December 2024)"),
    "bnetza_offshore_2025": dict(
        url="https://www.bundesnetzagentur.de/DE/Beschlusskammern/BK06/BK6_72_Offshore/Ausschr_"
            "vorunters_Flaechen/2025/uebersicht_ausschreibungen_2025.html",
        ext="html",
        title="Bundesnetzagentur, Ausschreibungen nach § 50 WindSeeG für die zentral "
              "voruntersuchten Flächen N-10.1 und N-10.2 (2025; no bids at the bid date of 1 "
              "August 2025)"),
    "enmin_offshore_2025": dict(
        url="https://web.archive.org/web/20251103055921/https://enmin.lrv.lt/en/news/the-second-"
            "offshore-wind-farm-development-tender-did-not-take-place-BHJ8/",
        publisher_url="https://enmin.lrv.lt/en/news/the-second-offshore-wind-farm-development-"
                      "tender-did-not-take-place-BHJ8 (a challenge to scripted requests, 403)",
        note="the tender failed for want of a second applicant; it offered a two-sided CfD",
        ext="html",
        title="Ministry of Energy of Lithuania, The second offshore wind farm development tender "
              "did not take place (8 October 2025), Internet Archive copy"),
    "err_offshore_2025": dict(
        url="https://news.err.ee/1609610942/government-scraps-2-6-billion-aid-plan-for-offshore-"
            "wind-farm-construction",
        ext="html",
        title="ERR News, Government scraps EUR 2.6 billion aid plan for offshore wind farm "
              "construction (20 February 2025)"),
    "ens_offshore_2026": dict(
        url="https://ens.dk/presse/danmark-faar-nye-havvindmoelleparker",
        note="the two-sided CfD is stated in the tender's opening release of 20 November 2025: "
             "https://ens.dk/en/press/danish-energy-agency-opens-tenders-three-new-danish-offshore-"
             "wind-farms",
        ext="html",
        title="Danish Energy Agency, Danmark får to nye havvindmølleparker (4 August 2026, "
              "corrected 6 August 2026)"),
    "ure_offshore_2025": dict(
        url="https://www.ure.gov.pl/download/9/15907/InformacjawynikiaukcjiAMWF12025.pdf",
        ext="pdf",
        title="URE, Informacja Prezesa URE nr 70/2025 w sprawie ogłoszenia wyników aukcji "
              "AMFW/1/2025 (18 December 2025)"),
    "ev_solar_2026": dict(
        url="https://www.epressi.com/tiedotteet/energia/aurinkosahkon-tuotantokapasiteetti-kasvoi-"
            "yli-neljanneksen-vuonna-2025-eniten-kasvua-teollisessa-mittaluokassa.html",
        publisher_url="https://energiavirasto.fi/-/aurinkosahkon-tuotantokapasiteetti-kasvoi-yli-"
                      "neljanneksen-vuonna-2025-eniten-kasvua-teollisessa-mittaluokassa (a "
                      "challenge to scripted requests, 403)",
        ext="html",
        title="Energiavirasto (on ePressi), Aurinkosähkön tuotantokapasiteetti kasvoi yli "
              "neljänneksen vuonna 2025: eniten kasvua teollisessa mittaluokassa (11 June 2026)"),
    "fortum_google_ppa_2026": dict(
        url="https://news.cision.com/fortum/r/inside-information--fortum-and-google-partner-to-"
            "drive-sustainable-growth-for-finland---sign-nuclear,c4393630",
        publisher_url="https://www.fortum.com/en/media/2026/09/inside-information-fortum-and-"
                      "google-partner-drive-sustainable-growth-finland-sign-nuclear-power-purchase-"
                      "agreement (does not answer the fetcher's request: read timeout)",
        ext="html",
        title="Fortum (on Cision), Inside information: Fortum and Google partner to drive "
              "sustainable growth for Finland, sign nuclear power purchase agreement (9 September "
              "2026)"),
    "tvo_ol12_eia_2024": dict(
        url="https://www.tvo.fi/en/index/news/pressreleasesstockexchangereleases/2024/"
            "environmentalimpactassessmentreportcompletedregardingextensionofservicelifeandincrease"
            "ofthermalpowerofolkiluoto1andolkiluoto2plantunits.html",
        ext="html",
        title="TVO, Environmental impact assessment report completed regarding extension of "
              "service life and increase of thermal power of Olkiluoto 1 and Olkiluoto 2 plant "
              "units (5 December 2024)"),
    "tvo_production_2025": dict(
        url="https://mb.cision.com/Main/1401/4288649/3862929.pdf",
        ext="pdf",
        title="TVO, Olkiluoto produced about a quarter of Finnish electricity in 2025 (5 January "
              "2026)"),
    "fortum_meri_pori_2026": dict(
        url="https://mb.cision.com/Main/15253/4366905/4164974.pdf",
        publisher_url="https://www.fortum.com/en/media/2026/06/fortum-end-coal-fired-power-"
                      "generation-finland-meri-pori-coal-power-plant-close-spring-2027-new-"
                      "industrial-growth-planned-tahkoluoto",
        ext="pdf",
        title="Fortum, Fortum to end coal-fired power generation in Finland: Meri-Pori coal power "
              "plant to close in spring 2027 with new industrial growth planned for Tahkoluoto (24 "
              "June 2026)"),
    "fingrid_reserve_2024_2025": dict(
        url="https://www.fingrid.fi/en/grid/peak-load-capacity/yearly-periods/period-112024---"
            "102025/",
        ext="html",
        title="Fingrid, Strategic reserve: period 11/2024-10/2025 (no capacity procured)"),
    "fingrid_reserve_2025_2026": dict(
        url="https://www.fingrid.fi/en/grid/peak-load-capacity/yearly-periods/period-112025---"
            "102026/",
        ext="html",
        title="Fingrid, Strategic reserve: period 11/2025-10/2026 (no capacity procured)"),
    "fingrid_reserve_2026_2027": dict(
        url="https://www.fingrid.fi/en/grid/peak-load-capacity/yearly-periods/period-112026-"
            "102027/",
        ext="html",
        title="Fingrid, Strategic reserve: period 11/2026-10/2027 (no capacity procured)"),
    "euronext_nsby": dict(
        url="https://live.euronext.com/en/product/commodities-futures/NSBY-DAMS",
        note="the page renders its quotes with JavaScript; the settlement prices of 9 October 2026 "
             "are read in a browser",
        ext="html",
        title="Euronext, Nordic System Price Electricity Base Load Year Future (NSBY), product "
              "page"),
    "euronext_hlby": dict(
        url="https://live.euronext.com/en/product/commodities-futures/HLBY-DAMS",
        note="the page renders its quotes with JavaScript; the settlement prices of 9 October 2026 "
             "are read in a browser",
        ext="html",
        title="Euronext, Nordic EPAD Electricity Base Load Year Future HL (Helsinki), product "
              "page"),
    "euronext_llby": dict(
        url="https://live.euronext.com/en/product/commodities-futures/LLBY-DAMS",
        note="the page renders its quotes with JavaScript; the settlement prices of 9 October 2026 "
             "are read in a browser",
        ext="html",
        title="Euronext, Nordic EPAD Electricity Base Load Year Future LL (Luleå, SE1), product "
              "page"),
    "euronext_viby": dict(
        url="https://live.euronext.com/en/product/commodities-futures/VIBY-DAMS",
        note="the page renders its quotes with JavaScript; the settlement prices of 9 October 2026 "
             "are read in a browser",
        ext="html",
        title="Euronext, Baltic EPAD Electricity Base Load Year Future VI (Vilnius), product page"),
    "euronext_epad_specs_2025": dict(
        url="https://connect2.euronext.com/sites/default/files/it-documentation/29-august-2025-"
            "contract-specifications-nordics-and-baltic-epad-power-derivatives.pdf",
        ext="pdf",
        title="Euronext, Contract specifications: Nordics and Baltic EPAD power derivatives (29 "
              "August 2025)"),
    "konkurentsiamet_2025": dict(
        url="https://www.konkurentsiamet.ee/sites/default/files/documents/2026-09/Elektri-"
            "%20ja%20gaasituru%20aruanne%202025_viimane.pdf",
        ext="pdf",
        title="Konkurentsiamet, Elektri- ja gaasituru aruanne 2025 (September 2026)"),
    "ea_energy_ee_2026": dict(
        url="https://kliimaministeerium.ee/sites/default/files/documents/2026-03/"
            "Modelling%20the%20Electricity%20Exchange%20Price%202026%20-%202050.pdf",
        ext="pdf",
        title="Ea Energy Analyses for the Ministry of Climate (Estonia), Modelling the electricity "
              "exchange price 2026-2050: final results 17-02-26 (published March 2026)"),
    "elering_reserve_costs_2026": dict(
        url="https://elering.ee/en/article/year-frequency-reserve-markets-costs-remained-close-"
            "forecasts",
        ext="html",
        title="Elering, A year on the frequency reserve markets: costs remained close to forecasts "
              "(4 February 2026)"),
    "elering_balancing_fee": dict(
        url="https://elering.ee/tasakaalustamisvoimsuse-kulu",
        ext="html",
        title="Elering, Tasakaalustamisvõimsuse kulu (the balancing-capacity fee; read 13 October "
              "2026)"),
    "elering_sos_fee": dict(
        url="https://elering.ee/varustuskindluse-tasu",
        ext="html",
        title="Elering, Varustuskindluse tasu (the security-of-supply fee; read 13 October 2026)"),
    "elering_price_list": dict(
        url="https://elering.ee/en/price-list-and-standard-terms-and-conditions",
        ext="html",
        title="Elering, Price list and standard terms and conditions (network fees from 5 May "
              "2026; read 13 October 2026)"),
    "eurostat_nrg_pc_205_c": dict(
        url="https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205_c/default/table?lang=en",
        note="the data browser renders with JavaScript; the 2025 values for EE and FI, band 20-70 "
             "GWh, are read with https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/"
             "data/nrg_pc_205_c?format=JSON&lang=en&geo=EE&geo=FI&nrg_cons=MWH20000-69999&currency="
             "EUR&time=2025",
        ext="html",
        title="Eurostat, Electricity prices components for non-household consumers, annual data "
              "(nrg_pc_205_c; updated 5 October 2026)"),
    "fingrid_balance_fee_2023": dict(
        url="https://www.fingrid.fi/en/news/news/2023/the-balance-service-fees-for-balance-"
            "responsible-parties-will-rise-on-1-november-2023",
        ext="html",
        title="Fingrid, The balance service fees for balance responsible parties will rise on 1 "
              "November 2023 (28 September 2023)"),
    # ---- the presentation page's impact table (D-156; read 22 October 2026)
    "acer_chest_household_2024": dict(
        url="https://aegis.acer.europa.eu/chest/dataitems/1002/view", ext="html",
        licence="© ACER; reproduction authorised provided the Agency is acknowledged as the source "
                "(acer.europa.eu legal notice)",
        title="ACER, CHEST data item, Figure 16: share of electricity volumes consumed by "
              "household consumption bands, and average consumption per household (kWh), 2024 "
              "(last updated 2025-12-04; ACER, based on the regulators' data)"),
    "eurostat_hicp_aind": dict(
        url="https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_aind"
            "?format=JSON&lang=en&geo=EA&coicop=CP00&unit=INX_A_AVG&time=2020&time=2025",
        ext="json",
        licence="© European Union, Eurostat; re-use authorised with acknowledgement of the source",
        title="Eurostat, HICP, annual average index (prc_hicp_aind), euro area, all items, 2020 "
              "and 2025 (updated 2026-02-06; read 22 October 2026)"),
    "emta_vat_rate": dict(
        url="https://emta.ee/ariklient/maksud-ja-tasumine/kaibemaks/kaibemaksumaarad-ja-maksuvaba-"
            "kaive/uldine-kaibemaksumaar", ext="html",
        title="Maksu- ja Tolliamet, Üldine käibemaksumäär (the standard VAT rate; read 22 October "
              "2026)"),
    # ---- the Statistics page's data centres and new industrial loads, read 4 November 2026 (D-214,
    # docs/research/2026-11-04_datacentres_industry.md)
    "ehitusuudised_2026_10_19_datacentres": dict(
        url="https://www.ehitusuudised.ee/uudised/2026/10/19/tippettevotjad-haistavad-uut-miljardiari-"
            "elektrinaljaseid-hiigelprojekte-tuleb-aina-juurde", ext="html",
        title="Ehitusuudised, Tippettevõtjad haistavad uut miljardiäri: elektrinäljaseid "
              "hiigelprojekte tuleb aina juurde (2026-10-19; the free first paragraph)"),
    "valitsus_2026_10_22_cabinet": dict(
        url="https://valitsus.ee/uudised/valitsuse-kabinetinoupidamise-paevakord-22-oktoober-2026",
        ext="html",
        title="Vabariigi Valitsus, Valitsuse kabinetinõupidamise päevakord, 22. oktoober 2026"),
    "greenergy_services": dict(
        url="https://www.greenergydatacenters.com/services", ext="html",
        title="Greenergy Data Centers, Services (an undated page, read 4 November 2026)"),
    "ast_connections_2026_09_13": dict(
        url="https://web.archive.org/web/20260913093942/https://www.ast.lv/lv/content/pieslegumu-"
            "ierikosanas-un-atlautas-slodzes-izmainu-statuss",
        original="https://www.ast.lv/lv/content/pieslegumu-ierikosanas-un-atlautas-slodzes-izmainu-"
                 "statuss", ext="html",
        title="AST, Pieslēgumu ierīkošanas un atļautās slodzes izmaiņu statuss (Internet Archive "
              "copy of 2026-09-13; ast.lv refuses the fetcher)"),
    "mk_2026_04_15_delska": dict(
        url="https://www.mk.gov.lv/lv/jaunums/silina-delska-jaunais-datu-centrs-ir-ieguldijums-"
            "latvijas-digitalas-infrastrukturas-stiprinasana", ext="html",
        title="Ministru kabinets, Siliņa: \"Delska\" jaunais datu centrs ir ieguldījums Latvijas "
              "digitālās infrastruktūras stiprināšanā (2026-04-15)"),
    "litgrid_2026_10_06_kruonis_dc": dict(
        url="https://www.litgrid.eu/naujienos/litgrid-ir-kruonis-dc-pasirase-susitarima-del-duomenu-"
            "centro-prijungimo", ext="html",
        title="Litgrid, „Litgrid“ ir „Kruonis DC“ pasirašė susitarimą dėl duomenų centro "
              "prijungimo (2026-10-06)"),
    "eurostat_isoc_env_ict_nrg": dict(
        url="https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/isoc_env_ict_nrg/"
            "A.GWH.E7000.DATAC.EE+LV+LT+FI+SE+PL?format=SDMX-CSV", ext="csv",
        licence="© European Union, Eurostat; re-use authorised with acknowledgement of the source",
        title="Eurostat, Electricity consumption of data centres (isoc_env_ict_nrg), GWh, EE, LV, "
              "LT, FI, SE and PL (updated 2026-07-27; read 4 November 2026)"),
    "fingrid_prospects_q3_2026_en": dict(
        url="https://www.fingrid.fi/globalassets/dokumentit/fi/kantaverkko/kantaverkon-kehittaminen/"
            "best-estimate-q3-2026/fingrid_prospects-q3-2026-eng.pdf", ext="pdf",
        title="Fingrid, Prospects for electricity production and consumption Q3/2026 (September "
              "2026; the English edition)"),
    "fingrid_2026_08_18_consumption": dict(
        url="https://www.fingrid.fi/en/news/news/2026/electricity-consumption-is-set-to-increase-"
            "sharply--more-balancing-power-will-also-be-needed/", ext="html",
        title="Fingrid, Electricity consumption is set to increase sharply - more balancing power "
              "will also be needed (2026-08-18)"),
    "svk_connections_2026_10_01": dict(
        url="https://www.svk.se/aktorsportalen/anslut-till-transmissionsnatet/information-om-"
            "pagaende-anslutningsarenden/", ext="html",
        title="Svenska kraftnät, Information om pågående anslutningsärenden (the queue at 1 "
              "October 2026; read 4 November 2026)"),
    "svk_connections_area_2026_10_01": dict(
        url="https://www.svk.se/aktorsportalen/anslut-till-transmissionsnatet/information-om-"
            "pagaende-anslutningsarenden/ansok-effekt-per-elomrade/", ext="html",
        title="Svenska kraftnät, Ansökt effekt per elområde (the queue at 1 October 2026; read 4 "
              "November 2026)"),
    # the queue at 1 November 2026, the page replaced and its figures rounded to 50-100 MW, reviewed
    # 10 November (the owner found it behind the slide's link, 2026-11-24; D-307)
    "svk_connections_2026_11_01": dict(
        url="https://www.svk.se/aktorsportalen/anslut-till-transmissionsnatet/information-om-"
            "pagaende-anslutningsarenden/", ext="html",
        title="Svenska kraftnät, Information om pågående anslutningsärenden (the queue at 1 "
              "November 2026, reviewed 10 November; read 24 November 2026)"),
    "svk_connections_area_2026_11_01": dict(
        url="https://www.svk.se/aktorsportalen/anslut-till-transmissionsnatet/information-om-"
            "pagaende-anslutningsarenden/ansok-effekt-per-elomrade/", ext="html",
        title="Svenska kraftnät, Ansökt effekt per elområde (the queue at 1 November 2026, "
              "reviewed 10 November; read 24 November 2026)"),
    # the euro reference rate on the day of Brookfield's release, to give its SEK in euros (D-308)
    "ecb_exr_sek_2025_06_04": dict(
        url="https://data-api.ecb.europa.eu/service/data/EXR/D.SEK.EUR.SP00.A"
            "?startPeriod=2025-06-04&endPeriod=2025-06-04&format=csvdata", ext="csv",
        licence="© European Central Bank; re-use with acknowledgement of the source",
        title="ECB, euro foreign exchange reference rate, Swedish krona, 4 June 2025 (read 24 "
              "November 2026)"),
    # the stage «building» of Amp Tank's Utajärvi campus: its construction begun (night of
    # 2026-11-25; the lead is free to read, the rest behind the paper's paywall)
    "kaleva_2026_10_08_utajarvi": dict(
        url="https://www.kaleva.fi/utajarven-datakeskuksen-rakentaminen-alkoi-kysyimm/13700960",
        ext="html",
        title="Kaleva, Utajärven datakeskuksen rakentaminen alkoi (2026-10-08)"),
    "cioanalytics_2026_11_02_datacenter": dict(
        url="https://www.cioanalytics.se/artikel/2026/11/sveriges-svara-val-i-datacenterboomen/",
        ext="html", title="CIO Analytics, Sveriges svåra val i datacenterboomen (2026-11-02), "
                          "quoting Svenska kraftnät"),
    "pse_art78l_2026_09_30": dict(
        url="https://www.pse.pl/documents/20182/51490/Informacje_publikowane_zgodnie_z_Art_7_ust_8l_"
            "ustawy_PE.xlsx", ext="xlsx",
        title="PSE, Informacje publikowane zgodnie z Art. 7 ust. 8l ustawy Prawo energetyczne "
              "(stan na 30.09.2026, published 26 October 2026; PSE replaces the file when it "
              "publishes a new state)"),
    "eurostat_db_isoc_env_ict_nrg": dict(
        url="https://ec.europa.eu/eurostat/databrowser/view/isoc_env_ict_nrg/default/table?lang=en",
        ext="html",
        note="the data browser's page of the table eurostat_isoc_env_ict_nrg reads, for the reader "
             "to open (the API's file downloads); it renders with JavaScript, the values are the "
             "API file's",
        title="Eurostat data browser, Electricity consumption of data centres (isoc_env_ict_nrg)"),
    "eurostat_db_nrg_bal_c": dict(
        url="https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table?lang=en",
        ext="html",
        note="the data browser's page of the table eurostat_nrg_bal_c_industry reads, for the "
             "reader to open (the API's file downloads); it renders with JavaScript, the values "
             "are the API file's",
        title="Eurostat data browser, Complete energy balances (nrg_bal_c)"),
    "eurostat_nrg_bal_c_industry": dict(
        url="https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/nrg_bal_c/A.FC_IND_E.E7000."
            "GWH.EE+LV+LT+FI+SE+PL/?format=SDMX-CSV&startPeriod=2024&endPeriod=2024", ext="csv",
        licence="© European Union, Eurostat; re-use authorised with acknowledgement of the source",
        title="Eurostat, Complete energy balances (nrg_bal_c), electricity, final consumption of "
              "the industry sector, GWh, EE, LV, LT, FI, SE and PL, 2024 (read 4 November 2026)"),
    "elering_gaas_arengukava_2026_2035": dict(
        url="https://elering.ee/sites/default/files/2026-02/Eesti%20gaasi%C3%BClekandev%C3%B5rgu%20"
            "arengukava%202026-2035_0.pdf", ext="pdf",
        title="Elering, Eesti gaasiülekandevõrgu arengukava 2026-2035 (February 2026)"),
    "mkm_2025_09_30_suurinvesteeringud": dict(
        url="https://mkm.ee/uudised/ajalooline-hetk-avalikustati-suurinvesteeringute-toetusmeetme-"
            "esimesed-projektid-kogumahus", ext="html",
        title="Majandus- ja Kommunikatsiooniministeerium, Ajalooline hetk: avalikustati "
              "suurinvesteeringute toetusmeetme esimesed projektid (2025-09-30)"),
    "ec_ip_24_3747": dict(
        url="https://ec.europa.eu/commission/presscorner/api/files/document/print/en/ip_24_3747/"
            "IP_24_3747_EN.pdf", ext="pdf",
        licence="© European Union; re-use authorised with acknowledgement of the source",
        title="European Commission, IP/24/3747: Commission approves EUR 998 million of State aid "
              "for renewable hydrogen (2024-07-12)"),
    "ast_pso_2026": dict(
        url="https://web.archive.org/web/2026id_/https://www.ast.lv/sites/default/files/editor/PSO_"
            "zinojums_2026_LV_final.pdf",
        original="https://www.ast.lv/sites/default/files/editor/PSO_zinojums_2026_LV_final.pdf",
        ext="pdf", title="AST, Pārvades sistēmas operatora novērtējuma ziņojums 2026 (the Internet "
                         "Archive's copy; ast.lv refuses the fetcher)"),
    "sunfire_2025_02_20_harjavalta": dict(
        url="https://sunfire.de/en/news/finlands-first-industrial-scale-green-hydrogen-plant-goes-into-"
            "operation/", ext="html",
        title="Sunfire, Finland's first industrial-scale green hydrogen plant goes into operation "
              "(2025-02-20)"),
    "neste_2024_10_24_porvoo": dict(
        url="https://www.neste.com/news/neste-to-re-evaluate-its-renewable-hydrogen-plan-and-withdraw-"
            "from-investing-into-a-120-mw-electrolyzer-at-the-porvoo-refinery", ext="html",
        title="Neste, Neste to re-evaluate its renewable hydrogen plan and withdraw from investing "
              "into a 120 MW electrolyzer at the Porvoo refinery (2024-10-24)"),
    "tkn_2023_05_22_stegra": dict(
        url="https://www.thyssenkrupp-nucera.com/newsroom/news-press-releases/thyssenkrupp-nucera-"
            "supplies-the-electrolyzers-for-h2-green-steel-to-build-one-of-the-largest-integrated-"
            "green-steel-plants-in-europe", ext="html",
        title="thyssenkrupp nucera, thyssenkrupp nucera supplies the electrolyzers for H2 Green "
              "Steel to build one of the largest integrated green steel plants in Europe "
              "(2023-05-22)"),
}


def dataset_id(key: str) -> str:
    return DOCS[key].get("dataset", f"doc.{key}")


def fetch(key: str) -> Path:
    """One document, requested exactly at its `url` (no query parameters: the lineage record's
    endpoint is the request); the original or publisher address goes into the record's notes."""
    d = DOCS[key]
    notes = "; ".join(f"{k}: {d[k]}" for k in ("note", "original", "publisher_url") if k in d)
    return cached_get(raw=RAW, dataset=dataset_id(key), ext=d["ext"], url=d["url"],
                      params=None, source=d["title"], licence=d.get("licence", PUBLIC),
                      headers=UA, timeout=300, notes=notes or None)
