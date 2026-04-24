(function () {
  "use strict";

  try { console.warn("[WiseHireHop] docked doc preview loaded - v2026-04-24.09"); } catch (e) {}

  var $ = window.jQuery;
  if (!$) return;

  var TOGGLE_ID = "wise-doc-preview-toggle";
  var OUTER_WRAP_ID = "wise-doc-preview-workspace";
  var LEFT_PANE_ID = "wise-doc-preview-left-pane";
  var RIGHT_PANE_ID = "wise-doc-preview-right-pane";
  var PANEL_ID = "wise-doc-preview-panel";
  var IFRAME_VIEWPORT_ID = "wise-doc-preview-viewport";
  var IFRAME_PRIMARY_ID = "wise-doc-preview-iframe-primary";
  var IFRAME_SECONDARY_ID = "wise-doc-preview-iframe-secondary";
  var VARIANT_SELECT_ID = "wise-doc-preview-variant";

  var PREVIEW_CONFIG = {
    minPreviewWidth: 360,
    refreshDebounceMs: 1500,
    timezone: "Europe/London",
    mergeHtmlPath: "/modules/docmaker/merge-html.php",
    defaultDocumentVariantKey: "proposal_default",
    documentVariants: [
      {
        key: "proposal_default",
        family: "Proposal",
        label: "Default",
        params: {
          doc: "166",
          engine: "1"
        }
      },
      {
        key: "jobtrack_gp_predictor",
        family: "Job Track",
        label: "GP% Predictor",
        params: {
          doc: "162",
          engine: "0"
        }
      }
    ],
    staticParams: {
      type: "1",
      sub_id: "0",
      sub_type: "16",
      format: "html",
      stn: "0",
      or: "0",
      nums: "0"
    },
    refreshUrlPatterns: [
      /\/php_functions\/items_(?:save|delete|sort|move|copy|duplicate|load)(?:\.php)?(?:\?|$)/i,
      /\/php_functions\/items?(?:_[a-z]+)?(?:\.php)?(?:\?|$)/i
    ],
    selectionAttributeFilter: ["class", "aria-selected"],
    previewLoadActivateDelayMs: 90,
    previewLoadFollowUpDelaysMs: [220, 420],
    previewPageSelectors: [
      ".page",
      ".print-page",
      ".doc-page",
      ".paper",
      ".sheet",
      "[data-page]"
    ],
    previewHeadingSelectors: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      ".title",
      ".heading",
      ".page-title",
      ".section-title",
      ".dept-title",
      "[role='heading']",
      "strong",
      "b"
    ],
    previewTextSelectors: [
      "p",
      "div",
      "span",
      "td",
      "th",
      "li"
    ],
    previewMaxMatchTextLength: 180
  };

  var MIN_PREVIEW_WIDTH = PREVIEW_CONFIG.minPreviewWidth;
  var REFRESH_DEBOUNCE_MS = PREVIEW_CONFIG.refreshDebounceMs;

  var panelOpen = false;
  var autoRefreshEnabled = true;
  var refreshTimer = null;
  var domObserver = null;

  var lastIframeScrollRatio = 0;
  var previewRefreshInFlight = false;
  var pendingRefreshReason = null;
  var activePreviewFrameId = IFRAME_PRIMARY_ID;
  var previewHasLoaded = false;
  var lastSelectedNodeIdsKey = "";
  var activeDocumentVariantKey = getDefaultDocumentVariantKey();
  var nextPreviewLoadId = 1;

  waitForItemsTabAndInit();

  // =========================================================
  // BOOTSTRAP
  // =========================================================
  function waitForItemsTabAndInit() {
    var tries = 0;

    function attempt() {
      tries++;

      if ($("#items_tab").length) {
        injectBaseStyles();
        tryAddPreviewButton();
        installAjaxHooks();
        installFetchHooks();

        $(window).off("resize.wiseDocPreview").on("resize.wiseDocPreview", function () {
          if (!panelOpen) return;

          var iframe = getActivePreviewIframe();
          if (!iframe || !iframe.contentDocument) return;

          try {
            fitPreviewToPane(iframe, iframe.contentDocument);
          } catch (e) {}
        });

        return;
      }

      if (tries < 40) {
        setTimeout(attempt, 500);
      }
    }

    attempt();
  }

  // =========================================================
  // STYLES
  // =========================================================
  function injectBaseStyles() {
    if ($("#wise-doc-preview-styles").length) return;

    var css = [
      '<style id="wise-doc-preview-styles">',
      '#' + OUTER_WRAP_ID + ' {',
      '  display:flex;',
      '  width:100%;',
      '  gap:0;',
      '  align-items:stretch;',
      '  min-height:700px;',
      '}',
      '#' + LEFT_PANE_ID + ' {',
      '  flex:1 1 auto;',
      '  min-width:0;',
      '}',
      '#' + RIGHT_PANE_ID + ' {',
      '  flex:0 0 max(' + MIN_PREVIEW_WIDTH + 'px, 25%);',
      '  width:max(' + MIN_PREVIEW_WIDTH + 'px, 25%);',
      '  min-width:' + MIN_PREVIEW_WIDTH + 'px;',
      '  border-left:1px solid #d9d9d9;',
      '  background:#fff;',
      '  display:flex;',
      '  flex-direction:column;',
      '}',
      '#' + PANEL_ID + ' {',
      '  display:flex;',
      '  flex-direction:column;',
      '  height:100%;',
      '  min-height:700px;',
      '}',
      '#' + PANEL_ID + ' .wise-doc-preview-toolbar {',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:space-between;',
      '  flex-wrap:wrap;',
      '  gap:10px;',
      '  padding:6px 10px 6px 12px;',
      '  border-bottom:1px solid #e3e3e3;',
      '  background:#f7f7f7;',
      '  min-height:44px;',
      '  flex:0 0 auto;',
      '}',
      '#' + PANEL_ID + ' .wise-doc-preview-toolbar-left {',
      '  display:flex;',
      '  align-items:center;',
      '  gap:10px;',
      '  min-width:0;',
      '  flex:1 1 auto;',
      '}',
      '#' + PANEL_ID + ' .wise-doc-preview-toolbar-title {',
      '  font-size:13px;',
      '  font-weight:600;',
      '  white-space:nowrap;',
      '}',
      '#' + PANEL_ID + ' .wise-doc-preview-render {',
      '  display:flex;',
      '  align-items:center;',
      '  gap:6px;',
      '  min-width:0;',
      '}',
      '#' + PANEL_ID + ' .wise-doc-preview-render span {',
      '  font-size:12px;',
      '  white-space:nowrap;',
      '}',
      '#' + PANEL_ID + ' .wise-doc-preview-render select {',
      '  min-width:170px;',
      '  max-width:230px;',
      '}',
      '#' + PANEL_ID + ' .wise-doc-preview-toolbar-right {',
      '  display:flex;',
      '  align-items:center;',
      '  flex-wrap:wrap;',
      '  justify-content:flex-end;',
      '  gap:8px;',
      '}',
      '#' + PANEL_ID + ' .wise-doc-preview-status {',
      '  display:none;',
      '  padding:6px 10px;',
      '  font-size:12px;',
      '  border-bottom:1px solid #ececec;',
      '  background:#fff8e1;',
      '  color:#6b5a00;',
      '}',
      '#' + IFRAME_VIEWPORT_ID + ' {',
      '  position:relative;',
      '  flex:1 1 auto;',
      '  min-height:640px;',
      '  background:#fff;',
      '  overflow:hidden;',
      '}',
      '#' + PANEL_ID + ' .wise-doc-preview-frame {',
      '  position:absolute;',
      '  inset:0;',
      '  display:block;',
      '  width:100%;',
      '  height:100%;',
      '  border:0;',
      '  background:#fff;',
      '  opacity:0;',
      '  visibility:hidden;',
      '  pointer-events:none;',
      '  transition:opacity 120ms ease;',
      '}',
      '#' + PANEL_ID + ' .wise-doc-preview-frame.is-active {',
      '  opacity:1;',
      '  visibility:visible;',
      '  pointer-events:auto;',
      '  z-index:2;',
      '}',
      '#' + PANEL_ID + ' .wise-doc-preview-frame.is-buffer {',
      '  z-index:1;',
      '}',
      '</style>'
    ].join("");

    $("head").append(css);
  }

  // =========================================================
  // BUTTON
  // =========================================================
  function tryAddPreviewButton() {
    if ($("#" + TOGGLE_ID).length) return;

    var $host = findToolbarHost();
    if (!$host.length) {
      setTimeout(tryAddPreviewButton, 1000);
      return;
    }

    var $btn = $(
      '<button id="' + TOGGLE_ID + '" type="button" ' +
        'class="items_func_btn ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon-primary" ' +
        'style="width: 140px; margin: 0px 0.5em;" ' +
        'role="button">' +
        '<span class="ui-button-icon-primary ui-icon ui-icon-search"></span>' +
        '<span class="ui-button-text">Preview</span>' +
      '</button>'
    );

    $btn.on("click", function () {
      if (panelOpen) closeDockedPreview();
      else openDockedPreview();
    });

    var $gearBtn = $host.children("button.fixed_width").first();

    if ($gearBtn.length) {
      $btn.insertBefore($gearBtn);
    } else {
      $host.append($btn);
    }
  }

  function findToolbarHost() {
    return $("#items_tab > div:first-child");
  }

  // =========================================================
  // DOCKED LAYOUT
  // =========================================================
  function openDockedPreview() {
    if (panelOpen) return;

    var $itemsTab = $("#items_tab");
    if (!$itemsTab.length) return;

    if (!$("#" + OUTER_WRAP_ID).length) {
      buildDockedLayout($itemsTab);
    }

    panelOpen = true;
    $("#" + RIGHT_PANE_ID).show();
    setButtonActive(true);
    activePreviewFrameId = IFRAME_PRIMARY_ID;
    previewHasLoaded = false;
    lastSelectedNodeIdsKey = getSelectedNodeIdsKey();
    bindPreviewIframeLoad();
    refreshPreviewNow("open");
    installTargetedDomObserver();
  }

  function closeDockedPreview() {
    panelOpen = false;
    clearTimeout(refreshTimer);
    previewRefreshInFlight = false;
    pendingRefreshReason = null;
    activePreviewFrameId = IFRAME_PRIMARY_ID;
    previewHasLoaded = false;
    lastSelectedNodeIdsKey = "";
    resetPreviewFrameState();
    removeTargetedDomObserver();

    var $workspace = $("#" + OUTER_WRAP_ID);
    if ($workspace.length) {
      unwrapDockedLayout();
    }

    setButtonActive(false);
  }

  function buildDockedLayout($itemsTab) {
    var $children = $itemsTab.children().detach();

    var $workspace = $('<div id="' + OUTER_WRAP_ID + '"></div>');
    var $left = $('<div id="' + LEFT_PANE_ID + '"></div>');
    var $right = $('<div id="' + RIGHT_PANE_ID + '"></div>');

    $left.append($children);
    $right.append(buildPreviewPanelHtml());

    $workspace.append($left).append($right);
    $itemsTab.append($workspace);

    bindPreviewPanelEvents();
  }

  function unwrapDockedLayout() {
    var $itemsTab = $("#items_tab");
    var $workspace = $("#" + OUTER_WRAP_ID);
    if (!$itemsTab.length || !$workspace.length) return;

    var $left = $("#" + LEFT_PANE_ID);
    var $children = $left.children().detach();

    $workspace.remove();
    $itemsTab.append($children);
  }

  function buildPreviewPanelHtml() {
    return $(
      '<div id="' + PANEL_ID + '">' +
        '<div class="wise-doc-preview-toolbar">' +
          '<div class="wise-doc-preview-toolbar-left">' +
            '<div class="wise-doc-preview-toolbar-title">Document Preview</div>' +
            '<label class="wise-doc-preview-render">' +
              '<span>Render</span>' +
              '<select id="' + VARIANT_SELECT_ID + '">' +
                buildDocumentVariantOptionsHtml() +
              '</select>' +
            '</label>' +
          '</div>' +
          '<div class="wise-doc-preview-toolbar-right">' +
            '<label style="display:flex; align-items:center; gap:6px; font-size:12px; white-space:nowrap;">' +
              '<input type="checkbox" id="wise-doc-preview-auto" checked> Auto' +
            '</label>' +
            '<button type="button" id="wise-doc-preview-refresh">Refresh</button>' +
            '<button type="button" id="wise-doc-preview-open-tab">Open</button>' +
            '<button type="button" id="wise-doc-preview-close">Close</button>' +
          '</div>' +
        '</div>' +
        '<div class="wise-doc-preview-status" id="wise-doc-preview-status"></div>' +
        '<div id="' + IFRAME_VIEWPORT_ID + '">' +
          '<iframe id="' + IFRAME_PRIMARY_ID + '" class="wise-doc-preview-frame is-active"></iframe>' +
          '<iframe id="' + IFRAME_SECONDARY_ID + '" class="wise-doc-preview-frame"></iframe>' +
        '</div>' +
      '</div>'
    );
  }

  function bindPreviewPanelEvents() {
    syncActiveDocumentVariantControl();

    $("#wise-doc-preview-close").off("click").on("click", function () {
      closeDockedPreview();
    });

    $("#wise-doc-preview-refresh").off("click").on("click", function () {
      refreshPreviewNow("manual");
    });

    $("#wise-doc-preview-open-tab").off("click").on("click", function () {
      var url = buildPreviewUrl();
      if (url) window.open(url, "_blank");
    });

    $("#" + VARIANT_SELECT_ID).off("change").on("change", function () {
      setActiveDocumentVariant($(this).val() || "");

      if (!panelOpen) return;

      refreshPreviewNow("variant");
    });

    $("#wise-doc-preview-auto").off("change").on("change", function () {
      autoRefreshEnabled = $(this).prop("checked");
    });
  }

  function bindPreviewIframeLoad() {
    var frames = getPreviewFrames();

    for (var i = 0; i < frames.length; i++) {
      bindPreviewIframeLoadHandler(frames[i]);
    }
  }

  function setButtonActive(isActive) {
    var $btn = $("#" + TOGGLE_ID);
    if (!$btn.length) return;

    if (isActive) {
      $btn.addClass("ui-state-active");
      $btn.find(".ui-button-text").text("Hide Preview");
    } else {
      $btn.removeClass("ui-state-active");
      $btn.find(".ui-button-text").text("Preview");
    }
  }

  // =========================================================
  // PREVIEW URL
  // =========================================================
  function buildPreviewUrl() {
    var jobId = getCurrentJobId();
    var activeVariant = getActiveDocumentVariant();

    if (!activeVariant) {
      setStatus("No preview document renders are configured.");
      return "";
    }

    if (!jobId) {
      setStatus("Could not determine the current job ID.");
      return "";
    }

    clearStatus();

    var params = new URLSearchParams();
    params.set("main_id", jobId);

    var staticParamKeys = Object.keys(PREVIEW_CONFIG.staticParams);
    for (var k = 0; k < staticParamKeys.length; k++) {
      var key = staticParamKeys[k];
      params.set(key, PREVIEW_CONFIG.staticParams[key]);
    }

    var variantParamKeys = Object.keys(activeVariant.params || {});
    for (var v = 0; v < variantParamKeys.length; v++) {
      var variantKey = variantParamKeys[v];
      params.set(variantKey, activeVariant.params[variantKey]);
    }

    params.set("local", formatLocalDateTime(new Date()));
    params.set("tz", PREVIEW_CONFIG.timezone);

    var selectedIds = getSelectedSupplyingNodeIds();
    for (var i = 0; i < selectedIds.length; i++) {
      params.append("params[selected][]", selectedIds[i]);
    }

    params.set("_ts", String(Date.now()));

    return PREVIEW_CONFIG.mergeHtmlPath + "?" + params.toString();
  }

  function buildDocumentVariantOptionsHtml() {
    var variants = getDocumentVariants();
    var groups = {};
    var groupOrder = [];
    var html = [];

    for (var i = 0; i < variants.length; i++) {
      var variant = variants[i];
      var family = $.trim(String(variant.family || ""));

      if (!family) {
        html.push(buildDocumentVariantOptionHtml(variant));
        continue;
      }

      if (!groups[family]) {
        groups[family] = [];
        groupOrder.push(family);
      }

      groups[family].push(variant);
    }

    for (var j = 0; j < groupOrder.length; j++) {
      var groupName = groupOrder[j];
      html.push('<optgroup label="' + escapeHtml(groupName) + '">');

      var groupVariants = groups[groupName];
      for (var k = 0; k < groupVariants.length; k++) {
        html.push(buildDocumentVariantOptionHtml(groupVariants[k]));
      }

      html.push('</optgroup>');
    }

    return html.join("");
  }

  function buildDocumentVariantOptionHtml(variant) {
    if (!variant || !variant.key) return "";

    var isSelected = variant.key === activeDocumentVariantKey;
    return '<option value="' + escapeHtml(variant.key) + '"' + (isSelected ? ' selected' : '') + '>' +
      escapeHtml(String(variant.label || variant.key)) +
    '</option>';
  }

  function getDocumentVariants() {
    return PREVIEW_CONFIG.documentVariants || [];
  }

  function getDocumentVariantByKey(key) {
    var variants = getDocumentVariants();

    for (var i = 0; i < variants.length; i++) {
      if (variants[i].key === key) return variants[i];
    }

    return null;
  }

  function getDefaultDocumentVariantKey() {
    var configured = String(PREVIEW_CONFIG.defaultDocumentVariantKey || "");
    if (configured && getDocumentVariantByKey(configured)) return configured;

    var variants = getDocumentVariants();
    return variants.length ? String(variants[0].key || "") : "";
  }

  function getActiveDocumentVariant() {
    return getDocumentVariantByKey(activeDocumentVariantKey) ||
      getDocumentVariantByKey(getDefaultDocumentVariantKey()) ||
      null;
  }

  function setActiveDocumentVariant(key) {
    var next = getDocumentVariantByKey(key) || getActiveDocumentVariant();

    activeDocumentVariantKey = next ? next.key : getDefaultDocumentVariantKey();
    syncActiveDocumentVariantControl();
  }

  function syncActiveDocumentVariantControl() {
    var $select = $("#" + VARIANT_SELECT_ID);
    if (!$select.length) return;

    var selectedKey = activeDocumentVariantKey || getDefaultDocumentVariantKey();
    if ($select.find('option[value="' + selectedKey + '"]').length) {
      $select.val(selectedKey);
    } else if ($select.find("option").length) {
      $select.prop("selectedIndex", 0);
      activeDocumentVariantKey = String($select.val() || "");
    }
  }

  function getCurrentJobId() {
    var href = window.location.href || "";
    var m =
      href.match(/[?&](?:job|job_id|main_id|id)=(\d+)/i) ||
      href.match(/\/job\/(\d+)/i) ||
      href.match(/\/jobs\/(\d+)/i);

    if (m && m[1]) return m[1];

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
      if ($el.length) {
        var val = $.trim(String($el.val() || ""));
        if (/^\d+$/.test(val)) return val;
      }
    }

    if (window.main_id && /^\d+$/.test(String(window.main_id))) return String(window.main_id);
    if (window.job_id && /^\d+$/.test(String(window.job_id))) return String(window.job_id);

    return "";
  }

  function getSelectedSupplyingNodeIds() {
    var nodes = getSelectedSupplyingNodes();
    var ids = [];

    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id) ids.push(nodes[i].id);
    }

    return ids;
  }

  function getSelectedSupplyingNodes() {
    var nodes = [];
    var seen = {};

    collectSelectedSupplyingNodes($("#items_tab .jstree-clicked"), nodes, seen, true);

    if (!nodes.length) {
      collectSelectedSupplyingNodes(
        $("#items_tab li.jstree-node.jstree-clicked, #items_tab li.jstree-selected, #items_tab li[aria-selected='true']"),
        nodes,
        seen,
        false
      );
    }

    return nodes;
  }

  function collectSelectedSupplyingNodes($elements, out, seen, anchorMode) {
    $elements.each(function () {
      var $el = $(this);
      var $li = $el.is("li") ? $el : $el.closest("li");
      if (!$li.length) return;

      var meta = buildSelectedSupplyingNodeMeta($li, anchorMode ? $el : null);
      if (!meta || !meta.id || seen[meta.id]) return;

      seen[meta.id] = true;
      out.push(meta);
    });
  }

  function buildSelectedSupplyingNodeMeta($li, $anchorHint) {
    if (!$li || !$li.length) return null;

    var id = $.trim(String($li.attr("id") || ""));
    if (!id) return null;

    var text = getTreeNodeText($li, $anchorHint);
    var ancestorTexts = [];

    $li.parents("li.jstree-node").each(function () {
      var ancestorText = getTreeNodeText($(this));
      if (ancestorText) ancestorTexts.push(ancestorText);
    });

    ancestorTexts = uniqueTextValues(ancestorTexts);

    return {
      id: id,
      text: text,
      normalizedText: normalisePreviewMatchText(text),
      ancestorTexts: ancestorTexts,
      normalizedAncestorTexts: normaliseTextValues(ancestorTexts)
    };
  }

  function getTreeNodeText($li, $anchorHint) {
    var $anchor = getTreeNodeAnchor($li, $anchorHint);
    var text = $.trim(String(($anchor.length ? $anchor.text() : "") || ""));

    if (text) return normaliseWhitespace(text);

    var $clone = $li.clone();
    $clone.children("ul").remove();
    return normaliseWhitespace(String($clone.text() || ""));
  }

  function getTreeNodeAnchor($li, $anchorHint) {
    if ($anchorHint && $anchorHint.length && $anchorHint.is("a")) {
      return $anchorHint.first();
    }

    var $anchor = $li.children("a.jstree-anchor").first();
    if ($anchor.length) return $anchor;

    return $li.find("a.jstree-anchor").first();
  }

  function getSelectedNodeIdsKey() {
    return getSelectedSupplyingNodeIds().join("|");
  }

  function formatLocalDateTime(date) {
    function pad(n) { return String(n).padStart(2, "0"); }

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

  function capturePreviewScrollIntent(reason) {
    var nodes = getSelectedSupplyingNodes();

    return {
      reason: reason || "",
      nodes: nodes,
      selectedNodeIdsKey: buildNodeIdsKey(nodes)
    };
  }

  // =========================================================
  // REFRESH
  // =========================================================
  function refreshPreviewSoon(reason) {
    if (!panelOpen || !autoRefreshEnabled) return;

    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      refreshPreviewNow(reason || "debounced");
    }, REFRESH_DEBOUNCE_MS);
  }

  function refreshPreviewNow(reason) {
    if (!panelOpen) return;

    if (previewRefreshInFlight) {
      pendingRefreshReason = reason || "queued";
      return;
    }

    var url = buildPreviewUrl();
    if (!url) return;

    var iframe = getRefreshTargetIframe();
    if (!iframe) return;

    captureIframeScrollState(getActivePreviewIframe());

    var loadState = {
      loadId: nextPreviewLoadId++,
      reason: reason || "",
      scrollRatio: lastIframeScrollRatio,
      scrollIntent: capturePreviewScrollIntent(reason || "")
    };

    previewRefreshInFlight = true;
    iframe._wiseDocPreviewAwaitingSwap = true;
    iframe._wiseDocPreviewLoadState = loadState;
    clearAllPreviewFrameTimers();
    clearStatus();

    iframe.src = url;
  }

  function isDirectRefreshReason(reason) {
    return reason === "open" || reason === "manual" || reason === "variant";
  }

  function captureIframeScrollState(iframe) {
    if (!iframe) {
      lastIframeScrollRatio = 0;
      return;
    }

    try {
      var win = iframe.contentWindow;
      var doc = iframe.contentDocument;
      if (!win || !doc) {
        lastIframeScrollRatio = 0;
        return;
      }

      var scrollTop = win.scrollY || doc.documentElement.scrollTop || doc.body.scrollTop || 0;
      var maxScroll = Math.max(
        1,
        (doc.documentElement.scrollHeight || 0) - (win.innerHeight || 0)
      );

      lastIframeScrollRatio = scrollTop / maxScroll;
      if (!isFinite(lastIframeScrollRatio) || lastIframeScrollRatio < 0) {
        lastIframeScrollRatio = 0;
      }
    } catch (e) {
      lastIframeScrollRatio = 0;
    }
  }

  function applyPreviewFrameLayoutAndScroll(iframe, loadState) {
    if (!isCurrentPreviewLoadState(iframe, loadState)) return false;

    var doc = iframe.contentDocument;
    if (!doc) return false;

    ensurePreviewStyleTag(doc);
    fitPreviewToPane(iframe, doc);
    return applyPreviewScrollState(iframe, loadState);
  }

  function applyPreviewScrollState(iframe, loadState) {
    if (tryScrollPreviewToSelection(iframe, loadState && loadState.scrollIntent)) {
      return true;
    }

    applyPreviewScrollRatio(iframe, loadState ? loadState.scrollRatio : lastIframeScrollRatio);
    return false;
  }

  function applyPreviewScrollRatio(iframe, scrollRatio) {
    try {
      var win = iframe.contentWindow;
      var doc = iframe.contentDocument;
      if (!win || !doc) return;

      var safeRatio = Number(scrollRatio || 0);
      if (!isFinite(safeRatio) || safeRatio < 0) safeRatio = 0;

      var maxScroll = Math.max(
        0,
        (doc.documentElement.scrollHeight || 0) - (win.innerHeight || 0)
      );

      win.scrollTo(0, Math.round(maxScroll * safeRatio));
    } catch (e) {}
  }

  function tryScrollPreviewToSelection(iframe, scrollIntent) {
    var match = findPreviewSelectionMatch(iframe, scrollIntent);
    if (!match) return false;

    scrollPreviewIframeToTop(iframe, match.top);
    return true;
  }

  function alignActivePreviewToSelection() {
    var iframe = getActivePreviewIframe();
    if (!iframe || !iframe.contentDocument) return false;

    return tryScrollPreviewToSelection(iframe, capturePreviewScrollIntent("selection"));
  }

  function scrollPreviewIframeToTop(iframe, top) {
    try {
      var win = iframe.contentWindow;
      if (!win) return;

      var safeTop = Math.max(0, Math.round(Number(top || 0)));
      win.scrollTo(0, safeTop);
    } catch (e) {}
  }

  function findPreviewSelectionMatch(iframe, scrollIntent) {
    if (!scrollIntent || !scrollIntent.nodes || !scrollIntent.nodes.length) return null;

    var doc = iframe.contentDocument;
    if (!doc || !doc.body) return null;

    var directMatch = findPreviewDirectNodeMatch(doc, scrollIntent.nodes);
    if (directMatch) {
      return buildPreviewSelectionMatch(iframe, directMatch.element, directMatch.page, directMatch.node, directMatch.score);
    }

    var elements = getPreviewSearchElements(doc);
    var best = null;

    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      var elementText = normalisePreviewMatchText(getPreviewElementMatchText(element));
      if (!elementText) continue;

      var page = findPreviewPageContainer(element);
      var pageText = page ? normalisePreviewMatchText(getPreviewElementMatchText(page)) : "";

      for (var j = 0; j < scrollIntent.nodes.length; j++) {
        var node = scrollIntent.nodes[j];
        var score = scorePreviewElementMatch(element, elementText, pageText, node, j);
        if (score <= 0) continue;

        if (!best || score > best.score) {
          best = {
            element: element,
            page: page,
            node: node,
            score: score
          };
        }
      }
    }

    if (!best) return null;

    return buildPreviewSelectionMatch(iframe, best.element, best.page, best.node, best.score);
  }

  function findPreviewDirectNodeMatch(doc, nodes) {
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!node || !node.id) continue;

      var idMatch = doc.getElementById(node.id);
      if (idMatch) {
        return {
          element: idMatch,
          page: findPreviewPageContainer(idMatch),
          node: node,
          score: 1000
        };
      }

      if (doc.getElementsByName) {
        var nameMatches = doc.getElementsByName(node.id);
        if (nameMatches && nameMatches.length) {
          return {
            element: nameMatches[0],
            page: findPreviewPageContainer(nameMatches[0]),
            node: node,
            score: 950
          };
        }
      }
    }

    return null;
  }

  function getPreviewSearchElements(doc) {
    var selectors = PREVIEW_CONFIG.previewHeadingSelectors.concat(PREVIEW_CONFIG.previewTextSelectors);
    var query = selectors.join(",");
    if (!query) return [];

    var raw = doc.querySelectorAll(query);
    var out = [];
    var token = "wise-doc-preview-" + Date.now() + "-" + Math.floor(Math.random() * 100000);

    for (var i = 0; i < raw.length; i++) {
      var el = raw[i];
      if (!el || el.nodeType !== 1) continue;
      if (el._wiseDocPreviewSeenToken === token) continue;

      el._wiseDocPreviewSeenToken = token;

      var text = getPreviewElementMatchText(el);
      if (!text || text.length < 2) continue;

      if (!isHeadingLikePreviewElement(el)) {
        if (text.length > PREVIEW_CONFIG.previewMaxMatchTextLength) continue;
        if ((el.children && el.children.length > 8) || (el.childElementCount && el.childElementCount > 8)) continue;
      }

      out.push(el);
    }

    return out;
  }

  function getPreviewElementMatchText(el) {
    if (!el) return "";
    return normaliseWhitespace(String(el.innerText || el.textContent || ""));
  }

  function scorePreviewElementMatch(element, elementText, pageText, node, nodeIndex) {
    if (!node || !node.normalizedText || !elementText) return 0;

    var score = 0;
    var nodeText = node.normalizedText;

    if (elementText === nodeText) {
      score = 420;
    } else if (elementText.indexOf(nodeText) === 0 && nodeText.length >= 3) {
      score = 320;
    } else if (nodeText.length >= 4 && elementText.indexOf(nodeText) >= 0) {
      score = 260;
    } else if (elementText.length >= 8 && nodeText.indexOf(elementText) >= 0) {
      score = 180;
    } else {
      return 0;
    }

    if (isHeadingLikePreviewElement(element)) {
      score += 50;
    }

    if (pageText && node.normalizedAncestorTexts && node.normalizedAncestorTexts.length) {
      for (var i = 0; i < node.normalizedAncestorTexts.length && i < 2; i++) {
        if (pageText.indexOf(node.normalizedAncestorTexts[i]) >= 0) {
          score += 25 - (i * 10);
        }
      }
    }

    score -= nodeIndex * 20;

    if (elementText.length > nodeText.length + 80) {
      score -= 25;
    }

    return score;
  }

  function buildPreviewSelectionMatch(iframe, element, page, node, score) {
    var top = getPreviewElementScrollTop(iframe, page || element);

    if (!page) {
      top = Math.max(0, top - 24);
    } else {
      top = Math.max(0, top - 8);
    }

    return {
      element: element,
      page: page,
      node: node,
      top: top,
      score: score || 0
    };
  }

  function getPreviewElementScrollTop(iframe, element) {
    try {
      var win = iframe.contentWindow;
      if (!win || !element || !element.getBoundingClientRect) return 0;

      var rect = element.getBoundingClientRect();
      var currentTop = win.scrollY || iframe.contentDocument.documentElement.scrollTop || iframe.contentDocument.body.scrollTop || 0;
      return currentTop + rect.top;
    } catch (e) {
      return 0;
    }
  }

  function ensurePreviewStyleTag(doc) {
    if (doc.getElementById("wise-preview-fit-style")) return;

    var style = doc.createElement("style");
    style.id = "wise-preview-fit-style";
    style.type = "text/css";
    style.textContent =
      "html, body {" +
        "margin:0 !important;" +
        "padding:0 !important;" +
        "overflow-x:hidden !important;" +
        "scroll-behavior:auto !important;" +
        "background:#e9eaec !important;" +
      "}" +
      "body {" +
        "margin-left:auto !important;" +
        "margin-right:auto !important;" +
        "transform-origin:top left !important;" +
      "}" +
      "img, svg, canvas {" +
        "max-width:none !important;" +
      "}";

    (doc.head || doc.documentElement).appendChild(style);
  }

  function fitPreviewToPane(iframe, doc) {
    var body = doc.body;
    var html = doc.documentElement;
    if (!body || !html) return;

    body.style.zoom = "";
    body.style.transform = "";
    body.style.width = "";
    body.style.marginLeft = "auto";
    body.style.marginRight = "auto";

    var iframeWidth = iframe.clientWidth || 0;
    if (!iframeWidth) return;

    var sourceWidth = getPreviewSourceWidth(doc, body, html);
    if (!sourceWidth) return;

    var availableWidth = Math.max(100, iframeWidth - 24);
    var scale = Math.min(1, availableWidth / sourceWidth);

    if (!isFinite(scale) || scale <= 0) scale = 1;

    if ("zoom" in body.style) {
      body.style.zoom = String(scale);
    } else {
      body.style.transform = "scale(" + scale + ")";
      body.style.transformOrigin = "top left";
      body.style.width = (100 / scale) + "%";
    }
  }

  function getPreviewSourceWidth(doc, body, html) {
    var selectors = [
      ".page",
      ".print-page",
      ".doc-page",
      ".paper",
      ".sheet",
      "[data-page]",
      "[style*='210mm']",
      "[style*='297mm']",
      "[style*='2480px']",
      "[style*='1240px']",
      "[style*='1123px']"
    ];

    var best = 0;

    for (var i = 0; i < selectors.length; i++) {
      var nodes = doc.querySelectorAll(selectors[i]);
      for (var j = 0; j < nodes.length && j < 6; j++) {
        var el = nodes[j];
        var w = getElementNaturalWidth(el);
        if (w > best) best = w;
      }
      if (best) break;
    }

    if (!best) {
      best = Math.max(
        body.scrollWidth || 0,
        html.scrollWidth || 0,
        body.offsetWidth || 0,
        html.offsetWidth || 0
      );
    }

    return best;
  }

  function getElementNaturalWidth(el) {
    if (!el) return 0;

    return Math.max(
      el.scrollWidth || 0,
      el.offsetWidth || 0,
      Math.round((el.getBoundingClientRect && el.getBoundingClientRect().width) || 0)
    );
  }

  function getPreviewFrames() {
    var ids = [IFRAME_PRIMARY_ID, IFRAME_SECONDARY_ID];
    var frames = [];

    for (var i = 0; i < ids.length; i++) {
      var iframe = document.getElementById(ids[i]);
      if (iframe) frames.push(iframe);
    }

    return frames;
  }

  function clearPreviewFrameTimers(iframe) {
    if (!iframe) return;

    var timers = iframe._wiseDocPreviewTimers || [];
    for (var i = 0; i < timers.length; i++) {
      clearTimeout(timers[i]);
    }

    iframe._wiseDocPreviewTimers = [];
  }

  function clearAllPreviewFrameTimers() {
    var frames = getPreviewFrames();

    for (var i = 0; i < frames.length; i++) {
      clearPreviewFrameTimers(frames[i]);
    }
  }

  function queuePreviewFrameTimer(iframe, fn, delay) {
    if (!iframe) return 0;

    if (!iframe._wiseDocPreviewTimers) {
      iframe._wiseDocPreviewTimers = [];
    }

    var timerId = setTimeout(function () {
      removePreviewFrameTimer(iframe, timerId);
      fn();
    }, delay);

    iframe._wiseDocPreviewTimers.push(timerId);
    return timerId;
  }

  function removePreviewFrameTimer(iframe, timerId) {
    if (!iframe || !iframe._wiseDocPreviewTimers) return;

    var next = [];
    for (var i = 0; i < iframe._wiseDocPreviewTimers.length; i++) {
      if (iframe._wiseDocPreviewTimers[i] !== timerId) {
        next.push(iframe._wiseDocPreviewTimers[i]);
      }
    }

    iframe._wiseDocPreviewTimers = next;
  }

  function resetPreviewFrameState() {
    var frames = getPreviewFrames();

    for (var i = 0; i < frames.length; i++) {
      clearPreviewFrameTimers(frames[i]);
      frames[i]._wiseDocPreviewAwaitingSwap = false;
      frames[i]._wiseDocPreviewLoadState = null;
    }
  }

  function getActivePreviewIframe() {
    var iframe = document.getElementById(activePreviewFrameId);
    if (iframe) return iframe;

    var frames = getPreviewFrames();
    return frames.length ? frames[0] : null;
  }

  function getRefreshTargetIframe() {
    var frames = getPreviewFrames();
    if (!frames.length) return null;

    if (!previewHasLoaded) {
      return getActivePreviewIframe() || frames[0];
    }

    var active = getActivePreviewIframe();

    for (var i = 0; i < frames.length; i++) {
      if (!active || frames[i].id !== active.id) {
        return frames[i];
      }
    }

    return active || frames[0];
  }

  function bindPreviewIframeLoadHandler(iframe) {
    if (!iframe || iframe._wiseDocPreviewBound) return;

    iframe.addEventListener("load", function () {
      if (!iframe._wiseDocPreviewAwaitingSwap) return;

      var loadState = iframe._wiseDocPreviewLoadState;
      if (!loadState) return;

      try {
        beginPreviewFrameActivation(iframe, loadState);
      } catch (err) {
        try { console.warn("[WiseHireHop] iframe load patch failed", err); } catch (e) {}
        completePreviewRefreshCycle(loadState);
      }
    });

    iframe._wiseDocPreviewBound = true;
  }

  function setActivePreviewIframe(iframe) {
    var frames = getPreviewFrames();
    if (!iframe) return;

    for (var i = 0; i < frames.length; i++) {
      var isActive = frames[i].id === iframe.id;
      frames[i].classList.toggle("is-active", isActive);
      frames[i].classList.toggle("is-buffer", !isActive);
    }

    activePreviewFrameId = iframe.id;
    previewHasLoaded = true;
  }

  function beginPreviewFrameActivation(iframe, loadState) {
    if (!isCurrentPreviewLoadState(iframe, loadState)) return;

    clearPreviewFrameTimers(iframe);
    applyPreviewFrameLayoutAndScroll(iframe, loadState);

    queuePreviewFrameTimer(iframe, function () {
      if (!isCurrentPreviewLoadState(iframe, loadState)) return;

      applyPreviewFrameLayoutAndScroll(iframe, loadState);
      setActivePreviewIframe(iframe);
      completePreviewRefreshCycle(loadState);
    }, PREVIEW_CONFIG.previewLoadActivateDelayMs);

    var followUpDelays = PREVIEW_CONFIG.previewLoadFollowUpDelaysMs || [];
    for (var i = 0; i < followUpDelays.length; i++) {
      queuePreviewFrameTimer(iframe, createPreviewFollowUpHandler(iframe, loadState), followUpDelays[i]);
    }
  }

  function createPreviewFollowUpHandler(iframe, loadState) {
    return function () {
      if (!isCurrentPreviewLoadState(iframe, loadState)) return;
      applyPreviewFrameLayoutAndScroll(iframe, loadState);
    };
  }

  function completePreviewRefreshCycle(loadState) {
    previewRefreshInFlight = false;

    var frames = getPreviewFrames();
    for (var i = 0; i < frames.length; i++) {
      if (!loadState || !frames[i]._wiseDocPreviewLoadState) continue;
      if (frames[i]._wiseDocPreviewLoadState.loadId === loadState.loadId) {
        frames[i]._wiseDocPreviewAwaitingSwap = false;
      }
    }

    if (pendingRefreshReason) {
      var queued = pendingRefreshReason;
      pendingRefreshReason = null;
      if (isDirectRefreshReason(queued)) {
        refreshPreviewNow(queued);
      } else {
        refreshPreviewSoon(queued);
      }
    }
  }

  function isCurrentPreviewLoadState(iframe, loadState) {
    return !!(
      iframe &&
      loadState &&
      iframe._wiseDocPreviewLoadState &&
      iframe._wiseDocPreviewLoadState.loadId === loadState.loadId
    );
  }

  function findPreviewPageContainer(element) {
    if (!element) return null;

    var selector = PREVIEW_CONFIG.previewPageSelectors.join(",");
    if (!selector) return null;

    if (element.closest) {
      return element.closest(selector);
    }

    var node = element;
    while (node && node.nodeType === 1) {
      if ($(node).is(selector)) return node;
      node = node.parentNode;
    }

    return null;
  }

  function isHeadingLikePreviewElement(element) {
    if (!element || !element.tagName) return false;

    var tag = String(element.tagName || "").toLowerCase();
    if (/^h[1-6]$/.test(tag)) return true;
    if (tag === "strong" || tag === "b") return true;
    if (String(element.getAttribute("role") || "").toLowerCase() === "heading") return true;

    var className = " " + String(element.className || "").toLowerCase() + " ";
    return (
      className.indexOf(" title ") >= 0 ||
      className.indexOf(" heading ") >= 0 ||
      className.indexOf(" page-title ") >= 0 ||
      className.indexOf(" section-title ") >= 0 ||
      className.indexOf(" dept-title ") >= 0
    );
  }

  function buildNodeIdsKey(nodes) {
    var ids = [];

    for (var i = 0; i < (nodes || []).length; i++) {
      if (nodes[i] && nodes[i].id) ids.push(nodes[i].id);
    }

    return ids.join("|");
  }

  function uniqueTextValues(values) {
    var seen = {};
    var out = [];

    for (var i = 0; i < (values || []).length; i++) {
      var value = normaliseWhitespace(String(values[i] || ""));
      if (!value || seen[value]) continue;

      seen[value] = true;
      out.push(value);
    }

    return out;
  }

  function normaliseTextValues(values) {
    var out = [];

    for (var i = 0; i < (values || []).length; i++) {
      var value = normalisePreviewMatchText(values[i]);
      if (value) out.push(value);
    }

    return uniqueTextValues(out);
  }

  function normalisePreviewMatchText(value) {
    return normaliseWhitespace(String(value || ""))
      .replace(/^section\s*:\s*/i, "")
      .replace(/^dept\s*:\s*/i, "")
      .toLowerCase();
  }

  function normaliseWhitespace(value) {
    return $.trim(String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " "));
  }

  // =========================================================
  // AJAX / FETCH HOOKS
  // =========================================================
  function installAjaxHooks() {
    if (window.__wiseDocPreviewXhrInstalled) return;
    window.__wiseDocPreviewXhrInstalled = true;

    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this._wiseDocPreviewMeta = {
        method: method,
        url: url
      };
      return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
      var xhr = this;

      xhr.addEventListener("load", function () {
        try {
          var meta = xhr._wiseDocPreviewMeta || {};
          var url = String(meta.url || "");

          if (shouldTriggerPreviewRefresh(url, xhr.status)) {
            refreshPreviewSoon("xhr");
          }
        } catch (e) {}
      });

      return origSend.apply(this, arguments);
    };
  }

  function installFetchHooks() {
    if (!window.fetch || window.__wiseDocPreviewFetchInstalled) return;
    window.__wiseDocPreviewFetchInstalled = true;

    var origFetch = window.fetch;

    window.fetch = function () {
      var args = arguments;
      var url = String(args[0] || "");

      return origFetch.apply(window, args).then(function (response) {
        try {
          if (shouldTriggerPreviewRefresh(url, response && response.status)) {
            refreshPreviewSoon("fetch");
          }
        } catch (e) {}
        return response;
      });
    };
  }

  function shouldTriggerPreviewRefresh(url, status) {
    if (status && Number(status) >= 400) return false;

    url = String(url || "");

    for (var i = 0; i < PREVIEW_CONFIG.refreshUrlPatterns.length; i++) {
      if (PREVIEW_CONFIG.refreshUrlPatterns[i].test(url)) {
        return true;
      }
    }

    return false;
  }

  // =========================================================
  // TARGETED DOM OBSERVER
  // =========================================================
  function installTargetedDomObserver() {
    removeTargetedDomObserver();

    var target =
      $("#items_tab .items_tree").get(0) ||
      $("#items_tab .items_tree_container").get(0) ||
      $("#items_tab .entire_tree_container").get(0);

    if (!target) return;

    domObserver = new MutationObserver(function (mutations) {
      if (!panelOpen) return;

      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];

        if (m.type === "childList") {
          if (mutationTouchesTreeNodes(m)) {
            lastSelectedNodeIdsKey = getSelectedNodeIdsKey();
            if (!autoRefreshEnabled) continue;
            refreshPreviewSoon("dom-child");
            return;
          }
        }

        if (m.type === "attributes") {
          if (!isSelectionMutation(m.target, m.attributeName)) continue;

          var nextSelectionKey = getSelectedNodeIdsKey();
          if (nextSelectionKey === lastSelectedNodeIdsKey) continue;

          lastSelectedNodeIdsKey = nextSelectionKey;
          if (!autoRefreshEnabled) {
            alignActivePreviewToSelection();
            return;
          }
          refreshPreviewSoon("selection");
          return;
        }
      }
    });

    domObserver.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: PREVIEW_CONFIG.selectionAttributeFilter
    });

    lastSelectedNodeIdsKey = getSelectedNodeIdsKey();
  }

  function removeTargetedDomObserver() {
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
  }

  function mutationTouchesTreeNodes(mutation) {
    return nodeListTouchesTree(mutation.addedNodes) || nodeListTouchesTree(mutation.removedNodes);
  }

  function nodeListTouchesTree(nodes) {
    if (!nodes || !nodes.length) return false;

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!node || node.nodeType !== 1) continue;

      var $node = $(node);
      if ($node.is("li.jstree-node, a.jstree-anchor")) return true;
      if ($node.find("li.jstree-node, a.jstree-anchor").length) return true;
    }

    return false;
  }

  function isSelectionMutation(target, attributeName) {
    if (!target || target.nodeType !== 1) return false;
    if (attributeName && attributeName !== "class" && attributeName !== "aria-selected") return false;

    var $target = $(target);
    return (
      $target.is("li.jstree-node, li[aria-selected], a.jstree-anchor, .jstree-clicked") ||
      !!$target.closest("li.jstree-node").length
    );
  }

  // =========================================================
  // STATUS
  // =========================================================
  function setStatus(msg) {
    $("#wise-doc-preview-status").text(msg).show();
  }

  function clearStatus() {
    $("#wise-doc-preview-status").hide().text("");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

})();
