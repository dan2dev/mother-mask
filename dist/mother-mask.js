/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/main.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/process/browser.js":
/*!*****************************************!*\
  !*** ./node_modules/process/browser.js ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),

/***/ "./node_modules/setimmediate/setImmediate.js":
/*!***************************************************!*\
  !*** ./node_modules/setimmediate/setImmediate.js ***!
  \***************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global, process) {(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var registerImmediate;

    function setImmediate(callback) {
      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }
      // Copy function arguments
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
      }
      // Store and register the task
      var task = { callback: callback, args: args };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
        case 0:
            callback();
            break;
        case 1:
            callback(args[0]);
            break;
        case 2:
            callback(args[0], args[1]);
            break;
        case 3:
            callback(args[0], args[1], args[2]);
            break;
        default:
            callback.apply(undefined, args);
            break;
        }
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(runIfPresent, 0, handle);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    run(task);
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function installNextTickImplementation() {
        registerImmediate = function(handle) {
            process.nextTick(function () { runIfPresent(handle); });
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        registerImmediate = function(handle) {
            global.postMessage(messagePrefix + handle, "*");
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        registerImmediate = function(handle) {
            channel.port2.postMessage(handle);
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
        };
    }

    function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
            setTimeout(runIfPresent, 0, handle);
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js"), __webpack_require__(/*! ./../process/browser.js */ "./node_modules/process/browser.js")))

/***/ }),

/***/ "./node_modules/timers-browserify/main.js":
/*!************************************************!*\
  !*** ./node_modules/timers-browserify/main.js ***!
  \************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {var apply = Function.prototype.apply;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) {
  if (timeout) {
    timeout.close();
  }
};

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// setimmediate attaches itself to the global object
__webpack_require__(/*! setimmediate */ "./node_modules/setimmediate/setImmediate.js");
// On some exotic environments, it's not clear which object `setimmeidate` was
// able to install onto.  Search each possibility in the same order as the
// `setimmediate` library.
exports.setImmediate = (typeof self !== "undefined" && self.setImmediate) ||
                       (typeof global !== "undefined" && global.setImmediate) ||
                       (this && this.setImmediate);
exports.clearImmediate = (typeof self !== "undefined" && self.clearImmediate) ||
                         (typeof global !== "undefined" && global.clearImmediate) ||
                         (this && this.clearImmediate);

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")))

/***/ }),

/***/ "./node_modules/utility-collection/lib/dom.js":
/*!****************************************************!*\
  !*** ./node_modules/utility-collection/lib/dom.js ***!
  \****************************************************/
