(function () {
  "use strict";

  // ============================================================
  // Wise HireHop plugin — Project Edit dialog tidy + theme
  // ============================================================

  // ===== PROOF OF LIFE (VISIBLE + CONSOLE + GLOBAL FLAG) =====
  (function proofOfLife() {
    window.__WISE_PLUGIN_LOADED__ = (window.__WISE_PLUGIN_LOADED__ || 0) + 1;

    try {
      console.warn(
        "[WiseHireHop] plugin executed",
        window.__WISE_PLUGIN_LOADED__,
        location.href
      );
    } catch (e) {}

    function addBadge() {
      if (document.getElementById("wise-plugin-badge")) return;
      var b = document.createElement("div");
      b.id = "wise-plugin-badge";
      b.textContent = "Wise plugin loaded (v2)";
      b.style.cssText =
        "position:fixed;top:8px;left:8px;z-index:2147483647;" +
        "background:#0B1B2B;color:#F6F2EA;padding:6px 10px;border-radius:10px;" +
        "font:12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial;";
      (document.body || document.documentElement).appendChild(b);
      setTimeout(function () {
        try { b.remove(); } catch (e) {}
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

  // ------------------------------------------------------------
  // Guards
  // ------------------------------------------------------------
  if (typeof user === "undefined") return;
  if (!location.pathname.endsWith("/project.php")) return;

  if (typeof window.jQuery === "undefined" || typeof window.$ === "undefined") {
    try { console.warn("[WiseHireHop] jQuery not ready - abort"); } catch (e) {}
    return;
  }

  document.documentElement.classList.add("wise-theme");

  // ------------------------------------------------------------
  // CSS injection
  // ------------------------------------------------------------
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
`);

  // ------------------------------------------------------------
  // Main hook: dialog open
  // ------------------------------------------------------------
  $(document).on("dialogopen", ".ui-dialog-content", function () {
    var $content = $(this);

    // The project edit dialog content is usually an iframe with this id/class
    if (!$content.is("#edit_dialog.custom_projEditFrame")) return;

    // Style wrapper (titlebar sits outside iframe)
    var $wrapper = $content.closest(".ui-dialog");
    if (!$wrapper.hasClass("wise-proj-edit-dialog")) {
      $wrapper.addClass("wise-proj-edit-dialog");
    }

    // Apply rules inside iframe DOM
    applyRulesWithinDialogContent($content);
  });

  // ============================================================
  // Core: apply rules inside iframe (or direct DOM fallback)
  // ============================================================
  function applyRulesWithinDialogContent($dialogContent) {
    var el = $dialogContent.get(0);
    var iframe = null;

    if (el && el.tagName && el.tagName.toUpperCase() === "IFRAME") {
      iframe = el;
    } else {
      // Fallback: look for an iframe inside the content
      iframe = $dialogContent.find("iframe").get(0);
    }

    if (!iframe) {
      // Non-iframe case (rare): apply directly
      try { console.warn("[WiseHireHop] No iframe found; applying directly"); } catch (e) {}
      applyProjectEditRules($dialogContent);
      return;
    }

    // Wait until iframe document is ready, then apply
    waitForIframeReady(iframe, function ($root) {
      applyProjectEditRules($root);
    });
  }

  function waitForIframeReady(iframe, cb) {
    var tries = 0;
    var maxTries = 40;      // ~4s at 100ms
    var intervalMs = 100;

    function attempt() {
      tries++;

      var doc = null;
      try {
        doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      } catch (e) {
        doc = null;
      }

      if (doc && doc.body) {
        var $root = $(doc);

        // Optional: ensure some expected structure exists before applying
        // If it doesn't exist yet, keep waiting a bit.
        var hasAnyDataFields = $root.find("[data-field]").length > 0;
        var hasEditDialog = $root.find("#edit_dialog").length > 0 || true; // doc itself may be the frame

        if (hasEditDialog) {
          try {
            console.warn(
              "[WiseHireHop] iframe ready; data-field count:",
              $root.find("[data-field]").length
            );
          } catch (e) {}
          cb($root);

          // Re-apply shortly after in case HireHop hydrates/rewrites the DOM after open
          setTimeout(function () { cb($root); }, 200);
          setTimeout(function () { cb($root); }, 800);

          return true;
        }
      }

      if (tries >= maxTries) {
        try { console.warn("[WiseHireHop] iframe not ready after retries"); } catch (e) {}
        return false;
      }

      setTimeout(attempt, intervalMs);
      return false;
    }

    attempt();
  }

  // ============================================================
  // Rules (run INSIDE the iframe document)
  // Pass in $root = $(iframeDocument)
  // ============================================================
  function applyProjectEditRules($rootDoc) {
    // Work against the iframe's body
    var $root = $rootDoc.find("body").length ? $rootDoc.find("body") : $rootDoc;

    // -----------------------------
    // KILL: client contact rows
    // -----------------------------
    hideRowByDataField($root, "TELEPHONE");
    hideRowByDataField($root, "MOBILE");
    hideRowByDataField($root, "EMAIL");
    hideRowContainingButtonText($root, "Add to address book");

    // -----------------------------
    // KEEP: Deliver to + Delivery address ONLY
    // -----------------------------
    forceDeliveryOnlyKeepAddress($root);

    // -----------------------------
    // KILL: Delivery phone number row
    // -----------------------------
    hideDeliveryTelephoneRow($root);

    // Cosmetic
    blankNALabels($root);

    // Logging: prove we actually found fields
    try {
      console.warn(
        "[WiseHireHop] Applied rules. Visible TELEPHONE fields now:",
        $root.find('[data-field="TELEPHONE"]:visible').length,
        "DELIVERY_TELEPHONE now:",
        $root.find('[data-field="DELIVERY_TELEPHONE"]:visible').length
      );
    } catch (e) {}
  }

  // ============================================================
  // Helpers
  // ============================================================
  function hideRowByDataField($root, field) {
    var $hits = $root.find('[data-field="' + field + '"]');
    $hits.each(function () {
      var $tr = $(this).closest("tr");
      if ($tr.length) $tr.hide();
    });
  }

  function hideRowContainingButtonText($root, text) {
    $root.find("button").each(function () {
      var btnText = $(this).text().trim();
      if (btnText === text) {
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

    $root
      .find(".label_container .label")
      .addClass("ui-state-disabled")
      .removeClass("ui-state-selected");

    $root
      .find(".label_container .label.delivery")
      .removeClass("ui-state-disabled")
      .addClass("ui-state-selected");

    $root.find(".delivery_label").text("Deliver to");
  }

  function hideDeliveryTelephoneRow($root) {
    var $anyPhoneInRow = $root
      .find('[data-field="DELIVERY_TELEPHONE"]').first()
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
      var t = $(this).text().trim().toLowerCase();
      if (t === "n/a") $(this).text("");
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
