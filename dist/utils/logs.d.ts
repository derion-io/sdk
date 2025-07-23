import { BigNumber } from 'ethers';
import { Position, LogType, Transition, Pools } from '../type';
export declare const STABLE_SYMBOLS: string[];
export declare const TOPICS: {
    [topic0: string]: string;
};
export declare function extractPoolAddresses(txLogs: LogType[][], tokenDerion: string): string[];
export declare function processLogs(positions: {
    [id: string]: Position;
}, transitions: Transition[], balances: {
    [token: string]: BigNumber;
}, allowances: {
    [spenderToken: string]: BigNumber;
}, txLogs: LogType[][], pools: Pools, tokenDerion: string, account: string): void;
