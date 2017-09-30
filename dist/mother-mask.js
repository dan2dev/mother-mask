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
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MotherMask", function() { return MotherMask; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__simple__ = __webpack_require__(1);

var MotherMask;
(function (MotherMask) {
    function process(value, pattern) {
        return __WEBPACK_IMPORTED_MODULE_0__simple__["a" /* default */].process(value, pattern);
    }
    MotherMask.process = process;
    function bind(input, pattern, callback) {
        if (callback === void 0) { callback = null; }
        __WEBPACK_IMPORTED_MODULE_0__simple__["a" /* default */].bind(input, pattern, callback);
    }
    MotherMask.bind = bind;
})(MotherMask || (MotherMask = {}));
if (window !== undefined) {
    window.MotherMask = MotherMask;
}
/* harmony default export */ __webpack_exports__["default"] = (MotherMask);


/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export Simple */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_utility_collection__ = __webpack_require__(2);
// Made by Danilo Celestino de Castro (dan2dev)

var Simple;
(function (Simple) {
    var CharType;
    (function (CharType) {
        CharType[CharType["NUMBER"] = 0] = "NUMBER";
        CharType[CharType["LETTER"] = 1] = "LETTER";
    })(CharType = Simple.CharType || (Simple.CharType = {}));
    // -----------
    var Mask = /** @class */ (function () {
        // -----------------------
        function Mask(value, mask, caret) {
            if (caret === void 0) { caret = 0; }
            this.caret = 0;
            // cursors -------------
            // mask
            this.maskChar = {
                position: -1,
                char: null
            };
            // value
            this.valueChar = {
                position: -1,
                char: null
            };
            this.value = value;
            this.mask = mask;
            this.caret = caret;
        }
        Mask.prototype.nextMaskChar = function () {
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
        };
        Mask.prototype.nextValueChar = function (type) {
            this.valueChar.position++;
            if (this.valueChar.position > this.value.length) {
                return false;
            }
            else {
                this.valueChar.char = this.value.charAt(this.valueChar.position);
                if (type === Simple.CharType.NUMBER) {
                    if (__WEBPACK_IMPORTED_MODULE_0_utility_collection__["a" /* Is */].number(this.valueChar.char))
                        return true;
                }
                else if (type === Simple.CharType.LETTER) {
                    if (__WEBPACK_IMPORTED_MODULE_0_utility_collection__["a" /* Is */].letter(this.valueChar.char))
                        return true;
                }
                return this.nextValueChar(type);
            }
        };
        Mask.prototype.process = function () {
            var output = "";
            var oldCaret = this.caret;
            var shadowLatestMaskChars = [];
            while (this.nextMaskChar()) {
                if (typeof this.maskChar.char === 'string') {
                    shadowLatestMaskChars.push(this.maskChar.char);
                }
                else {
                    if (this.nextValueChar(this.maskChar.char) && !__WEBPACK_IMPORTED_MODULE_0_utility_collection__["a" /* Is */].empty(this.valueChar.char)) {
                        while (shadowLatestMaskChars.length > 0) {
                            if (this.maskChar.position <= this.caret + 1 &&
                                this.maskChar.position >= this.caret) {
                                this.caret++;
                            }
                            output += shadowLatestMaskChars.shift();
                        }
                        output += this.valueChar.char;
                    }
                }
            }
            return output;
        };
        return Mask;
    }());
    function process(value, mask) {
        var instance = new Mask(value, mask);
        return instance.process();
    }
    Simple.process = process;
    function bind(inputElement, mask, callback) {
        if (callback === void 0) { callback = null; }
        inputElement.addEventListener("paste", function (e) {
            var target = e.target;
            var oldValue = target.value.toString();
            requestAnimationFrame(function () {
                var m = new Mask(target.value, mask);
                target.value = m.process();
                if (callback != null) {
                    callback(target.value);
                }
            });
        });
        inputElement.addEventListener("keydown", function (e) {
            var target = e.target;
            var oldValue = target.value.toString();
            // chars -------------------
            var isBackspace = ("Backspace" === e.key);
            var isDelete = ("Delete" === e.key);
            var isCharInsert = (e.key.length === 1 && !e.ctrlKey && !e.altKey);
            // don't allow to insert more if it's full
            if (isCharInsert && target.selectionStart === target.selectionEnd) {
                if (oldValue.length >= mask.length) {
                    e.preventDefault();
                }
            }
            requestAnimationFrame(function () {
                var selStartAfter = target.selectionStart;
                var m = new Mask(target.value, mask, selStartAfter);
                target.value = m.process();
                // fix caret position
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
                if (callback != null) {
                    callback(target.value);
                }
            });
        });
    }
    Simple.bind = bind;
})(Simple || (Simple = {}));
// How to --------------------------
//Simple.process("01215344139", "999.999.999-99");
//var element = document.getElementById("mask1") as HTMLInputElement;
//Simple.bind(element, "999.999.999-99");
/* harmony default export */ __webpack_exports__["a"] = (Simple);


