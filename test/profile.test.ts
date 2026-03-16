import { Profile } from '../src/profile'
import { DerionError } from '../src/type'

// Minimal valid config matching DerionConfigs shape
function validConfig() {
  return {
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    timePerBlock: 250,
    gasLimitDefault: 5000000,
    gasForProof: 100000,
    name: 'Arbitrum',
    gtID: 'arbitrum',
    nativeSymbol: 'ETH',
    wrappedTokenAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    nativePriceUSD: 3000,
    stablecoins: ['0xaf88d065e77c8cC2239327C5EDb3A432268e5831'],
    helperContract: {
      utr: '0x1111111111111111111111111111111111111111',
      multiCall: '0x2222222222222222222222222222222222222222',
    },
    factory: {},
    fetchers: {},
    uniswap: {
      v3Factory: '0x3333333333333333333333333333333333333333',
    },
    derivable: {
      version: 3,
      startBlock: 100000,
      poolFactory: '0x4444444444444444444444444444444444444444',
      logic: '0x5555555555555555555555555555555555555555',
      token: '0x6666666666666666666666666666666666666666',
      playToken: '0x7777777777777777777777777777777777777777',
      stateCalHelper: '0x8888888888888888888888888888888888888888',
      feeReceiver: '0x9999999999999999999999999999999999999999',
      tokenDescriptor: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      compositeFetcher: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      multiCall: '0xcccccccccccccccccccccccccccccccccccccccc',
    },
  }
}

describe('Profile', () => {
  describe('constructor', () => {
    it('sets chainId and env', () => {
      const profile = new Profile({ chainId: 42161, env: 'production' })
      expect(profile.chainId).toBe(42161)
      expect(profile.env).toBe('production')
    })

    it('defaults env to development', () => {
      const profile = new Profile({ chainId: 42161 })
      expect(profile.env).toBe('development')
    })
  })

  describe('loadConfig with mock fetcher', () => {
    it('loads valid config successfully', async () => {
      const config = validConfig()
      const routes = { 'WETH-USDC': [{ type: 'uniswap3', address: '0xaaa' }] }
      const pools = ['0xPool1', '0xPool2']

      const fetcher = async (url: string) => {
        if (url.includes('network.json')) return config
        if (url.includes('routes.json')) return routes
        if (url.includes('pools.json')) return pools
        return null
      }

      const profile = new Profile({ chainId: 42161 })
      await profile.loadConfig(fetcher)

      expect(profile.configs).toBe(config)
      expect(profile.routes).toBe(routes)
      expect(profile.whitelistPools).toEqual(pools)
    })

    it('throws DerionError for null config', async () => {
      const fetcher = async () => null

      const profile = new Profile({ chainId: 42161 })
      await expect(profile.loadConfig(fetcher)).rejects.toThrow(DerionError)
      await expect(profile.loadConfig(fetcher)).rejects.toThrow('Failed to load network config')
    })

    it('throws DerionError with error code', async () => {
      const fetcher = async () => null

      const profile = new Profile({ chainId: 42161 })
      try {
        await profile.loadConfig(fetcher)
        fail('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(DerionError)
        expect((e as DerionError).code).toBe('CONFIG_LOAD_FAILED')
      }
    })

    it('throws when required fields are missing', async () => {
      const config = { chainId: 42161 } // missing everything

      const fetcher = async (url: string) => {
        if (url.includes('network.json')) return config
        return {}
      }

      const profile = new Profile({ chainId: 42161 })
      await expect(profile.loadConfig(fetcher)).rejects.toThrow('Invalid config: missing')
    })

    it('validates specific missing fields', async () => {
      const config = {
        ...validConfig(),
        derivable: { ...validConfig().derivable, token: undefined },
      }

      const fetcher = async (url: string) => {
        if (url.includes('network.json')) return config
        return {}
      }

      const profile = new Profile({ chainId: 42161 })
      await expect(profile.loadConfig(fetcher)).rejects.toThrow('derivable.token')
    })

    it('handles route/pool fetch failures gracefully', async () => {
      const config = validConfig()

      let callCount = 0
      const fetcher = async (url: string) => {
        callCount++
        if (url.includes('network.json')) return config
        throw new Error('network error')
      }

      const profile = new Profile({ chainId: 42161 })
      await profile.loadConfig(fetcher)

      // Should succeed — route and pool errors are caught
      expect(profile.configs).toBe(config)
      expect(profile.routes).toEqual({})
      expect(profile.whitelistPools).toEqual([])
    })
  })

  describe('getAbi', () => {
    it('returns ABI for known contract', () => {
      const profile = new Profile({ chainId: 42161 })
      const abi = profile.getAbi('View')
      expect(abi).toBeDefined()
      expect(abi.abi).toBeDefined()
    })

    it('returns empty array for unknown contract', () => {
      const profile = new Profile({ chainId: 42161 })
      const abi = profile.getAbi('NonExistent')
      expect(abi).toEqual([])
    })
  })
})