/*! exports provided: Dom, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Dom", function() { return Dom; });
var Dom;
(function (Dom) {
    function insertBefore(element, targetElement) {
        targetElement.parentElement.insertBefore(element, targetElement);
    }
    Dom.insertBefore = insertBefore;
    function insertAfter(element, targetElement) {
        const parent = targetElement.parentNode;
        if (parent.lastChild === targetElement) {
            parent.appendChild(element);
        }
        else {
            parent.insertBefore(element, targetElement.nextSibling);
        }
    }
    Dom.insertAfter = insertAfter;
    function remove(element) {
        if (element.parentElement !== null) {
            element.parentElement.removeChild(element);
        }
    }
    Dom.remove = remove;
    function htmlToNode(html) {
        if (html instanceof Node) {
            return html;
        }
        else {
            const node = document.createElement("div");
            node.innerHTML = html;
            return node.firstElementChild;
        }
    }
    Dom.htmlToNode = htmlToNode;
    function htmlToElement(html) {
        return htmlToNode(html);
    }
    Dom.htmlToElement = htmlToElement;
    // atributes  ---------------------------------------------
    function getAttributes(element) {
        const attrs = element.attributes;
        const newAttr = {};
        for (let i = 0; i < attrs.length; i++) {
            newAttr[attrs[i].name] = attrs[i].value;
        }
        return newAttr;
    }
    Dom.getAttributes = getAttributes;
    // Loops e giros pelo dom --------------------------------------------
    function childElement(node, each) {
        let child = node.firstChild;
        while (child) {
            if (child.nodeType === 1) {
                each(child);
            }
            child = child.nextSibling;
        }
    }
    Dom.childElement = childElement;
    // element down --------------------------
    function nodeDown(node, each) {
        if (each(node, undefined) !== false) {
            this.childNodeDown(node, each);
        }
    }
    Dom.nodeDown = nodeDown;
    function childNodeDown(node, each) {
        const parent = node;
        let child = node.firstChild;
        while (child) {
            const eachReturn = each(child, parent);
            if (eachReturn !== false) {
                this.childNodeDown(child, each);
            }
            child = child.nextSibling;
        }
    }
    Dom.childNodeDown = childNodeDown;
    function elementDown(node, each) {
        if (each(node, undefined) !== false) {
            this.childElementDown(node, each);
        }
    }
    Dom.elementDown = elementDown;
    function childElementDown(node, each) {
        const parent = node;
        let child = node.firstChild;
        while (child) {
            if (child.nodeType === 1) {
                const eachReturn = each(child, parent);
                if (eachReturn !== false) {
                    this.childElementDown(child, each);
                }
            }
            child = child.nextSibling;
        }
    }
    Dom.childElementDown = childElementDown;
    // element up --------------------------
    function elementUp(node, each) {
        if (each(node) !== false) {
            parentElementUp(node, each);
        }
    }
    Dom.elementUp = elementUp;
    function parentElementUp(node, each) {
        let retorno = true;
        let current = node.parentNode;
        do {
            retorno = each(current);
            current = current.parentNode;
        } while (retorno !== false && current !== null && current !== undefined && node.nodeName !== "BODY");
    }
    Dom.parentElementUp = parentElementUp;
    // dom --------------------------
    function attribute(element, each) {
        // TODO: this still need to be tested
        const attributes = element.attributes;
        for (let i = 0; i < attributes.length; i++) {
            each(attributes[i].name, attributes[i].value);
        }
    }
    Dom.attribute = attribute;
    function findNextSibling(target, validation) {
        let current = target.nextSibling;
        while (current !== null) {
            if (validation(current) === true) {
                return current;
            }
            else {
                current = current.nextSibling;
            }
        }
        return null;
    }
    Dom.findNextSibling = findNextSibling;
    function findPrevSibling(target, validation) {
        let current = target.previousSibling;
        while (current !== null) {
            if (validation(current) === true) {
                return current;
            }
            else {
                current = current.previousSibling;
            }
        }
        return null;
    }
    Dom.findPrevSibling = findPrevSibling;
    function findAllSiblings(target) {
        const siblings = [];
        findPrevSibling(target, (node) => {
            siblings.push(node);
            return false;
        });
        findNextSibling(target, (node) => {
            siblings.push(node);
            return false;
        });
        return siblings;
    }
    Dom.findAllSiblings = findAllSiblings;
    function prependChild(parent, child) {
        const firstChild = parent.firstChild;
        if (firstChild === undefined) {
            parent.appendChild(child);
        }
        else {
            parent.insertBefore(child, firstChild);
        }
    }
    Dom.prependChild = prependChild;
    function appendChild(parent, child) {
        parent.appendChild(child);
    }
    Dom.appendChild = appendChild;
    function replaceElement(oldElement, newElement) {
        oldElement.parentElement.replaceChild(newElement, oldElement);
    }
    Dom.replaceElement = replaceElement;
    function swapNodes(n1, n2) {
        let i1;
        let i2;
        let p1 = n1.parentNode;
        let p2 = n2.parentNode;
        if (p1 === undefined || p1 === null) {
            p1 = document.createElement("div");
            p1.appendChild(n1);
        }
        if (p2 === undefined || p2 === null) {
            p2 = document.createElement("div");
            p2.appendChild(n2);
        }
        if (!p1 || !p2 || p1.isEqualNode(n2) || p2.isEqualNode(n1)) {
            return;
        }
        for (let i = 0; i < p1.children.length; i++) {
            if (p1.children[i].isEqualNode(n1)) {
                i1 = i;
            }
        }
        for (let i = 0; i < p2.children.length; i++) {
            if (p2.children[i].isEqualNode(n2)) {
                i2 = i;
            }
        }
        if (p1.isEqualNode(p2) && i1 < i2) {
            i2++;
        }
        p1.insertBefore(n2, p1.children[i1]);
        p2.insertBefore(n1, p2.children[i2]);
    }
    Dom.swapNodes = swapNodes;
})(Dom || (Dom = {}));
/* harmony default export */ __webpack_exports__["default"] = (Dom);
//# sourceMappingURL=dom.js.map

/***/ }),

/***/ "./node_modules/utility-collection/lib/event.js":
/*!******************************************************!*\
  !*** ./node_modules/utility-collection/lib/event.js ***!
  \******************************************************/
