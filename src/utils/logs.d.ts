import { AccountState, LogType, Pools } from '../type';
export declare const STABLE_SYMBOLS: string[];
export declare const TOPICS: {
    [topic0: string]: string;
};
export declare function extractPoolAddresses(txLogs: LogType[][], tokenDerion: string): string[];
export declare function processLogs(state: AccountState, txLogs: LogType[][], pools: Pools, tokenDerion: string, account: string): AccountState;
//# sourceMappingURL=logs.d.ts.map