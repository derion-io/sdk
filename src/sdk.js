"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DerionSDK = void 0;
const providers_1 = require("@ethersproject/providers");
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
        this.createSwapper = (providerOrUrl, network) => {
            const provider = providerOrUrl instanceof providers_1.JsonRpcProvider
                ? providerOrUrl
                : new providers_1.JsonRpcProvider(providerOrUrl, network);
            return new swapper_1.Swapper(this.profile, provider);
        };
        this.calcPositionState = (position, pools, currentPriceR = position.priceR, balance = position.balance) => {
            return (0, positions_1.calcPositionState)(position, pools, currentPriceR, balance);
        };
        this.profile = new profile_1.Profile(configs);
    }
    async init(fetcher) {
        await this.profile.loadConfig(fetcher);
    }
    getStateLoader(providerOrUrl, network) {
        const provider = providerOrUrl instanceof providers_1.JsonRpcProvider
            ? providerOrUrl
            : new providers_1.JsonRpcProvider(providerOrUrl, network);
        this.stateLoader = new stateLoader_1.StateLoader(this.profile, provider);
        return this.stateLoader;
    }
    createAccount(address, signer) {
        return new account_1.Account(this.profile.configs.derivable.token, address, signer);
    }
    importPools(pools, poolAddresses) {
        const result = { ...pools };
        poolAddresses.forEach((address) => {
            if (!result[address]) {
                result[address] = { address };
            }
        });
        return result;
    }
}
exports.DerionSDK = DerionSDK;
//# sourceMappingURL=sdk.js.map