import { JsonRpcProvider, Networkish } from '@ethersproject/providers';
import { ContractCallContext, Multicall } from 'ethereum-multicall';
import { ConnectionInfo } from 'ethers/lib/utils';
import { Profile } from './profile';
import { Pools } from './type';
export declare class StateLoader {
    profile: Profile;
    provider: JsonRpcProvider;
    mc: Multicall;
    constructor(profile: Profile, url?: ConnectionInfo | string, network?: Networkish);
    update({ pools }: {
        pools?: Pools;
    }): Promise<void>;
    _multicall(contexts: ContractCallContext[]): Promise<any[]>;
}
