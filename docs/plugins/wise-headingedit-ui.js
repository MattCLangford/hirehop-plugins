(function () {
  "use strict";

  try { console.warn("[WiseHireHop] heading docgen meta plugin loaded - v2026-04-23.02"); } catch (e) {}

  var $ = window.jQuery;
  if (!$) return;

  var applyTimer = null;

  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(function () {
      processVisibleHeadingDialogs();
    }, 50);
  }

  $(document).on("dialogopen", ".ui-dialog-content", function () {
    var $dialog = $(this).closest(".ui-dialog");
    if (!isHeadingDialog($dialog)) return;

    var $form = getVisibleHeadingForm($dialog);
    if ($form.length) {
      $form.removeData("wiseDocgenInitialised");
    }

    applyToHeadingDialog($dialog);
  });

  $(document).on("dialogclose", ".ui-dialog-content", function () {
    var $dialog = $(this).closest(".ui-dialog");
    if (!isHeadingDialog($dialog)) return;

    var $form = getVisibleHeadingForm($dialog);
    if ($form.length) {
      $form.removeData("wiseDocgenInitialised");
    }
  });

  var obs = new MutationObserver(function () {
    scheduleApply();
  });

  obs.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "style"]
  });

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
    if (!ui.$proxy.length || !ui.$hidden.length || !ui.$render.length || !ui.$modifier.length) return;

    syncUiFromActual($form, $actualNameInput, ui);
    bindUiHandlers($form, $dialog, $actualNameInput, ui);
    refreshModifierState(ui);
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
            '<div style="margin-bottom:8px;">' +
              '<label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; margin-right:16px;">' +
                '<input type="checkbox" class="wise-docgen-hidden" style="margin:0;">' +
                '<span>Hide this heading in doc generator</span>' +
              '</label>' +
            '</div>' +
            '<div style="margin-bottom:8px;">' +
              '<label style="display:inline-flex; align-items:center; gap:8px;">' +
                '<span>Render as</span>' +
                '<select class="wise-docgen-render-type" style="min-width:180px;">' +
                  '<option value="normal">Normal heading</option>' +
                  '<option value="section">Section page</option>' +
                  '<option value="dept">Dept page</option>' +
                '</select>' +
              '</label>' +
            '</div>' +
            '<div class="wise-docgen-modifier-row">' +
              '<label style="display:inline-flex; align-items:center; gap:8px;">' +
                '<span>Section layout</span>' +
                '<select class="wise-docgen-modifier" style="min-width:180px;">' +
                  '<option value="none">Standard</option>' +
                  '<option value="left">Left</option>' +
                  '<option value="right">Right</option>' +
                '</select>' +
              '</label>' +
            '</div>' +
          '</span>' +
        '</span>'
      );

      $actualNameInput.hide();
      $actualNameInput.after($ui);
    } else {
      $actualNameInput.hide();
    }

    return {
      $ui: $ui,
      $proxy: $ui.find(".wise-docgen-display-name").first(),
      $hidden: $ui.find(".wise-docgen-hidden").first(),
      $render: $ui.find(".wise-docgen-render-type").first(),
      $modifier: $ui.find(".wise-docgen-modifier").first(),
      $modifierRow: $ui.find(".wise-docgen-modifier-row").first()
    };
  }

  function syncUiFromActual($form, $actualNameInput, ui) {
    if ($form.data("wiseDocgenInitialised") === "1") return;

    var meta = parseHeadingMeta($actualNameInput.val() || "");

    ui.$proxy.val(meta.name);
    ui.$hidden.prop("checked", meta.hidden);
    ui.$render.val(meta.renderType);
    ui.$modifier.val(meta.modifier || "none");

    syncActualFromUi($actualNameInput, ui);
    refreshModifierState(ui);

    $form.data("wiseDocgenInitialised", "1");
  }

  function bindUiHandlers($form, $dialog, $actualNameInput, ui) {
    if ($form.data("wiseDocgenBound") !== "1") {
      ui.$proxy.on("input.wiseDocgen change.wiseDocgen keyup.wiseDocgen blur.wiseDocgen", function () {
        refreshModifierState(ui);
        syncActualFromUi($actualNameInput, ui);
      });

      ui.$hidden.on("change.wiseDocgen", function () {
        syncActualFromUi($actualNameInput, ui);
      });

      ui.$render.on("change.wiseDocgen", function () {
        refreshModifierState(ui);
        syncActualFromUi($actualNameInput, ui);
      });

      ui.$modifier.on("change.wiseDocgen", function () {
        syncActualFromUi($actualNameInput, ui);
      });

      ui.$proxy.on("keydown.wiseDocgen", function (e) {
        if (e.key === "Enter") {
          refreshModifierState(ui);
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
        refreshModifierState(ui);
        syncActualFromUi($actualNameInput, ui);
      }

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
      name: ui.$proxy.val() || "",
      modifier: getEffectiveModifier(ui)
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
      name: raw,
      modifier: "none"
    };

    if (/^\/\/\s*/i.test(raw)) {
      meta.hidden = true;
      raw = raw.replace(/^\/\/\s*/i, "");
    }

    if (/^section\s*:\s*/i.test(raw)) {
      meta.renderType = "section";
      raw = raw.replace(/^section\s*:\s*/i, "");
    } else if (/^dept\s*:\s*/i.test(raw)) {
      meta.renderType = "dept";
      raw = raw.replace(/^dept\s*:\s*/i, "");
    }

    if (/\s*-\s*left$/i.test(raw)) {
      meta.modifier = "left";
      raw = raw.replace(/\s*-\s*left$/i, "");
    } else if (/\s*-\s*right$/i.test(raw)) {
      meta.modifier = "right";
      raw = raw.replace(/\s*-\s*right$/i, "");
    }

    meta.name = $.trim(raw);
    return meta;
  }

  function composeHeadingMeta(meta) {
    var hidden = !!(meta && meta.hidden);
    var renderType = (meta && meta.renderType) || "normal";
    var name = $.trim(String((meta && meta.name) || ""));
    var modifier = (meta && meta.modifier) || "none";

    var prefix = "";
    if (hidden) prefix += "// ";

    if (renderType === "section") {
      prefix += "Section: ";
    } else if (renderType === "dept") {
      prefix += "Dept: ";
    }

    var suffix = "";
    if (modifier === "left") {
      suffix = " - Left";
    } else if (modifier === "right") {
      suffix = " - Right";
    }

    return prefix + name + suffix;
  }

  function refreshModifierState(ui) {
    var eligible = isModifierEligible(ui);

    if (ui.$modifierRow.length) {
      ui.$modifierRow.toggle(eligible);
    }

    ui.$modifier.prop("disabled", !eligible);

    if (!eligible) {
      ui.$modifier.val("none");
    }
  }

  function isModifierEligible(ui) {
    var renderType = ui.$render.val() || "normal";
    var name = $.trim(String(ui.$proxy.val() || "")).toLowerCase();

    return renderType === "section" && name === "details";
  }

  function getEffectiveModifier(ui) {
    return isModifierEligible(ui) ? (ui.$modifier.val() || "none") : "none";
  }

  function triggerInputEvents($el) {
    $el.trigger("input").trigger("change");
  }
})();
