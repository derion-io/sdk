"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Account = void 0;
const logs_1 = require("./utils/logs");
class Account {
    constructor(tokenDerion, address, signer) {
        this.blockNumber = 0;
        this.logIndex = 0;
        this.positions = {};
        this.transitions = [];
        this.balances = {};
        this.allowances = {};
        this.processLogs = async (txLogs, pools = {}) => {
            txLogs = txLogs.filter((logs) => logs.some((log) => log.blockNumber > this.blockNumber || (log.blockNumber == this.blockNumber && log.logIndex > this.logIndex)));
            if (!txLogs.length) {
                return;
            }
            const result = (0, logs_1.processLogs)(this.getState(), txLogs, pools, this.tokenDerion, this.address);
            this.positions = result.positions;
            this.transitions = result.transitions;
            this.balances = result.balances;
            this.allowances = result.allowances;
            const lastTx = txLogs[txLogs.length - 1];
            const lastLog = lastTx[lastTx.length - 1];
            this.blockNumber = lastLog.blockNumber;
            this.logIndex = lastLog.logIndex;
        };
        this.tokenDerion = tokenDerion;
        this.address = address;
        this.signer = signer;
    }
    getState() {
        return {
            positions: this.positions,
            transitions: this.transitions,
            balances: this.balances,
            allowances: this.allowances,
        };
    }
}
exports.Account = Account;
//# sourceMappingURL=account.js.map