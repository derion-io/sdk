import { Signer } from 'ethers'
import { Profile } from './profile'
import { Account } from './account'
import { StateLoader } from './stateLoader'
import { Networkish } from '@ethersproject/providers'
import { ConnectionInfo } from 'ethers/lib/utils'
import { extractPoolAddresses } from './utils/logs'
import {Swapper} from './swapper'
import { calcPositionState, PositionView } from './utils/positions'
import { Position, LogType, ProfileConfigs, Pools } from './type'

export class DerionSDK {
  constructor(configs: ProfileConfigs) {
    this.profile = new Profile(configs)
  }

  profile: Profile
  stateLoader: StateLoader

  async init() {
    await this.profile.loadConfig()
  }

  getStateLoader(url?: ConnectionInfo | string, network?: Networkish) {
    return this.stateLoader = this.stateLoader ?? new StateLoader(this.profile, url, network)
  }

  extractLogs = (txLogs: LogType[][]): { poolAddresses: string[] } => {
    return {
      poolAddresses: extractPoolAddresses(txLogs, this.profile.configs.derivable.token),
    }
  }

  createAccount(address: string, signer?: Signer): Account {
    return new Account(this.profile, address, signer)
  }

  importPools(pools: Pools, poolAddresses: string[]) {
    poolAddresses.forEach(address => {
      if (!pools[address]) {
        pools[address] = { address }
      }
    })
  }

  createSwapper = (url?: ConnectionInfo | string, network?: Networkish) => {
    return new Swapper(this.profile.configs, this.profile, url, network)
  }

  calcPositionState = (
    position: Position,
    pools: Pools,
    currentPriceR = position.priceR,
    balance = position.balance,
  ): PositionView => {
    return calcPositionState(position, pools, currentPriceR, balance)
  }
}
