import { JsonRpcProvider } from '@ethersproject/providers';
import { ContractCallContext, Multicall } from 'ethereum-multicall';
import { Profile } from './profile';
import { Pools } from './type';
export declare class StateLoader {
    profile: Profile;
    provider: JsonRpcProvider;
    mc: Multicall;
    constructor(profile: Profile, provider: JsonRpcProvider);
    update({ pools }: {
        pools?: Pools;
    }): Promise<Pools>;
    _multicall(contexts: ContractCallContext[]): Promise<any[]>;
}
//# sourceMappingURL=stateLoader.d.ts.map