/*! exports provided: Event, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Event", function() { return Event; });
var Event;
(function (Event) {
    function once(target, type, listener) {
        const fn = (ev) => {
            target.removeEventListener(type, fn);
            listener(ev);
        };
        target.addEventListener(type, fn);
    }
    Event.once = once;
    function onceOutside(target, type, listener) {
        const fn = (ev) => {
            const inside = target.contains(ev.target);
            if (!inside) {
                listener(ev);
                document.removeEventListener(type, fn);
            }
        };
        document.addEventListener(type, fn);
    }
    Event.onceOutside = onceOutside;
    function bindOutside(target, type, listener) {
        const fn = (ev) => {
            const inside = target.contains(ev.target);
            if (!inside) {
                listener(ev);
            }
        };
        document.addEventListener(type, fn);
    }
    Event.bindOutside = bindOutside;
    function bind(target, type, listener) {
        const fn = (ev) => {
            listener(ev);
        };
        target.addEventListener(type, fn);
    }
    Event.bind = bind;
    // passive supported
    const passiveSupported = false;
    function passive() {
        return (passiveSupported ? { passive: true } : false);
    }
    Event.passive = passive;
    (function Initialize() {
        // detect if suport passive event
        try {
            const options = Object.defineProperty({}, "passive", {
                get: () => {
                    undefined.passiveSupported = true;
                },
            });
            window.addEventListener("test", null, options);
        }
        catch (err) {
            //
        }
    })();
})(Event || (Event = {}));
/* harmony default export */ __webpack_exports__["default"] = (Event);
//# sourceMappingURL=event.js.map

/***/ }),

/***/ "./node_modules/utility-collection/lib/is.js":
/*!***************************************************!*\
  !*** ./node_modules/utility-collection/lib/is.js ***!
  \***************************************************/
/*! exports provided: Is, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Is", function() { return Is; });
/* harmony import */ var _string__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./string */ "./node_modules/utility-collection/lib/string.js");
// import moment from "moment";

// console.log("--> ok");
var Is;
(function (Is) {
    function mobile() {
        if (window.innerWidth < 900) {
            return true;
        }
        else {
            return false;
        }
    }
    Is.mobile = mobile;
    // is null or undefined
    function nullOrUndefined(value) {
        if (value === undefined || value === null) {
            return true;
        }
        else {
            return false;
        }
    }
    Is.nullOrUndefined = nullOrUndefined;
    // id empty
    function empty(value) {
        if (value === undefined || value === null || value === "") {
            return true;
        }
        else {
            return false;
        }
    }
    Is.empty = empty;
    // is Number
    const numberRegex = /\D/;
    function number(value) {
        return !numberRegex.test(value);
    }
    Is.number = number;
    // is Letter
    const letterRegex = /[a-zA-Z]/;
    function letter(value) {
        return letterRegex.test(value);
    }
    Is.letter = letter;
    // --------------------------------
    const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/m;
    function email(value) {
        return emailRegex.test(value);
    }
    Is.email = email;
    // brazilian validations ----------------------------------------
    // phone
    const brazilianPhoneRegex = /^(?:(?:\+)[0-9]{2}\s?){0,1}(?:\()[0-9]{2}(?:\))\s?[0-9]{0,1}\s?[0-9]{4,}(?:-)[0-9]{4}$/m;
    function brazilianPhone(phone) {
        return brazilianPhoneRegex.test(phone);
    }
    Is.brazilianPhone = brazilianPhone;
    function ddmmyyyy(date) {
        throw new Error("Not implemented.");
        // return moment(date, "DD/MM/YYYY", true).isValid();
    }
    Is.ddmmyyyy = ddmmyyyy;
    function mmddyyyy(date) {
        throw new Error("Not implemented.");
        // return moment(date, "MM/DD/YYYY", true).isValid();
    }
    Is.mmddyyyy = mmddyyyy;
    // CPF
    function cpf(value) {
        value = _string__WEBPACK_IMPORTED_MODULE_0__["default"].stripNonNumber(value);
        let numeros;
        let digitos;
        let soma;
        let i;
        let resultado;
        let digitos_iguais;
        digitos_iguais = 1;
        if (value.length < 11) {
            return false;
        }
        for (i = 0; i < value.length - 1; i++) {
            if (value.charAt(i) !== value.charAt(i + 1)) {
                digitos_iguais = 0;
                break;
            }
        }
        if (!digitos_iguais) {
            numeros = value.substring(0, 9);
            digitos = value.substring(9);
            soma = 0;
            for (i = 10; i > 1; i--) {
                soma += +(numeros.charAt(10 - i)) * i;
            }
            resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
            if (resultado !== +(digitos.charAt(0))) {
                return false;
            }
            numeros = value.substring(0, 10);
            soma = 0;
            for (i = 11; i > 1; i--) {
                soma += +(numeros.charAt(11 - i)) * i;
            }
            resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
            if (resultado !== +(digitos.charAt(1))) {
                return false;
            }
            return true;
        }
        else {
            return false;
        }
    }
    Is.cpf = cpf;
    // CNPJ
    function cnpj(value) {
        value = _string__WEBPACK_IMPORTED_MODULE_0__["default"].stripNonNumber(value);
        let tamanho;
        let numeros;
        let digitos;
        let soma;
        let pos;
        value = value.replace(/[^\d]+/g, "");
        if (value === "") {
            return false;
        }
        if (value.length !== 14) {
            return false;
        }
        // Elimina CNPJs invalidos conhecidos
        if (value === "00000000000000" ||
            value === "11111111111111" ||
            value === "22222222222222" ||
            value === "33333333333333" ||
            value === "44444444444444" ||
            value === "55555555555555" ||
            value === "66666666666666" ||
            value === "77777777777777" ||
            value === "88888888888888" ||
            value === "99999999999999") {
            return false;
        }
        // Valida DVs
        tamanho = value.length - 2;
        numeros = value.substring(0, tamanho);
        digitos = value.substring(tamanho);
        soma = 0;
        pos = tamanho - 7;
        for (let i = tamanho; i >= 1; i--) {
            soma += +(numeros.charAt(tamanho - i)) * pos--;
            if (pos < 2) {
                pos = 9;
            }
        }
        let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado !== +(digitos.charAt(0))) {
            return false;
        }
        tamanho = tamanho + 1;
        numeros = value.substring(0, tamanho);
        soma = 0;
        pos = tamanho - 7;
        for (let i = tamanho; i >= 1; i--) {
            soma += +(numeros.charAt(tamanho - i)) * pos--;
            if (pos < 2) {
                pos = 9;
            }
        }
        resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado !== +(digitos.charAt(1))) {
            return false;
        }
        return true;
    }
})(Is || (Is = {}));
/* harmony default export */ __webpack_exports__["default"] = (Is);
//# sourceMappingURL=is.js.map

