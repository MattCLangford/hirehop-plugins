(function () {
  "use strict";

  try { console.warn("[WiseHireHop] heading docgen meta plugin loaded - v2026-04-23.01"); } catch (e) {}

  var $ = window.jQuery;
  if (!$) return;

  // Optional route guard if you want one later
  // if (!/\/project\.php(\?|$)/.test(location.pathname)) return;

  var applyTimer = null;

  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(function () {
      processVisibleHeadingDialogs();
    }, 50);
  }

  // Main hook when jQuery UI dialogs open
  $(document).on("dialogopen", ".ui-dialog-content", function () {
    var $dialog = $(this).closest(".ui-dialog");
    if (!isHeadingDialog($dialog)) return;

    var $form = getVisibleHeadingForm($dialog);
    if ($form.length) {
      $form.removeData("wiseDocgenInitialised");
    }

    applyToHeadingDialog($dialog);
  });

  // Reset init marker when dialog closes
  $(document).on("dialogclose", ".ui-dialog-content", function () {
    var $dialog = $(this).closest(".ui-dialog");
    if (!isHeadingDialog($dialog)) return;

    var $form = getVisibleHeadingForm($dialog);
    if ($form.length) {
      $form.removeData("wiseDocgenInitialised");
    }
  });

  // Fallback for late re-renders
  var obs = new MutationObserver(function () {
    scheduleApply();
  });

  obs.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "style"]
  });

  // Initial attempt
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

    var $actualNameInput = getHeadingNameInput($form);
    if (!$actualNameInput.length) return;

    var ui = ensureHeadingUi($form, $actualNameInput);
    if (!ui.$proxy.length || !ui.$hidden.length || !ui.$render.length) return;

    syncUiFromActual($form, $actualNameInput, ui);
    bindUiHandlers($form, $dialog, $actualNameInput, ui);
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

  function ensureHeadingUi($form, $actualNameInput) {
    var $ui = $form.find(".wise-docgen-ui").first();

    if (!$ui.length) {
      var width = $actualNameInput.outerWidth() || 450;

      $ui = $(
        '<span class="wise-docgen-ui" style="display:inline-block; vertical-align:middle;">' +
          '<input type="text" class="wise-docgen-display-name" maxlength="60" style="width:' + width + 'px;">' +
          '<span class="wise-docgen-meta" style="display:block; margin-top:8px;">' +
            '<label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; margin-right:16px;">' +
              '<input type="checkbox" class="wise-docgen-hidden" style="margin:0;">' +
              '<span>Hide this heading in doc generator</span>' +
            '</label>' +
            '<label style="display:inline-flex; align-items:center; gap:8px;">' +
              '<span>Render as</span>' +
              '<select class="wise-docgen-render-type" style="min-width:180px;">' +
                '<option value="normal">Normal heading</option>' +
                '<option value="section">Section page</option>' +
                '<option value="dept">Dept page</option>' +
              '</select>' +
            '</label>' +
          '</span>' +
        '</span>'
      );

      // Hide the real HireHop field and insert our UI after it
      $actualNameInput.hide();
      $actualNameInput.after($ui);
    } else {
      $actualNameInput.hide();
    }

    return {
      $ui: $ui,
      $proxy: $ui.find(".wise-docgen-display-name").first(),
      $hidden: $ui.find(".wise-docgen-hidden").first(),
      $render: $ui.find(".wise-docgen-render-type").first()
    };
  }

  function syncUiFromActual($form, $actualNameInput, ui) {
    // Only initialise once per dialog open-cycle
    if ($form.data("wiseDocgenInitialised") === "1") return;

    var meta = parseHeadingMeta($actualNameInput.val() || "");

    ui.$proxy.val(meta.name);
    ui.$hidden.prop("checked", meta.hidden);
    ui.$render.val(meta.renderType);

    // Canonicalise the underlying value immediately
    syncActualFromUi($actualNameInput, ui);

    $form.data("wiseDocgenInitialised", "1");
  }

  function bindUiHandlers($form, $dialog, $actualNameInput, ui) {
    if ($form.data("wiseDocgenBound") !== "1") {
      ui.$proxy.on("input.wiseDocgen change.wiseDocgen keyup.wiseDocgen blur.wiseDocgen", function () {
        syncActualFromUi($actualNameInput, ui);
      });

      ui.$hidden.on("change.wiseDocgen", function () {
        syncActualFromUi($actualNameInput, ui);
      });

      ui.$render.on("change.wiseDocgen", function () {
        syncActualFromUi($actualNameInput, ui);
      });

      ui.$proxy.on("keydown.wiseDocgen", function (e) {
        if (e.key === "Enter") {
          syncActualFromUi($actualNameInput, ui);
        }
      });

      $form.data("wiseDocgenBound", "1");
    }

    bindSaveAssurance($dialog, $actualNameInput, ui);
  }

  function bindSaveAssurance($dialog, $actualNameInput, ui) {
    var $saveButton = getSaveButton($dialog);
    if (!$saveButton.length) return;

    var btn = $saveButton.get(0);
    if (!btn) return;

    if (!btn._wiseDocgenBound) {
      function ensureLatestActualValue() {
        syncActualFromUi($actualNameInput, ui);
      }

      // Run before HireHop's own save path
      btn.addEventListener("pointerdown", ensureLatestActualValue, true);
      btn.addEventListener("mousedown", ensureLatestActualValue, true);
      btn.addEventListener("click", ensureLatestActualValue, true);

      var formEl = $actualNameInput.closest("form").get(0);
      if (formEl && !formEl._wiseDocgenSubmitBound) {
        formEl.addEventListener("submit", ensureLatestActualValue, true);
        formEl._wiseDocgenSubmitBound = true;
      }

      btn._wiseDocgenBound = true;
    }
  }

  function getSaveButton($dialog) {
    return $dialog.find(".ui-dialog-buttonpane button").filter(function () {
      return $.trim($(this).text()).toLowerCase() === "save";
    }).first();
  }

  function syncActualFromUi($actualNameInput, ui) {
    var meta = {
      hidden: ui.$hidden.prop("checked"),
      renderType: ui.$render.val() || "normal",
      name: ui.$proxy.val() || ""
    };

    var composed = composeHeadingMeta(meta);
    if (($actualNameInput.val() || "") !== composed) {
      $actualNameInput.val(composed);
      triggerInputEvents($actualNameInput);
    }
  }

  function parseHeadingMeta(value) {
    var raw = $.trim(String(value || ""));
    var meta = {
      hidden: false,
      renderType: "normal",
      name: raw
    };

    // Hidden marker first
    if (/^\/\/\s*/i.test(raw)) {
      meta.hidden = true;
      raw = raw.replace(/^\/\/\s*/i, "");
    }

    // Render type next
    if (/^section\s*:\s*/i.test(raw)) {
      meta.renderType = "section";
      raw = raw.replace(/^section\s*:\s*/i, "");
    } else if (/^dept\s*:\s*/i.test(raw)) {
      meta.renderType = "dept";
      raw = raw.replace(/^dept\s*:\s*/i, "");
    }

    meta.name = raw;
    return meta;
  }

  function composeHeadingMeta(meta) {
    var hidden = !!(meta && meta.hidden);
    var renderType = (meta && meta.renderType) || "normal";
    var name = $.trim(String((meta && meta.name) || ""));

    var prefix = "";
    if (hidden) prefix += "// ";

    if (renderType === "section") {
      prefix += "Section: ";
    } else if (renderType === "dept") {
      prefix += "Dept: ";
    }

    return prefix + name;
  }

  function triggerInputEvents($el) {
    $el.trigger("input").trigger("change");
  }
})();
