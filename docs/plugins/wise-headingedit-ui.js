(function () {
  "use strict";

  try { console.warn("[WiseHireHop] heading docgen meta plugin loaded - v2026-04-23.08"); } catch (e) {}

  var $ = window.jQuery;
  if (!$) return;

  var applyTimer = null;
  var AUTO_CHILD_QUEUE = [];
  var AUTO_CHILD_RUNNING = false;

  // =========================================================
  // MODIFIER RULES
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
  // PAGE TEMPLATES
  // =========================================================
  var PAGE_TEMPLATES = [
    { key: "section_hero", renderType: "section", name: "Hero", parentRenderType: null, parentName: null, sectionRank: 1, deptRank: null },
    { key: "section_details", renderType: "section", name: "Details", parentRenderType: null, parentName: null, sectionRank: 2, deptRank: null },

    { key: "dept_experience_expertise", renderType: "dept", name: "Experience<br>& Expertise", parentRenderType: "section", parentName: "Details", sectionRank: 2, deptRank: 1 },
    { key: "dept_fpv_proven_process", renderType: "dept", name: "FPV Proven Process", parentRenderType: "section", parentName: "Details", sectionRank: 2, deptRank: 2 },
    { key: "dept_your_dedicated_project_manager", renderType: "dept", name: "Your Dedicated<br>Project Manager", parentRenderType: "section", parentName: "Details", sectionRank: 2, deptRank: 3 },
    { key: "dept_your_specialist_team", renderType: "dept", name: "Your Specialist Team", parentRenderType: "section", parentName: "Details", sectionRank: 2, deptRank: 4 },
    { key: "dept_our_experts", renderType: "dept", name: "Our Experts", parentRenderType: "section", parentName: "Details", sectionRank: 2, deptRank: 5 },
    { key: "dept_venue_hero", renderType: "dept", name: "Venue Hero", parentRenderType: "section", parentName: "Details", sectionRank: 2, deptRank: 6 },

    { key: "section_event_overview", renderType: "section", name: "Event Overview", parentRenderType: null, parentName: null, sectionRank: 3, deptRank: null },
    { key: "dept_proposed_timings", renderType: "dept", name: "Proposed Timings", parentRenderType: "section", parentName: "Event Overview", sectionRank: 3, deptRank: 1 },

    { key: "section_area", renderType: "section", name: "Area", parentRenderType: null, parentName: null, sectionRank: 4, deptRank: null },
    { key: "dept_department_area", renderType: "dept", name: "Department", parentRenderType: "section", parentName: "Area", sectionRank: 4, deptRank: 1 },

    { key: "section_labour_general_requirements", renderType: "section", name: "Labour & General Requirements", parentRenderType: null, parentName: null, sectionRank: 5, deptRank: null },
    { key: "dept_labour", renderType: "dept", name: "Labour", parentRenderType: "section", parentName: "Labour & General Requirements", sectionRank: 5, deptRank: 1 },
    { key: "dept_general_requirements", renderType: "dept", name: "General Requirements", parentRenderType: "section", parentName: "Labour & General Requirements", sectionRank: 5, deptRank: 2 },

    { key: "section_proposal_summary", renderType: "section", name: "Proposal Summary", parentRenderType: null, parentName: null, sectionRank: 6, deptRank: null },
    { key: "dept_project_total", renderType: "dept", name: "Project Total", parentRenderType: "section", parentName: "Proposal Summary", sectionRank: 6, deptRank: 1 },

    { key: "section_suffix", renderType: "section", name: "Suffix", parentRenderType: null, parentName: null, sectionRank: 7, deptRank: null },
    { key: "dept_critical_path", renderType: "dept", name: "Critical Path", parentRenderType: "section", parentName: "Suffix", sectionRank: 7, deptRank: 1 },
    { key: "dept_sustainability", renderType: "dept", name: "Sustainability", parentRenderType: "section", parentName: "Suffix", sectionRank: 7, deptRank: 2 },
    { key: "dept_about_us", renderType: "dept", name: "About Us", parentRenderType: "section", parentName: "Suffix", sectionRank: 7, deptRank: 2 },
    { key: "dept_thank_you", renderType: "dept", name: "Thank you", parentRenderType: "section", parentName: "Suffix", sectionRank: 7, deptRank: 3 },

    { key: "section_visual", renderType: "section", name: "Visual", parentRenderType: null, parentName: null, sectionRank: 8, deptRank: null },
    { key: "dept_fpv", renderType: "dept", name: "FPV", parentRenderType: "section", parentName: "Visual", sectionRank: 8, deptRank: 1 },

    { key: "section_additional_options", renderType: "section", name: "Additional Options", parentRenderType: null, parentName: null, sectionRank: 9, deptRank: null },
    { key: "dept_department_additional_options", renderType: "dept", name: "Department", parentRenderType: "section", parentName: "Additional Options", sectionRank: 9, deptRank: 1 }
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

  // Do NOT use isHeadingDialog() here because the dialog is usually no longer visible
  var title = $.trim($dialog.find(".ui-dialog-title").first().text()).toLowerCase();
  var isHeading = title === "edit heading" || title === "add heading" || title === "new heading";

  if (!isHeading) return;

  var pendingPlan = $dialog.data("wisePendingAutoChildPlan");
  if (pendingPlan) {
    console.log("[WiseHireHop] queued auto-child plan:", pendingPlan);
    AUTO_CHILD_QUEUE.push(pendingPlan);
    $dialog.removeData("wisePendingAutoChildPlan");
    processAutoChildQueue();
  } else {
    console.log("[WiseHireHop] no pending auto-child plan on dialog close");
  }

  var $form = $dialog.find("form.edit_type").filter(function () {
    return $(this).find('input[name="kind"][value="0"]').length > 0;
  }).first();

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

    if (
      !ui.$proxy.length ||
      !ui.$hidden.length ||
      !ui.$render.length ||
      !ui.$modifier.length ||
      !ui.$template.length ||
      !ui.$additional.length ||
      !ui.$autoChildren.length
    ) return;

    populateTemplateSelect(ui.$template, $dialog, ui.$template.val() || "");
    refreshRenderTypeState($dialog, ui);
    syncUiFromActual($form, $dialog, $actualNameInput, ui);
    bindUiHandlers($form, $dialog, $actualNameInput, ui);
    refreshModifierState($dialog, ui, ui.$modifier.val() || "none");
    refreshAutoCreateState($dialog, ui);
  }

  // =========================================================
  // DIALOG / FORM HELPERS
  // =========================================================
  function isHeadingDialog($dialog) {
    if (!$dialog || !$dialog.length || !$dialog.is(":visible")) return false;

    var title = $.trim($dialog.find(".ui-dialog-title").first().text()).toLowerCase();
    return title === "edit heading" || title === "add heading" || title === "new heading";
  }

  function isNewHeadingDialog($dialog) {
  if (!$dialog || !$dialog.length || !$dialog.is(":visible")) return false;

  var $form = getVisibleHeadingForm($dialog);
  if ($form.length) {
    var idVal = $.trim(String($form.find('input[name="id"]').first().val() || ""));
    if (idVal === "0" || idVal === "") {
      return true;
    }
  }

  var title = $.trim($dialog.find(".ui-dialog-title").first().text()).toLowerCase();
  return title === "add heading" || title === "new heading";
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

  function getCancelButton($dialog) {
    return $dialog.find(".ui-dialog-buttonpane button").filter(function () {
      return $.trim($(this).text()).toLowerCase() === "cancel";
    }).first();
  }

  function getParentSelect($dialog) {
    return $dialog.find("select.hh_base_select").first();
  }

  function getUiRefsFromDialog($dialog) {
    return {
      $ui: $dialog.find(".wise-docgen-ui").first(),
      $proxy: $dialog.find(".wise-docgen-display-name").first(),
      $hidden: $dialog.find(".wise-docgen-hidden").first(),
      $additional: $dialog.find(".wise-docgen-additional").first(),
      $render: $dialog.find(".wise-docgen-render-type").first(),
      $modifier: $dialog.find(".wise-docgen-modifier").first(),
      $modifierRow: $dialog.find(".wise-docgen-modifier-row").first(),
      $modifierLabel: $dialog.find(".wise-docgen-modifier-label-cell").first(),
      $template: $dialog.find(".wise-docgen-template").first(),
      $autoChildren: $dialog.find(".wise-docgen-auto-children").first(),
      $autoChildrenRow: $dialog.find(".wise-docgen-autocreate-row").first(),
      $autoChildrenLabel: $dialog.find(".wise-docgen-autocreate-label-cell").first()
    };
  }

  // =========================================================
  // UI BUILD
  // =========================================================
  function ensureHeadingUi($form, $actualNameInput) {
    var $ui = $form.find(".wise-docgen-ui").first();

    if (!$ui.length) {
      var width = $actualNameInput.outerWidth() || 450;

      neutraliseOriginalHeadingInlineLabel($actualNameInput);

      $ui = $(
        '<div class="wise-docgen-ui" style="display:block; margin:6px 0 10px 0;">' +

          '<div class="wise-docgen-meta" style="display:grid; grid-template-columns: 190px minmax(220px, 1fr); gap:8px 12px; align-items:center; max-width:780px; margin-bottom:12px;">' +

            '<div class="wise-docgen-setting-label">Page template</div>' +
            '<div class="wise-docgen-setting-control">' +
              '<select class="wise-docgen-template" style="min-width:320px;"></select>' +
            '</div>' +

            '<div class="wise-docgen-setting-label wise-docgen-autocreate-label-cell" style="display:none;">Default dept pages</div>' +
            '<div class="wise-docgen-setting-control wise-docgen-autocreate-row" style="display:none;">' +
              '<label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">' +
                '<input type="checkbox" class="wise-docgen-auto-children" style="margin:0;">' +
                '<span>Auto-create approved dept pages</span>' +
              '</label>' +
            '</div>' +

          '</div>' +

          '<div class="wise-docgen-headingname-row" style="margin-bottom:12px;">' +
            '<label class="wise-docgen-headingname-label" style="display:block; font-weight:600; margin-bottom:4px;">Heading name</label>' +
            '<input type="text" class="wise-docgen-display-name" maxlength="60" style="width:' + width + 'px;">' +
          '</div>' +

          '<div class="wise-docgen-meta" style="display:grid; grid-template-columns: 190px minmax(220px, 1fr); gap:8px 12px; align-items:center; max-width:780px;">' +

            '<div class="wise-docgen-setting-label">Hide in doc generator</div>' +
            '<div class="wise-docgen-setting-control">' +
              '<input type="checkbox" class="wise-docgen-hidden" style="margin:0;">' +
            '</div>' +

            '<div class="wise-docgen-setting-label">Additional options costs</div>' +
            '<div class="wise-docgen-setting-control">' +
              '<input type="checkbox" class="wise-docgen-additional" style="margin:0;">' +
            '</div>' +

            '<div class="wise-docgen-setting-label">Render as</div>' +
            '<div class="wise-docgen-setting-control">' +
              '<select class="wise-docgen-render-type" style="min-width:180px;">' +
                '<option value="normal">Normal heading</option>' +
                '<option value="section">Section page</option>' +
                '<option value="dept">Dept page</option>' +
              '</select>' +
            '</div>' +

            '<div class="wise-docgen-setting-label wise-docgen-modifier-label-cell" style="display:none;">Modifier</div>' +
            '<div class="wise-docgen-setting-control wise-docgen-modifier-row" style="display:none;">' +
              '<select class="wise-docgen-modifier" style="min-width:220px;"></select>' +
            '</div>' +

          '</div>' +
        '</div>'
      );

      $actualNameInput.hide();
      $actualNameInput.after($ui);
    } else {
      $actualNameInput.hide();
      neutraliseOriginalHeadingInlineLabel($actualNameInput);
    }

    return {
      $ui: $ui,
      $proxy: $ui.find(".wise-docgen-display-name").first(),
      $hidden: $ui.find(".wise-docgen-hidden").first(),
      $additional: $ui.find(".wise-docgen-additional").first(),
      $render: $ui.find(".wise-docgen-render-type").first(),
      $modifier: $ui.find(".wise-docgen-modifier").first(),
      $modifierRow: $ui.find(".wise-docgen-modifier-row").first(),
      $modifierLabel: $ui.find(".wise-docgen-modifier-label-cell").first(),
      $template: $ui.find(".wise-docgen-template").first(),
      $autoChildren: $ui.find(".wise-docgen-auto-children").first(),
      $autoChildrenRow: $ui.find(".wise-docgen-autocreate-row").first(),
      $autoChildrenLabel: $ui.find(".wise-docgen-autocreate-label-cell").first()
    };
  }

  function neutraliseOriginalHeadingInlineLabel($actualNameInput) {
    var inputEl = $actualNameInput.get(0);
    if (!inputEl || inputEl._wiseHeadingLabelNeutralised) return;

    var prev = inputEl.previousSibling;

    while (prev && prev.nodeType === 3) {
      if ($.trim(prev.nodeValue).toLowerCase() === "heading:") {
        prev.nodeValue = "";
        break;
      }
      prev = prev.previousSibling;
    }

    var next = inputEl.nextSibling;
    while (next && next.nodeType === 3 && $.trim(next.nodeValue) === "") {
      next = next.nextSibling;
    }

    if (next && next.nodeType === 1 && next.tagName && next.tagName.toLowerCase() === "br") {
      next.style.display = "none";
    }

    inputEl._wiseHeadingLabelNeutralised = true;
  }

  // =========================================================
  // INITIAL SYNC
  // =========================================================
  function syncUiFromActual($form, $dialog, $actualNameInput, ui) {
    if ($form.data("wiseDocgenInitialised") === "1") return;

    var meta = parseHeadingMetaForDialog($actualNameInput.val() || "", $dialog);

    ui.$proxy.val(meta.name);
    ui.$hidden.prop("checked", meta.hidden);
    ui.$additional.prop("checked", meta.additionalOptions);
    ui.$render.val(meta.renderType);
    ui.$autoChildren.prop("checked", false);

    syncTemplateControl($dialog, ui, meta);
    refreshRenderTypeState($dialog, ui);
    refreshModifierState($dialog, ui, meta.modifier || "none");
    refreshAutoCreateState($dialog, ui);
    syncActualFromUi($dialog, $actualNameInput, ui);

    $form.data("wiseDocgenInitialised", "1");
  }

  // =========================================================
  // EVENT BINDING
  // =========================================================
  function bindUiHandlers($form, $dialog, $actualNameInput, ui) {
    if ($form.data("wiseDocgenBound") !== "1") {
      ui.$template.on("change.wiseDocgen", function () {
        applyTemplateSelection($dialog, ui);
        populateTemplateSelect(ui.$template, $dialog, ui.$template.val() || "");
        refreshRenderTypeState($dialog, ui);
        refreshModifierState($dialog, ui, ui.$modifier.val() || "none");
        refreshAutoCreateState($dialog, ui);
        syncActualFromUi($dialog, $actualNameInput, ui);
      });

      ui.$proxy.on("input.wiseDocgen change.wiseDocgen keyup.wiseDocgen blur.wiseDocgen", function () {
        syncTemplateControl($dialog, ui);
        refreshRenderTypeState($dialog, ui);
        refreshModifierState($dialog, ui, ui.$modifier.val() || "none");
        refreshAutoCreateState($dialog, ui);
        syncActualFromUi($dialog, $actualNameInput, ui);
      });

      ui.$hidden.on("change.wiseDocgen", function () {
        syncActualFromUi($dialog, $actualNameInput, ui);
      });

      ui.$additional.on("change.wiseDocgen", function () {
        syncActualFromUi($dialog, $actualNameInput, ui);
      });

      ui.$render.on("change.wiseDocgen", function () {
        syncTemplateControl($dialog, ui);
        refreshRenderTypeState($dialog, ui);
        refreshModifierState($dialog, ui, ui.$modifier.val() || "none");
        refreshAutoCreateState($dialog, ui);
        syncActualFromUi($dialog, $actualNameInput, ui);
      });

      ui.$modifier.on("change.wiseDocgen", function () {
        syncActualFromUi($dialog, $actualNameInput, ui);
      });

      ui.$autoChildren.on("change.wiseDocgen", function () {
        // purely UI state; no stored value
      });

      ui.$proxy.on("keydown.wiseDocgen", function (e) {
        if (e.key === "Enter") {
          syncTemplateControl($dialog, ui);
          refreshRenderTypeState($dialog, ui);
          refreshModifierState($dialog, ui, ui.$modifier.val() || "none");
          refreshAutoCreateState($dialog, ui);
          syncActualFromUi($dialog, $actualNameInput, ui);
        }
      });

      $form.data("wiseDocgenBound", "1");
    }

    var $parentSelect = getParentSelect($dialog);
    if ($parentSelect.length && $parentSelect.data("wiseDocgenBound") !== "1") {
      $parentSelect.on("change.wiseDocgen", function () {
        populateTemplateSelect(ui.$template, $dialog, ui.$template.val() || "");
        syncTemplateControl($dialog, ui);
        refreshRenderTypeState($dialog, ui);
        refreshModifierState($dialog, ui, ui.$modifier.val() || "none");
        refreshAutoCreateState($dialog, ui);
        syncActualFromUi($dialog, $actualNameInput, ui);
      });
      $parentSelect.data("wiseDocgenBound", "1");
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
        syncTemplateControl($dialog, ui);
        refreshRenderTypeState($dialog, ui);
        refreshModifierState($dialog, ui, ui.$modifier.val() || "none");
        refreshAutoCreateState($dialog, ui);
        syncActualFromUi($dialog, $actualNameInput, ui);
        maybeStorePendingAutoChildPlan($dialog, $actualNameInput, ui);
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
  // AUTO CREATE CHILD DEPTS
  // =========================================================
  function refreshAutoCreateState($dialog, ui) {
    var eligible = isAutoCreateEligible($dialog, ui);

    if (!eligible) {
      ui.$autoChildrenLabel.hide().text("Default dept pages");
      ui.$autoChildrenRow.hide();
      ui.$autoChildren.prop("checked", false).prop("disabled", true);
      return;
    }

    ui.$autoChildrenLabel.text("Default dept pages").show();
    ui.$autoChildrenRow.show();
    ui.$autoChildren.prop("disabled", false);
  }

  function isAutoCreateEligible($dialog, ui) {
    if (!isNewHeadingDialog($dialog)) return false;

    var parentMeta = getParentHeadingMeta($dialog);
    var parentName = normaliseText((parentMeta && parentMeta.name) || "");
    var parentRenderType = (parentMeta && parentMeta.renderType) || "normal";

    if (parentName || parentRenderType !== "normal") return false;
    if ((ui.$render.val() || "normal") !== "section") return false;

    var children = getDefaultDeptTemplatesForSectionName(ui.$proxy.val() || "");
    return children.length > 0;
  }

  function getDefaultDeptTemplatesForSectionName(sectionName) {
    var cleanSectionName = normaliseText(sectionName);

    return PAGE_TEMPLATES.filter(function (tpl) {
      return tpl.renderType === "dept" &&
        tpl.parentRenderType === "section" &&
        normaliseText(tpl.parentName) === cleanSectionName;
    }).sort(sortTemplates);
  }

  function maybeStorePendingAutoChildPlan($dialog, $actualNameInput, ui) {
  if (!isAutoCreateEligible($dialog, ui)) {
    console.log("[WiseHireHop] auto-create not eligible for this heading");
    $dialog.removeData("wisePendingAutoChildPlan");
    return;
  }

  if (!ui.$autoChildren.prop("checked")) {
    console.log("[WiseHireHop] auto-create checkbox not ticked");
    $dialog.removeData("wisePendingAutoChildPlan");
    return;
  }

  var childTemplates = getDefaultDeptTemplatesForSectionName(ui.$proxy.val() || "");
  if (!childTemplates.length) {
    console.log("[WiseHireHop] no default child dept templates found for section:", ui.$proxy.val() || "");
    $dialog.removeData("wisePendingAutoChildPlan");
    return;
  }

  var plan = {
    parentStoredValue: $actualNameInput.val() || "",
    sectionName: ui.$proxy.val() || "",
    childTemplates: childTemplates.map(function (tpl) {
      return {
        key: tpl.key,
        renderType: tpl.renderType,
        name: tpl.name,
        parentRenderType: tpl.parentRenderType,
        parentName: tpl.parentName
      };
    })
  };

  console.log("[WiseHireHop] pending auto-child plan stored:", plan);
  $dialog.data("wisePendingAutoChildPlan", plan);
}

  async function processAutoChildQueue() {
  if (AUTO_CHILD_RUNNING) return;
  AUTO_CHILD_RUNNING = true;

  try {
    while (AUTO_CHILD_QUEUE.length) {
      var plan = AUTO_CHILD_QUEUE.shift();
      if (plan) {
        console.log("[WiseHireHop] running auto-child plan for:", plan.sectionName, plan);
        try {
          await runAutoChildPlan(plan);
        } catch (err) {
          console.warn("[WiseHireHop] auto child creation failed", err);
        }
      }
    }
  } finally {
    AUTO_CHILD_RUNNING = false;
  }
}

  async function runAutoChildPlan(plan) {
    if (!plan || !plan.childTemplates || !plan.childTemplates.length) return;

    // Give HireHop a moment to save and refresh the parent section
    await sleep(500);

    for (var i = 0; i < plan.childTemplates.length; i++) {
      await createChildHeadingFromTemplate(plan, plan.childTemplates[i]);
      await sleep(150);
    }
  }

  async function createChildHeadingFromTemplate(plan, childTemplate) {
  var maxAttempts = 8;

  for (var attempt = 1; attempt <= maxAttempts; attempt++) {
    var opened = openAddHeadingDialog();
    if (!opened) {
      await sleep(300);
      continue;
    }

    // First check whether the New button opens the heading dialog directly
    var $dialog = await waitForNewHeadingDialog(800);

    // If not, try clicking a Heading item from the New menu
    if ((!$dialog || !$dialog.length)) {
      var $headingOption = findVisibleNewMenuHeadingOption();
      if ($headingOption.length) {
        clickElementNative($headingOption);
        $dialog = await waitForNewHeadingDialog(2500);
      }
    }

    if (!$dialog || !$dialog.length) {
      await sleep(300);
      continue;
    }

    await waitForInjectedUi($dialog, 2500);

    var childUi = getUiRefsFromDialog($dialog);
    var $parentSelect = getParentSelect($dialog);

    if (!$parentSelect.length) {
      cancelHeadingDialog($dialog);
      await sleep(300);
      continue;
    }

    if (!selectOptionByText($parentSelect, plan.parentStoredValue)) {
      cancelHeadingDialog($dialog);
      await sleep(350);
      continue;
    }

    await sleep(60);

    populateTemplateSelect(childUi.$template, $dialog, childTemplate.key);

    if (childUi.$template.find('option[value="' + childTemplate.key + '"]').length) {
      childUi.$template.val(childTemplate.key).trigger("change");
    } else {
      childUi.$render.val(childTemplate.renderType || "dept").trigger("change");
      childUi.$proxy.val(childTemplate.name || "").trigger("input").trigger("change");
    }

    await sleep(60);

    // Re-apply exact parent after template selection
    selectOptionByText($parentSelect, plan.parentStoredValue);
    await sleep(60);

    childUi.$hidden.prop("checked", false).trigger("change");
    childUi.$additional.prop("checked", false).trigger("change");
    childUi.$autoChildren.prop("checked", false).trigger("change");

    var $save = getSaveButton($dialog);
    if (!$save.length) {
      cancelHeadingDialog($dialog);
      await sleep(300);
      continue;
    }

    clickElementNative($save);
    await waitUntil(function () { return !isDialogStillOpen($dialog); }, 5000, 100);
    await sleep(250);
    return true;
  }

  try { console.warn("[WiseHireHop] Could not auto-create child heading:", childTemplate && childTemplate.name); } catch (e) {}
  return false;
}

 function openAddHeadingDialog() {
  var $trigger = findAddHeadingTrigger();
  if (!$trigger.length) {
    console.warn("[WiseHireHop] no New trigger found");
    return false;
  }

  console.log("[WiseHireHop] clicking New trigger:", $trigger.get(0));
  clickElementNative($trigger);

  return true;
}

function findAddHeadingTrigger() {
  var $all = $('button, a, [role="button"], input[type="button"], input[type="submit"]')
    .filter(":visible")
    .filter(function () {
      return $(this).closest(".ui-dialog").length === 0;
    });

  // Exact known HireHop toolbar button
  var $classMatch = $all.filter(function () {
    var $el = $(this);
    var txt = $.trim(getTriggerText($el)).toLowerCase();
    return $el.hasClass("items_func_btn") && txt === "new";
  }).first();

  if ($classMatch.length) {
    console.log("[WiseHireHop] using class-based New trigger:", $classMatch.get(0));
    return $classMatch;
  }

  // Exact text fallback
  var $exact = $all.filter(function () {
    var txt = $.trim(getTriggerText($(this))).toLowerCase();
    return txt === "new" || txt === "add heading" || txt === "new heading";
  }).first();

  if ($exact.length) {
    console.log("[WiseHireHop] using exact trigger:", $exact.get(0));
    return $exact;
  }

  // Fuzzy fallback
  var $fuzzy = $all.filter(function () {
    var txt = $.trim(getTriggerText($(this))).toLowerCase();
    return /\bnew\b|\bheading\b/.test(txt);
  }).first();

  if ($fuzzy.length) {
    console.log("[WiseHireHop] using fuzzy trigger:", $fuzzy.get(0));
  } else {
    console.warn("[WiseHireHop] no add-heading trigger found");
  }

  return $fuzzy;
}

function findVisibleNewMenuHeadingOption() {
  var $all = $('button, a, li, div, span')
    .filter(":visible")
    .filter(function () {
      return $(this).closest(".ui-dialog").length === 0;
    });

  // Prefer explicit heading items
  var $heading = $all.filter(function () {
    var txt = $.trim($(this).text()).toLowerCase();
    return txt === "heading" || txt === "new heading";
  }).first();

  if ($heading.length) {
    console.log("[WiseHireHop] found Heading menu option:", $heading.get(0));
    return $heading;
  }

  // Fuzzy fallback, but avoid toolbar "New"
  var $fuzzy = $all.filter(function () {
    var txt = $.trim($(this).text()).toLowerCase();
    if (!txt) return false;
    if (txt === "new") return false;
    return /\bheading\b/.test(txt);
  }).first();

  if ($fuzzy.length) {
    console.log("[WiseHireHop] using fuzzy Heading option:", $fuzzy.get(0));
  } else {
    console.warn("[WiseHireHop] no Heading menu option found");
  }

  return $fuzzy;
}

function clickElementNative($el) {
  if (!$el || !$el.length) return false;

  var el = $el.get(0);
  if (!el) return false;

  try {
    el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return true;
  } catch (e) {
    try {
      el.click();
      return true;
    } catch (e2) {
      return false;
    }
  }
}
  function getTriggerText($el) {
    return $.trim($el.text() || $el.val() || $el.attr("title") || $el.attr("aria-label") || "");
  }

  async function waitForNewHeadingDialog(timeoutMs) {
  var result = await waitUntilResult(function () {
    var $match = $();
    $(".ui-dialog:visible").each(function () {
      var $dlg = $(this);
      if (isNewHeadingDialog($dlg)) {
        $match = $dlg;
        return false;
      }
    });
    return $match.length ? $match : null;
  }, timeoutMs || 3000, 100);

  if (result && result.length) {
    console.log("[WiseHireHop] detected new heading dialog:", result.get(0));
  } else {
    console.warn("[WiseHireHop] no new heading dialog detected");
  }

  return result;
}

  async function waitForInjectedUi($dialog, timeoutMs) {
    return waitUntil(function () {
      return $dialog.find(".wise-docgen-ui").length > 0;
    }, timeoutMs || 2000, 80);
  }

  function isDialogStillOpen($dialog) {
    return !!($dialog && $dialog.length && $dialog.is(":visible"));
  }

  function cancelHeadingDialog($dialog) {
    var $cancel = getCancelButton($dialog);
    if ($cancel.length) {
      $cancel.get(0).click();
      return;
    }

    var $close = $dialog.find(".ui-dialog-titlebar-close:visible").first();
    if ($close.length) {
      $close.get(0).click();
    }
  }

  function selectOptionByText($select, desiredText) {
    if (!$select.length || !desiredText) return false;

    var target = normaliseText(desiredText);
    var matched = false;

    $select.find("option").each(function () {
      var $opt = $(this);
      if (normaliseText($opt.text()) === target) {
        $select.val($opt.val()).trigger("change");
        matched = true;
        return false;
      }
    });

    return matched;
  }

  async function waitUntil(predicate, timeoutMs, intervalMs) {
    var started = Date.now();
    while ((Date.now() - started) < timeoutMs) {
      if (predicate()) return true;
      await sleep(intervalMs || 100);
    }
    return false;
  }

  async function waitUntilResult(getter, timeoutMs, intervalMs) {
    var started = Date.now();
    while ((Date.now() - started) < timeoutMs) {
      var result = getter();
      if (result) return result;
      await sleep(intervalMs || 100);
    }
    return null;
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  // =========================================================
  // SYNCHRONISE REAL FIELD
  // =========================================================
  function syncActualFromUi($dialog, $actualNameInput, ui) {
    var meta = {
      additionalOptions: ui.$additional.prop("checked"),
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
      additionalOptions: false,
      hidden: false,
      renderType: "normal",
      name: raw
    };

    var changed = true;
    while (changed) {
      changed = false;

      if (/^\/\/\s*/i.test(raw)) {
        meta.hidden = true;
        raw = raw.replace(/^\/\/\s*/i, "");
        changed = true;
      }

      if (/^\$\s*/i.test(raw)) {
        meta.additionalOptions = true;
        raw = raw.replace(/^\$\s*/i, "");
        changed = true;
      }
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
    var additionalOptions = !!(meta && meta.additionalOptions);
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
    if (additionalOptions) prefix += "$ ";

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

  // =========================================================
  // TEMPLATE ENGINE
  // =========================================================
  function populateTemplateSelect($select, $dialog, selectedKey) {
    if (!$select.length) return;

    var parentMeta = getParentHeadingMeta($dialog);
    var allowedTemplates = getAllowedTemplatesForParent(parentMeta);

    $select.empty();
    $select.append($("<option></option>").attr("value", "").text("Custom / Manual"));

    if (!allowedTemplates.length) {
      $select.prop("disabled", true).val("");
      return;
    }

    $select.prop("disabled", false);

    var sections = allowedTemplates.filter(function (t) { return t.renderType === "section"; });
    var depts = allowedTemplates.filter(function (t) { return t.renderType === "dept"; });

    if (sections.length) {
      var $sectionGroup = $('<optgroup label="Section pages"></optgroup>');
      $.each(sections, function (_, tpl) {
        $sectionGroup.append(
          $("<option></option>")
            .attr("value", tpl.key)
            .text(getTemplateOptionText(tpl))
        );
      });
      $select.append($sectionGroup);
    }

    if (depts.length) {
      var $deptGroup = $('<optgroup label="Dept pages"></optgroup>');
      $.each(depts, function (_, tpl) {
        $deptGroup.append(
          $("<option></option>")
            .attr("value", tpl.key)
            .text(getTemplateOptionText(tpl))
        );
      });
      $select.append($deptGroup);
    }

    if (selectedKey && $select.find('option[value="' + selectedKey + '"]').length) {
      $select.val(selectedKey);
    } else {
      $select.val("");
    }
  }

  function getAllowedTemplatesForParent(parentMeta) {
    var parentRenderType = (parentMeta && parentMeta.renderType) || "normal";
    var parentName = normaliseText((parentMeta && parentMeta.name) || "");

    if (!parentName && parentRenderType === "normal") {
      return PAGE_TEMPLATES.filter(function (tpl) {
        return tpl.renderType === "section" && !tpl.parentRenderType && !tpl.parentName;
      }).sort(sortTemplates);
    }

    if (parentRenderType === "section" && parentName) {
      return PAGE_TEMPLATES.filter(function (tpl) {
        return tpl.renderType === "dept" &&
          tpl.parentRenderType === "section" &&
          normaliseText(tpl.parentName) === parentName;
      }).sort(sortTemplates);
    }

    return [];
  }

  function sortTemplates(a, b) {
    var a1 = a.sectionRank == null ? 999 : a.sectionRank;
    var b1 = b.sectionRank == null ? 999 : b.sectionRank;
    if (a1 !== b1) return a1 - b1;

    var a2 = a.deptRank == null ? 999 : a.deptRank;
    var b2 = b.deptRank == null ? 999 : b.deptRank;
    if (a2 !== b2) return a2 - b2;

    return normaliseDisplayText(a.name).localeCompare(normaliseDisplayText(b.name));
  }

  function syncTemplateControl($dialog, ui, metaOverride) {
    var parentMeta = getParentHeadingMeta($dialog);
    var renderType = metaOverride ? metaOverride.renderType : (ui.$render.val() || "normal");
    var name = metaOverride ? metaOverride.name : (ui.$proxy.val() || "");
    var template = findTemplateForValues(renderType, name, parentMeta);

    populateTemplateSelect(ui.$template, $dialog, template ? template.key : "");
    ui.$template.val(template ? template.key : "");
  }

  function applyTemplateSelection($dialog, ui) {
    var key = ui.$template.val() || "";
    if (!key) return;

    var template = findTemplateByKey(key);
    if (!template) return;

    ui.$render.val(template.renderType);
    ui.$proxy.val(template.name);

    if (template.parentRenderType && template.parentName) {
      trySetParentHeading($dialog, template.parentRenderType, template.parentName);
    } else if (!template.parentRenderType && !template.parentName) {
      tryClearParentHeading($dialog);
    }
  }

  function findTemplateByKey(key) {
    for (var i = 0; i < PAGE_TEMPLATES.length; i++) {
      if (PAGE_TEMPLATES[i].key === key) return PAGE_TEMPLATES[i];
    }
    return null;
  }

  function findTemplateForValues(renderType, name, parentMeta) {
    var cleanName = normaliseText(name);
    var parentRenderType = (parentMeta && parentMeta.renderType) || "normal";
    var parentName = normaliseText((parentMeta && parentMeta.name) || "");

    var exactMatch = null;
    var looseMatch = null;

    for (var i = 0; i < PAGE_TEMPLATES.length; i++) {
      var tpl = PAGE_TEMPLATES[i];
      if (tpl.renderType !== renderType) continue;
      if (normaliseText(tpl.name) !== cleanName) continue;

      if (!tpl.parentRenderType && !tpl.parentName) {
        if (!looseMatch) looseMatch = tpl;
        continue;
      }

      if (
        tpl.parentRenderType === parentRenderType &&
        normaliseText(tpl.parentName) === parentName
      ) {
        exactMatch = tpl;
        break;
      }
    }

    return exactMatch || looseMatch || null;
  }

  function getTemplateOptionText(template) {
    var parent = template.parentName ? normaliseDisplayText(template.parentName) + " → " : "";
    return parent + normaliseDisplayText(template.name);
  }

  function normaliseDisplayText(value) {
    return $.trim(String(value || "").replace(/<br\s*\/?>/gi, " "));
  }

  function composeParentHeadingText(renderType, name) {
    if (!name) return "";
    if (renderType === "section") return "Section: " + name;
    if (renderType === "dept") return "Dept: " + name;
    return String(name || "");
  }

  function trySetParentHeading($dialog, renderType, name) {
    var $select = getParentSelect($dialog);
    if (!$select.length) return false;

    var desired = composeParentHeadingText(renderType, name);
    if (!desired) return false;

    var matched = false;

    $select.find("option").each(function () {
      var $opt = $(this);
      if (normaliseText($opt.text()) === normaliseText(desired)) {
        $select.val($opt.val()).trigger("change");
        matched = true;
        return false;
      }
    });

    return matched;
  }

  function tryClearParentHeading($dialog) {
    var $select = getParentSelect($dialog);
    if (!$select.length) return false;

    var matched = false;

    $select.find("option").each(function () {
      var $opt = $(this);
      if (normaliseText($opt.text()) === "none") {
        $select.val($opt.val()).trigger("change");
        matched = true;
        return false;
      }
    });

    return matched;
  }

  // =========================================================
  // RENDER TYPE CONSTRAINTS
  // =========================================================
  function refreshRenderTypeState($dialog, ui) {
    var parentMeta = getParentHeadingMeta($dialog);
    var parentRenderType = (parentMeta && parentMeta.renderType) || "normal";
    var parentName = normaliseText((parentMeta && parentMeta.name) || "");

    var allowed = ["normal"];

    if (!parentName && parentRenderType === "normal") {
      allowed = ["normal", "section"];
    } else if (parentRenderType === "section" && parentName) {
      allowed = ["normal", "dept"];
    } else {
      allowed = ["normal"];
    }

    ui.$render.find("option").each(function () {
      var val = $(this).attr("value");
      $(this).prop("disabled", allowed.indexOf(val) === -1);
    });

    if (allowed.indexOf(ui.$render.val()) === -1) {
      ui.$render.val("normal");
    }
  }

  // =========================================================
  // MODIFIER UI
  // =========================================================
  function refreshModifierState($dialog, ui, preferredValue) {
    var profile = getModifierProfile($dialog, ui);

    if (!profile) {
      ui.$modifierLabel.hide().text("Modifier");
      ui.$modifierRow.hide();
      ui.$modifier.prop("disabled", true);
      populateModifierOptions(ui, [{ value: "none", label: "None" }], "none");
      return;
    }

    ui.$modifierLabel.text(profile.label).show();
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
    var $select = getParentSelect($dialog);
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
        additionalOptions: false,
        hidden: false,
        renderType: "normal",
        name: ""
      };
    }

    return parseHeadingBaseMeta(raw);
  }

  // =========================================================
  // TEXT HELPERS
  // =========================================================
  function normaliseText(value) {
    return $.trim(String(value || "").replace(/<br\s*\/?>/gi, " ")).toLowerCase();
  }

  function endsWithIgnoreCase(full, suffix) {
    return full.toLowerCase().slice(-suffix.length) === suffix.toLowerCase();
  }

  // =========================================================
  // EVENT HELPER
  // =========================================================
  function triggerInputEvents($el) {
    $el.trigger("input").trigger("change");
  }
})();
