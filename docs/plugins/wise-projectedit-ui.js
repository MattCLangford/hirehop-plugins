(function () {
  "use strict";

  var $ = window.jQuery;
  if (!$) return;

  // HireHop exposes `user` globally (not window.user)
  if (typeof user === "undefined") return;

  // Only on project page
  if (!/\/project\.php(\?|$)/.test(location.pathname)) return;

  // One-time CSS injection
  injectCSS(`
/* ============================
   Wise Project Edit (scoped)
   - Does NOT style titlebar
   ============================ */

.wise-projedit-dialog .ui-dialog-content{
  background: #F6F2EA; /* Paper White */
}

/* Root wrapper (inside the form) */
.wise-projedit-root{
  padding: 10px 10px 14px;
}

/* Subtitle bar (below titlebar, inside content) */
.wise-projedit-subbar{
  position: sticky;
  top: 0;
  z-index: 5;
  background: #EFE8DD;
  border: 1px solid rgba(11,27,43,.14);
  border-radius: 12px;
  padding: 8px 10px;
  margin-bottom: 10px;
}

.wise-projedit-subbar .wise-projedit-actions{
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
}

/* Buttons in subbar */
.wise-projedit-actions .wise-btn{
  appearance: none;
  border: 0;
  border-radius: 10px;
  padding: 8px 12px;
  font: 600 13px/1.1 system-ui, -apple-system, Segoe UI, Roboto, Arial;
  cursor: pointer;
}

.wise-projedit-actions .wise-btn-save{
  background: #0B1B2B; /* Nightfall Navy */
  color: #F6F2EA;
}

.wise-projedit-actions .wise-btn-cancel{
  background: rgba(11,27,43,.10);
  color: #0B1B2B;
}

/* Sections */
.wise-projedit-section{
  border: 1px solid rgba(11,27,43,.14);
  border-radius: 14px;
  overflow: hidden;
  background: #FFFFFF;
  margin-bottom: 12px;
}

.wise-projedit-section-title{
  background: #0B1B2B;
  color: #F6F2EA;
  padding: 10px 12px;
  font: 700 13px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial;
  letter-spacing: .2px;
}

.wise-projedit-section-body{
  padding: 10px 12px 12px;
}

/* Field table */
.wise-projedit-table{
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 8px;
}

.wise-projedit-table td.label{
  width: 190px;
  padding-right: 10px;
  color: #0B1B2B;
  font-weight: 700;
  vertical-align: top;
}

/* Inputs look "Wise", but keep HireHop sizing behaviour */
.wise-projedit-dialog .wise-projedit-root input.data_cell,
.wise-projedit-dialog .wise-projedit-root textarea.data_cell,
.wise-projedit-dialog .wise-projedit-root select.data_cell{
  border-radius: 10px;
  border: 1px solid rgba(11,27,43,.18);
  padding: 7px 9px;
  background: #fff;
}

/* Custom fields block spacing */
.wise-projedit-customfields{
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(11,27,43,.22);
}
.wise-projedit-customfields-title{
  font-weight: 800;
  color: #0B1B2B;
  margin: 0 0 8px 0;
  font: 700 12.5px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial;
}

/* Hide old layout once rebuilt (we hide specific known containers via JS too) */
.wise-projedit-hidden{
  display: none !important;
}
  `);

  // Apply on dialog open (and a delayed pass after HireHop finishes filling fields)
  $(document).on("dialogopen", "#edit_dialog.custom_projEditFrame", function () {
    var $dlg = $(this);
    setTimeout(function () { apply($dlg); }, 0);
    setTimeout(function () { apply($dlg); }, 220);
  });

  function apply($dlg) {
    if (!$dlg || !$dlg.length) return;

    var $wrapper = $dlg.closest(".ui-dialog");
    if (!$wrapper.hasClass("wise-projedit-dialog")) $wrapper.addClass("wise-projedit-dialog");

    var $form = $dlg.find("form").first();
    if (!$form.length) return;

    // Find the HireHop widget instance if present (gives reliable section handles)
    var inst = getProjectEditInstance($dlg);

    // Build root layout once (idempotent)
    var $root = $form.find(".wise-projedit-root").first();
    if (!$root.length) {
      $root = $('<div class="wise-projedit-root"></div>');
      $form.prepend($root);

      // Subtitle bar (empty except actions)
      $root.append(
        '<div class="wise-projedit-subbar"><div class="wise-projedit-actions"></div></div>'
      );

      // Sections
      $root.append(section("Salesforce", "salesforce"));
      $root.append(section("People", "people"));
      $root.append(section("HireHop", "hirehop"));
    }

    // Always ensure "delivery only" mode & hide unwanted contact rows
    // (do this before moving, so any mode toggles don’t fight you)
    hideRowByDataField($dlg, "TELEPHONE");
    hideRowByDataField($dlg, "MOBILE");
    hideRowByDataField($dlg, "EMAIL");
    hideRowContainingButtonText($dlg, "Add to address book");

    forceDeliveryOnlyKeepAddress($dlg);
    hideTelephoneRow($dlg);
    blankNALabels($dlg);

    // Put Save/Cancel into the subtitle bar
    moveSaveCancelIntoSubbar($dlg, $wrapper, $root);

    // Rearrange fields into sections (safe row moves only)
    rearrangeFields($dlg, inst, $root);

    // Hide old containers (so nothing "floats" underneath)
    hideOldLayout(inst, $dlg);
  }

  // -----------------------------
  // Layout builders
  // -----------------------------
  function section(title, key) {
    return (
      '<div class="wise-projedit-section" data-wise-section="' + key + '">' +
        '<div class="wise-projedit-section-title">' + escapeHtml(title) + "</div>" +
        '<div class="wise-projedit-section-body">' +
          '<table class="wise-projedit-table"><tbody></tbody></table>' +
        "</div>" +
      "</div>"
    );
  }

  function rearrangeFields($dlg, inst, $root) {
    var $sfTable = $root.find('[data-wise-section="salesforce"] .wise-projedit-table tbody').first();
    var $peTable = $root.find('[data-wise-section="people"] .wise-projedit-table tbody').first();
    var $hhTable = $root.find('[data-wise-section="hirehop"] .wise-projedit-table tbody').first();

    // Prevent duplicates if apply() runs twice
    // (If rows are already in our tables, do nothing)
    moveTrByField($dlg, inst && inst.fields ? inst.fields : $dlg, "COMPANY", $sfTable);       // Wise Job Number
    moveTrByField($dlg, inst && inst.client_section ? inst.client_section : $dlg, "ADDRESS", $sfTable); // Client
    moveTrByField($dlg, inst && inst.fields ? inst.fields : $dlg, "PROJECT_NAME", $sfTable); // Project name
    moveTrByField($dlg, inst && inst.delivery_section ? inst.delivery_section : $dlg, "DELIVER_TO", $sfTable); // Venue
    moveTrByField($dlg, inst && inst.delivery_section ? inst.delivery_section : $dlg, "DELIVERY_ADDRESS", $sfTable); // Delivery address
    moveTrByField($dlg, inst && inst.fields ? inst.fields : $dlg, "JOB_TYPE", $sfTable);     // Project type
    moveTrByField($dlg, inst && inst.details_section ? inst.details_section : $dlg, "DETAILS", $sfTable); // Memo/Details

    // People: Project Manager (NAME)
    moveTrByField($dlg, inst && inst.client_section ? inst.client_section : $dlg, "NAME", $peTable);

    // HireHop: Warehouse, Dates, Status
    moveTrByField($dlg, inst && inst.fields ? inst.fields : $dlg, "DEPOT_ID", $hhTable);     // Warehouse Name
    moveDateRows($dlg, inst && inst.dates_section ? inst.dates_section : $dlg, $hhTable);    // Prep/Start/Finish/De-prep etc
    moveTrByField($dlg, inst && inst.fields ? inst.fields : $dlg, "STATUS", $hhTable);      // Status

    // Custom fields: move the container (NOT a parent) into Salesforce section, below the table
    var $sfBody = $root.find('[data-wise-section="salesforce"] .wise-projedit-section-body').first();
    var $existingCFWrap = $sfBody.find(".wise-projedit-customfields").first();

    if (!$existingCFWrap.length) {
      $existingCFWrap = $('<div class="wise-projedit-customfields"><div class="wise-projedit-customfields-title">Custom fields</div></div>');
      $sfBody.append($existingCFWrap);
    }

    var $cf = (inst && inst.custom_fields_container && inst.custom_fields_container.length)
      ? inst.custom_fields_container
      : $dlg.find(".hh_custom_fields").first();

    if ($cf.length && !$cf.closest(".wise-projedit-customfields").length) {
      $existingCFWrap.append($cf.detach().show());
    }
  }

  function moveSaveCancelIntoSubbar($dlg, $wrapper, $root) {
    var $actions = $root.find(".wise-projedit-actions").first();
    if (!$actions.length) return;

    // If already moved, stop
    if ($actions.data("wiseButtonsMoved")) return;

    // Search both inside content and the dialog wrapper (button panes often live outside content)
    var $scope = $dlg.add($wrapper);

    var $save = findActionButton($scope, /\bsave\b/i);
    var $cancel = findActionButton($scope, /\bcancel\b/i);

    // If we found neither, do nothing (keeps default layout)
    if (!$save.length && !$cancel.length) return;

    // Move them (preserves event handlers)
    if ($cancel.length) {
      $cancel = $cancel.first().detach();
      normaliseButton($cancel, "wise-btn wise-btn-cancel");
      $actions.append($cancel);
    }
    if ($save.length) {
      $save = $save.first().detach();
      normaliseButton($save, "wise-btn wise-btn-save");
      $actions.append($save);
    }

    $actions.data("wiseButtonsMoved", true);
  }

  // -----------------------------
  // Old layout hiding
  // -----------------------------
  function hideOldLayout(inst, $dlg) {
    // Hide known containers if we can, to stop “floating” leftovers
    if (inst) {
      safeHide(inst.client_section);
      safeHide(inst.delivery_section);
      safeHide(inst.details_section);
      safeHide(inst.dates_section);
      safeHide(inst.fields);
      safeHide(inst.bottom_section);
      // We do NOT hide custom_fields_container (we moved it), but hide its old section wrapper if present:
      safeHide(inst.custom_fields_section);
    } else {
      // Fallback: hide common containers by id/class if present
      $dlg.find("#proj_fields").addClass("wise-projedit-hidden");
    }
  }

  function safeHide($el) {
    if ($el && $el.length) $el.addClass("wise-projedit-hidden");
  }

  // -----------------------------
  // Helpers: moving rows safely
  // -----------------------------
  function moveTrByField($dlg, $scope, dataField, $targetTbody) {
    if (!$targetTbody || !$targetTbody.length) return;

    var $row = findRowByDataField($scope, dataField);
    if (!$row.length) $row = findRowByDataField($dlg, dataField);
    if (!$row.length) return;

    // If it’s already in our target table, leave it
    if ($row.closest("table").hasClass("wise-projedit-table")) return;

    $row.show();
    $targetTbody.append($row.detach());
  }

  function findRowByDataField($scope, dataField) {
    var $el = $scope.find('[data-field="' + dataField + '"]').first();
    if (!$el.length) return $();
    return $el.closest("tr");
  }

  function moveDateRows($dlg, $scope, $targetTbody) {
    var $rows = $scope.find("input.hh_date, input.hasDatepicker").map(function () {
      return $(this).closest("tr")[0];
    }).get();

    // De-dupe while preserving order
    var seen = new Set();
    $rows.forEach(function (tr) {
      if (!tr || seen.has(tr)) return;
      seen.add(tr);

      var $tr = $(tr);
      if ($tr.closest("table").hasClass("wise-projedit-table")) return;

      $targetTbody.append($tr.detach().show());
    });

    // If dates live elsewhere, try a global grab
    if (!seen.size) {
      $dlg.find("input.hh_date, input.hasDatepicker").each(function () {
        var $tr = $(this).closest("tr");
        if (!$tr.length) return;
        if ($tr.closest("table").hasClass("wise-projedit-table")) return;
        $targetTbody.append($tr.detach().show());
      });
    }
  }

  // -----------------------------
  // Your previous behaviour (keep)
  // -----------------------------
  function hideRowByDataField($root, field) {
    $root.find('[data-field="' + field + '"]').each(function () {
      var $tr = $(this).closest("tr");
      if ($tr.length) $tr.hide();
    });
  }

  function hideRowContainingButtonText($root, text) {
    $root.find("button").each(function () {
      if ($(this).text().trim() === text) {
        var $tr = $(this).closest("tr");
        if ($tr.length) $tr.hide();
      }
    });
  }

  function forceDeliveryOnlyKeepAddress($root) {
    $root.find(".name_container input.delivery").show();
    $root.find(".name_container input.use_at, .name_container input.collection").hide();

    $root.find(".address_container textarea.delivery").show();
    $root.find(".address_container textarea.use_at, .address_container textarea.collection").hide();

    $root.find(".telephone_container input.delivery").show();
    $root.find(".telephone_container input.use_at, .telephone_container input.collection").hide();

    $root.find(".label_container .label.use_at, .label_container .label.collection").hide();
    $root.find(".label_container .label.delivery").show();

    $root.find(".label_container .label")
      .addClass("ui-state-disabled")
      .removeClass("ui-state-selected");

    $root.find(".label_container .label.delivery")
      .removeClass("ui-state-disabled")
      .addClass("ui-state-selected");

    $root.find(".delivery_label").text("Deliver to");
  }

  function hideTelephoneRow($root) {
    var $telContainer = $root.find(".telephone_container").first();
    if ($telContainer.length) {
      var $tr = $telContainer.closest("tr");
      if ($tr.length) $tr.hide();
    }
  }

  function blankNALabels($root) {
    $root.find("td.label").each(function () {
      var raw = $(this).text().trim().toLowerCase();
      var compact = raw.replace(/\s+/g, "");
      if (/^(n\/a)+$/.test(compact) || compact === "n/a") $(this).text("");
    });
  }

  // -----------------------------
  // Widget instance finder (key fix)
  // -----------------------------
  function getProjectEditInstance($dlg) {
    try {
      var data = $dlg.data() || {};
      var keys = Object.keys(data);
      // HireHop widget is custom.project_edit -> data key usually "custom-project_edit"
      var k = keys.find(function (x) { return x.indexOf("custom-project_edit") === 0; });
      return k ? data[k] : null;
    } catch (e) {
      return null;
    }
  }

  // -----------------------------
  // Action button helpers
  // -----------------------------
  function findActionButton($scope, re) {
    var $c = $scope.find("button, input[type='button'], input[type='submit'], a").filter(function () {
      var $el = $(this);

      // Ignore titlebar controls
      if ($el.closest(".ui-dialog-titlebar").length) return false;

      // Ignore picklist dialogs (avoid grabbing "Insert"/"Close" etc)
      if ($el.closest(".ui-jqdialog, .ui-jqgrid, .ui-dialog").not($el.closest("#edit_dialog").closest(".ui-dialog")).length) {
        // keep it simple: if it’s in a different dialog, ignore
        return false;
      }

      var t = $el.is("input") ? $el.val() : $el.text();
      t = String(t || "").trim();
      return re.test(t);
    });

    // Prefer visible
    var $v = $c.filter(":visible");
    return $v.length ? $v : $c;
  }

  function normaliseButton($el, cls) {
    if (!$el || !$el.length) return;

    // If it’s an <a>, make it button-like without breaking click
    if ($el.is("a")) {
      $el.attr("role", "button");
    }
    $el.removeAttr("style"); // remove any inline float positioning from old layout
    $el.addClass(cls);
  }

  // -----------------------------
  // Utility
  // -----------------------------
  function injectCSS(cssText) {
    var id = "wise-projedit-css-v1";
    if (document.getElementById(id)) return;
    var style = document.createElement("style");
    style.id = id;
    style.type = "text/css";
    style.appendChild(document.createTextNode(cssText));
    document.head.appendChild(style);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
})();
