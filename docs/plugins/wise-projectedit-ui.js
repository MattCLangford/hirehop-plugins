(function () {
  "use strict";

  // =========================
  // Wise HireHop Project Edit
  // v5 - Hide fields + optional Wise theme + optional layout
  // =========================
  var WISE_PLUGIN_VERSION = "v5";

  // ---- CONFIG (edit these) ----
  var CONFIG = {
    // Keep your existing behaviour
    hideUnusedFields: true,

    // Wise brand theme (scoped to the project edit dialog only)
    enableWiseTheme: true,

    // Rebuild the dialog into 1-column sections (Salesforce / People / HireHop)
    // This DOES move existing DOM nodes (via detach), but avoids the hierarchy error you hit previously.
    enableLayout: true,

    // Creates a slim action bar under the titlebar and puts Save/Cancel there (cloned buttons)
    enableActionBar: true,

    // Safety: if layout throws once, disable it for this session
    disableLayoutOnError: true
  };

  // Prevent double-init
  if (window.__WISE_PROJECT_EDIT_V5_INIT__) return;
  window.__WISE_PROJECT_EDIT_V5_INIT__ = true;

  // Only on project page
  if (location.pathname !== "/project.php") return;

  // Proof of life (minimal)
  try {
    console.warn("[WiseHireHop] project edit plugin loaded", WISE_PLUGIN_VERSION, location.href);
  } catch (e) {}

  // Boot: wait for jQuery + edit dialog
  var bootTries = 0;
  (function boot() {
    bootTries++;

    var hasJQ = !!window.jQuery && !!window.jQuery.fn;
    var hasEditDialog = !!document.getElementById("edit_dialog");

    if (hasJQ && hasEditDialog) {
      init();
      return;
    }

    if (bootTries < 200) setTimeout(boot, 50);
  })();

  function init() {
    var $ = window.jQuery;

    // Apply rules when dialog opens
    $(document).on("dialogopen.wiseProjEdit", "#edit_dialog", function () {
      scheduleApply("dialogopen");
      setTimeout(function () { scheduleApply("dialogopen+150"); }, 150);
      setTimeout(function () { scheduleApply("dialogopen+450"); }, 450);
    });

    // Observe re-renders inside the dialog
    attachObserver();

    // Run once in case dialog is already open
    scheduleApply("init");
  }

  // -------------------------
  // Scheduler
  // -------------------------
  var _applyTimer = null;
  function scheduleApply(reason) {
    if (_applyTimer) return;
    _applyTimer = setTimeout(function () {
      _applyTimer = null;
      applyAll(reason);
    }, 50);
  }

  function applyAll(reason) {
    var $ = window.jQuery;
    if (!$) return;

    var $dlg = $("#edit_dialog");
    if (!$dlg.length) return;

    var isVisible = $dlg.is(":visible") || $dlg.closest(".ui-dialog").is(":visible");
    if (!isVisible) return;

    // Tag wrapper so CSS scopes cleanly (even if you disable theme later)
    var $wrapper = $dlg.closest(".ui-dialog");
    if ($wrapper.length && !$wrapper.hasClass("wise-projedit")) $wrapper.addClass("wise-projedit");

    if (CONFIG.enableWiseTheme) {
      injectWiseThemeCSS();
    }

    if (CONFIG.enableActionBar) {
      ensureActionBar($dlg);
    }

    var inst = getProjectEditInstance($dlg);

    if (CONFIG.hideUnusedFields) {
      if (inst) applyHideUsingInstance(inst);
      else applyHideUsingDOM($dlg);
    }

    if (CONFIG.enableLayout) {
      try {
        buildWiseLayout($dlg);
      } catch (e) {
        try { console.error("[WiseHireHop] layout error", e); } catch (_) {}
        if (CONFIG.disableLayoutOnError) CONFIG.enableLayout = false;
      }
    }

    try {
      console.info("[WiseHireHop] applied", reason, {
        hasInstance: !!inst,
        theme: !!CONFIG.enableWiseTheme,
        actionBar: !!CONFIG.enableActionBar,
        layout: !!CONFIG.enableLayout
      });
    } catch (e) {}
  }

  // -------------------------
  // Instance detection
  // -------------------------
  function getProjectEditInstance($dlg) {
    return (
      $dlg.data("custom-project_edit") ||
      $dlg.data("customProject_edit") ||
      null
    );
  }

  // -------------------------
  // Hide rules (your existing logic, unchanged in intent)
  // -------------------------
  function applyHideUsingInstance(inst) {
    // KILL: client contact rows
    hideRow(inst.telephone);
    hideRow(inst.mobile);
    hideRow(inst.email);
    hideRow(inst.add_contact_btn);

    // KEEP: Deliver to + Delivery address ONLY
    try {
      inst.use_at_btn && inst.use_at_btn.hide();
      inst.collect_btn && inst.collect_btn.hide();
      inst.delivery_btn && inst.delivery_btn.show();

      inst.use_at && inst.use_at.hide();
      inst.collection_from && inst.collection_from.hide();
      inst.deliver_to && inst.deliver_to.show();

      inst.use_at_address && inst.use_at_address.hide();
      inst.collection_address && inst.collection_address.hide();
      inst.delivery_address && inst.delivery_address.show();
    } catch (e) {}

    // KILL: delivery phone number row
    if (inst.delivery_telephone && inst.delivery_telephone.length) {
      hideRow(inst.delivery_telephone);
    } else if (inst.del_telephone_label && inst.del_telephone_label.length) {
      hideRow(inst.del_telephone_label);
    } else if (inst.use_at_tel && inst.use_at_tel.length) {
      hideRow(inst.use_at_tel);
    } else if (inst.collection_tel && inst.collection_tel.length) {
      hideRow(inst.collection_tel);
    }
  }

  function applyHideUsingDOM($root) {
    hideRow($root.find("[data-field='TELEPHONE']").first());
    hideRow($root.find("[data-field='MOBILE']").first());
    hideRow($root.find("[data-field='EMAIL']").first());

    $root.find(".label_container .label.use_at, .label_container .label.collection").hide();

    var $tel =
      $root.find("[data-field='DELIVERY_TELEPHONE']").first()
        .add($root.find(".telephone_container input.delivery").first())
        .filter(":first");
    if ($tel.length) hideRow($tel);
  }

  // -------------------------
  // Action bar (subtitle bar under titlebar)
  // Keeps original buttons in place (hidden), uses clones that click originals.
  // -------------------------
  function ensureActionBar($dlg) {
    var $wrapper = $dlg.closest(".ui-dialog");
    if (!$wrapper.length) return;

    if ($wrapper.find(".wise-projedit-subbar").length) return;

    var $titlebar = $wrapper.children(".ui-dialog-titlebar").first();
    if (!$titlebar.length) return;

    var $origSave = $dlg.find("button[type='submit']").first();
    var $origCancel = $dlg.find("button[type='reset']").first();

    if (!$origSave.length || !$origCancel.length) return;

    // Build bar
    var $bar = window.jQuery(
      '<div class="wise-projedit-subbar" data-wise-subbar="1">' +
        '<div class="wise-projedit-subbar-inner">' +
          '<div class="wise-projedit-subbar-left"></div>' +
          '<div class="wise-projedit-subbar-right"></div>' +
        "</div>" +
      "</div>"
    );

    // Clone buttons (type=button), wire to originals
    var $saveClone = $origSave.clone(false);
    $saveClone.attr("type", "button");
    $saveClone.off("click").on("click", function (e) {
      e.preventDefault();
      $origSave.trigger("click");
    });

    var $cancelClone = $origCancel.clone(false);
    $cancelClone.attr("type", "button");
    $cancelClone.off("click").on("click", function (e) {
      e.preventDefault();
      $origCancel.trigger("click");
    });

    // Insert bar after titlebar
    $bar.insertAfter($titlebar);

    // Put clones in the bar
    $bar.find(".wise-projedit-subbar-right").append($saveClone).append(" ").append($cancelClone);

    // Hide originals visually but keep them in DOM
    $origSave.css({ position: "absolute", left: "-99999px", top: "-99999px" });
    $origCancel.css({ position: "absolute", left: "-99999px", top: "-99999px" });
  }

  // -------------------------
  // Layout rebuild (1-column sections)
  // Salesforce: COMPANY + ADDRESS(+rowspan mate) + PROJECT_NAME + Venue block + Custom fields
  // People: NAME
  // HireHop: DEPOT_ID + JOB_TYPE + DETAILS + Dates + STATUS
  // -------------------------
  function buildWiseLayout($dlg) {
    var $ = window.jQuery;

    var $form = $dlg.find("form").first();
    if (!$form.length) return;

    // Guard: build once per rendered form
    if ($form.attr("data-wise-layout-built") === "1") return;
    $form.attr("data-wise-layout-built", "1");

    // Find the top grid container (first child div that uses display:grid)
    var $topGrid = $form.children("div").first();
    if (!$topGrid.length) return;

    // Create new layout container at top of form
    var $layout = $(
      '<div class="wise-projedit-layout" data-wise-layout="1">' +
        sectionHTML("Salesforce") +
        sectionHTML("People") +
        sectionHTML("HireHop") +
      "</div>"
    );

    // Insert layout before the existing content
    $topGrid.before($layout);

    var $sales = $layout.find('[data-wise-section="Salesforce"] .wise-projedit-section-body');
    var $people = $layout.find('[data-wise-section="People"] .wise-projedit-section-body');
    var $hh = $layout.find('[data-wise-section="HireHop"] .wise-projedit-section-body');

    // Helper: create a table in a section
    function ensureTable($sec) {
      var $t = $sec.find("table.wise-projedit-table").first();
      if ($t.length) return $t;
      $t = $('<table class="wise-projedit-table" cellspacing="0" border="0"></table>');
      $sec.append($t);
      return $t;
    }

    // Pull from original tables
    var $leftTable = $topGrid.children("div").first().find("table").first();
    var $rightTable = $topGrid.children("div").eq(1).find("table").first();

    // People: Project Manager row (NAME)
    var $pmTr = $leftTable.find('input[data-field="NAME"]').first().closest("tr");
    if ($pmTr.length) ensureTable($people).append($pmTr.detach());

    // Salesforce: Wise Job Number row (COMPANY)
    var $jobNoTr = $leftTable.find('input[data-field="COMPANY"]').first().closest("tr");
    if ($jobNoTr.length) ensureTable($sales).append($jobNoTr.detach());

    // Salesforce: Client row (ADDRESS) + its rowspan companion row
    var $clientTr = $leftTable.find('textarea[data-field="ADDRESS"]').first().closest("tr");
    if ($clientTr.length) {
      var $clientTr2 = $clientTr.next("tr"); // companion row for rowspan=2
      ensureTable($sales).append($clientTr.detach());
      if ($clientTr2.length) ensureTable($sales).append($clientTr2.detach());
    }

    // Salesforce: Project name (PROJECT_NAME) lives on the right table in your HTML sample
    var $projNameTr = $rightTable.find('input[data-field="PROJECT_NAME"]').first().closest("tr");
    if ($projNameTr.length) ensureTable($sales).append($projNameTr.detach());

    // HireHop: Warehouse name (DEPOT_ID)
    var $depotTr = $rightTable.find('select[data-field="DEPOT_ID"]').first().closest("tr");
    if ($depotTr.length) ensureTable($hh).append($depotTr.detach());

    // HireHop: Project type (JOB_TYPE)
    var $jobTypeTr = $rightTable.find('select[data-field="JOB_TYPE"]').first().closest("tr");
    if ($jobTypeTr.length) ensureTable($hh).append($jobTypeTr.detach());

    // HireHop: Memo/details (DETAILS) (single tr with colspan in your sample)
    var $memoTr = $rightTable.find('textarea[data-field="DETAILS"]').first().closest("tr");
    if ($memoTr.length) ensureTable($hh).append($memoTr.detach());

    // Salesforce: Venue block (Deliver to + address block)
    // Move the entire table that contains DELIVER_TO (keeps its internal structure intact)
    var $venueTable = $form.find('input[data-field="DELIVER_TO"]').first().closest("table");
    if ($venueTable.length) {
      var $venueWrap = $('<div class="wise-projedit-block"></div>');
      $venueWrap.append($venueTable.detach());
      $sales.append($venueWrap);
    }

    // Salesforce: Custom fields block (keep the container intact)
    var $custom = $form.find(".hh_custom_fields").first();
    if ($custom.length) {
      var $cfWrap = $('<div class="wise-projedit-block"></div>');
      $cfWrap.append($custom.detach());
      $sales.append($cfWrap);
    }

    // HireHop: Dates container
    var $dates = $form.find(".hh_dates_container").first();
    if ($dates.length) {
      var $dWrap = $('<div class="wise-projedit-block"></div>');
      $dWrap.append($dates.detach());
      $hh.append($dWrap);
    }

    // HireHop: Status select
    var $statusSelect = $form.find('select[data-field="STATUS"]').first();
    if ($statusSelect.length) {
      // Move the label wrapper if present (keeps "Status" text and select together)
      var $statusLabel = $statusSelect.closest("label");
      var $sWrap = $('<div class="wise-projedit-block"></div>');
      $sWrap.append($statusLabel.length ? $statusLabel.detach() : $statusSelect.detach());
      $hh.append($sWrap);
    }

    // Hide the original top grid (we’ve moved what we need out of it)
    $topGrid.hide();

    // NOTE: We deliberately DO NOT remove anything else; we only detach specific nodes.
  }

  function sectionHTML(title) {
    return (
      '<section class="wise-projedit-section" data-wise-section="' + escAttr(title) + '">' +
        '<div class="wise-projedit-section-title">' + escHtml(title) + "</div>" +
        '<div class="wise-projedit-section-body"></div>' +
      "</section>"
    );
  }

  // -------------------------
  // Wise theme CSS (scoped)
  // Nightfall Navy: #0D1226
  // Heritage Rose: #EC9797
  // -------------------------
  function injectWiseThemeCSS() {
    var id = "wise-projedit-css-" + WISE_PLUGIN_VERSION;
    if (document.getElementById(id)) return;

    var css = `
.wise-projedit{
  --nightfall: #0D1226;
  --rose: #EC9797;
  --rose-soft: rgba(236,151,151,.14);
  --paper: #FFFFFF;
  --paper-warm: #F6F2EA;
  --ink: #0D1226;
  --line: rgba(13,18,38,.16);
  --line-strong: rgba(13,18,38,.26);
}

/* Titlebar (structure unchanged, only colour/font) */
.wise-projedit .ui-dialog-titlebar{
  background: var(--nightfall);
  border: none;
}
.wise-projedit .ui-dialog-title{
  color: var(--paper-warm);
  font-family: "Albra Sans", "Albra", system-ui, -apple-system, Segoe UI, Roboto, Arial;
  font-weight: 400;
  letter-spacing: .2px;
}

/* Close button: keep position/shape; just align colour */
.wise-projedit .ui-dialog-titlebar-close{
  background: transparent;
  border: 1px solid rgba(246,242,234,.30);
  border-radius: 10px;
}
.wise-projedit .ui-dialog-titlebar-close:hover{
  background: rgba(246,242,234,.10);
}
.wise-projedit .ui-dialog-titlebar-close .ui-icon{
  filter: invert(1);
  opacity: .95;
}

/* Subtitle/action bar */
.wise-projedit-subbar{
  background: rgba(236,151,151,.12);
  border-bottom: 1px solid rgba(236,151,151,.45);
  padding: 8px 10px;
}
.wise-projedit-subbar-inner{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.wise-projedit-subbar-right button{
  margin-left: 6px;
}

/* Content base */
.wise-projedit #edit_dialog{
  background: var(--paper);
  color: var(--ink);
  font-family: "Lato", system-ui, -apple-system, Segoe UI, Roboto, Arial;
  font-weight: 300;
}

/* Inputs */
.wise-projedit #edit_dialog input.data_cell,
.wise-projedit #edit_dialog textarea.data_cell,
.wise-projedit #edit_dialog select.data_cell,
.wise-projedit #edit_dialog .custom_field{
  border-radius: 10px;
  border: 1px solid var(--line);
  padding: 7px 9px;
  background: #fff;
  font-family: "Lato", system-ui, -apple-system, Segoe UI, Roboto, Arial;
  font-weight: 300;
}
.wise-projedit #edit_dialog input.data_cell:focus,
.wise-projedit #edit_dialog textarea.data_cell:focus,
.wise-projedit #edit_dialog select.data_cell:focus,
.wise-projedit #edit_dialog .custom_field:focus{
  outline: none;
  border-color: var(--rose);
  box-shadow: 0 0 0 3px var(--rose-soft);
}

/* Section layout */
.wise-projedit #edit_dialog .wise-projedit-layout{
  padding: 10px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.wise-projedit #edit_dialog .wise-projedit-section{
  border: 1px solid rgba(236,151,151,.45);
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
}
.wise-projedit #edit_dialog .wise-projedit-section-title{
  background: rgba(236,151,151,.12);
  border-bottom: 1px solid rgba(236,151,151,.45);
  padding: 10px 12px;
  font-family: "Albra Sans", "Albra", system-ui, -apple-system, Segoe UI, Roboto, Arial;
  font-weight: 400;
  color: var(--nightfall);
}
.wise-projedit #edit_dialog .wise-projedit-section-body{
  padding: 10px 12px;
}
.wise-projedit #edit_dialog table.wise-projedit-table{
  width: 100%;
}
.wise-projedit #edit_dialog table.wise-projedit-table td{
  padding: 2px 4px;
  vertical-align: top;
}
.wise-projedit #edit_dialog table.wise-projedit-table td.label,
.wise-projedit #edit_dialog label.label{
  font-family: "Albra Sans", "Albra", system-ui, -apple-system, Segoe UI, Roboto, Arial;
  font-weight: 400;
  color: var(--nightfall);
}
.wise-projedit #edit_dialog .wise-projedit-block{
  margin-top: 8px;
}

/* Make dates + custom fields feel like clean blocks */
.wise-projedit #edit_dialog .hh_dates_container,
.wise-projedit #edit_dialog .hh_custom_fields{
  background: rgba(236,151,151,.08);
  border: 1px solid rgba(236,151,151,.35);
  border-radius: 14px;
  padding: 10px;
}
    `;

    var style = document.createElement("style");
    style.id = id;
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  // -------------------------
  // Observer
  // -------------------------
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

  // -------------------------
  // Utilities
  // -------------------------
  function hideRow($elOrJq) {
    if (!$elOrJq) return;
    var $ = window.jQuery;
    var $el = ($elOrJq.jquery ? $elOrJq : $($elOrJq));
    if (!$el.length) return;
    var $tr = $el.closest("tr");
    if ($tr.length) $tr.hide();
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m];
    });
  }
  function escAttr(s) {
    return String(s).replace(/"/g, "&quot;");
  }
})();
