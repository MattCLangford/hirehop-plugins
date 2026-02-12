(function () {
  "use strict";

  var WISE_VERSION = "v2"; // update this text when you bump ?v= and commit

  // =========================
  // PROOF OF LIFE
  // =========================
  (function proofOfLife() {
    window.__WISE_PLUGIN_LOADED__ = (window.__WISE_PLUGIN_LOADED__ || 0) + 1;

    try {
      console.warn(
        "[WiseHireHop] plugin executed",
        "count=" + window.__WISE_PLUGIN_LOADED__,
        "path=" + location.pathname,
        "ver=" + WISE_VERSION
      );
    } catch (e) {}

    function addBadge() {
      if (document.getElementById("wise-plugin-badge")) return;
      var b = document.createElement("div");
      b.id = "wise-plugin-badge";
      b.textContent = "Wise plugin loaded (" + WISE_VERSION + ")";
      b.style.cssText =
        "position:fixed;top:8px;left:8px;z-index:2147483647;" +
        "background:#0B1B2B;color:#F6F2EA;padding:6px 10px;border-radius:10px;" +
        "font:12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial;";
      (document.body || document.documentElement).appendChild(b);
      setTimeout(function () {
        if (b && b.parentNode) b.parentNode.removeChild(b);
      }, 4000);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", addBadge, { once: true });
    } else {
      addBadge();
    }

    try {
      document.documentElement.setAttribute("data-wise-plugin", "loaded");
    } catch (e) {}
  })();

  // =========================
  // GUARDS
  // =========================
  if (typeof user === "undefined") return;
  if (location.pathname !== "/project.php") return;

  document.documentElement.classList.add("wise-theme");

  injectCSS(
    `
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

/* Optional: soften divider borders inside the dialog */
.wise-theme .wise-proj-edit-dialog [style*="border-top:1px solid #a1a1a1"]{
  border-top: 1px solid rgba(17,24,39,.18) !important;
}
.wise-theme .wise-proj-edit-dialog [style*="border-left:1px solid #a1a1a1"]{
  border-left: 1px solid rgba(17,24,39,.18) !important;
}
.wise-theme .wise-proj-edit-dialog [style*="border-right:1px solid #a1a1a1"]{
  border-right: 1px solid rgba(17,24,39,.18) !important;
}
`
  );

  // =========================
  // APPLY LOGIC (NO dialogopen)
  // =========================
  var applyScheduled = false;

  function scheduleApply() {
    if (applyScheduled) return;
    applyScheduled = true;
    (window.requestAnimationFrame || window.setTimeout)(function () {
      applyScheduled = false;
      applyIfProjectEditDialogOpen();
    }, 0);
  }

  function applyIfProjectEditDialogOpen() {
    // Primary target based on your DOM dump
    var $content = window.jQuery
      ? window.jQuery("#edit_dialog.custom_projEditFrame")
      : null;

    if (!$content || !$content.length) return;

    // Consider it "open" if either the content or its wrapper dialog is visible
    var $wrapper = $content.closest(".ui-dialog");
    var isOpen =
      $content.is(":visible") || ($wrapper.length && $wrapper.is(":visible"));

    if (!isOpen) return;

    // Add wrapper class once (titlebar is on wrapper)
    if ($wrapper.length && !$wrapper.hasClass("wise-proj-edit-dialog")) {
      $wrapper.addClass("wise-proj-edit-dialog");
    }

    // Apply rules
    hideRowByDataField($content, "TELEPHONE");
    hideRowByDataField($content, "MOBILE");
    hideRowByDataField($content, "EMAIL");
    hideRowContainingButtonText($content, "Add to address book");

    forceDeliveryOnlyKeepAddress($content);
    hideDeliveryTelephoneRow($content);

    blankNALabels($content);

    try {
      console.info("[WiseHireHop] Applied project edit UI rules", WISE_VERSION);
    } catch (e) {}
  }

  // =========================
  // WATCHERS / TRIGGERS
  // =========================

  // 1) MutationObserver: catches dialog appearing + being shown
  if (typeof MutationObserver !== "undefined") {
    var obs = new MutationObserver(function (mutations) {
      // Any DOM change may indicate the dialog opened, content injected, or display toggled.
      // Throttle to one apply per frame.
      scheduleApply();
    });

    // Observe subtree changes and class/style flips (dialogs often toggle these)
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"]
    });
  }

  // 2) Clicks often precede opening the edit popup
  document.addEventListener(
    "click",
    function () {
      // a tiny delay gives HireHop time to open/toggle the dialog
      setTimeout(scheduleApply, 50);
      setTimeout(scheduleApply, 250);
    },
    true
  );

  // 3) Timed retries on load (covers delayed initialisation)
  setTimeout(scheduleApply, 0);
  setTimeout(scheduleApply, 250);
  setTimeout(scheduleApply, 1000);
  setTimeout(scheduleApply, 2000);

  // =========================
  // HELPERS
  // =========================

  function hideRowByDataField($root, field) {
    $root.find('[data-field="' + field + '"]').each(function () {
      var $tr = window.jQuery(this).closest("tr");
      if ($tr.length) $tr.hide();
    });
  }

  function hideRowContainingButtonText($root, text) {
    $root.find("button").each(function () {
      var btnText = window.jQuery(this).text().trim();
      if (btnText === text) {
        var $tr = window.jQuery(this).closest("tr");
        if ($tr.length) $tr.hide();
      }
    });
  }

  function forceDeliveryOnlyKeepAddress($root) {
    // Name line: keep DELIVER_TO only
    $root.find(".name_container input.delivery").show();
    $root
      .find(".name_container input.use_at, .name_container input.collection")
      .hide();

    // Address block: keep delivery address only
    $root.find(".address_container textarea.delivery").show();
    $root
      .find(
        ".address_container textarea.use_at, .address_container textarea.collection"
      )
      .hide();

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
    // Delivery/use_at/collection telephone inputs live in one <tr> in your DOM dump.
    // Hide that whole row.
    var $anyPhoneInRow = $root
      .find('[data-field="DELIVERY_TELEPHONE"]')
      .first()
      .add($root.find('[data-field="USE_AT_TELEPHONE"]').first())
      .add($root.find('[data-field="COLLECTION_TELEPHONE"]').first())
      .filter(":first");

    if ($anyPhoneInRow.length) {
      var $tr = $anyPhoneInRow.closest("tr");
      if ($tr.length) $tr.hide();
    }
  }

  function blankNALabels($root) {
    $root.find("td.label").each(function () {
      var t = window.jQuery(this).text().trim().toLowerCase();
      if (t === "n/a") window.jQuery(this).text("");
    });
  }

  function injectCSS(cssText) {
    var id = "wise-proj-edit-css";
    if (document.getElementById(id)) return;

    var style = document.createElement("style");
    style.id = id;
    style.type = "text/css";
    style.appendChild(document.createTextNode(cssText));
    document.head.appendChild(style);
  }
})();
