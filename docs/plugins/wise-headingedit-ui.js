(function () {
  "use strict";

  try { console.warn("[WiseHireHop] heading docgen meta plugin loaded - v2026-04-23.03"); } catch (e) {}

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

    syncUiFromActual($form, $dialog, $actualNameInput, ui);
    bindUiHandlers($form, $dialog, $actualNameInput, ui);
    refreshModifierState($dialog, ui, ui.$modifier.val() || "none");
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
            '<div class="wise-docgen-modifier-row" style="display:none;">' +
              '<label style="display:inline-flex; align-items:center; gap:8px;">' +
                '<span class="wise-docgen-modifier-label">Modifier</span>' +
                '<select class="wise-docgen-modifier" style="min-width:220px;"></select>' +
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
      $modifierRow: $ui.find(".wise-docgen-modifier-row").first(),
      $modifierLabel: $ui.find(".wise-docgen-modifier-label").first()
    };
  }

  function syncUiFromActual($form, $dialog, $actualNameInput, ui) {
    if ($form.data("wiseDocgenInitialised") === "1") return;

    var meta = parseHeadingMetaForDialog($actualNameInput.val() || "", $dialog);

    ui.$proxy.val(meta.name);
    ui.$hidden.prop("checked", meta.hidden);
    ui.$render.val(meta.renderType);

    refreshModifierState($dialog, ui, meta.modifier || "none");

    syncActualFromUi($dialog, $actualNameInput, ui);

    $form.data("wiseDocgenInitialised", "1");
  }

  function bindUiHandlers($form, $dialog, $actualNameInput, ui) {
    if ($form.data("wiseDocgenBound") !== "1") {
      ui.$proxy.on("input.wiseDocgen change.wiseDocgen keyup.wiseDocgen blur.wiseDocgen", function () {
        refreshModifierState($dialog, ui, ui.$modifier.val() || "none");
        syncActualFromUi($dialog, $actualNameInput, ui);
      });

      ui.$hidden.on("change.wiseDocgen", function () {
        syncActualFromUi($dialog, $actualNameInput, ui);
      });

      ui.$render.on("change.wiseDocgen", function () {
        refreshModifierState($dialog, ui, ui.$modifier.val() || "none");
        syncActualFromUi($dialog, $actualNameInput, ui);
      });

      ui.$modifier.on("change.wiseDocgen", function () {
        syncActualFromUi($dialog, $actualNameInput, ui);
      });

      ui.$proxy.on("keydown.wiseDocgen", function (e) {
        if (e.key === "Enter") {
          refreshModifierState($dialog, ui, ui.$modifier.val() || "none");
          syncActualFromUi($dialog, $actualNameInput, ui);
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
        refreshModifierState($dialog, ui, ui.$modifier.val() || "none");
        syncActualFromUi($dialog, $actualNameInput, ui);
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

  function syncActualFromUi($dialog, $actualNameInput, ui) {
    var meta = {
      hidden: ui.$hidden.prop("checked"),
      renderType: ui.$render.val() || "normal",
      name: ui.$proxy.val() || "",
      modifier: getEffectiveModifier($dialog, ui)
    };

    var composed = composeHeadingMeta($dialog, meta);
    if (($actualNameInput.val() || "") !== composed) {
      $actualNameInput.val(composed);
      triggerInputEvents($actualNameInput);
    }
  }

  function parseHeadingBaseMeta(value) {
    var raw = $.trim(String(value || ""));
    var meta = {
      hidden: false,
      renderType: "normal",
      name: raw
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

    meta.name = $.trim(raw);
    return meta;
  }

  function parseHeadingMetaForDialog(value, $dialog) {
    var meta = parseHeadingBaseMeta(value);
    meta.modifier = "none";

    var parentMeta = getParentHeadingMeta($dialog);

    // Profile 1: Section: Details - Left / Right
    if (meta.renderType === "section") {
      var strippedLeft = $.trim(meta.name.replace(/\s*-\s*left$/i, ""));
      var strippedRight = $.trim(meta.name.replace(/\s*-\s*right$/i, ""));

      if (strippedLeft.toLowerCase() === "details" && strippedLeft !== meta.name) {
        meta.name = strippedLeft;
        meta.modifier = "left";
        return meta;
      }

      if (strippedRight.toLowerCase() === "details" && strippedRight !== meta.name) {
        meta.name = strippedRight;
        meta.modifier = "right";
        return meta;
      }
    }

    // Profile 2: Section: Proposal Summary > Dept: Project Total - Section / Dept
    if (
      meta.renderType === "dept" &&
      parentMeta.renderType === "section" &&
      parentMeta.name.toLowerCase() === "proposal summary"
    ) {
      var strippedSection = $.trim(meta.name.replace(/\s*-\s*section$/i, ""));
      var strippedDept = $.trim(meta.name.replace(/\s*-\s*dept$/i, ""));

      if (strippedSection.toLowerCase() === "project total" && strippedSection !== meta.name) {
        meta.name = strippedSection;
        meta.modifier = "section";
        return meta;
      }

      if (strippedDept.toLowerCase() === "project total" && strippedDept !== meta.name) {
        meta.name = strippedDept;
        meta.modifier = "dept";
        return meta;
      }
    }

    return meta;
  }

  function composeHeadingMeta($dialog, meta) {
    var hidden = !!(meta && meta.hidden);
    var renderType = (meta && meta.renderType) || "normal";
    var name = $.trim(String((meta && meta.name) || ""));
    var modifier = (meta && meta.modifier) || "none";
    var suffix = "";

    var profile = getModifierProfileFromValues(
      renderType,
      name,
      getParentHeadingMeta($dialog)
    );

    if (profile && profile.key === "details_layout") {
      if (modifier === "left") suffix = " - Left";
      if (modifier === "right") suffix = " - Right";
    }

    if (profile && profile.key === "project_total_grouping") {
      if (modifier === "section") suffix = " - Section";
      if (modifier === "dept") suffix = " - Dept";
    }

    var prefix = "";
    if (hidden) prefix += "// ";

    if (renderType === "section") {
      prefix += "Section: ";
    } else if (renderType === "dept") {
      prefix += "Dept: ";
    }

    return prefix + name + suffix;
  }

  function refreshModifierState($dialog, ui, preferredValue) {
    var profile = getModifierProfile($dialog, ui);

    if (!profile) {
      ui.$modifierRow.hide();
      ui.$modifier.prop("disabled", true);
      populateModifierOptions(ui, [{ value: "none", label: "None" }], "none");
      return;
    }

    ui.$modifierLabel.text(profile.label);
    ui.$modifierRow.show();
    ui.$modifier.prop("disabled", false);
    populateModifierOptions(ui, profile.options, preferredValue || "none");
  }

  function populateModifierOptions(ui, options, selectedValue) {
    var current = selectedValue || "none";
    ui.$modifier.empty();

    $.each(options, function (_, opt) {
      ui.$modifier.append(
        $("<option></option>").attr("value", opt.value).text(opt.label)
      );
    });

    if (ui.$modifier.find('option[value="' + current + '"]').length) {
      ui.$modifier.val(current);
    } else {
      ui.$modifier.val("none");
    }
  }

  function getModifierProfile($dialog, ui) {
    return getModifierProfileFromValues(
      ui.$render.val() || "normal",
      ui.$proxy.val() || "",
      getParentHeadingMeta($dialog)
    );
  }

  function getModifierProfileFromValues(renderType, name, parentMeta) {
    var cleanName = $.trim(String(name || "")).toLowerCase();
    var parentName = $.trim(String((parentMeta && parentMeta.name) || "")).toLowerCase();
    var parentRender = (parentMeta && parentMeta.renderType) || "normal";

    if (renderType === "section" && cleanName === "details") {
      return {
        key: "details_layout",
        label: "Section layout",
        options: [
          { value: "none", label: "Standard" },
          { value: "left", label: "Left" },
          { value: "right", label: "Right" }
        ]
      };
    }

    if (
      renderType === "dept" &&
      cleanName === "project total" &&
      parentRender === "section" &&
      parentName === "proposal summary"
    ) {
      return {
        key: "project_total_grouping",
        label: "Sub total table",
        options: [
          { value: "none", label: "None" },
          { value: "section", label: "Group by Section" },
          { value: "dept", label: "Group by Dept" }
        ]
      };
    }

    return null;
  }

  function getEffectiveModifier($dialog, ui) {
    var profile = getModifierProfile($dialog, ui);
    if (!profile) return "none";

    var value = ui.$modifier.val() || "none";
    if (ui.$modifier.find('option[value="' + value + '"]').length) {
      return value;
    }

    return "none";
  }

  function getParentHeadingRaw($dialog) {
    var $select = $dialog.find("select.hh_base_select").first();
    if (!$select.length) return "";

    var selectedText = $.trim($select.find("option:selected").text());
    if (selectedText && selectedText.toLowerCase() !== "none") {
      return selectedText;
    }

    var overlayTitle = $.trim(($select.siblings('div[title]').attr("title")) || "");
    if (overlayTitle && overlayTitle.toLowerCase() !== "none") {
      return overlayTitle;
    }

    return "";
  }

  function getParentHeadingMeta($dialog) {
    var raw = getParentHeadingRaw($dialog);
    if (!raw) {
      return {
        hidden: false,
        renderType: "normal",
        name: ""
      };
    }

    return parseHeadingBaseMeta(raw);
  }

  function triggerInputEvents($el) {
    $el.trigger("input").trigger("change");
  }
})();
