import { BigNumber } from "ethers";
export declare const bn: typeof BigNumber.from;
export declare const isPosId: (address: string) => boolean;
export declare const unpackPosId: (address: string) => [string, number];
export declare const packPosId: (address: string, side: number) => string;
export declare const groupBy: (xs: any[], key: string | number) => any[][];
export declare const throwError: (reason?: string) => any;
export declare const sideFromToken: (address: string, TOKEN_R: string, wrappedTokenAddress: string) => number;
export declare const addressFromToken: (address: string, TOKEN_R: string, wrappedTokenAddress: string) => string;
export declare const errorEncode: (err: any) => any;
export declare function formatQ128(n: BigNumber, PRECISION?: number): number;
export declare function formatPercentage(n: number, precision?: number): string;
export declare const thousandsInt: (int: string, count?: number) => string;
export declare function xr(k: number, r: BigNumber, v: BigNumber): number;
export declare const powX128: (x: BigNumber, k: number) => BigNumber;
//# sourceMappingURL=index.d.ts.map