/***/ }),

/***/ "./node_modules/utility-collection/lib/list.js":
/*!*****************************************************!*\
  !*** ./node_modules/utility-collection/lib/list.js ***!
  \*****************************************************/
/*! exports provided: List, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "List", function() { return List; });
var List;
(function (List) {
    // remove item from list if exist
    function removeFromIndex(list, index) {
        list.splice(index, 1);
        return list;
    }
    List.removeFromIndex = removeFromIndex;
    function removeItem(list, item) {
        const index = list.indexOf(item);
        let newList;
        if (index > -1) {
            newList = removeFromIndex(list, index);
        }
        else {
            newList = list;
        }
        return newList;
    }
    List.removeItem = removeItem;
    function setItem(list, item) {
        const index = list.indexOf(item);
        if (index < 0) {
            list.push(item);
        }
        return list;
    }
    List.setItem = setItem;
})(List || (List = {}));
/* harmony default export */ __webpack_exports__["default"] = (List);
//# sourceMappingURL=list.js.map

/***/ }),

/***/ "./node_modules/utility-collection/lib/main.js":
/*!*****************************************************!*\
  !*** ./node_modules/utility-collection/lib/main.js ***!
  \*****************************************************/
/*! exports provided: UtilityCollection, default, Dom, Is, String, Reflection, Url, List, DATA_SCROLLABLE, CLASS_FOCUS, ScrollSwitch, Event */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "UtilityCollection", function() { return UtilityCollection; });
/* harmony import */ var _dom__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./dom */ "./node_modules/utility-collection/lib/dom.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Dom", function() { return _dom__WEBPACK_IMPORTED_MODULE_0__["Dom"]; });

/* harmony import */ var _is__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./is */ "./node_modules/utility-collection/lib/is.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Is", function() { return _is__WEBPACK_IMPORTED_MODULE_1__["Is"]; });

/* harmony import */ var _string__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./string */ "./node_modules/utility-collection/lib/string.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "String", function() { return _string__WEBPACK_IMPORTED_MODULE_2__["String"]; });

