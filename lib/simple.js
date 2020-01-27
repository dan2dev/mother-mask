"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// made by Danilo Celestino de Castro (dan2dev)
// import { Is } from "utility-collection/src/is";
var Is;
(function (Is) {
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
})(Is = exports.Is || (exports.Is = {}));
var Simple;
(function (Simple) {
    // detect ios for fix
    var isIos;
    function ios() {
        if (isIos !== undefined) {
            return isIos;
        }
        else {
            isIos = /iPad|iPhone|iPod/i.test(navigator.userAgent);
            return isIos;
        }
    }
    // ------
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
        Mask.prototype.process = function () {
            if (Is.empty(this.value)) {
                return "";
            }
            var output = "";
            var oldCaret = this.caret;
            var shadowLatestIMaskChars = [];
            while (this.nextIMaskChar()) {
                if (typeof this.maskChar.char === "string") {
                    shadowLatestIMaskChars.push(this.maskChar.char);
                }
                else {
                    if (this.nextIValueChar(this.maskChar.char) && !Is.empty(this.valueChar.char)) {
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
        };
        Mask.prototype.nextIMaskChar = function () {
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
        // value
        Mask.prototype.nextIValueChar = function (type) {
            this.valueChar.position++;
            if (this.valueChar.position > this.value.length) {
                return false;
            }
            else {
                this.valueChar.char = this.value.charAt(this.valueChar.position);
                if (type === Simple.CharType.NUMBER) {
                    if (Is.number(this.valueChar.char)) {
                        return true;
                    }
                }
                else if (type === Simple.CharType.LETTER) {
                    if (Is.letter(this.valueChar.char)) {
                        return true;
                    }
                }
                return this.nextIValueChar(type);
            }
        };
        return Mask;
    }());
    Simple.Mask = Mask;
    function process(value, mask) {
        var m = maskBuilder(value, mask);
        return m.process();
    }
    Simple.process = process;
    function getMaskString(value, mask) {
        if (Array.isArray(mask)) {
            var i = 0;
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
        var maxLength = 0;
        if (Array.isArray(mask)) {
            mask.forEach(function (m) {
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
    function maskBuilder(value, mask, caret) {
        if (caret === void 0) { caret = 0; }
        return new Mask(value, getMaskString(value, mask), caret);
    }
    Simple.maskBuilder = maskBuilder;
    var lockInput = false;
    function bind(inputElement, mask, callback) {
        if (callback === void 0) { callback = null; }
        inputElement.setAttribute("autocomplete", "off");
        inputElement.setAttribute("autocorrect", "off");
        inputElement.setAttribute("autocapitalize", "off");
        inputElement.setAttribute("spellcheck", "false");
        inputElement.setAttribute("maxlength", getMaxLength(mask).toString());
        inputElement.addEventListener("paste", function (e) {
            var target = e.target;
            var oldValue = target.value.toString();
            requestAnimationFrame(function () {
                // target.value = process(target.value, mask);
                var m = maskBuilder(target.value, mask);
                target.value = m.process();
                if (callback != null) {
                    callback(target.value);
                }
            });
        });
        inputElement.addEventListener((ios() ? "keyup" : "keydown"), function (e) {
            var target = e.target;
            if (e.key === undefined) {
                lockInput = true;
                requestAnimationFrame(function () {
                    var selStartAfter = target.selectionStart || 999;
                    var m = maskBuilder(target.value, mask, selStartAfter);
                    target.value = m.process();
                    if (e.which === 8) {
                        target.setSelectionRange(selStartAfter, selStartAfter);
                    }
                    else {
                        target.setSelectionRange(m.caret, m.caret);
                    }
                    requestAnimationFrame(function () {
                        lockInput = false;
                    });
                });
            }
            else {
                var oldValue_1 = target.value.toString();
                // chars -------------------
                var isMeta = (e.key !== undefined) ? ("Meta" === e.key) : true;
                var isBackspace_1 = (e.key !== undefined) ? ("Backspace" === e.key || e.keyCode === 8) : true;
                var isDelete_1 = (e.key !== undefined) ? ("Delete" === e.key) : true;
                var isCharInsert_1 = (e.key !== undefined) ? (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) : true;
                var isUnidentified_1 = (e.key !== undefined) ? (e.key === "Unidentified") : false;
                // don't allow to insert more if it's full
                if (isCharInsert_1 && target.selectionStart === target.selectionEnd) {
                    if (oldValue_1.length >= getMaxLength(mask)) {
                        if (!ios()) {
                            e.preventDefault();
                            return false;
                        }
                    }
                }
                if (lockInput) {
                    e.preventDefault();
                    return;
                }
                lockInput = true;
                requestAnimationFrame(function () {
                    var selStartAfter = target.selectionStart || 999;
                    // const m =  new Mask(target.value, mask, selStartAfter);
                    var m = maskBuilder(target.value, mask, selStartAfter);
                    target.value = m.process();
                    // requestAnimationFrame(() => {
                    target.value = target.value;
                    // fix caret position
                    if (isUnidentified_1) {
                        if (target.value.length > oldValue_1.length) {
                            target.setSelectionRange(m.caret, m.caret);
                        }
                        else {
                            target.setSelectionRange(selStartAfter, selStartAfter);
                        }
                    }
                    else {
                        if (isDelete_1) {
                            if (oldValue_1.length === target.value.length) {
                                target.setSelectionRange(selStartAfter + 1, selStartAfter + 1);
                            }
                            else {
                                target.setSelectionRange(selStartAfter, selStartAfter);
                            }
                        }
                        if (isBackspace_1) {
                            target.setSelectionRange(selStartAfter, selStartAfter);
                        }
                        if (isCharInsert_1) {
                            target.setSelectionRange(m.caret, m.caret);
                        }
                    }
                    if (callback != null) {
                        callback(target.value);
                    }
                    requestAnimationFrame(function () {
                        lockInput = false;
                    });
                    // });
                });
            }
        });
    }
    Simple.bind = bind;
})(Simple = exports.Simple || (exports.Simple = {}));
exports.default = Simple;
//# sourceMappingURL=simple.js.map