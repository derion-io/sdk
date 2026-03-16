import { JsonRpcProvider, Networkish } from '@ethersproject/providers'
import { Signer } from 'ethers'
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
    this.stateLoader = new StateLoader(this.profile, provider)
    return this.stateLoader
  }

  extractLogs = (txLogs: LogType[][]): { poolAddresses: string[] } => {
    return {
      poolAddresses: extractPoolAddresses(txLogs, this.profile.configs.derivable.token),
    }
  }

  createAccount(address: string, signer?: Signer): Account {
    return new Account(this.profile.configs.derivable.token, address, signer)
  }

  importPools(pools: Pools, poolAddresses: string[]): Pools {
    const result = { ...pools }
    poolAddresses.forEach((address) => {
      if (!result[address]) {
        result[address] = { address }
      }
    })
    return result
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
