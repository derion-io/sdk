import { BigNumber } from 'ethers'
import {
  bn, isPosId, packPosId, unpackPosId, groupBy,
  throwError, sideFromToken, addressFromToken,
  formatQ128, formatPercentage, thousandsInt,
  xr, powX128,
} from '../src/utils'
import { NATIVE_ADDRESS, POOL_IDS, Q128 } from '../src/utils/constant'

describe('utils/index', () => {
  describe('bn', () => {
    it('converts number to BigNumber', () => {
      expect(bn(42).eq(BigNumber.from(42))).toBe(true)
    })
    it('converts hex string to BigNumber', () => {
      expect(bn('0xff').eq(255)).toBe(true)
    })
  })

  describe('isPosId', () => {
    it('returns true for 66-char hex string', () => {
      expect(isPosId('0x' + '0'.repeat(64))).toBe(true)
    })
    it('returns false for 42-char address', () => {
      expect(isPosId('0x' + '0'.repeat(40))).toBe(false)
    })
    it('returns false for empty string', () => {
      expect(isPosId('')).toBe(false)
    })
  })

  describe('packPosId / unpackPosId', () => {
    const pool = '0xE4581De9550a80DC1A442a8fC6ccbf980ec1B71C'
    const side = POOL_IDS.A // 0x10

    it('round-trips correctly', () => {
      const packed = packPosId(pool, side)
      expect(packed.length).toBe(66)
      expect(isPosId(packed)).toBe(true)

      const [addr, s] = unpackPosId(packed)
      expect(addr).toBe(pool)
      expect(s).toBe(side)
    })

    it('encodes side in first 12 bytes', () => {
      const packed = packPosId(pool, POOL_IDS.B)
      const [, s] = unpackPosId(packed)
      expect(s).toBe(POOL_IDS.B)
    })

    it('encodes pool address in last 20 bytes', () => {
      const packed = packPosId(pool, POOL_IDS.C)
      const [addr] = unpackPosId(packed)
      expect(addr).toBe(pool)
    })

    it('works for all pool sides', () => {
      for (const [name, side] of Object.entries({ A: POOL_IDS.A, B: POOL_IDS.B, C: POOL_IDS.C })) {
        const packed = packPosId(pool, side)
        const [addr, s] = unpackPosId(packed)
        expect(addr).toBe(pool)
        expect(s).toBe(side)
      }
    })
  })

  describe('groupBy', () => {
    it('groups array by key', () => {
      const items = [
        { type: 'a', val: 1 },
        { type: 'b', val: 2 },
        { type: 'a', val: 3 },
      ]
      const grouped = groupBy(items, 'type')
      expect(grouped['a']).toHaveLength(2)
      expect(grouped['b']).toHaveLength(1)
    })
  })

  describe('throwError', () => {
    it('throws Error with default message', () => {
      expect(() => throwError()).toThrow('MISSING DATA')
    })
    it('throws Error with custom message', () => {
      expect(() => throwError('custom')).toThrow('custom')
    })
  })

  describe('sideFromToken', () => {
    const pool = '0xE4581De9550a80DC1A442a8fC6ccbf980ec1B71C'
    const TOKEN_R = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    const WRAPPED = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'

    it('returns side from position ID', () => {
      const posId = packPosId(pool, POOL_IDS.A)
      expect(sideFromToken(posId, TOKEN_R, WRAPPED)).toBe(POOL_IDS.A)
    })

    it('returns R for TOKEN_R address', () => {
      expect(sideFromToken(TOKEN_R, TOKEN_R, WRAPPED)).toBe(POOL_IDS.R)
    })

    it('returns native when address is NATIVE and TOKEN_R is wrapped', () => {
      expect(sideFromToken(NATIVE_ADDRESS, WRAPPED, WRAPPED)).toBe(POOL_IDS.native)
    })

    it('returns 0 for unknown address', () => {
      expect(sideFromToken('0x0000000000000000000000000000000000000001', TOKEN_R, WRAPPED)).toBe(0)
    })
  })

  describe('addressFromToken', () => {
    const pool = '0xE4581De9550a80DC1A442a8fC6ccbf980ec1B71C'
    const TOKEN_R = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    const WRAPPED = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'

    it('extracts pool address from position ID', () => {
      const posId = packPosId(pool, POOL_IDS.B)
      expect(addressFromToken(posId, TOKEN_R, WRAPPED)).toBe(pool)
    })

    it('returns wrapped address for NATIVE when TOKEN_R is wrapped', () => {
      expect(addressFromToken(NATIVE_ADDRESS, WRAPPED, WRAPPED)).toBe(WRAPPED)
    })

    it('returns address as-is for regular tokens', () => {
      const token = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
      expect(addressFromToken(token, TOKEN_R, WRAPPED)).toBe(token)
    })
  })

  describe('formatQ128', () => {
    it('formats zero', () => {
      expect(formatQ128(bn(0))).toBe(0)
    })

    it('formats Q128 value of 1.0', () => {
      expect(formatQ128(Q128)).toBe(1)
    })

    it('formats Q128 value of 2.0', () => {
      expect(formatQ128(Q128.mul(2))).toBe(2)
    })

    it('formats fractional Q128 value', () => {
      const half = Q128.div(2)
      expect(formatQ128(half)).toBe(0.5)
    })

    it('handles negative values', () => {
      const neg = bn(0).sub(Q128)
      expect(formatQ128(neg)).toBe(-1)
    })
  })

  describe('formatPercentage', () => {
    it('formats 0.5 as 50%', () => {
      expect(formatPercentage(0.5)).toBe('50.00%')
    })
    it('formats with custom precision', () => {
      expect(formatPercentage(0.1234, 1)).toBe('12.3%')
    })
  })

  describe('thousandsInt', () => {
    it('adds commas to large numbers', () => {
      expect(thousandsInt('1000000')).toBe('1,000,000')
    })
    it('leaves small numbers alone', () => {
      expect(thousandsInt('999')).toBe('999')
    })
  })

  describe('powX128', () => {
    it('returns Q128 for k=0', () => {
      expect(powX128(Q128, 0).eq(Q128)).toBe(true)
    })

    it('returns x for k=1', () => {
      const x = Q128.mul(2) // 2.0 in Q128
      const result = powX128(x, 1)
      expect(formatQ128(result)).toBeCloseTo(2.0, 2)
    })

    it('returns x^2 for k=2', () => {
      const x = Q128.mul(3) // 3.0 in Q128
      const result = powX128(x, 2)
      expect(formatQ128(result)).toBeCloseTo(9.0, 1)
    })

    it('handles negative k (reciprocal)', () => {
      const x = Q128.mul(2) // 2.0 in Q128
      const result = powX128(x, -1)
      expect(formatQ128(result)).toBeCloseTo(0.5, 2)
    })
  })
})
