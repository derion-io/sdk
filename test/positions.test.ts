import { BigNumber } from 'ethers'
import { bn, packPosId, formatQ128 } from '../src/utils'
import { Q128 } from '../src/utils/constant'
import { POOL_IDS } from '../src/utils/constant'
import { calcPoolInfo, calcPoolSide, calcPositionState } from '../src/utils/positions'
import { Pool, Pools, Position } from '../src/type'

// Create realistic synthetic pool data
function makePool(overrides?: Partial<Pool>): Pool {
  const K = 4
  // MARK = 1.0 in Q128
  const MARK = Q128

  // R = 10000 (total reserve)
  const R = bn(10000)
  // a, b coefficients — balanced pool
  const a = R.div(4)
  const b = R.div(4)

  // Supply values
  const sA = bn('1000000')
  const sB = bn('1000000')
  const sC = bn('500000')

  // Reserve allocations
  const rA = bn(3000)
  const rB = bn(3000)
  const rC = bn(4000)

  // spot = MARK (at equilibrium)
  const spot = Q128
  const twap = Q128

  return {
    address: '0xE4581De9550a80DC1A442a8fC6ccbf980ec1B71C',
    config: {
      FETCHER: '0x0000000000000000000000000000000000000001',
      ORACLE: '0x0000000000000000000000000000000000000000000000000000000000000001',
      TOKEN_R: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      K,
      MARK,
      INTEREST_HL: 86400,
      PREMIUM_HL: 86400,
      OPEN_RATE: Q128,
      R_DT: 3600,
    },
    metadata: {
      reserve: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', decimals: 18 },
      base: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', decimals: 18 },
      quote: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6 },
    },
    state: { R, a, b },
    view: { sA, sB, sC, rA, rB, rC, spot, twap },
    ...overrides,
  }
}

