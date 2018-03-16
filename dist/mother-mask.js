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

/***/ "../utility-collection/lib/dom.js":
/*!****************************************!*\
  !*** ../utility-collection/lib/dom.js ***!
  \****************************************/
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


/***/ }),

/***/ "../utility-collection/lib/event.js":
/*!******************************************!*\
  !*** ../utility-collection/lib/event.js ***!
  \******************************************/
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


/***/ }),

/***/ "../utility-collection/lib/is.js":
/*!***************************************!*\
  !*** ../utility-collection/lib/is.js ***!
  \***************************************/
/*! exports provided: Is, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Is", function() { return Is; });
/* harmony import */ var _string__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./string */ "../utility-collection/lib/string.js");
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


/***/ }),

/***/ "../utility-collection/lib/list.js":
/*!*****************************************!*\
  !*** ../utility-collection/lib/list.js ***!
  \*****************************************/
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


/***/ }),

/***/ "../utility-collection/lib/main.js":
/*!*****************************************!*\
  !*** ../utility-collection/lib/main.js ***!
  \*****************************************/
/*! exports provided: UtilityCollection, default, Dom, Is, String, Reflection, Url, List, DATA_SCROLLABLE, CLASS_FOCUS, ScrollSwitch, Event */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "UtilityCollection", function() { return UtilityCollection; });
/* harmony import */ var _dom__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./dom */ "../utility-collection/lib/dom.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Dom", function() { return _dom__WEBPACK_IMPORTED_MODULE_0__["Dom"]; });

/* harmony import */ var _is__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./is */ "../utility-collection/lib/is.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Is", function() { return _is__WEBPACK_IMPORTED_MODULE_1__["Is"]; });

/* harmony import */ var _string__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./string */ "../utility-collection/lib/string.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "String", function() { return _string__WEBPACK_IMPORTED_MODULE_2__["String"]; });

/* harmony import */ var _reflection__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./reflection */ "../utility-collection/lib/reflection.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Reflection", function() { return _reflection__WEBPACK_IMPORTED_MODULE_3__["Reflection"]; });

/* harmony import */ var _url__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./url */ "../utility-collection/lib/url.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Url", function() { return _url__WEBPACK_IMPORTED_MODULE_4__["Url"]; });

/* harmony import */ var _list__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./list */ "../utility-collection/lib/list.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "List", function() { return _list__WEBPACK_IMPORTED_MODULE_5__["List"]; });

/* harmony import */ var _scroll_switch__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./scroll-switch */ "../utility-collection/lib/scroll-switch.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "DATA_SCROLLABLE", function() { return _scroll_switch__WEBPACK_IMPORTED_MODULE_6__["DATA_SCROLLABLE"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "CLASS_FOCUS", function() { return _scroll_switch__WEBPACK_IMPORTED_MODULE_6__["CLASS_FOCUS"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "ScrollSwitch", function() { return _scroll_switch__WEBPACK_IMPORTED_MODULE_6__["ScrollSwitch"]; });

/* harmony import */ var _event__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./event */ "../utility-collection/lib/event.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Event", function() { return _event__WEBPACK_IMPORTED_MODULE_7__["Event"]; });









var UtilityCollection;
(function (UtilityCollection) {
    const name = "UtilityCollection";
})(UtilityCollection || (UtilityCollection = {}));
/* harmony default export */ __webpack_exports__["default"] = (UtilityCollection);


/***/ }),

/***/ "../utility-collection/lib/reflection.js":
/*!***********************************************!*\
  !*** ../utility-collection/lib/reflection.js ***!
  \***********************************************/
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


/***/ }),

/***/ "../utility-collection/lib/scroll-switch.js":
/*!**************************************************!*\
  !*** ../utility-collection/lib/scroll-switch.js ***!
  \**************************************************/
/*! exports provided: DATA_SCROLLABLE, CLASS_FOCUS, ScrollSwitch, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DATA_SCROLLABLE", function() { return DATA_SCROLLABLE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CLASS_FOCUS", function() { return CLASS_FOCUS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ScrollSwitch", function() { return ScrollSwitch; });
/* harmony import */ var _event__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./event */ "../utility-collection/lib/event.js");

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


/***/ }),

/***/ "../utility-collection/lib/string.js":
/*!*******************************************!*\
  !*** ../utility-collection/lib/string.js ***!
  \*******************************************/
/*! exports provided: String, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "String", function() { return String; });
/* harmony import */ var _is__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./is */ "../utility-collection/lib/is.js");

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
    // -----------------
    const accents = "ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž";
    const accentsOut = "AAAAAAaaaaaaOOOOOOOooooooEEEEeeeeeCcDIIIIiiiiUUUUuuuuNnSsYyyZz";
    function removeAccents(value) {
        if (_is__WEBPACK_IMPORTED_MODULE_0__["Is"].empty(value)) {
            return value;
        }
        const strAccents = value.split("");
        const strAccentsOut = new Array();
        const strAccentsLen = strAccents.length;
        for (let y = 0; y < strAccentsLen; y++) {
            if (accents.indexOf(strAccents[y]) !== -1) {
                strAccentsOut[y] = accentsOut.substr(accents.indexOf(strAccents[y]), 1);
            }
            else {
                strAccentsOut[y] = strAccents[y];
            }
        }
        return strAccentsOut.join("");
    }
    String.removeAccents = removeAccents;
})(String || (String = {}));
/* harmony default export */ __webpack_exports__["default"] = (String);


/***/ }),

/***/ "../utility-collection/lib/url.js":
/*!****************************************!*\
  !*** ../utility-collection/lib/url.js ***!
  \****************************************/
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


