"""Watchlist, sources, and "big news" rules for the konglo news system.

Edit this file to tune what the system tracks and what counts as a breaking-news alert.
"""

# ---------------------------------------------------------------------------
# WATCHLIST
# ---------------------------------------------------------------------------
# Each entry: (group_label, [keywords]). A story matches the watchlist if ANY
# keyword appears (case-insensitive, word-boundary) in title or summary.
# Tickers are 4-letter IDX codes. Names cover owners / group brands.
# ---------------------------------------------------------------------------

WATCHLIST = {
    "Prajogo / Barito": [
        "BRPT", "TPIA", "BREN", "CUAN", "PTRO", "BRMS",
        "Prajogo", "Pangestu", "Barito Pacific", "Chandra Asri",
        "Barito Renewables", "Petrindo",
    ],
    "Salim": [
        "INDF", "ICBP", "AMRT", "MIDI",
        "Anthoni Salim", "Salim Group", "Indofood",
    ],
    "Sinar Mas": [
        "INKP", "TKIM", "SMMA", "BSDE", "DUTI", "SMRA",
        "Sinar Mas", "Eka Tjipta", "Widjaja",
    ],
    "Astra": [
        "ASII", "AALI", "UNTR", "ACES", "BNLI",
        "Astra International", "Jardine",
    ],
    "Djarum / Hartono": [
        "BBCA", "BBHI", "SRTG",
        "Djarum", "Hartono", "Saratoga",
    ],
    "Bakrie": [
        "BUMI", "BNBR", "ENRG", "DEWA", "VKTR",
        "Bakrie",
    ],
}

# Flattened list used by the matcher
ALL_KEYWORDS = [(group, kw) for group, kws in WATCHLIST.items() for kw in kws]


# ---------------------------------------------------------------------------
# RSS / API SOURCES
# ---------------------------------------------------------------------------
# Each source: name, type ("rss" or "idx"), url.
# RSS feeds are parsed by feedparser. IDX uses a JSON API.
# ---------------------------------------------------------------------------

SOURCES = [
    # CNBC Indonesia — market section RSS (fastest breaking news)
    {"name": "CNBC Indonesia - Market", "type": "rss",
     "url": "https://www.cnbcindonesia.com/market/rss"},
    {"name": "CNBC Indonesia - News", "type": "rss",
     "url": "https://www.cnbcindonesia.com/news/rss"},

    # Kontan — investasi section
    {"name": "Kontan - Investasi", "type": "rss",
     "url": "https://investasi.kontan.co.id/rss"},
    {"name": "Kontan - Industri", "type": "rss",
     "url": "https://industri.kontan.co.id/rss"},

    # Katadata
    {"name": "Katadata", "type": "rss",
     "url": "https://katadata.co.id/rss"},

    # Bisnis Indonesia — via Google News (their direct RSS is gone)
    {"name": "Bisnis Indonesia (via GNews)", "type": "rss",
     "url": "https://news.google.com/rss/search?q=site:bisnis.com&hl=id&gl=ID&ceid=ID:id"},

    # IDX disclosures — direct API is Cloudflare-blocked from CI; use Google News
    {"name": "IDX Disclosures (via GNews)", "type": "rss",
     "url": "https://news.google.com/rss/search?q=site:idx.co.id+keterbukaan&hl=id&gl=ID&ceid=ID:id"},

    # Direct IDX API attempt (works if not Cloudflare-blocked; fails soft otherwise)
    {"name": "IDX Direct", "type": "idx",
     "url": "https://www.idx.co.id/primary/NewsAnnouncement/GetAnnouncement"
            "?indexFrom=1&pageSize=50&lang=id&keyword=&fromDate=&toDate="},
]


# ---------------------------------------------------------------------------
# "BIG NEWS" RULES — what triggers a push notification
# ---------------------------------------------------------------------------
# A story fires a push if:
#   (1) it matches the watchlist, AND
#   (2) it matches at least one BIG_NEWS keyword, OR comes from IDX disclosures
# IDX disclosures are inherently material so they always push if watchlist-matched.
# ---------------------------------------------------------------------------

BIG_NEWS_KEYWORDS = [
    # Corporate actions
    "rights issue", "HMETD", "PUT ", "private placement", "tender offer",
    "stock split", "reverse stock", "buyback",
    "akuisisi", "merger", "spin off", "spin-off", "divestasi",
    "dividen", "dividend", "cum date", "ex date",
    "RUPS", "RUPSLB",
    "obligasi", "sukuk", "MTN",

    # Trading status
    "suspend", "suspensi", "unsuspend",
    "delisting", "relisting",
    "ARA", "ARB", "auto reject",

    # Price moves
    "anjlok", "ambruk", "ambles", "rontok", "terjun",
    "melonjak", "meroket", "terbang", "all time high", "ATH",

    # Financial distress
    "default", "gagal bayar", "pailit", "PKPU", "restrukturisasi",

    # Material disclosures
    "keterbukaan informasi", "informasi material", "afiliasi",

    # Specific to Prajogo / energy
    "geothermal", "panas bumi", "petrokimia", "pertamina",
]


# ---------------------------------------------------------------------------
# OUTPUT
# ---------------------------------------------------------------------------

MAX_FEED_ITEMS = 200       # how many items to keep in feed.json
WIDGET_TOP_N = 8           # how many headlines the iOS widget will show
SEEN_HISTORY_LIMIT = 2000  # how many URL hashes to remember (for dedupe)
