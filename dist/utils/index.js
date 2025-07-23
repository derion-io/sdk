"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.powX128 = exports.xr = exports.thousandsInt = exports.formatPercentage = exports.formatQ128 = exports.errorEncode = exports.addressFromToken = exports.sideFromToken = exports.throwError = exports.groupBy = exports.packPosId = exports.unpackPosId = exports.isPosId = exports.bn = void 0;
const ethers_1 = require("ethers");
const constant_1 = require("./constant");
const utils_1 = require("ethers/lib/utils");
const helper_1 = require("./helper");
exports.bn = ethers_1.BigNumber.from;
const isPosId = (address) => {
    return address.length == 66;
};
exports.isPosId = isPosId;
const unpackPosId = (address) => {
    return [
        (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(address, 12)),
        ethers_1.BigNumber.from((0, utils_1.hexDataSlice)(address, 0, 12)).toNumber(),
    ];
};
exports.unpackPosId = unpackPosId;
const packPosId = (address, side) => {
    return (0, utils_1.hexZeroPad)((0, utils_1.hexlify)(side) + address.substring(2).toLowerCase(), 32);
};
exports.packPosId = packPosId;
const groupBy = (xs, key) => {
    return xs.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};
exports.groupBy = groupBy;
const throwError = (reason = 'MISSING DATA') => {
    throw new Error(reason);
};
exports.throwError = throwError;
const sideFromToken = (address, TOKEN_R, wrappedTokenAddress) => {
    try {
        if ((0, exports.isPosId)(address)) {
            return (0, exports.unpackPosId)(address)[1];
        }
        else if (address === TOKEN_R) {
            return constant_1.POOL_IDS.R;
        }
        else if (address === constant_1.NATIVE_ADDRESS && TOKEN_R === wrappedTokenAddress) {
            return constant_1.POOL_IDS.native;
        }
        return 0;
    }
    catch (e) {
        throw new Error('Token id not found');
    }
};
exports.sideFromToken = sideFromToken;
const addressFromToken = (address, TOKEN_R, wrappedTokenAddress) => {
    if ((0, exports.isPosId)(address)) {
        return (0, exports.unpackPosId)(address)[0];
    }
    if (address === constant_1.NATIVE_ADDRESS && TOKEN_R === wrappedTokenAddress) {
        return wrappedTokenAddress;
    }
    return address;
};
exports.addressFromToken = addressFromToken;
const errorEncode = (err) => {
    return err?.response?.data || `${err?.code}: ${err?.reason || err?.msg || err?.message}`;
};
exports.errorEncode = errorEncode;
function formatQ128(n, PRECISION = 10000) {
    if (n.isNegative()) {
        return -formatQ128((0, exports.bn)(0).sub(n));
    }
    return n.mul(PRECISION).shr(128).toNumber() / PRECISION;
}
exports.formatQ128 = formatQ128;
function formatPercentage(n, precision = 2) {
    return (n * 100).toFixed(precision) + '%';
}
exports.formatPercentage = formatPercentage;
const thousandsInt = (int, count = 3) => {
    const regExp = new RegExp(String.raw `(\d+)(\d{${count}})`);
    while (regExp.test(int)) {
        int = int.replace(regExp, '$1' + ',' + '$2');
    }
    return int;
};
exports.thousandsInt = thousandsInt;
function xr(k, r, v) {
    try {
        const x = (0, helper_1.NUM)((0, helper_1.DIV)(r, v));
        return Math.pow(x, 1 / k);
    }
    catch (err) {
        console.warn(err);
        return 0;
    }
}
exports.xr = xr;
const powX128 = (x, k) => {
    let y = constant_1.Q128;
    const neg = k < 0;
    if (neg) {
        k = -k;
    }
    for (let i = 0; i < k; ++i) {
        y = y.mul(x).shr(128);
    }
    if (neg) {
        return constant_1.M256.div(y);
    }
    return y;
};
exports.powX128 = powX128;
//# sourceMappingURL=index.js.map