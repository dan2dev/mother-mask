"use strict";
exports.__esModule = true;
var simple_1 = require("./simple");
var MotherMask;
(function (MotherMask) {
    var MASKED = "masked";
    function process(value, pattern) {
        return simple_1["default"].process(value, pattern);
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
            simple_1["default"].bind(input, pattern, callback);
        }
    }
    MotherMask.bind = bind;
})(MotherMask = exports.MotherMask || (exports.MotherMask = {}));
if (window !== undefined) {
    window.MotherMask = MotherMask;
}
exports["default"] = MotherMask;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsbUNBQThCO0FBQzlCLElBQWlCLFVBQVUsQ0FxQjFCO0FBckJELFdBQWlCLFVBQVU7SUFDekIsSUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDO0lBQ3hCLGlCQUF3QixLQUFhLEVBQUUsT0FBMEI7UUFDL0QsT0FBTyxtQkFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUZlLGtCQUFPLFVBRXRCLENBQUE7SUFDRCxjQUNFLEtBQStDLEVBQy9DLE9BQTBCLEVBQzFCLFFBQWlEO1FBQWpELHlCQUFBLEVBQUEsZUFBaUQ7UUFDL0MsSUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQyxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7WUFDbkIsSUFBSSxVQUFVLEdBQVcsRUFBRSxDQUFDO1lBQzVCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDMUIsVUFBVSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDaEM7aUJBQU07Z0JBQ0wsVUFBVSxHQUFHLE9BQU8sQ0FBQzthQUN0QjtZQUNELEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZDLG1CQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDdkM7SUFDTCxDQUFDO0lBZmUsZUFBSSxPQWVuQixDQUFBO0FBQ0gsQ0FBQyxFQXJCZ0IsVUFBVSxHQUFWLGtCQUFVLEtBQVYsa0JBQVUsUUFxQjFCO0FBQ0QsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO0lBQ3ZCLE1BQWMsQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0NBQ3pDO0FBQ0QscUJBQWUsVUFBVSxDQUFDIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgU2ltcGxlIGZyb20gXCIuL3NpbXBsZVwiO1xyXG5leHBvcnQgbmFtZXNwYWNlIE1vdGhlck1hc2sge1xyXG4gIGNvbnN0IE1BU0tFRCA9IFwibWFza2VkXCI7XHJcbiAgZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3ModmFsdWU6IHN0cmluZywgcGF0dGVybjogc3RyaW5nIHwgc3RyaW5nW10pOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIFNpbXBsZS5wcm9jZXNzKHZhbHVlLCBwYXR0ZXJuKTtcclxuICB9XHJcbiAgZXhwb3J0IGZ1bmN0aW9uIGJpbmQoXHJcbiAgICBpbnB1dDogSFRNTElucHV0RWxlbWVudCB8IEhUTUxFbGVtZW50IHwgRWxlbWVudCxcclxuICAgIHBhdHRlcm46IHN0cmluZyB8IHN0cmluZ1tdLFxyXG4gICAgY2FsbGJhY2s6ICgodmFsdWU6IHN0cmluZykgPT4gdm9pZCkgfCBudWxsID0gbnVsbCk6IHZvaWQge1xyXG4gICAgICBjb25zdCBtYXNrZWQgPSBpbnB1dC5nZXRBdHRyaWJ1dGUoTUFTS0VEKTtcclxuICAgICAgaWYgKG1hc2tlZCA9PT0gbnVsbCkge1xyXG4gICAgICAgIGxldCBzdHJQYXR0ZXJuOiBzdHJpbmcgPSBcIlwiO1xyXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHBhdHRlcm4pKSB7XHJcbiAgICAgICAgICBzdHJQYXR0ZXJuID0gcGF0dGVybi5qb2luKFwifFwiKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgc3RyUGF0dGVybiA9IHBhdHRlcm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlucHV0LnNldEF0dHJpYnV0ZShNQVNLRUQsIHN0clBhdHRlcm4pO1xyXG4gICAgICAgIFNpbXBsZS5iaW5kKGlucHV0LCBwYXR0ZXJuLCBjYWxsYmFjayk7XHJcbiAgICAgIH1cclxuICB9XHJcbn1cclxuaWYgKHdpbmRvdyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgKHdpbmRvdyBhcyBhbnkpLk1vdGhlck1hc2sgPSBNb3RoZXJNYXNrO1xyXG59XHJcbmV4cG9ydCBkZWZhdWx0IE1vdGhlck1hc2s7XHJcbiJdfQ==