describe('positions', () => {
  describe('calcPoolInfo', () => {
    it('calculates pool info for balanced pool', () => {
      const pool = makePool()
      const info = calcPoolInfo(pool)

      expect(info.sides[POOL_IDS.A]).toBeDefined()
      expect(info.sides[POOL_IDS.B]).toBeDefined()
      expect(info.sides[POOL_IDS.C]).toBeDefined()
      expect(info.interestRate).toBeGreaterThan(0)
      expect(info.dgA).toBeDefined()
      expect(info.dgB).toBeDefined()
    })

    it('has zero premium for balanced pool (rA == rB)', () => {
      const pool = makePool()
      const info = calcPoolInfo(pool)

      expect(info.sides[POOL_IDS.A].premium).toBe(0)
      expect(info.sides[POOL_IDS.B].premium).toBe(0)
      expect(info.sides[POOL_IDS.C].premium).toBe(0)
    })

    it('has non-zero premium for unbalanced pool', () => {
      const pool = makePool({
        view: {
          ...makePool().view!,
          rA: bn(5000),
          rB: bn(1000),
        },
      })
      const info = calcPoolInfo(pool)

      // A side pays premium (larger side)
      expect(info.sides[POOL_IDS.A].premium).toBeGreaterThan(0)
      // B side receives premium
      expect(info.sides[POOL_IDS.B].premium).toBeLessThan(0)
    })

    it('throws for pool without config', () => {
      const pool: Pool = { address: '0x0000000000000000000000000000000000000001' }
      expect(() => calcPoolInfo(pool)).toThrow('missing pool data')
    })
  })

  describe('calcPoolSide', () => {
    it('calculates side info for A', () => {
      const pool = makePool()
      const result = calcPoolSide(pool, POOL_IDS.A)

      expect(result.leverage).toBeGreaterThan(0)
      expect(result.effectiveLeverage).toBeGreaterThanOrEqual(0)
      expect(result.dgA).toBeDefined()
      expect(result.dgB).toBeDefined()
      expect(typeof result.funding).toBe('number')
    })

    it('throws for pool without state', () => {
      const pool: Pool = {
        address: '0x0000000000000000000000000000000000000001',
        config: makePool().config,
      }
      expect(() => calcPoolSide(pool, POOL_IDS.A)).toThrow('missing pool data')
    })
  })

  describe('calcPositionState', () => {
    it('calculates position view for side A', () => {
      const pool = makePool()
      const pools: Pools = { [pool.address]: pool }

      const posId = packPosId(pool.address, POOL_IDS.A)
      const position: Position = {
        id: posId,
        balance: bn(10000),
        priceR: Q128,
        price: Q128,
        rPerBalance: Q128.div(10),
      }

      const view = calcPositionState(position, pools)

      expect(view.poolAddress).toBe(pool.address)
      expect(view.side).toBe(POOL_IDS.A)
      expect(view.balance.eq(position.balance)).toBe(true)
      expect(view.leverage).toBeGreaterThan(0)
      expect(view.valueR.gt(0)).toBe(true)
      expect(view.entryPrice.eq(Q128)).toBe(true)
      expect(view.entryValueR.gt(0)).toBe(true)
    })

    it('calculates position view for side B', () => {
      const pool = makePool()
      const pools: Pools = { [pool.address]: pool }

      const posId = packPosId(pool.address, POOL_IDS.B)
      const position: Position = {
        id: posId,
        balance: bn(10000),
        priceR: Q128,
        price: Q128,
        rPerBalance: Q128.div(10),
      }

      const view = calcPositionState(position, pools)

      expect(view.side).toBe(POOL_IDS.B)
      expect(view.valueR.gt(0)).toBe(true)
    })

    it('calculates position view for side C (LP)', () => {
      const pool = makePool()
      const pools: Pools = { [pool.address]: pool }

      const posId = packPosId(pool.address, POOL_IDS.C)
      const position: Position = {
        id: posId,
        balance: bn(10000),
        priceR: Q128,
        price: Q128,
        rPerBalance: Q128.div(10),
      }

      const view = calcPositionState(position, pools)

      expect(view.side).toBe(POOL_IDS.C)
      // LP has no simPnL (L=0)
      expect(view.simPnL).toBeUndefined()
    })

    it('computes netPnL for non-LP positions', () => {
      const pool = makePool()
      const pools: Pools = { [pool.address]: pool }

      const posId = packPosId(pool.address, POOL_IDS.A)
      const position: Position = {
        id: posId,
        balance: bn(10000),
        priceR: Q128,
        price: Q128,
        rPerBalance: Q128.div(10),
      }

      const view = calcPositionState(position, pools)
      expect(view.netPnL).toBeDefined()
      expect(view.simPnL).toBeDefined()
      expect(view.simPnL!.linear).toBeDefined()
      expect(view.simPnL!.power).toBeDefined()
      expect(view.simPnL!.powerBenefit).toBeDefined()
      expect(view.simPnL!.funding).toBeDefined()
    })

    it('includes valueU when currentPriceR is provided', () => {
      const pool = makePool()
      const pools: Pools = { [pool.address]: pool }

      const posId = packPosId(pool.address, POOL_IDS.A)
      const position: Position = {
        id: posId,
        balance: bn(10000),
        priceR: Q128.mul(2000),
        price: Q128,
        rPerBalance: Q128.div(10),
      }

      const view = calcPositionState(position, pools, Q128.mul(2000))
      expect(view.valueU).toBeDefined()
      expect(view.valueU!.gt(0)).toBe(true)
    })

    it('throws when pool state missing', () => {
      const pool: Pool = { address: '0xE4581De9550a80DC1A442a8fC6ccbf980ec1B71C' }
      const pools: Pools = { [pool.address]: pool }

      const posId = packPosId(pool.address, POOL_IDS.A)
      const position: Position = {
        id: posId,
        balance: bn(10000),
        priceR: Q128,
        price: Q128,
        rPerBalance: Q128.div(10),
      }

      expect(() => calcPositionState(position, pools)).toThrow('missing pool state')
    })
  })
})
