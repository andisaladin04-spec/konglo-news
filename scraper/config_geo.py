"""Config for the geopolitical + big Indonesia news tracker.

"Big" is defined as: government policy, macro signals, geopolitical events, or
regional/global crises that could materially affect Indonesia's economy or markets.
Everyday crime, celebrity, sports, and lifestyle are filtered out by design.
"""

# ---------------------------------------------------------------------------
# TOPIC WATCHLIST
# Matches if ANY keyword appears in title or summary (word-boundary, case rules below).
# Keep these high-signal — each additional keyword increases noise.
# ---------------------------------------------------------------------------

GEO_WATCHLIST = {

    "Government / Policy": [
        "Prabowo", "Gibran", "kabinet", "menteri", "Jokowi",
        "DPR", "MPR", "MK", "Mahkamah Konstitusi", "Mahkamah Agung",
        "UU ", "omnibus", "perppu", "peraturan pemerintah",
        "APBN", "anggaran", "defisit fiskal", "subsidi",
        "Bappenas", "Kemenkeu", "Sri Mulyani",
        "pemilu", "pilkada", "koalisi", "oposisi",
        "KPK", "korupsi", "OTT",
    ],

    "Macro / Economy": [
        "BI rate", "Bank Indonesia", "suku bunga",
        "rupiah", "kurs", "depresiasi", "apresiasi",
        "inflasi", "deflasi", "neraca dagang",
        "cadangan devisa", "current account",
        "utang luar negeri", "sovereign",
        "IMF", "World Bank", "ADB",
        "resesi", "kontraksi ekonomi", "pertumbuhan ekonomi",
        "IHSG", "bursa efek",
        "ekspor", "impor", "neraca pembayaran",
    ],

    "Commodity / Energy Policy": [
        "hilirisasi", "larangan ekspor", "bea ekspor",
        "nikel", "bauksit", "tembaga",
        "batu bara", "batubara",
        "CPO", "sawit",
        "Pertamina", "PLN",
        "transisi energi",
        "IKN", "ibu kota nusantara",
    ],

    "Geopolitics": [
        "ASEAN", "G20", "G7",
        "Trump", "Xi Jinping",
        "perang dagang", "trade war",
        "Laut China Selatan", "South China Sea",
        "geopolitik",
        "BRICS", "de-dolarisasi",
        # Only flag sanctions/tariffs when clearly about Indonesia
        "sanksi terhadap Indonesia", "tarif impor Indonesia",
        "Indonesia trade", "Indonesia sanctions",
    ],

    "Financial Crisis Signals": [
        "krisis keuangan", "financial crisis",
        "bank gagal", "bank kolaps", "bank run",
        "default", "gagal bayar",
        "bailout", "bail-in",
        "contagion", "penularan",
        "capital flight", "pelarian modal",
        "MSCI", "index rebalancing", "index inclusion",
        "downgrade", "upgrade",
        "S&P", "Moody's", "Fitch",
    ],
}

GEO_ALL_KEYWORDS = [(group, kw) for group, kws in GEO_WATCHLIST.items() for kw in kws]

# 4-letter all-caps words that should still be case-insensitive (not IDX tickers)
GEO_CASE_INSENSITIVE_FORCE = {"NASA", "OPEC", "NATO", "ASEAN", "APBN", "MSCI", "BRICS"}


# ---------------------------------------------------------------------------
# SOURCES
# ---------------------------------------------------------------------------

GEO_SOURCES = [
    # Indonesian domestic — politics & general
    {"name": "Tempo.co", "type": "rss",
     "url": "https://rss.tempo.co/"},

    {"name": "CNN Indonesia", "type": "rss",
     "url": "https://www.cnnindonesia.com/rss"},

    {"name": "Antara News", "type": "rss",
     "url": "https://www.antaranews.com/rss/terkini.xml"},

    {"name": "Detik News", "type": "rss",
     "url": "https://news.detik.com/rss"},

    # International — quality filter via Google News to surface only
    # Indonesia-relevant geopolitical stories
    {"name": "Reuters – Indonesia macro", "type": "rss",
     "url": "https://news.google.com/rss/search"
            "?q=Indonesia+economy+policy+rupiah&hl=en-ID&gl=ID&ceid=ID:en"},

    {"name": "GNews – Prabowo kebijakan", "type": "rss",
     "url": "https://news.google.com/rss/search"
            "?q=Prabowo+kebijakan+APBN+anggaran&hl=id&gl=ID&ceid=ID:id"},

    {"name": "GNews – BI rate rupiah", "type": "rss",
     "url": "https://news.google.com/rss/search"
            "?q=BI+rate+rupiah+inflasi+ekonomi+Indonesia&hl=id&gl=ID&ceid=ID:id"},

    # BBC Asia covers Southeast Asia geopolitics reliably
    {"name": "BBC Asia", "type": "rss",
     "url": "https://feeds.bbci.co.uk/news/world/asia/rss.xml"},

    # Al Jazeera — good for ASEAN, US-China, global crises
    {"name": "Al Jazeera", "type": "rss",
     "url": "https://www.aljazeera.com/xml/rss/all.xml"},
]


# ---------------------------------------------------------------------------
# "BIG NEWS" RULES — what triggers a push notification
# ---------------------------------------------------------------------------
# Geo stories push if they match watchlist AND contain a high-urgency signal.
# Set deliberately high bar — you don't want 20 geo pushes a day.
# ---------------------------------------------------------------------------

GEO_BIG_KEYWORDS = [
    # Macro shocks
    "BI rate", "suku bunga", "darurat", "emergency",
    "krisis", "crisis", "resesi", "recession",
    "capital flight", "pelarian modal",
    "downgrade", "default", "gagal bayar",
    "MSCI", "index rebalancing",

    # Geopolitical escalation
    "perang", "invasi", "sanctions", "sanksi",
    "tariff", "perang dagang", "trade war",
    "Laut China Selatan",

    # High-impact domestic
    "darurat nasional", "darurat sipil", "darurat militer",
    "OTT KPK",  # anti-corruption arrests
    "kabinet", "reshuffle",
    "APBN",

    # Commodity policy
    "larangan ekspor", "hilirisasi",
    "harga BBM", "subsidi BBM",
]


# ---------------------------------------------------------------------------
# OUTPUT
# ---------------------------------------------------------------------------

GEO_FEED_FILE = "data/geo-feed.json"
GEO_SEEN_FILE = "data/geo-seen.json"
MAX_GEO_FEED_ITEMS = 150
GEO_SEEN_HISTORY_LIMIT = 2000

# Noise filter — skip stories from these domains even if keyword-matched
# (tabloid / not serious enough for this tracker)
GEO_DOMAIN_BLOCKLIST = [
    "entertainment", "lifestyle", "seleb", "gossip",
    "olahraga", "sport", "bola", "nba",
    "kesehatan", "health", "resep", "kuliner",
]
