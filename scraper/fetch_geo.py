"""Fetch geopolitical + big Indonesia news and push breaking alerts.

Run from the repo root: `python scraper/fetch_geo.py`
Writes data/geo-feed.json and data/geo-seen.json.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

import feedparser
import requests

sys.path.insert(0, str(Path(__file__).parent))
import config_geo as cfg

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
FEED_PATH = ROOT / cfg.GEO_FEED_FILE
SEEN_PATH = ROOT / cfg.GEO_SEEN_FILE

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 GeoNewsBot/1.0"
)
HTTP_TIMEOUT = 20

NTFY_SERVER = os.environ.get("NTFY_SERVER", "https://ntfy.sh")
NTFY_GEO_TOPIC = os.environ.get("NTFY_GEO_TOPIC", "").strip()

PUSH_DEDUP_PATH = ROOT / "data" / "geo-push-seen.json"
# Only push each big-news keyword cluster ONCE per N hours.
PUSH_COOLDOWN_HOURS = 6

_TICKER_RE = re.compile(r"^[A-Z]{4}$")


def _compile_pattern(keyword: str) -> re.Pattern:
    # Force case-insensitive for known acronyms that aren't IDX tickers
    if keyword in cfg.GEO_CASE_INSENSITIVE_FORCE:
        return re.compile(rf"\b{re.escape(keyword)}\b", re.IGNORECASE)
    # 4-letter all-caps → case-sensitive (could be a ticker on another exchange)
    if _TICKER_RE.match(keyword):
        return re.compile(rf"\b{keyword}\b")
    if " " in keyword or "-" in keyword:
        return re.compile(re.escape(keyword), re.IGNORECASE)
    return re.compile(rf"\b{re.escape(keyword)}\b", re.IGNORECASE)


_KW_PATTERNS = [(g, kw, _compile_pattern(kw)) for g, kw in cfg.GEO_ALL_KEYWORDS]
_BIG_PATTERNS = [_compile_pattern(kw) for kw in cfg.GEO_BIG_KEYWORDS]
_NOISE_RE = re.compile("|".join(cfg.GEO_DOMAIN_BLOCKLIST), re.IGNORECASE)

# Generic big-news words that should only push if the story also mentions Indonesia
_INDONESIA_CONTEXT_REQUIRED = {
    "perang", "krisis", "crisis", "sanksi", "sanctions",
    "tariff", "default", "downgrade", "capital flight",
}
_INDONESIA_RE = re.compile(r"\bIndonesia\b|\bRI\b|Jakarta|Prabowo|rupiah|IHSG", re.IGNORECASE)


def match_watchlist(text: str) -> list[tuple[str, str]]:
    return [(g, kw) for g, kw, pat in _KW_PATTERNS if pat.search(text)]


def is_big_news(text: str) -> bool:
    indonesia_present = bool(_INDONESIA_RE.search(text))
    for kw, pat in zip(cfg.GEO_BIG_KEYWORDS, _BIG_PATTERNS):
        if pat.search(text):
            # Generic crisis words only push when Indonesia is in context
            if kw.lower() in _INDONESIA_CONTEXT_REQUIRED and not indonesia_present:
                continue
            return True
    return False


def is_noise(item: dict) -> bool:
    # Reject if URL or title looks like soft content (lifestyle, sport, etc.)
    combined = f"{item.get('link', '')} {item.get('title', '')}"
    return bool(_NOISE_RE.search(combined))


def _http_get(url: str) -> requests.Response:
    return requests.get(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
        timeout=HTTP_TIMEOUT,
    )


def _parse_pubdate(raw: str | None) -> str:
    if not raw:
        return datetime.now(timezone.utc).isoformat()
    try:
        return parsedate_to_datetime(raw).astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError):
        return datetime.now(timezone.utc).isoformat()


def fetch_rss(source: dict) -> list[dict]:
    try:
        resp = _http_get(source["url"])
        parsed = feedparser.parse(resp.content)
    except Exception as e:
        print(f"  ! {source['name']}: {e}", file=sys.stderr)
        return []

    items = []
    for entry in parsed.entries:
        title = (entry.get("title") or "").strip()
        link = (entry.get("link") or "").strip()
        summary = re.sub(r"<[^>]+>", "", entry.get("summary") or entry.get("description") or "").strip()
        published = entry.get("published") or entry.get("updated")
        items.append({
            "title": title,
            "link": link,
            "summary": summary[:500],
            "published": _parse_pubdate(published),
            "source": source["name"],
        })
    return items


def url_hash(url: str) -> str:
    return hashlib.sha1(url.encode()).hexdigest()[:16]


def load_seen() -> set[str]:
    if not SEEN_PATH.exists():
        return set()
    try:
        return set(json.loads(SEEN_PATH.read_text()))
    except Exception:
        return set()


def save_seen(seen: set[str]) -> None:
    SEEN_PATH.write_text(json.dumps(list(seen)[-cfg.GEO_SEEN_HISTORY_LIMIT:]))


def load_feed() -> list[dict]:
    if not FEED_PATH.exists():
        return []
    try:
        data = json.loads(FEED_PATH.read_text())
        return data.get("items", []) if isinstance(data, dict) else data
    except Exception:
        return []


def load_push_seen() -> dict:
    if not PUSH_DEDUP_PATH.exists():
        return {}
    try:
        return json.loads(PUSH_DEDUP_PATH.read_text())
    except Exception:
        return {}


def save_push_seen(d: dict) -> None:
    PUSH_DEDUP_PATH.write_text(json.dumps(d, ensure_ascii=False))


def should_push(push_seen: dict, key: str) -> bool:
    """Return True if this key hasn't been pushed within the cooldown window."""
    last = push_seen.get(key)
    if last is None:
        return True
    try:
        last_dt = datetime.fromisoformat(last)
        elapsed = (datetime.now(timezone.utc) - last_dt).total_seconds() / 3600
        return elapsed >= PUSH_COOLDOWN_HOURS
    except Exception:
        return True


