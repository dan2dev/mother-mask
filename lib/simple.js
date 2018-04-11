// made by Danilo Celestino de Castro (dan2dev)
import { Is } from "utility-collection";
import "setimmediate";
export var Simple;
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
            if (Is.empty(this.value)) {
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
export default Simple;
//# sourceMappingURL=simple.js.map