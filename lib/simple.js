"use strict";
exports.__esModule = true;
// made by Danilo Celestino de Castro (dan2dev)
var utility_collection_1 = require("utility-collection");
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
                char: null
            };
            this.valueChar = {
                position: -1,
                char: null
            };
            this.value = value;
            this.mask = mask;
            this.caret = caret;
        }
        Mask.prototype.process = function () {
            if (utility_collection_1.Is.empty(this.value)) {
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
                    if (this.nextIValueChar(this.maskChar.char) && !utility_collection_1.Is.empty(this.valueChar.char)) {
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
                    if (utility_collection_1.Is.number(this.valueChar.char)) {
                        return true;
                    }
                }
                else if (type === Simple.CharType.LETTER) {
                    if (utility_collection_1.Is.letter(this.valueChar.char)) {
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
            setImmediate(function () {
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
                var isBackspace_1 = (e.key !== undefined) ? ("Backspace" === e.key || e.keyCode === 8) : true;
                var isDelete_1 = (e.key !== undefined) ? ("Delete" === e.key) : true;
                var isCharInsert_1 = (e.key !== undefined) ? (e.key.length === 1 && !e.ctrlKey && !e.altKey) : true;
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
exports["default"] = Simple;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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eUJBQ0Y7d0JBQ0QsSUFBSSxhQUFXLEVBQUU7NEJBQ2YsTUFBTSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQzt5QkFDeEQ7d0JBQ0QsSUFBSSxjQUFZLEVBQUU7NEJBQ2hCLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQzt5QkFDNUM7cUJBQ0Y7b0JBQ0QsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO3dCQUNwQixRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO3FCQUN4QjtvQkFDRCxxQkFBcUIsQ0FBQzt3QkFDcEIsU0FBUyxHQUFHLEtBQUssQ0FBQztvQkFDcEIsQ0FBQyxDQUFDLENBQUM7b0JBQ0gsTUFBTTtnQkFDUixDQUFDLENBQUMsQ0FBQzthQUNKO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBckdlLFdBQUksT0FxR25CLENBQUE7QUFDSCxDQUFDLEVBN09nQixNQUFNLEdBQU4sY0FBTSxLQUFOLGNBQU0sUUE2T3RCO0FBRUQscUJBQWUsTUFBTSxDQUFDIiwiZmlsZSI6InNpbXBsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIG1hZGUgYnkgRGFuaWxvIENlbGVzdGlubyBkZSBDYXN0cm8gKGRhbjJkZXYpXHJcbmltcG9ydCB7IElzIH0gZnJvbSBcInV0aWxpdHktY29sbGVjdGlvblwiO1xyXG5cclxuZXhwb3J0IG5hbWVzcGFjZSBTaW1wbGUge1xyXG4gIC8vIGRldGVjdCBpb3MgZm9yIGZpeFxyXG4gIGxldCBpc0lvczogYm9vbGVhbiB8IHVuZGVmaW5lZDtcclxuICBmdW5jdGlvbiBpb3MoKTogYm9vbGVhbiB7XHJcbiAgICBpZiAoaXNJb3MgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICByZXR1cm4gaXNJb3M7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpc0lvcyA9IC9pUGFkfGlQaG9uZXxpUG9kL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcclxuICAgICAgcmV0dXJuIGlzSW9zO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyAtLS0tLS1cclxuICBleHBvcnQgZW51bSBDaGFyVHlwZSB7IE5VTUJFUiwgTEVUVEVSIH1cclxuICBleHBvcnQgaW50ZXJmYWNlIElNYXNrQ2hhciB7XHJcbiAgICBwb3NpdGlvbjogbnVtYmVyO1xyXG4gICAgY2hhcjogc3RyaW5nIHwgbnVsbCB8IENoYXJUeXBlO1xyXG4gIH1cclxuICBleHBvcnQgaW50ZXJmYWNlIElWYWx1ZUNoYXIge1xyXG4gICAgcG9zaXRpb246IG51bWJlcjtcclxuICAgIGNoYXI6IHN0cmluZyB8IG51bGw7XHJcbiAgfVxyXG4gIC8vIC0tLS0tLS0tLS0tXHJcbiAgZXhwb3J0IGNsYXNzIE1hc2sge1xyXG4gICAgcHVibGljIGNhcmV0OiBudW1iZXIgPSAwO1xyXG4gICAgcHJpdmF0ZSBtYXNrOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIHZhbHVlOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIG1hc2tDaGFyOiBTaW1wbGUuSU1hc2tDaGFyID0ge1xyXG4gICAgICBwb3NpdGlvbjogLTEsXHJcbiAgICAgIGNoYXI6IG51bGwsXHJcbiAgICB9O1xyXG4gICAgcHJpdmF0ZSB2YWx1ZUNoYXI6IFNpbXBsZS5JVmFsdWVDaGFyID0ge1xyXG4gICAgICBwb3NpdGlvbjogLTEsXHJcbiAgICAgIGNoYXI6IG51bGwsXHJcbiAgICB9O1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBjb25zdHJ1Y3Rvcih2YWx1ZTogc3RyaW5nLCBtYXNrOiBzdHJpbmcsIGNhcmV0OiBudW1iZXIgPSAwKSB7XHJcbiAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcclxuICAgICAgdGhpcy5tYXNrID0gbWFzaztcclxuICAgICAgdGhpcy5jYXJldCA9IGNhcmV0O1xyXG4gICAgfVxyXG4gICAgcHVibGljIHByb2Nlc3MoKTogc3RyaW5nIHtcclxuICAgICAgaWYgKElzLmVtcHR5KHRoaXMudmFsdWUpKSB7XHJcbiAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgIH1cclxuICAgICAgbGV0IG91dHB1dDogc3RyaW5nID0gXCJcIjtcclxuICAgICAgY29uc3Qgb2xkQ2FyZXQ6IG51bWJlciA9IHRoaXMuY2FyZXQ7XHJcbiAgICAgIGNvbnN0IHNoYWRvd0xhdGVzdElNYXNrQ2hhcnM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgIHdoaWxlICh0aGlzLm5leHRJTWFza0NoYXIoKSkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5tYXNrQ2hhci5jaGFyID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICBzaGFkb3dMYXRlc3RJTWFza0NoYXJzLnB1c2godGhpcy5tYXNrQ2hhci5jaGFyKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgaWYgKHRoaXMubmV4dElWYWx1ZUNoYXIodGhpcy5tYXNrQ2hhci5jaGFyISkgJiYgIUlzLmVtcHR5KHRoaXMudmFsdWVDaGFyLmNoYXIpKSB7XHJcbiAgICAgICAgICAgIHdoaWxlIChzaGFkb3dMYXRlc3RJTWFza0NoYXJzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1hc2tDaGFyLnBvc2l0aW9uIDw9IHRoaXMuY2FyZXQgKyAxICYmXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1hc2tDaGFyLnBvc2l0aW9uID49IHRoaXMuY2FyZXRcclxuICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FyZXQrKztcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgb3V0cHV0ICs9IHNoYWRvd0xhdGVzdElNYXNrQ2hhcnMuc2hpZnQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvdXRwdXQgKz0gdGhpcy52YWx1ZUNoYXIuY2hhcjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG91dHB1dDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG5leHRJTWFza0NoYXIoKTogYm9vbGVhbiB7XHJcbiAgICAgIHRoaXMubWFza0NoYXIucG9zaXRpb24rKztcclxuICAgICAgaWYgKHRoaXMubWFza0NoYXIucG9zaXRpb24gPiB0aGlzLm1hc2subGVuZ3RoKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIHdoYXQgdG8gcmV0dXJuXHJcbiAgICAgICAgdGhpcy5tYXNrQ2hhci5jaGFyID0gdGhpcy5tYXNrLmNoYXJBdCh0aGlzLm1hc2tDaGFyLnBvc2l0aW9uKTtcclxuICAgICAgICBpZiAodGhpcy5tYXNrQ2hhci5jaGFyID09PSBcIjlcIikge1xyXG4gICAgICAgICAgdGhpcy5tYXNrQ2hhci5jaGFyID0gU2ltcGxlLkNoYXJUeXBlLk5VTUJFUjtcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMubWFza0NoYXIuY2hhciA9PT0gXCJaXCIpIHtcclxuICAgICAgICAgIHRoaXMubWFza0NoYXIuY2hhciA9IFNpbXBsZS5DaGFyVHlwZS5MRVRURVI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyB2YWx1ZVxyXG5cclxuICAgIHByaXZhdGUgbmV4dElWYWx1ZUNoYXIodHlwZTogU2ltcGxlLkNoYXJUeXBlKTogc3RyaW5nIHwgYm9vbGVhbiB7XHJcbiAgICAgIHRoaXMudmFsdWVDaGFyLnBvc2l0aW9uKys7XHJcbiAgICAgIGlmICh0aGlzLnZhbHVlQ2hhci5wb3NpdGlvbiA+IHRoaXMudmFsdWUubGVuZ3RoKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMudmFsdWVDaGFyLmNoYXIgPSB0aGlzLnZhbHVlLmNoYXJBdCh0aGlzLnZhbHVlQ2hhci5wb3NpdGlvbik7XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IFNpbXBsZS5DaGFyVHlwZS5OVU1CRVIpIHtcclxuICAgICAgICAgIGlmIChJcy5udW1iZXIodGhpcy52YWx1ZUNoYXIuY2hhcikpIHsgcmV0dXJuIHRydWU7IH1cclxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFNpbXBsZS5DaGFyVHlwZS5MRVRURVIpIHtcclxuICAgICAgICAgIGlmIChJcy5sZXR0ZXIodGhpcy52YWx1ZUNoYXIuY2hhcikpIHsgcmV0dXJuIHRydWU7IH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubmV4dElWYWx1ZUNoYXIodHlwZSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgfVxyXG5cclxuICBleHBvcnQgZnVuY3Rpb24gcHJvY2Vzcyh2YWx1ZTogc3RyaW5nLCBtYXNrOiBzdHJpbmcgfCBzdHJpbmdbXSkge1xyXG4gICAgY29uc3QgbSA9IG1hc2tCdWlsZGVyKHZhbHVlLCBtYXNrKTtcclxuICAgIHJldHVybiBtLnByb2Nlc3MoKTtcclxuICB9XHJcbiAgZnVuY3Rpb24gZ2V0TWFza1N0cmluZyh2YWx1ZTogc3RyaW5nLCBtYXNrOiBzdHJpbmcgfCBzdHJpbmdbXSkge1xyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkobWFzaykpIHtcclxuICAgICAgbGV0IGk6IG51bWJlciA9IDA7XHJcbiAgICAgIHdoaWxlICh2YWx1ZS5sZW5ndGggPiBtYXNrW2ldLmxlbmd0aCAmJiBpIDwgbWFzay5sZW5ndGgpIHtcclxuICAgICAgICBpKys7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG1hc2tbaV07XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gbWFzaztcclxuICAgIH1cclxuICB9XHJcbiAgZnVuY3Rpb24gZ2V0TWF4TGVuZ3RoKG1hc2s6IHN0cmluZyB8IHN0cmluZ1tdKTogbnVtYmVyIHtcclxuICAgIGxldCBtYXhMZW5ndGg6IG51bWJlciA9IDA7XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShtYXNrKSkge1xyXG4gICAgICBtYXNrLmZvckVhY2goKG0pID0+IHtcclxuICAgICAgICBpZiAobWF4TGVuZ3RoIDwgbS5sZW5ndGgpIHtcclxuICAgICAgICAgIG1heExlbmd0aCA9IG0ubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBtYXhMZW5ndGggPSBtYXNrLmxlbmd0aDtcclxuICAgIH1cclxuICAgIHJldHVybiBtYXhMZW5ndGg7XHJcbiAgfVxyXG4gIGV4cG9ydCBmdW5jdGlvbiBtYXNrQnVpbGRlcih2YWx1ZTogc3RyaW5nLCBtYXNrOiBzdHJpbmcgfCBzdHJpbmdbXSwgY2FyZXQ6IG51bWJlciA9IDApOiBNYXNrIHtcclxuICAgIHJldHVybiBuZXcgTWFzayh2YWx1ZSwgZ2V0TWFza1N0cmluZyh2YWx1ZSwgbWFzayksIGNhcmV0KTtcclxuICB9XHJcbiAgbGV0IGxvY2tJbnB1dDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gIGV4cG9ydCBmdW5jdGlvbiBiaW5kKFxyXG4gICAgaW5wdXRFbGVtZW50OiBIVE1MSW5wdXRFbGVtZW50IHwgRWxlbWVudCxcclxuICAgIG1hc2s6IHN0cmluZyB8IHN0cmluZ1tdLFxyXG4gICAgY2FsbGJhY2s6ICgob3V0cHV0OiBzdHJpbmcpID0+IHZvaWQpIHwgbnVsbCA9IG51bGwpIHtcclxuICAgIGlucHV0RWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJhdXRvY29tcGxldGVcIiwgXCJvZmZcIik7XHJcbiAgICBpbnB1dEVsZW1lbnQuc2V0QXR0cmlidXRlKFwiYXV0b2NvcnJlY3RcIiwgXCJvZmZcIik7XHJcbiAgICBpbnB1dEVsZW1lbnQuc2V0QXR0cmlidXRlKFwiYXV0b2NhcGl0YWxpemVcIiwgXCJvZmZcIik7XHJcbiAgICBpbnB1dEVsZW1lbnQuc2V0QXR0cmlidXRlKFwic3BlbGxjaGVja1wiLCBcImZhbHNlXCIpO1xyXG5cclxuICAgIGlucHV0RWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJtYXhsZW5ndGhcIiwgZ2V0TWF4TGVuZ3RoKG1hc2spLnRvU3RyaW5nKCkpO1xyXG4gICAgaW5wdXRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJwYXN0ZVwiLCAoZTogRXZlbnQpID0+IHtcclxuICAgICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXQudmFsdWUudG9TdHJpbmcoKTtcclxuICAgICAgc2V0SW1tZWRpYXRlKCgpID0+IHtcclxuICAgICAgICAvLyB0YXJnZXQudmFsdWUgPSBwcm9jZXNzKHRhcmdldC52YWx1ZSwgbWFzayk7XHJcbiAgICAgICAgY29uc3QgbSA9IG1hc2tCdWlsZGVyKHRhcmdldC52YWx1ZSwgbWFzayk7XHJcbiAgICAgICAgdGFyZ2V0LnZhbHVlID0gbS5wcm9jZXNzKCk7XHJcbiAgICAgICAgaWYgKGNhbGxiYWNrICE9IG51bGwpIHtcclxuICAgICAgICAgIGNhbGxiYWNrKHRhcmdldC52YWx1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gICAgaW5wdXRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoKGlvcygpID8gXCJrZXl1cFwiIDogXCJrZXlkb3duXCIpLCAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG5cclxuICAgICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudDtcclxuXHJcbiAgICAgIGlmIChlLmtleSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgbG9ja0lucHV0ID0gdHJ1ZTtcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xyXG4gICAgICAgICAgY29uc3Qgc2VsU3RhcnRBZnRlciA9IHRhcmdldC5zZWxlY3Rpb25TdGFydCB8fCA5OTk7XHJcbiAgICAgICAgICBjb25zdCBtID0gbWFza0J1aWxkZXIodGFyZ2V0LnZhbHVlLCBtYXNrLCBzZWxTdGFydEFmdGVyKTtcclxuICAgICAgICAgIHRhcmdldC52YWx1ZSA9IG0ucHJvY2VzcygpO1xyXG4gICAgICAgICAgaWYgKGUud2hpY2ggPT09IDgpIHtcclxuICAgICAgICAgICAgdGFyZ2V0LnNldFNlbGVjdGlvblJhbmdlKHNlbFN0YXJ0QWZ0ZXIsIHNlbFN0YXJ0QWZ0ZXIpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGFyZ2V0LnNldFNlbGVjdGlvblJhbmdlKG0uY2FyZXQsIG0uY2FyZXQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcclxuICAgICAgICAgICAgbG9ja0lucHV0ID0gZmFsc2U7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldC52YWx1ZS50b1N0cmluZygpO1xyXG4gICAgICAgIC8vIGNoYXJzIC0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgICBjb25zdCBpc0JhY2tzcGFjZSA9IChlLmtleSAhPT0gdW5kZWZpbmVkKSA/IChcIkJhY2tzcGFjZVwiID09PSBlLmtleSB8fCBlLmtleUNvZGUgPT09IDgpIDogdHJ1ZTtcclxuICAgICAgICBjb25zdCBpc0RlbGV0ZSA9IChlLmtleSAhPT0gdW5kZWZpbmVkKSA/IChcIkRlbGV0ZVwiID09PSBlLmtleSkgOiB0cnVlO1xyXG4gICAgICAgIGNvbnN0IGlzQ2hhckluc2VydCA9IChlLmtleSAhPT0gdW5kZWZpbmVkKSA/IChlLmtleS5sZW5ndGggPT09IDEgJiYgIWUuY3RybEtleSAmJiAhZS5hbHRLZXkpIDogdHJ1ZTtcclxuICAgICAgICBjb25zdCBpc1VuaWRlbnRpZmllZCA9IChlLmtleSAhPT0gdW5kZWZpbmVkKSA/IChlLmtleSA9PT0gXCJVbmlkZW50aWZpZWRcIikgOiBmYWxzZTtcclxuICAgICAgICAvLyBkb24ndCBhbGxvdyB0byBpbnNlcnQgbW9yZSBpZiBpdCdzIGZ1bGxcclxuICAgICAgICBpZiAoaXNDaGFySW5zZXJ0ICYmIHRhcmdldC5zZWxlY3Rpb25TdGFydCA9PT0gdGFyZ2V0LnNlbGVjdGlvbkVuZCkge1xyXG4gICAgICAgICAgaWYgKG9sZFZhbHVlLmxlbmd0aCA+PSBnZXRNYXhMZW5ndGgobWFzaykpIHtcclxuICAgICAgICAgICAgaWYgKCFpb3MoKSkge1xyXG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGxvY2tJbnB1dCkge1xyXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsb2NrSW5wdXQgPSB0cnVlO1xyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBzZWxTdGFydEFmdGVyID0gdGFyZ2V0LnNlbGVjdGlvblN0YXJ0IHx8IDk5OTtcclxuICAgICAgICAgIC8vIGNvbnN0IG0gPSAgbmV3IE1hc2sodGFyZ2V0LnZhbHVlLCBtYXNrLCBzZWxTdGFydEFmdGVyKTtcclxuICAgICAgICAgIGNvbnN0IG0gPSBtYXNrQnVpbGRlcih0YXJnZXQudmFsdWUsIG1hc2ssIHNlbFN0YXJ0QWZ0ZXIpO1xyXG4gICAgICAgICAgdGFyZ2V0LnZhbHVlID0gbS5wcm9jZXNzKCk7XHJcbiAgICAgICAgICAvLyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xyXG4gICAgICAgICAgdGFyZ2V0LnZhbHVlID0gdGFyZ2V0LnZhbHVlO1xyXG4gICAgICAgICAgLy8gZml4IGNhcmV0IHBvc2l0aW9uXHJcbiAgICAgICAgICBpZiAoaXNVbmlkZW50aWZpZWQpIHtcclxuICAgICAgICAgICAgaWYgKHRhcmdldC52YWx1ZS5sZW5ndGggPiBvbGRWYWx1ZS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICB0YXJnZXQuc2V0U2VsZWN0aW9uUmFuZ2UobS5jYXJldCwgbS5jYXJldCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgdGFyZ2V0LnNldFNlbGVjdGlvblJhbmdlKHNlbFN0YXJ0QWZ0ZXIsIHNlbFN0YXJ0QWZ0ZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAoaXNEZWxldGUpIHtcclxuICAgICAgICAgICAgICBpZiAob2xkVmFsdWUubGVuZ3RoID09PSB0YXJnZXQudmFsdWUubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQuc2V0U2VsZWN0aW9uUmFuZ2Uoc2VsU3RhcnRBZnRlciArIDEsIHNlbFN0YXJ0QWZ0ZXIgKyAxKTtcclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0LnNldFNlbGVjdGlvblJhbmdlKHNlbFN0YXJ0QWZ0ZXIsIHNlbFN0YXJ0QWZ0ZXIpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoaXNCYWNrc3BhY2UpIHtcclxuICAgICAgICAgICAgICB0YXJnZXQuc2V0U2VsZWN0aW9uUmFuZ2Uoc2VsU3RhcnRBZnRlciwgc2VsU3RhcnRBZnRlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGlzQ2hhckluc2VydCkge1xyXG4gICAgICAgICAgICAgIHRhcmdldC5zZXRTZWxlY3Rpb25SYW5nZShtLmNhcmV0LCBtLmNhcmV0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9IG51bGwpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2sodGFyZ2V0LnZhbHVlKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XHJcbiAgICAgICAgICAgIGxvY2tJbnB1dCA9IGZhbHNlO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICAvLyB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBTaW1wbGU7XHJcbiJdfQ==
