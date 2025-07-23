import { BigNumber, Signer } from 'ethers';
import { Profile } from './profile';
import { Position, LogType, Transition, Pools } from './type';
export declare class Account {
    profile: Profile;
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
    constructor(profile: Profile, address: string, signer?: Signer);
    processLogs: (txLogs: LogType[][], pools?: Pools) => Promise<void>;
}
