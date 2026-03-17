import { BigNumber } from 'ethers';
export type SingleRouteToUSDResult = {
    quoteTokenIndex: number;
    stablecoin: string;
    address: string;
};
export declare function getSingleRouteToUSD(profile: {
    routes: {
        [key: string]: {
            type: string;
            address: string;
        }[];
    };
    configs: {
        stablecoins: string[];
    };
}, token: string, types?: Array<string>): SingleRouteToUSDResult | undefined;
export declare function getIndexR(profile: {
    routes: {
        [key: string]: {
            type: string;
            address: string;
        }[];
    };
    configs: {
        stablecoins: string[];
    };
}, tokenR: string): BigNumber;
//# sourceMappingURL=routes.d.ts.map