"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Account = void 0;
const logs_1 = require("./utils/logs");
class Account {
    constructor(profile, address, signer) {
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
            (0, logs_1.processLogs)(this.positions, this.transitions, this.balances, this.allowances, txLogs, pools, this.profile.configs.derivable.token, this.address);
            const lastTx = txLogs[txLogs.length - 1];
            const lastLog = lastTx[lastTx.length - 1];
            this.blockNumber = lastLog.blockNumber;
            this.logIndex = lastLog.logIndex;
        };
        this.profile = profile;
        this.address = address;
        this.signer = signer;
    }
}
exports.Account = Account;
//# sourceMappingURL=account.js.map