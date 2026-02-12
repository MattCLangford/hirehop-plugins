(function () {
  "use strict";

  // =========================
  // Wise HireHop Project Edit - Hide Fields Only (NO STYLING)
  // =========================
  var WISE_PLUGIN_VERSION = "v4-hide-only";

  // Prevent double-init
  if (window.__WISE_PROJECT_EDIT_HIDE_ONLY_INIT__) return;
  window.__WISE_PROJECT_EDIT_HIDE_ONLY_INIT__ = true;

  // Proof of life (minimal)
  try {
    console.warn("[WiseHireHop] hide-only plugin executed", WISE_PLUGIN_VERSION, location.href);
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
    $(document).on("dialogopen.wiseHideOnly", "#edit_dialog", function () {
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
  // Rule application
  // -------------------------
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

    // Only act when visible (or wrapper visible)
    var isVisible = $dlg.is(":visible") || $dlg.closest(".ui-dialog").is(":visible");
    if (!isVisible) return;

    var inst = getProjectEditInstance($dlg);
    if (inst) {
      applyUsingInstance(inst);
    } else {
      applyUsingDOM($dlg);
    }

    try {
      console.info("[WiseHireHop] hide-only rules applied", reason, { hasInstance: !!inst });
    } catch (e) {}
  }

  function getProjectEditInstance($dlg) {
    return (
      $dlg.data("custom-project_edit") ||
      $dlg.data("customProject_edit") ||
      null
    );
  }

  function applyUsingInstance(inst) {
    // -----------------------------
    // KILL: client contact rows
    // -----------------------------
    hideRow(inst.telephone);
    hideRow(inst.mobile);
    hideRow(inst.email);
    hideRow(inst.add_contact_btn);

    // -----------------------------
    // KEEP: Deliver to + Delivery address ONLY
    // -----------------------------
    try {
      // hide mode buttons (use_at / collection)
      inst.use_at_btn && inst.use_at_btn.hide();
      inst.collect_btn && inst.collect_btn.hide();

      // ensure delivery is the visible mode
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

    // -----------------------------
    // KILL: delivery phone number row
    // -----------------------------
    // These telephone inputs typically share a single <tr>.
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

  function applyUsingDOM($root) {
    // fallback (best-effort only)
    hideRow($root.find("[data-field='TELEPHONE']").first());
    hideRow($root.find("[data-field='MOBILE']").first());
    hideRow($root.find("[data-field='EMAIL']").first());

    // hide non-delivery mode labels if present
    $root.find(".label_container .label.use_at, .label_container .label.collection").hide();

    // kill phone row if present
    var $tel =
      $root.find("[data-field='DELIVERY_TELEPHONE']").first()
        .add($root.find(".telephone_container input.delivery").first())
        .filter(":first");
    if ($tel.length) hideRow($tel);
  }

  // -------------------------
  // Helpers
  // -------------------------
  function hideRow($elOrJq) {
    if (!$elOrJq) return;
    var $ = window.jQuery;
    var $el = ($elOrJq.jquery ? $elOrJq : $($elOrJq));
    if (!$el.length) return;
    var $tr = $el.closest("tr");
    if ($tr.length) $tr.hide();
  }

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
})();
