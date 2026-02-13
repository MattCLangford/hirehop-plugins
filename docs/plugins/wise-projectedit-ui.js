(function () {
  "use strict";

  var $ = window.jQuery;
  if (!$) return;

  try { console.warn("[WiseHireHop] project edit layout plugin loaded"); } catch (e) {}

  // Only run on project page
  if (!/\/project\.php(\?|$)/.test(location.pathname)) return;

  // Apply when the project edit dialog opens (run twice: immediate + after HireHop fill)
  $(document).on("dialogopen", "#edit_dialog.custom_projEditFrame", function () {
    var $dlg = $(this);
    setTimeout(function () { safeApply($dlg); }, 0);
    setTimeout(function () { safeApply($dlg); }, 250);
  });

  function safeApply($dlg) {
    try {
      applyToProjectEditDialog($dlg);
    } catch (err) {
      try { console.error("[WiseHireHop] apply failed:", err); } catch (e) {}
    }
  }

  function applyToProjectEditDialog($dlg) {
    if (!$dlg || !$dlg.length) return;

    var $table = findMainTable($dlg);
    if (!$table.length) return;

    // Remove our previous inserted section rows (idempotent)
    $table.find("tr.wise-group-row, tr.wise-custom-fields-row").remove();

    // -----------------------------
    // Hide unused fields (your “kill” list)
    // -----------------------------
    hideRowByDataFieldOrName($dlg, "TELEPHONE", "telephone");
    hideRowByDataFieldOrName($dlg, "MOBILE", "mobile");
    hideRowByDataFieldOrName($dlg, "EMAIL", "email");
    hideRowContainingButtonText($dlg, "Add to address book");

    // -----------------------------
    // Force Deliver To mode (keep delivery address; hide use_at/collection)
    // -----------------------------
    forceDeliveryOnlyKeepAddress($dlg);

    // -----------------------------
    // Kill delivery phone row (hide the whole telephone row)
    // -----------------------------
    hideTelephoneRow($dlg);

    // Cosmetic: remove visible n/a labels (including n/an/an/a)
    blankNALabels($dlg);

    // -----------------------------
    // Rearrange into sections (no style changes)
    // -----------------------------
    rearrangeIntoSections($dlg, $table);

    try { console.info("[WiseHireHop] Project edit layout applied"); } catch (e) {}
  }

  // -------------------------
  // Rearrangement
  // -------------------------
  function rearrangeIntoSections($dlg, $table) {
    var nodes = [];

    // Section: Project information
    nodes.push(groupRow("Project information")[0]);

    pushRow(nodes, rowByDataField($dlg, "COMPANY"));        // Wise Job Number (your relabel)
    pushRow(nodes, rowByDataField($dlg, "ADDRESS"));        // Client
    pushRow(nodes, rowByDataField($dlg, "PROJECT_NAME"));   // Project name
    pushRow(nodes, rowByDataField($dlg, "DELIVER_TO"));     // Venue
    pushRow(nodes, rowByDataField($dlg, "DELIVERY_ADDRESS"));
    pushRow(nodes, rowByDataField($dlg, "DETAILS"));        // Memo
    pushRow(nodes, rowByDataField($dlg, "JOB_TYPE"));       // Project type

    // Custom fields: move ONLY the hh_custom_fields container (safe, avoids HierarchyRequestError)
    var $cf = $dlg.find(".hh_custom_fields").first();
    if ($cf.length) {
      var $cfRow = customFieldsRow("Custom fields");
      $cfRow.find("td").last().append($cf.detach());
      nodes.push($cfRow[0]);
    }

    // Section: People assigned
    nodes.push(groupRow("People assigned")[0]);
    pushRow(nodes, rowByDataField($dlg, "NAME"));           // Project Manager (your relabel)

    // Section: HireHop information
    nodes.push(groupRow("HireHop information")[0]);
    pushRow(nodes, rowByDataField($dlg, "DEPOT_ID"));       // Warehouse Name
    pushRow(nodes, rowByLabelStartsWith($dlg, "Prep"));
    pushRow(nodes, rowByLabelStartsWith($dlg, "Job/Install Start"));
    pushRow(nodes, rowByLabelStartsWith($dlg, "Job/Removal Finish"));
    pushRow(nodes, rowByLabelStartsWith($dlg, "De-Prepped By"));
    pushRow(nodes, rowByDataField($dlg, "STATUS"));         // Status

    // Prepend at top of the table (jQuery will move existing rows safely)
    $table.prepend(nodes);
  }

  function pushRow(arr, $row) {
    if ($row && $row.length) arr.push($row[0]); // no detach needed; moving happens on insert
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
    // Prefer the table containing known core fields
    var $seed =
      $dlg.find('[data-field="PROJECT_NAME"]').first()
        .add($dlg.find('[data-field="COMPANY"]').first())
        .add($dlg.find("input.hh_date").first())
        .filter(":first");

    if ($seed.length) return $seed.closest("table");
    return $dlg.find("table").first();
  }

  function rowByDataField($root, field) {
    return $root.find('[data-field="' + field + '"]').first().closest("tr");
  }

  function rowByLabelStartsWith($root, labelText) {
    var wanted = normaliseLabel(labelText);
    if (!wanted) return $();

    var $found = $();
    $root.find("tr").each(function () {
      var $tr = $(this);
      var label = normaliseLabel($tr.find("td.label").first().text());
      if (label && label.indexOf(wanted) === 0) {
        $found = $tr;
        return false;
      }
    });
    return $found;
  }

  function normaliseLabel(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/:$/, "")
      .replace(/\s+/g, " ");
  }

  // -------------------------
  // Hide / force delivery helpers
  // -------------------------
  function hideRowByDataFieldOrName($root, dataField, nameAttr) {
    var $targets = $root.find('[data-field="' + dataField + '"]');
    if (!$targets.length && nameAttr) {
      $targets = $root.find('[name="' + nameAttr + '"]');
    }
    $targets.each(function () {
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
})();
