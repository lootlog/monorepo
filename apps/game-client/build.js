// ==UserScript==
// @name       lootlog-client
// @namespace  npm/vite-plugin-monkey
// @version    0.0.1
// @author     monkey
// @icon       https://vitejs.dev/logo.svg
// @match      https://*.margonem.pl
// @exclude    http*://margonem.*/*
// @exclude    http*://www.margonem.*/*
// @exclude    http*://new.margonem.*/*
// @exclude    http*://forum.margonem.*/*
// @exclude    http*://commons.margonem.*/*
// @exclude    http*://dev-commons.margonem.*/*
// @grant      GM_addStyle
// ==/UserScript==

((t) => {
  if (typeof GM_addStyle == "function") {
    GM_addStyle(t);
    return;
  }
  const r = document.createElement("style");
  (r.textContent = t), document.head.append(r);
})(
  " *,:before,:after{--tw-border-spacing-x: 0;--tw-border-spacing-y: 0;--tw-translate-x: 0;--tw-translate-y: 0;--tw-rotate: 0;--tw-skew-x: 0;--tw-skew-y: 0;--tw-scale-x: 1;--tw-scale-y: 1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness: proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width: 0px;--tw-ring-offset-color: #fff;--tw-ring-color: rgb(59 130 246 / .5);--tw-ring-offset-shadow: 0 0 #0000;--tw-ring-shadow: 0 0 #0000;--tw-shadow: 0 0 #0000;--tw-shadow-colored: 0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }::backdrop{--tw-border-spacing-x: 0;--tw-border-spacing-y: 0;--tw-translate-x: 0;--tw-translate-y: 0;--tw-rotate: 0;--tw-skew-x: 0;--tw-skew-y: 0;--tw-scale-x: 1;--tw-scale-y: 1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness: proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width: 0px;--tw-ring-offset-color: #fff;--tw-ring-color: rgb(59 130 246 / .5);--tw-ring-offset-shadow: 0 0 #0000;--tw-ring-shadow: 0 0 #0000;--tw-shadow: 0 0 #0000;--tw-shadow-colored: 0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }:root{--background: 0 0% 100%;--foreground: 0 0% 3.9%;--card: 0 0% 100%;--card-foreground: 0 0% 3.9%;--popover: 0 0% 100%;--popover-foreground: 0 0% 3.9%;--primary: 0 0% 9%;--primary-foreground: 0 0% 98%;--secondary: 0 0% 96.1%;--secondary-foreground: 0 0% 9%;--muted: 0 0% 96.1%;--muted-foreground: 0 0% 45.1%;--accent: 0 0% 96.1%;--accent-foreground: 0 0% 9%;--destructive: 0 84.2% 60.2%;--destructive-foreground: 0 0% 98%;--border: 0 0% 89.8%;--input: 0 0% 89.8%;--ring: 0 0% 3.9%;--chart-1: 12 76% 61%;--chart-2: 173 58% 39%;--chart-3: 197 37% 24%;--chart-4: 43 74% 66%;--chart-5: 27 87% 67%;--radius: .5rem }*{border-color:hsl(var(--border))}body{background-color:hsl(var(--background));color:hsl(var(--foreground))}.ll-pointer-events-none{pointer-events:none}.ll-pointer-events-auto{pointer-events:auto}.ll-absolute{position:absolute}.ll-left-0{left:0}.ll-top-0{top:0}.ll-z-20{z-index:20}.ll-flex{display:flex}.ll-inline-flex{display:inline-flex}.ll-h-10{height:2.5rem}.ll-h-8{height:2rem}.ll-h-9{height:2.25rem}.ll-h-screen{height:100vh}.ll-w-9{width:2.25rem}.ll-w-96{width:24rem}.ll-w-\\[245px\\]{width:245px}.ll-w-screen{width:100vw}.ll-items-center{align-items:center}.ll-justify-center{justify-content:center}.ll-whitespace-nowrap{white-space:nowrap}.ll-rounded-md{border-radius:calc(var(--radius) - 2px)}.ll-border{border-width:1px}.ll-border-input{border-color:hsl(var(--input))}.ll-bg-background{background-color:hsl(var(--background))}.ll-bg-destructive{background-color:hsl(var(--destructive))}.ll-bg-primary{background-color:hsl(var(--primary))}.ll-bg-secondary{background-color:hsl(var(--secondary))}.ll-bg-slate-900{--tw-bg-opacity: 1;background-color:rgb(15 23 42 / var(--tw-bg-opacity))}.ll-p-2{padding:.5rem}.ll-px-3{padding-left:.75rem;padding-right:.75rem}.ll-px-4{padding-left:1rem;padding-right:1rem}.ll-px-8{padding-left:2rem;padding-right:2rem}.ll-py-2{padding-top:.5rem;padding-bottom:.5rem}.ll-text-sm{font-size:.875rem;line-height:1.25rem}.ll-text-xs{font-size:.75rem;line-height:1rem}.ll-font-medium{font-weight:500}.ll-text-destructive-foreground{color:hsl(var(--destructive-foreground))}.ll-text-primary{color:hsl(var(--primary))}.ll-text-primary-foreground{color:hsl(var(--primary-foreground))}.ll-text-secondary-foreground{color:hsl(var(--secondary-foreground))}.ll-text-white{--tw-text-opacity: 1;color:rgb(255 255 255 / var(--tw-text-opacity))}.ll-underline-offset-4{text-underline-offset:4px}.ll-shadow{--tw-shadow: 0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1);--tw-shadow-colored: 0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow, 0 0 #0000),var(--tw-ring-shadow, 0 0 #0000),var(--tw-shadow)}.ll-shadow-sm{--tw-shadow: 0 1px 2px 0 rgb(0 0 0 / .05);--tw-shadow-colored: 0 1px 2px 0 var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow, 0 0 #0000),var(--tw-ring-shadow, 0 0 #0000),var(--tw-shadow)}.ll-transition-colors{transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}@keyframes enter{0%{opacity:var(--tw-enter-opacity, 1);transform:translate3d(var(--tw-enter-translate-x, 0),var(--tw-enter-translate-y, 0),0) scale3d(var(--tw-enter-scale, 1),var(--tw-enter-scale, 1),var(--tw-enter-scale, 1)) rotate(var(--tw-enter-rotate, 0))}}@keyframes exit{to{opacity:var(--tw-exit-opacity, 1);transform:translate3d(var(--tw-exit-translate-x, 0),var(--tw-exit-translate-y, 0),0) scale3d(var(--tw-exit-scale, 1),var(--tw-exit-scale, 1),var(--tw-exit-scale, 1)) rotate(var(--tw-exit-rotate, 0))}}.hover\\:ll-bg-accent:hover{background-color:hsl(var(--accent))}.hover\\:ll-bg-destructive\\/90:hover{background-color:hsl(var(--destructive) / .9)}.hover\\:ll-bg-primary\\/90:hover{background-color:hsl(var(--primary) / .9)}.hover\\:ll-bg-secondary\\/80:hover{background-color:hsl(var(--secondary) / .8)}.hover\\:ll-text-accent-foreground:hover{color:hsl(var(--accent-foreground))}.hover\\:ll-underline:hover{text-decoration-line:underline}.focus-visible\\:ll-outline-none:focus-visible{outline:2px solid transparent;outline-offset:2px}.focus-visible\\:ll-ring-1:focus-visible{--tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow, 0 0 #0000)}.focus-visible\\:ll-ring-ring:focus-visible{--tw-ring-color: hsl(var(--ring))}.disabled\\:ll-pointer-events-none:disabled{pointer-events:none}.disabled\\:ll-opacity-50:disabled{opacity:.5} "
);

(function () {
  "use strict";

  var __accessCheck = (obj, member, msg) => {
    if (!member.has(obj)) throw TypeError("Cannot " + msg);
  };
  var __privateGet = (obj, member, getter) => {
    __accessCheck(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet = (obj, member, value, setter) => {
    __accessCheck(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };
  var __privateWrapper = (obj, member, setter, getter) => ({
    set _(value) {
      __privateSet(obj, member, value, setter);
    },
    get _() {
      return __privateGet(obj, member, getter);
    },
  });
  var __privateMethod = (obj, member, method) => {
    __accessCheck(obj, member, "access private method");
    return method;
  };
  var _focused,
    _cleanup,
    _setup,
    _a,
    _online,
    _cleanup2,
    _setup2,
    _b,
    _gcTimeout,
    _c,
    _initialState,
    _revertState,
    _cache,
    _retryer,
    _defaultOptions,
    _abortSignalConsumed,
    _dispatch,
    dispatch_fn,
    _d,
    _queries,
    _e,
    _observers,
    _mutationCache,
    _retryer2,
    _dispatch2,
    dispatch_fn2,
    _f,
    _mutations,
    _mutationId,
    _g,
    _queryCache,
    _mutationCache2,
    _defaultOptions2,
    _queryDefaults,
    _mutationDefaults,
    _mountCount,
    _unsubscribeFocus,
    _unsubscribeOnline,
    _h,
    _client,
    _currentQuery,
    _currentQueryInitialState,
    _currentResult,
    _currentResultState,
    _currentResultOptions,
    _currentThenable,
    _selectError,
    _selectFn,
    _selectResult,
    _lastQueryWithDefinedData,
    _staleTimeoutId,
    _refetchIntervalId,
    _currentRefetchInterval,
    _trackedProps,
    _executeFetch,
    executeFetch_fn,
    _updateStaleTimeout,
    updateStaleTimeout_fn,
    _computeRefetchInterval,
    computeRefetchInterval_fn,
    _updateRefetchInterval,
    updateRefetchInterval_fn,
    _updateTimers,
    updateTimers_fn,
    _clearStaleTimeout,
    clearStaleTimeout_fn,
    _clearRefetchInterval,
    clearRefetchInterval_fn,
    _updateQuery,
    updateQuery_fn,
    _notify,
    notify_fn,
    _i;
  function getDefaultExportFromCjs(x2) {
    return x2 &&
      x2.__esModule &&
      Object.prototype.hasOwnProperty.call(x2, "default")
      ? x2["default"]
      : x2;
  }
  var jsxRuntime = { exports: {} };
  var reactJsxRuntime_production_min = {};
  var react = { exports: {} };
  var react_production_min = {};
  /**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  var l$2 = Symbol.for("react.element"),
    n$2 = Symbol.for("react.portal"),
    p$3 = Symbol.for("react.fragment"),
    q$2 = Symbol.for("react.strict_mode"),
    r$3 = Symbol.for("react.profiler"),
    t$1 = Symbol.for("react.provider"),
    u$1 = Symbol.for("react.context"),
    v$2 = Symbol.for("react.forward_ref"),
    w$1 = Symbol.for("react.suspense"),
    x$1 = Symbol.for("react.memo"),
    y$1 = Symbol.for("react.lazy"),
    z$2 = Symbol.iterator;
  function A$2(a2) {
    if (null === a2 || "object" !== typeof a2) return null;
    a2 = (z$2 && a2[z$2]) || a2["@@iterator"];
    return "function" === typeof a2 ? a2 : null;
  }
  var B$2 = {
      isMounted: function () {
        return false;
      },
      enqueueForceUpdate: function () {},
      enqueueReplaceState: function () {},
      enqueueSetState: function () {},
    },
    C$2 = Object.assign,
    D$2 = {};
  function E$2(a2, b2, e2) {
    this.props = a2;
    this.context = b2;
    this.refs = D$2;
    this.updater = e2 || B$2;
  }
  E$2.prototype.isReactComponent = {};
  E$2.prototype.setState = function (a2, b2) {
    if ("object" !== typeof a2 && "function" !== typeof a2 && null != a2)
      throw Error(
        "setState(...): takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, a2, b2, "setState");
  };
  E$2.prototype.forceUpdate = function (a2) {
    this.updater.enqueueForceUpdate(this, a2, "forceUpdate");
  };
  function F$1() {}
  F$1.prototype = E$2.prototype;
  function G$2(a2, b2, e2) {
    this.props = a2;
    this.context = b2;
    this.refs = D$2;
    this.updater = e2 || B$2;
  }
  var H$2 = (G$2.prototype = new F$1());
  H$2.constructor = G$2;
  C$2(H$2, E$2.prototype);
  H$2.isPureReactComponent = true;
  var I$2 = Array.isArray,
    J$1 = Object.prototype.hasOwnProperty,
    K$2 = { current: null },
    L$2 = { key: true, ref: true, __self: true, __source: true };
  function M$2(a2, b2, e2) {
    var d2,
      c2 = {},
      k2 = null,
      h2 = null;
    if (null != b2)
      for (d2 in (void 0 !== b2.ref && (h2 = b2.ref),
      void 0 !== b2.key && (k2 = "" + b2.key),
      b2))
        J$1.call(b2, d2) && !L$2.hasOwnProperty(d2) && (c2[d2] = b2[d2]);
    var g2 = arguments.length - 2;
    if (1 === g2) c2.children = e2;
    else if (1 < g2) {
      for (var f2 = Array(g2), m2 = 0; m2 < g2; m2++)
        f2[m2] = arguments[m2 + 2];
      c2.children = f2;
    }
    if (a2 && a2.defaultProps)
      for (d2 in ((g2 = a2.defaultProps), g2))
        void 0 === c2[d2] && (c2[d2] = g2[d2]);
    return {
      $$typeof: l$2,
      type: a2,
      key: k2,
      ref: h2,
      props: c2,
      _owner: K$2.current,
    };
  }
  function N$2(a2, b2) {
    return {
      $$typeof: l$2,
      type: a2.type,
      key: b2,
      ref: a2.ref,
      props: a2.props,
      _owner: a2._owner,
    };
  }
  function O$2(a2) {
    return "object" === typeof a2 && null !== a2 && a2.$$typeof === l$2;
  }
  function escape(a2) {
    var b2 = { "=": "=0", ":": "=2" };
    return (
      "$" +
      a2.replace(/[=:]/g, function (a3) {
        return b2[a3];
      })
    );
  }
  var P$2 = /\/+/g;
  function Q$2(a2, b2) {
    return "object" === typeof a2 && null !== a2 && null != a2.key
      ? escape("" + a2.key)
      : b2.toString(36);
  }
  function R$2(a2, b2, e2, d2, c2) {
    var k2 = typeof a2;
    if ("undefined" === k2 || "boolean" === k2) a2 = null;
    var h2 = false;
    if (null === a2) h2 = true;
    else
      switch (k2) {
        case "string":
        case "number":
          h2 = true;
          break;
        case "object":
          switch (a2.$$typeof) {
            case l$2:
            case n$2:
              h2 = true;
          }
      }
    if (h2)
      return (
        (h2 = a2),
        (c2 = c2(h2)),
        (a2 = "" === d2 ? "." + Q$2(h2, 0) : d2),
        I$2(c2)
          ? ((e2 = ""),
            null != a2 && (e2 = a2.replace(P$2, "$&/") + "/"),
            R$2(c2, b2, e2, "", function (a3) {
              return a3;
            }))
          : null != c2 &&
            (O$2(c2) &&
              (c2 = N$2(
                c2,
                e2 +
                  (!c2.key || (h2 && h2.key === c2.key)
                    ? ""
                    : ("" + c2.key).replace(P$2, "$&/") + "/") +
                  a2
              )),
            b2.push(c2)),
        1
      );
    h2 = 0;
    d2 = "" === d2 ? "." : d2 + ":";
    if (I$2(a2))
      for (var g2 = 0; g2 < a2.length; g2++) {
        k2 = a2[g2];
        var f2 = d2 + Q$2(k2, g2);
        h2 += R$2(k2, b2, e2, f2, c2);
      }
    else if (((f2 = A$2(a2)), "function" === typeof f2))
      for (a2 = f2.call(a2), g2 = 0; !(k2 = a2.next()).done; )
        (k2 = k2.value),
          (f2 = d2 + Q$2(k2, g2++)),
          (h2 += R$2(k2, b2, e2, f2, c2));
    else if ("object" === k2)
      throw (
        ((b2 = String(a2)),
        Error(
          "Objects are not valid as a React child (found: " +
            ("[object Object]" === b2
              ? "object with keys {" + Object.keys(a2).join(", ") + "}"
              : b2) +
            "). If you meant to render a collection of children, use an array instead."
        ))
      );
    return h2;
  }
  function S$2(a2, b2, e2) {
    if (null == a2) return a2;
    var d2 = [],
      c2 = 0;
    R$2(a2, d2, "", "", function (a3) {
      return b2.call(e2, a3, c2++);
    });
    return d2;
  }
  function T$2(a2) {
    if (-1 === a2._status) {
      var b2 = a2._result;
      b2 = b2();
      b2.then(
        function (b3) {
          if (0 === a2._status || -1 === a2._status)
            (a2._status = 1), (a2._result = b3);
        },
        function (b3) {
          if (0 === a2._status || -1 === a2._status)
            (a2._status = 2), (a2._result = b3);
        }
      );
      -1 === a2._status && ((a2._status = 0), (a2._result = b2));
    }
    if (1 === a2._status) return a2._result.default;
    throw a2._result;
  }
  var U$2 = { current: null },
    V$2 = { transition: null },
    W$2 = {
      ReactCurrentDispatcher: U$2,
      ReactCurrentBatchConfig: V$2,
      ReactCurrentOwner: K$2,
    };
  react_production_min.Children = {
    map: S$2,
    forEach: function (a2, b2, e2) {
      S$2(
        a2,
        function () {
          b2.apply(this, arguments);
        },
        e2
      );
    },
    count: function (a2) {
      var b2 = 0;
      S$2(a2, function () {
        b2++;
      });
      return b2;
    },
    toArray: function (a2) {
      return (
        S$2(a2, function (a3) {
          return a3;
        }) || []
      );
    },
    only: function (a2) {
      if (!O$2(a2))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return a2;
    },
  };
  react_production_min.Component = E$2;
  react_production_min.Fragment = p$3;
  react_production_min.Profiler = r$3;
  react_production_min.PureComponent = G$2;
  react_production_min.StrictMode = q$2;
  react_production_min.Suspense = w$1;
  react_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W$2;
  react_production_min.cloneElement = function (a2, b2, e2) {
    if (null === a2 || void 0 === a2)
      throw Error(
        "React.cloneElement(...): The argument must be a React element, but you passed " +
          a2 +
          "."
      );
    var d2 = C$2({}, a2.props),
      c2 = a2.key,
      k2 = a2.ref,
      h2 = a2._owner;
    if (null != b2) {
      void 0 !== b2.ref && ((k2 = b2.ref), (h2 = K$2.current));
      void 0 !== b2.key && (c2 = "" + b2.key);
      if (a2.type && a2.type.defaultProps) var g2 = a2.type.defaultProps;
      for (f2 in b2)
        J$1.call(b2, f2) &&
          !L$2.hasOwnProperty(f2) &&
          (d2[f2] = void 0 === b2[f2] && void 0 !== g2 ? g2[f2] : b2[f2]);
    }
    var f2 = arguments.length - 2;
    if (1 === f2) d2.children = e2;
    else if (1 < f2) {
      g2 = Array(f2);
      for (var m2 = 0; m2 < f2; m2++) g2[m2] = arguments[m2 + 2];
      d2.children = g2;
    }
    return {
      $$typeof: l$2,
      type: a2.type,
      key: c2,
      ref: k2,
      props: d2,
      _owner: h2,
    };
  };
  react_production_min.createContext = function (a2) {
    a2 = {
      $$typeof: u$1,
      _currentValue: a2,
      _currentValue2: a2,
      _threadCount: 0,
      Provider: null,
      Consumer: null,
      _defaultValue: null,
      _globalName: null,
    };
    a2.Provider = { $$typeof: t$1, _context: a2 };
    return (a2.Consumer = a2);
  };
  react_production_min.createElement = M$2;
  react_production_min.createFactory = function (a2) {
    var b2 = M$2.bind(null, a2);
    b2.type = a2;
    return b2;
  };
  react_production_min.createRef = function () {
    return { current: null };
  };
  react_production_min.forwardRef = function (a2) {
    return { $$typeof: v$2, render: a2 };
  };
  react_production_min.isValidElement = O$2;
  react_production_min.lazy = function (a2) {
    return {
      $$typeof: y$1,
      _payload: { _status: -1, _result: a2 },
      _init: T$2,
    };
  };
  react_production_min.memo = function (a2, b2) {
    return { $$typeof: x$1, type: a2, compare: void 0 === b2 ? null : b2 };
  };
  react_production_min.startTransition = function (a2) {
    var b2 = V$2.transition;
    V$2.transition = {};
    try {
      a2();
    } finally {
      V$2.transition = b2;
    }
  };
  react_production_min.unstable_act = function () {
    throw Error("act(...) is not supported in production builds of React.");
  };
  react_production_min.useCallback = function (a2, b2) {
    return U$2.current.useCallback(a2, b2);
  };
  react_production_min.useContext = function (a2) {
    return U$2.current.useContext(a2);
  };
  react_production_min.useDebugValue = function () {};
  react_production_min.useDeferredValue = function (a2) {
    return U$2.current.useDeferredValue(a2);
  };
  react_production_min.useEffect = function (a2, b2) {
    return U$2.current.useEffect(a2, b2);
  };
  react_production_min.useId = function () {
    return U$2.current.useId();
  };
  react_production_min.useImperativeHandle = function (a2, b2, e2) {
    return U$2.current.useImperativeHandle(a2, b2, e2);
  };
  react_production_min.useInsertionEffect = function (a2, b2) {
    return U$2.current.useInsertionEffect(a2, b2);
  };
  react_production_min.useLayoutEffect = function (a2, b2) {
    return U$2.current.useLayoutEffect(a2, b2);
  };
  react_production_min.useMemo = function (a2, b2) {
    return U$2.current.useMemo(a2, b2);
  };
  react_production_min.useReducer = function (a2, b2, e2) {
    return U$2.current.useReducer(a2, b2, e2);
  };
  react_production_min.useRef = function (a2) {
    return U$2.current.useRef(a2);
  };
  react_production_min.useState = function (a2) {
    return U$2.current.useState(a2);
  };
  react_production_min.useSyncExternalStore = function (a2, b2, e2) {
    return U$2.current.useSyncExternalStore(a2, b2, e2);
  };
  react_production_min.useTransition = function () {
    return U$2.current.useTransition();
  };
  react_production_min.version = "18.2.0";
  {
    react.exports = react_production_min;
  }
  var reactExports = react.exports;
  const React = /* @__PURE__ */ getDefaultExportFromCjs(reactExports);
  /**
   * @license React
   * react-jsx-runtime.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  var f$1 = reactExports,
    k$1 = Symbol.for("react.element"),
    l$1 = Symbol.for("react.fragment"),
    m$2 = Object.prototype.hasOwnProperty,
    n$1 =
      f$1.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
    p$2 = { key: true, ref: true, __self: true, __source: true };
  function q$1(c2, a2, g2) {
    var b2,
      d2 = {},
      e2 = null,
      h2 = null;
    void 0 !== g2 && (e2 = "" + g2);
    void 0 !== a2.key && (e2 = "" + a2.key);
    void 0 !== a2.ref && (h2 = a2.ref);
    for (b2 in a2)
      m$2.call(a2, b2) && !p$2.hasOwnProperty(b2) && (d2[b2] = a2[b2]);
    if (c2 && c2.defaultProps)
      for (b2 in ((a2 = c2.defaultProps), a2))
        void 0 === d2[b2] && (d2[b2] = a2[b2]);
    return {
      $$typeof: k$1,
      type: c2,
      key: e2,
      ref: h2,
      props: d2,
      _owner: n$1.current,
    };
  }
  reactJsxRuntime_production_min.Fragment = l$1;
  reactJsxRuntime_production_min.jsx = q$1;
  reactJsxRuntime_production_min.jsxs = q$1;
  {
    jsxRuntime.exports = reactJsxRuntime_production_min;
  }
  var jsxRuntimeExports = jsxRuntime.exports;
  var client = {};
  var reactDom = { exports: {} };
  var reactDom_production_min = {};
  var scheduler = { exports: {} };
  var scheduler_production_min = {};
  /**
   * @license React
   * scheduler.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  (function (exports) {
    function f2(a2, b2) {
      var c2 = a2.length;
      a2.push(b2);
      a: for (; 0 < c2; ) {
        var d2 = (c2 - 1) >>> 1,
          e2 = a2[d2];
        if (0 < g2(e2, b2)) (a2[d2] = b2), (a2[c2] = e2), (c2 = d2);
        else break a;
      }
    }
    function h2(a2) {
      return 0 === a2.length ? null : a2[0];
    }
    function k2(a2) {
      if (0 === a2.length) return null;
      var b2 = a2[0],
        c2 = a2.pop();
      if (c2 !== b2) {
        a2[0] = c2;
        a: for (var d2 = 0, e2 = a2.length, w2 = e2 >>> 1; d2 < w2; ) {
          var m2 = 2 * (d2 + 1) - 1,
            C2 = a2[m2],
            n2 = m2 + 1,
            x2 = a2[n2];
          if (0 > g2(C2, c2))
            n2 < e2 && 0 > g2(x2, C2)
              ? ((a2[d2] = x2), (a2[n2] = c2), (d2 = n2))
              : ((a2[d2] = C2), (a2[m2] = c2), (d2 = m2));
          else if (n2 < e2 && 0 > g2(x2, c2))
            (a2[d2] = x2), (a2[n2] = c2), (d2 = n2);
          else break a;
        }
      }
      return b2;
    }
    function g2(a2, b2) {
      var c2 = a2.sortIndex - b2.sortIndex;
      return 0 !== c2 ? c2 : a2.id - b2.id;
    }
    if (
      "object" === typeof performance &&
      "function" === typeof performance.now
    ) {
      var l2 = performance;
      exports.unstable_now = function () {
        return l2.now();
      };
    } else {
      var p2 = Date,
        q2 = p2.now();
      exports.unstable_now = function () {
        return p2.now() - q2;
      };
    }
    var r2 = [],
      t2 = [],
      u2 = 1,
      v2 = null,
      y2 = 3,
      z2 = false,
      A2 = false,
      B2 = false,
      D2 = "function" === typeof setTimeout ? setTimeout : null,
      E2 = "function" === typeof clearTimeout ? clearTimeout : null,
      F2 = "undefined" !== typeof setImmediate ? setImmediate : null;
    "undefined" !== typeof navigator &&
      void 0 !== navigator.scheduling &&
      void 0 !== navigator.scheduling.isInputPending &&
      navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function G2(a2) {
      for (var b2 = h2(t2); null !== b2; ) {
        if (null === b2.callback) k2(t2);
        else if (b2.startTime <= a2)
          k2(t2), (b2.sortIndex = b2.expirationTime), f2(r2, b2);
        else break;
        b2 = h2(t2);
      }
    }
    function H2(a2) {
      B2 = false;
      G2(a2);
      if (!A2)
        if (null !== h2(r2)) (A2 = true), I2(J2);
        else {
          var b2 = h2(t2);
          null !== b2 && K2(H2, b2.startTime - a2);
        }
    }
    function J2(a2, b2) {
      A2 = false;
      B2 && ((B2 = false), E2(L2), (L2 = -1));
      z2 = true;
      var c2 = y2;
      try {
        G2(b2);
        for (
          v2 = h2(r2);
          null !== v2 && (!(v2.expirationTime > b2) || (a2 && !M2()));

        ) {
          var d2 = v2.callback;
          if ("function" === typeof d2) {
            v2.callback = null;
            y2 = v2.priorityLevel;
            var e2 = d2(v2.expirationTime <= b2);
            b2 = exports.unstable_now();
            "function" === typeof e2
              ? (v2.callback = e2)
              : v2 === h2(r2) && k2(r2);
            G2(b2);
          } else k2(r2);
          v2 = h2(r2);
        }
        if (null !== v2) var w2 = true;
        else {
          var m2 = h2(t2);
          null !== m2 && K2(H2, m2.startTime - b2);
          w2 = false;
        }
        return w2;
      } finally {
        (v2 = null), (y2 = c2), (z2 = false);
      }
    }
    var N2 = false,
      O2 = null,
      L2 = -1,
      P2 = 5,
      Q2 = -1;
    function M2() {
      return exports.unstable_now() - Q2 < P2 ? false : true;
    }
    function R2() {
      if (null !== O2) {
        var a2 = exports.unstable_now();
        Q2 = a2;
        var b2 = true;
        try {
          b2 = O2(true, a2);
        } finally {
          b2 ? S2() : ((N2 = false), (O2 = null));
        }
      } else N2 = false;
    }
    var S2;
    if ("function" === typeof F2)
      S2 = function () {
        F2(R2);
      };
    else if ("undefined" !== typeof MessageChannel) {
      var T2 = new MessageChannel(),
        U2 = T2.port2;
      T2.port1.onmessage = R2;
      S2 = function () {
        U2.postMessage(null);
      };
    } else
      S2 = function () {
        D2(R2, 0);
      };
    function I2(a2) {
      O2 = a2;
      N2 || ((N2 = true), S2());
    }
    function K2(a2, b2) {
      L2 = D2(function () {
        a2(exports.unstable_now());
      }, b2);
    }
    exports.unstable_IdlePriority = 5;
    exports.unstable_ImmediatePriority = 1;
    exports.unstable_LowPriority = 4;
    exports.unstable_NormalPriority = 3;
    exports.unstable_Profiling = null;
    exports.unstable_UserBlockingPriority = 2;
    exports.unstable_cancelCallback = function (a2) {
      a2.callback = null;
    };
    exports.unstable_continueExecution = function () {
      A2 || z2 || ((A2 = true), I2(J2));
    };
    exports.unstable_forceFrameRate = function (a2) {
      0 > a2 || 125 < a2
        ? console.error(
            "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
          )
        : (P2 = 0 < a2 ? Math.floor(1e3 / a2) : 5);
    };
    exports.unstable_getCurrentPriorityLevel = function () {
      return y2;
    };
    exports.unstable_getFirstCallbackNode = function () {
      return h2(r2);
    };
    exports.unstable_next = function (a2) {
      switch (y2) {
        case 1:
        case 2:
        case 3:
          var b2 = 3;
          break;
        default:
          b2 = y2;
      }
      var c2 = y2;
      y2 = b2;
      try {
        return a2();
      } finally {
        y2 = c2;
      }
    };
    exports.unstable_pauseExecution = function () {};
    exports.unstable_requestPaint = function () {};
    exports.unstable_runWithPriority = function (a2, b2) {
      switch (a2) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          a2 = 3;
      }
      var c2 = y2;
      y2 = a2;
      try {
        return b2();
      } finally {
        y2 = c2;
      }
    };
    exports.unstable_scheduleCallback = function (a2, b2, c2) {
      var d2 = exports.unstable_now();
      "object" === typeof c2 && null !== c2
        ? ((c2 = c2.delay),
          (c2 = "number" === typeof c2 && 0 < c2 ? d2 + c2 : d2))
        : (c2 = d2);
      switch (a2) {
        case 1:
          var e2 = -1;
          break;
        case 2:
          e2 = 250;
          break;
        case 5:
          e2 = 1073741823;
          break;
        case 4:
          e2 = 1e4;
          break;
        default:
          e2 = 5e3;
      }
      e2 = c2 + e2;
      a2 = {
        id: u2++,
        callback: b2,
        priorityLevel: a2,
        startTime: c2,
        expirationTime: e2,
        sortIndex: -1,
      };
      c2 > d2
        ? ((a2.sortIndex = c2),
          f2(t2, a2),
          null === h2(r2) &&
            a2 === h2(t2) &&
            (B2 ? (E2(L2), (L2 = -1)) : (B2 = true), K2(H2, c2 - d2)))
        : ((a2.sortIndex = e2), f2(r2, a2), A2 || z2 || ((A2 = true), I2(J2)));
      return a2;
    };
    exports.unstable_shouldYield = M2;
    exports.unstable_wrapCallback = function (a2) {
      var b2 = y2;
      return function () {
        var c2 = y2;
        y2 = b2;
        try {
          return a2.apply(this, arguments);
        } finally {
          y2 = c2;
        }
      };
    };
  })(scheduler_production_min);
  {
    scheduler.exports = scheduler_production_min;
  }
  var schedulerExports = scheduler.exports;
  /**
   * @license React
   * react-dom.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  var aa = reactExports,
    ca = schedulerExports;
  function p$1(a2) {
    for (
      var b2 = "https://reactjs.org/docs/error-decoder.html?invariant=" + a2,
        c2 = 1;
      c2 < arguments.length;
      c2++
    )
      b2 += "&args[]=" + encodeURIComponent(arguments[c2]);
    return (
      "Minified React error #" +
      a2 +
      "; visit " +
      b2 +
      " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
    );
  }
  var da = /* @__PURE__ */ new Set(),
    ea = {};
  function fa(a2, b2) {
    ha(a2, b2);
    ha(a2 + "Capture", b2);
  }
  function ha(a2, b2) {
    ea[a2] = b2;
    for (a2 = 0; a2 < b2.length; a2++) da.add(b2[a2]);
  }
  var ia = !(
      "undefined" === typeof window ||
      "undefined" === typeof window.document ||
      "undefined" === typeof window.document.createElement
    ),
    ja = Object.prototype.hasOwnProperty,
    ka =
      /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
    la = {},
    ma = {};
  function oa(a2) {
    if (ja.call(ma, a2)) return true;
    if (ja.call(la, a2)) return false;
    if (ka.test(a2)) return (ma[a2] = true);
    la[a2] = true;
    return false;
  }
  function pa(a2, b2, c2, d2) {
    if (null !== c2 && 0 === c2.type) return false;
    switch (typeof b2) {
      case "function":
      case "symbol":
        return true;
      case "boolean":
        if (d2) return false;
        if (null !== c2) return !c2.acceptsBooleans;
        a2 = a2.toLowerCase().slice(0, 5);
        return "data-" !== a2 && "aria-" !== a2;
      default:
        return false;
    }
  }
  function qa(a2, b2, c2, d2) {
    if (null === b2 || "undefined" === typeof b2 || pa(a2, b2, c2, d2))
      return true;
    if (d2) return false;
    if (null !== c2)
      switch (c2.type) {
        case 3:
          return !b2;
        case 4:
          return false === b2;
        case 5:
          return isNaN(b2);
        case 6:
          return isNaN(b2) || 1 > b2;
      }
    return false;
  }
  function v$1(a2, b2, c2, d2, e2, f2, g2) {
    this.acceptsBooleans = 2 === b2 || 3 === b2 || 4 === b2;
    this.attributeName = d2;
    this.attributeNamespace = e2;
    this.mustUseProperty = c2;
    this.propertyName = a2;
    this.type = b2;
    this.sanitizeURL = f2;
    this.removeEmptyString = g2;
  }
  var z$1 = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style"
    .split(" ")
    .forEach(function (a2) {
      z$1[a2] = new v$1(a2, 0, false, a2, null, false, false);
    });
  [
    ["acceptCharset", "accept-charset"],
    ["className", "class"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
  ].forEach(function (a2) {
    var b2 = a2[0];
    z$1[b2] = new v$1(b2, 1, false, a2[1], null, false, false);
  });
  ["contentEditable", "draggable", "spellCheck", "value"].forEach(function (
    a2
  ) {
    z$1[a2] = new v$1(a2, 2, false, a2.toLowerCase(), null, false, false);
  });
  [
    "autoReverse",
    "externalResourcesRequired",
    "focusable",
    "preserveAlpha",
  ].forEach(function (a2) {
    z$1[a2] = new v$1(a2, 2, false, a2, null, false, false);
  });
  "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope"
    .split(" ")
    .forEach(function (a2) {
      z$1[a2] = new v$1(a2, 3, false, a2.toLowerCase(), null, false, false);
    });
  ["checked", "multiple", "muted", "selected"].forEach(function (a2) {
    z$1[a2] = new v$1(a2, 3, true, a2, null, false, false);
  });
  ["capture", "download"].forEach(function (a2) {
    z$1[a2] = new v$1(a2, 4, false, a2, null, false, false);
  });
  ["cols", "rows", "size", "span"].forEach(function (a2) {
    z$1[a2] = new v$1(a2, 6, false, a2, null, false, false);
  });
  ["rowSpan", "start"].forEach(function (a2) {
    z$1[a2] = new v$1(a2, 5, false, a2.toLowerCase(), null, false, false);
  });
  var ra = /[\-:]([a-z])/g;
  function sa(a2) {
    return a2[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height"
    .split(" ")
    .forEach(function (a2) {
      var b2 = a2.replace(ra, sa);
      z$1[b2] = new v$1(b2, 1, false, a2, null, false, false);
    });
  "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type"
    .split(" ")
    .forEach(function (a2) {
      var b2 = a2.replace(ra, sa);
      z$1[b2] = new v$1(
        b2,
        1,
        false,
        a2,
        "http://www.w3.org/1999/xlink",
        false,
        false
      );
    });
  ["xml:base", "xml:lang", "xml:space"].forEach(function (a2) {
    var b2 = a2.replace(ra, sa);
    z$1[b2] = new v$1(
      b2,
      1,
      false,
      a2,
      "http://www.w3.org/XML/1998/namespace",
      false,
      false
    );
  });
  ["tabIndex", "crossOrigin"].forEach(function (a2) {
    z$1[a2] = new v$1(a2, 1, false, a2.toLowerCase(), null, false, false);
  });
  z$1.xlinkHref = new v$1(
    "xlinkHref",
    1,
    false,
    "xlink:href",
    "http://www.w3.org/1999/xlink",
    true,
    false
  );
  ["src", "href", "action", "formAction"].forEach(function (a2) {
    z$1[a2] = new v$1(a2, 1, false, a2.toLowerCase(), null, true, true);
  });
  function ta(a2, b2, c2, d2) {
    var e2 = z$1.hasOwnProperty(b2) ? z$1[b2] : null;
    if (
      null !== e2
        ? 0 !== e2.type
        : d2 ||
          !(2 < b2.length) ||
          ("o" !== b2[0] && "O" !== b2[0]) ||
          ("n" !== b2[1] && "N" !== b2[1])
    )
      qa(b2, c2, e2, d2) && (c2 = null),
        d2 || null === e2
          ? oa(b2) &&
            (null === c2
              ? a2.removeAttribute(b2)
              : a2.setAttribute(b2, "" + c2))
          : e2.mustUseProperty
          ? (a2[e2.propertyName] =
              null === c2 ? (3 === e2.type ? false : "") : c2)
          : ((b2 = e2.attributeName),
            (d2 = e2.attributeNamespace),
            null === c2
              ? a2.removeAttribute(b2)
              : ((e2 = e2.type),
                (c2 = 3 === e2 || (4 === e2 && true === c2) ? "" : "" + c2),
                d2 ? a2.setAttributeNS(d2, b2, c2) : a2.setAttribute(b2, c2)));
  }
  var ua = aa.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
    va = Symbol.for("react.element"),
    wa = Symbol.for("react.portal"),
    ya = Symbol.for("react.fragment"),
    za = Symbol.for("react.strict_mode"),
    Aa = Symbol.for("react.profiler"),
    Ba = Symbol.for("react.provider"),
    Ca = Symbol.for("react.context"),
    Da = Symbol.for("react.forward_ref"),
    Ea = Symbol.for("react.suspense"),
    Fa = Symbol.for("react.suspense_list"),
    Ga = Symbol.for("react.memo"),
    Ha = Symbol.for("react.lazy");
  var Ia = Symbol.for("react.offscreen");
  var Ja = Symbol.iterator;
  function Ka(a2) {
    if (null === a2 || "object" !== typeof a2) return null;
    a2 = (Ja && a2[Ja]) || a2["@@iterator"];
    return "function" === typeof a2 ? a2 : null;
  }
  var A$1 = Object.assign,
    La;
  function Ma(a2) {
    if (void 0 === La)
      try {
        throw Error();
      } catch (c2) {
        var b2 = c2.stack.trim().match(/\n( *(at )?)/);
        La = (b2 && b2[1]) || "";
      }
    return "\n" + La + a2;
  }
  var Na = false;
  function Oa(a2, b2) {
    if (!a2 || Na) return "";
    Na = true;
    var c2 = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      if (b2)
        if (
          ((b2 = function () {
            throw Error();
          }),
          Object.defineProperty(b2.prototype, "props", {
            set: function () {
              throw Error();
            },
          }),
          "object" === typeof Reflect && Reflect.construct)
        ) {
          try {
            Reflect.construct(b2, []);
          } catch (l2) {
            var d2 = l2;
          }
          Reflect.construct(a2, [], b2);
        } else {
          try {
            b2.call();
          } catch (l2) {
            d2 = l2;
          }
          a2.call(b2.prototype);
        }
      else {
        try {
          throw Error();
        } catch (l2) {
          d2 = l2;
        }
        a2();
      }
    } catch (l2) {
      if (l2 && d2 && "string" === typeof l2.stack) {
        for (
          var e2 = l2.stack.split("\n"),
            f2 = d2.stack.split("\n"),
            g2 = e2.length - 1,
            h2 = f2.length - 1;
          1 <= g2 && 0 <= h2 && e2[g2] !== f2[h2];

        )
          h2--;
        for (; 1 <= g2 && 0 <= h2; g2--, h2--)
          if (e2[g2] !== f2[h2]) {
            if (1 !== g2 || 1 !== h2) {
              do
                if ((g2--, h2--, 0 > h2 || e2[g2] !== f2[h2])) {
                  var k2 = "\n" + e2[g2].replace(" at new ", " at ");
                  a2.displayName &&
                    k2.includes("<anonymous>") &&
                    (k2 = k2.replace("<anonymous>", a2.displayName));
                  return k2;
                }
              while (1 <= g2 && 0 <= h2);
            }
            break;
          }
      }
    } finally {
      (Na = false), (Error.prepareStackTrace = c2);
    }
    return (a2 = a2 ? a2.displayName || a2.name : "") ? Ma(a2) : "";
  }
  function Pa(a2) {
    switch (a2.tag) {
      case 5:
        return Ma(a2.type);
      case 16:
        return Ma("Lazy");
      case 13:
        return Ma("Suspense");
      case 19:
        return Ma("SuspenseList");
      case 0:
      case 2:
      case 15:
        return (a2 = Oa(a2.type, false)), a2;
      case 11:
        return (a2 = Oa(a2.type.render, false)), a2;
      case 1:
        return (a2 = Oa(a2.type, true)), a2;
      default:
        return "";
    }
  }
  function Qa(a2) {
    if (null == a2) return null;
    if ("function" === typeof a2) return a2.displayName || a2.name || null;
    if ("string" === typeof a2) return a2;
    switch (a2) {
      case ya:
        return "Fragment";
      case wa:
        return "Portal";
      case Aa:
        return "Profiler";
      case za:
        return "StrictMode";
      case Ea:
        return "Suspense";
      case Fa:
        return "SuspenseList";
    }
    if ("object" === typeof a2)
      switch (a2.$$typeof) {
        case Ca:
          return (a2.displayName || "Context") + ".Consumer";
        case Ba:
          return (a2._context.displayName || "Context") + ".Provider";
        case Da:
          var b2 = a2.render;
          a2 = a2.displayName;
          a2 ||
            ((a2 = b2.displayName || b2.name || ""),
            (a2 = "" !== a2 ? "ForwardRef(" + a2 + ")" : "ForwardRef"));
          return a2;
        case Ga:
          return (
            (b2 = a2.displayName || null),
            null !== b2 ? b2 : Qa(a2.type) || "Memo"
          );
        case Ha:
          b2 = a2._payload;
          a2 = a2._init;
          try {
            return Qa(a2(b2));
          } catch (c2) {}
      }
    return null;
  }
  function Ra(a2) {
    var b2 = a2.type;
    switch (a2.tag) {
      case 24:
        return "Cache";
      case 9:
        return (b2.displayName || "Context") + ".Consumer";
      case 10:
        return (b2._context.displayName || "Context") + ".Provider";
      case 18:
        return "DehydratedFragment";
      case 11:
        return (
          (a2 = b2.render),
          (a2 = a2.displayName || a2.name || ""),
          b2.displayName ||
            ("" !== a2 ? "ForwardRef(" + a2 + ")" : "ForwardRef")
        );
      case 7:
        return "Fragment";
      case 5:
        return b2;
      case 4:
        return "Portal";
      case 3:
        return "Root";
      case 6:
        return "Text";
      case 16:
        return Qa(b2);
      case 8:
        return b2 === za ? "StrictMode" : "Mode";
      case 22:
        return "Offscreen";
      case 12:
        return "Profiler";
      case 21:
        return "Scope";
      case 13:
        return "Suspense";
      case 19:
        return "SuspenseList";
      case 25:
        return "TracingMarker";
      case 1:
      case 0:
      case 17:
      case 2:
      case 14:
      case 15:
        if ("function" === typeof b2) return b2.displayName || b2.name || null;
        if ("string" === typeof b2) return b2;
    }
    return null;
  }
  function Sa(a2) {
    switch (typeof a2) {
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return a2;
      case "object":
        return a2;
      default:
        return "";
    }
  }
  function Ta(a2) {
    var b2 = a2.type;
    return (
      (a2 = a2.nodeName) &&
      "input" === a2.toLowerCase() &&
      ("checkbox" === b2 || "radio" === b2)
    );
  }
  function Ua(a2) {
    var b2 = Ta(a2) ? "checked" : "value",
      c2 = Object.getOwnPropertyDescriptor(a2.constructor.prototype, b2),
      d2 = "" + a2[b2];
    if (
      !a2.hasOwnProperty(b2) &&
      "undefined" !== typeof c2 &&
      "function" === typeof c2.get &&
      "function" === typeof c2.set
    ) {
      var e2 = c2.get,
        f2 = c2.set;
      Object.defineProperty(a2, b2, {
        configurable: true,
        get: function () {
          return e2.call(this);
        },
        set: function (a3) {
          d2 = "" + a3;
          f2.call(this, a3);
        },
      });
      Object.defineProperty(a2, b2, { enumerable: c2.enumerable });
      return {
        getValue: function () {
          return d2;
        },
        setValue: function (a3) {
          d2 = "" + a3;
        },
        stopTracking: function () {
          a2._valueTracker = null;
          delete a2[b2];
        },
      };
    }
  }
  function Va(a2) {
    a2._valueTracker || (a2._valueTracker = Ua(a2));
  }
  function Wa(a2) {
    if (!a2) return false;
    var b2 = a2._valueTracker;
    if (!b2) return true;
    var c2 = b2.getValue();
    var d2 = "";
    a2 && (d2 = Ta(a2) ? (a2.checked ? "true" : "false") : a2.value);
    a2 = d2;
    return a2 !== c2 ? (b2.setValue(a2), true) : false;
  }
  function Xa(a2) {
    a2 = a2 || ("undefined" !== typeof document ? document : void 0);
    if ("undefined" === typeof a2) return null;
    try {
      return a2.activeElement || a2.body;
    } catch (b2) {
      return a2.body;
    }
  }
  function Ya(a2, b2) {
    var c2 = b2.checked;
    return A$1({}, b2, {
      defaultChecked: void 0,
      defaultValue: void 0,
      value: void 0,
      checked: null != c2 ? c2 : a2._wrapperState.initialChecked,
    });
  }
  function Za(a2, b2) {
    var c2 = null == b2.defaultValue ? "" : b2.defaultValue,
      d2 = null != b2.checked ? b2.checked : b2.defaultChecked;
    c2 = Sa(null != b2.value ? b2.value : c2);
    a2._wrapperState = {
      initialChecked: d2,
      initialValue: c2,
      controlled:
        "checkbox" === b2.type || "radio" === b2.type
          ? null != b2.checked
          : null != b2.value,
    };
  }
  function ab(a2, b2) {
    b2 = b2.checked;
    null != b2 && ta(a2, "checked", b2, false);
  }
  function bb(a2, b2) {
    ab(a2, b2);
    var c2 = Sa(b2.value),
      d2 = b2.type;
    if (null != c2)
      if ("number" === d2) {
        if ((0 === c2 && "" === a2.value) || a2.value != c2) a2.value = "" + c2;
      } else a2.value !== "" + c2 && (a2.value = "" + c2);
    else if ("submit" === d2 || "reset" === d2) {
      a2.removeAttribute("value");
      return;
    }
    b2.hasOwnProperty("value")
      ? cb(a2, b2.type, c2)
      : b2.hasOwnProperty("defaultValue") &&
        cb(a2, b2.type, Sa(b2.defaultValue));
    null == b2.checked &&
      null != b2.defaultChecked &&
      (a2.defaultChecked = !!b2.defaultChecked);
  }
  function db(a2, b2, c2) {
    if (b2.hasOwnProperty("value") || b2.hasOwnProperty("defaultValue")) {
      var d2 = b2.type;
      if (
        !(
          ("submit" !== d2 && "reset" !== d2) ||
          (void 0 !== b2.value && null !== b2.value)
        )
      )
        return;
      b2 = "" + a2._wrapperState.initialValue;
      c2 || b2 === a2.value || (a2.value = b2);
      a2.defaultValue = b2;
    }
    c2 = a2.name;
    "" !== c2 && (a2.name = "");
    a2.defaultChecked = !!a2._wrapperState.initialChecked;
    "" !== c2 && (a2.name = c2);
  }
  function cb(a2, b2, c2) {
    if ("number" !== b2 || Xa(a2.ownerDocument) !== a2)
      null == c2
        ? (a2.defaultValue = "" + a2._wrapperState.initialValue)
        : a2.defaultValue !== "" + c2 && (a2.defaultValue = "" + c2);
  }
  var eb = Array.isArray;
  function fb(a2, b2, c2, d2) {
    a2 = a2.options;
    if (b2) {
      b2 = {};
      for (var e2 = 0; e2 < c2.length; e2++) b2["$" + c2[e2]] = true;
      for (c2 = 0; c2 < a2.length; c2++)
        (e2 = b2.hasOwnProperty("$" + a2[c2].value)),
          a2[c2].selected !== e2 && (a2[c2].selected = e2),
          e2 && d2 && (a2[c2].defaultSelected = true);
    } else {
      c2 = "" + Sa(c2);
      b2 = null;
      for (e2 = 0; e2 < a2.length; e2++) {
        if (a2[e2].value === c2) {
          a2[e2].selected = true;
          d2 && (a2[e2].defaultSelected = true);
          return;
        }
        null !== b2 || a2[e2].disabled || (b2 = a2[e2]);
      }
      null !== b2 && (b2.selected = true);
    }
  }
  function gb(a2, b2) {
    if (null != b2.dangerouslySetInnerHTML) throw Error(p$1(91));
    return A$1({}, b2, {
      value: void 0,
      defaultValue: void 0,
      children: "" + a2._wrapperState.initialValue,
    });
  }
  function hb(a2, b2) {
    var c2 = b2.value;
    if (null == c2) {
      c2 = b2.children;
      b2 = b2.defaultValue;
      if (null != c2) {
        if (null != b2) throw Error(p$1(92));
        if (eb(c2)) {
          if (1 < c2.length) throw Error(p$1(93));
          c2 = c2[0];
        }
        b2 = c2;
      }
      null == b2 && (b2 = "");
      c2 = b2;
    }
    a2._wrapperState = { initialValue: Sa(c2) };
  }
  function ib(a2, b2) {
    var c2 = Sa(b2.value),
      d2 = Sa(b2.defaultValue);
    null != c2 &&
      ((c2 = "" + c2),
      c2 !== a2.value && (a2.value = c2),
      null == b2.defaultValue &&
        a2.defaultValue !== c2 &&
        (a2.defaultValue = c2));
    null != d2 && (a2.defaultValue = "" + d2);
  }
  function jb(a2) {
    var b2 = a2.textContent;
    b2 === a2._wrapperState.initialValue &&
      "" !== b2 &&
      null !== b2 &&
      (a2.value = b2);
  }
  function kb(a2) {
    switch (a2) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function lb(a2, b2) {
    return null == a2 || "http://www.w3.org/1999/xhtml" === a2
      ? kb(b2)
      : "http://www.w3.org/2000/svg" === a2 && "foreignObject" === b2
      ? "http://www.w3.org/1999/xhtml"
      : a2;
  }
  var mb,
    nb = (function (a2) {
      return "undefined" !== typeof MSApp && MSApp.execUnsafeLocalFunction
        ? function (b2, c2, d2, e2) {
            MSApp.execUnsafeLocalFunction(function () {
              return a2(b2, c2, d2, e2);
            });
          }
        : a2;
    })(function (a2, b2) {
      if ("http://www.w3.org/2000/svg" !== a2.namespaceURI || "innerHTML" in a2)
        a2.innerHTML = b2;
      else {
        mb = mb || document.createElement("div");
        mb.innerHTML = "<svg>" + b2.valueOf().toString() + "</svg>";
        for (b2 = mb.firstChild; a2.firstChild; ) a2.removeChild(a2.firstChild);
        for (; b2.firstChild; ) a2.appendChild(b2.firstChild);
      }
    });
  function ob(a2, b2) {
    if (b2) {
      var c2 = a2.firstChild;
      if (c2 && c2 === a2.lastChild && 3 === c2.nodeType) {
        c2.nodeValue = b2;
        return;
      }
    }
    a2.textContent = b2;
  }
  var pb = {
      animationIterationCount: true,
      aspectRatio: true,
      borderImageOutset: true,
      borderImageSlice: true,
      borderImageWidth: true,
      boxFlex: true,
      boxFlexGroup: true,
      boxOrdinalGroup: true,
      columnCount: true,
      columns: true,
      flex: true,
      flexGrow: true,
      flexPositive: true,
      flexShrink: true,
      flexNegative: true,
      flexOrder: true,
      gridArea: true,
      gridRow: true,
      gridRowEnd: true,
      gridRowSpan: true,
      gridRowStart: true,
      gridColumn: true,
      gridColumnEnd: true,
      gridColumnSpan: true,
      gridColumnStart: true,
      fontWeight: true,
      lineClamp: true,
      lineHeight: true,
      opacity: true,
      order: true,
      orphans: true,
      tabSize: true,
      widows: true,
      zIndex: true,
      zoom: true,
      fillOpacity: true,
      floodOpacity: true,
      stopOpacity: true,
      strokeDasharray: true,
      strokeDashoffset: true,
      strokeMiterlimit: true,
      strokeOpacity: true,
      strokeWidth: true,
    },
    qb = ["Webkit", "ms", "Moz", "O"];
  Object.keys(pb).forEach(function (a2) {
    qb.forEach(function (b2) {
      b2 = b2 + a2.charAt(0).toUpperCase() + a2.substring(1);
      pb[b2] = pb[a2];
    });
  });
  function rb(a2, b2, c2) {
    return null == b2 || "boolean" === typeof b2 || "" === b2
      ? ""
      : c2 ||
        "number" !== typeof b2 ||
        0 === b2 ||
        (pb.hasOwnProperty(a2) && pb[a2])
      ? ("" + b2).trim()
      : b2 + "px";
  }
  function sb(a2, b2) {
    a2 = a2.style;
    for (var c2 in b2)
      if (b2.hasOwnProperty(c2)) {
        var d2 = 0 === c2.indexOf("--"),
          e2 = rb(c2, b2[c2], d2);
        "float" === c2 && (c2 = "cssFloat");
        d2 ? a2.setProperty(c2, e2) : (a2[c2] = e2);
      }
  }
  var tb = A$1(
    { menuitem: true },
    {
      area: true,
      base: true,
      br: true,
      col: true,
      embed: true,
      hr: true,
      img: true,
      input: true,
      keygen: true,
      link: true,
      meta: true,
      param: true,
      source: true,
      track: true,
      wbr: true,
    }
  );
  function ub(a2, b2) {
    if (b2) {
      if (tb[a2] && (null != b2.children || null != b2.dangerouslySetInnerHTML))
        throw Error(p$1(137, a2));
      if (null != b2.dangerouslySetInnerHTML) {
        if (null != b2.children) throw Error(p$1(60));
        if (
          "object" !== typeof b2.dangerouslySetInnerHTML ||
          !("__html" in b2.dangerouslySetInnerHTML)
        )
          throw Error(p$1(61));
      }
      if (null != b2.style && "object" !== typeof b2.style)
        throw Error(p$1(62));
    }
  }
  function vb(a2, b2) {
    if (-1 === a2.indexOf("-")) return "string" === typeof b2.is;
    switch (a2) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return false;
      default:
        return true;
    }
  }
  var wb = null;
  function xb(a2) {
    a2 = a2.target || a2.srcElement || window;
    a2.correspondingUseElement && (a2 = a2.correspondingUseElement);
    return 3 === a2.nodeType ? a2.parentNode : a2;
  }
  var yb = null,
    zb = null,
    Ab = null;
  function Bb(a2) {
    if ((a2 = Cb(a2))) {
      if ("function" !== typeof yb) throw Error(p$1(280));
      var b2 = a2.stateNode;
      b2 && ((b2 = Db(b2)), yb(a2.stateNode, a2.type, b2));
    }
  }
  function Eb(a2) {
    zb ? (Ab ? Ab.push(a2) : (Ab = [a2])) : (zb = a2);
  }
  function Fb() {
    if (zb) {
      var a2 = zb,
        b2 = Ab;
      Ab = zb = null;
      Bb(a2);
      if (b2) for (a2 = 0; a2 < b2.length; a2++) Bb(b2[a2]);
    }
  }
  function Gb(a2, b2) {
    return a2(b2);
  }
  function Hb() {}
  var Ib = false;
  function Jb(a2, b2, c2) {
    if (Ib) return a2(b2, c2);
    Ib = true;
    try {
      return Gb(a2, b2, c2);
    } finally {
      if (((Ib = false), null !== zb || null !== Ab)) Hb(), Fb();
    }
  }
  function Kb(a2, b2) {
    var c2 = a2.stateNode;
    if (null === c2) return null;
    var d2 = Db(c2);
    if (null === d2) return null;
    c2 = d2[b2];
    a: switch (b2) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (d2 = !d2.disabled) ||
          ((a2 = a2.type),
          (d2 = !(
            "button" === a2 ||
            "input" === a2 ||
            "select" === a2 ||
            "textarea" === a2
          )));
        a2 = !d2;
        break a;
      default:
        a2 = false;
    }
    if (a2) return null;
    if (c2 && "function" !== typeof c2) throw Error(p$1(231, b2, typeof c2));
    return c2;
  }
  var Lb = false;
  if (ia)
    try {
      var Mb = {};
      Object.defineProperty(Mb, "passive", {
        get: function () {
          Lb = true;
        },
      });
      window.addEventListener("test", Mb, Mb);
      window.removeEventListener("test", Mb, Mb);
    } catch (a2) {
      Lb = false;
    }
  function Nb(a2, b2, c2, d2, e2, f2, g2, h2, k2) {
    var l2 = Array.prototype.slice.call(arguments, 3);
    try {
      b2.apply(c2, l2);
    } catch (m2) {
      this.onError(m2);
    }
  }
  var Ob = false,
    Pb = null,
    Qb = false,
    Rb = null,
    Sb = {
      onError: function (a2) {
        Ob = true;
        Pb = a2;
      },
    };
  function Tb(a2, b2, c2, d2, e2, f2, g2, h2, k2) {
    Ob = false;
    Pb = null;
    Nb.apply(Sb, arguments);
  }
  function Ub(a2, b2, c2, d2, e2, f2, g2, h2, k2) {
    Tb.apply(this, arguments);
    if (Ob) {
      if (Ob) {
        var l2 = Pb;
        Ob = false;
        Pb = null;
      } else throw Error(p$1(198));
      Qb || ((Qb = true), (Rb = l2));
    }
  }
  function Vb(a2) {
    var b2 = a2,
      c2 = a2;
    if (a2.alternate) for (; b2.return; ) b2 = b2.return;
    else {
      a2 = b2;
      do
        (b2 = a2),
          0 !== (b2.flags & 4098) && (c2 = b2.return),
          (a2 = b2.return);
      while (a2);
    }
    return 3 === b2.tag ? c2 : null;
  }
  function Wb(a2) {
    if (13 === a2.tag) {
      var b2 = a2.memoizedState;
      null === b2 &&
        ((a2 = a2.alternate), null !== a2 && (b2 = a2.memoizedState));
      if (null !== b2) return b2.dehydrated;
    }
    return null;
  }
  function Xb(a2) {
    if (Vb(a2) !== a2) throw Error(p$1(188));
  }
  function Yb(a2) {
    var b2 = a2.alternate;
    if (!b2) {
      b2 = Vb(a2);
      if (null === b2) throw Error(p$1(188));
      return b2 !== a2 ? null : a2;
    }
    for (var c2 = a2, d2 = b2; ; ) {
      var e2 = c2.return;
      if (null === e2) break;
      var f2 = e2.alternate;
      if (null === f2) {
        d2 = e2.return;
        if (null !== d2) {
          c2 = d2;
          continue;
        }
        break;
      }
      if (e2.child === f2.child) {
        for (f2 = e2.child; f2; ) {
          if (f2 === c2) return Xb(e2), a2;
          if (f2 === d2) return Xb(e2), b2;
          f2 = f2.sibling;
        }
        throw Error(p$1(188));
      }
      if (c2.return !== d2.return) (c2 = e2), (d2 = f2);
      else {
        for (var g2 = false, h2 = e2.child; h2; ) {
          if (h2 === c2) {
            g2 = true;
            c2 = e2;
            d2 = f2;
            break;
          }
          if (h2 === d2) {
            g2 = true;
            d2 = e2;
            c2 = f2;
            break;
          }
          h2 = h2.sibling;
        }
        if (!g2) {
          for (h2 = f2.child; h2; ) {
            if (h2 === c2) {
              g2 = true;
              c2 = f2;
              d2 = e2;
              break;
            }
            if (h2 === d2) {
              g2 = true;
              d2 = f2;
              c2 = e2;
              break;
            }
            h2 = h2.sibling;
          }
          if (!g2) throw Error(p$1(189));
        }
      }
      if (c2.alternate !== d2) throw Error(p$1(190));
    }
    if (3 !== c2.tag) throw Error(p$1(188));
    return c2.stateNode.current === c2 ? a2 : b2;
  }
  function Zb(a2) {
    a2 = Yb(a2);
    return null !== a2 ? $b(a2) : null;
  }
  function $b(a2) {
    if (5 === a2.tag || 6 === a2.tag) return a2;
    for (a2 = a2.child; null !== a2; ) {
      var b2 = $b(a2);
      if (null !== b2) return b2;
      a2 = a2.sibling;
    }
    return null;
  }
  var ac = ca.unstable_scheduleCallback,
    bc = ca.unstable_cancelCallback,
    cc = ca.unstable_shouldYield,
    dc = ca.unstable_requestPaint,
    B$1 = ca.unstable_now,
    ec = ca.unstable_getCurrentPriorityLevel,
    fc = ca.unstable_ImmediatePriority,
    gc = ca.unstable_UserBlockingPriority,
    hc = ca.unstable_NormalPriority,
    ic = ca.unstable_LowPriority,
    jc = ca.unstable_IdlePriority,
    kc = null,
    lc = null;
  function mc(a2) {
    if (lc && "function" === typeof lc.onCommitFiberRoot)
      try {
        lc.onCommitFiberRoot(kc, a2, void 0, 128 === (a2.current.flags & 128));
      } catch (b2) {}
  }
  var oc = Math.clz32 ? Math.clz32 : nc,
    pc = Math.log,
    qc = Math.LN2;
  function nc(a2) {
    a2 >>>= 0;
    return 0 === a2 ? 32 : (31 - ((pc(a2) / qc) | 0)) | 0;
  }
  var rc = 64,
    sc = 4194304;
  function tc(a2) {
    switch (a2 & -a2) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return a2 & 4194240;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return a2 & 130023424;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 1073741824;
      default:
        return a2;
    }
  }
  function uc(a2, b2) {
    var c2 = a2.pendingLanes;
    if (0 === c2) return 0;
    var d2 = 0,
      e2 = a2.suspendedLanes,
      f2 = a2.pingedLanes,
      g2 = c2 & 268435455;
    if (0 !== g2) {
      var h2 = g2 & ~e2;
      0 !== h2 ? (d2 = tc(h2)) : ((f2 &= g2), 0 !== f2 && (d2 = tc(f2)));
    } else
      (g2 = c2 & ~e2), 0 !== g2 ? (d2 = tc(g2)) : 0 !== f2 && (d2 = tc(f2));
    if (0 === d2) return 0;
    if (
      0 !== b2 &&
      b2 !== d2 &&
      0 === (b2 & e2) &&
      ((e2 = d2 & -d2),
      (f2 = b2 & -b2),
      e2 >= f2 || (16 === e2 && 0 !== (f2 & 4194240)))
    )
      return b2;
    0 !== (d2 & 4) && (d2 |= c2 & 16);
    b2 = a2.entangledLanes;
    if (0 !== b2)
      for (a2 = a2.entanglements, b2 &= d2; 0 < b2; )
        (c2 = 31 - oc(b2)), (e2 = 1 << c2), (d2 |= a2[c2]), (b2 &= ~e2);
    return d2;
  }
  function vc(a2, b2) {
    switch (a2) {
      case 1:
      case 2:
      case 4:
        return b2 + 250;
      case 8:
      case 16:
      case 32:
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return b2 + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return -1;
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function wc(a2, b2) {
    for (
      var c2 = a2.suspendedLanes,
        d2 = a2.pingedLanes,
        e2 = a2.expirationTimes,
        f2 = a2.pendingLanes;
      0 < f2;

    ) {
      var g2 = 31 - oc(f2),
        h2 = 1 << g2,
        k2 = e2[g2];
      if (-1 === k2) {
        if (0 === (h2 & c2) || 0 !== (h2 & d2)) e2[g2] = vc(h2, b2);
      } else k2 <= b2 && (a2.expiredLanes |= h2);
      f2 &= ~h2;
    }
  }
  function xc(a2) {
    a2 = a2.pendingLanes & -1073741825;
    return 0 !== a2 ? a2 : a2 & 1073741824 ? 1073741824 : 0;
  }
  function yc() {
    var a2 = rc;
    rc <<= 1;
    0 === (rc & 4194240) && (rc = 64);
    return a2;
  }
  function zc(a2) {
    for (var b2 = [], c2 = 0; 31 > c2; c2++) b2.push(a2);
    return b2;
  }
  function Ac(a2, b2, c2) {
    a2.pendingLanes |= b2;
    536870912 !== b2 && ((a2.suspendedLanes = 0), (a2.pingedLanes = 0));
    a2 = a2.eventTimes;
    b2 = 31 - oc(b2);
    a2[b2] = c2;
  }
  function Bc(a2, b2) {
    var c2 = a2.pendingLanes & ~b2;
    a2.pendingLanes = b2;
    a2.suspendedLanes = 0;
    a2.pingedLanes = 0;
    a2.expiredLanes &= b2;
    a2.mutableReadLanes &= b2;
    a2.entangledLanes &= b2;
    b2 = a2.entanglements;
    var d2 = a2.eventTimes;
    for (a2 = a2.expirationTimes; 0 < c2; ) {
      var e2 = 31 - oc(c2),
        f2 = 1 << e2;
      b2[e2] = 0;
      d2[e2] = -1;
      a2[e2] = -1;
      c2 &= ~f2;
    }
  }
  function Cc(a2, b2) {
    var c2 = (a2.entangledLanes |= b2);
    for (a2 = a2.entanglements; c2; ) {
      var d2 = 31 - oc(c2),
        e2 = 1 << d2;
      (e2 & b2) | (a2[d2] & b2) && (a2[d2] |= b2);
      c2 &= ~e2;
    }
  }
  var C$1 = 0;
  function Dc(a2) {
    a2 &= -a2;
    return 1 < a2
      ? 4 < a2
        ? 0 !== (a2 & 268435455)
          ? 16
          : 536870912
        : 4
      : 1;
  }
  var Ec,
    Fc,
    Gc,
    Hc,
    Ic,
    Jc = false,
    Kc = [],
    Lc = null,
    Mc = null,
    Nc = null,
    Oc = /* @__PURE__ */ new Map(),
    Pc = /* @__PURE__ */ new Map(),
    Qc = [],
    Rc =
      "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(
        " "
      );
  function Sc(a2, b2) {
    switch (a2) {
      case "focusin":
      case "focusout":
        Lc = null;
        break;
      case "dragenter":
      case "dragleave":
        Mc = null;
        break;
      case "mouseover":
      case "mouseout":
        Nc = null;
        break;
      case "pointerover":
      case "pointerout":
        Oc.delete(b2.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Pc.delete(b2.pointerId);
    }
  }
  function Tc(a2, b2, c2, d2, e2, f2) {
    if (null === a2 || a2.nativeEvent !== f2)
      return (
        (a2 = {
          blockedOn: b2,
          domEventName: c2,
          eventSystemFlags: d2,
          nativeEvent: f2,
          targetContainers: [e2],
        }),
        null !== b2 && ((b2 = Cb(b2)), null !== b2 && Fc(b2)),
        a2
      );
    a2.eventSystemFlags |= d2;
    b2 = a2.targetContainers;
    null !== e2 && -1 === b2.indexOf(e2) && b2.push(e2);
    return a2;
  }
  function Uc(a2, b2, c2, d2, e2) {
    switch (b2) {
      case "focusin":
        return (Lc = Tc(Lc, a2, b2, c2, d2, e2)), true;
      case "dragenter":
        return (Mc = Tc(Mc, a2, b2, c2, d2, e2)), true;
      case "mouseover":
        return (Nc = Tc(Nc, a2, b2, c2, d2, e2)), true;
      case "pointerover":
        var f2 = e2.pointerId;
        Oc.set(f2, Tc(Oc.get(f2) || null, a2, b2, c2, d2, e2));
        return true;
      case "gotpointercapture":
        return (
          (f2 = e2.pointerId),
          Pc.set(f2, Tc(Pc.get(f2) || null, a2, b2, c2, d2, e2)),
          true
        );
    }
    return false;
  }
  function Vc(a2) {
    var b2 = Wc(a2.target);
    if (null !== b2) {
      var c2 = Vb(b2);
      if (null !== c2) {
        if (((b2 = c2.tag), 13 === b2)) {
          if (((b2 = Wb(c2)), null !== b2)) {
            a2.blockedOn = b2;
            Ic(a2.priority, function () {
              Gc(c2);
            });
            return;
          }
        } else if (
          3 === b2 &&
          c2.stateNode.current.memoizedState.isDehydrated
        ) {
          a2.blockedOn = 3 === c2.tag ? c2.stateNode.containerInfo : null;
          return;
        }
      }
    }
    a2.blockedOn = null;
  }
  function Xc(a2) {
    if (null !== a2.blockedOn) return false;
    for (var b2 = a2.targetContainers; 0 < b2.length; ) {
      var c2 = Yc(a2.domEventName, a2.eventSystemFlags, b2[0], a2.nativeEvent);
      if (null === c2) {
        c2 = a2.nativeEvent;
        var d2 = new c2.constructor(c2.type, c2);
        wb = d2;
        c2.target.dispatchEvent(d2);
        wb = null;
      } else
        return (b2 = Cb(c2)), null !== b2 && Fc(b2), (a2.blockedOn = c2), false;
      b2.shift();
    }
    return true;
  }
  function Zc(a2, b2, c2) {
    Xc(a2) && c2.delete(b2);
  }
  function $c() {
    Jc = false;
    null !== Lc && Xc(Lc) && (Lc = null);
    null !== Mc && Xc(Mc) && (Mc = null);
    null !== Nc && Xc(Nc) && (Nc = null);
    Oc.forEach(Zc);
    Pc.forEach(Zc);
  }
  function ad(a2, b2) {
    a2.blockedOn === b2 &&
      ((a2.blockedOn = null),
      Jc ||
        ((Jc = true),
        ca.unstable_scheduleCallback(ca.unstable_NormalPriority, $c)));
  }
  function bd(a2) {
    function b2(b3) {
      return ad(b3, a2);
    }
    if (0 < Kc.length) {
      ad(Kc[0], a2);
      for (var c2 = 1; c2 < Kc.length; c2++) {
        var d2 = Kc[c2];
        d2.blockedOn === a2 && (d2.blockedOn = null);
      }
    }
    null !== Lc && ad(Lc, a2);
    null !== Mc && ad(Mc, a2);
    null !== Nc && ad(Nc, a2);
    Oc.forEach(b2);
    Pc.forEach(b2);
    for (c2 = 0; c2 < Qc.length; c2++)
      (d2 = Qc[c2]), d2.blockedOn === a2 && (d2.blockedOn = null);
    for (; 0 < Qc.length && ((c2 = Qc[0]), null === c2.blockedOn); )
      Vc(c2), null === c2.blockedOn && Qc.shift();
  }
  var cd = ua.ReactCurrentBatchConfig,
    dd = true;
  function ed(a2, b2, c2, d2) {
    var e2 = C$1,
      f2 = cd.transition;
    cd.transition = null;
    try {
      (C$1 = 1), fd(a2, b2, c2, d2);
    } finally {
      (C$1 = e2), (cd.transition = f2);
    }
  }
  function gd(a2, b2, c2, d2) {
    var e2 = C$1,
      f2 = cd.transition;
    cd.transition = null;
    try {
      (C$1 = 4), fd(a2, b2, c2, d2);
    } finally {
      (C$1 = e2), (cd.transition = f2);
    }
  }
  function fd(a2, b2, c2, d2) {
    if (dd) {
      var e2 = Yc(a2, b2, c2, d2);
      if (null === e2) hd(a2, b2, d2, id, c2), Sc(a2, d2);
      else if (Uc(e2, a2, b2, c2, d2)) d2.stopPropagation();
      else if ((Sc(a2, d2), b2 & 4 && -1 < Rc.indexOf(a2))) {
        for (; null !== e2; ) {
          var f2 = Cb(e2);
          null !== f2 && Ec(f2);
          f2 = Yc(a2, b2, c2, d2);
          null === f2 && hd(a2, b2, d2, id, c2);
          if (f2 === e2) break;
          e2 = f2;
        }
        null !== e2 && d2.stopPropagation();
      } else hd(a2, b2, d2, null, c2);
    }
  }
  var id = null;
  function Yc(a2, b2, c2, d2) {
    id = null;
    a2 = xb(d2);
    a2 = Wc(a2);
    if (null !== a2)
      if (((b2 = Vb(a2)), null === b2)) a2 = null;
      else if (((c2 = b2.tag), 13 === c2)) {
        a2 = Wb(b2);
        if (null !== a2) return a2;
        a2 = null;
      } else if (3 === c2) {
        if (b2.stateNode.current.memoizedState.isDehydrated)
          return 3 === b2.tag ? b2.stateNode.containerInfo : null;
        a2 = null;
      } else b2 !== a2 && (a2 = null);
    id = a2;
    return null;
  }
  function jd(a2) {
    switch (a2) {
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 1;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "toggle":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 4;
      case "message":
        switch (ec()) {
          case fc:
            return 1;
          case gc:
            return 4;
          case hc:
          case ic:
            return 16;
          case jc:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var kd = null,
    ld = null,
    md = null;
  function nd() {
    if (md) return md;
    var a2,
      b2 = ld,
      c2 = b2.length,
      d2,
      e2 = "value" in kd ? kd.value : kd.textContent,
      f2 = e2.length;
    for (a2 = 0; a2 < c2 && b2[a2] === e2[a2]; a2++);
    var g2 = c2 - a2;
    for (d2 = 1; d2 <= g2 && b2[c2 - d2] === e2[f2 - d2]; d2++);
    return (md = e2.slice(a2, 1 < d2 ? 1 - d2 : void 0));
  }
  function od(a2) {
    var b2 = a2.keyCode;
    "charCode" in a2
      ? ((a2 = a2.charCode), 0 === a2 && 13 === b2 && (a2 = 13))
      : (a2 = b2);
    10 === a2 && (a2 = 13);
    return 32 <= a2 || 13 === a2 ? a2 : 0;
  }
  function pd() {
    return true;
  }
  function qd() {
    return false;
  }
  function rd(a2) {
    function b2(b3, d2, e2, f2, g2) {
      this._reactName = b3;
      this._targetInst = e2;
      this.type = d2;
      this.nativeEvent = f2;
      this.target = g2;
      this.currentTarget = null;
      for (var c2 in a2)
        a2.hasOwnProperty(c2) &&
          ((b3 = a2[c2]), (this[c2] = b3 ? b3(f2) : f2[c2]));
      this.isDefaultPrevented = (
        null != f2.defaultPrevented
          ? f2.defaultPrevented
          : false === f2.returnValue
      )
        ? pd
        : qd;
      this.isPropagationStopped = qd;
      return this;
    }
    A$1(b2.prototype, {
      preventDefault: function () {
        this.defaultPrevented = true;
        var a3 = this.nativeEvent;
        a3 &&
          (a3.preventDefault
            ? a3.preventDefault()
            : "unknown" !== typeof a3.returnValue && (a3.returnValue = false),
          (this.isDefaultPrevented = pd));
      },
      stopPropagation: function () {
        var a3 = this.nativeEvent;
        a3 &&
          (a3.stopPropagation
            ? a3.stopPropagation()
            : "unknown" !== typeof a3.cancelBubble && (a3.cancelBubble = true),
          (this.isPropagationStopped = pd));
      },
      persist: function () {},
      isPersistent: pd,
    });
    return b2;
  }
  var sd = {
      eventPhase: 0,
      bubbles: 0,
      cancelable: 0,
      timeStamp: function (a2) {
        return a2.timeStamp || Date.now();
      },
      defaultPrevented: 0,
      isTrusted: 0,
    },
    td = rd(sd),
    ud = A$1({}, sd, { view: 0, detail: 0 }),
    vd = rd(ud),
    wd,
    xd,
    yd,
    Ad = A$1({}, ud, {
      screenX: 0,
      screenY: 0,
      clientX: 0,
      clientY: 0,
      pageX: 0,
      pageY: 0,
      ctrlKey: 0,
      shiftKey: 0,
      altKey: 0,
      metaKey: 0,
      getModifierState: zd,
      button: 0,
      buttons: 0,
      relatedTarget: function (a2) {
        return void 0 === a2.relatedTarget
          ? a2.fromElement === a2.srcElement
            ? a2.toElement
            : a2.fromElement
          : a2.relatedTarget;
      },
      movementX: function (a2) {
        if ("movementX" in a2) return a2.movementX;
        a2 !== yd &&
          (yd && "mousemove" === a2.type
            ? ((wd = a2.screenX - yd.screenX), (xd = a2.screenY - yd.screenY))
            : (xd = wd = 0),
          (yd = a2));
        return wd;
      },
      movementY: function (a2) {
        return "movementY" in a2 ? a2.movementY : xd;
      },
    }),
    Bd = rd(Ad),
    Cd = A$1({}, Ad, { dataTransfer: 0 }),
    Dd = rd(Cd),
    Ed = A$1({}, ud, { relatedTarget: 0 }),
    Fd = rd(Ed),
    Gd = A$1({}, sd, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
    Hd = rd(Gd),
    Id = A$1({}, sd, {
      clipboardData: function (a2) {
        return "clipboardData" in a2 ? a2.clipboardData : window.clipboardData;
      },
    }),
    Jd = rd(Id),
    Kd = A$1({}, sd, { data: 0 }),
    Ld = rd(Kd),
    Md = {
      Esc: "Escape",
      Spacebar: " ",
      Left: "ArrowLeft",
      Up: "ArrowUp",
      Right: "ArrowRight",
      Down: "ArrowDown",
      Del: "Delete",
      Win: "OS",
      Menu: "ContextMenu",
      Apps: "ContextMenu",
      Scroll: "ScrollLock",
      MozPrintableKey: "Unidentified",
    },
    Nd = {
      8: "Backspace",
      9: "Tab",
      12: "Clear",
      13: "Enter",
      16: "Shift",
      17: "Control",
      18: "Alt",
      19: "Pause",
      20: "CapsLock",
      27: "Escape",
      32: " ",
      33: "PageUp",
      34: "PageDown",
      35: "End",
      36: "Home",
      37: "ArrowLeft",
      38: "ArrowUp",
      39: "ArrowRight",
      40: "ArrowDown",
      45: "Insert",
      46: "Delete",
      112: "F1",
      113: "F2",
      114: "F3",
      115: "F4",
      116: "F5",
      117: "F6",
      118: "F7",
      119: "F8",
      120: "F9",
      121: "F10",
      122: "F11",
      123: "F12",
      144: "NumLock",
      145: "ScrollLock",
      224: "Meta",
    },
    Od = {
      Alt: "altKey",
      Control: "ctrlKey",
      Meta: "metaKey",
      Shift: "shiftKey",
    };
  function Pd(a2) {
    var b2 = this.nativeEvent;
    return b2.getModifierState
      ? b2.getModifierState(a2)
      : (a2 = Od[a2])
      ? !!b2[a2]
      : false;
  }
  function zd() {
    return Pd;
  }
  var Qd = A$1({}, ud, {
      key: function (a2) {
        if (a2.key) {
          var b2 = Md[a2.key] || a2.key;
          if ("Unidentified" !== b2) return b2;
        }
        return "keypress" === a2.type
          ? ((a2 = od(a2)), 13 === a2 ? "Enter" : String.fromCharCode(a2))
          : "keydown" === a2.type || "keyup" === a2.type
          ? Nd[a2.keyCode] || "Unidentified"
          : "";
      },
      code: 0,
      location: 0,
      ctrlKey: 0,
      shiftKey: 0,
      altKey: 0,
      metaKey: 0,
      repeat: 0,
      locale: 0,
      getModifierState: zd,
      charCode: function (a2) {
        return "keypress" === a2.type ? od(a2) : 0;
      },
      keyCode: function (a2) {
        return "keydown" === a2.type || "keyup" === a2.type ? a2.keyCode : 0;
      },
      which: function (a2) {
        return "keypress" === a2.type
          ? od(a2)
          : "keydown" === a2.type || "keyup" === a2.type
          ? a2.keyCode
          : 0;
      },
    }),
    Rd = rd(Qd),
    Sd = A$1({}, Ad, {
      pointerId: 0,
      width: 0,
      height: 0,
      pressure: 0,
      tangentialPressure: 0,
      tiltX: 0,
      tiltY: 0,
      twist: 0,
      pointerType: 0,
      isPrimary: 0,
    }),
    Td = rd(Sd),
    Ud = A$1({}, ud, {
      touches: 0,
      targetTouches: 0,
      changedTouches: 0,
      altKey: 0,
      metaKey: 0,
      ctrlKey: 0,
      shiftKey: 0,
      getModifierState: zd,
    }),
    Vd = rd(Ud),
    Wd = A$1({}, sd, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
    Xd = rd(Wd),
    Yd = A$1({}, Ad, {
      deltaX: function (a2) {
        return "deltaX" in a2
          ? a2.deltaX
          : "wheelDeltaX" in a2
          ? -a2.wheelDeltaX
          : 0;
      },
      deltaY: function (a2) {
        return "deltaY" in a2
          ? a2.deltaY
          : "wheelDeltaY" in a2
          ? -a2.wheelDeltaY
          : "wheelDelta" in a2
          ? -a2.wheelDelta
          : 0;
      },
      deltaZ: 0,
      deltaMode: 0,
    }),
    Zd = rd(Yd),
    $d = [9, 13, 27, 32],
    ae = ia && "CompositionEvent" in window,
    be = null;
  ia && "documentMode" in document && (be = document.documentMode);
  var ce = ia && "TextEvent" in window && !be,
    de = ia && (!ae || (be && 8 < be && 11 >= be)),
    ee$1 = String.fromCharCode(32),
    fe = false;
  function ge(a2, b2) {
    switch (a2) {
      case "keyup":
        return -1 !== $d.indexOf(b2.keyCode);
      case "keydown":
        return 229 !== b2.keyCode;
      case "keypress":
      case "mousedown":
      case "focusout":
        return true;
      default:
        return false;
    }
  }
  function he(a2) {
    a2 = a2.detail;
    return "object" === typeof a2 && "data" in a2 ? a2.data : null;
  }
  var ie = false;
  function je(a2, b2) {
    switch (a2) {
      case "compositionend":
        return he(b2);
      case "keypress":
        if (32 !== b2.which) return null;
        fe = true;
        return ee$1;
      case "textInput":
        return (a2 = b2.data), a2 === ee$1 && fe ? null : a2;
      default:
        return null;
    }
  }
  function ke(a2, b2) {
    if (ie)
      return "compositionend" === a2 || (!ae && ge(a2, b2))
        ? ((a2 = nd()), (md = ld = kd = null), (ie = false), a2)
        : null;
    switch (a2) {
      case "paste":
        return null;
      case "keypress":
        if (
          !(b2.ctrlKey || b2.altKey || b2.metaKey) ||
          (b2.ctrlKey && b2.altKey)
        ) {
          if (b2.char && 1 < b2.char.length) return b2.char;
          if (b2.which) return String.fromCharCode(b2.which);
        }
        return null;
      case "compositionend":
        return de && "ko" !== b2.locale ? null : b2.data;
      default:
        return null;
    }
  }
  var le = {
    color: true,
    date: true,
    datetime: true,
    "datetime-local": true,
    email: true,
    month: true,
    number: true,
    password: true,
    range: true,
    search: true,
    tel: true,
    text: true,
    time: true,
    url: true,
    week: true,
  };
  function me(a2) {
    var b2 = a2 && a2.nodeName && a2.nodeName.toLowerCase();
    return "input" === b2 ? !!le[a2.type] : "textarea" === b2 ? true : false;
  }
  function ne(a2, b2, c2, d2) {
    Eb(d2);
    b2 = oe(b2, "onChange");
    0 < b2.length &&
      ((c2 = new td("onChange", "change", null, c2, d2)),
      a2.push({ event: c2, listeners: b2 }));
  }
  var pe = null,
    qe = null;
  function re(a2) {
    se(a2, 0);
  }
  function te$1(a2) {
    var b2 = ue(a2);
    if (Wa(b2)) return a2;
  }
  function ve(a2, b2) {
    if ("change" === a2) return b2;
  }
  var we = false;
  if (ia) {
    var xe;
    if (ia) {
      var ye = "oninput" in document;
      if (!ye) {
        var ze = document.createElement("div");
        ze.setAttribute("oninput", "return;");
        ye = "function" === typeof ze.oninput;
      }
      xe = ye;
    } else xe = false;
    we = xe && (!document.documentMode || 9 < document.documentMode);
  }
  function Ae() {
    pe && (pe.detachEvent("onpropertychange", Be), (qe = pe = null));
  }
  function Be(a2) {
    if ("value" === a2.propertyName && te$1(qe)) {
      var b2 = [];
      ne(b2, qe, a2, xb(a2));
      Jb(re, b2);
    }
  }
  function Ce(a2, b2, c2) {
    "focusin" === a2
      ? (Ae(), (pe = b2), (qe = c2), pe.attachEvent("onpropertychange", Be))
      : "focusout" === a2 && Ae();
  }
  function De(a2) {
    if ("selectionchange" === a2 || "keyup" === a2 || "keydown" === a2)
      return te$1(qe);
  }
  function Ee(a2, b2) {
    if ("click" === a2) return te$1(b2);
  }
  function Fe(a2, b2) {
    if ("input" === a2 || "change" === a2) return te$1(b2);
  }
  function Ge(a2, b2) {
    return (
      (a2 === b2 && (0 !== a2 || 1 / a2 === 1 / b2)) || (a2 !== a2 && b2 !== b2)
    );
  }
  var He = "function" === typeof Object.is ? Object.is : Ge;
  function Ie(a2, b2) {
    if (He(a2, b2)) return true;
    if (
      "object" !== typeof a2 ||
      null === a2 ||
      "object" !== typeof b2 ||
      null === b2
    )
      return false;
    var c2 = Object.keys(a2),
      d2 = Object.keys(b2);
    if (c2.length !== d2.length) return false;
    for (d2 = 0; d2 < c2.length; d2++) {
      var e2 = c2[d2];
      if (!ja.call(b2, e2) || !He(a2[e2], b2[e2])) return false;
    }
    return true;
  }
  function Je(a2) {
    for (; a2 && a2.firstChild; ) a2 = a2.firstChild;
    return a2;
  }
  function Ke(a2, b2) {
    var c2 = Je(a2);
    a2 = 0;
    for (var d2; c2; ) {
      if (3 === c2.nodeType) {
        d2 = a2 + c2.textContent.length;
        if (a2 <= b2 && d2 >= b2) return { node: c2, offset: b2 - a2 };
        a2 = d2;
      }
      a: {
        for (; c2; ) {
          if (c2.nextSibling) {
            c2 = c2.nextSibling;
            break a;
          }
          c2 = c2.parentNode;
        }
        c2 = void 0;
      }
      c2 = Je(c2);
    }
  }
  function Le(a2, b2) {
    return a2 && b2
      ? a2 === b2
        ? true
        : a2 && 3 === a2.nodeType
        ? false
        : b2 && 3 === b2.nodeType
        ? Le(a2, b2.parentNode)
        : "contains" in a2
        ? a2.contains(b2)
        : a2.compareDocumentPosition
        ? !!(a2.compareDocumentPosition(b2) & 16)
        : false
      : false;
  }
  function Me() {
    for (var a2 = window, b2 = Xa(); b2 instanceof a2.HTMLIFrameElement; ) {
      try {
        var c2 = "string" === typeof b2.contentWindow.location.href;
      } catch (d2) {
        c2 = false;
      }
      if (c2) a2 = b2.contentWindow;
      else break;
      b2 = Xa(a2.document);
    }
    return b2;
  }
  function Ne(a2) {
    var b2 = a2 && a2.nodeName && a2.nodeName.toLowerCase();
    return (
      b2 &&
      (("input" === b2 &&
        ("text" === a2.type ||
          "search" === a2.type ||
          "tel" === a2.type ||
          "url" === a2.type ||
          "password" === a2.type)) ||
        "textarea" === b2 ||
        "true" === a2.contentEditable)
    );
  }
  function Oe(a2) {
    var b2 = Me(),
      c2 = a2.focusedElem,
      d2 = a2.selectionRange;
    if (
      b2 !== c2 &&
      c2 &&
      c2.ownerDocument &&
      Le(c2.ownerDocument.documentElement, c2)
    ) {
      if (null !== d2 && Ne(c2)) {
        if (
          ((b2 = d2.start),
          (a2 = d2.end),
          void 0 === a2 && (a2 = b2),
          "selectionStart" in c2)
        )
          (c2.selectionStart = b2),
            (c2.selectionEnd = Math.min(a2, c2.value.length));
        else if (
          ((a2 =
            ((b2 = c2.ownerDocument || document) && b2.defaultView) || window),
          a2.getSelection)
        ) {
          a2 = a2.getSelection();
          var e2 = c2.textContent.length,
            f2 = Math.min(d2.start, e2);
          d2 = void 0 === d2.end ? f2 : Math.min(d2.end, e2);
          !a2.extend && f2 > d2 && ((e2 = d2), (d2 = f2), (f2 = e2));
          e2 = Ke(c2, f2);
          var g2 = Ke(c2, d2);
          e2 &&
            g2 &&
            (1 !== a2.rangeCount ||
              a2.anchorNode !== e2.node ||
              a2.anchorOffset !== e2.offset ||
              a2.focusNode !== g2.node ||
              a2.focusOffset !== g2.offset) &&
            ((b2 = b2.createRange()),
            b2.setStart(e2.node, e2.offset),
            a2.removeAllRanges(),
            f2 > d2
              ? (a2.addRange(b2), a2.extend(g2.node, g2.offset))
              : (b2.setEnd(g2.node, g2.offset), a2.addRange(b2)));
        }
      }
      b2 = [];
      for (a2 = c2; (a2 = a2.parentNode); )
        1 === a2.nodeType &&
          b2.push({ element: a2, left: a2.scrollLeft, top: a2.scrollTop });
      "function" === typeof c2.focus && c2.focus();
      for (c2 = 0; c2 < b2.length; c2++)
        (a2 = b2[c2]),
          (a2.element.scrollLeft = a2.left),
          (a2.element.scrollTop = a2.top);
    }
  }
  var Pe = ia && "documentMode" in document && 11 >= document.documentMode,
    Qe = null,
    Re = null,
    Se = null,
    Te = false;
  function Ue(a2, b2, c2) {
    var d2 =
      c2.window === c2
        ? c2.document
        : 9 === c2.nodeType
        ? c2
        : c2.ownerDocument;
    Te ||
      null == Qe ||
      Qe !== Xa(d2) ||
      ((d2 = Qe),
      "selectionStart" in d2 && Ne(d2)
        ? (d2 = { start: d2.selectionStart, end: d2.selectionEnd })
        : ((d2 = (
            (d2.ownerDocument && d2.ownerDocument.defaultView) ||
            window
          ).getSelection()),
          (d2 = {
            anchorNode: d2.anchorNode,
            anchorOffset: d2.anchorOffset,
            focusNode: d2.focusNode,
            focusOffset: d2.focusOffset,
          })),
      (Se && Ie(Se, d2)) ||
        ((Se = d2),
        (d2 = oe(Re, "onSelect")),
        0 < d2.length &&
          ((b2 = new td("onSelect", "select", null, b2, c2)),
          a2.push({ event: b2, listeners: d2 }),
          (b2.target = Qe))));
  }
  function Ve(a2, b2) {
    var c2 = {};
    c2[a2.toLowerCase()] = b2.toLowerCase();
    c2["Webkit" + a2] = "webkit" + b2;
    c2["Moz" + a2] = "moz" + b2;
    return c2;
  }
  var We = {
      animationend: Ve("Animation", "AnimationEnd"),
      animationiteration: Ve("Animation", "AnimationIteration"),
      animationstart: Ve("Animation", "AnimationStart"),
      transitionend: Ve("Transition", "TransitionEnd"),
    },
    Xe = {},
    Ye = {};
  ia &&
    ((Ye = document.createElement("div").style),
    "AnimationEvent" in window ||
      (delete We.animationend.animation,
      delete We.animationiteration.animation,
      delete We.animationstart.animation),
    "TransitionEvent" in window || delete We.transitionend.transition);
  function Ze(a2) {
    if (Xe[a2]) return Xe[a2];
    if (!We[a2]) return a2;
    var b2 = We[a2],
      c2;
    for (c2 in b2)
      if (b2.hasOwnProperty(c2) && c2 in Ye) return (Xe[a2] = b2[c2]);
    return a2;
  }
  var $e = Ze("animationend"),
    af = Ze("animationiteration"),
    bf = Ze("animationstart"),
    cf = Ze("transitionend"),
    df = /* @__PURE__ */ new Map(),
    ef =
      "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
        " "
      );
  function ff(a2, b2) {
    df.set(a2, b2);
    fa(b2, [a2]);
  }
  for (var gf = 0; gf < ef.length; gf++) {
    var hf = ef[gf],
      jf = hf.toLowerCase(),
      kf = hf[0].toUpperCase() + hf.slice(1);
    ff(jf, "on" + kf);
  }
  ff($e, "onAnimationEnd");
  ff(af, "onAnimationIteration");
  ff(bf, "onAnimationStart");
  ff("dblclick", "onDoubleClick");
  ff("focusin", "onFocus");
  ff("focusout", "onBlur");
  ff(cf, "onTransitionEnd");
  ha("onMouseEnter", ["mouseout", "mouseover"]);
  ha("onMouseLeave", ["mouseout", "mouseover"]);
  ha("onPointerEnter", ["pointerout", "pointerover"]);
  ha("onPointerLeave", ["pointerout", "pointerover"]);
  fa(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(
      " "
    )
  );
  fa(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  );
  fa("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
  fa(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  );
  fa(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  );
  fa(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var lf =
      "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
        " "
      ),
    mf = new Set(
      "cancel close invalid load scroll toggle".split(" ").concat(lf)
    );
  function nf(a2, b2, c2) {
    var d2 = a2.type || "unknown-event";
    a2.currentTarget = c2;
    Ub(d2, b2, void 0, a2);
    a2.currentTarget = null;
  }
  function se(a2, b2) {
    b2 = 0 !== (b2 & 4);
    for (var c2 = 0; c2 < a2.length; c2++) {
      var d2 = a2[c2],
        e2 = d2.event;
      d2 = d2.listeners;
      a: {
        var f2 = void 0;
        if (b2)
          for (var g2 = d2.length - 1; 0 <= g2; g2--) {
            var h2 = d2[g2],
              k2 = h2.instance,
              l2 = h2.currentTarget;
            h2 = h2.listener;
            if (k2 !== f2 && e2.isPropagationStopped()) break a;
            nf(e2, h2, l2);
            f2 = k2;
          }
        else
          for (g2 = 0; g2 < d2.length; g2++) {
            h2 = d2[g2];
            k2 = h2.instance;
            l2 = h2.currentTarget;
            h2 = h2.listener;
            if (k2 !== f2 && e2.isPropagationStopped()) break a;
            nf(e2, h2, l2);
            f2 = k2;
          }
      }
    }
    if (Qb) throw ((a2 = Rb), (Qb = false), (Rb = null), a2);
  }
  function D$1(a2, b2) {
    var c2 = b2[of];
    void 0 === c2 && (c2 = b2[of] = /* @__PURE__ */ new Set());
    var d2 = a2 + "__bubble";
    c2.has(d2) || (pf(b2, a2, 2, false), c2.add(d2));
  }
  function qf(a2, b2, c2) {
    var d2 = 0;
    b2 && (d2 |= 4);
    pf(c2, a2, d2, b2);
  }
  var rf = "_reactListening" + Math.random().toString(36).slice(2);
  function sf(a2) {
    if (!a2[rf]) {
      a2[rf] = true;
      da.forEach(function (b3) {
        "selectionchange" !== b3 &&
          (mf.has(b3) || qf(b3, false, a2), qf(b3, true, a2));
      });
      var b2 = 9 === a2.nodeType ? a2 : a2.ownerDocument;
      null === b2 ||
        b2[rf] ||
        ((b2[rf] = true), qf("selectionchange", false, b2));
    }
  }
  function pf(a2, b2, c2, d2) {
    switch (jd(b2)) {
      case 1:
        var e2 = ed;
        break;
      case 4:
        e2 = gd;
        break;
      default:
        e2 = fd;
    }
    c2 = e2.bind(null, b2, c2, a2);
    e2 = void 0;
    !Lb ||
      ("touchstart" !== b2 && "touchmove" !== b2 && "wheel" !== b2) ||
      (e2 = true);
    d2
      ? void 0 !== e2
        ? a2.addEventListener(b2, c2, { capture: true, passive: e2 })
        : a2.addEventListener(b2, c2, true)
      : void 0 !== e2
      ? a2.addEventListener(b2, c2, { passive: e2 })
      : a2.addEventListener(b2, c2, false);
  }
  function hd(a2, b2, c2, d2, e2) {
    var f2 = d2;
    if (0 === (b2 & 1) && 0 === (b2 & 2) && null !== d2)
      a: for (;;) {
        if (null === d2) return;
        var g2 = d2.tag;
        if (3 === g2 || 4 === g2) {
          var h2 = d2.stateNode.containerInfo;
          if (h2 === e2 || (8 === h2.nodeType && h2.parentNode === e2)) break;
          if (4 === g2)
            for (g2 = d2.return; null !== g2; ) {
              var k2 = g2.tag;
              if (3 === k2 || 4 === k2) {
                if (
                  ((k2 = g2.stateNode.containerInfo),
                  k2 === e2 || (8 === k2.nodeType && k2.parentNode === e2))
                )
                  return;
              }
              g2 = g2.return;
            }
          for (; null !== h2; ) {
            g2 = Wc(h2);
            if (null === g2) return;
            k2 = g2.tag;
            if (5 === k2 || 6 === k2) {
              d2 = f2 = g2;
              continue a;
            }
            h2 = h2.parentNode;
          }
        }
        d2 = d2.return;
      }
    Jb(function () {
      var d3 = f2,
        e3 = xb(c2),
        g3 = [];
      a: {
        var h3 = df.get(a2);
        if (void 0 !== h3) {
          var k3 = td,
            n2 = a2;
          switch (a2) {
            case "keypress":
              if (0 === od(c2)) break a;
            case "keydown":
            case "keyup":
              k3 = Rd;
              break;
            case "focusin":
              n2 = "focus";
              k3 = Fd;
              break;
            case "focusout":
              n2 = "blur";
              k3 = Fd;
              break;
            case "beforeblur":
            case "afterblur":
              k3 = Fd;
              break;
            case "click":
              if (2 === c2.button) break a;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              k3 = Bd;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              k3 = Dd;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              k3 = Vd;
              break;
            case $e:
            case af:
            case bf:
              k3 = Hd;
              break;
            case cf:
              k3 = Xd;
              break;
            case "scroll":
              k3 = vd;
              break;
            case "wheel":
              k3 = Zd;
              break;
            case "copy":
            case "cut":
            case "paste":
              k3 = Jd;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              k3 = Td;
          }
          var t2 = 0 !== (b2 & 4),
            J2 = !t2 && "scroll" === a2,
            x2 = t2 ? (null !== h3 ? h3 + "Capture" : null) : h3;
          t2 = [];
          for (var w2 = d3, u2; null !== w2; ) {
            u2 = w2;
            var F2 = u2.stateNode;
            5 === u2.tag &&
              null !== F2 &&
              ((u2 = F2),
              null !== x2 &&
                ((F2 = Kb(w2, x2)), null != F2 && t2.push(tf(w2, F2, u2))));
            if (J2) break;
            w2 = w2.return;
          }
          0 < t2.length &&
            ((h3 = new k3(h3, n2, null, c2, e3)),
            g3.push({ event: h3, listeners: t2 }));
        }
      }
      if (0 === (b2 & 7)) {
        a: {
          h3 = "mouseover" === a2 || "pointerover" === a2;
          k3 = "mouseout" === a2 || "pointerout" === a2;
          if (
            h3 &&
            c2 !== wb &&
            (n2 = c2.relatedTarget || c2.fromElement) &&
            (Wc(n2) || n2[uf])
          )
            break a;
          if (k3 || h3) {
            h3 =
              e3.window === e3
                ? e3
                : (h3 = e3.ownerDocument)
                ? h3.defaultView || h3.parentWindow
                : window;
            if (k3) {
              if (
                ((n2 = c2.relatedTarget || c2.toElement),
                (k3 = d3),
                (n2 = n2 ? Wc(n2) : null),
                null !== n2 &&
                  ((J2 = Vb(n2)), n2 !== J2 || (5 !== n2.tag && 6 !== n2.tag)))
              )
                n2 = null;
            } else (k3 = null), (n2 = d3);
            if (k3 !== n2) {
              t2 = Bd;
              F2 = "onMouseLeave";
              x2 = "onMouseEnter";
              w2 = "mouse";
              if ("pointerout" === a2 || "pointerover" === a2)
                (t2 = Td),
                  (F2 = "onPointerLeave"),
                  (x2 = "onPointerEnter"),
                  (w2 = "pointer");
              J2 = null == k3 ? h3 : ue(k3);
              u2 = null == n2 ? h3 : ue(n2);
              h3 = new t2(F2, w2 + "leave", k3, c2, e3);
              h3.target = J2;
              h3.relatedTarget = u2;
              F2 = null;
              Wc(e3) === d3 &&
                ((t2 = new t2(x2, w2 + "enter", n2, c2, e3)),
                (t2.target = u2),
                (t2.relatedTarget = J2),
                (F2 = t2));
              J2 = F2;
              if (k3 && n2)
                b: {
                  t2 = k3;
                  x2 = n2;
                  w2 = 0;
                  for (u2 = t2; u2; u2 = vf(u2)) w2++;
                  u2 = 0;
                  for (F2 = x2; F2; F2 = vf(F2)) u2++;
                  for (; 0 < w2 - u2; ) (t2 = vf(t2)), w2--;
                  for (; 0 < u2 - w2; ) (x2 = vf(x2)), u2--;
                  for (; w2--; ) {
                    if (t2 === x2 || (null !== x2 && t2 === x2.alternate))
                      break b;
                    t2 = vf(t2);
                    x2 = vf(x2);
                  }
                  t2 = null;
                }
              else t2 = null;
              null !== k3 && wf(g3, h3, k3, t2, false);
              null !== n2 && null !== J2 && wf(g3, J2, n2, t2, true);
            }
          }
        }
        a: {
          h3 = d3 ? ue(d3) : window;
          k3 = h3.nodeName && h3.nodeName.toLowerCase();
          if ("select" === k3 || ("input" === k3 && "file" === h3.type))
            var na = ve;
          else if (me(h3))
            if (we) na = Fe;
            else {
              na = De;
              var xa = Ce;
            }
          else
            (k3 = h3.nodeName) &&
              "input" === k3.toLowerCase() &&
              ("checkbox" === h3.type || "radio" === h3.type) &&
              (na = Ee);
          if (na && (na = na(a2, d3))) {
            ne(g3, na, c2, e3);
            break a;
          }
          xa && xa(a2, h3, d3);
          "focusout" === a2 &&
            (xa = h3._wrapperState) &&
            xa.controlled &&
            "number" === h3.type &&
            cb(h3, "number", h3.value);
        }
        xa = d3 ? ue(d3) : window;
        switch (a2) {
          case "focusin":
            if (me(xa) || "true" === xa.contentEditable)
              (Qe = xa), (Re = d3), (Se = null);
            break;
          case "focusout":
            Se = Re = Qe = null;
            break;
          case "mousedown":
            Te = true;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Te = false;
            Ue(g3, c2, e3);
            break;
          case "selectionchange":
            if (Pe) break;
          case "keydown":
          case "keyup":
            Ue(g3, c2, e3);
        }
        var $a;
        if (ae)
          b: {
            switch (a2) {
              case "compositionstart":
                var ba = "onCompositionStart";
                break b;
              case "compositionend":
                ba = "onCompositionEnd";
                break b;
              case "compositionupdate":
                ba = "onCompositionUpdate";
                break b;
            }
            ba = void 0;
          }
        else
          ie
            ? ge(a2, c2) && (ba = "onCompositionEnd")
            : "keydown" === a2 &&
              229 === c2.keyCode &&
              (ba = "onCompositionStart");
        ba &&
          (de &&
            "ko" !== c2.locale &&
            (ie || "onCompositionStart" !== ba
              ? "onCompositionEnd" === ba && ie && ($a = nd())
              : ((kd = e3),
                (ld = "value" in kd ? kd.value : kd.textContent),
                (ie = true))),
          (xa = oe(d3, ba)),
          0 < xa.length &&
            ((ba = new Ld(ba, a2, null, c2, e3)),
            g3.push({ event: ba, listeners: xa }),
            $a
              ? (ba.data = $a)
              : (($a = he(c2)), null !== $a && (ba.data = $a))));
        if (($a = ce ? je(a2, c2) : ke(a2, c2)))
          (d3 = oe(d3, "onBeforeInput")),
            0 < d3.length &&
              ((e3 = new Ld("onBeforeInput", "beforeinput", null, c2, e3)),
              g3.push({ event: e3, listeners: d3 }),
              (e3.data = $a));
      }
      se(g3, b2);
    });
  }
  function tf(a2, b2, c2) {
    return { instance: a2, listener: b2, currentTarget: c2 };
  }
  function oe(a2, b2) {
    for (var c2 = b2 + "Capture", d2 = []; null !== a2; ) {
      var e2 = a2,
        f2 = e2.stateNode;
      5 === e2.tag &&
        null !== f2 &&
        ((e2 = f2),
        (f2 = Kb(a2, c2)),
        null != f2 && d2.unshift(tf(a2, f2, e2)),
        (f2 = Kb(a2, b2)),
        null != f2 && d2.push(tf(a2, f2, e2)));
      a2 = a2.return;
    }
    return d2;
  }
  function vf(a2) {
    if (null === a2) return null;
    do a2 = a2.return;
    while (a2 && 5 !== a2.tag);
    return a2 ? a2 : null;
  }
  function wf(a2, b2, c2, d2, e2) {
    for (var f2 = b2._reactName, g2 = []; null !== c2 && c2 !== d2; ) {
      var h2 = c2,
        k2 = h2.alternate,
        l2 = h2.stateNode;
      if (null !== k2 && k2 === d2) break;
      5 === h2.tag &&
        null !== l2 &&
        ((h2 = l2),
        e2
          ? ((k2 = Kb(c2, f2)), null != k2 && g2.unshift(tf(c2, k2, h2)))
          : e2 || ((k2 = Kb(c2, f2)), null != k2 && g2.push(tf(c2, k2, h2))));
      c2 = c2.return;
    }
    0 !== g2.length && a2.push({ event: b2, listeners: g2 });
  }
  var xf = /\r\n?/g,
    yf = /\u0000|\uFFFD/g;
  function zf(a2) {
    return ("string" === typeof a2 ? a2 : "" + a2)
      .replace(xf, "\n")
      .replace(yf, "");
  }
  function Af(a2, b2, c2) {
    b2 = zf(b2);
    if (zf(a2) !== b2 && c2) throw Error(p$1(425));
  }
  function Bf() {}
  var Cf = null,
    Df = null;
  function Ef(a2, b2) {
    return (
      "textarea" === a2 ||
      "noscript" === a2 ||
      "string" === typeof b2.children ||
      "number" === typeof b2.children ||
      ("object" === typeof b2.dangerouslySetInnerHTML &&
        null !== b2.dangerouslySetInnerHTML &&
        null != b2.dangerouslySetInnerHTML.__html)
    );
  }
  var Ff = "function" === typeof setTimeout ? setTimeout : void 0,
    Gf = "function" === typeof clearTimeout ? clearTimeout : void 0,
    Hf = "function" === typeof Promise ? Promise : void 0,
    Jf =
      "function" === typeof queueMicrotask
        ? queueMicrotask
        : "undefined" !== typeof Hf
        ? function (a2) {
            return Hf.resolve(null).then(a2).catch(If);
          }
        : Ff;
  function If(a2) {
    setTimeout(function () {
      throw a2;
    });
  }
  function Kf(a2, b2) {
    var c2 = b2,
      d2 = 0;
    do {
      var e2 = c2.nextSibling;
      a2.removeChild(c2);
      if (e2 && 8 === e2.nodeType)
        if (((c2 = e2.data), "/$" === c2)) {
          if (0 === d2) {
            a2.removeChild(e2);
            bd(b2);
            return;
          }
          d2--;
        } else ("$" !== c2 && "$?" !== c2 && "$!" !== c2) || d2++;
      c2 = e2;
    } while (c2);
    bd(b2);
  }
  function Lf(a2) {
    for (; null != a2; a2 = a2.nextSibling) {
      var b2 = a2.nodeType;
      if (1 === b2 || 3 === b2) break;
      if (8 === b2) {
        b2 = a2.data;
        if ("$" === b2 || "$!" === b2 || "$?" === b2) break;
        if ("/$" === b2) return null;
      }
    }
    return a2;
  }
  function Mf(a2) {
    a2 = a2.previousSibling;
    for (var b2 = 0; a2; ) {
      if (8 === a2.nodeType) {
        var c2 = a2.data;
        if ("$" === c2 || "$!" === c2 || "$?" === c2) {
          if (0 === b2) return a2;
          b2--;
        } else "/$" === c2 && b2++;
      }
      a2 = a2.previousSibling;
    }
    return null;
  }
  var Nf = Math.random().toString(36).slice(2),
    Of = "__reactFiber$" + Nf,
    Pf = "__reactProps$" + Nf,
    uf = "__reactContainer$" + Nf,
    of = "__reactEvents$" + Nf,
    Qf = "__reactListeners$" + Nf,
    Rf = "__reactHandles$" + Nf;
  function Wc(a2) {
    var b2 = a2[Of];
    if (b2) return b2;
    for (var c2 = a2.parentNode; c2; ) {
      if ((b2 = c2[uf] || c2[Of])) {
        c2 = b2.alternate;
        if (null !== b2.child || (null !== c2 && null !== c2.child))
          for (a2 = Mf(a2); null !== a2; ) {
            if ((c2 = a2[Of])) return c2;
            a2 = Mf(a2);
          }
        return b2;
      }
      a2 = c2;
      c2 = a2.parentNode;
    }
    return null;
  }
  function Cb(a2) {
    a2 = a2[Of] || a2[uf];
    return !a2 ||
      (5 !== a2.tag && 6 !== a2.tag && 13 !== a2.tag && 3 !== a2.tag)
      ? null
      : a2;
  }
  function ue(a2) {
    if (5 === a2.tag || 6 === a2.tag) return a2.stateNode;
    throw Error(p$1(33));
  }
  function Db(a2) {
    return a2[Pf] || null;
  }
  var Sf = [],
    Tf = -1;
  function Uf(a2) {
    return { current: a2 };
  }
  function E$1(a2) {
    0 > Tf || ((a2.current = Sf[Tf]), (Sf[Tf] = null), Tf--);
  }
  function G$1(a2, b2) {
    Tf++;
    Sf[Tf] = a2.current;
    a2.current = b2;
  }
  var Vf = {},
    H$1 = Uf(Vf),
    Wf = Uf(false),
    Xf = Vf;
  function Yf(a2, b2) {
    var c2 = a2.type.contextTypes;
    if (!c2) return Vf;
    var d2 = a2.stateNode;
    if (d2 && d2.__reactInternalMemoizedUnmaskedChildContext === b2)
      return d2.__reactInternalMemoizedMaskedChildContext;
    var e2 = {},
      f2;
    for (f2 in c2) e2[f2] = b2[f2];
    d2 &&
      ((a2 = a2.stateNode),
      (a2.__reactInternalMemoizedUnmaskedChildContext = b2),
      (a2.__reactInternalMemoizedMaskedChildContext = e2));
    return e2;
  }
  function Zf(a2) {
    a2 = a2.childContextTypes;
    return null !== a2 && void 0 !== a2;
  }
  function $f() {
    E$1(Wf);
    E$1(H$1);
  }
  function ag(a2, b2, c2) {
    if (H$1.current !== Vf) throw Error(p$1(168));
    G$1(H$1, b2);
    G$1(Wf, c2);
  }
  function bg(a2, b2, c2) {
    var d2 = a2.stateNode;
    b2 = b2.childContextTypes;
    if ("function" !== typeof d2.getChildContext) return c2;
    d2 = d2.getChildContext();
    for (var e2 in d2)
      if (!(e2 in b2)) throw Error(p$1(108, Ra(a2) || "Unknown", e2));
    return A$1({}, c2, d2);
  }
  function cg(a2) {
    a2 =
      ((a2 = a2.stateNode) && a2.__reactInternalMemoizedMergedChildContext) ||
      Vf;
    Xf = H$1.current;
    G$1(H$1, a2);
    G$1(Wf, Wf.current);
    return true;
  }
  function dg(a2, b2, c2) {
    var d2 = a2.stateNode;
    if (!d2) throw Error(p$1(169));
    c2
      ? ((a2 = bg(a2, b2, Xf)),
        (d2.__reactInternalMemoizedMergedChildContext = a2),
        E$1(Wf),
        E$1(H$1),
        G$1(H$1, a2))
      : E$1(Wf);
    G$1(Wf, c2);
  }
  var eg = null,
    fg = false,
    gg = false;
  function hg(a2) {
    null === eg ? (eg = [a2]) : eg.push(a2);
  }
  function ig(a2) {
    fg = true;
    hg(a2);
  }
  function jg() {
    if (!gg && null !== eg) {
      gg = true;
      var a2 = 0,
        b2 = C$1;
      try {
        var c2 = eg;
        for (C$1 = 1; a2 < c2.length; a2++) {
          var d2 = c2[a2];
          do d2 = d2(true);
          while (null !== d2);
        }
        eg = null;
        fg = false;
      } catch (e2) {
        throw (null !== eg && (eg = eg.slice(a2 + 1)), ac(fc, jg), e2);
      } finally {
        (C$1 = b2), (gg = false);
      }
    }
    return null;
  }
  var kg = [],
    lg = 0,
    mg = null,
    ng = 0,
    og = [],
    pg = 0,
    qg = null,
    rg = 1,
    sg = "";
  function tg(a2, b2) {
    kg[lg++] = ng;
    kg[lg++] = mg;
    mg = a2;
    ng = b2;
  }
  function ug(a2, b2, c2) {
    og[pg++] = rg;
    og[pg++] = sg;
    og[pg++] = qg;
    qg = a2;
    var d2 = rg;
    a2 = sg;
    var e2 = 32 - oc(d2) - 1;
    d2 &= ~(1 << e2);
    c2 += 1;
    var f2 = 32 - oc(b2) + e2;
    if (30 < f2) {
      var g2 = e2 - (e2 % 5);
      f2 = (d2 & ((1 << g2) - 1)).toString(32);
      d2 >>= g2;
      e2 -= g2;
      rg = (1 << (32 - oc(b2) + e2)) | (c2 << e2) | d2;
      sg = f2 + a2;
    } else (rg = (1 << f2) | (c2 << e2) | d2), (sg = a2);
  }
  function vg(a2) {
    null !== a2.return && (tg(a2, 1), ug(a2, 1, 0));
  }
  function wg(a2) {
    for (; a2 === mg; )
      (mg = kg[--lg]), (kg[lg] = null), (ng = kg[--lg]), (kg[lg] = null);
    for (; a2 === qg; )
      (qg = og[--pg]),
        (og[pg] = null),
        (sg = og[--pg]),
        (og[pg] = null),
        (rg = og[--pg]),
        (og[pg] = null);
  }
  var xg = null,
    yg = null,
    I$1 = false,
    zg = null;
  function Ag(a2, b2) {
    var c2 = Bg(5, null, null, 0);
    c2.elementType = "DELETED";
    c2.stateNode = b2;
    c2.return = a2;
    b2 = a2.deletions;
    null === b2 ? ((a2.deletions = [c2]), (a2.flags |= 16)) : b2.push(c2);
  }
  function Cg(a2, b2) {
    switch (a2.tag) {
      case 5:
        var c2 = a2.type;
        b2 =
          1 !== b2.nodeType || c2.toLowerCase() !== b2.nodeName.toLowerCase()
            ? null
            : b2;
        return null !== b2
          ? ((a2.stateNode = b2), (xg = a2), (yg = Lf(b2.firstChild)), true)
          : false;
      case 6:
        return (
          (b2 = "" === a2.pendingProps || 3 !== b2.nodeType ? null : b2),
          null !== b2
            ? ((a2.stateNode = b2), (xg = a2), (yg = null), true)
            : false
        );
      case 13:
        return (
          (b2 = 8 !== b2.nodeType ? null : b2),
          null !== b2
            ? ((c2 = null !== qg ? { id: rg, overflow: sg } : null),
              (a2.memoizedState = {
                dehydrated: b2,
                treeContext: c2,
                retryLane: 1073741824,
              }),
              (c2 = Bg(18, null, null, 0)),
              (c2.stateNode = b2),
              (c2.return = a2),
              (a2.child = c2),
              (xg = a2),
              (yg = null),
              true)
            : false
        );
      default:
        return false;
    }
  }
  function Dg(a2) {
    return 0 !== (a2.mode & 1) && 0 === (a2.flags & 128);
  }
  function Eg(a2) {
    if (I$1) {
      var b2 = yg;
      if (b2) {
        var c2 = b2;
        if (!Cg(a2, b2)) {
          if (Dg(a2)) throw Error(p$1(418));
          b2 = Lf(c2.nextSibling);
          var d2 = xg;
          b2 && Cg(a2, b2)
            ? Ag(d2, c2)
            : ((a2.flags = (a2.flags & -4097) | 2), (I$1 = false), (xg = a2));
        }
      } else {
        if (Dg(a2)) throw Error(p$1(418));
        a2.flags = (a2.flags & -4097) | 2;
        I$1 = false;
        xg = a2;
      }
    }
  }
  function Fg(a2) {
    for (
      a2 = a2.return;
      null !== a2 && 5 !== a2.tag && 3 !== a2.tag && 13 !== a2.tag;

    )
      a2 = a2.return;
    xg = a2;
  }
  function Gg(a2) {
    if (a2 !== xg) return false;
    if (!I$1) return Fg(a2), (I$1 = true), false;
    var b2;
    (b2 = 3 !== a2.tag) &&
      !(b2 = 5 !== a2.tag) &&
      ((b2 = a2.type),
      (b2 = "head" !== b2 && "body" !== b2 && !Ef(a2.type, a2.memoizedProps)));
    if (b2 && (b2 = yg)) {
      if (Dg(a2)) throw (Hg(), Error(p$1(418)));
      for (; b2; ) Ag(a2, b2), (b2 = Lf(b2.nextSibling));
    }
    Fg(a2);
    if (13 === a2.tag) {
      a2 = a2.memoizedState;
      a2 = null !== a2 ? a2.dehydrated : null;
      if (!a2) throw Error(p$1(317));
      a: {
        a2 = a2.nextSibling;
        for (b2 = 0; a2; ) {
          if (8 === a2.nodeType) {
            var c2 = a2.data;
            if ("/$" === c2) {
              if (0 === b2) {
                yg = Lf(a2.nextSibling);
                break a;
              }
              b2--;
            } else ("$" !== c2 && "$!" !== c2 && "$?" !== c2) || b2++;
          }
          a2 = a2.nextSibling;
        }
        yg = null;
      }
    } else yg = xg ? Lf(a2.stateNode.nextSibling) : null;
    return true;
  }
  function Hg() {
    for (var a2 = yg; a2; ) a2 = Lf(a2.nextSibling);
  }
  function Ig() {
    yg = xg = null;
    I$1 = false;
  }
  function Jg(a2) {
    null === zg ? (zg = [a2]) : zg.push(a2);
  }
  var Kg = ua.ReactCurrentBatchConfig;
  function Lg(a2, b2) {
    if (a2 && a2.defaultProps) {
      b2 = A$1({}, b2);
      a2 = a2.defaultProps;
      for (var c2 in a2) void 0 === b2[c2] && (b2[c2] = a2[c2]);
      return b2;
    }
    return b2;
  }
  var Mg = Uf(null),
    Ng = null,
    Og = null,
    Pg = null;
  function Qg() {
    Pg = Og = Ng = null;
  }
  function Rg(a2) {
    var b2 = Mg.current;
    E$1(Mg);
    a2._currentValue = b2;
  }
  function Sg(a2, b2, c2) {
    for (; null !== a2; ) {
      var d2 = a2.alternate;
      (a2.childLanes & b2) !== b2
        ? ((a2.childLanes |= b2), null !== d2 && (d2.childLanes |= b2))
        : null !== d2 && (d2.childLanes & b2) !== b2 && (d2.childLanes |= b2);
      if (a2 === c2) break;
      a2 = a2.return;
    }
  }
  function Tg(a2, b2) {
    Ng = a2;
    Pg = Og = null;
    a2 = a2.dependencies;
    null !== a2 &&
      null !== a2.firstContext &&
      (0 !== (a2.lanes & b2) && (Ug = true), (a2.firstContext = null));
  }
  function Vg(a2) {
    var b2 = a2._currentValue;
    if (Pg !== a2)
      if (
        ((a2 = { context: a2, memoizedValue: b2, next: null }), null === Og)
      ) {
        if (null === Ng) throw Error(p$1(308));
        Og = a2;
        Ng.dependencies = { lanes: 0, firstContext: a2 };
      } else Og = Og.next = a2;
    return b2;
  }
  var Wg = null;
  function Xg(a2) {
    null === Wg ? (Wg = [a2]) : Wg.push(a2);
  }
  function Yg(a2, b2, c2, d2) {
    var e2 = b2.interleaved;
    null === e2
      ? ((c2.next = c2), Xg(b2))
      : ((c2.next = e2.next), (e2.next = c2));
    b2.interleaved = c2;
    return Zg(a2, d2);
  }
  function Zg(a2, b2) {
    a2.lanes |= b2;
    var c2 = a2.alternate;
    null !== c2 && (c2.lanes |= b2);
    c2 = a2;
    for (a2 = a2.return; null !== a2; )
      (a2.childLanes |= b2),
        (c2 = a2.alternate),
        null !== c2 && (c2.childLanes |= b2),
        (c2 = a2),
        (a2 = a2.return);
    return 3 === c2.tag ? c2.stateNode : null;
  }
  var $g = false;
  function ah(a2) {
    a2.updateQueue = {
      baseState: a2.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, interleaved: null, lanes: 0 },
      effects: null,
    };
  }
  function bh(a2, b2) {
    a2 = a2.updateQueue;
    b2.updateQueue === a2 &&
      (b2.updateQueue = {
        baseState: a2.baseState,
        firstBaseUpdate: a2.firstBaseUpdate,
        lastBaseUpdate: a2.lastBaseUpdate,
        shared: a2.shared,
        effects: a2.effects,
      });
  }
  function ch(a2, b2) {
    return {
      eventTime: a2,
      lane: b2,
      tag: 0,
      payload: null,
      callback: null,
      next: null,
    };
  }
  function dh(a2, b2, c2) {
    var d2 = a2.updateQueue;
    if (null === d2) return null;
    d2 = d2.shared;
    if (0 !== (K$1 & 2)) {
      var e2 = d2.pending;
      null === e2 ? (b2.next = b2) : ((b2.next = e2.next), (e2.next = b2));
      d2.pending = b2;
      return Zg(a2, c2);
    }
    e2 = d2.interleaved;
    null === e2
      ? ((b2.next = b2), Xg(d2))
      : ((b2.next = e2.next), (e2.next = b2));
    d2.interleaved = b2;
    return Zg(a2, c2);
  }
  function eh(a2, b2, c2) {
    b2 = b2.updateQueue;
    if (null !== b2 && ((b2 = b2.shared), 0 !== (c2 & 4194240))) {
      var d2 = b2.lanes;
      d2 &= a2.pendingLanes;
      c2 |= d2;
      b2.lanes = c2;
      Cc(a2, c2);
    }
  }
  function fh(a2, b2) {
    var c2 = a2.updateQueue,
      d2 = a2.alternate;
    if (null !== d2 && ((d2 = d2.updateQueue), c2 === d2)) {
      var e2 = null,
        f2 = null;
      c2 = c2.firstBaseUpdate;
      if (null !== c2) {
        do {
          var g2 = {
            eventTime: c2.eventTime,
            lane: c2.lane,
            tag: c2.tag,
            payload: c2.payload,
            callback: c2.callback,
            next: null,
          };
          null === f2 ? (e2 = f2 = g2) : (f2 = f2.next = g2);
          c2 = c2.next;
        } while (null !== c2);
        null === f2 ? (e2 = f2 = b2) : (f2 = f2.next = b2);
      } else e2 = f2 = b2;
      c2 = {
        baseState: d2.baseState,
        firstBaseUpdate: e2,
        lastBaseUpdate: f2,
        shared: d2.shared,
        effects: d2.effects,
      };
      a2.updateQueue = c2;
      return;
    }
    a2 = c2.lastBaseUpdate;
    null === a2 ? (c2.firstBaseUpdate = b2) : (a2.next = b2);
    c2.lastBaseUpdate = b2;
  }
  function gh(a2, b2, c2, d2) {
    var e2 = a2.updateQueue;
    $g = false;
    var f2 = e2.firstBaseUpdate,
      g2 = e2.lastBaseUpdate,
      h2 = e2.shared.pending;
    if (null !== h2) {
      e2.shared.pending = null;
      var k2 = h2,
        l2 = k2.next;
      k2.next = null;
      null === g2 ? (f2 = l2) : (g2.next = l2);
      g2 = k2;
      var m2 = a2.alternate;
      null !== m2 &&
        ((m2 = m2.updateQueue),
        (h2 = m2.lastBaseUpdate),
        h2 !== g2 &&
          (null === h2 ? (m2.firstBaseUpdate = l2) : (h2.next = l2),
          (m2.lastBaseUpdate = k2)));
    }
    if (null !== f2) {
      var q2 = e2.baseState;
      g2 = 0;
      m2 = l2 = k2 = null;
      h2 = f2;
      do {
        var r2 = h2.lane,
          y2 = h2.eventTime;
        if ((d2 & r2) === r2) {
          null !== m2 &&
            (m2 = m2.next =
              {
                eventTime: y2,
                lane: 0,
                tag: h2.tag,
                payload: h2.payload,
                callback: h2.callback,
                next: null,
              });
          a: {
            var n2 = a2,
              t2 = h2;
            r2 = b2;
            y2 = c2;
            switch (t2.tag) {
              case 1:
                n2 = t2.payload;
                if ("function" === typeof n2) {
                  q2 = n2.call(y2, q2, r2);
                  break a;
                }
                q2 = n2;
                break a;
              case 3:
                n2.flags = (n2.flags & -65537) | 128;
              case 0:
                n2 = t2.payload;
                r2 = "function" === typeof n2 ? n2.call(y2, q2, r2) : n2;
                if (null === r2 || void 0 === r2) break a;
                q2 = A$1({}, q2, r2);
                break a;
              case 2:
                $g = true;
            }
          }
          null !== h2.callback &&
            0 !== h2.lane &&
            ((a2.flags |= 64),
            (r2 = e2.effects),
            null === r2 ? (e2.effects = [h2]) : r2.push(h2));
        } else
          (y2 = {
            eventTime: y2,
            lane: r2,
            tag: h2.tag,
            payload: h2.payload,
            callback: h2.callback,
            next: null,
          }),
            null === m2 ? ((l2 = m2 = y2), (k2 = q2)) : (m2 = m2.next = y2),
            (g2 |= r2);
        h2 = h2.next;
        if (null === h2)
          if (((h2 = e2.shared.pending), null === h2)) break;
          else
            (r2 = h2),
              (h2 = r2.next),
              (r2.next = null),
              (e2.lastBaseUpdate = r2),
              (e2.shared.pending = null);
      } while (1);
      null === m2 && (k2 = q2);
      e2.baseState = k2;
      e2.firstBaseUpdate = l2;
      e2.lastBaseUpdate = m2;
      b2 = e2.shared.interleaved;
      if (null !== b2) {
        e2 = b2;
        do (g2 |= e2.lane), (e2 = e2.next);
        while (e2 !== b2);
      } else null === f2 && (e2.shared.lanes = 0);
      hh |= g2;
      a2.lanes = g2;
      a2.memoizedState = q2;
    }
  }
  function ih(a2, b2, c2) {
    a2 = b2.effects;
    b2.effects = null;
    if (null !== a2)
      for (b2 = 0; b2 < a2.length; b2++) {
        var d2 = a2[b2],
          e2 = d2.callback;
        if (null !== e2) {
          d2.callback = null;
          d2 = c2;
          if ("function" !== typeof e2) throw Error(p$1(191, e2));
          e2.call(d2);
        }
      }
  }
  var jh = new aa.Component().refs;
  function kh(a2, b2, c2, d2) {
    b2 = a2.memoizedState;
    c2 = c2(d2, b2);
    c2 = null === c2 || void 0 === c2 ? b2 : A$1({}, b2, c2);
    a2.memoizedState = c2;
    0 === a2.lanes && (a2.updateQueue.baseState = c2);
  }
  var nh = {
    isMounted: function (a2) {
      return (a2 = a2._reactInternals) ? Vb(a2) === a2 : false;
    },
    enqueueSetState: function (a2, b2, c2) {
      a2 = a2._reactInternals;
      var d2 = L$1(),
        e2 = lh(a2),
        f2 = ch(d2, e2);
      f2.payload = b2;
      void 0 !== c2 && null !== c2 && (f2.callback = c2);
      b2 = dh(a2, f2, e2);
      null !== b2 && (mh(b2, a2, e2, d2), eh(b2, a2, e2));
    },
    enqueueReplaceState: function (a2, b2, c2) {
      a2 = a2._reactInternals;
      var d2 = L$1(),
        e2 = lh(a2),
        f2 = ch(d2, e2);
      f2.tag = 1;
      f2.payload = b2;
      void 0 !== c2 && null !== c2 && (f2.callback = c2);
      b2 = dh(a2, f2, e2);
      null !== b2 && (mh(b2, a2, e2, d2), eh(b2, a2, e2));
    },
    enqueueForceUpdate: function (a2, b2) {
      a2 = a2._reactInternals;
      var c2 = L$1(),
        d2 = lh(a2),
        e2 = ch(c2, d2);
      e2.tag = 2;
      void 0 !== b2 && null !== b2 && (e2.callback = b2);
      b2 = dh(a2, e2, d2);
      null !== b2 && (mh(b2, a2, d2, c2), eh(b2, a2, d2));
    },
  };
  function oh(a2, b2, c2, d2, e2, f2, g2) {
    a2 = a2.stateNode;
    return "function" === typeof a2.shouldComponentUpdate
      ? a2.shouldComponentUpdate(d2, f2, g2)
      : b2.prototype && b2.prototype.isPureReactComponent
      ? !Ie(c2, d2) || !Ie(e2, f2)
      : true;
  }
  function ph(a2, b2, c2) {
    var d2 = false,
      e2 = Vf;
    var f2 = b2.contextType;
    "object" === typeof f2 && null !== f2
      ? (f2 = Vg(f2))
      : ((e2 = Zf(b2) ? Xf : H$1.current),
        (d2 = b2.contextTypes),
        (f2 = (d2 = null !== d2 && void 0 !== d2) ? Yf(a2, e2) : Vf));
    b2 = new b2(c2, f2);
    a2.memoizedState =
      null !== b2.state && void 0 !== b2.state ? b2.state : null;
    b2.updater = nh;
    a2.stateNode = b2;
    b2._reactInternals = a2;
    d2 &&
      ((a2 = a2.stateNode),
      (a2.__reactInternalMemoizedUnmaskedChildContext = e2),
      (a2.__reactInternalMemoizedMaskedChildContext = f2));
    return b2;
  }
  function qh(a2, b2, c2, d2) {
    a2 = b2.state;
    "function" === typeof b2.componentWillReceiveProps &&
      b2.componentWillReceiveProps(c2, d2);
    "function" === typeof b2.UNSAFE_componentWillReceiveProps &&
      b2.UNSAFE_componentWillReceiveProps(c2, d2);
    b2.state !== a2 && nh.enqueueReplaceState(b2, b2.state, null);
  }
  function rh(a2, b2, c2, d2) {
    var e2 = a2.stateNode;
    e2.props = c2;
    e2.state = a2.memoizedState;
    e2.refs = jh;
    ah(a2);
    var f2 = b2.contextType;
    "object" === typeof f2 && null !== f2
      ? (e2.context = Vg(f2))
      : ((f2 = Zf(b2) ? Xf : H$1.current), (e2.context = Yf(a2, f2)));
    e2.state = a2.memoizedState;
    f2 = b2.getDerivedStateFromProps;
    "function" === typeof f2 &&
      (kh(a2, b2, f2, c2), (e2.state = a2.memoizedState));
    "function" === typeof b2.getDerivedStateFromProps ||
      "function" === typeof e2.getSnapshotBeforeUpdate ||
      ("function" !== typeof e2.UNSAFE_componentWillMount &&
        "function" !== typeof e2.componentWillMount) ||
      ((b2 = e2.state),
      "function" === typeof e2.componentWillMount && e2.componentWillMount(),
      "function" === typeof e2.UNSAFE_componentWillMount &&
        e2.UNSAFE_componentWillMount(),
      b2 !== e2.state && nh.enqueueReplaceState(e2, e2.state, null),
      gh(a2, c2, e2, d2),
      (e2.state = a2.memoizedState));
    "function" === typeof e2.componentDidMount && (a2.flags |= 4194308);
  }
  function sh(a2, b2, c2) {
    a2 = c2.ref;
    if (null !== a2 && "function" !== typeof a2 && "object" !== typeof a2) {
      if (c2._owner) {
        c2 = c2._owner;
        if (c2) {
          if (1 !== c2.tag) throw Error(p$1(309));
          var d2 = c2.stateNode;
        }
        if (!d2) throw Error(p$1(147, a2));
        var e2 = d2,
          f2 = "" + a2;
        if (
          null !== b2 &&
          null !== b2.ref &&
          "function" === typeof b2.ref &&
          b2.ref._stringRef === f2
        )
          return b2.ref;
        b2 = function (a3) {
          var b3 = e2.refs;
          b3 === jh && (b3 = e2.refs = {});
          null === a3 ? delete b3[f2] : (b3[f2] = a3);
        };
        b2._stringRef = f2;
        return b2;
      }
      if ("string" !== typeof a2) throw Error(p$1(284));
      if (!c2._owner) throw Error(p$1(290, a2));
    }
    return a2;
  }
  function th(a2, b2) {
    a2 = Object.prototype.toString.call(b2);
    throw Error(
      p$1(
        31,
        "[object Object]" === a2
          ? "object with keys {" + Object.keys(b2).join(", ") + "}"
          : a2
      )
    );
  }
  function uh(a2) {
    var b2 = a2._init;
    return b2(a2._payload);
  }
  function vh(a2) {
    function b2(b3, c3) {
      if (a2) {
        var d3 = b3.deletions;
        null === d3 ? ((b3.deletions = [c3]), (b3.flags |= 16)) : d3.push(c3);
      }
    }
    function c2(c3, d3) {
      if (!a2) return null;
      for (; null !== d3; ) b2(c3, d3), (d3 = d3.sibling);
      return null;
    }
    function d2(a3, b3) {
      for (a3 = /* @__PURE__ */ new Map(); null !== b3; )
        null !== b3.key ? a3.set(b3.key, b3) : a3.set(b3.index, b3),
          (b3 = b3.sibling);
      return a3;
    }
    function e2(a3, b3) {
      a3 = wh(a3, b3);
      a3.index = 0;
      a3.sibling = null;
      return a3;
    }
    function f2(b3, c3, d3) {
      b3.index = d3;
      if (!a2) return (b3.flags |= 1048576), c3;
      d3 = b3.alternate;
      if (null !== d3)
        return (d3 = d3.index), d3 < c3 ? ((b3.flags |= 2), c3) : d3;
      b3.flags |= 2;
      return c3;
    }
    function g2(b3) {
      a2 && null === b3.alternate && (b3.flags |= 2);
      return b3;
    }
    function h2(a3, b3, c3, d3) {
      if (null === b3 || 6 !== b3.tag)
        return (b3 = xh(c3, a3.mode, d3)), (b3.return = a3), b3;
      b3 = e2(b3, c3);
      b3.return = a3;
      return b3;
    }
    function k2(a3, b3, c3, d3) {
      var f3 = c3.type;
      if (f3 === ya) return m2(a3, b3, c3.props.children, d3, c3.key);
      if (
        null !== b3 &&
        (b3.elementType === f3 ||
          ("object" === typeof f3 &&
            null !== f3 &&
            f3.$$typeof === Ha &&
            uh(f3) === b3.type))
      )
        return (
          (d3 = e2(b3, c3.props)),
          (d3.ref = sh(a3, b3, c3)),
          (d3.return = a3),
          d3
        );
      d3 = yh(c3.type, c3.key, c3.props, null, a3.mode, d3);
      d3.ref = sh(a3, b3, c3);
      d3.return = a3;
      return d3;
    }
    function l2(a3, b3, c3, d3) {
      if (
        null === b3 ||
        4 !== b3.tag ||
        b3.stateNode.containerInfo !== c3.containerInfo ||
        b3.stateNode.implementation !== c3.implementation
      )
        return (b3 = zh(c3, a3.mode, d3)), (b3.return = a3), b3;
      b3 = e2(b3, c3.children || []);
      b3.return = a3;
      return b3;
    }
    function m2(a3, b3, c3, d3, f3) {
      if (null === b3 || 7 !== b3.tag)
        return (b3 = Ah(c3, a3.mode, d3, f3)), (b3.return = a3), b3;
      b3 = e2(b3, c3);
      b3.return = a3;
      return b3;
    }
    function q2(a3, b3, c3) {
      if (("string" === typeof b3 && "" !== b3) || "number" === typeof b3)
        return (b3 = xh("" + b3, a3.mode, c3)), (b3.return = a3), b3;
      if ("object" === typeof b3 && null !== b3) {
        switch (b3.$$typeof) {
          case va:
            return (
              (c3 = yh(b3.type, b3.key, b3.props, null, a3.mode, c3)),
              (c3.ref = sh(a3, null, b3)),
              (c3.return = a3),
              c3
            );
          case wa:
            return (b3 = zh(b3, a3.mode, c3)), (b3.return = a3), b3;
          case Ha:
            var d3 = b3._init;
            return q2(a3, d3(b3._payload), c3);
        }
        if (eb(b3) || Ka(b3))
          return (b3 = Ah(b3, a3.mode, c3, null)), (b3.return = a3), b3;
        th(a3, b3);
      }
      return null;
    }
    function r2(a3, b3, c3, d3) {
      var e3 = null !== b3 ? b3.key : null;
      if (("string" === typeof c3 && "" !== c3) || "number" === typeof c3)
        return null !== e3 ? null : h2(a3, b3, "" + c3, d3);
      if ("object" === typeof c3 && null !== c3) {
        switch (c3.$$typeof) {
          case va:
            return c3.key === e3 ? k2(a3, b3, c3, d3) : null;
          case wa:
            return c3.key === e3 ? l2(a3, b3, c3, d3) : null;
          case Ha:
            return (e3 = c3._init), r2(a3, b3, e3(c3._payload), d3);
        }
        if (eb(c3) || Ka(c3))
          return null !== e3 ? null : m2(a3, b3, c3, d3, null);
        th(a3, c3);
      }
      return null;
    }
    function y2(a3, b3, c3, d3, e3) {
      if (("string" === typeof d3 && "" !== d3) || "number" === typeof d3)
        return (a3 = a3.get(c3) || null), h2(b3, a3, "" + d3, e3);
      if ("object" === typeof d3 && null !== d3) {
        switch (d3.$$typeof) {
          case va:
            return (
              (a3 = a3.get(null === d3.key ? c3 : d3.key) || null),
              k2(b3, a3, d3, e3)
            );
          case wa:
            return (
              (a3 = a3.get(null === d3.key ? c3 : d3.key) || null),
              l2(b3, a3, d3, e3)
            );
          case Ha:
            var f3 = d3._init;
            return y2(a3, b3, c3, f3(d3._payload), e3);
        }
        if (eb(d3) || Ka(d3))
          return (a3 = a3.get(c3) || null), m2(b3, a3, d3, e3, null);
        th(b3, d3);
      }
      return null;
    }
    function n2(e3, g3, h3, k3) {
      for (
        var l3 = null, m3 = null, u2 = g3, w2 = (g3 = 0), x2 = null;
        null !== u2 && w2 < h3.length;
        w2++
      ) {
        u2.index > w2 ? ((x2 = u2), (u2 = null)) : (x2 = u2.sibling);
        var n3 = r2(e3, u2, h3[w2], k3);
        if (null === n3) {
          null === u2 && (u2 = x2);
          break;
        }
        a2 && u2 && null === n3.alternate && b2(e3, u2);
        g3 = f2(n3, g3, w2);
        null === m3 ? (l3 = n3) : (m3.sibling = n3);
        m3 = n3;
        u2 = x2;
      }
      if (w2 === h3.length) return c2(e3, u2), I$1 && tg(e3, w2), l3;
      if (null === u2) {
        for (; w2 < h3.length; w2++)
          (u2 = q2(e3, h3[w2], k3)),
            null !== u2 &&
              ((g3 = f2(u2, g3, w2)),
              null === m3 ? (l3 = u2) : (m3.sibling = u2),
              (m3 = u2));
        I$1 && tg(e3, w2);
        return l3;
      }
      for (u2 = d2(e3, u2); w2 < h3.length; w2++)
        (x2 = y2(u2, e3, w2, h3[w2], k3)),
          null !== x2 &&
            (a2 &&
              null !== x2.alternate &&
              u2.delete(null === x2.key ? w2 : x2.key),
            (g3 = f2(x2, g3, w2)),
            null === m3 ? (l3 = x2) : (m3.sibling = x2),
            (m3 = x2));
      a2 &&
        u2.forEach(function (a3) {
          return b2(e3, a3);
        });
      I$1 && tg(e3, w2);
      return l3;
    }
    function t2(e3, g3, h3, k3) {
      var l3 = Ka(h3);
      if ("function" !== typeof l3) throw Error(p$1(150));
      h3 = l3.call(h3);
      if (null == h3) throw Error(p$1(151));
      for (
        var u2 = (l3 = null), m3 = g3, w2 = (g3 = 0), x2 = null, n3 = h3.next();
        null !== m3 && !n3.done;
        w2++, n3 = h3.next()
      ) {
        m3.index > w2 ? ((x2 = m3), (m3 = null)) : (x2 = m3.sibling);
        var t3 = r2(e3, m3, n3.value, k3);
        if (null === t3) {
          null === m3 && (m3 = x2);
          break;
        }
        a2 && m3 && null === t3.alternate && b2(e3, m3);
        g3 = f2(t3, g3, w2);
        null === u2 ? (l3 = t3) : (u2.sibling = t3);
        u2 = t3;
        m3 = x2;
      }
      if (n3.done) return c2(e3, m3), I$1 && tg(e3, w2), l3;
      if (null === m3) {
        for (; !n3.done; w2++, n3 = h3.next())
          (n3 = q2(e3, n3.value, k3)),
            null !== n3 &&
              ((g3 = f2(n3, g3, w2)),
              null === u2 ? (l3 = n3) : (u2.sibling = n3),
              (u2 = n3));
        I$1 && tg(e3, w2);
        return l3;
      }
      for (m3 = d2(e3, m3); !n3.done; w2++, n3 = h3.next())
        (n3 = y2(m3, e3, w2, n3.value, k3)),
          null !== n3 &&
            (a2 &&
              null !== n3.alternate &&
              m3.delete(null === n3.key ? w2 : n3.key),
            (g3 = f2(n3, g3, w2)),
            null === u2 ? (l3 = n3) : (u2.sibling = n3),
            (u2 = n3));
      a2 &&
        m3.forEach(function (a3) {
          return b2(e3, a3);
        });
      I$1 && tg(e3, w2);
      return l3;
    }
    function J2(a3, d3, f3, h3) {
      "object" === typeof f3 &&
        null !== f3 &&
        f3.type === ya &&
        null === f3.key &&
        (f3 = f3.props.children);
      if ("object" === typeof f3 && null !== f3) {
        switch (f3.$$typeof) {
          case va:
            a: {
              for (var k3 = f3.key, l3 = d3; null !== l3; ) {
                if (l3.key === k3) {
                  k3 = f3.type;
                  if (k3 === ya) {
                    if (7 === l3.tag) {
                      c2(a3, l3.sibling);
                      d3 = e2(l3, f3.props.children);
                      d3.return = a3;
                      a3 = d3;
                      break a;
                    }
                  } else if (
                    l3.elementType === k3 ||
                    ("object" === typeof k3 &&
                      null !== k3 &&
                      k3.$$typeof === Ha &&
                      uh(k3) === l3.type)
                  ) {
                    c2(a3, l3.sibling);
                    d3 = e2(l3, f3.props);
                    d3.ref = sh(a3, l3, f3);
                    d3.return = a3;
                    a3 = d3;
                    break a;
                  }
                  c2(a3, l3);
                  break;
                } else b2(a3, l3);
                l3 = l3.sibling;
              }
              f3.type === ya
                ? ((d3 = Ah(f3.props.children, a3.mode, h3, f3.key)),
                  (d3.return = a3),
                  (a3 = d3))
                : ((h3 = yh(f3.type, f3.key, f3.props, null, a3.mode, h3)),
                  (h3.ref = sh(a3, d3, f3)),
                  (h3.return = a3),
                  (a3 = h3));
            }
            return g2(a3);
          case wa:
            a: {
              for (l3 = f3.key; null !== d3; ) {
                if (d3.key === l3)
                  if (
                    4 === d3.tag &&
                    d3.stateNode.containerInfo === f3.containerInfo &&
                    d3.stateNode.implementation === f3.implementation
                  ) {
                    c2(a3, d3.sibling);
                    d3 = e2(d3, f3.children || []);
                    d3.return = a3;
                    a3 = d3;
                    break a;
                  } else {
                    c2(a3, d3);
                    break;
                  }
                else b2(a3, d3);
                d3 = d3.sibling;
              }
              d3 = zh(f3, a3.mode, h3);
              d3.return = a3;
              a3 = d3;
            }
            return g2(a3);
          case Ha:
            return (l3 = f3._init), J2(a3, d3, l3(f3._payload), h3);
        }
        if (eb(f3)) return n2(a3, d3, f3, h3);
        if (Ka(f3)) return t2(a3, d3, f3, h3);
        th(a3, f3);
      }
      return ("string" === typeof f3 && "" !== f3) || "number" === typeof f3
        ? ((f3 = "" + f3),
          null !== d3 && 6 === d3.tag
            ? (c2(a3, d3.sibling),
              (d3 = e2(d3, f3)),
              (d3.return = a3),
              (a3 = d3))
            : (c2(a3, d3),
              (d3 = xh(f3, a3.mode, h3)),
              (d3.return = a3),
              (a3 = d3)),
          g2(a3))
        : c2(a3, d3);
    }
    return J2;
  }
  var Bh = vh(true),
    Ch = vh(false),
    Dh = {},
    Eh = Uf(Dh),
    Fh = Uf(Dh),
    Gh = Uf(Dh);
  function Hh(a2) {
    if (a2 === Dh) throw Error(p$1(174));
    return a2;
  }
  function Ih(a2, b2) {
    G$1(Gh, b2);
    G$1(Fh, a2);
    G$1(Eh, Dh);
    a2 = b2.nodeType;
    switch (a2) {
      case 9:
      case 11:
        b2 = (b2 = b2.documentElement) ? b2.namespaceURI : lb(null, "");
        break;
      default:
        (a2 = 8 === a2 ? b2.parentNode : b2),
          (b2 = a2.namespaceURI || null),
          (a2 = a2.tagName),
          (b2 = lb(b2, a2));
    }
    E$1(Eh);
    G$1(Eh, b2);
  }
  function Jh() {
    E$1(Eh);
    E$1(Fh);
    E$1(Gh);
  }
  function Kh(a2) {
    Hh(Gh.current);
    var b2 = Hh(Eh.current);
    var c2 = lb(b2, a2.type);
    b2 !== c2 && (G$1(Fh, a2), G$1(Eh, c2));
  }
  function Lh(a2) {
    Fh.current === a2 && (E$1(Eh), E$1(Fh));
  }
  var M$1 = Uf(0);
  function Mh(a2) {
    for (var b2 = a2; null !== b2; ) {
      if (13 === b2.tag) {
        var c2 = b2.memoizedState;
        if (
          null !== c2 &&
          ((c2 = c2.dehydrated),
          null === c2 || "$?" === c2.data || "$!" === c2.data)
        )
          return b2;
      } else if (19 === b2.tag && void 0 !== b2.memoizedProps.revealOrder) {
        if (0 !== (b2.flags & 128)) return b2;
      } else if (null !== b2.child) {
        b2.child.return = b2;
        b2 = b2.child;
        continue;
      }
      if (b2 === a2) break;
      for (; null === b2.sibling; ) {
        if (null === b2.return || b2.return === a2) return null;
        b2 = b2.return;
      }
      b2.sibling.return = b2.return;
      b2 = b2.sibling;
    }
    return null;
  }
  var Nh = [];
  function Oh() {
    for (var a2 = 0; a2 < Nh.length; a2++)
      Nh[a2]._workInProgressVersionPrimary = null;
    Nh.length = 0;
  }
  var Ph = ua.ReactCurrentDispatcher,
    Qh = ua.ReactCurrentBatchConfig,
    Rh = 0,
    N$1 = null,
    O$1 = null,
    P$1 = null,
    Sh = false,
    Th = false,
    Uh = 0,
    Vh = 0;
  function Q$1() {
    throw Error(p$1(321));
  }
  function Wh(a2, b2) {
    if (null === b2) return false;
    for (var c2 = 0; c2 < b2.length && c2 < a2.length; c2++)
      if (!He(a2[c2], b2[c2])) return false;
    return true;
  }
  function Xh(a2, b2, c2, d2, e2, f2) {
    Rh = f2;
    N$1 = b2;
    b2.memoizedState = null;
    b2.updateQueue = null;
    b2.lanes = 0;
    Ph.current = null === a2 || null === a2.memoizedState ? Yh : Zh;
    a2 = c2(d2, e2);
    if (Th) {
      f2 = 0;
      do {
        Th = false;
        Uh = 0;
        if (25 <= f2) throw Error(p$1(301));
        f2 += 1;
        P$1 = O$1 = null;
        b2.updateQueue = null;
        Ph.current = $h;
        a2 = c2(d2, e2);
      } while (Th);
    }
    Ph.current = ai;
    b2 = null !== O$1 && null !== O$1.next;
    Rh = 0;
    P$1 = O$1 = N$1 = null;
    Sh = false;
    if (b2) throw Error(p$1(300));
    return a2;
  }
  function bi() {
    var a2 = 0 !== Uh;
    Uh = 0;
    return a2;
  }
  function ci() {
    var a2 = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null,
    };
    null === P$1 ? (N$1.memoizedState = P$1 = a2) : (P$1 = P$1.next = a2);
    return P$1;
  }
  function di() {
    if (null === O$1) {
      var a2 = N$1.alternate;
      a2 = null !== a2 ? a2.memoizedState : null;
    } else a2 = O$1.next;
    var b2 = null === P$1 ? N$1.memoizedState : P$1.next;
    if (null !== b2) (P$1 = b2), (O$1 = a2);
    else {
      if (null === a2) throw Error(p$1(310));
      O$1 = a2;
      a2 = {
        memoizedState: O$1.memoizedState,
        baseState: O$1.baseState,
        baseQueue: O$1.baseQueue,
        queue: O$1.queue,
        next: null,
      };
      null === P$1 ? (N$1.memoizedState = P$1 = a2) : (P$1 = P$1.next = a2);
    }
    return P$1;
  }
  function ei(a2, b2) {
    return "function" === typeof b2 ? b2(a2) : b2;
  }
  function fi(a2) {
    var b2 = di(),
      c2 = b2.queue;
    if (null === c2) throw Error(p$1(311));
    c2.lastRenderedReducer = a2;
    var d2 = O$1,
      e2 = d2.baseQueue,
      f2 = c2.pending;
    if (null !== f2) {
      if (null !== e2) {
        var g2 = e2.next;
        e2.next = f2.next;
        f2.next = g2;
      }
      d2.baseQueue = e2 = f2;
      c2.pending = null;
    }
    if (null !== e2) {
      f2 = e2.next;
      d2 = d2.baseState;
      var h2 = (g2 = null),
        k2 = null,
        l2 = f2;
      do {
        var m2 = l2.lane;
        if ((Rh & m2) === m2)
          null !== k2 &&
            (k2 = k2.next =
              {
                lane: 0,
                action: l2.action,
                hasEagerState: l2.hasEagerState,
                eagerState: l2.eagerState,
                next: null,
              }),
            (d2 = l2.hasEagerState ? l2.eagerState : a2(d2, l2.action));
        else {
          var q2 = {
            lane: m2,
            action: l2.action,
            hasEagerState: l2.hasEagerState,
            eagerState: l2.eagerState,
            next: null,
          };
          null === k2 ? ((h2 = k2 = q2), (g2 = d2)) : (k2 = k2.next = q2);
          N$1.lanes |= m2;
          hh |= m2;
        }
        l2 = l2.next;
      } while (null !== l2 && l2 !== f2);
      null === k2 ? (g2 = d2) : (k2.next = h2);
      He(d2, b2.memoizedState) || (Ug = true);
      b2.memoizedState = d2;
      b2.baseState = g2;
      b2.baseQueue = k2;
      c2.lastRenderedState = d2;
    }
    a2 = c2.interleaved;
    if (null !== a2) {
      e2 = a2;
      do (f2 = e2.lane), (N$1.lanes |= f2), (hh |= f2), (e2 = e2.next);
      while (e2 !== a2);
    } else null === e2 && (c2.lanes = 0);
    return [b2.memoizedState, c2.dispatch];
  }
  function gi(a2) {
    var b2 = di(),
      c2 = b2.queue;
    if (null === c2) throw Error(p$1(311));
    c2.lastRenderedReducer = a2;
    var d2 = c2.dispatch,
      e2 = c2.pending,
      f2 = b2.memoizedState;
    if (null !== e2) {
      c2.pending = null;
      var g2 = (e2 = e2.next);
      do (f2 = a2(f2, g2.action)), (g2 = g2.next);
      while (g2 !== e2);
      He(f2, b2.memoizedState) || (Ug = true);
      b2.memoizedState = f2;
      null === b2.baseQueue && (b2.baseState = f2);
      c2.lastRenderedState = f2;
    }
    return [f2, d2];
  }
  function hi() {}
  function ii(a2, b2) {
    var c2 = N$1,
      d2 = di(),
      e2 = b2(),
      f2 = !He(d2.memoizedState, e2);
    f2 && ((d2.memoizedState = e2), (Ug = true));
    d2 = d2.queue;
    ji(ki.bind(null, c2, d2, a2), [a2]);
    if (
      d2.getSnapshot !== b2 ||
      f2 ||
      (null !== P$1 && P$1.memoizedState.tag & 1)
    ) {
      c2.flags |= 2048;
      li(9, mi.bind(null, c2, d2, e2, b2), void 0, null);
      if (null === R$1) throw Error(p$1(349));
      0 !== (Rh & 30) || ni(c2, b2, e2);
    }
    return e2;
  }
  function ni(a2, b2, c2) {
    a2.flags |= 16384;
    a2 = { getSnapshot: b2, value: c2 };
    b2 = N$1.updateQueue;
    null === b2
      ? ((b2 = { lastEffect: null, stores: null }),
        (N$1.updateQueue = b2),
        (b2.stores = [a2]))
      : ((c2 = b2.stores), null === c2 ? (b2.stores = [a2]) : c2.push(a2));
  }
  function mi(a2, b2, c2, d2) {
    b2.value = c2;
    b2.getSnapshot = d2;
    oi(b2) && pi(a2);
  }
  function ki(a2, b2, c2) {
    return c2(function () {
      oi(b2) && pi(a2);
    });
  }
  function oi(a2) {
    var b2 = a2.getSnapshot;
    a2 = a2.value;
    try {
      var c2 = b2();
      return !He(a2, c2);
    } catch (d2) {
      return true;
    }
  }
  function pi(a2) {
    var b2 = Zg(a2, 1);
    null !== b2 && mh(b2, a2, 1, -1);
  }
  function qi(a2) {
    var b2 = ci();
    "function" === typeof a2 && (a2 = a2());
    b2.memoizedState = b2.baseState = a2;
    a2 = {
      pending: null,
      interleaved: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: ei,
      lastRenderedState: a2,
    };
    b2.queue = a2;
    a2 = a2.dispatch = ri.bind(null, N$1, a2);
    return [b2.memoizedState, a2];
  }
  function li(a2, b2, c2, d2) {
    a2 = { tag: a2, create: b2, destroy: c2, deps: d2, next: null };
    b2 = N$1.updateQueue;
    null === b2
      ? ((b2 = { lastEffect: null, stores: null }),
        (N$1.updateQueue = b2),
        (b2.lastEffect = a2.next = a2))
      : ((c2 = b2.lastEffect),
        null === c2
          ? (b2.lastEffect = a2.next = a2)
          : ((d2 = c2.next),
            (c2.next = a2),
            (a2.next = d2),
            (b2.lastEffect = a2)));
    return a2;
  }
  function si() {
    return di().memoizedState;
  }
  function ti(a2, b2, c2, d2) {
    var e2 = ci();
    N$1.flags |= a2;
    e2.memoizedState = li(1 | b2, c2, void 0, void 0 === d2 ? null : d2);
  }
  function ui(a2, b2, c2, d2) {
    var e2 = di();
    d2 = void 0 === d2 ? null : d2;
    var f2 = void 0;
    if (null !== O$1) {
      var g2 = O$1.memoizedState;
      f2 = g2.destroy;
      if (null !== d2 && Wh(d2, g2.deps)) {
        e2.memoizedState = li(b2, c2, f2, d2);
        return;
      }
    }
    N$1.flags |= a2;
    e2.memoizedState = li(1 | b2, c2, f2, d2);
  }
  function vi(a2, b2) {
    return ti(8390656, 8, a2, b2);
  }
  function ji(a2, b2) {
    return ui(2048, 8, a2, b2);
  }
  function wi(a2, b2) {
    return ui(4, 2, a2, b2);
  }
  function xi(a2, b2) {
    return ui(4, 4, a2, b2);
  }
  function yi(a2, b2) {
    if ("function" === typeof b2)
      return (
        (a2 = a2()),
        b2(a2),
        function () {
          b2(null);
        }
      );
    if (null !== b2 && void 0 !== b2)
      return (
        (a2 = a2()),
        (b2.current = a2),
        function () {
          b2.current = null;
        }
      );
  }
  function zi(a2, b2, c2) {
    c2 = null !== c2 && void 0 !== c2 ? c2.concat([a2]) : null;
    return ui(4, 4, yi.bind(null, b2, a2), c2);
  }
  function Ai() {}
  function Bi(a2, b2) {
    var c2 = di();
    b2 = void 0 === b2 ? null : b2;
    var d2 = c2.memoizedState;
    if (null !== d2 && null !== b2 && Wh(b2, d2[1])) return d2[0];
    c2.memoizedState = [a2, b2];
    return a2;
  }
  function Ci(a2, b2) {
    var c2 = di();
    b2 = void 0 === b2 ? null : b2;
    var d2 = c2.memoizedState;
    if (null !== d2 && null !== b2 && Wh(b2, d2[1])) return d2[0];
    a2 = a2();
    c2.memoizedState = [a2, b2];
    return a2;
  }
  function Di(a2, b2, c2) {
    if (0 === (Rh & 21))
      return (
        a2.baseState && ((a2.baseState = false), (Ug = true)),
        (a2.memoizedState = c2)
      );
    He(c2, b2) ||
      ((c2 = yc()), (N$1.lanes |= c2), (hh |= c2), (a2.baseState = true));
    return b2;
  }
  function Ei(a2, b2) {
    var c2 = C$1;
    C$1 = 0 !== c2 && 4 > c2 ? c2 : 4;
    a2(true);
    var d2 = Qh.transition;
    Qh.transition = {};
    try {
      a2(false), b2();
    } finally {
      (C$1 = c2), (Qh.transition = d2);
    }
  }
  function Fi() {
    return di().memoizedState;
  }
  function Gi(a2, b2, c2) {
    var d2 = lh(a2);
    c2 = {
      lane: d2,
      action: c2,
      hasEagerState: false,
      eagerState: null,
      next: null,
    };
    if (Hi(a2)) Ii(b2, c2);
    else if (((c2 = Yg(a2, b2, c2, d2)), null !== c2)) {
      var e2 = L$1();
      mh(c2, a2, d2, e2);
      Ji(c2, b2, d2);
    }
  }
  function ri(a2, b2, c2) {
    var d2 = lh(a2),
      e2 = {
        lane: d2,
        action: c2,
        hasEagerState: false,
        eagerState: null,
        next: null,
      };
    if (Hi(a2)) Ii(b2, e2);
    else {
      var f2 = a2.alternate;
      if (
        0 === a2.lanes &&
        (null === f2 || 0 === f2.lanes) &&
        ((f2 = b2.lastRenderedReducer), null !== f2)
      )
        try {
          var g2 = b2.lastRenderedState,
            h2 = f2(g2, c2);
          e2.hasEagerState = true;
          e2.eagerState = h2;
          if (He(h2, g2)) {
            var k2 = b2.interleaved;
            null === k2
              ? ((e2.next = e2), Xg(b2))
              : ((e2.next = k2.next), (k2.next = e2));
            b2.interleaved = e2;
            return;
          }
        } catch (l2) {
        } finally {
        }
      c2 = Yg(a2, b2, e2, d2);
      null !== c2 && ((e2 = L$1()), mh(c2, a2, d2, e2), Ji(c2, b2, d2));
    }
  }
  function Hi(a2) {
    var b2 = a2.alternate;
    return a2 === N$1 || (null !== b2 && b2 === N$1);
  }
  function Ii(a2, b2) {
    Th = Sh = true;
    var c2 = a2.pending;
    null === c2 ? (b2.next = b2) : ((b2.next = c2.next), (c2.next = b2));
    a2.pending = b2;
  }
  function Ji(a2, b2, c2) {
    if (0 !== (c2 & 4194240)) {
      var d2 = b2.lanes;
      d2 &= a2.pendingLanes;
      c2 |= d2;
      b2.lanes = c2;
      Cc(a2, c2);
    }
  }
  var ai = {
      readContext: Vg,
      useCallback: Q$1,
      useContext: Q$1,
      useEffect: Q$1,
      useImperativeHandle: Q$1,
      useInsertionEffect: Q$1,
      useLayoutEffect: Q$1,
      useMemo: Q$1,
      useReducer: Q$1,
      useRef: Q$1,
      useState: Q$1,
      useDebugValue: Q$1,
      useDeferredValue: Q$1,
      useTransition: Q$1,
      useMutableSource: Q$1,
      useSyncExternalStore: Q$1,
      useId: Q$1,
      unstable_isNewReconciler: false,
    },
    Yh = {
      readContext: Vg,
      useCallback: function (a2, b2) {
        ci().memoizedState = [a2, void 0 === b2 ? null : b2];
        return a2;
      },
      useContext: Vg,
      useEffect: vi,
      useImperativeHandle: function (a2, b2, c2) {
        c2 = null !== c2 && void 0 !== c2 ? c2.concat([a2]) : null;
        return ti(4194308, 4, yi.bind(null, b2, a2), c2);
      },
      useLayoutEffect: function (a2, b2) {
        return ti(4194308, 4, a2, b2);
      },
      useInsertionEffect: function (a2, b2) {
        return ti(4, 2, a2, b2);
      },
      useMemo: function (a2, b2) {
        var c2 = ci();
        b2 = void 0 === b2 ? null : b2;
        a2 = a2();
        c2.memoizedState = [a2, b2];
        return a2;
      },
      useReducer: function (a2, b2, c2) {
        var d2 = ci();
        b2 = void 0 !== c2 ? c2(b2) : b2;
        d2.memoizedState = d2.baseState = b2;
        a2 = {
          pending: null,
          interleaved: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: a2,
          lastRenderedState: b2,
        };
        d2.queue = a2;
        a2 = a2.dispatch = Gi.bind(null, N$1, a2);
        return [d2.memoizedState, a2];
      },
      useRef: function (a2) {
        var b2 = ci();
        a2 = { current: a2 };
        return (b2.memoizedState = a2);
      },
      useState: qi,
      useDebugValue: Ai,
      useDeferredValue: function (a2) {
        return (ci().memoizedState = a2);
      },
      useTransition: function () {
        var a2 = qi(false),
          b2 = a2[0];
        a2 = Ei.bind(null, a2[1]);
        ci().memoizedState = a2;
        return [b2, a2];
      },
      useMutableSource: function () {},
      useSyncExternalStore: function (a2, b2, c2) {
        var d2 = N$1,
          e2 = ci();
        if (I$1) {
          if (void 0 === c2) throw Error(p$1(407));
          c2 = c2();
        } else {
          c2 = b2();
          if (null === R$1) throw Error(p$1(349));
          0 !== (Rh & 30) || ni(d2, b2, c2);
        }
        e2.memoizedState = c2;
        var f2 = { value: c2, getSnapshot: b2 };
        e2.queue = f2;
        vi(ki.bind(null, d2, f2, a2), [a2]);
        d2.flags |= 2048;
        li(9, mi.bind(null, d2, f2, c2, b2), void 0, null);
        return c2;
      },
      useId: function () {
        var a2 = ci(),
          b2 = R$1.identifierPrefix;
        if (I$1) {
          var c2 = sg;
          var d2 = rg;
          c2 = (d2 & ~(1 << (32 - oc(d2) - 1))).toString(32) + c2;
          b2 = ":" + b2 + "R" + c2;
          c2 = Uh++;
          0 < c2 && (b2 += "H" + c2.toString(32));
          b2 += ":";
        } else (c2 = Vh++), (b2 = ":" + b2 + "r" + c2.toString(32) + ":");
        return (a2.memoizedState = b2);
      },
      unstable_isNewReconciler: false,
    },
    Zh = {
      readContext: Vg,
      useCallback: Bi,
      useContext: Vg,
      useEffect: ji,
      useImperativeHandle: zi,
      useInsertionEffect: wi,
      useLayoutEffect: xi,
      useMemo: Ci,
      useReducer: fi,
      useRef: si,
      useState: function () {
        return fi(ei);
      },
      useDebugValue: Ai,
      useDeferredValue: function (a2) {
        var b2 = di();
        return Di(b2, O$1.memoizedState, a2);
      },
      useTransition: function () {
        var a2 = fi(ei)[0],
          b2 = di().memoizedState;
        return [a2, b2];
      },
      useMutableSource: hi,
      useSyncExternalStore: ii,
      useId: Fi,
      unstable_isNewReconciler: false,
    },
    $h = {
      readContext: Vg,
      useCallback: Bi,
      useContext: Vg,
      useEffect: ji,
      useImperativeHandle: zi,
      useInsertionEffect: wi,
      useLayoutEffect: xi,
      useMemo: Ci,
      useReducer: gi,
      useRef: si,
      useState: function () {
        return gi(ei);
      },
      useDebugValue: Ai,
      useDeferredValue: function (a2) {
        var b2 = di();
        return null === O$1
          ? (b2.memoizedState = a2)
          : Di(b2, O$1.memoizedState, a2);
      },
      useTransition: function () {
        var a2 = gi(ei)[0],
          b2 = di().memoizedState;
        return [a2, b2];
      },
      useMutableSource: hi,
      useSyncExternalStore: ii,
      useId: Fi,
      unstable_isNewReconciler: false,
    };
  function Ki(a2, b2) {
    try {
      var c2 = "",
        d2 = b2;
      do (c2 += Pa(d2)), (d2 = d2.return);
      while (d2);
      var e2 = c2;
    } catch (f2) {
      e2 = "\nError generating stack: " + f2.message + "\n" + f2.stack;
    }
    return { value: a2, source: b2, stack: e2, digest: null };
  }
  function Li(a2, b2, c2) {
    return {
      value: a2,
      source: null,
      stack: null != c2 ? c2 : null,
      digest: null != b2 ? b2 : null,
    };
  }
  function Mi(a2, b2) {
    try {
      console.error(b2.value);
    } catch (c2) {
      setTimeout(function () {
        throw c2;
      });
    }
  }
  var Ni = "function" === typeof WeakMap ? WeakMap : Map;
  function Oi(a2, b2, c2) {
    c2 = ch(-1, c2);
    c2.tag = 3;
    c2.payload = { element: null };
    var d2 = b2.value;
    c2.callback = function () {
      Pi || ((Pi = true), (Qi = d2));
      Mi(a2, b2);
    };
    return c2;
  }
  function Ri(a2, b2, c2) {
    c2 = ch(-1, c2);
    c2.tag = 3;
    var d2 = a2.type.getDerivedStateFromError;
    if ("function" === typeof d2) {
      var e2 = b2.value;
      c2.payload = function () {
        return d2(e2);
      };
      c2.callback = function () {
        Mi(a2, b2);
      };
    }
    var f2 = a2.stateNode;
    null !== f2 &&
      "function" === typeof f2.componentDidCatch &&
      (c2.callback = function () {
        Mi(a2, b2);
        "function" !== typeof d2 &&
          (null === Si ? (Si = /* @__PURE__ */ new Set([this])) : Si.add(this));
        var c3 = b2.stack;
        this.componentDidCatch(b2.value, {
          componentStack: null !== c3 ? c3 : "",
        });
      });
    return c2;
  }
  function Ti(a2, b2, c2) {
    var d2 = a2.pingCache;
    if (null === d2) {
      d2 = a2.pingCache = new Ni();
      var e2 = /* @__PURE__ */ new Set();
      d2.set(b2, e2);
    } else
      (e2 = d2.get(b2)),
        void 0 === e2 && ((e2 = /* @__PURE__ */ new Set()), d2.set(b2, e2));
    e2.has(c2) ||
      (e2.add(c2), (a2 = Ui.bind(null, a2, b2, c2)), b2.then(a2, a2));
  }
  function Vi(a2) {
    do {
      var b2;
      if ((b2 = 13 === a2.tag))
        (b2 = a2.memoizedState),
          (b2 = null !== b2 ? (null !== b2.dehydrated ? true : false) : true);
      if (b2) return a2;
      a2 = a2.return;
    } while (null !== a2);
    return null;
  }
  function Wi(a2, b2, c2, d2, e2) {
    if (0 === (a2.mode & 1))
      return (
        a2 === b2
          ? (a2.flags |= 65536)
          : ((a2.flags |= 128),
            (c2.flags |= 131072),
            (c2.flags &= -52805),
            1 === c2.tag &&
              (null === c2.alternate
                ? (c2.tag = 17)
                : ((b2 = ch(-1, 1)), (b2.tag = 2), dh(c2, b2, 1))),
            (c2.lanes |= 1)),
        a2
      );
    a2.flags |= 65536;
    a2.lanes = e2;
    return a2;
  }
  var Xi = ua.ReactCurrentOwner,
    Ug = false;
  function Yi(a2, b2, c2, d2) {
    b2.child = null === a2 ? Ch(b2, null, c2, d2) : Bh(b2, a2.child, c2, d2);
  }
  function Zi(a2, b2, c2, d2, e2) {
    c2 = c2.render;
    var f2 = b2.ref;
    Tg(b2, e2);
    d2 = Xh(a2, b2, c2, d2, f2, e2);
    c2 = bi();
    if (null !== a2 && !Ug)
      return (
        (b2.updateQueue = a2.updateQueue),
        (b2.flags &= -2053),
        (a2.lanes &= ~e2),
        $i(a2, b2, e2)
      );
    I$1 && c2 && vg(b2);
    b2.flags |= 1;
    Yi(a2, b2, d2, e2);
    return b2.child;
  }
  function aj(a2, b2, c2, d2, e2) {
    if (null === a2) {
      var f2 = c2.type;
      if (
        "function" === typeof f2 &&
        !bj(f2) &&
        void 0 === f2.defaultProps &&
        null === c2.compare &&
        void 0 === c2.defaultProps
      )
        return (b2.tag = 15), (b2.type = f2), cj(a2, b2, f2, d2, e2);
      a2 = yh(c2.type, null, d2, b2, b2.mode, e2);
      a2.ref = b2.ref;
      a2.return = b2;
      return (b2.child = a2);
    }
    f2 = a2.child;
    if (0 === (a2.lanes & e2)) {
      var g2 = f2.memoizedProps;
      c2 = c2.compare;
      c2 = null !== c2 ? c2 : Ie;
      if (c2(g2, d2) && a2.ref === b2.ref) return $i(a2, b2, e2);
    }
    b2.flags |= 1;
    a2 = wh(f2, d2);
    a2.ref = b2.ref;
    a2.return = b2;
    return (b2.child = a2);
  }
  function cj(a2, b2, c2, d2, e2) {
    if (null !== a2) {
      var f2 = a2.memoizedProps;
      if (Ie(f2, d2) && a2.ref === b2.ref)
        if (((Ug = false), (b2.pendingProps = d2 = f2), 0 !== (a2.lanes & e2)))
          0 !== (a2.flags & 131072) && (Ug = true);
        else return (b2.lanes = a2.lanes), $i(a2, b2, e2);
    }
    return dj(a2, b2, c2, d2, e2);
  }
  function ej(a2, b2, c2) {
    var d2 = b2.pendingProps,
      e2 = d2.children,
      f2 = null !== a2 ? a2.memoizedState : null;
    if ("hidden" === d2.mode)
      if (0 === (b2.mode & 1))
        (b2.memoizedState = {
          baseLanes: 0,
          cachePool: null,
          transitions: null,
        }),
          G$1(fj, gj),
          (gj |= c2);
      else {
        if (0 === (c2 & 1073741824))
          return (
            (a2 = null !== f2 ? f2.baseLanes | c2 : c2),
            (b2.lanes = b2.childLanes = 1073741824),
            (b2.memoizedState = {
              baseLanes: a2,
              cachePool: null,
              transitions: null,
            }),
            (b2.updateQueue = null),
            G$1(fj, gj),
            (gj |= a2),
            null
          );
        b2.memoizedState = { baseLanes: 0, cachePool: null, transitions: null };
        d2 = null !== f2 ? f2.baseLanes : c2;
        G$1(fj, gj);
        gj |= d2;
      }
    else
      null !== f2
        ? ((d2 = f2.baseLanes | c2), (b2.memoizedState = null))
        : (d2 = c2),
        G$1(fj, gj),
        (gj |= d2);
    Yi(a2, b2, e2, c2);
    return b2.child;
  }
  function hj(a2, b2) {
    var c2 = b2.ref;
    if ((null === a2 && null !== c2) || (null !== a2 && a2.ref !== c2))
      (b2.flags |= 512), (b2.flags |= 2097152);
  }
  function dj(a2, b2, c2, d2, e2) {
    var f2 = Zf(c2) ? Xf : H$1.current;
    f2 = Yf(b2, f2);
    Tg(b2, e2);
    c2 = Xh(a2, b2, c2, d2, f2, e2);
    d2 = bi();
    if (null !== a2 && !Ug)
      return (
        (b2.updateQueue = a2.updateQueue),
        (b2.flags &= -2053),
        (a2.lanes &= ~e2),
        $i(a2, b2, e2)
      );
    I$1 && d2 && vg(b2);
    b2.flags |= 1;
    Yi(a2, b2, c2, e2);
    return b2.child;
  }
  function ij(a2, b2, c2, d2, e2) {
    if (Zf(c2)) {
      var f2 = true;
      cg(b2);
    } else f2 = false;
    Tg(b2, e2);
    if (null === b2.stateNode)
      jj(a2, b2), ph(b2, c2, d2), rh(b2, c2, d2, e2), (d2 = true);
    else if (null === a2) {
      var g2 = b2.stateNode,
        h2 = b2.memoizedProps;
      g2.props = h2;
      var k2 = g2.context,
        l2 = c2.contextType;
      "object" === typeof l2 && null !== l2
        ? (l2 = Vg(l2))
        : ((l2 = Zf(c2) ? Xf : H$1.current), (l2 = Yf(b2, l2)));
      var m2 = c2.getDerivedStateFromProps,
        q2 =
          "function" === typeof m2 ||
          "function" === typeof g2.getSnapshotBeforeUpdate;
      q2 ||
        ("function" !== typeof g2.UNSAFE_componentWillReceiveProps &&
          "function" !== typeof g2.componentWillReceiveProps) ||
        ((h2 !== d2 || k2 !== l2) && qh(b2, g2, d2, l2));
      $g = false;
      var r2 = b2.memoizedState;
      g2.state = r2;
      gh(b2, d2, g2, e2);
      k2 = b2.memoizedState;
      h2 !== d2 || r2 !== k2 || Wf.current || $g
        ? ("function" === typeof m2 &&
            (kh(b2, c2, m2, d2), (k2 = b2.memoizedState)),
          (h2 = $g || oh(b2, c2, h2, d2, r2, k2, l2))
            ? (q2 ||
                ("function" !== typeof g2.UNSAFE_componentWillMount &&
                  "function" !== typeof g2.componentWillMount) ||
                ("function" === typeof g2.componentWillMount &&
                  g2.componentWillMount(),
                "function" === typeof g2.UNSAFE_componentWillMount &&
                  g2.UNSAFE_componentWillMount()),
              "function" === typeof g2.componentDidMount &&
                (b2.flags |= 4194308))
            : ("function" === typeof g2.componentDidMount &&
                (b2.flags |= 4194308),
              (b2.memoizedProps = d2),
              (b2.memoizedState = k2)),
          (g2.props = d2),
          (g2.state = k2),
          (g2.context = l2),
          (d2 = h2))
        : ("function" === typeof g2.componentDidMount && (b2.flags |= 4194308),
          (d2 = false));
    } else {
      g2 = b2.stateNode;
      bh(a2, b2);
      h2 = b2.memoizedProps;
      l2 = b2.type === b2.elementType ? h2 : Lg(b2.type, h2);
      g2.props = l2;
      q2 = b2.pendingProps;
      r2 = g2.context;
      k2 = c2.contextType;
      "object" === typeof k2 && null !== k2
        ? (k2 = Vg(k2))
        : ((k2 = Zf(c2) ? Xf : H$1.current), (k2 = Yf(b2, k2)));
      var y2 = c2.getDerivedStateFromProps;
      (m2 =
        "function" === typeof y2 ||
        "function" === typeof g2.getSnapshotBeforeUpdate) ||
        ("function" !== typeof g2.UNSAFE_componentWillReceiveProps &&
          "function" !== typeof g2.componentWillReceiveProps) ||
        ((h2 !== q2 || r2 !== k2) && qh(b2, g2, d2, k2));
      $g = false;
      r2 = b2.memoizedState;
      g2.state = r2;
      gh(b2, d2, g2, e2);
      var n2 = b2.memoizedState;
      h2 !== q2 || r2 !== n2 || Wf.current || $g
        ? ("function" === typeof y2 &&
            (kh(b2, c2, y2, d2), (n2 = b2.memoizedState)),
          (l2 = $g || oh(b2, c2, l2, d2, r2, n2, k2) || false)
            ? (m2 ||
                ("function" !== typeof g2.UNSAFE_componentWillUpdate &&
                  "function" !== typeof g2.componentWillUpdate) ||
                ("function" === typeof g2.componentWillUpdate &&
                  g2.componentWillUpdate(d2, n2, k2),
                "function" === typeof g2.UNSAFE_componentWillUpdate &&
                  g2.UNSAFE_componentWillUpdate(d2, n2, k2)),
              "function" === typeof g2.componentDidUpdate && (b2.flags |= 4),
              "function" === typeof g2.getSnapshotBeforeUpdate &&
                (b2.flags |= 1024))
            : ("function" !== typeof g2.componentDidUpdate ||
                (h2 === a2.memoizedProps && r2 === a2.memoizedState) ||
                (b2.flags |= 4),
              "function" !== typeof g2.getSnapshotBeforeUpdate ||
                (h2 === a2.memoizedProps && r2 === a2.memoizedState) ||
                (b2.flags |= 1024),
              (b2.memoizedProps = d2),
              (b2.memoizedState = n2)),
          (g2.props = d2),
          (g2.state = n2),
          (g2.context = k2),
          (d2 = l2))
        : ("function" !== typeof g2.componentDidUpdate ||
            (h2 === a2.memoizedProps && r2 === a2.memoizedState) ||
            (b2.flags |= 4),
          "function" !== typeof g2.getSnapshotBeforeUpdate ||
            (h2 === a2.memoizedProps && r2 === a2.memoizedState) ||
            (b2.flags |= 1024),
          (d2 = false));
    }
    return kj(a2, b2, c2, d2, f2, e2);
  }
  function kj(a2, b2, c2, d2, e2, f2) {
    hj(a2, b2);
    var g2 = 0 !== (b2.flags & 128);
    if (!d2 && !g2) return e2 && dg(b2, c2, false), $i(a2, b2, f2);
    d2 = b2.stateNode;
    Xi.current = b2;
    var h2 =
      g2 && "function" !== typeof c2.getDerivedStateFromError
        ? null
        : d2.render();
    b2.flags |= 1;
    null !== a2 && g2
      ? ((b2.child = Bh(b2, a2.child, null, f2)),
        (b2.child = Bh(b2, null, h2, f2)))
      : Yi(a2, b2, h2, f2);
    b2.memoizedState = d2.state;
    e2 && dg(b2, c2, true);
    return b2.child;
  }
  function lj(a2) {
    var b2 = a2.stateNode;
    b2.pendingContext
      ? ag(a2, b2.pendingContext, b2.pendingContext !== b2.context)
      : b2.context && ag(a2, b2.context, false);
    Ih(a2, b2.containerInfo);
  }
  function mj(a2, b2, c2, d2, e2) {
    Ig();
    Jg(e2);
    b2.flags |= 256;
    Yi(a2, b2, c2, d2);
    return b2.child;
  }
  var nj = { dehydrated: null, treeContext: null, retryLane: 0 };
  function oj(a2) {
    return { baseLanes: a2, cachePool: null, transitions: null };
  }
  function pj(a2, b2, c2) {
    var d2 = b2.pendingProps,
      e2 = M$1.current,
      f2 = false,
      g2 = 0 !== (b2.flags & 128),
      h2;
    (h2 = g2) ||
      (h2 = null !== a2 && null === a2.memoizedState ? false : 0 !== (e2 & 2));
    if (h2) (f2 = true), (b2.flags &= -129);
    else if (null === a2 || null !== a2.memoizedState) e2 |= 1;
    G$1(M$1, e2 & 1);
    if (null === a2) {
      Eg(b2);
      a2 = b2.memoizedState;
      if (null !== a2 && ((a2 = a2.dehydrated), null !== a2))
        return (
          0 === (b2.mode & 1)
            ? (b2.lanes = 1)
            : "$!" === a2.data
            ? (b2.lanes = 8)
            : (b2.lanes = 1073741824),
          null
        );
      g2 = d2.children;
      a2 = d2.fallback;
      return f2
        ? ((d2 = b2.mode),
          (f2 = b2.child),
          (g2 = { mode: "hidden", children: g2 }),
          0 === (d2 & 1) && null !== f2
            ? ((f2.childLanes = 0), (f2.pendingProps = g2))
            : (f2 = qj(g2, d2, 0, null)),
          (a2 = Ah(a2, d2, c2, null)),
          (f2.return = b2),
          (a2.return = b2),
          (f2.sibling = a2),
          (b2.child = f2),
          (b2.child.memoizedState = oj(c2)),
          (b2.memoizedState = nj),
          a2)
        : rj(b2, g2);
    }
    e2 = a2.memoizedState;
    if (null !== e2 && ((h2 = e2.dehydrated), null !== h2))
      return sj(a2, b2, g2, d2, h2, e2, c2);
    if (f2) {
      f2 = d2.fallback;
      g2 = b2.mode;
      e2 = a2.child;
      h2 = e2.sibling;
      var k2 = { mode: "hidden", children: d2.children };
      0 === (g2 & 1) && b2.child !== e2
        ? ((d2 = b2.child),
          (d2.childLanes = 0),
          (d2.pendingProps = k2),
          (b2.deletions = null))
        : ((d2 = wh(e2, k2)), (d2.subtreeFlags = e2.subtreeFlags & 14680064));
      null !== h2
        ? (f2 = wh(h2, f2))
        : ((f2 = Ah(f2, g2, c2, null)), (f2.flags |= 2));
      f2.return = b2;
      d2.return = b2;
      d2.sibling = f2;
      b2.child = d2;
      d2 = f2;
      f2 = b2.child;
      g2 = a2.child.memoizedState;
      g2 =
        null === g2
          ? oj(c2)
          : {
              baseLanes: g2.baseLanes | c2,
              cachePool: null,
              transitions: g2.transitions,
            };
      f2.memoizedState = g2;
      f2.childLanes = a2.childLanes & ~c2;
      b2.memoizedState = nj;
      return d2;
    }
    f2 = a2.child;
    a2 = f2.sibling;
    d2 = wh(f2, { mode: "visible", children: d2.children });
    0 === (b2.mode & 1) && (d2.lanes = c2);
    d2.return = b2;
    d2.sibling = null;
    null !== a2 &&
      ((c2 = b2.deletions),
      null === c2 ? ((b2.deletions = [a2]), (b2.flags |= 16)) : c2.push(a2));
    b2.child = d2;
    b2.memoizedState = null;
    return d2;
  }
  function rj(a2, b2) {
    b2 = qj({ mode: "visible", children: b2 }, a2.mode, 0, null);
    b2.return = a2;
    return (a2.child = b2);
  }
  function tj(a2, b2, c2, d2) {
    null !== d2 && Jg(d2);
    Bh(b2, a2.child, null, c2);
    a2 = rj(b2, b2.pendingProps.children);
    a2.flags |= 2;
    b2.memoizedState = null;
    return a2;
  }
  function sj(a2, b2, c2, d2, e2, f2, g2) {
    if (c2) {
      if (b2.flags & 256)
        return (
          (b2.flags &= -257), (d2 = Li(Error(p$1(422)))), tj(a2, b2, g2, d2)
        );
      if (null !== b2.memoizedState)
        return (b2.child = a2.child), (b2.flags |= 128), null;
      f2 = d2.fallback;
      e2 = b2.mode;
      d2 = qj({ mode: "visible", children: d2.children }, e2, 0, null);
      f2 = Ah(f2, e2, g2, null);
      f2.flags |= 2;
      d2.return = b2;
      f2.return = b2;
      d2.sibling = f2;
      b2.child = d2;
      0 !== (b2.mode & 1) && Bh(b2, a2.child, null, g2);
      b2.child.memoizedState = oj(g2);
      b2.memoizedState = nj;
      return f2;
    }
    if (0 === (b2.mode & 1)) return tj(a2, b2, g2, null);
    if ("$!" === e2.data) {
      d2 = e2.nextSibling && e2.nextSibling.dataset;
      if (d2) var h2 = d2.dgst;
      d2 = h2;
      f2 = Error(p$1(419));
      d2 = Li(f2, d2, void 0);
      return tj(a2, b2, g2, d2);
    }
    h2 = 0 !== (g2 & a2.childLanes);
    if (Ug || h2) {
      d2 = R$1;
      if (null !== d2) {
        switch (g2 & -g2) {
          case 4:
            e2 = 2;
            break;
          case 16:
            e2 = 8;
            break;
          case 64:
          case 128:
          case 256:
          case 512:
          case 1024:
          case 2048:
          case 4096:
          case 8192:
          case 16384:
          case 32768:
          case 65536:
          case 131072:
          case 262144:
          case 524288:
          case 1048576:
          case 2097152:
          case 4194304:
          case 8388608:
          case 16777216:
          case 33554432:
          case 67108864:
            e2 = 32;
            break;
          case 536870912:
            e2 = 268435456;
            break;
          default:
            e2 = 0;
        }
        e2 = 0 !== (e2 & (d2.suspendedLanes | g2)) ? 0 : e2;
        0 !== e2 &&
          e2 !== f2.retryLane &&
          ((f2.retryLane = e2), Zg(a2, e2), mh(d2, a2, e2, -1));
      }
      uj();
      d2 = Li(Error(p$1(421)));
      return tj(a2, b2, g2, d2);
    }
    if ("$?" === e2.data)
      return (
        (b2.flags |= 128),
        (b2.child = a2.child),
        (b2 = vj.bind(null, a2)),
        (e2._reactRetry = b2),
        null
      );
    a2 = f2.treeContext;
    yg = Lf(e2.nextSibling);
    xg = b2;
    I$1 = true;
    zg = null;
    null !== a2 &&
      ((og[pg++] = rg),
      (og[pg++] = sg),
      (og[pg++] = qg),
      (rg = a2.id),
      (sg = a2.overflow),
      (qg = b2));
    b2 = rj(b2, d2.children);
    b2.flags |= 4096;
    return b2;
  }
  function wj(a2, b2, c2) {
    a2.lanes |= b2;
    var d2 = a2.alternate;
    null !== d2 && (d2.lanes |= b2);
    Sg(a2.return, b2, c2);
  }
  function xj(a2, b2, c2, d2, e2) {
    var f2 = a2.memoizedState;
    null === f2
      ? (a2.memoizedState = {
          isBackwards: b2,
          rendering: null,
          renderingStartTime: 0,
          last: d2,
          tail: c2,
          tailMode: e2,
        })
      : ((f2.isBackwards = b2),
        (f2.rendering = null),
        (f2.renderingStartTime = 0),
        (f2.last = d2),
        (f2.tail = c2),
        (f2.tailMode = e2));
  }
  function yj(a2, b2, c2) {
    var d2 = b2.pendingProps,
      e2 = d2.revealOrder,
      f2 = d2.tail;
    Yi(a2, b2, d2.children, c2);
    d2 = M$1.current;
    if (0 !== (d2 & 2)) (d2 = (d2 & 1) | 2), (b2.flags |= 128);
    else {
      if (null !== a2 && 0 !== (a2.flags & 128))
        a: for (a2 = b2.child; null !== a2; ) {
          if (13 === a2.tag) null !== a2.memoizedState && wj(a2, c2, b2);
          else if (19 === a2.tag) wj(a2, c2, b2);
          else if (null !== a2.child) {
            a2.child.return = a2;
            a2 = a2.child;
            continue;
          }
          if (a2 === b2) break a;
          for (; null === a2.sibling; ) {
            if (null === a2.return || a2.return === b2) break a;
            a2 = a2.return;
          }
          a2.sibling.return = a2.return;
          a2 = a2.sibling;
        }
      d2 &= 1;
    }
    G$1(M$1, d2);
    if (0 === (b2.mode & 1)) b2.memoizedState = null;
    else
      switch (e2) {
        case "forwards":
          c2 = b2.child;
          for (e2 = null; null !== c2; )
            (a2 = c2.alternate),
              null !== a2 && null === Mh(a2) && (e2 = c2),
              (c2 = c2.sibling);
          c2 = e2;
          null === c2
            ? ((e2 = b2.child), (b2.child = null))
            : ((e2 = c2.sibling), (c2.sibling = null));
          xj(b2, false, e2, c2, f2);
          break;
        case "backwards":
          c2 = null;
          e2 = b2.child;
          for (b2.child = null; null !== e2; ) {
            a2 = e2.alternate;
            if (null !== a2 && null === Mh(a2)) {
              b2.child = e2;
              break;
            }
            a2 = e2.sibling;
            e2.sibling = c2;
            c2 = e2;
            e2 = a2;
          }
          xj(b2, true, c2, null, f2);
          break;
        case "together":
          xj(b2, false, null, null, void 0);
          break;
        default:
          b2.memoizedState = null;
      }
    return b2.child;
  }
  function jj(a2, b2) {
    0 === (b2.mode & 1) &&
      null !== a2 &&
      ((a2.alternate = null), (b2.alternate = null), (b2.flags |= 2));
  }
  function $i(a2, b2, c2) {
    null !== a2 && (b2.dependencies = a2.dependencies);
    hh |= b2.lanes;
    if (0 === (c2 & b2.childLanes)) return null;
    if (null !== a2 && b2.child !== a2.child) throw Error(p$1(153));
    if (null !== b2.child) {
      a2 = b2.child;
      c2 = wh(a2, a2.pendingProps);
      b2.child = c2;
      for (c2.return = b2; null !== a2.sibling; )
        (a2 = a2.sibling),
          (c2 = c2.sibling = wh(a2, a2.pendingProps)),
          (c2.return = b2);
      c2.sibling = null;
    }
    return b2.child;
  }
  function zj(a2, b2, c2) {
    switch (b2.tag) {
      case 3:
        lj(b2);
        Ig();
        break;
      case 5:
        Kh(b2);
        break;
      case 1:
        Zf(b2.type) && cg(b2);
        break;
      case 4:
        Ih(b2, b2.stateNode.containerInfo);
        break;
      case 10:
        var d2 = b2.type._context,
          e2 = b2.memoizedProps.value;
        G$1(Mg, d2._currentValue);
        d2._currentValue = e2;
        break;
      case 13:
        d2 = b2.memoizedState;
        if (null !== d2) {
          if (null !== d2.dehydrated)
            return G$1(M$1, M$1.current & 1), (b2.flags |= 128), null;
          if (0 !== (c2 & b2.child.childLanes)) return pj(a2, b2, c2);
          G$1(M$1, M$1.current & 1);
          a2 = $i(a2, b2, c2);
          return null !== a2 ? a2.sibling : null;
        }
        G$1(M$1, M$1.current & 1);
        break;
      case 19:
        d2 = 0 !== (c2 & b2.childLanes);
        if (0 !== (a2.flags & 128)) {
          if (d2) return yj(a2, b2, c2);
          b2.flags |= 128;
        }
        e2 = b2.memoizedState;
        null !== e2 &&
          ((e2.rendering = null), (e2.tail = null), (e2.lastEffect = null));
        G$1(M$1, M$1.current);
        if (d2) break;
        else return null;
      case 22:
      case 23:
        return (b2.lanes = 0), ej(a2, b2, c2);
    }
    return $i(a2, b2, c2);
  }
  var Aj, Bj, Cj, Dj;
  Aj = function (a2, b2) {
    for (var c2 = b2.child; null !== c2; ) {
      if (5 === c2.tag || 6 === c2.tag) a2.appendChild(c2.stateNode);
      else if (4 !== c2.tag && null !== c2.child) {
        c2.child.return = c2;
        c2 = c2.child;
        continue;
      }
      if (c2 === b2) break;
      for (; null === c2.sibling; ) {
        if (null === c2.return || c2.return === b2) return;
        c2 = c2.return;
      }
      c2.sibling.return = c2.return;
      c2 = c2.sibling;
    }
  };
  Bj = function () {};
  Cj = function (a2, b2, c2, d2) {
    var e2 = a2.memoizedProps;
    if (e2 !== d2) {
      a2 = b2.stateNode;
      Hh(Eh.current);
      var f2 = null;
      switch (c2) {
        case "input":
          e2 = Ya(a2, e2);
          d2 = Ya(a2, d2);
          f2 = [];
          break;
        case "select":
          e2 = A$1({}, e2, { value: void 0 });
          d2 = A$1({}, d2, { value: void 0 });
          f2 = [];
          break;
        case "textarea":
          e2 = gb(a2, e2);
          d2 = gb(a2, d2);
          f2 = [];
          break;
        default:
          "function" !== typeof e2.onClick &&
            "function" === typeof d2.onClick &&
            (a2.onclick = Bf);
      }
      ub(c2, d2);
      var g2;
      c2 = null;
      for (l2 in e2)
        if (!d2.hasOwnProperty(l2) && e2.hasOwnProperty(l2) && null != e2[l2])
          if ("style" === l2) {
            var h2 = e2[l2];
            for (g2 in h2)
              h2.hasOwnProperty(g2) && (c2 || (c2 = {}), (c2[g2] = ""));
          } else
            "dangerouslySetInnerHTML" !== l2 &&
              "children" !== l2 &&
              "suppressContentEditableWarning" !== l2 &&
              "suppressHydrationWarning" !== l2 &&
              "autoFocus" !== l2 &&
              (ea.hasOwnProperty(l2)
                ? f2 || (f2 = [])
                : (f2 = f2 || []).push(l2, null));
      for (l2 in d2) {
        var k2 = d2[l2];
        h2 = null != e2 ? e2[l2] : void 0;
        if (d2.hasOwnProperty(l2) && k2 !== h2 && (null != k2 || null != h2))
          if ("style" === l2)
            if (h2) {
              for (g2 in h2)
                !h2.hasOwnProperty(g2) ||
                  (k2 && k2.hasOwnProperty(g2)) ||
                  (c2 || (c2 = {}), (c2[g2] = ""));
              for (g2 in k2)
                k2.hasOwnProperty(g2) &&
                  h2[g2] !== k2[g2] &&
                  (c2 || (c2 = {}), (c2[g2] = k2[g2]));
            } else c2 || (f2 || (f2 = []), f2.push(l2, c2)), (c2 = k2);
          else
            "dangerouslySetInnerHTML" === l2
              ? ((k2 = k2 ? k2.__html : void 0),
                (h2 = h2 ? h2.__html : void 0),
                null != k2 && h2 !== k2 && (f2 = f2 || []).push(l2, k2))
              : "children" === l2
              ? ("string" !== typeof k2 && "number" !== typeof k2) ||
                (f2 = f2 || []).push(l2, "" + k2)
              : "suppressContentEditableWarning" !== l2 &&
                "suppressHydrationWarning" !== l2 &&
                (ea.hasOwnProperty(l2)
                  ? (null != k2 && "onScroll" === l2 && D$1("scroll", a2),
                    f2 || h2 === k2 || (f2 = []))
                  : (f2 = f2 || []).push(l2, k2));
      }
      c2 && (f2 = f2 || []).push("style", c2);
      var l2 = f2;
      if ((b2.updateQueue = l2)) b2.flags |= 4;
    }
  };
  Dj = function (a2, b2, c2, d2) {
    c2 !== d2 && (b2.flags |= 4);
  };
  function Ej(a2, b2) {
    if (!I$1)
      switch (a2.tailMode) {
        case "hidden":
          b2 = a2.tail;
          for (var c2 = null; null !== b2; )
            null !== b2.alternate && (c2 = b2), (b2 = b2.sibling);
          null === c2 ? (a2.tail = null) : (c2.sibling = null);
          break;
        case "collapsed":
          c2 = a2.tail;
          for (var d2 = null; null !== c2; )
            null !== c2.alternate && (d2 = c2), (c2 = c2.sibling);
          null === d2
            ? b2 || null === a2.tail
              ? (a2.tail = null)
              : (a2.tail.sibling = null)
            : (d2.sibling = null);
      }
  }
  function S$1(a2) {
    var b2 = null !== a2.alternate && a2.alternate.child === a2.child,
      c2 = 0,
      d2 = 0;
    if (b2)
      for (var e2 = a2.child; null !== e2; )
        (c2 |= e2.lanes | e2.childLanes),
          (d2 |= e2.subtreeFlags & 14680064),
          (d2 |= e2.flags & 14680064),
          (e2.return = a2),
          (e2 = e2.sibling);
    else
      for (e2 = a2.child; null !== e2; )
        (c2 |= e2.lanes | e2.childLanes),
          (d2 |= e2.subtreeFlags),
          (d2 |= e2.flags),
          (e2.return = a2),
          (e2 = e2.sibling);
    a2.subtreeFlags |= d2;
    a2.childLanes = c2;
    return b2;
  }
  function Fj(a2, b2, c2) {
    var d2 = b2.pendingProps;
    wg(b2);
    switch (b2.tag) {
      case 2:
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return S$1(b2), null;
      case 1:
        return Zf(b2.type) && $f(), S$1(b2), null;
      case 3:
        d2 = b2.stateNode;
        Jh();
        E$1(Wf);
        E$1(H$1);
        Oh();
        d2.pendingContext &&
          ((d2.context = d2.pendingContext), (d2.pendingContext = null));
        if (null === a2 || null === a2.child)
          Gg(b2)
            ? (b2.flags |= 4)
            : null === a2 ||
              (a2.memoizedState.isDehydrated && 0 === (b2.flags & 256)) ||
              ((b2.flags |= 1024), null !== zg && (Gj(zg), (zg = null)));
        Bj(a2, b2);
        S$1(b2);
        return null;
      case 5:
        Lh(b2);
        var e2 = Hh(Gh.current);
        c2 = b2.type;
        if (null !== a2 && null != b2.stateNode)
          Cj(a2, b2, c2, d2, e2),
            a2.ref !== b2.ref && ((b2.flags |= 512), (b2.flags |= 2097152));
        else {
          if (!d2) {
            if (null === b2.stateNode) throw Error(p$1(166));
            S$1(b2);
            return null;
          }
          a2 = Hh(Eh.current);
          if (Gg(b2)) {
            d2 = b2.stateNode;
            c2 = b2.type;
            var f2 = b2.memoizedProps;
            d2[Of] = b2;
            d2[Pf] = f2;
            a2 = 0 !== (b2.mode & 1);
            switch (c2) {
              case "dialog":
                D$1("cancel", d2);
                D$1("close", d2);
                break;
              case "iframe":
              case "object":
              case "embed":
                D$1("load", d2);
                break;
              case "video":
              case "audio":
                for (e2 = 0; e2 < lf.length; e2++) D$1(lf[e2], d2);
                break;
              case "source":
                D$1("error", d2);
                break;
              case "img":
              case "image":
              case "link":
                D$1("error", d2);
                D$1("load", d2);
                break;
              case "details":
                D$1("toggle", d2);
                break;
              case "input":
                Za(d2, f2);
                D$1("invalid", d2);
                break;
              case "select":
                d2._wrapperState = { wasMultiple: !!f2.multiple };
                D$1("invalid", d2);
                break;
              case "textarea":
                hb(d2, f2), D$1("invalid", d2);
            }
            ub(c2, f2);
            e2 = null;
            for (var g2 in f2)
              if (f2.hasOwnProperty(g2)) {
                var h2 = f2[g2];
                "children" === g2
                  ? "string" === typeof h2
                    ? d2.textContent !== h2 &&
                      (true !== f2.suppressHydrationWarning &&
                        Af(d2.textContent, h2, a2),
                      (e2 = ["children", h2]))
                    : "number" === typeof h2 &&
                      d2.textContent !== "" + h2 &&
                      (true !== f2.suppressHydrationWarning &&
                        Af(d2.textContent, h2, a2),
                      (e2 = ["children", "" + h2]))
                  : ea.hasOwnProperty(g2) &&
                    null != h2 &&
                    "onScroll" === g2 &&
                    D$1("scroll", d2);
              }
            switch (c2) {
              case "input":
                Va(d2);
                db(d2, f2, true);
                break;
              case "textarea":
                Va(d2);
                jb(d2);
                break;
              case "select":
              case "option":
                break;
              default:
                "function" === typeof f2.onClick && (d2.onclick = Bf);
            }
            d2 = e2;
            b2.updateQueue = d2;
            null !== d2 && (b2.flags |= 4);
          } else {
            g2 = 9 === e2.nodeType ? e2 : e2.ownerDocument;
            "http://www.w3.org/1999/xhtml" === a2 && (a2 = kb(c2));
            "http://www.w3.org/1999/xhtml" === a2
              ? "script" === c2
                ? ((a2 = g2.createElement("div")),
                  (a2.innerHTML = "<script></script>"),
                  (a2 = a2.removeChild(a2.firstChild)))
                : "string" === typeof d2.is
                ? (a2 = g2.createElement(c2, { is: d2.is }))
                : ((a2 = g2.createElement(c2)),
                  "select" === c2 &&
                    ((g2 = a2),
                    d2.multiple
                      ? (g2.multiple = true)
                      : d2.size && (g2.size = d2.size)))
              : (a2 = g2.createElementNS(a2, c2));
            a2[Of] = b2;
            a2[Pf] = d2;
            Aj(a2, b2, false, false);
            b2.stateNode = a2;
            a: {
              g2 = vb(c2, d2);
              switch (c2) {
                case "dialog":
                  D$1("cancel", a2);
                  D$1("close", a2);
                  e2 = d2;
                  break;
                case "iframe":
                case "object":
                case "embed":
                  D$1("load", a2);
                  e2 = d2;
                  break;
                case "video":
                case "audio":
                  for (e2 = 0; e2 < lf.length; e2++) D$1(lf[e2], a2);
                  e2 = d2;
                  break;
                case "source":
                  D$1("error", a2);
                  e2 = d2;
                  break;
                case "img":
                case "image":
                case "link":
                  D$1("error", a2);
                  D$1("load", a2);
                  e2 = d2;
                  break;
                case "details":
                  D$1("toggle", a2);
                  e2 = d2;
                  break;
                case "input":
                  Za(a2, d2);
                  e2 = Ya(a2, d2);
                  D$1("invalid", a2);
                  break;
                case "option":
                  e2 = d2;
                  break;
                case "select":
                  a2._wrapperState = { wasMultiple: !!d2.multiple };
                  e2 = A$1({}, d2, { value: void 0 });
                  D$1("invalid", a2);
                  break;
                case "textarea":
                  hb(a2, d2);
                  e2 = gb(a2, d2);
                  D$1("invalid", a2);
                  break;
                default:
                  e2 = d2;
              }
              ub(c2, e2);
              h2 = e2;
              for (f2 in h2)
                if (h2.hasOwnProperty(f2)) {
                  var k2 = h2[f2];
                  "style" === f2
                    ? sb(a2, k2)
                    : "dangerouslySetInnerHTML" === f2
                    ? ((k2 = k2 ? k2.__html : void 0), null != k2 && nb(a2, k2))
                    : "children" === f2
                    ? "string" === typeof k2
                      ? ("textarea" !== c2 || "" !== k2) && ob(a2, k2)
                      : "number" === typeof k2 && ob(a2, "" + k2)
                    : "suppressContentEditableWarning" !== f2 &&
                      "suppressHydrationWarning" !== f2 &&
                      "autoFocus" !== f2 &&
                      (ea.hasOwnProperty(f2)
                        ? null != k2 && "onScroll" === f2 && D$1("scroll", a2)
                        : null != k2 && ta(a2, f2, k2, g2));
                }
              switch (c2) {
                case "input":
                  Va(a2);
                  db(a2, d2, false);
                  break;
                case "textarea":
                  Va(a2);
                  jb(a2);
                  break;
                case "option":
                  null != d2.value &&
                    a2.setAttribute("value", "" + Sa(d2.value));
                  break;
                case "select":
                  a2.multiple = !!d2.multiple;
                  f2 = d2.value;
                  null != f2
                    ? fb(a2, !!d2.multiple, f2, false)
                    : null != d2.defaultValue &&
                      fb(a2, !!d2.multiple, d2.defaultValue, true);
                  break;
                default:
                  "function" === typeof e2.onClick && (a2.onclick = Bf);
              }
              switch (c2) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  d2 = !!d2.autoFocus;
                  break a;
                case "img":
                  d2 = true;
                  break a;
                default:
                  d2 = false;
              }
            }
            d2 && (b2.flags |= 4);
          }
          null !== b2.ref && ((b2.flags |= 512), (b2.flags |= 2097152));
        }
        S$1(b2);
        return null;
      case 6:
        if (a2 && null != b2.stateNode) Dj(a2, b2, a2.memoizedProps, d2);
        else {
          if ("string" !== typeof d2 && null === b2.stateNode)
            throw Error(p$1(166));
          c2 = Hh(Gh.current);
          Hh(Eh.current);
          if (Gg(b2)) {
            d2 = b2.stateNode;
            c2 = b2.memoizedProps;
            d2[Of] = b2;
            if ((f2 = d2.nodeValue !== c2)) {
              if (((a2 = xg), null !== a2))
                switch (a2.tag) {
                  case 3:
                    Af(d2.nodeValue, c2, 0 !== (a2.mode & 1));
                    break;
                  case 5:
                    true !== a2.memoizedProps.suppressHydrationWarning &&
                      Af(d2.nodeValue, c2, 0 !== (a2.mode & 1));
                }
            }
            f2 && (b2.flags |= 4);
          } else
            (d2 = (9 === c2.nodeType ? c2 : c2.ownerDocument).createTextNode(
              d2
            )),
              (d2[Of] = b2),
              (b2.stateNode = d2);
        }
        S$1(b2);
        return null;
      case 13:
        E$1(M$1);
        d2 = b2.memoizedState;
        if (
          null === a2 ||
          (null !== a2.memoizedState && null !== a2.memoizedState.dehydrated)
        ) {
          if (
            I$1 &&
            null !== yg &&
            0 !== (b2.mode & 1) &&
            0 === (b2.flags & 128)
          )
            Hg(), Ig(), (b2.flags |= 98560), (f2 = false);
          else if (((f2 = Gg(b2)), null !== d2 && null !== d2.dehydrated)) {
            if (null === a2) {
              if (!f2) throw Error(p$1(318));
              f2 = b2.memoizedState;
              f2 = null !== f2 ? f2.dehydrated : null;
              if (!f2) throw Error(p$1(317));
              f2[Of] = b2;
            } else
              Ig(),
                0 === (b2.flags & 128) && (b2.memoizedState = null),
                (b2.flags |= 4);
            S$1(b2);
            f2 = false;
          } else null !== zg && (Gj(zg), (zg = null)), (f2 = true);
          if (!f2) return b2.flags & 65536 ? b2 : null;
        }
        if (0 !== (b2.flags & 128)) return (b2.lanes = c2), b2;
        d2 = null !== d2;
        d2 !== (null !== a2 && null !== a2.memoizedState) &&
          d2 &&
          ((b2.child.flags |= 8192),
          0 !== (b2.mode & 1) &&
            (null === a2 || 0 !== (M$1.current & 1)
              ? 0 === T$1 && (T$1 = 3)
              : uj()));
        null !== b2.updateQueue && (b2.flags |= 4);
        S$1(b2);
        return null;
      case 4:
        return (
          Jh(),
          Bj(a2, b2),
          null === a2 && sf(b2.stateNode.containerInfo),
          S$1(b2),
          null
        );
      case 10:
        return Rg(b2.type._context), S$1(b2), null;
      case 17:
        return Zf(b2.type) && $f(), S$1(b2), null;
      case 19:
        E$1(M$1);
        f2 = b2.memoizedState;
        if (null === f2) return S$1(b2), null;
        d2 = 0 !== (b2.flags & 128);
        g2 = f2.rendering;
        if (null === g2)
          if (d2) Ej(f2, false);
          else {
            if (0 !== T$1 || (null !== a2 && 0 !== (a2.flags & 128)))
              for (a2 = b2.child; null !== a2; ) {
                g2 = Mh(a2);
                if (null !== g2) {
                  b2.flags |= 128;
                  Ej(f2, false);
                  d2 = g2.updateQueue;
                  null !== d2 && ((b2.updateQueue = d2), (b2.flags |= 4));
                  b2.subtreeFlags = 0;
                  d2 = c2;
                  for (c2 = b2.child; null !== c2; )
                    (f2 = c2),
                      (a2 = d2),
                      (f2.flags &= 14680066),
                      (g2 = f2.alternate),
                      null === g2
                        ? ((f2.childLanes = 0),
                          (f2.lanes = a2),
                          (f2.child = null),
                          (f2.subtreeFlags = 0),
                          (f2.memoizedProps = null),
                          (f2.memoizedState = null),
                          (f2.updateQueue = null),
                          (f2.dependencies = null),
                          (f2.stateNode = null))
                        : ((f2.childLanes = g2.childLanes),
                          (f2.lanes = g2.lanes),
                          (f2.child = g2.child),
                          (f2.subtreeFlags = 0),
                          (f2.deletions = null),
                          (f2.memoizedProps = g2.memoizedProps),
                          (f2.memoizedState = g2.memoizedState),
                          (f2.updateQueue = g2.updateQueue),
                          (f2.type = g2.type),
                          (a2 = g2.dependencies),
                          (f2.dependencies =
                            null === a2
                              ? null
                              : {
                                  lanes: a2.lanes,
                                  firstContext: a2.firstContext,
                                })),
                      (c2 = c2.sibling);
                  G$1(M$1, (M$1.current & 1) | 2);
                  return b2.child;
                }
                a2 = a2.sibling;
              }
            null !== f2.tail &&
              B$1() > Hj &&
              ((b2.flags |= 128),
              (d2 = true),
              Ej(f2, false),
              (b2.lanes = 4194304));
          }
        else {
          if (!d2)
            if (((a2 = Mh(g2)), null !== a2)) {
              if (
                ((b2.flags |= 128),
                (d2 = true),
                (c2 = a2.updateQueue),
                null !== c2 && ((b2.updateQueue = c2), (b2.flags |= 4)),
                Ej(f2, true),
                null === f2.tail &&
                  "hidden" === f2.tailMode &&
                  !g2.alternate &&
                  !I$1)
              )
                return S$1(b2), null;
            } else
              2 * B$1() - f2.renderingStartTime > Hj &&
                1073741824 !== c2 &&
                ((b2.flags |= 128),
                (d2 = true),
                Ej(f2, false),
                (b2.lanes = 4194304));
          f2.isBackwards
            ? ((g2.sibling = b2.child), (b2.child = g2))
            : ((c2 = f2.last),
              null !== c2 ? (c2.sibling = g2) : (b2.child = g2),
              (f2.last = g2));
        }
        if (null !== f2.tail)
          return (
            (b2 = f2.tail),
            (f2.rendering = b2),
            (f2.tail = b2.sibling),
            (f2.renderingStartTime = B$1()),
            (b2.sibling = null),
            (c2 = M$1.current),
            G$1(M$1, d2 ? (c2 & 1) | 2 : c2 & 1),
            b2
          );
        S$1(b2);
        return null;
      case 22:
      case 23:
        return (
          Ij(),
          (d2 = null !== b2.memoizedState),
          null !== a2 &&
            (null !== a2.memoizedState) !== d2 &&
            (b2.flags |= 8192),
          d2 && 0 !== (b2.mode & 1)
            ? 0 !== (gj & 1073741824) &&
              (S$1(b2), b2.subtreeFlags & 6 && (b2.flags |= 8192))
            : S$1(b2),
          null
        );
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(p$1(156, b2.tag));
  }
  function Jj(a2, b2) {
    wg(b2);
    switch (b2.tag) {
      case 1:
        return (
          Zf(b2.type) && $f(),
          (a2 = b2.flags),
          a2 & 65536 ? ((b2.flags = (a2 & -65537) | 128), b2) : null
        );
      case 3:
        return (
          Jh(),
          E$1(Wf),
          E$1(H$1),
          Oh(),
          (a2 = b2.flags),
          0 !== (a2 & 65536) && 0 === (a2 & 128)
            ? ((b2.flags = (a2 & -65537) | 128), b2)
            : null
        );
      case 5:
        return Lh(b2), null;
      case 13:
        E$1(M$1);
        a2 = b2.memoizedState;
        if (null !== a2 && null !== a2.dehydrated) {
          if (null === b2.alternate) throw Error(p$1(340));
          Ig();
        }
        a2 = b2.flags;
        return a2 & 65536 ? ((b2.flags = (a2 & -65537) | 128), b2) : null;
      case 19:
        return E$1(M$1), null;
      case 4:
        return Jh(), null;
      case 10:
        return Rg(b2.type._context), null;
      case 22:
      case 23:
        return Ij(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var Kj = false,
    U$1 = false,
    Lj = "function" === typeof WeakSet ? WeakSet : Set,
    V$1 = null;
  function Mj(a2, b2) {
    var c2 = a2.ref;
    if (null !== c2)
      if ("function" === typeof c2)
        try {
          c2(null);
        } catch (d2) {
          W$1(a2, b2, d2);
        }
      else c2.current = null;
  }
  function Nj(a2, b2, c2) {
    try {
      c2();
    } catch (d2) {
      W$1(a2, b2, d2);
    }
  }
  var Oj = false;
  function Pj(a2, b2) {
    Cf = dd;
    a2 = Me();
    if (Ne(a2)) {
      if ("selectionStart" in a2)
        var c2 = { start: a2.selectionStart, end: a2.selectionEnd };
      else
        a: {
          c2 = ((c2 = a2.ownerDocument) && c2.defaultView) || window;
          var d2 = c2.getSelection && c2.getSelection();
          if (d2 && 0 !== d2.rangeCount) {
            c2 = d2.anchorNode;
            var e2 = d2.anchorOffset,
              f2 = d2.focusNode;
            d2 = d2.focusOffset;
            try {
              c2.nodeType, f2.nodeType;
            } catch (F2) {
              c2 = null;
              break a;
            }
            var g2 = 0,
              h2 = -1,
              k2 = -1,
              l2 = 0,
              m2 = 0,
              q2 = a2,
              r2 = null;
            b: for (;;) {
              for (var y2; ; ) {
                q2 !== c2 || (0 !== e2 && 3 !== q2.nodeType) || (h2 = g2 + e2);
                q2 !== f2 || (0 !== d2 && 3 !== q2.nodeType) || (k2 = g2 + d2);
                3 === q2.nodeType && (g2 += q2.nodeValue.length);
                if (null === (y2 = q2.firstChild)) break;
                r2 = q2;
                q2 = y2;
              }
              for (;;) {
                if (q2 === a2) break b;
                r2 === c2 && ++l2 === e2 && (h2 = g2);
                r2 === f2 && ++m2 === d2 && (k2 = g2);
                if (null !== (y2 = q2.nextSibling)) break;
                q2 = r2;
                r2 = q2.parentNode;
              }
              q2 = y2;
            }
            c2 = -1 === h2 || -1 === k2 ? null : { start: h2, end: k2 };
          } else c2 = null;
        }
      c2 = c2 || { start: 0, end: 0 };
    } else c2 = null;
    Df = { focusedElem: a2, selectionRange: c2 };
    dd = false;
    for (V$1 = b2; null !== V$1; )
      if (
        ((b2 = V$1),
        (a2 = b2.child),
        0 !== (b2.subtreeFlags & 1028) && null !== a2)
      )
        (a2.return = b2), (V$1 = a2);
      else
        for (; null !== V$1; ) {
          b2 = V$1;
          try {
            var n2 = b2.alternate;
            if (0 !== (b2.flags & 1024))
              switch (b2.tag) {
                case 0:
                case 11:
                case 15:
                  break;
                case 1:
                  if (null !== n2) {
                    var t2 = n2.memoizedProps,
                      J2 = n2.memoizedState,
                      x2 = b2.stateNode,
                      w2 = x2.getSnapshotBeforeUpdate(
                        b2.elementType === b2.type ? t2 : Lg(b2.type, t2),
                        J2
                      );
                    x2.__reactInternalSnapshotBeforeUpdate = w2;
                  }
                  break;
                case 3:
                  var u2 = b2.stateNode.containerInfo;
                  1 === u2.nodeType
                    ? (u2.textContent = "")
                    : 9 === u2.nodeType &&
                      u2.documentElement &&
                      u2.removeChild(u2.documentElement);
                  break;
                case 5:
                case 6:
                case 4:
                case 17:
                  break;
                default:
                  throw Error(p$1(163));
              }
          } catch (F2) {
            W$1(b2, b2.return, F2);
          }
          a2 = b2.sibling;
          if (null !== a2) {
            a2.return = b2.return;
            V$1 = a2;
            break;
          }
          V$1 = b2.return;
        }
    n2 = Oj;
    Oj = false;
    return n2;
  }
  function Qj(a2, b2, c2) {
    var d2 = b2.updateQueue;
    d2 = null !== d2 ? d2.lastEffect : null;
    if (null !== d2) {
      var e2 = (d2 = d2.next);
      do {
        if ((e2.tag & a2) === a2) {
          var f2 = e2.destroy;
          e2.destroy = void 0;
          void 0 !== f2 && Nj(b2, c2, f2);
        }
        e2 = e2.next;
      } while (e2 !== d2);
    }
  }
  function Rj(a2, b2) {
    b2 = b2.updateQueue;
    b2 = null !== b2 ? b2.lastEffect : null;
    if (null !== b2) {
      var c2 = (b2 = b2.next);
      do {
        if ((c2.tag & a2) === a2) {
          var d2 = c2.create;
          c2.destroy = d2();
        }
        c2 = c2.next;
      } while (c2 !== b2);
    }
  }
  function Sj(a2) {
    var b2 = a2.ref;
    if (null !== b2) {
      var c2 = a2.stateNode;
      switch (a2.tag) {
        case 5:
          a2 = c2;
          break;
        default:
          a2 = c2;
      }
      "function" === typeof b2 ? b2(a2) : (b2.current = a2);
    }
  }
  function Tj(a2) {
    var b2 = a2.alternate;
    null !== b2 && ((a2.alternate = null), Tj(b2));
    a2.child = null;
    a2.deletions = null;
    a2.sibling = null;
    5 === a2.tag &&
      ((b2 = a2.stateNode),
      null !== b2 &&
        (delete b2[Of],
        delete b2[Pf],
        delete b2[of],
        delete b2[Qf],
        delete b2[Rf]));
    a2.stateNode = null;
    a2.return = null;
    a2.dependencies = null;
    a2.memoizedProps = null;
    a2.memoizedState = null;
    a2.pendingProps = null;
    a2.stateNode = null;
    a2.updateQueue = null;
  }
  function Uj(a2) {
    return 5 === a2.tag || 3 === a2.tag || 4 === a2.tag;
  }
  function Vj(a2) {
    a: for (;;) {
      for (; null === a2.sibling; ) {
        if (null === a2.return || Uj(a2.return)) return null;
        a2 = a2.return;
      }
      a2.sibling.return = a2.return;
      for (a2 = a2.sibling; 5 !== a2.tag && 6 !== a2.tag && 18 !== a2.tag; ) {
        if (a2.flags & 2) continue a;
        if (null === a2.child || 4 === a2.tag) continue a;
        else (a2.child.return = a2), (a2 = a2.child);
      }
      if (!(a2.flags & 2)) return a2.stateNode;
    }
  }
  function Wj(a2, b2, c2) {
    var d2 = a2.tag;
    if (5 === d2 || 6 === d2)
      (a2 = a2.stateNode),
        b2
          ? 8 === c2.nodeType
            ? c2.parentNode.insertBefore(a2, b2)
            : c2.insertBefore(a2, b2)
          : (8 === c2.nodeType
              ? ((b2 = c2.parentNode), b2.insertBefore(a2, c2))
              : ((b2 = c2), b2.appendChild(a2)),
            (c2 = c2._reactRootContainer),
            (null !== c2 && void 0 !== c2) ||
              null !== b2.onclick ||
              (b2.onclick = Bf));
    else if (4 !== d2 && ((a2 = a2.child), null !== a2))
      for (Wj(a2, b2, c2), a2 = a2.sibling; null !== a2; )
        Wj(a2, b2, c2), (a2 = a2.sibling);
  }
  function Xj(a2, b2, c2) {
    var d2 = a2.tag;
    if (5 === d2 || 6 === d2)
      (a2 = a2.stateNode), b2 ? c2.insertBefore(a2, b2) : c2.appendChild(a2);
    else if (4 !== d2 && ((a2 = a2.child), null !== a2))
      for (Xj(a2, b2, c2), a2 = a2.sibling; null !== a2; )
        Xj(a2, b2, c2), (a2 = a2.sibling);
  }
  var X$1 = null,
    Yj = false;
  function Zj(a2, b2, c2) {
    for (c2 = c2.child; null !== c2; ) ak(a2, b2, c2), (c2 = c2.sibling);
  }
  function ak(a2, b2, c2) {
    if (lc && "function" === typeof lc.onCommitFiberUnmount)
      try {
        lc.onCommitFiberUnmount(kc, c2);
      } catch (h2) {}
    switch (c2.tag) {
      case 5:
        U$1 || Mj(c2, b2);
      case 6:
        var d2 = X$1,
          e2 = Yj;
        X$1 = null;
        Zj(a2, b2, c2);
        X$1 = d2;
        Yj = e2;
        null !== X$1 &&
          (Yj
            ? ((a2 = X$1),
              (c2 = c2.stateNode),
              8 === a2.nodeType
                ? a2.parentNode.removeChild(c2)
                : a2.removeChild(c2))
            : X$1.removeChild(c2.stateNode));
        break;
      case 18:
        null !== X$1 &&
          (Yj
            ? ((a2 = X$1),
              (c2 = c2.stateNode),
              8 === a2.nodeType
                ? Kf(a2.parentNode, c2)
                : 1 === a2.nodeType && Kf(a2, c2),
              bd(a2))
            : Kf(X$1, c2.stateNode));
        break;
      case 4:
        d2 = X$1;
        e2 = Yj;
        X$1 = c2.stateNode.containerInfo;
        Yj = true;
        Zj(a2, b2, c2);
        X$1 = d2;
        Yj = e2;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (
          !U$1 &&
          ((d2 = c2.updateQueue),
          null !== d2 && ((d2 = d2.lastEffect), null !== d2))
        ) {
          e2 = d2 = d2.next;
          do {
            var f2 = e2,
              g2 = f2.destroy;
            f2 = f2.tag;
            void 0 !== g2 &&
              (0 !== (f2 & 2)
                ? Nj(c2, b2, g2)
                : 0 !== (f2 & 4) && Nj(c2, b2, g2));
            e2 = e2.next;
          } while (e2 !== d2);
        }
        Zj(a2, b2, c2);
        break;
      case 1:
        if (
          !U$1 &&
          (Mj(c2, b2),
          (d2 = c2.stateNode),
          "function" === typeof d2.componentWillUnmount)
        )
          try {
            (d2.props = c2.memoizedProps),
              (d2.state = c2.memoizedState),
              d2.componentWillUnmount();
          } catch (h2) {
            W$1(c2, b2, h2);
          }
        Zj(a2, b2, c2);
        break;
      case 21:
        Zj(a2, b2, c2);
        break;
      case 22:
        c2.mode & 1
          ? ((U$1 = (d2 = U$1) || null !== c2.memoizedState),
            Zj(a2, b2, c2),
            (U$1 = d2))
          : Zj(a2, b2, c2);
        break;
      default:
        Zj(a2, b2, c2);
    }
  }
  function bk(a2) {
    var b2 = a2.updateQueue;
    if (null !== b2) {
      a2.updateQueue = null;
      var c2 = a2.stateNode;
      null === c2 && (c2 = a2.stateNode = new Lj());
      b2.forEach(function (b3) {
        var d2 = ck.bind(null, a2, b3);
        c2.has(b3) || (c2.add(b3), b3.then(d2, d2));
      });
    }
  }
  function dk(a2, b2) {
    var c2 = b2.deletions;
    if (null !== c2)
      for (var d2 = 0; d2 < c2.length; d2++) {
        var e2 = c2[d2];
        try {
          var f2 = a2,
            g2 = b2,
            h2 = g2;
          a: for (; null !== h2; ) {
            switch (h2.tag) {
              case 5:
                X$1 = h2.stateNode;
                Yj = false;
                break a;
              case 3:
                X$1 = h2.stateNode.containerInfo;
                Yj = true;
                break a;
              case 4:
                X$1 = h2.stateNode.containerInfo;
                Yj = true;
                break a;
            }
            h2 = h2.return;
          }
          if (null === X$1) throw Error(p$1(160));
          ak(f2, g2, e2);
          X$1 = null;
          Yj = false;
          var k2 = e2.alternate;
          null !== k2 && (k2.return = null);
          e2.return = null;
        } catch (l2) {
          W$1(e2, b2, l2);
        }
      }
    if (b2.subtreeFlags & 12854)
      for (b2 = b2.child; null !== b2; ) ek(b2, a2), (b2 = b2.sibling);
  }
  function ek(a2, b2) {
    var c2 = a2.alternate,
      d2 = a2.flags;
    switch (a2.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        dk(b2, a2);
        fk(a2);
        if (d2 & 4) {
          try {
            Qj(3, a2, a2.return), Rj(3, a2);
          } catch (t2) {
            W$1(a2, a2.return, t2);
          }
          try {
            Qj(5, a2, a2.return);
          } catch (t2) {
            W$1(a2, a2.return, t2);
          }
        }
        break;
      case 1:
        dk(b2, a2);
        fk(a2);
        d2 & 512 && null !== c2 && Mj(c2, c2.return);
        break;
      case 5:
        dk(b2, a2);
        fk(a2);
        d2 & 512 && null !== c2 && Mj(c2, c2.return);
        if (a2.flags & 32) {
          var e2 = a2.stateNode;
          try {
            ob(e2, "");
          } catch (t2) {
            W$1(a2, a2.return, t2);
          }
        }
        if (d2 & 4 && ((e2 = a2.stateNode), null != e2)) {
          var f2 = a2.memoizedProps,
            g2 = null !== c2 ? c2.memoizedProps : f2,
            h2 = a2.type,
            k2 = a2.updateQueue;
          a2.updateQueue = null;
          if (null !== k2)
            try {
              "input" === h2 &&
                "radio" === f2.type &&
                null != f2.name &&
                ab(e2, f2);
              vb(h2, g2);
              var l2 = vb(h2, f2);
              for (g2 = 0; g2 < k2.length; g2 += 2) {
                var m2 = k2[g2],
                  q2 = k2[g2 + 1];
                "style" === m2
                  ? sb(e2, q2)
                  : "dangerouslySetInnerHTML" === m2
                  ? nb(e2, q2)
                  : "children" === m2
                  ? ob(e2, q2)
                  : ta(e2, m2, q2, l2);
              }
              switch (h2) {
                case "input":
                  bb(e2, f2);
                  break;
                case "textarea":
                  ib(e2, f2);
                  break;
                case "select":
                  var r2 = e2._wrapperState.wasMultiple;
                  e2._wrapperState.wasMultiple = !!f2.multiple;
                  var y2 = f2.value;
                  null != y2
                    ? fb(e2, !!f2.multiple, y2, false)
                    : r2 !== !!f2.multiple &&
                      (null != f2.defaultValue
                        ? fb(e2, !!f2.multiple, f2.defaultValue, true)
                        : fb(e2, !!f2.multiple, f2.multiple ? [] : "", false));
              }
              e2[Pf] = f2;
            } catch (t2) {
              W$1(a2, a2.return, t2);
            }
        }
        break;
      case 6:
        dk(b2, a2);
        fk(a2);
        if (d2 & 4) {
          if (null === a2.stateNode) throw Error(p$1(162));
          e2 = a2.stateNode;
          f2 = a2.memoizedProps;
          try {
            e2.nodeValue = f2;
          } catch (t2) {
            W$1(a2, a2.return, t2);
          }
        }
        break;
      case 3:
        dk(b2, a2);
        fk(a2);
        if (d2 & 4 && null !== c2 && c2.memoizedState.isDehydrated)
          try {
            bd(b2.containerInfo);
          } catch (t2) {
            W$1(a2, a2.return, t2);
          }
        break;
      case 4:
        dk(b2, a2);
        fk(a2);
        break;
      case 13:
        dk(b2, a2);
        fk(a2);
        e2 = a2.child;
        e2.flags & 8192 &&
          ((f2 = null !== e2.memoizedState),
          (e2.stateNode.isHidden = f2),
          !f2 ||
            (null !== e2.alternate && null !== e2.alternate.memoizedState) ||
            (gk = B$1()));
        d2 & 4 && bk(a2);
        break;
      case 22:
        m2 = null !== c2 && null !== c2.memoizedState;
        a2.mode & 1
          ? ((U$1 = (l2 = U$1) || m2), dk(b2, a2), (U$1 = l2))
          : dk(b2, a2);
        fk(a2);
        if (d2 & 8192) {
          l2 = null !== a2.memoizedState;
          if ((a2.stateNode.isHidden = l2) && !m2 && 0 !== (a2.mode & 1))
            for (V$1 = a2, m2 = a2.child; null !== m2; ) {
              for (q2 = V$1 = m2; null !== V$1; ) {
                r2 = V$1;
                y2 = r2.child;
                switch (r2.tag) {
                  case 0:
                  case 11:
                  case 14:
                  case 15:
                    Qj(4, r2, r2.return);
                    break;
                  case 1:
                    Mj(r2, r2.return);
                    var n2 = r2.stateNode;
                    if ("function" === typeof n2.componentWillUnmount) {
                      d2 = r2;
                      c2 = r2.return;
                      try {
                        (b2 = d2),
                          (n2.props = b2.memoizedProps),
                          (n2.state = b2.memoizedState),
                          n2.componentWillUnmount();
                      } catch (t2) {
                        W$1(d2, c2, t2);
                      }
                    }
                    break;
                  case 5:
                    Mj(r2, r2.return);
                    break;
                  case 22:
                    if (null !== r2.memoizedState) {
                      hk(q2);
                      continue;
                    }
                }
                null !== y2 ? ((y2.return = r2), (V$1 = y2)) : hk(q2);
              }
              m2 = m2.sibling;
            }
          a: for (m2 = null, q2 = a2; ; ) {
            if (5 === q2.tag) {
              if (null === m2) {
                m2 = q2;
                try {
                  (e2 = q2.stateNode),
                    l2
                      ? ((f2 = e2.style),
                        "function" === typeof f2.setProperty
                          ? f2.setProperty("display", "none", "important")
                          : (f2.display = "none"))
                      : ((h2 = q2.stateNode),
                        (k2 = q2.memoizedProps.style),
                        (g2 =
                          void 0 !== k2 &&
                          null !== k2 &&
                          k2.hasOwnProperty("display")
                            ? k2.display
                            : null),
                        (h2.style.display = rb("display", g2)));
                } catch (t2) {
                  W$1(a2, a2.return, t2);
                }
              }
            } else if (6 === q2.tag) {
              if (null === m2)
                try {
                  q2.stateNode.nodeValue = l2 ? "" : q2.memoizedProps;
                } catch (t2) {
                  W$1(a2, a2.return, t2);
                }
            } else if (
              ((22 !== q2.tag && 23 !== q2.tag) ||
                null === q2.memoizedState ||
                q2 === a2) &&
              null !== q2.child
            ) {
              q2.child.return = q2;
              q2 = q2.child;
              continue;
            }
            if (q2 === a2) break a;
            for (; null === q2.sibling; ) {
              if (null === q2.return || q2.return === a2) break a;
              m2 === q2 && (m2 = null);
              q2 = q2.return;
            }
            m2 === q2 && (m2 = null);
            q2.sibling.return = q2.return;
            q2 = q2.sibling;
          }
        }
        break;
      case 19:
        dk(b2, a2);
        fk(a2);
        d2 & 4 && bk(a2);
        break;
      case 21:
        break;
      default:
        dk(b2, a2), fk(a2);
    }
  }
  function fk(a2) {
    var b2 = a2.flags;
    if (b2 & 2) {
      try {
        a: {
          for (var c2 = a2.return; null !== c2; ) {
            if (Uj(c2)) {
              var d2 = c2;
              break a;
            }
            c2 = c2.return;
          }
          throw Error(p$1(160));
        }
        switch (d2.tag) {
          case 5:
            var e2 = d2.stateNode;
            d2.flags & 32 && (ob(e2, ""), (d2.flags &= -33));
            var f2 = Vj(a2);
            Xj(a2, f2, e2);
            break;
          case 3:
          case 4:
            var g2 = d2.stateNode.containerInfo,
              h2 = Vj(a2);
            Wj(a2, h2, g2);
            break;
          default:
            throw Error(p$1(161));
        }
      } catch (k2) {
        W$1(a2, a2.return, k2);
      }
      a2.flags &= -3;
    }
    b2 & 4096 && (a2.flags &= -4097);
  }
  function ik(a2, b2, c2) {
    V$1 = a2;
    jk(a2);
  }
  function jk(a2, b2, c2) {
    for (var d2 = 0 !== (a2.mode & 1); null !== V$1; ) {
      var e2 = V$1,
        f2 = e2.child;
      if (22 === e2.tag && d2) {
        var g2 = null !== e2.memoizedState || Kj;
        if (!g2) {
          var h2 = e2.alternate,
            k2 = (null !== h2 && null !== h2.memoizedState) || U$1;
          h2 = Kj;
          var l2 = U$1;
          Kj = g2;
          if ((U$1 = k2) && !l2)
            for (V$1 = e2; null !== V$1; )
              (g2 = V$1),
                (k2 = g2.child),
                22 === g2.tag && null !== g2.memoizedState
                  ? kk(e2)
                  : null !== k2
                  ? ((k2.return = g2), (V$1 = k2))
                  : kk(e2);
          for (; null !== f2; ) (V$1 = f2), jk(f2), (f2 = f2.sibling);
          V$1 = e2;
          Kj = h2;
          U$1 = l2;
        }
        lk(a2);
      } else
        0 !== (e2.subtreeFlags & 8772) && null !== f2
          ? ((f2.return = e2), (V$1 = f2))
          : lk(a2);
    }
  }
  function lk(a2) {
    for (; null !== V$1; ) {
      var b2 = V$1;
      if (0 !== (b2.flags & 8772)) {
        var c2 = b2.alternate;
        try {
          if (0 !== (b2.flags & 8772))
            switch (b2.tag) {
              case 0:
              case 11:
              case 15:
                U$1 || Rj(5, b2);
                break;
              case 1:
                var d2 = b2.stateNode;
                if (b2.flags & 4 && !U$1)
                  if (null === c2) d2.componentDidMount();
                  else {
                    var e2 =
                      b2.elementType === b2.type
                        ? c2.memoizedProps
                        : Lg(b2.type, c2.memoizedProps);
                    d2.componentDidUpdate(
                      e2,
                      c2.memoizedState,
                      d2.__reactInternalSnapshotBeforeUpdate
                    );
                  }
                var f2 = b2.updateQueue;
                null !== f2 && ih(b2, f2, d2);
                break;
              case 3:
                var g2 = b2.updateQueue;
                if (null !== g2) {
                  c2 = null;
                  if (null !== b2.child)
                    switch (b2.child.tag) {
                      case 5:
                        c2 = b2.child.stateNode;
                        break;
                      case 1:
                        c2 = b2.child.stateNode;
                    }
                  ih(b2, g2, c2);
                }
                break;
              case 5:
                var h2 = b2.stateNode;
                if (null === c2 && b2.flags & 4) {
                  c2 = h2;
                  var k2 = b2.memoizedProps;
                  switch (b2.type) {
                    case "button":
                    case "input":
                    case "select":
                    case "textarea":
                      k2.autoFocus && c2.focus();
                      break;
                    case "img":
                      k2.src && (c2.src = k2.src);
                  }
                }
                break;
              case 6:
                break;
              case 4:
                break;
              case 12:
                break;
              case 13:
                if (null === b2.memoizedState) {
                  var l2 = b2.alternate;
                  if (null !== l2) {
                    var m2 = l2.memoizedState;
                    if (null !== m2) {
                      var q2 = m2.dehydrated;
                      null !== q2 && bd(q2);
                    }
                  }
                }
                break;
              case 19:
              case 17:
              case 21:
              case 22:
              case 23:
              case 25:
                break;
              default:
                throw Error(p$1(163));
            }
          U$1 || (b2.flags & 512 && Sj(b2));
        } catch (r2) {
          W$1(b2, b2.return, r2);
        }
      }
      if (b2 === a2) {
        V$1 = null;
        break;
      }
      c2 = b2.sibling;
      if (null !== c2) {
        c2.return = b2.return;
        V$1 = c2;
        break;
      }
      V$1 = b2.return;
    }
  }
  function hk(a2) {
    for (; null !== V$1; ) {
      var b2 = V$1;
      if (b2 === a2) {
        V$1 = null;
        break;
      }
      var c2 = b2.sibling;
      if (null !== c2) {
        c2.return = b2.return;
        V$1 = c2;
        break;
      }
      V$1 = b2.return;
    }
  }
  function kk(a2) {
    for (; null !== V$1; ) {
      var b2 = V$1;
      try {
        switch (b2.tag) {
          case 0:
          case 11:
          case 15:
            var c2 = b2.return;
            try {
              Rj(4, b2);
            } catch (k2) {
              W$1(b2, c2, k2);
            }
            break;
          case 1:
            var d2 = b2.stateNode;
            if ("function" === typeof d2.componentDidMount) {
              var e2 = b2.return;
              try {
                d2.componentDidMount();
              } catch (k2) {
                W$1(b2, e2, k2);
              }
            }
            var f2 = b2.return;
            try {
              Sj(b2);
            } catch (k2) {
              W$1(b2, f2, k2);
            }
            break;
          case 5:
            var g2 = b2.return;
            try {
              Sj(b2);
            } catch (k2) {
              W$1(b2, g2, k2);
            }
        }
      } catch (k2) {
        W$1(b2, b2.return, k2);
      }
      if (b2 === a2) {
        V$1 = null;
        break;
      }
      var h2 = b2.sibling;
      if (null !== h2) {
        h2.return = b2.return;
        V$1 = h2;
        break;
      }
      V$1 = b2.return;
    }
  }
  var mk = Math.ceil,
    nk = ua.ReactCurrentDispatcher,
    ok = ua.ReactCurrentOwner,
    pk = ua.ReactCurrentBatchConfig,
    K$1 = 0,
    R$1 = null,
    Y$1 = null,
    Z$1 = 0,
    gj = 0,
    fj = Uf(0),
    T$1 = 0,
    qk = null,
    hh = 0,
    rk = 0,
    sk = 0,
    tk = null,
    uk = null,
    gk = 0,
    Hj = Infinity,
    vk = null,
    Pi = false,
    Qi = null,
    Si = null,
    wk = false,
    xk = null,
    yk = 0,
    zk = 0,
    Ak = null,
    Bk = -1,
    Ck = 0;
  function L$1() {
    return 0 !== (K$1 & 6) ? B$1() : -1 !== Bk ? Bk : (Bk = B$1());
  }
  function lh(a2) {
    if (0 === (a2.mode & 1)) return 1;
    if (0 !== (K$1 & 2) && 0 !== Z$1) return Z$1 & -Z$1;
    if (null !== Kg.transition) return 0 === Ck && (Ck = yc()), Ck;
    a2 = C$1;
    if (0 !== a2) return a2;
    a2 = window.event;
    a2 = void 0 === a2 ? 16 : jd(a2.type);
    return a2;
  }
  function mh(a2, b2, c2, d2) {
    if (50 < zk) throw ((zk = 0), (Ak = null), Error(p$1(185)));
    Ac(a2, c2, d2);
    if (0 === (K$1 & 2) || a2 !== R$1)
      a2 === R$1 && (0 === (K$1 & 2) && (rk |= c2), 4 === T$1 && Dk(a2, Z$1)),
        Ek(a2, d2),
        1 === c2 &&
          0 === K$1 &&
          0 === (b2.mode & 1) &&
          ((Hj = B$1() + 500), fg && jg());
  }
  function Ek(a2, b2) {
    var c2 = a2.callbackNode;
    wc(a2, b2);
    var d2 = uc(a2, a2 === R$1 ? Z$1 : 0);
    if (0 === d2)
      null !== c2 && bc(c2),
        (a2.callbackNode = null),
        (a2.callbackPriority = 0);
    else if (((b2 = d2 & -d2), a2.callbackPriority !== b2)) {
      null != c2 && bc(c2);
      if (1 === b2)
        0 === a2.tag ? ig(Fk.bind(null, a2)) : hg(Fk.bind(null, a2)),
          Jf(function () {
            0 === (K$1 & 6) && jg();
          }),
          (c2 = null);
      else {
        switch (Dc(d2)) {
          case 1:
            c2 = fc;
            break;
          case 4:
            c2 = gc;
            break;
          case 16:
            c2 = hc;
            break;
          case 536870912:
            c2 = jc;
            break;
          default:
            c2 = hc;
        }
        c2 = Gk(c2, Hk.bind(null, a2));
      }
      a2.callbackPriority = b2;
      a2.callbackNode = c2;
    }
  }
  function Hk(a2, b2) {
    Bk = -1;
    Ck = 0;
    if (0 !== (K$1 & 6)) throw Error(p$1(327));
    var c2 = a2.callbackNode;
    if (Ik() && a2.callbackNode !== c2) return null;
    var d2 = uc(a2, a2 === R$1 ? Z$1 : 0);
    if (0 === d2) return null;
    if (0 !== (d2 & 30) || 0 !== (d2 & a2.expiredLanes) || b2) b2 = Jk(a2, d2);
    else {
      b2 = d2;
      var e2 = K$1;
      K$1 |= 2;
      var f2 = Kk();
      if (R$1 !== a2 || Z$1 !== b2) (vk = null), (Hj = B$1() + 500), Lk(a2, b2);
      do
        try {
          Mk();
          break;
        } catch (h2) {
          Nk(a2, h2);
        }
      while (1);
      Qg();
      nk.current = f2;
      K$1 = e2;
      null !== Y$1 ? (b2 = 0) : ((R$1 = null), (Z$1 = 0), (b2 = T$1));
    }
    if (0 !== b2) {
      2 === b2 && ((e2 = xc(a2)), 0 !== e2 && ((d2 = e2), (b2 = Ok(a2, e2))));
      if (1 === b2) throw ((c2 = qk), Lk(a2, 0), Dk(a2, d2), Ek(a2, B$1()), c2);
      if (6 === b2) Dk(a2, d2);
      else {
        e2 = a2.current.alternate;
        if (
          0 === (d2 & 30) &&
          !Pk(e2) &&
          ((b2 = Jk(a2, d2)),
          2 === b2 &&
            ((f2 = xc(a2)), 0 !== f2 && ((d2 = f2), (b2 = Ok(a2, f2)))),
          1 === b2)
        )
          throw ((c2 = qk), Lk(a2, 0), Dk(a2, d2), Ek(a2, B$1()), c2);
        a2.finishedWork = e2;
        a2.finishedLanes = d2;
        switch (b2) {
          case 0:
          case 1:
            throw Error(p$1(345));
          case 2:
            Qk(a2, uk, vk);
            break;
          case 3:
            Dk(a2, d2);
            if ((d2 & 130023424) === d2 && ((b2 = gk + 500 - B$1()), 10 < b2)) {
              if (0 !== uc(a2, 0)) break;
              e2 = a2.suspendedLanes;
              if ((e2 & d2) !== d2) {
                L$1();
                a2.pingedLanes |= a2.suspendedLanes & e2;
                break;
              }
              a2.timeoutHandle = Ff(Qk.bind(null, a2, uk, vk), b2);
              break;
            }
            Qk(a2, uk, vk);
            break;
          case 4:
            Dk(a2, d2);
            if ((d2 & 4194240) === d2) break;
            b2 = a2.eventTimes;
            for (e2 = -1; 0 < d2; ) {
              var g2 = 31 - oc(d2);
              f2 = 1 << g2;
              g2 = b2[g2];
              g2 > e2 && (e2 = g2);
              d2 &= ~f2;
            }
            d2 = e2;
            d2 = B$1() - d2;
            d2 =
              (120 > d2
                ? 120
                : 480 > d2
                ? 480
                : 1080 > d2
                ? 1080
                : 1920 > d2
                ? 1920
                : 3e3 > d2
                ? 3e3
                : 4320 > d2
                ? 4320
                : 1960 * mk(d2 / 1960)) - d2;
            if (10 < d2) {
              a2.timeoutHandle = Ff(Qk.bind(null, a2, uk, vk), d2);
              break;
            }
            Qk(a2, uk, vk);
            break;
          case 5:
            Qk(a2, uk, vk);
            break;
          default:
            throw Error(p$1(329));
        }
      }
    }
    Ek(a2, B$1());
    return a2.callbackNode === c2 ? Hk.bind(null, a2) : null;
  }
  function Ok(a2, b2) {
    var c2 = tk;
    a2.current.memoizedState.isDehydrated && (Lk(a2, b2).flags |= 256);
    a2 = Jk(a2, b2);
    2 !== a2 && ((b2 = uk), (uk = c2), null !== b2 && Gj(b2));
    return a2;
  }
  function Gj(a2) {
    null === uk ? (uk = a2) : uk.push.apply(uk, a2);
  }
  function Pk(a2) {
    for (var b2 = a2; ; ) {
      if (b2.flags & 16384) {
        var c2 = b2.updateQueue;
        if (null !== c2 && ((c2 = c2.stores), null !== c2))
          for (var d2 = 0; d2 < c2.length; d2++) {
            var e2 = c2[d2],
              f2 = e2.getSnapshot;
            e2 = e2.value;
            try {
              if (!He(f2(), e2)) return false;
            } catch (g2) {
              return false;
            }
          }
      }
      c2 = b2.child;
      if (b2.subtreeFlags & 16384 && null !== c2) (c2.return = b2), (b2 = c2);
      else {
        if (b2 === a2) break;
        for (; null === b2.sibling; ) {
          if (null === b2.return || b2.return === a2) return true;
          b2 = b2.return;
        }
        b2.sibling.return = b2.return;
        b2 = b2.sibling;
      }
    }
    return true;
  }
  function Dk(a2, b2) {
    b2 &= ~sk;
    b2 &= ~rk;
    a2.suspendedLanes |= b2;
    a2.pingedLanes &= ~b2;
    for (a2 = a2.expirationTimes; 0 < b2; ) {
      var c2 = 31 - oc(b2),
        d2 = 1 << c2;
      a2[c2] = -1;
      b2 &= ~d2;
    }
  }
  function Fk(a2) {
    if (0 !== (K$1 & 6)) throw Error(p$1(327));
    Ik();
    var b2 = uc(a2, 0);
    if (0 === (b2 & 1)) return Ek(a2, B$1()), null;
    var c2 = Jk(a2, b2);
    if (0 !== a2.tag && 2 === c2) {
      var d2 = xc(a2);
      0 !== d2 && ((b2 = d2), (c2 = Ok(a2, d2)));
    }
    if (1 === c2) throw ((c2 = qk), Lk(a2, 0), Dk(a2, b2), Ek(a2, B$1()), c2);
    if (6 === c2) throw Error(p$1(345));
    a2.finishedWork = a2.current.alternate;
    a2.finishedLanes = b2;
    Qk(a2, uk, vk);
    Ek(a2, B$1());
    return null;
  }
  function Rk(a2, b2) {
    var c2 = K$1;
    K$1 |= 1;
    try {
      return a2(b2);
    } finally {
      (K$1 = c2), 0 === K$1 && ((Hj = B$1() + 500), fg && jg());
    }
  }
  function Sk(a2) {
    null !== xk && 0 === xk.tag && 0 === (K$1 & 6) && Ik();
    var b2 = K$1;
    K$1 |= 1;
    var c2 = pk.transition,
      d2 = C$1;
    try {
      if (((pk.transition = null), (C$1 = 1), a2)) return a2();
    } finally {
      (C$1 = d2), (pk.transition = c2), (K$1 = b2), 0 === (K$1 & 6) && jg();
    }
  }
  function Ij() {
    gj = fj.current;
    E$1(fj);
  }
  function Lk(a2, b2) {
    a2.finishedWork = null;
    a2.finishedLanes = 0;
    var c2 = a2.timeoutHandle;
    -1 !== c2 && ((a2.timeoutHandle = -1), Gf(c2));
    if (null !== Y$1)
      for (c2 = Y$1.return; null !== c2; ) {
        var d2 = c2;
        wg(d2);
        switch (d2.tag) {
          case 1:
            d2 = d2.type.childContextTypes;
            null !== d2 && void 0 !== d2 && $f();
            break;
          case 3:
            Jh();
            E$1(Wf);
            E$1(H$1);
            Oh();
            break;
          case 5:
            Lh(d2);
            break;
          case 4:
            Jh();
            break;
          case 13:
            E$1(M$1);
            break;
          case 19:
            E$1(M$1);
            break;
          case 10:
            Rg(d2.type._context);
            break;
          case 22:
          case 23:
            Ij();
        }
        c2 = c2.return;
      }
    R$1 = a2;
    Y$1 = a2 = wh(a2.current, null);
    Z$1 = gj = b2;
    T$1 = 0;
    qk = null;
    sk = rk = hh = 0;
    uk = tk = null;
    if (null !== Wg) {
      for (b2 = 0; b2 < Wg.length; b2++)
        if (((c2 = Wg[b2]), (d2 = c2.interleaved), null !== d2)) {
          c2.interleaved = null;
          var e2 = d2.next,
            f2 = c2.pending;
          if (null !== f2) {
            var g2 = f2.next;
            f2.next = e2;
            d2.next = g2;
          }
          c2.pending = d2;
        }
      Wg = null;
    }
    return a2;
  }
  function Nk(a2, b2) {
    do {
      var c2 = Y$1;
      try {
        Qg();
        Ph.current = ai;
        if (Sh) {
          for (var d2 = N$1.memoizedState; null !== d2; ) {
            var e2 = d2.queue;
            null !== e2 && (e2.pending = null);
            d2 = d2.next;
          }
          Sh = false;
        }
        Rh = 0;
        P$1 = O$1 = N$1 = null;
        Th = false;
        Uh = 0;
        ok.current = null;
        if (null === c2 || null === c2.return) {
          T$1 = 1;
          qk = b2;
          Y$1 = null;
          break;
        }
        a: {
          var f2 = a2,
            g2 = c2.return,
            h2 = c2,
            k2 = b2;
          b2 = Z$1;
          h2.flags |= 32768;
          if (
            null !== k2 &&
            "object" === typeof k2 &&
            "function" === typeof k2.then
          ) {
            var l2 = k2,
              m2 = h2,
              q2 = m2.tag;
            if (0 === (m2.mode & 1) && (0 === q2 || 11 === q2 || 15 === q2)) {
              var r2 = m2.alternate;
              r2
                ? ((m2.updateQueue = r2.updateQueue),
                  (m2.memoizedState = r2.memoizedState),
                  (m2.lanes = r2.lanes))
                : ((m2.updateQueue = null), (m2.memoizedState = null));
            }
            var y2 = Vi(g2);
            if (null !== y2) {
              y2.flags &= -257;
              Wi(y2, g2, h2, f2, b2);
              y2.mode & 1 && Ti(f2, l2, b2);
              b2 = y2;
              k2 = l2;
              var n2 = b2.updateQueue;
              if (null === n2) {
                var t2 = /* @__PURE__ */ new Set();
                t2.add(k2);
                b2.updateQueue = t2;
              } else n2.add(k2);
              break a;
            } else {
              if (0 === (b2 & 1)) {
                Ti(f2, l2, b2);
                uj();
                break a;
              }
              k2 = Error(p$1(426));
            }
          } else if (I$1 && h2.mode & 1) {
            var J2 = Vi(g2);
            if (null !== J2) {
              0 === (J2.flags & 65536) && (J2.flags |= 256);
              Wi(J2, g2, h2, f2, b2);
              Jg(Ki(k2, h2));
              break a;
            }
          }
          f2 = k2 = Ki(k2, h2);
          4 !== T$1 && (T$1 = 2);
          null === tk ? (tk = [f2]) : tk.push(f2);
          f2 = g2;
          do {
            switch (f2.tag) {
              case 3:
                f2.flags |= 65536;
                b2 &= -b2;
                f2.lanes |= b2;
                var x2 = Oi(f2, k2, b2);
                fh(f2, x2);
                break a;
              case 1:
                h2 = k2;
                var w2 = f2.type,
                  u2 = f2.stateNode;
                if (
                  0 === (f2.flags & 128) &&
                  ("function" === typeof w2.getDerivedStateFromError ||
                    (null !== u2 &&
                      "function" === typeof u2.componentDidCatch &&
                      (null === Si || !Si.has(u2))))
                ) {
                  f2.flags |= 65536;
                  b2 &= -b2;
                  f2.lanes |= b2;
                  var F2 = Ri(f2, h2, b2);
                  fh(f2, F2);
                  break a;
                }
            }
            f2 = f2.return;
          } while (null !== f2);
        }
        Tk(c2);
      } catch (na) {
        b2 = na;
        Y$1 === c2 && null !== c2 && (Y$1 = c2 = c2.return);
        continue;
      }
      break;
    } while (1);
  }
  function Kk() {
    var a2 = nk.current;
    nk.current = ai;
    return null === a2 ? ai : a2;
  }
  function uj() {
    if (0 === T$1 || 3 === T$1 || 2 === T$1) T$1 = 4;
    null === R$1 ||
      (0 === (hh & 268435455) && 0 === (rk & 268435455)) ||
      Dk(R$1, Z$1);
  }
  function Jk(a2, b2) {
    var c2 = K$1;
    K$1 |= 2;
    var d2 = Kk();
    if (R$1 !== a2 || Z$1 !== b2) (vk = null), Lk(a2, b2);
    do
      try {
        Uk();
        break;
      } catch (e2) {
        Nk(a2, e2);
      }
    while (1);
    Qg();
    K$1 = c2;
    nk.current = d2;
    if (null !== Y$1) throw Error(p$1(261));
    R$1 = null;
    Z$1 = 0;
    return T$1;
  }
  function Uk() {
    for (; null !== Y$1; ) Vk(Y$1);
  }
  function Mk() {
    for (; null !== Y$1 && !cc(); ) Vk(Y$1);
  }
  function Vk(a2) {
    var b2 = Wk(a2.alternate, a2, gj);
    a2.memoizedProps = a2.pendingProps;
    null === b2 ? Tk(a2) : (Y$1 = b2);
    ok.current = null;
  }
  function Tk(a2) {
    var b2 = a2;
    do {
      var c2 = b2.alternate;
      a2 = b2.return;
      if (0 === (b2.flags & 32768)) {
        if (((c2 = Fj(c2, b2, gj)), null !== c2)) {
          Y$1 = c2;
          return;
        }
      } else {
        c2 = Jj(c2, b2);
        if (null !== c2) {
          c2.flags &= 32767;
          Y$1 = c2;
          return;
        }
        if (null !== a2)
          (a2.flags |= 32768), (a2.subtreeFlags = 0), (a2.deletions = null);
        else {
          T$1 = 6;
          Y$1 = null;
          return;
        }
      }
      b2 = b2.sibling;
      if (null !== b2) {
        Y$1 = b2;
        return;
      }
      Y$1 = b2 = a2;
    } while (null !== b2);
    0 === T$1 && (T$1 = 5);
  }
  function Qk(a2, b2, c2) {
    var d2 = C$1,
      e2 = pk.transition;
    try {
      (pk.transition = null), (C$1 = 1), Xk(a2, b2, c2, d2);
    } finally {
      (pk.transition = e2), (C$1 = d2);
    }
    return null;
  }
  function Xk(a2, b2, c2, d2) {
    do Ik();
    while (null !== xk);
    if (0 !== (K$1 & 6)) throw Error(p$1(327));
    c2 = a2.finishedWork;
    var e2 = a2.finishedLanes;
    if (null === c2) return null;
    a2.finishedWork = null;
    a2.finishedLanes = 0;
    if (c2 === a2.current) throw Error(p$1(177));
    a2.callbackNode = null;
    a2.callbackPriority = 0;
    var f2 = c2.lanes | c2.childLanes;
    Bc(a2, f2);
    a2 === R$1 && ((Y$1 = R$1 = null), (Z$1 = 0));
    (0 === (c2.subtreeFlags & 2064) && 0 === (c2.flags & 2064)) ||
      wk ||
      ((wk = true),
      Gk(hc, function () {
        Ik();
        return null;
      }));
    f2 = 0 !== (c2.flags & 15990);
    if (0 !== (c2.subtreeFlags & 15990) || f2) {
      f2 = pk.transition;
      pk.transition = null;
      var g2 = C$1;
      C$1 = 1;
      var h2 = K$1;
      K$1 |= 4;
      ok.current = null;
      Pj(a2, c2);
      ek(c2, a2);
      Oe(Df);
      dd = !!Cf;
      Df = Cf = null;
      a2.current = c2;
      ik(c2);
      dc();
      K$1 = h2;
      C$1 = g2;
      pk.transition = f2;
    } else a2.current = c2;
    wk && ((wk = false), (xk = a2), (yk = e2));
    f2 = a2.pendingLanes;
    0 === f2 && (Si = null);
    mc(c2.stateNode);
    Ek(a2, B$1());
    if (null !== b2)
      for (d2 = a2.onRecoverableError, c2 = 0; c2 < b2.length; c2++)
        (e2 = b2[c2]),
          d2(e2.value, { componentStack: e2.stack, digest: e2.digest });
    if (Pi) throw ((Pi = false), (a2 = Qi), (Qi = null), a2);
    0 !== (yk & 1) && 0 !== a2.tag && Ik();
    f2 = a2.pendingLanes;
    0 !== (f2 & 1) ? (a2 === Ak ? zk++ : ((zk = 0), (Ak = a2))) : (zk = 0);
    jg();
    return null;
  }
  function Ik() {
    if (null !== xk) {
      var a2 = Dc(yk),
        b2 = pk.transition,
        c2 = C$1;
      try {
        pk.transition = null;
        C$1 = 16 > a2 ? 16 : a2;
        if (null === xk) var d2 = false;
        else {
          a2 = xk;
          xk = null;
          yk = 0;
          if (0 !== (K$1 & 6)) throw Error(p$1(331));
          var e2 = K$1;
          K$1 |= 4;
          for (V$1 = a2.current; null !== V$1; ) {
            var f2 = V$1,
              g2 = f2.child;
            if (0 !== (V$1.flags & 16)) {
              var h2 = f2.deletions;
              if (null !== h2) {
                for (var k2 = 0; k2 < h2.length; k2++) {
                  var l2 = h2[k2];
                  for (V$1 = l2; null !== V$1; ) {
                    var m2 = V$1;
                    switch (m2.tag) {
                      case 0:
                      case 11:
                      case 15:
                        Qj(8, m2, f2);
                    }
                    var q2 = m2.child;
                    if (null !== q2) (q2.return = m2), (V$1 = q2);
                    else
                      for (; null !== V$1; ) {
                        m2 = V$1;
                        var r2 = m2.sibling,
                          y2 = m2.return;
                        Tj(m2);
                        if (m2 === l2) {
                          V$1 = null;
                          break;
                        }
                        if (null !== r2) {
                          r2.return = y2;
                          V$1 = r2;
                          break;
                        }
                        V$1 = y2;
                      }
                  }
                }
                var n2 = f2.alternate;
                if (null !== n2) {
                  var t2 = n2.child;
                  if (null !== t2) {
                    n2.child = null;
                    do {
                      var J2 = t2.sibling;
                      t2.sibling = null;
                      t2 = J2;
                    } while (null !== t2);
                  }
                }
                V$1 = f2;
              }
            }
            if (0 !== (f2.subtreeFlags & 2064) && null !== g2)
              (g2.return = f2), (V$1 = g2);
            else
              b: for (; null !== V$1; ) {
                f2 = V$1;
                if (0 !== (f2.flags & 2048))
                  switch (f2.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Qj(9, f2, f2.return);
                  }
                var x2 = f2.sibling;
                if (null !== x2) {
                  x2.return = f2.return;
                  V$1 = x2;
                  break b;
                }
                V$1 = f2.return;
              }
          }
          var w2 = a2.current;
          for (V$1 = w2; null !== V$1; ) {
            g2 = V$1;
            var u2 = g2.child;
            if (0 !== (g2.subtreeFlags & 2064) && null !== u2)
              (u2.return = g2), (V$1 = u2);
            else
              b: for (g2 = w2; null !== V$1; ) {
                h2 = V$1;
                if (0 !== (h2.flags & 2048))
                  try {
                    switch (h2.tag) {
                      case 0:
                      case 11:
                      case 15:
                        Rj(9, h2);
                    }
                  } catch (na) {
                    W$1(h2, h2.return, na);
                  }
                if (h2 === g2) {
                  V$1 = null;
                  break b;
                }
                var F2 = h2.sibling;
                if (null !== F2) {
                  F2.return = h2.return;
                  V$1 = F2;
                  break b;
                }
                V$1 = h2.return;
              }
          }
          K$1 = e2;
          jg();
          if (lc && "function" === typeof lc.onPostCommitFiberRoot)
            try {
              lc.onPostCommitFiberRoot(kc, a2);
            } catch (na) {}
          d2 = true;
        }
        return d2;
      } finally {
        (C$1 = c2), (pk.transition = b2);
      }
    }
    return false;
  }
  function Yk(a2, b2, c2) {
    b2 = Ki(c2, b2);
    b2 = Oi(a2, b2, 1);
    a2 = dh(a2, b2, 1);
    b2 = L$1();
    null !== a2 && (Ac(a2, 1, b2), Ek(a2, b2));
  }
  function W$1(a2, b2, c2) {
    if (3 === a2.tag) Yk(a2, a2, c2);
    else
      for (; null !== b2; ) {
        if (3 === b2.tag) {
          Yk(b2, a2, c2);
          break;
        } else if (1 === b2.tag) {
          var d2 = b2.stateNode;
          if (
            "function" === typeof b2.type.getDerivedStateFromError ||
            ("function" === typeof d2.componentDidCatch &&
              (null === Si || !Si.has(d2)))
          ) {
            a2 = Ki(c2, a2);
            a2 = Ri(b2, a2, 1);
            b2 = dh(b2, a2, 1);
            a2 = L$1();
            null !== b2 && (Ac(b2, 1, a2), Ek(b2, a2));
            break;
          }
        }
        b2 = b2.return;
      }
  }
  function Ui(a2, b2, c2) {
    var d2 = a2.pingCache;
    null !== d2 && d2.delete(b2);
    b2 = L$1();
    a2.pingedLanes |= a2.suspendedLanes & c2;
    R$1 === a2 &&
      (Z$1 & c2) === c2 &&
      (4 === T$1 || (3 === T$1 && (Z$1 & 130023424) === Z$1 && 500 > B$1() - gk)
        ? Lk(a2, 0)
        : (sk |= c2));
    Ek(a2, b2);
  }
  function Zk(a2, b2) {
    0 === b2 &&
      (0 === (a2.mode & 1)
        ? (b2 = 1)
        : ((b2 = sc), (sc <<= 1), 0 === (sc & 130023424) && (sc = 4194304)));
    var c2 = L$1();
    a2 = Zg(a2, b2);
    null !== a2 && (Ac(a2, b2, c2), Ek(a2, c2));
  }
  function vj(a2) {
    var b2 = a2.memoizedState,
      c2 = 0;
    null !== b2 && (c2 = b2.retryLane);
    Zk(a2, c2);
  }
  function ck(a2, b2) {
    var c2 = 0;
    switch (a2.tag) {
      case 13:
        var d2 = a2.stateNode;
        var e2 = a2.memoizedState;
        null !== e2 && (c2 = e2.retryLane);
        break;
      case 19:
        d2 = a2.stateNode;
        break;
      default:
        throw Error(p$1(314));
    }
    null !== d2 && d2.delete(b2);
    Zk(a2, c2);
  }
  var Wk;
  Wk = function (a2, b2, c2) {
    if (null !== a2)
      if (a2.memoizedProps !== b2.pendingProps || Wf.current) Ug = true;
      else {
        if (0 === (a2.lanes & c2) && 0 === (b2.flags & 128))
          return (Ug = false), zj(a2, b2, c2);
        Ug = 0 !== (a2.flags & 131072) ? true : false;
      }
    else
      (Ug = false), I$1 && 0 !== (b2.flags & 1048576) && ug(b2, ng, b2.index);
    b2.lanes = 0;
    switch (b2.tag) {
      case 2:
        var d2 = b2.type;
        jj(a2, b2);
        a2 = b2.pendingProps;
        var e2 = Yf(b2, H$1.current);
        Tg(b2, c2);
        e2 = Xh(null, b2, d2, a2, e2, c2);
        var f2 = bi();
        b2.flags |= 1;
        "object" === typeof e2 &&
        null !== e2 &&
        "function" === typeof e2.render &&
        void 0 === e2.$$typeof
          ? ((b2.tag = 1),
            (b2.memoizedState = null),
            (b2.updateQueue = null),
            Zf(d2) ? ((f2 = true), cg(b2)) : (f2 = false),
            (b2.memoizedState =
              null !== e2.state && void 0 !== e2.state ? e2.state : null),
            ah(b2),
            (e2.updater = nh),
            (b2.stateNode = e2),
            (e2._reactInternals = b2),
            rh(b2, d2, a2, c2),
            (b2 = kj(null, b2, d2, true, f2, c2)))
          : ((b2.tag = 0),
            I$1 && f2 && vg(b2),
            Yi(null, b2, e2, c2),
            (b2 = b2.child));
        return b2;
      case 16:
        d2 = b2.elementType;
        a: {
          jj(a2, b2);
          a2 = b2.pendingProps;
          e2 = d2._init;
          d2 = e2(d2._payload);
          b2.type = d2;
          e2 = b2.tag = $k(d2);
          a2 = Lg(d2, a2);
          switch (e2) {
            case 0:
              b2 = dj(null, b2, d2, a2, c2);
              break a;
            case 1:
              b2 = ij(null, b2, d2, a2, c2);
              break a;
            case 11:
              b2 = Zi(null, b2, d2, a2, c2);
              break a;
            case 14:
              b2 = aj(null, b2, d2, Lg(d2.type, a2), c2);
              break a;
          }
          throw Error(p$1(306, d2, ""));
        }
        return b2;
      case 0:
        return (
          (d2 = b2.type),
          (e2 = b2.pendingProps),
          (e2 = b2.elementType === d2 ? e2 : Lg(d2, e2)),
          dj(a2, b2, d2, e2, c2)
        );
      case 1:
        return (
          (d2 = b2.type),
          (e2 = b2.pendingProps),
          (e2 = b2.elementType === d2 ? e2 : Lg(d2, e2)),
          ij(a2, b2, d2, e2, c2)
        );
      case 3:
        a: {
          lj(b2);
          if (null === a2) throw Error(p$1(387));
          d2 = b2.pendingProps;
          f2 = b2.memoizedState;
          e2 = f2.element;
          bh(a2, b2);
          gh(b2, d2, null, c2);
          var g2 = b2.memoizedState;
          d2 = g2.element;
          if (f2.isDehydrated)
            if (
              ((f2 = {
                element: d2,
                isDehydrated: false,
                cache: g2.cache,
                pendingSuspenseBoundaries: g2.pendingSuspenseBoundaries,
                transitions: g2.transitions,
              }),
              (b2.updateQueue.baseState = f2),
              (b2.memoizedState = f2),
              b2.flags & 256)
            ) {
              e2 = Ki(Error(p$1(423)), b2);
              b2 = mj(a2, b2, d2, c2, e2);
              break a;
            } else if (d2 !== e2) {
              e2 = Ki(Error(p$1(424)), b2);
              b2 = mj(a2, b2, d2, c2, e2);
              break a;
            } else
              for (
                yg = Lf(b2.stateNode.containerInfo.firstChild),
                  xg = b2,
                  I$1 = true,
                  zg = null,
                  c2 = Ch(b2, null, d2, c2),
                  b2.child = c2;
                c2;

              )
                (c2.flags = (c2.flags & -3) | 4096), (c2 = c2.sibling);
          else {
            Ig();
            if (d2 === e2) {
              b2 = $i(a2, b2, c2);
              break a;
            }
            Yi(a2, b2, d2, c2);
          }
          b2 = b2.child;
        }
        return b2;
      case 5:
        return (
          Kh(b2),
          null === a2 && Eg(b2),
          (d2 = b2.type),
          (e2 = b2.pendingProps),
          (f2 = null !== a2 ? a2.memoizedProps : null),
          (g2 = e2.children),
          Ef(d2, e2)
            ? (g2 = null)
            : null !== f2 && Ef(d2, f2) && (b2.flags |= 32),
          hj(a2, b2),
          Yi(a2, b2, g2, c2),
          b2.child
        );
      case 6:
        return null === a2 && Eg(b2), null;
      case 13:
        return pj(a2, b2, c2);
      case 4:
        return (
          Ih(b2, b2.stateNode.containerInfo),
          (d2 = b2.pendingProps),
          null === a2 ? (b2.child = Bh(b2, null, d2, c2)) : Yi(a2, b2, d2, c2),
          b2.child
        );
      case 11:
        return (
          (d2 = b2.type),
          (e2 = b2.pendingProps),
          (e2 = b2.elementType === d2 ? e2 : Lg(d2, e2)),
          Zi(a2, b2, d2, e2, c2)
        );
      case 7:
        return Yi(a2, b2, b2.pendingProps, c2), b2.child;
      case 8:
        return Yi(a2, b2, b2.pendingProps.children, c2), b2.child;
      case 12:
        return Yi(a2, b2, b2.pendingProps.children, c2), b2.child;
      case 10:
        a: {
          d2 = b2.type._context;
          e2 = b2.pendingProps;
          f2 = b2.memoizedProps;
          g2 = e2.value;
          G$1(Mg, d2._currentValue);
          d2._currentValue = g2;
          if (null !== f2)
            if (He(f2.value, g2)) {
              if (f2.children === e2.children && !Wf.current) {
                b2 = $i(a2, b2, c2);
                break a;
              }
            } else
              for (
                f2 = b2.child, null !== f2 && (f2.return = b2);
                null !== f2;

              ) {
                var h2 = f2.dependencies;
                if (null !== h2) {
                  g2 = f2.child;
                  for (var k2 = h2.firstContext; null !== k2; ) {
                    if (k2.context === d2) {
                      if (1 === f2.tag) {
                        k2 = ch(-1, c2 & -c2);
                        k2.tag = 2;
                        var l2 = f2.updateQueue;
                        if (null !== l2) {
                          l2 = l2.shared;
                          var m2 = l2.pending;
                          null === m2
                            ? (k2.next = k2)
                            : ((k2.next = m2.next), (m2.next = k2));
                          l2.pending = k2;
                        }
                      }
                      f2.lanes |= c2;
                      k2 = f2.alternate;
                      null !== k2 && (k2.lanes |= c2);
                      Sg(f2.return, c2, b2);
                      h2.lanes |= c2;
                      break;
                    }
                    k2 = k2.next;
                  }
                } else if (10 === f2.tag)
                  g2 = f2.type === b2.type ? null : f2.child;
                else if (18 === f2.tag) {
                  g2 = f2.return;
                  if (null === g2) throw Error(p$1(341));
                  g2.lanes |= c2;
                  h2 = g2.alternate;
                  null !== h2 && (h2.lanes |= c2);
                  Sg(g2, c2, b2);
                  g2 = f2.sibling;
                } else g2 = f2.child;
                if (null !== g2) g2.return = f2;
                else
                  for (g2 = f2; null !== g2; ) {
                    if (g2 === b2) {
                      g2 = null;
                      break;
                    }
                    f2 = g2.sibling;
                    if (null !== f2) {
                      f2.return = g2.return;
                      g2 = f2;
                      break;
                    }
                    g2 = g2.return;
                  }
                f2 = g2;
              }
          Yi(a2, b2, e2.children, c2);
          b2 = b2.child;
        }
        return b2;
      case 9:
        return (
          (e2 = b2.type),
          (d2 = b2.pendingProps.children),
          Tg(b2, c2),
          (e2 = Vg(e2)),
          (d2 = d2(e2)),
          (b2.flags |= 1),
          Yi(a2, b2, d2, c2),
          b2.child
        );
      case 14:
        return (
          (d2 = b2.type),
          (e2 = Lg(d2, b2.pendingProps)),
          (e2 = Lg(d2.type, e2)),
          aj(a2, b2, d2, e2, c2)
        );
      case 15:
        return cj(a2, b2, b2.type, b2.pendingProps, c2);
      case 17:
        return (
          (d2 = b2.type),
          (e2 = b2.pendingProps),
          (e2 = b2.elementType === d2 ? e2 : Lg(d2, e2)),
          jj(a2, b2),
          (b2.tag = 1),
          Zf(d2) ? ((a2 = true), cg(b2)) : (a2 = false),
          Tg(b2, c2),
          ph(b2, d2, e2),
          rh(b2, d2, e2, c2),
          kj(null, b2, d2, true, a2, c2)
        );
      case 19:
        return yj(a2, b2, c2);
      case 22:
        return ej(a2, b2, c2);
    }
    throw Error(p$1(156, b2.tag));
  };
  function Gk(a2, b2) {
    return ac(a2, b2);
  }
  function al(a2, b2, c2, d2) {
    this.tag = a2;
    this.key = c2;
    this.sibling =
      this.child =
      this.return =
      this.stateNode =
      this.type =
      this.elementType =
        null;
    this.index = 0;
    this.ref = null;
    this.pendingProps = b2;
    this.dependencies =
      this.memoizedState =
      this.updateQueue =
      this.memoizedProps =
        null;
    this.mode = d2;
    this.subtreeFlags = this.flags = 0;
    this.deletions = null;
    this.childLanes = this.lanes = 0;
    this.alternate = null;
  }
  function Bg(a2, b2, c2, d2) {
    return new al(a2, b2, c2, d2);
  }
  function bj(a2) {
    a2 = a2.prototype;
    return !(!a2 || !a2.isReactComponent);
  }
  function $k(a2) {
    if ("function" === typeof a2) return bj(a2) ? 1 : 0;
    if (void 0 !== a2 && null !== a2) {
      a2 = a2.$$typeof;
      if (a2 === Da) return 11;
      if (a2 === Ga) return 14;
    }
    return 2;
  }
  function wh(a2, b2) {
    var c2 = a2.alternate;
    null === c2
      ? ((c2 = Bg(a2.tag, b2, a2.key, a2.mode)),
        (c2.elementType = a2.elementType),
        (c2.type = a2.type),
        (c2.stateNode = a2.stateNode),
        (c2.alternate = a2),
        (a2.alternate = c2))
      : ((c2.pendingProps = b2),
        (c2.type = a2.type),
        (c2.flags = 0),
        (c2.subtreeFlags = 0),
        (c2.deletions = null));
    c2.flags = a2.flags & 14680064;
    c2.childLanes = a2.childLanes;
    c2.lanes = a2.lanes;
    c2.child = a2.child;
    c2.memoizedProps = a2.memoizedProps;
    c2.memoizedState = a2.memoizedState;
    c2.updateQueue = a2.updateQueue;
    b2 = a2.dependencies;
    c2.dependencies =
      null === b2 ? null : { lanes: b2.lanes, firstContext: b2.firstContext };
    c2.sibling = a2.sibling;
    c2.index = a2.index;
    c2.ref = a2.ref;
    return c2;
  }
  function yh(a2, b2, c2, d2, e2, f2) {
    var g2 = 2;
    d2 = a2;
    if ("function" === typeof a2) bj(a2) && (g2 = 1);
    else if ("string" === typeof a2) g2 = 5;
    else
      a: switch (a2) {
        case ya:
          return Ah(c2.children, e2, f2, b2);
        case za:
          g2 = 8;
          e2 |= 8;
          break;
        case Aa:
          return (
            (a2 = Bg(12, c2, b2, e2 | 2)),
            (a2.elementType = Aa),
            (a2.lanes = f2),
            a2
          );
        case Ea:
          return (
            (a2 = Bg(13, c2, b2, e2)),
            (a2.elementType = Ea),
            (a2.lanes = f2),
            a2
          );
        case Fa:
          return (
            (a2 = Bg(19, c2, b2, e2)),
            (a2.elementType = Fa),
            (a2.lanes = f2),
            a2
          );
        case Ia:
          return qj(c2, e2, f2, b2);
        default:
          if ("object" === typeof a2 && null !== a2)
            switch (a2.$$typeof) {
              case Ba:
                g2 = 10;
                break a;
              case Ca:
                g2 = 9;
                break a;
              case Da:
                g2 = 11;
                break a;
              case Ga:
                g2 = 14;
                break a;
              case Ha:
                g2 = 16;
                d2 = null;
                break a;
            }
          throw Error(p$1(130, null == a2 ? a2 : typeof a2, ""));
      }
    b2 = Bg(g2, c2, b2, e2);
    b2.elementType = a2;
    b2.type = d2;
    b2.lanes = f2;
    return b2;
  }
  function Ah(a2, b2, c2, d2) {
    a2 = Bg(7, a2, d2, b2);
    a2.lanes = c2;
    return a2;
  }
  function qj(a2, b2, c2, d2) {
    a2 = Bg(22, a2, d2, b2);
    a2.elementType = Ia;
    a2.lanes = c2;
    a2.stateNode = { isHidden: false };
    return a2;
  }
  function xh(a2, b2, c2) {
    a2 = Bg(6, a2, null, b2);
    a2.lanes = c2;
    return a2;
  }
  function zh(a2, b2, c2) {
    b2 = Bg(4, null !== a2.children ? a2.children : [], a2.key, b2);
    b2.lanes = c2;
    b2.stateNode = {
      containerInfo: a2.containerInfo,
      pendingChildren: null,
      implementation: a2.implementation,
    };
    return b2;
  }
  function bl(a2, b2, c2, d2, e2) {
    this.tag = b2;
    this.containerInfo = a2;
    this.finishedWork =
      this.pingCache =
      this.current =
      this.pendingChildren =
        null;
    this.timeoutHandle = -1;
    this.callbackNode = this.pendingContext = this.context = null;
    this.callbackPriority = 0;
    this.eventTimes = zc(0);
    this.expirationTimes = zc(-1);
    this.entangledLanes =
      this.finishedLanes =
      this.mutableReadLanes =
      this.expiredLanes =
      this.pingedLanes =
      this.suspendedLanes =
      this.pendingLanes =
        0;
    this.entanglements = zc(0);
    this.identifierPrefix = d2;
    this.onRecoverableError = e2;
    this.mutableSourceEagerHydrationData = null;
  }
  function cl(a2, b2, c2, d2, e2, f2, g2, h2, k2) {
    a2 = new bl(a2, b2, c2, h2, k2);
    1 === b2 ? ((b2 = 1), true === f2 && (b2 |= 8)) : (b2 = 0);
    f2 = Bg(3, null, null, b2);
    a2.current = f2;
    f2.stateNode = a2;
    f2.memoizedState = {
      element: d2,
      isDehydrated: c2,
      cache: null,
      transitions: null,
      pendingSuspenseBoundaries: null,
    };
    ah(f2);
    return a2;
  }
  function dl(a2, b2, c2) {
    var d2 =
      3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
    return {
      $$typeof: wa,
      key: null == d2 ? null : "" + d2,
      children: a2,
      containerInfo: b2,
      implementation: c2,
    };
  }
  function el(a2) {
    if (!a2) return Vf;
    a2 = a2._reactInternals;
    a: {
      if (Vb(a2) !== a2 || 1 !== a2.tag) throw Error(p$1(170));
      var b2 = a2;
      do {
        switch (b2.tag) {
          case 3:
            b2 = b2.stateNode.context;
            break a;
          case 1:
            if (Zf(b2.type)) {
              b2 = b2.stateNode.__reactInternalMemoizedMergedChildContext;
              break a;
            }
        }
        b2 = b2.return;
      } while (null !== b2);
      throw Error(p$1(171));
    }
    if (1 === a2.tag) {
      var c2 = a2.type;
      if (Zf(c2)) return bg(a2, c2, b2);
    }
    return b2;
  }
  function fl(a2, b2, c2, d2, e2, f2, g2, h2, k2) {
    a2 = cl(c2, d2, true, a2, e2, f2, g2, h2, k2);
    a2.context = el(null);
    c2 = a2.current;
    d2 = L$1();
    e2 = lh(c2);
    f2 = ch(d2, e2);
    f2.callback = void 0 !== b2 && null !== b2 ? b2 : null;
    dh(c2, f2, e2);
    a2.current.lanes = e2;
    Ac(a2, e2, d2);
    Ek(a2, d2);
    return a2;
  }
  function gl(a2, b2, c2, d2) {
    var e2 = b2.current,
      f2 = L$1(),
      g2 = lh(e2);
    c2 = el(c2);
    null === b2.context ? (b2.context = c2) : (b2.pendingContext = c2);
    b2 = ch(f2, g2);
    b2.payload = { element: a2 };
    d2 = void 0 === d2 ? null : d2;
    null !== d2 && (b2.callback = d2);
    a2 = dh(e2, b2, g2);
    null !== a2 && (mh(a2, e2, g2, f2), eh(a2, e2, g2));
    return g2;
  }
  function hl(a2) {
    a2 = a2.current;
    if (!a2.child) return null;
    switch (a2.child.tag) {
      case 5:
        return a2.child.stateNode;
      default:
        return a2.child.stateNode;
    }
  }
  function il(a2, b2) {
    a2 = a2.memoizedState;
    if (null !== a2 && null !== a2.dehydrated) {
      var c2 = a2.retryLane;
      a2.retryLane = 0 !== c2 && c2 < b2 ? c2 : b2;
    }
  }
  function jl(a2, b2) {
    il(a2, b2);
    (a2 = a2.alternate) && il(a2, b2);
  }
  function kl() {
    return null;
  }
  var ll =
    "function" === typeof reportError
      ? reportError
      : function (a2) {
          console.error(a2);
        };
  function ml(a2) {
    this._internalRoot = a2;
  }
  nl.prototype.render = ml.prototype.render = function (a2) {
    var b2 = this._internalRoot;
    if (null === b2) throw Error(p$1(409));
    gl(a2, b2, null, null);
  };
  nl.prototype.unmount = ml.prototype.unmount = function () {
    var a2 = this._internalRoot;
    if (null !== a2) {
      this._internalRoot = null;
      var b2 = a2.containerInfo;
      Sk(function () {
        gl(null, a2, null, null);
      });
      b2[uf] = null;
    }
  };
  function nl(a2) {
    this._internalRoot = a2;
  }
  nl.prototype.unstable_scheduleHydration = function (a2) {
    if (a2) {
      var b2 = Hc();
      a2 = { blockedOn: null, target: a2, priority: b2 };
      for (
        var c2 = 0;
        c2 < Qc.length && 0 !== b2 && b2 < Qc[c2].priority;
        c2++
      );
      Qc.splice(c2, 0, a2);
      0 === c2 && Vc(a2);
    }
  };
  function ol(a2) {
    return !(
      !a2 ||
      (1 !== a2.nodeType && 9 !== a2.nodeType && 11 !== a2.nodeType)
    );
  }
  function pl(a2) {
    return !(
      !a2 ||
      (1 !== a2.nodeType &&
        9 !== a2.nodeType &&
        11 !== a2.nodeType &&
        (8 !== a2.nodeType || " react-mount-point-unstable " !== a2.nodeValue))
    );
  }
  function ql() {}
  function rl(a2, b2, c2, d2, e2) {
    if (e2) {
      if ("function" === typeof d2) {
        var f2 = d2;
        d2 = function () {
          var a3 = hl(g2);
          f2.call(a3);
        };
      }
      var g2 = fl(b2, d2, a2, 0, null, false, false, "", ql);
      a2._reactRootContainer = g2;
      a2[uf] = g2.current;
      sf(8 === a2.nodeType ? a2.parentNode : a2);
      Sk();
      return g2;
    }
    for (; (e2 = a2.lastChild); ) a2.removeChild(e2);
    if ("function" === typeof d2) {
      var h2 = d2;
      d2 = function () {
        var a3 = hl(k2);
        h2.call(a3);
      };
    }
    var k2 = cl(a2, 0, false, null, null, false, false, "", ql);
    a2._reactRootContainer = k2;
    a2[uf] = k2.current;
    sf(8 === a2.nodeType ? a2.parentNode : a2);
    Sk(function () {
      gl(b2, k2, c2, d2);
    });
    return k2;
  }
  function sl(a2, b2, c2, d2, e2) {
    var f2 = c2._reactRootContainer;
    if (f2) {
      var g2 = f2;
      if ("function" === typeof e2) {
        var h2 = e2;
        e2 = function () {
          var a3 = hl(g2);
          h2.call(a3);
        };
      }
      gl(b2, g2, a2, e2);
    } else g2 = rl(c2, b2, a2, e2, d2);
    return hl(g2);
  }
  Ec = function (a2) {
    switch (a2.tag) {
      case 3:
        var b2 = a2.stateNode;
        if (b2.current.memoizedState.isDehydrated) {
          var c2 = tc(b2.pendingLanes);
          0 !== c2 &&
            (Cc(b2, c2 | 1),
            Ek(b2, B$1()),
            0 === (K$1 & 6) && ((Hj = B$1() + 500), jg()));
        }
        break;
      case 13:
        Sk(function () {
          var b3 = Zg(a2, 1);
          if (null !== b3) {
            var c3 = L$1();
            mh(b3, a2, 1, c3);
          }
        }),
          jl(a2, 1);
    }
  };
  Fc = function (a2) {
    if (13 === a2.tag) {
      var b2 = Zg(a2, 134217728);
      if (null !== b2) {
        var c2 = L$1();
        mh(b2, a2, 134217728, c2);
      }
      jl(a2, 134217728);
    }
  };
  Gc = function (a2) {
    if (13 === a2.tag) {
      var b2 = lh(a2),
        c2 = Zg(a2, b2);
      if (null !== c2) {
        var d2 = L$1();
        mh(c2, a2, b2, d2);
      }
      jl(a2, b2);
    }
  };
  Hc = function () {
    return C$1;
  };
  Ic = function (a2, b2) {
    var c2 = C$1;
    try {
      return (C$1 = a2), b2();
    } finally {
      C$1 = c2;
    }
  };
  yb = function (a2, b2, c2) {
    switch (b2) {
      case "input":
        bb(a2, c2);
        b2 = c2.name;
        if ("radio" === c2.type && null != b2) {
          for (c2 = a2; c2.parentNode; ) c2 = c2.parentNode;
          c2 = c2.querySelectorAll(
            "input[name=" + JSON.stringify("" + b2) + '][type="radio"]'
          );
          for (b2 = 0; b2 < c2.length; b2++) {
            var d2 = c2[b2];
            if (d2 !== a2 && d2.form === a2.form) {
              var e2 = Db(d2);
              if (!e2) throw Error(p$1(90));
              Wa(d2);
              bb(d2, e2);
            }
          }
        }
        break;
      case "textarea":
        ib(a2, c2);
        break;
      case "select":
        (b2 = c2.value), null != b2 && fb(a2, !!c2.multiple, b2, false);
    }
  };
  Gb = Rk;
  Hb = Sk;
  var tl = { usingClientEntryPoint: false, Events: [Cb, ue, Db, Eb, Fb, Rk] },
    ul = {
      findFiberByHostInstance: Wc,
      bundleType: 0,
      version: "18.2.0",
      rendererPackageName: "react-dom",
    };
  var vl = {
    bundleType: ul.bundleType,
    version: ul.version,
    rendererPackageName: ul.rendererPackageName,
    rendererConfig: ul.rendererConfig,
    overrideHookState: null,
    overrideHookStateDeletePath: null,
    overrideHookStateRenamePath: null,
    overrideProps: null,
    overridePropsDeletePath: null,
    overridePropsRenamePath: null,
    setErrorHandler: null,
    setSuspenseHandler: null,
    scheduleUpdate: null,
    currentDispatcherRef: ua.ReactCurrentDispatcher,
    findHostInstanceByFiber: function (a2) {
      a2 = Zb(a2);
      return null === a2 ? null : a2.stateNode;
    },
    findFiberByHostInstance: ul.findFiberByHostInstance || kl,
    findHostInstancesForRefresh: null,
    scheduleRefresh: null,
    scheduleRoot: null,
    setRefreshHandler: null,
    getCurrentFiber: null,
    reconcilerVersion: "18.2.0-next-9e3b772b8-20220608",
  };
  if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
    var wl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!wl.isDisabled && wl.supportsFiber)
      try {
        (kc = wl.inject(vl)), (lc = wl);
      } catch (a2) {}
  }
  reactDom_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED =
    tl;
  reactDom_production_min.createPortal = function (a2, b2) {
    var c2 =
      2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
    if (!ol(b2)) throw Error(p$1(200));
    return dl(a2, b2, null, c2);
  };
  reactDom_production_min.createRoot = function (a2, b2) {
    if (!ol(a2)) throw Error(p$1(299));
    var c2 = false,
      d2 = "",
      e2 = ll;
    null !== b2 &&
      void 0 !== b2 &&
      (true === b2.unstable_strictMode && (c2 = true),
      void 0 !== b2.identifierPrefix && (d2 = b2.identifierPrefix),
      void 0 !== b2.onRecoverableError && (e2 = b2.onRecoverableError));
    b2 = cl(a2, 1, false, null, null, c2, false, d2, e2);
    a2[uf] = b2.current;
    sf(8 === a2.nodeType ? a2.parentNode : a2);
    return new ml(b2);
  };
  reactDom_production_min.findDOMNode = function (a2) {
    if (null == a2) return null;
    if (1 === a2.nodeType) return a2;
    var b2 = a2._reactInternals;
    if (void 0 === b2) {
      if ("function" === typeof a2.render) throw Error(p$1(188));
      a2 = Object.keys(a2).join(",");
      throw Error(p$1(268, a2));
    }
    a2 = Zb(b2);
    a2 = null === a2 ? null : a2.stateNode;
    return a2;
  };
  reactDom_production_min.flushSync = function (a2) {
    return Sk(a2);
  };
  reactDom_production_min.hydrate = function (a2, b2, c2) {
    if (!pl(b2)) throw Error(p$1(200));
    return sl(null, a2, b2, true, c2);
  };
  reactDom_production_min.hydrateRoot = function (a2, b2, c2) {
    if (!ol(a2)) throw Error(p$1(405));
    var d2 = (null != c2 && c2.hydratedSources) || null,
      e2 = false,
      f2 = "",
      g2 = ll;
    null !== c2 &&
      void 0 !== c2 &&
      (true === c2.unstable_strictMode && (e2 = true),
      void 0 !== c2.identifierPrefix && (f2 = c2.identifierPrefix),
      void 0 !== c2.onRecoverableError && (g2 = c2.onRecoverableError));
    b2 = fl(b2, null, a2, 1, null != c2 ? c2 : null, e2, false, f2, g2);
    a2[uf] = b2.current;
    sf(a2);
    if (d2)
      for (a2 = 0; a2 < d2.length; a2++)
        (c2 = d2[a2]),
          (e2 = c2._getVersion),
          (e2 = e2(c2._source)),
          null == b2.mutableSourceEagerHydrationData
            ? (b2.mutableSourceEagerHydrationData = [c2, e2])
            : b2.mutableSourceEagerHydrationData.push(c2, e2);
    return new nl(b2);
  };
  reactDom_production_min.render = function (a2, b2, c2) {
    if (!pl(b2)) throw Error(p$1(200));
    return sl(null, a2, b2, false, c2);
  };
  reactDom_production_min.unmountComponentAtNode = function (a2) {
    if (!pl(a2)) throw Error(p$1(40));
    return a2._reactRootContainer
      ? (Sk(function () {
          sl(null, null, a2, false, function () {
            a2._reactRootContainer = null;
            a2[uf] = null;
          });
        }),
        true)
      : false;
  };
  reactDom_production_min.unstable_batchedUpdates = Rk;
  reactDom_production_min.unstable_renderSubtreeIntoContainer = function (
    a2,
    b2,
    c2,
    d2
  ) {
    if (!pl(c2)) throw Error(p$1(200));
    if (null == a2 || void 0 === a2._reactInternals) throw Error(p$1(38));
    return sl(a2, b2, c2, false, d2);
  };
  reactDom_production_min.version = "18.2.0-next-9e3b772b8-20220608";
  function checkDCE() {
    if (
      typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" ||
      typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function"
    ) {
      return;
    }
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
    } catch (err) {
      console.error(err);
    }
  }
  {
    checkDCE();
    reactDom.exports = reactDom_production_min;
  }
  var reactDomExports = reactDom.exports;
  var m$1 = reactDomExports;
  {
    client.createRoot = m$1.createRoot;
    client.hydrateRoot = m$1.hydrateRoot;
  }
  const GlobalContext = reactExports.createContext({});
  const GlobalContextProvider = ({ children }) => {
    const [initialized, setInitialized] = reactExports.useState(false);
    const init = async () => {
      var _a2, _b2;
      try {
        if (
          !((_b2 = (_a2 = window.Engine) == null ? void 0 : _a2.interface) ==
          null
            ? void 0
            : _b2.getAlreadyInitialised())
        ) {
          setTimeout(init, 500);
          return;
        }
        setInitialized(true);
      } catch (error) {
        console.error(error);
        setTimeout(init, 500);
      }
    };
    reactExports.useEffect(() => {
      init();
    }, []);
    const value = {
      initialized,
    };
    return /* @__PURE__ */ jsxRuntimeExports.jsx(GlobalContext.Provider, {
      value,
      children,
    });
  };
  const useGlobalContext = () => {
    const context = reactExports.useContext(GlobalContext);
    if (!context) {
      throw new Error(
        "useGlobalContext must be used within a GlobalContextProvider"
      );
    }
    return context;
  };
  var extendStatics = function (d2, b2) {
    extendStatics =
      Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array &&
        function (d3, b3) {
          d3.__proto__ = b3;
        }) ||
      function (d3, b3) {
        for (var p2 in b3)
          if (Object.prototype.hasOwnProperty.call(b3, p2)) d3[p2] = b3[p2];
      };
    return extendStatics(d2, b2);
  };
  function __extends(d2, b2) {
    if (typeof b2 !== "function" && b2 !== null)
      throw new TypeError(
        "Class extends value " + String(b2) + " is not a constructor or null"
      );
    extendStatics(d2, b2);
    function __() {
      this.constructor = d2;
    }
    d2.prototype =
      b2 === null
        ? Object.create(b2)
        : ((__.prototype = b2.prototype), new __());
  }
  var __assign = function () {
    __assign =
      Object.assign ||
      function __assign2(t2) {
        for (var s2, i2 = 1, n2 = arguments.length; i2 < n2; i2++) {
          s2 = arguments[i2];
          for (var p2 in s2)
            if (Object.prototype.hasOwnProperty.call(s2, p2)) t2[p2] = s2[p2];
        }
        return t2;
      };
    return __assign.apply(this, arguments);
  };
  function __rest(s2, e2) {
    var t2 = {};
    for (var p2 in s2)
      if (Object.prototype.hasOwnProperty.call(s2, p2) && e2.indexOf(p2) < 0)
        t2[p2] = s2[p2];
    if (s2 != null && typeof Object.getOwnPropertySymbols === "function")
      for (
        var i2 = 0, p2 = Object.getOwnPropertySymbols(s2);
        i2 < p2.length;
        i2++
      ) {
        if (
          e2.indexOf(p2[i2]) < 0 &&
          Object.prototype.propertyIsEnumerable.call(s2, p2[i2])
        )
          t2[p2[i2]] = s2[p2[i2]];
      }
    return t2;
  }
  function __awaiter(thisArg, _arguments, P2, generator) {
    function adopt(value) {
      return value instanceof P2
        ? value
        : new P2(function (resolve) {
            resolve(value);
          });
    }
    return new (P2 || (P2 = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e2) {
          reject(e2);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e2) {
          reject(e2);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }
  function __generator(thisArg, body) {
    var _2 = {
        label: 0,
        sent: function () {
          if (t2[0] & 1) throw t2[1];
          return t2[1];
        },
        trys: [],
        ops: [],
      },
      f2,
      y2,
      t2,
      g2;
    return (
      (g2 = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === "function" &&
        (g2[Symbol.iterator] = function () {
          return this;
        }),
      g2
    );
    function verb(n2) {
      return function (v2) {
        return step([n2, v2]);
      };
    }
    function step(op) {
      if (f2) throw new TypeError("Generator is already executing.");
      while ((g2 && ((g2 = 0), op[0] && (_2 = 0)), _2))
        try {
          if (
            ((f2 = 1),
            y2 &&
              (t2 =
                op[0] & 2
                  ? y2["return"]
                  : op[0]
                  ? y2["throw"] || ((t2 = y2["return"]) && t2.call(y2), 0)
                  : y2.next) &&
              !(t2 = t2.call(y2, op[1])).done)
          )
            return t2;
          if (((y2 = 0), t2)) op = [op[0] & 2, t2.value];
          switch (op[0]) {
            case 0:
            case 1:
              t2 = op;
              break;
            case 4:
              _2.label++;
              return { value: op[1], done: false };
            case 5:
              _2.label++;
              y2 = op[1];
              op = [0];
              continue;
            case 7:
              op = _2.ops.pop();
              _2.trys.pop();
              continue;
            default:
              if (
                !((t2 = _2.trys), (t2 = t2.length > 0 && t2[t2.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _2 = 0;
                continue;
              }
              if (op[0] === 3 && (!t2 || (op[1] > t2[0] && op[1] < t2[3]))) {
                _2.label = op[1];
                break;
              }
              if (op[0] === 6 && _2.label < t2[1]) {
                _2.label = t2[1];
                t2 = op;
                break;
              }
              if (t2 && _2.label < t2[2]) {
                _2.label = t2[2];
                _2.ops.push(op);
                break;
              }
              if (t2[2]) _2.ops.pop();
              _2.trys.pop();
              continue;
          }
          op = body.call(thisArg, _2);
        } catch (e2) {
          op = [6, e2];
          y2 = 0;
        } finally {
          f2 = t2 = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  }
  typeof SuppressedError === "function"
    ? SuppressedError
    : function (error, suppressed, message) {
        var e2 = new Error(message);
        return (
          (e2.name = "SuppressedError"),
          (e2.error = error),
          (e2.suppressed = suppressed),
          e2
        );
      };
  function e(e2, t2) {
    var i2 = {};
    for (var o2 in e2)
      Object.prototype.hasOwnProperty.call(e2, o2) &&
        t2.indexOf(o2) < 0 &&
        (i2[o2] = e2[o2]);
    if (null != e2 && "function" == typeof Object.getOwnPropertySymbols) {
      var n2 = 0;
      for (o2 = Object.getOwnPropertySymbols(e2); n2 < o2.length; n2++)
        t2.indexOf(o2[n2]) < 0 &&
          Object.prototype.propertyIsEnumerable.call(e2, o2[n2]) &&
          (i2[o2[n2]] = e2[o2[n2]]);
    }
    return i2;
  }
  "function" == typeof SuppressedError && SuppressedError;
  var t =
    "undefined" != typeof globalThis
      ? globalThis
      : "undefined" != typeof window
      ? window
      : "undefined" != typeof global
      ? global
      : "undefined" != typeof self
      ? self
      : {};
  function i(e2) {
    return e2 &&
      e2.__esModule &&
      Object.prototype.hasOwnProperty.call(e2, "default")
      ? e2.default
      : e2;
  }
  function o(e2, t2) {
    return e2((t2 = { exports: {} }), t2.exports), t2.exports;
  }
  var n = o(function (e2, t2) {
    Object.defineProperty(t2, "__esModule", { value: true });
    var i2 = (function () {
      function e3() {
        var e4 = this;
        (this.locked = /* @__PURE__ */ new Map()),
          (this.addToLocked = function (t3, i3) {
            var o2 = e4.locked.get(t3);
            void 0 === o2
              ? void 0 === i3
                ? e4.locked.set(t3, [])
                : e4.locked.set(t3, [i3])
              : void 0 !== i3 && (o2.unshift(i3), e4.locked.set(t3, o2));
          }),
          (this.isLocked = function (t3) {
            return e4.locked.has(t3);
          }),
          (this.lock = function (t3) {
            return new Promise(function (i3, o2) {
              e4.isLocked(t3)
                ? e4.addToLocked(t3, i3)
                : (e4.addToLocked(t3), i3());
            });
          }),
          (this.unlock = function (t3) {
            var i3 = e4.locked.get(t3);
            if (void 0 !== i3 && 0 !== i3.length) {
              var o2 = i3.pop();
              e4.locked.set(t3, i3), void 0 !== o2 && setTimeout(o2, 0);
            } else e4.locked.delete(t3);
          });
      }
      return (
        (e3.getInstance = function () {
          return (
            void 0 === e3.instance && (e3.instance = new e3()), e3.instance
          );
        }),
        e3
      );
    })();
    t2.default = function () {
      return i2.getInstance();
    };
  });
  i(n);
  var a = i(
    o(function (e2, i2) {
      var o2 =
          (t && t.__awaiter) ||
          function (e3, t2, i3, o3) {
            return new (i3 || (i3 = Promise))(function (n2, a3) {
              function r3(e4) {
                try {
                  c3(o3.next(e4));
                } catch (e5) {
                  a3(e5);
                }
              }
              function s3(e4) {
                try {
                  c3(o3.throw(e4));
                } catch (e5) {
                  a3(e5);
                }
              }
              function c3(e4) {
                e4.done
                  ? n2(e4.value)
                  : new i3(function (t3) {
                      t3(e4.value);
                    }).then(r3, s3);
              }
              c3((o3 = o3.apply(e3, t2 || [])).next());
            });
          },
        a2 =
          (t && t.__generator) ||
          function (e3, t2) {
            var i3,
              o3,
              n2,
              a3,
              r3 = {
                label: 0,
                sent: function () {
                  if (1 & n2[0]) throw n2[1];
                  return n2[1];
                },
                trys: [],
                ops: [],
              };
            return (
              (a3 = { next: s3(0), throw: s3(1), return: s3(2) }),
              "function" == typeof Symbol &&
                (a3[Symbol.iterator] = function () {
                  return this;
                }),
              a3
            );
            function s3(a4) {
              return function (s4) {
                return (function (a5) {
                  if (i3)
                    throw new TypeError("Generator is already executing.");
                  for (; r3; )
                    try {
                      if (
                        ((i3 = 1),
                        o3 &&
                          (n2 =
                            2 & a5[0]
                              ? o3.return
                              : a5[0]
                              ? o3.throw || ((n2 = o3.return) && n2.call(o3), 0)
                              : o3.next) &&
                          !(n2 = n2.call(o3, a5[1])).done)
                      )
                        return n2;
                      switch (
                        ((o3 = 0), n2 && (a5 = [2 & a5[0], n2.value]), a5[0])
                      ) {
                        case 0:
                        case 1:
                          n2 = a5;
                          break;
                        case 4:
                          return r3.label++, { value: a5[1], done: false };
                        case 5:
                          r3.label++, (o3 = a5[1]), (a5 = [0]);
                          continue;
                        case 7:
                          (a5 = r3.ops.pop()), r3.trys.pop();
                          continue;
                        default:
                          if (
                            !((n2 = r3.trys),
                            (n2 = n2.length > 0 && n2[n2.length - 1]) ||
                              (6 !== a5[0] && 2 !== a5[0]))
                          ) {
                            r3 = 0;
                            continue;
                          }
                          if (
                            3 === a5[0] &&
                            (!n2 || (a5[1] > n2[0] && a5[1] < n2[3]))
                          ) {
                            r3.label = a5[1];
                            break;
                          }
                          if (6 === a5[0] && r3.label < n2[1]) {
                            (r3.label = n2[1]), (n2 = a5);
                            break;
                          }
                          if (n2 && r3.label < n2[2]) {
                            (r3.label = n2[2]), r3.ops.push(a5);
                            break;
                          }
                          n2[2] && r3.ops.pop(), r3.trys.pop();
                          continue;
                      }
                      a5 = t2.call(e3, r3);
                    } catch (e4) {
                      (a5 = [6, e4]), (o3 = 0);
                    } finally {
                      i3 = n2 = 0;
                    }
                  if (5 & a5[0]) throw a5[1];
                  return { value: a5[0] ? a5[1] : void 0, done: true };
                })([a4, s4]);
              };
            }
          },
        r2 = t;
      Object.defineProperty(i2, "__esModule", { value: true });
      var s2 = "browser-tabs-lock-key",
        c2 = {
          key: function (e3) {
            return o2(r2, void 0, void 0, function () {
              return a2(this, function (e4) {
                throw new Error("Unsupported");
              });
            });
          },
          getItem: function (e3) {
            return o2(r2, void 0, void 0, function () {
              return a2(this, function (e4) {
                throw new Error("Unsupported");
              });
            });
          },
          clear: function () {
            return o2(r2, void 0, void 0, function () {
              return a2(this, function (e3) {
                return [2, window.localStorage.clear()];
              });
            });
          },
          removeItem: function (e3) {
            return o2(r2, void 0, void 0, function () {
              return a2(this, function (e4) {
                throw new Error("Unsupported");
              });
            });
          },
          setItem: function (e3, t2) {
            return o2(r2, void 0, void 0, function () {
              return a2(this, function (e4) {
                throw new Error("Unsupported");
              });
            });
          },
          keySync: function (e3) {
            return window.localStorage.key(e3);
          },
          getItemSync: function (e3) {
            return window.localStorage.getItem(e3);
          },
          clearSync: function () {
            return window.localStorage.clear();
          },
          removeItemSync: function (e3) {
            return window.localStorage.removeItem(e3);
          },
          setItemSync: function (e3, t2) {
            return window.localStorage.setItem(e3, t2);
          },
        };
      function d2(e3) {
        return new Promise(function (t2) {
          return setTimeout(t2, e3);
        });
      }
      function u2(e3) {
        for (
          var t2 =
              "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz",
            i3 = "",
            o3 = 0;
          o3 < e3;
          o3++
        ) {
          i3 += t2[Math.floor(Math.random() * t2.length)];
        }
        return i3;
      }
      var l2 = (function () {
        function e3(t2) {
          (this.acquiredIatSet = /* @__PURE__ */ new Set()),
            (this.storageHandler = void 0),
            (this.id = Date.now().toString() + u2(15)),
            (this.acquireLock = this.acquireLock.bind(this)),
            (this.releaseLock = this.releaseLock.bind(this)),
            (this.releaseLock__private__ =
              this.releaseLock__private__.bind(this)),
            (this.waitForSomethingToChange =
              this.waitForSomethingToChange.bind(this)),
            (this.refreshLockWhileAcquired =
              this.refreshLockWhileAcquired.bind(this)),
            (this.storageHandler = t2),
            void 0 === e3.waiters && (e3.waiters = []);
        }
        return (
          (e3.prototype.acquireLock = function (t2, i3) {
            return (
              void 0 === i3 && (i3 = 5e3),
              o2(this, void 0, void 0, function () {
                var o3, n2, r3, l3, h2, p2, m2;
                return a2(this, function (a3) {
                  switch (a3.label) {
                    case 0:
                      (o3 = Date.now() + u2(4)),
                        (n2 = Date.now() + i3),
                        (r3 = s2 + "-" + t2),
                        (l3 =
                          void 0 === this.storageHandler
                            ? c2
                            : this.storageHandler),
                        (a3.label = 1);
                    case 1:
                      return Date.now() < n2 ? [4, d2(30)] : [3, 8];
                    case 2:
                      return (
                        a3.sent(),
                        null !== l3.getItemSync(r3)
                          ? [3, 5]
                          : ((h2 = this.id + "-" + t2 + "-" + o3),
                            [4, d2(Math.floor(25 * Math.random()))])
                      );
                    case 3:
                      return (
                        a3.sent(),
                        l3.setItemSync(
                          r3,
                          JSON.stringify({
                            id: this.id,
                            iat: o3,
                            timeoutKey: h2,
                            timeAcquired: Date.now(),
                            timeRefreshed: Date.now(),
                          })
                        ),
                        [4, d2(30)]
                      );
                    case 4:
                      return (
                        a3.sent(),
                        null !== (p2 = l3.getItemSync(r3)) &&
                        (m2 = JSON.parse(p2)).id === this.id &&
                        m2.iat === o3
                          ? (this.acquiredIatSet.add(o3),
                            this.refreshLockWhileAcquired(r3, o3),
                            [2, true])
                          : [3, 7]
                      );
                    case 5:
                      return (
                        e3.lockCorrector(
                          void 0 === this.storageHandler
                            ? c2
                            : this.storageHandler
                        ),
                        [4, this.waitForSomethingToChange(n2)]
                      );
                    case 6:
                      a3.sent(), (a3.label = 7);
                    case 7:
                      return (o3 = Date.now() + u2(4)), [3, 1];
                    case 8:
                      return [2, false];
                  }
                });
              })
            );
          }),
          (e3.prototype.refreshLockWhileAcquired = function (e4, t2) {
            return o2(this, void 0, void 0, function () {
              var i3 = this;
              return a2(this, function (r3) {
                return (
                  setTimeout(function () {
                    return o2(i3, void 0, void 0, function () {
                      var i4, o3, r4;
                      return a2(this, function (a3) {
                        switch (a3.label) {
                          case 0:
                            return [4, n.default().lock(t2)];
                          case 1:
                            return (
                              a3.sent(),
                              this.acquiredIatSet.has(t2)
                                ? ((i4 =
                                    void 0 === this.storageHandler
                                      ? c2
                                      : this.storageHandler),
                                  null === (o3 = i4.getItemSync(e4))
                                    ? (n.default().unlock(t2), [2])
                                    : (((r4 = JSON.parse(o3)).timeRefreshed =
                                        Date.now()),
                                      i4.setItemSync(e4, JSON.stringify(r4)),
                                      n.default().unlock(t2),
                                      this.refreshLockWhileAcquired(e4, t2),
                                      [2]))
                                : (n.default().unlock(t2), [2])
                            );
                        }
                      });
                    });
                  }, 1e3),
                  [2]
                );
              });
            });
          }),
          (e3.prototype.waitForSomethingToChange = function (t2) {
            return o2(this, void 0, void 0, function () {
              return a2(this, function (i3) {
                switch (i3.label) {
                  case 0:
                    return [
                      4,
                      new Promise(function (i4) {
                        var o3 = false,
                          n2 = Date.now(),
                          a3 = false;
                        function r3() {
                          if (
                            (a3 ||
                              (window.removeEventListener("storage", r3),
                              e3.removeFromWaiting(r3),
                              clearTimeout(s3),
                              (a3 = true)),
                            !o3)
                          ) {
                            o3 = true;
                            var t3 = 50 - (Date.now() - n2);
                            t3 > 0 ? setTimeout(i4, t3) : i4(null);
                          }
                        }
                        window.addEventListener("storage", r3),
                          e3.addToWaiting(r3);
                        var s3 = setTimeout(r3, Math.max(0, t2 - Date.now()));
                      }),
                    ];
                  case 1:
                    return i3.sent(), [2];
                }
              });
            });
          }),
          (e3.addToWaiting = function (t2) {
            this.removeFromWaiting(t2),
              void 0 !== e3.waiters && e3.waiters.push(t2);
          }),
          (e3.removeFromWaiting = function (t2) {
            void 0 !== e3.waiters &&
              (e3.waiters = e3.waiters.filter(function (e4) {
                return e4 !== t2;
              }));
          }),
          (e3.notifyWaiters = function () {
            void 0 !== e3.waiters &&
              e3.waiters.slice().forEach(function (e4) {
                return e4();
              });
          }),
          (e3.prototype.releaseLock = function (e4) {
            return o2(this, void 0, void 0, function () {
              return a2(this, function (t2) {
                switch (t2.label) {
                  case 0:
                    return [4, this.releaseLock__private__(e4)];
                  case 1:
                    return [2, t2.sent()];
                }
              });
            });
          }),
          (e3.prototype.releaseLock__private__ = function (t2) {
            return o2(this, void 0, void 0, function () {
              var i3, o3, r3, d3;
              return a2(this, function (a3) {
                switch (a3.label) {
                  case 0:
                    return (
                      (i3 =
                        void 0 === this.storageHandler
                          ? c2
                          : this.storageHandler),
                      (o3 = s2 + "-" + t2),
                      null === (r3 = i3.getItemSync(o3))
                        ? [2]
                        : (d3 = JSON.parse(r3)).id !== this.id
                        ? [3, 2]
                        : [4, n.default().lock(d3.iat)]
                    );
                  case 1:
                    a3.sent(),
                      this.acquiredIatSet.delete(d3.iat),
                      i3.removeItemSync(o3),
                      n.default().unlock(d3.iat),
                      e3.notifyWaiters(),
                      (a3.label = 2);
                  case 2:
                    return [2];
                }
              });
            });
          }),
          (e3.lockCorrector = function (t2) {
            for (var i3 = Date.now() - 5e3, o3 = t2, n2 = [], a3 = 0; ; ) {
              var r3 = o3.keySync(a3);
              if (null === r3) break;
              n2.push(r3), a3++;
            }
            for (var c3 = false, d3 = 0; d3 < n2.length; d3++) {
              var u3 = n2[d3];
              if (u3.includes(s2)) {
                var l3 = o3.getItemSync(u3);
                if (null !== l3) {
                  var h2 = JSON.parse(l3);
                  ((void 0 === h2.timeRefreshed && h2.timeAcquired < i3) ||
                    (void 0 !== h2.timeRefreshed && h2.timeRefreshed < i3)) &&
                    (o3.removeItemSync(u3), (c3 = true));
                }
              }
            }
            c3 && e3.notifyWaiters();
          }),
          (e3.waiters = void 0),
          e3
        );
      })();
      i2.default = l2;
    })
  );
  const r$2 = { timeoutInSeconds: 60 },
    s = { name: "auth0-spa-js", version: "2.1.3" },
    c = () => Date.now();
  class d extends Error {
    constructor(e2, t2) {
      super(t2),
        (this.error = e2),
        (this.error_description = t2),
        Object.setPrototypeOf(this, d.prototype);
    }
    static fromPayload({ error: e2, error_description: t2 }) {
      return new d(e2, t2);
    }
  }
  class u extends d {
    constructor(e2, t2, i2, o2 = null) {
      super(e2, t2),
        (this.state = i2),
        (this.appState = o2),
        Object.setPrototypeOf(this, u.prototype);
    }
  }
  class l extends d {
    constructor() {
      super("timeout", "Timeout"), Object.setPrototypeOf(this, l.prototype);
    }
  }
  class h extends l {
    constructor(e2) {
      super(), (this.popup = e2), Object.setPrototypeOf(this, h.prototype);
    }
  }
  class p extends d {
    constructor(e2) {
      super("cancelled", "Popup closed"),
        (this.popup = e2),
        Object.setPrototypeOf(this, p.prototype);
    }
  }
  class m extends d {
    constructor(e2, t2, i2) {
      super(e2, t2),
        (this.mfa_token = i2),
        Object.setPrototypeOf(this, m.prototype);
    }
  }
  class f extends d {
    constructor(e2, t2) {
      super(
        "missing_refresh_token",
        `Missing Refresh Token (audience: '${g(e2, ["default"])}', scope: '${g(
          t2
        )}')`
      ),
        (this.audience = e2),
        (this.scope = t2),
        Object.setPrototypeOf(this, f.prototype);
    }
  }
  function g(e2, t2 = []) {
    return e2 && !t2.includes(e2) ? e2 : "";
  }
  const w = () => window.crypto,
    y = () => {
      const e2 =
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_~.";
      let t2 = "";
      return (
        Array.from(w().getRandomValues(new Uint8Array(43))).forEach(
          (i2) => (t2 += e2[i2 % e2.length])
        ),
        t2
      );
    },
    k = (e2) => btoa(e2),
    v = (t2) => {
      var { clientId: i2 } = t2,
        o2 = e(t2, ["clientId"]);
      return new URLSearchParams(
        ((e2) =>
          Object.keys(e2)
            .filter((t3) => void 0 !== e2[t3])
            .reduce(
              (t3, i3) =>
                Object.assign(Object.assign({}, t3), { [i3]: e2[i3] }),
              {}
            ))(Object.assign({ client_id: i2 }, o2))
      ).toString();
    },
    b = (e2) =>
      ((e3) =>
        decodeURIComponent(
          atob(e3)
            .split("")
            .map((e4) => "%" + ("00" + e4.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        ))(e2.replace(/_/g, "/").replace(/-/g, "+")),
    _ = async (e2, t2) => {
      const i2 = await fetch(e2, t2);
      return { ok: i2.ok, json: await i2.json() };
    },
    I = async (e2, t2, i2) => {
      const o2 = new AbortController();
      let n2;
      return (
        (t2.signal = o2.signal),
        Promise.race([
          _(e2, t2),
          new Promise((e3, t3) => {
            n2 = setTimeout(() => {
              o2.abort(), t3(new Error("Timeout when executing 'fetch'"));
            }, i2);
          }),
        ]).finally(() => {
          clearTimeout(n2);
        })
      );
    },
    S = async (e2, t2, i2, o2, n2, a2, r2) => {
      return (
        (s2 = {
          auth: { audience: t2, scope: i2 },
          timeout: n2,
          fetchUrl: e2,
          fetchOptions: o2,
          useFormData: r2,
        }),
        (c2 = a2),
        new Promise(function (e3, t3) {
          const i3 = new MessageChannel();
          (i3.port1.onmessage = function (o3) {
            o3.data.error ? t3(new Error(o3.data.error)) : e3(o3.data),
              i3.port1.close();
          }),
            c2.postMessage(s2, [i3.port2]);
        })
      );
      var s2, c2;
    },
    O = async (e2, t2, i2, o2, n2, a2, r2 = 1e4) =>
      n2 ? S(e2, t2, i2, o2, r2, n2, a2) : I(e2, o2, r2);
  async function T(t2, i2) {
    var {
        baseUrl: o2,
        timeout: n2,
        audience: a2,
        scope: r2,
        auth0Client: c2,
        useFormData: u2,
      } = t2,
      l2 = e(t2, [
        "baseUrl",
        "timeout",
        "audience",
        "scope",
        "auth0Client",
        "useFormData",
      ]);
    const h2 = u2 ? v(l2) : JSON.stringify(l2);
    return await (async function (t3, i3, o3, n3, a3, r3, s2) {
      let c3,
        u3 = null;
      for (let e2 = 0; e2 < 3; e2++)
        try {
          (c3 = await O(t3, o3, n3, a3, r3, s2, i3)), (u3 = null);
          break;
        } catch (e3) {
          u3 = e3;
        }
      if (u3) throw u3;
      const l3 = c3.json,
        { error: h3, error_description: p2 } = l3,
        g2 = e(l3, ["error", "error_description"]),
        { ok: w2 } = c3;
      if (!w2) {
        const e2 = p2 || `HTTP error. Unable to fetch ${t3}`;
        if ("mfa_required" === h3) throw new m(h3, e2, g2.mfa_token);
        if ("missing_refresh_token" === h3) throw new f(o3, n3);
        throw new d(h3 || "request_error", e2);
      }
      return g2;
    })(
      `${o2}/oauth/token`,
      n2,
      a2 || "default",
      r2,
      {
        method: "POST",
        body: h2,
        headers: {
          "Content-Type": u2
            ? "application/x-www-form-urlencoded"
            : "application/json",
          "Auth0-Client": btoa(JSON.stringify(c2 || s)),
        },
      },
      i2,
      u2
    );
  }
  const j = (...e2) => {
    return ((t2 = e2.filter(Boolean).join(" ").trim().split(/\s+/)),
    Array.from(new Set(t2))).join(" ");
    var t2;
  };
  class C {
    constructor(e2, t2 = "@@auth0spajs@@", i2) {
      (this.prefix = t2),
        (this.suffix = i2),
        (this.clientId = e2.clientId),
        (this.scope = e2.scope),
        (this.audience = e2.audience);
    }
    toKey() {
      return [
        this.prefix,
        this.clientId,
        this.audience,
        this.scope,
        this.suffix,
      ]
        .filter(Boolean)
        .join("::");
    }
    static fromKey(e2) {
      const [t2, i2, o2, n2] = e2.split("::");
      return new C({ clientId: i2, scope: n2, audience: o2 }, t2);
    }
    static fromCacheEntry(e2) {
      const { scope: t2, audience: i2, client_id: o2 } = e2;
      return new C({ scope: t2, audience: i2, clientId: o2 });
    }
  }
  class z {
    set(e2, t2) {
      localStorage.setItem(e2, JSON.stringify(t2));
    }
    get(e2) {
      const t2 = window.localStorage.getItem(e2);
      if (t2)
        try {
          return JSON.parse(t2);
        } catch (e3) {
          return;
        }
    }
    remove(e2) {
      localStorage.removeItem(e2);
    }
    allKeys() {
      return Object.keys(window.localStorage).filter((e2) =>
        e2.startsWith("@@auth0spajs@@")
      );
    }
  }
  class P {
    constructor() {
      this.enclosedCache = /* @__PURE__ */ (function () {
        let e2 = {};
        return {
          set(t2, i2) {
            e2[t2] = i2;
          },
          get(t2) {
            const i2 = e2[t2];
            if (i2) return i2;
          },
          remove(t2) {
            delete e2[t2];
          },
          allKeys: () => Object.keys(e2),
        };
      })();
    }
  }
  class x {
    constructor(e2, t2, i2) {
      (this.cache = e2), (this.keyManifest = t2), (this.nowProvider = i2 || c);
    }
    async setIdToken(e2, t2, i2) {
      var o2;
      const n2 = this.getIdTokenCacheKey(e2);
      await this.cache.set(n2, { id_token: t2, decodedToken: i2 }),
        await (null === (o2 = this.keyManifest) || void 0 === o2
          ? void 0
          : o2.add(n2));
    }
    async getIdToken(e2) {
      const t2 = await this.cache.get(this.getIdTokenCacheKey(e2.clientId));
      if (!t2 && e2.scope && e2.audience) {
        const t3 = await this.get(e2);
        if (!t3) return;
        if (!t3.id_token || !t3.decodedToken) return;
        return { id_token: t3.id_token, decodedToken: t3.decodedToken };
      }
      if (t2) return { id_token: t2.id_token, decodedToken: t2.decodedToken };
    }
    async get(e2, t2 = 0) {
      var i2;
      let o2 = await this.cache.get(e2.toKey());
      if (!o2) {
        const t3 = await this.getCacheKeys();
        if (!t3) return;
        const i3 = this.matchExistingCacheKey(e2, t3);
        i3 && (o2 = await this.cache.get(i3));
      }
      if (!o2) return;
      const n2 = await this.nowProvider(),
        a2 = Math.floor(n2 / 1e3);
      return o2.expiresAt - t2 < a2
        ? o2.body.refresh_token
          ? ((o2.body = { refresh_token: o2.body.refresh_token }),
            await this.cache.set(e2.toKey(), o2),
            o2.body)
          : (await this.cache.remove(e2.toKey()),
            void (await (null === (i2 = this.keyManifest) || void 0 === i2
              ? void 0
              : i2.remove(e2.toKey()))))
        : o2.body;
    }
    async set(e2) {
      var t2;
      const i2 = new C({
          clientId: e2.client_id,
          scope: e2.scope,
          audience: e2.audience,
        }),
        o2 = await this.wrapCacheEntry(e2);
      await this.cache.set(i2.toKey(), o2),
        await (null === (t2 = this.keyManifest) || void 0 === t2
          ? void 0
          : t2.add(i2.toKey()));
    }
    async clear(e2) {
      var t2;
      const i2 = await this.getCacheKeys();
      i2 &&
        (await i2
          .filter((t3) => !e2 || t3.includes(e2))
          .reduce(async (e3, t3) => {
            await e3, await this.cache.remove(t3);
          }, Promise.resolve()),
        await (null === (t2 = this.keyManifest) || void 0 === t2
          ? void 0
          : t2.clear()));
    }
    async wrapCacheEntry(e2) {
      const t2 = await this.nowProvider();
      return { body: e2, expiresAt: Math.floor(t2 / 1e3) + e2.expires_in };
    }
    async getCacheKeys() {
      var e2;
      return this.keyManifest
        ? null === (e2 = await this.keyManifest.get()) || void 0 === e2
          ? void 0
          : e2.keys
        : this.cache.allKeys
        ? this.cache.allKeys()
        : void 0;
    }
    getIdTokenCacheKey(e2) {
      return new C({ clientId: e2 }, "@@auth0spajs@@", "@@user@@").toKey();
    }
    matchExistingCacheKey(e2, t2) {
      return t2.filter((t3) => {
        var i2;
        const o2 = C.fromKey(t3),
          n2 = new Set(o2.scope && o2.scope.split(" ")),
          a2 =
            (null === (i2 = e2.scope) || void 0 === i2
              ? void 0
              : i2.split(" ")) || [],
          r2 = o2.scope && a2.reduce((e3, t4) => e3 && n2.has(t4), true);
        return (
          "@@auth0spajs@@" === o2.prefix &&
          o2.clientId === e2.clientId &&
          o2.audience === e2.audience &&
          r2
        );
      })[0];
    }
  }
  class Z {
    constructor(e2, t2, i2) {
      (this.storage = e2),
        (this.clientId = t2),
        (this.cookieDomain = i2),
        (this.storageKey = `a0.spajs.txs.${this.clientId}`);
    }
    create(e2) {
      this.storage.save(this.storageKey, e2, {
        daysUntilExpire: 1,
        cookieDomain: this.cookieDomain,
      });
    }
    get() {
      return this.storage.get(this.storageKey);
    }
    remove() {
      this.storage.remove(this.storageKey, { cookieDomain: this.cookieDomain });
    }
  }
  const K = (e2) => "number" == typeof e2,
    W = [
      "iss",
      "aud",
      "exp",
      "nbf",
      "iat",
      "jti",
      "azp",
      "nonce",
      "auth_time",
      "at_hash",
      "c_hash",
      "acr",
      "amr",
      "sub_jwk",
      "cnf",
      "sip_from_tag",
      "sip_date",
      "sip_callid",
      "sip_cseq_num",
      "sip_via_branch",
      "orig",
      "dest",
      "mky",
      "events",
      "toe",
      "txn",
      "rph",
      "sid",
      "vot",
      "vtm",
    ],
    E = (e2) => {
      if (!e2.id_token) throw new Error("ID token is required but missing");
      const t2 = ((e3) => {
        const t3 = e3.split("."),
          [i3, o3, n3] = t3;
        if (3 !== t3.length || !i3 || !o3 || !n3)
          throw new Error("ID token could not be decoded");
        const a2 = JSON.parse(b(o3)),
          r2 = { __raw: e3 },
          s2 = {};
        return (
          Object.keys(a2).forEach((e4) => {
            (r2[e4] = a2[e4]), W.includes(e4) || (s2[e4] = a2[e4]);
          }),
          {
            encoded: { header: i3, payload: o3, signature: n3 },
            header: JSON.parse(b(i3)),
            claims: r2,
            user: s2,
          }
        );
      })(e2.id_token);
      if (!t2.claims.iss)
        throw new Error(
          "Issuer (iss) claim must be a string present in the ID token"
        );
      if (t2.claims.iss !== e2.iss)
        throw new Error(
          `Issuer (iss) claim mismatch in the ID token; expected "${e2.iss}", found "${t2.claims.iss}"`
        );
      if (!t2.user.sub)
        throw new Error(
          "Subject (sub) claim must be a string present in the ID token"
        );
      if ("RS256" !== t2.header.alg)
        throw new Error(
          `Signature algorithm of "${t2.header.alg}" is not supported. Expected the ID token to be signed with "RS256".`
        );
      if (
        !t2.claims.aud ||
        ("string" != typeof t2.claims.aud && !Array.isArray(t2.claims.aud))
      )
        throw new Error(
          "Audience (aud) claim must be a string or array of strings present in the ID token"
        );
      if (Array.isArray(t2.claims.aud)) {
        if (!t2.claims.aud.includes(e2.aud))
          throw new Error(
            `Audience (aud) claim mismatch in the ID token; expected "${
              e2.aud
            }" but was not one of "${t2.claims.aud.join(", ")}"`
          );
        if (t2.claims.aud.length > 1) {
          if (!t2.claims.azp)
            throw new Error(
              "Authorized Party (azp) claim must be a string present in the ID token when Audience (aud) claim has multiple values"
            );
          if (t2.claims.azp !== e2.aud)
            throw new Error(
              `Authorized Party (azp) claim mismatch in the ID token; expected "${e2.aud}", found "${t2.claims.azp}"`
            );
        }
      } else if (t2.claims.aud !== e2.aud)
        throw new Error(
          `Audience (aud) claim mismatch in the ID token; expected "${e2.aud}" but found "${t2.claims.aud}"`
        );
      if (e2.nonce) {
        if (!t2.claims.nonce)
          throw new Error(
            "Nonce (nonce) claim must be a string present in the ID token"
          );
        if (t2.claims.nonce !== e2.nonce)
          throw new Error(
            `Nonce (nonce) claim mismatch in the ID token; expected "${e2.nonce}", found "${t2.claims.nonce}"`
          );
      }
      if (e2.max_age && !K(t2.claims.auth_time))
        throw new Error(
          "Authentication Time (auth_time) claim must be a number present in the ID token when Max Age (max_age) is specified"
        );
      if (null == t2.claims.exp || !K(t2.claims.exp))
        throw new Error(
          "Expiration Time (exp) claim must be a number present in the ID token"
        );
      if (!K(t2.claims.iat))
        throw new Error(
          "Issued At (iat) claim must be a number present in the ID token"
        );
      const i2 = e2.leeway || 60,
        o2 = new Date(e2.now || Date.now()),
        n2 = /* @__PURE__ */ new Date(0);
      if ((n2.setUTCSeconds(t2.claims.exp + i2), o2 > n2))
        throw new Error(
          `Expiration Time (exp) claim error in the ID token; current time (${o2}) is after expiration time (${n2})`
        );
      if (null != t2.claims.nbf && K(t2.claims.nbf)) {
        const e3 = /* @__PURE__ */ new Date(0);
        if ((e3.setUTCSeconds(t2.claims.nbf - i2), o2 < e3))
          throw new Error(
            `Not Before time (nbf) claim in the ID token indicates that this token can't be used just yet. Current time (${o2}) is before ${e3}`
          );
      }
      if (null != t2.claims.auth_time && K(t2.claims.auth_time)) {
        const n3 = /* @__PURE__ */ new Date(0);
        if (
          (n3.setUTCSeconds(parseInt(t2.claims.auth_time) + e2.max_age + i2),
          o2 > n3)
        )
          throw new Error(
            `Authentication Time (auth_time) claim in the ID token indicates that too much time has passed since the last end-user authentication. Current time (${o2}) is after last auth at ${n3}`
          );
      }
      if (e2.organization) {
        const i3 = e2.organization.trim();
        if (i3.startsWith("org_")) {
          const e3 = i3;
          if (!t2.claims.org_id)
            throw new Error(
              "Organization ID (org_id) claim must be a string present in the ID token"
            );
          if (e3 !== t2.claims.org_id)
            throw new Error(
              `Organization ID (org_id) claim mismatch in the ID token; expected "${e3}", found "${t2.claims.org_id}"`
            );
        } else {
          const e3 = i3.toLowerCase();
          if (!t2.claims.org_name)
            throw new Error(
              "Organization Name (org_name) claim must be a string present in the ID token"
            );
          if (e3 !== t2.claims.org_name)
            throw new Error(
              `Organization Name (org_name) claim mismatch in the ID token; expected "${e3}", found "${t2.claims.org_name}"`
            );
        }
      }
      return t2;
    };
  var R = o(function (e2, i2) {
    var o2 =
      (t && t.__assign) ||
      function () {
        return (
          (o2 =
            Object.assign ||
            function (e3) {
              for (var t2, i3 = 1, o3 = arguments.length; i3 < o3; i3++)
                for (var n3 in (t2 = arguments[i3]))
                  Object.prototype.hasOwnProperty.call(t2, n3) &&
                    (e3[n3] = t2[n3]);
              return e3;
            }),
          o2.apply(this, arguments)
        );
      };
    function n2(e3, t2) {
      if (!t2) return "";
      var i3 = "; " + e3;
      return true === t2 ? i3 : i3 + "=" + t2;
    }
    function a2(e3, t2, i3) {
      return (
        encodeURIComponent(e3)
          .replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent)
          .replace(/\(/g, "%28")
          .replace(/\)/g, "%29") +
        "=" +
        encodeURIComponent(t2).replace(
          /%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g,
          decodeURIComponent
        ) +
        (function (e4) {
          if ("number" == typeof e4.expires) {
            var t3 = /* @__PURE__ */ new Date();
            t3.setMilliseconds(t3.getMilliseconds() + 864e5 * e4.expires),
              (e4.expires = t3);
          }
          return (
            n2("Expires", e4.expires ? e4.expires.toUTCString() : "") +
            n2("Domain", e4.domain) +
            n2("Path", e4.path) +
            n2("Secure", e4.secure) +
            n2("SameSite", e4.sameSite)
          );
        })(i3)
      );
    }
    function r2(e3) {
      for (
        var t2 = {},
          i3 = e3 ? e3.split("; ") : [],
          o3 = /(%[\dA-F]{2})+/gi,
          n3 = 0;
        n3 < i3.length;
        n3++
      ) {
        var a3 = i3[n3].split("="),
          r3 = a3.slice(1).join("=");
        '"' === r3.charAt(0) && (r3 = r3.slice(1, -1));
        try {
          t2[a3[0].replace(o3, decodeURIComponent)] = r3.replace(
            o3,
            decodeURIComponent
          );
        } catch (e4) {}
      }
      return t2;
    }
    function s2() {
      return r2(document.cookie);
    }
    function c2(e3, t2, i3) {
      document.cookie = a2(e3, t2, o2({ path: "/" }, i3));
    }
    (i2.__esModule = true),
      (i2.encode = a2),
      (i2.parse = r2),
      (i2.getAll = s2),
      (i2.get = function (e3) {
        return s2()[e3];
      }),
      (i2.set = c2),
      (i2.remove = function (e3, t2) {
        c2(e3, "", o2(o2({}, t2), { expires: -1 }));
      });
  });
  i(R), R.encode, R.parse, R.getAll;
  var U = R.get,
    L = R.set,
    D = R.remove;
  const X = {
      get(e2) {
        const t2 = U(e2);
        if (void 0 !== t2) return JSON.parse(t2);
      },
      save(e2, t2, i2) {
        let o2 = {};
        "https:" === window.location.protocol &&
          (o2 = { secure: true, sameSite: "none" }),
          (null == i2 ? void 0 : i2.daysUntilExpire) &&
            (o2.expires = i2.daysUntilExpire),
          (null == i2 ? void 0 : i2.cookieDomain) &&
            (o2.domain = i2.cookieDomain),
          L(e2, JSON.stringify(t2), o2);
      },
      remove(e2, t2) {
        let i2 = {};
        (null == t2 ? void 0 : t2.cookieDomain) &&
          (i2.domain = t2.cookieDomain),
          D(e2, i2);
      },
    },
    N = {
      get(e2) {
        const t2 = X.get(e2);
        return t2 || X.get(`_legacy_${e2}`);
      },
      save(e2, t2, i2) {
        let o2 = {};
        "https:" === window.location.protocol && (o2 = { secure: true }),
          (null == i2 ? void 0 : i2.daysUntilExpire) &&
            (o2.expires = i2.daysUntilExpire),
          (null == i2 ? void 0 : i2.cookieDomain) &&
            (o2.domain = i2.cookieDomain),
          L(`_legacy_${e2}`, JSON.stringify(t2), o2),
          X.save(e2, t2, i2);
      },
      remove(e2, t2) {
        let i2 = {};
        (null == t2 ? void 0 : t2.cookieDomain) &&
          (i2.domain = t2.cookieDomain),
          D(e2, i2),
          X.remove(e2, t2),
          X.remove(`_legacy_${e2}`, t2);
      },
    },
    J = {
      get(e2) {
        if ("undefined" == typeof sessionStorage) return;
        const t2 = sessionStorage.getItem(e2);
        return null != t2 ? JSON.parse(t2) : void 0;
      },
      save(e2, t2) {
        sessionStorage.setItem(e2, JSON.stringify(t2));
      },
      remove(e2) {
        sessionStorage.removeItem(e2);
      },
    };
  function F(e2, t2, i2) {
    var o2 = void 0 === t2 ? null : t2,
      n2 = (function (e3, t3) {
        var i3 = atob(e3);
        if (t3) {
          for (
            var o3 = new Uint8Array(i3.length), n3 = 0, a3 = i3.length;
            n3 < a3;
            ++n3
          )
            o3[n3] = i3.charCodeAt(n3);
          return String.fromCharCode.apply(null, new Uint16Array(o3.buffer));
        }
        return i3;
      })(e2, void 0 !== i2 && i2),
      a2 = n2.indexOf("\n", 10) + 1,
      r2 = n2.substring(a2) + (o2 ? "//# sourceMappingURL=" + o2 : ""),
      s2 = new Blob([r2], { type: "application/javascript" });
    return URL.createObjectURL(s2);
  }
  var H,
    Y,
    G,
    V,
    M =
      ((H =
        "Lyogcm9sbHVwLXBsdWdpbi13ZWItd29ya2VyLWxvYWRlciAqLwohZnVuY3Rpb24oKXsidXNlIHN0cmljdCI7Y2xhc3MgZSBleHRlbmRzIEVycm9ye2NvbnN0cnVjdG9yKHQscil7c3VwZXIociksdGhpcy5lcnJvcj10LHRoaXMuZXJyb3JfZGVzY3JpcHRpb249cixPYmplY3Quc2V0UHJvdG90eXBlT2YodGhpcyxlLnByb3RvdHlwZSl9c3RhdGljIGZyb21QYXlsb2FkKHtlcnJvcjp0LGVycm9yX2Rlc2NyaXB0aW9uOnJ9KXtyZXR1cm4gbmV3IGUodCxyKX19Y2xhc3MgdCBleHRlbmRzIGV7Y29uc3RydWN0b3IoZSxzKXtzdXBlcigibWlzc2luZ19yZWZyZXNoX3Rva2VuIixgTWlzc2luZyBSZWZyZXNoIFRva2VuIChhdWRpZW5jZTogJyR7cihlLFsiZGVmYXVsdCJdKX0nLCBzY29wZTogJyR7cihzKX0nKWApLHRoaXMuYXVkaWVuY2U9ZSx0aGlzLnNjb3BlPXMsT2JqZWN0LnNldFByb3RvdHlwZU9mKHRoaXMsdC5wcm90b3R5cGUpfX1mdW5jdGlvbiByKGUsdD1bXSl7cmV0dXJuIGUmJiF0LmluY2x1ZGVzKGUpP2U6IiJ9ImZ1bmN0aW9uIj09dHlwZW9mIFN1cHByZXNzZWRFcnJvciYmU3VwcHJlc3NlZEVycm9yO2NvbnN0IHM9ZT0+e3ZhcntjbGllbnRJZDp0fT1lLHI9ZnVuY3Rpb24oZSx0KXt2YXIgcj17fTtmb3IodmFyIHMgaW4gZSlPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZSxzKSYmdC5pbmRleE9mKHMpPDAmJihyW3NdPWVbc10pO2lmKG51bGwhPWUmJiJmdW5jdGlvbiI9PXR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKXt2YXIgbz0wO2ZvcihzPU9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZSk7bzxzLmxlbmd0aDtvKyspdC5pbmRleE9mKHNbb10pPDAmJk9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChlLHNbb10pJiYocltzW29dXT1lW3Nbb11dKX1yZXR1cm4gcn0oZSxbImNsaWVudElkIl0pO3JldHVybiBuZXcgVVJMU2VhcmNoUGFyYW1zKChlPT5PYmplY3Qua2V5cyhlKS5maWx0ZXIoKHQ9PnZvaWQgMCE9PWVbdF0pKS5yZWR1Y2UoKCh0LHIpPT5PYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sdCkse1tyXTplW3JdfSkpLHt9KSkoT2JqZWN0LmFzc2lnbih7Y2xpZW50X2lkOnR9LHIpKSkudG9TdHJpbmcoKX07bGV0IG89e307Y29uc3Qgbj0oZSx0KT0+YCR7ZX18JHt0fWA7YWRkRXZlbnRMaXN0ZW5lcigibWVzc2FnZSIsKGFzeW5jKHtkYXRhOnt0aW1lb3V0OmUsYXV0aDpyLGZldGNoVXJsOmksZmV0Y2hPcHRpb25zOmMsdXNlRm9ybURhdGE6YX0scG9ydHM6W3BdfSk9PntsZXQgZjtjb25zdHthdWRpZW5jZTp1LHNjb3BlOmx9PXJ8fHt9O3RyeXtjb25zdCByPWE/KGU9Pntjb25zdCB0PW5ldyBVUkxTZWFyY2hQYXJhbXMoZSkscj17fTtyZXR1cm4gdC5mb3JFYWNoKCgoZSx0KT0+e3JbdF09ZX0pKSxyfSkoYy5ib2R5KTpKU09OLnBhcnNlKGMuYm9keSk7aWYoIXIucmVmcmVzaF90b2tlbiYmInJlZnJlc2hfdG9rZW4iPT09ci5ncmFudF90eXBlKXtjb25zdCBlPSgoZSx0KT0+b1tuKGUsdCldKSh1LGwpO2lmKCFlKXRocm93IG5ldyB0KHUsbCk7Yy5ib2R5PWE/cyhPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30scikse3JlZnJlc2hfdG9rZW46ZX0pKTpKU09OLnN0cmluZ2lmeShPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30scikse3JlZnJlc2hfdG9rZW46ZX0pKX1sZXQgaCxnOyJmdW5jdGlvbiI9PXR5cGVvZiBBYm9ydENvbnRyb2xsZXImJihoPW5ldyBBYm9ydENvbnRyb2xsZXIsYy5zaWduYWw9aC5zaWduYWwpO3RyeXtnPWF3YWl0IFByb21pc2UucmFjZShbKGQ9ZSxuZXcgUHJvbWlzZSgoZT0+c2V0VGltZW91dChlLGQpKSkpLGZldGNoKGksT2JqZWN0LmFzc2lnbih7fSxjKSldKX1jYXRjaChlKXtyZXR1cm4gdm9pZCBwLnBvc3RNZXNzYWdlKHtlcnJvcjplLm1lc3NhZ2V9KX1pZighZylyZXR1cm4gaCYmaC5hYm9ydCgpLHZvaWQgcC5wb3N0TWVzc2FnZSh7ZXJyb3I6IlRpbWVvdXQgd2hlbiBleGVjdXRpbmcgJ2ZldGNoJyJ9KTtmPWF3YWl0IGcuanNvbigpLGYucmVmcmVzaF90b2tlbj8oKChlLHQscik9PntvW24odCxyKV09ZX0pKGYucmVmcmVzaF90b2tlbix1LGwpLGRlbGV0ZSBmLnJlZnJlc2hfdG9rZW4pOigoZSx0KT0+e2RlbGV0ZSBvW24oZSx0KV19KSh1LGwpLHAucG9zdE1lc3NhZ2Uoe29rOmcub2ssanNvbjpmfSl9Y2F0Y2goZSl7cC5wb3N0TWVzc2FnZSh7b2s6ITEsanNvbjp7ZXJyb3I6ZS5lcnJvcixlcnJvcl9kZXNjcmlwdGlvbjplLm1lc3NhZ2V9fSl9dmFyIGR9KSl9KCk7Cgo="),
      (Y = null),
      (G = false),
      function (e2) {
        return (V = V || F(H, Y, G)), new Worker(V, e2);
      });
  const A = {};
  class B {
    constructor(e2, t2) {
      (this.cache = e2),
        (this.clientId = t2),
        (this.manifestKey = this.createManifestKeyFrom(this.clientId));
    }
    async add(e2) {
      var t2;
      const i2 = new Set(
        (null === (t2 = await this.cache.get(this.manifestKey)) || void 0 === t2
          ? void 0
          : t2.keys) || []
      );
      i2.add(e2), await this.cache.set(this.manifestKey, { keys: [...i2] });
    }
    async remove(e2) {
      const t2 = await this.cache.get(this.manifestKey);
      if (t2) {
        const i2 = new Set(t2.keys);
        return (
          i2.delete(e2),
          i2.size > 0
            ? await this.cache.set(this.manifestKey, { keys: [...i2] })
            : await this.cache.remove(this.manifestKey)
        );
      }
    }
    get() {
      return this.cache.get(this.manifestKey);
    }
    clear() {
      return this.cache.remove(this.manifestKey);
    }
    createManifestKeyFrom(e2) {
      return `@@auth0spajs@@::${e2}`;
    }
  }
  const $ = {
      memory: () => new P().enclosedCache,
      localstorage: () => new z(),
    },
    q = (e2) => $[e2],
    Q = (t2) => {
      const { openUrl: i2, onRedirect: o2 } = t2,
        n2 = e(t2, ["openUrl", "onRedirect"]);
      return Object.assign(Object.assign({}, n2), {
        openUrl: false === i2 || i2 ? i2 : o2,
      });
    },
    ee = new a();
  class te {
    constructor(e2) {
      let t2, i2;
      if (
        ((this.userCache = new P().enclosedCache),
        (this.defaultOptions = {
          authorizationParams: { scope: "openid profile email" },
          useRefreshTokensFallback: false,
          useFormData: true,
        }),
        (this._releaseLockOnPageHide = async () => {
          await ee.releaseLock("auth0.lock.getTokenSilently"),
            window.removeEventListener("pagehide", this._releaseLockOnPageHide);
        }),
        (this.options = Object.assign(
          Object.assign(Object.assign({}, this.defaultOptions), e2),
          {
            authorizationParams: Object.assign(
              Object.assign({}, this.defaultOptions.authorizationParams),
              e2.authorizationParams
            ),
          }
        )),
        "undefined" != typeof window &&
          (() => {
            if (!w())
              throw new Error(
                "For security reasons, `window.crypto` is required to run `auth0-spa-js`."
              );
            if (void 0 === w().subtle)
              throw new Error(
                "\n      auth0-spa-js must run on a secure origin. See https://github.com/auth0/auth0-spa-js/blob/main/FAQ.md#why-do-i-get-auth0-spa-js-must-run-on-a-secure-origin for more information.\n    "
              );
          })(),
        e2.cache &&
          e2.cacheLocation &&
          console.warn(
            "Both `cache` and `cacheLocation` options have been specified in the Auth0Client configuration; ignoring `cacheLocation` and using `cache`."
          ),
        e2.cache)
      )
        i2 = e2.cache;
      else {
        if (((t2 = e2.cacheLocation || "memory"), !q(t2)))
          throw new Error(`Invalid cache location "${t2}"`);
        i2 = q(t2)();
      }
      (this.httpTimeoutMs = e2.httpTimeoutInSeconds
        ? 1e3 * e2.httpTimeoutInSeconds
        : 1e4),
        (this.cookieStorage = false === e2.legacySameSiteCookie ? X : N),
        (this.orgHintCookieName = `auth0.${this.options.clientId}.organization_hint`),
        (this.isAuthenticatedCookieName = ((e3) =>
          `auth0.${e3}.is.authenticated`)(this.options.clientId)),
        (this.sessionCheckExpiryDays = e2.sessionCheckExpiryDays || 1);
      const o2 = e2.useCookiesForTransactions ? this.cookieStorage : J;
      var n2;
      (this.scope = j(
        "openid",
        this.options.authorizationParams.scope,
        this.options.useRefreshTokens ? "offline_access" : ""
      )),
        (this.transactionManager = new Z(
          o2,
          this.options.clientId,
          this.options.cookieDomain
        )),
        (this.nowProvider = this.options.nowProvider || c),
        (this.cacheManager = new x(
          i2,
          i2.allKeys ? void 0 : new B(i2, this.options.clientId),
          this.nowProvider
        )),
        (this.domainUrl =
          ((n2 = this.options.domain),
          /^https?:\/\//.test(n2) ? n2 : `https://${n2}`)),
        (this.tokenIssuer = ((e3, t3) =>
          e3 ? (e3.startsWith("https://") ? e3 : `https://${e3}/`) : `${t3}/`)(
          this.options.issuer,
          this.domainUrl
        )),
        "undefined" != typeof window &&
          window.Worker &&
          this.options.useRefreshTokens &&
          "memory" === t2 &&
          (this.options.workerUrl
            ? (this.worker = new Worker(this.options.workerUrl))
            : (this.worker = new M()));
    }
    _url(e2) {
      const t2 = encodeURIComponent(
        btoa(JSON.stringify(this.options.auth0Client || s))
      );
      return `${this.domainUrl}${e2}&auth0Client=${t2}`;
    }
    _authorizeUrl(e2) {
      return this._url(`/authorize?${v(e2)}`);
    }
    async _verifyIdToken(e2, t2, i2) {
      const o2 = await this.nowProvider();
      return E({
        iss: this.tokenIssuer,
        aud: this.options.clientId,
        id_token: e2,
        nonce: t2,
        organization: i2,
        leeway: this.options.leeway,
        max_age:
          ((n2 = this.options.authorizationParams.max_age),
          "string" != typeof n2 ? n2 : parseInt(n2, 10) || void 0),
        now: o2,
      });
      var n2;
    }
    _processOrgHint(e2) {
      e2
        ? this.cookieStorage.save(this.orgHintCookieName, e2, {
            daysUntilExpire: this.sessionCheckExpiryDays,
            cookieDomain: this.options.cookieDomain,
          })
        : this.cookieStorage.remove(this.orgHintCookieName, {
            cookieDomain: this.options.cookieDomain,
          });
    }
    async _prepareAuthorizeUrl(e2, t2, i2) {
      const o2 = k(y()),
        n2 = k(y()),
        a2 = y(),
        r2 = ((e3) => {
          const t3 = new Uint8Array(e3);
          return ((e4) => {
            const t4 = { "+": "-", "/": "_", "=": "" };
            return e4.replace(/[+/=]/g, (e5) => t4[e5]);
          })(window.btoa(String.fromCharCode(...Array.from(t3))));
        })(
          await (async (e3) => {
            const t3 = w().subtle.digest(
              { name: "SHA-256" },
              new TextEncoder().encode(e3)
            );
            return await t3;
          })(a2)
        ),
        s2 = ((e3, t3, i3, o3, n3, a3, r3, s3) =>
          Object.assign(
            Object.assign(
              Object.assign({ client_id: e3.clientId }, e3.authorizationParams),
              i3
            ),
            {
              scope: j(t3, i3.scope),
              response_type: "code",
              response_mode: s3 || "query",
              state: o3,
              nonce: n3,
              redirect_uri: r3 || e3.authorizationParams.redirect_uri,
              code_challenge: a3,
              code_challenge_method: "S256",
            }
          ))(
          this.options,
          this.scope,
          e2,
          o2,
          n2,
          r2,
          e2.redirect_uri ||
            this.options.authorizationParams.redirect_uri ||
            i2,
          null == t2 ? void 0 : t2.response_mode
        ),
        c2 = this._authorizeUrl(s2);
      return {
        nonce: n2,
        code_verifier: a2,
        scope: s2.scope,
        audience: s2.audience || "default",
        redirect_uri: s2.redirect_uri,
        state: o2,
        url: c2,
      };
    }
    async loginWithPopup(e2, t2) {
      var i2;
      if (
        ((e2 = e2 || {}),
        !(t2 = t2 || {}).popup &&
          ((t2.popup = ((e3) => {
            const t3 = window.screenX + (window.innerWidth - 400) / 2,
              i3 = window.screenY + (window.innerHeight - 600) / 2;
            return window.open(
              e3,
              "auth0:authorize:popup",
              `left=${t3},top=${i3},width=400,height=600,resizable,scrollbars=yes,status=1`
            );
          })("")),
          !t2.popup))
      )
        throw new Error(
          "Unable to open a popup for loginWithPopup - window.open returned `null`"
        );
      const o2 = await this._prepareAuthorizeUrl(
        e2.authorizationParams || {},
        { response_mode: "web_message" },
        window.location.origin
      );
      t2.popup.location.href = o2.url;
      const n2 = await ((e3) =>
        new Promise((t3, i3) => {
          let o3;
          const n3 = setInterval(() => {
              e3.popup &&
                e3.popup.closed &&
                (clearInterval(n3),
                clearTimeout(a3),
                window.removeEventListener("message", o3, false),
                i3(new p(e3.popup)));
            }, 1e3),
            a3 = setTimeout(() => {
              clearInterval(n3),
                i3(new h(e3.popup)),
                window.removeEventListener("message", o3, false);
            }, 1e3 * (e3.timeoutInSeconds || 60));
          (o3 = function (r2) {
            if (r2.data && "authorization_response" === r2.data.type) {
              if (
                (clearTimeout(a3),
                clearInterval(n3),
                window.removeEventListener("message", o3, false),
                e3.popup.close(),
                r2.data.response.error)
              )
                return i3(d.fromPayload(r2.data.response));
              t3(r2.data.response);
            }
          }),
            window.addEventListener("message", o3);
        }))(
        Object.assign(Object.assign({}, t2), {
          timeoutInSeconds:
            t2.timeoutInSeconds || this.options.authorizeTimeoutInSeconds || 60,
        })
      );
      if (o2.state !== n2.state) throw new d("state_mismatch", "Invalid state");
      const a2 =
        (null === (i2 = e2.authorizationParams) || void 0 === i2
          ? void 0
          : i2.organization) || this.options.authorizationParams.organization;
      await this._requestToken(
        {
          audience: o2.audience,
          scope: o2.scope,
          code_verifier: o2.code_verifier,
          grant_type: "authorization_code",
          code: n2.code,
          redirect_uri: o2.redirect_uri,
        },
        { nonceIn: o2.nonce, organization: a2 }
      );
    }
    async getUser() {
      var e2;
      const t2 = await this._getIdTokenFromCache();
      return null === (e2 = null == t2 ? void 0 : t2.decodedToken) ||
        void 0 === e2
        ? void 0
        : e2.user;
    }
    async getIdTokenClaims() {
      var e2;
      const t2 = await this._getIdTokenFromCache();
      return null === (e2 = null == t2 ? void 0 : t2.decodedToken) ||
        void 0 === e2
        ? void 0
        : e2.claims;
    }
    async loginWithRedirect(t2 = {}) {
      var i2;
      const o2 = Q(t2),
        { openUrl: n2, fragment: a2, appState: r2 } = o2,
        s2 = e(o2, ["openUrl", "fragment", "appState"]),
        c2 =
          (null === (i2 = s2.authorizationParams) || void 0 === i2
            ? void 0
            : i2.organization) || this.options.authorizationParams.organization,
        d2 = await this._prepareAuthorizeUrl(s2.authorizationParams || {}),
        { url: u2 } = d2,
        l2 = e(d2, ["url"]);
      this.transactionManager.create(
        Object.assign(
          Object.assign(Object.assign({}, l2), { appState: r2 }),
          c2 && { organization: c2 }
        )
      );
      const h2 = a2 ? `${u2}#${a2}` : u2;
      n2 ? await n2(h2) : window.location.assign(h2);
    }
    async handleRedirectCallback(e2 = window.location.href) {
      const t2 = e2.split("?").slice(1);
      if (0 === t2.length)
        throw new Error("There are no query params available for parsing.");
      const {
          state: i2,
          code: o2,
          error: n2,
          error_description: a2,
        } = ((e3) => {
          e3.indexOf("#") > -1 && (e3 = e3.substring(0, e3.indexOf("#")));
          const t3 = new URLSearchParams(e3);
          return {
            state: t3.get("state"),
            code: t3.get("code") || void 0,
            error: t3.get("error") || void 0,
            error_description: t3.get("error_description") || void 0,
          };
        })(t2.join("")),
        r2 = this.transactionManager.get();
      if (!r2) throw new d("missing_transaction", "Invalid state");
      if ((this.transactionManager.remove(), n2))
        throw new u(n2, a2 || n2, i2, r2.appState);
      if (!r2.code_verifier || (r2.state && r2.state !== i2))
        throw new d("state_mismatch", "Invalid state");
      const s2 = r2.organization,
        c2 = r2.nonce,
        l2 = r2.redirect_uri;
      return (
        await this._requestToken(
          Object.assign(
            {
              audience: r2.audience,
              scope: r2.scope,
              code_verifier: r2.code_verifier,
              grant_type: "authorization_code",
              code: o2,
            },
            l2 ? { redirect_uri: l2 } : {}
          ),
          { nonceIn: c2, organization: s2 }
        ),
        { appState: r2.appState }
      );
    }
    async checkSession(e2) {
      if (!this.cookieStorage.get(this.isAuthenticatedCookieName)) {
        if (!this.cookieStorage.get("auth0.is.authenticated")) return;
        this.cookieStorage.save(this.isAuthenticatedCookieName, true, {
          daysUntilExpire: this.sessionCheckExpiryDays,
          cookieDomain: this.options.cookieDomain,
        }),
          this.cookieStorage.remove("auth0.is.authenticated");
      }
      try {
        await this.getTokenSilently(e2);
      } catch (e3) {}
    }
    async getTokenSilently(e2 = {}) {
      var t2;
      const i2 = Object.assign(Object.assign({ cacheMode: "on" }, e2), {
          authorizationParams: Object.assign(
            Object.assign(
              Object.assign({}, this.options.authorizationParams),
              e2.authorizationParams
            ),
            {
              scope: j(
                this.scope,
                null === (t2 = e2.authorizationParams) || void 0 === t2
                  ? void 0
                  : t2.scope
              ),
            }
          ),
        }),
        o2 = await ((e3, t3) => {
          let i3 = A[t3];
          return (
            i3 ||
              ((i3 = e3().finally(() => {
                delete A[t3], (i3 = null);
              })),
              (A[t3] = i3)),
            i3
          );
        })(
          () => this._getTokenSilently(i2),
          `${this.options.clientId}::${i2.authorizationParams.audience}::${i2.authorizationParams.scope}`
        );
      return e2.detailedResponse ? o2 : null == o2 ? void 0 : o2.access_token;
    }
    async _getTokenSilently(t2) {
      const { cacheMode: i2 } = t2,
        o2 = e(t2, ["cacheMode"]);
      if ("off" !== i2) {
        const e2 = await this._getEntryFromCache({
          scope: o2.authorizationParams.scope,
          audience: o2.authorizationParams.audience || "default",
          clientId: this.options.clientId,
        });
        if (e2) return e2;
      }
      if ("cache-only" !== i2) {
        if (
          !(await (async (e2, t3 = 3) => {
            for (let i3 = 0; i3 < t3; i3++) if (await e2()) return true;
            return false;
          })(() => ee.acquireLock("auth0.lock.getTokenSilently", 5e3), 10))
        )
          throw new l();
        try {
          if (
            (window.addEventListener("pagehide", this._releaseLockOnPageHide),
            "off" !== i2)
          ) {
            const e3 = await this._getEntryFromCache({
              scope: o2.authorizationParams.scope,
              audience: o2.authorizationParams.audience || "default",
              clientId: this.options.clientId,
            });
            if (e3) return e3;
          }
          const e2 = this.options.useRefreshTokens
              ? await this._getTokenUsingRefreshToken(o2)
              : await this._getTokenFromIFrame(o2),
            {
              id_token: t3,
              access_token: n2,
              oauthTokenScope: a2,
              expires_in: r2,
            } = e2;
          return Object.assign(
            Object.assign(
              { id_token: t3, access_token: n2 },
              a2 ? { scope: a2 } : null
            ),
            { expires_in: r2 }
          );
        } finally {
          await ee.releaseLock("auth0.lock.getTokenSilently"),
            window.removeEventListener("pagehide", this._releaseLockOnPageHide);
        }
      }
    }
    async getTokenWithPopup(e2 = {}, t2 = {}) {
      var i2;
      const o2 = Object.assign(Object.assign({}, e2), {
        authorizationParams: Object.assign(
          Object.assign(
            Object.assign({}, this.options.authorizationParams),
            e2.authorizationParams
          ),
          {
            scope: j(
              this.scope,
              null === (i2 = e2.authorizationParams) || void 0 === i2
                ? void 0
                : i2.scope
            ),
          }
        ),
      });
      (t2 = Object.assign(Object.assign({}, r$2), t2)),
        await this.loginWithPopup(o2, t2);
      return (
        await this.cacheManager.get(
          new C({
            scope: o2.authorizationParams.scope,
            audience: o2.authorizationParams.audience || "default",
            clientId: this.options.clientId,
          })
        )
      ).access_token;
    }
    async isAuthenticated() {
      return !!(await this.getUser());
    }
    _buildLogoutUrl(t2) {
      null !== t2.clientId
        ? (t2.clientId = t2.clientId || this.options.clientId)
        : delete t2.clientId;
      const i2 = t2.logoutParams || {},
        { federated: o2 } = i2,
        n2 = e(i2, ["federated"]),
        a2 = o2 ? "&federated" : "";
      return (
        this._url(
          `/v2/logout?${v(Object.assign({ clientId: t2.clientId }, n2))}`
        ) + a2
      );
    }
    async logout(t2 = {}) {
      const i2 = Q(t2),
        { openUrl: o2 } = i2,
        n2 = e(i2, ["openUrl"]);
      null === t2.clientId
        ? await this.cacheManager.clear()
        : await this.cacheManager.clear(t2.clientId || this.options.clientId),
        this.cookieStorage.remove(this.orgHintCookieName, {
          cookieDomain: this.options.cookieDomain,
        }),
        this.cookieStorage.remove(this.isAuthenticatedCookieName, {
          cookieDomain: this.options.cookieDomain,
        }),
        this.userCache.remove("@@user@@");
      const a2 = this._buildLogoutUrl(n2);
      o2 ? await o2(a2) : false !== o2 && window.location.assign(a2);
    }
    async _getTokenFromIFrame(e2) {
      const t2 = Object.assign(Object.assign({}, e2.authorizationParams), {
          prompt: "none",
        }),
        i2 = this.cookieStorage.get(this.orgHintCookieName);
      i2 && !t2.organization && (t2.organization = i2);
      const {
        url: o2,
        state: n2,
        nonce: a2,
        code_verifier: r2,
        redirect_uri: s2,
        scope: c2,
        audience: u2,
      } = await this._prepareAuthorizeUrl(
        t2,
        { response_mode: "web_message" },
        window.location.origin
      );
      try {
        if (window.crossOriginIsolated)
          throw new d(
            "login_required",
            "The application is running in a Cross-Origin Isolated context, silently retrieving a token without refresh token is not possible."
          );
        const i3 =
            e2.timeoutInSeconds || this.options.authorizeTimeoutInSeconds,
          h2 = await ((e3, t3, i4 = 60) =>
            new Promise((o3, n3) => {
              const a3 = window.document.createElement("iframe");
              a3.setAttribute("width", "0"),
                a3.setAttribute("height", "0"),
                (a3.style.display = "none");
              const r3 = () => {
                window.document.body.contains(a3) &&
                  (window.document.body.removeChild(a3),
                  window.removeEventListener("message", s3, false));
              };
              let s3;
              const c3 = setTimeout(() => {
                n3(new l()), r3();
              }, 1e3 * i4);
              (s3 = function (e4) {
                if (e4.origin != t3) return;
                if (!e4.data || "authorization_response" !== e4.data.type)
                  return;
                const i5 = e4.source;
                i5 && i5.close(),
                  e4.data.response.error
                    ? n3(d.fromPayload(e4.data.response))
                    : o3(e4.data.response),
                  clearTimeout(c3),
                  window.removeEventListener("message", s3, false),
                  setTimeout(r3, 2e3);
              }),
                window.addEventListener("message", s3, false),
                window.document.body.appendChild(a3),
                a3.setAttribute("src", e3);
            }))(o2, this.domainUrl, i3);
        if (n2 !== h2.state) throw new d("state_mismatch", "Invalid state");
        const p2 = await this._requestToken(
          Object.assign(Object.assign({}, e2.authorizationParams), {
            code_verifier: r2,
            code: h2.code,
            grant_type: "authorization_code",
            redirect_uri: s2,
            timeout: e2.authorizationParams.timeout || this.httpTimeoutMs,
          }),
          { nonceIn: a2, organization: t2.organization }
        );
        return Object.assign(Object.assign({}, p2), {
          scope: c2,
          oauthTokenScope: p2.scope,
          audience: u2,
        });
      } catch (e3) {
        throw (
          ("login_required" === e3.error && this.logout({ openUrl: false }), e3)
        );
      }
    }
    async _getTokenUsingRefreshToken(e2) {
      const t2 = await this.cacheManager.get(
        new C({
          scope: e2.authorizationParams.scope,
          audience: e2.authorizationParams.audience || "default",
          clientId: this.options.clientId,
        })
      );
      if (!((t2 && t2.refresh_token) || this.worker)) {
        if (this.options.useRefreshTokensFallback)
          return await this._getTokenFromIFrame(e2);
        throw new f(
          e2.authorizationParams.audience || "default",
          e2.authorizationParams.scope
        );
      }
      const i2 =
          e2.authorizationParams.redirect_uri ||
          this.options.authorizationParams.redirect_uri ||
          window.location.origin,
        o2 =
          "number" == typeof e2.timeoutInSeconds
            ? 1e3 * e2.timeoutInSeconds
            : null;
      try {
        const n2 = await this._requestToken(
          Object.assign(
            Object.assign(Object.assign({}, e2.authorizationParams), {
              grant_type: "refresh_token",
              refresh_token: t2 && t2.refresh_token,
              redirect_uri: i2,
            }),
            o2 && { timeout: o2 }
          )
        );
        return Object.assign(Object.assign({}, n2), {
          scope: e2.authorizationParams.scope,
          oauthTokenScope: n2.scope,
          audience: e2.authorizationParams.audience || "default",
        });
      } catch (t3) {
        if (
          (t3.message.indexOf("Missing Refresh Token") > -1 ||
            (t3.message && t3.message.indexOf("invalid refresh token") > -1)) &&
          this.options.useRefreshTokensFallback
        )
          return await this._getTokenFromIFrame(e2);
        throw t3;
      }
    }
    async _saveEntryInCache(t2) {
      const { id_token: i2, decodedToken: o2 } = t2,
        n2 = e(t2, ["id_token", "decodedToken"]);
      this.userCache.set("@@user@@", { id_token: i2, decodedToken: o2 }),
        await this.cacheManager.setIdToken(
          this.options.clientId,
          t2.id_token,
          t2.decodedToken
        ),
        await this.cacheManager.set(n2);
    }
    async _getIdTokenFromCache() {
      const e2 = this.options.authorizationParams.audience || "default",
        t2 = await this.cacheManager.getIdToken(
          new C({
            clientId: this.options.clientId,
            audience: e2,
            scope: this.scope,
          })
        ),
        i2 = this.userCache.get("@@user@@");
      return t2 && t2.id_token === (null == i2 ? void 0 : i2.id_token)
        ? i2
        : (this.userCache.set("@@user@@", t2), t2);
    }
    async _getEntryFromCache({ scope: e2, audience: t2, clientId: i2 }) {
      const o2 = await this.cacheManager.get(
        new C({ scope: e2, audience: t2, clientId: i2 }),
        60
      );
      if (o2 && o2.access_token) {
        const { access_token: e3, oauthTokenScope: t3, expires_in: i3 } = o2,
          n2 = await this._getIdTokenFromCache();
        return (
          n2 &&
          Object.assign(
            Object.assign(
              { id_token: n2.id_token, access_token: e3 },
              t3 ? { scope: t3 } : null
            ),
            { expires_in: i3 }
          )
        );
      }
    }
    async _requestToken(e2, t2) {
      const { nonceIn: i2, organization: o2 } = t2 || {},
        n2 = await T(
          Object.assign(
            {
              baseUrl: this.domainUrl,
              client_id: this.options.clientId,
              auth0Client: this.options.auth0Client,
              useFormData: this.options.useFormData,
              timeout: this.httpTimeoutMs,
            },
            e2
          ),
          this.worker
        ),
        a2 = await this._verifyIdToken(n2.id_token, i2, o2);
      return (
        await this._saveEntryInCache(
          Object.assign(
            Object.assign(
              Object.assign(Object.assign({}, n2), {
                decodedToken: a2,
                scope: e2.scope,
                audience: e2.audience || "default",
              }),
              n2.scope ? { oauthTokenScope: n2.scope } : null
            ),
            { client_id: this.options.clientId }
          )
        ),
        this.cookieStorage.save(this.isAuthenticatedCookieName, true, {
          daysUntilExpire: this.sessionCheckExpiryDays,
          cookieDomain: this.options.cookieDomain,
        }),
        this._processOrgHint(o2 || a2.claims.org_id),
        Object.assign(Object.assign({}, n2), { decodedToken: a2 })
      );
    }
  }
  var initialAuthState = {
    isAuthenticated: false,
    isLoading: true,
  };
  var stub = function () {
    throw new Error("You forgot to wrap your component in <Auth0Provider>.");
  };
  var initialContext = __assign(__assign({}, initialAuthState), {
    buildAuthorizeUrl: stub,
    buildLogoutUrl: stub,
    getAccessTokenSilently: stub,
    getAccessTokenWithPopup: stub,
    getIdTokenClaims: stub,
    loginWithRedirect: stub,
    loginWithPopup: stub,
    logout: stub,
    handleRedirectCallback: stub,
  });
  var Auth0Context = reactExports.createContext(initialContext);
  var OAuthError =
    /** @class */
    (function (_super) {
      __extends(OAuthError2, _super);
      function OAuthError2(error, error_description) {
        var _this = _super.call(this, error_description || error) || this;
        _this.error = error;
        _this.error_description = error_description;
        Object.setPrototypeOf(_this, OAuthError2.prototype);
        return _this;
      }
      return OAuthError2;
    })(Error);
  var CODE_RE = /[?&]code=[^&]+/;
  var STATE_RE = /[?&]state=[^&]+/;
  var ERROR_RE = /[?&]error=[^&]+/;
  var hasAuthParams = function (searchParams) {
    if (searchParams === void 0) {
      searchParams = window.location.search;
    }
    return (
      (CODE_RE.test(searchParams) || ERROR_RE.test(searchParams)) &&
      STATE_RE.test(searchParams)
    );
  };
  var normalizeErrorFn = function (fallbackMessage) {
    return function (error) {
      if (error instanceof Error) {
        return error;
      }
      if (
        error !== null &&
        typeof error === "object" &&
        "error" in error &&
        typeof error.error === "string"
      ) {
        if (
          "error_description" in error &&
          typeof error.error_description === "string"
        ) {
          return new OAuthError(error.error, error.error_description);
        }
        return new OAuthError(error.error);
      }
      return new Error(fallbackMessage);
    };
  };
  var loginError = normalizeErrorFn("Login failed");
  var tokenError = normalizeErrorFn("Get access token failed");
  var deprecateRedirectUri = function (options) {
    var _a2;
    if (options === null || options === void 0 ? void 0 : options.redirectUri) {
      console.warn(
        "Using `redirectUri` has been deprecated, please use `authorizationParams.redirect_uri` instead as `redirectUri` will be no longer supported in a future version"
      );
      options.authorizationParams = options.authorizationParams || {};
      options.authorizationParams.redirect_uri = options.redirectUri;
      delete options.redirectUri;
    }
    if (
      (_a2 =
        options === null || options === void 0
          ? void 0
          : options.authorizationParams) === null || _a2 === void 0
        ? void 0
        : _a2.redirectUri
    ) {
      console.warn(
        "Using `authorizationParams.redirectUri` has been deprecated, please use `authorizationParams.redirect_uri` instead as `authorizationParams.redirectUri` will be removed in a future version"
      );
      options.authorizationParams.redirect_uri =
        options.authorizationParams.redirectUri;
      delete options.authorizationParams.redirectUri;
    }
  };
  var reducer = function (state, action) {
    switch (action.type) {
      case "LOGIN_POPUP_STARTED":
        return __assign(__assign({}, state), { isLoading: true });
      case "LOGIN_POPUP_COMPLETE":
      case "INITIALISED":
        return __assign(__assign({}, state), {
          isAuthenticated: !!action.user,
          user: action.user,
          isLoading: false,
          error: void 0,
        });
      case "HANDLE_REDIRECT_COMPLETE":
      case "GET_ACCESS_TOKEN_COMPLETE":
        if (state.user === action.user) {
          return state;
        }
        return __assign(__assign({}, state), {
          isAuthenticated: !!action.user,
          user: action.user,
        });
      case "LOGOUT":
        return __assign(__assign({}, state), {
          isAuthenticated: false,
          user: void 0,
        });
      case "ERROR":
        return __assign(__assign({}, state), {
          isLoading: false,
          error: action.error,
        });
    }
  };
  var toAuth0ClientOptions = function (opts) {
    deprecateRedirectUri(opts);
    return __assign(__assign({}, opts), {
      auth0Client: {
        name: "auth0-react",
        version: "2.2.4",
      },
    });
  };
  var defaultOnRedirectCallback = function (appState) {
    window.history.replaceState(
      {},
      document.title,
      (appState === null || appState === void 0 ? void 0 : appState.returnTo) ||
        window.location.pathname
    );
  };
  var Auth0Provider = function (opts) {
    var children = opts.children,
      skipRedirectCallback = opts.skipRedirectCallback,
      _a2 = opts.onRedirectCallback,
      onRedirectCallback = _a2 === void 0 ? defaultOnRedirectCallback : _a2,
      _b2 = opts.context,
      context = _b2 === void 0 ? Auth0Context : _b2,
      clientOpts = __rest(opts, [
        "children",
        "skipRedirectCallback",
        "onRedirectCallback",
        "context",
      ]);
    var client2 = reactExports.useState(function () {
      return new te(toAuth0ClientOptions(clientOpts));
    })[0];
    var _c2 = reactExports.useReducer(reducer, initialAuthState),
      state = _c2[0],
      dispatch = _c2[1];
    var didInitialise = reactExports.useRef(false);
    reactExports.useEffect(
      function () {
        if (didInitialise.current) {
          return;
        }
        didInitialise.current = true;
        (function () {
          return __awaiter(void 0, void 0, void 0, function () {
            var user, appState, error_1;
            return __generator(this, function (_a3) {
              switch (_a3.label) {
                case 0:
                  _a3.trys.push([0, 7, , 8]);
                  user = void 0;
                  if (!(hasAuthParams() && !skipRedirectCallback))
                    return [3, 3];
                  return [4, client2.handleRedirectCallback()];
                case 1:
                  appState = _a3.sent().appState;
                  return [4, client2.getUser()];
                case 2:
                  user = _a3.sent();
                  onRedirectCallback(appState, user);
                  return [3, 6];
                case 3:
                  return [4, client2.checkSession()];
                case 4:
                  _a3.sent();
                  return [4, client2.getUser()];
                case 5:
                  user = _a3.sent();
                  _a3.label = 6;
                case 6:
                  dispatch({ type: "INITIALISED", user });
                  return [3, 8];
                case 7:
                  error_1 = _a3.sent();
                  dispatch({ type: "ERROR", error: loginError(error_1) });
                  return [3, 8];
                case 8:
                  return [
                    2,
                    /*return*/
                  ];
              }
            });
          });
        })();
      },
      [client2, onRedirectCallback, skipRedirectCallback]
    );
    var loginWithRedirect = reactExports.useCallback(
      function (opts2) {
        deprecateRedirectUri(opts2);
        return client2.loginWithRedirect(opts2);
      },
      [client2]
    );
    var loginWithPopup = reactExports.useCallback(
      function (options, config) {
        return __awaiter(void 0, void 0, void 0, function () {
          var error_2, user;
          return __generator(this, function (_a3) {
            switch (_a3.label) {
              case 0:
                dispatch({ type: "LOGIN_POPUP_STARTED" });
                _a3.label = 1;
              case 1:
                _a3.trys.push([1, 3, , 4]);
                return [4, client2.loginWithPopup(options, config)];
              case 2:
                _a3.sent();
                return [3, 4];
              case 3:
                error_2 = _a3.sent();
                dispatch({ type: "ERROR", error: loginError(error_2) });
                return [
                  2,
                  /*return*/
                ];
              case 4:
                return [4, client2.getUser()];
              case 5:
                user = _a3.sent();
                dispatch({ type: "LOGIN_POPUP_COMPLETE", user });
                return [
                  2,
                  /*return*/
                ];
            }
          });
        });
      },
      [client2]
    );
    var logout = reactExports.useCallback(
      function (opts2) {
        if (opts2 === void 0) {
          opts2 = {};
        }
        return __awaiter(void 0, void 0, void 0, function () {
          return __generator(this, function (_a3) {
            switch (_a3.label) {
              case 0:
                return [4, client2.logout(opts2)];
              case 1:
                _a3.sent();
                if (opts2.openUrl || opts2.openUrl === false) {
                  dispatch({ type: "LOGOUT" });
                }
                return [
                  2,
                  /*return*/
                ];
            }
          });
        });
      },
      [client2]
    );
    var getAccessTokenSilently = reactExports.useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function (opts2) {
        return __awaiter(void 0, void 0, void 0, function () {
          var token, error_3, _a3;
          var _b3;
          return __generator(this, function (_c3) {
            switch (_c3.label) {
              case 0:
                _c3.trys.push([0, 2, 3, 5]);
                return [4, client2.getTokenSilently(opts2)];
              case 1:
                token = _c3.sent();
                return [3, 5];
              case 2:
                error_3 = _c3.sent();
                throw tokenError(error_3);
              case 3:
                _a3 = dispatch;
                _b3 = {
                  type: "GET_ACCESS_TOKEN_COMPLETE",
                };
                return [4, client2.getUser()];
              case 4:
                _a3.apply(void 0, [((_b3.user = _c3.sent()), _b3)]);
                return [
                  7,
                  /*endfinally*/
                ];
              case 5:
                return [2, token];
            }
          });
        });
      },
      [client2]
    );
    var getAccessTokenWithPopup = reactExports.useCallback(
      function (opts2, config) {
        return __awaiter(void 0, void 0, void 0, function () {
          var token, error_4, _a3;
          var _b3;
          return __generator(this, function (_c3) {
            switch (_c3.label) {
              case 0:
                _c3.trys.push([0, 2, 3, 5]);
                return [4, client2.getTokenWithPopup(opts2, config)];
              case 1:
                token = _c3.sent();
                return [3, 5];
              case 2:
                error_4 = _c3.sent();
                throw tokenError(error_4);
              case 3:
                _a3 = dispatch;
                _b3 = {
                  type: "GET_ACCESS_TOKEN_COMPLETE",
                };
                return [4, client2.getUser()];
              case 4:
                _a3.apply(void 0, [((_b3.user = _c3.sent()), _b3)]);
                return [
                  7,
                  /*endfinally*/
                ];
              case 5:
                return [2, token];
            }
          });
        });
      },
      [client2]
    );
    var getIdTokenClaims = reactExports.useCallback(
      function () {
        return client2.getIdTokenClaims();
      },
      [client2]
    );
    var handleRedirectCallback = reactExports.useCallback(
      function (url) {
        return __awaiter(void 0, void 0, void 0, function () {
          var error_5, _a3;
          var _b3;
          return __generator(this, function (_c3) {
            switch (_c3.label) {
              case 0:
                _c3.trys.push([0, 2, 3, 5]);
                return [4, client2.handleRedirectCallback(url)];
              case 1:
                return [2, _c3.sent()];
              case 2:
                error_5 = _c3.sent();
                throw tokenError(error_5);
              case 3:
                _a3 = dispatch;
                _b3 = {
                  type: "HANDLE_REDIRECT_COMPLETE",
                };
                return [4, client2.getUser()];
              case 4:
                _a3.apply(void 0, [((_b3.user = _c3.sent()), _b3)]);
                return [
                  7,
                  /*endfinally*/
                ];
              case 5:
                return [
                  2,
                  /*return*/
                ];
            }
          });
        });
      },
      [client2]
    );
    var contextValue = reactExports.useMemo(
      function () {
        return __assign(__assign({}, state), {
          getAccessTokenSilently,
          getAccessTokenWithPopup,
          getIdTokenClaims,
          loginWithRedirect,
          loginWithPopup,
          logout,
          handleRedirectCallback,
        });
      },
      [
        state,
        getAccessTokenSilently,
        getAccessTokenWithPopup,
        getIdTokenClaims,
        loginWithRedirect,
        loginWithPopup,
        logout,
        handleRedirectCallback,
      ]
    );
    return React.createElement(
      context.Provider,
      { value: contextValue },
      children
    );
  };
  var useAuth0 = function (context) {
    if (context === void 0) {
      context = Auth0Context;
    }
    return reactExports.useContext(context);
  };
  const useAuthToken = () => {
    const [token, setToken] = reactExports.useState(null);
    const { getAccessTokenSilently, isAuthenticated } = useAuth0();
    reactExports.useEffect(() => {
      if (isAuthenticated) {
        getAccessTokenSilently().then((token2) => {
          setToken(token2);
        });
      }
    }, [isAuthenticated, getAccessTokenSilently]);
    return token;
  };
  const DEFAULT_STATE = { x: 0, y: 0 };
  const DEFAULT_DRAG_INFO = {
    startX: 0,
    startY: 0,
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  };
  const useDrag = ({
    ref,
    calculateFor = "topLeft",
    defaultState = DEFAULT_STATE,
    onDragStop,
  }) => {
    const [dragInfo, setDragInfo] = reactExports.useState(DEFAULT_DRAG_INFO);
    const [finalPosition, setFinalPosition] =
      reactExports.useState(defaultState);
    const [isDragging, setIsDragging] = reactExports.useState(false);
    reactExports.useEffect(() => {
      if (isDragging === false) {
        onDragStop(finalPosition);
      }
    }, [isDragging]);
    const updateFinalPosition = reactExports.useCallback(
      (width, height, x2, y2) => {
        if (calculateFor === "bottomRight") {
          setFinalPosition({
            x: Math.max(
              Math.min(
                window.innerWidth - width,
                window.innerWidth - (x2 + width)
              ),
              0
            ),
            y: Math.max(
              Math.min(
                window.innerHeight - height,
                window.innerHeight - (y2 + height)
              ),
              0
            ),
          });
          return;
        }
        setFinalPosition({
          x: Math.min(Math.max(0, x2), window.innerWidth - width),
          y: Math.min(Math.max(0, y2), window.innerHeight - height),
        });
      },
      [calculateFor]
    );
    const handleMouseUp = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      setIsDragging(false);
    };
    const handleMouseDown = (evt) => {
      evt.preventDefault();
      if (!(evt.target instanceof HTMLElement)) return;
      if (evt.target.nodeName === "BUTTON") return;
      const { clientX, clientY } = evt;
      const { current: draggableElement } = ref;
      if (!draggableElement) {
        return;
      }
      const { top, left, width, height } =
        draggableElement.getBoundingClientRect();
      setIsDragging(true);
      setDragInfo({
        startX: clientX,
        startY: clientY,
        top,
        left,
        width,
        height,
      });
    };
    const handleMouseMove = reactExports.useCallback(
      (evt) => {
        const { current: draggableElement } = ref;
        if (!isDragging || !draggableElement) return;
        evt.preventDefault();
        const { clientX, clientY } = evt;
        const position = {
          x: dragInfo.startX - clientX,
          y: dragInfo.startY - clientY,
        };
        const { top, left, width, height } = dragInfo;
        updateFinalPosition(width, height, left - position.x, top - position.y);
      },
      [isDragging, dragInfo, ref, updateFinalPosition]
    );
    const recalculate = (width, height) => {
      const { current: draggableElement } = ref;
      if (!draggableElement) return;
      const {
        top,
        left,
        width: boundingWidth,
        height: boundingHeight,
      } = draggableElement.getBoundingClientRect();
      updateFinalPosition(
        width ?? boundingWidth,
        height ?? boundingHeight,
        left,
        top
      );
    };
    reactExports.useEffect(() => {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }, [handleMouseMove]);
    return {
      position: finalPosition,
      handleMouseDown,
      recalculate,
    };
  };
  var noop$3 = function () {};
  var isBrowser = typeof window !== "undefined";
  var useLocalStorage = function (key, initialValue, options) {
    if (!isBrowser) {
      return [initialValue, noop$3, noop$3];
    }
    if (!key) {
      throw new Error("useLocalStorage key may not be falsy");
    }
    var deserializer = options
      ? options.raw
        ? function (value) {
            return value;
          }
        : options.deserializer
      : JSON.parse;
    var initializer = reactExports.useRef(function (key2) {
      try {
        var serializer = options
          ? options.raw
            ? String
            : options.serializer
          : JSON.stringify;
        var localStorageValue = localStorage.getItem(key2);
        if (localStorageValue !== null) {
          return deserializer(localStorageValue);
        } else {
          initialValue && localStorage.setItem(key2, serializer(initialValue));
          return initialValue;
        }
      } catch (_a3) {
        return initialValue;
      }
    });
    var _a2 = reactExports.useState(function () {
        return initializer.current(key);
      }),
      state = _a2[0],
      setState = _a2[1];
    reactExports.useLayoutEffect(
      function () {
        return setState(initializer.current(key));
      },
      [key]
    );
    var set = reactExports.useCallback(
      function (valOrFunc) {
        try {
          var newState =
            typeof valOrFunc === "function" ? valOrFunc(state) : valOrFunc;
          if (typeof newState === "undefined") return;
          var value = void 0;
          if (options)
            if (options.raw)
              if (typeof newState === "string") value = newState;
              else value = JSON.stringify(newState);
            else if (options.serializer) value = options.serializer(newState);
            else value = JSON.stringify(newState);
          else value = JSON.stringify(newState);
          localStorage.setItem(key, value);
          setState(deserializer(value));
        } catch (_a3) {}
      },
      [key, setState]
    );
    var remove = reactExports.useCallback(
      function () {
        try {
          localStorage.removeItem(key);
          setState(void 0);
        } catch (_a3) {}
      },
      [key, setState]
    );
    return [state, set, remove];
  };
  const DraggableWindow = ({ children, id: id2 }) => {
    const [localStoragePosition, setLocalStoragePosition] = useLocalStorage(
      `draggable-window-${id2}`,
      {
        x: 0,
        y: 0,
      }
    );
    const draggableRef = reactExports.useRef(null);
    const { position, handleMouseDown } = useDrag({
      ref: draggableRef,
      defaultState: localStoragePosition,
      onDragStop: (position2) => {
        setLocalStoragePosition(position2);
      },
    });
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "ll-pointer-events-auto ll-absolute",
      ref: draggableRef,
      style: {
        top: position.y,
        left: position.x,
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        onMouseDown: handleMouseDown,
        children,
      }),
    });
  };
  const Timers = () => {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DraggableWindow, {
      id: "timers",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "ll-bg-slate-900 ll-text-white ll-w-[245px]",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "ll-p-2",
            children: "Timery",
          }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              children: "Nymphemonia - 22:00",
            }),
          }),
        ],
      }),
    });
  };
  function setRef(ref, value) {
    if (typeof ref === "function") {
      ref(value);
    } else if (ref !== null && ref !== void 0) {
      ref.current = value;
    }
  }
  function composeRefs(...refs) {
    return (node) => refs.forEach((ref) => setRef(ref, node));
  }
  var Slot = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    const childrenArray = reactExports.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (reactExports.Children.count(newElement) > 1)
            return reactExports.Children.only(null);
          return reactExports.isValidElement(newElement)
            ? newElement.props.children
            : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, {
        ...slotProps,
        ref: forwardedRef,
        children: reactExports.isValidElement(newElement)
          ? reactExports.cloneElement(newElement, void 0, newChildren)
          : null,
      });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, {
      ...slotProps,
      ref: forwardedRef,
      children,
    });
  });
  Slot.displayName = "Slot";
  var SlotClone = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    if (reactExports.isValidElement(children)) {
      const childrenRef = getElementRef(children);
      return reactExports.cloneElement(children, {
        ...mergeProps(slotProps, children.props),
        // @ts-ignore
        ref: forwardedRef
          ? composeRefs(forwardedRef, childrenRef)
          : childrenRef,
      });
    }
    return reactExports.Children.count(children) > 1
      ? reactExports.Children.only(null)
      : null;
  });
  SlotClone.displayName = "SlotClone";
  var Slottable = ({ children }) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, {
      children,
    });
  };
  function isSlottable(child) {
    return reactExports.isValidElement(child) && child.type === Slottable;
  }
  function mergeProps(slotProps, childProps) {
    const overrideProps = { ...childProps };
    for (const propName in childProps) {
      const slotPropValue = slotProps[propName];
      const childPropValue = childProps[propName];
      const isHandler = /^on[A-Z]/.test(propName);
      if (isHandler) {
        if (slotPropValue && childPropValue) {
          overrideProps[propName] = (...args) => {
            childPropValue(...args);
            slotPropValue(...args);
          };
        } else if (slotPropValue) {
          overrideProps[propName] = slotPropValue;
        }
      } else if (propName === "style") {
        overrideProps[propName] = { ...slotPropValue, ...childPropValue };
      } else if (propName === "className") {
        overrideProps[propName] = [slotPropValue, childPropValue]
          .filter(Boolean)
          .join(" ");
      }
    }
    return { ...slotProps, ...overrideProps };
  }
  function getElementRef(element) {
    var _a2, _b2;
    let getter =
      (_a2 = Object.getOwnPropertyDescriptor(element.props, "ref")) == null
        ? void 0
        : _a2.get;
    let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
    if (mayWarn) {
      return element.ref;
    }
    getter =
      (_b2 = Object.getOwnPropertyDescriptor(element, "ref")) == null
        ? void 0
        : _b2.get;
    mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
    if (mayWarn) {
      return element.props.ref;
    }
    return element.props.ref || element.ref;
  }
  function r$1(e2) {
    var t2,
      f2,
      n2 = "";
    if ("string" == typeof e2 || "number" == typeof e2) n2 += e2;
    else if ("object" == typeof e2)
      if (Array.isArray(e2))
        for (t2 = 0; t2 < e2.length; t2++)
          e2[t2] && (f2 = r$1(e2[t2])) && (n2 && (n2 += " "), (n2 += f2));
      else for (t2 in e2) e2[t2] && (n2 && (n2 += " "), (n2 += t2));
    return n2;
  }
  function clsx$1() {
    for (var e2, t2, f2 = 0, n2 = ""; f2 < arguments.length; )
      (e2 = arguments[f2++]) &&
        (t2 = r$1(e2)) &&
        (n2 && (n2 += " "), (n2 += t2));
    return n2;
  }
  const falsyToString = (value) =>
    typeof value === "boolean" ? "".concat(value) : value === 0 ? "0" : value;
  const cx = clsx$1;
  const cva = (base, config) => {
    return (props) => {
      var ref;
      if (
        (config === null || config === void 0 ? void 0 : config.variants) ==
        null
      )
        return cx(
          base,
          props === null || props === void 0 ? void 0 : props.class,
          props === null || props === void 0 ? void 0 : props.className
        );
      const { variants, defaultVariants } = config;
      const getVariantClassNames = Object.keys(variants).map((variant) => {
        const variantProp =
          props === null || props === void 0 ? void 0 : props[variant];
        const defaultVariantProp =
          defaultVariants === null || defaultVariants === void 0
            ? void 0
            : defaultVariants[variant];
        if (variantProp === null) return null;
        const variantKey =
          falsyToString(variantProp) || falsyToString(defaultVariantProp);
        return variants[variant][variantKey];
      });
      const propsWithoutUndefined =
        props &&
        Object.entries(props).reduce((acc, param) => {
          let [key, value] = param;
          if (value === void 0) {
            return acc;
          }
          acc[key] = value;
          return acc;
        }, {});
      const getCompoundVariantClassNames =
        config === null || config === void 0
          ? void 0
          : (ref = config.compoundVariants) === null || ref === void 0
          ? void 0
          : ref.reduce((acc, param1) => {
              let {
                class: cvClass,
                className: cvClassName,
                ...compoundVariantOptions
              } = param1;
              return Object.entries(compoundVariantOptions).every((param) => {
                let [key, value] = param;
                return Array.isArray(value)
                  ? value.includes(
                      {
                        ...defaultVariants,
                        ...propsWithoutUndefined,
                      }[key]
                    )
                  : {
                      ...defaultVariants,
                      ...propsWithoutUndefined,
                    }[key] === value;
              })
                ? [...acc, cvClass, cvClassName]
                : acc;
            }, []);
      return cx(
        base,
        getVariantClassNames,
        getCompoundVariantClassNames,
        props === null || props === void 0 ? void 0 : props.class,
        props === null || props === void 0 ? void 0 : props.className
      );
    };
  };
  function r(e2) {
    var t2,
      f2,
      n2 = "";
    if ("string" == typeof e2 || "number" == typeof e2) n2 += e2;
    else if ("object" == typeof e2)
      if (Array.isArray(e2)) {
        var o2 = e2.length;
        for (t2 = 0; t2 < o2; t2++)
          e2[t2] && (f2 = r(e2[t2])) && (n2 && (n2 += " "), (n2 += f2));
      } else for (f2 in e2) e2[f2] && (n2 && (n2 += " "), (n2 += f2));
    return n2;
  }
  function clsx() {
    for (var e2, t2, f2 = 0, n2 = "", o2 = arguments.length; f2 < o2; f2++)
      (e2 = arguments[f2]) && (t2 = r(e2)) && (n2 && (n2 += " "), (n2 += t2));
    return n2;
  }
  const CLASS_PART_SEPARATOR = "-";
  const createClassGroupUtils = (config) => {
    const classMap = createClassMap(config);
    const { conflictingClassGroups, conflictingClassGroupModifiers } = config;
    const getClassGroupId = (className) => {
      const classParts = className.split(CLASS_PART_SEPARATOR);
      if (classParts[0] === "" && classParts.length !== 1) {
        classParts.shift();
      }
      return (
        getGroupRecursive(classParts, classMap) ||
        getGroupIdForArbitraryProperty(className)
      );
    };
    const getConflictingClassGroupIds = (classGroupId, hasPostfixModifier) => {
      const conflicts = conflictingClassGroups[classGroupId] || [];
      if (hasPostfixModifier && conflictingClassGroupModifiers[classGroupId]) {
        return [...conflicts, ...conflictingClassGroupModifiers[classGroupId]];
      }
      return conflicts;
    };
    return {
      getClassGroupId,
      getConflictingClassGroupIds,
    };
  };
  const getGroupRecursive = (classParts, classPartObject) => {
    var _a2;
    if (classParts.length === 0) {
      return classPartObject.classGroupId;
    }
    const currentClassPart = classParts[0];
    const nextClassPartObject = classPartObject.nextPart.get(currentClassPart);
    const classGroupFromNextClassPart = nextClassPartObject
      ? getGroupRecursive(classParts.slice(1), nextClassPartObject)
      : void 0;
    if (classGroupFromNextClassPart) {
      return classGroupFromNextClassPart;
    }
    if (classPartObject.validators.length === 0) {
      return void 0;
    }
    const classRest = classParts.join(CLASS_PART_SEPARATOR);
    return (_a2 = classPartObject.validators.find(({ validator: validator2 }) =>
      validator2(classRest)
    )) == null
      ? void 0
      : _a2.classGroupId;
  };
  const arbitraryPropertyRegex = /^\[(.+)\]$/;
  const getGroupIdForArbitraryProperty = (className) => {
    if (arbitraryPropertyRegex.test(className)) {
      const arbitraryPropertyClassName =
        arbitraryPropertyRegex.exec(className)[1];
      const property =
        arbitraryPropertyClassName == null
          ? void 0
          : arbitraryPropertyClassName.substring(
              0,
              arbitraryPropertyClassName.indexOf(":")
            );
      if (property) {
        return "arbitrary.." + property;
      }
    }
  };
  const createClassMap = (config) => {
    const { theme, prefix } = config;
    const classMap = {
      nextPart: /* @__PURE__ */ new Map(),
      validators: [],
    };
    const prefixedClassGroupEntries = getPrefixedClassGroupEntries(
      Object.entries(config.classGroups),
      prefix
    );
    prefixedClassGroupEntries.forEach(([classGroupId, classGroup]) => {
      processClassesRecursively(classGroup, classMap, classGroupId, theme);
    });
    return classMap;
  };
  const processClassesRecursively = (
    classGroup,
    classPartObject,
    classGroupId,
    theme
  ) => {
    classGroup.forEach((classDefinition) => {
      if (typeof classDefinition === "string") {
        const classPartObjectToEdit =
          classDefinition === ""
            ? classPartObject
            : getPart(classPartObject, classDefinition);
        classPartObjectToEdit.classGroupId = classGroupId;
        return;
      }
      if (typeof classDefinition === "function") {
        if (isThemeGetter(classDefinition)) {
          processClassesRecursively(
            classDefinition(theme),
            classPartObject,
            classGroupId,
            theme
          );
          return;
        }
        classPartObject.validators.push({
          validator: classDefinition,
          classGroupId,
        });
        return;
      }
      Object.entries(classDefinition).forEach(([key, classGroup2]) => {
        processClassesRecursively(
          classGroup2,
          getPart(classPartObject, key),
          classGroupId,
          theme
        );
      });
    });
  };
  const getPart = (classPartObject, path) => {
    let currentClassPartObject = classPartObject;
    path.split(CLASS_PART_SEPARATOR).forEach((pathPart) => {
      if (!currentClassPartObject.nextPart.has(pathPart)) {
        currentClassPartObject.nextPart.set(pathPart, {
          nextPart: /* @__PURE__ */ new Map(),
          validators: [],
        });
      }
      currentClassPartObject = currentClassPartObject.nextPart.get(pathPart);
    });
    return currentClassPartObject;
  };
  const isThemeGetter = (func) => func.isThemeGetter;
  const getPrefixedClassGroupEntries = (classGroupEntries, prefix) => {
    if (!prefix) {
      return classGroupEntries;
    }
    return classGroupEntries.map(([classGroupId, classGroup]) => {
      const prefixedClassGroup = classGroup.map((classDefinition) => {
        if (typeof classDefinition === "string") {
          return prefix + classDefinition;
        }
        if (typeof classDefinition === "object") {
          return Object.fromEntries(
            Object.entries(classDefinition).map(([key, value]) => [
              prefix + key,
              value,
            ])
          );
        }
        return classDefinition;
      });
      return [classGroupId, prefixedClassGroup];
    });
  };
  const createLruCache = (maxCacheSize) => {
    if (maxCacheSize < 1) {
      return {
        get: () => void 0,
        set: () => {},
      };
    }
    let cacheSize = 0;
    let cache = /* @__PURE__ */ new Map();
    let previousCache = /* @__PURE__ */ new Map();
    const update = (key, value) => {
      cache.set(key, value);
      cacheSize++;
      if (cacheSize > maxCacheSize) {
        cacheSize = 0;
        previousCache = cache;
        cache = /* @__PURE__ */ new Map();
      }
    };
    return {
      get(key) {
        let value = cache.get(key);
        if (value !== void 0) {
          return value;
        }
        if ((value = previousCache.get(key)) !== void 0) {
          update(key, value);
          return value;
        }
      },
      set(key, value) {
        if (cache.has(key)) {
          cache.set(key, value);
        } else {
          update(key, value);
        }
      },
    };
  };
  const IMPORTANT_MODIFIER = "!";
  const createParseClassName = (config) => {
    const { separator, experimentalParseClassName } = config;
    const isSeparatorSingleCharacter = separator.length === 1;
    const firstSeparatorCharacter = separator[0];
    const separatorLength = separator.length;
    const parseClassName = (className) => {
      const modifiers = [];
      let bracketDepth = 0;
      let modifierStart = 0;
      let postfixModifierPosition;
      for (let index = 0; index < className.length; index++) {
        let currentCharacter = className[index];
        if (bracketDepth === 0) {
          if (
            currentCharacter === firstSeparatorCharacter &&
            (isSeparatorSingleCharacter ||
              className.slice(index, index + separatorLength) === separator)
          ) {
            modifiers.push(className.slice(modifierStart, index));
            modifierStart = index + separatorLength;
            continue;
          }
          if (currentCharacter === "/") {
            postfixModifierPosition = index;
            continue;
          }
        }
        if (currentCharacter === "[") {
          bracketDepth++;
        } else if (currentCharacter === "]") {
          bracketDepth--;
        }
      }
      const baseClassNameWithImportantModifier =
        modifiers.length === 0 ? className : className.substring(modifierStart);
      const hasImportantModifier =
        baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER);
      const baseClassName = hasImportantModifier
        ? baseClassNameWithImportantModifier.substring(1)
        : baseClassNameWithImportantModifier;
      const maybePostfixModifierPosition =
        postfixModifierPosition && postfixModifierPosition > modifierStart
          ? postfixModifierPosition - modifierStart
          : void 0;
      return {
        modifiers,
        hasImportantModifier,
        baseClassName,
        maybePostfixModifierPosition,
      };
    };
    if (experimentalParseClassName) {
      return (className) =>
        experimentalParseClassName({
          className,
          parseClassName,
        });
    }
    return parseClassName;
  };
  const sortModifiers = (modifiers) => {
    if (modifiers.length <= 1) {
      return modifiers;
    }
    const sortedModifiers = [];
    let unsortedModifiers = [];
    modifiers.forEach((modifier) => {
      const isArbitraryVariant = modifier[0] === "[";
      if (isArbitraryVariant) {
        sortedModifiers.push(...unsortedModifiers.sort(), modifier);
        unsortedModifiers = [];
      } else {
        unsortedModifiers.push(modifier);
      }
    });
    sortedModifiers.push(...unsortedModifiers.sort());
    return sortedModifiers;
  };
  const createConfigUtils = (config) => ({
    cache: createLruCache(config.cacheSize),
    parseClassName: createParseClassName(config),
    ...createClassGroupUtils(config),
  });
  const SPLIT_CLASSES_REGEX = /\s+/;
  const mergeClassList = (classList, configUtils) => {
    const { parseClassName, getClassGroupId, getConflictingClassGroupIds } =
      configUtils;
    const classGroupsInConflict = [];
    const classNames = classList.trim().split(SPLIT_CLASSES_REGEX);
    let result = "";
    for (let index = classNames.length - 1; index >= 0; index -= 1) {
      const originalClassName = classNames[index];
      const {
        modifiers,
        hasImportantModifier,
        baseClassName,
        maybePostfixModifierPosition,
      } = parseClassName(originalClassName);
      let hasPostfixModifier = Boolean(maybePostfixModifierPosition);
      let classGroupId = getClassGroupId(
        hasPostfixModifier
          ? baseClassName.substring(0, maybePostfixModifierPosition)
          : baseClassName
      );
      if (!classGroupId) {
        if (!hasPostfixModifier) {
          result =
            originalClassName + (result.length > 0 ? " " + result : result);
          continue;
        }
        classGroupId = getClassGroupId(baseClassName);
        if (!classGroupId) {
          result =
            originalClassName + (result.length > 0 ? " " + result : result);
          continue;
        }
        hasPostfixModifier = false;
      }
      const variantModifier = sortModifiers(modifiers).join(":");
      const modifierId = hasImportantModifier
        ? variantModifier + IMPORTANT_MODIFIER
        : variantModifier;
      const classId = modifierId + classGroupId;
      if (classGroupsInConflict.includes(classId)) {
        continue;
      }
      classGroupsInConflict.push(classId);
      const conflictGroups = getConflictingClassGroupIds(
        classGroupId,
        hasPostfixModifier
      );
      for (let i2 = 0; i2 < conflictGroups.length; ++i2) {
        const group = conflictGroups[i2];
        classGroupsInConflict.push(modifierId + group);
      }
      result = originalClassName + (result.length > 0 ? " " + result : result);
    }
    return result;
  };
  function twJoin() {
    let index = 0;
    let argument;
    let resolvedValue;
    let string = "";
    while (index < arguments.length) {
      if ((argument = arguments[index++])) {
        if ((resolvedValue = toValue(argument))) {
          string && (string += " ");
          string += resolvedValue;
        }
      }
    }
    return string;
  }
  const toValue = (mix) => {
    if (typeof mix === "string") {
      return mix;
    }
    let resolvedValue;
    let string = "";
    for (let k2 = 0; k2 < mix.length; k2++) {
      if (mix[k2]) {
        if ((resolvedValue = toValue(mix[k2]))) {
          string && (string += " ");
          string += resolvedValue;
        }
      }
    }
    return string;
  };
  function createTailwindMerge(createConfigFirst, ...createConfigRest) {
    let configUtils;
    let cacheGet;
    let cacheSet;
    let functionToCall = initTailwindMerge;
    function initTailwindMerge(classList) {
      const config = createConfigRest.reduce(
        (previousConfig, createConfigCurrent) =>
          createConfigCurrent(previousConfig),
        createConfigFirst()
      );
      configUtils = createConfigUtils(config);
      cacheGet = configUtils.cache.get;
      cacheSet = configUtils.cache.set;
      functionToCall = tailwindMerge;
      return tailwindMerge(classList);
    }
    function tailwindMerge(classList) {
      const cachedResult = cacheGet(classList);
      if (cachedResult) {
        return cachedResult;
      }
      const result = mergeClassList(classList, configUtils);
      cacheSet(classList, result);
      return result;
    }
    return function callTailwindMerge() {
      return functionToCall(twJoin.apply(null, arguments));
    };
  }
  const fromTheme = (key) => {
    const themeGetter = (theme) => theme[key] || [];
    themeGetter.isThemeGetter = true;
    return themeGetter;
  };
  const arbitraryValueRegex = /^\[(?:([a-z-]+):)?(.+)\]$/i;
  const fractionRegex = /^\d+\/\d+$/;
  const stringLengths = /* @__PURE__ */ new Set(["px", "full", "screen"]);
  const tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
  const lengthUnitRegex =
    /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
  const colorFunctionRegex = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/;
  const shadowRegex =
    /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
  const imageRegex =
    /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
  const isLength = (value) =>
    isNumber$1(value) || stringLengths.has(value) || fractionRegex.test(value);
  const isArbitraryLength = (value) =>
    getIsArbitraryValue(value, "length", isLengthOnly);
  const isNumber$1 = (value) => Boolean(value) && !Number.isNaN(Number(value));
  const isArbitraryNumber = (value) =>
    getIsArbitraryValue(value, "number", isNumber$1);
  const isInteger = (value) =>
    Boolean(value) && Number.isInteger(Number(value));
  const isPercent = (value) =>
    value.endsWith("%") && isNumber$1(value.slice(0, -1));
  const isArbitraryValue = (value) => arbitraryValueRegex.test(value);
  const isTshirtSize = (value) => tshirtUnitRegex.test(value);
  const sizeLabels = /* @__PURE__ */ new Set(["length", "size", "percentage"]);
  const isArbitrarySize = (value) =>
    getIsArbitraryValue(value, sizeLabels, isNever);
  const isArbitraryPosition = (value) =>
    getIsArbitraryValue(value, "position", isNever);
  const imageLabels = /* @__PURE__ */ new Set(["image", "url"]);
  const isArbitraryImage = (value) =>
    getIsArbitraryValue(value, imageLabels, isImage);
  const isArbitraryShadow = (value) => getIsArbitraryValue(value, "", isShadow);
  const isAny = () => true;
  const getIsArbitraryValue = (value, label, testValue) => {
    const result = arbitraryValueRegex.exec(value);
    if (result) {
      if (result[1]) {
        return typeof label === "string"
          ? result[1] === label
          : label.has(result[1]);
      }
      return testValue(result[2]);
    }
    return false;
  };
  const isLengthOnly = (value) =>
    // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
    // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
    // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
    lengthUnitRegex.test(value) && !colorFunctionRegex.test(value);
  const isNever = () => false;
  const isShadow = (value) => shadowRegex.test(value);
  const isImage = (value) => imageRegex.test(value);
  const getDefaultConfig = () => {
    const colors = fromTheme("colors");
    const spacing = fromTheme("spacing");
    const blur = fromTheme("blur");
    const brightness = fromTheme("brightness");
    const borderColor = fromTheme("borderColor");
    const borderRadius = fromTheme("borderRadius");
    const borderSpacing = fromTheme("borderSpacing");
    const borderWidth = fromTheme("borderWidth");
    const contrast = fromTheme("contrast");
    const grayscale = fromTheme("grayscale");
    const hueRotate = fromTheme("hueRotate");
    const invert = fromTheme("invert");
    const gap = fromTheme("gap");
    const gradientColorStops = fromTheme("gradientColorStops");
    const gradientColorStopPositions = fromTheme("gradientColorStopPositions");
    const inset = fromTheme("inset");
    const margin = fromTheme("margin");
    const opacity = fromTheme("opacity");
    const padding = fromTheme("padding");
    const saturate = fromTheme("saturate");
    const scale = fromTheme("scale");
    const sepia = fromTheme("sepia");
    const skew = fromTheme("skew");
    const space = fromTheme("space");
    const translate = fromTheme("translate");
    const getOverscroll = () => ["auto", "contain", "none"];
    const getOverflow = () => ["auto", "hidden", "clip", "visible", "scroll"];
    const getSpacingWithAutoAndArbitrary = () => [
      "auto",
      isArbitraryValue,
      spacing,
    ];
    const getSpacingWithArbitrary = () => [isArbitraryValue, spacing];
    const getLengthWithEmptyAndArbitrary = () => [
      "",
      isLength,
      isArbitraryLength,
    ];
    const getNumberWithAutoAndArbitrary = () => [
      "auto",
      isNumber$1,
      isArbitraryValue,
    ];
    const getPositions = () => [
      "bottom",
      "center",
      "left",
      "left-bottom",
      "left-top",
      "right",
      "right-bottom",
      "right-top",
      "top",
    ];
    const getLineStyles = () => ["solid", "dashed", "dotted", "double", "none"];
    const getBlendModes = () => [
      "normal",
      "multiply",
      "screen",
      "overlay",
      "darken",
      "lighten",
      "color-dodge",
      "color-burn",
      "hard-light",
      "soft-light",
      "difference",
      "exclusion",
      "hue",
      "saturation",
      "color",
      "luminosity",
    ];
    const getAlign = () => [
      "start",
      "end",
      "center",
      "between",
      "around",
      "evenly",
      "stretch",
    ];
    const getZeroAndEmpty = () => ["", "0", isArbitraryValue];
    const getBreaks = () => [
      "auto",
      "avoid",
      "all",
      "avoid-page",
      "page",
      "left",
      "right",
      "column",
    ];
    const getNumberAndArbitrary = () => [isNumber$1, isArbitraryValue];
    return {
      cacheSize: 500,
      separator: ":",
      theme: {
        colors: [isAny],
        spacing: [isLength, isArbitraryLength],
        blur: ["none", "", isTshirtSize, isArbitraryValue],
        brightness: getNumberAndArbitrary(),
        borderColor: [colors],
        borderRadius: ["none", "", "full", isTshirtSize, isArbitraryValue],
        borderSpacing: getSpacingWithArbitrary(),
        borderWidth: getLengthWithEmptyAndArbitrary(),
        contrast: getNumberAndArbitrary(),
        grayscale: getZeroAndEmpty(),
        hueRotate: getNumberAndArbitrary(),
        invert: getZeroAndEmpty(),
        gap: getSpacingWithArbitrary(),
        gradientColorStops: [colors],
        gradientColorStopPositions: [isPercent, isArbitraryLength],
        inset: getSpacingWithAutoAndArbitrary(),
        margin: getSpacingWithAutoAndArbitrary(),
        opacity: getNumberAndArbitrary(),
        padding: getSpacingWithArbitrary(),
        saturate: getNumberAndArbitrary(),
        scale: getNumberAndArbitrary(),
        sepia: getZeroAndEmpty(),
        skew: getNumberAndArbitrary(),
        space: getSpacingWithArbitrary(),
        translate: getSpacingWithArbitrary(),
      },
      classGroups: {
        // Layout
        /**
         * Aspect Ratio
         * @see https://tailwindcss.com/docs/aspect-ratio
         */
        aspect: [
          {
            aspect: ["auto", "square", "video", isArbitraryValue],
          },
        ],
        /**
         * Container
         * @see https://tailwindcss.com/docs/container
         */
        container: ["container"],
        /**
         * Columns
         * @see https://tailwindcss.com/docs/columns
         */
        columns: [
          {
            columns: [isTshirtSize],
          },
        ],
        /**
         * Break After
         * @see https://tailwindcss.com/docs/break-after
         */
        "break-after": [
          {
            "break-after": getBreaks(),
          },
        ],
        /**
         * Break Before
         * @see https://tailwindcss.com/docs/break-before
         */
        "break-before": [
          {
            "break-before": getBreaks(),
          },
        ],
        /**
         * Break Inside
         * @see https://tailwindcss.com/docs/break-inside
         */
        "break-inside": [
          {
            "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"],
          },
        ],
        /**
         * Box Decoration Break
         * @see https://tailwindcss.com/docs/box-decoration-break
         */
        "box-decoration": [
          {
            "box-decoration": ["slice", "clone"],
          },
        ],
        /**
         * Box Sizing
         * @see https://tailwindcss.com/docs/box-sizing
         */
        box: [
          {
            box: ["border", "content"],
          },
        ],
        /**
         * Display
         * @see https://tailwindcss.com/docs/display
         */
        display: [
          "block",
          "inline-block",
          "inline",
          "flex",
          "inline-flex",
          "table",
          "inline-table",
          "table-caption",
          "table-cell",
          "table-column",
          "table-column-group",
          "table-footer-group",
          "table-header-group",
          "table-row-group",
          "table-row",
          "flow-root",
          "grid",
          "inline-grid",
          "contents",
          "list-item",
          "hidden",
        ],
        /**
         * Floats
         * @see https://tailwindcss.com/docs/float
         */
        float: [
          {
            float: ["right", "left", "none", "start", "end"],
          },
        ],
        /**
         * Clear
         * @see https://tailwindcss.com/docs/clear
         */
        clear: [
          {
            clear: ["left", "right", "both", "none", "start", "end"],
          },
        ],
        /**
         * Isolation
         * @see https://tailwindcss.com/docs/isolation
         */
        isolation: ["isolate", "isolation-auto"],
        /**
         * Object Fit
         * @see https://tailwindcss.com/docs/object-fit
         */
        "object-fit": [
          {
            object: ["contain", "cover", "fill", "none", "scale-down"],
          },
        ],
        /**
         * Object Position
         * @see https://tailwindcss.com/docs/object-position
         */
        "object-position": [
          {
            object: [...getPositions(), isArbitraryValue],
          },
        ],
        /**
         * Overflow
         * @see https://tailwindcss.com/docs/overflow
         */
        overflow: [
          {
            overflow: getOverflow(),
          },
        ],
        /**
         * Overflow X
         * @see https://tailwindcss.com/docs/overflow
         */
        "overflow-x": [
          {
            "overflow-x": getOverflow(),
          },
        ],
        /**
         * Overflow Y
         * @see https://tailwindcss.com/docs/overflow
         */
        "overflow-y": [
          {
            "overflow-y": getOverflow(),
          },
        ],
        /**
         * Overscroll Behavior
         * @see https://tailwindcss.com/docs/overscroll-behavior
         */
        overscroll: [
          {
            overscroll: getOverscroll(),
          },
        ],
        /**
         * Overscroll Behavior X
         * @see https://tailwindcss.com/docs/overscroll-behavior
         */
        "overscroll-x": [
          {
            "overscroll-x": getOverscroll(),
          },
        ],
        /**
         * Overscroll Behavior Y
         * @see https://tailwindcss.com/docs/overscroll-behavior
         */
        "overscroll-y": [
          {
            "overscroll-y": getOverscroll(),
          },
        ],
        /**
         * Position
         * @see https://tailwindcss.com/docs/position
         */
        position: ["static", "fixed", "absolute", "relative", "sticky"],
        /**
         * Top / Right / Bottom / Left
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        inset: [
          {
            inset: [inset],
          },
        ],
        /**
         * Right / Left
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        "inset-x": [
          {
            "inset-x": [inset],
          },
        ],
        /**
         * Top / Bottom
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        "inset-y": [
          {
            "inset-y": [inset],
          },
        ],
        /**
         * Start
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        start: [
          {
            start: [inset],
          },
        ],
        /**
         * End
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        end: [
          {
            end: [inset],
          },
        ],
        /**
         * Top
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        top: [
          {
            top: [inset],
          },
        ],
        /**
         * Right
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        right: [
          {
            right: [inset],
          },
        ],
        /**
         * Bottom
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        bottom: [
          {
            bottom: [inset],
          },
        ],
        /**
         * Left
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        left: [
          {
            left: [inset],
          },
        ],
        /**
         * Visibility
         * @see https://tailwindcss.com/docs/visibility
         */
        visibility: ["visible", "invisible", "collapse"],
        /**
         * Z-Index
         * @see https://tailwindcss.com/docs/z-index
         */
        z: [
          {
            z: ["auto", isInteger, isArbitraryValue],
          },
        ],
        // Flexbox and Grid
        /**
         * Flex Basis
         * @see https://tailwindcss.com/docs/flex-basis
         */
        basis: [
          {
            basis: getSpacingWithAutoAndArbitrary(),
          },
        ],
        /**
         * Flex Direction
         * @see https://tailwindcss.com/docs/flex-direction
         */
        "flex-direction": [
          {
            flex: ["row", "row-reverse", "col", "col-reverse"],
          },
        ],
        /**
         * Flex Wrap
         * @see https://tailwindcss.com/docs/flex-wrap
         */
        "flex-wrap": [
          {
            flex: ["wrap", "wrap-reverse", "nowrap"],
          },
        ],
        /**
         * Flex
         * @see https://tailwindcss.com/docs/flex
         */
        flex: [
          {
            flex: ["1", "auto", "initial", "none", isArbitraryValue],
          },
        ],
        /**
         * Flex Grow
         * @see https://tailwindcss.com/docs/flex-grow
         */
        grow: [
          {
            grow: getZeroAndEmpty(),
          },
        ],
        /**
         * Flex Shrink
         * @see https://tailwindcss.com/docs/flex-shrink
         */
        shrink: [
          {
            shrink: getZeroAndEmpty(),
          },
        ],
        /**
         * Order
         * @see https://tailwindcss.com/docs/order
         */
        order: [
          {
            order: ["first", "last", "none", isInteger, isArbitraryValue],
          },
        ],
        /**
         * Grid Template Columns
         * @see https://tailwindcss.com/docs/grid-template-columns
         */
        "grid-cols": [
          {
            "grid-cols": [isAny],
          },
        ],
        /**
         * Grid Column Start / End
         * @see https://tailwindcss.com/docs/grid-column
         */
        "col-start-end": [
          {
            col: [
              "auto",
              {
                span: ["full", isInteger, isArbitraryValue],
              },
              isArbitraryValue,
            ],
          },
        ],
        /**
         * Grid Column Start
         * @see https://tailwindcss.com/docs/grid-column
         */
        "col-start": [
          {
            "col-start": getNumberWithAutoAndArbitrary(),
          },
        ],
        /**
         * Grid Column End
         * @see https://tailwindcss.com/docs/grid-column
         */
        "col-end": [
          {
            "col-end": getNumberWithAutoAndArbitrary(),
          },
        ],
        /**
         * Grid Template Rows
         * @see https://tailwindcss.com/docs/grid-template-rows
         */
        "grid-rows": [
          {
            "grid-rows": [isAny],
          },
        ],
        /**
         * Grid Row Start / End
         * @see https://tailwindcss.com/docs/grid-row
         */
        "row-start-end": [
          {
            row: [
              "auto",
              {
                span: [isInteger, isArbitraryValue],
              },
              isArbitraryValue,
            ],
          },
        ],
        /**
         * Grid Row Start
         * @see https://tailwindcss.com/docs/grid-row
         */
        "row-start": [
          {
            "row-start": getNumberWithAutoAndArbitrary(),
          },
        ],
        /**
         * Grid Row End
         * @see https://tailwindcss.com/docs/grid-row
         */
        "row-end": [
          {
            "row-end": getNumberWithAutoAndArbitrary(),
          },
        ],
        /**
         * Grid Auto Flow
         * @see https://tailwindcss.com/docs/grid-auto-flow
         */
        "grid-flow": [
          {
            "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"],
          },
        ],
        /**
         * Grid Auto Columns
         * @see https://tailwindcss.com/docs/grid-auto-columns
         */
        "auto-cols": [
          {
            "auto-cols": ["auto", "min", "max", "fr", isArbitraryValue],
          },
        ],
        /**
         * Grid Auto Rows
         * @see https://tailwindcss.com/docs/grid-auto-rows
         */
        "auto-rows": [
          {
            "auto-rows": ["auto", "min", "max", "fr", isArbitraryValue],
          },
        ],
        /**
         * Gap
         * @see https://tailwindcss.com/docs/gap
         */
        gap: [
          {
            gap: [gap],
          },
        ],
        /**
         * Gap X
         * @see https://tailwindcss.com/docs/gap
         */
        "gap-x": [
          {
            "gap-x": [gap],
          },
        ],
        /**
         * Gap Y
         * @see https://tailwindcss.com/docs/gap
         */
        "gap-y": [
          {
            "gap-y": [gap],
          },
        ],
        /**
         * Justify Content
         * @see https://tailwindcss.com/docs/justify-content
         */
        "justify-content": [
          {
            justify: ["normal", ...getAlign()],
          },
        ],
        /**
         * Justify Items
         * @see https://tailwindcss.com/docs/justify-items
         */
        "justify-items": [
          {
            "justify-items": ["start", "end", "center", "stretch"],
          },
        ],
        /**
         * Justify Self
         * @see https://tailwindcss.com/docs/justify-self
         */
        "justify-self": [
          {
            "justify-self": ["auto", "start", "end", "center", "stretch"],
          },
        ],
        /**
         * Align Content
         * @see https://tailwindcss.com/docs/align-content
         */
        "align-content": [
          {
            content: ["normal", ...getAlign(), "baseline"],
          },
        ],
        /**
         * Align Items
         * @see https://tailwindcss.com/docs/align-items
         */
        "align-items": [
          {
            items: ["start", "end", "center", "baseline", "stretch"],
          },
        ],
        /**
         * Align Self
         * @see https://tailwindcss.com/docs/align-self
         */
        "align-self": [
          {
            self: ["auto", "start", "end", "center", "stretch", "baseline"],
          },
        ],
        /**
         * Place Content
         * @see https://tailwindcss.com/docs/place-content
         */
        "place-content": [
          {
            "place-content": [...getAlign(), "baseline"],
          },
        ],
        /**
         * Place Items
         * @see https://tailwindcss.com/docs/place-items
         */
        "place-items": [
          {
            "place-items": ["start", "end", "center", "baseline", "stretch"],
          },
        ],
        /**
         * Place Self
         * @see https://tailwindcss.com/docs/place-self
         */
        "place-self": [
          {
            "place-self": ["auto", "start", "end", "center", "stretch"],
          },
        ],
        // Spacing
        /**
         * Padding
         * @see https://tailwindcss.com/docs/padding
         */
        p: [
          {
            p: [padding],
          },
        ],
        /**
         * Padding X
         * @see https://tailwindcss.com/docs/padding
         */
        px: [
          {
            px: [padding],
          },
        ],
        /**
         * Padding Y
         * @see https://tailwindcss.com/docs/padding
         */
        py: [
          {
            py: [padding],
          },
        ],
        /**
         * Padding Start
         * @see https://tailwindcss.com/docs/padding
         */
        ps: [
          {
            ps: [padding],
          },
        ],
        /**
         * Padding End
         * @see https://tailwindcss.com/docs/padding
         */
        pe: [
          {
            pe: [padding],
          },
        ],
        /**
         * Padding Top
         * @see https://tailwindcss.com/docs/padding
         */
        pt: [
          {
            pt: [padding],
          },
        ],
        /**
         * Padding Right
         * @see https://tailwindcss.com/docs/padding
         */
        pr: [
          {
            pr: [padding],
          },
        ],
        /**
         * Padding Bottom
         * @see https://tailwindcss.com/docs/padding
         */
        pb: [
          {
            pb: [padding],
          },
        ],
        /**
         * Padding Left
         * @see https://tailwindcss.com/docs/padding
         */
        pl: [
          {
            pl: [padding],
          },
        ],
        /**
         * Margin
         * @see https://tailwindcss.com/docs/margin
         */
        m: [
          {
            m: [margin],
          },
        ],
        /**
         * Margin X
         * @see https://tailwindcss.com/docs/margin
         */
        mx: [
          {
            mx: [margin],
          },
        ],
        /**
         * Margin Y
         * @see https://tailwindcss.com/docs/margin
         */
        my: [
          {
            my: [margin],
          },
        ],
        /**
         * Margin Start
         * @see https://tailwindcss.com/docs/margin
         */
        ms: [
          {
            ms: [margin],
          },
        ],
        /**
         * Margin End
         * @see https://tailwindcss.com/docs/margin
         */
        me: [
          {
            me: [margin],
          },
        ],
        /**
         * Margin Top
         * @see https://tailwindcss.com/docs/margin
         */
        mt: [
          {
            mt: [margin],
          },
        ],
        /**
         * Margin Right
         * @see https://tailwindcss.com/docs/margin
         */
        mr: [
          {
            mr: [margin],
          },
        ],
        /**
         * Margin Bottom
         * @see https://tailwindcss.com/docs/margin
         */
        mb: [
          {
            mb: [margin],
          },
        ],
        /**
         * Margin Left
         * @see https://tailwindcss.com/docs/margin
         */
        ml: [
          {
            ml: [margin],
          },
        ],
        /**
         * Space Between X
         * @see https://tailwindcss.com/docs/space
         */
        "space-x": [
          {
            "space-x": [space],
          },
        ],
        /**
         * Space Between X Reverse
         * @see https://tailwindcss.com/docs/space
         */
        "space-x-reverse": ["space-x-reverse"],
        /**
         * Space Between Y
         * @see https://tailwindcss.com/docs/space
         */
        "space-y": [
          {
            "space-y": [space],
          },
        ],
        /**
         * Space Between Y Reverse
         * @see https://tailwindcss.com/docs/space
         */
        "space-y-reverse": ["space-y-reverse"],
        // Sizing
        /**
         * Width
         * @see https://tailwindcss.com/docs/width
         */
        w: [
          {
            w: [
              "auto",
              "min",
              "max",
              "fit",
              "svw",
              "lvw",
              "dvw",
              isArbitraryValue,
              spacing,
            ],
          },
        ],
        /**
         * Min-Width
         * @see https://tailwindcss.com/docs/min-width
         */
        "min-w": [
          {
            "min-w": [isArbitraryValue, spacing, "min", "max", "fit"],
          },
        ],
        /**
         * Max-Width
         * @see https://tailwindcss.com/docs/max-width
         */
        "max-w": [
          {
            "max-w": [
              isArbitraryValue,
              spacing,
              "none",
              "full",
              "min",
              "max",
              "fit",
              "prose",
              {
                screen: [isTshirtSize],
              },
              isTshirtSize,
            ],
          },
        ],
        /**
         * Height
         * @see https://tailwindcss.com/docs/height
         */
        h: [
          {
            h: [
              isArbitraryValue,
              spacing,
              "auto",
              "min",
              "max",
              "fit",
              "svh",
              "lvh",
              "dvh",
            ],
          },
        ],
        /**
         * Min-Height
         * @see https://tailwindcss.com/docs/min-height
         */
        "min-h": [
          {
            "min-h": [
              isArbitraryValue,
              spacing,
              "min",
              "max",
              "fit",
              "svh",
              "lvh",
              "dvh",
            ],
          },
        ],
        /**
         * Max-Height
         * @see https://tailwindcss.com/docs/max-height
         */
        "max-h": [
          {
            "max-h": [
              isArbitraryValue,
              spacing,
              "min",
              "max",
              "fit",
              "svh",
              "lvh",
              "dvh",
            ],
          },
        ],
        /**
         * Size
         * @see https://tailwindcss.com/docs/size
         */
        size: [
          {
            size: [isArbitraryValue, spacing, "auto", "min", "max", "fit"],
          },
        ],
        // Typography
        /**
         * Font Size
         * @see https://tailwindcss.com/docs/font-size
         */
        "font-size": [
          {
            text: ["base", isTshirtSize, isArbitraryLength],
          },
        ],
        /**
         * Font Smoothing
         * @see https://tailwindcss.com/docs/font-smoothing
         */
        "font-smoothing": ["antialiased", "subpixel-antialiased"],
        /**
         * Font Style
         * @see https://tailwindcss.com/docs/font-style
         */
        "font-style": ["italic", "not-italic"],
        /**
         * Font Weight
         * @see https://tailwindcss.com/docs/font-weight
         */
        "font-weight": [
          {
            font: [
              "thin",
              "extralight",
              "light",
              "normal",
              "medium",
              "semibold",
              "bold",
              "extrabold",
              "black",
              isArbitraryNumber,
            ],
          },
        ],
        /**
         * Font Family
         * @see https://tailwindcss.com/docs/font-family
         */
        "font-family": [
          {
            font: [isAny],
          },
        ],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-normal": ["normal-nums"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-ordinal": ["ordinal"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-slashed-zero": ["slashed-zero"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-figure": ["lining-nums", "oldstyle-nums"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-spacing": ["proportional-nums", "tabular-nums"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-fraction": ["diagonal-fractions", "stacked-fractons"],
        /**
         * Letter Spacing
         * @see https://tailwindcss.com/docs/letter-spacing
         */
        tracking: [
          {
            tracking: [
              "tighter",
              "tight",
              "normal",
              "wide",
              "wider",
              "widest",
              isArbitraryValue,
            ],
          },
        ],
        /**
         * Line Clamp
         * @see https://tailwindcss.com/docs/line-clamp
         */
        "line-clamp": [
          {
            "line-clamp": ["none", isNumber$1, isArbitraryNumber],
          },
        ],
        /**
         * Line Height
         * @see https://tailwindcss.com/docs/line-height
         */
        leading: [
          {
            leading: [
              "none",
              "tight",
              "snug",
              "normal",
              "relaxed",
              "loose",
              isLength,
              isArbitraryValue,
            ],
          },
        ],
        /**
         * List Style Image
         * @see https://tailwindcss.com/docs/list-style-image
         */
        "list-image": [
          {
            "list-image": ["none", isArbitraryValue],
          },
        ],
        /**
         * List Style Type
         * @see https://tailwindcss.com/docs/list-style-type
         */
        "list-style-type": [
          {
            list: ["none", "disc", "decimal", isArbitraryValue],
          },
        ],
        /**
         * List Style Position
         * @see https://tailwindcss.com/docs/list-style-position
         */
        "list-style-position": [
          {
            list: ["inside", "outside"],
          },
        ],
        /**
         * Placeholder Color
         * @deprecated since Tailwind CSS v3.0.0
         * @see https://tailwindcss.com/docs/placeholder-color
         */
        "placeholder-color": [
          {
            placeholder: [colors],
          },
        ],
        /**
         * Placeholder Opacity
         * @see https://tailwindcss.com/docs/placeholder-opacity
         */
        "placeholder-opacity": [
          {
            "placeholder-opacity": [opacity],
          },
        ],
        /**
         * Text Alignment
         * @see https://tailwindcss.com/docs/text-align
         */
        "text-alignment": [
          {
            text: ["left", "center", "right", "justify", "start", "end"],
          },
        ],
        /**
         * Text Color
         * @see https://tailwindcss.com/docs/text-color
         */
        "text-color": [
          {
            text: [colors],
          },
        ],
        /**
         * Text Opacity
         * @see https://tailwindcss.com/docs/text-opacity
         */
        "text-opacity": [
          {
            "text-opacity": [opacity],
          },
        ],
        /**
         * Text Decoration
         * @see https://tailwindcss.com/docs/text-decoration
         */
        "text-decoration": [
          "underline",
          "overline",
          "line-through",
          "no-underline",
        ],
        /**
         * Text Decoration Style
         * @see https://tailwindcss.com/docs/text-decoration-style
         */
        "text-decoration-style": [
          {
            decoration: [...getLineStyles(), "wavy"],
          },
        ],
        /**
         * Text Decoration Thickness
         * @see https://tailwindcss.com/docs/text-decoration-thickness
         */
        "text-decoration-thickness": [
          {
            decoration: ["auto", "from-font", isLength, isArbitraryLength],
          },
        ],
        /**
         * Text Underline Offset
         * @see https://tailwindcss.com/docs/text-underline-offset
         */
        "underline-offset": [
          {
            "underline-offset": ["auto", isLength, isArbitraryValue],
          },
        ],
        /**
         * Text Decoration Color
         * @see https://tailwindcss.com/docs/text-decoration-color
         */
        "text-decoration-color": [
          {
            decoration: [colors],
          },
        ],
        /**
         * Text Transform
         * @see https://tailwindcss.com/docs/text-transform
         */
        "text-transform": [
          "uppercase",
          "lowercase",
          "capitalize",
          "normal-case",
        ],
        /**
         * Text Overflow
         * @see https://tailwindcss.com/docs/text-overflow
         */
        "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
        /**
         * Text Wrap
         * @see https://tailwindcss.com/docs/text-wrap
         */
        "text-wrap": [
          {
            text: ["wrap", "nowrap", "balance", "pretty"],
          },
        ],
        /**
         * Text Indent
         * @see https://tailwindcss.com/docs/text-indent
         */
        indent: [
          {
            indent: getSpacingWithArbitrary(),
          },
        ],
        /**
         * Vertical Alignment
         * @see https://tailwindcss.com/docs/vertical-align
         */
        "vertical-align": [
          {
            align: [
              "baseline",
              "top",
              "middle",
              "bottom",
              "text-top",
              "text-bottom",
              "sub",
              "super",
              isArbitraryValue,
            ],
          },
        ],
        /**
         * Whitespace
         * @see https://tailwindcss.com/docs/whitespace
         */
        whitespace: [
          {
            whitespace: [
              "normal",
              "nowrap",
              "pre",
              "pre-line",
              "pre-wrap",
              "break-spaces",
            ],
          },
        ],
        /**
         * Word Break
         * @see https://tailwindcss.com/docs/word-break
         */
        break: [
          {
            break: ["normal", "words", "all", "keep"],
          },
        ],
        /**
         * Hyphens
         * @see https://tailwindcss.com/docs/hyphens
         */
        hyphens: [
          {
            hyphens: ["none", "manual", "auto"],
          },
        ],
        /**
         * Content
         * @see https://tailwindcss.com/docs/content
         */
        content: [
          {
            content: ["none", isArbitraryValue],
          },
        ],
        // Backgrounds
        /**
         * Background Attachment
         * @see https://tailwindcss.com/docs/background-attachment
         */
        "bg-attachment": [
          {
            bg: ["fixed", "local", "scroll"],
          },
        ],
        /**
         * Background Clip
         * @see https://tailwindcss.com/docs/background-clip
         */
        "bg-clip": [
          {
            "bg-clip": ["border", "padding", "content", "text"],
          },
        ],
        /**
         * Background Opacity
         * @deprecated since Tailwind CSS v3.0.0
         * @see https://tailwindcss.com/docs/background-opacity
         */
        "bg-opacity": [
          {
            "bg-opacity": [opacity],
          },
        ],
        /**
         * Background Origin
         * @see https://tailwindcss.com/docs/background-origin
         */
        "bg-origin": [
          {
            "bg-origin": ["border", "padding", "content"],
          },
        ],
        /**
         * Background Position
         * @see https://tailwindcss.com/docs/background-position
         */
        "bg-position": [
          {
            bg: [...getPositions(), isArbitraryPosition],
          },
        ],
        /**
         * Background Repeat
         * @see https://tailwindcss.com/docs/background-repeat
         */
        "bg-repeat": [
          {
            bg: [
              "no-repeat",
              {
                repeat: ["", "x", "y", "round", "space"],
              },
            ],
          },
        ],
        /**
         * Background Size
         * @see https://tailwindcss.com/docs/background-size
         */
        "bg-size": [
          {
            bg: ["auto", "cover", "contain", isArbitrarySize],
          },
        ],
        /**
         * Background Image
         * @see https://tailwindcss.com/docs/background-image
         */
        "bg-image": [
          {
            bg: [
              "none",
              {
                "gradient-to": ["t", "tr", "r", "br", "b", "bl", "l", "tl"],
              },
              isArbitraryImage,
            ],
          },
        ],
        /**
         * Background Color
         * @see https://tailwindcss.com/docs/background-color
         */
        "bg-color": [
          {
            bg: [colors],
          },
        ],
        /**
         * Gradient Color Stops From Position
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-from-pos": [
          {
            from: [gradientColorStopPositions],
          },
        ],
        /**
         * Gradient Color Stops Via Position
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-via-pos": [
          {
            via: [gradientColorStopPositions],
          },
        ],
        /**
         * Gradient Color Stops To Position
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-to-pos": [
          {
            to: [gradientColorStopPositions],
          },
        ],
        /**
         * Gradient Color Stops From
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-from": [
          {
            from: [gradientColorStops],
          },
        ],
        /**
         * Gradient Color Stops Via
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-via": [
          {
            via: [gradientColorStops],
          },
        ],
        /**
         * Gradient Color Stops To
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-to": [
          {
            to: [gradientColorStops],
          },
        ],
        // Borders
        /**
         * Border Radius
         * @see https://tailwindcss.com/docs/border-radius
         */
        rounded: [
          {
            rounded: [borderRadius],
          },
        ],
        /**
         * Border Radius Start
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-s": [
          {
            "rounded-s": [borderRadius],
          },
        ],
        /**
         * Border Radius End
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-e": [
          {
            "rounded-e": [borderRadius],
          },
        ],
        /**
         * Border Radius Top
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-t": [
          {
            "rounded-t": [borderRadius],
          },
        ],
        /**
         * Border Radius Right
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-r": [
          {
            "rounded-r": [borderRadius],
          },
        ],
        /**
         * Border Radius Bottom
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-b": [
          {
            "rounded-b": [borderRadius],
          },
        ],
        /**
         * Border Radius Left
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-l": [
          {
            "rounded-l": [borderRadius],
          },
        ],
        /**
         * Border Radius Start Start
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-ss": [
          {
            "rounded-ss": [borderRadius],
          },
        ],
        /**
         * Border Radius Start End
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-se": [
          {
            "rounded-se": [borderRadius],
          },
        ],
        /**
         * Border Radius End End
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-ee": [
          {
            "rounded-ee": [borderRadius],
          },
        ],
        /**
         * Border Radius End Start
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-es": [
          {
            "rounded-es": [borderRadius],
          },
        ],
        /**
         * Border Radius Top Left
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-tl": [
          {
            "rounded-tl": [borderRadius],
          },
        ],
        /**
         * Border Radius Top Right
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-tr": [
          {
            "rounded-tr": [borderRadius],
          },
        ],
        /**
         * Border Radius Bottom Right
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-br": [
          {
            "rounded-br": [borderRadius],
          },
        ],
        /**
         * Border Radius Bottom Left
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-bl": [
          {
            "rounded-bl": [borderRadius],
          },
        ],
        /**
         * Border Width
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w": [
          {
            border: [borderWidth],
          },
        ],
        /**
         * Border Width X
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-x": [
          {
            "border-x": [borderWidth],
          },
        ],
        /**
         * Border Width Y
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-y": [
          {
            "border-y": [borderWidth],
          },
        ],
        /**
         * Border Width Start
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-s": [
          {
            "border-s": [borderWidth],
          },
        ],
        /**
         * Border Width End
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-e": [
          {
            "border-e": [borderWidth],
          },
        ],
        /**
         * Border Width Top
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-t": [
          {
            "border-t": [borderWidth],
          },
        ],
        /**
         * Border Width Right
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-r": [
          {
            "border-r": [borderWidth],
          },
        ],
        /**
         * Border Width Bottom
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-b": [
          {
            "border-b": [borderWidth],
          },
        ],
        /**
         * Border Width Left
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-l": [
          {
            "border-l": [borderWidth],
          },
        ],
        /**
         * Border Opacity
         * @see https://tailwindcss.com/docs/border-opacity
         */
        "border-opacity": [
          {
            "border-opacity": [opacity],
          },
        ],
        /**
         * Border Style
         * @see https://tailwindcss.com/docs/border-style
         */
        "border-style": [
          {
            border: [...getLineStyles(), "hidden"],
          },
        ],
        /**
         * Divide Width X
         * @see https://tailwindcss.com/docs/divide-width
         */
        "divide-x": [
          {
            "divide-x": [borderWidth],
          },
        ],
        /**
         * Divide Width X Reverse
         * @see https://tailwindcss.com/docs/divide-width
         */
        "divide-x-reverse": ["divide-x-reverse"],
        /**
         * Divide Width Y
         * @see https://tailwindcss.com/docs/divide-width
         */
        "divide-y": [
          {
            "divide-y": [borderWidth],
          },
        ],
        /**
         * Divide Width Y Reverse
         * @see https://tailwindcss.com/docs/divide-width
         */
        "divide-y-reverse": ["divide-y-reverse"],
        /**
         * Divide Opacity
         * @see https://tailwindcss.com/docs/divide-opacity
         */
        "divide-opacity": [
          {
            "divide-opacity": [opacity],
          },
        ],
        /**
         * Divide Style
         * @see https://tailwindcss.com/docs/divide-style
         */
        "divide-style": [
          {
            divide: getLineStyles(),
          },
        ],
        /**
         * Border Color
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color": [
          {
            border: [borderColor],
          },
        ],
        /**
         * Border Color X
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-x": [
          {
            "border-x": [borderColor],
          },
        ],
        /**
         * Border Color Y
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-y": [
          {
            "border-y": [borderColor],
          },
        ],
        /**
         * Border Color S
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-s": [
          {
            "border-s": [borderColor],
          },
        ],
        /**
         * Border Color E
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-e": [
          {
            "border-e": [borderColor],
          },
        ],
        /**
         * Border Color Top
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-t": [
          {
            "border-t": [borderColor],
          },
        ],
        /**
         * Border Color Right
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-r": [
          {
            "border-r": [borderColor],
          },
        ],
        /**
         * Border Color Bottom
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-b": [
          {
            "border-b": [borderColor],
          },
        ],
        /**
         * Border Color Left
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-l": [
          {
            "border-l": [borderColor],
          },
        ],
        /**
         * Divide Color
         * @see https://tailwindcss.com/docs/divide-color
         */
        "divide-color": [
          {
            divide: [borderColor],
          },
        ],
        /**
         * Outline Style
         * @see https://tailwindcss.com/docs/outline-style
         */
        "outline-style": [
          {
            outline: ["", ...getLineStyles()],
          },
        ],
        /**
         * Outline Offset
         * @see https://tailwindcss.com/docs/outline-offset
         */
        "outline-offset": [
          {
            "outline-offset": [isLength, isArbitraryValue],
          },
        ],
        /**
         * Outline Width
         * @see https://tailwindcss.com/docs/outline-width
         */
        "outline-w": [
          {
            outline: [isLength, isArbitraryLength],
          },
        ],
        /**
         * Outline Color
         * @see https://tailwindcss.com/docs/outline-color
         */
        "outline-color": [
          {
            outline: [colors],
          },
        ],
        /**
         * Ring Width
         * @see https://tailwindcss.com/docs/ring-width
         */
        "ring-w": [
          {
            ring: getLengthWithEmptyAndArbitrary(),
          },
        ],
        /**
         * Ring Width Inset
         * @see https://tailwindcss.com/docs/ring-width
         */
        "ring-w-inset": ["ring-inset"],
        /**
         * Ring Color
         * @see https://tailwindcss.com/docs/ring-color
         */
        "ring-color": [
          {
            ring: [colors],
          },
        ],
        /**
         * Ring Opacity
         * @see https://tailwindcss.com/docs/ring-opacity
         */
        "ring-opacity": [
          {
            "ring-opacity": [opacity],
          },
        ],
        /**
         * Ring Offset Width
         * @see https://tailwindcss.com/docs/ring-offset-width
         */
        "ring-offset-w": [
          {
            "ring-offset": [isLength, isArbitraryLength],
          },
        ],
        /**
         * Ring Offset Color
         * @see https://tailwindcss.com/docs/ring-offset-color
         */
        "ring-offset-color": [
          {
            "ring-offset": [colors],
          },
        ],
        // Effects
        /**
         * Box Shadow
         * @see https://tailwindcss.com/docs/box-shadow
         */
        shadow: [
          {
            shadow: ["", "inner", "none", isTshirtSize, isArbitraryShadow],
          },
        ],
        /**
         * Box Shadow Color
         * @see https://tailwindcss.com/docs/box-shadow-color
         */
        "shadow-color": [
          {
            shadow: [isAny],
          },
        ],
        /**
         * Opacity
         * @see https://tailwindcss.com/docs/opacity
         */
        opacity: [
          {
            opacity: [opacity],
          },
        ],
        /**
         * Mix Blend Mode
         * @see https://tailwindcss.com/docs/mix-blend-mode
         */
        "mix-blend": [
          {
            "mix-blend": [...getBlendModes(), "plus-lighter", "plus-darker"],
          },
        ],
        /**
         * Background Blend Mode
         * @see https://tailwindcss.com/docs/background-blend-mode
         */
        "bg-blend": [
          {
            "bg-blend": getBlendModes(),
          },
        ],
        // Filters
        /**
         * Filter
         * @deprecated since Tailwind CSS v3.0.0
         * @see https://tailwindcss.com/docs/filter
         */
        filter: [
          {
            filter: ["", "none"],
          },
        ],
        /**
         * Blur
         * @see https://tailwindcss.com/docs/blur
         */
        blur: [
          {
            blur: [blur],
          },
        ],
        /**
         * Brightness
         * @see https://tailwindcss.com/docs/brightness
         */
        brightness: [
          {
            brightness: [brightness],
          },
        ],
        /**
         * Contrast
         * @see https://tailwindcss.com/docs/contrast
         */
        contrast: [
          {
            contrast: [contrast],
          },
        ],
        /**
         * Drop Shadow
         * @see https://tailwindcss.com/docs/drop-shadow
         */
        "drop-shadow": [
          {
            "drop-shadow": ["", "none", isTshirtSize, isArbitraryValue],
          },
        ],
        /**
         * Grayscale
         * @see https://tailwindcss.com/docs/grayscale
         */
        grayscale: [
          {
            grayscale: [grayscale],
          },
        ],
        /**
         * Hue Rotate
         * @see https://tailwindcss.com/docs/hue-rotate
         */
        "hue-rotate": [
          {
            "hue-rotate": [hueRotate],
          },
        ],
        /**
         * Invert
         * @see https://tailwindcss.com/docs/invert
         */
        invert: [
          {
            invert: [invert],
          },
        ],
        /**
         * Saturate
         * @see https://tailwindcss.com/docs/saturate
         */
        saturate: [
          {
            saturate: [saturate],
          },
        ],
        /**
         * Sepia
         * @see https://tailwindcss.com/docs/sepia
         */
        sepia: [
          {
            sepia: [sepia],
          },
        ],
        /**
         * Backdrop Filter
         * @deprecated since Tailwind CSS v3.0.0
         * @see https://tailwindcss.com/docs/backdrop-filter
         */
        "backdrop-filter": [
          {
            "backdrop-filter": ["", "none"],
          },
        ],
        /**
         * Backdrop Blur
         * @see https://tailwindcss.com/docs/backdrop-blur
         */
        "backdrop-blur": [
          {
            "backdrop-blur": [blur],
          },
        ],
        /**
         * Backdrop Brightness
         * @see https://tailwindcss.com/docs/backdrop-brightness
         */
        "backdrop-brightness": [
          {
            "backdrop-brightness": [brightness],
          },
        ],
        /**
         * Backdrop Contrast
         * @see https://tailwindcss.com/docs/backdrop-contrast
         */
        "backdrop-contrast": [
          {
            "backdrop-contrast": [contrast],
          },
        ],
        /**
         * Backdrop Grayscale
         * @see https://tailwindcss.com/docs/backdrop-grayscale
         */
        "backdrop-grayscale": [
          {
            "backdrop-grayscale": [grayscale],
          },
        ],
        /**
         * Backdrop Hue Rotate
         * @see https://tailwindcss.com/docs/backdrop-hue-rotate
         */
        "backdrop-hue-rotate": [
          {
            "backdrop-hue-rotate": [hueRotate],
          },
        ],
        /**
         * Backdrop Invert
         * @see https://tailwindcss.com/docs/backdrop-invert
         */
        "backdrop-invert": [
          {
            "backdrop-invert": [invert],
          },
        ],
        /**
         * Backdrop Opacity
         * @see https://tailwindcss.com/docs/backdrop-opacity
         */
        "backdrop-opacity": [
          {
            "backdrop-opacity": [opacity],
          },
        ],
        /**
         * Backdrop Saturate
         * @see https://tailwindcss.com/docs/backdrop-saturate
         */
        "backdrop-saturate": [
          {
            "backdrop-saturate": [saturate],
          },
        ],
        /**
         * Backdrop Sepia
         * @see https://tailwindcss.com/docs/backdrop-sepia
         */
        "backdrop-sepia": [
          {
            "backdrop-sepia": [sepia],
          },
        ],
        // Tables
        /**
         * Border Collapse
         * @see https://tailwindcss.com/docs/border-collapse
         */
        "border-collapse": [
          {
            border: ["collapse", "separate"],
          },
        ],
        /**
         * Border Spacing
         * @see https://tailwindcss.com/docs/border-spacing
         */
        "border-spacing": [
          {
            "border-spacing": [borderSpacing],
          },
        ],
        /**
         * Border Spacing X
         * @see https://tailwindcss.com/docs/border-spacing
         */
        "border-spacing-x": [
          {
            "border-spacing-x": [borderSpacing],
          },
        ],
        /**
         * Border Spacing Y
         * @see https://tailwindcss.com/docs/border-spacing
         */
        "border-spacing-y": [
          {
            "border-spacing-y": [borderSpacing],
          },
        ],
        /**
         * Table Layout
         * @see https://tailwindcss.com/docs/table-layout
         */
        "table-layout": [
          {
            table: ["auto", "fixed"],
          },
        ],
        /**
         * Caption Side
         * @see https://tailwindcss.com/docs/caption-side
         */
        caption: [
          {
            caption: ["top", "bottom"],
          },
        ],
        // Transitions and Animation
        /**
         * Tranisition Property
         * @see https://tailwindcss.com/docs/transition-property
         */
        transition: [
          {
            transition: [
              "none",
              "all",
              "",
              "colors",
              "opacity",
              "shadow",
              "transform",
              isArbitraryValue,
            ],
          },
        ],
        /**
         * Transition Duration
         * @see https://tailwindcss.com/docs/transition-duration
         */
        duration: [
          {
            duration: getNumberAndArbitrary(),
          },
        ],
        /**
         * Transition Timing Function
         * @see https://tailwindcss.com/docs/transition-timing-function
         */
        ease: [
          {
            ease: ["linear", "in", "out", "in-out", isArbitraryValue],
          },
        ],
        /**
         * Transition Delay
         * @see https://tailwindcss.com/docs/transition-delay
         */
        delay: [
          {
            delay: getNumberAndArbitrary(),
          },
        ],
        /**
         * Animation
         * @see https://tailwindcss.com/docs/animation
         */
        animate: [
          {
            animate: [
              "none",
              "spin",
              "ping",
              "pulse",
              "bounce",
              isArbitraryValue,
            ],
          },
        ],
        // Transforms
        /**
         * Transform
         * @see https://tailwindcss.com/docs/transform
         */
        transform: [
          {
            transform: ["", "gpu", "none"],
          },
        ],
        /**
         * Scale
         * @see https://tailwindcss.com/docs/scale
         */
        scale: [
          {
            scale: [scale],
          },
        ],
        /**
         * Scale X
         * @see https://tailwindcss.com/docs/scale
         */
        "scale-x": [
          {
            "scale-x": [scale],
          },
        ],
        /**
         * Scale Y
         * @see https://tailwindcss.com/docs/scale
         */
        "scale-y": [
          {
            "scale-y": [scale],
          },
        ],
        /**
         * Rotate
         * @see https://tailwindcss.com/docs/rotate
         */
        rotate: [
          {
            rotate: [isInteger, isArbitraryValue],
          },
        ],
        /**
         * Translate X
         * @see https://tailwindcss.com/docs/translate
         */
        "translate-x": [
          {
            "translate-x": [translate],
          },
        ],
        /**
         * Translate Y
         * @see https://tailwindcss.com/docs/translate
         */
        "translate-y": [
          {
            "translate-y": [translate],
          },
        ],
        /**
         * Skew X
         * @see https://tailwindcss.com/docs/skew
         */
        "skew-x": [
          {
            "skew-x": [skew],
          },
        ],
        /**
         * Skew Y
         * @see https://tailwindcss.com/docs/skew
         */
        "skew-y": [
          {
            "skew-y": [skew],
          },
        ],
        /**
         * Transform Origin
         * @see https://tailwindcss.com/docs/transform-origin
         */
        "transform-origin": [
          {
            origin: [
              "center",
              "top",
              "top-right",
              "right",
              "bottom-right",
              "bottom",
              "bottom-left",
              "left",
              "top-left",
              isArbitraryValue,
            ],
          },
        ],
        // Interactivity
        /**
         * Accent Color
         * @see https://tailwindcss.com/docs/accent-color
         */
        accent: [
          {
            accent: ["auto", colors],
          },
        ],
        /**
         * Appearance
         * @see https://tailwindcss.com/docs/appearance
         */
        appearance: [
          {
            appearance: ["none", "auto"],
          },
        ],
        /**
         * Cursor
         * @see https://tailwindcss.com/docs/cursor
         */
        cursor: [
          {
            cursor: [
              "auto",
              "default",
              "pointer",
              "wait",
              "text",
              "move",
              "help",
              "not-allowed",
              "none",
              "context-menu",
              "progress",
              "cell",
              "crosshair",
              "vertical-text",
              "alias",
              "copy",
              "no-drop",
              "grab",
              "grabbing",
              "all-scroll",
              "col-resize",
              "row-resize",
              "n-resize",
              "e-resize",
              "s-resize",
              "w-resize",
              "ne-resize",
              "nw-resize",
              "se-resize",
              "sw-resize",
              "ew-resize",
              "ns-resize",
              "nesw-resize",
              "nwse-resize",
              "zoom-in",
              "zoom-out",
              isArbitraryValue,
            ],
          },
        ],
        /**
         * Caret Color
         * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
         */
        "caret-color": [
          {
            caret: [colors],
          },
        ],
        /**
         * Pointer Events
         * @see https://tailwindcss.com/docs/pointer-events
         */
        "pointer-events": [
          {
            "pointer-events": ["none", "auto"],
          },
        ],
        /**
         * Resize
         * @see https://tailwindcss.com/docs/resize
         */
        resize: [
          {
            resize: ["none", "y", "x", ""],
          },
        ],
        /**
         * Scroll Behavior
         * @see https://tailwindcss.com/docs/scroll-behavior
         */
        "scroll-behavior": [
          {
            scroll: ["auto", "smooth"],
          },
        ],
        /**
         * Scroll Margin
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-m": [
          {
            "scroll-m": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Margin X
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-mx": [
          {
            "scroll-mx": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Margin Y
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-my": [
          {
            "scroll-my": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Margin Start
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-ms": [
          {
            "scroll-ms": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Margin End
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-me": [
          {
            "scroll-me": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Margin Top
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-mt": [
          {
            "scroll-mt": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Margin Right
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-mr": [
          {
            "scroll-mr": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Margin Bottom
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-mb": [
          {
            "scroll-mb": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Margin Left
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-ml": [
          {
            "scroll-ml": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Padding
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-p": [
          {
            "scroll-p": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Padding X
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-px": [
          {
            "scroll-px": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Padding Y
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-py": [
          {
            "scroll-py": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Padding Start
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-ps": [
          {
            "scroll-ps": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Padding End
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pe": [
          {
            "scroll-pe": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Padding Top
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pt": [
          {
            "scroll-pt": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Padding Right
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pr": [
          {
            "scroll-pr": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Padding Bottom
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pb": [
          {
            "scroll-pb": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Padding Left
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pl": [
          {
            "scroll-pl": getSpacingWithArbitrary(),
          },
        ],
        /**
         * Scroll Snap Align
         * @see https://tailwindcss.com/docs/scroll-snap-align
         */
        "snap-align": [
          {
            snap: ["start", "end", "center", "align-none"],
          },
        ],
        /**
         * Scroll Snap Stop
         * @see https://tailwindcss.com/docs/scroll-snap-stop
         */
        "snap-stop": [
          {
            snap: ["normal", "always"],
          },
        ],
        /**
         * Scroll Snap Type
         * @see https://tailwindcss.com/docs/scroll-snap-type
         */
        "snap-type": [
          {
            snap: ["none", "x", "y", "both"],
          },
        ],
        /**
         * Scroll Snap Type Strictness
         * @see https://tailwindcss.com/docs/scroll-snap-type
         */
        "snap-strictness": [
          {
            snap: ["mandatory", "proximity"],
          },
        ],
        /**
         * Touch Action
         * @see https://tailwindcss.com/docs/touch-action
         */
        touch: [
          {
            touch: ["auto", "none", "manipulation"],
          },
        ],
        /**
         * Touch Action X
         * @see https://tailwindcss.com/docs/touch-action
         */
        "touch-x": [
          {
            "touch-pan": ["x", "left", "right"],
          },
        ],
        /**
         * Touch Action Y
         * @see https://tailwindcss.com/docs/touch-action
         */
        "touch-y": [
          {
            "touch-pan": ["y", "up", "down"],
          },
        ],
        /**
         * Touch Action Pinch Zoom
         * @see https://tailwindcss.com/docs/touch-action
         */
        "touch-pz": ["touch-pinch-zoom"],
        /**
         * User Select
         * @see https://tailwindcss.com/docs/user-select
         */
        select: [
          {
            select: ["none", "text", "all", "auto"],
          },
        ],
        /**
         * Will Change
         * @see https://tailwindcss.com/docs/will-change
         */
        "will-change": [
          {
            "will-change": [
              "auto",
              "scroll",
              "contents",
              "transform",
              isArbitraryValue,
            ],
          },
        ],
        // SVG
        /**
         * Fill
         * @see https://tailwindcss.com/docs/fill
         */
        fill: [
          {
            fill: [colors, "none"],
          },
        ],
        /**
         * Stroke Width
         * @see https://tailwindcss.com/docs/stroke-width
         */
        "stroke-w": [
          {
            stroke: [isLength, isArbitraryLength, isArbitraryNumber],
          },
        ],
        /**
         * Stroke
         * @see https://tailwindcss.com/docs/stroke
         */
        stroke: [
          {
            stroke: [colors, "none"],
          },
        ],
        // Accessibility
        /**
         * Screen Readers
         * @see https://tailwindcss.com/docs/screen-readers
         */
        sr: ["sr-only", "not-sr-only"],
        /**
         * Forced Color Adjust
         * @see https://tailwindcss.com/docs/forced-color-adjust
         */
        "forced-color-adjust": [
          {
            "forced-color-adjust": ["auto", "none"],
          },
        ],
      },
      conflictingClassGroups: {
        overflow: ["overflow-x", "overflow-y"],
        overscroll: ["overscroll-x", "overscroll-y"],
        inset: [
          "inset-x",
          "inset-y",
          "start",
          "end",
          "top",
          "right",
          "bottom",
          "left",
        ],
        "inset-x": ["right", "left"],
        "inset-y": ["top", "bottom"],
        flex: ["basis", "grow", "shrink"],
        gap: ["gap-x", "gap-y"],
        p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"],
        px: ["pr", "pl"],
        py: ["pt", "pb"],
        m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"],
        mx: ["mr", "ml"],
        my: ["mt", "mb"],
        size: ["w", "h"],
        "font-size": ["leading"],
        "fvn-normal": [
          "fvn-ordinal",
          "fvn-slashed-zero",
          "fvn-figure",
          "fvn-spacing",
          "fvn-fraction",
        ],
        "fvn-ordinal": ["fvn-normal"],
        "fvn-slashed-zero": ["fvn-normal"],
        "fvn-figure": ["fvn-normal"],
        "fvn-spacing": ["fvn-normal"],
        "fvn-fraction": ["fvn-normal"],
        "line-clamp": ["display", "overflow"],
        rounded: [
          "rounded-s",
          "rounded-e",
          "rounded-t",
          "rounded-r",
          "rounded-b",
          "rounded-l",
          "rounded-ss",
          "rounded-se",
          "rounded-ee",
          "rounded-es",
          "rounded-tl",
          "rounded-tr",
          "rounded-br",
          "rounded-bl",
        ],
        "rounded-s": ["rounded-ss", "rounded-es"],
        "rounded-e": ["rounded-se", "rounded-ee"],
        "rounded-t": ["rounded-tl", "rounded-tr"],
        "rounded-r": ["rounded-tr", "rounded-br"],
        "rounded-b": ["rounded-br", "rounded-bl"],
        "rounded-l": ["rounded-tl", "rounded-bl"],
        "border-spacing": ["border-spacing-x", "border-spacing-y"],
        "border-w": [
          "border-w-s",
          "border-w-e",
          "border-w-t",
          "border-w-r",
          "border-w-b",
          "border-w-l",
        ],
        "border-w-x": ["border-w-r", "border-w-l"],
        "border-w-y": ["border-w-t", "border-w-b"],
        "border-color": [
          "border-color-s",
          "border-color-e",
          "border-color-t",
          "border-color-r",
          "border-color-b",
          "border-color-l",
        ],
        "border-color-x": ["border-color-r", "border-color-l"],
        "border-color-y": ["border-color-t", "border-color-b"],
        "scroll-m": [
          "scroll-mx",
          "scroll-my",
          "scroll-ms",
          "scroll-me",
          "scroll-mt",
          "scroll-mr",
          "scroll-mb",
          "scroll-ml",
        ],
        "scroll-mx": ["scroll-mr", "scroll-ml"],
        "scroll-my": ["scroll-mt", "scroll-mb"],
        "scroll-p": [
          "scroll-px",
          "scroll-py",
          "scroll-ps",
          "scroll-pe",
          "scroll-pt",
          "scroll-pr",
          "scroll-pb",
          "scroll-pl",
        ],
        "scroll-px": ["scroll-pr", "scroll-pl"],
        "scroll-py": ["scroll-pt", "scroll-pb"],
        touch: ["touch-x", "touch-y", "touch-pz"],
        "touch-x": ["touch"],
        "touch-y": ["touch"],
        "touch-pz": ["touch"],
      },
      conflictingClassGroupModifiers: {
        "font-size": ["leading"],
      },
    };
  };
  const twMerge = /* @__PURE__ */ createTailwindMerge(getDefaultConfig);
  function cn(...inputs) {
    return twMerge(clsx(inputs));
  }
  const buttonVariants = cva(
    "ll-inline-flex ll-items-center ll-justify-center ll-whitespace-nowrap ll-rounded-md ll-text-sm ll-font-medium ll-transition-colors focus-visible:ll-outline-none focus-visible:ll-ring-1 focus-visible:ll-ring-ring disabled:ll-pointer-events-none disabled:ll-opacity-50",
    {
      variants: {
        variant: {
          default:
            "ll-bg-primary ll-text-primary-foreground ll-shadow hover:ll-bg-primary/90",
          destructive:
            "ll-bg-destructive ll-text-destructive-foreground ll-shadow-sm hover:ll-bg-destructive/90",
          outline:
            "ll-border ll-border-input ll-bg-background ll-shadow-sm hover:ll-bg-accent hover:ll-text-accent-foreground",
          secondary:
            "ll-bg-secondary ll-text-secondary-foreground ll-shadow-sm hover:ll-bg-secondary/80",
          ghost: "hover:ll-bg-accent hover:ll-text-accent-foreground",
          link: "ll-text-primary ll-underline-offset-4 hover:ll-underline",
        },
        size: {
          default: "ll-h-9 ll-px-4 ll-py-2",
          sm: "ll-h-8 ll-rounded-md ll-px-3 ll-text-xs",
          lg: "ll-h-10 ll-rounded-md ll-px-8",
          icon: "ll-h-9 ll-w-9",
        },
      },
      defaultVariants: {
        variant: "default",
        size: "default",
      },
    }
  );
  const Button = reactExports.forwardRef(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
      const Comp = asChild ? Slot : "button";
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Comp, {
        className: cn(buttonVariants({ variant, size, className })),
        ref,
        ...props,
      });
    }
  );
  Button.displayName = "Button";
  var Subscribable = class {
    constructor() {
      this.listeners = /* @__PURE__ */ new Set();
      this.subscribe = this.subscribe.bind(this);
    }
    subscribe(listener) {
      this.listeners.add(listener);
      this.onSubscribe();
      return () => {
        this.listeners.delete(listener);
        this.onUnsubscribe();
      };
    }
    hasListeners() {
      return this.listeners.size > 0;
    }
    onSubscribe() {}
    onUnsubscribe() {}
  };
  var isServer = typeof window === "undefined" || "Deno" in globalThis;
  function noop$2() {
    return void 0;
  }
  function functionalUpdate(updater, input) {
    return typeof updater === "function" ? updater(input) : updater;
  }
  function isValidTimeout(value) {
    return typeof value === "number" && value >= 0 && value !== Infinity;
  }
  function timeUntilStale(updatedAt, staleTime) {
    return Math.max(updatedAt + (staleTime || 0) - Date.now(), 0);
  }
  function resolveStaleTime(staleTime, query) {
    return typeof staleTime === "function" ? staleTime(query) : staleTime;
  }
  function resolveEnabled(enabled, query) {
    return typeof enabled === "function" ? enabled(query) : enabled;
  }
  function matchQuery(filters, query) {
    const {
      type = "all",
      exact,
      fetchStatus,
      predicate,
      queryKey,
      stale,
    } = filters;
    if (queryKey) {
      if (exact) {
        if (
          query.queryHash !== hashQueryKeyByOptions(queryKey, query.options)
        ) {
          return false;
        }
      } else if (!partialMatchKey(query.queryKey, queryKey)) {
        return false;
      }
    }
    if (type !== "all") {
      const isActive = query.isActive();
      if (type === "active" && !isActive) {
        return false;
      }
      if (type === "inactive" && isActive) {
        return false;
      }
    }
    if (typeof stale === "boolean" && query.isStale() !== stale) {
      return false;
    }
    if (fetchStatus && fetchStatus !== query.state.fetchStatus) {
      return false;
    }
    if (predicate && !predicate(query)) {
      return false;
    }
    return true;
  }
  function matchMutation(filters, mutation) {
    const { exact, status, predicate, mutationKey } = filters;
    if (mutationKey) {
      if (!mutation.options.mutationKey) {
        return false;
      }
      if (exact) {
        if (hashKey(mutation.options.mutationKey) !== hashKey(mutationKey)) {
          return false;
        }
      } else if (!partialMatchKey(mutation.options.mutationKey, mutationKey)) {
        return false;
      }
    }
    if (status && mutation.state.status !== status) {
      return false;
    }
    if (predicate && !predicate(mutation)) {
      return false;
    }
    return true;
  }
  function hashQueryKeyByOptions(queryKey, options) {
    const hashFn =
      (options == null ? void 0 : options.queryKeyHashFn) || hashKey;
    return hashFn(queryKey);
  }
  function hashKey(queryKey) {
    return JSON.stringify(queryKey, (_2, val) =>
      isPlainObject$1(val)
        ? Object.keys(val)
            .sort()
            .reduce((result, key) => {
              result[key] = val[key];
              return result;
            }, {})
        : val
    );
  }
  function partialMatchKey(a2, b2) {
    if (a2 === b2) {
      return true;
    }
    if (typeof a2 !== typeof b2) {
      return false;
    }
    if (a2 && b2 && typeof a2 === "object" && typeof b2 === "object") {
      return !Object.keys(b2).some((key) => !partialMatchKey(a2[key], b2[key]));
    }
    return false;
  }
  function replaceEqualDeep(a2, b2) {
    if (a2 === b2) {
      return a2;
    }
    const array = isPlainArray(a2) && isPlainArray(b2);
    if (array || (isPlainObject$1(a2) && isPlainObject$1(b2))) {
      const aItems = array ? a2 : Object.keys(a2);
      const aSize = aItems.length;
      const bItems = array ? b2 : Object.keys(b2);
      const bSize = bItems.length;
      const copy = array ? [] : {};
      let equalItems = 0;
      for (let i2 = 0; i2 < bSize; i2++) {
        const key = array ? i2 : bItems[i2];
        if (
          ((!array && aItems.includes(key)) || array) &&
          a2[key] === void 0 &&
          b2[key] === void 0
        ) {
          copy[key] = void 0;
          equalItems++;
        } else {
          copy[key] = replaceEqualDeep(a2[key], b2[key]);
          if (copy[key] === a2[key] && a2[key] !== void 0) {
            equalItems++;
          }
        }
      }
      return aSize === bSize && equalItems === aSize ? a2 : copy;
    }
    return b2;
  }
  function shallowEqualObjects(a2, b2) {
    if (!b2 || Object.keys(a2).length !== Object.keys(b2).length) {
      return false;
    }
    for (const key in a2) {
      if (a2[key] !== b2[key]) {
        return false;
      }
    }
    return true;
  }
  function isPlainArray(value) {
    return Array.isArray(value) && value.length === Object.keys(value).length;
  }
  function isPlainObject$1(o2) {
    if (!hasObjectPrototype(o2)) {
      return false;
    }
    const ctor = o2.constructor;
    if (ctor === void 0) {
      return true;
    }
    const prot = ctor.prototype;
    if (!hasObjectPrototype(prot)) {
      return false;
    }
    if (!prot.hasOwnProperty("isPrototypeOf")) {
      return false;
    }
    if (Object.getPrototypeOf(o2) !== Object.prototype) {
      return false;
    }
    return true;
  }
  function hasObjectPrototype(o2) {
    return Object.prototype.toString.call(o2) === "[object Object]";
  }
  function sleep(timeout) {
    return new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });
  }
  function replaceData(prevData, data, options) {
    if (typeof options.structuralSharing === "function") {
      return options.structuralSharing(prevData, data);
    } else if (options.structuralSharing !== false) {
      return replaceEqualDeep(prevData, data);
    }
    return data;
  }
  function addToEnd(items, item, max = 0) {
    const newItems = [...items, item];
    return max && newItems.length > max ? newItems.slice(1) : newItems;
  }
  function addToStart(items, item, max = 0) {
    const newItems = [item, ...items];
    return max && newItems.length > max ? newItems.slice(0, -1) : newItems;
  }
  var skipToken = Symbol();
  function ensureQueryFn(options, fetchOptions) {
    if (
      !options.queryFn &&
      (fetchOptions == null ? void 0 : fetchOptions.initialPromise)
    ) {
      return () => fetchOptions.initialPromise;
    }
    if (!options.queryFn || options.queryFn === skipToken) {
      return () =>
        Promise.reject(new Error(`Missing queryFn: '${options.queryHash}'`));
    }
    return options.queryFn;
  }
  var FocusManager =
    ((_a = class extends Subscribable {
      constructor() {
        super();
        __privateAdd(this, _focused, void 0);
        __privateAdd(this, _cleanup, void 0);
        __privateAdd(this, _setup, void 0);
        __privateSet(this, _setup, (onFocus) => {
          if (!isServer && window.addEventListener) {
            const listener = () => onFocus();
            window.addEventListener("visibilitychange", listener, false);
            return () => {
              window.removeEventListener("visibilitychange", listener);
            };
          }
          return;
        });
      }
      onSubscribe() {
        if (!__privateGet(this, _cleanup)) {
          this.setEventListener(__privateGet(this, _setup));
        }
      }
      onUnsubscribe() {
        var _a2;
        if (!this.hasListeners()) {
          (_a2 = __privateGet(this, _cleanup)) == null
            ? void 0
            : _a2.call(this);
          __privateSet(this, _cleanup, void 0);
        }
      }
      setEventListener(setup) {
        var _a2;
        __privateSet(this, _setup, setup);
        (_a2 = __privateGet(this, _cleanup)) == null ? void 0 : _a2.call(this);
        __privateSet(
          this,
          _cleanup,
          setup((focused) => {
            if (typeof focused === "boolean") {
              this.setFocused(focused);
            } else {
              this.onFocus();
            }
          })
        );
      }
      setFocused(focused) {
        const changed = __privateGet(this, _focused) !== focused;
        if (changed) {
          __privateSet(this, _focused, focused);
          this.onFocus();
        }
      }
      onFocus() {
        const isFocused = this.isFocused();
        this.listeners.forEach((listener) => {
          listener(isFocused);
        });
      }
      isFocused() {
        var _a2;
        if (typeof __privateGet(this, _focused) === "boolean") {
          return __privateGet(this, _focused);
        }
        return (
          ((_a2 = globalThis.document) == null
            ? void 0
            : _a2.visibilityState) !== "hidden"
        );
      }
    }),
    (_focused = new WeakMap()),
    (_cleanup = new WeakMap()),
    (_setup = new WeakMap()),
    _a);
  var focusManager = new FocusManager();
  var OnlineManager =
    ((_b = class extends Subscribable {
      constructor() {
        super();
        __privateAdd(this, _online, true);
        __privateAdd(this, _cleanup2, void 0);
        __privateAdd(this, _setup2, void 0);
        __privateSet(this, _setup2, (onOnline) => {
          if (!isServer && window.addEventListener) {
            const onlineListener = () => onOnline(true);
            const offlineListener = () => onOnline(false);
            window.addEventListener("online", onlineListener, false);
            window.addEventListener("offline", offlineListener, false);
            return () => {
              window.removeEventListener("online", onlineListener);
              window.removeEventListener("offline", offlineListener);
            };
          }
          return;
        });
      }
      onSubscribe() {
        if (!__privateGet(this, _cleanup2)) {
          this.setEventListener(__privateGet(this, _setup2));
        }
      }
      onUnsubscribe() {
        var _a2;
        if (!this.hasListeners()) {
          (_a2 = __privateGet(this, _cleanup2)) == null
            ? void 0
            : _a2.call(this);
          __privateSet(this, _cleanup2, void 0);
        }
      }
      setEventListener(setup) {
        var _a2;
        __privateSet(this, _setup2, setup);
        (_a2 = __privateGet(this, _cleanup2)) == null ? void 0 : _a2.call(this);
        __privateSet(this, _cleanup2, setup(this.setOnline.bind(this)));
      }
      setOnline(online) {
        const changed = __privateGet(this, _online) !== online;
        if (changed) {
          __privateSet(this, _online, online);
          this.listeners.forEach((listener) => {
            listener(online);
          });
        }
      }
      isOnline() {
        return __privateGet(this, _online);
      }
    }),
    (_online = new WeakMap()),
    (_cleanup2 = new WeakMap()),
    (_setup2 = new WeakMap()),
    _b);
  var onlineManager = new OnlineManager();
  function pendingThenable() {
    let resolve;
    let reject;
    const thenable = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    thenable.status = "pending";
    thenable.catch(() => {});
    function finalize(data) {
      Object.assign(thenable, data);
      delete thenable.resolve;
      delete thenable.reject;
    }
    thenable.resolve = (value) => {
      finalize({
        status: "fulfilled",
        value,
      });
      resolve(value);
    };
    thenable.reject = (reason) => {
      finalize({
        status: "rejected",
        reason,
      });
      reject(reason);
    };
    return thenable;
  }
  function defaultRetryDelay(failureCount) {
    return Math.min(1e3 * 2 ** failureCount, 3e4);
  }
  function canFetch(networkMode) {
    return (networkMode ?? "online") === "online"
      ? onlineManager.isOnline()
      : true;
  }
  var CancelledError = class extends Error {
    constructor(options) {
      super("CancelledError");
      this.revert = options == null ? void 0 : options.revert;
      this.silent = options == null ? void 0 : options.silent;
    }
  };
  function isCancelledError(value) {
    return value instanceof CancelledError;
  }
  function createRetryer(config) {
    let isRetryCancelled = false;
    let failureCount = 0;
    let isResolved = false;
    let continueFn;
    const thenable = pendingThenable();
    const cancel = (cancelOptions) => {
      var _a2;
      if (!isResolved) {
        reject(new CancelledError(cancelOptions));
        (_a2 = config.abort) == null ? void 0 : _a2.call(config);
      }
    };
    const cancelRetry = () => {
      isRetryCancelled = true;
    };
    const continueRetry = () => {
      isRetryCancelled = false;
    };
    const canContinue = () =>
      focusManager.isFocused() &&
      (config.networkMode === "always" || onlineManager.isOnline()) &&
      config.canRun();
    const canStart = () => canFetch(config.networkMode) && config.canRun();
    const resolve = (value) => {
      var _a2;
      if (!isResolved) {
        isResolved = true;
        (_a2 = config.onSuccess) == null ? void 0 : _a2.call(config, value);
        continueFn == null ? void 0 : continueFn();
        thenable.resolve(value);
      }
    };
    const reject = (value) => {
      var _a2;
      if (!isResolved) {
        isResolved = true;
        (_a2 = config.onError) == null ? void 0 : _a2.call(config, value);
        continueFn == null ? void 0 : continueFn();
        thenable.reject(value);
      }
    };
    const pause = () => {
      return new Promise((continueResolve) => {
        var _a2;
        continueFn = (value) => {
          if (isResolved || canContinue()) {
            continueResolve(value);
          }
        };
        (_a2 = config.onPause) == null ? void 0 : _a2.call(config);
      }).then(() => {
        var _a2;
        continueFn = void 0;
        if (!isResolved) {
          (_a2 = config.onContinue) == null ? void 0 : _a2.call(config);
        }
      });
    };
    const run = () => {
      if (isResolved) {
        return;
      }
      let promiseOrValue;
      const initialPromise =
        failureCount === 0 ? config.initialPromise : void 0;
      try {
        promiseOrValue = initialPromise ?? config.fn();
      } catch (error) {
        promiseOrValue = Promise.reject(error);
      }
      Promise.resolve(promiseOrValue)
        .then(resolve)
        .catch((error) => {
          var _a2;
          if (isResolved) {
            return;
          }
          const retry = config.retry ?? (isServer ? 0 : 3);
          const retryDelay = config.retryDelay ?? defaultRetryDelay;
          const delay =
            typeof retryDelay === "function"
              ? retryDelay(failureCount, error)
              : retryDelay;
          const shouldRetry =
            retry === true ||
            (typeof retry === "number" && failureCount < retry) ||
            (typeof retry === "function" && retry(failureCount, error));
          if (isRetryCancelled || !shouldRetry) {
            reject(error);
            return;
          }
          failureCount++;
          (_a2 = config.onFail) == null
            ? void 0
            : _a2.call(config, failureCount, error);
          sleep(delay)
            .then(() => {
              return canContinue() ? void 0 : pause();
            })
            .then(() => {
              if (isRetryCancelled) {
                reject(error);
              } else {
                run();
              }
            });
        });
    };
    return {
      promise: thenable,
      cancel,
      continue: () => {
        continueFn == null ? void 0 : continueFn();
        return thenable;
      },
      cancelRetry,
      continueRetry,
      canStart,
      start: () => {
        if (canStart()) {
          run();
        } else {
          pause().then(run);
        }
        return thenable;
      },
    };
  }
  function createNotifyManager() {
    let queue = [];
    let transactions = 0;
    let notifyFn = (callback) => {
      callback();
    };
    let batchNotifyFn = (callback) => {
      callback();
    };
    let scheduleFn = (cb2) => setTimeout(cb2, 0);
    const schedule = (callback) => {
      if (transactions) {
        queue.push(callback);
      } else {
        scheduleFn(() => {
          notifyFn(callback);
        });
      }
    };
    const flush = () => {
      const originalQueue = queue;
      queue = [];
      if (originalQueue.length) {
        scheduleFn(() => {
          batchNotifyFn(() => {
            originalQueue.forEach((callback) => {
              notifyFn(callback);
            });
          });
        });
      }
    };
    return {
      batch: (callback) => {
        let result;
        transactions++;
        try {
          result = callback();
        } finally {
          transactions--;
          if (!transactions) {
            flush();
          }
        }
        return result;
      },
      /**
       * All calls to the wrapped function will be batched.
       */
      batchCalls: (callback) => {
        return (...args) => {
          schedule(() => {
            callback(...args);
          });
        };
      },
      schedule,
      /**
       * Use this method to set a custom notify function.
       * This can be used to for example wrap notifications with `React.act` while running tests.
       */
      setNotifyFunction: (fn) => {
        notifyFn = fn;
      },
      /**
       * Use this method to set a custom function to batch notifications together into a single tick.
       * By default React Query will use the batch function provided by ReactDOM or React Native.
       */
      setBatchNotifyFunction: (fn) => {
        batchNotifyFn = fn;
      },
      setScheduler: (fn) => {
        scheduleFn = fn;
      },
    };
  }
  var notifyManager = createNotifyManager();
  var Removable =
    ((_c = class {
      constructor() {
        __privateAdd(this, _gcTimeout, void 0);
      }
      destroy() {
        this.clearGcTimeout();
      }
      scheduleGc() {
        this.clearGcTimeout();
        if (isValidTimeout(this.gcTime)) {
          __privateSet(
            this,
            _gcTimeout,
            setTimeout(() => {
              this.optionalRemove();
            }, this.gcTime)
          );
        }
      }
      updateGcTime(newGcTime) {
        this.gcTime = Math.max(
          this.gcTime || 0,
          newGcTime ?? (isServer ? Infinity : 5 * 60 * 1e3)
        );
      }
      clearGcTimeout() {
        if (__privateGet(this, _gcTimeout)) {
          clearTimeout(__privateGet(this, _gcTimeout));
          __privateSet(this, _gcTimeout, void 0);
        }
      }
    }),
    (_gcTimeout = new WeakMap()),
    _c);
  var Query =
    ((_d = class extends Removable {
      constructor(config) {
        super();
        __privateAdd(this, _dispatch);
        __privateAdd(this, _initialState, void 0);
        __privateAdd(this, _revertState, void 0);
        __privateAdd(this, _cache, void 0);
        __privateAdd(this, _retryer, void 0);
        __privateAdd(this, _defaultOptions, void 0);
        __privateAdd(this, _abortSignalConsumed, void 0);
        __privateSet(this, _abortSignalConsumed, false);
        __privateSet(this, _defaultOptions, config.defaultOptions);
        this.setOptions(config.options);
        this.observers = [];
        __privateSet(this, _cache, config.cache);
        this.queryKey = config.queryKey;
        this.queryHash = config.queryHash;
        __privateSet(this, _initialState, getDefaultState$1(this.options));
        this.state = config.state ?? __privateGet(this, _initialState);
        this.scheduleGc();
      }
      get meta() {
        return this.options.meta;
      }
      get promise() {
        var _a2;
        return (_a2 = __privateGet(this, _retryer)) == null
          ? void 0
          : _a2.promise;
      }
      setOptions(options) {
        this.options = { ...__privateGet(this, _defaultOptions), ...options };
        this.updateGcTime(this.options.gcTime);
      }
      optionalRemove() {
        if (!this.observers.length && this.state.fetchStatus === "idle") {
          __privateGet(this, _cache).remove(this);
        }
      }
      setData(newData, options) {
        const data = replaceData(this.state.data, newData, this.options);
        __privateMethod(this, _dispatch, dispatch_fn).call(this, {
          data,
          type: "success",
          dataUpdatedAt: options == null ? void 0 : options.updatedAt,
          manual: options == null ? void 0 : options.manual,
        });
        return data;
      }
      setState(state, setStateOptions) {
        __privateMethod(this, _dispatch, dispatch_fn).call(this, {
          type: "setState",
          state,
          setStateOptions,
        });
      }
      cancel(options) {
        var _a2, _b2;
        const promise =
          (_a2 = __privateGet(this, _retryer)) == null ? void 0 : _a2.promise;
        (_b2 = __privateGet(this, _retryer)) == null
          ? void 0
          : _b2.cancel(options);
        return promise ? promise.then(noop$2).catch(noop$2) : Promise.resolve();
      }
      destroy() {
        super.destroy();
        this.cancel({ silent: true });
      }
      reset() {
        this.destroy();
        this.setState(__privateGet(this, _initialState));
      }
      isActive() {
        return this.observers.some(
          (observer) => resolveEnabled(observer.options.enabled, this) !== false
        );
      }
      isDisabled() {
        return this.getObserversCount() > 0 && !this.isActive();
      }
      isStale() {
        if (this.state.isInvalidated) {
          return true;
        }
        if (this.getObserversCount() > 0) {
          return this.observers.some(
            (observer) => observer.getCurrentResult().isStale
          );
        }
        return this.state.data === void 0;
      }
      isStaleByTime(staleTime = 0) {
        return (
          this.state.isInvalidated ||
          this.state.data === void 0 ||
          !timeUntilStale(this.state.dataUpdatedAt, staleTime)
        );
      }
      onFocus() {
        var _a2;
        const observer = this.observers.find((x2) =>
          x2.shouldFetchOnWindowFocus()
        );
        observer == null ? void 0 : observer.refetch({ cancelRefetch: false });
        (_a2 = __privateGet(this, _retryer)) == null ? void 0 : _a2.continue();
      }
      onOnline() {
        var _a2;
        const observer = this.observers.find((x2) =>
          x2.shouldFetchOnReconnect()
        );
        observer == null ? void 0 : observer.refetch({ cancelRefetch: false });
        (_a2 = __privateGet(this, _retryer)) == null ? void 0 : _a2.continue();
      }
      addObserver(observer) {
        if (!this.observers.includes(observer)) {
          this.observers.push(observer);
          this.clearGcTimeout();
          __privateGet(this, _cache).notify({
            type: "observerAdded",
            query: this,
            observer,
          });
        }
      }
      removeObserver(observer) {
        if (this.observers.includes(observer)) {
          this.observers = this.observers.filter((x2) => x2 !== observer);
          if (!this.observers.length) {
            if (__privateGet(this, _retryer)) {
              if (__privateGet(this, _abortSignalConsumed)) {
                __privateGet(this, _retryer).cancel({ revert: true });
              } else {
                __privateGet(this, _retryer).cancelRetry();
              }
            }
            this.scheduleGc();
          }
          __privateGet(this, _cache).notify({
            type: "observerRemoved",
            query: this,
            observer,
          });
        }
      }
      getObserversCount() {
        return this.observers.length;
      }
      invalidate() {
        if (!this.state.isInvalidated) {
          __privateMethod(this, _dispatch, dispatch_fn).call(this, {
            type: "invalidate",
          });
        }
      }
      fetch(options, fetchOptions) {
        var _a2, _b2, _c2;
        if (this.state.fetchStatus !== "idle") {
          if (
            this.state.data !== void 0 &&
            (fetchOptions == null ? void 0 : fetchOptions.cancelRefetch)
          ) {
            this.cancel({ silent: true });
          } else if (__privateGet(this, _retryer)) {
            __privateGet(this, _retryer).continueRetry();
            return __privateGet(this, _retryer).promise;
          }
        }
        if (options) {
          this.setOptions(options);
        }
        if (!this.options.queryFn) {
          const observer = this.observers.find((x2) => x2.options.queryFn);
          if (observer) {
            this.setOptions(observer.options);
          }
        }
        const abortController = new AbortController();
        const addSignalProperty = (object) => {
          Object.defineProperty(object, "signal", {
            enumerable: true,
            get: () => {
              __privateSet(this, _abortSignalConsumed, true);
              return abortController.signal;
            },
          });
        };
        const fetchFn = () => {
          const queryFn = ensureQueryFn(this.options, fetchOptions);
          const queryFnContext = {
            queryKey: this.queryKey,
            meta: this.meta,
          };
          addSignalProperty(queryFnContext);
          __privateSet(this, _abortSignalConsumed, false);
          if (this.options.persister) {
            return this.options.persister(queryFn, queryFnContext, this);
          }
          return queryFn(queryFnContext);
        };
        const context = {
          fetchOptions,
          options: this.options,
          queryKey: this.queryKey,
          state: this.state,
          fetchFn,
        };
        addSignalProperty(context);
        (_a2 = this.options.behavior) == null
          ? void 0
          : _a2.onFetch(context, this);
        __privateSet(this, _revertState, this.state);
        if (
          this.state.fetchStatus === "idle" ||
          this.state.fetchMeta !==
            ((_b2 = context.fetchOptions) == null ? void 0 : _b2.meta)
        ) {
          __privateMethod(this, _dispatch, dispatch_fn).call(this, {
            type: "fetch",
            meta: (_c2 = context.fetchOptions) == null ? void 0 : _c2.meta,
          });
        }
        const onError = (error) => {
          var _a3, _b3, _c3, _d2;
          if (!(isCancelledError(error) && error.silent)) {
            __privateMethod(this, _dispatch, dispatch_fn).call(this, {
              type: "error",
              error,
            });
          }
          if (!isCancelledError(error)) {
            (_b3 = (_a3 = __privateGet(this, _cache).config).onError) == null
              ? void 0
              : _b3.call(_a3, error, this);
            (_d2 = (_c3 = __privateGet(this, _cache).config).onSettled) == null
              ? void 0
              : _d2.call(_c3, this.state.data, error, this);
          }
          if (!this.isFetchingOptimistic) {
            this.scheduleGc();
          }
          this.isFetchingOptimistic = false;
        };
        __privateSet(
          this,
          _retryer,
          createRetryer({
            initialPromise:
              fetchOptions == null ? void 0 : fetchOptions.initialPromise,
            fn: context.fetchFn,
            abort: abortController.abort.bind(abortController),
            onSuccess: (data) => {
              var _a3, _b3, _c3, _d2;
              if (data === void 0) {
                onError(new Error(`${this.queryHash} data is undefined`));
                return;
              }
              try {
                this.setData(data);
              } catch (error) {
                onError(error);
                return;
              }
              (_b3 = (_a3 = __privateGet(this, _cache).config).onSuccess) ==
              null
                ? void 0
                : _b3.call(_a3, data, this);
              (_d2 = (_c3 = __privateGet(this, _cache).config).onSettled) ==
              null
                ? void 0
                : _d2.call(_c3, data, this.state.error, this);
              if (!this.isFetchingOptimistic) {
                this.scheduleGc();
              }
              this.isFetchingOptimistic = false;
            },
            onError,
            onFail: (failureCount, error) => {
              __privateMethod(this, _dispatch, dispatch_fn).call(this, {
                type: "failed",
                failureCount,
                error,
              });
            },
            onPause: () => {
              __privateMethod(this, _dispatch, dispatch_fn).call(this, {
                type: "pause",
              });
            },
            onContinue: () => {
              __privateMethod(this, _dispatch, dispatch_fn).call(this, {
                type: "continue",
              });
            },
            retry: context.options.retry,
            retryDelay: context.options.retryDelay,
            networkMode: context.options.networkMode,
            canRun: () => true,
          })
        );
        return __privateGet(this, _retryer).start();
      }
    }),
    (_initialState = new WeakMap()),
    (_revertState = new WeakMap()),
    (_cache = new WeakMap()),
    (_retryer = new WeakMap()),
    (_defaultOptions = new WeakMap()),
    (_abortSignalConsumed = new WeakMap()),
    (_dispatch = new WeakSet()),
    (dispatch_fn = function (action) {
      const reducer2 = (state) => {
        switch (action.type) {
          case "failed":
            return {
              ...state,
              fetchFailureCount: action.failureCount,
              fetchFailureReason: action.error,
            };
          case "pause":
            return {
              ...state,
              fetchStatus: "paused",
            };
          case "continue":
            return {
              ...state,
              fetchStatus: "fetching",
            };
          case "fetch":
            return {
              ...state,
              ...fetchState(state.data, this.options),
              fetchMeta: action.meta ?? null,
            };
          case "success":
            return {
              ...state,
              data: action.data,
              dataUpdateCount: state.dataUpdateCount + 1,
              dataUpdatedAt: action.dataUpdatedAt ?? Date.now(),
              error: null,
              isInvalidated: false,
              status: "success",
              ...(!action.manual && {
                fetchStatus: "idle",
                fetchFailureCount: 0,
                fetchFailureReason: null,
              }),
            };
          case "error":
            const error = action.error;
            if (
              isCancelledError(error) &&
              error.revert &&
              __privateGet(this, _revertState)
            ) {
              return {
                ...__privateGet(this, _revertState),
                fetchStatus: "idle",
              };
            }
            return {
              ...state,
              error,
              errorUpdateCount: state.errorUpdateCount + 1,
              errorUpdatedAt: Date.now(),
              fetchFailureCount: state.fetchFailureCount + 1,
              fetchFailureReason: error,
              fetchStatus: "idle",
              status: "error",
            };
          case "invalidate":
            return {
              ...state,
              isInvalidated: true,
            };
          case "setState":
            return {
              ...state,
              ...action.state,
            };
        }
      };
      this.state = reducer2(this.state);
      notifyManager.batch(() => {
        this.observers.forEach((observer) => {
          observer.onQueryUpdate();
        });
        __privateGet(this, _cache).notify({
          query: this,
          type: "updated",
          action,
        });
      });
    }),
    _d);
  function fetchState(data, options) {
    return {
      fetchFailureCount: 0,
      fetchFailureReason: null,
      fetchStatus: canFetch(options.networkMode) ? "fetching" : "paused",
      ...(data === void 0 && {
        error: null,
        status: "pending",
      }),
    };
  }
  function getDefaultState$1(options) {
    const data =
      typeof options.initialData === "function"
        ? options.initialData()
        : options.initialData;
    const hasData = data !== void 0;
    const initialDataUpdatedAt = hasData
      ? typeof options.initialDataUpdatedAt === "function"
        ? options.initialDataUpdatedAt()
        : options.initialDataUpdatedAt
      : 0;
    return {
      data,
      dataUpdateCount: 0,
      dataUpdatedAt: hasData ? initialDataUpdatedAt ?? Date.now() : 0,
      error: null,
      errorUpdateCount: 0,
      errorUpdatedAt: 0,
      fetchFailureCount: 0,
      fetchFailureReason: null,
      fetchMeta: null,
      isInvalidated: false,
      status: hasData ? "success" : "pending",
      fetchStatus: "idle",
    };
  }
  var QueryCache =
    ((_e = class extends Subscribable {
      constructor(config = {}) {
        super();
        __privateAdd(this, _queries, void 0);
        this.config = config;
        __privateSet(this, _queries, /* @__PURE__ */ new Map());
      }
      build(client2, options, state) {
        const queryKey = options.queryKey;
        const queryHash =
          options.queryHash ?? hashQueryKeyByOptions(queryKey, options);
        let query = this.get(queryHash);
        if (!query) {
          query = new Query({
            cache: this,
            queryKey,
            queryHash,
            options: client2.defaultQueryOptions(options),
            state,
            defaultOptions: client2.getQueryDefaults(queryKey),
          });
          this.add(query);
        }
        return query;
      }
      add(query) {
        if (!__privateGet(this, _queries).has(query.queryHash)) {
          __privateGet(this, _queries).set(query.queryHash, query);
          this.notify({
            type: "added",
            query,
          });
        }
      }
      remove(query) {
        const queryInMap = __privateGet(this, _queries).get(query.queryHash);
        if (queryInMap) {
          query.destroy();
          if (queryInMap === query) {
            __privateGet(this, _queries).delete(query.queryHash);
          }
          this.notify({ type: "removed", query });
        }
      }
      clear() {
        notifyManager.batch(() => {
          this.getAll().forEach((query) => {
            this.remove(query);
          });
        });
      }
      get(queryHash) {
        return __privateGet(this, _queries).get(queryHash);
      }
      getAll() {
        return [...__privateGet(this, _queries).values()];
      }
      find(filters) {
        const defaultedFilters = { exact: true, ...filters };
        return this.getAll().find((query) =>
          matchQuery(defaultedFilters, query)
        );
      }
      findAll(filters = {}) {
        const queries = this.getAll();
        return Object.keys(filters).length > 0
          ? queries.filter((query) => matchQuery(filters, query))
          : queries;
      }
      notify(event) {
        notifyManager.batch(() => {
          this.listeners.forEach((listener) => {
            listener(event);
          });
        });
      }
      onFocus() {
        notifyManager.batch(() => {
          this.getAll().forEach((query) => {
            query.onFocus();
          });
        });
      }
      onOnline() {
        notifyManager.batch(() => {
          this.getAll().forEach((query) => {
            query.onOnline();
          });
        });
      }
    }),
    (_queries = new WeakMap()),
    _e);
  var Mutation =
    ((_f = class extends Removable {
      constructor(config) {
        super();
        __privateAdd(this, _dispatch2);
        __privateAdd(this, _observers, void 0);
        __privateAdd(this, _mutationCache, void 0);
        __privateAdd(this, _retryer2, void 0);
        this.mutationId = config.mutationId;
        __privateSet(this, _mutationCache, config.mutationCache);
        __privateSet(this, _observers, []);
        this.state = config.state || getDefaultState();
        this.setOptions(config.options);
        this.scheduleGc();
      }
      setOptions(options) {
        this.options = options;
        this.updateGcTime(this.options.gcTime);
      }
      get meta() {
        return this.options.meta;
      }
      addObserver(observer) {
        if (!__privateGet(this, _observers).includes(observer)) {
          __privateGet(this, _observers).push(observer);
          this.clearGcTimeout();
          __privateGet(this, _mutationCache).notify({
            type: "observerAdded",
            mutation: this,
            observer,
          });
        }
      }
      removeObserver(observer) {
        __privateSet(
          this,
          _observers,
          __privateGet(this, _observers).filter((x2) => x2 !== observer)
        );
        this.scheduleGc();
        __privateGet(this, _mutationCache).notify({
          type: "observerRemoved",
          mutation: this,
          observer,
        });
      }
      optionalRemove() {
        if (!__privateGet(this, _observers).length) {
          if (this.state.status === "pending") {
            this.scheduleGc();
          } else {
            __privateGet(this, _mutationCache).remove(this);
          }
        }
      }
      continue() {
        var _a2;
        return (
          ((_a2 = __privateGet(this, _retryer2)) == null
            ? void 0
            : _a2.continue()) ?? // continuing a mutation assumes that variables are set, mutation must have been dehydrated before
          this.execute(this.state.variables)
        );
      }
      async execute(variables) {
        var _a2,
          _b2,
          _c2,
          _d2,
          _e2,
          _f2,
          _g2,
          _h2,
          _i2,
          _j,
          _k,
          _l,
          _m,
          _n,
          _o,
          _p,
          _q,
          _r,
          _s,
          _t;
        __privateSet(
          this,
          _retryer2,
          createRetryer({
            fn: () => {
              if (!this.options.mutationFn) {
                return Promise.reject(new Error("No mutationFn found"));
              }
              return this.options.mutationFn(variables);
            },
            onFail: (failureCount, error) => {
              __privateMethod(this, _dispatch2, dispatch_fn2).call(this, {
                type: "failed",
                failureCount,
                error,
              });
            },
            onPause: () => {
              __privateMethod(this, _dispatch2, dispatch_fn2).call(this, {
                type: "pause",
              });
            },
            onContinue: () => {
              __privateMethod(this, _dispatch2, dispatch_fn2).call(this, {
                type: "continue",
              });
            },
            retry: this.options.retry ?? 0,
            retryDelay: this.options.retryDelay,
            networkMode: this.options.networkMode,
            canRun: () => __privateGet(this, _mutationCache).canRun(this),
          })
        );
        const restored = this.state.status === "pending";
        const isPaused = !__privateGet(this, _retryer2).canStart();
        try {
          if (!restored) {
            __privateMethod(this, _dispatch2, dispatch_fn2).call(this, {
              type: "pending",
              variables,
              isPaused,
            });
            await ((_b2 = (_a2 = __privateGet(this, _mutationCache).config)
              .onMutate) == null
              ? void 0
              : _b2.call(_a2, variables, this));
            const context = await ((_d2 = (_c2 = this.options).onMutate) == null
              ? void 0
              : _d2.call(_c2, variables));
            if (context !== this.state.context) {
              __privateMethod(this, _dispatch2, dispatch_fn2).call(this, {
                type: "pending",
                context,
                variables,
                isPaused,
              });
            }
          }
          const data = await __privateGet(this, _retryer2).start();
          await ((_f2 = (_e2 = __privateGet(this, _mutationCache).config)
            .onSuccess) == null
            ? void 0
            : _f2.call(_e2, data, variables, this.state.context, this));
          await ((_h2 = (_g2 = this.options).onSuccess) == null
            ? void 0
            : _h2.call(_g2, data, variables, this.state.context));
          await ((_j = (_i2 = __privateGet(this, _mutationCache).config)
            .onSettled) == null
            ? void 0
            : _j.call(
                _i2,
                data,
                null,
                this.state.variables,
                this.state.context,
                this
              ));
          await ((_l = (_k = this.options).onSettled) == null
            ? void 0
            : _l.call(_k, data, null, variables, this.state.context));
          __privateMethod(this, _dispatch2, dispatch_fn2).call(this, {
            type: "success",
            data,
          });
          return data;
        } catch (error) {
          try {
            await ((_n = (_m = __privateGet(this, _mutationCache).config)
              .onError) == null
              ? void 0
              : _n.call(_m, error, variables, this.state.context, this));
            await ((_p = (_o = this.options).onError) == null
              ? void 0
              : _p.call(_o, error, variables, this.state.context));
            await ((_r = (_q = __privateGet(this, _mutationCache).config)
              .onSettled) == null
              ? void 0
              : _r.call(
                  _q,
                  void 0,
                  error,
                  this.state.variables,
                  this.state.context,
                  this
                ));
            await ((_t = (_s = this.options).onSettled) == null
              ? void 0
              : _t.call(_s, void 0, error, variables, this.state.context));
            throw error;
          } finally {
            __privateMethod(this, _dispatch2, dispatch_fn2).call(this, {
              type: "error",
              error,
            });
          }
        } finally {
          __privateGet(this, _mutationCache).runNext(this);
        }
      }
    }),
    (_observers = new WeakMap()),
    (_mutationCache = new WeakMap()),
    (_retryer2 = new WeakMap()),
    (_dispatch2 = new WeakSet()),
    (dispatch_fn2 = function (action) {
      const reducer2 = (state) => {
        switch (action.type) {
          case "failed":
            return {
              ...state,
              failureCount: action.failureCount,
              failureReason: action.error,
            };
          case "pause":
            return {
              ...state,
              isPaused: true,
            };
          case "continue":
            return {
              ...state,
              isPaused: false,
            };
          case "pending":
            return {
              ...state,
              context: action.context,
              data: void 0,
              failureCount: 0,
              failureReason: null,
              error: null,
              isPaused: action.isPaused,
              status: "pending",
              variables: action.variables,
              submittedAt: Date.now(),
            };
          case "success":
            return {
              ...state,
              data: action.data,
              failureCount: 0,
              failureReason: null,
              error: null,
              status: "success",
              isPaused: false,
            };
          case "error":
            return {
              ...state,
              data: void 0,
              error: action.error,
              failureCount: state.failureCount + 1,
              failureReason: action.error,
              isPaused: false,
              status: "error",
            };
        }
      };
      this.state = reducer2(this.state);
      notifyManager.batch(() => {
        __privateGet(this, _observers).forEach((observer) => {
          observer.onMutationUpdate(action);
        });
        __privateGet(this, _mutationCache).notify({
          mutation: this,
          type: "updated",
          action,
        });
      });
    }),
    _f);
  function getDefaultState() {
    return {
      context: void 0,
      data: void 0,
      error: null,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      status: "idle",
      variables: void 0,
      submittedAt: 0,
    };
  }
  var MutationCache =
    ((_g = class extends Subscribable {
      constructor(config = {}) {
        super();
        __privateAdd(this, _mutations, void 0);
        __privateAdd(this, _mutationId, void 0);
        this.config = config;
        __privateSet(this, _mutations, /* @__PURE__ */ new Map());
        __privateSet(this, _mutationId, Date.now());
      }
      build(client2, options, state) {
        const mutation = new Mutation({
          mutationCache: this,
          mutationId: ++__privateWrapper(this, _mutationId)._,
          options: client2.defaultMutationOptions(options),
          state,
        });
        this.add(mutation);
        return mutation;
      }
      add(mutation) {
        const scope = scopeFor(mutation);
        const mutations = __privateGet(this, _mutations).get(scope) ?? [];
        mutations.push(mutation);
        __privateGet(this, _mutations).set(scope, mutations);
        this.notify({ type: "added", mutation });
      }
      remove(mutation) {
        var _a2;
        const scope = scopeFor(mutation);
        if (__privateGet(this, _mutations).has(scope)) {
          const mutations =
            (_a2 = __privateGet(this, _mutations).get(scope)) == null
              ? void 0
              : _a2.filter((x2) => x2 !== mutation);
          if (mutations) {
            if (mutations.length === 0) {
              __privateGet(this, _mutations).delete(scope);
            } else {
              __privateGet(this, _mutations).set(scope, mutations);
            }
          }
        }
        this.notify({ type: "removed", mutation });
      }
      canRun(mutation) {
        var _a2;
        const firstPendingMutation =
          (_a2 = __privateGet(this, _mutations).get(scopeFor(mutation))) == null
            ? void 0
            : _a2.find((m2) => m2.state.status === "pending");
        return !firstPendingMutation || firstPendingMutation === mutation;
      }
      runNext(mutation) {
        var _a2;
        const foundMutation =
          (_a2 = __privateGet(this, _mutations).get(scopeFor(mutation))) == null
            ? void 0
            : _a2.find((m2) => m2 !== mutation && m2.state.isPaused);
        return (
          (foundMutation == null ? void 0 : foundMutation.continue()) ??
          Promise.resolve()
        );
      }
      clear() {
        notifyManager.batch(() => {
          this.getAll().forEach((mutation) => {
            this.remove(mutation);
          });
        });
      }
      getAll() {
        return [...__privateGet(this, _mutations).values()].flat();
      }
      find(filters) {
        const defaultedFilters = { exact: true, ...filters };
        return this.getAll().find((mutation) =>
          matchMutation(defaultedFilters, mutation)
        );
      }
      findAll(filters = {}) {
        return this.getAll().filter((mutation) =>
          matchMutation(filters, mutation)
        );
      }
      notify(event) {
        notifyManager.batch(() => {
          this.listeners.forEach((listener) => {
            listener(event);
          });
        });
      }
      resumePausedMutations() {
        const pausedMutations = this.getAll().filter((x2) => x2.state.isPaused);
        return notifyManager.batch(() =>
          Promise.all(
            pausedMutations.map((mutation) => mutation.continue().catch(noop$2))
          )
        );
      }
    }),
    (_mutations = new WeakMap()),
    (_mutationId = new WeakMap()),
    _g);
  function scopeFor(mutation) {
    var _a2;
    return (
      ((_a2 = mutation.options.scope) == null ? void 0 : _a2.id) ??
      String(mutation.mutationId)
    );
  }
  function infiniteQueryBehavior(pages) {
    return {
      onFetch: (context, query) => {
        var _a2, _b2, _c2, _d2, _e2;
        const options = context.options;
        const direction =
          (_c2 =
            (_b2 = (_a2 = context.fetchOptions) == null ? void 0 : _a2.meta) ==
            null
              ? void 0
              : _b2.fetchMore) == null
            ? void 0
            : _c2.direction;
        const oldPages =
          ((_d2 = context.state.data) == null ? void 0 : _d2.pages) || [];
        const oldPageParams =
          ((_e2 = context.state.data) == null ? void 0 : _e2.pageParams) || [];
        let result = { pages: [], pageParams: [] };
        let currentPage = 0;
        const fetchFn = async () => {
          let cancelled = false;
          const addSignalProperty = (object) => {
            Object.defineProperty(object, "signal", {
              enumerable: true,
              get: () => {
                if (context.signal.aborted) {
                  cancelled = true;
                } else {
                  context.signal.addEventListener("abort", () => {
                    cancelled = true;
                  });
                }
                return context.signal;
              },
            });
          };
          const queryFn = ensureQueryFn(context.options, context.fetchOptions);
          const fetchPage = async (data, param, previous) => {
            if (cancelled) {
              return Promise.reject();
            }
            if (param == null && data.pages.length) {
              return Promise.resolve(data);
            }
            const queryFnContext = {
              queryKey: context.queryKey,
              pageParam: param,
              direction: previous ? "backward" : "forward",
              meta: context.options.meta,
            };
            addSignalProperty(queryFnContext);
            const page = await queryFn(queryFnContext);
            const { maxPages } = context.options;
            const addTo = previous ? addToStart : addToEnd;
            return {
              pages: addTo(data.pages, page, maxPages),
              pageParams: addTo(data.pageParams, param, maxPages),
            };
          };
          if (direction && oldPages.length) {
            const previous = direction === "backward";
            const pageParamFn = previous
              ? getPreviousPageParam
              : getNextPageParam;
            const oldData = {
              pages: oldPages,
              pageParams: oldPageParams,
            };
            const param = pageParamFn(options, oldData);
            result = await fetchPage(oldData, param, previous);
          } else {
            const remainingPages = pages ?? oldPages.length;
            do {
              const param =
                currentPage === 0
                  ? oldPageParams[0] ?? options.initialPageParam
                  : getNextPageParam(options, result);
              if (currentPage > 0 && param == null) {
                break;
              }
              result = await fetchPage(result, param);
              currentPage++;
            } while (currentPage < remainingPages);
          }
          return result;
        };
        if (context.options.persister) {
          context.fetchFn = () => {
            var _a3, _b3;
            return (_b3 = (_a3 = context.options).persister) == null
              ? void 0
              : _b3.call(
                  _a3,
                  fetchFn,
                  {
                    queryKey: context.queryKey,
                    meta: context.options.meta,
                    signal: context.signal,
                  },
                  query
                );
          };
        } else {
          context.fetchFn = fetchFn;
        }
      },
    };
  }
  function getNextPageParam(options, { pages, pageParams }) {
    const lastIndex = pages.length - 1;
    return pages.length > 0
      ? options.getNextPageParam(
          pages[lastIndex],
          pages,
          pageParams[lastIndex],
          pageParams
        )
      : void 0;
  }
  function getPreviousPageParam(options, { pages, pageParams }) {
    var _a2;
    return pages.length > 0
      ? (_a2 = options.getPreviousPageParam) == null
        ? void 0
        : _a2.call(options, pages[0], pages, pageParams[0], pageParams)
      : void 0;
  }
  var QueryClient =
    ((_h = class {
      constructor(config = {}) {
        __privateAdd(this, _queryCache, void 0);
        __privateAdd(this, _mutationCache2, void 0);
        __privateAdd(this, _defaultOptions2, void 0);
        __privateAdd(this, _queryDefaults, void 0);
        __privateAdd(this, _mutationDefaults, void 0);
        __privateAdd(this, _mountCount, void 0);
        __privateAdd(this, _unsubscribeFocus, void 0);
        __privateAdd(this, _unsubscribeOnline, void 0);
        __privateSet(this, _queryCache, config.queryCache || new QueryCache());
        __privateSet(
          this,
          _mutationCache2,
          config.mutationCache || new MutationCache()
        );
        __privateSet(this, _defaultOptions2, config.defaultOptions || {});
        __privateSet(this, _queryDefaults, /* @__PURE__ */ new Map());
        __privateSet(this, _mutationDefaults, /* @__PURE__ */ new Map());
        __privateSet(this, _mountCount, 0);
      }
      mount() {
        __privateWrapper(this, _mountCount)._++;
        if (__privateGet(this, _mountCount) !== 1) return;
        __privateSet(
          this,
          _unsubscribeFocus,
          focusManager.subscribe(async (focused) => {
            if (focused) {
              await this.resumePausedMutations();
              __privateGet(this, _queryCache).onFocus();
            }
          })
        );
        __privateSet(
          this,
          _unsubscribeOnline,
          onlineManager.subscribe(async (online) => {
            if (online) {
              await this.resumePausedMutations();
              __privateGet(this, _queryCache).onOnline();
            }
          })
        );
      }
      unmount() {
        var _a2, _b2;
        __privateWrapper(this, _mountCount)._--;
        if (__privateGet(this, _mountCount) !== 0) return;
        (_a2 = __privateGet(this, _unsubscribeFocus)) == null
          ? void 0
          : _a2.call(this);
        __privateSet(this, _unsubscribeFocus, void 0);
        (_b2 = __privateGet(this, _unsubscribeOnline)) == null
          ? void 0
          : _b2.call(this);
        __privateSet(this, _unsubscribeOnline, void 0);
      }
      isFetching(filters) {
        return __privateGet(this, _queryCache).findAll({
          ...filters,
          fetchStatus: "fetching",
        }).length;
      }
      isMutating(filters) {
        return __privateGet(this, _mutationCache2).findAll({
          ...filters,
          status: "pending",
        }).length;
      }
      getQueryData(queryKey) {
        var _a2;
        const options = this.defaultQueryOptions({ queryKey });
        return (_a2 = __privateGet(this, _queryCache).get(options.queryHash)) ==
          null
          ? void 0
          : _a2.state.data;
      }
      ensureQueryData(options) {
        const cachedData = this.getQueryData(options.queryKey);
        if (cachedData === void 0) return this.fetchQuery(options);
        else {
          const defaultedOptions = this.defaultQueryOptions(options);
          const query = __privateGet(this, _queryCache).build(
            this,
            defaultedOptions
          );
          if (
            options.revalidateIfStale &&
            query.isStaleByTime(
              resolveStaleTime(defaultedOptions.staleTime, query)
            )
          ) {
            void this.prefetchQuery(defaultedOptions);
          }
          return Promise.resolve(cachedData);
        }
      }
      getQueriesData(filters) {
        return __privateGet(this, _queryCache)
          .findAll(filters)
          .map(({ queryKey, state }) => {
            const data = state.data;
            return [queryKey, data];
          });
      }
      setQueryData(queryKey, updater, options) {
        const defaultedOptions = this.defaultQueryOptions({ queryKey });
        const query = __privateGet(this, _queryCache).get(
          defaultedOptions.queryHash
        );
        const prevData = query == null ? void 0 : query.state.data;
        const data = functionalUpdate(updater, prevData);
        if (data === void 0) {
          return void 0;
        }
        return __privateGet(this, _queryCache)
          .build(this, defaultedOptions)
          .setData(data, { ...options, manual: true });
      }
      setQueriesData(filters, updater, options) {
        return notifyManager.batch(() =>
          __privateGet(this, _queryCache)
            .findAll(filters)
            .map(({ queryKey }) => [
              queryKey,
              this.setQueryData(queryKey, updater, options),
            ])
        );
      }
      getQueryState(queryKey) {
        var _a2;
        const options = this.defaultQueryOptions({ queryKey });
        return (_a2 = __privateGet(this, _queryCache).get(options.queryHash)) ==
          null
          ? void 0
          : _a2.state;
      }
      removeQueries(filters) {
        const queryCache = __privateGet(this, _queryCache);
        notifyManager.batch(() => {
          queryCache.findAll(filters).forEach((query) => {
            queryCache.remove(query);
          });
        });
      }
      resetQueries(filters, options) {
        const queryCache = __privateGet(this, _queryCache);
        const refetchFilters = {
          type: "active",
          ...filters,
        };
        return notifyManager.batch(() => {
          queryCache.findAll(filters).forEach((query) => {
            query.reset();
          });
          return this.refetchQueries(refetchFilters, options);
        });
      }
      cancelQueries(filters = {}, cancelOptions = {}) {
        const defaultedCancelOptions = { revert: true, ...cancelOptions };
        const promises = notifyManager.batch(() =>
          __privateGet(this, _queryCache)
            .findAll(filters)
            .map((query) => query.cancel(defaultedCancelOptions))
        );
        return Promise.all(promises).then(noop$2).catch(noop$2);
      }
      invalidateQueries(filters = {}, options = {}) {
        return notifyManager.batch(() => {
          __privateGet(this, _queryCache)
            .findAll(filters)
            .forEach((query) => {
              query.invalidate();
            });
          if (filters.refetchType === "none") {
            return Promise.resolve();
          }
          const refetchFilters = {
            ...filters,
            type: filters.refetchType ?? filters.type ?? "active",
          };
          return this.refetchQueries(refetchFilters, options);
        });
      }
      refetchQueries(filters = {}, options) {
        const fetchOptions = {
          ...options,
          cancelRefetch:
            (options == null ? void 0 : options.cancelRefetch) ?? true,
        };
        const promises = notifyManager.batch(() =>
          __privateGet(this, _queryCache)
            .findAll(filters)
            .filter((query) => !query.isDisabled())
            .map((query) => {
              let promise = query.fetch(void 0, fetchOptions);
              if (!fetchOptions.throwOnError) {
                promise = promise.catch(noop$2);
              }
              return query.state.fetchStatus === "paused"
                ? Promise.resolve()
                : promise;
            })
        );
        return Promise.all(promises).then(noop$2);
      }
      fetchQuery(options) {
        const defaultedOptions = this.defaultQueryOptions(options);
        if (defaultedOptions.retry === void 0) {
          defaultedOptions.retry = false;
        }
        const query = __privateGet(this, _queryCache).build(
          this,
          defaultedOptions
        );
        return query.isStaleByTime(
          resolveStaleTime(defaultedOptions.staleTime, query)
        )
          ? query.fetch(defaultedOptions)
          : Promise.resolve(query.state.data);
      }
      prefetchQuery(options) {
        return this.fetchQuery(options).then(noop$2).catch(noop$2);
      }
      fetchInfiniteQuery(options) {
        options.behavior = infiniteQueryBehavior(options.pages);
        return this.fetchQuery(options);
      }
      prefetchInfiniteQuery(options) {
        return this.fetchInfiniteQuery(options).then(noop$2).catch(noop$2);
      }
      ensureInfiniteQueryData(options) {
        options.behavior = infiniteQueryBehavior(options.pages);
        return this.ensureQueryData(options);
      }
      resumePausedMutations() {
        if (onlineManager.isOnline()) {
          return __privateGet(this, _mutationCache2).resumePausedMutations();
        }
        return Promise.resolve();
      }
      getQueryCache() {
        return __privateGet(this, _queryCache);
      }
      getMutationCache() {
        return __privateGet(this, _mutationCache2);
      }
      getDefaultOptions() {
        return __privateGet(this, _defaultOptions2);
      }
      setDefaultOptions(options) {
        __privateSet(this, _defaultOptions2, options);
      }
      setQueryDefaults(queryKey, options) {
        __privateGet(this, _queryDefaults).set(hashKey(queryKey), {
          queryKey,
          defaultOptions: options,
        });
      }
      getQueryDefaults(queryKey) {
        const defaults2 = [...__privateGet(this, _queryDefaults).values()];
        let result = {};
        defaults2.forEach((queryDefault) => {
          if (partialMatchKey(queryKey, queryDefault.queryKey)) {
            result = { ...result, ...queryDefault.defaultOptions };
          }
        });
        return result;
      }
      setMutationDefaults(mutationKey, options) {
        __privateGet(this, _mutationDefaults).set(hashKey(mutationKey), {
          mutationKey,
          defaultOptions: options,
        });
      }
      getMutationDefaults(mutationKey) {
        const defaults2 = [...__privateGet(this, _mutationDefaults).values()];
        let result = {};
        defaults2.forEach((queryDefault) => {
          if (partialMatchKey(mutationKey, queryDefault.mutationKey)) {
            result = { ...result, ...queryDefault.defaultOptions };
          }
        });
        return result;
      }
      defaultQueryOptions(options) {
        if (options._defaulted) {
          return options;
        }
        const defaultedOptions = {
          ...__privateGet(this, _defaultOptions2).queries,
          ...this.getQueryDefaults(options.queryKey),
          ...options,
          _defaulted: true,
        };
        if (!defaultedOptions.queryHash) {
          defaultedOptions.queryHash = hashQueryKeyByOptions(
            defaultedOptions.queryKey,
            defaultedOptions
          );
        }
        if (defaultedOptions.refetchOnReconnect === void 0) {
          defaultedOptions.refetchOnReconnect =
            defaultedOptions.networkMode !== "always";
        }
        if (defaultedOptions.throwOnError === void 0) {
          defaultedOptions.throwOnError = !!defaultedOptions.suspense;
        }
        if (!defaultedOptions.networkMode && defaultedOptions.persister) {
          defaultedOptions.networkMode = "offlineFirst";
        }
        if (
          defaultedOptions.enabled !== true &&
          defaultedOptions.queryFn === skipToken
        ) {
          defaultedOptions.enabled = false;
        }
        return defaultedOptions;
      }
      defaultMutationOptions(options) {
        if (options == null ? void 0 : options._defaulted) {
          return options;
        }
        return {
          ...__privateGet(this, _defaultOptions2).mutations,
          ...((options == null ? void 0 : options.mutationKey) &&
            this.getMutationDefaults(options.mutationKey)),
          ...options,
          _defaulted: true,
        };
      }
      clear() {
        __privateGet(this, _queryCache).clear();
        __privateGet(this, _mutationCache2).clear();
      }
    }),
    (_queryCache = new WeakMap()),
    (_mutationCache2 = new WeakMap()),
    (_defaultOptions2 = new WeakMap()),
    (_queryDefaults = new WeakMap()),
    (_mutationDefaults = new WeakMap()),
    (_mountCount = new WeakMap()),
    (_unsubscribeFocus = new WeakMap()),
    (_unsubscribeOnline = new WeakMap()),
    _h);
  var QueryObserver =
    ((_i = class extends Subscribable {
      constructor(client2, options) {
        super();
        __privateAdd(this, _executeFetch);
        __privateAdd(this, _updateStaleTimeout);
        __privateAdd(this, _computeRefetchInterval);
        __privateAdd(this, _updateRefetchInterval);
        __privateAdd(this, _updateTimers);
        __privateAdd(this, _clearStaleTimeout);
        __privateAdd(this, _clearRefetchInterval);
        __privateAdd(this, _updateQuery);
        __privateAdd(this, _notify);
        __privateAdd(this, _client, void 0);
        __privateAdd(this, _currentQuery, void 0);
        __privateAdd(this, _currentQueryInitialState, void 0);
        __privateAdd(this, _currentResult, void 0);
        __privateAdd(this, _currentResultState, void 0);
        __privateAdd(this, _currentResultOptions, void 0);
        __privateAdd(this, _currentThenable, void 0);
        __privateAdd(this, _selectError, void 0);
        __privateAdd(this, _selectFn, void 0);
        __privateAdd(this, _selectResult, void 0);
        // This property keeps track of the last query with defined data.
        // It will be used to pass the previous data and query to the placeholder function between renders.
        __privateAdd(this, _lastQueryWithDefinedData, void 0);
        __privateAdd(this, _staleTimeoutId, void 0);
        __privateAdd(this, _refetchIntervalId, void 0);
        __privateAdd(this, _currentRefetchInterval, void 0);
        __privateAdd(this, _trackedProps, /* @__PURE__ */ new Set());
        this.options = options;
        __privateSet(this, _client, client2);
        __privateSet(this, _selectError, null);
        __privateSet(this, _currentThenable, pendingThenable());
        if (!this.options.experimental_prefetchInRender) {
          __privateGet(this, _currentThenable).reject(
            new Error(
              "experimental_prefetchInRender feature flag is not enabled"
            )
          );
        }
        this.bindMethods();
        this.setOptions(options);
      }
      bindMethods() {
        this.refetch = this.refetch.bind(this);
      }
      onSubscribe() {
        if (this.listeners.size === 1) {
          __privateGet(this, _currentQuery).addObserver(this);
          if (
            shouldFetchOnMount(__privateGet(this, _currentQuery), this.options)
          ) {
            __privateMethod(this, _executeFetch, executeFetch_fn).call(this);
          } else {
            this.updateResult();
          }
          __privateMethod(this, _updateTimers, updateTimers_fn).call(this);
        }
      }
      onUnsubscribe() {
        if (!this.hasListeners()) {
          this.destroy();
        }
      }
      shouldFetchOnReconnect() {
        return shouldFetchOn(
          __privateGet(this, _currentQuery),
          this.options,
          this.options.refetchOnReconnect
        );
      }
      shouldFetchOnWindowFocus() {
        return shouldFetchOn(
          __privateGet(this, _currentQuery),
          this.options,
          this.options.refetchOnWindowFocus
        );
      }
      destroy() {
        this.listeners = /* @__PURE__ */ new Set();
        __privateMethod(this, _clearStaleTimeout, clearStaleTimeout_fn).call(
          this
        );
        __privateMethod(
          this,
          _clearRefetchInterval,
          clearRefetchInterval_fn
        ).call(this);
        __privateGet(this, _currentQuery).removeObserver(this);
      }
      setOptions(options, notifyOptions) {
        const prevOptions = this.options;
        const prevQuery = __privateGet(this, _currentQuery);
        this.options = __privateGet(this, _client).defaultQueryOptions(options);
        if (
          this.options.enabled !== void 0 &&
          typeof this.options.enabled !== "boolean" &&
          typeof this.options.enabled !== "function" &&
          typeof resolveEnabled(
            this.options.enabled,
            __privateGet(this, _currentQuery)
          ) !== "boolean"
        ) {
          throw new Error(
            "Expected enabled to be a boolean or a callback that returns a boolean"
          );
        }
        __privateMethod(this, _updateQuery, updateQuery_fn).call(this);
        __privateGet(this, _currentQuery).setOptions(this.options);
        if (
          prevOptions._defaulted &&
          !shallowEqualObjects(this.options, prevOptions)
        ) {
          __privateGet(this, _client)
            .getQueryCache()
            .notify({
              type: "observerOptionsUpdated",
              query: __privateGet(this, _currentQuery),
              observer: this,
            });
        }
        const mounted = this.hasListeners();
        if (
          mounted &&
          shouldFetchOptionally(
            __privateGet(this, _currentQuery),
            prevQuery,
            this.options,
            prevOptions
          )
        ) {
          __privateMethod(this, _executeFetch, executeFetch_fn).call(this);
        }
        this.updateResult(notifyOptions);
        if (
          mounted &&
          (__privateGet(this, _currentQuery) !== prevQuery ||
            resolveEnabled(
              this.options.enabled,
              __privateGet(this, _currentQuery)
            ) !==
              resolveEnabled(
                prevOptions.enabled,
                __privateGet(this, _currentQuery)
              ) ||
            resolveStaleTime(
              this.options.staleTime,
              __privateGet(this, _currentQuery)
            ) !==
              resolveStaleTime(
                prevOptions.staleTime,
                __privateGet(this, _currentQuery)
              ))
        ) {
          __privateMethod(
            this,
            _updateStaleTimeout,
            updateStaleTimeout_fn
          ).call(this);
        }
        const nextRefetchInterval = __privateMethod(
          this,
          _computeRefetchInterval,
          computeRefetchInterval_fn
        ).call(this);
        if (
          mounted &&
          (__privateGet(this, _currentQuery) !== prevQuery ||
            resolveEnabled(
              this.options.enabled,
              __privateGet(this, _currentQuery)
            ) !==
              resolveEnabled(
                prevOptions.enabled,
                __privateGet(this, _currentQuery)
              ) ||
            nextRefetchInterval !== __privateGet(this, _currentRefetchInterval))
        ) {
          __privateMethod(
            this,
            _updateRefetchInterval,
            updateRefetchInterval_fn
          ).call(this, nextRefetchInterval);
        }
      }
      getOptimisticResult(options) {
        const query = __privateGet(this, _client)
          .getQueryCache()
          .build(__privateGet(this, _client), options);
        const result = this.createResult(query, options);
        if (shouldAssignObserverCurrentProperties(this, result)) {
          __privateSet(this, _currentResult, result);
          __privateSet(this, _currentResultOptions, this.options);
          __privateSet(
            this,
            _currentResultState,
            __privateGet(this, _currentQuery).state
          );
        }
        return result;
      }
      getCurrentResult() {
        return __privateGet(this, _currentResult);
      }
      trackResult(result, onPropTracked) {
        const trackedResult = {};
        Object.keys(result).forEach((key) => {
          Object.defineProperty(trackedResult, key, {
            configurable: false,
            enumerable: true,
            get: () => {
              this.trackProp(key);
              onPropTracked == null ? void 0 : onPropTracked(key);
              return result[key];
            },
          });
        });
        return trackedResult;
      }
      trackProp(key) {
        __privateGet(this, _trackedProps).add(key);
      }
      getCurrentQuery() {
        return __privateGet(this, _currentQuery);
      }
      refetch({ ...options } = {}) {
        return this.fetch({
          ...options,
        });
      }
      fetchOptimistic(options) {
        const defaultedOptions = __privateGet(
          this,
          _client
        ).defaultQueryOptions(options);
        const query = __privateGet(this, _client)
          .getQueryCache()
          .build(__privateGet(this, _client), defaultedOptions);
        query.isFetchingOptimistic = true;
        return query
          .fetch()
          .then(() => this.createResult(query, defaultedOptions));
      }
      fetch(fetchOptions) {
        return __privateMethod(this, _executeFetch, executeFetch_fn)
          .call(this, {
            ...fetchOptions,
            cancelRefetch: fetchOptions.cancelRefetch ?? true,
          })
          .then(() => {
            this.updateResult();
            return __privateGet(this, _currentResult);
          });
      }
      createResult(query, options) {
        var _a2;
        const prevQuery = __privateGet(this, _currentQuery);
        const prevOptions = this.options;
        const prevResult = __privateGet(this, _currentResult);
        const prevResultState = __privateGet(this, _currentResultState);
        const prevResultOptions = __privateGet(this, _currentResultOptions);
        const queryChange = query !== prevQuery;
        const queryInitialState = queryChange
          ? query.state
          : __privateGet(this, _currentQueryInitialState);
        const { state } = query;
        let newState = { ...state };
        let isPlaceholderData = false;
        let data;
        if (options._optimisticResults) {
          const mounted = this.hasListeners();
          const fetchOnMount = !mounted && shouldFetchOnMount(query, options);
          const fetchOptionally =
            mounted &&
            shouldFetchOptionally(query, prevQuery, options, prevOptions);
          if (fetchOnMount || fetchOptionally) {
            newState = {
              ...newState,
              ...fetchState(state.data, query.options),
            };
          }
          if (options._optimisticResults === "isRestoring") {
            newState.fetchStatus = "idle";
          }
        }
        let { error, errorUpdatedAt, status } = newState;
        if (options.select && newState.data !== void 0) {
          if (
            prevResult &&
            newState.data ===
              (prevResultState == null ? void 0 : prevResultState.data) &&
            options.select === __privateGet(this, _selectFn)
          ) {
            data = __privateGet(this, _selectResult);
          } else {
            try {
              __privateSet(this, _selectFn, options.select);
              data = options.select(newState.data);
              data = replaceData(
                prevResult == null ? void 0 : prevResult.data,
                data,
                options
              );
              __privateSet(this, _selectResult, data);
              __privateSet(this, _selectError, null);
            } catch (selectError) {
              __privateSet(this, _selectError, selectError);
            }
          }
        } else {
          data = newState.data;
        }
        if (
          options.placeholderData !== void 0 &&
          data === void 0 &&
          status === "pending"
        ) {
          let placeholderData;
          if (
            (prevResult == null ? void 0 : prevResult.isPlaceholderData) &&
            options.placeholderData ===
              (prevResultOptions == null
                ? void 0
                : prevResultOptions.placeholderData)
          ) {
            placeholderData = prevResult.data;
          } else {
            placeholderData =
              typeof options.placeholderData === "function"
                ? options.placeholderData(
                    (_a2 = __privateGet(this, _lastQueryWithDefinedData)) ==
                      null
                      ? void 0
                      : _a2.state.data,
                    __privateGet(this, _lastQueryWithDefinedData)
                  )
                : options.placeholderData;
            if (options.select && placeholderData !== void 0) {
              try {
                placeholderData = options.select(placeholderData);
                __privateSet(this, _selectError, null);
              } catch (selectError) {
                __privateSet(this, _selectError, selectError);
              }
            }
          }
          if (placeholderData !== void 0) {
            status = "success";
            data = replaceData(
              prevResult == null ? void 0 : prevResult.data,
              placeholderData,
              options
            );
            isPlaceholderData = true;
          }
        }
        if (__privateGet(this, _selectError)) {
          error = __privateGet(this, _selectError);
          data = __privateGet(this, _selectResult);
          errorUpdatedAt = Date.now();
          status = "error";
        }
        const isFetching = newState.fetchStatus === "fetching";
        const isPending = status === "pending";
        const isError = status === "error";
        const isLoading = isPending && isFetching;
        const hasData = data !== void 0;
        const result = {
          status,
          fetchStatus: newState.fetchStatus,
          isPending,
          isSuccess: status === "success",
          isError,
          isInitialLoading: isLoading,
          isLoading,
          data,
          dataUpdatedAt: newState.dataUpdatedAt,
          error,
          errorUpdatedAt,
          failureCount: newState.fetchFailureCount,
          failureReason: newState.fetchFailureReason,
          errorUpdateCount: newState.errorUpdateCount,
          isFetched:
            newState.dataUpdateCount > 0 || newState.errorUpdateCount > 0,
          isFetchedAfterMount:
            newState.dataUpdateCount > queryInitialState.dataUpdateCount ||
            newState.errorUpdateCount > queryInitialState.errorUpdateCount,
          isFetching,
          isRefetching: isFetching && !isPending,
          isLoadingError: isError && !hasData,
          isPaused: newState.fetchStatus === "paused",
          isPlaceholderData,
          isRefetchError: isError && hasData,
          isStale: isStale(query, options),
          refetch: this.refetch,
          promise: __privateGet(this, _currentThenable),
        };
        return result;
      }
      updateResult(notifyOptions) {
        const prevResult = __privateGet(this, _currentResult);
        const nextResult = this.createResult(
          __privateGet(this, _currentQuery),
          this.options
        );
        __privateSet(
          this,
          _currentResultState,
          __privateGet(this, _currentQuery).state
        );
        __privateSet(this, _currentResultOptions, this.options);
        if (__privateGet(this, _currentResultState).data !== void 0) {
          __privateSet(
            this,
            _lastQueryWithDefinedData,
            __privateGet(this, _currentQuery)
          );
        }
        if (shallowEqualObjects(nextResult, prevResult)) {
          return;
        }
        if (this.options.experimental_prefetchInRender) {
          const finalizeThenableIfPossible = (thenable) => {
            if (nextResult.status === "error") {
              thenable.reject(nextResult.error);
            } else if (nextResult.data !== void 0) {
              thenable.resolve(nextResult.data);
            }
          };
          const recreateThenable = () => {
            const pending = __privateSet(
              this,
              _currentThenable,
              (nextResult.promise = pendingThenable())
            );
            finalizeThenableIfPossible(pending);
          };
          const prevThenable = __privateGet(this, _currentThenable);
          switch (prevThenable.status) {
            case "pending":
              finalizeThenableIfPossible(prevThenable);
              break;
            case "fulfilled":
              if (
                nextResult.status === "error" ||
                nextResult.data !== prevThenable.value
              ) {
                recreateThenable();
              }
              break;
            case "rejected":
              if (
                nextResult.status !== "error" ||
                nextResult.error !== prevThenable.reason
              ) {
                recreateThenable();
              }
              break;
          }
        }
        __privateSet(this, _currentResult, nextResult);
        const defaultNotifyOptions = {};
        const shouldNotifyListeners = () => {
          if (!prevResult) {
            return true;
          }
          const { notifyOnChangeProps } = this.options;
          const notifyOnChangePropsValue =
            typeof notifyOnChangeProps === "function"
              ? notifyOnChangeProps()
              : notifyOnChangeProps;
          if (
            notifyOnChangePropsValue === "all" ||
            (!notifyOnChangePropsValue &&
              !__privateGet(this, _trackedProps).size)
          ) {
            return true;
          }
          const includedProps = new Set(
            notifyOnChangePropsValue ?? __privateGet(this, _trackedProps)
          );
          if (this.options.throwOnError) {
            includedProps.add("error");
          }
          return Object.keys(__privateGet(this, _currentResult)).some((key) => {
            const typedKey = key;
            const changed =
              __privateGet(this, _currentResult)[typedKey] !==
              prevResult[typedKey];
            return changed && includedProps.has(typedKey);
          });
        };
        if (
          (notifyOptions == null ? void 0 : notifyOptions.listeners) !==
            false &&
          shouldNotifyListeners()
        ) {
          defaultNotifyOptions.listeners = true;
        }
        __privateMethod(this, _notify, notify_fn).call(this, {
          ...defaultNotifyOptions,
          ...notifyOptions,
        });
      }
      onQueryUpdate() {
        this.updateResult();
        if (this.hasListeners()) {
          __privateMethod(this, _updateTimers, updateTimers_fn).call(this);
        }
      }
    }),
    (_client = new WeakMap()),
    (_currentQuery = new WeakMap()),
    (_currentQueryInitialState = new WeakMap()),
    (_currentResult = new WeakMap()),
    (_currentResultState = new WeakMap()),
    (_currentResultOptions = new WeakMap()),
    (_currentThenable = new WeakMap()),
    (_selectError = new WeakMap()),
    (_selectFn = new WeakMap()),
    (_selectResult = new WeakMap()),
    (_lastQueryWithDefinedData = new WeakMap()),
    (_staleTimeoutId = new WeakMap()),
    (_refetchIntervalId = new WeakMap()),
    (_currentRefetchInterval = new WeakMap()),
    (_trackedProps = new WeakMap()),
    (_executeFetch = new WeakSet()),
    (executeFetch_fn = function (fetchOptions) {
      __privateMethod(this, _updateQuery, updateQuery_fn).call(this);
      let promise = __privateGet(this, _currentQuery).fetch(
        this.options,
        fetchOptions
      );
      if (!(fetchOptions == null ? void 0 : fetchOptions.throwOnError)) {
        promise = promise.catch(noop$2);
      }
      return promise;
    }),
    (_updateStaleTimeout = new WeakSet()),
    (updateStaleTimeout_fn = function () {
      __privateMethod(this, _clearStaleTimeout, clearStaleTimeout_fn).call(
        this
      );
      const staleTime = resolveStaleTime(
        this.options.staleTime,
        __privateGet(this, _currentQuery)
      );
      if (
        isServer ||
        __privateGet(this, _currentResult).isStale ||
        !isValidTimeout(staleTime)
      ) {
        return;
      }
      const time = timeUntilStale(
        __privateGet(this, _currentResult).dataUpdatedAt,
        staleTime
      );
      const timeout = time + 1;
      __privateSet(
        this,
        _staleTimeoutId,
        setTimeout(() => {
          if (!__privateGet(this, _currentResult).isStale) {
            this.updateResult();
          }
        }, timeout)
      );
    }),
    (_computeRefetchInterval = new WeakSet()),
    (computeRefetchInterval_fn = function () {
      return (
        (typeof this.options.refetchInterval === "function"
          ? this.options.refetchInterval(__privateGet(this, _currentQuery))
          : this.options.refetchInterval) ?? false
      );
    }),
    (_updateRefetchInterval = new WeakSet()),
    (updateRefetchInterval_fn = function (nextInterval) {
      __privateMethod(
        this,
        _clearRefetchInterval,
        clearRefetchInterval_fn
      ).call(this);
      __privateSet(this, _currentRefetchInterval, nextInterval);
      if (
        isServer ||
        resolveEnabled(
          this.options.enabled,
          __privateGet(this, _currentQuery)
        ) === false ||
        !isValidTimeout(__privateGet(this, _currentRefetchInterval)) ||
        __privateGet(this, _currentRefetchInterval) === 0
      ) {
        return;
      }
      __privateSet(
        this,
        _refetchIntervalId,
        setInterval(() => {
          if (
            this.options.refetchIntervalInBackground ||
            focusManager.isFocused()
          ) {
            __privateMethod(this, _executeFetch, executeFetch_fn).call(this);
          }
        }, __privateGet(this, _currentRefetchInterval))
      );
    }),
    (_updateTimers = new WeakSet()),
    (updateTimers_fn = function () {
      __privateMethod(this, _updateStaleTimeout, updateStaleTimeout_fn).call(
        this
      );
      __privateMethod(
        this,
        _updateRefetchInterval,
        updateRefetchInterval_fn
      ).call(
        this,
        __privateMethod(
          this,
          _computeRefetchInterval,
          computeRefetchInterval_fn
        ).call(this)
      );
    }),
    (_clearStaleTimeout = new WeakSet()),
    (clearStaleTimeout_fn = function () {
      if (__privateGet(this, _staleTimeoutId)) {
        clearTimeout(__privateGet(this, _staleTimeoutId));
        __privateSet(this, _staleTimeoutId, void 0);
      }
    }),
    (_clearRefetchInterval = new WeakSet()),
    (clearRefetchInterval_fn = function () {
      if (__privateGet(this, _refetchIntervalId)) {
        clearInterval(__privateGet(this, _refetchIntervalId));
        __privateSet(this, _refetchIntervalId, void 0);
      }
    }),
    (_updateQuery = new WeakSet()),
    (updateQuery_fn = function () {
      const query = __privateGet(this, _client)
        .getQueryCache()
        .build(__privateGet(this, _client), this.options);
      if (query === __privateGet(this, _currentQuery)) {
        return;
      }
      const prevQuery = __privateGet(this, _currentQuery);
      __privateSet(this, _currentQuery, query);
      __privateSet(this, _currentQueryInitialState, query.state);
      if (this.hasListeners()) {
        prevQuery == null ? void 0 : prevQuery.removeObserver(this);
        query.addObserver(this);
      }
    }),
    (_notify = new WeakSet()),
    (notify_fn = function (notifyOptions) {
      notifyManager.batch(() => {
        if (notifyOptions.listeners) {
          this.listeners.forEach((listener) => {
            listener(__privateGet(this, _currentResult));
          });
        }
        __privateGet(this, _client)
          .getQueryCache()
          .notify({
            query: __privateGet(this, _currentQuery),
            type: "observerResultsUpdated",
          });
      });
    }),
    _i);
  function shouldLoadOnMount(query, options) {
    return (
      resolveEnabled(options.enabled, query) !== false &&
      query.state.data === void 0 &&
      !(query.state.status === "error" && options.retryOnMount === false)
    );
  }
  function shouldFetchOnMount(query, options) {
    return (
      shouldLoadOnMount(query, options) ||
      (query.state.data !== void 0 &&
        shouldFetchOn(query, options, options.refetchOnMount))
    );
  }
  function shouldFetchOn(query, options, field) {
    if (resolveEnabled(options.enabled, query) !== false) {
      const value = typeof field === "function" ? field(query) : field;
      return value === "always" || (value !== false && isStale(query, options));
    }
    return false;
  }
  function shouldFetchOptionally(query, prevQuery, options, prevOptions) {
    return (
      (query !== prevQuery ||
        resolveEnabled(prevOptions.enabled, query) === false) &&
      (!options.suspense || query.state.status !== "error") &&
      isStale(query, options)
    );
  }
  function isStale(query, options) {
    return (
      resolveEnabled(options.enabled, query) !== false &&
      query.isStaleByTime(resolveStaleTime(options.staleTime, query))
    );
  }
  function shouldAssignObserverCurrentProperties(observer, optimisticResult) {
    if (!shallowEqualObjects(observer.getCurrentResult(), optimisticResult)) {
      return true;
    }
    return false;
  }
  var QueryClientContext = reactExports.createContext(void 0);
  var useQueryClient = (queryClient2) => {
    const client2 = reactExports.useContext(QueryClientContext);
    if (queryClient2) {
      return queryClient2;
    }
    if (!client2) {
      throw new Error("No QueryClient set, use QueryClientProvider to set one");
    }
    return client2;
  };
  var QueryClientProvider = ({ client: client2, children }) => {
    reactExports.useEffect(() => {
      client2.mount();
      return () => {
        client2.unmount();
      };
    }, [client2]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(QueryClientContext.Provider, {
      value: client2,
      children,
    });
  };
  var IsRestoringContext = reactExports.createContext(false);
  var useIsRestoring = () => reactExports.useContext(IsRestoringContext);
  IsRestoringContext.Provider;
  function createValue() {
    let isReset = false;
    return {
      clearReset: () => {
        isReset = false;
      },
      reset: () => {
        isReset = true;
      },
      isReset: () => {
        return isReset;
      },
    };
  }
  var QueryErrorResetBoundaryContext = reactExports.createContext(
    createValue()
  );
  var useQueryErrorResetBoundary = () =>
    reactExports.useContext(QueryErrorResetBoundaryContext);
  function shouldThrowError(throwError, params) {
    if (typeof throwError === "function") {
      return throwError(...params);
    }
    return !!throwError;
  }
  function noop$1() {}
  var ensurePreventErrorBoundaryRetry = (options, errorResetBoundary) => {
    if (options.suspense || options.throwOnError) {
      if (!errorResetBoundary.isReset()) {
        options.retryOnMount = false;
      }
    }
  };
  var useClearResetErrorBoundary = (errorResetBoundary) => {
    reactExports.useEffect(() => {
      errorResetBoundary.clearReset();
    }, [errorResetBoundary]);
  };
  var getHasError = ({ result, errorResetBoundary, throwOnError, query }) => {
    return (
      result.isError &&
      !errorResetBoundary.isReset() &&
      !result.isFetching &&
      query &&
      shouldThrowError(throwOnError, [result.error, query])
    );
  };
  var ensureSuspenseTimers = (defaultedOptions) => {
    if (defaultedOptions.suspense) {
      if (typeof defaultedOptions.staleTime !== "number") {
        defaultedOptions.staleTime = 1e3;
      }
      if (typeof defaultedOptions.gcTime === "number") {
        defaultedOptions.gcTime = Math.max(defaultedOptions.gcTime, 1e3);
      }
    }
  };
  var willFetch = (result, isRestoring) =>
    result.isLoading && result.isFetching && !isRestoring;
  var shouldSuspend = (defaultedOptions, result) =>
    (defaultedOptions == null ? void 0 : defaultedOptions.suspense) &&
    result.isPending;
  var fetchOptimistic = (defaultedOptions, observer, errorResetBoundary) =>
    observer.fetchOptimistic(defaultedOptions).catch(() => {
      errorResetBoundary.clearReset();
    });
  function useBaseQuery(options, Observer, queryClient2) {
    var _a2, _b2, _c2, _d2, _e2;
    const client2 = useQueryClient(queryClient2);
    const isRestoring = useIsRestoring();
    const errorResetBoundary = useQueryErrorResetBoundary();
    const defaultedOptions = client2.defaultQueryOptions(options);
    (_b2 =
      (_a2 = client2.getDefaultOptions().queries) == null
        ? void 0
        : _a2._experimental_beforeQuery) == null
      ? void 0
      : _b2.call(_a2, defaultedOptions);
    defaultedOptions._optimisticResults = isRestoring
      ? "isRestoring"
      : "optimistic";
    ensureSuspenseTimers(defaultedOptions);
    ensurePreventErrorBoundaryRetry(defaultedOptions, errorResetBoundary);
    useClearResetErrorBoundary(errorResetBoundary);
    const isNewCacheEntry = !client2.getQueryState(options.queryKey);
    const [observer] = reactExports.useState(
      () => new Observer(client2, defaultedOptions)
    );
    const result = observer.getOptimisticResult(defaultedOptions);
    reactExports.useSyncExternalStore(
      reactExports.useCallback(
        (onStoreChange) => {
          const unsubscribe = isRestoring
            ? () => void 0
            : observer.subscribe(notifyManager.batchCalls(onStoreChange));
          observer.updateResult();
          return unsubscribe;
        },
        [observer, isRestoring]
      ),
      () => observer.getCurrentResult(),
      () => observer.getCurrentResult()
    );
    reactExports.useEffect(() => {
      observer.setOptions(defaultedOptions, { listeners: false });
    }, [defaultedOptions, observer]);
    if (shouldSuspend(defaultedOptions, result)) {
      throw fetchOptimistic(defaultedOptions, observer, errorResetBoundary);
    }
    if (
      getHasError({
        result,
        errorResetBoundary,
        throwOnError: defaultedOptions.throwOnError,
        query: client2.getQueryCache().get(defaultedOptions.queryHash),
      })
    ) {
      throw result.error;
    }
    (_d2 =
      (_c2 = client2.getDefaultOptions().queries) == null
        ? void 0
        : _c2._experimental_afterQuery) == null
      ? void 0
      : _d2.call(_c2, defaultedOptions, result);
    if (
      defaultedOptions.experimental_prefetchInRender &&
      !isServer &&
      willFetch(result, isRestoring)
    ) {
      const promise = isNewCacheEntry
        ? // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
          fetchOptimistic(defaultedOptions, observer, errorResetBoundary)
        : // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
        (_e2 = client2.getQueryCache().get(defaultedOptions.queryHash)) == null
        ? void 0
        : _e2.promise;
      promise == null
        ? void 0
        : promise.catch(noop$1).finally(() => {
            if (!observer.hasListeners()) {
              observer.updateResult();
            }
          });
    }
    return !defaultedOptions.notifyOnChangeProps
      ? observer.trackResult(result)
      : result;
  }
  function useQuery(options, queryClient2) {
    return useBaseQuery(options, QueryObserver, queryClient2);
  }
  function bind(fn, thisArg) {
    return function wrap() {
      return fn.apply(thisArg, arguments);
    };
  }
  const { toString } = Object.prototype;
  const { getPrototypeOf } = Object;
  const kindOf = /* @__PURE__ */ ((cache) => (thing) => {
    const str = toString.call(thing);
    return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
  })(/* @__PURE__ */ Object.create(null));
  const kindOfTest = (type) => {
    type = type.toLowerCase();
    return (thing) => kindOf(thing) === type;
  };
  const typeOfTest = (type) => (thing) => typeof thing === type;
  const { isArray } = Array;
  const isUndefined = typeOfTest("undefined");
  function isBuffer(val) {
    return (
      val !== null &&
      !isUndefined(val) &&
      val.constructor !== null &&
      !isUndefined(val.constructor) &&
      isFunction(val.constructor.isBuffer) &&
      val.constructor.isBuffer(val)
    );
  }
  const isArrayBuffer = kindOfTest("ArrayBuffer");
  function isArrayBufferView(val) {
    let result;
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
      result = ArrayBuffer.isView(val);
    } else {
      result = val && val.buffer && isArrayBuffer(val.buffer);
    }
    return result;
  }
  const isString = typeOfTest("string");
  const isFunction = typeOfTest("function");
  const isNumber = typeOfTest("number");
  const isObject = (thing) => thing !== null && typeof thing === "object";
  const isBoolean = (thing) => thing === true || thing === false;
  const isPlainObject = (val) => {
    if (kindOf(val) !== "object") {
      return false;
    }
    const prototype2 = getPrototypeOf(val);
    return (
      (prototype2 === null ||
        prototype2 === Object.prototype ||
        Object.getPrototypeOf(prototype2) === null) &&
      !(Symbol.toStringTag in val) &&
      !(Symbol.iterator in val)
    );
  };
  const isDate = kindOfTest("Date");
  const isFile = kindOfTest("File");
  const isBlob = kindOfTest("Blob");
  const isFileList = kindOfTest("FileList");
  const isStream = (val) => isObject(val) && isFunction(val.pipe);
  const isFormData = (thing) => {
    let kind;
    return (
      thing &&
      ((typeof FormData === "function" && thing instanceof FormData) ||
        (isFunction(thing.append) &&
          ((kind = kindOf(thing)) === "formdata" || // detect form-data instance
            (kind === "object" &&
              isFunction(thing.toString) &&
              thing.toString() === "[object FormData]"))))
    );
  };
  const isURLSearchParams = kindOfTest("URLSearchParams");
  const [isReadableStream, isRequest, isResponse, isHeaders] = [
    "ReadableStream",
    "Request",
    "Response",
    "Headers",
  ].map(kindOfTest);
  const trim = (str) =>
    str.trim
      ? str.trim()
      : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
  function forEach(obj, fn, { allOwnKeys = false } = {}) {
    if (obj === null || typeof obj === "undefined") {
      return;
    }
    let i2;
    let l2;
    if (typeof obj !== "object") {
      obj = [obj];
    }
    if (isArray(obj)) {
      for (i2 = 0, l2 = obj.length; i2 < l2; i2++) {
        fn.call(null, obj[i2], i2, obj);
      }
    } else {
      const keys = allOwnKeys
        ? Object.getOwnPropertyNames(obj)
        : Object.keys(obj);
      const len = keys.length;
      let key;
      for (i2 = 0; i2 < len; i2++) {
        key = keys[i2];
        fn.call(null, obj[key], key, obj);
      }
    }
  }
  function findKey(obj, key) {
    key = key.toLowerCase();
    const keys = Object.keys(obj);
    let i2 = keys.length;
    let _key;
    while (i2-- > 0) {
      _key = keys[i2];
      if (key === _key.toLowerCase()) {
        return _key;
      }
    }
    return null;
  }
  const _global = (() => {
    if (typeof globalThis !== "undefined") return globalThis;
    return typeof self !== "undefined"
      ? self
      : typeof window !== "undefined"
      ? window
      : global;
  })();
  const isContextDefined = (context) =>
    !isUndefined(context) && context !== _global;
  function merge() {
    const { caseless } = (isContextDefined(this) && this) || {};
    const result = {};
    const assignValue = (val, key) => {
      const targetKey = (caseless && findKey(result, key)) || key;
      if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
        result[targetKey] = merge(result[targetKey], val);
      } else if (isPlainObject(val)) {
        result[targetKey] = merge({}, val);
      } else if (isArray(val)) {
        result[targetKey] = val.slice();
      } else {
        result[targetKey] = val;
      }
    };
    for (let i2 = 0, l2 = arguments.length; i2 < l2; i2++) {
      arguments[i2] && forEach(arguments[i2], assignValue);
    }
    return result;
  }
  const extend = (a2, b2, thisArg, { allOwnKeys } = {}) => {
    forEach(
      b2,
      (val, key) => {
        if (thisArg && isFunction(val)) {
          a2[key] = bind(val, thisArg);
        } else {
          a2[key] = val;
        }
      },
      { allOwnKeys }
    );
    return a2;
  };
  const stripBOM = (content) => {
    if (content.charCodeAt(0) === 65279) {
      content = content.slice(1);
    }
    return content;
  };
  const inherits = (constructor, superConstructor, props, descriptors2) => {
    constructor.prototype = Object.create(
      superConstructor.prototype,
      descriptors2
    );
    constructor.prototype.constructor = constructor;
    Object.defineProperty(constructor, "super", {
      value: superConstructor.prototype,
    });
    props && Object.assign(constructor.prototype, props);
  };
  const toFlatObject = (sourceObj, destObj, filter2, propFilter) => {
    let props;
    let i2;
    let prop;
    const merged = {};
    destObj = destObj || {};
    if (sourceObj == null) return destObj;
    do {
      props = Object.getOwnPropertyNames(sourceObj);
      i2 = props.length;
      while (i2-- > 0) {
        prop = props[i2];
        if (
          (!propFilter || propFilter(prop, sourceObj, destObj)) &&
          !merged[prop]
        ) {
          destObj[prop] = sourceObj[prop];
          merged[prop] = true;
        }
      }
      sourceObj = filter2 !== false && getPrototypeOf(sourceObj);
    } while (
      sourceObj &&
      (!filter2 || filter2(sourceObj, destObj)) &&
      sourceObj !== Object.prototype
    );
    return destObj;
  };
  const endsWith = (str, searchString, position) => {
    str = String(str);
    if (position === void 0 || position > str.length) {
      position = str.length;
    }
    position -= searchString.length;
    const lastIndex = str.indexOf(searchString, position);
    return lastIndex !== -1 && lastIndex === position;
  };
  const toArray = (thing) => {
    if (!thing) return null;
    if (isArray(thing)) return thing;
    let i2 = thing.length;
    if (!isNumber(i2)) return null;
    const arr = new Array(i2);
    while (i2-- > 0) {
      arr[i2] = thing[i2];
    }
    return arr;
  };
  const isTypedArray = /* @__PURE__ */ ((TypedArray) => {
    return (thing) => {
      return TypedArray && thing instanceof TypedArray;
    };
  })(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
  const forEachEntry = (obj, fn) => {
    const generator = obj && obj[Symbol.iterator];
    const iterator = generator.call(obj);
    let result;
    while ((result = iterator.next()) && !result.done) {
      const pair = result.value;
      fn.call(obj, pair[0], pair[1]);
    }
  };
  const matchAll = (regExp, str) => {
    let matches;
    const arr = [];
    while ((matches = regExp.exec(str)) !== null) {
      arr.push(matches);
    }
    return arr;
  };
  const isHTMLForm = kindOfTest("HTMLFormElement");
  const toCamelCase = (str) => {
    return str
      .toLowerCase()
      .replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m2, p1, p2) {
        return p1.toUpperCase() + p2;
      });
  };
  const hasOwnProperty = (
    ({ hasOwnProperty: hasOwnProperty2 }) =>
    (obj, prop) =>
      hasOwnProperty2.call(obj, prop)
  )(Object.prototype);
  const isRegExp = kindOfTest("RegExp");
  const reduceDescriptors = (obj, reducer2) => {
    const descriptors2 = Object.getOwnPropertyDescriptors(obj);
    const reducedDescriptors = {};
    forEach(descriptors2, (descriptor, name) => {
      let ret;
      if ((ret = reducer2(descriptor, name, obj)) !== false) {
        reducedDescriptors[name] = ret || descriptor;
      }
    });
    Object.defineProperties(obj, reducedDescriptors);
  };
  const freezeMethods = (obj) => {
    reduceDescriptors(obj, (descriptor, name) => {
      if (
        isFunction(obj) &&
        ["arguments", "caller", "callee"].indexOf(name) !== -1
      ) {
        return false;
      }
      const value = obj[name];
      if (!isFunction(value)) return;
      descriptor.enumerable = false;
      if ("writable" in descriptor) {
        descriptor.writable = false;
        return;
      }
      if (!descriptor.set) {
        descriptor.set = () => {
          throw Error("Can not rewrite read-only method '" + name + "'");
        };
      }
    });
  };
  const toObjectSet = (arrayOrString, delimiter) => {
    const obj = {};
    const define = (arr) => {
      arr.forEach((value) => {
        obj[value] = true;
      });
    };
    isArray(arrayOrString)
      ? define(arrayOrString)
      : define(String(arrayOrString).split(delimiter));
    return obj;
  };
  const noop = () => {};
  const toFiniteNumber = (value, defaultValue) => {
    return value != null && Number.isFinite((value = +value))
      ? value
      : defaultValue;
  };
  const ALPHA = "abcdefghijklmnopqrstuvwxyz";
  const DIGIT = "0123456789";
  const ALPHABET = {
    DIGIT,
    ALPHA,
    ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT,
  };
  const generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
    let str = "";
    const { length } = alphabet;
    while (size--) {
      str += alphabet[(Math.random() * length) | 0];
    }
    return str;
  };
  function isSpecCompliantForm(thing) {
    return !!(
      thing &&
      isFunction(thing.append) &&
      thing[Symbol.toStringTag] === "FormData" &&
      thing[Symbol.iterator]
    );
  }
  const toJSONObject = (obj) => {
    const stack = new Array(10);
    const visit = (source, i2) => {
      if (isObject(source)) {
        if (stack.indexOf(source) >= 0) {
          return;
        }
        if (!("toJSON" in source)) {
          stack[i2] = source;
          const target = isArray(source) ? [] : {};
          forEach(source, (value, key) => {
            const reducedValue = visit(value, i2 + 1);
            !isUndefined(reducedValue) && (target[key] = reducedValue);
          });
          stack[i2] = void 0;
          return target;
        }
      }
      return source;
    };
    return visit(obj, 0);
  };
  const isAsyncFn = kindOfTest("AsyncFunction");
  const isThenable = (thing) =>
    thing &&
    (isObject(thing) || isFunction(thing)) &&
    isFunction(thing.then) &&
    isFunction(thing.catch);
  const _setImmediate = ((setImmediateSupported, postMessageSupported) => {
    if (setImmediateSupported) {
      return setImmediate;
    }
    return postMessageSupported
      ? ((token, callbacks) => {
          _global.addEventListener(
            "message",
            ({ source, data }) => {
              if (source === _global && data === token) {
                callbacks.length && callbacks.shift()();
              }
            },
            false
          );
          return (cb2) => {
            callbacks.push(cb2);
            _global.postMessage(token, "*");
          };
        })(`axios@${Math.random()}`, [])
      : (cb2) => setTimeout(cb2);
  })(typeof setImmediate === "function", isFunction(_global.postMessage));
  const asap =
    typeof queueMicrotask !== "undefined"
      ? queueMicrotask.bind(_global)
      : (typeof process !== "undefined" && process.nextTick) || _setImmediate;
  const utils$1 = {
    isArray,
    isArrayBuffer,
    isBuffer,
    isFormData,
    isArrayBufferView,
    isString,
    isNumber,
    isBoolean,
    isObject,
    isPlainObject,
    isReadableStream,
    isRequest,
    isResponse,
    isHeaders,
    isUndefined,
    isDate,
    isFile,
    isBlob,
    isRegExp,
    isFunction,
    isStream,
    isURLSearchParams,
    isTypedArray,
    isFileList,
    forEach,
    merge,
    extend,
    trim,
    stripBOM,
    inherits,
    toFlatObject,
    kindOf,
    kindOfTest,
    endsWith,
    toArray,
    forEachEntry,
    matchAll,
    isHTMLForm,
    hasOwnProperty,
    hasOwnProp: hasOwnProperty,
    // an alias to avoid ESLint no-prototype-builtins detection
    reduceDescriptors,
    freezeMethods,
    toObjectSet,
    toCamelCase,
    noop,
    toFiniteNumber,
    findKey,
    global: _global,
    isContextDefined,
    ALPHABET,
    generateString,
    isSpecCompliantForm,
    toJSONObject,
    isAsyncFn,
    isThenable,
    setImmediate: _setImmediate,
    asap,
  };
  function AxiosError(message, code, config, request, response) {
    Error.call(this);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error().stack;
    }
    this.message = message;
    this.name = "AxiosError";
    code && (this.code = code);
    config && (this.config = config);
    request && (this.request = request);
    if (response) {
      this.response = response;
      this.status = response.status ? response.status : null;
    }
  }
  utils$1.inherits(AxiosError, Error, {
    toJSON: function toJSON() {
      return {
        // Standard
        message: this.message,
        name: this.name,
        // Microsoft
        description: this.description,
        number: this.number,
        // Mozilla
        fileName: this.fileName,
        lineNumber: this.lineNumber,
        columnNumber: this.columnNumber,
        stack: this.stack,
        // Axios
        config: utils$1.toJSONObject(this.config),
        code: this.code,
        status: this.status,
      };
    },
  });
  const prototype$1 = AxiosError.prototype;
  const descriptors = {};
  [
    "ERR_BAD_OPTION_VALUE",
    "ERR_BAD_OPTION",
    "ECONNABORTED",
    "ETIMEDOUT",
    "ERR_NETWORK",
    "ERR_FR_TOO_MANY_REDIRECTS",
    "ERR_DEPRECATED",
    "ERR_BAD_RESPONSE",
    "ERR_BAD_REQUEST",
    "ERR_CANCELED",
    "ERR_NOT_SUPPORT",
    "ERR_INVALID_URL",
    // eslint-disable-next-line func-names
  ].forEach((code) => {
    descriptors[code] = { value: code };
  });
  Object.defineProperties(AxiosError, descriptors);
  Object.defineProperty(prototype$1, "isAxiosError", { value: true });
  AxiosError.from = (error, code, config, request, response, customProps) => {
    const axiosError = Object.create(prototype$1);
    utils$1.toFlatObject(
      error,
      axiosError,
      function filter2(obj) {
        return obj !== Error.prototype;
      },
      (prop) => {
        return prop !== "isAxiosError";
      }
    );
    AxiosError.call(axiosError, error.message, code, config, request, response);
    axiosError.cause = error;
    axiosError.name = error.name;
    customProps && Object.assign(axiosError, customProps);
    return axiosError;
  };
  const httpAdapter = null;
  function isVisitable(thing) {
    return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
  }
  function removeBrackets(key) {
    return utils$1.endsWith(key, "[]") ? key.slice(0, -2) : key;
  }
  function renderKey(path, key, dots) {
    if (!path) return key;
    return path
      .concat(key)
      .map(function each(token, i2) {
        token = removeBrackets(token);
        return !dots && i2 ? "[" + token + "]" : token;
      })
      .join(dots ? "." : "");
  }
  function isFlatArray(arr) {
    return utils$1.isArray(arr) && !arr.some(isVisitable);
  }
  const predicates = utils$1.toFlatObject(
    utils$1,
    {},
    null,
    function filter(prop) {
      return /^is[A-Z]/.test(prop);
    }
  );
  function toFormData(obj, formData, options) {
    if (!utils$1.isObject(obj)) {
      throw new TypeError("target must be an object");
    }
    formData = formData || new FormData();
    options = utils$1.toFlatObject(
      options,
      {
        metaTokens: true,
        dots: false,
        indexes: false,
      },
      false,
      function defined(option, source) {
        return !utils$1.isUndefined(source[option]);
      }
    );
    const metaTokens = options.metaTokens;
    const visitor = options.visitor || defaultVisitor;
    const dots = options.dots;
    const indexes = options.indexes;
    const _Blob = options.Blob || (typeof Blob !== "undefined" && Blob);
    const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);
    if (!utils$1.isFunction(visitor)) {
      throw new TypeError("visitor must be a function");
    }
    function convertValue(value) {
      if (value === null) return "";
      if (utils$1.isDate(value)) {
        return value.toISOString();
      }
      if (!useBlob && utils$1.isBlob(value)) {
        throw new AxiosError("Blob is not supported. Use a Buffer instead.");
      }
      if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
        return useBlob && typeof Blob === "function"
          ? new Blob([value])
          : Buffer.from(value);
      }
      return value;
    }
    function defaultVisitor(value, key, path) {
      let arr = value;
      if (value && !path && typeof value === "object") {
        if (utils$1.endsWith(key, "{}")) {
          key = metaTokens ? key : key.slice(0, -2);
          value = JSON.stringify(value);
        } else if (
          (utils$1.isArray(value) && isFlatArray(value)) ||
          ((utils$1.isFileList(value) || utils$1.endsWith(key, "[]")) &&
            (arr = utils$1.toArray(value)))
        ) {
          key = removeBrackets(key);
          arr.forEach(function each(el2, index) {
            !(utils$1.isUndefined(el2) || el2 === null) &&
              formData.append(
                // eslint-disable-next-line no-nested-ternary
                indexes === true
                  ? renderKey([key], index, dots)
                  : indexes === null
                  ? key
                  : key + "[]",
                convertValue(el2)
              );
          });
          return false;
        }
      }
      if (isVisitable(value)) {
        return true;
      }
      formData.append(renderKey(path, key, dots), convertValue(value));
      return false;
    }
    const stack = [];
    const exposedHelpers = Object.assign(predicates, {
      defaultVisitor,
      convertValue,
      isVisitable,
    });
    function build(value, path) {
      if (utils$1.isUndefined(value)) return;
      if (stack.indexOf(value) !== -1) {
        throw Error("Circular reference detected in " + path.join("."));
      }
      stack.push(value);
      utils$1.forEach(value, function each(el2, key) {
        const result =
          !(utils$1.isUndefined(el2) || el2 === null) &&
          visitor.call(
            formData,
            el2,
            utils$1.isString(key) ? key.trim() : key,
            path,
            exposedHelpers
          );
        if (result === true) {
          build(el2, path ? path.concat(key) : [key]);
        }
      });
      stack.pop();
    }
    if (!utils$1.isObject(obj)) {
      throw new TypeError("data must be an object");
    }
    build(obj);
    return formData;
  }
  function encode$1(str) {
    const charMap = {
      "!": "%21",
      "'": "%27",
      "(": "%28",
      ")": "%29",
      "~": "%7E",
      "%20": "+",
      "%00": "\0",
    };
    return encodeURIComponent(str).replace(
      /[!'()~]|%20|%00/g,
      function replacer(match) {
        return charMap[match];
      }
    );
  }
  function AxiosURLSearchParams(params, options) {
    this._pairs = [];
    params && toFormData(params, this, options);
  }
  const prototype = AxiosURLSearchParams.prototype;
  prototype.append = function append(name, value) {
    this._pairs.push([name, value]);
  };
  prototype.toString = function toString2(encoder) {
    const _encode = encoder
      ? function (value) {
          return encoder.call(this, value, encode$1);
        }
      : encode$1;
    return this._pairs
      .map(function each(pair) {
        return _encode(pair[0]) + "=" + _encode(pair[1]);
      }, "")
      .join("&");
  };
  function encode(val) {
    return encodeURIComponent(val)
      .replace(/%3A/gi, ":")
      .replace(/%24/g, "$")
      .replace(/%2C/gi, ",")
      .replace(/%20/g, "+")
      .replace(/%5B/gi, "[")
      .replace(/%5D/gi, "]");
  }
  function buildURL(url, params, options) {
    if (!params) {
      return url;
    }
    const _encode = (options && options.encode) || encode;
    const serializeFn = options && options.serialize;
    let serializedParams;
    if (serializeFn) {
      serializedParams = serializeFn(params, options);
    } else {
      serializedParams = utils$1.isURLSearchParams(params)
        ? params.toString()
        : new AxiosURLSearchParams(params, options).toString(_encode);
    }
    if (serializedParams) {
      const hashmarkIndex = url.indexOf("#");
      if (hashmarkIndex !== -1) {
        url = url.slice(0, hashmarkIndex);
      }
      url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
    }
    return url;
  }
  class InterceptorManager {
    constructor() {
      this.handlers = [];
    }
    /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     *
     * @return {Number} An ID used to remove interceptor later
     */
    use(fulfilled, rejected, options) {
      this.handlers.push({
        fulfilled,
        rejected,
        synchronous: options ? options.synchronous : false,
        runWhen: options ? options.runWhen : null,
      });
      return this.handlers.length - 1;
    }
    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     *
     * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
     */
    eject(id2) {
      if (this.handlers[id2]) {
        this.handlers[id2] = null;
      }
    }
    /**
     * Clear all interceptors from the stack
     *
     * @returns {void}
     */
    clear() {
      if (this.handlers) {
        this.handlers = [];
      }
    }
    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     *
     * @returns {void}
     */
    forEach(fn) {
      utils$1.forEach(this.handlers, function forEachHandler(h2) {
        if (h2 !== null) {
          fn(h2);
        }
      });
    }
  }
  const transitionalDefaults = {
    silentJSONParsing: true,
    forcedJSONParsing: true,
    clarifyTimeoutError: false,
  };
  const URLSearchParams$1 =
    typeof URLSearchParams !== "undefined"
      ? URLSearchParams
      : AxiosURLSearchParams;
  const FormData$1 = typeof FormData !== "undefined" ? FormData : null;
  const Blob$1 = typeof Blob !== "undefined" ? Blob : null;
  const platform$1 = {
    isBrowser: true,
    classes: {
      URLSearchParams: URLSearchParams$1,
      FormData: FormData$1,
      Blob: Blob$1,
    },
    protocols: ["http", "https", "file", "blob", "url", "data"],
  };
  const hasBrowserEnv =
    typeof window !== "undefined" && typeof document !== "undefined";
  const _navigator = (typeof navigator === "object" && navigator) || void 0;
  const hasStandardBrowserEnv =
    hasBrowserEnv &&
    (!_navigator ||
      ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
  const hasStandardBrowserWebWorkerEnv = (() => {
    return (
      typeof WorkerGlobalScope !== "undefined" && // eslint-disable-next-line no-undef
      self instanceof WorkerGlobalScope &&
      typeof self.importScripts === "function"
    );
  })();
  const origin = (hasBrowserEnv && window.location.href) || "http://localhost";
  const utils = /* @__PURE__ */ Object.freeze(
    /* @__PURE__ */ Object.defineProperty(
      {
        __proto__: null,
        hasBrowserEnv,
        hasStandardBrowserEnv,
        hasStandardBrowserWebWorkerEnv,
        navigator: _navigator,
        origin,
      },
      Symbol.toStringTag,
      { value: "Module" }
    )
  );
  const platform = {
    ...utils,
    ...platform$1,
  };
  function toURLEncodedForm(data, options) {
    return toFormData(
      data,
      new platform.classes.URLSearchParams(),
      Object.assign(
        {
          visitor: function (value, key, path, helpers) {
            if (platform.isNode && utils$1.isBuffer(value)) {
              this.append(key, value.toString("base64"));
              return false;
            }
            return helpers.defaultVisitor.apply(this, arguments);
          },
        },
        options
      )
    );
  }
  function parsePropPath(name) {
    return utils$1.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
      return match[0] === "[]" ? "" : match[1] || match[0];
    });
  }
  function arrayToObject(arr) {
    const obj = {};
    const keys = Object.keys(arr);
    let i2;
    const len = keys.length;
    let key;
    for (i2 = 0; i2 < len; i2++) {
      key = keys[i2];
      obj[key] = arr[key];
    }
    return obj;
  }
  function formDataToJSON(formData) {
    function buildPath(path, value, target, index) {
      let name = path[index++];
      if (name === "__proto__") return true;
      const isNumericKey = Number.isFinite(+name);
      const isLast = index >= path.length;
      name = !name && utils$1.isArray(target) ? target.length : name;
      if (isLast) {
        if (utils$1.hasOwnProp(target, name)) {
          target[name] = [target[name], value];
        } else {
          target[name] = value;
        }
        return !isNumericKey;
      }
      if (!target[name] || !utils$1.isObject(target[name])) {
        target[name] = [];
      }
      const result = buildPath(path, value, target[name], index);
      if (result && utils$1.isArray(target[name])) {
        target[name] = arrayToObject(target[name]);
      }
      return !isNumericKey;
    }
    if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
      const obj = {};
      utils$1.forEachEntry(formData, (name, value) => {
        buildPath(parsePropPath(name), value, obj, 0);
      });
      return obj;
    }
    return null;
  }
  function stringifySafely(rawValue, parser, encoder) {
    if (utils$1.isString(rawValue)) {
      try {
        (parser || JSON.parse)(rawValue);
        return utils$1.trim(rawValue);
      } catch (e2) {
        if (e2.name !== "SyntaxError") {
          throw e2;
        }
      }
    }
    return (encoder || JSON.stringify)(rawValue);
  }
  const defaults = {
    transitional: transitionalDefaults,
    adapter: ["xhr", "http", "fetch"],
    transformRequest: [
      function transformRequest(data, headers) {
        const contentType = headers.getContentType() || "";
        const hasJSONContentType = contentType.indexOf("application/json") > -1;
        const isObjectPayload = utils$1.isObject(data);
        if (isObjectPayload && utils$1.isHTMLForm(data)) {
          data = new FormData(data);
        }
        const isFormData2 = utils$1.isFormData(data);
        if (isFormData2) {
          return hasJSONContentType
            ? JSON.stringify(formDataToJSON(data))
            : data;
        }
        if (
          utils$1.isArrayBuffer(data) ||
          utils$1.isBuffer(data) ||
          utils$1.isStream(data) ||
          utils$1.isFile(data) ||
          utils$1.isBlob(data) ||
          utils$1.isReadableStream(data)
        ) {
          return data;
        }
        if (utils$1.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils$1.isURLSearchParams(data)) {
          headers.setContentType(
            "application/x-www-form-urlencoded;charset=utf-8",
            false
          );
          return data.toString();
        }
        let isFileList2;
        if (isObjectPayload) {
          if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
            return toURLEncodedForm(data, this.formSerializer).toString();
          }
          if (
            (isFileList2 = utils$1.isFileList(data)) ||
            contentType.indexOf("multipart/form-data") > -1
          ) {
            const _FormData = this.env && this.env.FormData;
            return toFormData(
              isFileList2 ? { "files[]": data } : data,
              _FormData && new _FormData(),
              this.formSerializer
            );
          }
        }
        if (isObjectPayload || hasJSONContentType) {
          headers.setContentType("application/json", false);
          return stringifySafely(data);
        }
        return data;
      },
    ],
    transformResponse: [
      function transformResponse(data) {
        const transitional2 = this.transitional || defaults.transitional;
        const forcedJSONParsing =
          transitional2 && transitional2.forcedJSONParsing;
        const JSONRequested = this.responseType === "json";
        if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) {
          return data;
        }
        if (
          data &&
          utils$1.isString(data) &&
          ((forcedJSONParsing && !this.responseType) || JSONRequested)
        ) {
          const silentJSONParsing =
            transitional2 && transitional2.silentJSONParsing;
          const strictJSONParsing = !silentJSONParsing && JSONRequested;
          try {
            return JSON.parse(data);
          } catch (e2) {
            if (strictJSONParsing) {
              if (e2.name === "SyntaxError") {
                throw AxiosError.from(
                  e2,
                  AxiosError.ERR_BAD_RESPONSE,
                  this,
                  null,
                  this.response
                );
              }
              throw e2;
            }
          }
        }
        return data;
      },
    ],
    /**
     * A timeout in milliseconds to abort a request. If set to 0 (default) a
     * timeout is not created.
     */
    timeout: 0,
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
    maxContentLength: -1,
    maxBodyLength: -1,
    env: {
      FormData: platform.classes.FormData,
      Blob: platform.classes.Blob,
    },
    validateStatus: function validateStatus(status) {
      return status >= 200 && status < 300;
    },
    headers: {
      common: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": void 0,
      },
    },
  };
  utils$1.forEach(
    ["delete", "get", "head", "post", "put", "patch"],
    (method) => {
      defaults.headers[method] = {};
    }
  );
  const defaults$1 = defaults;
  const ignoreDuplicateOf = utils$1.toObjectSet([
    "age",
    "authorization",
    "content-length",
    "content-type",
    "etag",
    "expires",
    "from",
    "host",
    "if-modified-since",
    "if-unmodified-since",
    "last-modified",
    "location",
    "max-forwards",
    "proxy-authorization",
    "referer",
    "retry-after",
    "user-agent",
  ]);
  const parseHeaders = (rawHeaders) => {
    const parsed = {};
    let key;
    let val;
    let i2;
    rawHeaders &&
      rawHeaders.split("\n").forEach(function parser(line) {
        i2 = line.indexOf(":");
        key = line.substring(0, i2).trim().toLowerCase();
        val = line.substring(i2 + 1).trim();
        if (!key || (parsed[key] && ignoreDuplicateOf[key])) {
          return;
        }
        if (key === "set-cookie") {
          if (parsed[key]) {
            parsed[key].push(val);
          } else {
            parsed[key] = [val];
          }
        } else {
          parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
        }
      });
    return parsed;
  };
  const $internals = Symbol("internals");
  function normalizeHeader(header) {
    return header && String(header).trim().toLowerCase();
  }
  function normalizeValue(value) {
    if (value === false || value == null) {
      return value;
    }
    return utils$1.isArray(value) ? value.map(normalizeValue) : String(value);
  }
  function parseTokens(str) {
    const tokens = /* @__PURE__ */ Object.create(null);
    const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
    let match;
    while ((match = tokensRE.exec(str))) {
      tokens[match[1]] = match[2];
    }
    return tokens;
  }
  const isValidHeaderName = (str) =>
    /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
  function matchHeaderValue(
    context,
    value,
    header,
    filter2,
    isHeaderNameFilter
  ) {
    if (utils$1.isFunction(filter2)) {
      return filter2.call(this, value, header);
    }
    if (isHeaderNameFilter) {
      value = header;
    }
    if (!utils$1.isString(value)) return;
    if (utils$1.isString(filter2)) {
      return value.indexOf(filter2) !== -1;
    }
    if (utils$1.isRegExp(filter2)) {
      return filter2.test(value);
    }
  }
  function formatHeader(header) {
    return header
      .trim()
      .toLowerCase()
      .replace(/([a-z\d])(\w*)/g, (w2, char, str) => {
        return char.toUpperCase() + str;
      });
  }
  function buildAccessors(obj, header) {
    const accessorName = utils$1.toCamelCase(" " + header);
    ["get", "set", "has"].forEach((methodName) => {
      Object.defineProperty(obj, methodName + accessorName, {
        value: function (arg1, arg2, arg3) {
          return this[methodName].call(this, header, arg1, arg2, arg3);
        },
        configurable: true,
      });
    });
  }
  class AxiosHeaders {
    constructor(headers) {
      headers && this.set(headers);
    }
    set(header, valueOrRewrite, rewrite) {
      const self2 = this;
      function setHeader(_value, _header, _rewrite) {
        const lHeader = normalizeHeader(_header);
        if (!lHeader) {
          throw new Error("header name must be a non-empty string");
        }
        const key = utils$1.findKey(self2, lHeader);
        if (
          !key ||
          self2[key] === void 0 ||
          _rewrite === true ||
          (_rewrite === void 0 && self2[key] !== false)
        ) {
          self2[key || _header] = normalizeValue(_value);
        }
      }
      const setHeaders = (headers, _rewrite) =>
        utils$1.forEach(headers, (_value, _header) =>
          setHeader(_value, _header, _rewrite)
        );
      if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
        setHeaders(header, valueOrRewrite);
      } else if (
        utils$1.isString(header) &&
        (header = header.trim()) &&
        !isValidHeaderName(header)
      ) {
        setHeaders(parseHeaders(header), valueOrRewrite);
      } else if (utils$1.isHeaders(header)) {
        for (const [key, value] of header.entries()) {
          setHeader(value, key, rewrite);
        }
      } else {
        header != null && setHeader(valueOrRewrite, header, rewrite);
      }
      return this;
    }
    get(header, parser) {
      header = normalizeHeader(header);
      if (header) {
        const key = utils$1.findKey(this, header);
        if (key) {
          const value = this[key];
          if (!parser) {
            return value;
          }
          if (parser === true) {
            return parseTokens(value);
          }
          if (utils$1.isFunction(parser)) {
            return parser.call(this, value, key);
          }
          if (utils$1.isRegExp(parser)) {
            return parser.exec(value);
          }
          throw new TypeError("parser must be boolean|regexp|function");
        }
      }
    }
    has(header, matcher) {
      header = normalizeHeader(header);
      if (header) {
        const key = utils$1.findKey(this, header);
        return !!(
          key &&
          this[key] !== void 0 &&
          (!matcher || matchHeaderValue(this, this[key], key, matcher))
        );
      }
      return false;
    }
    delete(header, matcher) {
      const self2 = this;
      let deleted = false;
      function deleteHeader(_header) {
        _header = normalizeHeader(_header);
        if (_header) {
          const key = utils$1.findKey(self2, _header);
          if (
            key &&
            (!matcher || matchHeaderValue(self2, self2[key], key, matcher))
          ) {
            delete self2[key];
            deleted = true;
          }
        }
      }
      if (utils$1.isArray(header)) {
        header.forEach(deleteHeader);
      } else {
        deleteHeader(header);
      }
      return deleted;
    }
    clear(matcher) {
      const keys = Object.keys(this);
      let i2 = keys.length;
      let deleted = false;
      while (i2--) {
        const key = keys[i2];
        if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
          delete this[key];
          deleted = true;
        }
      }
      return deleted;
    }
    normalize(format) {
      const self2 = this;
      const headers = {};
      utils$1.forEach(this, (value, header) => {
        const key = utils$1.findKey(headers, header);
        if (key) {
          self2[key] = normalizeValue(value);
          delete self2[header];
          return;
        }
        const normalized = format
          ? formatHeader(header)
          : String(header).trim();
        if (normalized !== header) {
          delete self2[header];
        }
        self2[normalized] = normalizeValue(value);
        headers[normalized] = true;
      });
      return this;
    }
    concat(...targets) {
      return this.constructor.concat(this, ...targets);
    }
    toJSON(asStrings) {
      const obj = /* @__PURE__ */ Object.create(null);
      utils$1.forEach(this, (value, header) => {
        value != null &&
          value !== false &&
          (obj[header] =
            asStrings && utils$1.isArray(value) ? value.join(", ") : value);
      });
      return obj;
    }
    [Symbol.iterator]() {
      return Object.entries(this.toJSON())[Symbol.iterator]();
    }
    toString() {
      return Object.entries(this.toJSON())
        .map(([header, value]) => header + ": " + value)
        .join("\n");
    }
    get [Symbol.toStringTag]() {
      return "AxiosHeaders";
    }
    static from(thing) {
      return thing instanceof this ? thing : new this(thing);
    }
    static concat(first, ...targets) {
      const computed = new this(first);
      targets.forEach((target) => computed.set(target));
      return computed;
    }
    static accessor(header) {
      const internals =
        (this[$internals] =
        this[$internals] =
          {
            accessors: {},
          });
      const accessors = internals.accessors;
      const prototype2 = this.prototype;
      function defineAccessor(_header) {
        const lHeader = normalizeHeader(_header);
        if (!accessors[lHeader]) {
          buildAccessors(prototype2, _header);
          accessors[lHeader] = true;
        }
      }
      utils$1.isArray(header)
        ? header.forEach(defineAccessor)
        : defineAccessor(header);
      return this;
    }
  }
  AxiosHeaders.accessor([
    "Content-Type",
    "Content-Length",
    "Accept",
    "Accept-Encoding",
    "User-Agent",
    "Authorization",
  ]);
  utils$1.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
    let mapped = key[0].toUpperCase() + key.slice(1);
    return {
      get: () => value,
      set(headerValue) {
        this[mapped] = headerValue;
      },
    };
  });
  utils$1.freezeMethods(AxiosHeaders);
  const AxiosHeaders$1 = AxiosHeaders;
  function transformData(fns, response) {
    const config = this || defaults$1;
    const context = response || config;
    const headers = AxiosHeaders$1.from(context.headers);
    let data = context.data;
    utils$1.forEach(fns, function transform(fn) {
      data = fn.call(
        config,
        data,
        headers.normalize(),
        response ? response.status : void 0
      );
    });
    headers.normalize();
    return data;
  }
  function isCancel(value) {
    return !!(value && value.__CANCEL__);
  }
  function CanceledError(message, config, request) {
    AxiosError.call(
      this,
      message == null ? "canceled" : message,
      AxiosError.ERR_CANCELED,
      config,
      request
    );
    this.name = "CanceledError";
  }
  utils$1.inherits(CanceledError, AxiosError, {
    __CANCEL__: true,
  });
  function settle(resolve, reject, response) {
    const validateStatus2 = response.config.validateStatus;
    if (
      !response.status ||
      !validateStatus2 ||
      validateStatus2(response.status)
    ) {
      resolve(response);
    } else {
      reject(
        new AxiosError(
          "Request failed with status code " + response.status,
          [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][
            Math.floor(response.status / 100) - 4
          ],
          response.config,
          response.request,
          response
        )
      );
    }
  }
  function parseProtocol(url) {
    const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
    return (match && match[1]) || "";
  }
  function speedometer(samplesCount, min) {
    samplesCount = samplesCount || 10;
    const bytes = new Array(samplesCount);
    const timestamps = new Array(samplesCount);
    let head = 0;
    let tail = 0;
    let firstSampleTS;
    min = min !== void 0 ? min : 1e3;
    return function push(chunkLength) {
      const now = Date.now();
      const startedAt = timestamps[tail];
      if (!firstSampleTS) {
        firstSampleTS = now;
      }
      bytes[head] = chunkLength;
      timestamps[head] = now;
      let i2 = tail;
      let bytesCount = 0;
      while (i2 !== head) {
        bytesCount += bytes[i2++];
        i2 = i2 % samplesCount;
      }
      head = (head + 1) % samplesCount;
      if (head === tail) {
        tail = (tail + 1) % samplesCount;
      }
      if (now - firstSampleTS < min) {
        return;
      }
      const passed = startedAt && now - startedAt;
      return passed ? Math.round((bytesCount * 1e3) / passed) : void 0;
    };
  }
  function throttle(fn, freq) {
    let timestamp = 0;
    let threshold = 1e3 / freq;
    let lastArgs;
    let timer;
    const invoke = (args, now = Date.now()) => {
      timestamp = now;
      lastArgs = null;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      fn.apply(null, args);
    };
    const throttled = (...args) => {
      const now = Date.now();
      const passed = now - timestamp;
      if (passed >= threshold) {
        invoke(args, now);
      } else {
        lastArgs = args;
        if (!timer) {
          timer = setTimeout(() => {
            timer = null;
            invoke(lastArgs);
          }, threshold - passed);
        }
      }
    };
    const flush = () => lastArgs && invoke(lastArgs);
    return [throttled, flush];
  }
  const progressEventReducer = (listener, isDownloadStream, freq = 3) => {
    let bytesNotified = 0;
    const _speedometer = speedometer(50, 250);
    return throttle((e2) => {
      const loaded = e2.loaded;
      const total = e2.lengthComputable ? e2.total : void 0;
      const progressBytes = loaded - bytesNotified;
      const rate = _speedometer(progressBytes);
      const inRange = loaded <= total;
      bytesNotified = loaded;
      const data = {
        loaded,
        total,
        progress: total ? loaded / total : void 0,
        bytes: progressBytes,
        rate: rate ? rate : void 0,
        estimated: rate && total && inRange ? (total - loaded) / rate : void 0,
        event: e2,
        lengthComputable: total != null,
        [isDownloadStream ? "download" : "upload"]: true,
      };
      listener(data);
    }, freq);
  };
  const progressEventDecorator = (total, throttled) => {
    const lengthComputable = total != null;
    return [
      (loaded) =>
        throttled[0]({
          lengthComputable,
          total,
          loaded,
        }),
      throttled[1],
    ];
  };
  const asyncDecorator =
    (fn) =>
    (...args) =>
      utils$1.asap(() => fn(...args));
  const isURLSameOrigin = platform.hasStandardBrowserEnv
    ? // Standard browser envs have full support of the APIs needed to test
      // whether the request URL is of the same origin as current location.
      (function standardBrowserEnv() {
        const msie =
          platform.navigator &&
          /(msie|trident)/i.test(platform.navigator.userAgent);
        const urlParsingNode = document.createElement("a");
        let originURL;
        function resolveURL(url) {
          let href = url;
          if (msie) {
            urlParsingNode.setAttribute("href", href);
            href = urlParsingNode.href;
          }
          urlParsingNode.setAttribute("href", href);
          return {
            href: urlParsingNode.href,
            protocol: urlParsingNode.protocol
              ? urlParsingNode.protocol.replace(/:$/, "")
              : "",
            host: urlParsingNode.host,
            search: urlParsingNode.search
              ? urlParsingNode.search.replace(/^\?/, "")
              : "",
            hash: urlParsingNode.hash
              ? urlParsingNode.hash.replace(/^#/, "")
              : "",
            hostname: urlParsingNode.hostname,
            port: urlParsingNode.port,
            pathname:
              urlParsingNode.pathname.charAt(0) === "/"
                ? urlParsingNode.pathname
                : "/" + urlParsingNode.pathname,
          };
        }
        originURL = resolveURL(window.location.href);
        return function isURLSameOrigin2(requestURL) {
          const parsed = utils$1.isString(requestURL)
            ? resolveURL(requestURL)
            : requestURL;
          return (
            parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host
          );
        };
      })()
    : // Non standard browser envs (web workers, react-native) lack needed support.
      /* @__PURE__ */ (function nonStandardBrowserEnv() {
        return function isURLSameOrigin2() {
          return true;
        };
      })();
  const cookies = platform.hasStandardBrowserEnv
    ? // Standard browser envs support document.cookie
      {
        write(name, value, expires, path, domain, secure) {
          const cookie = [name + "=" + encodeURIComponent(value)];
          utils$1.isNumber(expires) &&
            cookie.push("expires=" + new Date(expires).toGMTString());
          utils$1.isString(path) && cookie.push("path=" + path);
          utils$1.isString(domain) && cookie.push("domain=" + domain);
          secure === true && cookie.push("secure");
          document.cookie = cookie.join("; ");
        },
        read(name) {
          const match = document.cookie.match(
            new RegExp("(^|;\\s*)(" + name + ")=([^;]*)")
          );
          return match ? decodeURIComponent(match[3]) : null;
        },
        remove(name) {
          this.write(name, "", Date.now() - 864e5);
        },
      }
    : // Non-standard browser env (web workers, react-native) lack needed support.
      {
        write() {},
        read() {
          return null;
        },
        remove() {},
      };
  function isAbsoluteURL(url) {
    return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
  }
  function combineURLs(baseURL, relativeURL) {
    return relativeURL
      ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "")
      : baseURL;
  }
  function buildFullPath(baseURL, requestedURL) {
    if (baseURL && !isAbsoluteURL(requestedURL)) {
      return combineURLs(baseURL, requestedURL);
    }
    return requestedURL;
  }
  const headersToObject = (thing) =>
    thing instanceof AxiosHeaders$1 ? { ...thing } : thing;
  function mergeConfig(config1, config2) {
    config2 = config2 || {};
    const config = {};
    function getMergedValue(target, source, caseless) {
      if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
        return utils$1.merge.call({ caseless }, target, source);
      } else if (utils$1.isPlainObject(source)) {
        return utils$1.merge({}, source);
      } else if (utils$1.isArray(source)) {
        return source.slice();
      }
      return source;
    }
    function mergeDeepProperties(a2, b2, caseless) {
      if (!utils$1.isUndefined(b2)) {
        return getMergedValue(a2, b2, caseless);
      } else if (!utils$1.isUndefined(a2)) {
        return getMergedValue(void 0, a2, caseless);
      }
    }
    function valueFromConfig2(a2, b2) {
      if (!utils$1.isUndefined(b2)) {
        return getMergedValue(void 0, b2);
      }
    }
    function defaultToConfig2(a2, b2) {
      if (!utils$1.isUndefined(b2)) {
        return getMergedValue(void 0, b2);
      } else if (!utils$1.isUndefined(a2)) {
        return getMergedValue(void 0, a2);
      }
    }
    function mergeDirectKeys(a2, b2, prop) {
      if (prop in config2) {
        return getMergedValue(a2, b2);
      } else if (prop in config1) {
        return getMergedValue(void 0, a2);
      }
    }
    const mergeMap = {
      url: valueFromConfig2,
      method: valueFromConfig2,
      data: valueFromConfig2,
      baseURL: defaultToConfig2,
      transformRequest: defaultToConfig2,
      transformResponse: defaultToConfig2,
      paramsSerializer: defaultToConfig2,
      timeout: defaultToConfig2,
      timeoutMessage: defaultToConfig2,
      withCredentials: defaultToConfig2,
      withXSRFToken: defaultToConfig2,
      adapter: defaultToConfig2,
      responseType: defaultToConfig2,
      xsrfCookieName: defaultToConfig2,
      xsrfHeaderName: defaultToConfig2,
      onUploadProgress: defaultToConfig2,
      onDownloadProgress: defaultToConfig2,
      decompress: defaultToConfig2,
      maxContentLength: defaultToConfig2,
      maxBodyLength: defaultToConfig2,
      beforeRedirect: defaultToConfig2,
      transport: defaultToConfig2,
      httpAgent: defaultToConfig2,
      httpsAgent: defaultToConfig2,
      cancelToken: defaultToConfig2,
      socketPath: defaultToConfig2,
      responseEncoding: defaultToConfig2,
      validateStatus: mergeDirectKeys,
      headers: (a2, b2) =>
        mergeDeepProperties(headersToObject(a2), headersToObject(b2), true),
    };
    utils$1.forEach(
      Object.keys(Object.assign({}, config1, config2)),
      function computeConfigValue(prop) {
        const merge2 = mergeMap[prop] || mergeDeepProperties;
        const configValue = merge2(config1[prop], config2[prop], prop);
        (utils$1.isUndefined(configValue) && merge2 !== mergeDirectKeys) ||
          (config[prop] = configValue);
      }
    );
    return config;
  }
  const resolveConfig = (config) => {
    const newConfig = mergeConfig({}, config);
    let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } =
      newConfig;
    newConfig.headers = headers = AxiosHeaders$1.from(headers);
    newConfig.url = buildURL(
      buildFullPath(newConfig.baseURL, newConfig.url),
      config.params,
      config.paramsSerializer
    );
    if (auth) {
      headers.set(
        "Authorization",
        "Basic " +
          btoa(
            (auth.username || "") +
              ":" +
              (auth.password ? unescape(encodeURIComponent(auth.password)) : "")
          )
      );
    }
    let contentType;
    if (utils$1.isFormData(data)) {
      if (
        platform.hasStandardBrowserEnv ||
        platform.hasStandardBrowserWebWorkerEnv
      ) {
        headers.setContentType(void 0);
      } else if ((contentType = headers.getContentType()) !== false) {
        const [type, ...tokens] = contentType
          ? contentType
              .split(";")
              .map((token) => token.trim())
              .filter(Boolean)
          : [];
        headers.setContentType(
          [type || "multipart/form-data", ...tokens].join("; ")
        );
      }
    }
    if (platform.hasStandardBrowserEnv) {
      withXSRFToken &&
        utils$1.isFunction(withXSRFToken) &&
        (withXSRFToken = withXSRFToken(newConfig));
      if (
        withXSRFToken ||
        (withXSRFToken !== false && isURLSameOrigin(newConfig.url))
      ) {
        const xsrfValue =
          xsrfHeaderName && xsrfCookieName && cookies.read(xsrfCookieName);
        if (xsrfValue) {
          headers.set(xsrfHeaderName, xsrfValue);
        }
      }
    }
    return newConfig;
  };
  const isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
  const xhrAdapter =
    isXHRAdapterSupported &&
    function (config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        const _config = resolveConfig(config);
        let requestData = _config.data;
        const requestHeaders = AxiosHeaders$1.from(_config.headers).normalize();
        let { responseType, onUploadProgress, onDownloadProgress } = _config;
        let onCanceled;
        let uploadThrottled, downloadThrottled;
        let flushUpload, flushDownload;
        function done() {
          flushUpload && flushUpload();
          flushDownload && flushDownload();
          _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
          _config.signal &&
            _config.signal.removeEventListener("abort", onCanceled);
        }
        let request = new XMLHttpRequest();
        request.open(_config.method.toUpperCase(), _config.url, true);
        request.timeout = _config.timeout;
        function onloadend() {
          if (!request) {
            return;
          }
          const responseHeaders = AxiosHeaders$1.from(
            "getAllResponseHeaders" in request &&
              request.getAllResponseHeaders()
          );
          const responseData =
            !responseType || responseType === "text" || responseType === "json"
              ? request.responseText
              : request.response;
          const response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config,
            request,
          };
          settle(
            function _resolve(value) {
              resolve(value);
              done();
            },
            function _reject(err) {
              reject(err);
              done();
            },
            response
          );
          request = null;
        }
        if ("onloadend" in request) {
          request.onloadend = onloadend;
        } else {
          request.onreadystatechange = function handleLoad() {
            if (!request || request.readyState !== 4) {
              return;
            }
            if (
              request.status === 0 &&
              !(
                request.responseURL &&
                request.responseURL.indexOf("file:") === 0
              )
            ) {
              return;
            }
            setTimeout(onloadend);
          };
        }
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }
          reject(
            new AxiosError(
              "Request aborted",
              AxiosError.ECONNABORTED,
              config,
              request
            )
          );
          request = null;
        };
        request.onerror = function handleError() {
          reject(
            new AxiosError(
              "Network Error",
              AxiosError.ERR_NETWORK,
              config,
              request
            )
          );
          request = null;
        };
        request.ontimeout = function handleTimeout() {
          let timeoutErrorMessage = _config.timeout
            ? "timeout of " + _config.timeout + "ms exceeded"
            : "timeout exceeded";
          const transitional2 = _config.transitional || transitionalDefaults;
          if (_config.timeoutErrorMessage) {
            timeoutErrorMessage = _config.timeoutErrorMessage;
          }
          reject(
            new AxiosError(
              timeoutErrorMessage,
              transitional2.clarifyTimeoutError
                ? AxiosError.ETIMEDOUT
                : AxiosError.ECONNABORTED,
              config,
              request
            )
          );
          request = null;
        };
        requestData === void 0 && requestHeaders.setContentType(null);
        if ("setRequestHeader" in request) {
          utils$1.forEach(
            requestHeaders.toJSON(),
            function setRequestHeader(val, key) {
              request.setRequestHeader(key, val);
            }
          );
        }
        if (!utils$1.isUndefined(_config.withCredentials)) {
          request.withCredentials = !!_config.withCredentials;
        }
        if (responseType && responseType !== "json") {
          request.responseType = _config.responseType;
        }
        if (onDownloadProgress) {
          [downloadThrottled, flushDownload] = progressEventReducer(
            onDownloadProgress,
            true
          );
          request.addEventListener("progress", downloadThrottled);
        }
        if (onUploadProgress && request.upload) {
          [uploadThrottled, flushUpload] =
            progressEventReducer(onUploadProgress);
          request.upload.addEventListener("progress", uploadThrottled);
          request.upload.addEventListener("loadend", flushUpload);
        }
        if (_config.cancelToken || _config.signal) {
          onCanceled = (cancel) => {
            if (!request) {
              return;
            }
            reject(
              !cancel || cancel.type
                ? new CanceledError(null, config, request)
                : cancel
            );
            request.abort();
            request = null;
          };
          _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
          if (_config.signal) {
            _config.signal.aborted
              ? onCanceled()
              : _config.signal.addEventListener("abort", onCanceled);
          }
        }
        const protocol = parseProtocol(_config.url);
        if (protocol && platform.protocols.indexOf(protocol) === -1) {
          reject(
            new AxiosError(
              "Unsupported protocol " + protocol + ":",
              AxiosError.ERR_BAD_REQUEST,
              config
            )
          );
          return;
        }
        request.send(requestData || null);
      });
    };
  const composeSignals = (signals, timeout) => {
    const { length } = (signals = signals ? signals.filter(Boolean) : []);
    if (timeout || length) {
      let controller = new AbortController();
      let aborted;
      const onabort = function (reason) {
        if (!aborted) {
          aborted = true;
          unsubscribe();
          const err = reason instanceof Error ? reason : this.reason;
          controller.abort(
            err instanceof AxiosError
              ? err
              : new CanceledError(err instanceof Error ? err.message : err)
          );
        }
      };
      let timer =
        timeout &&
        setTimeout(() => {
          timer = null;
          onabort(
            new AxiosError(
              `timeout ${timeout} of ms exceeded`,
              AxiosError.ETIMEDOUT
            )
          );
        }, timeout);
      const unsubscribe = () => {
        if (signals) {
          timer && clearTimeout(timer);
          timer = null;
          signals.forEach((signal2) => {
            signal2.unsubscribe
              ? signal2.unsubscribe(onabort)
              : signal2.removeEventListener("abort", onabort);
          });
          signals = null;
        }
      };
      signals.forEach((signal2) => signal2.addEventListener("abort", onabort));
      const { signal } = controller;
      signal.unsubscribe = () => utils$1.asap(unsubscribe);
      return signal;
    }
  };
  const composeSignals$1 = composeSignals;
  const streamChunk = function* (chunk, chunkSize) {
    let len = chunk.byteLength;
    if (!chunkSize || len < chunkSize) {
      yield chunk;
      return;
    }
    let pos = 0;
    let end;
    while (pos < len) {
      end = pos + chunkSize;
      yield chunk.slice(pos, end);
      pos = end;
    }
  };
  const readBytes = async function* (iterable, chunkSize) {
    for await (const chunk of readStream(iterable)) {
      yield* streamChunk(chunk, chunkSize);
    }
  };
  const readStream = async function* (stream) {
    if (stream[Symbol.asyncIterator]) {
      yield* stream;
      return;
    }
    const reader = stream.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        yield value;
      }
    } finally {
      await reader.cancel();
    }
  };
  const trackStream = (stream, chunkSize, onProgress, onFinish) => {
    const iterator = readBytes(stream, chunkSize);
    let bytes = 0;
    let done;
    let _onFinish = (e2) => {
      if (!done) {
        done = true;
        onFinish && onFinish(e2);
      }
    };
    return new ReadableStream(
      {
        async pull(controller) {
          try {
            const { done: done2, value } = await iterator.next();
            if (done2) {
              _onFinish();
              controller.close();
              return;
            }
            let len = value.byteLength;
            if (onProgress) {
              let loadedBytes = (bytes += len);
              onProgress(loadedBytes);
            }
            controller.enqueue(new Uint8Array(value));
          } catch (err) {
            _onFinish(err);
            throw err;
          }
        },
        cancel(reason) {
          _onFinish(reason);
          return iterator.return();
        },
      },
      {
        highWaterMark: 2,
      }
    );
  };
  const isFetchSupported =
    typeof fetch === "function" &&
    typeof Request === "function" &&
    typeof Response === "function";
  const isReadableStreamSupported =
    isFetchSupported && typeof ReadableStream === "function";
  const encodeText =
    isFetchSupported &&
    (typeof TextEncoder === "function"
      ? /* @__PURE__ */ (
          (encoder) => (str) =>
            encoder.encode(str)
        )(new TextEncoder())
      : async (str) => new Uint8Array(await new Response(str).arrayBuffer()));
  const test = (fn, ...args) => {
    try {
      return !!fn(...args);
    } catch (e2) {
      return false;
    }
  };
  const supportsRequestStream =
    isReadableStreamSupported &&
    test(() => {
      let duplexAccessed = false;
      const hasContentType = new Request(platform.origin, {
        body: new ReadableStream(),
        method: "POST",
        get duplex() {
          duplexAccessed = true;
          return "half";
        },
      }).headers.has("Content-Type");
      return duplexAccessed && !hasContentType;
    });
  const DEFAULT_CHUNK_SIZE = 64 * 1024;
  const supportsResponseStream =
    isReadableStreamSupported &&
    test(() => utils$1.isReadableStream(new Response("").body));
  const resolvers = {
    stream: supportsResponseStream && ((res) => res.body),
  };
  isFetchSupported &&
    ((res) => {
      ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
        !resolvers[type] &&
          (resolvers[type] = utils$1.isFunction(res[type])
            ? (res2) => res2[type]()
            : (_2, config) => {
                throw new AxiosError(
                  `Response type '${type}' is not supported`,
                  AxiosError.ERR_NOT_SUPPORT,
                  config
                );
              });
      });
    })(new Response());
  const getBodyLength = async (body) => {
    if (body == null) {
      return 0;
    }
    if (utils$1.isBlob(body)) {
      return body.size;
    }
    if (utils$1.isSpecCompliantForm(body)) {
      const _request = new Request(platform.origin, {
        method: "POST",
        body,
      });
      return (await _request.arrayBuffer()).byteLength;
    }
    if (utils$1.isArrayBufferView(body) || utils$1.isArrayBuffer(body)) {
      return body.byteLength;
    }
    if (utils$1.isURLSearchParams(body)) {
      body = body + "";
    }
    if (utils$1.isString(body)) {
      return (await encodeText(body)).byteLength;
    }
  };
  const resolveBodyLength = async (headers, body) => {
    const length = utils$1.toFiniteNumber(headers.getContentLength());
    return length == null ? getBodyLength(body) : length;
  };
  const fetchAdapter =
    isFetchSupported &&
    (async (config) => {
      let {
        url,
        method,
        data,
        signal,
        cancelToken,
        timeout,
        onDownloadProgress,
        onUploadProgress,
        responseType,
        headers,
        withCredentials = "same-origin",
        fetchOptions,
      } = resolveConfig(config);
      responseType = responseType ? (responseType + "").toLowerCase() : "text";
      let composedSignal = composeSignals$1(
        [signal, cancelToken && cancelToken.toAbortSignal()],
        timeout
      );
      let request;
      const unsubscribe =
        composedSignal &&
        composedSignal.unsubscribe &&
        (() => {
          composedSignal.unsubscribe();
        });
      let requestContentLength;
      try {
        if (
          onUploadProgress &&
          supportsRequestStream &&
          method !== "get" &&
          method !== "head" &&
          (requestContentLength = await resolveBodyLength(headers, data)) !== 0
        ) {
          let _request = new Request(url, {
            method: "POST",
            body: data,
            duplex: "half",
          });
          let contentTypeHeader;
          if (
            utils$1.isFormData(data) &&
            (contentTypeHeader = _request.headers.get("content-type"))
          ) {
            headers.setContentType(contentTypeHeader);
          }
          if (_request.body) {
            const [onProgress, flush] = progressEventDecorator(
              requestContentLength,
              progressEventReducer(asyncDecorator(onUploadProgress))
            );
            data = trackStream(
              _request.body,
              DEFAULT_CHUNK_SIZE,
              onProgress,
              flush
            );
          }
        }
        if (!utils$1.isString(withCredentials)) {
          withCredentials = withCredentials ? "include" : "omit";
        }
        const isCredentialsSupported = "credentials" in Request.prototype;
        request = new Request(url, {
          ...fetchOptions,
          signal: composedSignal,
          method: method.toUpperCase(),
          headers: headers.normalize().toJSON(),
          body: data,
          duplex: "half",
          credentials: isCredentialsSupported ? withCredentials : void 0,
        });
        let response = await fetch(request);
        const isStreamResponse =
          supportsResponseStream &&
          (responseType === "stream" || responseType === "response");
        if (
          supportsResponseStream &&
          (onDownloadProgress || (isStreamResponse && unsubscribe))
        ) {
          const options = {};
          ["status", "statusText", "headers"].forEach((prop) => {
            options[prop] = response[prop];
          });
          const responseContentLength = utils$1.toFiniteNumber(
            response.headers.get("content-length")
          );
          const [onProgress, flush] =
            (onDownloadProgress &&
              progressEventDecorator(
                responseContentLength,
                progressEventReducer(asyncDecorator(onDownloadProgress), true)
              )) ||
            [];
          response = new Response(
            trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
              flush && flush();
              unsubscribe && unsubscribe();
            }),
            options
          );
        }
        responseType = responseType || "text";
        let responseData = await resolvers[
          utils$1.findKey(resolvers, responseType) || "text"
        ](response, config);
        !isStreamResponse && unsubscribe && unsubscribe();
        return await new Promise((resolve, reject) => {
          settle(resolve, reject, {
            data: responseData,
            headers: AxiosHeaders$1.from(response.headers),
            status: response.status,
            statusText: response.statusText,
            config,
            request,
          });
        });
      } catch (err) {
        unsubscribe && unsubscribe();
        if (err && err.name === "TypeError" && /fetch/i.test(err.message)) {
          throw Object.assign(
            new AxiosError(
              "Network Error",
              AxiosError.ERR_NETWORK,
              config,
              request
            ),
            {
              cause: err.cause || err,
            }
          );
        }
        throw AxiosError.from(err, err && err.code, config, request);
      }
    });
  const knownAdapters = {
    http: httpAdapter,
    xhr: xhrAdapter,
    fetch: fetchAdapter,
  };
  utils$1.forEach(knownAdapters, (fn, value) => {
    if (fn) {
      try {
        Object.defineProperty(fn, "name", { value });
      } catch (e2) {}
      Object.defineProperty(fn, "adapterName", { value });
    }
  });
  const renderReason = (reason) => `- ${reason}`;
  const isResolvedHandle = (adapter) =>
    utils$1.isFunction(adapter) || adapter === null || adapter === false;
  const adapters = {
    getAdapter: (adapters2) => {
      adapters2 = utils$1.isArray(adapters2) ? adapters2 : [adapters2];
      const { length } = adapters2;
      let nameOrAdapter;
      let adapter;
      const rejectedReasons = {};
      for (let i2 = 0; i2 < length; i2++) {
        nameOrAdapter = adapters2[i2];
        let id2;
        adapter = nameOrAdapter;
        if (!isResolvedHandle(nameOrAdapter)) {
          adapter = knownAdapters[(id2 = String(nameOrAdapter)).toLowerCase()];
          if (adapter === void 0) {
            throw new AxiosError(`Unknown adapter '${id2}'`);
          }
        }
        if (adapter) {
          break;
        }
        rejectedReasons[id2 || "#" + i2] = adapter;
      }
      if (!adapter) {
        const reasons = Object.entries(rejectedReasons).map(
          ([id2, state]) =>
            `adapter ${id2} ` +
            (state === false
              ? "is not supported by the environment"
              : "is not available in the build")
        );
        let s2 = length
          ? reasons.length > 1
            ? "since :\n" + reasons.map(renderReason).join("\n")
            : " " + renderReason(reasons[0])
          : "as no adapter specified";
        throw new AxiosError(
          `There is no suitable adapter to dispatch the request ` + s2,
          "ERR_NOT_SUPPORT"
        );
      }
      return adapter;
    },
    adapters: knownAdapters,
  };
  function throwIfCancellationRequested(config) {
    if (config.cancelToken) {
      config.cancelToken.throwIfRequested();
    }
    if (config.signal && config.signal.aborted) {
      throw new CanceledError(null, config);
    }
  }
  function dispatchRequest(config) {
    throwIfCancellationRequested(config);
    config.headers = AxiosHeaders$1.from(config.headers);
    config.data = transformData.call(config, config.transformRequest);
    if (["post", "put", "patch"].indexOf(config.method) !== -1) {
      config.headers.setContentType("application/x-www-form-urlencoded", false);
    }
    const adapter = adapters.getAdapter(config.adapter || defaults$1.adapter);
    return adapter(config).then(
      function onAdapterResolution(response) {
        throwIfCancellationRequested(config);
        response.data = transformData.call(
          config,
          config.transformResponse,
          response
        );
        response.headers = AxiosHeaders$1.from(response.headers);
        return response;
      },
      function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);
          if (reason && reason.response) {
            reason.response.data = transformData.call(
              config,
              config.transformResponse,
              reason.response
            );
            reason.response.headers = AxiosHeaders$1.from(
              reason.response.headers
            );
          }
        }
        return Promise.reject(reason);
      }
    );
  }
  const VERSION = "1.7.7";
  const validators$1 = {};
  ["object", "boolean", "number", "function", "string", "symbol"].forEach(
    (type, i2) => {
      validators$1[type] = function validator2(thing) {
        return typeof thing === type || "a" + (i2 < 1 ? "n " : " ") + type;
      };
    }
  );
  const deprecatedWarnings = {};
  validators$1.transitional = function transitional(
    validator2,
    version,
    message
  ) {
    function formatMessage(opt, desc) {
      return (
        "[Axios v" +
        VERSION +
        "] Transitional option '" +
        opt +
        "'" +
        desc +
        (message ? ". " + message : "")
      );
    }
    return (value, opt, opts) => {
      if (validator2 === false) {
        throw new AxiosError(
          formatMessage(
            opt,
            " has been removed" + (version ? " in " + version : "")
          ),
          AxiosError.ERR_DEPRECATED
        );
      }
      if (version && !deprecatedWarnings[opt]) {
        deprecatedWarnings[opt] = true;
        console.warn(
          formatMessage(
            opt,
            " has been deprecated since v" +
              version +
              " and will be removed in the near future"
          )
        );
      }
      return validator2 ? validator2(value, opt, opts) : true;
    };
  };
  function assertOptions(options, schema, allowUnknown) {
    if (typeof options !== "object") {
      throw new AxiosError(
        "options must be an object",
        AxiosError.ERR_BAD_OPTION_VALUE
      );
    }
    const keys = Object.keys(options);
    let i2 = keys.length;
    while (i2-- > 0) {
      const opt = keys[i2];
      const validator2 = schema[opt];
      if (validator2) {
        const value = options[opt];
        const result = value === void 0 || validator2(value, opt, options);
        if (result !== true) {
          throw new AxiosError(
            "option " + opt + " must be " + result,
            AxiosError.ERR_BAD_OPTION_VALUE
          );
        }
        continue;
      }
      if (allowUnknown !== true) {
        throw new AxiosError(
          "Unknown option " + opt,
          AxiosError.ERR_BAD_OPTION
        );
      }
    }
  }
  const validator = {
    assertOptions,
    validators: validators$1,
  };
  const validators = validator.validators;
  class Axios {
    constructor(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager(),
        response: new InterceptorManager(),
      };
    }
    /**
     * Dispatch a request
     *
     * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
     * @param {?Object} config
     *
     * @returns {Promise} The Promise to be fulfilled
     */
    async request(configOrUrl, config) {
      try {
        return await this._request(configOrUrl, config);
      } catch (err) {
        if (err instanceof Error) {
          let dummy;
          Error.captureStackTrace
            ? Error.captureStackTrace((dummy = {}))
            : (dummy = new Error());
          const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, "") : "";
          try {
            if (!err.stack) {
              err.stack = stack;
            } else if (
              stack &&
              !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ""))
            ) {
              err.stack += "\n" + stack;
            }
          } catch (e2) {}
        }
        throw err;
      }
    }
    _request(configOrUrl, config) {
      if (typeof configOrUrl === "string") {
        config = config || {};
        config.url = configOrUrl;
      } else {
        config = configOrUrl || {};
      }
      config = mergeConfig(this.defaults, config);
      const { transitional: transitional2, paramsSerializer, headers } = config;
      if (transitional2 !== void 0) {
        validator.assertOptions(
          transitional2,
          {
            silentJSONParsing: validators.transitional(validators.boolean),
            forcedJSONParsing: validators.transitional(validators.boolean),
            clarifyTimeoutError: validators.transitional(validators.boolean),
          },
          false
        );
      }
      if (paramsSerializer != null) {
        if (utils$1.isFunction(paramsSerializer)) {
          config.paramsSerializer = {
            serialize: paramsSerializer,
          };
        } else {
          validator.assertOptions(
            paramsSerializer,
            {
              encode: validators.function,
              serialize: validators.function,
            },
            true
          );
        }
      }
      config.method = (
        config.method ||
        this.defaults.method ||
        "get"
      ).toLowerCase();
      let contextHeaders =
        headers && utils$1.merge(headers.common, headers[config.method]);
      headers &&
        utils$1.forEach(
          ["delete", "get", "head", "post", "put", "patch", "common"],
          (method) => {
            delete headers[method];
          }
        );
      config.headers = AxiosHeaders$1.concat(contextHeaders, headers);
      const requestInterceptorChain = [];
      let synchronousRequestInterceptors = true;
      this.interceptors.request.forEach(function unshiftRequestInterceptors(
        interceptor
      ) {
        if (
          typeof interceptor.runWhen === "function" &&
          interceptor.runWhen(config) === false
        ) {
          return;
        }
        synchronousRequestInterceptors =
          synchronousRequestInterceptors && interceptor.synchronous;
        requestInterceptorChain.unshift(
          interceptor.fulfilled,
          interceptor.rejected
        );
      });
      const responseInterceptorChain = [];
      this.interceptors.response.forEach(function pushResponseInterceptors(
        interceptor
      ) {
        responseInterceptorChain.push(
          interceptor.fulfilled,
          interceptor.rejected
        );
      });
      let promise;
      let i2 = 0;
      let len;
      if (!synchronousRequestInterceptors) {
        const chain = [dispatchRequest.bind(this), void 0];
        chain.unshift.apply(chain, requestInterceptorChain);
        chain.push.apply(chain, responseInterceptorChain);
        len = chain.length;
        promise = Promise.resolve(config);
        while (i2 < len) {
          promise = promise.then(chain[i2++], chain[i2++]);
        }
        return promise;
      }
      len = requestInterceptorChain.length;
      let newConfig = config;
      i2 = 0;
      while (i2 < len) {
        const onFulfilled = requestInterceptorChain[i2++];
        const onRejected = requestInterceptorChain[i2++];
        try {
          newConfig = onFulfilled(newConfig);
        } catch (error) {
          onRejected.call(this, error);
          break;
        }
      }
      try {
        promise = dispatchRequest.call(this, newConfig);
      } catch (error) {
        return Promise.reject(error);
      }
      i2 = 0;
      len = responseInterceptorChain.length;
      while (i2 < len) {
        promise = promise.then(
          responseInterceptorChain[i2++],
          responseInterceptorChain[i2++]
        );
      }
      return promise;
    }
    getUri(config) {
      config = mergeConfig(this.defaults, config);
      const fullPath = buildFullPath(config.baseURL, config.url);
      return buildURL(fullPath, config.params, config.paramsSerializer);
    }
  }
  utils$1.forEach(
    ["delete", "get", "head", "options"],
    function forEachMethodNoData(method) {
      Axios.prototype[method] = function (url, config) {
        return this.request(
          mergeConfig(config || {}, {
            method,
            url,
            data: (config || {}).data,
          })
        );
      };
    }
  );
  utils$1.forEach(
    ["post", "put", "patch"],
    function forEachMethodWithData(method) {
      function generateHTTPMethod(isForm) {
        return function httpMethod(url, data, config) {
          return this.request(
            mergeConfig(config || {}, {
              method,
              headers: isForm
                ? {
                    "Content-Type": "multipart/form-data",
                  }
                : {},
              url,
              data,
            })
          );
        };
      }
      Axios.prototype[method] = generateHTTPMethod();
      Axios.prototype[method + "Form"] = generateHTTPMethod(true);
    }
  );
  const Axios$1 = Axios;
  class CancelToken {
    constructor(executor) {
      if (typeof executor !== "function") {
        throw new TypeError("executor must be a function.");
      }
      let resolvePromise;
      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });
      const token = this;
      this.promise.then((cancel) => {
        if (!token._listeners) return;
        let i2 = token._listeners.length;
        while (i2-- > 0) {
          token._listeners[i2](cancel);
        }
        token._listeners = null;
      });
      this.promise.then = (onfulfilled) => {
        let _resolve;
        const promise = new Promise((resolve) => {
          token.subscribe(resolve);
          _resolve = resolve;
        }).then(onfulfilled);
        promise.cancel = function reject() {
          token.unsubscribe(_resolve);
        };
        return promise;
      };
      executor(function cancel(message, config, request) {
        if (token.reason) {
          return;
        }
        token.reason = new CanceledError(message, config, request);
        resolvePromise(token.reason);
      });
    }
    /**
     * Throws a `CanceledError` if cancellation has been requested.
     */
    throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    }
    /**
     * Subscribe to the cancel signal
     */
    subscribe(listener) {
      if (this.reason) {
        listener(this.reason);
        return;
      }
      if (this._listeners) {
        this._listeners.push(listener);
      } else {
        this._listeners = [listener];
      }
    }
    /**
     * Unsubscribe from the cancel signal
     */
    unsubscribe(listener) {
      if (!this._listeners) {
        return;
      }
      const index = this._listeners.indexOf(listener);
      if (index !== -1) {
        this._listeners.splice(index, 1);
      }
    }
    toAbortSignal() {
      const controller = new AbortController();
      const abort = (err) => {
        controller.abort(err);
      };
      this.subscribe(abort);
      controller.signal.unsubscribe = () => this.unsubscribe(abort);
      return controller.signal;
    }
    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    static source() {
      let cancel;
      const token = new CancelToken(function executor(c2) {
        cancel = c2;
      });
      return {
        token,
        cancel,
      };
    }
  }
  const CancelToken$1 = CancelToken;
  function spread(callback) {
    return function wrap(arr) {
      return callback.apply(null, arr);
    };
  }
  function isAxiosError(payload) {
    return utils$1.isObject(payload) && payload.isAxiosError === true;
  }
  const HttpStatusCode = {
    Continue: 100,
    SwitchingProtocols: 101,
    Processing: 102,
    EarlyHints: 103,
    Ok: 200,
    Created: 201,
    Accepted: 202,
    NonAuthoritativeInformation: 203,
    NoContent: 204,
    ResetContent: 205,
    PartialContent: 206,
    MultiStatus: 207,
    AlreadyReported: 208,
    ImUsed: 226,
    MultipleChoices: 300,
    MovedPermanently: 301,
    Found: 302,
    SeeOther: 303,
    NotModified: 304,
    UseProxy: 305,
    Unused: 306,
    TemporaryRedirect: 307,
    PermanentRedirect: 308,
    BadRequest: 400,
    Unauthorized: 401,
    PaymentRequired: 402,
    Forbidden: 403,
    NotFound: 404,
    MethodNotAllowed: 405,
    NotAcceptable: 406,
    ProxyAuthenticationRequired: 407,
    RequestTimeout: 408,
    Conflict: 409,
    Gone: 410,
    LengthRequired: 411,
    PreconditionFailed: 412,
    PayloadTooLarge: 413,
    UriTooLong: 414,
    UnsupportedMediaType: 415,
    RangeNotSatisfiable: 416,
    ExpectationFailed: 417,
    ImATeapot: 418,
    MisdirectedRequest: 421,
    UnprocessableEntity: 422,
    Locked: 423,
    FailedDependency: 424,
    TooEarly: 425,
    UpgradeRequired: 426,
    PreconditionRequired: 428,
    TooManyRequests: 429,
    RequestHeaderFieldsTooLarge: 431,
    UnavailableForLegalReasons: 451,
    InternalServerError: 500,
    NotImplemented: 501,
    BadGateway: 502,
    ServiceUnavailable: 503,
    GatewayTimeout: 504,
    HttpVersionNotSupported: 505,
    VariantAlsoNegotiates: 506,
    InsufficientStorage: 507,
    LoopDetected: 508,
    NotExtended: 510,
    NetworkAuthenticationRequired: 511,
  };
  Object.entries(HttpStatusCode).forEach(([key, value]) => {
    HttpStatusCode[value] = key;
  });
  const HttpStatusCode$1 = HttpStatusCode;
  function createInstance(defaultConfig) {
    const context = new Axios$1(defaultConfig);
    const instance = bind(Axios$1.prototype.request, context);
    utils$1.extend(instance, Axios$1.prototype, context, { allOwnKeys: true });
    utils$1.extend(instance, context, null, { allOwnKeys: true });
    instance.create = function create(instanceConfig) {
      return createInstance(mergeConfig(defaultConfig, instanceConfig));
    };
    return instance;
  }
  const axios = createInstance(defaults$1);
  axios.Axios = Axios$1;
  axios.CanceledError = CanceledError;
  axios.CancelToken = CancelToken$1;
  axios.isCancel = isCancel;
  axios.VERSION = VERSION;
  axios.toFormData = toFormData;
  axios.AxiosError = AxiosError;
  axios.Cancel = axios.CanceledError;
  axios.all = function all(promises) {
    return Promise.all(promises);
  };
  axios.spread = spread;
  axios.isAxiosError = isAxiosError;
  axios.mergeConfig = mergeConfig;
  axios.AxiosHeaders = AxiosHeaders$1;
  axios.formToJSON = (thing) =>
    formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);
  axios.getAdapter = adapters.getAdapter;
  axios.HttpStatusCode = HttpStatusCode$1;
  axios.default = axios;
  const API_URL = "https://dev-api-lootlog.devcluster.pl";
  const useGuilds = () => {
    const token = useAuthToken();
    const query = useQuery({
      queryKey: ["user-guilds"],
      queryFn: () =>
        axios.get(`${API_URL}/users/@me/guilds`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      enabled: !!token,
      select: (response) => response.data,
    });
    return query;
  };
  const Settings = () => {
    const [isSettingsOpen, setIsSettingsOpen] = reactExports.useState(false);
    const { isAuthenticated, loginWithPopup } = useAuth0();
    const { data } = useGuilds();
    console.log(data);
    const handleLogin = () => {
      loginWithPopup();
    };
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DraggableWindow, {
          id: "settings-trigger",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "ll-bg-slate-900 ll-text-white ll-flex",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                onClick: () => setIsSettingsOpen(!isSettingsOpen),
                children: "Ustawienia lootloga",
              }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                children: "drag",
              }),
            ],
          }),
        }),
        isSettingsOpen &&
          /* @__PURE__ */ jsxRuntimeExports.jsx(DraggableWindow, {
            id: "settings-window",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "ll-bg-slate-900 ll-text-white ll-w-96",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  children: "Ustawienia",
                }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      children: "Ustawienia 1",
                    }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      children: "Ustawienia 2",
                    }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      children: "Ustawienia 3",
                    }),
                    !isAuthenticated &&
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                        onClick: handleLogin,
                        children: "Zaloguj się",
                      }),
                  ],
                }),
              ],
            }),
          }),
      ],
    });
  };
  function App() {
    const { initialized } = useGlobalContext();
    reactExports.useState({});
    reactExports.useState(false);
    useAuthToken();
    useAuth0();
    console.log("initialized", initialized);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Timers, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, {}),
      ],
    });
  }
  var define_import_meta_env_default = {
    VITE_AUTH0_DOMAIN: "lootlog-dev.eu.auth0.com",
    VITE_AUTH0_CLIENT_ID: "X23mQiB4KG5XMp1S8SNrHSv06v577q1a",
    VITE_API_URL: "https://dev-api-lootlog.devcluster.pl",
    BASE_URL: "/",
    MODE: "production",
    DEV: false,
    PROD: true,
    SSR: false,
  };
  const AUTH0_DOMAIN = "lootlog-dev.eu.auth0.com";
  const AUTH0_CLIENT_ID = "X23mQiB4KG5XMp1S8SNrHSv06v577q1a";
  const AUTH0_AUDIENCE = define_import_meta_env_default.VITE_AUTH0_AUDIENCE;
  const Auth0ProviderWithConfig = ({ children }) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Auth0Provider, {
      domain: AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID,
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: AUTH0_AUDIENCE,
      },
      children,
    });
  };
  const queryClient = new QueryClient();
  client
    .createRoot(
      (() => {
        const app = document.createElement("div");
        app.id = "root";
        app.className =
          "ll-absolute ll-top-0 ll-left-0 ll-z-20 ll-h-screen ll-w-screen ll-pointer-events-none";
        document.body.append(app);
        return app;
      })()
    )
    .render(
      /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(QueryClientProvider, {
          client: queryClient,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Auth0ProviderWithConfig,
            {
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                GlobalContextProvider,
                { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) }
              ),
            }
          ),
        }),
      })
    );
})();
