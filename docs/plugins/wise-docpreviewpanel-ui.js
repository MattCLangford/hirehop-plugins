(function () {
  "use strict";

  try { console.warn("[WiseHireHop] doc preview panel loaded - v2026-04-24.01"); } catch (e) {}

  var $ = window.jQuery;
  if (!$) return;

  var PANEL_ID = "wise-doc-preview-panel";
  var TOGGLE_ID = "wise-doc-preview-toggle";
  var IFRAME_ID = "wise-doc-preview-iframe";
  var RESIZER_ID = "wise-doc-preview-resizer";

  var PANEL_WIDTH_KEY = "wiseDocPreviewWidth";
  var PANEL_OPEN_KEY = "wiseDocPreviewOpen";
  var AUTO_REFRESH_KEY = "wiseDocPreviewAutoRefresh";

  var DEFAULT_WIDTH = 720;
  var MIN_WIDTH = 420;
  var MAX_WIDTH_RATIO = 0.8;
  var REFRESH_DEBOUNCE_MS = 1200;

  var refreshTimer = null;
  var panelOpen = false;
  var autoRefreshEnabled = getStoredBool(AUTO_REFRESH_KEY, true);
  var panelWidth = getStoredInt(PANEL_WIDTH_KEY, DEFAULT_WIDTH);

  init();

  function init() {
    ensurePreviewPanel();
    tryAddPreviewButton();
    installAjaxHooks();
    installFetchHooks();
    installDomFallbackHooks();

    if (getStoredBool(PANEL_OPEN_KEY, false)) {
      openPanel();
    }
  }

  // =========================================================
  // UI SETUP
  // =========================================================
  function ensurePreviewPanel() {
    if ($("#" + PANEL_ID).length) return;

    var html =
      '<div id="' + PANEL_ID + '" style="' +
        'display:none;' +
        'position:fixed;' +
        'top:0;' +
        'right:0;' +
        'height:100vh;' +
        'width:' + panelWidth + 'px;' +
        'min-width:' + MIN_WIDTH + 'px;' +
        'background:#ffffff;' +
        'border-left:1px solid #d9d9d9;' +
        'box-shadow:-8px 0 24px rgba(0,0,0,0.14);' +
        'z-index:999999;' +
      '">' +

        '<div id="' + RESIZER_ID + '" style="' +
          'position:absolute;' +
          'left:0;' +
          'top:0;' +
          'width:8px;' +
          'height:100%;' +
          'cursor:col-resize;' +
          'background:transparent;' +
        '"></div>' +

        '<div style="' +
          'height:52px;' +
          'display:flex;' +
          'align-items:center;' +
          'justify-content:space-between;' +
          'gap:10px;' +
          'padding:0 14px 0 18px;' +
          'border-bottom:1px solid #e3e3e3;' +
          'background:#f7f7f7;' +
        '">' +
          '<div style="font-size:14px; font-weight:600;">Document Preview</div>' +
          '<div style="display:flex; align-items:center; gap:10px;">' +
            '<label style="display:flex; align-items:center; gap:6px; font-size:12px; white-space:nowrap;">' +
              '<input type="checkbox" id="wise-doc-preview-auto"' + (autoRefreshEnabled ? ' checked' : '') + '> Auto-refresh' +
            '</label>' +
            '<button type="button" id="wise-doc-preview-refresh">Refresh</button>' +
            '<button type="button" id="wise-doc-preview-open-tab">Open</button>' +
            '<button type="button" id="wise-doc-preview-close">Close</button>' +
          '</div>' +
        '</div>' +

        '<div id="wise-doc-preview-status" style="' +
          'display:none;' +
          'padding:6px 12px;' +
          'font-size:12px;' +
          'border-bottom:1px solid #ececec;' +
          'background:#fff8e1;' +
          'color:#6b5a00;' +
        '"></div>' +

        '<iframe id="' + IFRAME_ID + '" style="' +
          'display:block;' +
          'width:100%;' +
          'height:calc(100vh - 52px);' +
          'border:0;' +
          'background:#fff;' +
        '"></iframe>' +
      '</div>';

    $("body").append(html);

    $("#wise-doc-preview-close").on("click", closePanel);
    $("#wise-doc-preview-refresh").on("click", function () {
      refreshPreviewNow(true);
    });

    $("#wise-doc-preview-open-tab").on("click", function () {
      var url = buildPreviewUrl();
      if (url) {
        window.open(url, "_blank");
      }
    });

    $("#wise-doc-preview-auto").on("change", function () {
      autoRefreshEnabled = $(this).prop("checked");
      localStorage.setItem(AUTO_REFRESH_KEY, autoRefreshEnabled ? "1" : "0");
    });

    installResizer();
  }

  function tryAddPreviewButton() {
    if ($("#" + TOGGLE_ID).length) return;

    var $host = findToolbarHost();
    if (!$host.length) {
      setTimeout(tryAddPreviewButton, 1000);
      return;
    }

    var $btn = $(
      '<button id="' + TOGGLE_ID + '" type="button" style="margin-left:8px;">Preview Doc</button>'
    );

    $btn.on("click", function () {
      if (panelOpen) {
        closePanel();
      } else {
        openPanel();
      }
    });

    $host.append($btn);
  }

  function findToolbarHost() {
    var selectors = [
      ".hh_buttons",
      ".page_buttons",
      ".ui-buttonset",
      ".actions",
      ".header_buttons",
      ".top_buttons"
    ];

    for (var i = 0; i < selectors.length; i++) {
      var $el = $(selectors[i]).first();
      if ($el.length) return $el;
    }

    // Fallback: place near visible page controls if none matched
    var $fallback = $("button:visible, a:visible").filter(function () {
      var txt = $.trim($(this).text()).toLowerCase();
      return txt === "refresh" || txt === "save" || txt === "print";
    }).first().parent();

    return $fallback.length ? $fallback : $();
  }

  function openPanel() {
    ensurePreviewPanel();

    panelOpen = true;
    localStorage.setItem(PANEL_OPEN_KEY, "1");

    $("#" + PANEL_ID).show();
    applyPanelWidth(panelWidth);
    refreshPreviewNow(false);
  }

  function closePanel() {
    panelOpen = false;
    localStorage.setItem(PANEL_OPEN_KEY, "0");
    $("#" + PANEL_ID).hide();
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
    params.set("stn", "0");
    params.set("or", "0");
    params.set("nums", "0");
    params.set("engine", "1");
    params.set("_ts", String(Date.now()));

    return "/modules/docmaker/merge-html.php?" + params.toString();
  }

  function getCurrentJobId() {
    // First try URL
    var href = window.location.href || "";
    var m =
      href.match(/[?&](?:job|job_id|main_id)=(\d+)/i) ||
      href.match(/\/job\/(\d+)/i) ||
      href.match(/\/jobs\/(\d+)/i);

    if (m && m[1]) return m[1];

    // Then common hidden/input fields
    var selectors = [
      'input[name="job"]',
      'input[name="job_id"]',
      'input[name="main_id"]',
      'input[name="id"]'
    ];

    for (var i = 0; i < selectors.length; i++) {
      var $el = $(selectors[i]).first();
      if ($el.length) {
        var val = $.trim(String($el.val() || ""));
        if (/^\d+$/.test(val)) return val;
      }
    }

    // Last fallback: inspect page for numeric hints
    var bodyHtml = document.body ? document.body.innerHTML : "";
    var match = bodyHtml.match(/name=["']job["'][^>]*value=["'](\d+)["']/i);
    if (match && match[1]) return match[1];

    return "";
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
      refreshPreviewNow(false, reason);
    }, REFRESH_DEBOUNCE_MS);
  }

  function refreshPreviewNow(manual, reason) {
    if (!panelOpen) return;

    var url = buildPreviewUrl();
    if (!url) return;

    var $iframe = $("#" + IFRAME_ID);
    if (!$iframe.length) return;

    clearStatus();
    $iframe.attr("src", url);
  }

  // =========================================================
  // NETWORK / SAVE HOOKS
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
      /\/php_functions\/items_duplicate/i.test(url)
    );
  }

  // =========================================================
  // FALLBACK DOM WATCH
  // =========================================================
  function installDomFallbackHooks() {
    if (window.__wiseDocPreviewDomInstalled) return;
    window.__wiseDocPreviewDomInstalled = true;

    var target = document.body;
    if (!target) return;

    var obs = new MutationObserver(function (mutations) {
      if (!panelOpen || !autoRefreshEnabled) return;

      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.addedNodes && m.addedNodes.length) {
          refreshPreviewSoon("dom");
          return;
        }
        if (m.removedNodes && m.removedNodes.length) {
          refreshPreviewSoon("dom");
          return;
        }
      }
    });

    obs.observe(target, {
      childList: true,
      subtree: true
    });
  }

  // =========================================================
  // PANEL RESIZE
  // =========================================================
  function installResizer() {
    var $resizer = $("#" + RESIZER_ID);
    if (!$resizer.length) return;

    var isDragging = false;

    $resizer.on("mousedown", function (e) {
      isDragging = true;
      e.preventDefault();

      $(document).on("mousemove.wiseDocPreviewResize", function (ev) {
        if (!isDragging) return;

        var viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1600;
        var maxWidth = Math.floor(viewportWidth * MAX_WIDTH_RATIO);
        var newWidth = viewportWidth - ev.clientX;

        newWidth = Math.max(MIN_WIDTH, newWidth);
        newWidth = Math.min(maxWidth, newWidth);

        applyPanelWidth(newWidth);
      });

      $(document).on("mouseup.wiseDocPreviewResize", function () {
        isDragging = false;
        $(document).off(".wiseDocPreviewResize");
      });
    });
  }

  function applyPanelWidth(width) {
    panelWidth = width;
    $("#" + PANEL_ID).css("width", width + "px");
    localStorage.setItem(PANEL_WIDTH_KEY, String(width));
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

  // =========================================================
  // STORAGE HELPERS
  // =========================================================
  function getStoredBool(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch (e) {}
    return fallback;
  }

  function getStoredInt(key, fallback) {
    try {
      var raw = parseInt(localStorage.getItem(key), 10);
      if (!isNaN(raw)) return raw;
    } catch (e) {}
    return fallback;
  }
})();
