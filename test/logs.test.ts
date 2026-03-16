import { BigNumber } from 'ethers'
import { defaultAbiCoder, getAddress, hexZeroPad, hexlify, keccak256, toUtf8Bytes } from 'ethers/lib/utils'
import { processLogs, extractPoolAddresses, TOPICS } from '../src/utils/logs'
import { AccountState, LogType, Pools } from '../src/type'
import { BIG_0 } from '../src/utils/constant'
import { packPosId } from '../src/utils'

const ZERO_ADDR = '0x0000000000000000000000000000000000000000'
const ACCOUNT = '0x0DbCa96184eEd4C6a1291403c93311ebE6646785'
const POOL = '0xE4581De9550a80DC1A442a8fC6ccbf980ec1B71C'
const TOKEN_DERION = '0x1234567890123456789012345678901234567890'
const TOKEN_ERC20 = '0xabCDeF0123456789AbcdEf0123456789aBCDEF01'
const SIDE_A = 0x10

// Topic hashes
const TRANSFER_SINGLE_TOPIC = Object.entries(TOPICS).find(([, v]) => v === 'TransferSingle')![0]
const TRANSFER_TOPIC = Object.entries(TOPICS).find(([, v]) => v === 'Transfer')![0]
const APPROVAL_TOPIC = Object.entries(TOPICS).find(([, v]) => v === 'Approval')![0]

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

function emptyState(): AccountState {
  return {
    positions: {},
    transitions: [],
    balances: {},
    allowances: {},
  }
}

