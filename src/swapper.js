"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Swapper = void 0;
const providers_1 = require("@ethersproject/providers");
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const constant_1 = require("./utils/constant");
const paraswap_1 = require("./paraswap");
const utils_2 = require("./utils");
const routes_1 = require("./utils/routes");
const type_1 = require("./type");
const { AddressZero } = ethers_1.ethers.constants;
const PAYMENT = 0;
const TRANSFER = 1;
const CALL_VALUE = 2;
class Swapper {
    constructor(profile, provider, overrideProvider, paraswap) {
        this.swap = async ({ tokenIn, amount, tokenOut, amountOutMin = 0, deps, gasLimit, }) => {
            gasLimit = gasLimit ?? (0, utils_2.bn)(5000000);
            return await this.multiSwap({
                steps: [
                    {
                        tokenIn,
                        tokenOut,
                        amountIn: (0, utils_2.bn)(amount),
                        amountOutMin,
                        useSweep: false,
                    },
                ],
                gasLimit,
                deps,
            });
        };
        this.simulate = async ({ tokenIn, tokenOut, amount, account, deps, gasLimit, }) => {
            const address = account
                ?? (deps.signer ? await deps.signer.getAddress() : AddressZero);
            gasLimit = gasLimit ?? (0, utils_2.bn)(5000000);
            const tx = await this.multiSwap({
                steps: [
                    {
                        tokenIn,
                        tokenOut,
                        amountIn: (0, utils_2.bn)(amount),
                        amountOutMin: 0,
                        useSweep: false,
                    },
                ],
                gasLimit,
                callStatic: true,
                deps: {
                    ...deps,
                    signer: deps.signer ?? new ethers_1.VoidSigner(address, this.overrideProvider),
                },
            });
            const gasLeft = tx.gasLeft;
            const gasUsed = gasLimit.sub(gasLeft).toNumber();
            return {
                amountOuts: tx.amountOuts,
                gasUsed,
                gasLeft,
            };
        };
        this.profile = profile;
        this.provider = provider;
        this.overrideProvider = overrideProvider ?? new providers_1.JsonRpcProvider(provider.connection, provider.network);
        this.setupOverride();
        this.helperContract = new ethers_1.Contract(this.profile.configs.derivable.stateCalHelper, this.profile.getAbi('Helper'), this.provider);
        this.paraswap = paraswap ?? new paraswap_1.ParaswapClient(profile.chainId);
    }
    setupOverride() {
        const utr = this.profile.configs.helperContract.utr;
        this.overrideProvider.setStateOverride({
            [utr]: {
                code: this.profile.getAbi('UTROverride').deployedBytecode,
            },
        });
    }
    wrapToken(address) {
        if (address === constant_1.NATIVE_ADDRESS) {
            return this.profile.configs.wrappedTokenAddress;
        }
        return address;
    }
    generateSwapParams(method, params) {
        const functionInterface = Object.values(this.helperContract.interface.functions).find((f) => f.name === method)?.inputs[0]
            .components;
        const formattedParams = {};
        for (const name in params) {
            if (functionInterface?.find((c) => c.name === name)) {
                formattedParams[name] = params[name];
            }
        }
        return this.helperContract.populateTransaction[method](formattedParams);
    }
    getSingleRouteToUSD(token, types) {
        return (0, routes_1.getSingleRouteToUSD)(this.profile, token, types);
    }
    getIndexR(tokenR) {
        return (0, routes_1.getIndexR)(this.profile, tokenR);
    }
    getUniPool(tokenIn, tokenR) {
        const routeKey = Object.keys(this.profile.routes).find((r) => {
            return r === `${tokenR}-${tokenIn}` || r === `${tokenIn}-${tokenR}`;
        });
        if (!this.profile.routes[routeKey || ''] || !this.profile.routes[routeKey || ''][0].address) {
            throw new type_1.DerionError("Can't find router, please select other token", 'ROUTE_NOT_FOUND');
        }
        return this.profile.routes[routeKey || ''][0].address;
    }
    async getSwapCallData({ step, TOKEN_R, poolIn, poolOut, sideIn, sideOut, deps: { signer, pools, decimals, indexR }, }) {
        const needAggregator = (0, utils_1.isAddress)(step.tokenIn) && this.wrapToken(step.tokenIn) !== TOKEN_R;
        const inputs = step.tokenIn === constant_1.NATIVE_ADDRESS
            ? [
                {
                    mode: CALL_VALUE,
                    token: AddressZero,
                    eip: 0,
                    id: 0,
                    amountIn: step.amountIn,
                    recipient: AddressZero,
                },
            ]
            : [
                {
                    mode: !needAggregator ? PAYMENT : TRANSFER,
                    eip: (0, utils_2.isPosId)(step.tokenIn) ? 1155 : 20,
                    token: (0, utils_2.isPosId)(step.tokenIn) ? this.profile.configs.derivable.token : step.tokenIn,
                    id: (0, utils_2.isPosId)(step.tokenIn) ? (0, utils_2.bn)((0, utils_2.packPosId)(poolIn, sideIn)) : 0,
                    amountIn: step.amountIn,
                    recipient: (0, utils_1.isAddress)(step.tokenIn) && this.wrapToken(step.tokenIn) !== TOKEN_R
                        ? this.helperContract.address
                        : (0, utils_2.isPosId)(step.tokenIn)
                            ? poolIn
                            : poolOut,
                },
            ];
        const populateTxData = [];
        let amountIn = step.payloadAmountIn ? step.payloadAmountIn : step.amountIn;
        const account = await signer.getAddress();
        if (needAggregator) {
            const getRateData = {
                userAddress: this.helperContract.address,
                ignoreChecks: true,
                srcToken: step.tokenIn,
                srcDecimals: decimals?.[step.tokenIn] || 18,
                destDecimals: decimals?.[step.tokenOut] || 18,
                srcAmount: amountIn.toString(),
                destToken: TOKEN_R,
                partner: 'derion.io',
                side: 'SELL',
            };
            const openData = {
                pool: poolOut,
                side: sideOut,
            };
            const { openTx } = await this.getAggRateAndBuildTxSwapApi(getRateData, openData, signer);
            populateTxData.push(openTx);
        }
        else if ((0, utils_1.isAddress)(step.tokenOut) && this.wrapToken(step.tokenOut) !== TOKEN_R) {
            populateTxData.push(this.generateSwapParams('closeAndSwap', {
                side: sideIn,
                deriPool: poolIn,
                uniPool: this.getUniPool(step.tokenOut, TOKEN_R),
                token: step.tokenOut,
                amount: amountIn,
                payer: account,
                recipient: account,
                INDEX_R: indexR ?? this.getIndexR(TOKEN_R),
            }));
        }
        else {
            const OPEN_RATE = pools[poolOut]?.config?.OPEN_RATE;
            if (OPEN_RATE && [constant_1.POOL_IDS.A, constant_1.POOL_IDS.B].includes(sideOut)) {
                amountIn = amountIn.mul(OPEN_RATE).div(constant_1.Q128);
            }
            populateTxData.push(this.generateSwapParams('swap', {
                sideIn: sideIn,
                poolIn: (0, utils_2.isPosId)(step.tokenIn) ? poolIn : poolOut,
                sideOut: sideOut,
                poolOut: (0, utils_2.isPosId)(step.tokenOut) ? poolOut : poolIn,
                amountIn,
                payer: account,
                recipient: account,
                INDEX_R: indexR ?? this.getIndexR(TOKEN_R),
            }));
        }
        return {
            inputs,
            populateTxData,
        };
    }
    async getSweepCallData({ step, TOKEN_R, poolIn, poolOut, sideIn, sideOut, deps: { signer, pools, indexR }, }) {
        const swapCallData = await this.getSwapCallData({ step, TOKEN_R, poolIn, poolOut, sideIn, sideOut, deps: { signer, pools, indexR } });
        const inputs = [
            {
                mode: TRANSFER,
                eip: 1155,
                token: this.profile.configs.derivable.token,
                id: (0, utils_2.bn)((0, utils_2.packPosId)(poolOut, sideOut)),
                amountIn: step.currentBalanceOut,
                recipient: this.helperContract.address,
            },
            ...swapCallData.inputs,
        ];
        const populateTxData = [
            ...swapCallData.populateTxData,
            this.helperContract.populateTransaction.sweep((0, utils_2.packPosId)(poolOut, sideOut), signer),
        ];
        return {
            inputs,
            populateTxData,
        };
    }
    async convertStepToActions({ steps, deps: { signer, pools, decimals, indexR }, }) {
        const outputs = [];
        const recipient = await signer.getAddress();
        steps.forEach((step) => {
            const firstPosId = (0, utils_2.isPosId)(step.tokenIn) ? step.tokenIn : step.tokenOut;
            const firstPoolAddress = (0, utils_2.unpackPosId)(firstPosId)[0];
            const TOKEN_R = pools[firstPoolAddress].config?.TOKEN_R ?? (0, utils_2.throwError)('!TOKEN_R');
            outputs.push({
                recipient,
                eip: (0, utils_2.isPosId)(step.tokenOut) ? 1155 : step.tokenOut === constant_1.NATIVE_ADDRESS ? 0 : 20,
                token: (0, utils_2.isPosId)(step.tokenOut) ? this.profile.configs.derivable.token : step.tokenOut,
                id: (0, utils_2.isPosId)(step.tokenOut)
                    ? (0, utils_2.packPosId)((0, utils_2.addressFromToken)(step.tokenOut, TOKEN_R, this.profile.configs.wrappedTokenAddress), (0, utils_2.sideFromToken)(step.tokenOut, TOKEN_R, this.profile.configs.wrappedTokenAddress))
                    : (0, utils_2.bn)(0),
                amountOutMin: step.amountOutMin,
            });
        });
        let nativeAmountToWrap = (0, utils_2.bn)(0);
        const metaDatas = [];
        const promises = [];
        const fetchStepPromise = steps.map(async (step) => {
            const firstPosId = (0, utils_2.isPosId)(step.tokenIn) ? step.tokenIn : step.tokenOut;
            const firstPoolAddress = (0, utils_2.unpackPosId)(firstPosId)[0];
            const TOKEN_R = pools[firstPoolAddress].config?.TOKEN_R ?? (0, utils_2.throwError)('!TOKEN_R');
            const poolIn = (0, utils_2.addressFromToken)(step.tokenIn, TOKEN_R, this.profile.configs.wrappedTokenAddress);
            const poolOut = (0, utils_2.addressFromToken)(step.tokenOut, TOKEN_R, this.profile.configs.wrappedTokenAddress);
            const sideIn = (0, utils_2.sideFromToken)(step.tokenIn, TOKEN_R, this.profile.configs.wrappedTokenAddress);
            const sideOut = (0, utils_2.sideFromToken)(step.tokenOut, TOKEN_R, this.profile.configs.wrappedTokenAddress);
            if (step.tokenIn === constant_1.NATIVE_ADDRESS) {
                nativeAmountToWrap = nativeAmountToWrap.add(step.amountIn);
            }
            if (step.useSweep && (0, utils_2.isPosId)(step.tokenOut)) {
                const { inputs, populateTxData } = await this.getSweepCallData({
                    step,
                    TOKEN_R,
                    poolIn,
                    poolOut,
                    sideIn,
                    sideOut,
                    deps: { signer, pools, indexR },
                });
                metaDatas.push({
                    code: this.helperContract.address,
                    inputs,
                }, {
                    code: this.helperContract.address,
                    inputs: [],
                });
                promises.push(...populateTxData);
            }
            else {
                const { inputs, populateTxData } = await this.getSwapCallData({
                    step,
                    TOKEN_R,
                    poolIn,
                    poolOut,
                    sideIn: sideIn,
                    sideOut: sideOut,
                    deps: { signer, pools, decimals, indexR },
                });
                metaDatas.push({
                    code: this.helperContract.address,
                    inputs,
                });
                promises.push(...populateTxData);
            }
        });
        await Promise.all(fetchStepPromise);
        const datas = await Promise.all(promises);
        const actions = [];
        metaDatas.forEach((metaData, key) => {
            actions.push({ ...metaData, data: datas[key]?.data });
        });
        return { params: [outputs, actions], value: nativeAmountToWrap };
    }
    async getAggRateAndBuildTxSwapApi(getRateData, openData, signer, helperOverride, slippage) {
        const address = await signer.getAddress();
        const rateData = await this.paraswap.getRate(getRateData, getRateData.userAddress);
        if (rateData.error) {
            throw new type_1.DerionError(rateData.error, 'PARASWAP_RATE_ERROR');
        }
        const swapData = await this.paraswap.buildTx(getRateData, rateData, slippage);
        if (swapData.error) {
            throw new type_1.DerionError(swapData.error, 'PARASWAP_BUILD_TX_ERROR');
        }
        const helper = helperOverride ?? this.helperContract;
        const openTx = await helper.populateTransaction.aggregateAndOpen({
            token: getRateData.srcToken,
            tokenOperator: rateData.priceRoute.tokenTransferProxy,
            aggregator: swapData.to,
            aggregatorData: swapData.data,
            pool: openData?.pool,
            side: openData?.side,
            payer: address,
            recipient: address,
            INDEX_R: this.getIndexR(getRateData.destToken), // TOKEN_R
        });
        return {
            rateData,
            swapData,
            openTx,
        };
    }
    async multiSwap({ steps, gasLimit, gasPrice, onSubmitted, callStatic = false, deps, }) {
        const { params, value } = await this.convertStepToActions({
            steps,
            deps,
        });
        if (callStatic) {
            const address = await deps.signer.getAddress();
            deps.signer = new ethers_1.VoidSigner(address, this.overrideProvider);
        }
        const utr = new ethers_1.Contract(this.profile.configs.helperContract.utr, this.profile.getAbi('UTROverride').abi, deps.signer);
        params.push({
            value,
            gasLimit,
            gasPrice,
        });
        if (callStatic) {
            return await utr.callStatic.exec(...params);
        }
        const res = await utr.exec(...params);
        if (onSubmitted) {
            onSubmitted({ hash: res.hash, steps });
        }
        const tx = await res.wait(1);
        return tx;
    }
}
exports.Swapper = Swapper;
//# sourceMappingURL=swapper.js.map