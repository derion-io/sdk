declare const DDL_CONFIGS_URL: {
    development: string;
    production: string;
};
declare const loadSDKConfig: (env: 'development' | 'production', chainId: number) => Promise<{
    configs: any;
    routes: any;
    whitelistPools: any;
}>;
