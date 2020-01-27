"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var simple_1 = require("./simple");
// import "setimmediate";
var MotherMask;
(function (MotherMask) {
    var MASKED = "masked";
    function process(value, pattern) {
        return simple_1.default.process(value, pattern);
    }
    MotherMask.process = process;
    function bind(input, pattern, callback) {
        if (callback === void 0) { callback = null; }
        var masked = input.getAttribute(MASKED);
        if (masked === null) {
            var strPattern = "";
            if (Array.isArray(pattern)) {
                strPattern = pattern.join("|");
            }
            else {
                strPattern = pattern;
            }
            input.setAttribute(MASKED, strPattern);
            simple_1.default.bind(input, pattern, callback);
        }
    }
    MotherMask.bind = bind;
})(MotherMask = exports.MotherMask || (exports.MotherMask = {}));
if (typeof window !== 'undefined') {
    window.MotherMask = MotherMask;
}
exports.default = MotherMask;
//# sourceMappingURL=main.js.map