"""Config for the geo + global finance news tracker.

Sources lean heavily international (FT, Reuters, Bloomberg, WSJ, Nikkei)
for global market signals, plus Indonesian domestic politics + macro.
"Big" alerts fire for macro shocks, rate decisions, and geopolitical moves
that materially affect Indonesia or global markets.
"""

# ---------------------------------------------------------------------------
# TOPIC WATCHLIST
# ---------------------------------------------------------------------------

GEO_WATCHLIST = {

    # NEW: Global Finance — this is the primary new bucket
    "Global Finance": [
        # Central banks
        "Federal Reserve", "Fed rate", "FOMC", "Jerome Powell",
        "ECB", "Bank of England", "BOE", "BOJ", "Bank of Japan",
        "rate hike", "rate cut", "interest rate",
        "quantitative tightening", "QT", "quantitative easing", "QE",

        # Markets
        "S&P 500", "Nasdaq", "Dow Jones",
        "bond yield", "Treasury yield", "10-year yield",
        "credit spread", "high yield", "investment grade",
        "IPO", "earnings beat", "earnings miss",
        "hedge fund", "private equity",
        "Bitcoin", "crypto", "stablecoin",

        # Global macro signals affecting EM/Indonesia
        "DXY", "dollar index", "US dollar",
        "oil price", "Brent crude", "WTI",
        "gold price",
        "coal price", "thermal coal",
        "emerging market", "EM sell-off", "risk-off", "risk-on",
        "carry trade",
        "MSCI EM", "MSCI rebalancing", "index inclusion",

        # Institutions & ratings
        "IMF", "World Bank", "ADB",
        "S&P", "Moody's", "Fitch",
        "downgrade", "upgrade", "outlook",

        # Trade & geopolitics with market impact
        "tariff", "trade war", "sanctions",
        "supply chain", "reshoring",
    ],

    "Government / Policy": [
        "Prabowo", "Gibran", "kabinet", "menteri",
        "DPR", "MPR", "MK", "Mahkamah Konstitusi",
        "UU ", "omnibus", "perppu",
        "APBN", "anggaran", "defisit fiskal", "subsidi",
        "Kemenkeu", "Sri Mulyani", "Bappenas",
        "KPK", "OTT",
    ],

    "Macro / Economy": [
        "BI rate", "Bank Indonesia", "suku bunga",
        "rupiah", "kurs", "depresiasi", "apresiasi",
        "inflasi", "deflasi",
        "cadangan devisa", "current account",
        "neraca dagang", "neraca pembayaran",
        "utang luar negeri", "sovereign",
        "resesi", "pertumbuhan ekonomi", "GDP Indonesia",
        "IHSG", "bursa efek Indonesia",
    ],

    "Commodity / Energy Policy": [
        "hilirisasi", "larangan ekspor", "bea ekspor",
        "nikel", "bauksit", "tembaga",
        "batu bara", "batubara",
        "CPO", "sawit",
        "Pertamina", "PLN",
        "transisi energi", "IKN",
    ],

    "Geopolitics": [
        "ASEAN", "G20", "G7",
        "Trump", "Xi Jinping",
        "perang dagang", "trade war",
        "Laut China Selatan", "South China Sea",
        "BRICS", "de-dolarisasi",
        "geopolitik",
    ],

    "Financial Crisis Signals": [
        "krisis keuangan", "financial crisis",
        "bank run", "bank failure", "bank collapse",
        "default", "gagal bayar", "sovereign default",
        "bailout", "bail-in",
        "capital flight", "pelarian modal",
        "contagion",
    ],
}

GEO_ALL_KEYWORDS = [(group, kw) for group, kws in GEO_WATCHLIST.items() for kw in kws]

GEO_CASE_INSENSITIVE_FORCE = {
    "MSCI", "ASEAN", "APBN", "BRICS", "NATO", "OPEC",
    "FOMC", "ECB", "BOE", "BOJ", "QE", "QT",
    "DXY", "WTI", "IMF", "ADB", "CPO", "PLN",
    "IHSG", "GDP",
}


# ---------------------------------------------------------------------------
# SOURCES
# ---------------------------------------------------------------------------
# Ordered roughly by signal quality. International finance sources first,
# then Indonesia domestic.
# ---------------------------------------------------------------------------

