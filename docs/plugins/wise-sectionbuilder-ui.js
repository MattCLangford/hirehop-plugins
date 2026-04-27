(function () {
  "use strict";

  try { console.warn("[WiseHireHop] page editor loaded - v2026-04-27.01"); } catch (e) {}

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
  var TITLE_ID = "wise-section-builder-title";
  var CONTEXT_ID = "wise-section-builder-context";
  var FORM_ID = "wise-section-builder-form";
  var STATUS_ID = "wise-section-builder-status";
  var SAVE_BUTTON_ID = "wise-section-builder-save";
  var CLOSE_BUTTON_ID = "wise-section-builder-close";

  var PAGE_META_START = "[WisePageMeta]";
  var PAGE_META_END = "[/WisePageMeta]";

  var PROFILE_EVENT_OVERVIEW = "event_overview_schedule";
  var VARIANT_HALF_IMAGE = "half_image";
  var VARIANT_NO_IMAGE_MULTI = "no_image_multi";
  var SLOT_PRIMARY = "primary";
  var SLOT_SECONDARY = "secondary";

  var activeDepotContext = {
    id: "",
    name: ""
  };
  var lastDepotDecisionSignature = "";
  var editorInitialised = false;
  var saveInFlight = false;
  var currentSession = null;

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
      if (editorInitialised) return;

      tries++;
      activeDepotContext = getActiveDepotContext();

      if (isAllowedDepot(activeDepotContext)) {
        editorInitialised = true;
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
      '  width:min(980px, calc(100vw - 48px));',
      '  max-height:calc(100vh - 48px);',
      '  overflow:auto;',
      '  background:#ffffff;',
      '  border:1px solid #cfd4dc;',
      '  border-radius:16px;',
      '  box-shadow:0 22px 60px rgba(15, 23, 42, 0.22);',
      '  color:#1f2937;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-header {',
      '  display:flex;',
      '  align-items:flex-start;',
      '  justify-content:space-between;',
      '  gap:12px;',
      '  padding:20px 24px 14px 24px;',
      '  border-bottom:1px solid #e5e7eb;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-title {',
      '  font-size:18px;',
      '  font-weight:700;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-subtitle {',
      '  margin-top:4px;',
      '  font-size:12px;',
      '  color:#6b7280;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-close {',
      '  border:0;',
      '  background:transparent;',
      '  font-size:22px;',
      '  line-height:1;',
      '  cursor:pointer;',
      '  color:#6b7280;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-body {',
      '  padding:20px 24px 24px 24px;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-context {',
      '  margin-bottom:16px;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-context-card {',
      '  padding:14px 16px;',
      '  border:1px solid #dbe3ef;',
      '  border-radius:12px;',
      '  background:linear-gradient(180deg, #f9fbff 0%, #f3f7ff 100%);',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-context-title {',
      '  margin-bottom:8px;',
      '  font-size:12px;',
      '  font-weight:700;',
      '  letter-spacing:0.04em;',
      '  text-transform:uppercase;',
      '  color:#35548b;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-context-line {',
      '  font-size:13px;',
      '  line-height:1.5;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-form {',
      '  display:flex;',
      '  flex-direction:column;',
      '  gap:16px;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-card {',
      '  border:1px solid #e5e7eb;',
      '  border-radius:14px;',
      '  background:#ffffff;',
      '  padding:16px;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-card-head {',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:space-between;',
      '  gap:12px;',
      '  margin-bottom:12px;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-card-title {',
      '  font-size:15px;',
      '  font-weight:700;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-card-help {',
      '  margin-top:4px;',
      '  font-size:12px;',
      '  color:#6b7280;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-grid {',
      '  display:grid;',
      '  grid-template-columns:repeat(2, minmax(240px, 1fr));',
      '  gap:12px;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-field {',
      '  display:flex;',
      '  flex-direction:column;',
      '  gap:6px;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-field.is-wide {',
      '  grid-column:1 / -1;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-label {',
      '  font-size:12px;',
      '  font-weight:600;',
      '  color:#344054;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-input,',
      '#' + MODAL_ID + ' .wise-page-editor-select,',
      '#' + MODAL_ID + ' .wise-page-editor-textarea {',
      '  width:100%;',
      '  border:1px solid #cfd4dc;',
      '  border-radius:10px;',
      '  padding:9px 11px;',
      '  font-size:13px;',
      '  color:#1f2937;',
      '  background:#ffffff;',
      '  box-sizing:border-box;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-textarea {',
      '  min-height:84px;',
      '  resize:vertical;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-note {',
      '  font-size:12px;',
      '  color:#6b7280;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-rows {',
      '  display:flex;',
      '  flex-direction:column;',
      '  gap:12px;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-row {',
      '  border:1px solid #e5e7eb;',
      '  border-radius:12px;',
      '  padding:12px;',
      '  background:#f8fafc;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-row-head {',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:space-between;',
      '  gap:12px;',
      '  margin-bottom:10px;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-row-title {',
      '  font-size:12px;',
      '  font-weight:700;',
      '  letter-spacing:0.02em;',
      '  text-transform:uppercase;',
      '  color:#475467;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-row-grid {',
      '  display:grid;',
      '  grid-template-columns:repeat(2, minmax(220px, 1fr));',
      '  gap:10px;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-row-grid .is-wide {',
      '  grid-column:1 / -1;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-actions {',
      '  display:flex;',
      '  justify-content:flex-start;',
      '  margin-top:12px;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-btn {',
      '  border:1px solid #cfd4dc;',
      '  border-radius:10px;',
      '  padding:8px 12px;',
      '  font-size:13px;',
      '  font-weight:600;',
      '  background:#ffffff;',
      '  color:#1f2937;',
      '  cursor:pointer;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-btn.is-primary {',
      '  border-color:#175cd3;',
      '  background:#175cd3;',
      '  color:#ffffff;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-btn.is-subtle {',
      '  background:#f9fafb;',
      '  color:#344054;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-empty {',
      '  padding:18px;',
      '  border:1px dashed #d0d5dd;',
      '  border-radius:12px;',
      '  background:#f8fafc;',
      '  color:#475467;',
      '  font-size:13px;',
      '  line-height:1.6;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-status {',
      '  margin-top:18px;',
      '  min-height:20px;',
      '  font-size:12px;',
      '  font-weight:600;',
      '}',
      '#' + MODAL_ID + ' .wise-page-editor-status.is-error { color:#b42318; }',
      '#' + MODAL_ID + ' .wise-page-editor-status.is-success { color:#027a48; }',
      '#' + MODAL_ID + ' .wise-page-editor-status.is-warning { color:#b54708; }',
      '#' + MODAL_ID + ' .wise-page-editor-status.is-info { color:#175cd3; }',
      '#' + MODAL_ID + ' .wise-page-editor-footer {',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:flex-end;',
      '  gap:10px;',
      '  margin-top:18px;',
      '}',
      '@media (max-width: 860px) {',
      '  #' + MODAL_ID + ' .wise-page-editor-grid,',
      '  #' + MODAL_ID + ' .wise-page-editor-row-grid {',
      '    grid-template-columns:1fr;',
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
      '  <div id="' + MODAL_ID + '" role="dialog" aria-modal="true" aria-labelledby="' + TITLE_ID + '">',
      '    <div class="wise-page-editor-header">',
      '      <div>',
      '        <div id="' + TITLE_ID + '" class="wise-page-editor-title">Edit Page</div>',
      '        <div class="wise-page-editor-subtitle">Select a Section or Dept heading in the items list, then use this editor to build the page-specific structure beneath it.</div>',
      '      </div>',
      '      <button type="button" class="wise-page-editor-close" aria-label="Close">x</button>',
      '    </div>',
      '    <div class="wise-page-editor-body">',
      '      <div id="' + CONTEXT_ID + '" class="wise-page-editor-context"></div>',
      '      <div id="' + FORM_ID + '" class="wise-page-editor-form"></div>',
      '      <div id="' + STATUS_ID + '" class="wise-page-editor-status"></div>',
      '      <div class="wise-page-editor-footer">',
      '        <button type="button" id="' + CLOSE_BUTTON_ID + '" class="wise-page-editor-btn is-subtle">Close</button>',
      '        <button type="button" id="' + SAVE_BUTTON_ID + '" class="wise-page-editor-btn is-primary">Apply Page</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join("");

    $("body").append(html);

    $("#" + OVERLAY_ID).on("click", function (e) {
      if (e.target === this) closeBuilderModal();
    });

    $("#" + MODAL_ID + " .wise-page-editor-close").on("click", closeBuilderModal);
    $("#" + CLOSE_BUTTON_ID).on("click", closeBuilderModal);
    $("#" + SAVE_BUTTON_ID).on("click", handleSaveButtonClick);

    $(document).on("keydown.wiseSectionBuilder", function (e) {
      if (e.key === "Escape" && $("#" + OVERLAY_ID).is(":visible")) {
        closeBuilderModal();
      }
    });

    $("#" + FORM_ID).on("change", '[data-field="variant"]', function () {
      if (!currentSession || saveInFlight) return;
      currentSession.state = readActiveStateFromDom();
      renderCurrentSession();
      setBuilderStatus("", "");
    });

    $("#" + FORM_ID).on("click", "[data-action]", function (e) {
      if (saveInFlight) return;
      e.preventDefault();
      handleEditorAction($(this));
    });
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
        '<span class="ui-button-icon-primary ui-icon ui-icon-pencil"></span>' +
        '<span class="ui-button-text">Edit Page</span>' +
      '</button>'
    );

    $btn.on("click", openBuilderModal);

    var $editBtn = findToolbarActionButton(/^edit\b/i);
    var $previewBtn = $("#wise-doc-preview-toggle");
    var $gearBtn = $host.children("button.fixed_width").first();

    if ($editBtn.length) {
      $btn.insertAfter($editBtn.first());
    } else if ($previewBtn.length) {
      $btn.insertBefore($previewBtn.first());
    } else if ($gearBtn.length) {
      $btn.insertBefore($gearBtn);
    } else {
      $host.append($btn);
    }

    try {
      console.warn("[WiseHireHop] page editor button inserted");
    } catch (e) {}
  }

  function findToolbarHost() {
    var $previewBtn = $("#wise-doc-preview-toggle");
    if ($previewBtn.length && $previewBtn.parent().length) {
      return $previewBtn.parent();
    }

    var $editBtn = findToolbarActionButton(/^edit\b/i);
    if ($editBtn.length && $editBtn.parent().length) {
      return $editBtn.parent();
    }

    var $newBtn = findToolbarActionButton(/^new\b/i);
    if ($newBtn.length && $newBtn.parent().length) {
      return $newBtn.parent();
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
    renderSessionFromSelection();
    $("#" + OVERLAY_ID).css("display", "flex");
  }

  function closeBuilderModal() {
    if (saveInFlight) return;

    $("#" + OVERLAY_ID).hide();
    setBuilderStatus("", "");
  }

  function renderSessionFromSelection() {
    currentSession = null;
    setBuilderStatus("", "");

    var selectedContext = buildSelectedPageContext();

    if (selectedContext.error) {
      renderMessageState(selectedContext.error, true);
      return;
    }

    currentSession = buildEditorSession(selectedContext.context);
    renderCurrentSession();
  }

  function buildEditorSession(context) {
    var profileKey = resolveProfileKey(context);

    if (profileKey === PROFILE_EVENT_OVERVIEW) {
      return buildEventOverviewSession(context);
    }

    return {
      context: context,
      profileKey: "",
      unsupportedMessage: "This page editor is currently configured for Event Overview / Proposed Timings only."
    };
  }

  function renderCurrentSession() {
    window.__wiseHireHopPageEditorSession = currentSession;

    if (!currentSession) {
      renderMessageState("Select a supported page heading in the list first.", true);
      return;
    }

    if (currentSession.unsupportedMessage) {
      renderContextSummary(currentSession.context, currentSession.unsupportedMessage);
      $("#" + FORM_ID).html(
        '<div class="wise-page-editor-empty">' + escapeHtml(currentSession.unsupportedMessage) + "</div>"
      );
      refreshFooterButtons();
      return;
    }

    renderContextSummary(currentSession.context, getProfileDescription(currentSession.profileKey));

    if (currentSession.profileKey === PROFILE_EVENT_OVERVIEW) {
      setModalTitle("Edit Page");
      $("#" + FORM_ID).html(buildEventOverviewFormHtml(currentSession.state));
    } else {
      $("#" + FORM_ID).html(
        '<div class="wise-page-editor-empty">No editor is registered for this page yet.</div>'
      );
    }

    refreshFooterButtons();
  }

  function renderMessageState(message, isError) {
    setModalTitle("Edit Page");
    $("#" + CONTEXT_ID).html(
      '<div class="wise-page-editor-context-card">' +
        '<div class="wise-page-editor-context-title">Page Selection</div>' +
        '<div class="wise-page-editor-context-line">' + escapeHtml(message) + "</div>" +
      "</div>"
    );
    $("#" + FORM_ID).html("");
    setBuilderStatus(message, isError ? "error" : "info");
    refreshFooterButtons(true);
  }

  function renderContextSummary(context, summaryText) {
    var selectedTitle = context && context.selectedNode ? getNodeTitle(context.selectedNode) : "";
    var rootTitle = context && context.rootNode ? getNodeTitle(context.rootNode) : "";
    var selectedKind = context && context.selectedHeadingType === "dept" ? "Dept" : "Section";
    var rootKind = "Section";

    var lines = [
      '<div class="wise-page-editor-context-title">Current Selection</div>',
      '<div class="wise-page-editor-context-line"><strong>Selected ' + selectedKind + ":</strong> " + escapeHtml(selectedTitle || "(unknown)") + "</div>",
      '<div class="wise-page-editor-context-line"><strong>Owning ' + rootKind + ":</strong> " + escapeHtml(rootTitle || "(unknown)") + "</div>"
    ];

    if (summaryText) {
      lines.push('<div class="wise-page-editor-context-line"><strong>Mode:</strong> ' + escapeHtml(summaryText) + "</div>");
    }

    $("#" + CONTEXT_ID).html(
      '<div class="wise-page-editor-context-card">' + lines.join("") + "</div>"
    );
  }

  function setModalTitle(text) {
    $("#" + TITLE_ID).text(text || "Edit Page");
  }

  function refreshFooterButtons(forceDisableSave) {
    var disableSave = !!forceDisableSave || !currentSession || !!currentSession.unsupportedMessage || saveInFlight;

    $("#" + SAVE_BUTTON_ID)
      .prop("disabled", disableSave)
      .text(saveInFlight ? "Applying..." : "Apply Page");

    $("#" + CLOSE_BUTTON_ID).prop("disabled", saveInFlight);
    $("#" + MODAL_ID + " .wise-page-editor-close").prop("disabled", saveInFlight);
  }

  function handleEditorAction($trigger) {
    if (!currentSession || !currentSession.state) return;

    var action = String($trigger.attr("data-action") || "");
    if (!action) return;

    currentSession.state = readActiveStateFromDom();

    if (currentSession.profileKey === PROFILE_EVENT_OVERVIEW) {
      var slotKey = String($trigger.attr("data-slot-key") || "");
      var rowIndex = parseInt(String($trigger.attr("data-row-index") || "-1"), 10);
      var slot = findSlotByKey(currentSession.state.slots, slotKey);
      if (!slot) return;

      if (action === "add-row") {
        slot.rows.push(makeBlankRow());
      } else if (action === "remove-row" && rowIndex >= 0 && rowIndex < slot.rows.length) {
        slot.rows.splice(rowIndex, 1);
        if (!slot.rows.length) {
          slot.rows.push(makeBlankRow());
        }
      }

      renderCurrentSession();
      setBuilderStatus("", "");
    }
  }

  async function handleSaveButtonClick() {
    if (saveInFlight) return;

    if (!currentSession || currentSession.unsupportedMessage) {
      setBuilderStatus("Select a supported page heading first.", "error");
      return;
    }

    currentSession.state = readActiveStateFromDom();

    if (currentSession.profileKey === PROFILE_EVENT_OVERVIEW) {
      await applyEventOverviewSession(currentSession);
      return;
    }

    setBuilderStatus("No page editor is registered for this selection yet.", "error");
  }

  async function applyEventOverviewSession(session) {
    var state = session.state || {};
    var validationError = validateEventOverviewState(state);
    if (validationError) {
      setBuilderStatus(validationError, "error");
      return;
    }

    var jobId = getCurrentJobId();
    if (!jobId) {
      setBuilderStatus("Could not detect the current job ID on this page.", "error");
      return;
    }

    saveInFlight = true;
    setBuilderBusy(true);
    setBuilderStatus("Applying page changes...", "info");
    var savedSuccessfully = false;

    try {
      var nextState = $.extend(true, {}, state);
      var context = session.context;
      var requiredSlotKeys = getRequiredSlotKeys(nextState.variant);
      var finalMeta = normalisePageMeta(context.rootMetaInfo && context.rootMetaInfo.meta);
      finalMeta.profileKey = PROFILE_EVENT_OVERVIEW;
      finalMeta.templateKey = "section_event_overview";
      finalMeta.variant = nextState.variant;
      finalMeta.imageUrl = nextState.variant === VARIANT_HALF_IMAGE ? $.trim(nextState.imageUrl || "") : "";
      finalMeta.version = 1;

      for (var i = 0; i < nextState.slots.length; i++) {
        var slot = nextState.slots[i];
        if (requiredSlotKeys.indexOf(slot.slotKey) === -1) continue;

        setBuilderStatus("Saving " + slot.label.toLowerCase() + "...", "info");

        var headingSave = await saveHeadingItemDirect({
          jobId: jobId,
          id: slot.headingId || "",
          parentId: getNodeDataId(context.rootNode),
          renderType: "dept",
          title: slot.title,
          desc: slot.blurb,
          memo: slot.baseMemo || "",
          flag: getSnapshotFlag(slot.nodeData),
          customFields: getSnapshotCustomFields(slot.nodeData)
        });

        slot.headingId = String(headingSave.id || slot.headingId || "");
        slot.nodeData = $.extend(true, {}, slot.nodeData || {}, {
          ID: slot.headingId,
          title: slot.title,
          DESCRIPTION: slot.blurb,
          TECHNICAL: slot.baseMemo || "",
          FLAG: getSnapshotFlag(slot.nodeData),
          CUSTOM_FIELDS: getSnapshotCustomFields(slot.nodeData)
        });

        setBuilderStatus("Syncing schedule rows...", "info");
        var syncResult = await syncCustomRowsForSlot(jobId, slot);
        slot.rows = syncResult.rows;
        slot.itemIds = syncResult.itemIds;
      }

      finalMeta.slots = {};
      for (var j = 0; j < nextState.slots.length; j++) {
        var metaSlot = nextState.slots[j];
        if (!metaSlot.headingId && !(metaSlot.itemIds && metaSlot.itemIds.length)) continue;

        finalMeta.slots[metaSlot.slotKey] = {
          headingId: String(metaSlot.headingId || ""),
          itemIds: normaliseIdList(metaSlot.itemIds)
        };
      }

      finalMeta.updatedAt = formatHireHopLocalDateTime(new Date());

      setBuilderStatus("Saving section heading...", "info");

      var sectionSave = await saveHeadingItemDirect({
        jobId: jobId,
        id: getNodeDataId(context.rootNode),
        parentId: getParentHeadingDataId(context.tree, context.rootNode),
        renderType: "section",
        title: nextState.sectionTitle,
        desc: nextState.sectionBlurb,
        memo: composeStoredPageMetaText(nextState.baseMemo, finalMeta),
        flag: getNodeFlag(context.rootNode),
        customFields: getNodeCustomFields(context.rootNode)
      });

      if (sectionSave && sectionSave.id) {
        nextState.rootId = String(sectionSave.id);
      }

      currentSession.state = nextState;
      currentSession.context.rootMetaInfo = {
        baseText: nextState.baseMemo,
        meta: finalMeta
      };
      currentSession.context.rootTemplate = findTemplateByKey(finalMeta.templateKey) || currentSession.context.rootTemplate;
      savedSuccessfully = true;

      triggerSupplyingRefresh();
      triggerSupplyingRefreshSoon(900);
    } catch (err) {
      console.warn("[WiseHireHop] page editor save failed", err);
      setBuilderStatus(getErrorMessage(err, "Failed to apply the page changes."), "error");
    } finally {
      saveInFlight = false;
      setBuilderBusy(false);
      if (savedSuccessfully) {
        renderCurrentSession();
        setBuilderStatus("Page changes applied.", "success");
      }
    }
  }

  async function syncCustomRowsForSlot(jobId, slot) {
    var existingManagedIds = normaliseIdList(slot.itemIds);
    var liveRows = getNonEmptyRows(slot.rows);
    var nextRows = [];
    var nextItemIds = [];

    for (var i = 0; i < liveRows.length; i++) {
      var row = $.extend(true, {}, liveRows[i]);
      var saveResult = await saveCustomItemDirect({
        jobId: jobId,
        parentId: slot.headingId,
        row: row,
        sourceData: row.nodeData
      });

      row.rowId = String(saveResult.id || row.rowId || "");
      row.nodeData = $.extend(true, {}, row.nodeData || {}, {
        ID: row.rowId,
        title: row.title,
        ADDITIONAL: row.note,
        TECHNICAL: row.memo
      });

      nextRows.push(row);
      nextItemIds.push(row.rowId);
    }

    var deleteIds = [];
    for (var j = 0; j < existingManagedIds.length; j++) {
      if (nextItemIds.indexOf(existingManagedIds[j]) === -1) {
        deleteIds.push(existingManagedIds[j]);
      }
    }

    if (deleteIds.length) {
      await deleteItemsDirect(deleteIds, jobId, 3);
    }

    if (!nextRows.length) {
      nextRows.push(makeBlankRow());
    }

    return {
      rows: nextRows,
      itemIds: nextItemIds
    };
  }

  function setBuilderBusy(isBusy) {
    $("#" + FORM_ID).find("input, textarea, select, button").prop("disabled", isBusy);
    refreshFooterButtons();
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

  function buildSelectedPageContext() {
    var tree = getSupplyingTreeInstance();
    if (!tree) {
      return {
        error: "Could not detect the items list on this page yet."
      };
    }

    var selectedNodes = tree.get_selected(true) || [];
    if (selectedNodes.length !== 1) {
      return {
        error: "Select one Section or Dept heading in the list, then click Edit Page."
      };
    }

    var selectedNode = selectedNodes[0];
    if (!selectedNode || !selectedNode.data || Number(selectedNode.data.kind) !== 0) {
      return {
        error: "Select a Section or Dept heading. This editor only works on folder-type headings."
      };
    }

    var parentHeadingNode = getParentHeadingNode(tree, selectedNode);
    var selectedMetaInfo = extractStoredPageMeta(getNodeTechnical(selectedNode));
    var selectedStoredTemplate = selectedMetaInfo.meta && selectedMetaInfo.meta.templateKey
      ? findTemplateByKey(String(selectedMetaInfo.meta.templateKey || ""))
      : null;

    var selectedRootTemplate = findRootSectionTemplateByName(getNodeTitle(selectedNode));
    var rootNode = null;
    var rootTemplate = null;

    if (selectedStoredTemplate && selectedStoredTemplate.renderType === "section") {
      rootNode = selectedNode;
      rootTemplate = selectedStoredTemplate;
    } else if (selectedRootTemplate) {
      rootNode = selectedNode;
      rootTemplate = selectedRootTemplate;
    } else if (parentHeadingNode) {
      var parentMetaInfo = extractStoredPageMeta(getNodeTechnical(parentHeadingNode));
      var parentStoredTemplate = parentMetaInfo.meta && parentMetaInfo.meta.templateKey
        ? findTemplateByKey(String(parentMetaInfo.meta.templateKey || ""))
        : null;
      var parentRootTemplate = parentStoredTemplate && parentStoredTemplate.renderType === "section"
        ? parentStoredTemplate
        : findRootSectionTemplateByName(getNodeTitle(parentHeadingNode));

      if (parentRootTemplate) {
        rootNode = parentHeadingNode;
        rootTemplate = parentRootTemplate;
      }
    }

    if (!rootNode) {
      return {
        error: "This heading is not recognised as a supported page section or dept yet."
      };
    }

    var rootMetaInfo = extractStoredPageMeta(getNodeTechnical(rootNode));
    if (!rootTemplate && rootMetaInfo.meta && rootMetaInfo.meta.templateKey) {
      rootTemplate = findTemplateByKey(String(rootMetaInfo.meta.templateKey || ""));
    }

    var selectedTemplate = null;
    if (selectedNode === rootNode) {
      selectedTemplate = rootTemplate || findRootSectionTemplateByName(getNodeTitle(selectedNode));
    } else if (rootTemplate) {
      selectedTemplate = findDeptTemplateByParentAndName(getNodeTitle(rootNode), getNodeTitle(selectedNode));
    }

    return {
      context: {
        tree: tree,
        selectedNode: selectedNode,
        parentHeadingNode: parentHeadingNode,
        rootNode: rootNode,
        rootTemplate: rootTemplate,
        rootMetaInfo: rootMetaInfo,
        selectedTemplate: selectedTemplate,
        selectedHeadingType: selectedNode === rootNode ? "section" : "dept"
      }
    };
  }

  function resolveProfileKey(context) {
    if (!context) return "";

    var meta = normalisePageMeta(context.rootMetaInfo && context.rootMetaInfo.meta);
    if (meta.profileKey) return String(meta.profileKey);

    if (context.rootTemplate && context.rootTemplate.key === "section_event_overview") {
      return PROFILE_EVENT_OVERVIEW;
    }

    if (context.selectedTemplate && context.selectedTemplate.key === "dept_proposed_timings") {
      return PROFILE_EVENT_OVERVIEW;
    }

    return "";
  }

  function buildEventOverviewSession(context) {
    var rootMetaInfo = context.rootMetaInfo || extractStoredPageMeta(getNodeTechnical(context.rootNode));
    var meta = normalisePageMeta(rootMetaInfo.meta);
    var childHeadings = getDirectChildHeadingNodes(context.tree, context.rootNode);
    var claimedHeadingIds = {};

    var slots = [
      buildEventOverviewSlotState({
        slotKey: SLOT_PRIMARY,
        label: "Primary Schedule Dept",
        defaultTitle: "Proposed Timings",
        context: context,
        meta: meta,
        childHeadings: childHeadings,
        claimedHeadingIds: claimedHeadingIds
      }),
      buildEventOverviewSlotState({
        slotKey: SLOT_SECONDARY,
        label: "Additional Schedule Dept",
        defaultTitle: "Schedule",
        context: context,
        meta: meta,
        childHeadings: childHeadings,
        claimedHeadingIds: claimedHeadingIds
      })
    ];

    var variant = normaliseEventOverviewVariant(meta.variant || inferEventOverviewVariant(childHeadings, slots));
    var imageUrl = $.trim(String(meta.imageUrl || ""));

    return {
      context: context,
      profileKey: PROFILE_EVENT_OVERVIEW,
      state: {
        rootId: getNodeDataId(context.rootNode),
        baseMemo: rootMetaInfo.baseText || "",
        sectionTitle: getNodeTitle(context.rootNode),
        sectionBlurb: getNodeDescription(context.rootNode),
        imageUrl: imageUrl,
        variant: variant,
        slots: slots
      }
    };
  }

  function buildEventOverviewSlotState(options) {
    var slotKey = options.slotKey;
    var label = options.label;
    var defaultTitle = options.defaultTitle;
    var context = options.context;
    var meta = normalisePageMeta(options.meta);
    var childHeadings = options.childHeadings || [];
    var claimedHeadingIds = options.claimedHeadingIds || {};
    var slotMeta = $.isPlainObject(meta.slots) && $.isPlainObject(meta.slots[slotKey]) ? meta.slots[slotKey] : {};
    var headingNode = null;

    if (slotMeta.headingId) {
      headingNode = findTreeNodeByDataId(context.tree, 0, slotMeta.headingId);
    }

    if (!headingNode && slotKey === SLOT_PRIMARY) {
      headingNode = findChildHeadingByTitle(childHeadings, "Proposed Timings", claimedHeadingIds);
    }

    if (!headingNode && slotKey === SLOT_PRIMARY && context.selectedHeadingType === "dept") {
      headingNode = context.selectedNode;
    }

    if (!headingNode) {
      headingNode = findNextUnclaimedHeading(childHeadings, claimedHeadingIds);
    }

    if (headingNode && headingNode.data) {
      claimedHeadingIds[String(headingNode.data.ID || "")] = true;
    }

    var childRows = buildSlotRowsFromHeading(context.tree, headingNode, slotMeta);

    return {
      slotKey: slotKey,
      label: label,
      headingId: headingNode ? getNodeDataId(headingNode) : "",
      title: headingNode ? getNodeTitle(headingNode) : defaultTitle,
      blurb: headingNode ? getNodeDescription(headingNode) : "",
      baseMemo: headingNode ? extractStoredPageMeta(getNodeTechnical(headingNode)).baseText : "",
      itemIds: childRows.itemIds,
      rows: childRows.rows.length ? childRows.rows : [makeBlankRow()],
      nodeData: headingNode ? cloneItemSnapshot(headingNode.data) : null
    };
  }

  function buildSlotRowsFromHeading(tree, headingNode, slotMeta) {
    var rows = [];
    var itemIds = [];

    if (!headingNode) {
      return {
        rows: rows,
        itemIds: itemIds
      };
    }

    var preferredIds = normaliseIdList(slotMeta && slotMeta.itemIds);
    var seen = {};
    var customNodes = [];

    for (var i = 0; i < preferredIds.length; i++) {
      var preferredNode = findTreeNodeByDataId(tree, 3, preferredIds[i]);
      if (!preferredNode || !preferredNode.data) continue;
      if (String(preferredNode.parent || "") !== String(headingNode.id || "")) continue;
      customNodes.push(preferredNode);
      seen[String(preferredNode.data.ID || "")] = true;
    }

    if (!customNodes.length) {
      customNodes = getDirectChildCustomNodes(tree, headingNode);
    }

    for (var j = 0; j < customNodes.length; j++) {
      var node = customNodes[j];
      if (!node || !node.data) continue;
      if (seen[String(node.data.ID || "")]) {
        itemIds.push(String(node.data.ID || ""));
        rows.push(createRowStateFromNode(node));
        continue;
      }

      seen[String(node.data.ID || "")] = true;
      itemIds.push(String(node.data.ID || ""));
      rows.push(createRowStateFromNode(node));
    }

    return {
      rows: rows,
      itemIds: itemIds
    };
  }

  function buildEventOverviewFormHtml(state) {
    var variant = normaliseEventOverviewVariant(state && state.variant);
    var requiredSlotKeys = getRequiredSlotKeys(variant);
    var parts = [];

    parts.push(
      '<div class="wise-page-editor-card">' +
        '<div class="wise-page-editor-card-head">' +
          '<div>' +
            '<div class="wise-page-editor-card-title">Layout</div>' +
            '<div class="wise-page-editor-card-help">Choose how the Event Overview page should be scaffolded, then fill in the headings and schedule rows below.</div>' +
          '</div>' +
        "</div>" +
        '<div class="wise-page-editor-grid">' +
          renderFieldSelect({
            wide: false,
            label: "Layout variant",
            field: "variant",
            options: [
              { value: VARIANT_HALF_IMAGE, label: "Half page image + one schedule dept" },
              { value: VARIANT_NO_IMAGE_MULTI, label: "No image + two schedule depts" }
            ],
            value: variant
          }) +
          renderFieldInput({
            wide: false,
            label: "Section heading",
            field: "section-title",
            value: state.sectionTitle || "",
            note: "This updates the selected root section heading."
          }) +
          renderFieldTextarea({
            wide: true,
            label: "Section blurb",
            field: "section-blurb",
            value: state.sectionBlurb || "",
            note: "Stored on the section description so the page can carry a human-readable intro."
          }) +
          (variant === VARIANT_HALF_IMAGE
            ? renderFieldInput({
                wide: true,
                label: "Image URL",
                field: "image-url",
                value: state.imageUrl || "",
                note: "Stored in the page metadata block on the section memo for this layout."
              })
            : "") +
        "</div>" +
      "</div>"
    );

    for (var i = 0; i < requiredSlotKeys.length; i++) {
      var slot = findSlotByKey(state.slots, requiredSlotKeys[i]);
      if (!slot) continue;
      parts.push(buildSlotCardHtml(slot));
    }

    if (variant === VARIANT_HALF_IMAGE) {
      var secondary = findSlotByKey(state.slots, SLOT_SECONDARY);
      if (secondary && (secondary.headingId || getNonEmptyRows(secondary.rows).length)) {
        parts.push(
          '<div class="wise-page-editor-empty">A second managed schedule dept already exists for this page, but the current layout only edits the primary dept. It will be left in place unless you switch back to the no-image layout.</div>'
        );
      }
    }

    return parts.join("");
  }

  function buildSlotCardHtml(slot) {
    var rows = slot.rows && slot.rows.length ? slot.rows : [makeBlankRow()];
    var rowHtml = [];

    for (var i = 0; i < rows.length; i++) {
      rowHtml.push(buildSlotRowHtml(slot, rows[i], i));
    }

    return [
      '<div class="wise-page-editor-card" data-slot-key="' + escapeAttribute(slot.slotKey) + '">',
      '  <div class="wise-page-editor-card-head">',
      '    <div>',
      '      <div class="wise-page-editor-card-title">' + escapeHtml(slot.label) + "</div>",
      '      <div class="wise-page-editor-card-help">The dept heading is created or updated beneath the Event Overview section. Each row below becomes a zero-value custom item under that dept.</div>',
      "    </div>",
      "  </div>",
      '  <div class="wise-page-editor-grid">',
           renderFieldInput({
             wide: false,
             label: "Dept heading",
             field: "slot-title",
             value: slot.title || ""
           }),
           renderFieldTextarea({
             wide: true,
             label: "Dept blurb",
             field: "slot-blurb",
             value: slot.blurb || "",
             note: "Stored on the dept description."
           }),
      "  </div>",
      '  <div class="wise-page-editor-card-help">Schedule rows</div>',
      '  <div class="wise-page-editor-rows">',
           rowHtml.join(""),
      "  </div>",
      '  <div class="wise-page-editor-actions">',
      '    <button type="button" class="wise-page-editor-btn" data-action="add-row" data-slot-key="' + escapeAttribute(slot.slotKey) + '">Add Row</button>',
      "  </div>",
      "</div>"
    ].join("");
  }

  function buildSlotRowHtml(slot, row, rowIndex) {
    return [
      '<div class="wise-page-editor-row" data-row-index="' + rowIndex + '" data-row-id="' + escapeAttribute(row.rowId || "") + '">',
      '  <div class="wise-page-editor-row-head">',
      '    <div class="wise-page-editor-row-title">Row ' + (rowIndex + 1) + "</div>",
      '    <button type="button" class="wise-page-editor-btn is-subtle" data-action="remove-row" data-slot-key="' + escapeAttribute(slot.slotKey) + '" data-row-index="' + rowIndex + '">Remove</button>',
      "  </div>",
      '  <div class="wise-page-editor-row-grid">',
           renderFieldInput({
             wide: false,
             label: "Row title",
             field: "row-title",
             value: row.title || ""
           }),
           renderFieldInput({
             wide: false,
             label: "Row note",
             field: "row-note",
             value: row.note || ""
           }),
           renderFieldTextarea({
             wide: true,
             label: "Row memo",
             field: "row-memo",
             value: row.memo || "",
             note: "Saved to the custom item memo so you can carry longer text per row."
           }),
      "  </div>",
      "</div>"
    ].join("");
  }

  function renderFieldInput(options) {
    return [
      '<div class="wise-page-editor-field' + (options.wide ? " is-wide" : "") + '">',
      '  <div class="wise-page-editor-label">' + escapeHtml(options.label || "") + "</div>",
      '  <input class="wise-page-editor-input" type="text" data-field="' + escapeAttribute(options.field || "") + '" value="' + escapeAttribute(options.value || "") + '">',
         options.note ? '<div class="wise-page-editor-note">' + escapeHtml(options.note) + "</div>" : "",
      "</div>"
    ].join("");
  }

  function renderFieldTextarea(options) {
    return [
      '<div class="wise-page-editor-field' + (options.wide ? " is-wide" : "") + '">',
      '  <div class="wise-page-editor-label">' + escapeHtml(options.label || "") + "</div>",
      '  <textarea class="wise-page-editor-textarea" data-field="' + escapeAttribute(options.field || "") + '">' + escapeHtml(options.value || "") + "</textarea>",
         options.note ? '<div class="wise-page-editor-note">' + escapeHtml(options.note) + "</div>" : "",
      "</div>"
    ].join("");
  }

  function renderFieldSelect(options) {
    var optionHtml = [];
    var items = options.options || [];
    var current = String(options.value || "");

    for (var i = 0; i < items.length; i++) {
      optionHtml.push(
        '<option value="' + escapeAttribute(items[i].value) + '"' +
          (String(items[i].value) === current ? " selected" : "") +
        ">" + escapeHtml(items[i].label) + "</option>"
      );
    }

    return [
      '<div class="wise-page-editor-field' + (options.wide ? " is-wide" : "") + '">',
      '  <div class="wise-page-editor-label">' + escapeHtml(options.label || "") + "</div>",
      '  <select class="wise-page-editor-select" data-field="' + escapeAttribute(options.field || "") + '">',
           optionHtml.join(""),
      "  </select>",
      "</div>"
    ].join("");
  }

  function readActiveStateFromDom() {
    if (!currentSession || !currentSession.state) return null;

    if (currentSession.profileKey !== PROFILE_EVENT_OVERVIEW) {
      return $.extend(true, {}, currentSession.state);
    }

    var state = $.extend(true, {}, currentSession.state);
    var $form = $("#" + FORM_ID);
    if (!$form.length) return state;

    state.variant = normaliseEventOverviewVariant($form.find('[data-field="variant"]').val());
    state.sectionTitle = $.trim(String($form.find('[data-field="section-title"]').val() || ""));
    state.sectionBlurb = String($form.find('[data-field="section-blurb"]').val() || "");
    state.imageUrl = $.trim(String($form.find('[data-field="image-url"]').val() || ""));

    var nextSlots = [];
    for (var i = 0; i < state.slots.length; i++) {
      var slot = $.extend(true, {}, state.slots[i]);
      var $slot = $form.find('[data-slot-key="' + escapeSelector(slot.slotKey) + '"]').first();
      if (!$slot.length) {
        nextSlots.push(slot);
        continue;
      }

      slot.title = $.trim(String($slot.find('[data-field="slot-title"]').val() || ""));
      slot.blurb = String($slot.find('[data-field="slot-blurb"]').val() || "");

      var existingRowsById = indexRowsById(slot.rows);
      var nextRows = [];

      $slot.find(".wise-page-editor-row").each(function () {
        var $row = $(this);
        var rowId = $.trim(String($row.attr("data-row-id") || ""));
        var previousRow = rowId && existingRowsById[rowId] ? existingRowsById[rowId] : null;

        nextRows.push({
          rowId: rowId,
          title: $.trim(String($row.find('[data-field="row-title"]').val() || "")),
          note: $.trim(String($row.find('[data-field="row-note"]').val() || "")),
          memo: String($row.find('[data-field="row-memo"]').val() || ""),
          nodeData: previousRow ? previousRow.nodeData : null
        });
      });

      if (!nextRows.length) {
        nextRows.push(makeBlankRow());
      }

      slot.rows = nextRows;
      nextSlots.push(slot);
    }

    state.slots = nextSlots;
    return state;
  }

  function validateEventOverviewState(state) {
    if (!state) return "No page state is available to save.";
    if (!$.trim(String(state.sectionTitle || ""))) return "Enter the section heading.";
    if (state.variant === VARIANT_HALF_IMAGE && !$.trim(String(state.imageUrl || ""))) {
      return "Enter the image URL for the half-image layout.";
    }

    var requiredSlotKeys = getRequiredSlotKeys(state.variant);

    for (var i = 0; i < requiredSlotKeys.length; i++) {
      var slot = findSlotByKey(state.slots, requiredSlotKeys[i]);
      if (!slot) continue;
      if (!$.trim(String(slot.title || ""))) {
        return slot.label + ": enter a dept heading.";
      }

      var liveRows = getNonEmptyRows(slot.rows);
      if (!liveRows.length) {
        return slot.label + ": add at least one schedule row.";
      }

      for (var j = 0; j < liveRows.length; j++) {
        if (!$.trim(String(liveRows[j].title || ""))) {
          return slot.label + ": every populated row needs a row title.";
        }
      }
    }

    return "";
  }

  function getProfileDescription(profileKey) {
    if (profileKey === PROFILE_EVENT_OVERVIEW) {
      return "Event Overview page editor";
    }

    return "Page editor";
  }

  function getRequiredSlotKeys(variant) {
    if (normaliseEventOverviewVariant(variant) === VARIANT_NO_IMAGE_MULTI) {
      return [SLOT_PRIMARY, SLOT_SECONDARY];
    }

    return [SLOT_PRIMARY];
  }

  function inferEventOverviewVariant(childHeadings, slots) {
    if ((childHeadings || []).length > 1) return VARIANT_NO_IMAGE_MULTI;

    var secondary = findSlotByKey(slots || [], SLOT_SECONDARY);
    if (secondary && (secondary.headingId || normaliseIdList(secondary.itemIds).length)) {
      return VARIANT_NO_IMAGE_MULTI;
    }

    return VARIANT_HALF_IMAGE;
  }

  function normaliseEventOverviewVariant(value) {
    return String(value || "") === VARIANT_NO_IMAGE_MULTI ? VARIANT_NO_IMAGE_MULTI : VARIANT_HALF_IMAGE;
  }

  function createRowStateFromNode(node) {
    return {
      rowId: node && node.data ? String(node.data.ID || "") : "",
      title: node && node.data ? String(node.data.title || "") : "",
      note: node && node.data ? String(node.data.ADDITIONAL || "") : "",
      memo: node && node.data ? String(node.data.TECHNICAL || "") : "",
      nodeData: node && node.data ? cloneItemSnapshot(node.data) : null
    };
  }

  function makeBlankRow() {
    return {
      rowId: "",
      title: "",
      note: "",
      memo: "",
      nodeData: null
    };
  }

  function getNonEmptyRows(rows) {
    var list = [];
    var source = rows || [];

    for (var i = 0; i < source.length; i++) {
      var row = source[i] || {};
      var hasContent = !!(
        $.trim(String(row.title || "")) ||
        $.trim(String(row.note || "")) ||
        $.trim(String(row.memo || ""))
      );

      if (hasContent) {
        list.push({
          rowId: String(row.rowId || ""),
          title: $.trim(String(row.title || "")),
          note: $.trim(String(row.note || "")),
          memo: String(row.memo || ""),
          nodeData: row.nodeData || null
        });
      }
    }

    return list;
  }

  function indexRowsById(rows) {
    var index = {};
    var source = rows || [];

    for (var i = 0; i < source.length; i++) {
      var row = source[i];
      var id = row && row.rowId ? String(row.rowId) : "";
      if (!id || index[id]) continue;
      index[id] = row;
    }

    return index;
  }

  function findSlotByKey(slots, key) {
    var source = slots || [];

    for (var i = 0; i < source.length; i++) {
      if (source[i] && source[i].slotKey === key) return source[i];
    }

    return null;
  }

  async function saveHeadingItemDirect(options) {
    if (!options || !options.jobId) {
      throw new Error("Missing heading save options.");
    }

    var payload = {
      parent: String(options.parentId || "0"),
      flag: String(options.flag == null ? 0 : options.flag),
      priority_confirm: "0",
      custom_fields: normaliseCustomFields(options.customFields),
      kind: "0",
      local: formatHireHopLocalDateTime(new Date()),
      id: String(options.id || "0"),
      name: composeStoredHeading(options.renderType || "section", options.title || ""),
      desc: String(options.desc || ""),
      memo: String(options.memo || ""),
      set_child_dates: "0",
      job: String(options.jobId || ""),
      no_availability: "0",
      ignore: "0"
    };

    return postItemsSave(payload, options.id);
  }

  async function saveCustomItemDirect(options) {
    if (!options || !options.jobId || !options.parentId) {
      throw new Error("Missing custom item save options.");
    }

    var row = options.row || {};
    var sourceData = options.sourceData || {};
    var payload = {
      parent: String(options.parentId || "0"),
      flag: String(sourceData.FLAG == null ? 0 : sourceData.FLAG),
      priority_confirm: "0",
      custom_fields: normaliseCustomFields(sourceData.CUSTOM_FIELDS),
      kind: "3",
      local: formatHireHopLocalDateTime(new Date()),
      id: String(row.rowId || sourceData.ID || "0"),
      qty: "1",
      name: String(row.title || ""),
      list_id: String(sourceData.LIST_ID || "0"),
      cust_add: String(row.note || ""),
      memo: String(row.memo || ""),
      price_type: String(sourceData.PRICE_TYPE == null ? 0 : sourceData.PRICE_TYPE),
      weight: String(sourceData.weight == null ? 0 : sourceData.weight),
      vat_rate: String(sourceData.VAT_RATE == null ? getDefaultVatRate() : sourceData.VAT_RATE),
      value: String(sourceData.value == null ? 0 : sourceData.value),
      acc_nominal: String(sourceData.ACC_NOMINAL == null ? getDefaultNominalId(1) : sourceData.ACC_NOMINAL),
      acc_nominal_po: String(sourceData.ACC_NOMINAL_PO == null ? getDefaultNominalId(2) : sourceData.ACC_NOMINAL_PO),
      cost_price: String(sourceData.COST_PRICE == null ? 0 : sourceData.COST_PRICE),
      no_scan: String(sourceData.NO_SCAN == 1 ? 1 : 0),
      country_origin: String(sourceData.COUNTRY_ORIGIN || ""),
      hs_code: String(sourceData.HS_CODE || ""),
      category_id: String(sourceData.CATEGORY_ID == null ? 0 : sourceData.CATEGORY_ID),
      no_shortfall: String(sourceData.NO_SHORTFALL == 1 ? 1 : 0),
      unit_price: "0",
      price: "0",
      job: String(options.jobId || ""),
      no_availability: "0",
      ignore: "0"
    };

    return postItemsSave(payload, row.rowId || sourceData.ID);
  }

  async function deleteItemsDirect(ids, jobId, kind) {
    var idList = normaliseIdList(ids);
    if (!idList.length) return;

    var prefix = getTreeNodePrefixForKind(kind);
    var prefixedIds = [];

    for (var i = 0; i < idList.length; i++) {
      prefixedIds.push((prefix || "") + String(idList[i] || ""));
    }

    var payload = {
      ids: prefixedIds.join(","),
      job: String(jobId || ""),
      no_availability: "0"
    };

    var response = await fetch("/php_functions/items_delete.php", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      body: buildFormBody(payload)
    });

    var text = await response.text();
    var json = tryParseJson(text);

    if (!response.ok) {
      throw new Error("items_delete failed with status " + response.status);
    }

    if (json && typeof json.error !== "undefined") {
      throw new Error(readServerMessage(json.error, "Failed to delete managed page items."));
    }
  }

  async function postItemsSave(payload, fallbackId) {
    var response = await fetch("/php_functions/items_save.php", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      body: buildFormBody(payload)
    });

    var text = await response.text();
    var json = tryParseJson(text);

    if (!response.ok) {
      throw new Error("items_save failed with status " + response.status);
    }

    if (json && typeof json.error !== "undefined") {
      throw new Error(readServerMessage(json.error, "items_save returned an error."));
    }

    if (json && typeof json.warning !== "undefined") {
      throw new Error(readServerMessage(json.warning, "items_save returned a warning."));
    }

    var savedId = getCreatedHeadingIdFromResponse(json) || String(fallbackId || "");
    if (!savedId) {
      throw new Error("items_save response did not include an item ID.");
    }

    return {
      id: String(savedId),
      json: json
    };
  }

  function buildFormBody(payload) {
    return $.param(payload || {});
  }

  function normaliseCustomFields(value) {
    if (!value) return "";
    if ($.isPlainObject(value) && $.isEmptyObject(value)) return "";
    return value;
  }

  function composeStoredHeading(renderType, title) {
    var prefix = renderType === "dept" ? "Dept: " : "Section: ";
    return prefix + String(title || "");
  }

  function extractStoredPageMeta(text) {
    var raw = String(text || "");
    var start = raw.indexOf(PAGE_META_START);
    var end = start === -1 ? -1 : raw.indexOf(PAGE_META_END, start + PAGE_META_START.length);

    if (start === -1 || end === -1) {
      return {
        baseText: $.trim(raw),
        meta: null
      };
    }

    var before = $.trim(raw.slice(0, start));
    var jsonText = raw.slice(start + PAGE_META_START.length, end);
    var after = $.trim(raw.slice(end + PAGE_META_END.length));
    var baseParts = [];

    if (before) baseParts.push(before);
    if (after) baseParts.push(after);

    var meta = null;
    try {
      meta = JSON.parse(jsonText);
    } catch (e) {
      meta = null;
    }

    return {
      baseText: $.trim(baseParts.join("\n\n")),
      meta: meta
    };
  }

  function composeStoredPageMetaText(baseText, meta) {
    var parts = [];
    var cleanBase = $.trim(String(baseText || ""));

    if (cleanBase) {
      parts.push(cleanBase);
    }

    if (meta) {
      parts.push(PAGE_META_START + JSON.stringify(meta) + PAGE_META_END);
    }

    return parts.join("\n\n");
  }

  function normalisePageMeta(meta) {
    var out = $.isPlainObject(meta) ? $.extend(true, {}, meta) : {};
    if (!$.isPlainObject(out.slots)) out.slots = {};
    return out;
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

  function findTreeNodeByDataId(tree, kind, dataId) {
    if (!tree || typeof tree.get_node !== "function") return null;

    var id = $.trim(String(dataId == null ? "" : dataId));
    if (!id) return null;

    var prefixedId = getTreeNodePrefixForKind(kind) + id;
    var node = prefixedId ? tree.get_node(prefixedId) : null;
    if (node && node.id) return node;

    node = tree.get_node(id);
    if (node && node.id) return node;

    return null;
  }

  function getTreeNodePrefixForKind(kind) {
    var prefixes = {
      0: "a",
      1: "b",
      2: "c",
      3: "d",
      4: "e",
      5: "f",
      6: "g"
    };

    return prefixes[Number(kind)] || "";
  }

  function getParentHeadingNode(tree, node) {
    if (!tree || !node) return null;

    var parentId = tree.get_parent(node);
    while (parentId && parentId !== "#") {
      var parentNode = tree.get_node(parentId);
      if (parentNode && parentNode.data && Number(parentNode.data.kind) === 0) {
        return parentNode;
      }
      parentId = parentNode ? tree.get_parent(parentNode) : "#";
    }

    return null;
  }

  function getParentHeadingDataId(tree, node) {
    var parentNode = getParentHeadingNode(tree, node);
    return parentNode && parentNode.data ? String(parentNode.data.ID || "0") : "0";
  }

  function getDirectChildNodes(tree, node) {
    var children = [];
    if (!tree || !node || !node.children || !node.children.length) return children;

    for (var i = 0; i < node.children.length; i++) {
      var childNode = tree.get_node(node.children[i]);
      if (childNode && childNode.id) {
        children.push(childNode);
      }
    }

    return children;
  }

  function getDirectChildHeadingNodes(tree, node) {
    var children = getDirectChildNodes(tree, node);
    var headings = [];

    for (var i = 0; i < children.length; i++) {
      if (children[i] && children[i].data && Number(children[i].data.kind) === 0) {
        headings.push(children[i]);
      }
    }

    return headings;
  }

  function getDirectChildCustomNodes(tree, node) {
    var children = getDirectChildNodes(tree, node);
    var customNodes = [];

    for (var i = 0; i < children.length; i++) {
      if (children[i] && children[i].data && Number(children[i].data.kind) === 3) {
        customNodes.push(children[i]);
      }
    }

    return customNodes;
  }

  function findChildHeadingByTitle(nodes, title, claimedHeadingIds) {
    var target = normaliseText(title);
    var claimed = claimedHeadingIds || {};
    var source = nodes || [];

    for (var i = 0; i < source.length; i++) {
      var node = source[i];
      if (!node || !node.data) continue;
      if (claimed[String(node.data.ID || "")]) continue;
      if (normaliseText(getNodeTitle(node)) !== target) continue;
      return node;
    }

    return null;
  }

  function findNextUnclaimedHeading(nodes, claimedHeadingIds) {
    var claimed = claimedHeadingIds || {};
    var source = nodes || [];

    for (var i = 0; i < source.length; i++) {
      var node = source[i];
      if (!node || !node.data) continue;
      if (claimed[String(node.data.ID || "")]) continue;
      return node;
    }

    return null;
  }

  function getNodeTitle(node) {
    if (!node) return "";
    if (node.data && node.data.title != null) return normaliseWhitespace(node.data.title);
    if (node.text != null) return normaliseWhitespace(node.text);
    return "";
  }

  function getNodeDescription(node) {
    return node && node.data ? String(node.data.DESCRIPTION || "") : "";
  }

  function getNodeTechnical(node) {
    return node && node.data ? String(node.data.TECHNICAL || "") : "";
  }

  function getNodeFlag(node) {
    return node && node.data && node.data.FLAG != null ? node.data.FLAG : 0;
  }

  function getNodeCustomFields(node) {
    return node && node.data && node.data.CUSTOM_FIELDS ? node.data.CUSTOM_FIELDS : "";
  }

  function getNodeDataId(node) {
    return node && node.data ? String(node.data.ID || "") : "";
  }

  function getSnapshotFlag(snapshot) {
    return snapshot && snapshot.FLAG != null ? snapshot.FLAG : 0;
  }

  function getSnapshotCustomFields(snapshot) {
    return snapshot && snapshot.CUSTOM_FIELDS ? snapshot.CUSTOM_FIELDS : "";
  }

  function cloneItemSnapshot(data) {
    return data ? $.extend(true, {}, data) : null;
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

  function readServerMessage(value, fallback) {
    if (value == null || value === "") return fallback;
    return String(value);
  }

  function buildTemplateIndex(templates) {
    var index = {};

    for (var i = 0; i < templates.length; i++) {
      index[templates[i].key] = templates[i];
    }

    return index;
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

  function findDeptTemplateByParentAndName(parentName, name) {
    var cleanParentName = normaliseText(parentName);
    var cleanName = normaliseText(name);

    for (var i = 0; i < PAGE_TEMPLATES.length; i++) {
      var template = PAGE_TEMPLATES[i];
      if (!template || template.renderType !== "dept") continue;
      if (normaliseText(template.parentName) !== cleanParentName) continue;
      if (normaliseText(template.name) !== cleanName) continue;
      return template;
    }

    return null;
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

  function getDefaultVatRate() {
    if (window.user && window.user.DEFAULT_TAX_GROUP != null) {
      return window.user.DEFAULT_TAX_GROUP;
    }

    return 0;
  }

  function getDefaultNominalId(type) {
    var items = window.nominal_codes || [];
    var firstMatch = 0;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item || Number(item.TYPE) !== Number(type) || Number(item.HIDDEN) === 1) continue;
      if (!firstMatch) firstMatch = item.ID;
      if (Number(item.DEFAULT) === 1) return item.ID;
    }

    return firstMatch || 0;
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

  function normaliseIdList(values) {
    var list = [];
    var source = Array.isArray(values) ? values : (values ? [values] : []);

    for (var i = 0; i < source.length; i++) {
      var id = $.trim(String(source[i] == null ? "" : source[i]));
      if (!id || list.indexOf(id) !== -1) continue;
      list.push(id);
    }

    return list;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/\r?\n/g, "&#10;");
  }

  function escapeSelector(value) {
    var text = String(value == null ? "" : value);
    if (!text) return "";

    if ($.escapeSelector) return $.escapeSelector(text);
    return text.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
  }

  function getErrorMessage(err, fallback) {
    if (err && err.message) return err.message;
    return fallback;
  }
})();
