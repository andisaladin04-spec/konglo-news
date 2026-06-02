"""Fetch konglo news from Indonesian sources, filter by watchlist, push breaking news.

Run from the repo root: `python scraper/fetch.py`
Writes data/feed.json and data/seen.json. POSTs breaking-news alerts to ntfy.sh
if the NTFY_TOPIC env var is set.
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
import config  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
FEED_PATH = DATA_DIR / "feed.json"
SEEN_PATH = DATA_DIR / "seen.json"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 KongloNewsBot/1.0"
)
HTTP_TIMEOUT = 20

NTFY_SERVER = os.environ.get("NTFY_SERVER", "https://ntfy.sh")
NTFY_TOPIC = os.environ.get("NTFY_TOPIC", "").strip()


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------

_TICKER_RE = re.compile(r"^[A-Z]{4}$")


def _compile_pattern(keyword: str) -> re.Pattern:
    # 4-letter all-caps tickers (BRPT, CUAN, BUMI...) are matched case-SENSITIVELY
    # to avoid false hits on Indonesian words ("cuan"=profit, "bumi"=earth).
    if _TICKER_RE.match(keyword):
        return re.compile(rf"\b{keyword}\b")
    # Phrases stay substring; single words use word boundaries; all case-insensitive.
    if " " in keyword or "-" in keyword:
        return re.compile(re.escape(keyword), re.IGNORECASE)
    return re.compile(rf"\b{re.escape(keyword)}\b", re.IGNORECASE)


_KW_PATTERNS = [(group, kw, _compile_pattern(kw)) for group, kw in config.ALL_KEYWORDS]
_BIG_PATTERNS = [_compile_pattern(kw) for kw in config.BIG_NEWS_KEYWORDS]


def match_watchlist(text: str) -> list[tuple[str, str]]:
    """Return list of (group, keyword) matches found in text."""
    hits = []
    for group, kw, pat in _KW_PATTERNS:
        if pat.search(text):
            hits.append((group, kw))
    return hits


def is_big_news(text: str) -> bool:
    return any(pat.search(text) for pat in _BIG_PATTERNS)


# ---------------------------------------------------------------------------
# Source fetchers
# ---------------------------------------------------------------------------

def _http_get(url: str) -> requests.Response:
    return requests.get(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
                        timeout=HTTP_TIMEOUT)


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
        print(f"  ! {source['name']}: fetch error: {e}", file=sys.stderr)
        return []

    items = []
    for entry in parsed.entries:
        title = (entry.get("title") or "").strip()
        link = (entry.get("link") or "").strip()
        summary = (entry.get("summary") or entry.get("description") or "").strip()
        # strip HTML tags from summary
        summary = re.sub(r"<[^>]+>", "", summary).strip()
        published = entry.get("published") or entry.get("updated")
        items.append({
            "title": title,
            "link": link,
            "summary": summary[:400],
            "published": _parse_pubdate(published),
            "source": source["name"],
        })
    return items


def fetch_idx(source: dict) -> list[dict]:
    """IDX keterbukaan informasi endpoint returns JSON."""
    try:
        resp = _http_get(source["url"])
        payload = resp.json()
    except Exception as e:
        print(f"  ! {source['name']}: fetch error: {e}", file=sys.stderr)
        return []

    # Endpoint shape: {"Items": [{"Title", "AnnouncementUrl", "Code_Emiten", "PublishedDate"}]}
    raw_items = payload.get("Items") or payload.get("items") or []
    items = []
    for it in raw_items:
        title = (it.get("Title") or it.get("title") or "").strip()
        url = it.get("AnnouncementUrl") or it.get("Url") or ""
        if url and not url.startswith("http"):
            url = "https://www.idx.co.id" + url
        emiten = it.get("Code_Emiten") or it.get("Kode_Emiten") or ""
        published = it.get("PublishedDate") or it.get("publishedDate")
        # IDX dates are typically ISO already; normalize defensively
        try:
            pub_iso = datetime.fromisoformat(published.replace("Z", "+00:00")).isoformat()
        except Exception:
            pub_iso = datetime.now(timezone.utc).isoformat()
        items.append({
            "title": f"[{emiten}] {title}" if emiten else title,
            "link": url,
            "summary": f"IDX disclosure for {emiten}" if emiten else "IDX disclosure",
            "published": pub_iso,
            "source": source["name"],
            "is_disclosure": True,
        })
    return items


# ---------------------------------------------------------------------------
# Dedupe + scoring
# ---------------------------------------------------------------------------

def url_hash(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]


def load_seen() -> set[str]:
    if not SEEN_PATH.exists():
        return set()
    try:
        return set(json.loads(SEEN_PATH.read_text()))
    except Exception:
        return set()


def save_seen(seen: set[str]) -> None:
    trimmed = list(seen)[-config.SEEN_HISTORY_LIMIT:]
    SEEN_PATH.write_text(json.dumps(trimmed))


def load_feed() -> list[dict]:
    if not FEED_PATH.exists():
        return []
    try:
        data = json.loads(FEED_PATH.read_text())
        return data.get("items", []) if isinstance(data, dict) else data
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Push
# ---------------------------------------------------------------------------

def push_ntfy(title: str, body: str, link: str, priority: str = "high") -> None:
    if not NTFY_TOPIC:
        return
    url = f"{NTFY_SERVER.rstrip('/')}/{NTFY_TOPIC}"
    try:
        requests.post(
            url,
            data=body.encode("utf-8"),
            headers={
                "Title": title.encode("utf-8"),
                "Priority": priority,
                "Tags": "chart_with_upwards_trend",
                "Click": link,
            },
            timeout=10,
        )
    except Exception as e:
        print(f"  ! ntfy push failed: {e}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def main() -> int:
    print(f"[{datetime.now(timezone.utc).isoformat()}] fetching {len(config.SOURCES)} sources...")
    seen = load_seen()
    existing = load_feed()
    existing_links = {item["link"] for item in existing}

    raw_items: list[dict] = []
    for source in config.SOURCES:
        if source["type"] == "rss":
            fetched = fetch_rss(source)
        elif source["type"] == "idx":
            fetched = fetch_idx(source)
        else:
            continue
        print(f"  - {source['name']}: {len(fetched)} items")
        raw_items.extend(fetched)
        time.sleep(0.5)  # be polite

    # Filter to watchlist matches + dedupe
    new_matched: list[dict] = []
    for item in raw_items:
        link = item.get("link") or ""
        if not link:
            continue
        h = url_hash(link)
        if h in seen or link in existing_links:
            continue
        seen.add(h)

        text = f"{item['title']} {item.get('summary', '')}"
        hits = match_watchlist(text)
        if not hits:
            continue

        groups = sorted({g for g, _ in hits})
        keywords = sorted({k for _, k in hits})
        big = bool(item.get("is_disclosure")) or is_big_news(text)

        enriched = {
            **item,
            "groups": groups,
            "matched": keywords,
            "big": big,
            "id": h,
        }
        new_matched.append(enriched)

    # Sort new items newest-first
    new_matched.sort(key=lambda x: x["published"], reverse=True)

    # Push notifications for new big news
    pushed = 0
    for item in new_matched:
        if item["big"]:
            tag = " / ".join(item["groups"])
            push_ntfy(
                title=f"🚨 {tag}: {', '.join(item['matched'][:3])}",
                body=item["title"],
                link=item["link"],
            )
            pushed += 1

    # Merge with existing, trim
    merged = new_matched + existing
    merged.sort(key=lambda x: x["published"], reverse=True)
    merged = merged[: config.MAX_FEED_ITEMS]

    payload = {
        "updated": datetime.now(timezone.utc).isoformat(),
        "count": len(merged),
        "items": merged,
    }
    FEED_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    save_seen(seen)

    print(f"  matched: {len(new_matched)} new, {len(merged)} total, pushed: {pushed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
