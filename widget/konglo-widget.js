// Konglo News iOS Widget — Scriptable
// ---------------------------------------------------------------------------
// SETUP:
//   1. Install Scriptable from the App Store.
//   2. Copy this file into Scriptable (new script named "Konglo News").
//   3. Long-press home screen → + → Scriptable → pick a size → "Konglo News".
//
// USAGE:
//   - Tap a headline    → opens the article in Safari
//   - Tap the KONGLO header or "more →" → opens a scrollable full list
//     of all matches (all groups, all 200 stored stories)
//   - Inside the full list, tap a row → opens the article
//   - Widget Parameter (long-press widget → Edit Widget → Parameter):
//        leave blank        → shows all groups, newest first
//        "Prajogo"          → filters to Prajogo / Barito only
//        "Bakrie"           → filters to Bakrie only
//        "Salim", "Astra", "Sinar Mas", "Djarum"  → same
//        "big"              → only big-news flagged items
// ---------------------------------------------------------------------------

const FEED_URL = "https://raw.githubusercontent.com/andisaladin04-spec/konglo-news/main/data/feed.json";
const SCRIPT_NAME = "Konglo News"; // must match the Scriptable script name
const MAX_ITEMS_MEDIUM = 5;
const MAX_ITEMS_LARGE = 10;
const MAX_ITEMS_SMALL = 3;
const FULL_LIST_LIMIT = 200;

