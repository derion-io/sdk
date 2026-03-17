"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPositionView = exports.calcPositionState = exports.calcPoolSide = exports.calcPoolInfo = void 0;
const utils_1 = require("ethers/lib/utils");
const ethers_1 = require("ethers");
const helper_1 = require("./helper");
const _1 = require(".");
const constant_1 = require("./constant");
const { A, B, C } = constant_1.POOL_IDS;
function calcPoolInfo(pool) {
    if (!pool?.config || !pool?.view || !pool?.state) {
        throw new Error('missing pool data');
    }
    const { MARK, K, INTEREST_HL, PREMIUM_HL, exp: _exp } = pool.config;
    const exp = _exp ?? 2;
    const power = K / exp;
    const { R, a, b } = pool.state;
    const { rA, rB, rC, spot } = pool.view;
    const xA = (0, _1.xr)(K, R.shr(1), a);
    const xB = (0, _1.xr)(-K, R.shr(1), b);
    const dgA = MARK.mul((0, helper_1.WEI)(xA)).div(constant_1.BIG_E18);
    const dgB = MARK.mul((0, helper_1.WEI)(xB)).div(constant_1.BIG_E18);
    const sides = {
        [A]: {},
        [B]: {},
        [C]: {},
    };
    sides[A].k = Math.min(K, (0, helper_1.kx)(K, R, a, spot, MARK));
    sides[B].k = Math.min(K, (0, helper_1.kx)(-K, R, b, spot, MARK));
    sides[C].k = Number((0, helper_1.IEW)(rA
        .mul((0, helper_1.WEI)(sides[A].k))
        .add(rB.mul((0, helper_1.WEI)(sides[B].k)))
        .div(rA.add(rB))));
    const interestRate = (0, helper_1.rateFromHL)(INTEREST_HL, power);
    const maxPremiumRate = (0, helper_1.rateFromHL)(PREMIUM_HL, power);
    if (maxPremiumRate > 0) {
        if (rA.gt(rB)) {
            const rDiff = rA.sub(rB);
            const givingRate = rDiff.mul((0, helper_1.WEI)(maxPremiumRate)).mul(rA.add(rB)).div(R);
            sides[A].premium = Number((0, helper_1.IEW)(givingRate.div(rA)));
            sides[B].premium = -Number((0, helper_1.IEW)(givingRate.div(rB)));
            sides[C].premium = 0;
        }
        else if (rB.gt(rA)) {
            const rDiff = rB.sub(rA);
            const givingRate = rDiff.mul((0, helper_1.WEI)(maxPremiumRate)).mul(rA.add(rB)).div(R);
            sides[B].premium = Number((0, helper_1.IEW)(givingRate.div(rB)));
            sides[A].premium = -Number((0, helper_1.IEW)(givingRate.div(rA)));
            sides[C].premium = 0;
        }
        else {
            sides[A].premium = 0;
            sides[B].premium = 0;
            sides[C].premium = 0;
        }
    }
    // decompound the interest
    for (const side of [A, B]) {
        sides[side].interest = (interestRate * K) / sides[side].k;
    }
    sides[C].interest = Number((0, helper_1.IEW)(rA.add(rB).mul((0, helper_1.WEI)(interestRate)).div(rC)));
    return {
        sides,
        interestRate,
        maxPremiumRate,
        dgA,
        dgB,
    };
}
exports.calcPoolInfo = calcPoolInfo;
function calcPoolSide(pool, side) {
    if (!pool?.config || !pool?.view || !pool?.state) {
        throw new Error('missing pool data');
    }
    const { K, exp: _exp } = pool.config;
    const exp = _exp ?? 2;
    const poolInfo = calcPoolInfo(pool);
    const { sides, dgA, dgB } = poolInfo;
    const ek = sides[side].k;
    const power = K / exp;
    const effPower = Math.min(ek, K) / exp;
    const interest = sides[side].interest;
    const premium = sides[side].premium;
    const funding = interest + premium;
    return {
        power,
        effPower,
        dgA,
        dgB,
        interest,
        premium,
        funding,
    };
}
exports.calcPoolSide = calcPoolSide;
function calcPositionState(position, pools, currentPriceR, balance = position.balance) {
    const { id, price, priceR, rPerBalance } = position;
    const poolAddress = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(id, 12));
    const side = ethers_1.BigNumber.from((0, utils_1.hexDataSlice)(id, 0, 12)).toNumber();
    // check for position with entry
    const pool = pools[poolAddress];
    if (!pool?.view || !pool?.state) {
        throw new Error('missing pool state');
    }
    const { spot, rA, rB, rC, sA, sB, sC } = pool.view;
    // TODO: OPEN_RATE?
    const currentPrice = spot.mul(spot).shr(128);
    const entryPrice = price;
    const entryValueR = balance.mul(rPerBalance).shr(128);
    const entryValueU = entryValueR.mul(priceR).shr(128);
    const rX = side == A ? rA : side == B ? rB : rC;
    const sX = side == A ? sA : side == B ? sB : sC;
    const valueR = rX.mul(balance).div(sX);
    const valueU = currentPriceR ? valueR.mul(currentPriceR).shr(128) : undefined;
    const { power, effPower, dgA, dgB, funding } = calcPoolSide(pool, side);
    const L = side == A ? (0, helper_1.NUM)(power) : side == B ? -(0, helper_1.NUM)(power) : 0;
    const result = {
        poolAddress,
        side,
        balance,
        power,
        effPower,
        deleveragePriceA: dgA,
        deleveragePriceB: dgB,
        funding,
        entryPrice,
        currentPrice,
        entryValueR,
        entryValueU,
        valueR,
        valueU,
    };
    if (L != 0) {
        const priceRate = currentPrice.shl(128).div(entryPrice);
        const linearPriceRate = (0, helper_1.SHL)(currentPrice.sub(entryPrice).mul(L).add(entryPrice), 128).div(entryPrice);
        result.valueRLinear = (0, helper_1.SHL)(entryValueR.mul(linearPriceRate), -128);
        const powerPriceRate = (0, _1.powX128)(priceRate, L);
        result.valueRCompound = (0, helper_1.SHL)(entryValueR.mul(powerPriceRate), -128);
        if (entryValueR.gt(0)) {
            result.netPnL = (0, helper_1.SHL)(valueR.sub(entryValueR), 128).div(entryValueR);
            result.simPnL = {
                linear: (0, helper_1.SHL)(result.valueRLinear.sub(entryValueR), 128).div(entryValueR),
                power: (0, helper_1.SHL)(result.valueRCompound.sub(entryValueR), 128).div(entryValueR),
                powerBenefit: (0, helper_1.SHL)(result.valueRCompound.sub(result.valueRLinear), 128).div(entryValueR),
                funding: (0, helper_1.SHL)(valueR.sub(result.valueRCompound), 128).div(entryValueR),
            };
        }
    }
    return result;
}
exports.calcPositionState = calcPositionState;
function formatPositionView(pv) {
    const res = {
        name: `${pv.side == A ? 'Long' : pv.side == B ? 'Short' : 'LP'} x${pv.power}`,
        pool: pv.poolAddress,
        balance: (0, _1.thousandsInt)(pv.balance.toString(), 6),
        entryPrice: (0, _1.formatQ128)(pv.entryPrice),
        currentPrice: (0, _1.formatQ128)(pv.currentPrice),
        entryValueR: (0, _1.thousandsInt)(pv.entryValueR.toString(), 6),
        valueR: (0, _1.thousandsInt)(pv.valueR.toString(), 6),
        entryValueU: (0, _1.thousandsInt)(pv.entryValueU.toString(), 6),
        valueU: pv.valueU ? (0, _1.thousandsInt)(pv.valueU.toString(), 6) : 'missing reserve token price',
        range: [(0, _1.formatQ128)(pv.deleveragePriceB), (0, _1.formatQ128)(pv.deleveragePriceA)],
        fundingRate: (0, _1.formatPercentage)(pv.funding),
    };
    if (pv.netPnL) {
        res.netPnL = (0, _1.formatPercentage)((0, _1.formatQ128)(pv.netPnL));
    }
    if (pv.simPnL) {
        res.simPnL = {
            linear: (0, _1.formatPercentage)((0, _1.formatQ128)(pv.simPnL.linear)),
            power: (0, _1.formatPercentage)((0, _1.formatQ128)(pv.simPnL.power)),
            powerBenefit: (0, _1.formatPercentage)((0, _1.formatQ128)(pv.simPnL.powerBenefit)),
            fundingPaid: (0, _1.formatPercentage)((0, _1.formatQ128)(pv.simPnL.funding)),
        };
    }
    return res;
}
exports.formatPositionView = formatPositionView;
//# sourceMappingURL=positions.js.map