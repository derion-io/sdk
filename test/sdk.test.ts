import { DerionSDK } from '../src/sdk'
import { formatQ128, packPosId, throwError } from '../src/utils'
import { Interceptor } from './shared/libs/interceptor'
import { JsonRpcProvider } from '@ethersproject/providers'
import { BIG_0, NATIVE_ADDRESS, POOL_IDS } from '../src/utils/constant'
import { numberToWei } from '../src/utils/helper'
import { VoidSigner } from 'ethers'
import { formatPositionView } from '../src/utils/positions'
import path from 'path'
import { LogType, Pools } from '../src/type'

const interceptor = new Interceptor()

const RPCs = {
  137: 'https://polygon.llamarpc.com',
  42161: 'https://arbitrum.llamarpc.com',
}

describe('SDK', () => {
  beforeEach(() => {
    interceptor.setContext(expect.getState().currentTestName)
  })

  test('logs', async () => {
    const chainId = 137
    const accountAddress = '0xE61383556642AF1Bd7c5756b13f19A63Dc8601df'

    const rpcUrl = RPCs[chainId] ?? throwError()

    const sdk = new DerionSDK({ chainId })
    await sdk.init()

    const txLogs = await loadAccountLogs(rpcUrl, chainId, accountAddress)
    const { poolAddresses } = sdk.extractLogs(txLogs)

    const stateLoader = sdk.getStateLoader(rpcUrl)

    const pools: Pools = {}
    sdk.importPools(pools, poolAddresses)
    await stateLoader.update({ pools })

    const account = sdk.createAccount(accountAddress)
    account.processLogs(txLogs, pools)
    account.processLogs(txLogs, pools) // the second call does nothing

    // const posViews = Object.values(account.positions).map(pos => sdk.calcPositionState(pos, pools))
    // console.log(...posViews.map(pv => formatPositionView(pv)))

    const posView = sdk.calcPositionState(account.positions['0x00000000000000000000002090c153fc30f6c2abdd5ff3ccf22bafba872d1509'], pools)
    expect(formatQ128(posView.netPnL ?? BIG_0)).toBeCloseTo(5.90, 1)
  })

  test('native-open', async () => {
    const chainId = 42161
    const accountAddress = '0xD42d6d58F95A3DA9011EfEcA086200A64B266c10'
    const rpcUrl = RPCs[chainId] ?? throwError()
    const sdk = new DerionSDK({ chainId })
    await sdk.init()

    const signer = new VoidSigner(accountAddress, new JsonRpcProvider(rpcUrl));

    const txLogs = await loadAccountLogs(rpcUrl, chainId, accountAddress)
    const { poolAddresses } = sdk.extractLogs(txLogs)

    const stateLoader = sdk.getStateLoader(rpcUrl)
    const pools: Pools = {}
    sdk.importPools(pools, poolAddresses)
    await stateLoader.update({ pools })

    const account = sdk.createAccount(accountAddress)
    const poolToSwap = '0xf3cE4cbfF83AE70e9F76b22cd9b683F167d396dd'
    account.processLogs(txLogs)
    const swapper = sdk.createSwapper(rpcUrl)
    // NATIVE - A
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: NATIVE_ADDRESS,
        tokenOut: packPosId(poolToSwap, POOL_IDS.A),
        amount: numberToWei(0.0001, 18),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: NATIVE_ADDRESS,
        tokenOut: packPosId(poolToSwap, POOL_IDS.B),
        amount: numberToWei(0.0001, 18),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: NATIVE_ADDRESS,
        tokenOut: packPosId(poolToSwap, POOL_IDS.C),
        amount: numberToWei(0.0001, 18),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
  })

  test('R-open', async () => {
    const chainId = 137
    const accountAddress = '0xE61383556642AF1Bd7c5756b13f19A63Dc8601df'
    const poolToSwap = '0x45c0C6a6d08B430F73b80b54dF09050114f5D55b'
    const rpcUrl = RPCs[chainId] ?? throwError()
    const sdk = new DerionSDK({ chainId })
    await sdk.init()

    const signer = new VoidSigner(accountAddress, new JsonRpcProvider(rpcUrl));

    const txLogs = await loadAccountLogs(rpcUrl, chainId, accountAddress)
    const { poolAddresses } = sdk.extractLogs(txLogs)

    const stateLoader = sdk.getStateLoader(rpcUrl)
    const pools: Pools = {}
    sdk.importPools(pools, poolAddresses)
    await stateLoader.update({ pools })
    const account = sdk.createAccount(accountAddress)
    account.processLogs(txLogs)
    const swapper = sdk.createSwapper(rpcUrl)
    // Token R -> A
    const poolToSwapR = pools[poolToSwap].config?.TOKEN_R
    expect(poolToSwapR?.length).toBeGreaterThanOrEqual(42)
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: poolToSwapR || '',
        tokenOut: packPosId(poolToSwap, POOL_IDS.A),
        amount: numberToWei(0.1, 6),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    // Token R -> B
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: poolToSwapR || '',
        tokenOut: packPosId(poolToSwap, POOL_IDS.B),
        amount: numberToWei(0.1, 6),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    // Token R -> C
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: poolToSwapR || '',
        tokenOut: packPosId(poolToSwap, POOL_IDS.C),
        amount: numberToWei(0.1, 6),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
  })

  test('any-open', async () => {
    const chainId = 42161
    const accountAddress = '0xD42d6d58F95A3DA9011EfEcA086200A64B266c10'
    const poolToSwap = '0xf3cE4cbfF83AE70e9F76b22cd9b683F167d396dd'
    const rpcUrl = RPCs[chainId] ?? throwError()
    const sdk = new DerionSDK({ chainId })
    await sdk.init()

    const signer = new VoidSigner(accountAddress, new JsonRpcProvider(rpcUrl));

    const txLogs = await loadAccountLogs(rpcUrl, chainId, accountAddress)
    const { poolAddresses } = sdk.extractLogs(txLogs)

    const stateLoader = sdk.getStateLoader(rpcUrl)
    const pools: Pools = {}
    sdk.importPools(pools, poolAddresses)
    await stateLoader.update({ pools })
    const account = sdk.createAccount(accountAddress)
    account.processLogs(txLogs)
    const swapper = sdk.createSwapper(rpcUrl)
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: packPosId(poolToSwap, POOL_IDS.A),
        amount: "1000",
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3500000)
    }
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: packPosId(poolToSwap, POOL_IDS.B),
        amount: "1000",
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3500000)
    }
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: packPosId(poolToSwap, POOL_IDS.C),
        amount: "1000",
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3500000)
    }
  })

  test('positions-swap', async () => {
    const chainId = 42161
    const accountAddress = '0xD42d6d58F95A3DA9011EfEcA086200A64B266c10'
    const rpcUrl = RPCs[chainId] ?? throwError()
    const sdk = new DerionSDK({ chainId })
    await sdk.init()
    const signer = new VoidSigner(accountAddress, new JsonRpcProvider(rpcUrl));

    const txLogs = await loadAccountLogs(rpcUrl, chainId, accountAddress)
    const { poolAddresses } = sdk.extractLogs(txLogs)

    const stateLoader = sdk.getStateLoader(rpcUrl)
    const pools: Pools = {}
    sdk.importPools(pools, poolAddresses)
    await stateLoader.update({ pools })
    const account = sdk.createAccount(accountAddress)
    account.processLogs(txLogs)
    const positionPoolARB = '0xf3cE4cbfF83AE70e9F76b22cd9b683F167d396dd' // Derion pool ARB/ETH
    const positionPoolWBTC = '0x3ed9997b3039b4A000f1BAfF3F6104FB05F4e53B' // Derion pool WBTC/USDC
    const swapper = sdk.createSwapper(rpcUrl)
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.A),
        tokenOut: packPosId(positionPoolWBTC, POOL_IDS.C),
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.A)].balance.toString(),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.A),
        tokenOut: packPosId(positionPoolARB, POOL_IDS.B),
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.A)].balance.toString(),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.B),
        tokenOut: packPosId(positionPoolWBTC, POOL_IDS.C),
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.B)].balance.toString(),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
  })

  test('positions-close', async () => {
    const chainId = 42161
    const accountAddress = '0xD42d6d58F95A3DA9011EfEcA086200A64B266c10'
    const rpcUrl = RPCs[chainId] ?? throwError()
    const sdk = new DerionSDK({ chainId })
    await sdk.init()
    const signer = new VoidSigner(accountAddress, new JsonRpcProvider(rpcUrl));

    const txLogs = await loadAccountLogs(rpcUrl, chainId, accountAddress)
    const { poolAddresses } = sdk.extractLogs(txLogs)

    const stateLoader = sdk.getStateLoader(rpcUrl)
    const pools: Pools = {}
    sdk.importPools(pools, poolAddresses)
    await stateLoader.update({ pools })
    const account = sdk.createAccount(accountAddress)
    account.processLogs(txLogs)
    const positionPoolARB = '0xf3cE4cbfF83AE70e9F76b22cd9b683F167d396dd' // Derion pool ARB/ETH
    const positionPoolWBTC = '0x3ed9997b3039b4A000f1BAfF3F6104FB05F4e53B' // Derion pool WBTC/USDC
    const positionPoolWETH = '0xAaf8FAC8F5709B0c954c9Af1d369A9b157e31FfE' // Derion pool WBTC/USDC

    const swapper = sdk.createSwapper(rpcUrl)
    {
      // console.log('A -> NATIVE')
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.A),
        tokenOut: pools[positionPoolARB].config?.TOKEN_R || "",
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.A)].balance.toString(),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      // console.log('B -> NATIVE')

      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.B),
        tokenOut: NATIVE_ADDRESS,
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.B)].balance.toString(),
        deps: {
          signer,
          pools
        }
      })

      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      // console.log('C -> NATIVE')

      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolWETH, POOL_IDS.C),
        tokenOut: NATIVE_ADDRESS,
        amount: account.positions[packPosId(positionPoolWETH, POOL_IDS.C)].balance.toString(),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }


    {
      // console.log('A -> R')
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.A),
        tokenOut: pools[positionPoolARB].config?.TOKEN_R || "",
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.A)].balance.toString(),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      // console.log('B -> R')

      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.B),
        tokenOut: pools[positionPoolARB].config?.TOKEN_R || "",
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.B)].balance.toString(),
        deps: {
          signer,
          pools
        }
      })

      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      // console.log('C -> R')

      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolWETH, POOL_IDS.C),
        tokenOut: pools[positionPoolWETH].config?.TOKEN_R || "",
        amount: account.positions[packPosId(positionPoolWETH, POOL_IDS.C)].balance.toString(),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }

    const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'

    {
      // console.log('A -> USDC')
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.A),
        tokenOut: USDC,
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.A)].balance.toString(),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      // console.log('B -> USDC')

      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.B),
        tokenOut: USDC,
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.B)].balance.toString(),
        deps: {
          signer,
          pools
        }
      })

      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      // console.log('C -> USDC')

      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolWETH, POOL_IDS.C),
        tokenOut: USDC,
        amount: account.positions[packPosId(positionPoolWETH, POOL_IDS.C)].balance.toString(),
        deps: {
          signer,
          pools
        }
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }

  })
})

async function loadAccountLogs(rpcUrl, chainId, accountAddress): Promise<LogType[][]> {
  const fp = path.join(__dirname, `logs/${chainId}-${accountAddress}.json`)
  return require(fp)
}
