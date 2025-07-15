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
import { getAddress } from 'ethers/lib/utils'

const interceptor = new Interceptor()

const RPCs = {
  137: 'https://polygon.llamarpc.com',
  42161: 'https://arbitrum.meowrpc.com',
}

describe('SDK', () => {
  beforeEach(() => {
    interceptor.setContext(expect.getState().currentTestName)
  })

  test('logs', async () => {
    const chainId = 42161
    const accountAddress = '0x0DbCa96184eEd4C6a1291403c93311ebE6646785'
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

    // const posViews = Object.values(account.positions).map((pos) => sdk.calcPositionState(pos, pools))
    // console.log(...posViews.map((pv) => formatPositionView(pv)))

    const positionAddress = Object.keys(account.positions)[0] ?? '0x00000000000000000000002090c153fc30f6c2abdd5ff3ccf22bafba872d1509'
    const posView = sdk.calcPositionState(account.positions[positionAddress], pools)
    // expect(formatQ128(posView.netPnL ?? BIG_0)).toBeCloseTo(0.6434, 1)
    expect(formatQ128(posView.netPnL ?? BIG_0)).toBeGreaterThanOrEqual(0)
  })

  test('native-open', async () => {
    const chainId = 42161
    const accountAddress = '0x0DbCa96184eEd4C6a1291403c93311ebE6646785'
    const poolToSwap = '0xE4581De9550a80DC1A442a8fC6ccbf980ec1B71C'

    const rpcUrl = RPCs[chainId] ?? throwError()
    const sdk = new DerionSDK({ chainId })
    await sdk.init()

    const signer = new VoidSigner(accountAddress, new JsonRpcProvider(rpcUrl))

    const stateLoader = sdk.getStateLoader(rpcUrl)

    const pools: Pools = {}
    sdk.importPools(pools, [poolToSwap])
    await stateLoader.update({ pools })

    const swapper = sdk.createSwapper(rpcUrl)
    // NATIVE - A
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: NATIVE_ADDRESS,
        tokenOut: packPosId(poolToSwap, POOL_IDS.A),
        amount: numberToWei(0.01, 18),
        deps: {
          signer,
          pools,
        },
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
          pools,
        },
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
          pools,
        },
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
  })

  test('R-open', async () => {
    const chainId = 42161
    const accountAddress = '0xE61383556642AF1Bd7c5756b13f19A63Dc8601df'
    const poolToSwap = '0xE4581De9550a80DC1A442a8fC6ccbf980ec1B71C'

    const rpcUrl = RPCs[chainId] ?? throwError()
    const sdk = new DerionSDK({ chainId })
    await sdk.init()

    const signer = new VoidSigner(accountAddress, new JsonRpcProvider(rpcUrl))

    const stateLoader = sdk.getStateLoader(rpcUrl)
    const pools: Pools = {}
    sdk.importPools(pools, [poolToSwap])
    await stateLoader.update({ pools })
    const swapper = sdk.createSwapper(rpcUrl)

    // Token R -> A
    const token = pools[poolToSwap].config?.TOKEN_R
    expect(token?.length).toBeGreaterThanOrEqual(42)
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: token || '',
        tokenOut: packPosId(poolToSwap, POOL_IDS.A),
        amount: numberToWei(0.01),
        deps: {
          signer,
          pools,
        },
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    // Token R -> B
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: token || '',
        tokenOut: packPosId(poolToSwap, POOL_IDS.B),
        amount: numberToWei(0.01),
        deps: {
          signer,
          pools,
        },
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    // Token R -> C
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: token || '',
        tokenOut: packPosId(poolToSwap, POOL_IDS.C),
        amount: numberToWei(0.01),
        deps: {
          signer,
          pools,
        },
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
  })

  test('any-open', async () => {
    const chainId = 42161
    const accountAddress = '0xE61383556642AF1Bd7c5756b13f19A63Dc8601df'
    const poolToSwap = '0xE4581De9550a80DC1A442a8fC6ccbf980ec1B71C'

    const rpcUrl = RPCs[chainId] ?? throwError()
    const sdk = new DerionSDK({ chainId })
    await sdk.init()

    const signer = new VoidSigner(accountAddress, new JsonRpcProvider(rpcUrl))
    const stateLoader = sdk.getStateLoader(rpcUrl)

    const pools: Pools = {}
    sdk.importPools(pools, [poolToSwap])
    await stateLoader.update({ pools })
    const swapper = sdk.createSwapper(rpcUrl)
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC
        tokenOut: packPosId(poolToSwap, POOL_IDS.A),
        amount: '1000',
        deps: {
          decimals: { '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8': 6 },
          signer,
          pools,
        },
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3500000)
    }
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC
        tokenOut: packPosId(poolToSwap, POOL_IDS.B),
        amount: '1000',
        deps: {
          decimals: { '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8': 6 },
          signer,
          pools,
        },
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3500000)
    }
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC
        tokenOut: packPosId(poolToSwap, POOL_IDS.C),
        amount: '1000',
        deps: {
          decimals: { '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8': 6 },
          signer,
          pools,
        },
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3500000)
    }
  })

  test('positions-swap', async () => {
    const chainId = 42161
    const accountAddress = '0x0DbCa96184eEd4C6a1291403c93311ebE6646785'
    const rpcUrl = RPCs[chainId] ?? throwError()
    const sdk = new DerionSDK({ chainId })
    await sdk.init()

    const signer = new VoidSigner(accountAddress, new JsonRpcProvider(rpcUrl))

    const txLogs = await loadAccountLogs(rpcUrl, chainId, accountAddress)
    const { poolAddresses } = sdk.extractLogs(txLogs)

    const stateLoader = sdk.getStateLoader(rpcUrl)

    const pools: Pools = {}
    sdk.importPools(pools, poolAddresses)
    await stateLoader.update({ pools })

    const account = sdk.createAccount(accountAddress)
    account.processLogs(txLogs)

    const positionPoolARB = '0xE4581De9550a80DC1A442a8fC6ccbf980ec1B71C' // Derion pool ARB/ETH
    const positionPoolWBTC = '0x46683FcbCe186a7A8d6839955E1F27f0Ea046374' // Derion pool WBTC/USDC
    const swapper = sdk.createSwapper(rpcUrl)
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.A),
        tokenOut: packPosId(positionPoolWBTC, POOL_IDS.C),
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.A)].balance.sub(1000).toString(),
        deps: {
          signer,
          pools,
        },
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.A),
        tokenOut: packPosId(positionPoolARB, POOL_IDS.B),
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.A)].balance.sub(1000).toString(),
        deps: {
          signer,
          pools,
        },
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.B),
        tokenOut: packPosId(positionPoolWBTC, POOL_IDS.C),
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.B)].balance.sub(1000).toString(),
        deps: {
          signer,
          pools,
        },
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
  })

  test('positions-close', async () => {
    const chainId = 42161
    const accountAddress = '0x0DbCa96184eEd4C6a1291403c93311ebE6646785'
    const rpcUrl = RPCs[chainId] ?? throwError()
    const sdk = new DerionSDK({ chainId })
    await sdk.init()

    const signer = new VoidSigner(accountAddress, new JsonRpcProvider(rpcUrl))

    const txLogs = await loadAccountLogs(rpcUrl, chainId, accountAddress)
    const { poolAddresses } = sdk.extractLogs(txLogs)

    const stateLoader = sdk.getStateLoader(rpcUrl)

    const pools: Pools = {}
    sdk.importPools(pools, poolAddresses)
    await stateLoader.update({ pools })

    const account = sdk.createAccount(accountAddress)
    account.processLogs(txLogs)

    const positionPoolARB = '0xE4581De9550a80DC1A442a8fC6ccbf980ec1B71C' // Derion pool ARB/ETH
    const positionPoolWBTC = '0x46683FcbCe186a7A8d6839955E1F27f0Ea046374' // Derion pool WBTC/USDC
    const positionPoolWETH = '0xAaf8FAC8F5709B0c954c9Af1d369A9b157e31FfE' // Derion pool WETH/USDC

    const swapper = sdk.createSwapper(rpcUrl)
    {
      // console.log('A -> NATIVE')

      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.A),
        tokenOut: pools[positionPoolARB].config?.TOKEN_R || '',
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.A)].balance.sub(1000).toString(),
        deps: {
          signer,
          pools,
        },
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
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.B)].balance.sub(1000).toString(),
        deps: {
          signer,
          pools,
        },
      })

      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      // console.log('C -> NATIVE')

      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolWBTC, POOL_IDS.C),
        tokenOut: NATIVE_ADDRESS,
        amount: account.positions[packPosId(positionPoolWBTC, POOL_IDS.C)].balance.sub(10000).toString(),
        deps: {
          signer,
          pools,
        },
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }

    {
      // console.log('A -> R')

      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.A),
        tokenOut: pools[positionPoolARB].config?.TOKEN_R || '',
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.A)].balance.sub(1000).toString(),
        deps: {
          signer,
          pools,
        },
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      // console.log('B -> R')

      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolARB, POOL_IDS.B),
        tokenOut: pools[positionPoolARB].config?.TOKEN_R || '',
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.B)].balance.sub(1000).toString(),
        deps: {
          signer,
          pools,
        },
      })

      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      // console.log('C -> R')

      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolWBTC, POOL_IDS.C),
        tokenOut: pools[positionPoolWBTC].config?.TOKEN_R || '',
        amount: account.positions[packPosId(positionPoolWBTC, POOL_IDS.C)].balance.sub(1000).toString(),
        deps: {
          signer,
          pools,
        },
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
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.A)].balance.sub(1000).toString(),
        deps: {
          signer,
          pools,
        },
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
        amount: account.positions[packPosId(positionPoolARB, POOL_IDS.B)].balance.sub(1000).toString(),
        deps: {
          signer,
          pools,
        },
      })

      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
    {
      // console.log('C -> USDC')

      const { amountOuts, gasUsed } = await swapper.simulate({
        tokenIn: packPosId(positionPoolWBTC, POOL_IDS.C),
        tokenOut: USDC,
        amount: account.positions[packPosId(positionPoolWBTC, POOL_IDS.C)].balance.sub(1000).toString(),
        deps: {
          signer,
          pools,
        },
      })
      const amountOut = amountOuts[amountOuts.length - 1]
      expect(amountOut.gt(0)).toBeTruthy()
      expect(gasUsed).toBeLessThan(3000000)
    }
  })
})

async function loadAccountLogs(rpcUrl, chainId, accountAddress): Promise<LogType[][]> {
  const fp = path.join(__dirname, `logs/${chainId}-${accountAddress}.json`)
  const txLogs = await require(fp)

  for (const logs of txLogs) {
    for (const log of logs) {
      log.address = getAddress(log.address)
    }
  }

  return txLogs
}
