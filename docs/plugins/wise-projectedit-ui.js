(function () {
  "use strict";

  // ---- proof of life (console only; remove if you want) ----
  try { console.warn("[WiseHireHop] project edit layout plugin loaded"); } catch (e) {}

  var $ = window.jQuery;
  if (!$) return;

  // Only on the project page
  if (!/\/project\.php(\?|$)/.test(location.pathname)) return;

  // Debounced apply (because HireHop can re-render parts of the dialog)
  var applyTimer = null;
  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(function () {
      var $dlg = $("#edit_dialog.custom_projEditFrame:visible");
      if ($dlg.length) applyToProjectEditDialog($dlg);
    }, 50);
  }

  // Primary hook (when the dialog opens)
  $(document).on("dialogopen", "#edit_dialog.custom_projEditFrame", function () {
    applyToProjectEditDialog($(this));
  });

  // Fallback hook (covers cases where dialogopen isn’t fired / late DOM updates)
  var obs = new MutationObserver(function () {
    scheduleApply();
  });
  obs.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "style"]
  });

  // Initial attempt after load
  $(scheduleApply);

  // -------------------------
  // Main apply
  // -------------------------
  function applyToProjectEditDialog($dlg) {
    if (!$dlg || !$dlg.length) return;

    // Idempotency markers: remove our previous section rows so re-apply is safe
    var $table = findMainTable($dlg);
    if ($table && $table.length) {
      $table.find("tr.wise-group-row, tr.wise-custom-fields-row").remove();
    }

    // 1) Hide unwanted contact rows (these are your “kill” fields)
    hideRowByDataField($dlg, "TELEPHONE");
    hideRowByDataField($dlg, "MOBILE");
    hideRowByDataField($dlg, "EMAIL");
    hideRowContainingButtonText($dlg, "Add to address book");

    // 2) Force delivery only (keeps delivery address; hides use_at/collection)
    forceDeliveryOnlyKeepAddress($dlg);

    // 3) Kill delivery phone number row
    hideDeliveryTelephoneRow($dlg);

    // 4) Clean up visible n/a labels (including the repeated n/an/an/a case)
    blankNALabels($dlg);

    // 5) Rearrange into sections (without CSS)
    rearrangeIntoSections($dlg);

    try { console.info("[WiseHireHop] Project edit layout applied"); } catch (e) {}
  }

  // -------------------------
  // Rearrangement
  // -------------------------
  function rearrangeIntoSections($dlg) {
    var $table = findMainTable($dlg);
    if (!$table || !$table.length) return;

    // Collect the rows we want to manage
    var $rProjectManager  = rowByDataField($dlg, "NAME");            // your “Project Manager”
    var $rWiseJobNumber   = rowByDataField($dlg, "COMPANY");         // your “Wise Job Number”
    var $rClient          = rowByDataField($dlg, "ADDRESS");         // your “Client”
    var $rProjectType     = rowByDataField($dlg, "JOB_TYPE");
    var $rProjectName     = rowByDataField($dlg, "PROJECT_NAME");
    var $rWarehouseName   = rowByDataField($dlg, "DEPOT_ID");
    var $rMemo            = rowByDataField($dlg, "DETAILS");
    var $rVenue           = rowByDataField($dlg, "DELIVER_TO");      // your “Venue”
    var $rDeliveryAddress = rowByDataField($dlg, "DELIVERY_ADDRESS");
    var $rStatus          = rowByDataField($dlg, "STATUS");

    // Date/time rows (no data-field). Keep in the order you showed.
    var $rPrep            = rowByLabelText($dlg, "Prep");
    var $rInstallStart    = rowByLabelText($dlg, "Job/Install Start");
    var $rRemovalFinish   = rowByLabelText($dlg, "Job/Removal Finish");
    var $rDePreppedBy     = rowByLabelText($dlg, "De-Prepped By");

    // Build new section header rows (no CSS; uses existing table structure)
    var nodes = [];

    // --- Project information ---
    nodes.push(groupRow("Project information")[0]);
    pushIfRow(nodes, $rWiseJobNumber);
    pushIfRow(nodes, $rClient);
    pushIfRow(nodes, $rProjectName);
    pushIfRow(nodes, $rVenue);
    pushIfRow(nodes, $rDeliveryAddress);
    pushIfRow(nodes, $rMemo);
    pushIfRow(nodes, $rProjectType);

    // Custom fields (move the whole section into a placeholder table row if present)
    var $customFieldsSection = findCustomFieldsSection($dlg);
    if ($customFieldsSection && $customFieldsSection.length) {
      var $cfRow = customFieldsRow("Custom fields");
      // Detach and place into the right-hand cell to keep layout consistent
      $cfRow.find("td").last().append($customFieldsSection.detach());
      nodes.push($cfRow[0]);
    }

    // --- People assigned ---
    nodes.push(groupRow("People assigned")[0]);
    pushIfRow(nodes, $rProjectManager);

    // --- HireHop information ---
    nodes.push(groupRow("HireHop information")[0]);
    pushIfRow(nodes, $rWarehouseName);
    pushIfRow(nodes, $rPrep);
    pushIfRow(nodes, $rInstallStart);
    pushIfRow(nodes, $rRemovalFinish);
    pushIfRow(nodes, $rDePreppedBy);
    pushIfRow(nodes, $rStatus);

    // Insert at the top of the table (keeps all existing styling)
    var $firstRow = $table.find("tr").first();
    if ($firstRow.length) {
      $(nodes).insertBefore($firstRow);
    } else {
      $table.append(nodes);
    }
  }

  function pushIfRow(arr, $row) {
    if ($row && $row.length) arr.push($row.detach()[0]);
  }

  function groupRow(title) {
    var $tr = $('<tr class="wise-group-row"></tr>');
    $tr.append('<td class="label">' + escapeHtml(title) + "</td>");
    $tr.append("<td></td>");
    return $tr;
  }

  function customFieldsRow(title) {
    var $tr = $('<tr class="wise-custom-fields-row"></tr>');
    $tr.append('<td class="label">' + escapeHtml(title) + "</td>");
    $tr.append("<td></td>");
    return $tr;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function findMainTable($dlg) {
    // Prefer the table containing one of our known fields
    var $seed = $dlg.find('[data-field="PROJECT_NAME"]').first();
    if (!$seed.length) $seed = $dlg.find('[data-field="COMPANY"]').first();
    if (!$seed.length) $seed = $dlg.find("input.hh_date").first();
    var $table = $seed.length ? $seed.closest("table") : $dlg.find("table").first();
    return $table;
  }

  function rowByDataField($root, field) {
    return $root.find('[data-field="' + field + '"]').first().closest("tr");
  }

  function rowByLabelText($root, labelText) {
    var wanted = String(labelText || "").trim().toLowerCase();
    if (!wanted) return $();

    var $found = $();
    $root.find("tr").each(function () {
      var $tr = $(this);
      var label = $tr.find("td.label").first().text().trim().toLowerCase();
      if (label === wanted) {
        $found = $tr;
        return false; // break
      }
    });
    return $found;
  }

  function findCustomFieldsSection($dlg) {
    // Locate the custom fields container, then lift the nearest “section” wrapper
    var $cf = $dlg.find(".hh_custom_fields").first();
    if (!$cf.length) return $();

    // Walk up until we reach something that’s a direct-ish block inside the dialog,
    // but stop before we hit the dialog root.
    var $cur = $cf;
    for (var i = 0; i < 6; i++) {
      var $p = $cur.parent();
      if (!$p.length) break;
      if ($p.is("#edit_dialog") || $p.is(".ui-dialog-content")) break;
      $cur = $p;
    }
    return $cur;
  }

  // -------------------------
  // Existing behaviour (hide / force delivery)
  // -------------------------
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
    // Keep delivery; hide use_at + collection controls
    $root.find(".name_container input.delivery").show();
    $root.find(".name_container input.use_at, .name_container input.collection").hide();

    $root.find(".address_container textarea.delivery").show();
    $root.find(".address_container textarea.use_at, .address_container textarea.collection").hide();

    $root.find(".telephone_container input.delivery").show();
    $root.find(".telephone_container input.use_at, .telephone_container input.collection").hide();

    $root.find(".label_container .label.use_at, .label_container .label.collection").hide();
    $root.find(".label_container .label.delivery").show();

    // Keep selected state consistent (no styling changes; just state classes HireHop already uses)
    $root.find(".label_container .label")
      .addClass("ui-state-disabled")
      .removeClass("ui-state-selected");

    $root.find(".label_container .label.delivery")
      .removeClass("ui-state-disabled")
      .addClass("ui-state-selected");

    // Don’t rename labels here (leave your current wording alone)
  }

  function hideDeliveryTelephoneRow($root) {
    // Hide the whole row containing the delivery telephone input
    var $deliveryPhone = $root.find('[data-field="DELIVERY_TELEPHONE"]').first();
    if ($deliveryPhone.length) {
      var $tr = $deliveryPhone.closest("tr");
      if ($tr.length) $tr.hide();
    }
  }

  function blankNALabels($root) {
    $root.find("td.label").each(function () {
      var raw = $(this).text().trim().toLowerCase();
      var compact = raw.replace(/\s+/g, "");
      // Matches: "n/a" or "n/an/an/a" etc
      if (/^(n\/a)+$/.test(compact) || compact === "n/a") {
        $(this).text("");
      }
    });
  }
})();
