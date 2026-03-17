"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DerionError = void 0;
class DerionError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'DerionError';
        this.code = code;
    }
}
exports.DerionError = DerionError;
//# sourceMappingURL=index.js.map