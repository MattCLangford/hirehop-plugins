(function () {
  "use strict";

  // =========================
  // Wise HireHop Project Edit UI Plugin
  // =========================
  var WISE_PLUGIN_VERSION = "v3";

  // Prevent double-init if HireHop loads plugins more than once
  if (window.__WISE_PROJECT_EDIT_PLUGIN_INIT__) return;
  window.__WISE_PROJECT_EDIT_PLUGIN_INIT__ = true;

  // ----- Proof of life (badge + console + DOM marker) -----
  (function proofOfLife() {
    window.__WISE_PLUGIN_LOADED__ = (window.__WISE_PLUGIN_LOADED__ || 0) + 1;

    try {
      console.warn(
        "[WiseHireHop] plugin executed",
        "count=" + window.__WISE_PLUGIN_LOADED__,
        "ver=" + WISE_PLUGIN_VERSION,
        location.href
      );
    } catch (e) {}

    function addBadge() {
      if (document.getElementById("wise-plugin-badge")) return;
      var b = document.createElement("div");
      b.id = "wise-plugin-badge";
      b.textContent = "Wise plugin loaded (" + WISE_PLUGIN_VERSION + ")";
      b.style.cssText =
        "position:fixed;top:8px;left:8px;z-index:2147483647;" +
        "background:#0B1B2B;color:#F6F2EA;padding:6px 10px;border-radius:10px;" +
        "font:12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial;";
      (document.body || document.documentElement).appendChild(b);
      setTimeout(function () {
        try {
          b.remove();
        } catch (e) {}
      }, 2500);
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

  // ----- Boot: wait for jQuery + #edit_dialog to exist -----
  var bootTries = 0;
  (function boot() {
    bootTries++;

    var hasJQ = !!window.jQuery && !!window.jQuery.fn;
    var hasEditDialog = !!document.getElementById("edit_dialog");

    if (hasJQ && hasEditDialog) {
      init();
      return;
    }

    // Keep trying for up to ~10s (200 * 50ms)
    if (bootTries < 200) {
      setTimeout(boot, 50);
    } else {
      try {
        console.warn(
          "[WiseHireHop] init aborted (deps missing)",
          { hasJQ: hasJQ, hasEditDialog: hasEditDialog }
        );
      } catch (e) {}
    }
  })();

  // =========================
  // Init
  // =========================
  function init() {
    var $ = window.jQuery;

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
`
    );

    // Style wrapper when dialog opens + apply rules after HireHop renders
    $(document).on("dialogopen.wise", "#edit_dialog", function () {
      var $content = $(this);
      var $wrapper = $content.closest(".ui-dialog");

      if (!$wrapper.hasClass("wise-proj-edit-dialog")) {
        $wrapper.addClass("wise-proj-edit-dialog");
      }

      // Apply immediately and again shortly after (HireHop may fill async)
      scheduleApply("dialogopen");
      setTimeout(function () { scheduleApply("dialogopen+150"); }, 150);
      setTimeout(function () { scheduleApply("dialogopen+450"); }, 450);
    });

    // MutationObserver: if HireHop re-renders after open, re-apply rules
    attachObserver();

    // If dialog is already present/visible (edge case), run once
    scheduleApply("init");

    try {
      console.warn("[WiseHireHop] init complete", "ver=" + WISE_PLUGIN_VERSION);
    } catch (e) {}
  }

  // =========================
  // Rule application
  // =========================
  var _applyTimer = null;

  function scheduleApply(reason) {
    if (_applyTimer) return;
    _applyTimer = setTimeout(function () {
      _applyTimer = null;
      applyRules(reason);
    }, 50);
  }

  function applyRules(reason) {
    var $ = window.jQuery;
    if (!$) return;

    var $dlg = $("#edit_dialog");
    if (!$dlg.length) return;

    // Only bother if it’s visible (or about to be)
    var isVisible = $dlg.is(":visible") || $dlg.closest(".ui-dialog").is(":visible");
    if (!isVisible) return;

    var inst = getProjectEditInstance($dlg);

    if (inst) {
      applyUsingInstance(inst);
    } else {
      // Fallback: basic DOM targeting
      applyUsingDOM($dlg);
    }

    try {
      console.warn("[WiseHireHop] rules applied", reason, { hasInstance: !!inst });
    } catch (e) {}
  }

  function getProjectEditInstance($dlg) {
    // This matches what you saw in Step C
    return (
      $dlg.data("custom-project_edit") ||
      $dlg.data("customProject_edit") ||
      null
    );
  }

  function applyUsingInstance(inst) {
    // ---- KILL: client contact rows (project client contact) ----
    hideRow(inst.telephone);
    hideRow(inst.mobile);
    hideRow(inst.email);
    hideRow(inst.add_contact_btn);

    // ---- KEEP: delivery only (deliver_to + delivery address) ----
    try {
      // hide mode buttons
      inst.use_at_btn && inst.use_at_btn.hide();
      inst.collect_btn && inst.collect_btn.hide();
      inst.delivery_btn && inst.delivery_btn.show();

      // hide non-delivery name inputs
      inst.use_at && inst.use_at.hide();
      inst.collection_from && inst.collection_from.hide();
      inst.deliver_to && inst.deliver_to.show();

      // hide non-delivery addresses
      inst.use_at_address && inst.use_at_address.hide();
      inst.collection_address && inst.collection_address.hide();
      inst.delivery_address && inst.delivery_address.show();
    } catch (e) {}

    // ---- KILL: delivery phone number row ----
    // Delivery/use_at/collection phone inputs typically share a single row.
    // Hiding the row removes the phone fields without touching the delivery address.
    if (inst.delivery_telephone && inst.delivery_telephone.length) {
      hideRow(inst.delivery_telephone);
    } else if (inst.del_telephone_label && inst.del_telephone_label.length) {
      hideRow(inst.del_telephone_label);
    } else if (inst.use_at_tel && inst.use_at_tel.length) {
      hideRow(inst.use_at_tel);
    } else if (inst.collection_tel && inst.collection_tel.length) {
      hideRow(inst.collection_tel);
    }

    // Cosmetic: blank "n/a" labels
    blankNALabels(inst.element || window.jQuery("#edit_dialog"));
  }

  function applyUsingDOM($root) {
    // Minimal fallback in case instance is unavailable
    hideRow($root.find("input.data_cell.client[name*='telephone'], [data-field='TELEPHONE']").first());
    hideRow($root.find("input.data_cell.client[name*='mobile'], [data-field='MOBILE']").first());
    hideRow($root.find("input.data_cell.client[name*='email'], [data-field='EMAIL']").first());

    // Force delivery-only labels if present
    $root.find(".label_container .label.use_at, .label_container .label.collection").hide();
    $root.find(".label_container .label.delivery").show();

    // Kill delivery telephone row if present
    var $tel = $root.find(".telephone_container input.delivery, [data-field='DELIVERY_TELEPHONE']").first();
    if ($tel.length) hideRow($tel);

    blankNALabels($root);
  }

  // =========================
  // Helpers
  // =========================
  function hideRow($elOrJq) {
    if (!$elOrJq) return;
    var $ = window.jQuery;
    var $el = ($elOrJq.jquery ? $elOrJq : $($elOrJq));
    if (!$el.length) return;
    var $tr = $el.closest("tr");
    if ($tr.length) $tr.hide();
  }

  function blankNALabels($root) {
    var $ = window.jQuery;
    var $r = ($root && $root.jquery) ? $root : $($root);
    if (!$r.length) return;

    $r.find("td.label").each(function () {
      var t = (window.jQuery(this).text() || "").trim().toLowerCase();
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

  function attachObserver() {
    var el = document.getElementById("edit_dialog");
    if (!el || !window.MutationObserver) return;

    var obs = new MutationObserver(function () {
      // Only re-apply when dialog is visible
      var $ = window.jQuery;
      if (!$) return;
      var $dlg = $("#edit_dialog");
      if ($dlg.length && ($dlg.is(":visible") || $dlg.closest(".ui-dialog").is(":visible"))) {
        scheduleApply("mutation");
      }
    });

    obs.observe(el, { childList: true, subtree: true, attributes: true });
  }
})();
