"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Profile = void 0;
const Helper_json_1 = __importDefault(require("./abi/Helper.json"));
const View_json_1 = __importDefault(require("./abi/View.json"));
const UTROverride_json_1 = __importDefault(require("./abi/UTROverride.json"));
const type_1 = require("./type");
const abis = {
    Helper: Helper_json_1.default,
    View: View_json_1.default,
    UTROverride: UTROverride_json_1.default,
};
const CONFIGS_URL = {
    development: 'https://raw.githubusercontent.com/derion-io/configs/v3-dev/',
    production: 'https://raw.githubusercontent.com/derion-io/configs/v3/',
};
const defaultFetcher = (url) => fetch(url).then((r) => r.json());
class Profile {
    constructor(configs) {
        this.chainId = configs.chainId;
        this.env = configs.env || 'development';
    }
    async loadConfig(fetcher = defaultFetcher) {
        const baseURL = CONFIGS_URL[this.env];
        const [networkConfig, uniV3Pools, whitelistPools] = await Promise.all([
            fetcher(baseURL + this.chainId + '/network.json').catch(() => null),
            fetcher(baseURL + this.chainId + '/routes.json').catch(() => ({})),
            fetcher(baseURL + this.chainId + '/pools.json').catch(() => []),
        ]);
        this.configs = this.validateConfig(networkConfig);
        this.routes = uniV3Pools;
        this.whitelistPools = whitelistPools;
    }
    validateConfig(config) {
        if (!config || typeof config !== 'object') {
            throw new type_1.DerionError('Failed to load network config', 'CONFIG_LOAD_FAILED');
        }
        const checks = [
            ['derivable.token', config.derivable?.token],
            ['derivable.logic', config.derivable?.logic],
            ['derivable.stateCalHelper', config.derivable?.stateCalHelper],
            ['helperContract.utr', config.helperContract?.utr],
            ['wrappedTokenAddress', config.wrappedTokenAddress],
            ['stablecoins', config.stablecoins],
        ];
        const missing = checks.filter(([, v]) => !v).map(([k]) => k);
        if (missing.length) {
            throw new type_1.DerionError(`Invalid config: missing ${missing.join(', ')}`, 'CONFIG_INVALID');
        }
        return config;
    }
    getAbi(name) {
        return abis[name] ? abis[name] : abis[this.chainId]?.[name] || [];
    }
    getExp(fetcher) {
        return this.configs?.fetchers?.[fetcher]?.type?.endsWith('3') ? 2 : 1;
    }
}
exports.Profile = Profile;
//# sourceMappingURL=profile.js.map