GEO_SOURCES = [
    # --- INTERNATIONAL FINANCE (high quality) ---

    # Financial Times via Google News — paywall-gated but headlines are free
    {"name": "Financial Times (via GNews)", "type": "rss",
     "url": "https://news.google.com/rss/search"
            "?q=Financial+Times+Indonesia+economy"
            "&hl=en-ID&gl=ID&ceid=ID:en"},

    # Reuters via Google News (direct RSS feed is DNS-dead)
    {"name": "Reuters – Indonesia", "type": "rss",
     "url": "https://news.google.com/rss/search"
            "?q=Reuters+Indonesia+economy+rupiah+market"
            "&hl=en-ID&gl=ID&ceid=ID:en"},

    # Bloomberg via Google News (direct feed is paywalled)
    {"name": "Bloomberg (via GNews)", "type": "rss",
     "url": "https://news.google.com/rss/search"
            "?q=site:bloomberg.com+Indonesia+OR+\"Fed+rate\"+OR+\"emerging+market\""
            "&hl=en-ID&gl=ID&ceid=ID:en"},

    # WSJ — global macro & trade
    {"name": "WSJ (via GNews)", "type": "rss",
     "url": "https://news.google.com/rss/search"
            "?q=site:wsj.com+Indonesia+OR+tariff+OR+\"Fed+rate\"+OR+\"trade+war\""
            "&hl=en-ID&gl=ID&ceid=ID:en"},

    # Nikkei Asia — best for SEA/Indonesia specific finance
    {"name": "Nikkei Asia (via GNews)", "type": "rss",
     "url": "https://news.google.com/rss/search"
            "?q=site:asia.nikkei.com+Indonesia"
            "&hl=en-ID&gl=ID&ceid=ID:en"},

    # The Economist — macro narratives, EM coverage
    {"name": "The Economist (via GNews)", "type": "rss",
     "url": "https://news.google.com/rss/search"
            "?q=site:economist.com+Indonesia+OR+\"emerging+markets\""
            "&hl=en-ID&gl=ID&ceid=ID:en"},

    # CNBC global — Fed, market moves
    {"name": "CNBC Global Markets", "type": "rss",
     "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml"
            "?partnerId=wrss01&id=20910258"},

    # BBC World Business
    {"name": "BBC Business", "type": "rss",
     "url": "https://feeds.bbci.co.uk/news/business/rss.xml"},

    # --- INDONESIA DOMESTIC ---

    # Tempo.co — best for policy depth
    {"name": "Tempo.co", "type": "rss",
     "url": "https://rss.tempo.co/"},

    # CNN Indonesia — fast breaking
    {"name": "CNN Indonesia", "type": "rss",
     "url": "https://www.cnnindonesia.com/rss"},

    # Antara (state wire) — official announcements
    {"name": "Antara News", "type": "rss",
     "url": "https://www.antaranews.com/rss/terkini.xml"},

    # Google News targeted queries
    {"name": "GNews – BI rate rupiah", "type": "rss",
     "url": "https://news.google.com/rss/search"
            "?q=BI+rate+rupiah+inflasi+Indonesia"
            "&hl=id&gl=ID&ceid=ID:id"},

    {"name": "GNews – Prabowo APBN", "type": "rss",
     "url": "https://news.google.com/rss/search"
            "?q=Prabowo+APBN+kebijakan+ekonomi"
            "&hl=id&gl=ID&ceid=ID:id"},

    # Al Jazeera — ASEAN, US-China
    {"name": "Al Jazeera", "type": "rss",
     "url": "https://www.aljazeera.com/xml/rss/all.xml"},
]


# ---------------------------------------------------------------------------
# "BIG NEWS" — push notification triggers
# High bar: macro decisions, market shocks, geopolitical escalation.
# ---------------------------------------------------------------------------

GEO_BIG_KEYWORDS = [
    # Central bank decisions
    "rate hike", "rate cut", "Fed rate", "FOMC", "BI rate", "suku bunga",
    "quantitative tightening", "QT",

    # Market shocks
    "market crash", "stock market crash", "circuit breaker",
    "MSCI rebalancing", "index inclusion", "index exclusion",
    "downgrade", "sovereign default", "default",

    # Indonesia macro
    "rupiah", "capital flight", "cadangan devisa",
    "resesi", "recession",
    "APBN", "OTT KPK",

    # Geopolitical escalation with market impact
    "trade war", "perang dagang",
    "sanctions", "tariff",
    "Laut China Selatan",

    # Commodity shocks
    "oil price crash", "coal ban", "larangan ekspor",
    "harga BBM", "subsidi BBM",
]

# These big-news words REQUIRE Indonesia context to push
_INDONESIA_CONTEXT_REQUIRED_WORDS = {
    "rupiah", "resesi", "recession", "capital flight",
    "sanctions", "tariff", "downgrade",
}

# ---------------------------------------------------------------------------
# OUTPUT
# ---------------------------------------------------------------------------

GEO_FEED_FILE = "data/geo-feed.json"
GEO_SEEN_FILE = "data/geo-seen.json"
MAX_GEO_FEED_ITEMS = 150
GEO_SEEN_HISTORY_LIMIT = 2000

GEO_DOMAIN_BLOCKLIST = [
    # Soft content / tabloid
    "entertainment", "lifestyle", "seleb", "gossip",
    "olahraga", "sport", "bola", "nba",
    "kesehatan", "health", "resep", "kuliner",
    "horoscope", "zodiac",
]

# Title-level noise filter — reject if title contains these (not URL-based)
# These are everyday retail price / religious / social stories that match
# macro keywords purely by coincidence.
GEO_TITLE_BLOCKLIST = [
    "harga cabai", "cabai rawit", "harga bawang", "harga telur",
    "harga beras", "harga daging", "harga sembako", "harga pangan",
    "pesantren", "santri", "madrasah",
    "bencana alam", "gempa", "banjir", "longsor",
    "kecelakaan", "kriminal", "narkoba", "penangkapan",
    "pernikahan", "wisuda", "lomba",
]
