import { DerionConfigs, ProfileConfigs } from './type';
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
    loadConfig(): Promise<void>;
    getAbi(name: string): any;
}
