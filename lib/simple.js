// Made by Danilo Celestino de Castro (dan2dev)
import { Is } from "utility-collection";
export var Simple;
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
                    if (Is.number(this.valueChar.char))
                        return true;
                }
                else if (type === Simple.CharType.LETTER) {
                    if (Is.letter(this.valueChar.char))
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
                    if (this.nextValueChar(this.maskChar.char) && !Is.empty(this.valueChar.char)) {
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
export default Simple;
//# sourceMappingURL=simple.js.map