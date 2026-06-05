// Geo + Big Indonesia + Global Finance News Widget — Scriptable
// ---------------------------------------------------------------------------
// SETUP:
//   1. In Scriptable, create a script named "Geo News". Paste this file.
//   2. Long-press home screen → + → Scriptable → pick size → "Geo News".
//
// TAPPING:
//   - Tap a headline              → opens article in Safari
//   - Tap GEO header / "+N more" → section picker sheet appears
//   - "↩ Change section" in list → back to picker
//
// WIDGET PARAMETER (skip picker, go direct):
//   "big"  |  "Macro"  |  "Gov"  |  "Geo"  |  "Commodity"  |  "Finance"
// ---------------------------------------------------------------------------

const FEED_URL = "https://raw.githubusercontent.com/andisaladin04-spec/konglo-news/main/data/geo-feed.json";
const SCRIPT_NAME = "Geo News";
const MAX_MEDIUM = 5;
const MAX_LARGE  = 10;
const MAX_SMALL  = 3;
const LIST_LIMIT = 150;

// Dark green palette — distinct from blue Konglo widget
const BG_TOP       = new Color("#0f1a10");
const BG_BOTTOM    = new Color("#1a2d1c");
const FG_PRIMARY   = new Color("#ffffff");
const FG_SECONDARY = new Color("#8fc99a");
const ACCENT_BIG   = new Color("#ff6b6b");
const ACCENT_GROUP = new Color("#a8e6b4");
const ACCENT_CHIP  = new Color("#a8e6b4");

const SECTIONS = [
  { label: "All topics",            param: ""          },
  { label: "🔴 Breaking only",      param: "big"       },
  { label: "📈 Finance & Markets",  param: "Finance"   },
  { label: "📊 Macro / Economy",    param: "Macro"     },
  { label: "🏛  Government / Policy",param: "Gov"       },
  { label: "🌏 Geopolitics",        param: "Geo"       },
  { label: "⛏  Commodity / Energy", param: "Commodity" },
];

// Topic filter: param → partial group name match
const TOPIC_MAP = {
  "Finance":   "finance",
  "Macro":     "macro",
  "Gov":       "government",
  "Geo":       "geopolit",
  "Commodity": "commodity",
};

// ---------------------------------------------------------------------------
// Data helpers
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
  const target = TOPIC_MAP[param] || p;
  return items.filter(it =>
    (it.groups || []).some(g => g.toLowerCase().includes(target))
  );
}

function pickN(items, family) {
  if (family === "small") return items.slice(0, MAX_SMALL);
  if (family === "large") return items.slice(0, MAX_LARGE);
  return items.slice(0, MAX_MEDIUM);
}

function scriptUrl(param) {
  const enc = encodeURIComponent(SCRIPT_NAME);
  return param
    ? `scriptable:///run/${enc}?view=full&filter=${encodeURIComponent(param)}`
    : `scriptable:///run/${enc}`;
}

// ---------------------------------------------------------------------------
// Section picker
// ---------------------------------------------------------------------------

async function pickSection(feed) {
  const alert = new Alert();
  alert.title   = "GEO · FINANCE";
  alert.message = "Choose a section";

  for (const s of SECTIONS) {
    const count = filterItems(feed.items || [], s.param).length;
    alert.addAction(`${s.label}  (${count})`);
  }
  alert.addCancelAction("Cancel");

  const idx = await alert.presentSheet();
  if (idx < 0) return null;
  return SECTIONS[idx].param;
}

// ---------------------------------------------------------------------------
// Full list (UITable)
// ---------------------------------------------------------------------------

async function showList(feed, param) {
  const items = filterItems(feed.items || [], param).slice(0, LIST_LIMIT);
  const sLabel = SECTIONS.find(s => s.param === (param || ""))?.label
    || param || "All topics";

  const table = new UITable();
  table.showSeparators = true;

  // Header
  {
    const row = new UITableRow();
    row.isHeader = true;
    row.backgroundColor = new Color("#0f1a10");
    const cell = row.addText(
      `GEO · ${sLabel.replace(/[^\w\s]/g,"").trim().toUpperCase()}`,
      `${items.length} stories  ·  updated ${formatRelative(feed.updated)} ago`
    );
    cell.titleColor    = FG_PRIMARY;
    cell.subtitleColor = FG_SECONDARY;
    cell.titleFont     = Font.boldSystemFont(14);
    cell.subtitleFont  = Font.systemFont(10);
    table.addRow(row);
  }

  // Change section button
  {
    const row = new UITableRow();
    row.height = 38;
    row.backgroundColor = new Color("#132015");
    const cell = row.addText("↩  Change section");
    cell.titleColor = ACCENT_CHIP;
    cell.titleFont  = Font.boldSystemFont(13);
    row.dismissOnSelect = true;
    table.addRow(row);
  }

  // Story rows
  if (items.length === 0) {
    const row = new UITableRow();
    row.addText("No stories yet.", "Check back after the next scrape.");
    table.addRow(row);
  } else {
    for (const item of items) {
      const row = new UITableRow();
      row.height = 76;

      const groups  = (item.groups || []).map(g =>
        g.replace("Government / Policy","Gov")
         .replace("Commodity / Energy Policy","Commodity")
         .replace("Financial Crisis Signals","Crisis")
         .replace("Macro / Economy","Macro")
         .replace("Geopolitics","Geo")
         .replace("Global Finance","Finance")
      ).join(" · ");

      const flag = item.big ? "🔴 " : "";
      const sub  = `${flag}${groups}  ·  ${item.source}  ·  ${formatRelative(item.published)} ago`;
      const cell = row.addText(item.title, sub);
      cell.titleColor    = FG_PRIMARY;
      cell.subtitleColor = item.big ? ACCENT_BIG : FG_SECONDARY;
      cell.titleFont     = Font.systemFont(14);
      cell.subtitleFont  = Font.systemFont(10);
      cell.widthWeight   = 90;
      row.onSelect       = () => { Safari.open(item.link); };
      row.dismissOnSelect = false;
      table.addRow(row);
    }
  }

  await table.present(true);
}

