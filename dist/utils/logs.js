"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processLogs = exports.extractPoolAddresses = exports.TOPICS = exports.STABLE_SYMBOLS = void 0;
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const constant_1 = require("./constant");
exports.STABLE_SYMBOLS = ['USD', 'DAI'];
exports.TOPICS = {
    '0xba5c330f8eb505cee9b4eb08fecf34234a327cfb6f9e480f9d3b4dfae5b23e4d': 'Position',
    '0xf7462f2a86b97b14a4669ae97bf107eb47f1574e511038ba3bb2c0cace5bb227': 'Swap',
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': 'Transfer',
    '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62': 'TransferSingle',
    '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb': 'TransferBatch',
    '0x4dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63': 'LogFeeTransfer',
    '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': 'Approval', // 20 Approval
};
function extractPoolAddresses(txLogs, tokenDerion) {
    const poolAddresses = {};
    for (const logs of txLogs) {
        for (const log of logs) {
            if (log.address != tokenDerion) {
                continue;
            }
            const topic0 = log.topics?.[0];
            const type = exports.TOPICS[topic0];
            if (type == 'TransferSingle') {
                const [id] = utils_1.defaultAbiCoder.decode(['bytes32', 'uint'], log.data);
                const poolAddress = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(id, 12));
                poolAddresses[poolAddress] = true;
            }
            else if (type == 'TransferBatch') {
                const [ids] = utils_1.defaultAbiCoder.decode(['bytes32[]', 'uint256[]'], log.data);
                for (let i = 0; i < ids.length; ++i) {
                    const poolAddress = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(ids[i], 12));
                    poolAddresses[poolAddress] = true;
                }
            }
        }
    }
    return Object.keys(poolAddresses);
}
exports.extractPoolAddresses = extractPoolAddresses;
function processLogs(positions, transitions, balances, allowances, txLogs, pools, tokenDerion, account) {
    for (const logs of txLogs) {
        if (!logs.length) {
            continue;
        }
        const transition = {
            txHash: logs[0].transactionHash,
            blockNumber: logs[0].blockNumber,
            timestamp: logs[0].timeStamp ? ethers_1.BigNumber.from(logs[0].timeStamp).toNumber() : undefined,
            netTransfers: {},
        };
        const bingo = logs.some((log) => {
            if (log.address != tokenDerion)
                return false;
            const topic0 = log.topics?.[0];
            const type = exports.TOPICS[topic0];
            if (type != 'TransferSingle')
                return false;
            const to = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[3], 12));
            if (account != to)
                return false;
            return true;
        });
        if (bingo) {
            for (const log of logs) {
                if (log.address != tokenDerion) {
                    continue;
                }
                const topic0 = log.topics?.[0];
                const type = exports.TOPICS[topic0];
                if (type != 'TransferSingle') {
                    // Derion does not use batch transfer
                    continue;
                }
                // const operator = getAddress(hexDataSlice(log.topics[1], 12))
                const from = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[2], 12));
                const to = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[3], 12));
                const [id, amount] = utils_1.defaultAbiCoder.decode(['bytes32', 'uint'], log.data);
                const poolAddress = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(id, 12));
                // const side = BigNumber.from(hexDataSlice(id, 0, 12)).toNumber()
                // const posId = pool + '-' + side
                // console.log({from, to, id, amount})
                const pos = (positions[id] = positions[id] ?? {
                    id,
                    balance: balances[id] ?? constant_1.BIG_0,
                    priceR: constant_1.BIG_0,
                    price: constant_1.BIG_0,
                    rPerBalance: constant_1.BIG_0,
                });
                if (to == account) {
                    let priceR = constant_1.BIG_0;
                    logs.some((log) => {
                        const topic0 = log.topics?.[0];
                        const type = exports.TOPICS[topic0];
                        if (type != 'Swap') {
                            return false;
                        }
                        // const payer = getAddress(hexDataSlice(log.topics[1], 12))
                        // const recipient = getAddress(hexDataSlice(log.topics[2], 12))
                        // const index = getAddress(hexDataSlice(log.topics[3], 12))
                        const datas = utils_1.defaultAbiCoder.decode(['address', 'uint', 'uint', 'uint', 'uint', 'uint', 'uint'], log.data);
                        const sqrtPriceR = datas[6];
                        priceR = sqrtPriceR.mul(sqrtPriceR).shr(128);
                        return true;
                    });
                    logs.some((log) => {
                        const topic0 = log.topics?.[0] ?? 'NOTHING';
                        const type = exports.TOPICS[topic0];
                        if (type != 'Position') {
                            return false;
                        }
                        // const payer = getAddress(hexDataSlice(log.topics[1], 12))
                        // const recipient = getAddress(hexDataSlice(log.topics[2], 12))
                        // const index = getAddress(hexDataSlice(log.topics[3], 12))
                        const [posId, amount, maturity, sqrtPrice, valueR] = utils_1.defaultAbiCoder.decode(['bytes32', 'uint', 'uint', 'uint', 'uint'], log.data);
                        if (posId != id) {
                            return false;
                        }
                        transition.maturity = maturity.toNumber();
                        pos.maturity = maturity.toNumber();
                        const newBalance = pos.balance.add(amount);
                        if (sqrtPrice.gt(0)) {
                            const price = sqrtPrice.mul(sqrtPrice).shr(128);
                            transition.price = price;
                            if (pos.price.gt(0)) {
                                pos.price = pos.price.mul(pos.balance).add(amount.mul(price)).div(newBalance);
                            }
                            else {
                                pos.price = price;
                            }
                            if (!priceR?.gt(0)) {
                                const pool = pools[poolAddress];
                                // special case for INDEX = TOKEN_R / STABLECOIN
                                if (pool?.metadata?.base.address &&
                                    pool.metadata.base.address == pool?.config?.TOKEN_R &&
                                    exports.STABLE_SYMBOLS.some((sym) => pool.metadata?.quote.symbol.includes(sym))) {
                                    priceR = price;
                                }
                            }
                        }
                        const posValueR = pos.rPerBalance.mul(pos.balance).shr(128);
                        if (valueR.gt(0)) {
                            transition.rPerAmount = valueR.shl(128).div(amount);
                            pos.rPerBalance = posValueR.add(valueR).shl(128).div(newBalance);
                        }
                        if (priceR?.gt(0)) {
                            transition.priceR = priceR;
                            if (valueR.gt(0)) {
                                if (posValueR.gt(0)) {
                                    pos.priceR = pos.priceR.mul(posValueR).add(priceR.mul(valueR)).div(posValueR.add(valueR));
                                }
                                else {
                                    pos.priceR = priceR;
                                }
                            }
                        }
                        return true;
                    });
                }
            }
        }
        const _applyTransfer = (token, from, to, amount) => {
            if (!amount?.gt(0)) {
                return;
            }
            if (bingo) {
                if (from == account) {
                    transition.netTransfers[token] = (transition.netTransfers[token] ?? constant_1.BIG_0).sub(amount);
                }
                if (to == account) {
                    transition.netTransfers[token] = (transition.netTransfers[token] ?? constant_1.BIG_0).add(amount);
                }
                if (transition.netTransfers[token].isZero()) {
                    delete transition.netTransfers[token];
                }
            }
            if (to == account) {
                balances[token] = (balances[token] ?? constant_1.BIG_0).add(amount);
            }
            if (from == account) {
                balances[token] = (balances[token] ?? constant_1.BIG_0).sub(amount);
            }
            if ([from, to].includes(account) && positions[token]) {
                positions[token].balance = balances[token];
            }
        };
        for (const log of logs) {
            const topic0 = log.topics?.[0];
            const type = exports.TOPICS[topic0];
            if (type == 'Transfer' && log.topics?.length == 3) {
                // ERC20
                const token = (0, utils_1.getAddress)(log.address);
                const from = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[1], 12));
                const to = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[2], 12));
                const amount = ethers_1.BigNumber.from(log.data);
                _applyTransfer(token, from, to, amount);
            }
            else if (type == 'TransferSingle') {
                // ERC1155
                const from = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[2], 12));
                const to = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[3], 12));
                const [id, amount] = utils_1.defaultAbiCoder.decode(['bytes32', 'uint'], log.data);
                _applyTransfer(id, from, to, amount);
            }
            else if (type == 'TransferBatch') {
                // ERC1155
                const from = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[2], 12));
                const to = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[3], 12));
                const [ids, amounts] = utils_1.defaultAbiCoder.decode(['bytes32[]', 'uint256[]'], log.data);
                for (let i = 0; i < ids.length; ++i) {
                    _applyTransfer(ids[i], from, to, amounts[i]);
                }
            }
            else if (type == 'Approval') {
                const owner = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[1], 12));
                if (owner == account) {
                    const token = (0, utils_1.getAddress)(log.address);
                    const spender = (0, utils_1.getAddress)((0, utils_1.hexDataSlice)(log.topics[2], 12));
                    const allowance = ethers_1.BigNumber.from(log.data);
                    const key = spender + '-' + token;
                    if (allowance.isZero()) {
                        delete allowances[key];
                    }
                    else {
                        allowances[key] = allowance;
                    }
                }
            }
        }
        if (Object.keys(transition.netTransfers).length) {
            transitions.push(transition);
        }
        for (const token in balances) {
            if (!balances[token]?.gt(0)) {
                delete balances[token];
            }
        }
    }
}
exports.processLogs = processLogs;
//# sourceMappingURL=logs.js.map