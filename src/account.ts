import { BigNumber, Signer } from 'ethers'
import { Profile } from './profile'
import { processLogs } from './utils/logs'
import { Position, LogType, Transition, Pools } from './type'

export class Account {
  profile: Profile
  address: string
  signer?: Signer
  blockNumber: number = 0
  logIndex: number = 0
  positions: { [id: string]: Position } = {}
  transitions: Transition[] = []
  balances: { [token: string]: BigNumber } = {}
  allowances: { [spenderToken: string]: BigNumber } = {}

  constructor(profile: Profile, address: string, signer?: Signer) {
    this.profile = profile
    this.address = address
    this.signer = signer
  }

  processLogs = async (txLogs: LogType[][], pools: Pools = {}) => {
    txLogs = txLogs.filter(logs => logs.some(log =>
      log.blockNumber > this.blockNumber ||
      (log.blockNumber == this.blockNumber && log.logIndex > this.logIndex)
    ))
    if (!txLogs.length) {
      return
    }

    processLogs(
      this.positions,
      this.transitions,
      this.balances,
      this.allowances,
      txLogs,
      pools,
      this.profile.configs.derivable.token,
      this.address,
    )
    const lastTx = txLogs[txLogs.length-1]
    const lastLog = lastTx[lastTx.length-1]
    this.blockNumber = lastLog.blockNumber
    this.logIndex = lastLog.logIndex
  }
}
