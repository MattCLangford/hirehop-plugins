(function () {
  "use strict";

  // ============================================================
  // Wise HireHop Project Edit
  // - Re-layout into 3 sections (Salesforce / People / HireHop)
  // - Apply Wise styling (nightfall + heritage accent)
  // - Hide unused fields (delivery address, phones, etc.)
  // - Unified label/input alignment for ALL fields (standard + custom)
  // - Dialog opens centred and is clamped within viewport (no off-screen)
  // - Titlebar border removed + taller titlebar for close button
  // ============================================================
  var WISE_PLUGIN_VERSION = "v7-dialog-position-titlebar";

  // Prevent double-init
  if (window.__WISE_PROJECT_EDIT_V7_INIT__) return;
  window.__WISE_PROJECT_EDIT_V7_INIT__ = true;

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
    $(document).on("dialogopen.wiseProjEditV7", "#edit_dialog", function () {
      var $dlg = $("#edit_dialog");
      var $wrapper = $dlg.closest(".ui-dialog");
      if ($wrapper.length) $wrapper.data("wiseCenteredOnce", false);

      scheduleApply("dialogopen");
      setTimeout(function () { scheduleApply("dialogopen+150"); }, 150);
      setTimeout(function () { scheduleApply("dialogopen+450"); }, 450);

      // Centre/clamp after open (and once more after layout settles)
      setTimeout(function () { centerDialog($dlg); }, 0);
      setTimeout(function () { centerDialog($dlg); }, 200);
    });

    // Clamp after dragging stops (prevents “lost off-screen”)
    $(document).on("dialogdragstop.wiseProjEditV7", "#edit_dialog", function () {
      clampDialogToViewport($("#edit_dialog"));
    });

    // Clamp on window resize
    $(window).on("resize.wiseProjEditV7", function () {
      clampDialogToViewport($("#edit_dialog"));
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

    // Ensure draggable is bounded, and never off-screen
    ensureDialogDraggableContainment($dlg);
    clampDialogToViewport($dlg);

    try {
      console.info("[WiseHireHop] project edit applied", reason, { hasInstance: !!inst });
    } catch (e) {}
  }

  // ------------------------------------------------------------
  // Dialog positioning helpers
  // ------------------------------------------------------------
  function centerDialog($dlg) {
    var $ = window.jQuery;
    if (!$dlg || !$dlg.length) return;

    var $wrapper = $dlg.closest(".ui-dialog");
    if (!$wrapper.length) return;

    // Centre only once per open (unless it is currently off-screen)
    var already = !!$wrapper.data("wiseCenteredOnce");
    if (already) {
      clampDialogToViewport($dlg);
      return;
    }

    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;

    var w = $wrapper.outerWidth();
    var h = $wrapper.outerHeight();

    var pad = 8;
    var desiredTop = Math.max(pad, Math.round(vh * 0.06)); // ~6vh down
    var desiredLeft = Math.round((vw - w) / 2);

    // Clamp desired position into viewport
    var maxLeft = Math.max(pad, vw - w - pad);
    var maxTop = Math.max(pad, vh - h - pad);

    var left = Math.min(Math.max(desiredLeft, pad), maxLeft);
    var top = Math.min(Math.max(desiredTop, pad), maxTop);

    $wrapper.css({ left: left + "px", top: top + "px" });

    $wrapper.data("wiseCenteredOnce", true);

    // Final clamp in case sizes change right after
    clampDialogToViewport($dlg);
  }

  function clampDialogToViewport($dlg) {
    var $ = window.jQuery;
    if (!$dlg || !$dlg.length) return;

    var $wrapper = $dlg.closest(".ui-dialog");
    if (!$wrapper.length) return;

    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;

    var w = $wrapper.outerWidth();
    var h = $wrapper.outerHeight();

    var left = parseInt($wrapper.css("left"), 10);
    var top = parseInt($wrapper.css("top"), 10);

    if (isNaN(left)) left = 0;
    if (isNaN(top)) top = 0;

    var pad = 8;
    var minLeft = pad;
    var minTop = pad;
    var maxLeft = Math.max(pad, vw - w - pad);
    var maxTop = Math.max(pad, vh - h - pad);

    left = Math.min(Math.max(left, minLeft), maxLeft);
    top = Math.min(Math.max(top, minTop), maxTop);

    $wrapper.css({ left: left + "px", top: top + "px" });
  }

  function ensureDialogDraggableContainment($dlg) {
    var $ = window.jQuery;
    if (!$dlg || !$dlg.length) return;

    var $wrapper = $dlg.closest(".ui-dialog");
    if (!$wrapper.length) return;

    try {
      // Constrain dragging to the window so it can't be lost off-screen
      $wrapper.draggable("option", "containment", "window");
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

    // -------- Salesforce section table
    var $sfTable = $('<table class="wise-projedit-table" cellspacing="0" border="0"></table>');
    $sf.body.append($sfTable);

    // 1) Custom fields FIRST (Status, Tier, then rest) - converted into table rows
    var $custom = $form.find(".hh_custom_fields").first();
    if ($custom.length) {
      reorderCustomFields($custom);
      appendCustomFieldsToTable($custom, $sfTable);
    }

    // Helper: append a <tr> (detached from legacy tables) into our table
    function appendTr($tr) {
      if ($tr && $tr.length) $sfTable.append($tr.detach());
    }

    // 2) Wise Job Number
    appendTr(findTrByField($form, inst, "COMPANY"));

    // 3) Client (ADDRESS textarea) — remove rowspan + make single-line look
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

    // 4) Venue (DELIVER_TO row) - rename label consistently
    var $venueTr = findTrByField($form, inst, "DELIVER_TO");
    if ($venueTr && $venueTr.length) {
      $venueTr.find("td.label").first().text("Venue");
      appendTr($venueTr);
    }

    // 5) Project name
    appendTr(findTrByField($form, inst, "PROJECT_NAME"));

    // 6) Type (job type)
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

    // Dates container (leave as-is)
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

    var ordered = status.concat(tier).concat(rest);
    for (var i = 0; i < ordered.length; i++) {
      $custom.append(ordered[i].detach());
    }
  }

  // Convert custom fields into native <tr> rows in the same table
  function appendCustomFieldsToTable($custom, $table) {
    var $ = window.jQuery;

    var $containers = $custom.find(".custom_field_container");
    if (!$containers.length) return;

    $containers.each(function () {
      var $c = $(this);

      // Extract label text (strip children + trailing colon)
      var $lab = $c.find("label.label").first();
      var label = "";
      if ($lab.length) {
        label = $lab.clone().children().remove().end().text();
        label = String(label || "")
          .replace(/\s+/g, " ")
          .trim()
          .replace(/:\s*$/, "");
      }

      // Find the input/select/textarea
      var $input = $c.find("input.custom_field, select.custom_field, textarea.custom_field").first();
      if (!$input.length) return;

      var $tr = $('<tr class="wise-row wise-row-custom"></tr>');
      $tr.append($('<td class="label"></td>').text(label || "Field"));
      var $td = $('<td class="field"></td>');
      $td.append($input.detach());
      $tr.append($td);

      $table.append($tr);

      $c.remove();
    });

    $custom.remove();
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
    var id = "wise-projedit-v7-css";
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

/* Wider dialog (~20% wider than earlier cap) */
.wise-projedit-dialog{
  width: min(96vw, 1440px) !important;
  max-width: 96vw !important;
}

/* Keep dialog within viewport and allow scrolling (NO fixed top here) */
.wise-projedit-dialog.ui-dialog{
  max-height: 88vh !important;
}

/* Dialog content area */
.wise-projedit-dialog .ui-dialog-content{
  background: #fff !important;
  color: #0D1226;
  overflow: auto !important;
  max-height: calc(88vh - 72px) !important; /* account for taller titlebar */
}

/* Titlebar: remove border + make taller */
.wise-projedit-dialog .ui-dialog-titlebar{
  background: #fff !important;
  color: #0D1226 !important;
  border: none !important;                 /* remove border as requested */
  padding: 12px 54px 12px 14px !important; /* extra right space for close */
  min-height: 60px !important;             /* taller bar */
  box-sizing: border-box !important;
  position: relative !important;
}

/* Title text */
.wise-projedit-dialog .ui-dialog-title{
  color: #0D1226 !important;
  font-family: "Albra Sans", "Lato", system-ui, -apple-system, Segoe UI, Roboto, Arial !important;
  font-weight: 400 !important;
  line-height: 1.2 !important;
  margin: 0 !important;
}

/* Close button: centred vertically in the taller bar */
.wise-projedit-dialog .ui-dialog-titlebar-close{
  position: absolute !important;
  right: 12px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;

  background: transparent !important;
  border: 1px solid rgba(13,18,38,0.25) !important;
  border-radius: 10px !important;
  width: 38px !important;
  height: 38px !important;

  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* Replace jQuery UI icon with a clean × */
.wise-projedit-dialog .ui-dialog-titlebar-close .ui-icon{
  background-image: none !important;
  text-indent: 0 !important;
  overflow: visible !important;
  width: auto !important;
  height: auto !important;
}

.wise-projedit-dialog .ui-dialog-titlebar-close .ui-icon:before{
  content: "×";
  display: inline-block;
  font-size: 22px;
  line-height: 22px;
  color: #0D1226;
}

/* Core font */
.wise-projedit #edit_dialog,
.wise-projedit #edit_dialog input,
.wise-projedit #edit_dialog textarea,
.wise-projedit #edit_dialog select{
  font-family: "Lato", system-ui, -apple-system, Segoe UI, Roboto, Arial !important;
}

/* Actions bar (Save/Cancel) - white background, centred */
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

/* 3-column layout (responsive) */
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

/* Sections */
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
  font-size: 1.8em;
  font-weight: 400;
}

/* Section padding */
.wise-projedit .wise-section-bd{
  padding: 10px;
}

/* Tables */
.wise-projedit table.wise-projedit-table{
  width: 100%;
  border-collapse: collapse;
}

.wise-projedit table.wise-projedit-table td{
  padding: 6px 0;
  vertical-align: top;
}

/* Unified label column + 10px gap */
.wise-projedit table.wise-projedit-table td.label{
  width: 190px !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 10px;
  font-weight: 300 !important;
  color: #0D1226 !important;
}

.wise-projedit table.wise-projedit-table td.field{
  width: 100%;
}

/* Inputs span remaining width */
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

/* Heritage accent on focus */
.wise-projedit input.data_cell:focus,
.wise-projedit select.data_cell:focus,
.wise-projedit textarea.data_cell:focus,
.wise-projedit input.custom_field:focus,
.wise-projedit select.custom_field:focus,
.wise-projedit textarea.custom_field:focus{
  outline: none !important;
  border-color: rgba(236,151,151,0.9) !important;
  box-shadow: 0 0 0 3px rgba(236,151,151,0.25) !important;
}

/* Client forced to single-line visual */
.wise-projedit textarea[data-field="ADDRESS"]{
  height: 2.45em !important;
  min-height: 2.45em !important;
  resize: none !important;
  overflow: hidden !important;
}

/* Dates block spacing */
.wise-projedit .wise-dates-wrap{
  margin-top: 8px;
}
`;
  }
})();
