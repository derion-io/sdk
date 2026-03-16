import { BigNumber } from 'ethers'
import { defaultAbiCoder, hexZeroPad } from 'ethers/lib/utils'
import { Account } from '../src/account'
import { LogType } from '../src/type'
import { TOPICS } from '../src/utils/logs'
import { packPosId } from '../src/utils'
import { BIG_0 } from '../src/utils/constant'

const ZERO_ADDR = '0x0000000000000000000000000000000000000000'
const ACCOUNT = '0x0DbCa96184eEd4C6a1291403c93311ebE6646785'
const TOKEN_DERION = '0x1234567890123456789012345678901234567890'
const TOKEN_ERC20 = '0xabCDeF0123456789AbcdEf0123456789aBCDEF01'

const TRANSFER_TOPIC = Object.entries(TOPICS).find(([, v]) => v === 'Transfer')![0]

function padAddr(addr: string): string {
  return hexZeroPad(addr, 32)
}

function makeLog(overrides: Partial<LogType> = {}): LogType {
  return {
    contractAddress: '',
    address: ZERO_ADDR,
    timeStamp: 0,
    transactionHash: '0xabc',
    blockNumber: 1,
    index: 0,
    logIndex: 0,
    name: '',
    topics: [],
    data: '0x',
    args: null,
    ...overrides,
  }
}

describe('Account', () => {
  describe('constructor', () => {
    it('initializes with empty state', () => {
      const account = new Account(TOKEN_DERION, ACCOUNT)
      expect(account.tokenDerion).toBe(TOKEN_DERION)
      expect(account.address).toBe(ACCOUNT)
      expect(account.positions).toEqual({})
      expect(account.transitions).toEqual([])
      expect(account.balances).toEqual({})
      expect(account.allowances).toEqual({})
      expect(account.blockNumber).toBe(0)
      expect(account.logIndex).toBe(0)
    })
  })

  describe('getState', () => {
    it('returns current state', () => {
      const account = new Account(TOKEN_DERION, ACCOUNT)
      const state = account.getState()
      expect(state.positions).toBe(account.positions)
      expect(state.transitions).toBe(account.transitions)
      expect(state.balances).toBe(account.balances)
      expect(state.allowances).toBe(account.allowances)
    })
  })

  describe('processLogs', () => {
    it('processes ERC20 transfers and updates balances', async () => {
      const account = new Account(TOKEN_DERION, ACCOUNT)
      const amount = BigNumber.from('1000000')

      const log = makeLog({
        address: TOKEN_ERC20,
        topics: [TRANSFER_TOPIC, padAddr(ZERO_ADDR), padAddr(ACCOUNT)],
        data: hexZeroPad(amount.toHexString(), 32),
        blockNumber: 1,
        logIndex: 0,
      })

      await account.processLogs([[log]])
      expect(account.balances[TOKEN_ERC20]).toBeDefined()
      expect(account.balances[TOKEN_ERC20].eq(amount)).toBe(true)
    })

    it('updates blockNumber and logIndex after processing', async () => {
      const account = new Account(TOKEN_DERION, ACCOUNT)

      const log = makeLog({
        address: TOKEN_ERC20,
        topics: [TRANSFER_TOPIC, padAddr(ZERO_ADDR), padAddr(ACCOUNT)],
        data: hexZeroPad(BigNumber.from(1000).toHexString(), 32),
        blockNumber: 42,
        logIndex: 7,
      })

      await account.processLogs([[log]])
      expect(account.blockNumber).toBe(42)
      expect(account.logIndex).toBe(7)
    })

    it('skips already-processed logs (deduplication)', async () => {
      const account = new Account(TOKEN_DERION, ACCOUNT)
      const amount = BigNumber.from('1000')

      const log = makeLog({
        address: TOKEN_ERC20,
        topics: [TRANSFER_TOPIC, padAddr(ZERO_ADDR), padAddr(ACCOUNT)],
        data: hexZeroPad(amount.toHexString(), 32),
        blockNumber: 1,
        logIndex: 0,
      })

      await account.processLogs([[log]])
      const balanceAfterFirst = account.balances[TOKEN_ERC20]

      // Process same logs again — should be skipped
      await account.processLogs([[log]])
      expect(account.balances[TOKEN_ERC20].eq(balanceAfterFirst)).toBe(true)
    })

    it('processes new logs after previous ones', async () => {
      const account = new Account(TOKEN_DERION, ACCOUNT)
      const amount1 = BigNumber.from('1000')
      const amount2 = BigNumber.from('2000')

      const log1 = makeLog({
        address: TOKEN_ERC20,
        topics: [TRANSFER_TOPIC, padAddr(ZERO_ADDR), padAddr(ACCOUNT)],
        data: hexZeroPad(amount1.toHexString(), 32),
        blockNumber: 1,
        logIndex: 0,
      })

      await account.processLogs([[log1]])

      const log2 = makeLog({
        address: TOKEN_ERC20,
        topics: [TRANSFER_TOPIC, padAddr(ZERO_ADDR), padAddr(ACCOUNT)],
        data: hexZeroPad(amount2.toHexString(), 32),
        blockNumber: 2,
        logIndex: 0,
      })

      await account.processLogs([[log2]])
      expect(account.balances[TOKEN_ERC20].eq(amount1.add(amount2))).toBe(true)
    })

    it('does nothing for empty logs', async () => {
      const account = new Account(TOKEN_DERION, ACCOUNT)
      await account.processLogs([])
      expect(account.blockNumber).toBe(0)
      expect(account.logIndex).toBe(0)
    })
  })
})
