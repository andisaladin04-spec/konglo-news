// Konglo News iOS Widget — Scriptable
// ---------------------------------------------------------------------------
// SETUP:
//   1. In Scriptable, create (or replace) a script named "Konglo News".
//   2. Paste this entire file.
//   3. Long-press home screen → + → Scriptable → pick size → "Konglo News".
//
// TAPPING:
//   - Tap any headline on the widget  → opens that article in Safari
//   - Tap the KONGLO header, "+N more", or any empty area
//       → section picker sheet appears, choose a section → filtered list
//   - Inside the full list, tap a story → opens article
//   - "↩ Change section" button at top of list → back to section picker
//
// WIDGET PARAMETER (skip the picker, go directly to one section):
//   Long-press widget → Edit Widget → Parameter field:
//   "big"  |  "Prajogo"  |  "Bakrie"  |  "Salim"  |  "Astra"  |  "Sinar Mas"  |  "Djarum"
// ---------------------------------------------------------------------------

const FEED_URL = "https://raw.githubusercontent.com/andisaladin04-spec/konglo-news/main/data/feed.json";
const SCRIPT_NAME = "Konglo News";
const MAX_MEDIUM = 5;
const MAX_LARGE  = 10;
const MAX_SMALL  = 3;
const LIST_LIMIT = 200;

// Colors
const BG_TOP       = new Color("#0b1220");
const BG_BOTTOM    = new Color("#1a2540");
const FG_PRIMARY   = new Color("#ffffff");
const FG_SECONDARY = new Color("#9ab0d6");
const ACCENT_BIG   = new Color("#ff6b6b");
const ACCENT_GROUP = new Color("#7dd3fc");
const ACCENT_CHIP  = new Color("#7dd3fc");

const SECTIONS = [
  { label: "All groups",       param: ""          },
  { label: "🔴 Big news only", param: "big"       },
  { label: "Prajogo / Barito", param: "Prajogo"   },
  { label: "Bakrie",           param: "Bakrie"    },
  { label: "Salim",            param: "Salim"     },
  { label: "Astra",            param: "Astra"     },
  { label: "Sinar Mas",        param: "Sinar Mas" },
  { label: "Djarum",           param: "Djarum"    },
];

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
  return items.filter(it =>
    (it.groups || []).some(g => g.toLowerCase().includes(p))
  );
}

function pickN(items, family) {
  if (family === "small")  return items.slice(0, MAX_SMALL);
  if (family === "large")  return items.slice(0, MAX_LARGE);
  return items.slice(0, MAX_MEDIUM);
}

// Open-script URL — used for widget-tap and headline taps
function scriptUrl(param) {
  const enc = encodeURIComponent(SCRIPT_NAME);
  return param
    ? `scriptable:///run/${enc}?view=full&filter=${encodeURIComponent(param)}`
    : `scriptable:///run/${enc}`;
}

// ---------------------------------------------------------------------------
// Section picker (Alert sheet)
// Returns the chosen param string, or null if cancelled.
// ---------------------------------------------------------------------------