def push_ntfy(title: str, body: str, link: str) -> None:
    if not NTFY_GEO_TOPIC:
        return
    url = f"{NTFY_SERVER.rstrip('/')}/{NTFY_GEO_TOPIC}"
    try:
        requests.post(
            url,
            data=body.encode("utf-8"),
            headers={
                "Title": title.encode("utf-8"),
                "Priority": "high",
                "Tags": "globe_with_meridians",
                "Click": link,
            },
            timeout=10,
        )
    except Exception as e:
        print(f"  ! ntfy push failed: {e}", file=sys.stderr)


def main() -> int:
    print(f"[{datetime.now(timezone.utc).isoformat()}] geo-news: fetching {len(cfg.GEO_SOURCES)} sources...")
    seen = load_seen()
    existing = load_feed()
    existing_links = {it["link"] for it in existing}

    raw: list[dict] = []
    for source in cfg.GEO_SOURCES:
        fetched = fetch_rss(source)
        print(f"  - {source['name']}: {len(fetched)} items")
        raw.extend(fetched)
        time.sleep(0.5)

    new_matched: list[dict] = []
    for item in raw:
        link = item.get("link") or ""
        if not link:
            continue
        h = url_hash(link)
        if h in seen or link in existing_links:
            continue
        seen.add(h)

        if is_noise(item):
            continue

        text = f"{item['title']} {item.get('summary', '')}"
        hits = match_watchlist(text)
        if not hits:
            continue

        groups = sorted({g for g, _ in hits})
        keywords = sorted({k for _, k in hits})
        big = is_big_news(text)

        new_matched.append({
            **item,
            "groups": groups,
            "matched": keywords,
            "big": big,
            "id": h,
        })

    new_matched.sort(key=lambda x: x["published"], reverse=True)

    push_seen = load_push_seen()
    pushed = 0
    for item in new_matched:
        if not item["big"]:
            continue
        # Normalize to a canonical event key so "BI rate hike" doesn't fire 20 times
        # under slightly different keyword combos. Priority order: first match wins.
        CANONICAL_KEYS = [
            "BI rate", "suku bunga", "rupiah",
            "APBN", "kabinet", "reshuffle",
            "OTT KPK", "resesi", "krisis keuangan",
            "default", "downgrade", "MSCI",
            "capital flight", "perang dagang",
            "Laut China Selatan", "hilirisasi", "larangan ekspor",
            "harga BBM",
        ]
        matched_set = set(item["matched"])
        push_key = next(
            (k for k in CANONICAL_KEYS if k in matched_set),
            item["matched"][0] if item["matched"] else "misc",
        )
        if not should_push(push_seen, push_key):
            continue
        tag = " / ".join(item["groups"])
        push_ntfy(
            title=f"🌐 {tag}: {push_key}",
            body=item["title"],
            link=item["link"],
        )
        push_seen[push_key] = datetime.now(timezone.utc).isoformat()
        pushed += 1
    save_push_seen(push_seen)

    merged = (new_matched + existing)[:cfg.MAX_GEO_FEED_ITEMS]
    merged.sort(key=lambda x: x["published"], reverse=True)

    FEED_PATH.write_text(json.dumps({
        "updated": datetime.now(timezone.utc).isoformat(),
        "count": len(merged),
        "items": merged,
    }, ensure_ascii=False, indent=2))
    save_seen(seen)

    print(f"  matched: {len(new_matched)} new, {len(merged)} total, pushed: {pushed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
