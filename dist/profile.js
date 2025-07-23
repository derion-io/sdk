"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Profile = void 0;
const Helper_json_1 = __importDefault(require("./abi/Helper.json"));
const View_json_1 = __importDefault(require("./abi/View.json"));
const UTROverride_json_1 = __importDefault(require("./abi/UTROverride.json"));
const abis = {
    Helper: Helper_json_1.default,
    View: View_json_1.default,
    UTROverride: UTROverride_json_1.default,
};
const CONFIGS_URL = {
    development: 'https://raw.githubusercontent.com/derion-io/configs/v3-dev/',
    production: 'https://raw.githubusercontent.com/derion-io/configs/v3/',
};
class Profile {
    constructor(configs) {
        this.chainId = configs.chainId;
        this.env = configs.env || 'development';
    }
    async loadConfig() {
        const [networkConfig, uniV3Pools, whitelistPools] = await Promise.all([
            fetch(CONFIGS_URL[this.env] + this.chainId + '/network.json')
                .then((r) => r.json())
                .catch(() => []),
            fetch(CONFIGS_URL[this.env] + this.chainId + '/routes.json')
                .then((r) => r.json())
                .catch(() => []),
            fetch(CONFIGS_URL[this.env] + this.chainId + '/pools.json')
                .then((r) => r.json())
                .catch(() => []),
        ]);
        this.configs = networkConfig;
        this.routes = uniV3Pools;
        this.whitelistPools = whitelistPools;
    }
    getAbi(name) {
        return abis[name] ? abis[name] : abis[this.chainId][name] || [];
    }
}
exports.Profile = Profile;
//# sourceMappingURL=profile.js.map