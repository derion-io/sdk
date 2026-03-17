"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIndexR = exports.getSingleRouteToUSD = void 0;
const ethers_1 = require("ethers");
const _1 = require(".");
function getSingleRouteToUSD(profile, token, types = ['uniswap3']) {
    const { routes, configs: { stablecoins }, } = profile;
    for (const stablecoin of stablecoins) {
        for (const asSecond of [false, true]) {
            const key = asSecond ? `${stablecoin}-${token}` : `${token}-${stablecoin}`;
            const route = routes[key];
            if (route?.length != 1) {
                continue;
            }
            const { type, address } = route[0];
            if (!types.includes(type)) {
                continue;
            }
            const quoteTokenIndex = token.localeCompare(stablecoin, undefined, { sensitivity: 'accent' }) < 0 ? 1 : 0;
            return {
                quoteTokenIndex,
                stablecoin,
                address,
            };
        }
    }
    return undefined;
}
exports.getSingleRouteToUSD = getSingleRouteToUSD;
function getIndexR(profile, tokenR) {
    const { quoteTokenIndex, address } = getSingleRouteToUSD(profile, tokenR) ?? {};
    if (!address) {
        return (0, _1.bn)(0);
    }
    return (0, _1.bn)(ethers_1.utils.hexZeroPad((0, _1.bn)(quoteTokenIndex).shl(255).add(address).toHexString(), 32));
}
exports.getIndexR = getIndexR;
//# sourceMappingURL=routes.js.map