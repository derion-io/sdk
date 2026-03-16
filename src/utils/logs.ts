import { BigNumber } from 'ethers'
import { defaultAbiCoder, getAddress, hexDataSlice } from 'ethers/lib/utils'
import { AccountState, Position, LogType, Transition, Pools } from '../type'
import { BIG_0 } from './constant'

export const STABLE_SYMBOLS = ['USD', 'DAI']

export const TOPICS: { [topic0: string]: string } = {
  '0xad05b4d6e93e902856d1a65a7cb9b0d22f5a8e0bf540c2006e88f586ac265cf1': 'Position', // Derion Pool
  '0xf7462f2a86b97b14a4669ae97bf107eb47f1574e511038ba3bb2c0cace5bb227': 'Swap', // Derion Helper
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': 'Transfer', // 20, 721
  '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62': 'TransferSingle', // 1155
  '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb': 'TransferBatch', // 1155
  '0x4dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63': 'LogFeeTransfer', // Polygon Native POL
  '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': 'Approval', // 20 Approval
}

export function extractPoolAddresses(txLogs: LogType[][], tokenDerion: string): string[] {
  const poolAddresses: { [key: string]: boolean } = {}
  for (const logs of txLogs) {
    for (const log of logs) {
      if (log.address != tokenDerion) {
        continue
      }
      const topic0 = log.topics?.[0]
      const type = TOPICS[topic0]
      if (type == 'TransferSingle') {
        const [id] = defaultAbiCoder.decode(['bytes32', 'uint'], log.data)
        const poolAddress = getAddress(hexDataSlice(id, 12))
        poolAddresses[poolAddress] = true
      } else if (type == 'TransferBatch') {
        const [ids] = defaultAbiCoder.decode(['bytes32[]', 'uint256[]'], log.data)
        for (let i = 0; i < ids.length; ++i) {
          const poolAddress = getAddress(hexDataSlice(ids[i], 12))
          poolAddresses[poolAddress] = true
        }
      }
    }
  }
  return Object.keys(poolAddresses)
}

