(function () {
  "use strict";

  // ============================================================
  // Wise HireHop Project Edit
  // - Re-layout into 3 sections (Salesforce / People / HireHop)
  // - Apply Wise styling (nightfall + heritage accent)
  // - Hide unused fields (delivery address, phones, etc.)
  // ============================================================
  var WISE_PLUGIN_VERSION = "v5-layout-theme";

  // Prevent double-init
  if (window.__WISE_PROJECT_EDIT_V5_INIT__) return;
  window.__WISE_PROJECT_EDIT_V5_INIT__ = true;

  try {
    console.warn("[WiseHireHop] project edit plugin loaded", WISE_PLUGIN_VERSION, location.href);
  } catch (e) {}

  // Only relevant on project page
  if (location.pathname !== "/project.php") return;

  // Boot: wait for jQuery + edit_dialog
  var bootTries = 0;
  (function boot() {
    bootTries++;

    var hasJQ = !!window.jQuery && !!window.jQuery.fn;
    var hasDlg = !!document.getElementById("edit_dialog");

    if (hasJQ && hasDlg) {
      init();
      return;
    }

    if (bootTries < 200) setTimeout(boot, 50);
  })();

  // ------------------------------------------------------------
  // Init
  // ------------------------------------------------------------
  function init() {
    var $ = window.jQuery;

    injectCSS(getWiseCSS());

    // Apply each time dialog opens (content is often re-rendered)
    $(document).on("dialogopen.wiseProjEditV5", "#edit_dialog", function () {
      scheduleApply("dialogopen");
      setTimeout(function () { scheduleApply("dialogopen+150"); }, 150);
      setTimeout(function () { scheduleApply("dialogopen+450"); }, 450);
    });

    // Observe rerenders inside dialog
    attachObserver();

    // In case it's already open
    scheduleApply("init");
  }

  // ------------------------------------------------------------
  // Apply (debounced)
  // ------------------------------------------------------------
  var _applyTimer = null;
  function scheduleApply(reason) {
    if (_applyTimer) return;
    _applyTimer = setTimeout(function () {
      _applyTimer = null;
      apply(reason);
    }, 50);
  }

  function apply(reason) {
    var $ = window.jQuery;
    if (!$) return;

    var $dlg = $("#edit_dialog");
    if (!$dlg.length) return;

    var $wrapper = $dlg.closest(".ui-dialog");
    var visible = $dlg.is(":visible") || $wrapper.is(":visible");
    if (!visible) return;

    // Mark / scope styling to this dialog only
    if (!$wrapper.hasClass("wise-projedit-dialog")) $wrapper.addClass("wise-projedit-dialog");
    if (!$dlg.hasClass("wise-projedit")) $dlg.addClass("wise-projedit");

    // Try to use the HireHop widget instance (more reliable element refs)
    var inst =
      $dlg.data("custom-project_edit") ||
      $dlg.data("customProject_edit") ||
      null;

    // Build layout if not present (or if HireHop rebuilt the form)
    var $form = $dlg.find("form").first();
    if ($form.length && !$form.find(".wise-projedit-shell").length) {
      buildLayout($dlg, $form, inst);
    }

    // Enforce hide rules (idempotent)
    applyHideRules($dlg, inst);

    try {
      console.info("[WiseHireHop] project edit applied", reason, { hasInstance: !!inst });
    } catch (e) {}
  }

  // ------------------------------------------------------------
  // Layout build
  // ------------------------------------------------------------
  function buildLayout($dlg, $form, inst) {
    var $ = window.jQuery;

    // Shell (sticky actions + 3-column grid)
    var $shell = $('<div class="wise-projedit-shell"></div>');
    var $actions = $('<div class="wise-actions-bar" aria-label="Actions"></div>');
    var $grid = $('<div class="wise-projedit-grid"></div>');

    // Sections
    var $sf = makeSection("Salesforce");
    var $people = makeSection("People");
    var $hh = makeSection("HireHop");

    $grid.append($sf.section, $people.section, $hh.section);
    $shell.append($actions, $grid);

    // Insert shell at top of the form
    $form.prepend($shell);

    // -------- Actions: move Save / Cancel and centre them
    var $saveBtn = $form.find('button[type="submit"]').first();
    var $cancelBtn = $form.find('button[type="reset"]').first();

    var $actionWrap = $('<div class="wise-actions-wrap"></div>');
    if ($saveBtn.length) $actionWrap.append($saveBtn.detach());
    if ($cancelBtn.length) $actionWrap.append($cancelBtn.detach());
    $actions.append($actionWrap);

    // -------- Salesforce section order:
    // 1. Custom Status (custom field)
    // 2. Custom Tier (custom field)
    // 3. Wise Job Number (COMPANY)
    // 4. Client (ADDRESS) — forced single-line
    // 5. Venue (DELIVER_TO)
    // 6. Project name (PROJECT_NAME)
    // 7. Type (JOB_TYPE)
    // + then: any remaining custom fields (if present)
    var $sfTable = $('<table class="wise-projedit-table" cellspacing="0" border="0"></table>');
    $sf.body.append($sfTable);

    // Move custom fields container into Salesforce section (and reorder inside it)
    var $custom = $form.find(".hh_custom_fields").first();
    if ($custom.length) {
      reorderCustomFields($custom);

      // Keep container, but style it to look like native rows
      var $customWrap = $('<div class="wise-customfields"></div>');
      $customWrap.append($custom.detach());
      $sf.body.prepend($customWrap);
    }

    // Helper: append a <tr> (detached from legacy tables) into our table
    function appendTr($tr) {
      if ($tr && $tr.length) $sfTable.append($tr.detach());
    }

    // Wise Job Number
    appendTr(findTrByField($form, inst, "COMPANY"));

    // Client (ADDRESS textarea) — remove rowspan + make single-line look
    var $clientTr = findTrByField($form, inst, "ADDRESS");
    if ($clientTr && $clientTr.length) {
      // Remove any rowspan that causes the next field to slide alongside
      $clientTr.find("td[rowspan]").removeAttr("rowspan");

      // Remove the (now redundant) "Add to address book" row if it follows
      var $next = $clientTr.next("tr");
      if ($next.length) $next.remove();

      appendTr($clientTr);

      // Force single-line behaviour
      var $clientTa = $sfTable.find('textarea[data-field="ADDRESS"]').first();
      if ($clientTa.length) {
        $clientTa.attr("rows", "1");
        $clientTa.on("input.wiseSingleLine", function () {
          var v = String(this.value || "");
          if (v.indexOf("\n") !== -1) this.value = v.replace(/\s*\n+\s*/g, " ");
        });
      }
    }

    // Venue (DELIVER_TO row) - rename label consistently
    var $venueTr = findTrByField($form, inst, "DELIVER_TO");
    if ($venueTr && $venueTr.length) {
      // Ensure label reads "Venue" (and matches non-bold label style via CSS)
      $venueTr.find("td.label").first().text("Venue");
      appendTr($venueTr);
    }

    // Project name
    appendTr(findTrByField($form, inst, "PROJECT_NAME"));

    // Type (job type)
    appendTr(findTrByField($form, inst, "JOB_TYPE"));

    // -------- People section: Project Manager (NAME)
    var $peopleTable = $('<table class="wise-projedit-table" cellspacing="0" border="0"></table>');
    $people.body.append($peopleTable);
    var $pmTr = findTrByField($form, inst, "NAME");
    if ($pmTr && $pmTr.length) $peopleTable.append($pmTr.detach());

    // -------- HireHop section: Warehouse, Dates, HireHop Status, Memo
    var $hhTable = $('<table class="wise-projedit-table" cellspacing="0" border="0"></table>');
    $hh.body.append($hhTable);

    // Warehouse Name (DEPOT_ID)
    var $depotTr = findTrByField($form, inst, "DEPOT_ID");
    if ($depotTr && $depotTr.length) $hhTable.append($depotTr.detach());

    // Dates container
    var $dates = $form.find(".hh_dates_container").first();
    if ($dates.length) {
      var $datesWrap = $('<div class="wise-dates-wrap"></div>');
      $datesWrap.append($dates.detach());
      $hh.body.append($datesWrap);
    }

    // HireHop Status dropdown (data-field=STATUS) — build clean row
    var $statusSel = $form.find('select[data-field="STATUS"]').first();
    if ($statusSel.length) {
      var $tr = $('<tr></tr>');
      $tr.append('<td class="label">Status</td>');
      var $td = $('<td class="field"></td>');
      $td.append($statusSel.detach());
      $tr.append($td);
      $hhTable.append($tr);
    }

    // Memo (DETAILS) — build clean row (keep multiline)
    var $detailsTa = $form.find('textarea[data-field="DETAILS"]').first();
    if ($detailsTa.length) {
      var $mtr = $('<tr></tr>');
      $mtr.append('<td class="label">Memo</td>');
      var $mtd = $('<td class="field"></td>');
      $mtd.append($detailsTa.detach());
      $mtr.append($mtd);
      $hhTable.append($mtr);
    }

    // Hide remaining legacy layout blocks (keep hidden inputs + proj_fields)
    $form.children().each(function () {
      var $c = $(this);

      if ($c.hasClass("wise-projedit-shell")) return;
      if ($c.is("#proj_fields")) return;
      if ($c.is('input[type="hidden"]')) return;

      // The original layout is typically a big grid div + the old footer table etc.
      // Hide it so only our new layout shows.
      $c.hide();
    });

    // Make sure the dialog content scrolls when needed
    $dlg.css({ overflow: "auto" });
  }

  function makeSection(title) {
    var $section = $('<section class="wise-section"></section>');
    var $hd = $('<div class="wise-section-hd"></div>').text(title);
    var $body = $('<div class="wise-section-bd"></div>');
    $section.append($hd, $body);
    return { section: $section, body: $body };
  }

  function findTrByField($form, inst, dataField) {
    var $ = window.jQuery;

    // Prefer instance refs when available
    if (inst) {
      var map = {
        NAME: inst.name,
        COMPANY: inst.company,
        ADDRESS: inst.address,
        JOB_TYPE: inst.proj_type,
        PROJECT_NAME: inst.proj_name,
        DEPOT_ID: inst.depot,
        DETAILS: inst.details,
        DELIVER_TO: inst.deliver_to
      };

      var $el = map[dataField];
      if ($el && $el.length) return $el.closest("tr");
    }

    // Fallback: DOM lookup by data-field
    var $node = $form.find('[data-field="' + dataField + '"]').first();
    if ($node.length) return $node.closest("tr");
    return null;
  }

  function reorderCustomFields($custom) {
    // Move "Status" then "Tier" to the top, keep the rest afterwards.
    // (Label texts like "Status :" / "Tier of event :")
    var $ = window.jQuery;

    var $containers = $custom.find(".custom_field_container");
    if (!$containers.length) return;

    function labelText($c) {
      var $lab = $c.find("label.label").first();
      if (!$lab.length) return "";
      var t = $lab.clone().children().remove().end().text();
      return String(t || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    var status = [];
    var tier = [];
    var rest = [];

    $containers.each(function () {
      var $c = $(this);
      var t = labelText($c);

      if (t.indexOf("status") === 0) status.push($c);
      else if (t.indexOf("tier") === 0) tier.push($c);
      else rest.push($c);
    });

    // Re-append in desired order
    var ordered = status.concat(tier).concat(rest);
    for (var i = 0; i < ordered.length; i++) {
      $custom.append(ordered[i].detach());
    }
  }

  // ------------------------------------------------------------
  // Hide rules (idempotent)
  // ------------------------------------------------------------
  function applyHideRules($dlg, inst) {
    var $ = window.jQuery;
    var $form = $dlg.find("form").first();

    // Hide client contact rows (TELEPHONE/MOBILE/EMAIL + add to address book)
    hideRow(inst && inst.telephone);
    hideRow(inst && inst.mobile);
    hideRow(inst && inst.email);
    hideRow(inst && inst.add_contact_btn);

    // Venue address field (DELIVERY_ADDRESS) must be hidden
    hideRow($form.find('[data-field="DELIVERY_ADDRESS"]').first());
    // Also hide the address mode labels row (delivery/use_at/collection) if it’s the one containing DELIVERY_ADDRESS
    // (In case it survived in legacy content)
    $form.find('[data-field="DELIVERY_ADDRESS"]').closest("tr").hide();

    // Delivery phone row (and any telephone container row)
    hideRow($form.find('[data-field="DELIVERY_TELEPHONE"]').first());
    hideRow($form.find(".telephone_container").first());

    // Force delivery mode inputs only (hide use_at/collection inputs if present)
    if (inst) {
      try {
        inst.use_at_btn && inst.use_at_btn.hide();
        inst.collect_btn && inst.collect_btn.hide();
        inst.use_at && inst.use_at.hide();
        inst.collection_from && inst.collection_from.hide();
      } catch (e) {}
    } else {
      $form.find(".label_container .label.use_at, .label_container .label.collection").hide();
      $form.find("input.use_at, input.collection, textarea.use_at, textarea.collection").hide();
    }
  }

  function hideRow($elOrJq) {
    if (!$elOrJq) return;
    var $ = window.jQuery;
    var $el = ($elOrJq.jquery ? $elOrJq : $($elOrJq));
    if (!$el.length) return;

    var $tr = $el.closest("tr");
    if ($tr.length) $tr.hide();
  }

  // ------------------------------------------------------------
  // Mutation observer (rerenders)
  // ------------------------------------------------------------
  function attachObserver() {
    var el = document.getElementById("edit_dialog");
    if (!el || !window.MutationObserver) return;

    var obs = new MutationObserver(function () {
      var $ = window.jQuery;
      if (!$) return;

      var $dlg = $("#edit_dialog");
      if ($dlg.length && ($dlg.is(":visible") || $dlg.closest(".ui-dialog").is(":visible"))) {
        scheduleApply("mutation");
      }
    });

    obs.observe(el, { childList: true, subtree: true, attributes: true });
  }

  // ------------------------------------------------------------
  // CSS
  // ------------------------------------------------------------
  function injectCSS(cssText) {
    var id = "wise-projedit-v5-css";
    if (document.getElementById(id)) return;

    var style = document.createElement("style");
    style.id = id;
    style.type = "text/css";
    style.appendChild(document.createTextNode(cssText));
    document.head.appendChild(style);
  }

  function getWiseCSS() {
    // Nightfall Navy: #0D1226
    // Heritage Rose:  #EC9797
    return `
/* =========================
   Wise Project Edit (scoped)
   ========================= */

.wise-projedit-dialog{
  width: min(92vw, 1200px) !important;
  max-width: 92vw !important;
}

/* Keep dialog within viewport and allow scrolling */
.wise-projedit-dialog.ui-dialog{
  top: 6vh !important;
  max-height: 88vh !important;
}

.wise-projedit-dialog .ui-dialog-content{
  background: #fff !important;
  color: #0D1226;
  overflow: auto !important;
  max-height: calc(88vh - 56px) !important; /* account for titlebar */
}

/* 1) Title bar: white background, nightfall text */
.wise-projedit-dialog .ui-dialog-titlebar{
  background: #fff !important;
  color: #0D1226 !important;
  border: 1px solid rgba(13,18,38,0.5) !important;
  border-bottom: none !important;
}

.wise-projedit-dialog .ui-dialog-title{
  color: #0D1226 !important;
  font-family: "Albra Sans", "Lato", system-ui, -apple-system, Segoe UI, Roboto, Arial !important;
  font-weight: 400 !important;
}

/* Close button: remove dark box + show a clean × */
.wise-projedit-dialog .ui-dialog-titlebar-close{
  background: transparent !important;
  border: 1px solid rgba(13,18,38,0.25) !important;
  border-radius: 10px !important;
  width: 34px !important;
  height: 34px !important;
}

.wise-projedit-dialog .ui-dialog-titlebar-close .ui-icon{
  background-image: none !important;
  text-indent: 0 !important;
  overflow: visible !important;
}

.wise-projedit-dialog .ui-dialog-titlebar-close .ui-icon:before{
  content: "×";
  display: inline-block;
  font-size: 20px;
  line-height: 20px;
  color: #0D1226;
  position: relative;
  top: 6px;
  left: 10px;
}

/* Core font */
.wise-projedit #edit_dialog,
.wise-projedit #edit_dialog input,
.wise-projedit #edit_dialog textarea,
.wise-projedit #edit_dialog select{
  font-family: "Lato", system-ui, -apple-system, Segoe UI, Roboto, Arial !important;
}

/* 2) Actions bar (Save/Cancel) - white background, centred */
.wise-projedit .wise-actions-bar{
  position: sticky;
  top: 0;
  z-index: 5;
  background: #fff;
  border-bottom: 1px solid rgba(13,18,38,0.5);
  padding: 10px 12px;
  display: flex;
  justify-content: center;
}

.wise-projedit .wise-actions-wrap{
  display: inline-flex;
  gap: 10px;
  justify-content: center;
}

/* 7) 3-column layout (responsive) */
.wise-projedit .wise-projedit-grid{
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
}

@media (max-width: 1100px){
  .wise-projedit .wise-projedit-grid{
    grid-template-columns: 1fr;
  }
}

/* 5) Section titles: white background, nightfall text; border nightfall @ 50% */
.wise-projedit .wise-section{
  border: 1px solid rgba(13,18,38,0.5);
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
  box-sizing: border-box;
}

.wise-projedit .wise-section-hd{
  background: #fff;
  color: #0D1226;
  border-bottom: 1px solid rgba(13,18,38,0.5);
  padding: 10px 12px;
  font-family: "Albra Sans", "Lato", system-ui, -apple-system, Segoe UI, Roboto, Arial !important;
  font-size: 1.8em; /* ~2x default */
  font-weight: 400;
}

.wise-projedit .wise-section-bd{
  padding: 10px 12px 12px 12px;
}

/* Tables */
.wise-projedit table.wise-projedit-table{
  width: 100%;
  border-collapse: collapse;
}

.wise-projedit table.wise-projedit-table td{
  padding: 6px 8px;
  vertical-align: top;
}

/* 3) Labels not bold (Wise Job Number / Client / Project name / Venue all match) */
.wise-projedit table.wise-projedit-table td.label{
  width: 190px !important;
  white-space: nowrap;
  font-weight: 300 !important;
  color: #0D1226 !important;
}

/* Inputs span width */
.wise-projedit input.data_cell,
.wise-projedit select.data_cell,
.wise-projedit textarea.data_cell,
.wise-projedit input.custom_field,
.wise-projedit select.custom_field,
.wise-projedit textarea.custom_field{
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  border: 1px solid rgba(13,18,38,0.25) !important;
  border-radius: 12px !important;
  padding: 8px 10px !important;
  background: #fff !important;
  color: #0D1226 !important;
  font-weight: 300 !important;
}

/* Heritage accent on focus (subtle) */
.wise-projedit input.data_cell:focus,
.wise-projedit select.data_cell:focus,
.wise-projedit textarea.data_cell:focus,
.wise-projedit input.custom_field:focus,
.wise-projedit textarea.custom_field:focus{
  outline: none !important;
  border-color: rgba(236,151,151,0.9) !important;
  box-shadow: 0 0 0 3px rgba(236,151,151,0.25) !important;
}

/* 3) Client forced to single-line visual */
.wise-projedit textarea[data-field="ADDRESS"]{
  height: 2.45em !important;
  min-height: 2.45em !important;
  resize: none !important;
  overflow: hidden !important;
}

/* Custom fields: remove “bubble” feel and align like normal rows */
.wise-projedit .wise-customfields .hh_custom_fields{
  display: block !important;
  gap: 0 !important;
}

.wise-projedit .wise-customfields .custom_field_container{
  display: block !important;
  max-width: 100% !important;
  width: 100% !important;
  margin: 0 0 8px 0 !important;
}

.wise-projedit .wise-customfields label.label{
  display: grid !important;
  grid-template-columns: 190px 1fr !important;
  gap: 8px !important;
  align-items: center !important;
  font-weight: 300 !important;
  color: #0D1226 !important;
}

/* Dates block spacing */
.wise-projedit .wise-dates-wrap{
  margin-top: 8px;
}
`;
  }
})();
