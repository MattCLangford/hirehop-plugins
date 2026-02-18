(() => {
  const CFG = {
    // Choose which column to treat as your CoS unit:
    // "UNIT_PRICE" matches your requested formula (unit price * qty).
    // "COST_PRICE" is available if you later want actual cost column.
    cosUnitSource: "UNIT_PRICE", // "UNIT_PRICE" | "COST_PRICE"

    // If you want CoS to scale with HireHop “Multiplier” (Duration), set true.
    // If you want exactly "unit price * qty" only, set false.
    includeMultiplier: true,

    // Column widths (px)
    colWidth: 90,

    // Labels (used for titles/tooltips)
    labels: {
      cos: "CoS total",
      gp: "Line GP £",
      gpPct: "Line GP %"
    }
  };

  const STYLE_ID = "wise-itemtree-gp-columns-style";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* Allow horizontal scroll once we add columns */
      .items_tree_container{ overflow-x:auto !important; }

      /* Right-align our calculated columns */
      td.column_WISE_COS_TOTAL div,
      td.column_WISE_GP_GBP div,
      td.column_WISE_GP_PCT div{
        text-align:right !important;
        overflow:hidden;
        white-space:nowrap;
      }

      /* Percent column centre-align looks nicer */
      td.column_WISE_GP_PCT div{ text-align:center !important; }

      /* Slightly muted headings/empty values */
      .wise-empty{ opacity:0.55; }
    `;
    document.head.appendChild(style);
  }

  function parseMoney(text) {
    if (!text) return NaN;
    // Keep digits, minus, dot, comma
    const cleaned = String(text).replace(/[^\d\-,.]/g, "");
    if (!cleaned) return NaN;

    // Convert "2,400.00" -> "2400.00"
    // (assumes UK formatting with commas as thousands)
    const normalised = cleaned.replace(/,/g, "");
    const n = Number(normalised);
    return Number.isFinite(n) ? n : NaN;
  }

  function parseNumber(text) {
    if (!text) return NaN;
    const cleaned = String(text).replace(/[^\d\-.]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }

  function formatGBP(n) {
    if (!Number.isFinite(n)) return "";
    return n.toLocaleString("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatPct(n) {
    if (!Number.isFinite(n)) return "";
    return `${n.toFixed(1)}%`;
  }

  function getCellText(row, selector) {
    const el = row.querySelector(selector);
    return el ? el.textContent.trim() : "";
  }

  function getQty(row) {
    return parseNumber(getCellText(row, "td.qty_cell > div"));
  }

  function getMultiplier(row) {
    // Column exists even if display:none; text is usually "1" etc.
    const m = parseNumber(getCellText(row, "td.column_DURATION div"));
    return Number.isFinite(m) && m > 0 ? m : 1;
  }

  function getCosUnit(row) {
    if (CFG.cosUnitSource === "COST_PRICE") {
      return parseMoney(getCellText(row, "td.column_COST_PRICE div"));
    }
    // Default to UNIT_PRICE (your requested behaviour)
    return parseMoney(getCellText(row, "td.column_UNIT_PRICE div"));
  }

  function getLineTotal(row) {
    return parseMoney(getCellText(row, "td.column_TOTAL div"));
  }

  function ensureCalcCells(row) {
    // Insert before the TOTAL column so Total stays on the far right
    const totalTd = row.querySelector("td.column_TOTAL");
    if (!totalTd) return;

    if (row.querySelector("td.column_WISE_COS_TOTAL")) return; // already added

    const makeTd = (cls) => {
      const td = document.createElement("td");
      td.className = `item_cell ${cls} ltr`;
      td.style.width = `${CFG.colWidth}px`;
      td.style.display = "table-cell";
      td.title = "";
      const div = document.createElement("div");
      div.style.width = `${CFG.colWidth}px`;
      div.className = "wise-empty";
      div.textContent = "";
      td.appendChild(div);
      return td;
    };

    const tdCos = makeTd("column_WISE_COS_TOTAL");
    const tdGp  = makeTd("column_WISE_GP_GBP");
    const tdPct = makeTd("column_WISE_GP_PCT");

    // Insert in order: CoS, GP£, GP%
    row.insertBefore(tdCos, totalTd);
    row.insertBefore(tdGp, totalTd);
    row.insertBefore(tdPct, totalTd);
  }

  function setCell(row, cls, text, title) {
    const td = row.querySelector(`td.${cls}`);
    if (!td) return;
    const div = td.querySelector("div");
    if (!div) return;

    div.textContent = text || "";
    div.classList.toggle("wise-empty", !text);
    td.title = title || "";
  }

  function updateRow(row) {
    ensureCalcCells(row);

    // Only calculate for rows that look like item lines (i.e., have qty + unit + total)
    const qty = getQty(row);
    const unit = getCosUnit(row);
    const total = getLineTotal(row);
    const mult = CFG.includeMultiplier ? getMultiplier(row) : 1;

    const hasNumbers =
      Number.isFinite(qty) && Number.isFinite(unit) && Number.isFinite(total);

    if (!hasNumbers) {
      // headings / blank lines: leave empty
      setCell(row, "column_WISE_COS_TOTAL", "", "");
      setCell(row, "column_WISE_GP_GBP", "", "");
      setCell(row, "column_WISE_GP_PCT", "", "");
      return;
    }

    const cosTotal = unit * qty * mult;
    const gp = total - cosTotal;
    const gpPct = total !== 0 ? (gp / total) * 100 : NaN;

    setCell(
      row,
      "column_WISE_COS_TOTAL",
      formatGBP(cosTotal),
      `${CFG.labels.cos} = ${formatGBP(unit)} × ${qty}${CFG.includeMultiplier ? ` × ${mult}` : ""}`
    );

    setCell(
      row,
      "column_WISE_GP_GBP",
      formatGBP(gp),
      `${CFG.labels.gp} = ${formatGBP(total)} − ${formatGBP(cosTotal)}`
    );

    setCell(
      row,
      "column_WISE_GP_PCT",
      Number.isFinite(gpPct) ? formatPct(gpPct) : "",
      `${CFG.labels.gpPct} = (${formatGBP(gp)} ÷ ${formatGBP(total)}) × 100`
    );
  }

  function refreshAll() {
    ensureStyles();

    // Works for items_tree1, items_tree2, etc.
    const tree = document.querySelector(".items_tree_container .items_tree");
    if (!tree) return;

    // Every node row is a separate table; we update the one <tr> inside each.
    const rows = tree.querySelectorAll("table.cust_node > tbody > tr");
    rows.forEach(updateRow);
  }

  // Throttle refresh calls
  let raf = 0;
  function scheduleRefresh() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      refreshAll();
    });
  }

  // Initial + observe dynamic updates (expand/collapse, edits, etc.)
  function init() {
    refreshAll();

    const container = document.querySelector(".items_tree_container");
    if (!container) return;

    const obs = new MutationObserver(scheduleRefresh);
    obs.observe(container, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
