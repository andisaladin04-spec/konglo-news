// Geo + Big Indonesia News Widget — Scriptable
// ---------------------------------------------------------------------------
// SETUP:
//   1. In Scriptable, create a new script named "Geo News".
//   2. Paste this entire file into it.
//   3. Long-press home screen → + → Scriptable → pick size → "Geo News".
//
// USAGE:
//   - Tap a headline         → opens the article in Safari
//   - Tap the GEO header     → opens full scrollable list
//   - Chip bar at bottom     → instant jump to a topic section:
//       ALL · BIG · Macro · Gov · Geo · Commodity
//   - Widget Parameter (long-press → Edit Widget → Parameter):
//       leave blank     → all topics
//       "big"           → breaking alerts only
//       "Macro"         → macro/economy stories
//       "Gov"           → government/policy
//       "Geo"           → geopolitics
//       "Commodity"     → energy/commodity policy
// ---------------------------------------------------------------------------

const FEED_URL = "https://raw.githubusercontent.com/andisaladin04-spec/konglo-news/main/data/geo-feed.json";
const SCRIPT_NAME = "Geo News";

const MAX_MEDIUM = 5;
const MAX_LARGE = 10;
const MAX_SMALL = 3;
const FULL_LIST_LIMIT = 150;

// Colors — slightly different palette from konglo widget so you can tell them apart at a glance
const BG_TOP      = new Color("#0f1a10");   // dark green-black
const BG_BOTTOM   = new Color("#1a2d1c");   // deep forest
const FG_PRIMARY  = new Color("#ffffff");
const FG_SECONDARY= new Color("#8fc99a");   // muted green
const ACCENT_BIG  = new Color("#ff6b6b");   // red dot for breaking
const ACCENT_GROUP= new Color("#a8e6b4");   // light green for topic tag
const ACCENT_LINK = new Color("#a8e6b4");

