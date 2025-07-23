"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DerionSDK = void 0;
const profile_1 = require("./profile");
const account_1 = require("./account");
const stateLoader_1 = require("./stateLoader");
const logs_1 = require("./utils/logs");
const swapper_1 = require("./swapper");
const positions_1 = require("./utils/positions");
class DerionSDK {
    constructor(configs) {
        this.extractLogs = (txLogs) => {
            return {
                poolAddresses: (0, logs_1.extractPoolAddresses)(txLogs, this.profile.configs.derivable.token),
            };
        };
        this.createSwapper = (url, network) => {
            return new swapper_1.Swapper(this.profile.configs, this.profile, url, network);
        };
        this.calcPositionState = (position, pools, currentPriceR = position.priceR, balance = position.balance) => {
            return (0, positions_1.calcPositionState)(position, pools, currentPriceR, balance);
        };
        this.profile = new profile_1.Profile(configs);
    }
    async init() {
        await this.profile.loadConfig();
    }
    getStateLoader(url, network) {
        return (this.stateLoader = this.stateLoader ?? new stateLoader_1.StateLoader(this.profile, url, network));
    }
    createAccount(address, signer) {
        return new account_1.Account(this.profile, address, signer);
    }
    importPools(pools, poolAddresses) {
        poolAddresses.forEach((address) => {
            if (!pools[address]) {
                pools[address] = { address };
            }
        });
    }
}
exports.DerionSDK = DerionSDK;
//# sourceMappingURL=sdk.js.map