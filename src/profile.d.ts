import { ConfigFetcher, DerionConfigs, ProfileConfigs } from './type';
export declare class Profile {
    chainId: number;
    env: 'development' | 'production';
    configs: DerionConfigs;
    routes: {
        [key: string]: {
            type: string;
            address: string;
        }[];
    };
    whitelistPools: string[];
    constructor(configs: ProfileConfigs);
    loadConfig(fetcher?: ConfigFetcher): Promise<void>;
    private validateConfig;
    getAbi(name: string): any;
    getExp(fetcher: string): number;
}
//# sourceMappingURL=profile.d.ts.map