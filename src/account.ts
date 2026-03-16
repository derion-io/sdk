import { BigNumber, Signer } from 'ethers'
import { processLogs } from './utils/logs'
import { AccountState, Position, LogType, Transition, Pools } from './type'

export class Account {
  tokenDerion: string
  address: string
  signer?: Signer
  blockNumber: number = 0
  logIndex: number = 0
  positions: { [id: string]: Position } = {}
  transitions: Transition[] = []
  balances: { [token: string]: BigNumber } = {}
  allowances: { [spenderToken: string]: BigNumber } = {}

  constructor(tokenDerion: string, address: string, signer?: Signer) {
    this.tokenDerion = tokenDerion
    this.address = address
    this.signer = signer
  }

  getState(): AccountState {
    return {
      positions: this.positions,
      transitions: this.transitions,
      balances: this.balances,
      allowances: this.allowances,
    }
  }

  processLogs = async (txLogs: LogType[][], pools: Pools = {}) => {
    txLogs = txLogs.filter((logs) =>
      logs.some((log) => log.blockNumber > this.blockNumber || (log.blockNumber == this.blockNumber && log.logIndex > this.logIndex)),
    )
    if (!txLogs.length) {
      return
    }

    const result = processLogs(
      this.getState(),
      txLogs,
      pools,
      this.tokenDerion,
      this.address,
    )
    this.positions = result.positions
    this.transitions = result.transitions
    this.balances = result.balances
    this.allowances = result.allowances

    const lastTx = txLogs[txLogs.length - 1]
    const lastLog = lastTx[lastTx.length - 1]
    this.blockNumber = lastLog.blockNumber
    this.logIndex = lastLog.logIndex
  }
}