describe('logs', () => {
  describe('extractPoolAddresses', () => {
    it('extracts pool address from TransferSingle log', () => {
      const posId = packPosId(POOL, SIDE_A)
      const data = defaultAbiCoder.encode(['bytes32', 'uint256'], [posId, 1000])
      const log = makeLog({
        address: TOKEN_DERION,
        topics: [
          TRANSFER_SINGLE_TOPIC,
          padAddr(ZERO_ADDR), // operator
          padAddr(ZERO_ADDR), // from
          padAddr(ACCOUNT),   // to
        ],
        data,
      })

      const result = extractPoolAddresses([[log]], TOKEN_DERION)
      expect(result).toContain(POOL)
    })

    it('ignores logs from other contracts', () => {
      const posId = packPosId(POOL, SIDE_A)
      const data = defaultAbiCoder.encode(['bytes32', 'uint256'], [posId, 1000])
      const log = makeLog({
        address: '0x9999999999999999999999999999999999999999',
        topics: [TRANSFER_SINGLE_TOPIC, padAddr(ZERO_ADDR), padAddr(ZERO_ADDR), padAddr(ACCOUNT)],
        data,
      })

      const result = extractPoolAddresses([[log]], TOKEN_DERION)
      expect(result).toHaveLength(0)
    })

    it('deduplicates pool addresses', () => {
      const posId = packPosId(POOL, SIDE_A)
      const data = defaultAbiCoder.encode(['bytes32', 'uint256'], [posId, 1000])
      const log1 = makeLog({
        address: TOKEN_DERION,
        topics: [TRANSFER_SINGLE_TOPIC, padAddr(ZERO_ADDR), padAddr(ZERO_ADDR), padAddr(ACCOUNT)],
        data,
        logIndex: 0,
      })
      const log2 = makeLog({
        address: TOKEN_DERION,
        topics: [TRANSFER_SINGLE_TOPIC, padAddr(ZERO_ADDR), padAddr(ZERO_ADDR), padAddr(ACCOUNT)],
        data,
        logIndex: 1,
      })

      const result = extractPoolAddresses([[log1, log2]], TOKEN_DERION)
      expect(result).toHaveLength(1)
    })
  })

  describe('processLogs', () => {
    it('returns new state without modifying original', () => {
      const state = emptyState()
      const originalPositions = state.positions
      const originalTransitions = state.transitions

      const result = processLogs(state, [], {}, TOKEN_DERION, ACCOUNT)

      expect(result.positions).not.toBe(originalPositions)
      expect(result.transitions).not.toBe(originalTransitions)
      expect(state.positions).toEqual({})
      expect(state.transitions).toEqual([])
    })

    it('tracks ERC20 transfer balances', () => {
      const amount = BigNumber.from('1000000')
      const log = makeLog({
        address: TOKEN_ERC20,
        topics: [
          TRANSFER_TOPIC,
          padAddr(ZERO_ADDR), // from (mint)
          padAddr(ACCOUNT),   // to
        ],
        data: hexZeroPad(amount.toHexString(), 32),
      })

      const result = processLogs(emptyState(), [[log]], {}, TOKEN_DERION, ACCOUNT)
      expect(result.balances[TOKEN_ERC20]).toBeDefined()
      expect(result.balances[TOKEN_ERC20].eq(amount)).toBe(true)
    })

    it('tracks ERC20 transfer out (decreasing balance)', () => {
      const initial = BigNumber.from('2000000')
      const outAmount = BigNumber.from('500000')

      const mintLog = makeLog({
        address: TOKEN_ERC20,
        topics: [TRANSFER_TOPIC, padAddr(ZERO_ADDR), padAddr(ACCOUNT)],
        data: hexZeroPad(initial.toHexString(), 32),
        blockNumber: 1,
        logIndex: 0,
      })

      const state1 = processLogs(emptyState(), [[mintLog]], {}, TOKEN_DERION, ACCOUNT)

      const transferLog = makeLog({
        address: TOKEN_ERC20,
        topics: [TRANSFER_TOPIC, padAddr(ACCOUNT), padAddr(ZERO_ADDR)],
        data: hexZeroPad(outAmount.toHexString(), 32),
        blockNumber: 2,
        logIndex: 0,
      })

      const result = processLogs(state1, [[transferLog]], {}, TOKEN_DERION, ACCOUNT)
      expect(result.balances[TOKEN_ERC20].eq(initial.sub(outAmount))).toBe(true)
    })

    it('tracks ERC20 approval', () => {
      const spenderRaw = '0x1111111111111111111111111111111111111111'
      const spender = getAddress(spenderRaw)
      const allowance = BigNumber.from('999999')

      const log = makeLog({
        address: TOKEN_ERC20,
        topics: [
          APPROVAL_TOPIC,
          padAddr(ACCOUNT),  // owner
          padAddr(spenderRaw),  // spender
        ],
        data: hexZeroPad(allowance.toHexString(), 32),
      })

      const result = processLogs(emptyState(), [[log]], {}, TOKEN_DERION, ACCOUNT)
      const key = spender + '-' + getAddress(TOKEN_ERC20)
      expect(result.allowances[key]).toBeDefined()
      expect(result.allowances[key].eq(allowance)).toBe(true)
    })

    it('removes allowance when set to zero', () => {
      const spenderRaw = '0x1111111111111111111111111111111111111111'
      const spender = getAddress(spenderRaw)
      const key = spender + '-' + getAddress(TOKEN_ERC20)

      const state: AccountState = {
        ...emptyState(),
        allowances: { [key]: BigNumber.from(1000) },
      }

      const log = makeLog({
        address: TOKEN_ERC20,
        topics: [APPROVAL_TOPIC, padAddr(ACCOUNT), padAddr(spenderRaw)],
        data: hexZeroPad('0x00', 32),
      })

      const result = processLogs(state, [[log]], {}, TOKEN_DERION, ACCOUNT)
      expect(result.allowances[key]).toBeUndefined()
    })

    it('cleans up zero balances', () => {
      const amount = BigNumber.from('1000')

      const mintLog = makeLog({
        address: TOKEN_ERC20,
        topics: [TRANSFER_TOPIC, padAddr(ZERO_ADDR), padAddr(ACCOUNT)],
        data: hexZeroPad(amount.toHexString(), 32),
        blockNumber: 1,
      })
      const state1 = processLogs(emptyState(), [[mintLog]], {}, TOKEN_DERION, ACCOUNT)
      expect(result1BalanceDefined(state1)).toBe(true)

      const burnLog = makeLog({
        address: TOKEN_ERC20,
        topics: [TRANSFER_TOPIC, padAddr(ACCOUNT), padAddr(ZERO_ADDR)],
        data: hexZeroPad(amount.toHexString(), 32),
        blockNumber: 2,
      })
      const result = processLogs(state1, [[burnLog]], {}, TOKEN_DERION, ACCOUNT)
      expect(result.balances[TOKEN_ERC20]).toBeUndefined()
    })

    it('handles empty txLogs', () => {
      const result = processLogs(emptyState(), [], {}, TOKEN_DERION, ACCOUNT)
      expect(result.positions).toEqual({})
      expect(result.transitions).toHaveLength(0)
    })

    it('handles empty inner log arrays', () => {
      const result = processLogs(emptyState(), [[]], {}, TOKEN_DERION, ACCOUNT)
      expect(result.transitions).toHaveLength(0)
    })
  })
})

function result1BalanceDefined(state: AccountState): boolean {
  return state.balances[TOKEN_ERC20] !== undefined
}