// ---------------------------------------------------------------------------
// Widget (homescreen)
// ---------------------------------------------------------------------------

function buildWidget(feed, param) {
  const family   = config.widgetFamily || "medium";
  const filtered = filterItems(feed.items || [], param);
  const shown    = pickN(filtered, family);

  const w    = new ListWidget();
  const grad = new LinearGradient();
  grad.colors    = [BG_TOP, BG_BOTTOM];
  grad.locations = [0, 1];
  w.backgroundGradient = grad;
  w.setPadding(10, 12, 10, 12);
  w.url = scriptUrl(param);

  // Header
  {
    const hdr = w.addStack();
    hdr.layoutHorizontally();
    hdr.centerAlignContent();
    const lbl = param ? `GEO · ${param.toUpperCase()}` : "GEO · FINANCE";
    const t = hdr.addText(lbl);
    t.font      = Font.boldSystemFont(11);
    t.textColor = FG_SECONDARY;
    hdr.addSpacer();
    const u = hdr.addText(`↻ ${formatRelative(feed.updated)}`);
    u.font      = Font.systemFont(9);
    u.textColor = FG_SECONDARY;
  }

  w.addSpacer(6);

  if (shown.length === 0) {
    const e = w.addText("No matches yet.");
    e.font      = Font.systemFont(11);
    e.textColor = FG_SECONDARY;
  } else {
    for (const item of shown) {
      const row = w.addStack();
      row.layoutVertically();
      row.spacing = 2;
      row.url = item.link;

      const tagRow = row.addStack();
      tagRow.layoutHorizontally();
      tagRow.centerAlignContent();
      tagRow.spacing = 4;

      if (item.big) {
        const dot = tagRow.addText("●");
        dot.font      = Font.boldSystemFont(9);
        dot.textColor = ACCENT_BIG;
      }

      const groups = (item.groups || []).map(g =>
        g.replace("Government / Policy","GOV")
         .replace("Commodity / Energy Policy","COMMOD")
         .replace("Financial Crisis Signals","CRISIS")
         .replace("Macro / Economy","MACRO")
         .replace("Geopolitics","GEO")
         .replace("Global Finance","FINANCE")
      ).join(" · ");

      if (groups) {
        const g = tagRow.addText(groups);
        g.font      = Font.boldSystemFont(8);
        g.textColor = ACCENT_GROUP;
        g.lineLimit = 1;
      }
      tagRow.addSpacer();
      const ts = tagRow.addText(formatRelative(item.published));
      ts.font      = Font.systemFont(8);
      ts.textColor = FG_SECONDARY;

      const hl = row.addText(item.title);
      hl.font      = family === "small" ? Font.systemFont(10) : Font.systemFont(11);
      hl.textColor = FG_PRIMARY;
      hl.lineLimit = family === "small" ? 2 : 3;
      w.addSpacer(4);
    }

    if (filtered.length > shown.length) {
      const footer = w.addStack();
      footer.layoutHorizontally();
      footer.url = scriptUrl(param);
      footer.addSpacer();
      const more = footer.addText(`+${filtered.length - shown.length} more →`);
      more.font      = Font.systemFont(9);
      more.textColor = ACCENT_CHIP;
    }
  }

  // Chip bar
  if (family !== "small") {
    w.addSpacer(5);
    const bar = w.addStack();
    bar.layoutHorizontally();
    bar.spacing = 5;

    const chips = family === "large"
      ? ["ALL","BIG","FINANCE","MACRO","GOV","GEO"]
      : ["ALL","BIG","FINANCE","MACRO"];

    const chipParams = {
      ALL:"", BIG:"big", FINANCE:"Finance", MACRO:"Macro",
      GOV:"Gov", GEO:"Geo", COMMOD:"Commodity"
    };
    const active = (param || "").toUpperCase() || "ALL";

    for (const c of chips) {
      const chip = bar.addStack();
      chip.layoutHorizontally();
      chip.centerAlignContent();
      chip.setPadding(3, 5, 3, 5);
      chip.cornerRadius = 7;
      chip.url = scriptUrl(chipParams[c] || "");
      const isActive = c === active;
      chip.backgroundColor = isActive ? ACCENT_CHIP : new Color("#ffffff", 0.09);
      const lbl = chip.addText(c);
      lbl.font      = Font.boldSystemFont(8);
      lbl.textColor = isActive ? new Color("#0f1a10") : FG_PRIMARY;
    }
    bar.addSpacer();
  }

  w.refreshAfterDate = new Date(Date.now() + 10 * 60 * 1000);
  return w;
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
      err.font = Font.systemFont(11); err.textColor = ACCENT_BIG;
      Script.setWidget(w);
    } else {
      const a = new Alert(); a.title = "Feed unreachable"; a.message = String(e);
      await a.present();
    }
    Script.complete(); return;
  }

  const widgetParam = (args.widgetParameter || "").trim();
  const urlParam    = (args.queryParameters && args.queryParameters.filter) || "";
  const presetParam = widgetParam || urlParam;

  if (config.runsInWidget) {
    Script.setWidget(buildWidget(feed, presetParam));
    Script.complete(); return;
  }

  let param = presetParam;
  while (true) {
    if (param === null) break;
    if (!param && !presetParam) {
      param = await pickSection(feed);
      if (param === null) break;
    }
    await showList(feed, param);
    if (presetParam) break;
    param = "";
  }

  Script.complete();
}

await main();
