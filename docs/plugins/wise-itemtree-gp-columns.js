(() => {
  const BUILD = "wise-gpcols-build-2026-02-18-01"; // change this each deploy to verify load
  console.log("[WISE GP COLS] loaded:", BUILD, "url:", location.href);

  const CFG = {
    cosUnitSource: "UNIT_PRICE",   // "UNIT_PRICE" | "COST_PRICE"
    includeMultiplier: true,
    colWidth: 90
  };

  const STYLE_ID = "wise-gpcols-style";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .items_tree_container{ overflow-x:auto !important; }
      td.column_WISE_COS_TOTAL div,
      td.column_WISE_GP_GBP div{ text-align:right !important; overflow:hidden; white-space:nowrap; }
      td.column_WISE_GP_PCT div{ text-align:center !important; overflow:hidden; white-space:nowrap; }
      .wise-empty{ opacity:0.55; }
    `;
    document.head.appendChild(style);
  }

  function parseMoney(text) {
    if (!text) return NaN;
    const cleaned = String(text).replace(/[^\d\-,.]/g, "");
    if (!cleaned) return NaN;
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
    return n.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 });
  }
  function formatPct(n) {
    if (!Number.isFinite(n)) return "";
    return `${n.toFixed(1)}%`;
  }
  function getText(row, sel) {
    const el = row.querySelector(sel);
    return el ? el.textContent.trim() : "";
  }

  function findTrees() {
    // Covers items_tree1, items_tree2, etc.
    return Array.from(document.querySelectorAll(".items_tree_container .items_tree[id^='items_tree']"));
  }

  function ensureCalcCells(row) {
    const totalTd = row.querySelector("td.column_TOTAL");
    if (!totalTd) return false;
    if (row.querySelector("td.column_WISE_COS_TOTAL")) return true;

    const makeTd = (cls) => {
      const td = document.createElement("td");
      td.className = `item_cell ${cls} ltr`;
      td.style.width = `${CFG.colWidth}px`;
      td.style.display = "table-cell";
      const div = document.createElement("div");
      div.style.width = `${CFG.colWidth}px`;
      div.className = "wise-empty";
      td.appendChild(div);
      return td;
    };

    // Insert before TOTAL so TOTAL remains on the far right
    row.insertBefore(makeTd("column_WISE_COS_TOTAL"), totalTd);
    row.insertBefore(makeTd("column_WISE_GP_GBP"), totalTd);
    row.insertBefore(makeTd("column_WISE_GP_PCT"), totalTd);
    return true;
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

  function getQty(row) {
    return parseNumber(getText(row, "td.qty_cell > div"));
  }
  function getMultiplier(row) {
    const m = parseNumber(getText(row, "td.column_DURATION div"));
    return Number.isFinite(m) && m > 0 ? m : 1;
  }
  function getCosUnit(row) {
    if (CFG.cosUnitSource === "COST_PRICE") return parseMoney(getText(row, "td.column_COST_PRICE div"));
    return parseMoney(getText(row, "td.column_UNIT_PRICE div"));
  }
  function getLineTotal(row) {
    return parseMoney(getText(row, "td.column_TOTAL div"));
  }

  function updateRow(row) {
    if (!ensureCalcCells(row)) return;

    const qty = getQty(row);
    const unit = getCosUnit(row);
    const total = getLineTotal(row);
    const mult = CFG.includeMultiplier ? getMultiplier(row) : 1;

    const ok = Number.isFinite(qty) && Number.isFinite(unit) && Number.isFinite(total);

    if (!ok) {
      setCell(row, "column_WISE_COS_TOTAL", "", "");
      setCell(row, "column_WISE_GP_GBP", "", "");
      setCell(row, "column_WISE_GP_PCT", "", "");
      return;
    }

    const cosTotal = unit * qty * mult;
    const gp = total - cosTotal;
    const gpPct = total !== 0 ? (gp / total) * 100 : NaN;

    setCell(row, "column_WISE_COS_TOTAL", formatGBP(cosTotal), `CoS = ${formatGBP(unit)} × ${qty}${CFG.includeMultiplier ? ` × ${mult}` : ""}`);
    setCell(row, "column_WISE_GP_GBP", formatGBP(gp), `GP£ = ${formatGBP(total)} − ${formatGBP(cosTotal)}`);
    setCell(row, "column_WISE_GP_PCT", Number.isFinite(gpPct) ? formatPct(gpPct) : "", `GP% = (GP£ ÷ Total) × 100`);
  }

  function refreshAll() {
    ensureStyles();
    const trees = findTrees();
    if (!trees.length) return { trees: 0, rows: 0 };

    let rows = 0;
    trees.forEach(tree => {
      const r = tree.querySelectorAll("table.cust_node > tbody > tr");
      rows += r.length;
      r.forEach(updateRow);
    });

    return { trees: trees.length, rows };
  }

  // Expose a manual hook for debugging
  window.wiseGpCols = {
    build: BUILD,
    refresh: () => {
      const res = refreshAll();
      console.log("[WISE GP COLS] refresh:", res);
      return res;
    }
  };

  // Schedule refresh (throttled)
  let raf = 0;
  function scheduleRefresh() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      refreshAll();
    });
  }

  function init() {
    // Retry loop: HireHop often renders the tree after navigation/async
    let tries = 0;
    const maxTries = 60; // ~30s at 500ms
    const timer = setInterval(() => {
      tries += 1;
      const res = refreshAll();
      if (res.trees > 0 || tries >= maxTries) clearInterval(timer);
    }, 500);

    // Mutation observer for dynamic expand/collapse and edits
    const obs = new MutationObserver(scheduleRefresh);
    obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

    // SPA navigation hooks
    window.addEventListener("hashchange", scheduleRefresh);
    window.addEventListener("popstate", scheduleRefresh);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
