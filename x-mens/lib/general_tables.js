function define(name, value) {
    Object.defineProperty(exports, name, {
        value: value,
        enumerable: true,
        writable: false,
        configurable: true
    });
};

exports.setGeneralTable = function(name, value) {
    define(name, value);
}