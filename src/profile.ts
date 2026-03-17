import Helper from './abi/Helper.json'
import View from './abi/View.json'
import UTROverride from './abi/UTROverride.json'
import { ConfigFetcher, DerionConfigs, DerionError, ProfileConfigs } from './type'

const abis: any = {
  Helper,
  View,
  UTROverride,
}

const CONFIGS_URL = {
  development: 'https://raw.githubusercontent.com/derion-io/configs/v3-dev/',
  production: 'https://raw.githubusercontent.com/derion-io/configs/v3/',
}

const defaultFetcher: ConfigFetcher = (url: string) => fetch(url).then((r) => r.json())

export class Profile {
  chainId: number
  env: 'development' | 'production'
  configs: DerionConfigs
  routes: {
    [key: string]: { type: string; address: string }[]
  }

  whitelistPools: string[]

  constructor(configs: ProfileConfigs) {
    this.chainId = configs.chainId
    this.env = configs.env || 'development'
  }

  async loadConfig(fetcher: ConfigFetcher = defaultFetcher) {
    const baseURL = CONFIGS_URL[this.env]
    const [networkConfig, uniV3Pools, whitelistPools] = await Promise.all([
      fetcher(baseURL + this.chainId + '/network.json').catch(() => null),
      fetcher(baseURL + this.chainId + '/routes.json').catch(() => ({})),
      fetcher(baseURL + this.chainId + '/pools.json').catch(() => []),
    ])

    this.configs = this.validateConfig(networkConfig)
    this.routes = uniV3Pools
    this.whitelistPools = whitelistPools
  }

  private validateConfig(config: any): DerionConfigs {
    if (!config || typeof config !== 'object') {
      throw new DerionError('Failed to load network config', 'CONFIG_LOAD_FAILED')
    }
    const checks: [string, any][] = [
      ['derivable.token', config.derivable?.token],
      ['derivable.logic', config.derivable?.logic],
      ['derivable.stateCalHelper', config.derivable?.stateCalHelper],
      ['helperContract.utr', config.helperContract?.utr],
      ['wrappedTokenAddress', config.wrappedTokenAddress],
      ['stablecoins', config.stablecoins],
    ]
    const missing = checks.filter(([, v]) => !v).map(([k]) => k)
    if (missing.length) {
      throw new DerionError(`Invalid config: missing ${missing.join(', ')}`, 'CONFIG_INVALID')
    }
    return config
  }

  getAbi(name: string) {
    return abis[name] ? abis[name] : abis[this.chainId]?.[name] || []
  }

  getExp(fetcher: string): number {
    return this.configs?.fetchers?.[fetcher]?.type?.endsWith('3') ? 2 : 1
  }
}
