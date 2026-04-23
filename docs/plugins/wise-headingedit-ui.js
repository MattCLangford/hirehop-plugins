(function () {
  "use strict";

  try { console.warn("[WiseHireHop] heading docgen meta plugin loaded - v2026-04-23.04"); } catch (e) {}

  var $ = window.jQuery;
  if (!$) return;

  var applyTimer = null;

  // =========================================================
  // MODIFIER RULES
  // Add future contextual modifier behaviours here
  // =========================================================
  var MODIFIER_RULES = [
    {
      key: "details_layout",
      renderType: "section",
      name: "details",
      parentRenderType: null,
      parentName: null,
      label: "Section layout",
      options: [
        { value: "none",  label: "Standard", suffix: "" },
        { value: "left",  label: "Left",     suffix: " - Left" },
        { value: "right", label: "Right",    suffix: " - Right" }
      ]
    },
    {
      key: "project_total_grouping",
      renderType: "dept",
      name: "project total",
      parentRenderType: "section",
      parentName: "proposal summary",
      label: "Sub total table",
      options: [
        { value: "none",    label: "None",             suffix: "" },
        { value: "section", label: "Group by Section", suffix: " - Section" },
        { value: "dept",    label: "Group by Dept",    suffix: " - Dept" }
      ]
    }
  ];

  // =========================================================
  // BOOTSTRAP
  // =========================================================
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

  // =========================================================
  // MAIN APPLY
  // =========================================================
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

  // =========================================================
  // DIALOG / FORM HELPERS
  // =========================================================
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

  function getSaveButton($dialog) {
    return $dialog.find(".ui-dialog-buttonpane button").filter(function () {
      return $.trim($(this).text()).toLowerCase() === "save";
    }).first();
  }

  // =========================================================
  // UI BUILD
  // =========================================================
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

  // =========================================================
  // INITIAL SYNC
  // =========================================================
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

  // =========================================================
  // EVENT BINDING
  // =========================================================
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

  // =========================================================
  // SYNCHRONISE REAL FIELD
  // =========================================================
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

  // =========================================================
  // PARSING / COMPOSING
  // =========================================================
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
    var parentMeta = getParentHeadingMeta($dialog);
    var parsedModifier = parseModifierFromRule(meta.renderType, meta.name, parentMeta);

    meta.name = parsedModifier.name;
    meta.modifier = parsedModifier.modifier;

    return meta;
  }

  function composeHeadingMeta($dialog, meta) {
    var hidden = !!(meta && meta.hidden);
    var renderType = (meta && meta.renderType) || "normal";
    var baseName = $.trim(String((meta && meta.name) || ""));
    var modifier = (meta && meta.modifier) || "none";
    var parentMeta = getParentHeadingMeta($dialog);

    var rule = findRuleForBaseName(renderType, baseName, parentMeta);
    var suffix = "";

    if (rule) {
      var opt = findOptionByValue(rule, modifier) || findOptionByValue(rule, "none");
      suffix = opt ? opt.suffix : "";
    }

    var prefix = "";
    if (hidden) prefix += "// ";

    if (renderType === "section") {
      prefix += "Section: ";
    } else if (renderType === "dept") {
      prefix += "Dept: ";
    }

    return prefix + baseName + suffix;
  }

  // =========================================================
  // RULE ENGINE
  // =========================================================
  function parseModifierFromRule(renderType, storedName, parentMeta) {
    var cleanStored = $.trim(String(storedName || ""));
    var result = {
      name: cleanStored,
      modifier: "none"
    };

    var candidateRules = getCandidateRules(renderType, parentMeta);

    for (var i = 0; i < candidateRules.length; i++) {
      var rule = candidateRules[i];
      var options = getOptionsBySuffixLengthDesc(rule);

      for (var j = 0; j < options.length; j++) {
        var opt = options[j];
        var suffix = opt.suffix || "";

        if (suffix) {
          if (endsWithIgnoreCase(cleanStored, suffix)) {
            var stripped = $.trim(cleanStored.slice(0, cleanStored.length - suffix.length));
            if (normaliseText(stripped) === normaliseText(rule.name)) {
              result.name = stripped;
              result.modifier = opt.value;
              return result;
            }
          }
        } else {
          if (normaliseText(cleanStored) === normaliseText(rule.name)) {
            result.name = cleanStored;
            result.modifier = opt.value;
            return result;
          }
        }
      }
    }

    return result;
  }

  function findRuleForBaseName(renderType, name, parentMeta) {
    var cleanName = normaliseText(name);

    for (var i = 0; i < MODIFIER_RULES.length; i++) {
      var rule = MODIFIER_RULES[i];
      if (!ruleMatchesBase(rule, renderType, cleanName, parentMeta)) continue;
      return rule;
    }

    return null;
  }

  function getCandidateRules(renderType, parentMeta) {
    var rules = [];

    for (var i = 0; i < MODIFIER_RULES.length; i++) {
      var rule = MODIFIER_RULES[i];
      if (rule.renderType !== renderType) continue;
      if (!parentMatchesRule(rule, parentMeta)) continue;
      rules.push(rule);
    }

    return rules;
  }

  function ruleMatchesBase(rule, renderType, cleanName, parentMeta) {
    if (!rule) return false;
    if (rule.renderType !== renderType) return false;
    if (normaliseText(rule.name) !== cleanName) return false;
    if (!parentMatchesRule(rule, parentMeta)) return false;
    return true;
  }

  function parentMatchesRule(rule, parentMeta) {
    var parentRenderType = (parentMeta && parentMeta.renderType) || "normal";
    var parentName = normaliseText((parentMeta && parentMeta.name) || "");

    if (rule.parentRenderType && rule.parentRenderType !== parentRenderType) {
      return false;
    }

    if (rule.parentName && normaliseText(rule.parentName) !== parentName) {
      return false;
    }

    return true;
  }

  function getOptionsBySuffixLengthDesc(rule) {
    return (rule.options || []).slice().sort(function (a, b) {
      return (b.suffix || "").length - (a.suffix || "").length;
    });
  }

  function findOptionByValue(rule, value) {
    var options = rule && rule.options ? rule.options : [];
    for (var i = 0; i < options.length; i++) {
      if (options[i].value === value) return options[i];
    }
    return null;
  }

  function normaliseText(value) {
    return $.trim(String(value || "")).toLowerCase();
  }

  function endsWithIgnoreCase(full, suffix) {
    return full.toLowerCase().slice(-suffix.length) === suffix.toLowerCase();
  }

  // =========================================================
  // MODIFIER UI
  // =========================================================
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
    var parentMeta = getParentHeadingMeta($dialog);
    var rule = findRuleForBaseName(
      ui.$render.val() || "normal",
      ui.$proxy.val() || "",
      parentMeta
    );

    if (!rule) return null;

    return {
      key: rule.key,
      label: rule.label,
      options: rule.options
    };
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

  // =========================================================
  // PARENT HEADING HELPERS
  // =========================================================
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

  // =========================================================
  // EVENT HELPER
  // =========================================================
  function triggerInputEvents($el) {
    $el.trigger("input").trigger("change");
  }
})();
