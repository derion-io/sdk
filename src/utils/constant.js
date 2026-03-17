"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventDataAbis = exports.POOL_IDS = exports.PARA_BUILD_TX_BASE_URL = exports.PARA_VERSION = exports.PARA_DATA_BASE_URL = exports.MINI_SECOND_PER_DAY = exports.NATIVE_ADDRESS = exports.BIG_M1 = exports.BIG_0 = exports.BIG_E18 = exports.M256 = exports.Q128 = exports.SECONDS_PER_DAY = void 0;
const ethers_1 = require("ethers");
exports.SECONDS_PER_DAY = 86400;
exports.Q128 = ethers_1.BigNumber.from(1).shl(128);
exports.M256 = ethers_1.BigNumber.from(1).shl(256).sub(1);
exports.BIG_E18 = ethers_1.BigNumber.from(10).pow(18);
exports.BIG_0 = ethers_1.BigNumber.from(0);
exports.BIG_M1 = ethers_1.BigNumber.from(-1);
exports.NATIVE_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
exports.MINI_SECOND_PER_DAY = 86400000;
exports.PARA_DATA_BASE_URL = 'https://api.paraswap.io/prices';
exports.PARA_VERSION = '5';
exports.PARA_BUILD_TX_BASE_URL = 'https://api.paraswap.io/transactions';
exports.POOL_IDS = {
    cToken: 0x20000,
    cp: 0x10000,
    cw: 0x10001,
    quote: 0x20001,
    base: 0x20002,
    token0: 262144,
    token1: 262145,
    native: 0x01,
    R: 0x00,
    A: 0x10,
    B: 0x20,
    C: 0x30,
};
exports.EventDataAbis = {
    PoolCreated: [
        'address FETCHER',
        'bytes32 ORACLE',
        'address TOKEN_R',
        'uint k',
        'uint MARK',
        'uint INTEREST_HL',
        'uint PREMIUM_HL',
        'uint OPEN_RATE',
        'address poolAddress', // uint(uint160(pool))
    ],
    Swap: [
        'address payer',
        'address poolIn',
        'address poolOut',
        'address recipient',
        'uint sideIn',
        'uint sideOut',
        'uint amountIn',
        'uint amountOut',
    ],
    Swap1: [
        'address payer',
        'address poolIn',
        'address poolOut',
        'address recipient',
        'uint sideIn',
        'uint sideOut',
        'uint amountIn',
        'uint amountOut',
        'uint price',
    ],
    Swap2: [
        'address payer',
        'address poolIn',
        'address poolOut',
        'address recipient',
        'uint sideIn',
        'uint sideOut',
        'uint amountIn',
        'uint amountOut',
        'uint price',
        'uint priceR',
        'uint amountR',
    ],
};
//# sourceMappingURL=constant.js.map