/* harmony import */ var _reflection__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./reflection */ "./node_modules/utility-collection/lib/reflection.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Reflection", function() { return _reflection__WEBPACK_IMPORTED_MODULE_3__["Reflection"]; });

/* harmony import */ var _url__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./url */ "./node_modules/utility-collection/lib/url.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Url", function() { return _url__WEBPACK_IMPORTED_MODULE_4__["Url"]; });

/* harmony import */ var _list__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./list */ "./node_modules/utility-collection/lib/list.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "List", function() { return _list__WEBPACK_IMPORTED_MODULE_5__["List"]; });

/* harmony import */ var _scroll_switch__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./scroll-switch */ "./node_modules/utility-collection/lib/scroll-switch.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "DATA_SCROLLABLE", function() { return _scroll_switch__WEBPACK_IMPORTED_MODULE_6__["DATA_SCROLLABLE"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "CLASS_FOCUS", function() { return _scroll_switch__WEBPACK_IMPORTED_MODULE_6__["CLASS_FOCUS"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "ScrollSwitch", function() { return _scroll_switch__WEBPACK_IMPORTED_MODULE_6__["ScrollSwitch"]; });

/* harmony import */ var _event__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./event */ "./node_modules/utility-collection/lib/event.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Event", function() { return _event__WEBPACK_IMPORTED_MODULE_7__["Event"]; });









var UtilityCollection;
(function (UtilityCollection) {
    const name = "UtilityCollection";
})(UtilityCollection || (UtilityCollection = {}));
/* harmony default export */ __webpack_exports__["default"] = (UtilityCollection);
//# sourceMappingURL=main.js.map

/***/ }),

/***/ "./node_modules/utility-collection/lib/reflection.js":
/*!***********************************************************!*\
  !*** ./node_modules/utility-collection/lib/reflection.js ***!
  \***********************************************************/
/*! exports provided: Reflection, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Reflection", function() { return Reflection; });
var Reflection;
(function (Reflection) {
    function merge(base, source) {
        for (const i in source) {
            if (source.hasOwnProperty(i)) {
                base[i] = source[i];
            }
        }
    }
    Reflection.merge = merge;
    function fill(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                const element = source[key];
                target[key] = element;
            }
        }
        return target;
    }
    Reflection.fill = fill;
})(Reflection || (Reflection = {}));
/* harmony default export */ __webpack_exports__["default"] = (Reflection);
//# sourceMappingURL=reflection.js.map

/***/ }),

/***/ "./node_modules/utility-collection/lib/scroll-switch.js":
/*!**************************************************************!*\
  !*** ./node_modules/utility-collection/lib/scroll-switch.js ***!
  \**************************************************************/
/*! exports provided: DATA_SCROLLABLE, CLASS_FOCUS, ScrollSwitch, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DATA_SCROLLABLE", function() { return DATA_SCROLLABLE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CLASS_FOCUS", function() { return CLASS_FOCUS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ScrollSwitch", function() { return ScrollSwitch; });
/* harmony import */ var _event__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./event */ "./node_modules/utility-collection/lib/event.js");