// Colors
const BG_TOP = new Color("#0b1220");
const BG_BOTTOM = new Color("#1a2540");
const FG_PRIMARY = new Color("#ffffff");
const FG_SECONDARY = new Color("#9ab0d6");
const ACCENT_BIG = new Color("#ff6b6b");
const ACCENT_GROUP = new Color("#7dd3fc");
const ACCENT_LINK = new Color("#7dd3fc");

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
  const then = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.max(1, Math.floor((now - then) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function filterItems(items, param) {
  if (!param) return items;
  const p = param.toLowerCase().trim();
  if (p === "big") return items.filter(it => it.big);
  return items.filter(it =>
    (it.groups || []).some(g => g.toLowerCase().includes(p))
  );
}

function pickN(items, family) {
  if (family === "small") return items.slice(0, MAX_ITEMS_SMALL);
  if (family === "large") return items.slice(0, MAX_ITEMS_LARGE);
  return items.slice(0, MAX_ITEMS_MEDIUM);
}

// URL that re-launches this script in app, telling it to show the full list.
// `view=full` is parsed below in main() to decide what to render.
function fullListUrl(param) {
  const enc = encodeURIComponent(SCRIPT_NAME);
  const q = `view=full${param ? `&filter=${encodeURIComponent(param)}` : ""}`;
  return `scriptable:///run/${enc}?${q}`;
}

// ---------------------------------------------------------------------------
// Widget rendering (home screen)
// ---------------------------------------------------------------------------

function addHeader(widget, updatedIso, param, family) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  header.url = fullListUrl(param); // tap header → open full list

  const title = header.addText(param ? `KONGLO · ${param.toUpperCase()}` : "KONGLO");
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
  row.url = item.link; // tap row → open article

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
  footer.url = fullListUrl(param); // tap footer → open full list
  footer.addSpacer();
  const more = footer.addText(`+${totalCount - shownCount} more →`);
  more.font = Font.systemFont(9);
  more.textColor = ACCENT_LINK;
}

async function buildWidget(feed, param) {
  const w = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [BG_TOP, BG_BOTTOM];
  gradient.locations = [0, 1];
  w.backgroundGradient = gradient;
  w.setPadding(10, 12, 10, 12);

  // Whole-widget tap fallback: anything not covered by a stack URL opens full list.
  w.url = fullListUrl(param);

  const family = config.widgetFamily || "medium";
  addHeader(w, feed.updated, param, family);
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

  w.refreshAfterDate = new Date(Date.now() + 10 * 60 * 1000);
  return w;
}

// ---------------------------------------------------------------------------
// Full-list rendering (in-app, scrollable UITable)
// ---------------------------------------------------------------------------

function buildFullList(feed, param) {
  const table = new UITable();
  table.showSeparators = true;

  const filtered = filterItems(feed.items || [], param).slice(0, FULL_LIST_LIMIT);

  // Header row
  const header = new UITableRow();
  header.isHeader = true;
  header.backgroundColor = new Color("#0b1220");
  const headerTitle = param
    ? `KONGLO · ${param.toUpperCase()}  —  ${filtered.length} stories`
    : `KONGLO  —  ${filtered.length} stories`;
  const hcell = header.addText(headerTitle, `updated ${formatRelative(feed.updated)} ago`);
  hcell.titleColor = FG_PRIMARY;
  hcell.subtitleColor = FG_SECONDARY;
  hcell.titleFont = Font.boldSystemFont(15);
  hcell.subtitleFont = Font.systemFont(11);
  table.addRow(header);

  // Filter chips row (tap to re-open with a different filter)
  const chipFilters = ["", "big", "Prajogo", "Bakrie", "Salim", "Astra", "Sinar Mas", "Djarum"];
  for (const f of chipFilters) {
    const row = new UITableRow();
    row.height = 36;
    const label = f === "" ? "▸ All" : f === "big" ? "▸ Big news only" : `▸ ${f}`;
    const active = (param || "") === f;
    const cell = row.addText(active ? `● ${label.slice(2)}` : label);
    cell.titleColor = active ? ACCENT_LINK : FG_SECONDARY;
    cell.titleFont = active ? Font.boldSystemFont(13) : Font.systemFont(13);
    row.onSelect = () => {
      Safari.open(fullListUrl(f)); // re-launch script with new filter
    };
    row.dismissOnSelect = true;
    table.addRow(row);
  }

  // Spacer / separator
  const sep = new UITableRow();
  sep.height = 8;
  sep.backgroundColor = new Color("#1a2540");
  table.addRow(sep);

  // Story rows
  if (filtered.length === 0) {
    const empty = new UITableRow();
    empty.addText("No matches.", "Try a different filter.");
    table.addRow(empty);
  } else {
    filtered.forEach((item, idx) => {
      const row = new UITableRow();
      row.height = 78;
      row.cellSpacing = 6;

      const groups = (item.groups || []).join(" · ").toUpperCase();
      const flag = item.big ? "🔴 " : "";
      const subtitle = `${flag}${groups}   ·   ${item.source}   ·   ${formatRelative(item.published)} ago`;
      const cell = row.addText(item.title, subtitle);
      cell.titleColor = FG_PRIMARY;
      cell.subtitleColor = item.big ? ACCENT_BIG : FG_SECONDARY;
      cell.titleFont = Font.systemFont(14);
      cell.subtitleFont = Font.systemFont(10);
      cell.widthWeight = 90;

      row.onSelect = () => {
        Safari.open(item.link);
      };
      row.dismissOnSelect = false; // stay on the list after returning
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

  // Determine the active filter param:
  //   - from widget config (Parameter field set on the home-screen widget)
  //   - or from URL query (?filter=Prajogo) when opened by tapping the widget
  const urlFilter = (args.queryParameters && args.queryParameters.filter) || "";
  const widgetParam = (args.widgetParameter || "").trim();
  const param = urlFilter || widgetParam;

  // If launched via URL with view=full, OR run in-app (not as widget), show the list
  const wantsFullList =
    (args.queryParameters && args.queryParameters.view === "full") ||
    !config.runsInWidget;

  if (wantsFullList) {
    const table = buildFullList(feed, param);
    await table.present(true); // true = fullscreen
    Script.complete();
    return;
  }

  // Otherwise render the home-screen widget
  const widget = await buildWidget(feed, param);
  Script.setWidget(widget);
  Script.complete();
}

await main();
