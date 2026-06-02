// Konglo News iOS Widget — Scriptable
// ---------------------------------------------------------------------------
// SETUP:
//   1. Install Scriptable from the App Store.
//   2. Copy this file into Scriptable (paste into a new script named "Konglo News").
//   3. Edit FEED_URL below to point at your published feed.json.
//      If using GitHub Pages: https://<username>.github.io/<repo>/data/feed.json
//      If using raw GitHub:   https://raw.githubusercontent.com/<user>/<repo>/main/data/feed.json
//   4. Long-press home screen → + → Scriptable → choose widget size → pick "Konglo News".
// ---------------------------------------------------------------------------

const FEED_URL = "https://raw.githubusercontent.com/andisaladin04-spec/konglo-news/main/data/feed.json";
const MAX_ITEMS_MEDIUM = 5;
const MAX_ITEMS_LARGE = 10;
const MAX_ITEMS_SMALL = 3;

// Colors
const BG_TOP = new Color("#0b1220");
const BG_BOTTOM = new Color("#1a2540");
const FG_PRIMARY = new Color("#ffffff");
const FG_SECONDARY = new Color("#9ab0d6");
const ACCENT_BIG = new Color("#ff6b6b");
const ACCENT_GROUP = new Color("#7dd3fc");

async function fetchFeed() {
  const req = new Request(FEED_URL);
  req.headers = { "Cache-Control": "no-cache" };
  req.timeoutInterval = 15;
  return await req.loadJSON();
}

function formatRelative(iso) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.max(1, Math.floor((now - then) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function pickN(items, widgetFamily) {
  if (widgetFamily === "small") return items.slice(0, MAX_ITEMS_SMALL);
  if (widgetFamily === "large") return items.slice(0, MAX_ITEMS_LARGE);
  return items.slice(0, MAX_ITEMS_MEDIUM);
}

function addHeader(widget, updatedIso) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const title = header.addText("KONGLO");
  title.font = Font.boldSystemFont(11);
  title.textColor = FG_SECONDARY;

  header.addSpacer();

  const upd = header.addText(updatedIso ? `↻ ${formatRelative(updatedIso)}` : "");
  upd.font = Font.systemFont(9);
  upd.textColor = FG_SECONDARY;
}

function addItem(widget, item, family) {
  const row = widget.addStack();
  row.layoutVertically();
  row.spacing = 2;
  row.url = item.link;

  // tag line: groups + big-news flag + relative time
  const tagRow = row.addStack();
  tagRow.layoutHorizontally();
  tagRow.centerAlignContent();
  tagRow.spacing = 4;

  if (item.big) {
    const bang = tagRow.addText("●");
    bang.font = Font.boldSystemFont(9);
    bang.textColor = ACCENT_BIG;
  }

  const groups = (item.groups || []).join(" · ");
  if (groups) {
    const g = tagRow.addText(groups.toUpperCase());
    g.font = Font.boldSystemFont(8);
    g.textColor = ACCENT_GROUP;
    g.lineLimit = 1;
  }

  tagRow.addSpacer();

  const t = tagRow.addText(formatRelative(item.published));
  t.font = Font.systemFont(8);
  t.textColor = FG_SECONDARY;

  // headline
  const headline = row.addText(item.title);
  headline.font = family === "small" ? Font.systemFont(10) : Font.systemFont(11);
  headline.textColor = FG_PRIMARY;
  headline.lineLimit = family === "small" ? 2 : 3;

  widget.addSpacer(4);
}

async function buildWidget() {
  const w = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [BG_TOP, BG_BOTTOM];
  gradient.locations = [0, 1];
  w.backgroundGradient = gradient;
  w.setPadding(10, 12, 10, 12);

  let feed;
  try {
    feed = await fetchFeed();
  } catch (e) {
    const err = w.addText("Feed unreachable");
    err.font = Font.systemFont(11);
    err.textColor = ACCENT_BIG;
    const detail = w.addText(String(e).slice(0, 120));
    detail.font = Font.systemFont(9);
    detail.textColor = FG_SECONDARY;
    return w;
  }

  const family = config.widgetFamily || "medium";
  addHeader(w, feed.updated);
  w.addSpacer(6);

  const items = pickN(feed.items || [], family);
  if (items.length === 0) {
    const empty = w.addText("No matches yet.");
    empty.font = Font.systemFont(11);
    empty.textColor = FG_SECONDARY;
  } else {
    for (const item of items) addItem(w, item, family);
  }

  // refresh hint
  w.refreshAfterDate = new Date(Date.now() + 10 * 60 * 1000);
  return w;
}

const widget = await buildWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
