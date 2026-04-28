(function () {
  "use strict";

  var $ = window.jQuery;
  if (!$) return;

  var CFG = {
    version: "2026-04-28.08-visual-page-editor",
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
    selectedRegionId: "",
    lastClickedNodeId: "",
    lastWriteAt: 0,
    uid: 0,
    depotSignature: ""
  };

  log("Event Overview visual editor loaded", CFG.version);
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
      "#" + CFG.overlayId + "{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(9,15,28,.56);backdrop-filter:blur(3px);z-index:100000;}",
      "#" + CFG.modalId + "{width:min(1220px,calc(100vw - 24px));max-height:calc(100vh - 24px);display:flex;flex-direction:column;overflow:hidden;background:#f6f8fb;border:1px solid #d0d5dd;border-radius:16px;box-shadow:0 24px 64px rgba(15,23,42,.28);color:#1f2937;font-family:inherit;}",
      "#" + CFG.modalId + " *{box-sizing:border-box;}",
      "#" + CFG.modalId + " .weo-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:13px 16px 10px;background:linear-gradient(180deg,#fff 0%,#f8fafc 100%);border-bottom:1px solid #e4e8ef;}",
      "#" + CFG.modalId + " .weo-title{font-size:17px;font-weight:800;line-height:1.15;letter-spacing:-.01em;color:#101828;}",
      "#" + CFG.modalId + " .weo-subtitle{margin-top:3px;color:#667085;font-size:11px;line-height:1.4;max-width:760px;}",
      "#" + CFG.modalId + " .weo-x{border:0;background:transparent;color:#667085;cursor:pointer;font-size:24px;line-height:1;padding:0 2px;}",
      "#" + CFG.modalId + " .weo-body{padding:10px 12px 12px;overflow:auto;background:#e9edf3;display:flex;flex-direction:column;gap:8px;}",
      "#" + CFG.modalId + " .weo-message{border:1px dashed #d0d5dd;border-radius:14px;background:#f9fafb;padding:18px;color:#344054;font-size:14px;line-height:1.55;}",
      "#" + CFG.modalId + " .weo-message strong{display:block;margin-bottom:6px;color:#101828;font-size:15px;}",
      "#" + CFG.modalId + " .weo-visual-editor{display:grid;gap:8px;min-width:0;}",
      "#" + CFG.modalId + " .weo-layout-strip{display:flex;gap:8px;align-items:stretch;justify-content:space-between;}",
      "#" + CFG.modalId + " .weo-layout-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:min(560px,100%);}",
      "#" + CFG.modalId + " .weo-layout-pill{display:grid;grid-template-columns:18px minmax(0,1fr);gap:8px;align-items:center;border:1px solid #d4dbe7;border-radius:12px;background:#fff;padding:8px 10px;cursor:pointer;box-shadow:0 4px 12px rgba(15,23,42,.04);}",
      "#" + CFG.modalId + " .weo-layout-pill input{margin:0;}",
      "#" + CFG.modalId + " .weo-layout-pill b{display:block;font-size:12px;line-height:1.15;color:#101828;}",
      "#" + CFG.modalId + " .weo-layout-pill span span{display:block;margin-top:2px;font-size:10px;line-height:1.25;color:#667085;}",
      "#" + CFG.modalId + " .weo-layout-pill.is-selected{border-color:#175cd3;background:#eef4ff;box-shadow:inset 0 0 0 1px rgba(23,92,211,.08),0 4px 12px rgba(23,92,211,.08);}",
      "#" + CFG.modalId + " .weo-layout-note{align-self:center;max-width:420px;border:1px solid #d9e2ec;border-radius:12px;background:#fff;padding:8px 10px;font-size:11px;line-height:1.35;color:#475467;}",
      "#" + CFG.modalId + " .weo-canvas-shell{border:1px solid #d6deea;border-radius:16px;background:#dfe5ee;padding:12px;overflow:auto;}",
      "#" + CFG.modalId + " .weo-proof-page{--paper:#fffdf9;--ink:#0d1226;--heritage:#EC9797;position:relative;width:min(100%,1120px);min-width:760px;aspect-ratio:318/178.9;margin:0 auto;background:var(--paper);overflow:hidden;border-radius:8px;box-shadow:0 10px 30px rgba(15,23,42,.18);color:var(--ink);font-family:Lato,'Segoe UI',Arial,sans-serif;}",
      "#" + CFG.modalId + " .weo-proof-logo{position:absolute;left:2.6%;top:4%;z-index:5;width:112px;height:26px;border:1px solid rgba(13,18,38,.18);border-radius:999px;background:rgba(13,18,38,.05);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;letter-spacing:.08em;color:rgba(13,18,38,.68);text-transform:uppercase;}",
      "#" + CFG.modalId + " .weo-proof-footer{position:absolute;left:2.6%;right:2.6%;bottom:4%;z-index:7;display:flex;justify-content:space-between;gap:18px;font-size:10px;color:rgba(13,18,38,.62);pointer-events:none;}",
      "#" + CFG.modalId + " .weo-page-title-fixed{position:absolute;z-index:6;font-family:'Albra Sans',Lato,'Segoe UI',Arial,sans-serif;font-size:clamp(24px,3.1vw,42px);font-weight:400;line-height:.95;text-transform:uppercase;letter-spacing:.01em;}",
      "#" + CFG.modalId + " .weo-page-field{width:100%;border:1px dashed rgba(23,92,211,.28);border-radius:8px;background:rgba(255,255,255,.72);color:#0d1226;font:inherit;box-shadow:0 1px 2px rgba(15,23,42,.04);transition:border-color .12s,box-shadow .12s,background .12s;}",
      "#" + CFG.modalId + " .weo-page-field:hover{border-color:rgba(23,92,211,.55);background:rgba(255,255,255,.9);}",
      "#" + CFG.modalId + " .weo-page-field:focus{outline:none;border-color:#175cd3;background:#fff;box-shadow:0 0 0 3px rgba(23,92,211,.14);}",
      "#" + CFG.modalId + " .weo-page-field::placeholder{color:rgba(13,18,38,.34);}",
      "#" + CFG.modalId + " textarea.weo-page-field{resize:none;line-height:1.25;}",
      "#" + CFG.modalId + " .weo-proof-kicker{font-family:'Albra Sans',Lato,'Segoe UI',Arial,sans-serif;font-size:clamp(11px,1.1vw,15px);line-height:1.05;color:var(--heritage);letter-spacing:.03em;margin-bottom:6px;}",
      "#" + CFG.modalId + " .weo-day-heading{font-weight:800;text-transform:uppercase;line-height:1.15;padding:6px 8px;font-size:clamp(11px,1.03vw,14px);}",
      "#" + CFG.modalId + " .weo-day-blurb{min-height:42px;padding:7px 8px;font-size:clamp(10px,.94vw,13px);}",
      "#" + CFG.modalId + " .weo-time-list{display:grid;gap:4px;margin-top:6px;}",
      "#" + CFG.modalId + " .weo-time-row{display:grid;grid-template-columns:minmax(54px,.34fr) 12px minmax(0,1fr) 23px;gap:4px;align-items:center;padding-top:4px;border-top:1px solid rgba(236,151,151,.48);}",
      "#" + CFG.modalId + " .weo-time-row:first-child{border-top:0;padding-top:0;}",
      "#" + CFG.modalId + " .weo-time-row .weo-page-field{padding:5px 6px;font-size:clamp(10px,.9vw,12px);}",
      "#" + CFG.modalId + " .weo-row-sep{font-size:11px;text-align:center;color:rgba(13,18,38,.35);}",
      "#" + CFG.modalId + " .weo-mini-remove{width:23px;height:23px;border:1px solid #fecdca;border-radius:7px;background:#fff;color:#b42318;cursor:pointer;font-size:16px;line-height:18px;padding:0;}",
      "#" + CFG.modalId + " .weo-mini-remove:hover{background:#fff5f5;}",
      "#" + CFG.modalId + " .weo-page-mini-btn{border:1px solid #cfd4dc;border-radius:999px;background:#fff;color:#1f2937;cursor:pointer;font-size:10px;font-weight:800;padding:5px 8px;line-height:1.1;}",
      "#" + CFG.modalId + " .weo-page-mini-btn:hover{background:#f9fafb;}",
      "#" + CFG.modalId + " .weo-page-mini-btn.is-danger{border-color:#fecdca;color:#b42318;}",
      "#" + CFG.modalId + " .weo-card-actions{display:flex;justify-content:space-between;gap:6px;align-items:center;margin-top:6px;}",
      "#" + CFG.modalId + " .weo-row-count{font-size:9px;font-weight:800;color:rgba(13,18,38,.45);}",
      "#" + CFG.modalId + " .weo-proof-page.is-image-layout .weo-proof-image-panel{position:absolute;right:0;top:0;bottom:0;width:50%;z-index:1;background:linear-gradient(145deg,#0f172a,#1d4ed8);overflow:hidden;}",
      "#" + CFG.modalId + " .weo-proof-page.is-image-layout .weo-proof-image-panel img{width:100%;height:100%;object-fit:cover;display:block;}",
      "#" + CFG.modalId + " .weo-proof-page.is-image-layout .weo-image-url-card{position:absolute;left:7%;right:7%;top:8%;z-index:4;border:1px solid rgba(255,255,255,.28);border-radius:12px;background:rgba(13,18,38,.58);backdrop-filter:blur(3px);padding:8px;color:#fff;}",
      "#" + CFG.modalId + " .weo-proof-page.is-image-layout .weo-image-url-card label{display:block;margin-bottom:4px;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.82);}",
      "#" + CFG.modalId + " .weo-proof-page.is-image-layout .weo-image-url-card input{width:100%;border:1px solid rgba(255,255,255,.3);border-radius:8px;background:rgba(255,255,255,.93);font-size:11px;padding:6px 7px;color:#0d1226;}",
      "#" + CFG.modalId + " .weo-proof-page.is-image-layout .weo-page-title-fixed{right:5.2%;bottom:11%;width:40%;text-align:right;color:rgba(255,253,249,.94);text-shadow:0 2px 16px rgba(0,0,0,.24);}",
      "#" + CFG.modalId + " .weo-proof-page.is-image-layout .weo-proof-copy-pane{position:absolute;left:5.1%;top:21%;bottom:13%;width:34.5%;z-index:4;display:flex;flex-direction:column;min-height:0;}",
      "#" + CFG.modalId + " .weo-proof-page.is-image-layout .weo-day-blurb{margin-bottom:10px;}",
      "#" + CFG.modalId + " .weo-proof-page.is-image-layout .weo-schedule-box{display:flex;flex-direction:column;min-height:0;}",
      "#" + CFG.modalId + " .weo-columns-grid{position:absolute;left:2.6%;right:2.6%;top:8%;bottom:12%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2.6%;z-index:3;}",
      "#" + CFG.modalId + " .weo-column{display:flex;flex-direction:column;min-width:0;min-height:0;}",
      "#" + CFG.modalId + " .weo-column .weo-page-title-fixed{position:static;width:100%;margin:0 0 8px 0;color:#0d1226;}",
      "#" + CFG.modalId + " .weo-opening-field{min-height:54px;margin:0 0 10px 0;padding:7px 8px;font-size:clamp(10px,.93vw,13px);}",
      "#" + CFG.modalId + " .weo-col-schedule{display:flex;flex-direction:column;min-height:0;}",
      "#" + CFG.modalId + " .weo-col-schedule.is-empty{opacity:.82;}",
      "#" + CFG.modalId + " .weo-col-schedule .weo-day-heading{font-family:'Albra Sans',Lato,'Segoe UI',Arial,sans-serif;font-weight:400;font-size:clamp(17px,1.95vw,27px);line-height:1;text-transform:uppercase;padding:6px 8px;margin-top:6px;}",
      "#" + CFG.modalId + " .weo-col-schedule .weo-day-blurb{min-height:38px;}",
      "#" + CFG.modalId + " .weo-editor-help{display:flex;flex-wrap:wrap;align-items:center;gap:6px;border:1px solid #d9e2ec;border-radius:12px;background:#fff;padding:8px 10px;font-size:11px;line-height:1.35;color:#475467;}",
      "#" + CFG.modalId + " .weo-editor-help span{display:inline-flex;align-items:center;border:1px solid #e4e8ef;border-radius:999px;background:#fbfcfe;padding:3px 7px;font-size:10px;font-weight:800;color:#667085;}",
      "#" + CFG.modalId + " .weo-editor-help strong{font-weight:800;color:#101828;}",
      "#" + CFG.modalId + " .weo-editor-help.is-warning{border-color:#fedf89;background:#fffaeb;color:#93370d;}",
      "#" + CFG.modalId + " .weo-btn{border:1px solid #cfd4dc;border-radius:8px;background:#fff;color:#1f2937;cursor:pointer;font-size:11px;font-weight:800;padding:6px 8px;line-height:1.15;}",
      "#" + CFG.modalId + " .weo-btn:hover{background:#f9fafb;}",
      "#" + CFG.modalId + " .weo-btn.is-primary{border-color:#175cd3;background:#175cd3;color:#fff;}",
      "#" + CFG.modalId + " .weo-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding-top:8px;border-top:1px solid #e4e8ef;}",
      "#" + CFG.statusId + "{min-height:14px;font-size:11px;font-weight:700;padding-left:1px;}",
      "#" + CFG.statusId + ".is-error{color:#b42318;}",
      "#" + CFG.statusId + ".is-success{color:#027a48;}",
      "#" + CFG.statusId + ".is-warning{color:#b54708;}",
      "#" + CFG.statusId + ".is-info{color:#175cd3;}",
      "@media(max-width:900px){#" + CFG.modalId + "{width:calc(100vw - 16px);max-height:calc(100vh - 16px);}#" + CFG.overlayId + "{padding:8px;}#" + CFG.modalId + " .weo-layout-strip{display:grid;}#" + CFG.modalId + " .weo-layout-options{width:100%;}#" + CFG.modalId + " .weo-proof-page{min-width:720px;}#" + CFG.modalId + " .weo-canvas-shell{padding:8px;}}",
      "@media(max-width:720px){#" + CFG.modalId + " .weo-layout-options{grid-template-columns:1fr;}#" + CFG.modalId + " .weo-footer{flex-direction:column;align-items:stretch;}#" + CFG.modalId + " .weo-footer .weo-btn{width:100%;}}"
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
              '<div class="weo-subtitle">Edit this proposal page visually. The logo, title and footer are fixed; the fields on the page are the editable content.</div>' +
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

    $("#" + CFG.bodyId).on("input", '[data-field="imageUrl"]', function () {
      var url = $.trim(String($(this).val() || ""));
      var $panel = $(this).closest(".weo-proof-image-panel");
      var $img = $panel.find("img").first();
      if (!$img.length) $img = $('<img alt="">').prependTo($panel);
      if (url) $img.attr("src", url);
      else $img.remove();
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
      editor.selectedRegionId = "";
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
    $("#" + CFG.bodyId).html('<div class="weo-message"><strong>' + esc(title) + "</strong>" + esc(message) + "</div>");
    setSaveEnabled(false);
  }

  function renderEditor(state) {
    state = normaliseVisualEditorState(state || blankState());
    editor.current = state;
    editor.selectedRegionId = "";

    var html = '' +
      '<div class="weo-visual-editor">' +
        visualLayoutSwitchHtml(state) +
        '<div class="weo-canvas-shell">' + visualCanvasHtml(state) + '</div>' +
        visualEditorHelpHtml(state) +
      '</div>';

    $("#" + CFG.bodyId).html(html);
    setSaveEnabled(true);
  }

  function normaliseVisualEditorState(state) {
    state = normaliseEditorState(state || blankState());

    if (state.layout === LAYOUT_COLUMNS) {
      while (state.schedules.length < CFG.maxSchedules) {
        state.schedules.push(blankSchedule(state.schedules.length === 0 ? "Day of event" : ""));
      }
    }

    if (!state.schedules.length) state.schedules = [blankSchedule("Day of event")];
    return state;
  }

  function visualLayoutSwitchHtml(state) {
    var layout = normaliseLayout(state.layout);

    return '' +
      '<div class="weo-layout-strip">' +
        '<div class="weo-layout-options">' +
          visualLayoutPillHtml(LAYOUT_IMAGE, layout, "Image split", "One image-led schedule page. Uses one day only.") +
          visualLayoutPillHtml(LAYOUT_COLUMNS, layout, "Three columns", "No image. Shows up to three day columns.") +
        '</div>' +
        '<div class="weo-layout-note"><strong>Direct page editing:</strong> click into the page preview fields below. The fixed title, logo and footer are shown for context but are not editable here.</div>' +
      '</div>';
  }

  function visualLayoutPillHtml(value, current, title, note) {
    return '' +
      '<label class="weo-layout-pill' + (value === current ? ' is-selected' : '') + '">' +
        '<input type="radio" name="weo-layout" value="' + attr(value) + '"' + (value === current ? ' checked' : '') + '>' +
        '<span><b>' + esc(title) + '</b><span>' + esc(note) + '</span></span>' +
      '</label>';
  }

  function visualCanvasHtml(state) {
    return normaliseLayout(state.layout) === LAYOUT_COLUMNS
      ? columnsVisualPageHtml(state)
      : imageVisualPageHtml(state);
  }

  function proofLogoHtml() {
    return '<div class="weo-proof-logo">Wise logo</div>';
  }

  function proofFooterHtml() {
    return '<div class="weo-proof-footer"><span>Event date · Job · Version</span><span>Page no.</span></div>';
  }

  function imageVisualPageHtml(state) {
    var schedule = getScheduleAtIndex(state, 0);
    var imageUrl = $.trim(String(state.imageUrl || ""));

    return '' +
      '<div class="weo-proof-page is-image-layout">' +
        proofLogoHtml() +
        '<div class="weo-proof-image-panel">' +
          (imageUrl ? '<img alt="" src="' + attr(imageUrl) + '">' : '') +
          '<div class="weo-image-url-card">' +
            '<label>Feature image URL</label>' +
            '<input type="text" data-field="imageUrl" value="' + attr(imageUrl) + '" placeholder="https://...">' +
          '</div>' +
        '</div>' +
        '<div class="weo-page-title-fixed">Event Overview<br>&amp; Schedule</div>' +
        '<div class="weo-proof-copy-pane weo-day-card" data-schedule-index="0" data-schedule-uid="' + attr(schedule.uid) + '" data-schedule-id="' + attr(schedule.id) + '">' +
          '<div class="weo-proof-kicker">The brief</div>' +
          '<textarea class="weo-page-field weo-day-blurb" data-field="scheduleIntro" placeholder="Short brief text shown beside the image.">' + esc(schedule.intro) + '</textarea>' +
          '<div class="weo-schedule-box">' +
            '<input class="weo-page-field weo-day-heading" type="text" data-field="scheduleTitle" value="' + attr(schedule.title) + '" placeholder="Day of event">' +
            visualRowsHtml(schedule, 0) +
            visualScheduleActionsHtml(schedule, 0, false) +
          '</div>' +
        '</div>' +
        proofFooterHtml() +
      '</div>';
  }

  function columnsVisualPageHtml(state) {
    var columns = [];

    for (var i = 0; i < CFG.maxSchedules; i++) {
      var schedule = getScheduleAtIndex(state, i);
      columns.push('' +
        '<div class="weo-column">' +
          (i === 0 ? columnsPageIntroHtml(state) : '') +
          visualScheduleCardHtml(schedule, i) +
        '</div>'
      );
    }

    return '' +
      '<div class="weo-proof-page is-columns-layout">' +
        proofLogoHtml() +
        '<div class="weo-columns-grid">' + columns.join("") + '</div>' +
        proofFooterHtml() +
      '</div>';
  }

  function columnsPageIntroHtml(state) {
    return '' +
      '<div class="weo-page-title-fixed">Event Overview<br>&amp; Schedule</div>' +
      '<div class="weo-proof-kicker">The brief</div>' +
      '<textarea class="weo-page-field weo-opening-field" data-field="openingText" placeholder="Opening text shown above the first column.">' + esc(state.openingText) + '</textarea>';
  }

  function visualScheduleCardHtml(schedule, index) {
    schedule = normaliseSchedule(schedule);

    var classes = ["weo-col-schedule", "weo-day-card"];
    if (!isMeaningfulScheduleState(schedule)) classes.push("is-empty");

    return '' +
      '<div class="' + classes.join(" ") + '" data-schedule-index="' + index + '" data-schedule-uid="' + attr(schedule.uid) + '" data-schedule-id="' + attr(schedule.id) + '">' +
        '<input class="weo-page-field weo-day-heading" type="text" data-field="scheduleTitle" value="' + attr(schedule.title) + '" placeholder="' + attr(index === 0 ? "Day of event" : "Day " + String(index + 1)) + '">' +
        '<textarea class="weo-page-field weo-day-blurb" data-field="scheduleIntro" placeholder="Optional short note below this day heading.">' + esc(schedule.intro) + '</textarea>' +
        visualRowsHtml(schedule, index) +
        visualScheduleActionsHtml(schedule, index, index > 0) +
      '</div>';
  }

  function visualRowsHtml(schedule, scheduleIndex) {
    schedule = normaliseSchedule(schedule);
    var rows = schedule.rows && schedule.rows.length ? schedule.rows : [blankRow()];
    var html = [];

    for (var i = 0; i < rows.length && i < CFG.maxRows; i++) {
      html.push(visualRowHtml(rows[i], scheduleIndex, i));
    }

    return '<div class="weo-time-list">' + html.join("") + '</div>';
  }

  function visualRowHtml(row, scheduleIndex, rowIndex) {
    row = normaliseRow(row);

    return '' +
      '<div class="weo-time-row" data-row-index="' + rowIndex + '" data-row-uid="' + attr(row.uid) + '" data-row-id="' + attr(row.id) + '">' +
        '<input class="weo-page-field" type="text" data-field="rowTime" value="' + attr(row.time) + '" placeholder="09:00" maxlength="32">' +
        '<span class="weo-row-sep">–</span>' +
        '<input class="weo-page-field" type="text" data-field="rowText" value="' + attr(row.text) + '" placeholder="What happens?">' +
        '<button type="button" class="weo-mini-remove" data-weo-action="remove-row" data-schedule-index="' + scheduleIndex + '" data-row-index="' + rowIndex + '" aria-label="Remove time row">&times;</button>' +
      '</div>';
  }

  function visualScheduleActionsHtml(schedule, index, canClear) {
    var liveRows = getRowsToSave(schedule).length;

    return '' +
      '<div class="weo-card-actions">' +
        '<button type="button" class="weo-page-mini-btn" data-weo-action="add-row" data-schedule-index="' + index + '"' + ((schedule.rows || []).length >= CFG.maxRows ? ' disabled' : '') + '>+ Add time</button>' +
        '<span class="weo-row-count">' + esc(String(liveRows) + " / " + String(CFG.maxRows)) + '</span>' +
        (canClear ? '<button type="button" class="weo-page-mini-btn is-danger" data-weo-action="clear-schedule" data-schedule-index="' + index + '">Clear</button>' : '') +
      '</div>';
  }

  function visualEditorHelpHtml(state) {
    var active = getActiveSchedules(state);
    var warning = state.layout === LAYOUT_IMAGE && active.length > 1;

    if (warning) {
      return '<div class="weo-editor-help is-warning"><strong>Image split saves one schedule only.</strong> Extra active days are not hidden by the document renderer; they would create extra overview pages. This editor will keep the first day only when saved.</div>';
    }

    return '' +
      '<div class="weo-editor-help">' +
        '<span>Fixed title</span>' +
        '<span>Locked page layout</span>' +
        '<span>Clean text fields</span>' +
        '<strong>Tip:</strong> times render as “09:00 - description” in the final proposal.' +
      '</div>';
  }

  function runEditorAction($btn) {
    var action = String($btn.attr("data-weo-action") || "");
    var scheduleIndex = toInt($btn.attr("data-schedule-index"), -1);
    var rowIndex = toInt($btn.attr("data-row-index"), -1);
    var state = readFormState(editor.current);

    if (scheduleIndex >= 0) {
      while (state.schedules.length <= scheduleIndex && state.schedules.length < CFG.maxSchedules) {
        state.schedules.push(blankSchedule(state.schedules.length === 0 ? "Day of event" : ""));
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

    if (action === "clear-schedule" && scheduleIndex > 0 && state.schedules[scheduleIndex]) {
      state.schedules[scheduleIndex] = blankSchedule("");
    }

    editor.current = normaliseVisualEditorState(state);
    editor.selectedRegionId = "";
    renderEditor(editor.current);
    setStatus("", "");
  }

  function readFormState(previous) {
    var prior = normaliseVisualEditorState(previous || editor.current || blankState());
    var state = clone(prior);
    var $body = $("#" + CFG.bodyId);
    var checkedLayout = $body.find('input[name="weo-layout"]:checked').val();

    state.layout = normaliseLayout(checkedLayout || state.layout);

    var $image = $body.find('[data-field="imageUrl"]').first();
    state.imageUrl = $image.length ? $.trim(String($image.val() || "")) : $.trim(String(prior.imageUrl || ""));

    var $opening = $body.find('[data-field="openingText"]').first();
    state.openingText = $opening.length ? String($opening.val() || "") : String(prior.openingText || "");

    var nextSchedules = Array.isArray(prior.schedules) ? prior.schedules.slice(0, CFG.maxSchedules).map(normaliseSchedule) : [];
    if (!nextSchedules.length) nextSchedules.push(blankSchedule("Day of event"));

    $body.find(".weo-day-card[data-schedule-uid]").each(function () {
      var $card = $(this);
      var scheduleIndex = toInt($card.attr("data-schedule-index"), -1);
      if (scheduleIndex < 0 || scheduleIndex >= CFG.maxSchedules) return;

      while (nextSchedules.length <= scheduleIndex) {
        nextSchedules.push(blankSchedule(scheduleIndex === 0 ? "Day of event" : ""));
      }

      var oldSchedule = normaliseSchedule(nextSchedules[scheduleIndex] || {});
      var oldRows = indexByUid(oldSchedule.rows || []);
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

      nextSchedules[scheduleIndex] = normaliseSchedule({
        uid: String($card.attr("data-schedule-uid") || oldSchedule.uid || newUid("schedule")),
        id: String($card.attr("data-schedule-id") || oldSchedule.id || ""),
        title: cleanHeadingTitle($card.find('[data-field="scheduleTitle"]').first().val()),
        intro: String($card.find('[data-field="scheduleIntro"]').first().val() || ""),
        baseMemo: oldSchedule.baseMemo || "",
        meta: oldSchedule.meta || null,
        nodeData: oldSchedule.nodeData || null,
        rows: rows
      });
    });

    if (state.layout === LAYOUT_IMAGE) {
      state.schedules = [normaliseSchedule(nextSchedules[0] || blankSchedule("Day of event"))];
    } else {
      while (nextSchedules.length < CFG.maxSchedules) {
        nextSchedules.push(blankSchedule(nextSchedules.length === 0 ? "Day of event" : ""));
      }
      state.schedules = nextSchedules.slice(0, CFG.maxSchedules).map(normaliseSchedule);
    }

    return normaliseVisualEditorState(state);
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

  function validateState(state) {
    state = normaliseEditorState(state);
    var active = getActiveSchedules(state);

    if (state.layout === LAYOUT_IMAGE && !$.trim(state.imageUrl)) {
      return "Add an image link for this layout.";
    }

    if (!active.length) return "Add at least one schedule.";
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
          memo: "",
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

      var storageBaseMemo = getScheduleBaseMemoForSave(saved, schedule, i);
      var memo = composeStoredPageMetaText(storageBaseMemo, schedule.meta);

      if (scheduleNeedsSave(schedule, originalSchedule, memo)) {
        schedule.meta.updatedAt = formatLocalDateTime(new Date());
        memo = composeStoredPageMetaText(storageBaseMemo, schedule.meta);
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

      schedule.baseMemo = storageBaseMemo;
      schedule.nodeData = extendSnapshot(schedule.nodeData, { ID: schedule.id, TECHNICAL: memo, DESCRIPTION: schedule.intro });
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

  function getScheduleBaseMemoForSave(state, schedule, index) {
    var base = stripImageUrlsFromMemo(schedule.baseMemo || "");
    var imageUrl = $.trim(String(state.imageUrl || ""));

    if (state.layout === LAYOUT_IMAGE && index === 0 && imageUrl) {
      return $.trim(imageUrl + (base ? "\n\n" + base : ""));
    }

    return base;
  }

  function stripImageUrlsFromMemo(text) {
    return $.trim(String(text || "")
      .replace(/https?:\/\/[^\s"'<>]+/ig, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n"));
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
    var firstMemoUrl = schedules[0] ? extractFirstUrl(schedules[0].baseMemo || getSnapshotField(schedules[0].nodeData, "TECHNICAL")) : "";
    var imageUrl = $.trim(String(rootMeta.imageUrl || firstScheduleMeta.imageUrl || firstMemoUrl || ""));
    var explicitLayout = rootMeta.layout || rootMeta.variant || firstScheduleMeta.layout || firstScheduleMeta.variant || "";
    var layout = explicitLayout ? normaliseLayout(explicitLayout) : (imageUrl ? LAYOUT_IMAGE : LAYOUT_COLUMNS);
    if (!explicitLayout && childHeadings.length > 1) layout = LAYOUT_COLUMNS;

    return normaliseEditorState({
      rootId: getNodeDataId(rootNode),
      rootBaseMemo: rootMetaInfo.baseText || "",
      rootMeta: rootMeta,
      layout: layout,
      imageUrl: imageUrl,
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
      return { title: "Event Overview not found", error: "Select the Event Overview section or add a hidden section called “" + CFG.requiredRawSectionName + "” to the supplying list." };
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
      if (isSelectableEventOverviewRoot(current)) return current;
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
      if (lastClickedNode && lastClickedNode.id) return [lastClickedNode];
    }

    return nodes;
  }

  function collectTreeNodesFromDom(tree, $elements, out, seen) {
    if (!tree || !$elements || !$elements.length) return;

    $elements.each(function () {
      var $li = $(this).is("li.jstree-node") ? $(this) : $(this).closest("li.jstree-node");
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

  function getScheduleAtIndex(state, index) {
    var schedules = state && state.schedules ? state.schedules : [];
    var fallbackTitle = index === 0 ? "Day of event" : "";
    return normaliseSchedule(schedules[index] || blankSchedule(fallbackTitle));
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

  function isMeaningfulScheduleState(schedule) {
    schedule = normaliseSchedule(schedule);
    return !!(schedule.id || $.trim(String(schedule.title || "")) || $.trim(String(schedule.intro || "")) || getRowsToSave(schedule).length);
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

  function extractFirstUrl(text) {
    var s = String(text || "").trim();
    if (!s) return "";
    var m = s.match(/https?:\/\/[^\s"'<>]+/i);
    if (!m) return "";
    return m[0].replace(/[)\],.]+$/g, "");
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