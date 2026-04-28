(function () {
  "use strict";

  var $ = window.jQuery;
  if (!$) return;

  var CFG = {
    version: "2026-04-28.07-event-overview-overhaul",
    buttonId: "wise-event-overview-button",
    stylesId: "wise-event-overview-styles",
    overlayId: "wise-event-overview-overlay",
    modalId: "wise-event-overview-modal",
    titleId: "wise-event-overview-title",
    bodyId: "wise-event-overview-body",
    statusId: "wise-event-overview-status",
    saveId: "wise-event-overview-save",
    closeId: "wise-event-overview-close",
    sectionName: "Event Overview",
    requiredRawSectionName: "// Section: Event Overview",
    maxSchedules: 3,
    maxRows: 10,
    allowedDepotIds: ["14"],
    allowedDepotNames: ["Project Costs"],
    blockWhenDepotUndetected: true,
    bootstrapMaxTries: 120,
    bootstrapRetryMs: 500,
    writeThrottleMs: 1150,
    rateLimitRetryMs: 65000,
    saveMaxAttempts: 2,
    metaStart: "[WisePageMeta]",
    metaEnd: "[/WisePageMeta]",
    profileKey: "event_overview_schedule",
    rootTemplateKey: "section_event_overview",
    deptTemplateKey: "dept_proposed_timings"
  };

  var LAYOUT_IMAGE = "image";
  var LAYOUT_COLUMNS = "columns";
  var VARIANT_HALF_IMAGE = "half_image";
  var VARIANT_THREE_COLUMNS = "three_columns";
  var LEGACY_VARIANT_COLUMNS = "no_image_multi";
  var SLOT_KEYS = ["primary", "secondary", "tertiary"];

  var editor = {
    ready: false,
    saving: false,
    original: null,
    current: null,
    rootNode: null,
    lastClickedNodeId: "",
    lastWriteAt: 0,
    uid: 0,
    depotSignature: ""
  };

  log("Event Overview editor loaded", CFG.version);
  boot();

  function boot() {
    var tries = 0;

    function attempt() {
      if (editor.ready) return;
      tries += 1;

      if (!isAllowedDepot(getActiveDepotContext())) {
        if (tries < CFG.bootstrapMaxTries) setTimeout(attempt, CFG.bootstrapRetryMs);
        return;
      }

      if (!$("#items_tab").length) {
        if (tries < CFG.bootstrapMaxTries) setTimeout(attempt, CFG.bootstrapRetryMs);
        return;
      }

      editor.ready = true;
      injectStyles();
      ensureModal();
      installTreeClickTracker();
      addToolbarButton();
    }

    if (document.readyState === "loading") $(attempt);
    else attempt();

    $(window).on("load.wiseEventOverview focus.wiseEventOverview", attempt);
    $(document).on("ajaxComplete.wiseEventOverview", attempt);
  }

  function injectStyles() {
    if ($("#" + CFG.stylesId).length) return;

    var css = [
      "#" + CFG.overlayId + "{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(9,15,28,.52);backdrop-filter:blur(3px);z-index:100000;}",
      "#" + CFG.modalId + "{width:min(980px,calc(100vw - 28px));max-height:calc(100vh - 28px);display:flex;flex-direction:column;overflow:hidden;background:#f7f9fc;border:1px solid #d0d5dd;border-radius:16px;box-shadow:0 24px 64px rgba(15,23,42,.28);color:#1f2937;font-family:inherit;}",
      "#" + CFG.modalId + " *{box-sizing:border-box;}",
      "#" + CFG.modalId + " .weo-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:14px 16px 10px;background:linear-gradient(180deg,#ffffff 0%,#f7f9fc 100%);border-bottom:1px solid #e4e8ef;}",
      "#" + CFG.modalId + " .weo-title{font-size:17px;font-weight:800;line-height:1.15;letter-spacing:-.01em;}",
      "#" + CFG.modalId + " .weo-subtitle{margin-top:3px;color:#667085;font-size:11px;line-height:1.4;max-width:620px;}",
      "#" + CFG.modalId + " .weo-x{border:0;background:transparent;color:#667085;cursor:pointer;font-size:24px;line-height:1;padding:0 2px;}",
      "#" + CFG.modalId + " .weo-body{padding:10px 12px 12px;overflow:auto;background:#eef2f6;display:flex;flex-direction:column;gap:8px;}",
      "#" + CFG.modalId + " .weo-message{border:1px dashed #d0d5dd;border-radius:14px;background:#f9fafb;padding:18px;color:#344054;font-size:14px;line-height:1.55;}",
      "#" + CFG.modalId + " .weo-message strong{display:block;margin-bottom:6px;color:#101828;font-size:15px;}",
      "#" + CFG.modalId + " .weo-shell{display:grid;gap:8px;align-items:start;}",
      "#" + CFG.modalId + " .weo-side{display:grid;gap:8px;align-self:start;}",
      "#" + CFG.modalId + " .weo-main{display:grid;gap:8px;min-width:0;}",
      "#" + CFG.modalId + " .weo-grid{display:grid;gap:8px;}",
      "#" + CFG.modalId + " .weo-card{border:1px solid #dde3ea;border-radius:12px;background:#fff;padding:10px;box-shadow:0 6px 14px rgba(15,23,42,.04);min-width:0;}",
      "#" + CFG.modalId + " .weo-card.is-muted{background:#f8fafc;}",
      "#" + CFG.modalId + " .weo-card-head{display:flex;gap:8px;align-items:flex-start;justify-content:space-between;margin-bottom:8px;}",
      "#" + CFG.modalId + " .weo-card-title{font-size:13px;font-weight:800;color:#101828;line-height:1.2;}",
      "#" + CFG.modalId + " .weo-card-note{margin-top:1px;color:#667085;font-size:10px;line-height:1.35;}",
      "#" + CFG.modalId + " .weo-head-actions{display:flex;align-items:center;gap:8px;}",
      "#" + CFG.modalId + " .weo-mini-meta{font-size:10px;font-weight:800;color:#667085;white-space:nowrap;}",
      "#" + CFG.modalId + " .weo-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}",
      "#" + CFG.modalId + " .weo-choice{display:grid;grid-template-columns:16px minmax(0,1fr) 78px;gap:8px;align-items:center;border:1px solid #d5dbe4;border-radius:11px;padding:8px 9px;background:#fff;cursor:pointer;min-height:68px;}",
      "#" + CFG.modalId + " .weo-choice:has(input:checked){border-color:#175cd3;background:#eef4ff;box-shadow:inset 0 0 0 1px rgba(23,92,211,.08);}",
      "#" + CFG.modalId + " .weo-choice input{margin:0;}",
      "#" + CFG.modalId + " .weo-choice-copy{display:block;min-width:0;}",
      "#" + CFG.modalId + " .weo-choice-copy b{display:block;margin-bottom:2px;font-size:12px;color:#101828;}",
      "#" + CFG.modalId + " .weo-choice-copy span{display:block;color:#667085;font-size:10px;line-height:1.25;}",
      "#" + CFG.modalId + " .weo-choice-visual{height:44px;border:1px solid #d8e0ea;border-radius:9px;padding:4px;background:linear-gradient(180deg,#ffffff 0%,#f5f7fb 100%);display:grid;gap:4px;overflow:hidden;}",
      "#" + CFG.modalId + " .weo-choice-visual.is-image{grid-template-columns:.85fr 1.15fr;}",
      "#" + CFG.modalId + " .weo-choice-visual.is-columns{grid-template-rows:10px 1fr;}",
      "#" + CFG.modalId + " .weo-choice-media{border-radius:8px;background:linear-gradient(160deg,#0ea5e9 0%,#1d4ed8 100%);}",
      "#" + CFG.modalId + " .weo-choice-copybars{display:grid;gap:5px;align-content:start;}",
      "#" + CFG.modalId + " .weo-choice-copybars span,#" + CFG.modalId + " .weo-choice-topbar,#" + CFG.modalId + " .weo-choice-columns span{display:block;border-radius:999px;background:#d8e0ea;}",
      "#" + CFG.modalId + " .weo-choice-copybars span:nth-child(1){height:10px;width:72%;background:#c7d7ff;}",
      "#" + CFG.modalId + " .weo-choice-copybars span:nth-child(2){height:8px;width:94%;}",
      "#" + CFG.modalId + " .weo-choice-copybars span:nth-child(3){height:8px;width:58%;}",
      "#" + CFG.modalId + " .weo-choice-topbar{height:10px;width:62%;background:#c7d7ff;}",
      "#" + CFG.modalId + " .weo-choice-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;}",
      "#" + CFG.modalId + " .weo-choice-columns span{height:100%;min-height:18px;}",
      "#" + CFG.modalId + " .weo-setup-grid{display:grid;gap:8px;margin-top:8px;}",
      "#" + CFG.modalId + " .weo-setup-panel{border:1px solid #e3e8ef;border-radius:10px;background:#fbfcfd;padding:8px;}",
      "#" + CFG.modalId + " .weo-eyebrow{display:block;margin-bottom:5px;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#98a2b3;}",
      "#" + CFG.modalId + " .weo-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}",
      "#" + CFG.modalId + " .weo-field{display:flex;flex-direction:column;gap:3px;min-width:0;}",
      "#" + CFG.modalId + " .weo-field.is-wide{grid-column:1/-1;}",
      "#" + CFG.modalId + " label.weo-label{font-size:10px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;color:#344054;}",
      "#" + CFG.modalId + " .weo-input,#" + CFG.modalId + " .weo-textarea{width:100%;border:1px solid #cfd6e0;border-radius:8px;background:#fff;color:#101828;font-size:12px;padding:6px 8px;box-shadow:inset 0 1px 2px rgba(15,23,42,.03);}",
      "#" + CFG.modalId + " .weo-input:focus,#" + CFG.modalId + " .weo-textarea:focus{outline:2px solid rgba(23,92,211,.16);border-color:#175cd3;}",
      "#" + CFG.modalId + " .weo-textarea{min-height:56px;resize:vertical;line-height:1.35;}",
      "#" + CFG.modalId + " .weo-help{color:#667085;font-size:10px;line-height:1.3;}",
      "#" + CFG.modalId + " .weo-schedules-head{display:flex;gap:8px;align-items:flex-start;justify-content:space-between;margin-bottom:8px;}",
      "#" + CFG.modalId + " .weo-schedule-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:8px;}",
      "#" + CFG.modalId + " .weo-schedule-card{display:flex;flex-direction:column;gap:8px;min-width:0;}",
      "#" + CFG.modalId + " .weo-schedule-grid-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}",
      "#" + CFG.modalId + " .weo-times-block{display:grid;gap:6px;}",
      "#" + CFG.modalId + " .weo-times-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}",
      "#" + CFG.modalId + " .weo-times-title{font-size:11px;font-weight:800;color:#101828;}",
      "#" + CFG.modalId + " .weo-inline-note{font-size:10px;color:#667085;line-height:1.25;}",
      "#" + CFG.modalId + " .weo-row{display:grid;grid-template-columns:72px minmax(0,1fr) 28px;gap:4px;align-items:center;}",
      "#" + CFG.modalId + " .weo-row + .weo-row{margin-top:4px;}",
      "#" + CFG.modalId + " .weo-row > *{min-width:0;}",
      "#" + CFG.modalId + " .weo-row .weo-btn{min-width:28px;padding:6px 0;}",
      "#" + CFG.modalId + " .weo-btn{border:1px solid #cfd4dc;border-radius:8px;background:#fff;color:#1f2937;cursor:pointer;font-size:11px;font-weight:800;padding:6px 8px;line-height:1.15;}",
      "#" + CFG.modalId + " .weo-btn:hover{background:#f9fafb;}",
      "#" + CFG.modalId + " .weo-btn.is-primary{border-color:#175cd3;background:#175cd3;color:#fff;}",
      "#" + CFG.modalId + " .weo-btn.is-danger{border-color:#fecdca;color:#b42318;background:#fff;}",
      "#" + CFG.modalId + " .weo-btn.is-small{padding:6px 7px;}",
      "#" + CFG.modalId + " .weo-btn[disabled]{opacity:.55;cursor:not-allowed;}",
      "#" + CFG.modalId + " .weo-warning{border:1px solid #fedf89;background:#fffaeb;color:#93370d;border-radius:10px;padding:7px 9px;font-size:11px;line-height:1.35;}",
      "#" + CFG.modalId + " .weo-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:0;}",
      "#" + CFG.modalId + " .weo-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding-top:8px;border-top:1px solid #e4e8ef;}",
      "#" + CFG.modalId + " .weo-preview-card{background:linear-gradient(180deg,#12213c 0%,#182946 100%);border-color:#102448;color:#e5edf8;}",
      "#" + CFG.modalId + " .weo-preview-card .weo-card-title{color:#fff;}",
      "#" + CFG.modalId + " .weo-preview-card .weo-card-note{color:rgba(226,232,240,.8);}",
      "#" + CFG.modalId + " .weo-chip-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;}",
      "#" + CFG.modalId + " .weo-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(148,163,184,.28);border-radius:999px;background:rgba(255,255,255,.06);padding:5px 8px;}",
      "#" + CFG.modalId + " .weo-chip strong{font-size:11px;font-weight:800;color:#fff;}",
      "#" + CFG.modalId + " .weo-chip span{font-size:11px;color:rgba(226,232,240,.82);}",
      "#" + CFG.modalId + " .weo-preview-page{border-radius:16px;background:linear-gradient(180deg,#ffffff 0%,#f4f7fb 100%);padding:10px;border:1px solid rgba(148,163,184,.22);display:grid;gap:10px;color:#101828;min-height:286px;}",
      "#" + CFG.modalId + " .weo-preview-page.is-image{grid-template-columns:.88fr 1.12fr;}",
      "#" + CFG.modalId + " .weo-preview-media{border-radius:12px;background:linear-gradient(160deg,#0ea5e9 0%,#1d4ed8 100%);padding:12px;display:flex;flex-direction:column;justify-content:space-between;min-height:250px;color:#eff6ff;}",
      "#" + CFG.modalId + " .weo-preview-media-tag{align-self:flex-start;border-radius:999px;background:rgba(255,255,255,.16);padding:5px 8px;font-size:11px;font-weight:800;}",
      "#" + CFG.modalId + " .weo-preview-media-url{font-size:12px;line-height:1.4;word-break:break-word;}",
      "#" + CFG.modalId + " .weo-preview-copy{display:flex;flex-direction:column;gap:10px;background:#fff;border-radius:12px;padding:12px;box-shadow:inset 0 0 0 1px #e6ebf2;min-height:250px;}",
      "#" + CFG.modalId + " .weo-preview-kicker{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#175cd3;}",
      "#" + CFG.modalId + " .weo-preview-heading{font-size:18px;font-weight:800;line-height:1.08;letter-spacing:-.02em;}",
      "#" + CFG.modalId + " .weo-preview-blurb{font-size:12px;color:#475467;line-height:1.45;min-height:36px;}",
      "#" + CFG.modalId + " .weo-preview-list{display:grid;gap:8px;margin-top:auto;}",
      "#" + CFG.modalId + " .weo-preview-time{display:grid;grid-template-columns:62px minmax(0,1fr);gap:8px;padding-top:8px;border-top:1px solid #edf1f5;}",
      "#" + CFG.modalId + " .weo-preview-time strong{font-size:11px;font-weight:800;color:#175cd3;}",
      "#" + CFG.modalId + " .weo-preview-time span{font-size:11px;color:#344054;line-height:1.35;}",
      "#" + CFG.modalId + " .weo-preview-page.is-columns{grid-template-rows:auto 1fr;}",
      "#" + CFG.modalId + " .weo-preview-opening{padding:10px 12px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e6ebf2;font-size:12px;color:#475467;line-height:1.45;min-height:52px;}",
      "#" + CFG.modalId + " .weo-preview-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}",
      "#" + CFG.modalId + " .weo-preview-column{display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e6ebf2;min-height:192px;}",
      "#" + CFG.modalId + " .weo-preview-column.is-empty{background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);opacity:.76;}",
      "#" + CFG.modalId + " .weo-preview-column-label{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#98a2b3;}",
      "#" + CFG.modalId + " .weo-preview-column-title{font-size:13px;font-weight:800;color:#101828;line-height:1.2;}",
      "#" + CFG.modalId + " .weo-preview-column-intro{font-size:11px;color:#667085;line-height:1.35;min-height:28px;}",
      "#" + CFG.modalId + " .weo-preview-column-list{display:grid;gap:6px;margin-top:auto;}",
      "#" + CFG.modalId + " .weo-preview-empty{margin-top:auto;padding:10px;border:1px dashed #d0d5dd;border-radius:10px;font-size:11px;color:#98a2b3;text-align:center;background:#fbfcfd;}",
      "#" + CFG.modalId + " .weo-preview-more{font-size:11px;font-weight:800;color:#667085;}",
      "#" + CFG.modalId + " .weo-preview-help{margin-top:10px;font-size:11px;line-height:1.45;color:rgba(226,232,240,.82);}",
      "#" + CFG.statusId + "{min-height:14px;font-size:11px;font-weight:700;padding-left:1px;}",
      "#" + CFG.statusId + ".is-error{color:#b42318;}",
      "#" + CFG.statusId + ".is-success{color:#027a48;}",
      "#" + CFG.statusId + ".is-warning{color:#b54708;}",
      "#" + CFG.statusId + ".is-info{color:#175cd3;}",
      "@media(max-width:980px){#" + CFG.modalId + "{width:calc(100vw - 20px);max-height:calc(100vh - 20px);}#" + CFG.modalId + " .weo-schedule-grid{grid-template-columns:1fr 1fr;}#" + CFG.modalId + " .weo-schedule-grid-fields{grid-template-columns:1fr;}}",
      "@media(max-width:760px){#" + CFG.overlayId + "{padding:8px;}#" + CFG.modalId + "{width:calc(100vw - 16px);max-height:calc(100vh - 16px);}#" + CFG.modalId + " .weo-head{padding:12px 12px 9px;}#" + CFG.modalId + " .weo-body{padding:8px;}#" + CFG.modalId + " .weo-choice-grid,#" + CFG.modalId + " .weo-fields,#" + CFG.modalId + " .weo-schedule-grid{grid-template-columns:1fr;}#" + CFG.modalId + " .weo-choice{grid-template-columns:16px minmax(0,1fr);}#" + CFG.modalId + " .weo-choice-visual{display:none;}#" + CFG.modalId + " .weo-row{grid-template-columns:1fr;}#" + CFG.modalId + " .weo-row .weo-btn{width:100%;}#" + CFG.modalId + " .weo-schedules-head{flex-direction:column;align-items:flex-start;}#" + CFG.modalId + " .weo-footer{flex-wrap:wrap;justify-content:stretch;}#" + CFG.modalId + " .weo-footer .weo-btn{flex:1 1 140px;}}"
    ].join("");

    $("head").append('<style id="' + CFG.stylesId + '">' + css + "</style>");
  }

  function ensureModal() {
    if ($("#" + CFG.overlayId).length) return;

    var html = '' +
      '<div id="' + CFG.overlayId + '">' +
        '<div id="' + CFG.modalId + '" role="dialog" aria-modal="true" aria-labelledby="' + CFG.titleId + '">' +
          '<div class="weo-head">' +
            '<div>' +
              '<div id="' + CFG.titleId + '" class="weo-title">Event Overview</div>' +
              '<div class="weo-subtitle">Edit the proposal page without touching the underlying list structure.</div>' +
            '</div>' +
            '<button type="button" class="weo-x" aria-label="Close">&times;</button>' +
          '</div>' +
          '<div class="weo-body">' +
            '<div id="' + CFG.bodyId + '"></div>' +
            '<div id="' + CFG.statusId + '"></div>' +
            '<div class="weo-footer">' +
              '<button type="button" id="' + CFG.closeId + '" class="weo-btn">Cancel</button>' +
              '<button type="button" id="' + CFG.saveId + '" class="weo-btn is-primary">Save changes</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    $("body").append(html);

    $("#" + CFG.modalId + " .weo-x,#" + CFG.closeId).on("click", requestCloseEditor);
    $("#" + CFG.saveId).on("click", saveEditor);

    $(document).on("keydown.wiseEventOverview", function (e) {
      if (e.key === "Escape" && $("#" + CFG.overlayId).is(":visible")) requestCloseEditor();
    });

    $("#" + CFG.bodyId).on("change", 'input[name="weo-layout"]', function () {
      if (editor.saving) return;
      editor.current = readFormState(editor.current);
      renderEditor(editor.current);
      setStatus("", "");
    });

    $("#" + CFG.bodyId).on("click", "[data-weo-action]", function (e) {
      e.preventDefault();
      if (editor.saving) return;
      runEditorAction($(this));
    });
  }

  function addToolbarButton() {
    if ($("#" + CFG.buttonId).length) return;

    var $host = findToolbarHost();
    if (!$host.length) {
      setTimeout(addToolbarButton, 1000);
      return;
    }

    var $btn = $('<button id="' + CFG.buttonId + '" type="button" class="items_func_btn ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon-primary" style="width:178px;margin:0 .5em;" role="button"><span class="ui-button-icon-primary ui-icon ui-icon-pencil"></span><span class="ui-button-text">Edit Event Overview</span></button>');
    $btn.on("click", openEditor);

    var $edit = findToolbarActionButton(/^edit\b/i);
    var $preview = $("#wise-doc-preview-toggle");
    var $gear = $host.children("button.fixed_width").first();

    if ($edit.length) $btn.insertAfter($edit.first());
    else if ($preview.length) $btn.insertBefore($preview.first());
    else if ($gear.length) $btn.insertBefore($gear);
    else $host.append($btn);

    log("Event Overview editor button inserted");
  }

  function findToolbarHost() {
    var $preview = $("#wise-doc-preview-toggle");
    if ($preview.length && $preview.parent().length) return $preview.parent();

    var $edit = findToolbarActionButton(/^edit\b/i);
    if ($edit.length && $edit.parent().length) return $edit.parent();

    var $new = findToolbarActionButton(/^new\b/i);
    if ($new.length && $new.parent().length) return $new.parent();

    return $("#items_tab > div:first-child");
  }

  function findToolbarActionButton(pattern) {
    var $scope = $("#items_tab > div:first-child");
    if (!$scope.length) return $();
    return $scope.find('button,a,[role="button"],input[type="button"],input[type="submit"]').filter(":visible").filter(function () {
      var text = $.trim($(this).text() || $(this).val() || $(this).attr("title") || $(this).attr("aria-label") || "");
      return pattern.test(text);
    }).first();
  }

  function installTreeClickTracker() {
    $(document).off(".wiseEventOverviewSelection").on(
      "mousedown.wiseEventOverviewSelection click.wiseEventOverviewSelection dblclick.wiseEventOverviewSelection",
      "#items_tab li.jstree-node,#items_tab a.jstree-anchor",
      function () {
        var $li = $(this).is("li.jstree-node") ? $(this) : $(this).closest("li.jstree-node");
        if ($li.length) editor.lastClickedNodeId = $.trim(String($li.attr("id") || ""));
      }
    );
  }

  function openEditor() {
    ensureModal();
    setStatus("", "");
    setSaveEnabled(false);

    try {
      var tree = getTree();
      if (!tree) {
        showMessage("Items list not ready", "The items list could not be detected yet. Open the supplying list and try again.");
        showOverlay();
        return;
      }

      var match = chooseEventOverviewSection(tree);
      if (match.error) {
        showMessage(match.title || "Event Overview not found", match.error);
        showOverlay();
        return;
      }

      editor.rootNode = match.node;
      editor.original = readEventOverviewState(tree, match.node);
      editor.current = clone(editor.original);
      renderEditor(editor.current);
      showOverlay();
    } catch (err) {
      editor.rootNode = null;
      editor.original = null;
      editor.current = null;
      warn("openEditor failed", err);
      showMessage("Could not open Event Overview", getErrorMessage(err, "The editor hit an unexpected error while reading the selected section."));
      showOverlay();
    }
  }

  function requestCloseEditor() {
    if (editor.saving) return;

    if (hasUnsavedEditorChanges()) {
      var discard = window.confirm("Discard your unsaved Event Overview changes?");
      if (!discard) return;
    }

    closeEditor();
  }

  function closeEditor() {
    if (editor.saving) return;
    $("#" + CFG.overlayId).hide();
    setStatus("", "");
  }

  function showOverlay() {
    $("#" + CFG.overlayId).css("display", "flex");
  }

  function showMessage(title, message) {
    $("#" + CFG.bodyId).html('<div class="weo-message"><strong>' + esc(title) + '</strong>' + esc(message) + '</div>');
    setSaveEnabled(false);
  }

  function renderEditor(state) {
    state = normaliseEditorState(state || blankState());
    editor.current = state;

    var extraImageWarning = getImageLayoutExtraScheduleWarning(state);
    var html = '' +
      '<div class="weo-grid">' +
        pageSetupCardHtml(state) +
        (extraImageWarning ? '<div class="weo-warning">' + esc(extraImageWarning) + '</div>' : '') +
        schedulesHtml(state) +
      '</div>';

    $("#" + CFG.bodyId).html(html);
    setSaveEnabled(true);
  }

  function pageSetupCardHtml(state) {
    return '' +
      '<div class="weo-card">' +
        '<div class="weo-card-head"><div><div class="weo-card-title">Build controls</div><div class="weo-card-note">Choose the page shape first, then fill the content that should appear in the sketch.</div></div></div>' +
        '<div class="weo-choice-grid">' +
          layoutChoiceHtml(LAYOUT_IMAGE, state.layout, "Image split", "One feature image with a single schedule beside it.") +
          layoutChoiceHtml(LAYOUT_COLUMNS, state.layout, "Three columns", "Opening copy above up to three schedule columns.") +
        '</div>' +
        '<div class="weo-setup-grid">' +
          (state.layout === LAYOUT_IMAGE ? imageCardHtml(state) : openingTextCardHtml(state)) +
        '</div>' +
      '</div>';
  }

  function livePreviewPanelHtml(state) {
    var activeCount = Math.min(state.layout === LAYOUT_COLUMNS ? CFG.maxSchedules : 1, getActiveSchedules(state).length);
    var totalRows = countScheduleRows(state.schedules || []);

    return '' +
      '<div class="weo-card weo-preview-card">' +
        '<div class="weo-card-head"><div><div class="weo-card-title">Live page map</div><div class="weo-card-note">A compact sketch of how this Event Overview will read on the proposal page.</div></div></div>' +
        '<div class="weo-chip-row">' +
          summaryChipHtml("Mode", getLayoutModeLabel(state.layout)) +
          summaryChipHtml("Active", String(activeCount) + " / " + String(state.layout === LAYOUT_COLUMNS ? CFG.maxSchedules : 1)) +
          summaryChipHtml("Times", String(totalRows)) +
        '</div>' +
        livePreviewHtml(state) +
        '<div class="weo-preview-help">The hidden section name stays untouched. This editor only shapes the visible page content beneath it.</div>' +
      '</div>';
  }

  function summaryChipHtml(label, value) {
    return '<span class="weo-chip"><strong>' + esc(label) + '</strong><span>' + esc(value) + '</span></span>';
  }

  function getLayoutModeLabel(layout) {
    return normaliseLayout(layout) === LAYOUT_COLUMNS ? "Three columns" : "Image split";
  }

  function countScheduleRows(schedules) {
    var total = 0;
    var source = schedules || [];

    for (var i = 0; i < source.length; i++) {
      total += getRowsToSave(source[i]).length;
    }

    return total;
  }

  function layoutChoiceHtml(value, current, title, note) {
    return '' +
      '<label class="weo-choice">' +
        '<input type="radio" name="weo-layout" value="' + attr(value) + '"' + (value === current ? ' checked' : '') + '>' +
        '<span class="weo-choice-copy"><b>' + esc(title) + '</b><span>' + esc(note) + '</span></span>' +
        layoutChoiceVisualHtml(value) +
      '</label>';
  }

  function layoutChoiceVisualHtml(value) {
    if (value === LAYOUT_COLUMNS) {
      return '' +
        '<span class="weo-choice-visual is-columns">' +
          '<span class="weo-choice-topbar"></span>' +
          '<span class="weo-choice-columns"><span></span><span></span><span></span></span>' +
        '</span>';
    }

    return '' +
      '<span class="weo-choice-visual is-image">' +
        '<span class="weo-choice-media"></span>' +
        '<span class="weo-choice-copybars"><span></span><span></span><span></span></span>' +
      '</span>';
  }

  function imageCardHtml(state) {
    return '' +
      '<div class="weo-setup-panel">' +
        '<span class="weo-eyebrow">Visual panel</span>' +
        fieldHtml({ wide: true, label: "Image link", field: "imageUrl", value: state.imageUrl, placeholder: "https://...", note: "This fills the image side of the split page layout." }) +
      '</div>';
  }

  function openingTextCardHtml(state) {
    return '' +
      '<div class="weo-setup-panel">' +
        '<span class="weo-eyebrow">Top opening</span>' +
        textareaHtml({ wide: true, label: "Opening text", field: "openingText", value: state.openingText, placeholder: "Briefly introduce the schedule.", note: "This appears above the schedule columns in the final page." }) +
      '</div>';
  }

  function schedulesHtml(state) {
    var schedules = state.schedules && state.schedules.length ? state.schedules.slice(0, CFG.maxSchedules) : [blankSchedule("Day of event")];
    var cards = [];
    var activeCount = getActiveSchedules(state).length;
    var totalRows = countScheduleRows(schedules);

    if (state.layout === LAYOUT_COLUMNS) {
      while (schedules.length < CFG.maxSchedules) {
        schedules.push(blankSchedule(""));
      }
    }

    for (var i = 0; i < schedules.length; i++) {
      cards.push(scheduleCardHtml(schedules[i], i, state.layout));
    }

    return '' +
      '<div class="weo-card">' +
        '<div class="weo-schedules-head">' +
          '<div><div class="weo-card-title">' + esc(state.layout === LAYOUT_COLUMNS ? "Schedule columns" : "Schedule content") + '</div><div class="weo-card-note">' + esc(state.layout === LAYOUT_COLUMNS ? "Each card feeds one visible page column. Blank cards are ignored until you add real content." : "The first card is the visible schedule. Extra saved cards stay muted until you switch to the three column layout.") + '</div></div>' +
          '<div class="weo-head-actions"><div class="weo-mini-meta">' + esc(String(activeCount) + " active, " + String(totalRows) + " time rows") + '</div></div>' +
        '</div>' +
        '<div class="weo-schedule-grid">' + cards.join("") + '</div>' +
      '</div>';
  }

  function scheduleCardHtml(schedule, index, layout) {
    schedule = normaliseSchedule(schedule);
    var isExtraInImageLayout = layout === LAYOUT_IMAGE && index > 0;
    var rows = schedule.rows && schedule.rows.length ? schedule.rows : [blankRow()];
    var rowHtml = [];
    var liveRows = getRowsToSave(schedule).length;
    var canClear = index > 0 && (schedule.id || $.trim(schedule.title) || $.trim(schedule.intro) || liveRows);
    var slotLabel = getScheduleSlotLabel(index, layout);
    var titleLabel = layout === LAYOUT_COLUMNS ? "Column heading" : "Schedule heading";
    var introLabel = layout === LAYOUT_COLUMNS ? "Column intro" : "Schedule intro";
    var slotNote = isExtraInImageLayout
      ? "Hidden until you switch this page to the three column layout."
      : (liveRows ? String(liveRows) + " time row" + (liveRows === 1 ? "" : "s") + " ready." : "Add the first time row below.");

    for (var i = 0; i < rows.length && i < CFG.maxRows; i++) {
      rowHtml.push(rowHtmlLine(rows[i], index, i));
    }

    return '' +
      '<div class="weo-card weo-schedule-card' + (isExtraInImageLayout ? ' is-muted' : '') + '" data-schedule-index="' + index + '" data-schedule-uid="' + attr(schedule.uid) + '" data-schedule-id="' + attr(schedule.id) + '">' +
        '<div class="weo-card-head">' +
          '<div class="weo-card-heading">' +
            '<span class="weo-eyebrow">' + esc(slotLabel) + '</span>' +
            '<div class="weo-card-title">' + esc(getScheduleSlotTitle(index, layout)) + '</div>' +
            '<div class="weo-card-note">' + esc(slotNote) + '</div>' +
          '</div>' +
          (canClear ? '<button type="button" class="weo-btn is-danger is-small" data-weo-action="remove-schedule" data-schedule-index="' + index + '">Clear</button>' : '') +
        '</div>' +
        '<div class="weo-schedule-grid-fields">' +
          fieldHtml({ wide: false, label: titleLabel, field: "scheduleTitle", value: schedule.title, placeholder: index === 0 ? "Day of event" : "Setup day" }) +
          textareaHtml({ wide: false, label: introLabel, field: "scheduleIntro", value: schedule.intro, placeholder: layout === LAYOUT_COLUMNS ? "Optional text above this column." : "Optional short note before the times." }) +
        '</div>' +
        '<div class="weo-times-block">' +
          '<div class="weo-times-head">' +
            '<div><div class="weo-times-title">Time rows</div><div class="weo-inline-note">Use clear labels such as 09:00, TBC, Morning, or After dinner.</div></div>' +
            '<div class="weo-mini-meta">' + esc(String(liveRows) + " / " + String(CFG.maxRows)) + '</div>' +
          '</div>' +
          '<div>' + rowHtml.join("") + '</div>' +
          '<div class="weo-actions">' +
            '<button type="button" class="weo-btn" data-weo-action="add-row" data-schedule-index="' + index + '"' + (rows.length >= CFG.maxRows ? ' disabled' : '') + '>Add time</button>' +
            '<span class="weo-inline-note">' + esc(layout === LAYOUT_COLUMNS ? "These rows appear inside this page column." : "These rows appear beside the image.") + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function getScheduleSlotLabel(index, layout) {
    if (layout === LAYOUT_COLUMNS) return "Page column " + (index + 1);
    return index === 0 ? "Visible schedule" : "Extra saved schedule";
  }

  function getScheduleSlotTitle(index, layout) {
    if (layout === LAYOUT_COLUMNS) return "Column " + (index + 1);
    return index === 0 ? "Main schedule" : "Schedule " + (index + 1);
  }

  function rowHtmlLine(row, scheduleIndex, rowIndex) {
    row = normaliseRow(row);
    return '' +
      '<div class="weo-row" data-row-index="' + rowIndex + '" data-row-uid="' + attr(row.uid) + '" data-row-id="' + attr(row.id) + '">' +
        '<input class="weo-input" type="text" data-field="rowTime" value="' + attr(row.time) + '" placeholder="09:00" maxlength="32">' +
        '<input class="weo-input" type="text" data-field="rowText" value="' + attr(row.text) + '" placeholder="What happens?">' +
        '<button type="button" class="weo-btn is-danger is-small" data-weo-action="remove-row" data-schedule-index="' + scheduleIndex + '" data-row-index="' + rowIndex + '" aria-label="Remove time">&times;</button>' +
      '</div>';
  }

  function fieldHtml(o) {
    return '' +
      '<div class="weo-field' + (o.wide ? ' is-wide' : '') + '">' +
        '<label class="weo-label">' + esc(o.label) + '</label>' +
        '<input class="weo-input" type="text" data-field="' + attr(o.field) + '" value="' + attr(o.value) + '" placeholder="' + attr(o.placeholder || '') + '">' +
        (o.note ? '<div class="weo-help">' + esc(o.note) + '</div>' : '') +
      '</div>';
  }

  function textareaHtml(o) {
    return '' +
      '<div class="weo-field' + (o.wide ? ' is-wide' : '') + '">' +
        '<label class="weo-label">' + esc(o.label) + '</label>' +
        '<textarea class="weo-textarea" data-field="' + attr(o.field) + '" placeholder="' + attr(o.placeholder || '') + '">' + esc(o.value) + '</textarea>' +
        (o.note ? '<div class="weo-help">' + esc(o.note) + '</div>' : '') +
      '</div>';
  }

  function livePreviewHtml(state) {
    return state.layout === LAYOUT_COLUMNS
      ? columnsPreviewHtml(state)
      : imagePreviewHtml(state);
  }

  function imagePreviewHtml(state) {
    var schedule = normaliseSchedule((state.schedules && state.schedules[0]) || blankSchedule("Day of event"));

    return '' +
      '<div class="weo-preview-page is-image">' +
        '<div class="weo-preview-media">' +
          '<div class="weo-preview-media-tag">' + esc(state.imageUrl ? "Image linked" : "Image needed") + '</div>' +
          '<div class="weo-preview-media-url">' + esc(previewText(state.imageUrl, "Add an image URL to fill this side of the page.", 54)) + '</div>' +
        '</div>' +
        '<div class="weo-preview-copy">' +
          '<div class="weo-preview-kicker">Event overview</div>' +
          '<div class="weo-preview-heading">' + esc(previewText(schedule.title, "Day of event", 38)) + '</div>' +
          '<div class="weo-preview-blurb">' + esc(previewText(schedule.intro, "The schedule intro appears here beside the image.", 120)) + '</div>' +
          '<div class="weo-preview-list">' + previewRowsHtml(schedule, 4, "Add time rows to populate the visible schedule.") + '</div>' +
        '</div>' +
      '</div>';
  }

  function columnsPreviewHtml(state) {
    var schedules = state.schedules && state.schedules.length ? state.schedules.slice(0, CFG.maxSchedules) : [];
    var columns = [];

    while (schedules.length < CFG.maxSchedules) {
      schedules.push(blankSchedule(""));
    }

    for (var i = 0; i < CFG.maxSchedules; i++) {
      columns.push(previewColumnHtml(schedules[i], i));
    }

    return '' +
      '<div class="weo-preview-page is-columns">' +
        '<div class="weo-preview-opening">' + esc(previewText(state.openingText, "Opening text appears above the schedule columns.", 160)) + '</div>' +
        '<div class="weo-preview-columns">' + columns.join("") + '</div>' +
      '</div>';
  }

  function previewColumnHtml(schedule, index) {
    schedule = normaliseSchedule(schedule || blankSchedule(""));
    var hasContent = !!($.trim(schedule.title) || $.trim(schedule.intro) || getRowsToSave(schedule).length);

    return '' +
      '<div class="weo-preview-column' + (hasContent ? '' : ' is-empty') + '">' +
        '<div class="weo-preview-column-label">Column ' + (index + 1) + '</div>' +
        '<div class="weo-preview-column-title">' + esc(previewText(schedule.title, index === 0 ? "Day of event" : "Add heading", 26)) + '</div>' +
        '<div class="weo-preview-column-intro">' + esc(previewText(schedule.intro, hasContent ? "Optional intro text for this column." : "This column stays empty until you add content.", 84)) + '</div>' +
        '<div class="weo-preview-column-list">' + previewRowsHtml(schedule, 3, "Empty column") + '</div>' +
      '</div>';
  }

  function previewRowsHtml(schedule, limit, emptyText) {
    var liveRows = getRowsToSave(schedule);
    var rows = liveRows.slice(0, limit || 3);
    var html = [];

    if (!rows.length) {
      return '<div class="weo-preview-empty">' + esc(emptyText || "Add time rows") + '</div>';
    }

    for (var i = 0; i < rows.length; i++) {
      html.push(
        '<div class="weo-preview-time">' +
          '<strong>' + esc(previewText(rows[i].time, "Time", 14)) + '</strong>' +
          '<span>' + esc(previewText(rows[i].text, "Description", 46)) + '</span>' +
        '</div>'
      );
    }

    if (liveRows.length > rows.length) {
      html.push('<div class="weo-preview-more">+' + esc(String(liveRows.length - rows.length)) + ' more</div>');
    }

    return html.join("");
  }

  function previewText(value, fallback, maxLen) {
    var text = $.trim(String(value || ""));
    if (!text) return fallback || "";
    return truncateText(text, maxLen || 120);
  }

  function truncateText(value, maxLen) {
    var text = String(value || "");
    if (!maxLen || text.length <= maxLen) return text;
    return $.trim(text.slice(0, Math.max(0, maxLen - 1))) + "…";
  }

  function runEditorAction($btn) {
    var action = String($btn.attr("data-weo-action") || "");
    var scheduleIndex = toInt($btn.attr("data-schedule-index"), -1);
    var rowIndex = toInt($btn.attr("data-row-index"), -1);
    var state = readFormState(editor.current);
    var layout = normaliseLayout(state.layout);

    if (action === "add-schedule") {
      if (state.schedules.length >= CFG.maxSchedules) {
        setStatus("You can add up to three schedules.", "warning");
        return;
      }
      state.schedules.push(blankSchedule(""));
    }

    if (action === "remove-schedule" && scheduleIndex > 0) {
      if (layout === LAYOUT_COLUMNS) {
        while (state.schedules.length <= scheduleIndex) {
          state.schedules.push(blankSchedule(""));
        }
        state.schedules[scheduleIndex] = blankSchedule("");
      } else if (scheduleIndex < state.schedules.length) {
        state.schedules.splice(scheduleIndex, 1);
        if (!state.schedules.length) state.schedules.push(blankSchedule("Day of event"));
      }
    }

    if (action === "add-row" && scheduleIndex >= 0 && state.schedules[scheduleIndex]) {
      var rows = state.schedules[scheduleIndex].rows || [];
      if (rows.length >= CFG.maxRows) {
        setStatus("Each schedule can have up to " + CFG.maxRows + " times.", "warning");
        return;
      }
      rows.push(blankRow());
      state.schedules[scheduleIndex].rows = rows;
    }

    if (action === "remove-row" && scheduleIndex >= 0 && state.schedules[scheduleIndex]) {
      var targetRows = state.schedules[scheduleIndex].rows || [];
      if (rowIndex >= 0 && rowIndex < targetRows.length) targetRows.splice(rowIndex, 1);
      if (!targetRows.length) targetRows.push(blankRow());
      state.schedules[scheduleIndex].rows = targetRows;
    }

    editor.current = normaliseEditorState(state);
    renderEditor(editor.current);
    setStatus("", "");
  }

  function readFormState(previous) {
    var prior = normaliseEditorState(previous || editor.current || blankState());
    var state = clone(prior);
    var $body = $("#" + CFG.bodyId);

    state.layout = normaliseLayout($body.find('input[name="weo-layout"]:checked').val() || state.layout);

    if ($body.find('[data-field="imageUrl"]').length) {
      state.imageUrl = $.trim(String($body.find('[data-field="imageUrl"]').val() || ""));
    }

    if ($body.find('[data-field="openingText"]').length) {
      state.openingText = String($body.find('[data-field="openingText"]').val() || "");
    }

    var priorSchedules = indexByUid(prior.schedules);
    var nextSchedules = [];

    $body.find("[data-schedule-uid]").each(function () {
      var $card = $(this);
      var uid = String($card.attr("data-schedule-uid") || newUid("schedule"));
      var oldSchedule = priorSchedules[uid] || {};
      var oldRows = indexByUid(oldSchedule.rows || []);
      var title = cleanHeadingTitle($card.find('[data-field="scheduleTitle"]').val());
      var rows = [];

      $card.find("[data-row-uid]").each(function () {
        var $row = $(this);
        var rowUid = String($row.attr("data-row-uid") || newUid("row"));
        var oldRow = oldRows[rowUid] || {};
        var time = $.trim(String($row.find('[data-field="rowTime"]').val() || ""));
        var text = $.trim(String($row.find('[data-field="rowText"]').val() || ""));

        rows.push(normaliseRow({
          uid: rowUid,
          id: String($row.attr("data-row-id") || oldRow.id || ""),
          time: time,
          text: text,
          title: composeRowTitle(time, text),
          note: oldRow.note || getSnapshotField(oldRow.nodeData, "ADDITIONAL") || "",
          memo: oldRow.memo || getSnapshotField(oldRow.nodeData, "TECHNICAL") || "",
          nodeData: oldRow.nodeData || null
        }));
      });

      if (!rows.length) rows.push(blankRow());

      nextSchedules.push(normaliseSchedule({
        uid: uid,
        id: String($card.attr("data-schedule-id") || oldSchedule.id || ""),
        title: title,
        intro: String($card.find('[data-field="scheduleIntro"]').val() || ""),
        baseMemo: oldSchedule.baseMemo || "",
        meta: oldSchedule.meta || null,
        nodeData: oldSchedule.nodeData || null,
        rows: rows
      }));
    });

    if (nextSchedules.length) state.schedules = nextSchedules.slice(0, CFG.maxSchedules);
    if (!state.schedules.length) state.schedules = [blankSchedule("Day of event")];

    return normaliseEditorState(state);
  }

  function hasUnsavedEditorChanges() {
    if (!editor.original) return false;
    if (!$("#" + CFG.overlayId).is(":visible")) return false;
    if (!hasEditableEditorForm()) return false;

    var currentState = readFormState(editor.current || editor.original || blankState());
    return buildEditorStateSignature(currentState) !== buildEditorStateSignature(editor.original || blankState());
  }

  function hasEditableEditorForm() {
    var $body = $("#" + CFG.bodyId);
    return !!$body.find('[data-field="imageUrl"], [data-field="openingText"], [data-schedule-uid]').length;
  }

  function buildEditorStateSignature(state) {
    state = normaliseEditorState(state || blankState());
    var schedules = getComparableSchedules(state);
    var signature = {
      layout: normaliseLayout(state.layout),
      imageUrl: $.trim(String(state.imageUrl || "")),
      openingText: $.trim(String(state.openingText || "")),
      schedules: []
    };

    for (var i = 0; i < schedules.length; i++) {
      var schedule = normaliseSchedule(schedules[i]);
      var rows = getRowsToSave(schedule).map(function (row) {
        row = normaliseRow(row);
        return {
          time: $.trim(String(row.time || "")),
          text: $.trim(String(row.text || ""))
        };
      });

      signature.schedules.push({
        id: String(schedule.id || ""),
        title: $.trim(String(schedule.title || "")),
        intro: $.trim(String(schedule.intro || "")),
        rows: rows
      });
    }

    return JSON.stringify(signature);
  }

  function getComparableSchedules(state) {
    var schedules = Array.isArray(state && state.schedules) ? state.schedules.slice(0, CFG.maxSchedules).map(normaliseSchedule) : [];

    while (schedules.length > 1 && !isMeaningfulScheduleState(schedules[schedules.length - 1])) {
      schedules.pop();
    }

    return schedules;
  }

  function isMeaningfulScheduleState(schedule) {
    schedule = normaliseSchedule(schedule);
    return !!(
      schedule.id ||
      $.trim(String(schedule.title || "")) ||
      $.trim(String(schedule.intro || "")) ||
      getRowsToSave(schedule).length
    );
  }

  function validateState(state) {
    state = normaliseEditorState(state);
    var active = getActiveSchedules(state);

    if (state.layout === LAYOUT_IMAGE && !$.trim(state.imageUrl)) {
      return "Add an image link for this layout.";
    }

    if (!active.length) return "Add at least one schedule.";

    if (state.layout === LAYOUT_IMAGE && active.length > 1) {
      return "This layout uses one schedule. Remove the extra schedule or choose “Up to three schedules”.";
    }

    if (active.length > CFG.maxSchedules) return "Use no more than three schedules.";

    for (var i = 0; i < active.length; i++) {
      var schedule = active[i];
      var title = $.trim(schedule.title || "");
      var rows = getRowsToSave(schedule);

      if (!title) return "Each schedule needs a title.";
      if (!rows.length) return "“" + title + "” needs at least one time.";
      if (rows.length > CFG.maxRows) return "Keep each schedule to " + CFG.maxRows + " times or fewer.";

      for (var r = 0; r < rows.length; r++) {
        if (!$.trim(rows[r].time) || !$.trim(rows[r].text)) {
          return "Each schedule row needs both a time and a description.";
        }
      }
    }

    return "";
  }

  async function saveEditor() {
    if (editor.saving) return;

    var state = readFormState(editor.current);
    var error = validateState(state);
    if (error) {
      setStatus(error, "error");
      return;
    }

    var jobId = getCurrentJobId();
    if (!jobId) {
      setStatus("Could not detect the current job ID.", "error");
      return;
    }

    var tree = getTree();
    var match = chooseEventOverviewSection(tree);
    if (!tree || match.error) {
      setStatus("Could not find “" + CFG.requiredRawSectionName + "” before saving.", "error");
      return;
    }

    editor.saving = true;
    setBusy(true);
    setStatus("Saving changes...", "info");

    try {
      var savedState = await applyEventOverviewState(jobId, tree, match.node, state);
      editor.original = clone(savedState);
      editor.current = clone(savedState);
      renderEditor(editor.current);
      setStatus("Saved.", "success");
      refreshSupplyingList();
      setTimeout(refreshSupplyingList, 900);
    } catch (err) {
      warn("Event Overview save failed", err);
      setStatus(getErrorMessage(err, "Could not save changes."), "error");
    } finally {
      editor.saving = false;
      setBusy(false);
    }
  }

  async function applyEventOverviewState(jobId, tree, rootNode, nextState) {
    var saved = normaliseEditorState(clone(nextState));
    var original = normaliseEditorState(editor.original || blankState());
    var schedulesToSave = getSchedulesToSave(saved);
    var originalById = indexById(original.schedules);
    var nextIds = [];

    for (var i = 0; i < schedulesToSave.length; i++) {
      var schedule = schedulesToSave[i];
      var originalSchedule = schedule.id ? originalById[schedule.id] : null;

      if (!schedule.id) {
        setStatus("Creating “" + schedule.title + "”...", "info");
        var created = await saveHeadingItemDirect({
          jobId: jobId,
          id: "",
          parentId: getNodeDataId(rootNode),
          renderType: "dept",
          title: schedule.title,
          desc: schedule.intro,
          memo: schedule.baseMemo || "",
          flag: getSnapshotFlag(schedule.nodeData),
          customFields: getSnapshotCustomFields(schedule.nodeData)
        });
        schedule.id = String(created.id || "");
        schedule.nodeData = extendSnapshot(schedule.nodeData, { ID: schedule.id });
      }

      setStatus("Saving “" + schedule.title + "” times...", "info");
      schedule.rows = await saveScheduleRows(jobId, schedule, originalSchedule);

      var itemIds = schedule.rows.map(function (row) { return row.id; }).filter(Boolean);
      schedule.meta = buildScheduleMeta(saved, schedule, i, itemIds, originalSchedule && originalSchedule.meta && originalSchedule.meta.updatedAt);
      var memo = composeStoredPageMetaText(schedule.baseMemo || "", schedule.meta);

      if (scheduleNeedsSave(schedule, originalSchedule, memo)) {
        schedule.meta.updatedAt = formatLocalDateTime(new Date());
        memo = composeStoredPageMetaText(schedule.baseMemo || "", schedule.meta);
        setStatus("Saving “" + schedule.title + "”...", "info");
        var updated = await saveHeadingItemDirect({
          jobId: jobId,
          id: schedule.id,
          parentId: getNodeDataId(rootNode),
          renderType: "dept",
          title: schedule.title,
          desc: schedule.intro,
          memo: memo,
          flag: getSnapshotFlag(schedule.nodeData),
          customFields: getSnapshotCustomFields(schedule.nodeData)
        });
        schedule.id = String(updated.id || schedule.id || "");
      }

      nextIds.push(schedule.id);
    }

    await deleteRemovedSchedules(jobId, original, nextIds);

    saved.schedules = mergeSavedSchedules(saved.schedules, schedulesToSave);
    saved.rootMeta = buildRootMeta(saved, nextIds, original.rootMeta && original.rootMeta.updatedAt);
    var rootMemo = composeStoredPageMetaText(saved.rootBaseMemo || "", saved.rootMeta);

    if (rootNeedsSave(saved, original, rootMemo)) {
      saved.rootMeta.updatedAt = formatLocalDateTime(new Date());
      rootMemo = composeStoredPageMetaText(saved.rootBaseMemo || "", saved.rootMeta);
      setStatus("Saving page settings...", "info");
      await saveHeadingItemDirect({
        jobId: jobId,
        id: getNodeDataId(rootNode),
        parentId: getParentHeadingDataId(tree, rootNode),
        rawName: getNodeRawTitle(rootNode),
        renderType: "section",
        title: CFG.sectionName,
        desc: saved.openingText || "",
        memo: rootMemo,
        flag: getNodeFlag(rootNode),
        customFields: getNodeCustomFields(rootNode)
      });
    }

    return normaliseEditorState(saved);
  }

  async function saveScheduleRows(jobId, schedule, originalSchedule) {
    var rowsToSave = getRowsToSave(schedule);
    var originalRows = indexById(originalSchedule ? originalSchedule.rows : []);
    var keepIds = [];
    var savedRows = [];

    for (var i = 0; i < rowsToSave.length; i++) {
      var row = rowsToSave[i];
      var originalRow = row.id ? originalRows[row.id] : null;

      if (!row.id || rowNeedsSave(row, originalRow)) {
        var result = await saveCustomItemDirect({
          jobId: jobId,
          parentId: schedule.id,
          row: row,
          sourceData: row.nodeData || {}
        });
        row.id = String(result.id || row.id || "");
        row.nodeData = extendSnapshot(row.nodeData, {
          ID: row.id,
          title: composeRowTitle(row.time, row.text),
          ADDITIONAL: row.note || "",
          TECHNICAL: row.memo || ""
        });
      }

      keepIds.push(row.id);
      savedRows.push(row);
    }

    var deleteIds = [];
    if (originalSchedule && originalSchedule.rows) {
      for (var d = 0; d < originalSchedule.rows.length; d++) {
        var oldId = originalSchedule.rows[d] && originalSchedule.rows[d].id;
        if (oldId && keepIds.indexOf(oldId) === -1) deleteIds.push(oldId);
      }
    }

    if (deleteIds.length) {
      setStatus("Removing deleted times...", "info");
      await deleteItemsDirect(deleteIds, jobId, 3);
    }

    return savedRows.length ? savedRows : [blankRow()];
  }

  async function deleteRemovedSchedules(jobId, original, nextIds) {
    var idsToKeep = nextIds || [];
    var schedules = original.schedules || [];

    for (var i = 0; i < schedules.length; i++) {
      var schedule = schedules[i];
      if (!schedule || !schedule.id || idsToKeep.indexOf(schedule.id) !== -1) continue;

      var rowIds = getRowsToSave(schedule).map(function (row) { return row.id; }).filter(Boolean);
      if (rowIds.length) {
        setStatus("Removing deleted schedule times...", "info");
        await deleteItemsDirect(rowIds, jobId, 3);
      }

      setStatus("Removing deleted schedule...", "info");
      await deleteItemsDirect([schedule.id], jobId, 0);
    }
  }

  function mergeSavedSchedules(allSchedules, savedSchedules) {
    var savedByUid = indexByUid(savedSchedules);
    var merged = [];

    for (var i = 0; i < allSchedules.length; i++) {
      var schedule = allSchedules[i];
      if (savedByUid[schedule.uid]) merged.push(savedByUid[schedule.uid]);
      else if (isScheduleActive(schedule)) merged.push(schedule);
      else merged.push(schedule);
    }

    return merged.slice(0, CFG.maxSchedules);
  }

  function rowNeedsSave(row, originalRow) {
    if (!originalRow) return true;
    return composeRowTitle(row.time, row.text) !== composeRowTitle(originalRow.time, originalRow.text) ||
      String(row.note || "") !== String(originalRow.note || "") ||
      String(row.memo || "") !== String(originalRow.memo || "");
  }

  function scheduleNeedsSave(schedule, originalSchedule, memo) {
    if (!originalSchedule) return true;
    return String(schedule.title || "") !== String(originalSchedule.title || "") ||
      String(schedule.intro || "") !== String(originalSchedule.intro || "") ||
      String(memo || "") !== composeStoredPageMetaText(originalSchedule.baseMemo || "", originalSchedule.meta || null);
  }

  function rootNeedsSave(saved, original, rootMemo) {
    return String(saved.openingText || "") !== String(original.openingText || "") ||
      String(rootMemo || "") !== composeStoredPageMetaText(original.rootBaseMemo || "", original.rootMeta || null);
  }

  function buildRootMeta(state, scheduleIds, previousUpdatedAt) {
    return {
      editor: "eventOverview",
      profileKey: CFG.profileKey,
      templateKey: CFG.rootTemplateKey,
      version: 2,
      layout: state.layout,
      variant: layoutToVariant(state.layout),
      imageUrl: state.layout === LAYOUT_IMAGE ? $.trim(state.imageUrl || "") : "",
      scheduleHeadingIds: normaliseIdList(scheduleIds),
      updatedAt: previousUpdatedAt || formatLocalDateTime(new Date())
    };
  }

  function buildScheduleMeta(state, schedule, index, itemIds, previousUpdatedAt) {
    return {
      editor: "eventOverview",
      profileKey: CFG.profileKey,
      templateKey: CFG.deptTemplateKey,
      parentTemplateKey: CFG.rootTemplateKey,
      slotKey: SLOT_KEYS[index] || SLOT_KEYS[0],
      columnIndex: index,
      version: 2,
      layout: state.layout,
      variant: layoutToVariant(state.layout),
      imageUrl: state.layout === LAYOUT_IMAGE && index === 0 ? $.trim(state.imageUrl || "") : "",
      blurbSource: state.layout === LAYOUT_COLUMNS ? "section_description" : "dept_description",
      scheduleFormat: "time_text_custom_items",
      maxScheduleRows: CFG.maxRows,
      headingId: String(schedule.id || ""),
      itemIds: normaliseIdList(itemIds),
      updatedAt: previousUpdatedAt || formatLocalDateTime(new Date())
    };
  }

  function readEventOverviewState(tree, rootNode) {
    var rootMetaInfo = extractStoredPageMeta(getNodeTechnical(rootNode));
    var rootMeta = normaliseMeta(rootMetaInfo.meta) || {};
    var childHeadings = getDirectChildHeadingNodes(tree, rootNode);
    var schedules = [];

    for (var i = 0; i < childHeadings.length && schedules.length < CFG.maxSchedules; i++) {
      schedules.push(readScheduleState(tree, childHeadings[i]));
    }

    if (!schedules.length) schedules.push(blankSchedule("Day of event"));

    var firstScheduleMeta = normaliseMeta(schedules[0] && schedules[0].meta) || {};
    var layout = normaliseLayout(rootMeta.layout || rootMeta.variant || firstScheduleMeta.layout || firstScheduleMeta.variant || (childHeadings.length > 1 ? LAYOUT_COLUMNS : LAYOUT_IMAGE));
    var imageUrl = $.trim(String(rootMeta.imageUrl || firstScheduleMeta.imageUrl || ""));

    return normaliseEditorState({
      rootId: getNodeDataId(rootNode),
      rootBaseMemo: rootMetaInfo.baseText || "",
      rootMeta: rootMeta,
      layout: layout,
      imageUrl: layout === LAYOUT_IMAGE ? imageUrl : "",
      openingText: getNodeDescription(rootNode),
      schedules: schedules,
      extraHeadingCount: Math.max(0, childHeadings.length - CFG.maxSchedules)
    });
  }

  function readScheduleState(tree, headingNode) {
    var metaInfo = extractStoredPageMeta(getNodeTechnical(headingNode));
    var rows = getDirectChildCustomNodes(tree, headingNode).slice(0, CFG.maxRows).map(readRowState);

    return normaliseSchedule({
      uid: newUid("schedule"),
      id: getNodeDataId(headingNode),
      title: getNodeTitle(headingNode),
      intro: getNodeDescription(headingNode),
      baseMemo: metaInfo.baseText || "",
      meta: normaliseMeta(metaInfo.meta),
      nodeData: cloneItemSnapshot(headingNode.data),
      rows: rows.length ? rows : [blankRow()]
    });
  }

  function readRowState(node) {
    var title = node && node.data ? String(node.data.title || node.data.TITLE || node.text || "") : "";
    var parsed = parseRowTitle(title);

    return normaliseRow({
      uid: newUid("row"),
      id: node && node.data ? String(node.data.ID || "") : "",
      time: parsed.time,
      text: parsed.text,
      title: composeRowTitle(parsed.time, parsed.text),
      note: node && node.data ? String(node.data.ADDITIONAL || "") : "",
      memo: node && node.data ? String(node.data.TECHNICAL || "") : "",
      nodeData: node && node.data ? cloneItemSnapshot(node.data) : null
    });
  }

  function chooseEventOverviewSection(tree) {
    var matches = getAllHeadingNodes(tree).filter(isEventOverviewSection);
    var selectedRoot = getSelectedEventOverviewRoot(tree);

    if (selectedRoot) return { node: selectedRoot };

    if (!matches.length) {
      return { title: "Event Overview not found", error: "Select the Event Overview section (or its Proposed Timings child), or add a hidden section called “" + CFG.requiredRawSectionName + "” to the supplying list." };
    }

    if (matches.length === 1) return { node: matches[0] };

    return {
      title: "More than one Event Overview found",
      error: "There should only be one “" + CFG.requiredRawSectionName + "” section. Select the one you want to edit, then open this editor again."
    };
  }

  function isEventOverviewSection(node) {
    if (!node || !node.data || Number(node.data.kind) !== 0) return false;
    var heading = parseHeadingBaseMeta(getNodeRawTitle(node));
    return heading.hidden === true && heading.renderType === "section" && normaliseText(heading.name) === normaliseText(CFG.sectionName);
  }

  function isNamedEventOverviewSection(node) {
    if (!node || !node.data || Number(node.data.kind) !== 0) return false;
    return normaliseText(getNodeTitle(node)) === normaliseText(CFG.sectionName);
  }

  function isEventOverviewRootMetaNode(node) {
    if (!node || !node.data || Number(node.data.kind) !== 0) return false;
    var metaInfo = extractStoredPageMeta(getNodeTechnical(node));
    var meta = normaliseMeta(metaInfo.meta);
    return !!(meta && String(meta.templateKey || "") === CFG.rootTemplateKey);
  }

  function isEventOverviewDeptNode(node) {
    if (!node || !node.data || Number(node.data.kind) !== 0) return false;

    var metaInfo = extractStoredPageMeta(getNodeTechnical(node));
    var meta = normaliseMeta(metaInfo.meta);
    if (meta && String(meta.templateKey || "") === CFG.deptTemplateKey) return true;

    return normaliseText(getNodeTitle(node)) === normaliseText("Proposed Timings");
  }

  function isSelectableEventOverviewRoot(node) {
    return isEventOverviewSection(node) || isNamedEventOverviewSection(node) || isEventOverviewRootMetaNode(node);
  }

  function findEventOverviewAncestor(tree, node) {
    var current = node;
    while (current && current.id && current.id !== "#") {
      if (isEventOverviewSection(current)) return current;
      var parentId = tree.get_parent(current);
      if (!parentId || parentId === "#") break;
      current = tree.get_node(parentId);
    }
    return null;
  }

  function getSelectedEventOverviewRoot(tree) {
    var selected = getSelectedTreeNode(tree);
    if (!selected) return null;

    var headingNode = selected;
    if (!headingNode.data || Number(headingNode.data.kind) !== 0) {
      headingNode = getParentHeadingNode(tree, headingNode);
    }
    if (!headingNode) return null;

    if (isSelectableEventOverviewRoot(headingNode)) return headingNode;

    var parentHeading = getParentHeadingNode(tree, headingNode);
    if (isEventOverviewDeptNode(headingNode) && parentHeading) return parentHeading;
    if (parentHeading && isSelectableEventOverviewRoot(parentHeading)) return parentHeading;

    return findEventOverviewAncestor(tree, headingNode);
  }

  function getTree() {
    var $trees = $("#items_tab").find(".jstree");
    for (var i = 0; i < $trees.length; i++) {
      try {
        var tree = $($trees[i]).jstree(true);
        if (tree) return tree;
      } catch (e) {}
    }
    return null;
  }

  function getAllTreeNodes(tree) {
    var out = [];
    var seen = {};

    function add(node) {
      if (!node || !node.id || node.id === "#" || seen[node.id]) return;
      seen[node.id] = true;
      out.push(node);
    }

    try {
      if (tree && typeof tree.get_json === "function") {
        var flat = tree.get_json("#", { flat: true }) || [];
        for (var i = 0; i < flat.length; i++) add(tree.get_node(flat[i].id));
      }
    } catch (e) {}

    try {
      if (tree && tree._model && tree._model.data) {
        $.each(tree._model.data, function (id, node) { add(node); });
      }
    } catch (e2) {}

    return out;
  }

  function getAllHeadingNodes(tree) {
    return getAllTreeNodes(tree).filter(function (node) {
      return !!(node && node.data && Number(node.data.kind) === 0);
    });
  }

  function getSelectedTreeNodes(tree) {
    var nodes = [];
    var seen = {};

    if (tree && typeof tree.get_selected === "function") {
      var selected = tree.get_selected(true) || [];
      for (var i = 0; i < selected.length; i++) {
        addTreeNode(selected[i], nodes, seen);
      }
    }

    collectTreeNodesFromDom(tree, $("#items_tab .jstree-clicked"), nodes, seen);

    if (!nodes.length) {
      collectTreeNodesFromDom(
        tree,
        $("#items_tab li.jstree-node.jstree-clicked, #items_tab li.jstree-selected, #items_tab li[aria-selected='true'], #items_tab a.jstree-anchor[aria-selected='true']"),
        nodes,
        seen
      );
    }

    if (!nodes.length && editor.lastClickedNodeId) {
      addTreeNode(tree.get_node(editor.lastClickedNodeId), nodes, seen);
    }

    if (!nodes.length && document.activeElement) {
      collectTreeNodesFromDom(tree, $(document.activeElement), nodes, seen);
    }

    if (nodes.length > 1 && editor.lastClickedNodeId) {
      var lastClickedNode = tree.get_node(editor.lastClickedNodeId);
      if (lastClickedNode && lastClickedNode.id) {
        return [lastClickedNode];
      }
    }

    return nodes;
  }

  function collectTreeNodesFromDom(tree, $elements, out, seen) {
    if (!tree || !$elements || !$elements.length) return;

    $elements.each(function () {
      var $li = $(this).is("li.jstree-node")
        ? $(this)
        : $(this).closest("li.jstree-node");

      if (!$li.length) return;
      addTreeNode(tree.get_node($.trim(String($li.attr("id") || ""))), out, seen);
    });
  }

  function addTreeNode(node, out, seen) {
    if (!node || !node.id || seen[node.id]) return;
    seen[node.id] = true;
    out.push(node);
  }

  function getSelectedTreeNode(tree) {
    var nodes = getSelectedTreeNodes(tree);
    return nodes.length ? nodes[0] : null;
  }

  function getDirectChildNodes(tree, node) {
    var children = [];
    if (!tree || !node || !node.children) return children;

    for (var i = 0; i < node.children.length; i++) {
      var child = tree.get_node(node.children[i]);
      if (child && child.id) children.push(child);
    }

    return children;
  }

  function getDirectChildHeadingNodes(tree, node) {
    return getDirectChildNodes(tree, node).filter(function (child) {
      return !!(child && child.data && Number(child.data.kind) === 0);
    });
  }

  function getDirectChildCustomNodes(tree, node) {
    return getDirectChildNodes(tree, node).filter(function (child) {
      return !!(child && child.data && Number(child.data.kind) === 3);
    });
  }

  function getParentHeadingNode(tree, node) {
    if (!tree || !node) return null;
    var parentId = tree.get_parent(node);
    while (parentId && parentId !== "#") {
      var parent = tree.get_node(parentId);
      if (parent && parent.data && Number(parent.data.kind) === 0) return parent;
      parentId = parent ? tree.get_parent(parent) : "#";
    }
    return null;
  }

  function getParentHeadingDataId(tree, node) {
    var parent = getParentHeadingNode(tree, node);
    return parent && parent.data ? String(parent.data.ID || "0") : "0";
  }

  function normaliseEditorState(state) {
    state = state || {};
    var schedules = Array.isArray(state.schedules) ? state.schedules.slice(0, CFG.maxSchedules).map(normaliseSchedule) : [];
    if (!schedules.length) schedules.push(blankSchedule("Day of event"));

    return {
      rootId: String(state.rootId || ""),
      rootBaseMemo: String(state.rootBaseMemo || ""),
      rootMeta: normaliseMeta(state.rootMeta),
      layout: normaliseLayout(state.layout),
      imageUrl: $.trim(String(state.imageUrl || "")),
      openingText: String(state.openingText || ""),
      schedules: schedules,
      extraHeadingCount: Math.max(0, Number(state.extraHeadingCount || 0))
    };
  }

  function normaliseSchedule(schedule) {
    schedule = schedule || {};
    var rows = Array.isArray(schedule.rows) ? schedule.rows.slice(0, CFG.maxRows).map(normaliseRow) : [];
    if (!rows.length) rows.push(blankRow());

    return {
      uid: String(schedule.uid || newUid("schedule")),
      id: String(schedule.id || ""),
      title: cleanHeadingTitle(schedule.title || ""),
      intro: String(schedule.intro || ""),
      baseMemo: String(schedule.baseMemo || ""),
      meta: schedule.meta || null,
      nodeData: schedule.nodeData || null,
      rows: rows
    };
  }

  function normaliseRow(row) {
    row = row || {};
    var parsed = parseRowTitle(row.title || "");
    var time = $.trim(String(row.time || parsed.time || ""));
    var text = $.trim(String(row.text || parsed.text || ""));

    return {
      uid: String(row.uid || newUid("row")),
      id: String(row.id || row.rowId || ""),
      time: time,
      text: text,
      title: composeRowTitle(time, text),
      note: String(row.note || ""),
      memo: String(row.memo || ""),
      nodeData: row.nodeData || null
    };
  }

  function blankState() {
    return {
      rootId: "",
      rootBaseMemo: "",
      rootMeta: null,
      layout: LAYOUT_IMAGE,
      imageUrl: "",
      openingText: "",
      schedules: [blankSchedule("Day of event")],
      extraHeadingCount: 0
    };
  }

  function blankSchedule(defaultTitle) {
    return {
      uid: newUid("schedule"),
      id: "",
      title: defaultTitle == null ? "" : String(defaultTitle),
      intro: "",
      baseMemo: "",
      meta: null,
      nodeData: null,
      rows: [blankRow()]
    };
  }

  function blankRow() {
    return {
      uid: newUid("row"),
      id: "",
      time: "",
      text: "",
      title: "",
      note: "",
      memo: "",
      nodeData: null
    };
  }

  function getActiveSchedules(state) {
    var out = [];
    var schedules = state && state.schedules ? state.schedules : [];
    for (var i = 0; i < schedules.length; i++) {
      if (isScheduleActive(schedules[i])) out.push(normaliseSchedule(schedules[i]));
    }
    return out;
  }

  function getSchedulesToSave(state) {
    var active = getActiveSchedules(state);
    return state.layout === LAYOUT_IMAGE ? active.slice(0, 1) : active.slice(0, CFG.maxSchedules);
  }

  function isScheduleActive(schedule) {
    schedule = normaliseSchedule(schedule);
    return !!(schedule.id || $.trim(schedule.title) || $.trim(schedule.intro) || getRowsToSave(schedule).length);
  }

  function getRowsToSave(schedule) {
    var rows = [];
    var source = schedule && schedule.rows ? schedule.rows : [];

    for (var i = 0; i < source.length; i++) {
      var row = normaliseRow(source[i]);
      if ($.trim(row.time) || $.trim(row.text) || row.id) {
        if ($.trim(row.time) || $.trim(row.text)) rows.push(row);
      }
    }

    return rows.slice(0, CFG.maxRows);
  }

  function getImageLayoutExtraScheduleWarning(state) {
    if (state.layout !== LAYOUT_IMAGE) return "";
    var active = getActiveSchedules(state);
    if (active.length <= 1) return "";
    return "This layout only uses the first schedule. Remove the extra schedule or choose “Up to three schedules” before saving.";
  }

  function cleanHeadingTitle(value) {
    var parsed = parseHeadingBaseMeta(String(value || ""));
    return normaliseWhitespace(parsed.name || value || "");
  }

  function parseRowTitle(value) {
    var title = $.trim(String(value || ""));
    var match = title.match(/^(.{1,32}?)\s*(?:-|\u2013|\u2014)\s*(.+)$/);
    if (!match) return { time: "", text: title };
    return { time: $.trim(match[1] || ""), text: $.trim(match[2] || "") };
  }

  function composeRowTitle(time, text) {
    var t = $.trim(String(time || ""));
    var v = $.trim(String(text || ""));
    if (t && v) return t + " - " + v;
    return t || v;
  }

  function normaliseLayout(value) {
    var text = String(value || "").toLowerCase();
    if (text === LAYOUT_COLUMNS || text === VARIANT_THREE_COLUMNS || text === LEGACY_VARIANT_COLUMNS) return LAYOUT_COLUMNS;
    return LAYOUT_IMAGE;
  }

  function layoutToVariant(layout) {
    return normaliseLayout(layout) === LAYOUT_COLUMNS ? VARIANT_THREE_COLUMNS : VARIANT_HALF_IMAGE;
  }

  async function saveHeadingItemDirect(options) {
    if (!options || !options.jobId) throw new Error("Missing heading save details.");

    var name = options.rawName && shouldUseRawHeadingName(options.rawName)
      ? String(options.rawName)
      : composeStoredHeading(options.renderType || "section", options.title || "");

    return postItemsSave({
      parent: String(options.parentId || "0"),
      flag: String(options.flag == null ? 0 : options.flag),
      priority_confirm: "0",
      custom_fields: normaliseCustomFields(options.customFields),
      kind: "0",
      local: formatLocalDateTime(new Date()),
      id: String(options.id || "0"),
      name: name,
      desc: String(options.desc || ""),
      memo: String(options.memo || ""),
      set_child_dates: "0",
      job: String(options.jobId || ""),
      no_availability: "0",
      ignore: "0"
    }, options.id);
  }

  async function saveCustomItemDirect(options) {
    if (!options || !options.jobId || !options.parentId) throw new Error("Missing schedule row save details.");

    var row = normaliseRow(options.row);
    var source = options.sourceData || {};
    var rowTitle = composeRowTitle(row.time, row.text);

    return postItemsSave({
      parent: String(options.parentId || "0"),
      flag: String(source.FLAG == null ? 0 : source.FLAG),
      priority_confirm: "0",
      custom_fields: normaliseCustomFields(source.CUSTOM_FIELDS),
      kind: "3",
      local: formatLocalDateTime(new Date()),
      id: String(row.id || source.ID || "0"),
      qty: "1",
      name: rowTitle,
      list_id: String(source.LIST_ID || "0"),
      cust_add: String(row.note || source.ADDITIONAL || ""),
      memo: String(row.memo || source.TECHNICAL || ""),
      price_type: String(source.PRICE_TYPE == null ? 0 : source.PRICE_TYPE),
      weight: String(source.weight == null ? (source.WEIGHT == null ? 0 : source.WEIGHT) : source.weight),
      vat_rate: String(source.VAT_RATE == null ? getDefaultVatRate() : source.VAT_RATE),
      value: String(source.value == null ? (source.VALUE == null ? 0 : source.VALUE) : source.value),
      acc_nominal: String(source.ACC_NOMINAL == null ? getDefaultNominalId(1) : source.ACC_NOMINAL),
      acc_nominal_po: String(source.ACC_NOMINAL_PO == null ? getDefaultNominalId(2) : source.ACC_NOMINAL_PO),
      cost_price: String(source.COST_PRICE == null ? 0 : source.COST_PRICE),
      no_scan: String(source.NO_SCAN == 1 ? 1 : 0),
      country_origin: String(source.COUNTRY_ORIGIN || ""),
      hs_code: String(source.HS_CODE || ""),
      category_id: String(source.CATEGORY_ID == null ? 0 : source.CATEGORY_ID),
      no_shortfall: String(source.NO_SHORTFALL == 1 ? 1 : 0),
      unit_price: "0",
      price: "0",
      job: String(options.jobId || ""),
      no_availability: "0",
      ignore: "0"
    }, row.id || source.ID);
  }

  async function deleteItemsDirect(ids, jobId, kind) {
    var idList = normaliseIdList(ids);
    if (!idList.length) return;

    var prefix = getTreeNodePrefixForKind(kind);
    var prefixed = idList.map(function (id) { return prefix + id; });
    var payload = { ids: prefixed.join(","), job: String(jobId || ""), no_availability: "0" };
    var attempts = 0;

    while (attempts < CFG.saveMaxAttempts) {
      attempts += 1;
      await throttleWrite();

      var response = await fetch("/php_functions/items_delete.php", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: $.param(payload)
      });

      var text = await response.text();
      var json = tryParseJson(text);

      if (!response.ok) throw new Error("items_delete failed with status " + response.status);
      if (isRateLimitResponse(json) && attempts < CFG.saveMaxAttempts) {
        await waitForRateLimit();
        continue;
      }
      if (json && typeof json.error !== "undefined") throw new Error(readServerMessage(json.error, "Could not delete removed items."));
      return;
    }
  }

  async function postItemsSave(payload, fallbackId) {
    var attempts = 0;

    while (attempts < CFG.saveMaxAttempts) {
      attempts += 1;
      await throttleWrite();

      var response = await fetch("/php_functions/items_save.php", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: $.param(payload || {})
      });

      var text = await response.text();
      var json = tryParseJson(text);

      if (!response.ok) throw new Error("items_save failed with status " + response.status);
      if (isRateLimitResponse(json) && attempts < CFG.saveMaxAttempts) {
        await waitForRateLimit();
        continue;
      }
      if (json && typeof json.error !== "undefined") throw new Error(readServerMessage(json.error, "HireHop returned an error."));
      if (json && typeof json.warning !== "undefined") throw new Error(readServerMessage(json.warning, "HireHop returned a warning."));

      var id = getSavedItemId(json) || String(fallbackId || "");
      if (!id) throw new Error("HireHop did not return a saved item ID.");
      return { id: String(id), json: json };
    }

    throw new Error("HireHop rate limit hit. Wait a minute and save again.");
  }

  async function throttleWrite() {
    var now = Date.now();
    var wait = Math.max(0, CFG.writeThrottleMs - (now - editor.lastWriteAt));
    if (wait > 0) await delay(wait);
    editor.lastWriteAt = Date.now();
  }

  async function waitForRateLimit() {
    setStatus("HireHop rate limit reached. Waiting, then retrying...", "warning");
    await delay(CFG.rateLimitRetryMs);
  }

  function setBusy(isBusy) {
    $("#" + CFG.bodyId).find("input,textarea,button").prop("disabled", !!isBusy);
    $("#" + CFG.closeId + ",#" + CFG.modalId + " .weo-x").prop("disabled", !!isBusy);
    $("#" + CFG.saveId).prop("disabled", !!isBusy).text(isBusy ? "Saving..." : "Save changes");
  }

  function setSaveEnabled(enabled) {
    $("#" + CFG.saveId).prop("disabled", !enabled || editor.saving);
  }

  function setStatus(message, tone) {
    var $status = $("#" + CFG.statusId);
    $status.removeClass("is-error is-success is-warning is-info").text(message || "");
    if (tone) $status.addClass("is-" + tone);
  }

  function refreshSupplyingList() {
    var $btn = findRefreshControl();
    if ($btn.length) $btn.get(0).click();
  }

  function findRefreshControl() {
    var selector = 'button,a,[role="button"],input[type="button"],input[type="submit"]';
    var scopes = [$("#items_tab > div:first-child").get(0), $("#items_tab").get(0), document.body];

    for (var i = 0; i < scopes.length; i++) {
      if (!scopes[i]) continue;
      var $match = $(scopes[i]).find(selector).filter(":visible").filter(function () {
        if ($(this).closest("#" + CFG.overlayId).length) return false;
        var text = $.trim($(this).text() || $(this).val() || $(this).attr("title") || $(this).attr("aria-label") || "");
        return /^refresh\b/i.test(text);
      }).first();
      if ($match.length) return $match;
    }

    return $();
  }

  function getCurrentJobId() {
    var href = String(window.location.href || "");
    var match = href.match(/[?&](?:job|job_id|main_id|id)=(\d+)/i) || href.match(/\/job\/(\d+)/i) || href.match(/\/jobs\/(\d+)/i);
    if (match && match[1]) return match[1];

    var selectors = ['input[name="job"]', 'input[name="job_id"]', 'input[name="main_id"]', 'input[name="id"]', "#job_id", "#main_id"];
    for (var i = 0; i < selectors.length; i++) {
      var $el = $(selectors[i]).first();
      var value = $.trim(String($el.val() || ""));
      if (/^\d+$/.test(value)) return value;
    }

    if (window.main_id && /^\d+$/.test(String(window.main_id))) return String(window.main_id);
    if (window.job_id && /^\d+$/.test(String(window.job_id))) return String(window.job_id);
    return "";
  }

  function extractStoredPageMeta(text) {
    var raw = String(text || "");
    var start = raw.indexOf(CFG.metaStart);
    var end = start === -1 ? -1 : raw.indexOf(CFG.metaEnd, start + CFG.metaStart.length);
    if (start === -1 || end === -1) return { baseText: $.trim(raw), meta: null };

    var before = $.trim(raw.slice(0, start));
    var jsonText = raw.slice(start + CFG.metaStart.length, end);
    var after = $.trim(raw.slice(end + CFG.metaEnd.length));
    var base = [];
    var meta = null;

    if (before) base.push(before);
    if (after) base.push(after);

    try { meta = JSON.parse(jsonText); } catch (e) { meta = null; }
    return { baseText: $.trim(base.join("\n\n")), meta: meta };
  }

  function composeStoredPageMetaText(baseText, meta) {
    var parts = [];
    var base = $.trim(String(baseText || ""));
    if (base) parts.push(base);
    if (meta) parts.push(CFG.metaStart + JSON.stringify(meta) + CFG.metaEnd);
    return parts.join("\n\n");
  }

  function parseHeadingBaseMeta(value) {
    var raw = $.trim(String(value || ""));
    var meta = { additionalOptions: false, hidden: false, renderType: "normal", name: raw };
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

  function composeStoredHeading(renderType, title) {
    return (renderType === "dept" ? "Dept: " : "Section: ") + cleanHeadingTitle(title || "");
  }

  function shouldUseRawHeadingName(value) {
    var text = $.trim(String(value == null ? "" : value));
    return !!text && (/^(\/\/\s*)?(\$\s*)?(section|dept)\s*:/i.test(text) || /^\/\/\s*/.test(text) || /^\$\s*/.test(text));
  }

  function getNodeTitle(node) {
    if (!node) return "";
    var raw = "";
    if (node.data) raw = node.data.title != null ? node.data.title : (node.data.TITLE != null ? node.data.TITLE : node.data.name);
    if (!$.trim(String(raw || "")) && node.text != null) raw = node.text;
    return normaliseWhitespace(parseHeadingBaseMeta(raw).name);
  }

  function getNodeRawTitle(node) {
    if (!node) return "";
    var candidates = [];
    if (node.data) candidates.push(node.data.title, node.data.TITLE, node.data.name, node.data.NAME);
    if (node.original) candidates.push(node.original.title, node.original.text, node.original.name);
    candidates.push(node.text);

    for (var i = 0; i < candidates.length; i++) {
      var value = $.trim(String(candidates[i] == null ? "" : candidates[i]));
      if (value && shouldUseRawHeadingName(value)) return value;
    }

    for (var j = 0; j < candidates.length; j++) {
      var fallback = $.trim(String(candidates[j] == null ? "" : candidates[j]));
      if (fallback) return fallback;
    }

    return "";
  }

  function getNodeDescription(node) { return node && node.data ? String(node.data.DESCRIPTION || "") : ""; }
  function getNodeTechnical(node) { return node && node.data ? String(node.data.TECHNICAL || "") : ""; }
  function getNodeFlag(node) { return node && node.data && node.data.FLAG != null ? node.data.FLAG : 0; }
  function getNodeCustomFields(node) { return node && node.data && node.data.CUSTOM_FIELDS ? node.data.CUSTOM_FIELDS : ""; }
  function getNodeDataId(node) { return node && node.data ? String(node.data.ID || "") : ""; }
  function getSnapshotFlag(snapshot) { return snapshot && snapshot.FLAG != null ? snapshot.FLAG : 0; }
  function getSnapshotCustomFields(snapshot) { return snapshot && snapshot.CUSTOM_FIELDS ? snapshot.CUSTOM_FIELDS : ""; }
  function getSnapshotField(snapshot, field) { return snapshot && snapshot[field] != null ? String(snapshot[field]) : ""; }
  function cloneItemSnapshot(data) { return data ? $.extend(true, {}, data) : null; }
  function extendSnapshot(snapshot, updates) { return $.extend(true, {}, snapshot || {}, updates || {}); }

  function getTreeNodePrefixForKind(kind) {
    var prefixes = { 0: "a", 1: "b", 2: "c", 3: "d", 4: "e", 5: "f", 6: "g" };
    return prefixes[Number(kind)] || "";
  }

  function getSavedItemId(json) {
    if (!json || !json.items || !json.items.length) return "";
    var item = json.items[0] || {};
    return String(item.ID || item.id || "");
  }

  function tryParseJson(text) {
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  function isRateLimitResponse(json) {
    if (!json) return false;
    return isRateLimitCode(json.error) || isRateLimitCode(json.warning);
  }

  function isRateLimitCode(value) {
    return $.trim(String(value == null ? "" : value)) === "327";
  }

  function readServerMessage(value, fallback) {
    if (value == null || value === "") return fallback;
    if (isRateLimitCode(value)) return "HireHop rate limit reached. Wait a minute and save again.";
    return String(value);
  }

  function getDefaultVatRate() {
    if (window.user && window.user.DEFAULT_TAX_GROUP != null) return window.user.DEFAULT_TAX_GROUP;
    return 0;
  }

  function getDefaultNominalId(type) {
    var items = window.nominal_codes || [];
    var first = 0;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item || Number(item.TYPE) !== Number(type) || Number(item.HIDDEN) === 1) continue;
      if (!first) first = item.ID;
      if (Number(item.DEFAULT) === 1) return item.ID;
    }

    return first || 0;
  }

  function normaliseCustomFields(value) {
    if (!value) return "";
    if ($.isPlainObject(value) && $.isEmptyObject(value)) return "";
    return value;
  }

  function getActiveDepotContext() {
    var $select = findHeaderDepotSelect();
    var $selected = $select.length ? $select.find("option:selected").first() : $();
    return {
      id: normaliseDepotId($select.length ? ($select.val() || $selected.attr("value") || "") : ""),
      name: normaliseDepotText($selected.length ? ($selected.text() || "") : "", true)
    };
  }

  function isAllowedDepot(context) {
    var allowedIds = CFG.allowedDepotIds.map(normaliseDepotId).filter(Boolean);
    var allowedNames = CFG.allowedDepotNames.map(function (name) { return normaliseDepotText(name, false); }).filter(Boolean);
    var hasDetected = !!(context && (context.id || context.name));
    var allowed = false;

    if (context && context.id && allowedIds.indexOf(normaliseDepotId(context.id)) !== -1) allowed = true;
    if (context && context.name && allowedNames.indexOf(normaliseDepotText(context.name, false)) !== -1) allowed = true;

    if (!allowed) {
      logDepotDecision(hasDetected ? "blocked" : "undetected", context);
      return hasDetected ? false : !CFG.blockWhenDepotUndetected;
    }

    logDepotDecision("matched", context);
    return true;
  }

  function logDepotDecision(decision, context) {
    var signature = decision + "|" + String((context && context.id) || "") + "|" + String((context && context.name) || "");
    if (signature === editor.depotSignature) return;
    editor.depotSignature = signature;
    log("Depot " + decision, context);
  }

  function findHeaderDepotSelect() {
    var $label = $('[data-label="depotTxt"]').first();
    var $select = findSelectNear($label);
    if ($select.length) return $select;

    var $textLabel = $("b,strong,label,span,td,th").filter(function () {
      var text = $.trim(String($(this).text() || "")).replace(/\s+/g, " ");
      return /^warehouse name\s*:?\s*$/i.test(text) || /^depot\s*:?\s*$/i.test(text);
    }).first();

    return findSelectNear($textLabel);
  }

  function findSelectNear($label) {
    if (!$label || !$label.length) return $();
    var $select = $label.siblings("select").first();
    if ($select.length) return $select;
    $select = $label.nextAll("select").first();
    if ($select.length) return $select;
    $select = $label.parent().find("select").first();
    if ($select.length) return $select;
    return $label.closest("td,th,div,span").find("select").first();
  }

  function normaliseDepotId(value) {
    var text = $.trim(String(value == null ? "" : value));
    if (!text) return "";
    var match = text.match(/(\d+)/);
    return match && match[1] ? match[1] : text.toLowerCase();
  }

  function normaliseDepotText(value, preserveCase) {
    var text = $.trim(String(value == null ? "" : value)).replace(/\s+/g, " ");
    return preserveCase ? text : text.toLowerCase();
  }

  function normaliseMeta(meta) {
    return $.isPlainObject(meta) ? $.extend(true, {}, meta) : null;
  }

  function normaliseIdList(values) {
    var source = Array.isArray(values) ? values : (values ? [values] : []);
    var out = [];

    for (var i = 0; i < source.length; i++) {
      var id = $.trim(String(source[i] == null ? "" : source[i]));
      if (id && out.indexOf(id) === -1) out.push(id);
    }

    return out;
  }

  function indexById(items) {
    var out = {};
    for (var i = 0; i < (items || []).length; i++) {
      var id = items[i] && items[i].id;
      if (id && !out[id]) out[id] = items[i];
    }
    return out;
  }

  function indexByUid(items) {
    var out = {};
    for (var i = 0; i < (items || []).length; i++) {
      var uid = items[i] && items[i].uid;
      if (uid && !out[uid]) out[uid] = items[i];
    }
    return out;
  }

  function newUid(prefix) {
    editor.uid += 1;
    return String(prefix || "id") + "_" + editor.uid + "_" + Date.now().toString(36);
  }

  function clone(value) {
    return $.extend(true, Array.isArray(value) ? [] : {}, value);
  }

  function toInt(value, fallback) {
    var n = parseInt(String(value), 10);
    return isNaN(n) ? fallback : n;
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function formatLocalDateTime(date) {
    function pad(n) { return String(n).padStart(2, "0"); }
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
  }

  function normaliseDisplayText(value) {
    return $.trim(String(value || "").replace(/<br\s*\/?>/gi, " "));
  }

  function normaliseText(value) {
    return normaliseDisplayText(value).replace(/\s+/g, " ").toLowerCase();
  }

  function normaliseWhitespace(value) {
    return $.trim(String(value || "").replace(/\s+/g, " "));
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function attr(value) {
    return esc(value).replace(/\r?\n/g, "&#10;");
  }

  function getErrorMessage(err, fallback) {
    return err && err.message ? err.message : fallback;
  }

  function log() {
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift("[WiseHireHop EventOverview]");
      console.warn.apply(console, args);
    } catch (e) {}
  }

  function warn() { log.apply(null, arguments); }

  window.__wiseEventOverviewEditor = {
    open: openEditor,
    read: function () { return clone(editor.current); },
    version: CFG.version
  };
})();
