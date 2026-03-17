import { BigNumber, Signer } from 'ethers';
import { AccountState, Position, LogType, Transition, Pools } from './type';
export declare class Account {
    tokenDerion: string;
    address: string;
    signer?: Signer;
    blockNumber: number;
    logIndex: number;
    positions: {
        [id: string]: Position;
    };
    transitions: Transition[];
    balances: {
        [token: string]: BigNumber;
    };
    allowances: {
        [spenderToken: string]: BigNumber;
    };
    constructor(tokenDerion: string, address: string, signer?: Signer);
    getState(): AccountState;
    processLogs: (txLogs: LogType[][], pools?: Pools) => Promise<void>;
}
//# sourceMappingURL=account.d.ts.map