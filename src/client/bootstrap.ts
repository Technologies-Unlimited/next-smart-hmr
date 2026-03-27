/**
 * Returns an inline JavaScript string that:
 * 1. Sets up window.__SMART_HMR_STATE__
 * 2. Wraps window.WebSocket to intercept HMR connections
 * 3. Connects to the Smart HMR watcher WebSocket
 * 4. Filters SERVER_COMPONENT_CHANGES messages based on route relevance
 *
 * This script MUST execute before Next.js creates its HMR WebSocket.
 * It's injected via dangerouslySetInnerHTML in a <script> tag.
 */
export function getBootstrapScript(options: {
  port?: number
  debug?: boolean
}): string {
  const port = options.port ?? 3002
  const debug = options.debug ?? false

  // The entire interceptor is a self-contained IIFE — no external dependencies.
  // We use string concatenation to avoid template literal issues in the inline script.
  return `(function(){
  "use strict";

  // Bail out if not in development or already initialized
  if (window.__SMART_HMR_STATE__) return;

  var state = {
    enabled: false,
    pathname: null,
    affectedRoutes: null,
    suppressedCount: 0,
    debug: ${debug ? 'true' : 'false'}
  };
  window.__SMART_HMR_STATE__ = state;

  function log() {
    if (!state.debug) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[smart-hmr]");
    console.log.apply(console, args);
  }

  // ─── Route Matching ───

  function matchesAnyRoute(pathname, affectedRoutes) {
    if (!pathname || !affectedRoutes) return true;
    for (var i = 0; i < affectedRoutes.length; i++) {
      var pattern = affectedRoutes[i];
      if (pattern === "*") return true;
      if (pattern === pathname) return true;
      if (pattern.indexOf("/**") === pattern.length - 3) {
        var prefix = pattern.slice(0, -3);
        if (pathname === prefix || pathname.indexOf(prefix + "/") === 0) return true;
      }
    }
    return false;
  }

  // ─── WebSocket Wrapper ───

  var OriginalWebSocket = window.WebSocket;

  function SmartHMRWebSocket(url, protocols) {
    var ws = protocols !== undefined
      ? new OriginalWebSocket(url, protocols)
      : new OriginalWebSocket(url);

    // Detect if this is the Next.js HMR WebSocket
    var urlStr = typeof url === "string" ? url : url.toString();
    var isHMR = urlStr.indexOf("/_next/webpack-hmr") !== -1;

    if (!isHMR) return ws;

    log("Intercepted HMR WebSocket:", urlStr);

    // Wrap the message handler to filter serverComponentChanges
    var originalAddEventListener = ws.addEventListener.bind(ws);
    var messageListeners = [];

    ws.addEventListener = function(type, listener, options) {
      if (type === "message") {
        messageListeners.push(listener);
        originalAddEventListener(type, function(event) {
          if (shouldPassMessage(event)) {
            listener.call(ws, event);
          }
        }, options);
      } else {
        originalAddEventListener(type, listener, options);
      }
    };

    // Also wrap onmessage setter
    var _onmessage = null;
    Object.defineProperty(ws, "onmessage", {
      get: function() { return _onmessage; },
      set: function(handler) {
        _onmessage = handler;
        ws._smartHmrOnMessage = handler;
      },
      configurable: true
    });

    // Intercept messages via the native onmessage
    originalAddEventListener("message", function(event) {
      if (ws._smartHmrOnMessage) {
        if (shouldPassMessage(event)) {
          ws._smartHmrOnMessage.call(ws, event);
        }
      }
    });

    return ws;
  }

  // Copy static properties and prototype
  SmartHMRWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  SmartHMRWebSocket.OPEN = OriginalWebSocket.OPEN;
  SmartHMRWebSocket.CLOSING = OriginalWebSocket.CLOSING;
  SmartHMRWebSocket.CLOSED = OriginalWebSocket.CLOSED;
  SmartHMRWebSocket.prototype = OriginalWebSocket.prototype;

  window.WebSocket = SmartHMRWebSocket;

  // ─── Message Filter ───

  function shouldPassMessage(event) {
    // Always pass binary messages
    if (typeof event.data !== "string") return true;

    try {
      var msg = JSON.parse(event.data);

      // Only filter serverComponentChanges
      if (msg.type !== "serverComponentChanges") return true;

      // If tab is hidden, always suppress to prevent cross-tab interference.
      // The visibility-refresh handler will catch up when the tab is focused.
      if (document.visibilityState !== "visible") {
        state.suppressedCount++;
        log("Tab hidden — suppressing refresh, total suppressed:", state.suppressedCount);
        return false;
      }

      // If smart-hmr isn't ready, pass through (graceful degradation)
      if (!state.enabled || !state.affectedRoutes) return true;

      var matches = matchesAnyRoute(state.pathname, state.affectedRoutes);

      if (!matches) {
        state.suppressedCount++;
        log(
          "Suppressed refresh for", state.pathname,
          "(affected:", state.affectedRoutes.join(", ") + ")",
          "total suppressed:", state.suppressedCount
        );
        return false;
      }

      log("Allowing refresh for", state.pathname);
      return true;
    } catch (e) {
      // Parse error — pass through
      return true;
    }
  }

  // ─── Connect to Smart HMR Watcher ───

  var watcherWs = null;
  var reconnectAttempts = 0;
  var maxReconnectAttempts = 20;

  function connectToWatcher() {
    try {
      watcherWs = new OriginalWebSocket("ws://localhost:${port}");

      watcherWs.onopen = function() {
        state.enabled = true;
        reconnectAttempts = 0;
        log("Connected to watcher on port ${port}");
      };

      watcherWs.onmessage = function(event) {
        try {
          var msg = JSON.parse(event.data);
          if (msg.type === "smart-hmr:routes") {
            state.affectedRoutes = msg.affectedRoutes;
            log("Routes update:", msg.affectedRoutes, "files:", msg.changedFiles);
          } else if (msg.type === "smart-hmr:connected") {
            log("Watcher info:", msg.fileCount, "files,", msg.routeCount, "routes");
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      watcherWs.onclose = function() {
        state.enabled = false;
        state.affectedRoutes = null;
        log("Disconnected from watcher");

        // Reconnect with backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          var delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts - 1), 10000);
          setTimeout(connectToWatcher, delay);
        }
      };

      watcherWs.onerror = function() {
        // onclose will fire after this
      };
    } catch (e) {
      // WebSocket construction failed — watcher probably not running
      log("Could not connect to watcher:", e.message);
      state.enabled = false;
    }
  }

  // Start connection (slight delay to avoid race with page load)
  setTimeout(connectToWatcher, 100);

})();`
}
