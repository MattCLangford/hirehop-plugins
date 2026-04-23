(function () {
  "use strict";

  try { console.warn("[WiseHireHop] heading docgen meta plugin loaded - v2026-04-23.09"); } catch (e) {}

  var $ = window.jQuery;
  if (!$) return;

  var applyTimer = null;
  var PENDING_PARENT_SAVE_PLAN = null;
  var DIRECT_CREATE_QUEUE = [];
  var DIRECT_CREATE_RUNNING = false;

  var AUTO_CREATE_SECTION_NAMES = {
    "details": true,
    "suffix": true,
    "proposal summary": true,
    "labour & general requirements": true
  };

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
    },
    {
  key: "thank_you_variant",
  renderType: "dept",
  name: "thank you",
  parentRenderType: "section",
  parentName: "suffix",
  label: "Thank you page style",
  options: [
    { value: "none", label: "Standard", suffix: "" },
    { value: "alt",  label: "Alt",      suffix: " -Alt" }
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

    var title = $.trim($dialog.find(".ui-dialog-title").first().text()).toLowerCase();
    var isHeading = title === "edit heading" || title === "add heading" || title === "new heading";
    if (!isHeading) return;

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
  installItemsSaveInterceptor();

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

  function getParentSelect($dialog) {
    return $dialog.find("select.hh_base_select").first();
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
        // UI state only
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
  // AUTO CREATE CHILD DEPTS - DIRECT HTTP VERSION
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

    if (!AUTO_CREATE_SECTION_NAMES[cleanSectionName]) {
      return [];
    }

    return PAGE_TEMPLATES.filter(function (tpl) {
      return tpl.renderType === "dept" &&
        tpl.parentRenderType === "section" &&
        normaliseText(tpl.parentName) === cleanSectionName;
    }).sort(sortTemplates);
  }

  function maybeStorePendingAutoChildPlan($dialog, $actualNameInput, ui) {
    if (!isAutoCreateEligible($dialog, ui)) {
      console.log("[WiseHireHop] auto-create not eligible for this heading");
      PENDING_PARENT_SAVE_PLAN = null;
      return;
    }

    if (!ui.$autoChildren.prop("checked")) {
      console.log("[WiseHireHop] auto-create checkbox not ticked");
      PENDING_PARENT_SAVE_PLAN = null;
      return;
    }

    var childTemplates = getDefaultDeptTemplatesForSectionName(ui.$proxy.val() || "");
    if (!childTemplates.length) {
      console.log("[WiseHireHop] no default child dept templates found for section:", ui.$proxy.val() || "");
      PENDING_PARENT_SAVE_PLAN = null;
      return;
    }

    PENDING_PARENT_SAVE_PLAN = {
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
      }),
      armedAt: Date.now()
    };

    console.log("[WiseHireHop] pending auto-child plan stored:", PENDING_PARENT_SAVE_PLAN);
  }

  function installItemsSaveInterceptor() {
    if (window.__wiseItemsSaveInterceptorInstalled) return;
    window.__wiseItemsSaveInterceptorInstalled = true;

    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this._wiseItemsSaveMeta = {
        method: method,
        url: url
      };
      return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
      if (
        this._wiseItemsSaveMeta &&
        String(this._wiseItemsSaveMeta.method || "").toUpperCase() === "POST" &&
        isItemsSaveUrl(this._wiseItemsSaveMeta.url)
      ) {
        var meta = this._wiseItemsSaveMeta;
        meta.body = body;

        this.addEventListener("load", function () {
          try {
            handleItemsSaveResponse(meta.url, meta.body, this.status, this.responseText);
          } catch (err) {
            console.warn("[WiseHireHop] items_save interceptor error", err);
          }
        });
      }

      return origSend.apply(this, arguments);
    };

    console.log("[WiseHireHop] items_save interceptor installed");
  }

  function isItemsSaveUrl(url) {
    var u = String(url || "");
    return /\/php_functions\/items_save\.php(?:\?|$)/i.test(u);
  }

  function handleItemsSaveResponse(url, body, status, responseText) {
    if (!PENDING_PARENT_SAVE_PLAN) return;

    var req = parseFormEncodedBody(body);

    if (String(req.kind || "") !== "0") return;
    if (String(req.id || "") !== "0") return;
    if (String(req.parent || "") !== "0") return;

    if (normaliseText(req.name || "") !== normaliseText(PENDING_PARENT_SAVE_PLAN.parentStoredValue || "")) {
      return;
    }

    if ((Date.now() - (PENDING_PARENT_SAVE_PLAN.armedAt || 0)) > 30000) {
      console.warn("[WiseHireHop] pending auto-child plan expired");
      PENDING_PARENT_SAVE_PLAN = null;
      return;
    }

    var json = tryParseJson(responseText);
    var parentId = getCreatedHeadingIdFromResponse(json);

    if (!parentId) {
      console.warn("[WiseHireHop] could not read created parent heading ID from items_save response", json);
      PENDING_PARENT_SAVE_PLAN = null;
      return;
    }

    var plan = PENDING_PARENT_SAVE_PLAN;
    PENDING_PARENT_SAVE_PLAN = null;

    plan.parentId = String(parentId);
    plan.job = String(req.job || "");

    console.log("[WiseHireHop] matched parent save response. Queueing direct child creation:", plan);
    queueDirectChildCreatePlan(plan);
  }

  function parseFormEncodedBody(body) {
    var out = {};

    if (!body) return out;

    if (typeof body === "string") {
      var params = new URLSearchParams(body);
      params.forEach(function (value, key) {
        out[key] = value;
      });
      return out;
    }

    if (body instanceof URLSearchParams) {
      body.forEach(function (value, key) {
        out[key] = value;
      });
      return out;
    }

    if (window.FormData && body instanceof FormData) {
      body.forEach(function (value, key) {
        out[key] = String(value);
      });
      return out;
    }

    if (typeof body === "object") {
      $.each(body, function (key, value) {
        out[key] = value;
      });
    }

    return out;
  }

  function tryParseJson(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  function getCreatedHeadingIdFromResponse(json) {
    if (!json || !json.items || !json.items.length) return "";
    var item = json.items[0] || {};
    return String(item.ID || item.id || "");
  }

  function queueDirectChildCreatePlan(plan) {
    DIRECT_CREATE_QUEUE.push(plan);
    processDirectCreateQueue();
  }

  async function processDirectCreateQueue() {
    if (DIRECT_CREATE_RUNNING) return;
    DIRECT_CREATE_RUNNING = true;

    try {
      while (DIRECT_CREATE_QUEUE.length) {
        var plan = DIRECT_CREATE_QUEUE.shift();
        if (!plan) continue;

        console.log("[WiseHireHop] running direct child create plan for:", plan.sectionName, plan);

        for (var i = 0; i < plan.childTemplates.length; i++) {
          try {
            await createHeadingDirect(plan, plan.childTemplates[i]);
          } catch (err) {
            console.warn("[WiseHireHop] direct child create failed for:", plan.childTemplates[i], err);
          }
        }

        triggerSupplyingRefresh();
      }
    } finally {
      DIRECT_CREATE_RUNNING = false;
    }
  }

  async function createHeadingDirect(plan, childTemplate) {
    var payload = {
      parent: String(plan.parentId || "0"),
      flag: "0",
      priority_confirm: "0",
      custom_fields: "",
      kind: "0",
      local: formatHireHopLocalDateTime(new Date()),
      id: "0",
      name: composeStoredHeadingFromTemplate(childTemplate),
      desc: "",
      memo: "",
      set_child_dates: "0",
      job: String(plan.job || ""),
      no_availability: "0",
      ignore: "0"
    };

    console.log("[WiseHireHop] creating child heading via HTTP:", payload);

    var response = await fetch("/php_functions/items_save.php", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      body: new URLSearchParams(payload).toString()
    });

    var text = await response.text();
    var json = tryParseJson(text);

    if (!response.ok) {
      throw new Error("items_save failed with status " + response.status + " :: " + text);
    }

    console.log("[WiseHireHop] child heading created:", json);
    return json;
  }

  function composeStoredHeadingFromTemplate(template) {
    var prefix = "";

    if (template.renderType === "section") {
      prefix = "Section: ";
    } else if (template.renderType === "dept") {
      prefix = "Dept: ";
    }

    return prefix + String(template.name || "");
  }

  function formatHireHopLocalDateTime(date) {
    function pad(n) {
      return String(n).padStart(2, "0");
    }

    return [
      date.getFullYear(),
      "-",
      pad(date.getMonth() + 1),
      "-",
      pad(date.getDate()),
      " ",
      pad(date.getHours()),
      ":",
      pad(date.getMinutes()),
      ":",
      pad(date.getSeconds())
    ].join("");
  }

  function triggerSupplyingRefresh() {
    var $btn = $('button, a, [role="button"], input[type="button"], input[type="submit"]')
      .filter(":visible")
      .filter(function () {
        return $(this).closest(".ui-dialog").length === 0;
      })
      .filter(function () {
        var txt = $.trim($(this).text() || $(this).val() || $(this).attr("title") || $(this).attr("aria-label") || "").toLowerCase();
        return txt === "refresh";
      })
      .first();

    if ($btn.length) {
      console.log("[WiseHireHop] refreshing supplying list");
      $btn.get(0).click();
    } else {
      console.warn("[WiseHireHop] could not find Refresh button");
    }
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
