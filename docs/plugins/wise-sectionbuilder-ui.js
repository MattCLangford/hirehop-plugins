(function () {
  "use strict";

  try { console.warn("[WiseHireHop] section builder loaded - v2026-04-25.02"); } catch (e) {}

  var $ = window.jQuery;
  if (!$) return;

  var DEPOT_RULE = {
    enabled: true,
    allowedIds: [
      "14"
    ],
    allowedNames: [
      "Project Costs"
    ],
    blockWhenUndetected: true
  };

  var DEPOT_BOOTSTRAP_MAX_TRIES = 120;
  var DEPOT_BOOTSTRAP_RETRY_MS = 500;
  var ITEMS_TAB_BOOTSTRAP_MAX_TRIES = 40;
  var ITEMS_TAB_BOOTSTRAP_RETRY_MS = 500;

  var BUTTON_ID = "wise-section-builder-button";
  var STYLES_ID = "wise-section-builder-styles";
  var OVERLAY_ID = "wise-section-builder-overlay";
  var MODAL_ID = "wise-section-builder-modal";
  var SECTION_SELECT_ID = "wise-section-builder-section";
  var SUBFOLDERS_SELECT_ID = "wise-section-builder-subfolders";
  var ANCHOR_SELECT_ID = "wise-section-builder-anchor";
  var POSITION_SELECT_ID = "wise-section-builder-position";
  var ANCHOR_REFRESH_ID = "wise-section-builder-refresh";
  var PREVIEW_ID = "wise-section-builder-preview";
  var STATUS_ID = "wise-section-builder-status";
  var CREATE_BUTTON_ID = "wise-section-builder-create";
  var CANCEL_BUTTON_ID = "wise-section-builder-cancel";

  var ROOT_END_VALUE = "__end__";

  var activeDepotContext = {
    id: "",
    name: ""
  };
  var lastDepotDecisionSignature = "";
  var builderInitialised = false;
  var createInFlight = false;

  var PAGE_TEMPLATES = [
    { key: "section_hero", renderType: "section", name: "Hero", parentRenderType: null, parentName: null, sectionRank: 1, deptRank: null },
    { key: "section_details", renderType: "section", name: "Details", autoCreateChildren: true, parentRenderType: null, parentName: null, sectionRank: 2, deptRank: null },

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

    { key: "section_labour_general_requirements", renderType: "section", name: "Labour & General Requirements", autoCreateChildren: true, parentRenderType: null, parentName: null, sectionRank: 5, deptRank: null },
    { key: "dept_labour", renderType: "dept", name: "Labour", parentRenderType: "section", parentName: "Labour & General Requirements", sectionRank: 5, deptRank: 1 },
    { key: "dept_general_requirements", renderType: "dept", name: "General Requirements", parentRenderType: "section", parentName: "Labour & General Requirements", sectionRank: 5, deptRank: 2 },

    { key: "section_proposal_summary", renderType: "section", name: "Proposal Summary", autoCreateChildren: true, parentRenderType: null, parentName: null, sectionRank: 6, deptRank: null },
    { key: "dept_project_total", renderType: "dept", name: "Project Total", parentRenderType: "section", parentName: "Proposal Summary", sectionRank: 6, deptRank: 1 },

    { key: "section_suffix", renderType: "section", name: "Suffix", autoCreateChildren: true, parentRenderType: null, parentName: null, sectionRank: 7, deptRank: null },
    { key: "dept_critical_path", renderType: "dept", name: "Critical Path", parentRenderType: "section", parentName: "Suffix", sectionRank: 7, deptRank: 1 },
    { key: "dept_sustainability", renderType: "dept", name: "Sustainability", parentRenderType: "section", parentName: "Suffix", sectionRank: 7, deptRank: 2 },
    { key: "dept_about_us", renderType: "dept", name: "About Us", parentRenderType: "section", parentName: "Suffix", sectionRank: 7, deptRank: 2 },
    { key: "dept_thank_you", renderType: "dept", name: "Thank you", parentRenderType: "section", parentName: "Suffix", sectionRank: 7, deptRank: 3 },

    { key: "section_visual", renderType: "section", name: "Visual", parentRenderType: null, parentName: null, sectionRank: 8, deptRank: null },
    { key: "dept_fpv", renderType: "dept", name: "FPV", parentRenderType: "section", parentName: "Visual", sectionRank: 8, deptRank: 1 },

    { key: "section_additional_options", renderType: "section", name: "Additional Options", parentRenderType: null, parentName: null, sectionRank: 9, deptRank: null },
    { key: "dept_department_additional_options", renderType: "dept", name: "Department", parentRenderType: "section", parentName: "Additional Options", sectionRank: 9, deptRank: 1 }
  ];

  var TEMPLATE_INDEX_BY_KEY = buildTemplateIndex(PAGE_TEMPLATES);

  waitForAllowedDepotAndInit();

  function waitForAllowedDepotAndInit() {
    var tries = 0;

    function stopWatching() {
      $(window).off(".wiseSectionBuilderDepot");
      $(document).off(".wiseSectionBuilderDepot");
    }

    function attempt() {
      if (builderInitialised) return;

      tries++;
      activeDepotContext = getActiveDepotContext();

      if (isAllowedDepot(activeDepotContext)) {
        builderInitialised = true;
        stopWatching();
        waitForItemsTabAndInit();
        return;
      }

      if (tries < DEPOT_BOOTSTRAP_MAX_TRIES) {
        setTimeout(attempt, DEPOT_BOOTSTRAP_RETRY_MS);
      }
    }

    if (document.readyState === "loading") {
      $(attempt);
    } else {
      attempt();
    }

    $(window).on("load.wiseSectionBuilderDepot focus.wiseSectionBuilderDepot", attempt);
    $(document).on("ajaxComplete.wiseSectionBuilderDepot", attempt);
  }

  function waitForItemsTabAndInit() {
    var tries = 0;

    function attempt() {
      tries++;

      if ($("#items_tab").length) {
        injectBaseStyles();
        ensureModal();
        tryAddBuilderButton();
        return;
      }

      if (tries < ITEMS_TAB_BOOTSTRAP_MAX_TRIES) {
        setTimeout(attempt, ITEMS_TAB_BOOTSTRAP_RETRY_MS);
      }
    }

    attempt();
  }

  function isAllowedDepot(context, options) {
    options = options || {};

    if (!DEPOT_RULE.enabled) return true;

    var allowedIds = normaliseAllowedDepotValues(DEPOT_RULE.allowedIds, true);
    var allowedNames = normaliseAllowedDepotValues(DEPOT_RULE.allowedNames, false);
    var hasRule = allowedIds.length || allowedNames.length;
    var hasDetectedDepot = !!(context && (context.id || context.name));

    if (!hasRule) {
      logDepotDecision("misconfigured", "[WiseHireHop] depot rule enabled but no allowed depots configured", context, options);
      return !DEPOT_RULE.blockWhenUndetected;
    }

    if (context && context.id && allowedIds.indexOf(normaliseDepotId(context.id)) !== -1) {
      logDepotDecision("matched", "[WiseHireHop] depot matched", context, options);
      return true;
    }

    if (context && context.name && allowedNames.indexOf(normaliseDepotText(context.name)) !== -1) {
      logDepotDecision("matched", "[WiseHireHop] depot matched", context, options);
      return true;
    }

    logDepotDecision(
      hasDetectedDepot ? "blocked" : "undetected",
      hasDetectedDepot
        ? "[WiseHireHop] blocked outside allowed depot"
        : "[WiseHireHop] blocked because no depot could be detected",
      context,
      options
    );

    return hasDetectedDepot ? false : !DEPOT_RULE.blockWhenUndetected;
  }

  function logDepotDecision(key, message, context, options) {
    if (options && options.silent) return;

    var signature = [
      key,
      String((context && context.id) || ""),
      String((context && context.name) || "")
    ].join("|");

    if (signature === lastDepotDecisionSignature) return;
    lastDepotDecisionSignature = signature;

    try {
      console.warn(message, context);
    } catch (e) {}
  }

  function getActiveDepotContext() {
    var headerDepot = getHeaderDepotContext();
    var context = {
      id: normaliseDepotId(headerDepot.id),
      name: normaliseDepotText(headerDepot.name, true)
    };

    window.__wiseHireHopDepotContext = context;
    return context;
  }

  function getHeaderDepotContext() {
    var $select = findHeaderDepotSelect();
    var $selected = $select.length ? $select.find("option:selected").first() : $();

    return {
      id: $.trim(String($select.length ? ($select.val() || $selected.attr("value") || "") : "")),
      name: $.trim(String($selected.length ? ($selected.text() || "") : ""))
    };
  }

  function findHeaderDepotSelect() {
    var $label = $('[data-label="depotTxt"]').first();
    var $select = findSelectNearDepotLabel($label);
    if ($select.length) return $select;

    var $textLabel = $("b, strong, label, span, td, th").filter(function () {
      var text = $.trim(String($(this).text() || "")).replace(/\s+/g, " ");
      return /^warehouse name\s*:?\s*$/i.test(text) || /^depot\s*:?\s*$/i.test(text);
    }).first();

    $select = findSelectNearDepotLabel($textLabel);
    if ($select.length) return $select;

    return $();
  }

  function findSelectNearDepotLabel($label) {
    if (!$label || !$label.length) return $();

    var $select = $label.siblings("select").first();
    if ($select.length) return $select;

    $select = $label.nextAll("select").first();
    if ($select.length) return $select;

    $select = $label.parent().find("select").first();
    if ($select.length) return $select;

    $select = $label.closest("td, th, div, span").find("select").first();
    if ($select.length) return $select;

    return $();
  }

  function injectBaseStyles() {
    if ($("#" + STYLES_ID).length) return;

    var css = [
      '<style id="' + STYLES_ID + '">',
      '#' + OVERLAY_ID + ' {',
      '  position:fixed;',
      '  inset:0;',
      '  background:rgba(16, 24, 40, 0.42);',
      '  display:none;',
      '  align-items:center;',
      '  justify-content:center;',
      '  padding:24px;',
      '  z-index:100000;',
      '}',
      '#' + MODAL_ID + ' {',
      '  width:min(760px, calc(100vw - 48px));',
      '  max-height:calc(100vh - 48px);',
      '  overflow:auto;',
      '  background:#ffffff;',
      '  border:1px solid #cfd4dc;',
      '  border-radius:14px;',
      '  box-shadow:0 18px 48px rgba(15, 23, 42, 0.18);',
      '  color:#1f2937;',
      '}',
      '#' + MODAL_ID + ' .wise-section-builder-header {',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:space-between;',
      '  gap:12px;',
      '  padding:18px 22px 12px 22px;',
      '  border-bottom:1px solid #e5e7eb;',
      '}',
      '#' + MODAL_ID + ' .wise-section-builder-title {',
      '  font-size:18px;',
      '  font-weight:700;',
      '}',
      '#' + MODAL_ID + ' .wise-section-builder-close {',
      '  border:0;',
      '  background:transparent;',
      '  font-size:22px;',
      '  line-height:1;',
      '  cursor:pointer;',
      '  color:#6b7280;',
      '}',
      '#' + MODAL_ID + ' .wise-section-builder-body {',
      '  padding:18px 22px 22px 22px;',
      '}',
      '#' + MODAL_ID + ' .wise-section-builder-grid {',
      '  display:grid;',
      '  grid-template-columns:190px minmax(260px, 1fr);',
      '  gap:12px 14px;',
      '  align-items:start;',
      '}',
      '#' + MODAL_ID + ' .wise-section-builder-label {',
      '  padding-top:8px;',
      '  font-weight:600;',
      '}',
      '#' + MODAL_ID + ' .wise-section-builder-control select,',
      '#' + MODAL_ID + ' .wise-section-builder-control button,',
      '#' + MODAL_ID + ' .wise-section-builder-control input {',
      '  font-size:13px;',
      '}',
      '#' + MODAL_ID + ' .wise-section-builder-row {',
      '  display:flex;',
      '  flex-wrap:wrap;',
      '  gap:8px;',
      '  align-items:center;',
      '}',
      '#' + MODAL_ID + ' select {',
      '  min-width:240px;',
      '  max-width:100%;',
      '}',
      '#' + MODAL_ID + ' .wise-section-builder-help {',
      '  margin-top:6px;',
      '  font-size:12px;',
      '  color:#6b7280;',
      '}',
      '#' + MODAL_ID + ' .wise-section-builder-preview {',
      '  min-height:68px;',
      '  padding:12px 14px;',
      '  border:1px solid #e5e7eb;',
      '  border-radius:10px;',
      '  background:#f8fafc;',
      '  font-size:13px;',
      '  line-height:1.5;',
      '}',
      '#' + MODAL_ID + ' .wise-section-builder-preview .is-muted {',
      '  color:#6b7280;',
      '}',
      '#' + MODAL_ID + ' .wise-section-builder-status {',
      '  margin-top:16px;',
      '  min-height:20px;',
      '  font-size:12px;',
      '  font-weight:600;',
      '}',
      '#' + MODAL_ID + ' .wise-section-builder-status.is-error { color:#b42318; }',
      '#' + MODAL_ID + ' .wise-section-builder-status.is-success { color:#027a48; }',
      '#' + MODAL_ID + ' .wise-section-builder-status.is-warning { color:#b54708; }',
      '#' + MODAL_ID + ' .wise-section-builder-status.is-info { color:#175cd3; }',
      '#' + MODAL_ID + ' .wise-section-builder-footer {',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:flex-end;',
      '  gap:10px;',
      '  margin-top:18px;',
      '}',
      '@media (max-width: 760px) {',
      '  #' + MODAL_ID + ' .wise-section-builder-grid {',
      '    grid-template-columns:1fr;',
      '  }',
      '  #' + MODAL_ID + ' .wise-section-builder-label {',
      '    padding-top:0;',
      '  }',
      '  #' + MODAL_ID + ' select {',
      '    min-width:0;',
      '    width:100%;',
      '  }',
      '}',
      '</style>'
    ].join("");

    $("head").append(css);
  }

  function ensureModal() {
    if ($("#" + OVERLAY_ID).length) return;

    var html = [
      '<div id="' + OVERLAY_ID + '">',
      '  <div id="' + MODAL_ID + '" role="dialog" aria-modal="true" aria-labelledby="' + MODAL_ID + '-title">',
      '    <div class="wise-section-builder-header">',
      '      <div>',
      '        <div id="' + MODAL_ID + '-title" class="wise-section-builder-title">Create Section Builder</div>',
      '        <div class="wise-section-builder-help">Create a root section and optionally its default sub headings.</div>',
      '      </div>',
      '      <button type="button" class="wise-section-builder-close" aria-label="Close">x</button>',
      '    </div>',
      '    <div class="wise-section-builder-body">',
      '      <div class="wise-section-builder-grid">',
      '        <div class="wise-section-builder-label">Section page</div>',
      '        <div class="wise-section-builder-control">',
      '          <select id="' + SECTION_SELECT_ID + '"></select>',
      '          <div class="wise-section-builder-help">Choose which section template to add to the list.</div>',
      '        </div>',
      '        <div class="wise-section-builder-label">Sub folders</div>',
      '        <div class="wise-section-builder-control">',
      '          <select id="' + SUBFOLDERS_SELECT_ID + '"></select>',
      '          <div class="wise-section-builder-help">Use the same default child headings defined in the heading editor rules.</div>',
      '        </div>',
      '        <div class="wise-section-builder-label">Insert relative to</div>',
      '        <div class="wise-section-builder-control">',
      '          <div class="wise-section-builder-row">',
      '            <select id="' + ANCHOR_SELECT_ID + '"></select>',
      '            <select id="' + POSITION_SELECT_ID + '">',
      '              <option value="after">After</option>',
      '              <option value="before">Before</option>',
      '            </select>',
      '            <button type="button" id="' + ANCHOR_REFRESH_ID + '" class="ui-button ui-widget ui-state-default ui-corner-all">Refresh</button>',
      '          </div>',
      '          <div class="wise-section-builder-help">This reads the current top-level rows from the list on the page.</div>',
      '        </div>',
      '        <div class="wise-section-builder-label">Will create</div>',
      '        <div class="wise-section-builder-control">',
      '          <div id="' + PREVIEW_ID + '" class="wise-section-builder-preview"></div>',
      '        </div>',
      '      </div>',
      '      <div id="' + STATUS_ID + '" class="wise-section-builder-status"></div>',
      '      <div class="wise-section-builder-footer">',
      '        <button type="button" id="' + CANCEL_BUTTON_ID + '" class="ui-button ui-widget ui-state-default ui-corner-all">Close</button>',
      '        <button type="button" id="' + CREATE_BUTTON_ID + '" class="ui-button ui-widget ui-state-default ui-corner-all">Create Section</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join("");

    $("body").append(html);

    $("#" + OVERLAY_ID).on("click", function (e) {
      if (e.target === this) closeBuilderModal();
    });

    $("#" + MODAL_ID + " .wise-section-builder-close").on("click", closeBuilderModal);
    $("#" + CANCEL_BUTTON_ID).on("click", closeBuilderModal);

    $(document).on("keydown.wiseSectionBuilder", function (e) {
      if (e.key === "Escape" && $("#" + OVERLAY_ID).is(":visible")) {
        closeBuilderModal();
      }
    });

    $("#" + SECTION_SELECT_ID).on("change", function () {
      refreshSubfolderOptions();
      updateCreationPreview();
    });

    $("#" + SUBFOLDERS_SELECT_ID).on("change", updateCreationPreview);
    $("#" + ANCHOR_SELECT_ID).on("change", updatePositionControlState);
    $("#" + ANCHOR_REFRESH_ID).on("click", function () {
      refreshAnchorOptions(true);
      updateCreationPreview();
      setBuilderStatus("List positions refreshed.", "info");
    });
    $("#" + CREATE_BUTTON_ID).on("click", handleCreateButtonClick);
  }

  function tryAddBuilderButton() {
    if ($("#" + BUTTON_ID).length) return;

    var $host = findToolbarHost();
    if (!$host.length) {
      setTimeout(tryAddBuilderButton, 1000);
      return;
    }

    var $btn = $(
      '<button id="' + BUTTON_ID + '" type="button" ' +
        'class="items_func_btn ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon-primary" ' +
        'style="width: 148px; margin: 0px 0.5em;" role="button">' +
        '<span class="ui-button-icon-primary ui-icon ui-icon-plusthick"></span>' +
        '<span class="ui-button-text">Add Section</span>' +
      '</button>'
    );

    $btn.on("click", openBuilderModal);

    var $newBtn = findToolbarActionButton(/^new\b/i);
    var $editBtn = findToolbarActionButton(/^edit\b/i);
    var $gearBtn = $host.children("button.fixed_width").first();

    if ($newBtn.length) {
      $btn.insertAfter($newBtn.first());
    } else if ($editBtn.length) {
      $btn.insertBefore($editBtn.first());
    } else if ($gearBtn.length) {
      $btn.insertBefore($gearBtn);
    } else {
      $host.append($btn);
    }

    try {
      console.warn("[WiseHireHop] section builder button inserted");
    } catch (e) {}
  }

  function findToolbarHost() {
    var $previewBtn = $("#wise-doc-preview-toggle");
    if ($previewBtn.length && $previewBtn.parent().length) {
      return $previewBtn.parent();
    }

    var $newBtn = findToolbarActionButton(/^new\b/i);
    if ($newBtn.length && $newBtn.parent().length) {
      return $newBtn.parent();
    }

    var $editBtn = findToolbarActionButton(/^edit\b/i);
    if ($editBtn.length && $editBtn.parent().length) {
      return $editBtn.parent();
    }

    return $("#items_tab > div:first-child");
  }

  function findToolbarActionButton(pattern) {
    var selector = 'button, a, [role="button"], input[type="button"], input[type="submit"]';
    var $scope = $("#items_tab > div:first-child");
    if (!$scope.length) return $();

    return $scope.find(selector).filter(":visible").filter(function () {
      var text = $.trim($(this).text() || $(this).val() || $(this).attr("title") || $(this).attr("aria-label") || "");
      return pattern.test(text);
    }).first();
  }

  function openBuilderModal() {
    ensureModal();
    refreshBuilderForm();
    $("#" + OVERLAY_ID).css("display", "flex");
  }

  function closeBuilderModal() {
    if (createInFlight) return;

    $("#" + OVERLAY_ID).hide();
    setBuilderStatus("", "");
  }

  function refreshBuilderForm() {
    populateSectionOptions();
    refreshSubfolderOptions();
    refreshAnchorOptions(false);
    updatePositionControlState();
    updateCreationPreview();
    setBuilderStatus("", "");
  }

  function populateSectionOptions() {
    var $select = $("#" + SECTION_SELECT_ID);
    if (!$select.length) return;

    var current = String($select.val() || "");
    var templates = getRootSectionTemplates();

    $select.empty();
    $select.append($("<option></option>").attr("value", "").text("Choose a section"));

    for (var i = 0; i < templates.length; i++) {
      $select.append(
        $("<option></option>")
          .attr("value", templates[i].key)
          .text(normaliseDisplayText(templates[i].name))
      );
    }

    if (current && $select.find('option[value="' + current + '"]').length) {
      $select.val(current);
    } else if (templates.length) {
      $select.val(templates[0].key);
    } else {
      $select.val("");
    }
  }

  function refreshSubfolderOptions() {
    var $select = $("#" + SUBFOLDERS_SELECT_ID);
    var template = getSelectedSectionTemplate();
    var childTemplates = template ? getDefaultDeptTemplatesForSectionName(template.name) : [];
    var hasDefaultChildren = !!(template && template.autoCreateChildren && childTemplates.length);
    var current = String($select.val() || "");

    if (!$select.length) return;

    $select.empty();

    if (hasDefaultChildren) {
      $select.append($("<option></option>").attr("value", "default").text("Default sub headings"));
      $select.append($("<option></option>").attr("value", "none").text("Section only"));
      $select.prop("disabled", false);
      if (current && $select.find('option[value="' + current + '"]').length) {
        $select.val(current);
      } else {
        $select.val("default");
      }
    } else {
      $select.append($("<option></option>").attr("value", "none").text("Section only"));
      $select.prop("disabled", true).val("none");
    }
  }

  function refreshAnchorOptions(preferCurrentSelection) {
    var $select = $("#" + ANCHOR_SELECT_ID);
    if (!$select.length) return;

    var current = String($select.val() || "");
    var anchors = getRootListAnchors();
    var preferredSelectionId = preferCurrentSelection ? getSelectedRootAnchorId() : "";

    $select.empty();
    $select.append($("<option></option>").attr("value", ROOT_END_VALUE).text("End of list"));

    for (var i = 0; i < anchors.length; i++) {
      $select.append(
        $("<option></option>")
          .attr("value", anchors[i].id)
          .text((i + 1) + ". " + anchors[i].text)
      );
    }

    if (preferredSelectionId && $select.find('option[value="' + preferredSelectionId + '"]').length) {
      $select.val(preferredSelectionId);
    } else if (current && $select.find('option[value="' + current + '"]').length) {
      $select.val(current);
    } else {
      $select.val(ROOT_END_VALUE);
    }
  }

  function updatePositionControlState() {
    var $anchorSelect = $("#" + ANCHOR_SELECT_ID);
    var $positionSelect = $("#" + POSITION_SELECT_ID);
    if (!$anchorSelect.length || !$positionSelect.length) return;

    var disabled = String($anchorSelect.val() || "") === ROOT_END_VALUE;
    $positionSelect.prop("disabled", disabled);
  }

  function updateCreationPreview() {
    var $preview = $("#" + PREVIEW_ID);
    if (!$preview.length) return;

    var template = getSelectedSectionTemplate();
    if (!template) {
      $preview.html('<span class="is-muted">Choose a section template to preview what will be created.</span>');
      return;
    }

    var childTemplates = shouldCreateDefaultChildren(template)
      ? getDefaultDeptTemplatesForSectionName(template.name)
      : [];

    var lines = [];
    lines.push("<strong>Section</strong>: " + escapeHtml(normaliseDisplayText(template.name)));

    if (childTemplates.length) {
      for (var i = 0; i < childTemplates.length; i++) {
        lines.push("<strong>Sub</strong>: " + escapeHtml(normaliseDisplayText(childTemplates[i].name)));
      }
    } else {
      lines.push('<span class="is-muted">No default sub headings will be created.</span>');
    }

    $preview.html(lines.join("<br>"));
  }

  function getSelectedSectionTemplate() {
    var key = String($("#" + SECTION_SELECT_ID).val() || "");
    return findTemplateByKey(key);
  }

  function shouldCreateDefaultChildren(template) {
    if (!template) return false;
    return String($("#" + SUBFOLDERS_SELECT_ID).val() || "none") === "default";
  }

  async function handleCreateButtonClick() {
    if (createInFlight) return;

    var template = getSelectedSectionTemplate();
    if (!template) {
      setBuilderStatus("Choose a section template first.", "error");
      return;
    }

    var jobId = getCurrentJobId();
    if (!jobId) {
      setBuilderStatus("Could not detect the current job ID on this page.", "error");
      return;
    }

    var anchorId = String($("#" + ANCHOR_SELECT_ID).val() || ROOT_END_VALUE);
    var position = String($("#" + POSITION_SELECT_ID).val() || "after");
    var childTemplates = shouldCreateDefaultChildren(template)
      ? getDefaultDeptTemplatesForSectionName(template.name)
      : [];

    createInFlight = true;
    setBuilderBusy(true);
    setBuilderStatus("Creating section...", "info");

    try {
      var createdSection = await createHeadingDirect({
        jobId: jobId,
        parentId: "0",
        template: template
      });

      if (childTemplates.length) {
        setBuilderStatus("Creating default sub headings...", "info");

        for (var i = 0; i < childTemplates.length; i++) {
          await createHeadingDirect({
            jobId: jobId,
            parentId: createdSection.id,
            template: childTemplates[i]
          });
        }
      }

      triggerSupplyingRefresh();

      if (anchorId !== ROOT_END_VALUE) {
        setBuilderStatus("Placing section in the list...", "info");

        var placed = await placeCreatedSection(createdSection.id, anchorId, position);
        if (!placed) {
          setBuilderStatus("Section created, but automatic positioning could not be confirmed. It should still be in the list.", "warning");
          refreshAnchorOptions(false);
          updatePositionControlState();
          updateCreationPreview();
          return;
        }
      }

      triggerSupplyingRefreshSoon(900);
      setBuilderStatus("Section created successfully.", "success");
      refreshAnchorOptions(false);
      updatePositionControlState();
      updateCreationPreview();
    } catch (err) {
      console.warn("[WiseHireHop] section builder create failed", err);
      setBuilderStatus(getErrorMessage(err, "Failed to create the section."), "error");
    } finally {
      createInFlight = false;
      setBuilderBusy(false);
    }
  }

  function setBuilderBusy(isBusy) {
    $("#" + SECTION_SELECT_ID).prop("disabled", isBusy);
    $("#" + SUBFOLDERS_SELECT_ID).prop("disabled", isBusy);
    $("#" + ANCHOR_SELECT_ID).prop("disabled", isBusy);
    $("#" + POSITION_SELECT_ID).prop("disabled", isBusy);
    $("#" + ANCHOR_REFRESH_ID).prop("disabled", isBusy);
    $("#" + CREATE_BUTTON_ID).prop("disabled", isBusy).text(isBusy ? "Creating..." : "Create Section");
    $("#" + CANCEL_BUTTON_ID).prop("disabled", isBusy);
    $("#" + MODAL_ID + " .wise-section-builder-close").prop("disabled", isBusy);

    if (!isBusy) {
      refreshSubfolderOptions();
      updatePositionControlState();
    }
  }

  function setBuilderStatus(message, tone) {
    var $status = $("#" + STATUS_ID);
    if (!$status.length) return;

    $status
      .removeClass("is-error is-success is-warning is-info")
      .text(message || "");

    if (tone) {
      $status.addClass("is-" + tone);
    }
  }

  async function createHeadingDirect(options) {
    if (!options || !options.jobId || !options.template) {
      throw new Error("Missing section builder create options.");
    }

    var payload = {
      parent: String(options.parentId || "0"),
      flag: "0",
      priority_confirm: "0",
      custom_fields: "",
      kind: "0",
      local: formatHireHopLocalDateTime(new Date()),
      id: "0",
      name: composeStoredHeadingFromTemplate(options.template),
      desc: "",
      memo: "",
      set_child_dates: "0",
      job: String(options.jobId || ""),
      no_availability: "0",
      ignore: "0"
    };

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
      throw new Error("items_save failed with status " + response.status);
    }

    var createdId = getCreatedHeadingIdFromResponse(json);
    if (!createdId) {
      throw new Error("items_save response did not include a created heading ID.");
    }

    return {
      id: String(createdId),
      json: json
    };
  }

  async function placeCreatedSection(createdId, anchorId, position) {
    var anchorReady = await waitForTreeNode(anchorId, 30, 250);
    if (!anchorReady) return false;

    var createdReady = await waitForTreeNode(createdId, 60, 250);
    if (!createdReady) return false;

    var moved = attemptMoveTreeNode(createdId, anchorId, position);
    if (!moved) return false;

    await delay(500);
    return true;
  }

  function attemptMoveTreeNode(createdId, anchorId, position) {
    var tree = getSupplyingTreeInstance();
    if (!tree || typeof tree.move_node !== "function" || typeof tree.get_node !== "function") {
      return false;
    }

    var createdNode = tree.get_node(String(createdId));
    var anchorNode = tree.get_node(String(anchorId));
    if (!createdNode || !anchorNode) return false;

    try {
      tree.move_node(createdNode, anchorNode, position === "before" ? "before" : "after");
      return true;
    } catch (e) {
      console.warn("[WiseHireHop] move_node failed", e);
      return false;
    }
  }

  function getSupplyingTreeInstance() {
    var $trees = $("#items_tab").find(".jstree");

    for (var i = 0; i < $trees.length; i++) {
      try {
        var instance = $($trees[i]).jstree(true);
        if (instance) return instance;
      } catch (e) {}
    }

    return null;
  }

  async function waitForTreeNode(nodeId, tries, delayMs) {
    for (var i = 0; i < tries; i++) {
      if (findTreeNodeById(nodeId).length) return true;
      await delay(delayMs);
    }

    return false;
  }

  function findTreeNodeById(nodeId) {
    var targetId = String(nodeId == null ? "" : nodeId);
    if (!targetId) return $();

    return $("#items_tab").find("li.jstree-node").filter(function () {
      return String($(this).attr("id") || "") === targetId;
    }).first();
  }

  function triggerSupplyingRefreshSoon(delayMs) {
    setTimeout(function () {
      triggerSupplyingRefresh();
    }, delayMs || 400);
  }

  function triggerSupplyingRefresh() {
    var $btn = findSupplyingRefreshControl();

    if ($btn.length) {
      $btn.get(0).click();
    } else {
      console.warn("[WiseHireHop] could not find Refresh button");
    }
  }

  function findSupplyingRefreshControl() {
    var selector = 'button, a, [role="button"], input[type="button"], input[type="submit"]';
    var scopes = [
      $("#items_tab > div:first-child").get(0),
      $("#items_tab").get(0),
      document.body
    ];

    for (var i = 0; i < scopes.length; i++) {
      if (!scopes[i]) continue;

      var $match = $(scopes[i]).find(selector).filter(":visible").filter(function () {
        if ($(this).closest("#" + OVERLAY_ID).length) return false;
        return isRefreshControl($(this));
      }).first();

      if ($match.length) return $match;
    }

    return $();
  }

  function isRefreshControl($el) {
    var txt = $.trim($el.text() || $el.val() || $el.attr("title") || $el.attr("aria-label") || "");
    return /^refresh\b/i.test(txt);
  }

  function getRootListAnchors() {
    var anchors = [];
    var seen = {};

    $("#items_tab li.jstree-node").filter(":visible").each(function () {
      var $li = $(this);
      if ($li.parents("li.jstree-node").length) return;

      var id = $.trim(String($li.attr("id") || ""));
      if (!id || seen[id]) return;

      seen[id] = true;
      anchors.push({
        id: id,
        text: getTreeNodeText($li)
      });
    });

    return anchors;
  }

  function getSelectedRootAnchorId() {
    var $selected = $("#items_tab .jstree-clicked").closest("li.jstree-node").first();

    if (!$selected.length) {
      $selected = $("#items_tab li.jstree-node.jstree-clicked, #items_tab li.jstree-selected, #items_tab li[aria-selected='true']").first();
    }

    if (!$selected.length) return "";

    var $root = getRootTreeNode($selected);
    return $.trim(String($root.attr("id") || ""));
  }

  function getRootTreeNode($li) {
    var $current = $li;

    while ($current && $current.length) {
      var $parentLi = $current.parent().closest("li.jstree-node");
      if (!$parentLi.length) return $current;
      $current = $parentLi;
    }

    return $li;
  }

  function getTreeNodeText($li) {
    var $anchor = $li.children("a.jstree-anchor").first();
    var text = $.trim(String(($anchor.length ? $anchor.text() : "") || ""));

    if (text) return normaliseWhitespace(text);

    var $clone = $li.clone();
    $clone.children("ul").remove();
    return normaliseWhitespace(String($clone.text() || ""));
  }

  function getCurrentJobId() {
    var href = String(window.location.href || "");
    var match =
      href.match(/[?&](?:job|job_id|main_id|id)=(\d+)/i) ||
      href.match(/\/job\/(\d+)/i) ||
      href.match(/\/jobs\/(\d+)/i);

    if (match && match[1]) return match[1];

    var selectors = [
      'input[name="job"]',
      'input[name="job_id"]',
      'input[name="main_id"]',
      'input[name="id"]',
      '#job_id',
      '#main_id'
    ];

    for (var i = 0; i < selectors.length; i++) {
      var $el = $(selectors[i]).first();
      if (!$el.length) continue;

      var value = $.trim(String($el.val() || ""));
      if (/^\d+$/.test(value)) return value;
    }

    if (window.main_id && /^\d+$/.test(String(window.main_id))) return String(window.main_id);
    if (window.job_id && /^\d+$/.test(String(window.job_id))) return String(window.job_id);

    return "";
  }

  function getRootSectionTemplates() {
    return PAGE_TEMPLATES.filter(function (template) {
      return isRootSectionTemplate(template);
    }).sort(sortTemplates);
  }

  function getDefaultDeptTemplatesForSectionName(sectionName) {
    var cleanSectionName = normaliseText(sectionName);
    var sectionTemplate = findRootSectionTemplateByName(cleanSectionName);

    if (!sectionTemplate || !sectionTemplate.autoCreateChildren) {
      return [];
    }

    return PAGE_TEMPLATES.filter(function (template) {
      return template.renderType === "dept" &&
        template.parentRenderType === "section" &&
        normaliseText(template.parentName) === cleanSectionName;
    }).sort(sortTemplates);
  }

  function findTemplateByKey(key) {
    return TEMPLATE_INDEX_BY_KEY[key] || null;
  }

  function isRootSectionTemplate(template) {
    return !!(
      template &&
      template.renderType === "section" &&
      !template.parentRenderType &&
      !template.parentName
    );
  }

  function findRootSectionTemplateByName(name) {
    var cleanName = normaliseText(name);

    for (var i = 0; i < PAGE_TEMPLATES.length; i++) {
      var template = PAGE_TEMPLATES[i];
      if (!isRootSectionTemplate(template)) continue;
      if (normaliseText(template.name) !== cleanName) continue;
      return template;
    }

    return null;
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

  function getCreatedHeadingIdFromResponse(json) {
    if (!json || !json.items || !json.items.length) return "";
    var item = json.items[0] || {};
    return String(item.ID || item.id || "");
  }

  function tryParseJson(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
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

  function buildTemplateIndex(templates) {
    var index = {};

    for (var i = 0; i < templates.length; i++) {
      index[templates[i].key] = templates[i];
    }

    return index;
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

  function normaliseAllowedDepotValues(values, isId) {
    var list = [];

    for (var i = 0; i < (values || []).length; i++) {
      var normalised = isId ? normaliseDepotId(values[i]) : normaliseDepotText(values[i]);
      if (!normalised || list.indexOf(normalised) !== -1) continue;
      list.push(normalised);
    }

    return list;
  }

  function normaliseDepotId(value) {
    var text = $.trim(String(value == null ? "" : value));
    if (!text) return "";

    var match = text.match(/(\d+)/);
    return match && match[1] ? match[1] : text.toLowerCase();
  }

  function normaliseDepotText(value, preserveCase) {
    var text = $.trim(String(value == null ? "" : value)).replace(/\s+/g, " ");
    if (!text) return "";

    return preserveCase ? text : text.toLowerCase();
  }

  function normaliseDisplayText(value) {
    return $.trim(String(value || "").replace(/<br\s*\/?>/gi, " "));
  }

  function normaliseText(value) {
    return normaliseDisplayText(value).toLowerCase();
  }

  function normaliseWhitespace(value) {
    return $.trim(String(value || "").replace(/\s+/g, " "));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeSelector(value) {
    var text = String(value == null ? "" : value);
    if (!text) return "";

    if ($.escapeSelector) return $.escapeSelector(text);
    return text.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function getErrorMessage(err, fallback) {
    if (err && err.message) return err.message;
    return fallback;
  }
})();