/***/ }),

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
/* harmony import */ var utility_collection__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! utility-collection */ "../utility-collection/lib/main.js");
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
        const instance = new Mask(value, mask);
        return instance.process();
    }
    Simple.process = process;
    function bind(inputElement, mask, callback = null) {
        inputElement.addEventListener("paste", (e) => {
            const target = e.target;
            const oldValue = target.value.toString();
            requestAnimationFrame(() => {
                const m = new Mask(target.value, mask);
                target.value = m.process();
                if (callback != null) {
                    callback(target.value);
                }
            });
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
            if (isCharInsert && target.selectionStart === target.selectionEnd) {
                if (oldValue.length >= mask.length) {
                    e.preventDefault();
                }
            }
            setImmediate(() => {
                const selStartAfter = target.selectionStart;
                const m = new Mask(target.value, mask, selStartAfter);
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
// How to --------------------------
// Simple.process("01215344139", "999.999.999-99");
// var element = document.getElementById("mask1") as HTMLInputElement;
// Simple.bind(element, "999.999.999-99");
/* harmony default export */ __webpack_exports__["default"] = (Simple);

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../node_modules/timers-browserify/main.js */ "./node_modules/timers-browserify/main.js").setImmediate))

/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4uL3V0aWxpdHktY29sbGVjdGlvbi9zcmMvZG9tLnRzIiwid2VicGFjazovLy8uLi91dGlsaXR5LWNvbGxlY3Rpb24vc3JjL2V2ZW50LnRzIiwid2VicGFjazovLy8uLi91dGlsaXR5LWNvbGxlY3Rpb24vc3JjL2lzLnRzIiwid2VicGFjazovLy8uLi91dGlsaXR5LWNvbGxlY3Rpb24vc3JjL2xpc3QudHMiLCJ3ZWJwYWNrOi8vLy4uL3V0aWxpdHktY29sbGVjdGlvbi9zcmMvbWFpbi50cyIsIndlYnBhY2s6Ly8vLi4vdXRpbGl0eS1jb2xsZWN0aW9uL3NyYy9yZWZsZWN0aW9uLnRzIiwid2VicGFjazovLy8uLi91dGlsaXR5LWNvbGxlY3Rpb24vc3JjL3Njcm9sbC1zd2l0Y2gudHMiLCJ3ZWJwYWNrOi8vLy4uL3V0aWxpdHktY29sbGVjdGlvbi9zcmMvc3RyaW5nLnRzIiwid2VicGFjazovLy8uLi91dGlsaXR5LWNvbGxlY3Rpb24vc3JjL3VybC50cyIsIndlYnBhY2s6Ly8vLi9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwid2VicGFjazovLy8uL25vZGVfbW9kdWxlcy9zZXRpbW1lZGlhdGUvc2V0SW1tZWRpYXRlLmpzIiwid2VicGFjazovLy8uL25vZGVfbW9kdWxlcy90aW1lcnMtYnJvd3NlcmlmeS9tYWluLmpzIiwid2VicGFjazovLy8od2VicGFjaykvYnVpbGRpbi9nbG9iYWwuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21haW4udHMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3NpbXBsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7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QUNkLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzRCQUM3QyxNQUFNLENBQUMsaUJBQWlCLENBQUMsYUFBYSxHQUFHLENBQUMsRUFBRSxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQ2hFLENBQUM7d0JBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ1AsTUFBTSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQzt3QkFDeEQsQ0FBQztvQkFDRixDQUFDO29CQUNELEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7d0JBQ2pCLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7b0JBQ3hELENBQUM7b0JBQ0QsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQzt3QkFDbEIsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUM1QyxDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsRUFBRSxDQUFDLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ3RCLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3hCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQTFEZSxXQUFJLE9BMERuQjtBQUNGLENBQUMsRUE1SmdCLE1BQU0sS0FBTixNQUFNLFFBNEp0QjtBQUVELG9DQUFvQztBQUNwQyxtREFBbUQ7QUFDbkQsc0VBQXNFO0FBQ3RFLDBDQUEwQztBQUUxQywrREFBZSxNQUFNLEVBQUMiLCJmaWxlIjoibW90aGVyLW1hc2suanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yID0gZnVuY3Rpb24oZXhwb3J0cykge1xuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IFwiLi9zcmMvbWFpbi50c1wiKTtcbiIsImV4cG9ydCBuYW1lc3BhY2UgRG9tIHtcclxuXHRleHBvcnQgZnVuY3Rpb24gaW5zZXJ0QmVmb3JlKGVsZW1lbnQ6IE5vZGUsIHRhcmdldEVsZW1lbnQ6IE5vZGUpOiB2b2lkIHtcclxuXHRcdHRhcmdldEVsZW1lbnQucGFyZW50RWxlbWVudC5pbnNlcnRCZWZvcmUoZWxlbWVudCwgdGFyZ2V0RWxlbWVudCk7XHJcblx0fVxyXG5cdGV4cG9ydCBmdW5jdGlvbiBpbnNlcnRBZnRlcihlbGVtZW50OiBOb2RlLCB0YXJnZXRFbGVtZW50OiBOb2RlKTogdm9pZCB7XHJcblx0XHRjb25zdCBwYXJlbnQgPSB0YXJnZXRFbGVtZW50LnBhcmVudE5vZGU7XHJcblx0XHRpZiAocGFyZW50Lmxhc3RDaGlsZCA9PT0gdGFyZ2V0RWxlbWVudCkge1xyXG5cdFx0XHRwYXJlbnQuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRwYXJlbnQuaW5zZXJ0QmVmb3JlKGVsZW1lbnQsIHRhcmdldEVsZW1lbnQubmV4dFNpYmxpbmcpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRleHBvcnQgZnVuY3Rpb24gcmVtb3ZlKGVsZW1lbnQ6IE5vZGUpOiB2b2lkIHtcclxuXHRcdGlmIChlbGVtZW50LnBhcmVudEVsZW1lbnQgIT09IG51bGwpIHtcclxuXHRcdFx0ZWxlbWVudC5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGVsZW1lbnQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRleHBvcnQgZnVuY3Rpb24gaHRtbFRvTm9kZShodG1sOiBzdHJpbmcgfCBFbGVtZW50KTogTm9kZSB7XHJcblx0XHRpZiAoaHRtbCBpbnN0YW5jZW9mIE5vZGUpIHtcclxuXHRcdFx0cmV0dXJuIGh0bWw7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zdCBub2RlOiBIVE1MRGl2RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcblx0XHRcdG5vZGUuaW5uZXJIVE1MID0gaHRtbDtcclxuXHRcdFx0cmV0dXJuIG5vZGUuZmlyc3RFbGVtZW50Q2hpbGQ7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRleHBvcnQgZnVuY3Rpb24gaHRtbFRvRWxlbWVudChodG1sOiBzdHJpbmcgfCBFbGVtZW50KTogSFRNTEVsZW1lbnQge1xyXG5cdFx0cmV0dXJuIGh0bWxUb05vZGUoaHRtbCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0fVxyXG5cdC8vIGF0cmlidXRlcyAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0ZXhwb3J0IGZ1bmN0aW9uIGdldEF0dHJpYnV0ZXMoZWxlbWVudDogRWxlbWVudCB8IE5vZGUpOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZzsgfSB7XHJcblx0XHRjb25zdCBhdHRycyA9IGVsZW1lbnQuYXR0cmlidXRlcztcclxuXHRcdGNvbnN0IG5ld0F0dHI6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nOyB9ID0ge307XHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGF0dHJzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdG5ld0F0dHJbYXR0cnNbaV0ubmFtZV0gPSBhdHRyc1tpXS52YWx1ZTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBuZXdBdHRyO1xyXG5cdH1cclxuXHJcblx0Ly8gTG9vcHMgZSBnaXJvcyBwZWxvIGRvbSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdGV4cG9ydCBmdW5jdGlvbiBjaGlsZEVsZW1lbnQobm9kZTogRWxlbWVudCwgZWFjaDogKG5vZGU6IEVsZW1lbnQpID0+IHZvaWQpOiB2b2lkIHtcclxuXHRcdGxldCBjaGlsZDogTm9kZSA9IG5vZGUuZmlyc3RDaGlsZDtcclxuXHRcdHdoaWxlIChjaGlsZCkge1xyXG5cdFx0XHRpZiAoY2hpbGQubm9kZVR5cGUgPT09IDEpIHtcclxuXHRcdFx0XHRlYWNoKGNoaWxkIGFzIEVsZW1lbnQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNoaWxkID0gY2hpbGQubmV4dFNpYmxpbmc7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBlbGVtZW50IGRvd24gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRleHBvcnQgZnVuY3Rpb24gbm9kZURvd24obm9kZTogTm9kZSB8IE5vZGUsIGVhY2g6IChub2RlOiBOb2RlIHwgTm9kZSwgcGFyZW50PzogTm9kZSB8IE5vZGUpID0+IHZvaWQgfCBib29sZWFuKTogdm9pZCB7XHJcblx0XHRpZiAoZWFjaChub2RlLCB1bmRlZmluZWQpICE9PSBmYWxzZSkge1xyXG5cdFx0XHR0aGlzLmNoaWxkTm9kZURvd24obm9kZSwgZWFjaCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRleHBvcnQgZnVuY3Rpb24gY2hpbGROb2RlRG93bihub2RlOiBOb2RlLCBlYWNoOiAobm9kZTogTm9kZSwgcGFyZW50PzogTm9kZSkgPT4gdm9pZCB8IGJvb2xlYW4pOiB2b2lkIHtcclxuXHRcdGNvbnN0IHBhcmVudDogTm9kZSA9IG5vZGU7XHJcblx0XHRsZXQgY2hpbGQ6IE5vZGUgPSBub2RlLmZpcnN0Q2hpbGQ7XHJcblx0XHR3aGlsZSAoY2hpbGQpIHtcclxuXHRcdFx0Y29uc3QgZWFjaFJldHVybjogYm9vbGVhbiB8IHZvaWQgPSBlYWNoKGNoaWxkLCBwYXJlbnQpO1xyXG5cdFx0XHRpZiAoZWFjaFJldHVybiAhPT0gZmFsc2UpIHtcclxuXHRcdFx0XHR0aGlzLmNoaWxkTm9kZURvd24oY2hpbGQsIGVhY2gpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNoaWxkID0gY2hpbGQubmV4dFNpYmxpbmc7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRleHBvcnQgZnVuY3Rpb24gZWxlbWVudERvd24obm9kZTogRWxlbWVudCwgZWFjaDogKG5vZGU6IEVsZW1lbnQsIHBhcmVudD86IEVsZW1lbnQpID0+IHZvaWQgfCBib29sZWFuKTogdm9pZCB7XHJcblx0XHRpZiAoZWFjaChub2RlLCB1bmRlZmluZWQpICE9PSBmYWxzZSkge1xyXG5cdFx0XHR0aGlzLmNoaWxkRWxlbWVudERvd24obm9kZSwgZWFjaCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRleHBvcnQgZnVuY3Rpb24gY2hpbGRFbGVtZW50RG93bihub2RlOiBFbGVtZW50LCBlYWNoOiAobm9kZTogSFRNTEVsZW1lbnQsIHBhcmVudD86IEhUTUxFbGVtZW50KSA9PiB2b2lkIHwgYm9vbGVhbik6IHZvaWQge1xyXG5cdFx0Y29uc3QgcGFyZW50OiBFbGVtZW50ID0gbm9kZTtcclxuXHRcdGxldCBjaGlsZDogTm9kZSA9IG5vZGUuZmlyc3RDaGlsZDtcclxuXHRcdHdoaWxlIChjaGlsZCkge1xyXG5cdFx0XHRpZiAoY2hpbGQubm9kZVR5cGUgPT09IDEpIHtcclxuXHRcdFx0XHRjb25zdCBlYWNoUmV0dXJuOiBib29sZWFuIHwgdm9pZCA9IGVhY2goY2hpbGQgYXMgSFRNTEVsZW1lbnQsIHBhcmVudCBhcyBIVE1MRWxlbWVudCk7XHJcblx0XHRcdFx0aWYgKGVhY2hSZXR1cm4gIT09IGZhbHNlKSB7XHJcblx0XHRcdFx0XHR0aGlzLmNoaWxkRWxlbWVudERvd24oY2hpbGQgYXMgSFRNTEVsZW1lbnQsIGVhY2gpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRjaGlsZCA9IGNoaWxkLm5leHRTaWJsaW5nO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gZWxlbWVudCB1cCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdGV4cG9ydCBmdW5jdGlvbiBlbGVtZW50VXAobm9kZTogRWxlbWVudCB8IEhUTUxFbGVtZW50LCBlYWNoOiAobm9kZTogRWxlbWVudCB8IEhUTUxFbGVtZW50KSA9PiBib29sZWFuIHwgdm9pZCk6IHZvaWQge1xyXG5cdFx0aWYgKGVhY2gobm9kZSkgIT09IGZhbHNlKSB7XHJcblx0XHRcdHBhcmVudEVsZW1lbnRVcChub2RlLCBlYWNoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGV4cG9ydCBmdW5jdGlvbiBwYXJlbnRFbGVtZW50VXAobm9kZTogRWxlbWVudCB8IEhUTUxFbGVtZW50IHwgTm9kZSwgZWFjaDogKG5vZGU6IEVsZW1lbnQgfCBIVE1MRWxlbWVudCB8IE5vZGUpID0+IGJvb2xlYW4gfCB2b2lkKTogdm9pZCB7XHJcblx0XHRsZXQgcmV0b3JubzogYm9vbGVhbiB8IHZvaWQgPSB0cnVlO1xyXG5cdFx0bGV0IGN1cnJlbnQ6IEVsZW1lbnQgfCBOb2RlID0gKG5vZGUgYXMgTm9kZSkucGFyZW50Tm9kZTtcclxuXHRcdGRvIHtcclxuXHRcdFx0cmV0b3JubyA9IGVhY2goY3VycmVudCk7XHJcblx0XHRcdGN1cnJlbnQgPSAoY3VycmVudCBhcyBOb2RlKS5wYXJlbnROb2RlO1xyXG5cdFx0fSB3aGlsZSAocmV0b3JubyAhPT0gZmFsc2UgJiYgY3VycmVudCAhPT0gbnVsbCAmJiBjdXJyZW50ICE9PSB1bmRlZmluZWQgJiYgbm9kZS5ub2RlTmFtZSAhPT0gXCJCT0RZXCIpO1xyXG5cdH1cclxuXHJcblx0Ly8gZG9tIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0ZXhwb3J0IGZ1bmN0aW9uIGF0dHJpYnV0ZShlbGVtZW50OiBFbGVtZW50IHwgSFRNTEVsZW1lbnQgfCBOb2RlLCBlYWNoOiAoa2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpID0+IHZvaWQpOiB2b2lkIHtcclxuXHRcdC8vIFRPRE86IHRoaXMgc3RpbGwgbmVlZCB0byBiZSB0ZXN0ZWRcclxuXHRcdGNvbnN0IGF0dHJpYnV0ZXMgPSBlbGVtZW50LmF0dHJpYnV0ZXM7XHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0ZWFjaChhdHRyaWJ1dGVzW2ldLm5hbWUsIGF0dHJpYnV0ZXNbaV0udmFsdWUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZXhwb3J0IGZ1bmN0aW9uIGZpbmROZXh0U2libGluZyh0YXJnZXQ6IE5vZGUgfCBOb2RlLCB2YWxpZGF0aW9uOiAobm9kZTogTm9kZSB8IE5vZGUpID0+IGJvb2xlYW4gfCB2b2lkKTogTm9kZSB8IE5vZGUge1xyXG5cdFx0bGV0IGN1cnJlbnQ6IE5vZGUgfCBOb2RlID0gdGFyZ2V0Lm5leHRTaWJsaW5nO1xyXG5cdFx0d2hpbGUgKGN1cnJlbnQgIT09IG51bGwpIHtcclxuXHRcdFx0aWYgKHZhbGlkYXRpb24oY3VycmVudCkgPT09IHRydWUpIHtcclxuXHRcdFx0XHRyZXR1cm4gY3VycmVudDtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjdXJyZW50ID0gY3VycmVudC5uZXh0U2libGluZztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHRleHBvcnQgZnVuY3Rpb24gZmluZFByZXZTaWJsaW5nKHRhcmdldDogTm9kZSB8IE5vZGUsIHZhbGlkYXRpb246IChub2RlOiBOb2RlIHwgTm9kZSkgPT4gYm9vbGVhbiB8IHZvaWQpOiBOb2RlIHwgTm9kZSB7XHJcblx0XHRsZXQgY3VycmVudDogTm9kZSB8IE5vZGUgPSB0YXJnZXQucHJldmlvdXNTaWJsaW5nO1xyXG5cdFx0d2hpbGUgKGN1cnJlbnQgIT09IG51bGwpIHtcclxuXHRcdFx0aWYgKHZhbGlkYXRpb24oY3VycmVudCkgPT09IHRydWUpIHtcclxuXHRcdFx0XHRyZXR1cm4gY3VycmVudDtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjdXJyZW50ID0gY3VycmVudC5wcmV2aW91c1NpYmxpbmc7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0ZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxTaWJsaW5ncyh0YXJnZXQ6IE5vZGUpOiBOb2RlW10ge1xyXG5cdFx0Y29uc3Qgc2libGluZ3M6IE5vZGVbXSA9IFtdO1xyXG5cdFx0ZmluZFByZXZTaWJsaW5nKHRhcmdldCwgKG5vZGUpID0+IHtcclxuXHRcdFx0c2libGluZ3MucHVzaChub2RlKTtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fSk7XHJcblx0XHRmaW5kTmV4dFNpYmxpbmcodGFyZ2V0LCAobm9kZSkgPT4ge1xyXG5cdFx0XHRzaWJsaW5ncy5wdXNoKG5vZGUpO1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9KTtcclxuXHRcdHJldHVybiBzaWJsaW5ncztcclxuXHR9XHJcblxyXG5cdGV4cG9ydCBmdW5jdGlvbiBwcmVwZW5kQ2hpbGQocGFyZW50OiBIVE1MRWxlbWVudCwgY2hpbGQ6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRjb25zdCBmaXJzdENoaWxkOiBOb2RlID0gcGFyZW50LmZpcnN0Q2hpbGQ7XHJcblx0XHRpZiAoZmlyc3RDaGlsZCA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHBhcmVudC5hcHBlbmRDaGlsZChjaGlsZCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRwYXJlbnQuaW5zZXJ0QmVmb3JlPEhUTUxFbGVtZW50PihjaGlsZCwgZmlyc3RDaGlsZCk7XHJcblx0XHR9XHJcblx0fVxyXG5cdGV4cG9ydCBmdW5jdGlvbiBhcHBlbmRDaGlsZChwYXJlbnQ6IEhUTUxFbGVtZW50LCBjaGlsZDogSFRNTEVsZW1lbnQpIHtcclxuXHRcdHBhcmVudC5hcHBlbmRDaGlsZChjaGlsZCk7XHJcblx0fVxyXG5cclxuXHRleHBvcnQgZnVuY3Rpb24gcmVwbGFjZUVsZW1lbnQob2xkRWxlbWVudDogSFRNTEVsZW1lbnQsIG5ld0VsZW1lbnQ6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRvbGRFbGVtZW50LnBhcmVudEVsZW1lbnQucmVwbGFjZUNoaWxkKG5ld0VsZW1lbnQsIG9sZEVsZW1lbnQpO1xyXG5cdH1cclxuXHJcblx0ZXhwb3J0IGZ1bmN0aW9uIHN3YXBOb2RlcyhuMTogSFRNTEVsZW1lbnQsIG4yOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0bGV0IGkxOiBhbnk7XHJcblx0XHRsZXQgaTI6IGFueTtcclxuXHRcdGxldCBwMSA9IG4xLnBhcmVudE5vZGUgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRsZXQgcDIgPSBuMi5wYXJlbnROb2RlIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0aWYgKHAxID09PSB1bmRlZmluZWQgfHwgcDEgPT09IG51bGwpIHtcclxuXHRcdFx0cDEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG5cdFx0XHRwMS5hcHBlbmRDaGlsZChuMSk7XHJcblx0XHR9XHJcblx0XHRpZiAocDIgPT09IHVuZGVmaW5lZCB8fCBwMiA9PT0gbnVsbCkge1xyXG5cdFx0XHRwMiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcblx0XHRcdHAyLmFwcGVuZENoaWxkKG4yKTtcclxuXHRcdH1cclxuXHRcdGlmICghcDEgfHwgIXAyIHx8IHAxLmlzRXF1YWxOb2RlKG4yKSB8fCBwMi5pc0VxdWFsTm9kZShuMSkpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0Zm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IHAxLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGlmIChwMS5jaGlsZHJlbltpXS5pc0VxdWFsTm9kZShuMSkpIHtcclxuXHRcdFx0XHRpMSA9IGk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgcDIuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0aWYgKHAyLmNoaWxkcmVuW2ldLmlzRXF1YWxOb2RlKG4yKSkge1xyXG5cdFx0XHRcdGkyID0gaTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChwMS5pc0VxdWFsTm9kZShwMikgJiYgaTEgPCBpMikge1xyXG5cdFx0XHRpMisrO1xyXG5cdFx0fVxyXG5cdFx0cDEuaW5zZXJ0QmVmb3JlKG4yLCBwMS5jaGlsZHJlbltpMV0pO1xyXG5cdFx0cDIuaW5zZXJ0QmVmb3JlKG4xLCBwMi5jaGlsZHJlbltpMl0pO1xyXG5cdH1cclxuXHJcbn1cclxuZXhwb3J0IGRlZmF1bHQgRG9tO1xyXG4iLCJleHBvcnQgbmFtZXNwYWNlIEV2ZW50IHtcclxuXHRleHBvcnQgZnVuY3Rpb24gb25jZSh0YXJnZXQ6IE5vZGUsIHR5cGU6IHN0cmluZywgbGlzdGVuZXI6IChldmVudDogRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCkgPT4gdm9pZCkge1xyXG5cdFx0Y29uc3QgZm4gPSAoZXY6IGFueSkgPT4ge1xyXG5cdFx0XHR0YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBmbik7XHJcblx0XHRcdGxpc3RlbmVyKGV2KTtcclxuXHRcdH07XHJcblx0XHR0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBmbik7XHJcblx0fVxyXG5cdGV4cG9ydCBmdW5jdGlvbiBvbmNlT3V0c2lkZSh0YXJnZXQ6IE5vZGUsIHR5cGU6IHN0cmluZywgbGlzdGVuZXI6IChldmVudDogRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCkgPT4gdm9pZCkge1xyXG5cdFx0Y29uc3QgZm4gPSAoZXY6IGFueSkgPT4ge1xyXG5cdFx0XHRjb25zdCBpbnNpZGUgPSB0YXJnZXQuY29udGFpbnMoZXYudGFyZ2V0KTtcclxuXHRcdFx0aWYgKCFpbnNpZGUpIHtcclxuXHRcdFx0XHRsaXN0ZW5lcihldik7XHJcblx0XHRcdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBmbik7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGZuKTtcclxuXHR9XHJcblx0ZXhwb3J0IGZ1bmN0aW9uIGJpbmRPdXRzaWRlKHRhcmdldDogTm9kZSwgdHlwZTogc3RyaW5nLCBsaXN0ZW5lcjogKGV2ZW50OiBFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0KSA9PiB2b2lkKSB7XHJcblx0XHRjb25zdCBmbiA9IChldjogYW55KSA9PiB7XHJcblx0XHRcdGNvbnN0IGluc2lkZSA9IHRhcmdldC5jb250YWlucyhldi50YXJnZXQpO1xyXG5cdFx0XHRpZiAoIWluc2lkZSkge1xyXG5cdFx0XHRcdGxpc3RlbmVyKGV2KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZm4pO1xyXG5cdH1cclxuXHRleHBvcnQgZnVuY3Rpb24gYmluZCh0YXJnZXQ6IE5vZGUsIHR5cGU6IHN0cmluZywgbGlzdGVuZXI6IChldmVudDogRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCkgPT4gdm9pZCkge1xyXG5cdFx0Y29uc3QgZm4gPSAoZXY6IGFueSkgPT4ge1xyXG5cdFx0XHRsaXN0ZW5lcihldik7XHJcblx0XHR9O1xyXG5cdFx0dGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZm4pO1xyXG5cdH1cclxuXHQvLyBwYXNzaXZlIHN1cHBvcnRlZFxyXG5cdGNvbnN0IHBhc3NpdmVTdXBwb3J0ZWQgPSBmYWxzZTtcclxuXHRleHBvcnQgZnVuY3Rpb24gcGFzc2l2ZSgpOiBhbnkge1xyXG5cdFx0cmV0dXJuIChwYXNzaXZlU3VwcG9ydGVkID8geyBwYXNzaXZlOiB0cnVlIH0gOiBmYWxzZSk7XHJcblx0fVxyXG5cdChmdW5jdGlvbiBJbml0aWFsaXplKCkge1xyXG5cdFx0Ly8gZGV0ZWN0IGlmIHN1cG9ydCBwYXNzaXZlIGV2ZW50XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBvcHRpb25zID0gT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LCBcInBhc3NpdmVcIiwge1xyXG5cdFx0XHRcdGdldDogKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5wYXNzaXZlU3VwcG9ydGVkID0gdHJ1ZTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJ0ZXN0XCIsIG51bGwsIG9wdGlvbnMpO1xyXG5cdFx0fSBjYXRjaCAoZXJyKSB7XHJcblx0XHRcdC8vXHJcblx0XHR9XHJcblx0fSkoKTtcclxufVxyXG5leHBvcnQgZGVmYXVsdCBFdmVudDtcclxuIiwiLy8gaW1wb3J0IG1vbWVudCBmcm9tIFwibW9tZW50XCI7XHJcbmltcG9ydCBTdHJpbmcgZnJvbSBcIi4vc3RyaW5nXCI7XHJcblxyXG4vLyBjb25zb2xlLmxvZyhcIi0tPiBva1wiKTtcclxuXHJcbmV4cG9ydCBuYW1lc3BhY2UgSXMge1xyXG5cdGV4cG9ydCBmdW5jdGlvbiBtb2JpbGUoKTogYm9vbGVhbiB7XHJcblx0XHRpZiAod2luZG93LmlubmVyV2lkdGggPCA5MDApIHtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBpcyBudWxsIG9yIHVuZGVmaW5lZFxyXG5cdGV4cG9ydCBmdW5jdGlvbiBudWxsT3JVbmRlZmluZWQodmFsdWU6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0aWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpIHtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cdC8vIGlkIGVtcHR5XHJcblx0ZXhwb3J0IGZ1bmN0aW9uIGVtcHR5KHZhbHVlOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSB7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHQvLyBpcyBOdW1iZXJcclxuXHRjb25zdCBudW1iZXJSZWdleDogUmVnRXhwID0gL1xcRC87XHJcblx0ZXhwb3J0IGZ1bmN0aW9uIG51bWJlcih2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gIW51bWJlclJlZ2V4LnRlc3QodmFsdWUpO1xyXG5cdH1cclxuXHJcblx0Ly8gaXMgTGV0dGVyXHJcblx0Y29uc3QgbGV0dGVyUmVnZXg6IFJlZ0V4cCA9IC9bYS16QS1aXS87XHJcblx0ZXhwb3J0IGZ1bmN0aW9uIGxldHRlcih2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gbGV0dGVyUmVnZXgudGVzdCh2YWx1ZSk7XHJcblx0fVxyXG5cclxuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdGNvbnN0IGVtYWlsUmVnZXggPSAvXigoW148PigpW1xcXVxcXFwuLDs6XFxzQFxcXCJdKyhcXC5bXjw+KClbXFxdXFxcXC4sOzpcXHNAXFxcIl0rKSopfChcXFwiLitcXFwiKSlAKChcXFtbMC05XXsxLDN9XFwuWzAtOV17MSwzfVxcLlswLTldezEsM31cXC5bMC05XXsxLDN9XFxdKXwoKFthLXpBLVpcXC0wLTldK1xcLikrW2EtekEtWl17Mix9KSkkL207XHJcblx0ZXhwb3J0IGZ1bmN0aW9uIGVtYWlsKHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBlbWFpbFJlZ2V4LnRlc3QodmFsdWUpO1xyXG5cdH1cclxuXHJcblx0Ly8gYnJhemlsaWFuIHZhbGlkYXRpb25zIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHQvLyBwaG9uZVxyXG5cdGNvbnN0IGJyYXppbGlhblBob25lUmVnZXggPSAvXig/Oig/OlxcKylbMC05XXsyfVxccz8pezAsMX0oPzpcXCgpWzAtOV17Mn0oPzpcXCkpXFxzP1swLTldezAsMX1cXHM/WzAtOV17NCx9KD86LSlbMC05XXs0fSQvbTtcclxuXHRleHBvcnQgZnVuY3Rpb24gYnJhemlsaWFuUGhvbmUocGhvbmU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIGJyYXppbGlhblBob25lUmVnZXgudGVzdChwaG9uZSk7XHJcblx0fVxyXG5cdGV4cG9ydCBmdW5jdGlvbiBkZG1teXl5eShkYXRlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZC5cIik7XHJcblx0XHQvLyByZXR1cm4gbW9tZW50KGRhdGUsIFwiREQvTU0vWVlZWVwiLCB0cnVlKS5pc1ZhbGlkKCk7XHJcblx0fVxyXG5cdGV4cG9ydCBmdW5jdGlvbiBtbWRkeXl5eShkYXRlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZC5cIik7XHJcblx0XHQvLyByZXR1cm4gbW9tZW50KGRhdGUsIFwiTU0vREQvWVlZWVwiLCB0cnVlKS5pc1ZhbGlkKCk7XHJcblx0fVxyXG5cclxuXHQvLyBDUEZcclxuXHRleHBvcnQgZnVuY3Rpb24gY3BmKHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdHZhbHVlID0gU3RyaW5nLnN0cmlwTm9uTnVtYmVyKHZhbHVlKTtcclxuXHRcdGxldCBudW1lcm9zOiBzdHJpbmc7XHJcblx0XHRsZXQgZGlnaXRvczogYW55O1xyXG5cdFx0bGV0IHNvbWE6IG51bWJlcjtcclxuXHRcdGxldCBpOiBhbnk7XHJcblx0XHRsZXQgcmVzdWx0YWRvOiBhbnk7XHJcblx0XHRsZXQgZGlnaXRvc19pZ3VhaXM6IGFueTtcclxuXHRcdGRpZ2l0b3NfaWd1YWlzID0gMTtcclxuXHRcdGlmICh2YWx1ZS5sZW5ndGggPCAxMSkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0XHRmb3IgKGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoIC0gMTsgaSsrKSB7XHJcblx0XHRcdGlmICh2YWx1ZS5jaGFyQXQoaSkgIT09IHZhbHVlLmNoYXJBdChpICsgMSkpIHtcclxuXHRcdFx0XHRkaWdpdG9zX2lndWFpcyA9IDA7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmICghZGlnaXRvc19pZ3VhaXMpIHtcclxuXHRcdFx0bnVtZXJvcyA9IHZhbHVlLnN1YnN0cmluZygwLCA5KTtcclxuXHRcdFx0ZGlnaXRvcyA9IHZhbHVlLnN1YnN0cmluZyg5KTtcclxuXHRcdFx0c29tYSA9IDA7XHJcblx0XHRcdGZvciAoaSA9IDEwOyBpID4gMTsgaS0tKSB7XHJcblx0XHRcdFx0c29tYSArPSArKG51bWVyb3MuY2hhckF0KDEwIC0gaSkpICogaTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXN1bHRhZG8gPSBzb21hICUgMTEgPCAyID8gMCA6IDExIC0gc29tYSAlIDExO1xyXG5cdFx0XHRpZiAocmVzdWx0YWRvICE9PSArKGRpZ2l0b3MuY2hhckF0KDApKSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRudW1lcm9zID0gdmFsdWUuc3Vic3RyaW5nKDAsIDEwKTtcclxuXHRcdFx0c29tYSA9IDA7XHJcblx0XHRcdGZvciAoaSA9IDExOyBpID4gMTsgaS0tKSB7XHJcblx0XHRcdFx0c29tYSArPSArKG51bWVyb3MuY2hhckF0KDExIC0gaSkpICogaTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXN1bHRhZG8gPSBzb21hICUgMTEgPCAyID8gMCA6IDExIC0gc29tYSAlIDExO1xyXG5cdFx0XHRpZiAocmVzdWx0YWRvICE9PSArKGRpZ2l0b3MuY2hhckF0KDEpKSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcblx0Ly8gQ05QSlxyXG5cdGZ1bmN0aW9uIGNucGoodmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0dmFsdWUgPSBTdHJpbmcuc3RyaXBOb25OdW1iZXIodmFsdWUpO1xyXG5cclxuXHRcdGxldCB0YW1hbmhvOiBudW1iZXI7XHJcblx0XHRsZXQgbnVtZXJvczogc3RyaW5nO1xyXG5cdFx0bGV0IGRpZ2l0b3M6IHN0cmluZztcclxuXHRcdGxldCBzb21hOiBudW1iZXI7XHJcblx0XHRsZXQgcG9zOiBudW1iZXI7XHJcblx0XHR2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoL1teXFxkXSsvZywgXCJcIik7XHJcblx0XHRpZiAodmFsdWUgPT09IFwiXCIpIHsgcmV0dXJuIGZhbHNlOyB9XHJcblx0XHRpZiAodmFsdWUubGVuZ3RoICE9PSAxNCkgeyByZXR1cm4gZmFsc2U7IH1cclxuXHJcblx0XHQvLyBFbGltaW5hIENOUEpzIGludmFsaWRvcyBjb25oZWNpZG9zXHJcblx0XHRpZiAodmFsdWUgPT09IFwiMDAwMDAwMDAwMDAwMDBcIiB8fFxyXG5cdFx0XHR2YWx1ZSA9PT0gXCIxMTExMTExMTExMTExMVwiIHx8XHJcblx0XHRcdHZhbHVlID09PSBcIjIyMjIyMjIyMjIyMjIyXCIgfHxcclxuXHRcdFx0dmFsdWUgPT09IFwiMzMzMzMzMzMzMzMzMzNcIiB8fFxyXG5cdFx0XHR2YWx1ZSA9PT0gXCI0NDQ0NDQ0NDQ0NDQ0NFwiIHx8XHJcblx0XHRcdHZhbHVlID09PSBcIjU1NTU1NTU1NTU1NTU1XCIgfHxcclxuXHRcdFx0dmFsdWUgPT09IFwiNjY2NjY2NjY2NjY2NjZcIiB8fFxyXG5cdFx0XHR2YWx1ZSA9PT0gXCI3Nzc3Nzc3Nzc3Nzc3N1wiIHx8XHJcblx0XHRcdHZhbHVlID09PSBcIjg4ODg4ODg4ODg4ODg4XCIgfHxcclxuXHRcdFx0dmFsdWUgPT09IFwiOTk5OTk5OTk5OTk5OTlcIikge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdC8vIFZhbGlkYSBEVnNcclxuXHRcdHRhbWFuaG8gPSB2YWx1ZS5sZW5ndGggLSAyO1xyXG5cdFx0bnVtZXJvcyA9IHZhbHVlLnN1YnN0cmluZygwLCB0YW1hbmhvKTtcclxuXHRcdGRpZ2l0b3MgPSB2YWx1ZS5zdWJzdHJpbmcodGFtYW5obyk7XHJcblx0XHRzb21hID0gMDtcclxuXHRcdHBvcyA9IHRhbWFuaG8gLSA3O1xyXG5cdFx0Zm9yIChsZXQgaSA9IHRhbWFuaG87IGkgPj0gMTsgaS0tKSB7XHJcblx0XHRcdHNvbWEgKz0gKyhudW1lcm9zLmNoYXJBdCh0YW1hbmhvIC0gaSkpICogcG9zLS07XHJcblx0XHRcdGlmIChwb3MgPCAyKSB7XHJcblx0XHRcdFx0cG9zID0gOTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0bGV0IHJlc3VsdGFkbzogbnVtYmVyID0gc29tYSAlIDExIDwgMiA/IDAgOiAxMSAtIHNvbWEgJSAxMTtcclxuXHRcdGlmIChyZXN1bHRhZG8gIT09ICsoZGlnaXRvcy5jaGFyQXQoMCkpKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHR0YW1hbmhvID0gdGFtYW5obyArIDE7XHJcblx0XHRudW1lcm9zID0gdmFsdWUuc3Vic3RyaW5nKDAsIHRhbWFuaG8pO1xyXG5cdFx0c29tYSA9IDA7XHJcblx0XHRwb3MgPSB0YW1hbmhvIC0gNztcclxuXHRcdGZvciAobGV0IGkgPSB0YW1hbmhvOyBpID49IDE7IGktLSkge1xyXG5cdFx0XHRzb21hICs9ICsobnVtZXJvcy5jaGFyQXQodGFtYW5obyAtIGkpKSAqIHBvcy0tO1xyXG5cdFx0XHRpZiAocG9zIDwgMikge1xyXG5cdFx0XHRcdHBvcyA9IDk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJlc3VsdGFkbyA9IHNvbWEgJSAxMSA8IDIgPyAwIDogMTEgLSBzb21hICUgMTE7XHJcblx0XHRpZiAocmVzdWx0YWRvICE9PSArKGRpZ2l0b3MuY2hhckF0KDEpKSkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcbn1cclxuZXhwb3J0IGRlZmF1bHQgSXM7XHJcbiIsImV4cG9ydCBuYW1lc3BhY2UgTGlzdCB7XHJcblx0Ly8gcmVtb3ZlIGl0ZW0gZnJvbSBsaXN0IGlmIGV4aXN0XHJcblx0ZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUZyb21JbmRleDxUPihsaXN0OiBUW10sIGluZGV4OiBudW1iZXIpOiBUW10ge1xyXG5cdFx0bGlzdC5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0cmV0dXJuIGxpc3Q7XHJcblx0fVxyXG5cdGV4cG9ydCBmdW5jdGlvbiByZW1vdmVJdGVtPFQ+KGxpc3Q6IFRbXSwgaXRlbTogVCk6IFRbXSB7XHJcblx0XHRjb25zdCBpbmRleCA9IGxpc3QuaW5kZXhPZihpdGVtKTtcclxuXHRcdGxldCBuZXdMaXN0OiBUW107XHJcblx0XHRpZiAoaW5kZXggPiAtMSkge1xyXG5cdFx0XHRuZXdMaXN0ID0gcmVtb3ZlRnJvbUluZGV4KGxpc3QsIGluZGV4KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdG5ld0xpc3QgPSBsaXN0O1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIG5ld0xpc3Q7XHJcblx0fVxyXG5cdGV4cG9ydCBmdW5jdGlvbiBzZXRJdGVtPFQ+KGxpc3Q6IFRbXSwgaXRlbTogVCk6IFRbXSB7XHJcblx0XHRjb25zdCBpbmRleCA9IGxpc3QuaW5kZXhPZihpdGVtKTtcclxuXHRcdGlmIChpbmRleCA8IDApIHtcclxuXHRcdFx0bGlzdC5wdXNoKGl0ZW0pO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGxpc3Q7XHJcblx0fVxyXG59XHJcbmV4cG9ydCBkZWZhdWx0IExpc3Q7XHJcbiIsImV4cG9ydCAqIGZyb20gXCIuL2RvbVwiO1xyXG5leHBvcnQgKiBmcm9tIFwiLi9pc1wiO1xyXG5leHBvcnQgKiBmcm9tIFwiLi9zdHJpbmdcIjtcclxuZXhwb3J0ICogZnJvbSBcIi4vcmVmbGVjdGlvblwiO1xyXG5leHBvcnQgKiBmcm9tIFwiLi91cmxcIjtcclxuZXhwb3J0ICogZnJvbSBcIi4vbGlzdFwiO1xyXG5leHBvcnQgKiBmcm9tIFwiLi9zY3JvbGwtc3dpdGNoXCI7XHJcbmV4cG9ydCAqIGZyb20gXCIuL2V2ZW50XCI7XHJcbmV4cG9ydCBuYW1lc3BhY2UgVXRpbGl0eUNvbGxlY3Rpb24ge1xyXG5cdGNvbnN0IG5hbWU6IHN0cmluZyA9IFwiVXRpbGl0eUNvbGxlY3Rpb25cIjtcclxufVxyXG5leHBvcnQgZGVmYXVsdCBVdGlsaXR5Q29sbGVjdGlvbjtcclxuIiwiZXhwb3J0IG5hbWVzcGFjZSBSZWZsZWN0aW9uIHtcclxuXHRleHBvcnQgZnVuY3Rpb24gbWVyZ2UoYmFzZTogYW55LCBzb3VyY2U6IGFueSk6IHZvaWQge1xyXG5cdFx0Zm9yIChjb25zdCBpIGluIHNvdXJjZSkge1xyXG5cdFx0XHRpZiAoc291cmNlLmhhc093blByb3BlcnR5KGkpKSB7XHJcblx0XHRcdFx0YmFzZVtpXSA9IHNvdXJjZVtpXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHRleHBvcnQgZnVuY3Rpb24gZmlsbDxUIGV4dGVuZHMge1trZXk6IHN0cmluZ106IGFueSB9Pih0YXJnZXQ6IFQsIHNvdXJjZTogYW55KTogVCB7XHJcblx0XHRmb3IgKGNvbnN0IGtleSBpbiBzb3VyY2UpIHtcclxuXHRcdFx0aWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcblx0XHRcdFx0Y29uc3QgZWxlbWVudCA9IHNvdXJjZVtrZXldO1xyXG5cdFx0XHRcdHRhcmdldFtrZXldID0gZWxlbWVudDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRhcmdldDtcclxuXHR9XHJcbn1cclxuZXhwb3J0IGRlZmF1bHQgUmVmbGVjdGlvbjtcclxuIiwiaW1wb3J0IHsgRXZlbnQgfSBmcm9tIFwiLi9ldmVudFwiO1xyXG5cclxuZXhwb3J0IGNvbnN0IERBVEFfU0NST0xMQUJMRSA9IFwiZGF0YS1zY3JvbGxhYmxlXCI7XHJcbmV4cG9ydCBjb25zdCBDTEFTU19GT0NVUyA9IFwic2Nyb2xsLS1hY3RpdmVcIjtcclxuZXhwb3J0IG5hbWVzcGFjZSBTY3JvbGxTd2l0Y2gge1xyXG5cdGxldCB1bmZyZWV6ZURlbGF5OiBudW1iZXI7XHJcblx0ZXhwb3J0IGNsYXNzIFNjcm9sbGFibGUge1xyXG5cdFx0cHJpdmF0ZSBpZDogc3RyaW5nO1xyXG5cdFx0cHJpdmF0ZSBlbGVtZW50OiBIVE1MRWxlbWVudCA9IG51bGw7XHJcblx0XHRwcml2YXRlIHk6IG51bWJlciA9IDA7XHJcblx0XHRwcml2YXRlIGZyb3plbjogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdFx0cHJpdmF0ZSB1bmZyZWV6aW5nOiBib29sZWFuID0gZmFsc2U7XHJcblx0XHRjb25zdHJ1Y3RvcihlbGVtZW50OiBIVE1MRWxlbWVudCkge1xyXG5cdFx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xyXG5cdFx0XHRpZiAodGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZShEQVRBX1NDUk9MTEFCTEUpID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHR0aGlzLmlkID0gbmV3U2Nyb2xsYWJsZUlkKCk7XHJcblx0XHRcdFx0dGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShEQVRBX1NDUk9MTEFCTEUsIHRoaXMuaWQpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuaWQgPSB0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKERBVEFfU0NST0xMQUJMRSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gcmVnaXN0ZXIgZXZlbnRcclxuXHRcdFx0Y29uc3QgdW5mcmVlemVFdmVudCA9IChlOiBFdmVudCkgPT4ge1xyXG5cdFx0XHRcdHdpbmRvdy5zY3JvbGxUbygwLCB3aW5kb3cuc2Nyb2xsWSk7XHJcblx0XHRcdFx0dGhpcy51bmZyZWV6ZSgpO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRjb25zdCBmcmVlemVBbGxFdmVudCA9IChlOiBFdmVudCkgPT4ge1xyXG5cdFx0XHRcdGZyZWV6ZUFsbEJ1dElkKG51bGwpO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaHN0YXJ0XCIsIHVuZnJlZXplRXZlbnQsIEV2ZW50LnBhc3NpdmUoKSk7XHJcblx0XHRcdGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZW50ZXJcIiwgdW5mcmVlemVFdmVudCwgRXZlbnQucGFzc2l2ZSgpKTtcclxuXHRcdFx0ZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcm1vdmVcIiwgdW5mcmVlemVFdmVudCwgRXZlbnQucGFzc2l2ZSgpKTtcclxuXHRcdFx0ZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2VsZWF2ZVwiLCBmcmVlemVBbGxFdmVudCwgRXZlbnQucGFzc2l2ZSgpKTtcclxuXHRcdH1cclxuXHRcdHB1YmxpYyBnZXRJZCgpOiBzdHJpbmcge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5pZDtcclxuXHRcdH1cclxuXHRcdHB1YmxpYyB1bmZyZWV6ZSgpIHtcclxuXHRcdFx0aWYgKHRoaXMuZnJvemVuICYmICF0aGlzLnVuZnJlZXppbmcpIHtcclxuXHRcdFx0XHR0aGlzLnVuZnJlZXppbmcgPSB0cnVlO1xyXG5cdFx0XHRcdGZyZWV6ZUFsbEJ1dElkKHRoaXMuaWQpO1xyXG5cdFx0XHRcdGRvY3VtZW50LmJvZHkuc3R5bGUuaGVpZ2h0ID0gYCR7dGhpcy5lbGVtZW50LnNjcm9sbEhlaWdodH1weGA7XHJcblx0XHRcdFx0d2luZG93LnNjcm9sbCgwLCB0aGlzLnkpO1xyXG5cdFx0XHRcdHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgcG9zaXRpb246IGFic29sdXRlOyB0b3A6IDA7IHotaW5kZXg6ICR7dGhpcy5lbGVtZW50LnN0eWxlLnpJbmRleH07IGApO1xyXG5cdFx0XHRcdHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKENMQVNTX0ZPQ1VTKTtcclxuXHRcdFx0XHRkb2N1bWVudC5ib2R5LnN0eWxlLmhlaWdodCA9IFwiXCI7XHJcblx0XHRcdFx0dGhpcy55ID0gMDtcclxuXHRcdFx0XHR0aGlzLmZyb3plbiA9IGZhbHNlO1xyXG5cdFx0XHRcdHRoaXMudW5mcmVlemluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdHVuZnJlZXplRGVsYXkgPSB1bmRlZmluZWQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHB1YmxpYyBmcmVlemUoKSB7XHJcblx0XHRcdGlmICghdGhpcy5mcm96ZW4pIHtcclxuXHRcdFx0XHR0aGlzLnkgPSB3aW5kb3cuc2Nyb2xsWSArIDA7XHJcblx0XHRcdFx0dGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGBwb3NpdGlvbjogZml4ZWQ7IHRvcDogLSR7dGhpcy55fXB4OyB6LWluZGV4OiAke3RoaXMuZWxlbWVudC5zdHlsZS56SW5kZXh9OyBgKTtcclxuXHRcdFx0XHR0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShDTEFTU19GT0NVUyk7XHJcblx0XHRcdFx0dGhpcy5mcm96ZW4gPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cdGNvbnN0IHN0b3JlOiB7IFtrZXk6IHN0cmluZ106IFNjcm9sbGFibGUgfSA9IHt9O1xyXG5cdGxldCBsYXN0SWQ6IG51bWJlciA9IDE7XHJcblx0ZnVuY3Rpb24gbmV3U2Nyb2xsYWJsZUlkKCk6IHN0cmluZyB7XHJcblx0XHRsYXN0SWQgPSBsYXN0SWQgKyAxO1xyXG5cdFx0cmV0dXJuIGxhc3RJZC50b1N0cmluZygpO1xyXG5cdH1cclxuXHRmdW5jdGlvbiBpZGVudGlmeUVsZW1lbnQoZWxlbWVudDogSFRNTEVsZW1lbnQpOiBTY3JvbGxhYmxlIHtcclxuXHRcdGlmIChlbGVtZW50LnBhcmVudEVsZW1lbnQgIT09IGRvY3VtZW50LmJvZHkpIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblx0XHRsZXQgaWQgPSBlbGVtZW50LmdldEF0dHJpYnV0ZShEQVRBX1NDUk9MTEFCTEUpO1xyXG5cdFx0Y29uc3Qgc3RvcmVkID0gKGlkICE9PSB1bmRlZmluZWQpID8gKHN0b3JlW2lkXSAhPT0gdW5kZWZpbmVkKSA6IGZhbHNlO1xyXG5cdFx0aWYgKHN0b3JlZCkge1xyXG5cdFx0XHRyZXR1cm4gc3RvcmVbaWRdO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc3QgcyA9IG5ldyBTY3JvbGxhYmxlKGVsZW1lbnQpO1xyXG5cdFx0XHRpZCA9IHMuZ2V0SWQoKTtcclxuXHRcdFx0c3RvcmVbaWRdID0gcztcclxuXHRcdFx0cmV0dXJuIHN0b3JlW2lkXTtcclxuXHRcdH1cclxuXHR9XHJcblx0ZXhwb3J0IGZ1bmN0aW9uIGZyZWV6ZUVsZW1lbnQoZWxlbWVudDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IHNjcm9sbCA9IGlkZW50aWZ5RWxlbWVudChlbGVtZW50KTtcclxuXHRcdGlmIChzY3JvbGwgIT09IG51bGwpIHtcclxuXHRcdFx0c2Nyb2xsLmZyZWV6ZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRleHBvcnQgZnVuY3Rpb24gZnJlZXplQWxsQnV0SWQoaWQ6IHN0cmluZyB8IG51bGwgPSBudWxsKTogdm9pZCB7XHJcblx0XHRmb3IgKGNvbnN0IGkgaW4gc3RvcmUpIHtcclxuXHRcdFx0aWYgKGkgIT09IGlkKSB7XHJcblx0XHRcdFx0c3RvcmVbaV0uZnJlZXplKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblx0ZXhwb3J0IGZ1bmN0aW9uIGZyZWV6ZUFsbEJ1dEVsZW1lbnQoZWxlbWVudDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IHNjcm9sbCA9IGlkZW50aWZ5RWxlbWVudChlbGVtZW50KTtcclxuXHRcdGlmIChzY3JvbGwgIT09IG51bGwpIHtcclxuXHRcdFx0ZnJlZXplQWxsQnV0SWQoc2Nyb2xsLmdldElkKCkpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRleHBvcnQgZnVuY3Rpb24gdW5mcmVlemVFbGVtZW50KGVsZW1lbnQ6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRjb25zdCBzY3JvbGwgPSBpZGVudGlmeUVsZW1lbnQoZWxlbWVudCk7XHJcblx0XHRpZiAoc2Nyb2xsICE9PSBudWxsKSB7XHJcblx0XHRcdHNjcm9sbC51bmZyZWV6ZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5leHBvcnQgZGVmYXVsdCBTY3JvbGxTd2l0Y2g7XHJcbiIsImltcG9ydCB7IElzIH0gZnJvbSBcIi4vaXNcIjtcclxuXHJcbmV4cG9ydCBuYW1lc3BhY2UgU3RyaW5nIHtcclxuXHRleHBvcnQgZnVuY3Rpb24gcmVwbGFjZUFsbCh2YWx1ZTogc3RyaW5nLCBzZWFyY2g6IHN0cmluZywgcmVwbGFjZW1lbnQ6IHN0cmluZykge1xyXG5cdFx0cmV0dXJuIHZhbHVlLnNwbGl0KHNlYXJjaCkuam9pbihyZXBsYWNlbWVudCk7XHJcblx0fVxyXG5cdGV4cG9ydCBmdW5jdGlvbiBwYXRoQXJyYXkocGF0aDogc3RyaW5nKTogc3RyaW5nW10ge1xyXG5cdFx0cmV0dXJuIHBhdGguc3BsaXQoXCIuXCIpO1xyXG5cdH1cclxuXHJcblx0ZXhwb3J0IGZ1bmN0aW9uIHN0cmlwTm9uTnVtYmVyKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHZhbHVlLnJlcGxhY2UoL1teMC05XS9nLCBcIlwiKTtcclxuXHR9XHJcblx0Ly8gLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRjb25zdCBhY2NlbnRzID0gXCLDgMOBw4LDg8OEw4XDoMOhw6LDo8Okw6XDksOTw5TDlcOVw5bDmMOyw7PDtMO1w7bDuMOIw4nDisOLw6jDqcOqw6vDsMOHw6fDkMOMw43DjsOPw6zDrcOuw6/DmcOaw5vDnMO5w7rDu8O8w5HDscWgxaHFuMO/w73FvcW+XCI7XHJcblx0Y29uc3QgYWNjZW50c091dCA9IFwiQUFBQUFBYWFhYWFhT09PT09PT29vb29vb0VFRUVlZWVlZUNjRElJSUlpaWlpVVVVVXV1dXVOblNzWXl5WnpcIjtcclxuXHRleHBvcnQgZnVuY3Rpb24gcmVtb3ZlQWNjZW50cyh2YWx1ZTogc3RyaW5nKSB7XHJcblx0XHRpZiAoSXMuZW1wdHkodmFsdWUpKSB7XHJcblx0XHRcdHJldHVybiB2YWx1ZTtcclxuXHRcdH1cclxuXHRcdGNvbnN0IHN0ckFjY2VudHMgPSB2YWx1ZS5zcGxpdChcIlwiKTtcclxuXHRcdGNvbnN0IHN0ckFjY2VudHNPdXQgPSBuZXcgQXJyYXkoKTtcclxuXHRcdGNvbnN0IHN0ckFjY2VudHNMZW4gPSBzdHJBY2NlbnRzLmxlbmd0aDtcclxuXHJcblx0XHRmb3IgKGxldCB5ID0gMDsgeSA8IHN0ckFjY2VudHNMZW47IHkrKykge1xyXG5cdFx0XHRpZiAoYWNjZW50cy5pbmRleE9mKHN0ckFjY2VudHNbeV0pICE9PSAtMSkge1xyXG5cdFx0XHRcdHN0ckFjY2VudHNPdXRbeV0gPSBhY2NlbnRzT3V0LnN1YnN0cihhY2NlbnRzLmluZGV4T2Yoc3RyQWNjZW50c1t5XSksIDEpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHN0ckFjY2VudHNPdXRbeV0gPSBzdHJBY2NlbnRzW3ldO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gc3RyQWNjZW50c091dC5qb2luKFwiXCIpO1xyXG5cdH1cclxufVxyXG5leHBvcnQgZGVmYXVsdCBTdHJpbmc7XHJcbiIsImV4cG9ydCBjbGFzcyBVcmwge1xyXG5cdHB1YmxpYyBRdWVyeUxpc3Q/OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9ID0ge307XHJcblx0cHJpdmF0ZSBzdGF0aWNQYXRoPzogc3RyaW5nIHwgbnVsbDtcclxuXHRwcml2YXRlIHN0YXRpY1F1ZXJ5Pzogc3RyaW5nIHwgbnVsbDtcclxuXHRwcml2YXRlIHN0YXRpY0hhc2g/OiBzdHJpbmcgfCBudWxsO1xyXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRwdWJsaWMgY29uc3RydWN0b3IodXJsOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMuc3RhdGljUGF0aCA9IHVybC5zcGxpdChcIiNcIilbMF0uc3BsaXQoXCI/XCIpWzBdO1xyXG5cdFx0dGhpcy5zdGF0aWNRdWVyeSA9IHVybC5pbmRleE9mKFwiP1wiKSA+IC0xID8gdXJsLnNwbGl0KFwiP1wiKVsxXS5zcGxpdChcIiNcIilbMF0gOiBudWxsO1xyXG5cdFx0dGhpcy5zdGF0aWNIYXNoID0gdXJsLnNwbGl0KFwiI1wiKVsxXSB8fCBudWxsO1xyXG5cdFx0Ly8gcXVlcnlMaXN0XHJcblx0XHRpZiAodGhpcy5zdGF0aWNRdWVyeSAhPSBudWxsKSB7XHJcblx0XHRcdGNvbnN0IHF1ZXJ5S2V5VmFsdWVMaXN0OiBzdHJpbmdbXSA9IHRoaXMuc3RhdGljUXVlcnkuc3BsaXQoXCImXCIpO1xyXG5cdFx0XHRxdWVyeUtleVZhbHVlTGlzdC5mb3JFYWNoKChxdWVyeUtleVZhbHVlKSA9PiB7XHJcblx0XHRcdFx0Y29uc3Qga2V5VmFsdWU6IHN0cmluZ1tdID0gcXVlcnlLZXlWYWx1ZS5zcGxpdChcIj1cIik7XHJcblx0XHRcdFx0Y29uc3Qga2V5OiBzdHJpbmcgPSBrZXlWYWx1ZVswXTtcclxuXHRcdFx0XHRjb25zdCB2YWx1ZTogc3RyaW5nID0ga2V5VmFsdWVbMV07XHJcblx0XHRcdFx0dGhpcy5RdWVyeUxpc3Rba2V5XSA9IHZhbHVlO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblx0cHVibGljIHNldFF1ZXJ5KGtleTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKTogVXJsIHtcclxuXHRcdHRoaXMuUXVlcnlMaXN0W2tleV0gPSB2YWx1ZTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH1cclxuXHRwdWJsaWMgc2V0UXVlcmllcyh2YWx1ZXM6IHsgW2tleTogc3RyaW5nXTogYW55IH0gKTogVXJsIHtcclxuXHRcdGZvciAoY29uc3Qga2V5IGluIHZhbHVlcykge1xyXG5cdFx0XHRpZiAodHlwZW9mIHZhbHVlc1trZXldICE9PSBcImZ1bmN0aW9uXCIgJiYgdmFsdWVzW2tleV0gIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdHRoaXMuUXVlcnlMaXN0W2tleV0gPSB2YWx1ZXNba2V5XS50b1N0cmluZygpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9XHJcblx0cHVibGljIGRlbGV0ZVF1ZXJ5KGtleTogc3RyaW5nKTogVXJsIHtcclxuXHRcdHRoaXMuUXVlcnlMaXN0W2tleV0gPSB1bmRlZmluZWQ7XHJcblx0XHRkZWxldGUgdGhpcy5RdWVyeUxpc3Rba2V5XTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH1cclxuXHRwdWJsaWMgZ2V0UXVlcnkoa2V5OiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHRoaXMuUXVlcnlMaXN0W2tleV07XHJcblx0fVxyXG5cdHB1YmxpYyB0b1N0cmluZygpOiBzdHJpbmcge1xyXG5cdFx0bGV0IHF1ZXJ5TGVuZ3RoOiBudW1iZXIgPSBPYmplY3Qua2V5cyh0aGlzLlF1ZXJ5TGlzdCkubGVuZ3RoO1xyXG5cdFx0bGV0IHF1ZXJ5OiBzdHJpbmcgPSAoT2JqZWN0LmtleXModGhpcy5RdWVyeUxpc3QpLmxlbmd0aCA+IDAgPyBcIj9cIiA6IFwiXCIpO1xyXG5cdFx0Zm9yIChjb25zdCBrZXkgaW4gdGhpcy5RdWVyeUxpc3QpIHtcclxuXHRcdFx0aWYgKHRoaXMuUXVlcnlMaXN0Lmhhc093blByb3BlcnR5KGtleSkpIHtcclxuXHRcdFx0XHRxdWVyeUxlbmd0aC0tO1xyXG5cdFx0XHRcdGNvbnN0IHZhbHVlID0gdGhpcy5RdWVyeUxpc3Rba2V5XTtcclxuXHRcdFx0XHRxdWVyeSA9IHF1ZXJ5ICsga2V5ICsgXCI9XCIgKyB2YWx1ZTtcclxuXHRcdFx0XHRpZiAocXVlcnlMZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0XHRxdWVyeSA9IHF1ZXJ5ICsgXCImXCI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5zdGF0aWNQYXRoICsgcXVlcnkgKyAodGhpcy5zdGF0aWNIYXNoID8gdGhpcy5zdGF0aWNIYXNoIDogXCJcIik7XHJcblx0fVxyXG59XHJcbi8vIGV4cG9ydCBuYW1lc3BhY2UgVXJsIHtcclxuLy8gXHQvL1xyXG4vLyB9XHJcbmV4cG9ydCBkZWZhdWx0IFVybDtcclxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsLCB1bmRlZmluZWQpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIGlmIChnbG9iYWwuc2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbmV4dEhhbmRsZSA9IDE7IC8vIFNwZWMgc2F5cyBncmVhdGVyIHRoYW4gemVyb1xuICAgIHZhciB0YXNrc0J5SGFuZGxlID0ge307XG4gICAgdmFyIGN1cnJlbnRseVJ1bm5pbmdBVGFzayA9IGZhbHNlO1xuICAgIHZhciBkb2MgPSBnbG9iYWwuZG9jdW1lbnQ7XG4gICAgdmFyIHJlZ2lzdGVySW1tZWRpYXRlO1xuXG4gICAgZnVuY3Rpb24gc2V0SW1tZWRpYXRlKGNhbGxiYWNrKSB7XG4gICAgICAvLyBDYWxsYmFjayBjYW4gZWl0aGVyIGJlIGEgZnVuY3Rpb24gb3IgYSBzdHJpbmdcbiAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBjYWxsYmFjayA9IG5ldyBGdW5jdGlvbihcIlwiICsgY2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgLy8gQ29weSBmdW5jdGlvbiBhcmd1bWVudHNcbiAgICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaSArIDFdO1xuICAgICAgfVxuICAgICAgLy8gU3RvcmUgYW5kIHJlZ2lzdGVyIHRoZSB0YXNrXG4gICAgICB2YXIgdGFzayA9IHsgY2FsbGJhY2s6IGNhbGxiYWNrLCBhcmdzOiBhcmdzIH07XG4gICAgICB0YXNrc0J5SGFuZGxlW25leHRIYW5kbGVdID0gdGFzaztcbiAgICAgIHJlZ2lzdGVySW1tZWRpYXRlKG5leHRIYW5kbGUpO1xuICAgICAgcmV0dXJuIG5leHRIYW5kbGUrKztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhckltbWVkaWF0ZShoYW5kbGUpIHtcbiAgICAgICAgZGVsZXRlIHRhc2tzQnlIYW5kbGVbaGFuZGxlXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBydW4odGFzaykge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSB0YXNrLmNhbGxiYWNrO1xuICAgICAgICB2YXIgYXJncyA9IHRhc2suYXJncztcbiAgICAgICAgc3dpdGNoIChhcmdzLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIGNhbGxiYWNrKGFyZ3NbMF0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGNhbGxiYWNrKGFyZ3NbMF0sIGFyZ3NbMV0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIGNhbGxiYWNrKGFyZ3NbMF0sIGFyZ3NbMV0sIGFyZ3NbMl0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBjYWxsYmFjay5hcHBseSh1bmRlZmluZWQsIGFyZ3MpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBydW5JZlByZXNlbnQoaGFuZGxlKSB7XG4gICAgICAgIC8vIEZyb20gdGhlIHNwZWM6IFwiV2FpdCB1bnRpbCBhbnkgaW52b2NhdGlvbnMgb2YgdGhpcyBhbGdvcml0aG0gc3RhcnRlZCBiZWZvcmUgdGhpcyBvbmUgaGF2ZSBjb21wbGV0ZWQuXCJcbiAgICAgICAgLy8gU28gaWYgd2UncmUgY3VycmVudGx5IHJ1bm5pbmcgYSB0YXNrLCB3ZSdsbCBuZWVkIHRvIGRlbGF5IHRoaXMgaW52b2NhdGlvbi5cbiAgICAgICAgaWYgKGN1cnJlbnRseVJ1bm5pbmdBVGFzaykge1xuICAgICAgICAgICAgLy8gRGVsYXkgYnkgZG9pbmcgYSBzZXRUaW1lb3V0LiBzZXRJbW1lZGlhdGUgd2FzIHRyaWVkIGluc3RlYWQsIGJ1dCBpbiBGaXJlZm94IDcgaXQgZ2VuZXJhdGVkIGFcbiAgICAgICAgICAgIC8vIFwidG9vIG11Y2ggcmVjdXJzaW9uXCIgZXJyb3IuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KHJ1bklmUHJlc2VudCwgMCwgaGFuZGxlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciB0YXNrID0gdGFza3NCeUhhbmRsZVtoYW5kbGVdO1xuICAgICAgICAgICAgaWYgKHRhc2spIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50bHlSdW5uaW5nQVRhc2sgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJ1bih0YXNrKTtcbiAgICAgICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckltbWVkaWF0ZShoYW5kbGUpO1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50bHlSdW5uaW5nQVRhc2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnN0YWxsTmV4dFRpY2tJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgcmVnaXN0ZXJJbW1lZGlhdGUgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24gKCkgeyBydW5JZlByZXNlbnQoaGFuZGxlKTsgfSk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FuVXNlUG9zdE1lc3NhZ2UoKSB7XG4gICAgICAgIC8vIFRoZSB0ZXN0IGFnYWluc3QgYGltcG9ydFNjcmlwdHNgIHByZXZlbnRzIHRoaXMgaW1wbGVtZW50YXRpb24gZnJvbSBiZWluZyBpbnN0YWxsZWQgaW5zaWRlIGEgd2ViIHdvcmtlcixcbiAgICAgICAgLy8gd2hlcmUgYGdsb2JhbC5wb3N0TWVzc2FnZWAgbWVhbnMgc29tZXRoaW5nIGNvbXBsZXRlbHkgZGlmZmVyZW50IGFuZCBjYW4ndCBiZSB1c2VkIGZvciB0aGlzIHB1cnBvc2UuXG4gICAgICAgIGlmIChnbG9iYWwucG9zdE1lc3NhZ2UgJiYgIWdsb2JhbC5pbXBvcnRTY3JpcHRzKSB7XG4gICAgICAgICAgICB2YXIgcG9zdE1lc3NhZ2VJc0FzeW5jaHJvbm91cyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgb2xkT25NZXNzYWdlID0gZ2xvYmFsLm9ubWVzc2FnZTtcbiAgICAgICAgICAgIGdsb2JhbC5vbm1lc3NhZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBwb3N0TWVzc2FnZUlzQXN5bmNocm9ub3VzID0gZmFsc2U7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZ2xvYmFsLnBvc3RNZXNzYWdlKFwiXCIsIFwiKlwiKTtcbiAgICAgICAgICAgIGdsb2JhbC5vbm1lc3NhZ2UgPSBvbGRPbk1lc3NhZ2U7XG4gICAgICAgICAgICByZXR1cm4gcG9zdE1lc3NhZ2VJc0FzeW5jaHJvbm91cztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxQb3N0TWVzc2FnZUltcGxlbWVudGF0aW9uKCkge1xuICAgICAgICAvLyBJbnN0YWxscyBhbiBldmVudCBoYW5kbGVyIG9uIGBnbG9iYWxgIGZvciB0aGUgYG1lc3NhZ2VgIGV2ZW50OiBzZWVcbiAgICAgICAgLy8gKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9ET00vd2luZG93LnBvc3RNZXNzYWdlXG4gICAgICAgIC8vICogaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2UvY29tbXMuaHRtbCNjcm9zc0RvY3VtZW50TWVzc2FnZXNcblxuICAgICAgICB2YXIgbWVzc2FnZVByZWZpeCA9IFwic2V0SW1tZWRpYXRlJFwiICsgTWF0aC5yYW5kb20oKSArIFwiJFwiO1xuICAgICAgICB2YXIgb25HbG9iYWxNZXNzYWdlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5zb3VyY2UgPT09IGdsb2JhbCAmJlxuICAgICAgICAgICAgICAgIHR5cGVvZiBldmVudC5kYXRhID09PSBcInN0cmluZ1wiICYmXG4gICAgICAgICAgICAgICAgZXZlbnQuZGF0YS5pbmRleE9mKG1lc3NhZ2VQcmVmaXgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcnVuSWZQcmVzZW50KCtldmVudC5kYXRhLnNsaWNlKG1lc3NhZ2VQcmVmaXgubGVuZ3RoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGdsb2JhbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICBnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgb25HbG9iYWxNZXNzYWdlLCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnbG9iYWwuYXR0YWNoRXZlbnQoXCJvbm1lc3NhZ2VcIiwgb25HbG9iYWxNZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlZ2lzdGVySW1tZWRpYXRlID0gZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgICAgICAgICBnbG9iYWwucG9zdE1lc3NhZ2UobWVzc2FnZVByZWZpeCArIGhhbmRsZSwgXCIqXCIpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxNZXNzYWdlQ2hhbm5lbEltcGxlbWVudGF0aW9uKCkge1xuICAgICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICB2YXIgaGFuZGxlID0gZXZlbnQuZGF0YTtcbiAgICAgICAgICAgIHJ1bklmUHJlc2VudChoYW5kbGUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJlZ2lzdGVySW1tZWRpYXRlID0gZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKGhhbmRsZSk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zdGFsbFJlYWR5U3RhdGVDaGFuZ2VJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgdmFyIGh0bWwgPSBkb2MuZG9jdW1lbnRFbGVtZW50O1xuICAgICAgICByZWdpc3RlckltbWVkaWF0ZSA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgPHNjcmlwdD4gZWxlbWVudDsgaXRzIHJlYWR5c3RhdGVjaGFuZ2UgZXZlbnQgd2lsbCBiZSBmaXJlZCBhc3luY2hyb25vdXNseSBvbmNlIGl0IGlzIGluc2VydGVkXG4gICAgICAgICAgICAvLyBpbnRvIHRoZSBkb2N1bWVudC4gRG8gc28sIHRodXMgcXVldWluZyB1cCB0aGUgdGFzay4gUmVtZW1iZXIgdG8gY2xlYW4gdXAgb25jZSBpdCdzIGJlZW4gY2FsbGVkLlxuICAgICAgICAgICAgdmFyIHNjcmlwdCA9IGRvYy5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICAgICAgICAgICAgc2NyaXB0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBydW5JZlByZXNlbnQoaGFuZGxlKTtcbiAgICAgICAgICAgICAgICBzY3JpcHQub25yZWFkeXN0YXRlY2hhbmdlID0gbnVsbDtcbiAgICAgICAgICAgICAgICBodG1sLnJlbW92ZUNoaWxkKHNjcmlwdCk7XG4gICAgICAgICAgICAgICAgc2NyaXB0ID0gbnVsbDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBodG1sLmFwcGVuZENoaWxkKHNjcmlwdCk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zdGFsbFNldFRpbWVvdXRJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgcmVnaXN0ZXJJbW1lZGlhdGUgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQocnVuSWZQcmVzZW50LCAwLCBoYW5kbGUpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIElmIHN1cHBvcnRlZCwgd2Ugc2hvdWxkIGF0dGFjaCB0byB0aGUgcHJvdG90eXBlIG9mIGdsb2JhbCwgc2luY2UgdGhhdCBpcyB3aGVyZSBzZXRUaW1lb3V0IGV0IGFsLiBsaXZlLlxuICAgIHZhciBhdHRhY2hUbyA9IE9iamVjdC5nZXRQcm90b3R5cGVPZiAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoZ2xvYmFsKTtcbiAgICBhdHRhY2hUbyA9IGF0dGFjaFRvICYmIGF0dGFjaFRvLnNldFRpbWVvdXQgPyBhdHRhY2hUbyA6IGdsb2JhbDtcblxuICAgIC8vIERvbid0IGdldCBmb29sZWQgYnkgZS5nLiBicm93c2VyaWZ5IGVudmlyb25tZW50cy5cbiAgICBpZiAoe30udG9TdHJpbmcuY2FsbChnbG9iYWwucHJvY2VzcykgPT09IFwiW29iamVjdCBwcm9jZXNzXVwiKSB7XG4gICAgICAgIC8vIEZvciBOb2RlLmpzIGJlZm9yZSAwLjlcbiAgICAgICAgaW5zdGFsbE5leHRUaWNrSW1wbGVtZW50YXRpb24oKTtcblxuICAgIH0gZWxzZSBpZiAoY2FuVXNlUG9zdE1lc3NhZ2UoKSkge1xuICAgICAgICAvLyBGb3Igbm9uLUlFMTAgbW9kZXJuIGJyb3dzZXJzXG4gICAgICAgIGluc3RhbGxQb3N0TWVzc2FnZUltcGxlbWVudGF0aW9uKCk7XG5cbiAgICB9IGVsc2UgaWYgKGdsb2JhbC5NZXNzYWdlQ2hhbm5lbCkge1xuICAgICAgICAvLyBGb3Igd2ViIHdvcmtlcnMsIHdoZXJlIHN1cHBvcnRlZFxuICAgICAgICBpbnN0YWxsTWVzc2FnZUNoYW5uZWxJbXBsZW1lbnRhdGlvbigpO1xuXG4gICAgfSBlbHNlIGlmIChkb2MgJiYgXCJvbnJlYWR5c3RhdGVjaGFuZ2VcIiBpbiBkb2MuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKSkge1xuICAgICAgICAvLyBGb3IgSUUgNuKAkzhcbiAgICAgICAgaW5zdGFsbFJlYWR5U3RhdGVDaGFuZ2VJbXBsZW1lbnRhdGlvbigpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRm9yIG9sZGVyIGJyb3dzZXJzXG4gICAgICAgIGluc3RhbGxTZXRUaW1lb3V0SW1wbGVtZW50YXRpb24oKTtcbiAgICB9XG5cbiAgICBhdHRhY2hUby5zZXRJbW1lZGlhdGUgPSBzZXRJbW1lZGlhdGU7XG4gICAgYXR0YWNoVG8uY2xlYXJJbW1lZGlhdGUgPSBjbGVhckltbWVkaWF0ZTtcbn0odHlwZW9mIHNlbGYgPT09IFwidW5kZWZpbmVkXCIgPyB0eXBlb2YgZ2xvYmFsID09PSBcInVuZGVmaW5lZFwiID8gdGhpcyA6IGdsb2JhbCA6IHNlbGYpKTtcbiIsInZhciBhcHBseSA9IEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseTtcblxuLy8gRE9NIEFQSXMsIGZvciBjb21wbGV0ZW5lc3NcblxuZXhwb3J0cy5zZXRUaW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgVGltZW91dChhcHBseS5jYWxsKHNldFRpbWVvdXQsIHdpbmRvdywgYXJndW1lbnRzKSwgY2xlYXJUaW1lb3V0KTtcbn07XG5leHBvcnRzLnNldEludGVydmFsID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgVGltZW91dChhcHBseS5jYWxsKHNldEludGVydmFsLCB3aW5kb3csIGFyZ3VtZW50cyksIGNsZWFySW50ZXJ2YWwpO1xufTtcbmV4cG9ydHMuY2xlYXJUaW1lb3V0ID1cbmV4cG9ydHMuY2xlYXJJbnRlcnZhbCA9IGZ1bmN0aW9uKHRpbWVvdXQpIHtcbiAgaWYgKHRpbWVvdXQpIHtcbiAgICB0aW1lb3V0LmNsb3NlKCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIFRpbWVvdXQoaWQsIGNsZWFyRm4pIHtcbiAgdGhpcy5faWQgPSBpZDtcbiAgdGhpcy5fY2xlYXJGbiA9IGNsZWFyRm47XG59XG5UaW1lb3V0LnByb3RvdHlwZS51bnJlZiA9IFRpbWVvdXQucHJvdG90eXBlLnJlZiA9IGZ1bmN0aW9uKCkge307XG5UaW1lb3V0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9jbGVhckZuLmNhbGwod2luZG93LCB0aGlzLl9pZCk7XG59O1xuXG4vLyBEb2VzIG5vdCBzdGFydCB0aGUgdGltZSwganVzdCBzZXRzIHVwIHRoZSBtZW1iZXJzIG5lZWRlZC5cbmV4cG9ydHMuZW5yb2xsID0gZnVuY3Rpb24oaXRlbSwgbXNlY3MpIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuICBpdGVtLl9pZGxlVGltZW91dCA9IG1zZWNzO1xufTtcblxuZXhwb3J0cy51bmVucm9sbCA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuICBpdGVtLl9pZGxlVGltZW91dCA9IC0xO1xufTtcblxuZXhwb3J0cy5fdW5yZWZBY3RpdmUgPSBleHBvcnRzLmFjdGl2ZSA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuXG4gIHZhciBtc2VjcyA9IGl0ZW0uX2lkbGVUaW1lb3V0O1xuICBpZiAobXNlY3MgPj0gMCkge1xuICAgIGl0ZW0uX2lkbGVUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uIG9uVGltZW91dCgpIHtcbiAgICAgIGlmIChpdGVtLl9vblRpbWVvdXQpXG4gICAgICAgIGl0ZW0uX29uVGltZW91dCgpO1xuICAgIH0sIG1zZWNzKTtcbiAgfVxufTtcblxuLy8gc2V0aW1tZWRpYXRlIGF0dGFjaGVzIGl0c2VsZiB0byB0aGUgZ2xvYmFsIG9iamVjdFxucmVxdWlyZShcInNldGltbWVkaWF0ZVwiKTtcbi8vIE9uIHNvbWUgZXhvdGljIGVudmlyb25tZW50cywgaXQncyBub3QgY2xlYXIgd2hpY2ggb2JqZWN0IGBzZXRpbW1laWRhdGVgIHdhc1xuLy8gYWJsZSB0byBpbnN0YWxsIG9udG8uICBTZWFyY2ggZWFjaCBwb3NzaWJpbGl0eSBpbiB0aGUgc2FtZSBvcmRlciBhcyB0aGVcbi8vIGBzZXRpbW1lZGlhdGVgIGxpYnJhcnkuXG5leHBvcnRzLnNldEltbWVkaWF0ZSA9ICh0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiAmJiBzZWxmLnNldEltbWVkaWF0ZSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgJiYgZ2xvYmFsLnNldEltbWVkaWF0ZSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMgJiYgdGhpcy5zZXRJbW1lZGlhdGUpO1xuZXhwb3J0cy5jbGVhckltbWVkaWF0ZSA9ICh0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiAmJiBzZWxmLmNsZWFySW1tZWRpYXRlKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiICYmIGdsb2JhbC5jbGVhckltbWVkaWF0ZSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcyAmJiB0aGlzLmNsZWFySW1tZWRpYXRlKTtcbiIsInZhciBnO1xyXG5cclxuLy8gVGhpcyB3b3JrcyBpbiBub24tc3RyaWN0IG1vZGVcclxuZyA9IChmdW5jdGlvbigpIHtcclxuXHRyZXR1cm4gdGhpcztcclxufSkoKTtcclxuXHJcbnRyeSB7XHJcblx0Ly8gVGhpcyB3b3JrcyBpZiBldmFsIGlzIGFsbG93ZWQgKHNlZSBDU1ApXHJcblx0ZyA9IGcgfHwgRnVuY3Rpb24oXCJyZXR1cm4gdGhpc1wiKSgpIHx8ICgxLCBldmFsKShcInRoaXNcIik7XHJcbn0gY2F0Y2ggKGUpIHtcclxuXHQvLyBUaGlzIHdvcmtzIGlmIHRoZSB3aW5kb3cgcmVmZXJlbmNlIGlzIGF2YWlsYWJsZVxyXG5cdGlmICh0eXBlb2Ygd2luZG93ID09PSBcIm9iamVjdFwiKSBnID0gd2luZG93O1xyXG59XHJcblxyXG4vLyBnIGNhbiBzdGlsbCBiZSB1bmRlZmluZWQsIGJ1dCBub3RoaW5nIHRvIGRvIGFib3V0IGl0Li4uXHJcbi8vIFdlIHJldHVybiB1bmRlZmluZWQsIGluc3RlYWQgb2Ygbm90aGluZyBoZXJlLCBzbyBpdCdzXHJcbi8vIGVhc2llciB0byBoYW5kbGUgdGhpcyBjYXNlLiBpZighZ2xvYmFsKSB7IC4uLn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZztcclxuIiwiaW1wb3J0IFNpbXBsZSBmcm9tIFwiLi9zaW1wbGVcIjtcclxuZXhwb3J0IG5hbWVzcGFjZSBNb3RoZXJNYXNrIHtcclxuXHRleHBvcnQgZnVuY3Rpb24gcHJvY2Vzcyh2YWx1ZTogc3RyaW5nLCBwYXR0ZXJuOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIFNpbXBsZS5wcm9jZXNzKHZhbHVlLCBwYXR0ZXJuKTtcclxuXHR9XHJcblx0ZXhwb3J0IGZ1bmN0aW9uIGJpbmQoaW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MRWxlbWVudCB8IEVsZW1lbnQsIHBhdHRlcm46IHN0cmluZywgY2FsbGJhY2s6ICgodmFsdWU6IHN0cmluZykgPT4gdm9pZCkgfCBudWxsID0gbnVsbCk6IHZvaWQge1xyXG5cdFx0U2ltcGxlLmJpbmQoaW5wdXQsIHBhdHRlcm4sIGNhbGxiYWNrKTtcclxuXHR9XHJcbn1cclxuaWYgKHdpbmRvdyAhPT0gdW5kZWZpbmVkKSB7XHJcblx0KHdpbmRvdyBhcyBhbnkpLk1vdGhlck1hc2sgPSBNb3RoZXJNYXNrO1xyXG59XHJcbmV4cG9ydCBkZWZhdWx0IE1vdGhlck1hc2s7XHJcbiIsIi8vIG1hZGUgYnkgRGFuaWxvIENlbGVzdGlubyBkZSBDYXN0cm8gKGRhbjJkZXYpXHJcbmltcG9ydCB7IElzIH0gZnJvbSBcInV0aWxpdHktY29sbGVjdGlvblwiO1xyXG5cclxuZXhwb3J0IG5hbWVzcGFjZSBTaW1wbGUge1xyXG5cdGV4cG9ydCBlbnVtIENoYXJUeXBlIHsgTlVNQkVSLCBMRVRURVIgfVxyXG5cdGV4cG9ydCBpbnRlcmZhY2UgSU1hc2tDaGFyIHtcclxuXHRcdHBvc2l0aW9uOiBudW1iZXI7XHJcblx0XHRjaGFyOiBzdHJpbmcgfCBudWxsIHwgQ2hhclR5cGU7XHJcblx0fVxyXG5cdGV4cG9ydCBpbnRlcmZhY2UgSVZhbHVlQ2hhciB7XHJcblx0XHRwb3NpdGlvbjogbnVtYmVyO1xyXG5cdFx0Y2hhcjogc3RyaW5nIHwgbnVsbDtcclxuXHR9XHJcblx0Ly8gLS0tLS0tLS0tLS1cclxuXHRleHBvcnQgY2xhc3MgTWFzayB7XHJcblx0XHRwdWJsaWMgY2FyZXQ6IG51bWJlciA9IDA7XHJcblx0XHRwcml2YXRlIG1hc2s6IHN0cmluZztcclxuXHRcdHByaXZhdGUgdmFsdWU6IHN0cmluZztcclxuXHRcdHByaXZhdGUgbWFza0NoYXI6IFNpbXBsZS5JTWFza0NoYXIgPSB7XHJcblx0XHRcdHBvc2l0aW9uOiAtMSxcclxuXHRcdFx0Y2hhcjogbnVsbCxcclxuXHRcdH07XHJcblx0XHRwcml2YXRlIHZhbHVlQ2hhcjogU2ltcGxlLklWYWx1ZUNoYXIgPSB7XHJcblx0XHRcdHBvc2l0aW9uOiAtMSxcclxuXHRcdFx0Y2hhcjogbnVsbCxcclxuXHRcdH07XHJcblx0XHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuXHRcdGNvbnN0cnVjdG9yKHZhbHVlOiBzdHJpbmcsIG1hc2s6IHN0cmluZywgY2FyZXQ6IG51bWJlciA9IDApIHtcclxuXHRcdFx0dGhpcy52YWx1ZSA9IHZhbHVlO1xyXG5cdFx0XHR0aGlzLm1hc2sgPSBtYXNrO1xyXG5cdFx0XHR0aGlzLmNhcmV0ID0gY2FyZXQ7XHJcblx0XHR9XHJcblx0XHRwdWJsaWMgcHJvY2VzcygpOiBzdHJpbmcge1xyXG5cdFx0XHRpZiAoSXMuZW1wdHkodGhpcy52YWx1ZSkpIHtcclxuXHRcdFx0XHRyZXR1cm4gXCJcIjtcclxuXHRcdFx0fVxyXG5cdFx0XHRsZXQgb3V0cHV0OiBzdHJpbmcgPSBcIlwiO1xyXG5cdFx0XHRjb25zdCBvbGRDYXJldDogbnVtYmVyID0gdGhpcy5jYXJldDtcclxuXHRcdFx0Y29uc3Qgc2hhZG93TGF0ZXN0SU1hc2tDaGFyczogc3RyaW5nW10gPSBbXTtcclxuXHRcdFx0d2hpbGUgKHRoaXMubmV4dElNYXNrQ2hhcigpKSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiB0aGlzLm1hc2tDaGFyLmNoYXIgPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdHNoYWRvd0xhdGVzdElNYXNrQ2hhcnMucHVzaCh0aGlzLm1hc2tDaGFyLmNoYXIpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5uZXh0SVZhbHVlQ2hhcih0aGlzLm1hc2tDaGFyLmNoYXIhKSAmJiAhSXMuZW1wdHkodGhpcy52YWx1ZUNoYXIuY2hhcikpIHtcclxuXHRcdFx0XHRcdFx0d2hpbGUgKHNoYWRvd0xhdGVzdElNYXNrQ2hhcnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMubWFza0NoYXIucG9zaXRpb24gPD0gdGhpcy5jYXJldCArIDEgJiZcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMubWFza0NoYXIucG9zaXRpb24gPj0gdGhpcy5jYXJldFxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5jYXJldCsrO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRvdXRwdXQgKz0gc2hhZG93TGF0ZXN0SU1hc2tDaGFycy5zaGlmdCgpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdG91dHB1dCArPSB0aGlzLnZhbHVlQ2hhci5jaGFyO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gb3V0cHV0O1xyXG5cdFx0fVxyXG5cclxuXHRcdHByaXZhdGUgbmV4dElNYXNrQ2hhcigpOiBib29sZWFuIHtcclxuXHRcdFx0dGhpcy5tYXNrQ2hhci5wb3NpdGlvbisrO1xyXG5cdFx0XHRpZiAodGhpcy5tYXNrQ2hhci5wb3NpdGlvbiA+IHRoaXMubWFzay5sZW5ndGgpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gd2hhdCB0byByZXR1cm5cclxuXHRcdFx0XHR0aGlzLm1hc2tDaGFyLmNoYXIgPSB0aGlzLm1hc2suY2hhckF0KHRoaXMubWFza0NoYXIucG9zaXRpb24pO1xyXG5cdFx0XHRcdGlmICh0aGlzLm1hc2tDaGFyLmNoYXIgPT09IFwiOVwiKSB7XHJcblx0XHRcdFx0XHR0aGlzLm1hc2tDaGFyLmNoYXIgPSBTaW1wbGUuQ2hhclR5cGUuTlVNQkVSO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAodGhpcy5tYXNrQ2hhci5jaGFyID09PSBcIlpcIikge1xyXG5cdFx0XHRcdFx0dGhpcy5tYXNrQ2hhci5jaGFyID0gU2ltcGxlLkNoYXJUeXBlLkxFVFRFUjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdC8vIHZhbHVlXHJcblxyXG5cdFx0cHJpdmF0ZSBuZXh0SVZhbHVlQ2hhcih0eXBlOiBTaW1wbGUuQ2hhclR5cGUpOiBzdHJpbmcgfCBib29sZWFuIHtcclxuXHRcdFx0dGhpcy52YWx1ZUNoYXIucG9zaXRpb24rKztcclxuXHRcdFx0aWYgKHRoaXMudmFsdWVDaGFyLnBvc2l0aW9uID4gdGhpcy52YWx1ZS5sZW5ndGgpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy52YWx1ZUNoYXIuY2hhciA9IHRoaXMudmFsdWUuY2hhckF0KHRoaXMudmFsdWVDaGFyLnBvc2l0aW9uKTtcclxuXHRcdFx0XHRpZiAodHlwZSA9PT0gU2ltcGxlLkNoYXJUeXBlLk5VTUJFUikge1xyXG5cdFx0XHRcdFx0aWYgKElzLm51bWJlcih0aGlzLnZhbHVlQ2hhci5jaGFyKSkgeyByZXR1cm4gdHJ1ZTsgfVxyXG5cdFx0XHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gU2ltcGxlLkNoYXJUeXBlLkxFVFRFUikge1xyXG5cdFx0XHRcdFx0aWYgKElzLmxldHRlcih0aGlzLnZhbHVlQ2hhci5jaGFyKSkgeyByZXR1cm4gdHJ1ZTsgfVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5uZXh0SVZhbHVlQ2hhcih0eXBlKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHR9XHJcblxyXG5cdGV4cG9ydCBmdW5jdGlvbiBwcm9jZXNzKHZhbHVlOiBzdHJpbmcsIG1hc2s6IHN0cmluZykge1xyXG5cdFx0Y29uc3QgaW5zdGFuY2UgPSBuZXcgTWFzayh2YWx1ZSwgbWFzayk7XHJcblx0XHRyZXR1cm4gaW5zdGFuY2UucHJvY2VzcygpO1xyXG5cdH1cclxuXHJcblx0ZXhwb3J0IGZ1bmN0aW9uIGJpbmQoaW5wdXRFbGVtZW50OiBIVE1MSW5wdXRFbGVtZW50IHwgRWxlbWVudCwgbWFzazogc3RyaW5nLCBjYWxsYmFjazogKChvdXRwdXQ6IHN0cmluZykgPT4gdm9pZCkgfCBudWxsID0gbnVsbCkge1xyXG5cdFx0aW5wdXRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJwYXN0ZVwiLCAoZTogRXZlbnQpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudDtcclxuXHRcdFx0Y29uc3Qgb2xkVmFsdWUgPSB0YXJnZXQudmFsdWUudG9TdHJpbmcoKTtcclxuXHRcdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcclxuXHRcdFx0XHRjb25zdCBtID0gbmV3IE1hc2sodGFyZ2V0LnZhbHVlLCBtYXNrKTtcclxuXHRcdFx0XHR0YXJnZXQudmFsdWUgPSBtLnByb2Nlc3MoKTtcclxuXHRcdFx0XHRpZiAoY2FsbGJhY2sgIT0gbnVsbCkge1xyXG5cdFx0XHRcdFx0Y2FsbGJhY2sodGFyZ2V0LnZhbHVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aW5wdXRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcblx0XHRcdGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0LnZhbHVlLnRvU3RyaW5nKCk7XHJcblx0XHRcdC8vIGNoYXJzIC0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdFx0Y29uc3QgaXNCYWNrc3BhY2UgPSAoXCJCYWNrc3BhY2VcIiA9PT0gZS5rZXkgfHwgZS5rZXlDb2RlID09PSA4KTtcclxuXHRcdFx0Y29uc3QgaXNEZWxldGUgPSAoXCJEZWxldGVcIiA9PT0gZS5rZXkpO1xyXG5cdFx0XHRjb25zdCBpc0NoYXJJbnNlcnQgPSAoZS5rZXkubGVuZ3RoID09PSAxICYmICFlLmN0cmxLZXkgJiYgIWUuYWx0S2V5KTtcclxuXHRcdFx0Y29uc3QgaXNVbmlkZW50aWZpZWQgPSAoZS5rZXkgPT09IFwiVW5pZGVudGlmaWVkXCIpO1xyXG5cdFx0XHQvLyBkb24ndCBhbGxvdyB0byBpbnNlcnQgbW9yZSBpZiBpdCdzIGZ1bGxcclxuXHRcdFx0aWYgKGlzQ2hhckluc2VydCAmJiB0YXJnZXQuc2VsZWN0aW9uU3RhcnQgPT09IHRhcmdldC5zZWxlY3Rpb25FbmQpIHtcclxuXHRcdFx0XHRpZiAob2xkVmFsdWUubGVuZ3RoID49IG1hc2subGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHNldEltbWVkaWF0ZSgoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3Qgc2VsU3RhcnRBZnRlciA9IHRhcmdldC5zZWxlY3Rpb25TdGFydDtcclxuXHRcdFx0XHRjb25zdCBtID0gbmV3IE1hc2sodGFyZ2V0LnZhbHVlLCBtYXNrLCBzZWxTdGFydEFmdGVyKTtcclxuXHRcdFx0XHR0YXJnZXQudmFsdWUgPSBtLnByb2Nlc3MoKTtcclxuXHRcdFx0XHQvLyBmaXggY2FyZXQgcG9zaXRpb25cclxuXHRcdFx0XHRpZiAoaXNVbmlkZW50aWZpZWQpIHtcclxuXHRcdFx0XHRcdGlmICh0YXJnZXQudmFsdWUubGVuZ3RoID4gb2xkVmFsdWUubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRcdHRhcmdldC5zZXRTZWxlY3Rpb25SYW5nZShtLmNhcmV0LCBtLmNhcmV0KTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHRhcmdldC5zZXRTZWxlY3Rpb25SYW5nZShzZWxTdGFydEFmdGVyLCBzZWxTdGFydEFmdGVyKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0aWYgKGlzRGVsZXRlKSB7XHJcblx0XHRcdFx0XHRcdGlmIChvbGRWYWx1ZS5sZW5ndGggPT09IHRhcmdldC52YWx1ZS5sZW5ndGgpIHtcclxuXHRcdFx0XHRcdFx0XHR0YXJnZXQuc2V0U2VsZWN0aW9uUmFuZ2Uoc2VsU3RhcnRBZnRlciArIDEsIHNlbFN0YXJ0QWZ0ZXIgKyAxKTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHR0YXJnZXQuc2V0U2VsZWN0aW9uUmFuZ2Uoc2VsU3RhcnRBZnRlciwgc2VsU3RhcnRBZnRlcik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmIChpc0JhY2tzcGFjZSkge1xyXG5cdFx0XHRcdFx0XHR0YXJnZXQuc2V0U2VsZWN0aW9uUmFuZ2Uoc2VsU3RhcnRBZnRlciwgc2VsU3RhcnRBZnRlcik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZiAoaXNDaGFySW5zZXJ0KSB7XHJcblx0XHRcdFx0XHRcdHRhcmdldC5zZXRTZWxlY3Rpb25SYW5nZShtLmNhcmV0LCBtLmNhcmV0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKGNhbGxiYWNrICE9IG51bGwpIHtcclxuXHRcdFx0XHRcdGNhbGxiYWNrKHRhcmdldC52YWx1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxuLy8gSG93IHRvIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFNpbXBsZS5wcm9jZXNzKFwiMDEyMTUzNDQxMzlcIiwgXCI5OTkuOTk5Ljk5OS05OVwiKTtcclxuLy8gdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1hc2sxXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbi8vIFNpbXBsZS5iaW5kKGVsZW1lbnQsIFwiOTk5Ljk5OS45OTktOTlcIik7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBTaW1wbGU7XHJcbiJdLCJzb3VyY2VSb290IjoiIn0=