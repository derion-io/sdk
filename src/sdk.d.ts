import { JsonRpcProvider, Networkish } from '@ethersproject/providers';
import { Signer } from 'ethers';
import { ConnectionInfo } from 'ethers/lib/utils';
import { Profile } from './profile';
import { Account } from './account';
import { StateLoader } from './stateLoader';
import { Swapper } from './swapper';
import { PositionView } from './utils/positions';
import { ConfigFetcher, Position, LogType, ProfileConfigs, Pools } from './type';
export declare class DerionSDK {
    profile: Profile;
    stateLoader: StateLoader;
    constructor(configs: ProfileConfigs);
    init(fetcher?: ConfigFetcher): Promise<void>;
    getStateLoader(providerOrUrl?: JsonRpcProvider | ConnectionInfo | string, network?: Networkish): StateLoader;
    extractLogs: (txLogs: LogType[][]) => {
        poolAddresses: string[];
    };
    createAccount(address: string, signer?: Signer): Account;
    importPools(pools: Pools, poolAddresses: string[]): Pools;
    createSwapper: (providerOrUrl?: JsonRpcProvider | ConnectionInfo | string, network?: Networkish) => Swapper;
    calcPositionState: (position: Position, pools: Pools, currentPriceR?: import("ethers").BigNumber, balance?: import("ethers").BigNumber) => PositionView;
}
//# sourceMappingURL=sdk.d.ts.map