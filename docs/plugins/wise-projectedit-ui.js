(function () {
  "use strict";

  // Basic guards: only run when logged in and on project page
  if (typeof window.user === "undefined") return;
  if (location.pathname !== "/project.php") return;

  // Add a stable class to scope any future CSS
  document.documentElement.classList.add("wise-theme");

  injectCSS(`
/* ------------------------------
   Wise: Project Edit Dialog
   ------------------------------ */

.wise-theme .wise-proj-edit-dialog{
  border-radius: 12px;
  overflow: hidden;
}

.wise-theme .wise-proj-edit-dialog .ui-dialog-titlebar{
  background: #0B1B2B;
  border: none;
  color: #F6F2EA;
}

.wise-theme .wise-proj-edit-dialog .ui-dialog-titlebar .ui-dialog-title{
  color: #F6F2EA;
}

.wise-theme .wise-proj-edit-dialog .ui-dialog-titlebar .ui-dialog-titlebar-close{
  background: transparent;
  border: none;
}

.wise-theme .wise-proj-edit-dialog .ui-dialog-content{
  border: none;
  background: #F6F2EA;
}

.wise-theme .wise-proj-edit-dialog input.data_cell,
.wise-theme .wise-proj-edit-dialog textarea.data_cell,
.wise-theme .wise-proj-edit-dialog select.data_cell{
  border-radius: 10px;
  border: 1px solid rgba(17,24,39,.18);
  padding: 6px 8px;
  background: #fff;
}

.wise-theme .wise-proj-edit-dialog td.label{
  font-weight: 600;
}

.wise-theme .wise-proj-edit-dialog .redborder{
  outline: 2px solid rgba(200, 30, 60, 0.35);
}

/* Optional: soften hard divider borders inside the dialog */
.wise-theme .wise-proj-edit-dialog [style*="border-top:1px solid #a1a1a1"]{
  border-top: 1px solid rgba(17,24,39,.18) !important;
}
.wise-theme .wise-proj-edit-dialog [style*="border-left:1px solid #a1a1a1"]{
  border-left: 1px solid rgba(17,24,39,.18) !important;
}
.wise-theme .wise-proj-edit-dialog [style*="border-right:1px solid #a1a1a1"]{
  border-right: 1px solid rgba(17,24,39,.18) !important;
}
`);

  // Run each time the HireHop jQuery UI dialog opens
  $(document).on("dialogopen", ".ui-dialog-content", function () {
    const $content = $(this);

    // Project edit popup instance (HireHop uses this id + class for project edit)
    if (!$content.is("#edit_dialog.custom_projEditFrame")) return;

    // Titlebar sits outside #edit_dialog, so style the wrapper dialog element
    const $wrapper = $content.closest(".ui-dialog");
    if (!$wrapper.hasClass("wise-proj-edit-dialog")) {
      $wrapper.addClass("wise-proj-edit-dialog");
    }

    // -----------------------------
    // KILL: client contact rows
    // -----------------------------
    hideRowByDataField($content, "TELEPHONE");
    hideRowByDataField($content, "MOBILE");
    hideRowByDataField($content, "EMAIL");
    hideRowContainingButtonText($content, "Add to address book");

    // -----------------------------
    // KEEP: Deliver to + Delivery address ONLY
    // -----------------------------
    forceDeliveryOnlyKeepAddress($content);

    // -----------------------------
    // KILL: Delivery phone number row (whole telephone row in delivery section)
    // -----------------------------
    hideDeliveryTelephoneRow($content);

    // Cosmetic: remove visible "n/a" labels
    blankNALabels($content);

    // Proof-of-life (useful while testing; remove once happy)
    console.info("[WiseHireHop] Applied project edit UI rules");
  });

  // ---------------- helpers ----------------

  function hideRowByDataField($root, field) {
    $root.find(`[data-field="${field}"]`).each(function () {
      const $tr = $(this).closest("tr");
      if ($tr.length) $tr.hide();
    });
  }

  function hideRowContainingButtonText($root, text) {
    $root.find("button").each(function () {
      const btnText = $(this).text().trim();
      if (btnText === text) {
        const $tr = $(this).closest("tr");
        if ($tr.length) $tr.hide();
      }
    });
  }

  function forceDeliveryOnlyKeepAddress($root) {
    // Name line: keep DELIVER_TO only
    $root.find(".name_container input.delivery").show();
    $root.find(".name_container input.use_at, .name_container input.collection").hide();

    // Address block: keep delivery address only
    $root.find(".address_container textarea.delivery").show();
    $root.find(".address_container textarea.use_at, .address_container textarea.collection").hide();

    // Telephone block: we will kill the whole row later, but keep state consistent
    $root.find(".telephone_container input.delivery").show();
    $root.find(".telephone_container input.use_at, .telephone_container input.collection").hide();

    // Hide mode switchers for use_at/collection; keep delivery visible
    $root.find(".label_container .label.use_at, .label_container .label.collection").hide();
    $root.find(".label_container .label.delivery").show();

    // Ensure selected state looks correct
    $root
      .find(".label_container .label")
      .addClass("ui-state-disabled")
      .removeClass("ui-state-selected");

    $root
      .find(".label_container .label.delivery")
      .removeClass("ui-state-disabled")
      .addClass("ui-state-selected");

    // Ensure the left-hand heading reads "Deliver to"
    $root.find(".delivery_label").text("Deliver to");
  }

  function hideDeliveryTelephoneRow($root) {
    // In the rendered HTML, the delivery/use_at/collection telephone inputs live in one <tr>.
    // Hiding the <tr> removes the phone fields without affecting the delivery address block.
    const $anyPhoneInRow =
      $root.find(`[data-field="DELIVERY_TELEPHONE"]`).first()
        .add($root.find(`[data-field="USE_AT_TELEPHONE"]`).first())
        .add($root.find(`[data-field="COLLECTION_TELEPHONE"]`).first())
        .filter(":first");

    if ($anyPhoneInRow.length) {
      const $tr = $anyPhoneInRow.closest("tr");
      if ($tr.length) $tr.hide();
    }
  }

  function blankNALabels($root) {
    $root.find("td.label").each(function () {
      const t = $(this).text().trim().toLowerCase();
      if (t === "n/a") $(this).text("");
    });
  }

  function injectCSS(cssText) {
    const id = "wise-proj-edit-css";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.type = "text/css";
    style.appendChild(document.createTextNode(cssText));
    document.head.appendChild(style);
  }
})();
