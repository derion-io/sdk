import { JsonRpcProvider, Networkish } from '@ethersproject/providers'
import { ConnectionInfo } from 'ethers/lib/utils'
import { Profile } from './profile'
import { Account } from './account'
import { StateLoader } from './stateLoader'
import { extractPoolAddresses } from './utils/logs'
import { Swapper } from './swapper'
import { calcPositionState, PositionView } from './utils/positions'
import { ConfigFetcher, Position, LogType, ProfileConfigs, Pools } from './type'

export class DerionSDK {
  profile: Profile
  stateLoader: StateLoader

  constructor(configs: ProfileConfigs) {
    this.profile = new Profile(configs)
  }

  async init(fetcher?: ConfigFetcher) {
    await this.profile.loadConfig(fetcher)
  }

  getStateLoader(providerOrUrl?: JsonRpcProvider | ConnectionInfo | string, network?: Networkish) {
    const provider = providerOrUrl instanceof JsonRpcProvider
      ? providerOrUrl
      : new JsonRpcProvider(providerOrUrl, network)
    return (this.stateLoader = this.stateLoader ?? new StateLoader(this.profile, provider))
  }

  extractLogs = (txLogs: LogType[][]): { poolAddresses: string[] } => {
    return {
      poolAddresses: extractPoolAddresses(txLogs, this.profile.configs.derivable.token),
    }
  }

  createAccount(address: string): Account {
    return new Account(this.profile.configs.derivable.token, address)
  }

  importPools(pools: Pools, poolAddresses: string[]) {
    poolAddresses.forEach((address) => {
      if (!pools[address]) {
        pools[address] = { address }
      }
    })
  }

  createSwapper = (providerOrUrl?: JsonRpcProvider | ConnectionInfo | string, network?: Networkish) => {
    const provider = providerOrUrl instanceof JsonRpcProvider
      ? providerOrUrl
      : new JsonRpcProvider(providerOrUrl, network)
    return new Swapper(this.profile, provider)
  }

  calcPositionState = (position: Position, pools: Pools, currentPriceR = position.priceR, balance = position.balance): PositionView => {
    return calcPositionState(position, pools, currentPriceR, balance)
  }
}
