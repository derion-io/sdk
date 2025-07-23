import { JsonRpcProvider, Networkish, TransactionReceipt } from '@ethersproject/providers';
import { BigNumber, Contract, Signer } from 'ethers';
import { ConnectionInfo } from 'ethers/lib/utils';
import { Profile } from './profile';
import { ProfileConfigs, Pools } from './type';
export type rateDataAggregatorType = {
    userAddress: string;
    ignoreChecks: boolean;
    srcToken: string;
    srcDecimals?: number;
    srcAmount?: string;
    destAmount?: string;
    destToken: string;
    destDecimals?: number;
    partner: string;
    side: string;
    excludeDirectContractMethods?: boolean;
    otherExchangePrices?: boolean;
    ignoreGasEstimate?: boolean;
    ignoreAllowance?: boolean;
};
export type SwapStepType = {
    tokenIn: string;
    tokenOut: string;
    amountIn: BigNumber;
    payloadAmountIn?: BigNumber;
    amountOutMin: BigNumber | string | number;
    useSweep?: boolean;
    currentBalanceOut?: BigNumber;
    uniPool?: string;
};
export type MultiSwapParameterType = {
    steps: Array<SwapStepType>;
    gasLimit?: BigNumber;
    gasPrice?: BigNumber;
    onSubmitted?: (pendingTx: PendingSwapTransactionType) => void;
    callStatic?: boolean;
    deps: {
        signer: Signer;
        pools: Pools;
        decimals?: {
            [token: string]: number;
        };
        indexR?: BigNumber;
    };
};
export type SwapCallDataParameterType = {
    step: SwapStepType;
    TOKEN_R: string;
    poolIn: string;
    poolOut: string;
    sideIn: number;
    sideOut: number;
    deps: {
        signer: Signer;
        pools: Pools;
        decimals?: {
            [token: string]: number;
        };
        indexR?: BigNumber;
    };
};
export type SwapCallDataInputType = {
    mode: number;
    eip: number;
    token: string;
    id: number | BigNumber;
    amountIn: BigNumber | undefined;
    recipient: string;
};
export type SwapCallDataReturnType = {
    inputs: Array<SwapCallDataInputType>;
    populateTxData: Array<{
        [key: string]: any;
    }>;
};
export type SwapAndOpenAggregatorType = {
    pool: string;
    side: number;
};
export type PendingSwapTransactionType = {
    hash: string;
    steps: SwapStepType[];
};
export declare class Swapper {
    configs: ProfileConfigs;
    profile: Profile;
    provider: JsonRpcProvider;
    overrideProvider: JsonRpcProvider;
    helperContract: Contract;
    paraDataBaseURL: string;
    paraBuildTxBaseURL: string;
    paraDataBaseVersion: string;
    constructor(configs: ProfileConfigs, profile: Profile, url?: ConnectionInfo | string, network?: Networkish);
    overridedProvider(): JsonRpcProvider;
    wrapToken(address: string): string;
    generateSwapParams(method: string, params: any): {
        [key: string]: any;
    };
    getSingleRouteToUSD(token: string, types?: Array<string>): {
        quoteTokenIndex: number;
        stablecoin: string;
        address: string;
    } | undefined;
    getIndexR(tokenR: string): BigNumber;
    getUniPool(tokenIn: string, tokenR: string): string;
    getSwapCallData({ step, TOKEN_R, poolIn, poolOut, sideIn, sideOut, deps: { signer, pools, decimals, indexR }, }: SwapCallDataParameterType): Promise<SwapCallDataReturnType>;
    getSweepCallData({ step, TOKEN_R, poolIn, poolOut, sideIn, sideOut, deps: { signer, pools, indexR }, }: SwapCallDataParameterType): Promise<SwapCallDataReturnType>;
    convertStepToActions({ steps, deps: { signer, pools, decimals, indexR }, }: {
        steps: Array<SwapStepType>;
        deps: {
            signer: Signer;
            pools: Pools;
            decimals?: {
                [token: string]: number;
            };
            indexR?: BigNumber;
        };
    }): Promise<{
        params: any;
        value: BigNumber;
    }>;
    getAggRateAndBuildTxSwapApi(getRateData: rateDataAggregatorType, openData: SwapAndOpenAggregatorType, signer: Signer, helperOverride?: Contract, slippage?: number): Promise<{
        rateData: any;
        swapData: any;
        openTx: any;
    }>;
    getAggRate(getRateData: rateDataAggregatorType, signer: Signer): Promise<any>;
    buildAggTx(getRateData: rateDataAggregatorType, rateData: any, slippage?: number): Promise<any>;
    multiSwap({ steps, gasLimit, gasPrice, onSubmitted, callStatic, deps, }: MultiSwapParameterType): Promise<TransactionReceipt>;
    swap: ({ tokenIn, amount, tokenOut, deps, gasLimit, callStatic, }: {
        tokenIn: string;
        tokenOut: string;
        amount: string;
        deps: {
            pools: Pools;
            signer: Signer;
            decimals?: {
                [token: string]: number;
            } | undefined;
            indexR?: BigNumber | undefined;
        };
        callStatic?: boolean | undefined;
        gasLimit?: BigNumber | undefined;
    }) => Promise<any>;
    simulate: (params: {
        tokenIn: string;
        tokenOut: string;
        amount: string;
        deps: {
            pools: Pools;
            signer: Signer;
            decimals?: {
                [token: string]: number;
            } | undefined;
            indexR?: BigNumber | undefined;
        };
        gasLimit?: BigNumber | undefined;
    }) => Promise<any>;
}
