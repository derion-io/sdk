"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParaswapClient = void 0;
const constant_1 = require("./utils/constant");
class ParaswapClient {
    constructor(chainId, baseURL = constant_1.PARA_DATA_BASE_URL, buildTxURL = constant_1.PARA_BUILD_TX_BASE_URL, version = constant_1.PARA_VERSION) {
        this.chainId = chainId;
        this.baseURL = baseURL;
        this.buildTxURL = buildTxURL;
        this.version = version;
    }
    async getRate(params, userAddress) {
        const amount = params.srcAmount || params.destAmount;
        const url = `${this.baseURL}/?version=${this.version}` +
            `&srcToken=${params.srcToken}` +
            `&srcDecimals=${params.srcDecimals || 18}` +
            `&destToken=${params.destToken}` +
            `&destDecimals=${params.destDecimals || 18}` +
            `&amount=${amount}` +
            `&side=${params.side}` +
            `&excludeDirectContractMethods=${params.excludeDirectContractMethods || false}` +
            `&otherExchangePrices=${params.otherExchangePrices || true}` +
            `&partner=${params.partner}` +
            `&network=${this.chainId}` +
            `&userAddress=${userAddress}`;
        const rateData = await (await fetch(url, { method: 'GET', redirect: 'follow' })).json();
        return rateData;
    }
    async buildTx(params, rateData, slippage) {
        const url = `${this.buildTxURL}/${this.chainId}` +
            `?ignoreGasEstimate=${params.ignoreGasEstimate || true}` +
            `&ignoreAllowance=${params.ignoreAllowance || true}` +
            `&gasPrice=${rateData.priceRoute.gasCost}`;
        const swapData = await (await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...params,
                slippage: slippage || 500,
                partner: params.partner,
                priceRoute: rateData.priceRoute,
            }),
        })).json();
        return swapData;
    }
}
exports.ParaswapClient = ParaswapClient;
//# sourceMappingURL=paraswap.js.map