const DATA_SCROLLABLE = "data-scrollable";
const CLASS_FOCUS = "scroll--active";
var ScrollSwitch;
(function (ScrollSwitch) {
    let unfreezeDelay;
    class Scrollable {
        constructor(element) {
            this.element = null;
            this.y = 0;
            this.frozen = false;
            this.unfreezing = false;
            this.element = element;
            if (this.element.getAttribute(DATA_SCROLLABLE) === undefined) {
                this.id = newScrollableId();
                this.element.setAttribute(DATA_SCROLLABLE, this.id);
            }
            else {
                this.id = this.element.getAttribute(DATA_SCROLLABLE);
            }
            // register event
            const unfreezeEvent = (e) => {
                window.scrollTo(0, window.scrollY);
                this.unfreeze();
            };
            const freezeAllEvent = (e) => {
                freezeAllButId(null);
            };
            element.addEventListener("touchstart", unfreezeEvent, _event__WEBPACK_IMPORTED_MODULE_0__["Event"].passive());
            element.addEventListener("mouseenter", unfreezeEvent, _event__WEBPACK_IMPORTED_MODULE_0__["Event"].passive());
            element.addEventListener("pointermove", unfreezeEvent, _event__WEBPACK_IMPORTED_MODULE_0__["Event"].passive());
            element.addEventListener("mouseleave", freezeAllEvent, _event__WEBPACK_IMPORTED_MODULE_0__["Event"].passive());
        }
        getId() {
            return this.id;
        }
        unfreeze() {
            if (this.frozen && !this.unfreezing) {
                this.unfreezing = true;
                freezeAllButId(this.id);
                document.body.style.height = `${this.element.scrollHeight}px`;
                window.scroll(0, this.y);
                this.element.setAttribute("style", `position: absolute; top: 0; z-index: ${this.element.style.zIndex}; `);
                this.element.classList.add(CLASS_FOCUS);
                document.body.style.height = "";
                this.y = 0;
                this.frozen = false;
                this.unfreezing = false;
                unfreezeDelay = undefined;
            }
        }
        freeze() {
            if (!this.frozen) {
                this.y = window.scrollY + 0;
                this.element.setAttribute("style", `position: fixed; top: -${this.y}px; z-index: ${this.element.style.zIndex}; `);
                this.element.classList.remove(CLASS_FOCUS);
                this.frozen = true;
            }
        }
    }
    ScrollSwitch.Scrollable = Scrollable;
    const store = {};
    let lastId = 1;
    function newScrollableId() {
        lastId = lastId + 1;
        return lastId.toString();
    }
    function identifyElement(element) {
        if (element.parentElement !== document.body) {
            return null;
        }
        let id = element.getAttribute(DATA_SCROLLABLE);
        const stored = (id !== undefined) ? (store[id] !== undefined) : false;
        if (stored) {
            return store[id];
        }
        else {
            const s = new Scrollable(element);
            id = s.getId();
            store[id] = s;
            return store[id];
        }
    }
    function freezeElement(element) {
        const scroll = identifyElement(element);
        if (scroll !== null) {
            scroll.freeze();
        }
    }
    ScrollSwitch.freezeElement = freezeElement;
    function freezeAllButId(id = null) {
        for (const i in store) {
            if (i !== id) {
                store[i].freeze();
            }
        }
    }
    ScrollSwitch.freezeAllButId = freezeAllButId;
    function freezeAllButElement(element) {
        const scroll = identifyElement(element);
        if (scroll !== null) {
            freezeAllButId(scroll.getId());
        }
    }
    ScrollSwitch.freezeAllButElement = freezeAllButElement;
    function unfreezeElement(element) {
        const scroll = identifyElement(element);
        if (scroll !== null) {
            scroll.unfreeze();
        }
    }
    ScrollSwitch.unfreezeElement = unfreezeElement;
})(ScrollSwitch || (ScrollSwitch = {}));
/* harmony default export */ __webpack_exports__["default"] = (ScrollSwitch);
//# sourceMappingURL=scroll-switch.js.map

/***/ }),

/***/ "./node_modules/utility-collection/lib/string.js":
/*!*******************************************************!*\
  !*** ./node_modules/utility-collection/lib/string.js ***!
  \*******************************************************/
/*! exports provided: String, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "String", function() { return String; });
var String;
(function (String) {
    function replaceAll(value, search, replacement) {
        return value.split(search).join(replacement);
    }
    String.replaceAll = replaceAll;
    function pathArray(path) {
        return path.split(".");
    }
    String.pathArray = pathArray;
    function stripNonNumber(value) {
        return value.replace(/[^0-9]/g, "");
    }
    String.stripNonNumber = stripNonNumber;
})(String || (String = {}));
/* harmony default export */ __webpack_exports__["default"] = (String);
//# sourceMappingURL=string.js.map

/***/ }),

/***/ "./node_modules/utility-collection/lib/url.js":
/*!****************************************************!*\
  !*** ./node_modules/utility-collection/lib/url.js ***!
  \****************************************************/
