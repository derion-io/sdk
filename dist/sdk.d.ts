import { Signer } from 'ethers';
import { Profile } from './profile';
import { Account } from './account';
import { StateLoader } from './stateLoader';
import { Networkish } from '@ethersproject/providers';
import { ConnectionInfo } from 'ethers/lib/utils';
import { Swapper } from './swapper';
import { PositionView } from './utils/positions';
import { Position, LogType, ProfileConfigs, Pools } from './type';
export declare class DerionSDK {
    constructor(configs: ProfileConfigs);
    profile: Profile;
    stateLoader: StateLoader;
    init(): Promise<void>;
    getStateLoader(url?: ConnectionInfo | string, network?: Networkish): StateLoader;
    extractLogs: (txLogs: LogType[][]) => {
        poolAddresses: string[];
    };
    createAccount(address: string, signer?: Signer): Account;
    importPools(pools: Pools, poolAddresses: string[]): void;
    createSwapper: (url?: ConnectionInfo | string, network?: Networkish) => Swapper;
    calcPositionState: (position: Position, pools: Pools, currentPriceR?: import("ethers").BigNumber, balance?: import("ethers").BigNumber) => PositionView;
}
