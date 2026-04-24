(function () {
  "use strict";

  try { console.warn("[WiseHireHop] docked doc preview loaded - v2026-04-24.04"); } catch (e) {}

  var $ = window.jQuery;
  if (!$) return;

  var TOGGLE_ID = "wise-doc-preview-toggle";
  var OUTER_WRAP_ID = "wise-doc-preview-workspace";
  var LEFT_PANE_ID = "wise-doc-preview-left-pane";
  var RIGHT_PANE_ID = "wise-doc-preview-right-pane";
  var PANEL_ID = "wise-doc-preview-panel";
  var IFRAME_ID = "wise-doc-preview-iframe";

  var MIN_PREVIEW_WIDTH = 360;
  var REFRESH_DEBOUNCE_MS = 1500;

  var panelOpen = false;
  var autoRefreshEnabled = true;
  var refreshTimer = null;
  var domObserver = null;

  var lastIframeScrollTop = 0;
  var previewRefreshInFlight = false;
  var pendingRefreshReason = null;

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
      '  height:44px;',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:space-between;',
      '  gap:10px;',
      '  padding:0 10px 0 12px;',
      '  border-bottom:1px solid #e3e3e3;',
      '  background:#f7f7f7;',
      '  flex:0 0 44px;',
      '}',
      '#' + PANEL_ID + ' .wise-doc-preview-toolbar-right {',
      '  display:flex;',
      '  align-items:center;',
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
      '#' + IFRAME_ID + ' {',
      '  display:block;',
      '  width:100%;',
      '  flex:1 1 auto;',
      '  min-height:640px;',
      '  border:0;',
      '  background:#fff;',
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
    refreshPreviewNow("open");
    installTargetedDomObserver();
  }

  function closeDockedPreview() {
    panelOpen = false;
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
          '<div style="font-size:13px; font-weight:600;">Document Preview</div>' +
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
        '<iframe id="' + IFRAME_ID + '"></iframe>' +
      '</div>'
    );
  }

  function bindPreviewPanelEvents() {
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

    $("#wise-doc-preview-auto").off("change").on("change", function () {
      autoRefreshEnabled = $(this).prop("checked");
    });
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
    if (!jobId) {
      setStatus("Could not determine the current job ID.");
      return "";
    }

    clearStatus();

    var params = new URLSearchParams();
    params.set("main_id", jobId);
    params.set("type", "1");
    params.set("sub_id", "0");
    params.set("sub_type", "16");
    params.set("doc", "166");
    params.set("local", formatLocalDateTime(new Date()));
    params.set("tz", "Europe/London");
    params.set("format", "html");

    var selectedIds = getSelectedSupplyingNodeIds();
    for (var i = 0; i < selectedIds.length; i++) {
      params.append("params[selected][]", selectedIds[i]);
    }

    params.set("stn", "0");
    params.set("or", "0");
    params.set("nums", "0");
    params.set("engine", "1");
    params.set("_ts", String(Date.now()));

    return "/modules/docmaker/merge-html.php?" + params.toString();
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
    var ids = [];

    $("#items_tab .jstree-clicked").each(function () {
      var $anchor = $(this);
      var $li = $anchor.closest("li");

      if ($li.length) {
        var id = $.trim(String($li.attr("id") || ""));
        if (id) ids.push(id);
      }
    });

    if (!ids.length) {
      $("#items_tab li.jstree-node.jstree-clicked, #items_tab li.jstree-selected, #items_tab li[aria-selected='true']").each(function () {
        var id = $.trim(String($(this).attr("id") || ""));
        if (id) ids.push(id);
      });
    }

    var seen = {};
    var out = [];

    for (var i = 0; i < ids.length; i++) {
      if (!seen[ids[i]]) {
        seen[ids[i]] = true;
        out.push(ids[i]);
      }
    }

    return out;
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

    var iframe = document.getElementById(IFRAME_ID);
    if (!iframe) return;

    previewRefreshInFlight = true;
    captureIframeScroll();

    fetch(url, {
      credentials: "same-origin"
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Preview fetch failed: " + response.status);
        }
        return response.text();
      })
      .then(function (html) {
        var patchedHtml = patchPreviewHtml(html);

        var doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(patchedHtml);
        doc.close();

        waitForIframeReadyAndRestoreScroll(iframe, function () {
          previewRefreshInFlight = false;

          if (pendingRefreshReason) {
            var queued = pendingRefreshReason;
            pendingRefreshReason = null;
            refreshPreviewSoon(queued);
          }
        });
      })
      .catch(function (err) {
        previewRefreshInFlight = false;
        setStatus("Preview failed to refresh.");
        try { console.warn("[WiseHireHop] preview refresh failed", err); } catch (e) {}
      });
  }

  function captureIframeScroll() {
    var iframe = document.getElementById(IFRAME_ID);
    if (!iframe) return;

    try {
      var win = iframe.contentWindow;
      if (win) {
        lastIframeScrollTop = win.scrollY || win.pageYOffset || 0;
        return;
      }
    } catch (e) {}

    try {
      var doc = iframe.contentDocument;
      if (doc) {
        lastIframeScrollTop =
          (doc.documentElement && doc.documentElement.scrollTop) ||
          (doc.body && doc.body.scrollTop) ||
          0;
      }
    } catch (e) {}
  }

  function waitForIframeReadyAndRestoreScroll(iframe, done) {
    var attempts = 0;
    var maxAttempts = 60;

    function tryRestore() {
      attempts++;

      try {
        var doc = iframe.contentDocument;
        var win = iframe.contentWindow;

        if (doc && doc.body) {
          if (win && typeof win.scrollTo === "function") {
            win.scrollTo(0, lastIframeScrollTop || 0);
          } else {
            if (doc.documentElement) doc.documentElement.scrollTop = lastIframeScrollTop || 0;
            if (doc.body) doc.body.scrollTop = lastIframeScrollTop || 0;
          }

          if (typeof done === "function") done();
          return;
        }
      } catch (e) {}

      if (attempts < maxAttempts) {
        setTimeout(tryRestore, 50);
      } else {
        if (typeof done === "function") done();
      }
    }

    setTimeout(tryRestore, 30);
  }

  function patchPreviewHtml(html) {
    var injectedCss =
      '<style id="wise-preview-fit-style">' +
        'html, body {' +
          'margin: 0 !important;' +
          'padding: 0 !important;' +
          'width: 100% !important;' +
          'overflow-x: hidden !important;' +
          'background: #e9eaec !important;' +
        '}' +
        'body {' +
          'box-sizing: border-box !important;' +
        '}' +
        '.page, .sheet, .print-page, .paper, .doc-page, [class*="page"] {' +
          'box-sizing: border-box !important;' +
          'width: 100% !important;' +
          'max-width: 100% !important;' +
          'margin-left: auto !important;' +
          'margin-right: auto !important;' +
        '}' +
        'img, svg, canvas {' +
          'max-width: 100% !important;' +
          'height: auto !important;' +
        '}' +
        'table {' +
          'max-width: 100% !important;' +
        '}' +
        '[style*="width: 210mm"], [style*="width:210mm"], ' +
        '[style*="width: 297mm"], [style*="width:297mm"], ' +
        '[style*="width: 2480px"], [style*="width:2480px"], ' +
        '[style*="width: 1240px"], [style*="width:1240px"], ' +
        '[style*="width: 1123px"], [style*="width:1123px"] {' +
          'width: 100% !important;' +
          'max-width: 100% !important;' +
        '}' +
      '</style>';

    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, "<head$1>" + injectedCss);
    }

    if (/<body[^>]*>/i.test(html)) {
      return html.replace(/<body([^>]*)>/i, "<body$1>" + injectedCss);
    }

    return injectedCss + html;
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

    return (
      /\/php_functions\/items_save\.php/i.test(url) ||
      /\/php_functions\/items_delete/i.test(url) ||
      /\/php_functions\/items_sort/i.test(url) ||
      /\/php_functions\/items_move/i.test(url) ||
      /\/php_functions\/items_copy/i.test(url) ||
      /\/php_functions\/items_duplicate/i.test(url) ||
      /\/php_functions\/items_load/i.test(url) ||
      /\/php_functions\/item/i.test(url)
    );
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
      if (!panelOpen || !autoRefreshEnabled) return;

      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];

        if (m.type === "childList") {
          if ((m.addedNodes && m.addedNodes.length) || (m.removedNodes && m.removedNodes.length)) {
            refreshPreviewSoon("dom-child");
            return;
          }
        }

        if (m.type === "attributes") {
          refreshPreviewSoon("dom-attr");
          return;
        }
      }
    });

    domObserver.observe(target, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  function removeTargetedDomObserver() {
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
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

})();