/*! exports provided: Url, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Url", function() { return Url; });
class Url {
    // -------------------
    constructor(url) {
        this.QueryList = {};
        this.staticPath = url.split("#")[0].split("?")[0];
        this.staticQuery = url.indexOf("?") > -1 ? url.split("?")[1].split("#")[0] : null;
        this.staticHash = url.split("#")[1] || null;
        // queryList
        if (this.staticQuery != null) {
            const queryKeyValueList = this.staticQuery.split("&");
            queryKeyValueList.forEach((queryKeyValue) => {
                const keyValue = queryKeyValue.split("=");
                const key = keyValue[0];
                const value = keyValue[1];
                this.QueryList[key] = value;
            });
        }
    }
    setQuery(key, value) {
        this.QueryList[key] = value;
        return this;
    }
    setQueries(values) {
        for (const key in values) {
            if (typeof values[key] !== "function" && values[key] !== undefined) {
                this.QueryList[key] = values[key].toString();
            }
        }
        return this;
    }
    deleteQuery(key) {
        this.QueryList[key] = undefined;
        delete this.QueryList[key];
        return this;
    }
    getQuery(key) {
        return this.QueryList[key];
    }
    toString() {
        let queryLength = Object.keys(this.QueryList).length;
        let query = (Object.keys(this.QueryList).length > 0 ? "?" : "");
        for (const key in this.QueryList) {
            if (this.QueryList.hasOwnProperty(key)) {
                queryLength--;
                const value = this.QueryList[key];
                query = query + key + "=" + value;
                if (queryLength > 0) {
                    query = query + "&";
                }
            }
        }
        return this.staticPath + query + (this.staticHash ? this.staticHash : "");
    }
}
// export namespace Url {
// 	//
// }
/* harmony default export */ __webpack_exports__["default"] = (Url);
//# sourceMappingURL=url.js.map

/***/ }),

/***/ "./node_modules/webpack/buildin/global.js":
/*!***********************************!*\
  !*** (webpack)/buildin/global.js ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1, eval)("this");
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/*! exports provided: MotherMask, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MotherMask", function() { return MotherMask; });
/* harmony import */ var _simple__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./simple */ "./src/simple.ts");

var MotherMask;
(function (MotherMask) {
    function process(value, pattern) {
        return _simple__WEBPACK_IMPORTED_MODULE_0__["default"].process(value, pattern);
    }
    MotherMask.process = process;
    function bind(input, pattern, callback = null) {
        _simple__WEBPACK_IMPORTED_MODULE_0__["default"].bind(input, pattern, callback);
    }
    MotherMask.bind = bind;
})(MotherMask || (MotherMask = {}));
if (window !== undefined) {
    window.MotherMask = MotherMask;
}
/* harmony default export */ __webpack_exports__["default"] = (MotherMask);


/***/ }),

/***/ "./src/simple.ts":
/*!***********************!*\
  !*** ./src/simple.ts ***!
  \***********************/
/*! exports provided: Simple, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* WEBPACK VAR INJECTION */(function(setImmediate) {/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Simple", function() { return Simple; });
/* harmony import */ var utility_collection__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! utility-collection */ "./node_modules/utility-collection/lib/main.js");
/* harmony import */ var setimmediate__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! setimmediate */ "./node_modules/setimmediate/setImmediate.js");
/* harmony import */ var setimmediate__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(setimmediate__WEBPACK_IMPORTED_MODULE_1__);
// made by Danilo Celestino de Castro (dan2dev)


