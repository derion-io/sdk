export declare class ParaswapClient {
    private baseURL;
    private buildTxURL;
    private version;
    private chainId;
    constructor(chainId: number, baseURL?: string, buildTxURL?: string, version?: string);
    getRate(params: {
        srcToken: string;
        srcDecimals?: number;
        destToken: string;
        destDecimals?: number;
        srcAmount?: string;
        destAmount?: string;
        side: string;
        partner: string;
        excludeDirectContractMethods?: boolean;
        otherExchangePrices?: boolean;
    }, userAddress: string): Promise<any>;
    buildTx(params: {
        srcToken: string;
        srcDecimals?: number;
        destToken: string;
        destDecimals?: number;
        srcAmount?: string;
        destAmount?: string;
        side: string;
        partner: string;
        ignoreGasEstimate?: boolean;
        ignoreAllowance?: boolean;
    }, rateData: any, slippage?: number): Promise<any>;
}
//# sourceMappingURL=paraswap.d.ts.map