export function processLogs(
  state: AccountState,
  txLogs: LogType[][],
  pools: Pools,
  tokenDerion: string,
  account: string,
): AccountState {
  // Clone state for immutable return
  const positions: { [id: string]: Position } = {}
  for (const [id, pos] of Object.entries(state.positions)) {
    positions[id] = { ...pos }
  }
  const transitions = [...state.transitions]
  const balances = { ...state.balances }
  const allowances = { ...state.allowances }

  for (const logs of txLogs) {
    if (!logs.length) {
      continue
    }
    const transition: Transition = {
      txHash: logs[0].transactionHash,
      blockNumber: logs[0].blockNumber,
      timestamp: logs[0].timeStamp ? BigNumber.from(logs[0].timeStamp).toNumber() : undefined,
      netTransfers: {},
    }
    const bingo = logs.some((log) => {
      if (log.address != tokenDerion) return false
      const topic0 = log.topics?.[0]
      const type = TOPICS[topic0]
      if (type != 'TransferSingle') return false
      const to = getAddress(hexDataSlice(log.topics[3], 12))
      if (account != to) return false
      return true
    })
    if (bingo) {
      for (const log of logs) {
        if (log.address != tokenDerion) {
          continue
        }
        const topic0 = log.topics?.[0]
        const type = TOPICS[topic0]
        if (type != 'TransferSingle') {
          // Derion does not use batch transfer
          continue
        }
        // const operator = getAddress(hexDataSlice(log.topics[1], 12))
        const from = getAddress(hexDataSlice(log.topics[2], 12))
        const to = getAddress(hexDataSlice(log.topics[3], 12))
        const [id, amount] = defaultAbiCoder.decode(['bytes32', 'uint'], log.data)
        const poolAddress = getAddress(hexDataSlice(id, 12))
        // const side = BigNumber.from(hexDataSlice(id, 0, 12)).toNumber()
        // const posId = pool + '-' + side
        // console.log({from, to, id, amount})
        const pos = (positions[id] = positions[id] ?? {
          id,
          balance: balances[id] ?? BIG_0,
          priceR: BIG_0,
          price: BIG_0,
          rPerBalance: BIG_0,
        })
        if (to == account) {
          let priceR = BIG_0
          logs.some((log) => {
            const topic0 = log.topics?.[0]
            const type = TOPICS[topic0]
            if (type != 'Swap') {
              return false
            }
            // const payer = getAddress(hexDataSlice(log.topics[1], 12))
            // const recipient = getAddress(hexDataSlice(log.topics[2], 12))
            // const index = getAddress(hexDataSlice(log.topics[3], 12))
            const datas = defaultAbiCoder.decode(['address', 'uint', 'uint', 'uint', 'uint', 'uint', 'uint'], log.data)
            const sqrtPriceR = datas[6]
            priceR = sqrtPriceR.mul(sqrtPriceR).shr(128)
            return true
          })
          logs.some((log) => {
            const topic0 = log.topics?.[0] ?? 'NOTHING'
            const type = TOPICS[topic0]
            if (type != 'Position') {
              return false
            }
            // const payer = getAddress(hexDataSlice(log.topics[1], 12))
            // const recipient = getAddress(hexDataSlice(log.topics[2], 12))
            // const index = getAddress(hexDataSlice(log.topics[3], 12))
            const [posId, amount, sqrtPrice, valueR] = defaultAbiCoder.decode(
              ['bytes32', 'uint', 'uint', 'uint'],
              log.data,
            )
            if (posId != id) {
              return false
            }
            const newBalance = pos.balance.add(amount)
            if (sqrtPrice.gt(0)) {
              const price = sqrtPrice.mul(sqrtPrice).shr(128)
              transition.price = price
              if (pos.price.gt(0)) {
                pos.price = pos.price.mul(pos.balance).add(amount.mul(price)).div(newBalance)
              } else {
                pos.price = price
              }
              if (!priceR?.gt(0)) {
                const pool = pools[poolAddress]
                // special case for INDEX = TOKEN_R / STABLECOIN
                if (
                  pool?.metadata?.base.address &&
                  pool.metadata.base.address == pool?.config?.TOKEN_R &&
                  STABLE_SYMBOLS.some((sym) => pool.metadata?.quote.symbol.includes(sym))
                ) {
                  priceR = price
                }
              }
            }
            const posValueR = pos.rPerBalance.mul(pos.balance).shr(128)
            if (valueR.gt(0)) {
              transition.rPerAmount = valueR.shl(128).div(amount)
              pos.rPerBalance = posValueR.add(valueR).shl(128).div(newBalance)
            }
            if (priceR?.gt(0)) {
              transition.priceR = priceR
              if (valueR.gt(0)) {
                if (posValueR.gt(0)) {
                  pos.priceR = pos.priceR.mul(posValueR).add(priceR.mul(valueR)).div(posValueR.add(valueR))
                } else {
                  pos.priceR = priceR
                }
              }
            }
            return true
          })
        }
      }
    }
    const _applyTransfer = (token: string, from: string, to: string, amount: BigNumber) => {
      if (!amount?.gt(0)) {
        return
      }
      if (bingo) {
        if (from == account) {
          transition.netTransfers[token] = (transition.netTransfers[token] ?? BIG_0).sub(amount)
        }
        if (to == account) {
          transition.netTransfers[token] = (transition.netTransfers[token] ?? BIG_0).add(amount)
        }
        if (transition.netTransfers[token].isZero()) {
          delete transition.netTransfers[token]
        }
      }
      if (to == account) {
        balances[token] = (balances[token] ?? BIG_0).add(amount)
      }
      if (from == account) {
        balances[token] = (balances[token] ?? BIG_0).sub(amount)
      }
      if ([from, to].includes(account) && positions[token]) {
        positions[token].balance = balances[token]
      }
    }
    for (const log of logs) {
      const topic0 = log.topics?.[0]
      const type = TOPICS[topic0]
      if (type == 'Transfer' && log.topics?.length == 3) {
        // ERC20
        const token = getAddress(log.address)
        const from = getAddress(hexDataSlice(log.topics[1], 12))
        const to = getAddress(hexDataSlice(log.topics[2], 12))
        const amount = BigNumber.from(log.data)
        _applyTransfer(token, from, to, amount)
      } else if (type == 'TransferSingle') {
        // ERC1155
        const from = getAddress(hexDataSlice(log.topics[2], 12))
        const to = getAddress(hexDataSlice(log.topics[3], 12))
        const [id, amount] = defaultAbiCoder.decode(['bytes32', 'uint'], log.data)
        _applyTransfer(id, from, to, amount)
      } else if (type == 'TransferBatch') {
        // ERC1155
        const from = getAddress(hexDataSlice(log.topics[2], 12))
        const to = getAddress(hexDataSlice(log.topics[3], 12))
        const [ids, amounts] = defaultAbiCoder.decode(['bytes32[]', 'uint256[]'], log.data)
        for (let i = 0; i < ids.length; ++i) {
          _applyTransfer(ids[i], from, to, amounts[i])
        }
      } else if (type == 'Approval') {
        const owner = getAddress(hexDataSlice(log.topics[1], 12))
        if (owner == account) {
          const token = getAddress(log.address)
          const spender = getAddress(hexDataSlice(log.topics[2], 12))
          const allowance = BigNumber.from(log.data)
          const key = spender + '-' + token
          if (allowance.isZero()) {
            delete allowances[key]
          } else {
            allowances[key] = allowance
          }
        }
      }
    }
    if (Object.keys(transition.netTransfers).length) {
      transitions.push(transition)
    }
    for (const token in balances) {
      if (!balances[token]?.gt(0)) {
        delete balances[token]
      }
    }
  }

  return { positions, transitions, balances, allowances }
}