/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__dom__ = __webpack_require__(3);
/* unused harmony namespace reexport */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__is__ = __webpack_require__(4);
/* harmony namespace reexport (by used) */ __webpack_require__.d(__webpack_exports__, "a", function() { return __WEBPACK_IMPORTED_MODULE_1__is__["a"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__string__ = __webpack_require__(5);
/* unused harmony namespace reexport */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__object__ = __webpack_require__(6);
/* unused harmony namespace reexport */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__url__ = __webpack_require__(7);
/* unused harmony namespace reexport */





//export * from "./mask-simple";


/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export Dom */
var Dom;
(function (Dom) {
    function insertBefore(element, targetElement) {
        targetElement.parentElement.insertBefore(element, targetElement);
    }
    Dom.insertBefore = insertBefore;
    function insertAfter(element, targetElement) {
        var parent = targetElement.parentNode;
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
            var node = document.createElement("div");
            node.innerHTML = html;
            return node;
        }
    }
    Dom.htmlToNode = htmlToNode;
    // atributes  ---------------------------------------------
    function getAttributes(element) {
        var attrs = element.attributes;
        var newAttr = {};
        for (var i = 0; i < attrs.length; i++) {
            newAttr[attrs[i].name] = attrs[i].value;
        }
        return newAttr;
    }
    Dom.getAttributes = getAttributes;
    // Loops e giros pelo dom --------------------------------------------
    function childElement(node, each) {
        var child = node.firstChild;
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
        var parent = node;
        var child = node.firstChild;
        while (child) {
            var eachReturn = each(child, parent);
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
        var parent = node;
        var child = node.firstChild;
        while (child) {
            if (child.nodeType === 1) {
                var eachReturn = each(child, parent);
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
        var retorno = true;
        var current = node.parentNode;
        do {
            retorno = each(current);
            current = current.parentNode;
        } while (retorno !== false && current !== null && current !== undefined && node.nodeName !== "BODY");
    }
    Dom.parentElementUp = parentElementUp;
    // dom --------------------------
    function attribute(element, each) {
        // TODO: this still need to be tested
        var attributes = element.attributes;
        for (var i = 0; i < attributes.length; i++) {
            each(attributes[i].name, attributes[i].value);
        }
    }
    Dom.attribute = attribute;
    function findNextSibling(target, validation) {
        var current = target.nextSibling;
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
        var current = target.previousSibling;
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
        var siblings = [];
        findPrevSibling(target, function (node) {
            siblings.push(node);
            return false;
        });
        findNextSibling(target, function (node) {
            siblings.push(node);
            return false;
        });
        return siblings;
    }
    Dom.findAllSiblings = findAllSiblings;
})(Dom || (Dom = {}));
/* unused harmony default export */ var _unused_webpack_default_export = (Dom);


/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Is; });
var Is;
(function (Is) {
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
    var numberRegex = /\D/;
    function number(value) {
        return !numberRegex.test(value);
    }
    Is.number = number;
    // is Letter
    var letterRegex = /[a-zA-Z]/;
    function letter(value) {
        return letterRegex.test(value);
    }
    Is.letter = letter;
    // --------------------------------
    var emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/mg;
    function email(email) {
        return emailRegex.test(email);
    }
    Is.email = email;
    // brazilian validations ----------------------------------------
    // phone
    var brazilianPhoneRegex = /^(?:(?:\+)[0-9]{2}\s?){0,1}(?:\()[0-9]{2}(?:\))\s?[0-9]{0,1}\s?[0-9]{4,}(?:-)[0-9]{4}$/mg;
    function brazilianPhone(phone) {
        return brazilianPhoneRegex.test(phone);
    }
    Is.brazilianPhone = brazilianPhone;
    // CPF
    function cpf(cpf) {
        var numeros, digitos, soma, i, resultado, digitos_iguais;
        digitos_iguais = 1;
        if (cpf.length < 11)
            return false;
        for (i = 0; i < cpf.length - 1; i++)
            if (cpf.charAt(i) != cpf.charAt(i + 1)) {
                digitos_iguais = 0;
                break;
            }
        if (!digitos_iguais) {
            numeros = cpf.substring(0, 9);
            digitos = cpf.substring(9);
            soma = 0;
            for (i = 10; i > 1; i--)
                soma += +(numeros.charAt(10 - i)) * i;
            resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
            if (resultado != +(digitos.charAt(0)))
                return false;
            numeros = cpf.substring(0, 10);
            soma = 0;
            for (i = 11; i > 1; i--)
                soma += +(numeros.charAt(11 - i)) * i;
            resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
            if (resultado != +(digitos.charAt(1)))
                return false;
            return true;
        }
        else {
            return false;
        }
    }
    Is.cpf = cpf;
    // CNPJ
    function cnpj(cnpj) {
        var tamanho, numeros, digitos, soma, pos;
        cnpj = cnpj.replace(/[^\d]+/g, '');
        if (cnpj == '')
            return false;
        if (cnpj.length != 14)
            return false;
        // Elimina CNPJs invalidos conhecidos
        if (cnpj == "00000000000000" ||
            cnpj == "11111111111111" ||
            cnpj == "22222222222222" ||
            cnpj == "33333333333333" ||
            cnpj == "44444444444444" ||
            cnpj == "55555555555555" ||
            cnpj == "66666666666666" ||
            cnpj == "77777777777777" ||
            cnpj == "88888888888888" ||
            cnpj == "99999999999999")
            return false;
        // Valida DVs
        tamanho = cnpj.length - 2;
        numeros = cnpj.substring(0, tamanho);
        digitos = cnpj.substring(tamanho);
        soma = 0;
        pos = tamanho - 7;
        for (var i = tamanho; i >= 1; i--) {
            soma += +(numeros.charAt(tamanho - i)) * pos--;
            if (pos < 2)
                pos = 9;
        }
        var resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado != +(digitos.charAt(0)))
            return false;
        tamanho = tamanho + 1;
        numeros = cnpj.substring(0, tamanho);
        soma = 0;
        pos = tamanho - 7;
        for (i = tamanho; i >= 1; i--) {
            soma += +(numeros.charAt(tamanho - i)) * pos--;
            if (pos < 2)
                pos = 9;
        }
        resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado != +(digitos.charAt(1)))
            return false;
        return true;
    }
})(Is || (Is = {}));
/* unused harmony default export */ var _unused_webpack_default_export = (Is);


/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export String */
var String;
(function (String) {
    function ReplaceAll(value, search, replacement) {
        return value.split(search).join(replacement);
    }
    String.ReplaceAll = ReplaceAll;
    function pathArray(path) {
        return path.split(".");
    }
    String.pathArray = pathArray;
})(String || (String = {}));
/* unused harmony default export */ var _unused_webpack_default_export = (String);


/***/ }),
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export Object */
var Object;
(function (Object) {
    function merge(base, source) {
        for (var i in source) {
            base[i] = source[i];
        }
    }
    Object.merge = merge;
})(Object || (Object = {}));
/* unused harmony default export */ var _unused_webpack_default_export = (Object);


