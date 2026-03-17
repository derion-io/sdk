"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateLoader = void 0;
const ethereum_multicall_1 = require("ethereum-multicall");
const ethers_1 = require("ethers");
class StateLoader {
    constructor(profile, provider) {
        this.profile = profile;
        this.provider = provider;
        this.mc = new ethereum_multicall_1.Multicall({ ethersProvider: this.provider, tryAggregate: true });
    }
    async update({ pools }) {
        const result = {};
        for (const [addr, pool] of Object.entries(pools ?? {})) {
            result[addr] = { ...pool };
        }
        const { abi, deployedBytecode: code } = this.profile.getAbi('View');
        this.provider.setStateOverride({
            [this.profile.configs.derivable.logic]: { code },
        });
        await this._multicall(Object.values(result).map((pool) => {
            const calls = [
                {
                    reference: 'compute',
                    methodName: 'compute',
                    methodParameters: [
                        this.profile.configs.derivable.token,
                        this.profile.configs.derivable.feeRate ?? 5,
                        0,
                        0, // twap and spot
                    ],
                },
            ];
            if (!pool.metadata) {
                calls.unshift({
                    reference: 'metadata',
                    methodName: 'metadata',
                    methodParameters: [],
                });
            }
            return {
                reference: pool.address,
                contractAddress: pool.address,
                abi,
                calls,
                context: (callsReturnContext) => {
                    for (const ret of callsReturnContext) {
                        if (ret.reference == 'compute') {
                            const [state, sA, sB, sC, rA, rB, rC, twap, spot] = ret.returnValues.map((v) => v.type == 'BigNumber' ? ethers_1.BigNumber.from(v.hex) : v);
                            if (!state)
                                continue;
                            const [R, a, b] = state.map((v) => (v.type == 'BigNumber' ? ethers_1.BigNumber.from(v.hex) : v));
                            pool.state = { R, a, b };
                            pool.view = { sA, sB, sC, rA, rB, rC, twap, spot };
                            continue;
                        }
                        if (ret.reference == 'metadata') {
                            const [config, reserve, base, quote] = ret.returnValues;
                            if (!config)
                                continue;
                            const [FETCHER, ORACLE, TOKEN_R, K, MARK, INTEREST_HL, PREMIUM_HL, OPEN_RATE, R_DT] = config.map((v) => (v.type == 'BigNumber' ? ethers_1.BigNumber.from(v.hex) : v));
                            pool.config = {
                                FETCHER,
                                ORACLE,
                                TOKEN_R,
                                K: K.toNumber(),
                                MARK,
                                INTEREST_HL: INTEREST_HL.toNumber(),
                                PREMIUM_HL: PREMIUM_HL.toNumber(),
                                OPEN_RATE,
                                R_DT: R_DT.toNumber(),
                                exp: this.profile.getExp(FETCHER),
                            };
                            pool.metadata = {
                                reserve: {
                                    address: reserve[0],
                                    symbol: reserve[1],
                                    decimals: parseInt(reserve[2].hex, 16),
                                },
                                base: {
                                    address: base[0],
                                    symbol: base[1],
                                    decimals: parseInt(base[2].hex, 16),
                                },
                                quote: {
                                    address: quote[0],
                                    symbol: quote[1],
                                    decimals: parseInt(quote[2].hex, 16),
                                },
                            };
                            continue;
                        }
                    }
                },
            };
        }));
        return result;
    }
    async _multicall(contexts) {
        const callbacks = {};
        for (const context of contexts) {
            if (callbacks[context.reference]) {
                throw new Error(`duplicated reference: ${context.reference}`);
            }
            callbacks[context.reference] = context.context;
            delete context.context;
        }
        const { results } = await this.mc.call(contexts);
        return Object.values(results).map((result) => {
            const callback = callbacks[result.originalContractCallContext.reference];
            if (callback != null && typeof callback === 'function') {
                return callback(result.callsReturnContext);
            }
        });
    }
}
exports.StateLoader = StateLoader;
//# sourceMappingURL=stateLoader.js.map