var Simple;
(function (Simple) {
    let CharType;
    (function (CharType) {
        CharType[CharType["NUMBER"] = 0] = "NUMBER";
        CharType[CharType["LETTER"] = 1] = "LETTER";
    })(CharType = Simple.CharType || (Simple.CharType = {}));
    // -----------
    class Mask {
        // -----------------------
        constructor(value, mask, caret = 0) {
            this.caret = 0;
            this.maskChar = {
                position: -1,
                char: null,
            };
            this.valueChar = {
                position: -1,
                char: null,
            };
            this.value = value;
            this.mask = mask;
            this.caret = caret;
        }
        process() {
            if (utility_collection__WEBPACK_IMPORTED_MODULE_0__["Is"].empty(this.value)) {
                return "";
            }
            let output = "";
            const oldCaret = this.caret;
            const shadowLatestIMaskChars = [];
            while (this.nextIMaskChar()) {
                if (typeof this.maskChar.char === "string") {
                    shadowLatestIMaskChars.push(this.maskChar.char);
                }
                else {
                    if (this.nextIValueChar(this.maskChar.char) && !utility_collection__WEBPACK_IMPORTED_MODULE_0__["Is"].empty(this.valueChar.char)) {
                        while (shadowLatestIMaskChars.length > 0) {
                            if (this.maskChar.position <= this.caret + 1 &&
                                this.maskChar.position >= this.caret) {
                                this.caret++;
                            }
                            output += shadowLatestIMaskChars.shift();
                        }
                        output += this.valueChar.char;
                    }
                }
            }
            return output;
        }
        nextIMaskChar() {
            this.maskChar.position++;
            if (this.maskChar.position > this.mask.length) {
                return false;
            }
            else {
                // what to return
                this.maskChar.char = this.mask.charAt(this.maskChar.position);
                if (this.maskChar.char === "9") {
                    this.maskChar.char = Simple.CharType.NUMBER;
                }
                else if (this.maskChar.char === "Z") {
                    this.maskChar.char = Simple.CharType.LETTER;
                }
                return true;
            }
        }
        // value
        nextIValueChar(type) {
            this.valueChar.position++;
            if (this.valueChar.position > this.value.length) {
                return false;
            }
            else {
                this.valueChar.char = this.value.charAt(this.valueChar.position);
                if (type === Simple.CharType.NUMBER) {
                    if (utility_collection__WEBPACK_IMPORTED_MODULE_0__["Is"].number(this.valueChar.char)) {
                        return true;
                    }
                }
                else if (type === Simple.CharType.LETTER) {
                    if (utility_collection__WEBPACK_IMPORTED_MODULE_0__["Is"].letter(this.valueChar.char)) {
                        return true;
                    }
                }
                return this.nextIValueChar(type);
            }
        }
    }
    Simple.Mask = Mask;
    function process(value, mask) {
        const m = maskBuilder(value, mask);
        return m.process();
    }
    Simple.process = process;
    function getMaskString(value, mask) {
        if (Array.isArray(mask)) {
            let i = 0;
            while (value.length > mask[i].length && i < mask.length) {
                i++;
            }
            return mask[i];
        }
        else {
            return mask;
        }
    }
    function getMaxLength(mask) {
        let maxLength = 0;
        if (Array.isArray(mask)) {
            mask.forEach((m) => {
                if (maxLength < m.length) {
                    maxLength = m.length;
                }
            });
        }
        else {
            maxLength = mask.length;
        }
        return maxLength;
    }
    function maskBuilder(value, mask, caret = 0) {
        return new Mask(value, getMaskString(value, mask), caret);
    }
    Simple.maskBuilder = maskBuilder;
    function bind(inputElement, mask, callback = null) {
        inputElement.setAttribute("maxlength", getMaxLength(mask).toString());
        inputElement.addEventListener("paste", (e) => {
            const target = e.target;
            const oldValue = target.value.toString();
            setImmediate(() => {
                // target.value = process(target.value, mask);
                const m = maskBuilder(target.value, mask);
                target.value = m.process();
                if (callback != null) {
                    callback(target.value);
                }
            });
        });
        inputElement.addEventListener("keypress", (e) => {
            if (e.target.value.length >= getMaxLength(mask)) {
                e.preventDefault();
            }
        });
        inputElement.addEventListener("keydown", (e) => {
            const target = e.target;
            const oldValue = target.value.toString();
            // chars -------------------
            const isBackspace = ("Backspace" === e.key || e.keyCode === 8);
            const isDelete = ("Delete" === e.key);
            const isCharInsert = (e.key.length === 1 && !e.ctrlKey && !e.altKey);
            const isUnidentified = (e.key === "Unidentified");
            // don't allow to insert more if it's full
            // if (isCharInsert && target.selectionStart === target.selectionEnd) {
            // 	if (oldValue.length >= getMaxLength(mask) ) {
            // 		e.preventDefault();
            // 	}
            // }
            setImmediate(() => {
                const selStartAfter = target.selectionStart;
                // const m =  new Mask(target.value, mask, selStartAfter);
                const m = maskBuilder(target.value, mask, selStartAfter);
                target.value = m.process();
                // fix caret position
                if (isUnidentified) {
                    if (target.value.length > oldValue.length) {
                        target.setSelectionRange(m.caret, m.caret);
                    }
                    else {
                        target.setSelectionRange(selStartAfter, selStartAfter);
                    }
                }
                else {
                    if (isDelete) {
                        if (oldValue.length === target.value.length) {
                            target.setSelectionRange(selStartAfter + 1, selStartAfter + 1);
                        }
                        else {
                            target.setSelectionRange(selStartAfter, selStartAfter);
                        }
                    }
                    if (isBackspace) {
                        target.setSelectionRange(selStartAfter, selStartAfter);
                    }
                    if (isCharInsert) {
                        target.setSelectionRange(m.caret, m.caret);
                    }
                }
                if (callback != null) {
                    callback(target.value);
                }
            });
        });
    }
    Simple.bind = bind;
})(Simple || (Simple = {}));
/* harmony default export */ __webpack_exports__["default"] = (Simple);

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../node_modules/timers-browserify/main.js */ "./node_modules/timers-browserify/main.js").setImmediate))

/***/ })

/******/ });
//# sourceMappingURL=mother-mask.js.map