async function pickSection(feed) {
  const alert = new Alert();
  alert.title = "KONGLO";
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
// Full scrollable list (UITable)
// Returns true if caller should show the section picker again.
// ---------------------------------------------------------------------------

async function showList(feed, param) {
  const items = filterItems(feed.items || [], param).slice(0, LIST_LIMIT);
  const sectionLabel = SECTIONS.find(s => s.param === (param || ""))?.label || param;

  const table = new UITable();
  table.showSeparators = true;

  // — Header row —
  {
    const row = new UITableRow();
    row.isHeader = true;
    row.backgroundColor = new Color("#0b1220");
    const title = `KONGLO · ${sectionLabel.toUpperCase()}`;
    const sub   = `${items.length} stories  ·  updated ${formatRelative(feed.updated)} ago`;
    const cell = row.addText(title, sub);
    cell.titleColor    = FG_PRIMARY;
    cell.subtitleColor = FG_SECONDARY;
    cell.titleFont    = Font.boldSystemFont(14);
    cell.subtitleFont = Font.systemFont(10);
    table.addRow(row);
  }

  // — "Change section" button —
  {
    const row = new UITableRow();
    row.height = 38;
    row.backgroundColor = new Color("#111d35");
    const cell = row.addText("↩  Change section");
    cell.titleColor = ACCENT_CHIP;
    cell.titleFont  = Font.boldSystemFont(13);
    // Dismiss the table; caller will show picker again
    row.onSelect = () => { table.dismiss && table.dismiss(); };
    row.dismissOnSelect = true;
    table.addRow(row);
  }

  // — Story rows —
  if (items.length === 0) {
    const row = new UITableRow();
    row.addText("No stories yet.", "Check back after the next scrape.");
    table.addRow(row);
  } else {
    for (const item of items) {
      const row = new UITableRow();
      row.height = 76;
      row.cellSpacing = 6;

      const groups  = (item.groups || []).join(" · ");
      const flag    = item.big ? "🔴 " : "";
      const sub     = `${flag}${groups}  ·  ${item.source}  ·  ${formatRelative(item.published)} ago`;
      const cell    = row.addText(item.title, sub);
      cell.titleColor    = FG_PRIMARY;
      cell.subtitleColor = item.big ? ACCENT_BIG : FG_SECONDARY;
      cell.titleFont     = Font.systemFont(14);
      cell.subtitleFont  = Font.systemFont(10);
      cell.widthWeight   = 90;

      row.onSelect      = () => { Safari.open(item.link); };
      row.dismissOnSelect = false;
      table.addRow(row);
    }
  }

  await table.present(true);
}

// ---------------------------------------------------------------------------
// Widget rendering (homescreen)
// ---------------------------------------------------------------------------

function buildWidget(feed, param) {
  const family = config.widgetFamily || "medium";
  const filtered = filterItems(feed.items || [], param);
  const shown    = pickN(filtered, family);

  const w = new ListWidget();
  const grad = new LinearGradient();
  grad.colors    = [BG_TOP, BG_BOTTOM];
  grad.locations = [0, 1];
  w.backgroundGradient = grad;
  w.setPadding(10, 12, 10, 12);
  // Single tap URL: opens script → triggers section picker (or direct if param set)
  w.url = scriptUrl(param);

  // — Header —
  {
    const hdr = w.addStack();
    hdr.layoutHorizontally();
    hdr.centerAlignContent();

    const title = hdr.addText(param ? `KONGLO · ${param.toUpperCase()}` : "KONGLO");
    title.font      = Font.boldSystemFont(11);
    title.textColor = FG_SECONDARY;
    hdr.addSpacer();
    const upd = hdr.addText(`↻ ${formatRelative(feed.updated)}`);
    upd.font      = Font.systemFont(9);
    upd.textColor = FG_SECONDARY;
  }

  w.addSpacer(6);

  // — Headlines —
  if (shown.length === 0) {
    const empty = w.addText("No matches yet.");
    empty.font      = Font.systemFont(11);
    empty.textColor = FG_SECONDARY;
  } else {
    for (const item of shown) {
      const row = w.addStack();
      row.layoutVertically();
      row.spacing = 2;
      row.url = item.link;   // individual headline → article

      const tagRow = row.addStack();
      tagRow.layoutHorizontally();
      tagRow.centerAlignContent();
      tagRow.spacing = 4;

      if (item.big) {
        const dot = tagRow.addText("●");
        dot.font      = Font.boldSystemFont(9);
        dot.textColor = ACCENT_BIG;
      }

      const groups = (item.groups || []).join(" · ");
      if (groups) {
        const g = tagRow.addText(groups.toUpperCase());
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

    // "more" footer
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

  // — Chip bar (decorative labels + individual tap URLs) —
  // Note: on iOS, child stack URLs are unreliable — widget.url is the primary tap.
  // These chips ARE tappable on some iOS versions; on others only the section picker works.
  if (family !== "small") {
    w.addSpacer(5);
    const bar = w.addStack();
    bar.layoutHorizontally();
    bar.spacing = 5;

    const chips = family === "large"
      ? ["ALL","BIG","PRAJOGO","BAKRIE","SALIM","ASTRA"]
      : ["ALL","BIG","PRAJOGO"];

    const chipParams = { ALL:"", BIG:"big", PRAJOGO:"Prajogo", BAKRIE:"Bakrie", SALIM:"Salim", ASTRA:"Astra" };
    const active = (param || "").toUpperCase() || "ALL";

    for (const c of chips) {
      const chip = bar.addStack();
      chip.layoutHorizontally();
      chip.centerAlignContent();
      chip.setPadding(3, 6, 3, 6);
      chip.cornerRadius = 7;
      chip.url = scriptUrl(chipParams[c]);
      const isActive = c === active;
      chip.backgroundColor = isActive ? ACCENT_CHIP : new Color("#ffffff", 0.09);
      const lbl = chip.addText(c);
      lbl.font      = Font.boldSystemFont(8);
      lbl.textColor = isActive ? new Color("#0b1220") : FG_PRIMARY;
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
  // Fetch feed
  let feed;
  try {
    feed = await fetchFeed();
  } catch (e) {
    if (config.runsInWidget) {
      const w = new ListWidget();
      w.backgroundColor = BG_TOP;
      const err = w.addText("Feed unreachable");
      err.font      = Font.systemFont(11);
      err.textColor = ACCENT_BIG;
      Script.setWidget(w);
    } else {
      const a = new Alert();
      a.title   = "Feed unreachable";
      a.message = String(e);
      await a.present();
    }
    Script.complete();
    return;
  }

  // Determine filter: widget parameter takes priority
  const widgetParam = (args.widgetParameter || "").trim();
  // URL query params (works on some iOS versions when chip URL is tapped)
  const urlParam = (args.queryParameters && args.queryParameters.filter) || "";
  const presetParam = widgetParam || urlParam;

  if (config.runsInWidget) {
    // Render homescreen widget
    Script.setWidget(buildWidget(feed, presetParam));
    Script.complete();
    return;
  }

  // Running in-app (widget was tapped or script opened manually)
  // If we have a preset param (widget parameter or reliable URL param) go direct.
  // Otherwise show the section picker sheet.
  let param = presetParam;

  while (true) {
    if (param === null) break;          // user cancelled picker

    if (!param && !presetParam) {
      // No preset — show section picker
      param = await pickSection(feed);
      if (param === null) break;        // cancelled
    }

    await showList(feed, param);

    // After list is dismissed: if we had a preset we're done,
    // otherwise loop back to picker so "↩ Change section" works.
    if (presetParam) break;
    param = "";  // will trigger picker on next loop
  }

  Script.complete();
}

await main();
