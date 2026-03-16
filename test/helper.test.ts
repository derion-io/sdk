import { BigNumber } from 'ethers'
import { bn } from '../src/utils'
import { Q128 } from '../src/utils/constant'
import {
  weiToNumber, numberToWei,
  truncate, round,
  IEW, WEI,
  STR, NUM, BIG,
  DIV, SHL,
  rateToHL, rateFromHL,
  compareLog, mergeTwoUniqSortedLogs,
} from '../src/utils/helper'
import { LogType } from '../src/type'

describe('helper', () => {
  describe('weiToNumber', () => {
    it('converts 1e18 wei to "1"', () => {
      expect(weiToNumber('1000000000000000000')).toBe('1')
    })

    it('converts with custom decimals', () => {
      expect(weiToNumber('1000000', 6)).toBe('1')
    })

    it('returns "0" for falsy input', () => {
      expect(weiToNumber(null)).toBe('0')
      expect(weiToNumber(0)).toBe('0')
      expect(weiToNumber('')).toBe('0')
    })

    it('limits decimal display', () => {
      const result = weiToNumber('1500000000000000000', 18, 2)
      expect(result).toBe('1.5')
    })

    it('truncates to integer when decimalToDisplay=0', () => {
      const result = weiToNumber('1999000000000000000', 18, 0)
      expect(result).toBe('1')
    })
  })

  describe('numberToWei', () => {
    it('converts "1" to 1e18', () => {
      expect(numberToWei('1')).toBe('1000000000000000000')
    })

    it('converts with custom decimals', () => {
      expect(numberToWei('1', 6)).toBe('1000000')
    })

    it('handles decimal input', () => {
      expect(numberToWei('0.5')).toBe('500000000000000000')
    })

    it('returns "0" for falsy input', () => {
      expect(numberToWei(0)).toBe('0')
      expect(numberToWei('')).toBe('0')
      expect(numberToWei(null)).toBe('0')
    })

    it('handles number type input', () => {
      expect(numberToWei(1, 6)).toBe('1000000')
    })

    it('handles very small numbers', () => {
      const result = numberToWei('0.000001', 18)
      expect(result).toBe('1000000000000')
    })
  })

  describe('truncate / round', () => {
    it('truncates to integer', () => {
      expect(truncate('123.456')).toBe('123')
    })

    it('truncates to 2 decimals', () => {
      expect(truncate('123.456', 2)).toBe('123.45')
    })

    it('rounds up', () => {
      expect(round('123.456', 2)).toBe('123.46')
    })

    it('rounds down when digit < 5', () => {
      expect(round('123.444', 2)).toBe('123.44')
    })

    it('handles integer input', () => {
      expect(truncate('123')).toBe('123')
    })
  })

  describe('STR', () => {
    it('converts number to string', () => {
      expect(STR(42)).toBe('42')
    })

    it('returns "0" for falsy', () => {
      expect(STR(0)).toBe('0')
    })

    it('handles BigNumber', () => {
      expect(STR(bn(100))).toBe('100')
    })

    it('returns numeric string as-is', () => {
      expect(STR('42')).toBe('42')
    })

    it('handles Infinity', () => {
      expect(STR(Infinity)).toBe('∞')
      expect(STR(-Infinity)).toBe('-∞')
    })
  })

  describe('NUM', () => {
    it('returns number as-is', () => {
      expect(NUM(42)).toBe(42)
    })

    it('parses string to number', () => {
      expect(NUM('3.14')).toBeCloseTo(3.14)
    })

    it('returns 0 for falsy', () => {
      expect(NUM(0)).toBe(0)
      expect(NUM('')).toBe(0)
    })

    it('handles infinity strings', () => {
      expect(NUM('∞')).toBe(Infinity)
      expect(NUM('-∞')).toBe(-Infinity)
    })

    it('converts BigNumber to number', () => {
      expect(NUM(bn(99))).toBe(99)
    })
  })

  describe('BIG', () => {
    it('returns BigNumber as-is', () => {
      const b = bn(42)
      expect(BIG(b)).toBe(b)
    })

    it('converts number to BigNumber', () => {
      expect(BIG(42).eq(42)).toBe(true)
    })

    it('converts string to BigNumber', () => {
      expect(BIG('100').eq(100)).toBe(true)
    })

    it('returns 0 for falsy', () => {
      expect(BIG(0).eq(0)).toBe(true)
    })
  })

  describe('IEW / WEI', () => {
    it('IEW converts wei BigNumber to decimal string', () => {
      expect(IEW(bn('1000000000000000000'))).toBe('1')
    })

    it('IEW with decimals to display', () => {
      const result = IEW(bn('1500000000000000000'), 18, 2)
      expect(result).toBe('1.5')
    })

    it('WEI converts decimal string to wei string', () => {
      expect(WEI(1)).toBe('1000000000000000000')
    })

    it('WEI with custom decimals', () => {
      expect(WEI('1.5', 6)).toBe('1500000')
    })
  })

  describe('DIV', () => {
    it('divides two BigNumbers', () => {
      const result = DIV(bn(100), bn(3))
      expect(Number(result)).toBeCloseTo(33.3333, 2)
    })

    it('divides equal numbers to ~1', () => {
      const result = DIV(bn(1000), bn(1000))
      expect(Number(result)).toBeCloseTo(1, 2)
    })
  })

  describe('SHL', () => {
    it('shifts left by positive amount', () => {
      expect(SHL(bn(1), 3).eq(8)).toBe(true)
    })

    it('shifts right by negative amount', () => {
      expect(SHL(bn(8), -3).eq(1)).toBe(true)
    })

    it('handles negative values', () => {
      const result = SHL(bn(-4), 1)
      expect(result.eq(-8)).toBe(true)
    })
  })

  describe('rateToHL / rateFromHL', () => {
    it('round-trips approximately (Math.ceil in rateToHL)', () => {
      const hl = 3600
      const power = 4
      const rate = rateFromHL(hl, power)
      const result = rateToHL(rate, power)
      // rateToHL uses Math.ceil, so result may be hl or hl+1
      expect(Math.abs(result - hl)).toBeLessThanOrEqual(1)
    })

    it('returns 0 when input is 0', () => {
      expect(rateToHL(0, 4)).toBe(0)
      expect(rateFromHL(0, 4)).toBe(0)
    })
  })

  describe('compareLog', () => {
    const makeLog = (blockNumber: number, logIndex: number): LogType => ({
      blockNumber,
      logIndex,
      contractAddress: '',
      address: '',
      timeStamp: 0,
      transactionHash: '',
      index: 0,
      name: '',
      topics: [],
      data: '',
      args: null,
    })

    it('returns negative when a < b by block', () => {
      expect(compareLog(makeLog(1, 0), makeLog(2, 0))).toBeLessThan(0)
    })

    it('returns positive when a > b by block', () => {
      expect(compareLog(makeLog(2, 0), makeLog(1, 0))).toBeGreaterThan(0)
    })

    it('returns negative when same block, a < b by logIndex', () => {
      expect(compareLog(makeLog(1, 0), makeLog(1, 1))).toBeLessThan(0)
    })

    it('returns 0 when equal', () => {
      expect(compareLog(makeLog(1, 0), makeLog(1, 0))).toBe(0)
    })
  })

  describe('mergeTwoUniqSortedLogs', () => {
    const makeLog = (blockNumber: number, logIndex: number): LogType => ({
      blockNumber,
      logIndex,
      contractAddress: '',
      address: '',
      timeStamp: 0,
      transactionHash: '',
      index: 0,
      name: '',
      topics: [],
      data: '',
      args: null,
    })

    it('merges two sorted arrays', () => {
      const a = [makeLog(1, 0), makeLog(3, 0)]
      const b = [makeLog(2, 0), makeLog(4, 0)]
      const result = mergeTwoUniqSortedLogs(a, b)
      expect(result).toHaveLength(4)
      expect(result[0].blockNumber).toBe(1)
      expect(result[1].blockNumber).toBe(2)
      expect(result[2].blockNumber).toBe(3)
      expect(result[3].blockNumber).toBe(4)
    })

    it('deduplicates by block+logIndex', () => {
      const a = [makeLog(1, 0), makeLog(2, 0)]
      const b = [makeLog(2, 0), makeLog(3, 0)]
      const result = mergeTwoUniqSortedLogs(a, b)
      expect(result).toHaveLength(3)
    })

    it('handles empty arrays', () => {
      const a = [makeLog(1, 0)]
      expect(mergeTwoUniqSortedLogs(a, [])).toEqual(a)
      expect(mergeTwoUniqSortedLogs([], a)).toEqual(a)
    })
  })
})
