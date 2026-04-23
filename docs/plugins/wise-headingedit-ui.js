(function () {
  "use strict";

  try { console.warn("[WiseHireHop] heading docgen toggle plugin loaded"); } catch (e) {}

  var $ = window.jQuery;
  if (!$) return;

  var HIDDEN_PREFIX = "// ";
  var applyTimer = null;

  // Optional page restriction if you know the exact supplying-list URL
  // if (!/\/project\.php(\?|$)/.test(location.pathname)) return;

  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(function () {
      processVisibleHeadingDialogs();
    }, 50);
  }

  // Main hook: when any jQuery UI dialog opens
  $(document).on("dialogopen", ".ui-dialog-content", function () {
    var $content = $(this);
    var $dialog = $content.closest(".ui-dialog");

    if (!isHeadingDialog($dialog)) return;

    // Reset sync marker for this open-cycle
    var $form = getVisibleHeadingForm($dialog);
    if ($form.length) {
      $form.removeData("wiseDocgenSynced");
    }

    applyToHeadingDialog($dialog);
  });

  // Clean up sync marker when closed
  $(document).on("dialogclose", ".ui-dialog-content", function () {
    var $content = $(this);
    var $dialog = $content.closest(".ui-dialog");

    if (!isHeadingDialog($dialog)) return;

    $dialog.find("form.edit_type").removeData("wiseDocgenSynced");
  });

  // Fallback hook for late DOM updates / re-renders
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

  function processVisibleHeadingDialogs() {
    $(".ui-dialog:visible").each(function () {
      var $dialog = $(this);
      if (isHeadingDialog($dialog)) {
        applyToHeadingDialog($dialog);
      }
    });
  }

  function applyToHeadingDialog($dialog) {
    if (!$dialog || !$dialog.length) return;

    var $form = getVisibleHeadingForm($dialog);
    if (!$form.length) return;

    var $nameInput = getHeadingNameInput($form);
    if (!$nameInput.length) return;

    var $wrap = ensureToggleControl($form, $nameInput);
    var $checkbox = $wrap.find("input.wise-docgen-hidden");
    if (!$checkbox.length) return;

    syncUiFromStoredValue($form, $nameInput, $checkbox);
    bindSaveHandler($dialog, $nameInput, $checkbox);
  }

  function isHeadingDialog($dialog) {
    if (!$dialog || !$dialog.length || !$dialog.is(":visible")) return false;

    var title = $.trim($dialog.find(".ui-dialog-title").first().text()).toLowerCase();
    return title === "edit heading" || title === "add heading" || title === "new heading";
  }

  function getVisibleHeadingForm($dialog) {
    return $dialog.find("form.edit_type:visible").filter(function () {
      return $(this).find('input[name="kind"][value="0"]').length > 0;
    }).first();
  }

  function getHeadingNameInput($form) {
    return $form.find('input[name="name"]').first();
  }

  function ensureToggleControl($form, $nameInput) {
    var $existing = $form.find(".wise-docgen-toggle").first();
    if ($existing.length) return $existing;

    var $wrap = $(
      '<div class="wise-docgen-toggle" style="margin-top:8px;">' +
        '<label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">' +
          '<input type="checkbox" class="wise-docgen-hidden" style="margin:0;">' +
          '<span>Hide this heading in doc generator</span>' +
        '</label>' +
      '</div>'
    );

    $nameInput.after($wrap);
    return $wrap;
  }

  function syncUiFromStoredValue($form, $nameInput, $checkbox) {
    // Only sync once per dialog open-cycle, otherwise observer re-runs can
    // interfere with the user while editing.
    if ($form.data("wiseDocgenSynced") === "1") return;

    var storedValue = $nameInput.val() || "";
    var hidden = hasHiddenPrefix(storedValue);

    $checkbox.prop("checked", hidden);

    if (hidden) {
      $nameInput.val(stripHiddenPrefix(storedValue));
      triggerInputEvents($nameInput);
    }

    $form.data("wiseDocgenSynced", "1");
  }

  function bindSaveHandler($dialog, $nameInput, $checkbox) {
    var $saveButton = getSaveButton($dialog);
    if (!$saveButton.length) return;

    // Remove only our handler, then rebind safely
    $saveButton.off("click.wiseDocgenHeading");
    $saveButton.on("click.wiseDocgenHeading", function () {
      var currentValue = $nameInput.val() || "";
      var finalValue = $checkbox.prop("checked")
        ? applyHiddenPrefix(currentValue)
        : stripHiddenPrefix(currentValue);

      $nameInput.val(finalValue);
      triggerInputEvents($nameInput);
    });
  }

  function getSaveButton($dialog) {
    return $dialog.find(".ui-dialog-buttonpane button").filter(function () {
      return $.trim($(this).text()).toLowerCase() === "save";
    }).first();
  }

  function hasHiddenPrefix(value) {
    return /^\s*\/\/\s*/.test(value || "");
  }

  function stripHiddenPrefix(value) {
    return String(value || "").replace(/^\s*\/\/\s*/, "");
  }

  function applyHiddenPrefix(value) {
    return HIDDEN_PREFIX + stripHiddenPrefix(value);
  }

  function triggerInputEvents($el) {
    $el.trigger("input").trigger("change");
  }
})();