// Topic filter mapping: chip label → partial group name match
const TOPIC_MAP = {
  "Macro":     "Macro",
  "Gov":       "Government",
  "Geo":       "Geopolit",
  "Commodity": "Commodity",
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function fetchFeed() {
  const req = new Request(FEED_URL);
  req.headers = { "Cache-Control": "no-cache" };
  req.timeoutInterval = 15;
  return await req.loadJSON();
}

function formatRelative(iso) {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function filterItems(items, param) {
  if (!param) return items;
  const p = param.toLowerCase().trim();
  if (p === "big") return items.filter(it => it.big);
  // Try exact topic filter first
  const topicTarget = Object.entries(TOPIC_MAP).find(([k]) => k.toLowerCase() === p);
  if (topicTarget) {
    const target = topicTarget[1].toLowerCase();
    return items.filter(it =>
      (it.groups || []).some(g => g.toLowerCase().includes(target))
    );
  }
  // Fallback: substring match on group names
  return items.filter(it =>
    (it.groups || []).some(g => g.toLowerCase().includes(p))
  );
}

function pickN(items, family) {
  if (family === "small") return items.slice(0, MAX_SMALL);
  if (family === "large") return items.slice(0, MAX_LARGE);
  return items.slice(0, MAX_MEDIUM);
}

function fullListUrl(param) {
  const enc = encodeURIComponent(SCRIPT_NAME);
  const q = `view=full${param ? `&filter=${encodeURIComponent(param)}` : ""}`;
  return `scriptable:///run/${enc}?${q}`;
}

// ---------------------------------------------------------------------------
// Widget rendering
// ---------------------------------------------------------------------------

function addHeader(widget, updatedIso, param) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  header.url = fullListUrl(param);

  const label = param ? `GEO · ${param.toUpperCase()}` : "GEO";
  const title = header.addText(label);
  title.font = Font.boldSystemFont(11);
  title.textColor = FG_SECONDARY;

  header.addSpacer();

  if (updatedIso) {
    const upd = header.addText(`↻ ${formatRelative(updatedIso)}`);
    upd.font = Font.systemFont(9);
    upd.textColor = FG_SECONDARY;
  }
}

function addItem(widget, item, family) {
  const row = widget.addStack();
  row.layoutVertically();
  row.spacing = 2;
  row.url = item.link;

  const tagRow = row.addStack();
  tagRow.layoutHorizontally();
  tagRow.centerAlignContent();
  tagRow.spacing = 4;

  if (item.big) {
    const dot = tagRow.addText("●");
    dot.font = Font.boldSystemFont(9);
    dot.textColor = ACCENT_BIG;
  }

  const groups = (item.groups || []).map(g => {
    // Shorten long group names for the widget
    return g.replace("Government / Policy", "Gov").replace("Commodity / Energy Policy", "Commodity")
            .replace("Financial Crisis Signals", "Crisis").replace("Macro / Economy", "Macro")
            .replace("Geopolitics", "Geo");
  }).join(" · ");

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

  const headline = row.addText(item.title);
  headline.font = family === "small" ? Font.systemFont(10) : Font.systemFont(11);
  headline.textColor = FG_PRIMARY;
  headline.lineLimit = family === "small" ? 2 : 3;

  widget.addSpacer(4);
}

function addMoreFooter(widget, totalCount, shownCount, param) {
  if (totalCount <= shownCount) return;
  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.url = fullListUrl(param);
  footer.addSpacer();
  const more = footer.addText(`+${totalCount - shownCount} more →`);
  more.font = Font.systemFont(9);
  more.textColor = ACCENT_LINK;
}

function addChips(widget, family, activeParam) {
  if (family === "small") return;

  const chipsMedium = ["all", "big", "Macro", "Gov"];
  const chipsLarge = ["all", "big", "Macro", "Gov", "Geo", "Commodity"];
  const chips = family === "large" ? chipsLarge : chipsMedium;

  widget.addSpacer(4);
  const row = widget.addStack();
  row.layoutHorizontally();
  row.spacing = 6;
  row.centerAlignContent();

  for (const c of chips) {
    const chip = row.addStack();
    chip.layoutHorizontally();
    chip.centerAlignContent();
    chip.setPadding(3, 7, 3, 7);
    chip.cornerRadius = 8;
    chip.url = fullListUrl(c === "all" ? "" : c);
    const isActive =
      (c === "all" && !activeParam) ||
      (activeParam && activeParam.toLowerCase() === c.toLowerCase());
    chip.backgroundColor = isActive ? ACCENT_LINK : new Color("#ffffff", 0.08);

    const label = chip.addText(c.toUpperCase());
    label.font = Font.boldSystemFont(9);
    label.textColor = isActive ? new Color("#0f1a10") : FG_PRIMARY;
  }

  row.addSpacer();
}

async function buildWidget(feed, param) {
  const w = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [BG_TOP, BG_BOTTOM];
  gradient.locations = [0, 1];
  w.backgroundGradient = gradient;
  w.setPadding(10, 12, 10, 12);
  w.url = fullListUrl(param);

  const family = config.widgetFamily || "medium";
  addHeader(w, feed.updated, param);
  w.addSpacer(6);

  const filtered = filterItems(feed.items || [], param);
  const shown = pickN(filtered, family);

  if (shown.length === 0) {
    const empty = w.addText(param ? `No matches for "${param}"` : "No matches yet.");
    empty.font = Font.systemFont(11);
    empty.textColor = FG_SECONDARY;
  } else {
    for (const item of shown) addItem(w, item, family);
    addMoreFooter(w, filtered.length, shown.length, param);
  }

  addChips(w, family, param);

  w.refreshAfterDate = new Date(Date.now() + 10 * 60 * 1000);
  return w;
}

// ---------------------------------------------------------------------------
// Full-list (in-app, scrollable)
// ---------------------------------------------------------------------------

function buildFullList(feed, param) {
  const table = new UITable();
  table.showSeparators = true;

  const filtered = filterItems(feed.items || [], param).slice(0, FULL_LIST_LIMIT);

  // Header
  const header = new UITableRow();
  header.isHeader = true;
  header.backgroundColor = new Color("#0f1a10");
  const title = param ? `GEO · ${param.toUpperCase()}  —  ${filtered.length} stories` : `GEO  —  ${filtered.length} stories`;
  const hcell = header.addText(title, `updated ${formatRelative(feed.updated)} ago`);
  hcell.titleColor = FG_PRIMARY;
  hcell.subtitleColor = FG_SECONDARY;
  hcell.titleFont = Font.boldSystemFont(15);
  hcell.subtitleFont = Font.systemFont(11);
  table.addRow(header);

  // Filter chips
  const filterOptions = [
    ["", "▸ All"],
    ["big", "▸ 🔴 Breaking only"],
    ["Macro", "▸ Macro / Economy"],
    ["Gov", "▸ Government / Policy"],
    ["Geo", "▸ Geopolitics"],
    ["Commodity", "▸ Commodity / Energy"],
  ];

  for (const [f, label] of filterOptions) {
    const row = new UITableRow();
    row.height = 36;
    const active = (param || "") === f;
    const cell = row.addText(active ? `● ${label.slice(2)}` : label);
    cell.titleColor = active ? ACCENT_LINK : FG_SECONDARY;
    cell.titleFont = active ? Font.boldSystemFont(13) : Font.systemFont(13);
    row.onSelect = () => { Safari.open(fullListUrl(f)); };
    row.dismissOnSelect = true;
    table.addRow(row);
  }

  // Divider
  const sep = new UITableRow();
  sep.height = 8;
  sep.backgroundColor = new Color("#1a2d1c");
  table.addRow(sep);

  // Stories
  if (filtered.length === 0) {
    const empty = new UITableRow();
    empty.addText("No matches.", "Try a different filter.");
    table.addRow(empty);
  } else {
    filtered.forEach(item => {
      const row = new UITableRow();
      row.height = 78;
      row.cellSpacing = 6;
      const groups = (item.groups || []).join(" · ");
      const flag = item.big ? "🔴 " : "";
      const subtitle = `${flag}${groups}   ·   ${item.source}   ·   ${formatRelative(item.published)} ago`;
      const cell = row.addText(item.title, subtitle);
      cell.titleColor = FG_PRIMARY;
      cell.subtitleColor = item.big ? ACCENT_BIG : FG_SECONDARY;
      cell.titleFont = Font.systemFont(14);
      cell.subtitleFont = Font.systemFont(10);
      cell.widthWeight = 90;
      row.onSelect = () => { Safari.open(item.link); };
      row.dismissOnSelect = false;
      table.addRow(row);
    });
  }

  return table;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  let feed;
  try {
    feed = await fetchFeed();
  } catch (e) {
    if (config.runsInWidget) {
      const w = new ListWidget();
      w.backgroundColor = BG_TOP;
      const err = w.addText("Feed unreachable");
      err.font = Font.systemFont(11);
      err.textColor = ACCENT_BIG;
      Script.setWidget(w);
    } else {
      const a = new Alert();
      a.title = "Feed unreachable";
      a.message = String(e);
      await a.present();
    }
    return;
  }

  const urlFilter = (args.queryParameters && args.queryParameters.filter) || "";
  const widgetParam = (args.widgetParameter || "").trim();
  const param = urlFilter || widgetParam;

  const wantsFullList =
    (args.queryParameters && args.queryParameters.view === "full") ||
    !config.runsInWidget;

  if (wantsFullList) {
    const table = buildFullList(feed, param);
    await table.present(true);
    Script.complete();
    return;
  }

  const widget = await buildWidget(feed, param);
  Script.setWidget(widget);
  Script.complete();
}

await main();
