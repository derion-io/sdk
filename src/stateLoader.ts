import { JsonRpcProvider, Networkish } from '@ethersproject/providers'
import { CallReturnContext, ContractCallContext, Multicall } from 'ethereum-multicall';
import { ConnectionInfo } from 'ethers/lib/utils';
import { Profile } from './profile';
import { BigNumber } from 'ethers';
import { Pools } from './type';

export class StateLoader {
  profile: Profile
  provider: JsonRpcProvider
  mc: Multicall

  constructor(profile: Profile, url?: ConnectionInfo | string, network?: Networkish) {
    this.profile = profile
    this.provider = new JsonRpcProvider(url, network)
    this.mc = new Multicall({ ethersProvider: this.provider, tryAggregate: true });
  }

  async update({
    pools,
  }: {
    pools?: Pools,
  }) {
    const { abi, deployedBytecode: code } = this.profile.getAbi('View')
    this.provider.setStateOverride({
      [this.profile.configs.derivable.logic]: { code },
    })
    await this._multicall(Object.values(pools ?? {}).map(pool => {
      const calls = [{
        reference: 'compute',
        methodName: "compute",
        methodParameters: [
          this.profile.configs.derivable.token,
          this.profile.configs.derivable.feeRate ?? 5,
          0, 0, // twap and spot
        ],
      }]
      if (!pool.metadata) {
        calls.unshift({
          reference: 'metadata',
          methodName: "metadata",
          methodParameters: [],
        })
      }
      return {
        reference: pool.address,
        contractAddress: pool.address,
        abi,
        calls,
        context: (callsReturnContext: CallReturnContext[]) => {
          for (const ret of callsReturnContext) {
            if (ret.reference == 'compute') {
              const [
                state, sA, sB, sC, rA, rB, rC, twap, spot
              ] = ret.returnValues.map(v => v.type == 'BigNumber' ? BigNumber.from(v.hex) : v)
              if (!state) continue;
              const [ R, a, b ] = state.map((v: any) => v.type == 'BigNumber' ? BigNumber.from(v.hex) : v)
              pool.state = { R, a, b }
              pool.view = { sA, sB, sC, rA, rB, rC, twap, spot }
              continue
            }
            if (ret.reference == 'metadata') {
              const [
                config, reserve, base, quote
              ] = ret.returnValues
              if (!config) continue
              const [
                FETCHER, ORACLE, TOKEN_R, K, MARK, INTEREST_HL, PREMIUM_HL, MATURITY, MATURITY_VEST, MATURITY_RATE, OPEN_RATE
              ] = config.map((v: any) => v.type == 'BigNumber' ? BigNumber.from(v.hex) : v)
              pool.config = {
                FETCHER,
                ORACLE,
                TOKEN_R,
                K: K.toNumber(),
                MARK,
                INTEREST_HL: INTEREST_HL.toNumber(),
                PREMIUM_HL: PREMIUM_HL.toNumber(),
                MATURITY: MATURITY.toNumber(),
                MATURITY_VEST: MATURITY_VEST.toNumber(),
                MATURITY_RATE,
                OPEN_RATE,
              }
              pool.metadata = {
                reserve: {
                  address: reserve[0],
                  symbol: reserve[1],
                  decimals: parseInt(reserve[2].hex, 16),
                },
                base: {
                  address: base[0],
                  symbol: base[1],
                  decimals: parseInt(base[2].hex, 16),
                },
                quote: {
                  address: quote[0],
                  symbol: quote[1],
                  decimals: parseInt(quote[2].hex, 16),
                },
              }
              continue
            }
          }
        },
      }
    }))
  }

  async _multicall(
    contexts: ContractCallContext[],
  ): Promise<any[]> {
    const callbacks: { [reference: string]: any } = {}
    for (const context of contexts) {
      if (callbacks[context.reference]) {
        throw new Error(`dupplicated reference: ${context.reference}`)
      }
      callbacks[context.reference] = context.context
      delete context.context
    }
    const { results } = await this.mc.call(contexts);
    return Object.values(results).map(result => {
      const callback = callbacks[result.originalContractCallContext.reference]
      if (callback != null && typeof callback === 'function') {
        return callback(result.callsReturnContext)
      }
    })
  }
}
