import Simple from "./simple";
export var MotherMask;
(function (MotherMask) {
    function process(value, pattern) {
        return Simple.process(value, pattern);
    }
    MotherMask.process = process;
    function bind(input, pattern, callback = null) {
        Simple.bind(input, pattern, callback);
    }
    MotherMask.bind = bind;
})(MotherMask || (MotherMask = {}));
if (window !== undefined) {
    window.MotherMask = MotherMask;
}
export default MotherMask;
//# sourceMappingURL=main.js.map