/***/ }),
/* 7 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export Url */
var Url = /** @class */ (function () {
    // -------------------
    function Url(url) {
        var _this = this;
        // -------------------
        this.QueryList = {};
        this.staticPath = url.split('#')[0].split('?')[0];
        this.staticQuery = url.indexOf('?') > -1 ? url.split('?')[1].split('#')[0] : null;
        this.staticHash = url.split('#')[1] || null;
        // queryList
        if (this.staticQuery != null) {
            var queryKeyValueList = this.staticQuery.split('&');
            queryKeyValueList.forEach(function (queryKeyValue) {
                var keyValue = queryKeyValue.split('=');
                var key = keyValue[0];
                var value = keyValue[1];
                _this.QueryList[key] = value;
            });
        }
    }
    Url.prototype.setQuery = function (key, value) {
        this.QueryList[key] = value;
        return this;
    };
    Url.prototype.setQueries = function (values) {
        for (var key in values) {
            if (typeof values[key] !== 'function' && values[key] !== undefined) {
                this.QueryList[key] = values[key].toString();
            }
        }
        return this;
    };
    Url.prototype.getQuery = function (key) {
        return this.QueryList[key];
    };
    Url.prototype.toString = function () {
        var queryLength = Object.keys(this.QueryList).length;
        var query = (Object.keys(this.QueryList).length > 0 ? "?" : "");
        for (var key in this.QueryList) {
            queryLength--;
            if (this.QueryList.hasOwnProperty(key)) {
                var value = this.QueryList[key];
                query = query + key + "=" + value;
                if (queryLength > 0) {
                    query = query + "&";
                }
            }
        }
        return this.staticPath + query + (this.staticHash ? this.staticHash : "");
    };
    return Url;
}());

/* unused harmony default export */ var _unused_webpack_default_export = (Url);


/***/ })
/******/ ]);
//# sourceMappingURL=mother-mask.js.map